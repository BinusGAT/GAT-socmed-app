export const POST_LIBRARY_HIDDEN_CATEGORIES_KEY = 'post_library_hidden_categories';

export function parseHiddenPostLibraryCategories(value) {
    if (!value) return [];

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return [...new Set(parsed.filter((name) => typeof name === 'string' && name.trim()).map((name) => name.trim()))];
    } catch {
        return [];
    }
}

export function getVisiblePostLibraryCategories(categories, hiddenSetting) {
    const hidden = new Set(parseHiddenPostLibraryCategories(hiddenSetting));
    return (categories || []).filter((category) => !hidden.has(category.name));
}
