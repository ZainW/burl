import { describe, it, expect } from 'bun:test'
import { isTTY, isInteractiveTerminal, shouldUseTui, getTerminalSize } from '../../src/utils/tty'

describe('tty utilities', () => {
  describe('isTTY', () => {
    it('returns boolean', () => {
      const result = isTTY()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('isInteractiveTerminal', () => {
    it('returns boolean', () => {
      const result = isInteractiveTerminal()
      expect(typeof result).toBe('boolean')
    })

    it('returns false in CI environment', () => {
      const originalCI = process.env.CI
      process.env.CI = 'true'
      expect(isInteractiveTerminal()).toBe(false)
      process.env.CI = originalCI
    })
  })

  describe('shouldUseTui', () => {
    it('returns false when disabled is true', () => {
      expect(shouldUseTui(true, false)).toBe(false)
      expect(shouldUseTui(true, true)).toBe(false)
    })

    it('returns true when forced is true and disabled is false', () => {
      expect(shouldUseTui(false, true)).toBe(true)
    })

    it('returns boolean based on interactive terminal when no flags', () => {
      const result = shouldUseTui(false, false)
      expect(typeof result).toBe('boolean')
    })

    it('handles undefined parameters', () => {
      const result = shouldUseTui()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getTerminalSize', () => {
    it('returns object with columns and rows', () => {
      const size = getTerminalSize()
      expect(typeof size.columns).toBe('number')
      expect(typeof size.rows).toBe('number')
      expect(size.columns).toBeGreaterThan(0)
      expect(size.rows).toBeGreaterThan(0)
    })
  })
})
