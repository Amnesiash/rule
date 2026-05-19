import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  githubBlobURL,
  githubRawURL,
  renderReleaseReadme,
  resolveRepository,
} from "../lib/links.mjs";

const sourceConfig = {
  sourceName: "example",
  sourceRelativeDir: "example",
  configFiles: [
    { fileName: "apple.yaml", relativePath: "source/example/apple.yaml" },
    { fileName: "google.yaml", relativePath: "source/example/google.yaml" },
  ],
  files: [
    {
      name: "mixed",
      description: "Mixed rules",
      enabled: true,
      type: "file",
      url: undefined,
      path: "rules.yaml",
      sourceFileRelativePath: "source/example/rules.yaml",
      payload: ["DOMAIN,first.example", "DOMAIN,second.example"],
      behavior: "classical",
      format: "yaml",
      mihomo: "rules",
    },
    {
      name: "draft",
      description: "Disabled draft",
      enabled: false,
      type: "http",
      url: "https://example.com/rules/draft.yaml",
      headers: {
        "User-Agent": "rule-test",
        Referer: "https://example.com",
      },
      path: undefined,
      payload: ["DOMAIN,draft.example"],
      behavior: undefined,
      format: "yaml",
      mihomo: "rules",
    },
  ],
};

test("generates GitHub blob and raw URLs", () => {
  assert.equal(
    githubBlobURL({
      repository: "xream/rule",
      branch: "main",
      filePath: "source/example/source.yaml",
    }),
    "https://github.com/xream/rule/blob/main/source/example/source.yaml",
  );
  assert.equal(
    githubRawURL({
      repository: "xream/rule",
      branch: "release",
      filePath: "example/mixed.domain.mrs",
    }),
    "https://raw.githubusercontent.com/xream/rule/release/example/mixed.domain.mrs",
  );
});

test("rejects missing repository when no override exists", () => {
  assert.throws(() => resolveRepository(""), /owner\/repo/);
});

test("renders source table and artifact links", () => {
  const readme = renderReleaseReadme({
    sourceConfig,
    repository: "xream/rule",
    artifacts: [
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "original",
        label: "mixed original",
        fileName: "mixed.original.yaml",
        relativePath: "example/mixed.original.yaml",
      },
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "domain-mrs",
        label: "mixed domain mrs",
        fileName: "mixed_Domain.mrs",
        relativePath: "example/mixed_Domain.mrs",
      },
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "domain-txt",
        label: "mixed domain txt",
        fileName: "mixed_Domain.txt",
        relativePath: "example/mixed_Domain.txt",
      },
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "ipcidr-mrs",
        label: "mixed ipcidr mrs",
        fileName: "mixed_IP.mrs",
        relativePath: "example/mixed_IP.mrs",
      },
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "classical-yaml",
        label: "mixed classical yaml",
        fileName: "mixed_Classical.yaml",
        relativePath: "example/mixed_Classical.yaml",
      },
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "remaining-yaml",
        label: "mixed remaining yaml",
        fileName: "mixed.yaml",
        relativePath: "example/mixed.yaml",
      },
      {
        sourceRelativeDir: "other",
        entryName: "other",
        kind: "domain-txt",
        label: "other",
        fileName: "other.txt",
        relativePath: "other/other.txt",
      },
    ],
  });

  assert.match(
    readme,
    /Source configs: \[apple\.yaml\]\(https:\/\/github\.com\/xream\/rule\/blob\/main\/source\/example\/apple\.yaml\), \[google\.yaml\]\(https:\/\/github\.com\/xream\/rule\/blob\/main\/source\/example\/google\.yaml\)/,
  );
  assert.match(
    readme,
    /\| name \|description \|enabled \|type \|behavior \|format \|mihomo \|headers \|url \|path \|payload \|/,
  );
  assert.match(readme, /\| mixed \| Mixed rules \| true \| file \|/);
  assert.match(readme, /User-Agent: rule-test\.\.\./);
  assert.match(
    readme,
    /\[rules\.yaml\]\(https:\/\/github\.com\/xream\/rule\/blob\/main\/source\/example\/rules\.yaml\)/,
  );
  assert.match(
    readme,
    /\[draft\.yaml\]\(https:\/\/example\.com\/rules\/draft\.yaml\)/,
  );
  assert.doesNotMatch(readme, /https:\/\/example\.com\/rules\/draft\.yaml \|/);
  assert.match(readme, /DOMAIN,first\.example\.\.\./);
  assert.match(readme, /DOMAIN,draft\.example/);
  assert.doesNotMatch(readme, /DOMAIN,draft\.example\.\.\./);
  assert.match(readme, /## Mihomo Config/);
  assert.equal(
    readme.includes(`proxy-groups:
  - name: "mixed"
    type: select
    proxies: []
rules:
  - RULE-SET,mixed_Domain,mixed
  - RULE-SET,mixed,mixed,no-resolve
  - RULE-SET,mixed_IP,mixed,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  mixed_Domain: { <<: *domain, url: https://raw.githubusercontent.com/xream/rule/release/example/mixed_Domain.mrs }
  mixed: { <<: *yaml, url: https://raw.githubusercontent.com/xream/rule/release/example/mixed.yaml }
  mixed_IP: { <<: *ip, url: https://raw.githubusercontent.com/xream/rule/release/example/mixed_IP.mrs }`),
    true,
  );
  assert.doesNotMatch(readme, /mixed_IPCIDR/);
  assert.doesNotMatch(readme, /mixed\.ipcidr\.mrs/);
  assert.match(readme, /### mrs\(domain\)/);
  assert.match(readme, /### yaml\(all\)/);
  assert.match(readme, /### yaml\(remaining\)/);
  assert.doesNotMatch(readme, /剩余部分/);
  assert.match(readme, /#### mixed_Domain\.mrs/);
  assert.match(
    readme,
    /\[mixed_Domain\.mrs\]\(https:\/\/github\.com\/xream\/rule\/blob\/release\/example\/mixed_Domain\.mrs\)/,
  );
  assert.match(
    readme,
    /Text: \[mixed_Domain\.txt\]\(https:\/\/github\.com\/xream\/rule\/blob\/release\/example\/mixed_Domain\.txt\)/,
  );
  assert.match(
    readme,
    /Source: \[mixed\.original\.yaml\]\(https:\/\/github\.com\/xream\/rule\/blob\/release\/example\/mixed\.original\.yaml\)/,
  );
  assert.match(
    readme,
    /```text\nhttps:\/\/raw\.githubusercontent\.com\/xream\/rule\/release\/example\/mixed_Domain\.mrs\n```/,
  );
  assert.doesNotMatch(
    readme,
    /raw\.githubusercontent\.com\/xream\/rule\/release\/example\/mixed_Domain\.txt/,
  );
  assert.match(
    readme,
    /\[mixed\.yaml\]\(https:\/\/github\.com\/xream\/rule\/blob\/release\/example\/mixed\.yaml\)/,
  );
  assert.match(
    readme,
    /GitHub: \[mixed\.yaml\]\(https:\/\/github\.com\/xream\/rule\/blob\/release\/example\/mixed\.yaml\)\nSource:/,
  );
  assert.doesNotMatch(readme, /GitHub: \[mixed\.yaml\][\s\S]*?\n\nSource:/);
  assert.doesNotMatch(readme, /other\.txt/);
});

test("does not double-append domain suffix in Mihomo provider names", () => {
  const readme = renderReleaseReadme({
    sourceConfig,
    repository: "xream/rule",
    artifacts: [
      {
        sourceRelativeDir: "example",
        entryName: "mixed_Domain",
        kind: "domain-mrs",
        label: "mixed domain source mrs",
        fileName: "mixed_Domain.mrs",
        relativePath: "example/mixed_Domain.mrs",
      },
    ],
  });

  assert.match(readme, /RULE-SET,mixed_Domain,mixed/);
  assert.match(
    readme,
    /mixed_Domain: \{ <<: \*domain, url: https:\/\/raw\.githubusercontent\.com\/xream\/rule\/release\/example\/mixed_Domain\.mrs \}/,
  );
  assert.match(
    readme,
    /\n  domain: &domain \{ type: http, behavior: domain, format: mrs, interval: 86400, header: \*github-token-header \}/,
  );
  assert.match(
    readme,
    /github-token-header: &github-token-header \{ Authorization: \["Bearer <YOUR_GITHUB_TOKEN>"\] \}/,
  );
  assert.doesNotMatch(readme, /\n  ip: &ip /);
  assert.doesNotMatch(readme, /\n  yaml: &yaml /);
  assert.doesNotMatch(readme, /mixed_Domain_Domain/);
});

test("renders placeholder providers after real providers with comments", () => {
  const readme = renderReleaseReadme({
    sourceConfig,
    repository: "xream/rule",
    artifacts: [
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "domain-mrs",
        label: "mixed domain mrs",
        fileName: "mixed_Domain.mrs",
        relativePath: "example/mixed_Domain.mrs",
      },
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "ipcidr-mrs",
        label: "mixed ipcidr mrs",
        fileName: "mixed_IP.mrs",
        relativePath: "example/mixed_IP.mrs",
        placeholder: true,
        placeholderMessage:
          "upstream currently has no ipcidr rules; contains 203.0.113.1/32 only",
      },
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "ipcidr-txt",
        label: "mixed ipcidr txt",
        fileName: "mixed_IP.txt",
        relativePath: "example/mixed_IP.txt",
        placeholder: true,
        placeholderMessage:
          "upstream currently has no ipcidr rules; contains 203.0.113.1/32 only",
      },
      {
        sourceRelativeDir: "example",
        entryName: "mixed",
        kind: "remaining-yaml",
        label: "mixed yaml",
        fileName: "mixed.yaml",
        relativePath: "example/mixed.yaml",
        placeholder: true,
        placeholderMessage:
          "upstream currently has no remaining rules; contains DOMAIN,blackhole.invalid only",
      },
    ],
  });

  assert.equal(
    readme.includes(`rules:
  - RULE-SET,mixed_Domain,mixed
  - RULE-SET,mixed,mixed,no-resolve # placeholder: upstream currently has no remaining rules; contains DOMAIN,blackhole.invalid only
  - RULE-SET,mixed_IP,mixed,no-resolve # placeholder: upstream currently has no ipcidr rules; contains 203.0.113.1/32 only`),
    true,
  );
  assert.equal(
    readme.includes(`rule-providers:
  mixed_Domain: { <<: *domain, url: https://raw.githubusercontent.com/xream/rule/release/example/mixed_Domain.mrs }
  mixed: { <<: *yaml, url: https://raw.githubusercontent.com/xream/rule/release/example/mixed.yaml } # placeholder: upstream currently has no remaining rules; contains DOMAIN,blackhole.invalid only
  mixed_IP: { <<: *ip, url: https://raw.githubusercontent.com/xream/rule/release/example/mixed_IP.mrs } # placeholder: upstream currently has no ipcidr rules; contains 203.0.113.1/32 only`),
    true,
  );
  assert.match(
    readme,
    /Placeholder: upstream currently has no ipcidr rules; contains 203\.0\.113\.1\/32 only/,
  );
  assert.match(
    readme,
    /Text: \[mixed_IP\.txt\]\(https:\/\/github\.com\/xream\/rule\/blob\/release\/example\/mixed_IP\.txt\)/,
  );
});

test("renders fake-ip-filter rule providers as dns fake-ip-filter config", () => {
  const readme = renderReleaseReadme({
    sourceConfig: {
      sourceName: "fake-ip-filter",
      sourceRelativeDir: "fake-ip-filter",
      configFiles: [
        {
          fileName: "fake-ip-filter.yaml",
          relativePath: "source/fake-ip-filter/fake-ip-filter.yaml",
        },
      ],
      files: [
        {
          name: "wwqgtxx",
          enabled: true,
          type: "http",
          behavior: "domain",
          format: "mrs",
          mihomo: "fake-ip-filter",
          url: "https://example.com/fakeip-filter.mrs",
        },
      ],
    },
    repository: "xream/rule",
    artifacts: [
      {
        sourceRelativeDir: "fake-ip-filter",
        entryName: "fake-ip-filter",
        ruleGroupName: "fake-ip-filter",
        kind: "domain-mrs",
        mihomo: "fake-ip-filter",
        label: "fake-ip-filter domain mrs",
        fileName: "fake-ip-filter_Domain.mrs",
        relativePath: "fake-ip-filter/fake-ip-filter_Domain.mrs",
      },
      {
        sourceRelativeDir: "fake-ip-filter",
        entryName: "fake-ip-filter",
        ruleGroupName: "fake-ip-filter",
        kind: "domain-txt",
        label: "fake-ip-filter domain txt",
        fileName: "fake-ip-filter_Domain.txt",
        relativePath: "fake-ip-filter/fake-ip-filter_Domain.txt",
      },
    ],
  });

  assert.match(
    readme,
    /dns:\n  # other fields\n  fake-ip-filter-mode: blacklist\n  fake-ip-filter:\n    - "rule-set:fake-ip-filter_Domain"/,
  );
  assert.match(
    readme,
    /fake-ip-filter_Domain: \{ <<: \*domain, url: https:\/\/raw\.githubusercontent\.com\/xream\/rule\/release\/fake-ip-filter\/fake-ip-filter_Domain\.mrs \}/,
  );
  assert.match(
    readme,
    /\n  domain: &domain \{ type: http, behavior: domain, format: mrs, interval: 86400, header: \*github-token-header \}/,
  );
  assert.match(
    readme,
    /github-token-header: &github-token-header \{ Authorization: \["Bearer <YOUR_GITHUB_TOKEN>"\] \}/,
  );
  assert.doesNotMatch(readme, /\n  ip: &ip /);
  assert.doesNotMatch(readme, /\n  yaml: &yaml /);
  assert.doesNotMatch(readme, /proxy-groups:/);
  assert.doesNotMatch(readme, /RULE-SET,fake-ip-filter_Domain/);
});
