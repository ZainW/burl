import { describe, test, expect, beforeEach } from 'bun:test';
import {
  setColorEnabled,
  isColorEnabled,
  green,
  red,
  bold,
  progressBar,
  symbols,
} from '../../src/utils/colors';

describe('colors', () => {
  beforeEach(() => {
    setColorEnabled(true);
  });

  test('setColorEnabled and isColorEnabled work', () => {
    setColorEnabled(true);
    expect(isColorEnabled()).toBe(true);

    setColorEnabled(false);
    expect(isColorEnabled()).toBe(false);
  });

  test('color functions apply ANSI codes when enabled', () => {
    setColorEnabled(true);
    const result = green('test');
    expect(result).toContain('\x1b[32m');
    expect(result).toContain('test');
    expect(result).toContain('\x1b[0m');
  });

  test('color functions return plain text when disabled', () => {
    setColorEnabled(false);
    expect(green('test')).toBe('test');
    expect(red('test')).toBe('test');
    expect(bold('test')).toBe('test');
  });

  test('progressBar renders correctly with colors', () => {
    setColorEnabled(true);
    const bar = progressBar(0.5, 1, 10);
    expect(bar).toContain('[');
    expect(bar).toContain(']');
    expect(bar).toContain('█');
    expect(bar).toContain('░');
  });

  test('progressBar renders correctly without colors', () => {
    setColorEnabled(false);
    const bar = progressBar(0.5, 1, 10);
    expect(bar).toBe('[█████░░░░░]');
  });

  test('progressBar handles edge cases', () => {
    setColorEnabled(false);
    expect(progressBar(0, 1, 10)).toBe('[░░░░░░░░░░]');
    expect(progressBar(1, 1, 10)).toBe('[██████████]');
    expect(progressBar(2, 1, 10)).toBe('[██████████]');
  });
});

describe('symbols', () => {
  test('symbols are defined', () => {
    expect(symbols.success).toBeDefined();
    expect(symbols.error).toBeDefined();
    expect(symbols.warning).toBeDefined();
    expect(symbols.info).toBeDefined();
    expect(symbols.bullet).toBeDefined();
    expect(symbols.arrow).toBeDefined();
  });
});
