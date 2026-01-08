#!/usr/bin/env bun

import solidPlugin from "./node_modules/@opentui/solid/scripts/solid-plugin";

type BunTarget =
  | "bun-linux-x64"
  | "bun-linux-arm64"
  | "bun-darwin-arm64"
  | "bun-darwin-x64"
  | "bun-windows-x64";

function getCurrentTarget(): BunTarget {
  const os = process.platform === "win32" ? "windows" : process.platform;
  return `bun-${os}-${process.arch}` as BunTarget;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let target: BunTarget | undefined;
  let outfile: string | undefined;
  let version: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--target" && args[i + 1]) {
      target = args[++i] as BunTarget;
    } else if (arg === "--outfile" && args[i + 1]) {
      outfile = args[++i];
    } else if (arg === "--version" && args[i + 1]) {
      version = args[++i];
    }
  }

  return { target, outfile, version };
}

let { target, outfile, version } = parseArgs();

if (!target) {
  target = getCurrentTarget();
}

if (!outfile) {
  const ext = target.includes("windows") ? ".exe" : "";
  outfile = `dist/burl${ext}`;
}

console.log(`Building for ${target}...`);
if (version) {
  console.log(`Version: ${version}`);
}

const result = await Bun.build({
  conditions: ["browser"],
  plugins: [solidPlugin],
  sourcemap: "external",
  minify: true,
  compile: {
    autoloadBunfig: false,
    target,
    outfile,
  },
  entrypoints: ["./src/index.ts"],
  define: version ? { BURL_VERSION: JSON.stringify(version) } : undefined,
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`Built ${outfile}`);
