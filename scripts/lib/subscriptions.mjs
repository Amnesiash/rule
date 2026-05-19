import fs from "node:fs/promises";
import path from "node:path";
import { sanitizeName, SourceConfigError } from "./config.mjs";

async function safeReadFile(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

async function listFilesRecursively(rootDir) {
  const result = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }
  return result;
}

async function removeEmptyDirs(rootDir) {
  const dirs = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
    }
    dirs.push(current);
  }
  dirs.sort((a, b) => b.length - a.length);
  for (const dir of dirs) {
    if (dir === rootDir) continue;
    try {
      const remaining = await fs.readdir(dir);
      if (remaining.length === 0) await fs.rmdir(dir);
    } catch {
      // ignore
    }
  }
}

function proxyCandidatesForUrl(url) {
  if (!/^https?:\/\//iu.test(url)) return [];
  const candidates = [];
  if (/^https:\/\/raw\.githubusercontent\.com\//iu.test(url) || /^https:\/\/github\.com\//iu.test(url)) {
    candidates.push(`https://ghproxy.com/${url}`);
    candidates.push(`https://ghp.ci/${url}`);
  }
  return candidates;
}

export async function fetchWithFallback(url, options, fetchImpl) {
  const candidates = [url, ...proxyCandidatesForUrl(url)];
  let lastError;

  for (const candidate of candidates) {
    try {
      const response = await fetchImpl(candidate, options);
      if (response?.ok) return response;
      lastError = new Error(`HTTP ${response?.status ?? "unknown"}`);
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError?.message ? `: ${lastError.message}` : "";
  throw new Error(`Unable to connect. Is the computer able to access the url?${message}`);
}

function inferFormatFromUrl(url) {
  const lowered = String(url ?? "").toLowerCase();
  if (lowered.endsWith(".yaml") || lowered.endsWith(".yml")) return "yaml";
  return "text";
}

function formatExtension(format) {
  if (format === "yaml") return ".yaml";
  return ".txt";
}

function parseBoolean(value) {
  const lowered = String(value ?? "").trim().toLowerCase();
  if (!lowered) return undefined;
  if (["1", "true", "yes", "y", "on"].includes(lowered)) return true;
  if (["0", "false", "no", "n", "off"].includes(lowered)) return false;
  return undefined;
}

function parseKvPairs(parts) {
  const result = {};
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim().toLowerCase();
    const value = trimmed.slice(index + 1).trim();
    if (!key) continue;
    result[key] = value;
  }
  return result;
}

function stripExtension(value) {
  return String(value ?? "").replace(/\.(txt|list|ya?ml)$/iu, "");
}

function defaultNameFromUrl(url, index) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).at(-1);
    const base = stripExtension(last || parsed.hostname);
    const candidate = base || parsed.hostname || `link-${index + 1}`;
    return candidate;
  } catch {
    const trimmed = String(url ?? "").trim();
    const tail = trimmed.split("/").filter(Boolean).at(-1);
    return stripExtension(tail || `link-${index + 1}`);
  }
}

function normalizeSubscription(entry, index) {
  const name = String(entry.name ?? "").trim();
  const url = String(entry.url ?? "").trim();
  const sourceName = String(entry.source ?? "Subscriptions").trim() || "Subscriptions";
  const headers = entry.headers ?? undefined;
  const format = inferFormatFromUrl(url);
  const enabled = entry.enabled !== false;

  if (!enabled) return { enabled: false };

  if (!name) throw new SourceConfigError("enabled subscription entries must define name", { entryName: `subscriptions[${index}]` });
  if (!url) throw new SourceConfigError("enabled subscription entries must define url", { entryName: name });

  const slug = sanitizeName((entry.slug ?? name) || `subscription-${index + 1}`);
  if (!slug) {
    throw new SourceConfigError("subscription name must contain at least one URL-safe character", { entryName: name });
  }

  if (!["text", "yaml"].includes(format)) {
    throw new SourceConfigError(`unsupported format ${format}`, { entryName: name });
  }

  return {
    enabled: true,
    name,
    url,
    sourceName,
    slug,
    format,
    headers,
    description: entry.description == null ? "" : String(entry.description),
  };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseSubscriptionsText(text) {
  const lines = String(text ?? "").split(/\r?\n/u);
  const entries = [];
  let currentSource = "";
  let indexWithinSource = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("//")) continue;

    const groupMatch = line.match(/^\[(.+)\]$/u);
    if (groupMatch) {
      currentSource = groupMatch[1].trim();
      if (!currentSource) {
        throw new SourceConfigError(`source.txt line ${index + 1}: 分组名不能为空`);
      }
      indexWithinSource = 0;
      continue;
    }

    if (!currentSource) {
      throw new SourceConfigError(`source.txt line ${index + 1}: 订阅链接必须放在分组标题（例如 [AI]）下面`);
    }

    const parts = rawLine.split("\t").map((part) => part.trim()).filter(Boolean);
    const url = parts[0];
    const kv = parseKvPairs(parts.slice(1));
    const enabled = parseBoolean(kv.enabled);
    const slug = kv.slug;
    const description = kv.desc ?? kv.description;
    const name = kv.name || defaultNameFromUrl(url, indexWithinSource);
    indexWithinSource += 1;

    entries.push({
      name,
      url,
      source: currentSource,
      ...(enabled === false ? { enabled: false } : null),
      ...(slug ? { slug } : null),
      ...(description ? { description } : null),
    });
  }
  return entries;
}

function toYamlValue(value) {
  if (value == null) return "null";
  const text = String(value);
  return JSON.stringify(text);
}

function authorFromUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (host === "raw.githubusercontent.com" && segments.length >= 2) return segments[0];
    if (host === "github.com" && segments.length >= 2) return segments[0];
    return parsed.hostname.replace(/[:]/g, "_");
  } catch {
    return "unknown";
  }
}

function originalFileNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).at(-1);
    return last || "unknown.list";
  } catch {
    const trimmed = String(url ?? "").trim();
    const last = trimmed.split("/").filter(Boolean).at(-1);
    return last || "unknown.list";
  }
}

function ensureAllowedBackupExtension(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if ([".txt", ".list", ".yaml", ".yml"].includes(ext)) return fileName;
  return `${fileName}.list`;
}

export async function loadSourceTxt({ projectRoot }) {
  const sourceTxtPath = path.join(projectRoot, "source.txt");
  if (!(await fileExists(sourceTxtPath))) return { sourceTxtPath, entries: [] };
  const raw = await fs.readFile(sourceTxtPath, "utf8");
  const parsed = parseSubscriptionsText(raw);
  const subscriptions = parsed
    .map((entry, index) => normalizeSubscription(entry, index))
    .filter((entry) => entry.enabled);
  return { sourceTxtPath, entries: subscriptions };
}

export async function backupSourceTxtEntries({ projectRoot, sourceRoot, fetchImpl = fetch }) {
  const { entries } = await loadSourceTxt({ projectRoot });
  if (entries.length === 0) return { enabledCount: 0, downloadedCount: 0 };

  const expectedPaths = new Set();
  let downloadedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let removedCount = 0;

  for (const entry of entries) {
    let response;
    try {
      response = await fetchWithFallback(entry.url, entry.headers ? { headers: entry.headers } : undefined, fetchImpl);
    } catch (error) {
      throw new SourceConfigError(`failed to fetch ${entry.url}: ${error.message}`, { entryName: entry.name, sourceName: entry.sourceName });
    }
    if (!response.ok) {
      throw new SourceConfigError(`failed to fetch ${entry.url}: HTTP ${response.status}`, { entryName: entry.name, sourceName: entry.sourceName });
    }

    const author = sanitizeName(authorFromUrl(entry.url)) || "unknown";
    const originalName = ensureAllowedBackupExtension(originalFileNameFromUrl(entry.url));
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    const backupFileName = `${base}@${author}${ext}`;

    const targetDir = path.join(sourceRoot, entry.sourceName);
    await fs.mkdir(targetDir, { recursive: true });
    const outPath = path.join(targetDir, backupFileName);
    const resolvedPath = path.resolve(outPath);
    expectedPaths.add(resolvedPath);

    const nextBytes = Buffer.from(await response.arrayBuffer());
    const currentBytes = await safeReadFile(outPath);
    if (currentBytes && Buffer.isBuffer(currentBytes) && currentBytes.equals(nextBytes)) {
      unchangedCount += 1;
    } else {
      await fs.writeFile(outPath, nextBytes);
      if (currentBytes) updatedCount += 1;
      else downloadedCount += 1;
    }
  }

  // 删除 sourceRoot 下不在 expectedPaths 中的文件
  const allFiles = await listFilesRecursively(sourceRoot);
  for (const filePath of allFiles) {
    const resolved = path.resolve(filePath);
    const base = path.basename(resolved);
    if (base === ".DS_Store") {
      await fs.rm(resolved, { force: true });
      removedCount += 1;
      continue;
    }
    if (!expectedPaths.has(resolved)) {
      await fs.rm(resolved, { force: true });
      removedCount += 1;
    }
  }

  await removeEmptyDirs(sourceRoot);

  return {
    enabledCount: entries.length,
    downloadedCount,
    updatedCount,
    unchangedCount,
    removedCount,
  };
}

export async function sourceConfigsFromSourceTxt({ projectRoot, sourceRoot }) {
  const { sourceTxtPath, entries } = await loadSourceTxt({ projectRoot });
  if (entries.length === 0) return [];

  const grouped = new Map();
  for (const entry of entries) {
    const list = grouped.get(entry.sourceName) ?? [];
    list.push(entry);
    grouped.set(entry.sourceName, list);
  }

  const sourceConfigs = [];
  for (const [sourceName, groupEntries] of grouped.entries()) {
    const sourceDir = path.join(sourceRoot, sourceName);
    const sourceRelativeDir = path.relative(sourceRoot, sourceDir).split(path.sep).join("/");
    const files = [];
    const usedSlugs = new Set();

    for (let index = 0; index < groupEntries.length; index += 1) {
      const entry = groupEntries[index];
      let slug = entry.slug;
      if (usedSlugs.has(slug)) {
        let counter = 2;
        while (usedSlugs.has(`${slug}-${counter}`)) counter += 1;
        slug = `${slug}-${counter}`;
      }
      usedSlugs.add(slug);

      files.push({
        name: entry.name,
        slug,
        description: entry.description,
        enabled: true,
        type: "http",
        url: entry.url,
        headers: entry.headers,
        behavior: "classical",
        format: entry.format,
        mihomo: "rules",
        separate: false,
        index,
        sourceName,
        sourceRelativeDir,
        sourceDir,
        sourceYamlPath: sourceTxtPath,
        sourceConfigRelativePath: path.relative(projectRoot, sourceTxtPath).split(path.sep).join("/"),
        sourceEntryKey: `${path.relative(projectRoot, sourceTxtPath).split(path.sep).join("/")}\0${sourceName}\0${index}`,
        configFileName: "source.txt",
        configBaseName: sourceName,
        configSlug: sanitizeName(sourceName) || sourceName,
        original: entry,
      });
    }

    sourceConfigs.push({
      sourceName,
      sourceDir,
      sourceRelativeDir,
      sourceYamlPath: sourceTxtPath,
      configFiles: [{ fileName: "source.txt", relativePath: path.relative(projectRoot, sourceTxtPath).split(path.sep).join("/") }],
      files,
    });
  }

  return sourceConfigs.sort((a, b) => a.sourceName.localeCompare(b.sourceName));
}
