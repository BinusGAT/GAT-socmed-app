import { describe, expect, it } from 'vitest';
import { getTaskCalculatedStatus, getTaskUploadState } from '../../utils/helpers';

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

  it('treats a manually ticked past task as Done even when Status is 0', () => {
    expect(getTaskCalculatedStatus({ Status: 0, ManualUploaded: 1, Date: '2020-01-01' })).toBe('Done');
  });
});

describe('dual OR upload validation (URL or manual tick)', () => {
  const laporanRows = [
    { ID: 'CT1', Platform: 'Instagram', URL: '' },
    { ID: 'CT1', Platform: 'TikTok', URL: '   ' },
    { ID: 'CT2', Platform: 'Instagram', URL: 'https://instagram.com/reel/abc' },
    { ID: 'CT2', Platform: 'TikTok', URL: '' },
  ];

  it('marks a task as not uploaded when neither URL nor manual tick is set', () => {
    expect(getTaskUploadState({ ID: 'CT1', ManualUploaded: 0 }, laporanRows)).toEqual({
      hasUrl: false,
      isManualUploaded: false,
      isUploaded: false,
    });
  });

  it('marks a task as uploaded when only a Post URL is filled', () => {
    expect(getTaskUploadState({ ID: 'CT2', ManualUploaded: 0 }, laporanRows)).toEqual({
      hasUrl: true,
      isManualUploaded: false,
      isUploaded: true,
    });
  });

  it('marks a task as uploaded when only the manual calendar tick is set', () => {
    expect(getTaskUploadState({ ID: 'CT1', ManualUploaded: 1 }, laporanRows)).toEqual({
      hasUrl: false,
      isManualUploaded: true,
      isUploaded: true,
    });
  });

  it('marks a task as uploaded when both Post URL and manual tick are set', () => {
    expect(getTaskUploadState({ ID: 'CT2', ManualUploaded: true }, laporanRows)).toEqual({
      hasUrl: true,
      isManualUploaded: true,
      isUploaded: true,
    });
  });
});
