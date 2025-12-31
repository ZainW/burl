declare const BURL_VERSION: string | undefined;

function getVersion(): string {
  try {
    if (typeof BURL_VERSION === "string") {
      return BURL_VERSION;
    }
    return "0.0.0-dev";
  } catch {
    return "0.0.0-dev";
  }
}

export const VERSION: string = getVersion();
