import { describe, expect, it } from 'vitest';
import { calculateRecurringDates } from '../../utils/helpers';

describe('Recurrence Engine Helper (calculateRecurringDates)', () => {
  it('generates daily occurrences bounded by count', () => {
    const dates = calculateRecurringDates('2026-10-15', { frequency: 'daily', limitType: 'count', count: 3 });
    expect(dates).toEqual(['2026-10-15', '2026-10-16', '2026-10-17']);
  });

  it('generates weekly occurrences bounded by count', () => {
    const dates = calculateRecurringDates('2026-10-15', { frequency: 'weekly', limitType: 'count', count: 4 });
    expect(dates).toEqual(['2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05']);
  });

  it('generates biweekly occurrences bounded by count', () => {
    const dates = calculateRecurringDates('2026-10-15', { frequency: 'biweekly', limitType: 'count', count: 3 });
    expect(dates).toEqual(['2026-10-15', '2026-10-29', '2026-11-12']);
  });

  it('generates monthly occurrences clamped to valid calendar days', () => {
    // 31st January to February (clamped to 28th), March (31st), April (30th)
    const dates = calculateRecurringDates('2026-01-31', { frequency: 'monthly', limitType: 'count', count: 4 });
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('bounds occurrences by untilDate', () => {
    const dates = calculateRecurringDates('2026-10-01', {
      frequency: 'weekly',
      limitType: 'untilDate',
      untilDate: '2026-10-20'
    });
    expect(dates).toEqual(['2026-10-01', '2026-10-08', '2026-10-15']);
  });

  it('enforces a strict maximum limit of 12 occurrences to protect performance', () => {
    const dates = calculateRecurringDates('2026-10-01', { frequency: 'daily', limitType: 'count', count: 50 });
    expect(dates.length).toBe(12);
  });

  it('safely handles invalid inputs and returns fallback', () => {
    expect(calculateRecurringDates('')).toEqual([]);
    expect(calculateRecurringDates('invalid-date')).toEqual(['invalid-date']);
    expect(calculateRecurringDates('2026-10-01', { frequency: 'yearly' })).toEqual(['2026-10-01']);
  });
});
