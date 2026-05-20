const DEFAULT_MAIN_BRANCH = "main";
const DEFAULT_RELEASE_BRANCH = "release";
const GITHUB_TOKEN_HEADER_ANCHOR =
  '  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }';
const RULE_ANCHORS = {
  ip: "  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }",
  domain:
    "  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }",
  yaml: "  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }",
};

export class LinkGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = "LinkGenerationError";
  }
}

export function resolveRepository(repository = process.env.GITHUB_REPOSITORY) {
  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    throw new LinkGenerationError(
      "GitHub repository must be provided as owner/repo",
    );
  }
  return repository;
}

export function githubBlobURL({ repository, branch, filePath }) {
  return `https://github.com/${resolveRepository(repository)}/blob/${branch}/${encodePath(filePath)}`;
}

export function githubRawURL({ repository, branch, filePath }) {
  return `https://raw.githubusercontent.com/${resolveRepository(repository)}/${branch}/${encodePath(filePath)}`;
}

export function renderReleaseReadme({
  sourceConfig,
  artifacts,
  repository,
  mainBranch = DEFAULT_MAIN_BRANCH,
  releaseBranch = DEFAULT_RELEASE_BRANCH,
}) {
  const repo = resolveRepository(repository);
  const relevantArtifacts = artifacts.filter(
    (artifact) => artifact.sourceRelativeDir === sourceConfig.sourceRelativeDir,
  );

  const sections = [
    `# ${sourceConfig.sourceName}`,
    "",
    renderSourceConfigLinks({ sourceConfig, repository: repo, mainBranch }),
    "",
    "## 订阅列表",
    "",
    renderSourceTable({
      files: sourceConfig.files,
      repository: repo,
      mainBranch,
    }),
    "",
    "## Mihomo 用法（复制粘贴）",
    "",
    renderMihomoConfig({
      artifacts: relevantArtifacts,
      repository: repo,
      releaseBranch,
    }),
    "",
    "## 产物文件",
    "",
    renderArtifacts({
      artifacts: relevantArtifacts,
      repository: repo,
      releaseBranch,
    }),
    "",
  ];

  return sections.join("\n");
}

function renderSourceConfigLinks({ sourceConfig, repository, mainBranch }) {
  const configFiles = sourceConfig.configFiles?.length
    ? sourceConfig.configFiles
    : [
        {
          fileName: "source.yaml",
          relativePath: `source/${sourceConfig.sourceRelativeDir}/source.yaml`,
        },
      ];
  const links = configFiles.map(
    (configFile) =>
      `[${configFile.fileName}](${githubBlobURL({
        repository,
        branch: mainBranch,
        filePath: configFile.relativePath,
      })})`,
  );
  return `配置文件：${links.join("、")}`;
}

function renderSourceTable({ files, repository, mainBranch }) {
  const header = [
    "名称",
    "备注",
    "启用",
    "类型",
    "行为",
    "格式",
    "mihomo",
    "headers",
    "url",
    "path",
    "payload",
  ];
  const rows = [
    `| ${header.join(" |")} |`,
    `| ${header.map(() => "---").join(" |")} |`,
  ];
  for (const file of files) {
    rows.push(
      `| ${[
        file.name,
        file.description,
        String(file.enabled),
        file.type ?? "",
        file.behavior ?? "",
        file.format ?? "",
        file.mihomo ?? "rules",
        summarizeHeaders(file.headers),
        renderExternalLink(file.url),
        renderSourcePathLink({ file, repository, mainBranch }),
        summarizePayload(file.payload),
      ]
        .map(markdownCell)
        .join(" | ")} |`,
    );
  }
  return rows.join("\n");
}

function renderExternalLink(url) {
  if (!url) return "";
  return `[${lastPathPart(url)}](${url})`;
}

function renderSourcePathLink({ file, repository, mainBranch }) {
  if (!file.path) return "";
  const linkText = lastPathPart(file.path);
  if (!file.sourceFileRelativePath) return linkText;
  return `[${linkText}](${githubBlobURL({
    repository,
    branch: mainBranch,
    filePath: file.sourceFileRelativePath,
  })})`;
}

function renderArtifacts({ artifacts, repository, releaseBranch }) {
  const sourceArtifacts = new Map(
    artifacts
      .filter((artifact) => artifact.kind === "original")
      .map((artifact) => [sourceArtifactKey(artifact), artifact]),
  );
  const groups = [
    ["mrs(ipcidr)", ["ipcidr-mrs"]],
    ["mrs(domain)", ["domain-mrs"]],
    ["yaml(all)", ["classical-yaml"]],
    ["yaml(remaining)", ["remaining-yaml"]],
  ];
  const companionArtifacts = new Map(
    artifacts
      .filter((artifact) => artifact.kind.endsWith("-txt"))
      .map((artifact) => [companionArtifactKey(artifact), artifact]),
  );

  const renderedGroups = groups
    .map(([title, kinds]) => {
      const groupArtifacts = artifacts.filter((artifact) =>
        kinds.includes(artifact.kind),
      );
      if (groupArtifacts.length === 0) return "";
      return [
        `### ${title}`,
        "",
        renderArtifactItems({
          artifacts: groupArtifacts,
          sourceArtifacts,
          companionArtifacts,
          repository,
          releaseBranch,
        }),
      ].join("\n");
    })
    .filter(Boolean);

  return renderedGroups.length > 0
    ? renderedGroups.join("\n\n")
    : "_No artifacts generated._";
}

function renderMihomoConfig({ artifacts, repository, releaseBranch }) {
  const providers = ruleProviderEntries({ artifacts, repository, releaseBranch });

  if (providers.length === 0) return "_No Mihomo config generated._";
  return renderMihomoConfigForProviders(providers);
}

function ruleProviderEntries({ artifacts, repository, releaseBranch }) {
  const providers = artifacts.filter(isRuleProviderArtifact).map((artifact) => {
    const providerName = ruleProviderName(artifact);
    return {
      artifact,
      providerName,
      groupName:
        artifact.ruleGroupName ?? ruleGroupName({ artifact, providerName }),
      mihomo: artifact.mihomo ?? "rules",
      placeholder: Boolean(artifact.placeholder),
      placeholderMessage: artifact.placeholderMessage,
      rule: ruleProviderRule(artifact),
      url: githubRawURL({
        repository,
        branch: releaseBranch,
        filePath: artifact.relativePath,
      }),
    };
  });

  const groupOrder = new Map();
  for (const provider of providers) {
    if (!groupOrder.has(provider.groupName))
      groupOrder.set(provider.groupName, groupOrder.size);
  }
  providers.sort(
    (left, right) =>
      groupOrder.get(left.groupName) - groupOrder.get(right.groupName) ||
      Number(left.placeholder) - Number(right.placeholder) ||
      left.rule.order - right.rule.order ||
      left.providerName.localeCompare(right.providerName),
  );
  return providers;
}

function renderMihomoConfigForProviders(providers) {
  const routeProviders = providers.filter(
    (provider) => provider.mihomo !== "fake-ip-filter",
  );
  const fakeFilterProviders = providers.filter(
    (provider) =>
      provider.mihomo === "fake-ip-filter" && provider.rule.anchor !== "ip",
  );
  const lines = ["```yaml"];

  if (fakeFilterProviders.length > 0) {
    appendFakeIpFilterConfig(lines, fakeFilterProviders);
  }
  if (routeProviders.length > 0) {
    if (lines.length > 1) lines.push("");
    appendRuleRoutingConfig(lines, routeProviders);
  }

  appendRuleAnchors(lines, providers);
  lines.push("rule-providers:");
  for (const provider of providers) {
    appendRuleProvider(lines, provider);
  }
  lines.push("```");

  return lines.join("\n");
}

function appendRuleProvider(lines, provider) {
  lines.push(
    `  ${provider.providerName}: { <<: *${provider.rule.anchor}, url: ${provider.url} }${renderPlaceholderComment(provider)}`,
  );
}

function appendRuleRoutingConfig(lines, providers) {
  const groupNames = [
    ...new Set(providers.map((provider) => provider.groupName)),
  ];
  lines.push("proxy-groups:");
  for (const groupName of groupNames) {
    lines.push(
      `  - name: "${groupName}"`,
      "    type: select",
      "    proxies: []",
    );
  }

  lines.push("rules:");
  for (const provider of providers) {
    lines.push(
      `  - RULE-SET,${provider.providerName},${provider.groupName}${provider.rule.noResolve ? ",no-resolve" : ""}${renderPlaceholderComment(provider)}`,
    );
  }
}

function appendFakeIpFilterConfig(lines, providers) {
  lines.push(
    "dns:",
    "  # other fields",
    "  fake-ip-filter-mode: blacklist",
    "  fake-ip-filter:",
  );
  for (const provider of providers) {
    lines.push(`    - "rule-set:${provider.providerName}"${renderPlaceholderComment(provider)}`);
  }
}

function appendRuleAnchors(lines, providers) {
  const usedAnchors = new Set(
    providers.map((provider) => provider.rule.anchor),
  );
  const anchorLines = ["ip", "domain", "yaml"]
    .filter((anchor) => usedAnchors.has(anchor))
    .map((anchor) => RULE_ANCHORS[anchor]);
  if (anchorLines.length === 0) return;
  lines.push("rule-anchor:", GITHUB_TOKEN_HEADER_ANCHOR, ...anchorLines);
}

function renderArtifactItems({
  artifacts,
  sourceArtifacts,
  companionArtifacts,
  repository,
  releaseBranch,
}) {
  return artifacts
    .map((artifact) => {
      const webURL = githubBlobURL({
        repository,
        branch: releaseBranch,
        filePath: artifact.relativePath,
      });
      const rawURL = githubRawURL({
        repository,
        branch: releaseBranch,
        filePath: artifact.relativePath,
      });
      const companionArtifact = companionArtifacts.get(
        companionArtifactKey(artifact),
      );
      const sourceLine = renderArtifactSourceLine({
        artifact,
        sourceArtifacts,
        repository,
        releaseBranch,
      });
      return [
        `#### ${artifact.fileName}`,
        "",
        `GitHub: [${artifact.fileName}](${webURL})`,
        companionArtifact
          ? `Text: [${companionArtifact.fileName}](${githubBlobURL({
              repository,
              branch: releaseBranch,
              filePath: companionArtifact.relativePath,
            })})`
          : null,
        artifact.placeholder
          ? `Placeholder: ${placeholderMessage(artifact)}`
          : null,
        sourceLine,
        "",
        "```text",
        rawURL,
        "```",
      ]
        .filter((line) => line !== null)
        .join("\n");
    })
    .join("\n\n");
}

function renderPlaceholderComment(item) {
  return item.placeholder ? ` # placeholder: ${placeholderMessage(item)}` : "";
}

function placeholderMessage(item) {
  return item.placeholderMessage ?? "upstream currently has no rules for this provider";
}

function renderArtifactSourceLine({
  artifact,
  sourceArtifacts,
  repository,
  releaseBranch,
}) {
  const linkedArtifacts = artifact.sourceEntryKeys?.length
    ? artifact.sourceEntryKeys
        .map((sourceEntryKey) =>
          sourceArtifacts.get(
            sourceArtifactKey({ ...artifact, sourceEntryKey }),
          ),
        )
        .filter(Boolean)
    : (artifact.sourceEntryNames?.length
        ? artifact.sourceEntryNames
        : [artifact.entryName]
      )
        .map((entryName) =>
          sourceArtifacts.get(sourceArtifactKey({ ...artifact, entryName })),
        )
        .filter(Boolean);
  if (linkedArtifacts.length === 0) return "Source: _Unavailable_";

  const links = linkedArtifacts.map(
    (sourceArtifact) =>
      `[${sourceArtifact.fileName}](${githubBlobURL({
        repository,
        branch: releaseBranch,
        filePath: sourceArtifact.relativePath,
      })})`,
  );
  return `${linkedArtifacts.length === 1 ? "Source" : "Sources"}: ${links.join(", ")}`;
}

function isRuleProviderArtifact(artifact) {
  return ["domain-mrs", "ipcidr-mrs", "remaining-yaml"].includes(artifact.kind);
}

function ruleProviderName(artifact) {
  const baseName = ruleProviderBaseName(artifact);
  if (artifact.kind === "domain-mrs")
    return appendRuleProviderSuffix(baseName, "Domain");
  if (artifact.kind === "ipcidr-mrs")
    return appendRuleProviderSuffix(baseName, "IP");
  return baseName;
}

function ruleProviderBaseName(artifact) {
  if (artifact.kind === "remaining-yaml") {
    return sanitizeProviderName(artifact.entryName);
  }
  const suffixes = {
    "domain-mrs": ".mrs",
    "ipcidr-mrs": ".mrs",
    "remaining-yaml": ".yaml",
  };
  const suffix = suffixes[artifact.kind];
  const fileBaseName =
    suffix && artifact.fileName.endsWith(suffix)
      ? artifact.fileName.slice(0, -suffix.length)
      : artifact.entryName;
  return sanitizeProviderName(fileBaseName);
}

function sanitizeProviderName(value) {
  return (
    String(value ?? "")
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/\./g, "_")
      .replace(/^_+|_+$/g, "") || "rule"
  );
}

function appendRuleProviderSuffix(baseName, suffix) {
  if (baseName.endsWith(`_${suffix}`)) return baseName;
  if (suffix === "IP" && baseName.endsWith("_IPCIDR"))
    return `${baseName.slice(0, -"_IPCIDR".length)}_IP`;
  return `${baseName}_${suffix}`;
}

function ruleGroupName({ artifact, providerName }) {
  if (artifact.kind === "domain-mrs")
    return stripRuleProviderSuffix(providerName, "Domain");
  if (artifact.kind === "ipcidr-mrs")
    return stripRuleProviderSuffix(providerName, "IP");
  return providerName;
}

function stripRuleProviderSuffix(providerName, suffix) {
  const suffixText = `_${suffix}`;
  if (!providerName.endsWith(suffixText)) return providerName;
  return providerName.slice(0, -suffixText.length) || providerName;
}

function ruleProviderRule(artifact) {
  if (artifact.kind === "domain-mrs")
    return { anchor: "domain", order: 0, noResolve: false };
  if (artifact.kind === "ipcidr-mrs")
    return { anchor: "ip", order: 2, noResolve: true };
  return { anchor: "yaml", order: 1, noResolve: true };
}

function sourceArtifactKey(artifact) {
  if (artifact.sourceEntryKey)
    return `${artifact.sourceRelativeDir}\0${artifact.sourceEntryKey}`;
  return `${artifact.sourceRelativeDir}\0${artifact.entryName}`;
}

function companionArtifactKey(artifact) {
  return `${artifact.sourceRelativeDir}\0${artifact.entryName}\0${artifact.kind.replace(/-(mrs|txt)$/, "")}`;
}

function summarizePayload(payload) {
  if (payload == null) return "";
  const lines = payloadLines(payload);
  if (lines.length === 0) return "";
  return lines.length === 1 ? lines[0] : `${lines[0]}...`;
}

function summarizeHeaders(headers) {
  if (!headers) return "";
  if (typeof headers !== "object" || Array.isArray(headers))
    return String(headers);
  const entries = Object.entries(headers);
  if (entries.length === 0) return "";
  const [name, value] = entries[0];
  const first = `${name}: ${value}`;
  return entries.length === 1 ? first : `${first}...`;
}

function payloadLines(payload) {
  if (typeof payload === "string")
    return payload.split(/\r?\n/u).filter(Boolean);
  if (Array.isArray(payload)) return payload.map((item) => String(item));
  return [JSON.stringify(payload)];
}

function lastPathPart(value) {
  const text = String(value ?? "").replace(/\/+$/u, "");
  if (!text) return "";
  try {
    const url = new URL(text);
    const pathPart = url.pathname.replace(/\/+$/u, "").split("/").pop();
    return decodeURIComponent(pathPart || url.hostname);
  } catch {
    return text.split(/[\\/]/u).pop() || text;
  }
}

function markdownCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

function encodePath(filePath) {
  return filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}
