import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  compareProviderArtifactChanges,
  loadManifestFromReleaseDir,
  renderTelegramArtifactChangeMessage,
  sendTelegramMessage,
} from "../lib/notifications.mjs";

const execFileAsync = promisify(execFile);

test("compares provider artifacts by real presence and ignores placeholders", () => {
  const previousManifest = {
    providerArtifacts: [
      {
        relativePath: "example/apple_Domain.mrs",
        sourceRelativeDir: "example",
        fileName: "apple_Domain.mrs",
        kind: "domain-mrs",
        placeholder: false,
      },
      {
        relativePath: "example/apple_IP.mrs",
        sourceRelativeDir: "example",
        fileName: "apple_IP.mrs",
        kind: "ipcidr-mrs",
        placeholder: true,
      },
      {
        relativePath: "example/apple.yaml",
        sourceRelativeDir: "example",
        fileName: "apple.yaml",
        kind: "remaining-yaml",
        placeholder: false,
      },
    ],
  };
  const currentManifest = {
    providerArtifacts: [
      {
        relativePath: "example/apple_Domain.mrs",
        sourceRelativeDir: "example",
        fileName: "apple_Domain.mrs",
        kind: "domain-mrs",
        placeholder: true,
      },
      {
        relativePath: "example/apple_IP.mrs",
        sourceRelativeDir: "example",
        fileName: "apple_IP.mrs",
        kind: "ipcidr-mrs",
        placeholder: false,
      },
      {
        relativePath: "example/apple.yaml",
        sourceRelativeDir: "example",
        fileName: "apple.yaml",
        kind: "remaining-yaml",
        placeholder: false,
      },
      {
        relativePath: "example/apple_IP.txt",
        sourceRelativeDir: "example",
        fileName: "apple_IP.txt",
        kind: "ipcidr-txt",
        placeholder: false,
      },
    ],
  };

  const changes = compareProviderArtifactChanges(previousManifest, currentManifest);

  assert.deepEqual(
    changes.added.map((artifact) => artifact.relativePath),
    ["example/apple_IP.mrs"],
  );
  assert.deepEqual(
    changes.removed.map((artifact) => artifact.relativePath),
    ["example/apple_Domain.mrs"],
  );
  assert.deepEqual(changes.updated, []);
});

test("infers old release provider artifacts from file presence", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rule-notify-"));
  try {
    await fs.mkdir(path.join(root, "example"), { recursive: true });
    await fs.writeFile(path.join(root, "example", "apple_Domain.mrs"), "");
    await fs.writeFile(path.join(root, "example", "apple_Domain.txt"), "apple.example\n");
    await fs.writeFile(path.join(root, "example", "apple_IP.txt"), "");
    await fs.writeFile(path.join(root, "example", "apple.original.yaml"), "");
    await fs.writeFile(path.join(root, "example", "apple.yaml"), "");
    await fs.writeFile(path.join(root, "example", "README.md"), "");

    const manifest = await loadManifestFromReleaseDir(root);

    assert.deepEqual(
      manifest.providerArtifacts.map((artifact) => ({
        relativePath: artifact.relativePath,
        kind: artifact.kind,
        placeholder: artifact.placeholder,
      })),
      [
        {
          relativePath: "example/apple_Domain.mrs",
          kind: "domain-mrs",
          placeholder: false,
        },
        {
          relativePath: "example/apple.yaml",
          kind: "classical-yaml",
          placeholder: false,
        },
      ],
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("marks inferred old release placeholders from companion files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rule-notify-"));
  try {
    await fs.mkdir(path.join(root, "example"), { recursive: true });
    await fs.writeFile(path.join(root, "example", "empty_Domain.mrs"), "");
    await fs.writeFile(path.join(root, "example", "empty_Domain.txt"), "blackhole.invalid\n");
    await fs.writeFile(path.join(root, "example", "empty_IP.mrs"), "");
    await fs.writeFile(path.join(root, "example", "empty_IP.txt"), "IP-CIDR,203.0.113.1/32\n");
    await fs.writeFile(path.join(root, "example", "empty.yaml"), "payload:\n  - DOMAIN,blackhole.invalid\n");

    const previousManifest = await loadManifestFromReleaseDir(root);
    const currentManifest = {
      providerArtifacts: [
        {
          relativePath: "example/empty_Domain.mrs",
          sourceRelativeDir: "example",
          kind: "domain-mrs",
          placeholder: true,
        },
        {
          relativePath: "example/empty_IP.mrs",
          sourceRelativeDir: "example",
          kind: "ipcidr-mrs",
          placeholder: true,
        },
        {
          relativePath: "example/empty.yaml",
          sourceRelativeDir: "example",
          kind: "classical-yaml",
          placeholder: false,
        },
      ],
    };

    assert.deepEqual(
      previousManifest.providerArtifacts.map((artifact) => ({
        relativePath: artifact.relativePath,
        placeholder: artifact.placeholder,
      })),
      [
        {
          relativePath: "example/empty_Domain.mrs",
          placeholder: true,
        },
        {
          relativePath: "example/empty_IP.mrs",
          placeholder: true,
        },
        {
          relativePath: "example/empty.yaml",
          placeholder: false,
        },
      ],
    );
    assert.deepEqual(
      compareProviderArtifactChanges(previousManifest, currentManifest),
      { added: [], removed: [], updated: [] },
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("renders compact Telegram HTML message", () => {
  const message = renderTelegramArtifactChangeMessage({
    repository: "xream/rule",
    changes: {
      added: [
        {
          relativePath: "Apple/Apple_IP.mrs",
          sourceRelativeDir: "Apple",
          kind: "ipcidr-mrs",
        },
      ],
      removed: [
        {
          relativePath: "AI/AI.yaml",
          sourceRelativeDir: "AI",
          kind: "remaining-yaml",
        },
      ],
    },
  });

  assert.match(message, /<b>rule provider 产物变化<\/b>/);
  assert.match(message, /新增 <b>1<\/b> \/ 减少 <b>1<\/b>/);
  assert.match(
    message,
    /<a href="https:\/\/raw\.githubusercontent\.com\/xream\/rule\/release\/Apple\/Apple_IP\.mrs">Apple\/Apple_IP\.mrs<\/a> <code>ipcidr<\/code>/,
  );
  assert.match(message, /<b>减少<\/b>/);
});

test("truncates Telegram HTML message to fit sendMessage limit", () => {
  const makeArtifacts = (prefix) =>
    Array.from({ length: 25 }, (_, index) => ({
      relativePath: `VeryLongSourceDirectoryName${prefix}${index}/VeryLongProviderName${prefix}${index}_Domain.mrs`,
      sourceRelativeDir: `VeryLongSourceDirectoryName${prefix}${index}`,
      kind: "domain-mrs",
    }));

  const message = renderTelegramArtifactChangeMessage({
    repository: "xream/rule",
    changes: {
      added: makeArtifacts("Added"),
      removed: makeArtifacts("Removed"),
    },
  });

  assert.ok(message.length <= 4096, `message length was ${message.length}`);
  assert.match(message, /新增 <b>25<\/b> \/ 减少 <b>25<\/b>/);
  assert.match(message, /还有 \d+ 项/);
});

test("sends Telegram HTML message with disabled link preview", async () => {
  let request;
  await sendTelegramMessage({
    botToken: "token",
    chatId: "chat",
    text: "<b>Hello</b>",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });

  assert.equal(request.url, "https://api.telegram.org/bottoken/sendMessage");
  assert.deepEqual(JSON.parse(request.options.body), {
    chat_id: "chat",
    text: "<b>Hello</b>",
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
});

test("CLI writes message for post-publish sending", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rule-notify-cli-"));
  try {
    const previousManifestPath = path.join(root, "previous.json");
    const currentManifestPath = path.join(root, "current.json");
    const messagePath = path.join(root, "message.html");
    await fs.writeFile(
      previousManifestPath,
      JSON.stringify({ version: 1, providerArtifacts: [] }),
    );
    await fs.writeFile(
      currentManifestPath,
      JSON.stringify({
        version: 1,
        providerArtifacts: [
          {
            relativePath: "example/apple_Domain.mrs",
            sourceRelativeDir: "example",
            kind: "domain-mrs",
            placeholder: false,
          },
        ],
      }),
    );

    await execFileAsync("bun", [
      "scripts/notify-artifact-changes.mjs",
      "--current",
      currentManifestPath,
      "--previous-manifest",
      previousManifestPath,
      "--out",
      messagePath,
      "--repo",
      "xream/rule",
    ]);

    assert.match(
      await fs.readFile(messagePath, "utf8"),
      /example\/apple_Domain\.mrs/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
