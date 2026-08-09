import { describe, expect, it } from 'vitest';
import { getContentGroupKey } from '../../utils/helpers';

describe('content grouping identity', () => {
  it('groups untitled platform rows by their shared content ID', () => {
    const instagram = getContentGroupKey({ ID: 'CONTENT-400', 'Content Title': '', Platform: 'Instagram' });
    const tiktok = getContentGroupKey({ ID: 'CONTENT-400', 'Content Title': '', Platform: 'TikTok' });
    const youtube = getContentGroupKey({ ID: 'CONTENT-400', 'Content Title': '', Platform: 'YouTube' });

    expect(new Set([instagram, tiktok, youtube])).toEqual(new Set(['id:CONTENT-400']));
  });

  it('does not merge different IDs that happen to have the same title', () => {
    expect(getContentGroupKey({ ID: 'A', 'Content Title': 'Weekly recap' }))
      .not.toBe(getContentGroupKey({ ID: 'B', 'Content Title': 'Weekly recap' }));
  });

  it('uses normalized title only for legacy rows without an ID', () => {
    expect(getContentGroupKey({ 'Content Title': '  Weekly Recap ' }))
      .toBe('title:weekly recap');
  });
});
