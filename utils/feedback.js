const LEADING_SYMBOLS = /^[^\p{L}\p{N}]+/u;

export function normalizeFeedbackMessage(message, type = 'success') {
    let normalized = String(message || '').replace(LEADING_SYMBOLS, '').trim();

    normalized = normalized
        .replace(/\s+successfully\b/gi, '')
        .replace(/!+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (type === 'error' && normalized.includes(':')) {
        const summary = normalized.split(':', 1)[0].trim();
        normalized = `${summary}. Try again.`;
    }

    if (normalized && !/[.?]$/.test(normalized)) normalized += '.';
    return normalized;
}
