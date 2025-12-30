const isColorSupported = (): boolean => {
  if (typeof process !== 'undefined') {
    if (process.env.NO_COLOR || process.env.FORCE_COLOR === '0') {
      return false
    }
    if (process.env.FORCE_COLOR || process.env.COLORTERM) {
      return true
    }
    if (process.stdout?.isTTY) {
      return true
    }
  }
  return false
}

let colorEnabled = isColorSupported()

export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled
}

export function isColorEnabled(): boolean {
  return colorEnabled
}

const codes = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
}

type ColorFn = (text: string) => string

function createColorFn(code: string): ColorFn {
  return (text: string) => {
    if (!colorEnabled) return text
    return `${code}${text}${codes.reset}`
  }
}

export const reset = createColorFn(codes.reset)
export const bold = createColorFn(codes.bold)
export const dim = createColorFn(codes.dim)
export const italic = createColorFn(codes.italic)
export const underline = createColorFn(codes.underline)

export const black = createColorFn(codes.black)
export const red = createColorFn(codes.red)
export const green = createColorFn(codes.green)
export const yellow = createColorFn(codes.yellow)
export const blue = createColorFn(codes.blue)
export const magenta = createColorFn(codes.magenta)
export const cyan = createColorFn(codes.cyan)
export const white = createColorFn(codes.white)
export const gray = createColorFn(codes.gray)

export const brightRed = createColorFn(codes.brightRed)
export const brightGreen = createColorFn(codes.brightGreen)
export const brightYellow = createColorFn(codes.brightYellow)
export const brightBlue = createColorFn(codes.brightBlue)
export const brightMagenta = createColorFn(codes.brightMagenta)
export const brightCyan = createColorFn(codes.brightCyan)
export const brightWhite = createColorFn(codes.brightWhite)

export const success = createColorFn(codes.green)
export const error = createColorFn(codes.red)
export const warning = createColorFn(codes.yellow)
export const info = createColorFn(codes.cyan)
export const muted = createColorFn(codes.gray)
export const highlight = createColorFn(codes.bold + codes.white)
export const label = createColorFn(codes.bold + codes.cyan)
export const value = createColorFn(codes.brightWhite)

export function successBold(text: string): string {
  if (!colorEnabled) return text
  return `${codes.bold}${codes.green}${text}${codes.reset}`
}

export function errorBold(text: string): string {
  if (!colorEnabled) return text
  return `${codes.bold}${codes.red}${text}${codes.reset}`
}

export function warningBold(text: string): string {
  if (!colorEnabled) return text
  return `${codes.bold}${codes.yellow}${text}${codes.reset}`
}

export function progressBar(current: number, total: number, width: number = 30): string {
  const percentage = Math.min(current / total, 1)
  const filled = Math.round(width * percentage)
  const empty = width - filled

  const filledBar = '█'.repeat(filled)
  const emptyBar = '░'.repeat(empty)

  if (!colorEnabled) {
    return `[${filledBar}${emptyBar}]`
  }

  return `[${codes.green}${filledBar}${codes.gray}${emptyBar}${codes.reset}]`
}

export const symbols = {
  success: colorEnabled ? `${codes.green}✓${codes.reset}` : '[OK]',
  error: colorEnabled ? `${codes.red}✗${codes.reset}` : '[ERR]',
  warning: colorEnabled ? `${codes.yellow}⚠${codes.reset}` : '[WARN]',
  info: colorEnabled ? `${codes.cyan}ℹ${codes.reset}` : '[INFO]',
  bullet: colorEnabled ? `${codes.gray}•${codes.reset}` : '-',
  arrow: colorEnabled ? `${codes.cyan}→${codes.reset}` : '->',
}
