export function parseMetricToNumber(metric) {
  if (!metric) return 0;

  let normalized = String(metric).replace(/[±+%\s]/g, '').toLowerCase();
  let multiplier = 1;

  if (normalized.includes('k')) {
    multiplier = 1_000;
    normalized = normalized.replace('k', '');
  } else if (normalized.includes('m')) {
    multiplier = 1_000_000;
    normalized = normalized.replace('m', '');
  }

  const match = normalized.match(/[0-9.]+/);
  return match ? Number.parseFloat(match[0]) * multiplier : 0;
}

export function getIsoDateString(value) {
  if (!value) return '';

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const dateString = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;

  const localDateMatch = dateString.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localDateMatch) {
    const [, month, day, year] = localDateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) return dateString;

  return getIsoDateString(parsedDate);
}

export function getIndonesianMonth(value) {
  const isoDate = getIsoDateString(value);
  if (!isoDate) return '';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return months[Number.parseInt(isoDate.substring(5, 7), 10) - 1] || '';
}

