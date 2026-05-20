import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import YAML from "yaml";

const execFileAsync = promisify(execFile);
const MANIFEST_FILE_NAME = "artifacts-manifest.json";
const PROVIDER_KINDS = new Set(["domain-mrs", "ipcidr-mrs", "classical-yaml", "remaining-yaml"]);
const PLACEHOLDER_DOMAIN = "blackhole.invalid";
const PLACEHOLDER_IPCIDR = "203.0.113.1/32";
const PLACEHOLDER_REMAINING = "DOMAIN,blackhole.invalid";
const TELEGRAM_MESSAGE_MAX_LENGTH = 4096;

export async function loadManifestFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return parseManifest(content, filePath);
}

export async function loadPreviousManifest({
  previousManifestPath,
  previousReleaseDir,
  previousRef = "origin/release",
  cwd = process.cwd(),
} = {}) {
  if (previousManifestPath) {
    return loadManifestFile(previousManifestPath);
  }
  if (previousReleaseDir) {
    return loadManifestFromReleaseDir(previousReleaseDir);
  }
  if (!previousRef) return null;
  return loadManifestFromGitRef({ ref: previousRef, cwd });
}

export async function loadManifestFromReleaseDir(releaseDir) {
  const manifestPath = path.join(releaseDir, MANIFEST_FILE_NAME);
  try {
    return await loadManifestFile(manifestPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const paths = await listFiles(releaseDir);
  return markInferredPlaceholders(
    manifestFromReleasePaths(paths),
    async (relativePath) => {
      try {
        return await fs.readFile(path.join(releaseDir, relativePath), "utf8");
      } catch {
        return null;
      }
    },
  );
}

export async function loadManifestFromGitRef({ ref, cwd = process.cwd() }) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["show", `${ref}:${MANIFEST_FILE_NAME}`],
      { cwd, maxBuffer: 1024 * 1024 * 8 },
    );
    return parseManifest(stdout, `${ref}:${MANIFEST_FILE_NAME}`);
  } catch {
    // Older release branches do not have a manifest; infer real provider
    // artifacts from file presence.
  }

  try {
    const { stdout } = await execFileAsync(
      "git",
      ["ls-tree", "-r", "--name-only", ref],
      { cwd, maxBuffer: 1024 * 1024 * 8 },
    );
    const paths = stdout.split(/\r?\n/u).filter(Boolean);
    return markInferredPlaceholders(
      manifestFromReleasePaths(paths),
      async (relativePath) => {
        try {
          const { stdout: content } = await execFileAsync(
            "git",
            ["show", `${ref}:${relativePath}`],
            { cwd, maxBuffer: 1024 * 1024 * 8 },
          );
          return content;
        } catch {
          return null;
        }
      },
    );
  } catch {
    return null;
  }
}

export function compareProviderArtifactChanges(previousManifest, currentManifest) {
  if (!previousManifest) {
    return { added: [], removed: [], updated: [] };
  }

  const previous = realProviderArtifactMap(previousManifest);
  const current = realProviderArtifactMap(currentManifest);
  const added = [...current.entries()]
    .filter(([key]) => !previous.has(key))
    .map(([, artifact]) => artifact);
  const removed = [...previous.entries()]
    .filter(([key]) => !current.has(key))
    .map(([, artifact]) => artifact);
  const updated = [...current.entries()]
    .filter(([key]) => previous.has(key))
    .map(([key, artifact]) => {
      const before = previous.get(key);
      if (!before) return null;
      const beforeHash = before.contentSha256;
      const afterHash = artifact.contentSha256;
      if (!beforeHash || !afterHash) return null;
      if (beforeHash === afterHash) return null;
      return artifact;
    })
    .filter(Boolean);

  return {
    added: sortArtifacts(added),
    removed: sortArtifacts(removed),
    updated: sortArtifacts(updated),
  };
}

export function hasProviderArtifactChanges(changes) {
  return changes.added.length > 0 || changes.removed.length > 0 || changes.updated.length > 0;
}

export function renderTelegramArtifactChangeMessage({
  changes,
  repository,
  releaseBranch = "release",
  maxItemsPerSection = 25,
  maxMessageLength = TELEGRAM_MESSAGE_MAX_LENGTH,
}) {
  const normalizedChanges = {
    added: Array.isArray(changes.added) ? changes.added : [],
    removed: Array.isArray(changes.removed) ? changes.removed : [],
    updated: Array.isArray(changes.updated) ? changes.updated : [],
  };
  const itemLimits = {
    added: Math.min(normalizedChanges.added.length, maxItemsPerSection),
    removed: Math.min(normalizedChanges.removed.length, maxItemsPerSection),
    updated: Math.min(normalizedChanges.updated.length, maxItemsPerSection),
  };
  let message = renderTelegramArtifactChangeMessageWithLimits({
    changes: normalizedChanges,
    repository,
    releaseBranch,
    itemLimits,
  });

  while (
    message.length > maxMessageLength &&
    (itemLimits.added > 0 || itemLimits.removed > 0)
  ) {
    if (itemLimits.added >= itemLimits.removed && itemLimits.added > 0) {
      itemLimits.added -= 1;
    } else if (itemLimits.updated >= itemLimits.removed && itemLimits.updated > 0) {
      itemLimits.updated -= 1;
    } else {
      itemLimits.removed -= 1;
    }
    message = renderTelegramArtifactChangeMessageWithLimits({
      changes: normalizedChanges,
      repository,
      releaseBranch,
      itemLimits,
    });
  }

  return message;
}

function renderTelegramArtifactChangeMessageWithLimits({
  changes,
  repository,
  releaseBranch,
  itemLimits,
}) {
  const lines = [
    "<b>rule provider 产物变化</b>",
    repository ? `<code>${escapeHtml(repository)}</code>` : null,
    `新增 <b>${changes.added.length}</b> / 减少 <b>${changes.removed.length}</b> / 更新 <b>${changes.updated.length}</b>`,
    "",
    renderChangeSection({
      title: "新增",
      artifacts: changes.added,
      repository,
      releaseBranch,
      maxItems: itemLimits.added,
    }),
    renderChangeSection({
      title: "更新",
      artifacts: changes.updated,
      repository,
      releaseBranch,
      maxItems: itemLimits.updated,
    }),
    renderChangeSection({
      title: "减少",
      artifacts: changes.removed,
      repository,
      releaseBranch,
      maxItems: itemLimits.removed,
    }),
  ].filter((line) => line !== null && line !== "");

  return lines.join("\n");
}

export async function sendTelegramMessage({
  botToken,
  chatId,
  text,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: HTTP ${response.status} ${await response.text()}`);
  }
}

function parseManifest(content, label) {
  let manifest;
  try {
    manifest = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid artifact manifest ${label}: ${error.message}`);
  }
  const providerArtifacts = Array.isArray(manifest.providerArtifacts)
    ? manifest.providerArtifacts
    : [];
  return {
    version: manifest.version ?? 1,
    providerArtifacts: providerArtifacts
      .filter((artifact) => PROVIDER_KINDS.has(artifact.kind))
      .map(normalizeManifestArtifact)
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
  };
}

function manifestFromReleasePaths(paths) {
  return {
    version: 1,
    providerArtifacts: paths
      .map(providerArtifactFromPath)
      .filter(Boolean)
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
  };
}

function providerArtifactFromPath(relativePath) {
  if (relativePath === MANIFEST_FILE_NAME || relativePath.endsWith("/README.md")) {
    return null;
  }
  if (/\.original\.[^.]+$/u.test(relativePath)) {
    return null;
  }

  const fileName = path.posix.basename(relativePath);
  const sourceRelativeDir = path.posix.dirname(relativePath) === "."
    ? ""
    : path.posix.dirname(relativePath);
  if (fileName.endsWith("_Domain.mrs")) {
    return normalizeManifestArtifact({
      relativePath,
      fileName,
      sourceRelativeDir,
      entryName: fileName.slice(0, -"_Domain.mrs".length),
      kind: "domain-mrs",
      placeholder: false,
    });
  }
  if (fileName.endsWith("_IP.mrs")) {
    return normalizeManifestArtifact({
      relativePath,
      fileName,
      sourceRelativeDir,
      entryName: fileName.slice(0, -"_IP.mrs".length),
      kind: "ipcidr-mrs",
      placeholder: false,
    });
  }
  if (fileName.endsWith("_Remaining.yaml")) {
    return normalizeManifestArtifact({
      relativePath,
      fileName,
      sourceRelativeDir,
      entryName: fileName.slice(0, -"_Remaining.yaml".length),
      kind: "remaining-yaml",
      placeholder: false,
    });
  }
  if (fileName.endsWith(".yaml")) {
    return normalizeManifestArtifact({
      relativePath,
      fileName,
      sourceRelativeDir,
      entryName: fileName.slice(0, -".yaml".length),
      kind: "classical-yaml",
      placeholder: false,
    });
  }
  return null;
}

async function markInferredPlaceholders(manifest, readTextFile) {
  return {
    ...manifest,
    providerArtifacts: await Promise.all(
      manifest.providerArtifacts.map(async (artifact) => ({
        ...artifact,
        placeholder: await isInferredPlaceholder(artifact, readTextFile),
        ...(await inferredContentHashFields(artifact, readTextFile)),
      })),
    ),
  };
}

async function inferredContentHashFields(artifact, readTextFile) {
  if (artifact.contentSha256) return {};
  if (!["classical-yaml", "remaining-yaml"].includes(artifact.kind)) return {};
  const content = await readTextFile(artifact.relativePath);
  if (content == null) return {};
  const normalized = yamlPayload(content).join("\n");
  if (!normalized) return {};
  return { contentSha256: sha256Hex(normalized) };
}

async function isInferredPlaceholder(artifact, readTextFile) {
  const content = await readTextFile(placeholderProbePath(artifact));
  if (content == null) return false;

  if (artifact.kind === "domain-mrs") {
    return textLines(content).join("\n") === PLACEHOLDER_DOMAIN;
  }
  if (artifact.kind === "ipcidr-mrs") {
    return textLines(content).join("\n") === `IP-CIDR,${PLACEHOLDER_IPCIDR}`;
  }
  if (artifact.kind === "remaining-yaml") {
    return yamlPayload(content).join("\n") === PLACEHOLDER_REMAINING;
  }
  return false;
}

function sha256Hex(text) {
  return crypto
    .createHash("sha256")
    .update(String(text), "utf8")
    .digest("hex");
}

function placeholderProbePath(artifact) {
  if (artifact.kind === "domain-mrs") {
    return artifact.relativePath.replace(/_Domain\.mrs$/u, "_Domain.txt");
  }
  if (artifact.kind === "ipcidr-mrs") {
    return artifact.relativePath.replace(/_IP\.mrs$/u, "_IP.txt");
  }
  return artifact.relativePath;
}

function textLines(content) {
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function yamlPayload(content) {
  try {
    const parsed = YAML.parse(content);
    return Array.isArray(parsed?.payload)
      ? parsed.payload.map((rule) => String(rule).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function normalizeManifestArtifact(artifact) {
  const relativePath = String(artifact.relativePath ?? "");
  return {
    relativePath,
    sourceRelativeDir: String(artifact.sourceRelativeDir ?? ""),
    entryName: String(artifact.entryName ?? ""),
    fileName: String(artifact.fileName ?? path.posix.basename(relativePath)),
    kind: artifact.kind,
    mihomo: artifact.mihomo ?? "rules",
    ruleGroupName: artifact.ruleGroupName,
    placeholder: Boolean(artifact.placeholder),
    contentSha256: artifact.contentSha256 ? String(artifact.contentSha256) : undefined,
  };
}

function realProviderArtifactMap(manifest) {
  return new Map(
    manifest.providerArtifacts
      .filter((artifact) => PROVIDER_KINDS.has(artifact.kind) && !artifact.placeholder)
      .map((artifact) => [artifact.relativePath, artifact]),
  );
}

async function listFiles(rootDir, relativeDir = "") {
  const dir = path.join(rootDir, relativeDir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = relativeDir
      ? path.posix.join(relativeDir, entry.name)
      : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(rootDir, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

function sortArtifacts(artifacts) {
  return [...artifacts].sort((left, right) =>
    left.sourceRelativeDir.localeCompare(right.sourceRelativeDir) ||
    kindOrder(left.kind) - kindOrder(right.kind) ||
    left.relativePath.localeCompare(right.relativePath),
  );
}

function kindOrder(kind) {
  if (kind === "domain-mrs") return 0;
  if (kind === "classical-yaml") return 1;
  if (kind === "remaining-yaml") return 2;
  if (kind === "ipcidr-mrs") return 3;
  return 3;
}

function renderChangeSection({
  title,
  artifacts,
  repository,
  releaseBranch,
  maxItems,
}) {
  if (artifacts.length === 0) return null;
  const visibleArtifacts = artifacts.slice(0, maxItems);
  const lines = [`<b>${escapeHtml(title)}</b>`];
  for (const artifact of visibleArtifacts) {
    lines.push(
      `- ${renderArtifactLink({ artifact, repository, releaseBranch })} <code>${escapeHtml(kindLabel(artifact.kind))}</code>`,
    );
  }
  if (artifacts.length > visibleArtifacts.length) {
    lines.push(`- ... 还有 ${artifacts.length - visibleArtifacts.length} 项`);
  }
  return lines.join("\n");
}

function renderArtifactLink({ artifact, repository, releaseBranch }) {
  const label = escapeHtml(artifact.relativePath);
  if (!repository) return `<code>${label}</code>`;
  return `<a href="${artifactURL({ repository, releaseBranch, relativePath: artifact.relativePath })}">${label}</a>`;
}

function artifactURL({ repository, releaseBranch, relativePath }) {
  return `https://raw.githubusercontent.com/${repository}/${releaseBranch}/${relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function kindLabel(kind) {
  if (kind === "domain-mrs") return "domain";
  if (kind === "ipcidr-mrs") return "ipcidr";
  if (kind === "classical-yaml") return "yaml(all)";
  if (kind === "remaining-yaml") return "yaml(remaining)";
  return kind;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
