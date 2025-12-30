export function parseDuration(input: string): number {
  const normalized = input.toLowerCase().trim();

  if (/^\d+$/.test(normalized)) {
    return parseInt(normalized, 10) * 1000;
  }

  let totalMs = 0;
  const regex = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?/g;
  let match: RegExpExecArray | null;
  let hasMatch = false;

  while ((match = regex.exec(normalized)) !== null) {
    hasMatch = true;
    const value = parseFloat(match[1]);
    const unit = match[2] || "s";

    switch (unit) {
      case "ms":
        totalMs += value;
        break;
      case "s":
        totalMs += value * 1000;
        break;
      case "m":
        totalMs += value * 60 * 1000;
        break;
      case "h":
        totalMs += value * 60 * 60 * 1000;
        break;
      case "d":
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
    }
  }

  if (!hasMatch) {
    throw new Error(`Invalid duration format: "${input}". Use formats like "10s", "1m", "5m30s"`);
  }

  return Math.round(totalMs);
}

export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export function formatLatency(ms: number): string {
  if (ms < 0.001) {
    return `${(ms * 1000000).toFixed(2)}ns`;
  }
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}µs`;
  }
  if (ms < 10) {
    return `${ms.toFixed(3)}ms`;
  }
  if (ms < 100) {
    return `${ms.toFixed(2)}ms`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
