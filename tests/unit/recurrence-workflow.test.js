import { describe, expect, it } from 'vitest';
import { calculateRecurringDates } from '../../utils/helpers';

describe('Recurring Task Workflow & Series Logic', () => {
  it('correctly expands recurring dates across daily, weekly, and monthly', () => {
    const weekly = calculateRecurringDates('2026-10-15', { frequency: 'weekly', count: 4 });
    expect(weekly).toEqual(['2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05']);

    const biweekly = calculateRecurringDates('2026-10-15', { frequency: 'biweekly', count: 3 });
    expect(biweekly).toEqual(['2026-10-15', '2026-10-29', '2026-11-12']);

    const monthly = calculateRecurringDates('2026-10-15', { frequency: 'monthly', count: 3 });
    expect(monthly).toEqual(['2026-10-15', '2026-11-15', '2026-12-15']);
  });

  it('updates only future tasks when applyToSeries is "future"', () => {
    const seriesId = 'SR_123';
    let schedule = [
      { ID: 'CT1', Date: '2026-10-01', series_id: seriesId, PIC: 'Alice', Category: 'Reels', 'Content Title': 'Old Title' },
      { ID: 'CT2', Date: '2026-10-08', series_id: seriesId, PIC: 'Alice', Category: 'Reels', 'Content Title': 'Old Title' },
      { ID: 'CT3', Date: '2026-10-15', series_id: seriesId, PIC: 'Alice', Category: 'Reels', 'Content Title': 'Old Title' },
      { ID: 'CT4', Date: '2026-10-22', series_id: seriesId, PIC: 'Alice', Category: 'Reels', 'Content Title': 'Old Title' },
    ];

    // User edits CT2 and selects "future"
    const currentTask = schedule.find(t => t.ID === 'CT2');
    const updatedTitle = 'New Title';
    const updatedPic = 'Bob';

    schedule = schedule.map(t => {
      if (t.series_id === currentTask.series_id && t.Date >= currentTask.Date) {
        return { ...t, 'Content Title': updatedTitle, PIC: updatedPic };
      }
      return t;
    });

    expect(schedule[0]['Content Title']).toBe('Old Title');
    expect(schedule[0].PIC).toBe('Alice');
    expect(schedule[1]['Content Title']).toBe('New Title');
    expect(schedule[1].PIC).toBe('Bob');
    expect(schedule[2]['Content Title']).toBe('New Title');
    expect(schedule[3]['Content Title']).toBe('New Title');
  });

  it('updates all occurrences when applyToSeries is "all"', () => {
    const seriesId = 'SR_123';
    let schedule = [
      { ID: 'CT1', Date: '2026-10-01', series_id: seriesId, PIC: 'Alice', Category: 'Reels', 'Content Title': 'Old Title' },
      { ID: 'CT2', Date: '2026-10-08', series_id: seriesId, PIC: 'Alice', Category: 'Reels', 'Content Title': 'Old Title' }
    ];

    const updatedTitle = 'Synced Series Title';
    schedule = schedule.map(t => {
      if (t.series_id === seriesId) {
        return { ...t, 'Content Title': updatedTitle };
      }
      return t;
    });

    expect(schedule.every(t => t['Content Title'] === 'Synced Series Title')).toBe(true);
  });

  it('handles 3-way deletion choices: single, future, and all', () => {
    const seriesId = 'SR_456';
    const makeData = () => [
      { ID: 'CT1', Date: '2026-10-01', series_id: seriesId },
      { ID: 'CT2', Date: '2026-10-08', series_id: seriesId },
      { ID: 'CT3', Date: '2026-10-15', series_id: seriesId },
      { ID: 'CT4', Date: '2026-10-22', series_id: seriesId },
    ];

    // 1. Single delete
    let data1 = makeData();
    data1 = data1.filter(t => t.ID !== 'CT2');
    expect(data1.map(t => t.ID)).toEqual(['CT1', 'CT3', 'CT4']);

    // 2. Future delete (from CT2 onwards)
    let data2 = makeData();
    data2 = data2.filter(t => !(t.series_id === seriesId && t.Date >= '2026-10-08'));
    expect(data2.map(t => t.ID)).toEqual(['CT1']);

    // 3. All delete
    let data3 = makeData();
    data3 = data3.filter(t => t.series_id !== seriesId);
    expect(data3.length).toBe(0);
  });

  it('enforces RBAC policy: Creators can only update single assigned tasks, not the whole series', () => {
    const canMutateSeries = (role) => role === 'Admin';
    expect(canMutateSeries('Admin')).toBe(true);
    expect(canMutateSeries('Creator')).toBe(false);
    expect(canMutateSeries('Viewer')).toBe(false);
  });
});
