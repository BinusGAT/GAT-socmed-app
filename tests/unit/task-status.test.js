import { describe, expect, it } from 'vitest';
import { getTaskCalculatedStatus } from '../../utils/helpers';

describe('task status normalization', () => {
  it.each([true, 1, '1', 'true', 'TRUE'])(
    'treats %s as completed',
    (Status) => {
      expect(getTaskCalculatedStatus({ Status, Date: '2020-01-01' })).toBe('Done');
    },
  );

  it('keeps an incomplete past task overdue', () => {
    expect(getTaskCalculatedStatus({ Status: 0, Date: '2020-01-01' })).toBe('Overdue');
  });
});
