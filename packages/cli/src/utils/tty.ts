export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY && process.stdin.isTTY);
}

export function isInteractiveTerminal(): boolean {
  if (!isTTY()) return false;

  const env = process.env;

  if (env.CI === "true" || env.CI === "1") return false;
  if (env.GITHUB_ACTIONS) return false;
  if (env.GITLAB_CI) return false;
  if (env.JENKINS_URL) return false;
  if (env.TRAVIS) return false;
  if (env.CIRCLECI) return false;
  if (env.BUILDKITE) return false;
  if (env.DRONE) return false;
  if (env.TF_BUILD) return false;

  if (env.TERM === "dumb") return false;
  if (!env.TERM) return false;

  if (env.NO_COLOR || env.FORCE_COLOR === "0") return false;

  const columns = process.stdout.columns ?? 0;
  const rows = process.stdout.rows ?? 0;
  if (columns < 40 || rows < 10) return false;

  return true;
}

export function shouldUseTui(disabled?: boolean, forced?: boolean): boolean {
  if (disabled) return false;
  if (forced) return true;
  return isInteractiveTerminal();
}

export function getTerminalSize(): { columns: number; rows: number } {
  return {
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  };
}
