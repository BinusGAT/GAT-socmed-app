const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function createDashboardFixture(rowCount, { now = new Date() } = {}) {
  if (!Number.isInteger(rowCount) || rowCount < 1) {
    throw new TypeError('rowCount must be a positive integer');
  }

  const platforms = ['Instagram', 'TikTok', 'YouTube'];
  const categories = ['Article Reels', 'Story Telling', 'News', 'Motion'];
  const laporan = Array.from({ length: rowCount }, (_, index) => {
    const titleIndex = Math.floor(index / platforms.length) + 1;
    return {
      Date: formatDate(new Date(now.getTime() - (index % 90) * DAY_MS)),
      ID: `POST-${String(titleIndex).padStart(6, '0')}`,
      'Content Title': `Performance fixture title ${titleIndex}`,
      PIC: index % 2 === 0 ? 'Alya Example' : 'Bima Example',
      Category: categories[index % categories.length],
      Platform: platforms[index % platforms.length],
      Views: String(1000 + index),
      'Total Engagement': String(100 + (index % 500)),
      'KPI Summary': 'Average',
      URL: `https://example.test/posts/${index + 1}`
    };
  });

  return {
    success: true,
    laporan: { data: laporan },
    schedule: { data: [{
      Date: formatDate(new Date(now.getTime() + DAY_MS)),
      ID: 'TASK-001',
      'Content Title': 'Campus highlights',
      PIC: 'Alya Example',
      Category: 'Story Telling',
      AssignedUserId: 'e2e-admin',
      Status: false
    }] },
    memberList: { data: [] },
    internList: { data: [] },
    lecturerList: { data: [] },
    scripts: { data: [] },
    meetings: { data: [] },
    notifications: { data: [] },
    auditLog: { data: [] },
    appSettings: { data: [{ key: 'app_name', value: 'GAT' }] },
    platforms: { data: [] },
    categories: { data: categories.map((name) => ({ name, color_class: '' })) },
    gaSummary: { data: [] },
    gaItems: { data: [] }
  };
}

export const PERFORMANCE_DATASET_SIZES = [100, 1000, 10000];
