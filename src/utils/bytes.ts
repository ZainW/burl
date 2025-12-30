export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const index = Math.min(i, units.length - 1);

  const value = bytes / Math.pow(k, index);

  if (index === 0) {
    return `${bytes} B`;
  }

  return `${value.toFixed(2)} ${units[index]}`;
}

export function formatThroughput(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function parseBytes(input: string): number {
  const normalized = input.toUpperCase().trim();

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/);
  if (!match) {
    throw new Error(`Invalid byte format: "${input}". Use formats like "10KB", "1MB"`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'B';
  const k = 1024;

  switch (unit) {
    case 'B':
      return value;
    case 'KB':
      return value * k;
    case 'MB':
      return value * k * k;
    case 'GB':
      return value * k * k * k;
    case 'TB':
      return value * k * k * k * k;
    default:
      return value;
  }
}
