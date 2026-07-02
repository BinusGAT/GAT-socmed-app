// Constant mappings for GAT Content Manager
export const PIC_NAME_MAP = {
    KELVIN: 'Kelvin',
    ANTHONI: 'Anthoni',
    EDUARD: 'Eduard',
    FELIX: 'Felix',
    RULIYANTO: 'Ruliyanto',
    LEONARDI: 'Leonardi',
    RAFAEL: 'Rafael',
    'ANDRE JOE LIENARDI': 'Andre',
    'FELIX OLIVIER': 'Felix',
    'EDUARD SUTANTO': 'Eduard',
    'ANTHONI GIOVANNI': 'Anthoni',
    'RULIYANTO RASYID HUDA': 'Ruliyanto',
    'RAFAEL WIRASANA WIJAYA': 'Rafael',
    'PAK FAJAR': 'Pak Fajar'
};

export const PIC_BADGE_CLASS_MAP = {
    Kelvin: 'badge-pic-kelvin',
    Anthoni: 'badge-pic-anthoni',
    Eduard: 'badge-pic-eduard',
    Felix: 'badge-pic-felix',
    Ruliyanto: 'badge-pic-ruliyanto',
    Leonardi: 'badge-pic-leonardi',
    Rafael: 'badge-pic-rafael'
};

export const PLATFORM_NAME_MAP = {
    INSTAGRAM: 'Instagram',
    TIKTOK: 'TikTok',
    YOUTUBE: 'YouTube',
    TWITTER: 'Twitter'
};

export const PLATFORM_BADGE_CLASS_MAP = {
    Instagram: 'badge-platform-instagram',
    TikTok: 'badge-platform-tiktok',
    YouTube: 'badge-platform-youtube',
    Twitter: 'badge-platform-twitter'
};

export const PLATFORM_LOGO_MAP = {
    Instagram: '/img/icons/instagram-logo.png',
    TikTok: '/img/icons/tiktok-logo.png',
    YouTube: '/img/icons/youtube-logo.webp'
};


export const HEADERS = [
    'Date', 'ID', 'Content Title', 'PIC', 'Category', 'Platform',
    'Views', 'Account Reach', 'Likes', 'Comments', 'Follows',
    'Repost', 'Shares', 'Total Engagement', 'Engagement Rate (%)',
    'KPI Score', 'KPI Summary', 'URL', 'Comment Text'
];

// Helper Functions
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function sanitizeURL(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    try {
        const urlObj = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return '';
        return urlObj.href;
    } catch {
        return '';
    }
}

export function formatDate(dateInput) {
    if (!dateInput) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(dateInput))) return String(dateInput);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateInput))) {
        const [year, month, day] = String(dateInput).split('-');
        return `${month}/${day}/${year}`;
    }
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

export function formatDisplayDate(dateInput) {
    if (!dateInput) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateInput))) {
        const [year, month, day] = String(dateInput).split('-');
        return `${day}/${month}/${year}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(dateInput))) {
        const [month, day, year] = String(dateInput).split('/');
        return `${day}/${month}/${year}`;
    }
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export function parseDate(dateStr) {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    const displayMatch = str.match(/^(\d{1,2})[-\/ ]([A-Za-z]{3,9})[-\/ ](\d{4})$/);
    if (displayMatch) {
        const monthMap = {
            jan: '01', january: '01',
            feb: '02', february: '02',
            mar: '03', march: '03',
            apr: '04', april: '04',
            may: '05',
            jun: '06', june: '06',
            jul: '07', july: '07',
            aug: '08', august: '08',
            sep: '09', sept: '09', september: '09',
            oct: '10', october: '10',
            nov: '11', november: '11',
            dec: '12', december: '12'
        };
        const monthKey = displayMatch[2].toLowerCase();
        const month = monthMap[monthKey];
        if (month) {
            return `${displayMatch[3]}-${month}-${displayMatch[1].padStart(2, '0')}`;
        }
    }
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            let p1 = parseInt(parts[0], 10);
            let p2 = parseInt(parts[1], 10);
            let year = parts[2];
            let month = parts[0].padStart(2, '0');
            let day = parts[1].padStart(2, '0');
            if (p1 > 12) {
                day = parts[0].padStart(2, '0');
                month = parts[1].padStart(2, '0');
            } else if (p2 > 12) {
                month = parts[0].padStart(2, '0');
                day = parts[1].padStart(2, '0');
            }
            return `${year}-${month}-${day}`;
        }
    }
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }
    return str;
}

export function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Number(num).toLocaleString('id-ID');
}

export function normalizePicName(picName) {
    const value = String(picName || '').trim();
    if (!value) return '';

    const upperValue = value.toUpperCase();
    if (PIC_NAME_MAP[upperValue]) {
        return PIC_NAME_MAP[upperValue];
    }

    return value
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function resolveMemberName(pic, memberList) {
    if (!pic) return '';
    if (!memberList || memberList.length === 0) return pic;
    const cleanPic = String(pic).trim().toUpperCase();
    if (!cleanPic) return '';

    // 1. Try exact or partial matching in NAMA
    const match = memberList.find(m => {
        const name = String(m.NAMA || '').trim().toUpperCase();
        return name === cleanPic || name.includes(cleanPic) || cleanPic.includes(name);
    });
    if (match) return match.NAMA;

    // 2. Try matching the first word of cleanPic
    const firstWordPic = cleanPic.split(/\s+/)[0];
    const matchFirstWord = memberList.find(m => {
        const name = String(m.NAMA || '').trim().toUpperCase();
        const firstWordName = name.split(/\s+/)[0];
        return firstWordName === firstWordPic || name.includes(firstWordPic);
    });
    if (matchFirstWord) return matchFirstWord.NAMA;

    return pic; // fallback
}

export function getPicBadgeClass(picName) {
    return PIC_BADGE_CLASS_MAP[normalizePicName(picName)] || 'badge-pic-default';
}

export function normalizePlatformName(platformName) {
    const value = String(platformName || '').trim();
    if (!value) return '';

    const upperValue = value.toUpperCase();
    if (PLATFORM_NAME_MAP[upperValue]) {
        return PLATFORM_NAME_MAP[upperValue];
    }

    return value;
}

export function getPlatformBadgeClass(platformName) {
    return PLATFORM_BADGE_CLASS_MAP[normalizePlatformName(platformName)] || 'badge-platform-default';
}

export function getPlatformLogoHtml(platformName) {
    const norm = normalizePlatformName(platformName);
    const logoUrl = PLATFORM_LOGO_MAP[norm];
    const badgeClass = getPlatformBadgeClass(platformName);
    if (logoUrl) {
        return `<span class="badge ${badgeClass} platform-badge-with-logo" style="display:inline-flex; align-items:center; gap:4px;"><img src="${logoUrl}" alt="${norm}" class="platform-logo-img" style="width:12px; height:12px; object-fit:contain;" />${norm}</span>`;
    }
    return `<span class="badge ${badgeClass}">${norm}</span>`;
}

export function getPlatformBadgeHtml(platformName) {
    return getPlatformLogoHtml(platformName);
}

export function getLocalDateInputValue() {
    const date = new Date();
    // Offset local timezone
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
}

export function getTaskCalculatedStatus(task) {
    const isDone = (task.Status === true || task.Status === 'TRUE' || task.Status === 'true');
    if (isDone) return 'Done';

    if (!task.Date) return 'On Progress';

    const taskDateStr = parseDate(task.Date);
    if (!taskDateStr) return 'On Progress';

    const todayStr = getLocalDateInputValue();

    if (taskDateStr < todayStr) return 'Overdue';
    if (taskDateStr === todayStr) return 'Due Today';
    return 'On Progress';
}

export const parseDisplayDateToDate = (displayDateStr) => {
    if (!displayDateStr) return null;
    const parts = displayDateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    return isNaN(dateObj.getTime()) ? null : dateObj;
};

export const getMonday = (d) => {
    const dateCopy = new Date(d.getTime());
    const day = dateCopy.getDay();
    const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1);
    dateCopy.setDate(diff);
    dateCopy.setHours(0, 0, 0, 0);
    return dateCopy;
};

export const getMonthStart = (d) => {
    return new Date(d.getFullYear(), d.getMonth(), 1);
};

export const formatWeeklyLabel = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `W/C ${day}/${month}/${year}`;
};

export const formatMonthlyLabel = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

export function aggregateTrendData(activeData) {
    const dataWithDates = activeData.map(row => {
        const dateStr = formatDisplayDate(row.Date);
        const dateObj = parseDisplayDateToDate(dateStr);
        return { row, dateStr, dateObj };
    }).filter(item => item.dateObj !== null);

    if (dataWithDates.length === 0) {
        return null;
    }

    const uniqueDays = new Set(dataWithDates.map(item => item.dateStr));
    const uniqueDaysCount = uniqueDays.size;

    let groupMode = 'daily';
    if (uniqueDaysCount > 50) {
        groupMode = 'monthly';
    } else if (uniqueDaysCount > 15) {
        groupMode = 'weekly';
    }

    const dateGroups = {};
    dataWithDates.forEach(item => {
        let groupKey;
        let displayLabel;
        let sortVal;

        if (groupMode === 'monthly') {
            const mStart = getMonthStart(item.dateObj);
            groupKey = mStart.getTime().toString();
            displayLabel = formatMonthlyLabel(mStart);
            sortVal = mStart.getTime();
        } else if (groupMode === 'weekly') {
            const monday = getMonday(item.dateObj);
            groupKey = monday.getTime().toString();
            displayLabel = formatWeeklyLabel(monday);
            sortVal = monday.getTime();
        } else {
            groupKey = item.dateStr;
            displayLabel = item.dateStr;
            sortVal = item.dateObj.getTime();
        }

        if (!dateGroups[groupKey]) {
            dateGroups[groupKey] = {
                views: 0,
                engagement: 0,
                displayLabel: displayLabel,
                sortVal: sortVal
            };
        }
        dateGroups[groupKey].views += parseInt(item.row.Views) || 0;
        dateGroups[groupKey].engagement += parseInt(item.row['Total Engagement']) || 0;
    });

    const sortedGroupKeys = Object.keys(dateGroups).sort((a, b) => {
        return dateGroups[a].sortVal - dateGroups[b].sortVal;
    });

    return {
        sortedDates: sortedGroupKeys.map(k => dateGroups[k].displayLabel),
        viewsData: sortedGroupKeys.map(k => dateGroups[k].views),
        engagementData: sortedGroupKeys.map(k => dateGroups[k].engagement)
    };
}

export function aggregatePlatformData(activeData) {
    const platformGroups = {};
    activeData.forEach(row => {
        const platform = normalizePlatformName(row.Platform) || 'Unknown';
        if (!platformGroups[platform]) {
            platformGroups[platform] = 0;
        }
        platformGroups[platform] += parseInt(row.Views) || 0;
    });

    return {
        platforms: Object.keys(platformGroups),
        platformViews: Object.values(platformGroups)
    };
}

export function aggregatePicData(activeData) {
    const picGroups = {};
    activeData.forEach(row => {
        const pic = normalizePicName(row.PIC) || 'Unknown';
        if (!picGroups[pic]) {
            picGroups[pic] = 0;
        }
        picGroups[pic] += parseInt(row.Views) || 0;
    });
    return {
        picLabels: Object.keys(picGroups),
        picViews: Object.values(picGroups)
    };
}

export function aggregateCategoryData(activeData) {
    const catGroups = {};
    activeData.forEach(row => {
        const cat = row.Category || 'Unknown';
        if (!catGroups[cat]) {
            catGroups[cat] = 0;
        }
        catGroups[cat] += parseInt(row.Views) || 0;
    });
    return {
        catLabels: Object.keys(catGroups),
        catViews: Object.values(catGroups)
    };
}

