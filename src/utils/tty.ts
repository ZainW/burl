export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY && process.stdin.isTTY)
}

export function shouldUseTui(forceAnsi?: boolean, forceTui?: boolean): boolean {
  if (forceAnsi) return false
  if (forceTui) return true
  return isTTY()
}
