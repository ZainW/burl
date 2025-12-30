import { describe, it, expect } from 'bun:test'
import { isTTY, shouldUseTui } from '../../src/utils/tty'

describe('tty utilities', () => {
  describe('isTTY', () => {
    it('returns boolean', () => {
      const result = isTTY()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('shouldUseTui', () => {
    it('returns false when forceAnsi is true', () => {
      expect(shouldUseTui(true, false)).toBe(false)
      expect(shouldUseTui(true, true)).toBe(false)
    })

    it('returns true when forceTui is true and forceAnsi is false', () => {
      expect(shouldUseTui(false, true)).toBe(true)
    })

    it('returns boolean based on TTY when no force flags', () => {
      const result = shouldUseTui(false, false)
      expect(typeof result).toBe('boolean')
    })

    it('handles undefined parameters', () => {
      const result = shouldUseTui()
      expect(typeof result).toBe('boolean')
    })
  })
})
