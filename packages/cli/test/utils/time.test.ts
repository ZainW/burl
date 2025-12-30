import { describe, test, expect } from 'bun:test'
import { parseDuration, formatDuration, formatLatency } from '../../src/utils/time'

describe('parseDuration', () => {
  test('parses seconds', () => {
    expect(parseDuration('10s')).toBe(10000)
    expect(parseDuration('1s')).toBe(1000)
    expect(parseDuration('0.5s')).toBe(500)
  })

  test('parses milliseconds', () => {
    expect(parseDuration('100ms')).toBe(100)
    expect(parseDuration('1500ms')).toBe(1500)
  })

  test('parses minutes', () => {
    expect(parseDuration('1m')).toBe(60000)
    expect(parseDuration('5m')).toBe(300000)
    expect(parseDuration('0.5m')).toBe(30000)
  })

  test('parses hours', () => {
    expect(parseDuration('1h')).toBe(3600000)
    expect(parseDuration('2h')).toBe(7200000)
  })

  test('parses days', () => {
    expect(parseDuration('1d')).toBe(86400000)
  })

  test('parses combined durations', () => {
    expect(parseDuration('1m30s')).toBe(90000)
    expect(parseDuration('1h30m')).toBe(5400000)
    expect(parseDuration('2h30m45s')).toBe(9045000)
  })

  test('parses pure numbers as seconds', () => {
    expect(parseDuration('10')).toBe(10000)
    expect(parseDuration('60')).toBe(60000)
  })

  test('handles whitespace', () => {
    expect(parseDuration('  10s  ')).toBe(10000)
    expect(parseDuration('1 m')).toBe(60000)
  })

  test('is case insensitive', () => {
    expect(parseDuration('10S')).toBe(10000)
    expect(parseDuration('1M')).toBe(60000)
    expect(parseDuration('1H')).toBe(3600000)
  })

  test('throws on invalid format', () => {
    expect(() => parseDuration('abc')).toThrow()
    expect(() => parseDuration('')).toThrow()
  })
})

describe('formatDuration', () => {
  test('formats microseconds', () => {
    expect(formatDuration(0.5)).toBe('500.00µs')
    expect(formatDuration(0.001)).toBe('1.00µs')
  })

  test('formats milliseconds', () => {
    expect(formatDuration(1)).toBe('1.00ms')
    expect(formatDuration(500)).toBe('500.00ms')
    expect(formatDuration(999)).toBe('999.00ms')
  })

  test('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1.00s')
    expect(formatDuration(30000)).toBe('30.00s')
    expect(formatDuration(59999)).toBe('60.00s')
  })

  test('formats minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0.0s')
    expect(formatDuration(90000)).toBe('1m 30.0s')
    expect(formatDuration(150000)).toBe('2m 30.0s')
  })

  test('formats hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h 0m')
    expect(formatDuration(5400000)).toBe('1h 30m')
    expect(formatDuration(7200000)).toBe('2h 0m')
  })
})

describe('formatLatency', () => {
  test('formats nanoseconds', () => {
    expect(formatLatency(0.0001)).toBe('100.00ns')
    expect(formatLatency(0.0005)).toBe('500.00ns')
  })

  test('formats microseconds', () => {
    expect(formatLatency(0.1)).toBe('100.00µs')
    expect(formatLatency(0.5)).toBe('500.00µs')
  })

  test('formats milliseconds with appropriate precision', () => {
    expect(formatLatency(1.234)).toBe('1.234ms')
    expect(formatLatency(9.999)).toBe('9.999ms')
    expect(formatLatency(12.34)).toBe('12.34ms')
    expect(formatLatency(99.9)).toBe('99.90ms')
    expect(formatLatency(123.4)).toBe('123.4ms')
    expect(formatLatency(999.9)).toBe('999.9ms')
  })

  test('formats seconds', () => {
    expect(formatLatency(1000)).toBe('1.00s')
    expect(formatLatency(2500)).toBe('2.50s')
  })
})
