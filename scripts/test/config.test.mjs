import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadAllSources, loadSourceConfig, SourceConfigError } from "../lib/config.mjs";

async function withProject(files, fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rule-config-"));
  const sourceRoot = path.join(root, "source");
  const sourceDir = path.join(sourceRoot, "example");
  await fs.mkdir(sourceDir, { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
  try {
    return await fn({ root, sourceRoot, sourceDir });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("validates enabled http, file, and inline entries", async () => {
  await withProject(
    {
      "source/example/local.yaml": "payload:\n  - DOMAIN,example.org\n",
      "source/example/source.yaml": `
- name: remote
  description: Remote source
  type: http
  url: https://example.com/rules.yaml
  headers:
    User-Agent: rule-test
    X-Enabled: true
  behavior: classical
  format: yaml
  mihomo: fake-ip-filter
- name: local
  description: Local source
  type: file
  path: local.yaml
  behavior: classical
  format: yaml
- name: inline
  description: Inline source
  type: inline
  payload:
    - DOMAIN,inline.example
  behavior: classical
  format: text
`,
    },
    async ({ root, sourceRoot, sourceDir }) => {
      const config = await loadSourceConfig({ projectRoot: root, sourceRoot, sourceDir });
      assert.equal(config.files.length, 3);
      assert.equal(config.files[0].enabled, true);
      assert.equal(config.files[0].url, "https://example.com/rules.yaml");
      assert.equal(config.files[0].mihomo, "fake-ip-filter");
      assert.deepEqual(config.files[0].headers, {
        "User-Agent": "rule-test",
        "X-Enabled": "true",
      });
      assert.equal(config.files[1].resolvedPath, path.join(sourceDir, "local.yaml"));
      assert.equal(config.files[1].sourceFileRelativePath, "source/example/local.yaml");
      assert.deepEqual(config.files[2].payload, ["DOMAIN,inline.example"]);
    },
  );
});

test("http headers must be a mapping of scalar values", async () => {
  await withProject(
    {
      "source/example/source.yaml": `
- name: invalid-headers
  type: http
  url: https://example.com/rules.yaml
  headers:
    X-Bad:
      nested: value
  behavior: classical
  format: yaml
`,
    },
    async ({ root, sourceRoot, sourceDir }) => {
      await assert.rejects(
        () => loadSourceConfig({ projectRoot: root, sourceRoot, sourceDir }),
        /header values must be scalar/,
      );
    },
  );
});

test("disabled incomplete entries are parseable and not validated as work", async () => {
  await withProject(
    {
      "source/example/source.yaml": `
- name: draft
  description: Not ready
  enabled: false
  type: http
  headers:
    X-Draft:
      nested: value
`,
    },
    async ({ root, sourceRoot, sourceDir }) => {
      const config = await loadSourceConfig({ projectRoot: root, sourceRoot, sourceDir });
      assert.equal(config.files[0].enabled, false);
      assert.equal(config.files[0].url, undefined);
    },
  );
});

test("loads multiple source config YAML files from one source directory", async () => {
  await withProject(
    {
      "source/example/local.yaml": "payload:\n  - DOMAIN,local.example\n",
      "source/example/apple.yaml": `
- name: apple
  type: http
  url: https://example.com/apple.yaml
  behavior: classical
  format: yaml
`,
      "source/example/google.yaml": `
- name: google
  type: http
  url: https://example.com/google.yaml
  behavior: classical
  format: yaml
`,
    },
    async ({ root, sourceRoot }) => {
      const configs = await loadAllSources({ projectRoot: root, sourceRoot });
      assert.equal(configs.length, 1);
      assert.deepEqual(
        configs[0].configFiles.map((configFile) => configFile.fileName),
        ["apple.yaml", "google.yaml"],
      );
      assert.deepEqual(
        configs[0].files.map((file) => file.name),
        ["apple", "google"],
      );
    },
  );
});

test("loads top-level source entry arrays", async () => {
  await withProject(
    {
      "source/example/proxy.yaml": `
- name: PROXY_OWN
  type: inline
  behavior: classical
  format: yaml
  payload:
    - DOMAIN,ghproxy.com
`,
    },
    async ({ root, sourceRoot }) => {
      const configs = await loadAllSources({ projectRoot: root, sourceRoot });
      assert.equal(configs.length, 1);
      assert.equal(configs[0].configFiles[0].fileName, "proxy.yaml");
      assert.equal(configs[0].files[0].name, "PROXY_OWN");
      assert.equal(configs[0].files[0].slug, "PROXY_OWN");
      assert.equal(configs[0].files[0].enabled, true);
      assert.deepEqual(configs[0].files[0].payload, ["DOMAIN,ghproxy.com"]);
    },
  );
});

test("enabled http entries require url", async () => {
  await withProject(
    {
      "source/example/source.yaml": `
- name: missing-url
  type: http
  behavior: classical
  format: yaml
`,
    },
    async ({ root, sourceRoot, sourceDir }) => {
      await assert.rejects(
        () => loadSourceConfig({ projectRoot: root, sourceRoot, sourceDir }),
        (error) =>
          error instanceof SourceConfigError &&
          error.message.includes("example:missing-url") &&
          error.message.includes("http entries must define url"),
      );
    },
  );
});

test("file entries cannot resolve outside the project", async () => {
  await withProject(
    {
      "source/example/source.yaml": `
- name: outside
  type: file
  path: ../../../outside.yaml
  behavior: classical
  format: yaml
`,
    },
    async ({ root, sourceRoot, sourceDir }) => {
      await assert.rejects(
        () => loadSourceConfig({ projectRoot: root, sourceRoot, sourceDir }),
        /file path must stay inside the project/,
      );
    },
  );
});

test("mrs entries require behavior", async () => {
  await withProject(
    {
      "source/example/source.yaml": `
- name: binary
  type: http
  url: https://example.com/rules.mrs
  format: mrs
`,
    },
    async ({ root, sourceRoot, sourceDir }) => {
      await assert.rejects(
        () => loadSourceConfig({ projectRoot: root, sourceRoot, sourceDir }),
        /mrs entries must define behavior/,
      );
    },
  );
});

test("mrs entries reject classical behavior", async () => {
  await withProject(
    {
      "source/example/source.yaml": `
- name: binary
  type: http
  url: https://example.com/rules.mrs
  behavior: classical
  format: mrs
`,
    },
    async ({ root, sourceRoot, sourceDir }) => {
      await assert.rejects(
        () => loadSourceConfig({ projectRoot: root, sourceRoot, sourceDir }),
        /mrs entries only support domain or ipcidr behavior/,
      );
    },
  );
});

test("mihomo mode must be supported on enabled entries", async () => {
  await withProject(
    {
      "source/example/source.yaml": `
- name: unsupported-mihomo
  type: http
  url: https://example.com/rules.yaml
  behavior: classical
  format: yaml
  mihomo: dns-policy
`,
    },
    async ({ root, sourceRoot, sourceDir }) => {
      await assert.rejects(
        () => loadSourceConfig({ projectRoot: root, sourceRoot, sourceDir }),
        /mihomo must be one of rules, fake-ip-filter/,
      );
    },
  );
});
