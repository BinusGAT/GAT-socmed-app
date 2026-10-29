import { describe, expect, it } from 'vitest';
import {
  getIndonesianMonth,
  getIsoDateString,
  parseMetricToNumber,
} from '../../src/app/api/sheets/domain';
import { formatDate, parseDate, isSafeUrl } from '../../utils/helpers';

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
    ['09/05/2026', '2026-09-05'],
    ['25/08/2026', '2026-08-25'],
    ['2026-09-09', '2026-09-09'],
  ])('normalizes date %s', (value, expected) => {
    expect(getIsoDateString(value)).toBe(expected);
  });

  it('standardizes formatDate and parseDate to canonical YYYY-MM-DD', () => {
    expect(formatDate('2026-09-09')).toBe('2026-09-09');
    expect(formatDate('09/05/2026')).toBe('2026-09-05');
    expect(parseDate('09/05/2026')).toBe('2026-09-05');
  });

  it('returns the Indonesian month name', () => {
    expect(getIndonesianMonth('2026-08-08')).toBe('Agustus');
  });

  it('validates safe URL schemes and blocks dangerous protocols', () => {
    expect(isSafeUrl('https://example.com/post/123')).toBe(true);
    expect(isSafeUrl('http://example.com/video')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl(null)).toBe(false);
  });
});


