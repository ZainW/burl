import { VERSION } from "../version";

const REPO = "ZainW/burl";
const CACHE_DIR = `${process.env.HOME}/.burl`;
const CACHE_FILE = `${CACHE_DIR}/update-check.json`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface UpdateCache {
  checkedAt: number;
  latestVersion: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: { name: string; browser_download_url: string }[];
}

export type UpgradeStatus =
  | { status: "current" }
  | { status: "checking" }
  | { status: "downloading"; version: string }
  | { status: "ready"; version: string }
  | { status: "failed"; error: string };

type StatusCallback = (status: UpgradeStatus) => void;

function detectPlatform(): string {
  const os = process.platform;
  const arch = process.arch;

  const osMap: Record<string, string> = {
    linux: "linux",
    darwin: "darwin",
    win32: "windows",
  };

  const archMap: Record<string, string> = {
    x64: "x64",
    arm64: "arm64",
  };

  return `${osMap[os] || os}-${archMap[arch] || arch}`;
}

async function readCache(): Promise<UpdateCache | null> {
  try {
    const file = Bun.file(CACHE_FILE);
    if (!(await file.exists())) return null;
    return await file.json();
  } catch {
    return null;
  }
}

async function writeCache(latestVersion: string): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(CACHE_DIR, { recursive: true }).catch(() => {});
  await Bun.write(CACHE_FILE, JSON.stringify({ checkedAt: Date.now(), latestVersion })).catch(
    () => {},
  );
}

async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { "User-Agent": `burl/${VERSION}` },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function backgroundUpgrade(onStatus?: StatusCallback): Promise<void> {
  const notify = onStatus || (() => {});

  try {
    const cache = await readCache();

    let latestVersion: string;
    let release: GitHubRelease | null = null;

    if (cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
      latestVersion = cache.latestVersion;

      if (latestVersion === VERSION) {
        notify({ status: "current" });
        return;
      }

      release = await fetchLatestRelease();
    } else {
      notify({ status: "checking" });
      release = await fetchLatestRelease();

      if (!release) {
        notify({ status: "current" });
        return;
      }

      latestVersion = release.tag_name.replace(/^v/, "");
      await writeCache(latestVersion);
    }

    if (latestVersion === VERSION) {
      notify({ status: "current" });
      return;
    }

    if (!release) {
      release = await fetchLatestRelease();
      if (!release) {
        notify({ status: "failed", error: "Could not fetch release" });
        return;
      }
    }

    notify({ status: "downloading", version: latestVersion });

    const platform = detectPlatform();
    const binaryName = `burl-${platform}${platform.startsWith("windows") ? ".exe" : ""}`;
    const asset = release.assets.find((a) => a.name === binaryName);

    if (!asset) {
      notify({ status: "failed", error: `No binary for ${platform}` });
      return;
    }

    const response = await fetch(asset.browser_download_url);
    if (!response.ok) {
      notify({ status: "failed", error: "Download failed" });
      return;
    }

    const binaryPath = process.execPath;
    const tempPath = `${binaryPath}.new`;
    const buffer = await response.arrayBuffer();

    await Bun.write(tempPath, buffer);

    const { chmod, rename, unlink } = await import("node:fs/promises");
    await chmod(tempPath, 0o755);

    const backupPath = `${binaryPath}.old`;
    try {
      await rename(binaryPath, backupPath);
      await rename(tempPath, binaryPath);
      await unlink(backupPath).catch(() => {});
    } catch {
      await rename(backupPath, binaryPath).catch(() => {});
      await unlink(tempPath).catch(() => {});
      notify({ status: "failed", error: "Could not replace binary" });
      return;
    }

    notify({ status: "ready", version: latestVersion });
  } catch {
    notify({ status: "current" });
  }
}

export async function checkForUpdate(): Promise<{ hasUpdate: boolean; latestVersion: string }> {
  try {
    const cache = await readCache();

    if (cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
      return {
        hasUpdate: cache.latestVersion !== VERSION,
        latestVersion: cache.latestVersion,
      };
    }

    const release = await fetchLatestRelease();
    if (!release) {
      return { hasUpdate: false, latestVersion: VERSION };
    }

    const latestVersion = release.tag_name.replace(/^v/, "");
    await writeCache(latestVersion);

    return {
      hasUpdate: latestVersion !== VERSION,
      latestVersion,
    };
  } catch {
    return { hasUpdate: false, latestVersion: VERSION };
  }
}
