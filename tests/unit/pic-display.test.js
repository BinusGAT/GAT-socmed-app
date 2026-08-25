import { describe, expect, it } from 'vitest';
import { getPicDisplayName, getPicShortName, getPicBadgeClasses, aggregateAllChartsData } from '../../utils/helpers';

describe('PIC display name helpers', () => {
  it('extracts first name from full name', () => {
    expect(getPicDisplayName('Jane Doe Person')).toBe('Jane');
    expect(getPicShortName('Jane Doe Person')).toBe('Jane');
    expect(getPicDisplayName('Alex Morgan')).toBe('Alex');
  });

  it('handles single-word and mixed-case names cleanly', () => {
    expect(getPicDisplayName('ALEX')).toBe('Alex');
    expect(getPicDisplayName('alex')).toBe('Alex');
    expect(getPicDisplayName('Alex')).toBe('Alex');
  });

  it('returns empty string for empty inputs', () => {
    expect(getPicDisplayName('')).toBe('');
    expect(getPicDisplayName(null)).toBe('');
    expect(getPicDisplayName(undefined)).toBe('');
  });

  it('assigns consistent badge color class based on display name', () => {
    const fullBadge = getPicBadgeClasses('Alex Morgan');
    const shortBadge = getPicBadgeClasses('Alex');
    expect(fullBadge).toBe(shortBadge);
  });

  it('aggregates and deduplicates views by display name when full and short names exist', () => {
    const rows = [
      { PIC: 'Alex Morgan', Views: '500', Platform: 'TikTok', Category: 'News' },
      { PIC: 'Alex', Views: '300', Platform: 'Instagram', Category: 'News' },
      { PIC: 'Jane Doe', Views: '200', Platform: 'YouTube', Category: 'Motion' }
    ];
    const memberList = [{ NAMA: 'Alex Morgan' }, { NAMA: 'Jane Doe' }];
    const { picData } = aggregateAllChartsData(rows, memberList);

    expect(picData.picLabels).toEqual(['Alex', 'Jane']);
    expect(picData.picViews).toEqual([800, 200]);
  });
});
