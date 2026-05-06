import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const VALID_TYPES = new Set(["http", "file", "inline"]);
const VALID_FORMATS = new Set(["yaml", "text", "mrs"]);
const VALID_BEHAVIORS = new Set(["domain", "ipcidr", "classical"]);
const VALID_MIHOMO_MODES = new Set(["rules", "fake-ip-filter"]);

export class SourceConfigError extends Error {
  constructor(message, context = {}) {
    const location = [context.sourceName, context.entryName].filter(Boolean).join(":");
    super(location ? `${location}: ${message}` : message);
    this.name = "SourceConfigError";
    this.context = context;
  }
}

export function sanitizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function discoverSourceDirs(sourceRoot) {
  let entries;
  try {
    entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const dirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sourceDir = path.join(sourceRoot, entry.name);
    const configPaths = await discoverSourceConfigPaths(sourceDir);
    if (configPaths.length > 0) dirs.push(sourceDir);
  }
  return dirs.sort();
}

export async function loadAllSources({ projectRoot, sourceRoot }) {
  const dirs = await discoverSourceDirs(sourceRoot);
  const configs = [];
  for (const sourceDir of dirs) {
    const configPaths = await discoverSourceConfigPaths(sourceDir);
    configs.push(await loadSourceConfig({ projectRoot, sourceRoot, sourceDir, configPaths }));
  }
  return configs;
}

export async function loadSourceConfig({ projectRoot, sourceRoot, sourceDir, configPaths }) {
  const sourceName = path.basename(sourceDir);
  const sourceRelativeDir = path.relative(sourceRoot, sourceDir).split(path.sep).join("/");
  const resolvedConfigPaths = configPaths ?? [path.join(sourceDir, "source.yaml")];
  const configFiles = [];
  const files = [];

  for (const sourceYamlPath of resolvedConfigPaths) {
    const configFileName = path.basename(sourceYamlPath);
    const sourceConfigRelativePath = path.relative(projectRoot, sourceYamlPath).split(path.sep).join("/");
    const raw = await fs.readFile(sourceYamlPath, "utf8");
    const configBaseName = path.basename(configFileName, path.extname(configFileName));
    let parsed;
    try {
      parsed = YAML.parse(raw) ?? {};
    } catch (error) {
      throw new SourceConfigError(`${configFileName}: invalid YAML: ${error.message}`, {
        sourceName,
      });
    }

    const entries = sourceEntriesFromConfig(parsed);
    if (!entries) {
      throw new SourceConfigError(`${configFileName} must contain a source entry array`, {
        sourceName,
      });
    }

    configFiles.push({
      fileName: configFileName,
      relativePath: path.relative(projectRoot, sourceYamlPath).split(path.sep).join("/"),
    });

    files.push(
      ...entries.map((entry, index) =>
        normalizeEntry({
          entry,
          index: files.length + index,
          projectRoot,
          sourceDir,
          sourceName,
          sourceRelativeDir,
          sourceYamlPath,
          sourceConfigRelativePath,
          configFileName,
          configBaseName,
        }),
      ),
    );
  }

  assignOriginalArtifactSlugs(files);

  return {
    sourceName,
    sourceDir,
    sourceRelativeDir,
    sourceYamlPath: resolvedConfigPaths[0],
    configFiles,
    files,
  };
}

async function discoverSourceConfigPaths(sourceDir) {
  let entries;
  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const configPaths = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/\.ya?ml$/u.test(entry.name)) continue;
    const configPath = path.join(sourceDir, entry.name);
    if (await looksLikeSourceConfig(configPath)) configPaths.push(configPath);
  }
  return configPaths.sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

async function looksLikeSourceConfig(configPath) {
  let raw;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch {
    return false;
  }
  try {
    const parsed = YAML.parse(raw) ?? {};
    return sourceEntriesFromConfig(parsed) !== null;
  } catch {
    return false;
  }
}

function sourceEntriesFromConfig(parsed) {
  if (Array.isArray(parsed)) return parsed.length > 0 && parsed.every(looksLikeSourceEntry) ? parsed : null;
  return null;
}

function looksLikeSourceEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return ["type", "url", "headers", "path", "payload", "behavior", "format", "mihomo", "enabled"].some((key) => key in value);
}

function normalizeEntry({
  entry,
  index,
  projectRoot,
  sourceDir,
  sourceName,
  sourceRelativeDir,
  sourceYamlPath,
  sourceConfigRelativePath,
  configFileName,
  configBaseName,
}) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new SourceConfigError(`entries[${index}] must be an object`, { sourceName });
  }

  const name = String(entry.name ?? "").trim();
  const entryName = name || `entries[${index}]`;
  const enabled = entry.enabled !== false;
  const normalized = {
    name,
    slug: sanitizeName(name || `entry-${index + 1}`),
    description: entry.description == null ? "" : String(entry.description),
    enabled,
    type: entry.type == null ? undefined : String(entry.type).trim().toLowerCase(),
    url: entry.url == null ? undefined : String(entry.url).trim(),
    headers: entry.headers,
    path: entry.path == null ? undefined : String(entry.path).trim(),
    payload: entry.payload,
    behavior: entry.behavior == null ? undefined : String(entry.behavior).trim().toLowerCase(),
    format: entry.format == null ? "yaml" : String(entry.format).trim().toLowerCase(),
    mihomo: entry.mihomo == null ? "rules" : String(entry.mihomo).trim().toLowerCase(),
    separate: entry.separate === true,
    index,
    sourceName,
    sourceRelativeDir,
    sourceDir,
    sourceYamlPath,
    sourceConfigRelativePath,
    sourceEntryKey: `${sourceConfigRelativePath}\0${index}`,
    configFileName,
    configBaseName,
    configSlug: sanitizeName(configBaseName),
    original: entry,
  };

  if (!normalized.name && enabled) {
    throw new SourceConfigError("enabled entries must define name", { sourceName, entryName });
  }
  if (!normalized.slug && enabled) {
    throw new SourceConfigError("entry name must contain at least one URL-safe character", {
      sourceName,
      entryName,
    });
  }

  if (enabled) {
    validateEnabledEntry(normalized, { projectRoot, sourceDir, sourceName, entryName });
  }

  return normalized;
}

function normalizeHeaders(headers, context) {
  if (headers == null) return undefined;
  if (typeof headers !== "object" || Array.isArray(headers)) {
    throw new SourceConfigError("headers must be a mapping of header names to scalar values", context);
  }

  const normalized = {};
  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = String(rawName).trim();
    if (!name) throw new SourceConfigError("header names cannot be empty", context);
    if (/[\r\n]/.test(name)) throw new SourceConfigError("header names cannot contain newlines", context);
    if (rawValue == null || typeof rawValue === "object") {
      throw new SourceConfigError("header values must be scalar", context);
    }
    const value = String(rawValue);
    if (/[\r\n]/.test(value)) throw new SourceConfigError("header values cannot contain newlines", context);
    normalized[name] = value;
  }

  return normalized;
}

function assignOriginalArtifactSlugs(files) {
  const slugCounts = new Map();
  for (const entry of files) {
    if (!entry.enabled) continue;
    slugCounts.set(entry.slug, (slugCounts.get(entry.slug) ?? 0) + 1);
  }

  const used = new Set();
  for (const entry of files) {
    const duplicateSlug = (slugCounts.get(entry.slug) ?? 0) > 1;
    const prefixedSlug = entry.configSlug && entry.configSlug !== entry.slug
      ? `${entry.configSlug}_${entry.slug}`
      : entry.slug;
    const candidates = duplicateSlug
      ? [prefixedSlug, `${prefixedSlug}-${entry.index + 1}`]
      : [entry.slug, `${prefixedSlug}-${entry.index + 1}`];

    const selected = candidates.find((candidate) => candidate && !used.has(candidate)) || `${prefixedSlug}-${entry.index + 1}`;
    entry.originalArtifactSlug = selected;
    if (entry.enabled) used.add(selected);
  }
}

function validateEnabledEntry(entry, context) {
  if (!VALID_TYPES.has(entry.type)) {
    throw new SourceConfigError("type must be one of http, file, inline", context);
  }
  if (!VALID_FORMATS.has(entry.format)) {
    throw new SourceConfigError("format must be one of yaml, text, mrs", context);
  }
  if (entry.behavior !== undefined && !VALID_BEHAVIORS.has(entry.behavior)) {
    throw new SourceConfigError("behavior must be one of domain, ipcidr, classical", context);
  }
  if (!VALID_MIHOMO_MODES.has(entry.mihomo)) {
    throw new SourceConfigError("mihomo must be one of rules, fake-ip-filter", context);
  }
  if (entry.format === "mrs" && !entry.behavior) {
    throw new SourceConfigError("mrs entries must define behavior", context);
  }
  if (entry.format === "mrs" && entry.behavior === "classical") {
    throw new SourceConfigError("mrs entries only support domain or ipcidr behavior", context);
  }
  entry.headers = normalizeHeaders(entry.headers, context);

  switch (entry.type) {
    case "http":
      if (!entry.url) throw new SourceConfigError("http entries must define url", context);
      try {
        new URL(entry.url);
      } catch {
        throw new SourceConfigError("url must be absolute and valid", context);
      }
      break;
    case "file":
      if (!entry.path) throw new SourceConfigError("file entries must define path", context);
      entry.resolvedPath = resolveSourceFilePath({
        projectRoot: context.projectRoot,
        sourceDir: context.sourceDir,
        sourcePath: entry.path,
        sourceName: context.sourceName,
        entryName: context.entryName,
      });
      entry.sourceFileRelativePath = path.relative(context.projectRoot, entry.resolvedPath).split(path.sep).join("/");
      break;
    case "inline":
      if (entry.payload == null) {
        throw new SourceConfigError("inline entries must define payload", context);
      }
      break;
  }
}

export function resolveSourceFilePath({ projectRoot, sourceDir, sourcePath, sourceName, entryName }) {
  const resolved = path.isAbsolute(sourcePath)
    ? path.resolve(sourcePath)
    : path.resolve(sourceDir, sourcePath);
  const project = path.resolve(projectRoot);
  if (!isInside(project, resolved)) {
    throw new SourceConfigError("file path must stay inside the project", { sourceName, entryName });
  }
  return resolved;
}

export function enabledFiles(sourceConfig) {
  return sourceConfig.files.filter((entry) => entry.enabled);
}
