#!/usr/bin/env bun
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildRelease } from "./lib/artifacts.mjs";
import { backupSourceTxtEntries } from "./lib/subscriptions.mjs";

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = value;
      i += 1;
    }
  }
  return options;
}

const args = parseArgs(process.argv.slice(2));
const projectRoot = process.cwd();

async function inferRepositoryFromGit(projectDir) {
  try {
    const { stdout } = await execFileAsync("git", ["config", "--get", "remote.origin.url"], {
      cwd: projectDir,
      maxBuffer: 1024 * 1024,
    });
    const url = String(stdout ?? "").trim();
    if (!url) return undefined;

    const sshMatch = url.match(/github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/u);
    if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

    const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/u);
    if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;
  } catch {
    // ignore
  }
  return undefined;
}

try {
  await backupSourceTxtEntries({
    projectRoot,
    sourceRoot: path.resolve(projectRoot, args.source ?? "source"),
  });
  const repository =
    args.repo ??
    process.env.GITHUB_REPOSITORY ??
    (await inferRepositoryFromGit(projectRoot));
  if (!repository) {
    throw new Error('缺少仓库信息：请设置环境变量 GITHUB_REPOSITORY，或使用参数 --repo "owner/repo"');
  }
  const result = await buildRelease({
    projectRoot,
    sourceRoot: path.resolve(projectRoot, args.source ?? "source"),
    outputRoot: path.resolve(projectRoot, args.out ?? ".release"),
    workRoot: path.resolve(projectRoot, args.work ?? ".release-work"),
    repository,
    mihomoPath: args.mihomo ?? process.env.MIHOMO_BINARY,
    mihomoChannel: args["mihomo-channel"] ?? process.env.MIHOMO_CHANNEL ?? "release",
  });
  console.log(`Generated ${result.artifacts.length} release files in ${result.outputRoot}`);
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
