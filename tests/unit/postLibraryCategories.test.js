import { describe, expect, it } from 'vitest';
import { getVisiblePostLibraryCategories, parseHiddenPostLibraryCategories } from '../../utils/postLibraryCategories';

const categories = [{ name: 'News' }, { name: 'Motion' }, { name: 'Story Telling' }];

describe('Post Library category visibility', () => {
    it('shows every category when no preference exists', () => {
        expect(getVisiblePostLibraryCategories(categories, undefined)).toEqual(categories);
    });

    it('removes hidden categories and leaves newly added categories visible', () => {
        expect(getVisiblePostLibraryCategories(categories, '["Motion"]')).toEqual([
            { name: 'News' },
            { name: 'Story Telling' },
        ]);
    });

    it('safely ignores malformed and duplicate values', () => {
        expect(parseHiddenPostLibraryCategories('not-json')).toEqual([]);
        expect(parseHiddenPostLibraryCategories('["Motion", "Motion", 7]')).toEqual(['Motion']);
    });
});
