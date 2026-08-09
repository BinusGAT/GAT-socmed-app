export const PIC_NAME_MAP = {};


export const HEADERS = [
    'Date', 'ID', 'Content Title', 'PIC', 'Category', 'Platform',
    'Views', 'Account Reach', 'Likes', 'Comments', 'Follows',
    'Repost', 'Shares', 'Total Engagement', 'Engagement Rate (%)',
    'KPI Score', 'KPI Summary', 'URL', 'Comment Text'
];



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

function parseIsoFormat(str) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    return null;
}

function parseTextMonthFormat(str) {
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
    return null;
}

function parseSlashFormat(str) {
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
    return null;
}

function parseFallbackDate(str) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }
    return str;
}

export function parseDate(dateStr) {
    if (!dateStr) return '';
    const str = String(dateStr).trim();

    const isoDate = parseIsoFormat(str);
    if (isoDate) return isoDate;

    const textMonthDate = parseTextMonthFormat(str);
    if (textMonthDate) return textMonthDate;

    const slashDate = parseSlashFormat(str);
    if (slashDate) return slashDate;

    return parseFallbackDate(str);
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



export function normalizePlatformName(platformName) {
    const value = String(platformName || '').trim();
    if (!value) return '';

    const lower = value.toLowerCase();
    if (lower === 'instagram') return 'Instagram';
    if (lower === 'tiktok') return 'TikTok';
    if (lower === 'youtube') return 'YouTube';

    return value.charAt(0).toUpperCase() + value.slice(1);
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

function getGroupTrendInfo(item, groupMode) {
    if (groupMode === 'monthly') {
        const mStart = getMonthStart(item.dateObj);
        return {
            groupKey: mStart.getTime().toString(),
            displayLabel: formatMonthlyLabel(mStart),
            sortVal: mStart.getTime()
        };
    } else if (groupMode === 'weekly') {
        const monday = getMonday(item.dateObj);
        return {
            groupKey: monday.getTime().toString(),
            displayLabel: formatWeeklyLabel(monday),
            sortVal: monday.getTime()
        };
    } else {
        return {
            groupKey: item.dateStr,
            displayLabel: item.dateStr,
            sortVal: item.dateObj.getTime()
        };
    }
}

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
        const { groupKey, displayLabel, sortVal } = getGroupTrendInfo(item, groupMode);

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


export function aggregateAllChartsData(activeData) {
    const platformGroups = {};
    const picGroups = {};
    const catGroups = {};

    activeData.forEach(row => {
        // Platform
        const platform = normalizePlatformName(row.Platform) || 'Unknown';
        platformGroups[platform] = (platformGroups[platform] || 0) + (parseInt(row.Views) || 0);

        // PIC
        const pic = normalizePicName(row.PIC) || 'Unknown';
        picGroups[pic] = (picGroups[pic] || 0) + (parseInt(row.Views) || 0);

        // Category
        const cat = row.Category || 'Unknown';
        catGroups[cat] = (catGroups[cat] || 0) + (parseInt(row.Views) || 0);
    });

    const platformData = {
        platforms: Object.keys(platformGroups),
        platformViews: Object.values(platformGroups)
    };

    const picData = {
        picLabels: Object.keys(picGroups),
        picViews: Object.values(picGroups)
    };

    const categoryData = {
        catLabels: Object.keys(catGroups),
        catViews: Object.values(catGroups)
    };

    const trendData = aggregateTrendData(activeData);

    return { trendData, platformData, picData, categoryData };
}

export function getPicBadgeClasses(picName) {
    const name = normalizePicName(picName).toLowerCase();
    if (!name) return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        'bg-sky-500/10 text-sky-400 border border-sky-500/20',
        'bg-purple-500/10 text-purple-400 border border-purple-500/20',
        'bg-pink-500/10 text-pink-400 border border-pink-500/20',
        'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        'bg-rose-500/10 text-rose-400 border border-rose-500/20',
        'bg-teal-500/10 text-teal-400 border border-teal-500/20',
        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    ];

    const index = Math.abs(hash) % colors.length;
    return colors[index];
}
