import { describe, expect, it } from 'vitest';
import {
  getIndonesianMonth,
  getIsoDateString,
  parseMetricToNumber,
} from '../../src/app/api/sheets/domain';

describe('dashboard domain helpers', () => {
  it.each([
    ['1.2k', 1_200],
    ['+3.5M', 3_500_000],
    ['47.2%', 47.2],
    ['', 0],
    ['not available', 0],
  ])('parses metric %s', (value, expected) => {
    expect(parseMetricToNumber(value)).toBe(expected);
  });

  it.each([
    ['2026-08-08', '2026-08-08'],
    ['8/8/2026', '2026-08-08'],
    ['08-09-2026', '2026-08-09'],
  ])('normalizes date %s', (value, expected) => {
    expect(getIsoDateString(value)).toBe(expected);
  });

  it('returns the Indonesian month name', () => {
    expect(getIndonesianMonth('2026-08-08')).toBe('Agustus');
  });
});

