#!/usr/bin/env bun
import path from "node:path";
import { buildRelease } from "./lib/artifacts.mjs";

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

try {
  const result = await buildRelease({
    projectRoot,
    sourceRoot: path.resolve(projectRoot, args.source ?? "source"),
    outputRoot: path.resolve(projectRoot, args.out ?? ".release"),
    workRoot: path.resolve(projectRoot, args.work ?? ".release-work"),
    repository: args.repo ?? process.env.GITHUB_REPOSITORY,
    mihomoPath: args.mihomo ?? process.env.MIHOMO_BINARY,
    mihomoChannel: args["mihomo-channel"] ?? process.env.MIHOMO_CHANNEL ?? "release",
  });
  console.log(`Generated ${result.artifacts.length} release files in ${result.outputRoot}`);
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
