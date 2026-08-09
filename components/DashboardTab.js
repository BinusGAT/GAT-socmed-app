'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import {
    normalizePicName,
    formatNumber,
    getLocalDateInputValue,
    parseDate,
    resolveMemberName,
    normalizePlatformName,
    getTaskCalculatedStatus,
    formatDisplayDate,
    getContentGroupKey
} from '../utils/helpers';
import PlatformBadge from './PlatformBadge.jsx';
import SortableTableHeader from './SortableTableHeader';

const parseCleanInt = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[\.\,]/g, '');
    return parseInt(cleaned, 10) || 0;
};

export default function DashboardTab({ onOpenDatePicker }) {
    const {
        currentData,
        scheduleData,
        isUnlocked,
        isMutating,
        userRole,
        addLaporanRow,
        updateLaporanRow,
        deleteLaporanRow,
        deleteBatchLaporanRows,
        memberListData,
        categoriesData,
        platformsData,
        showAlert,
        searchQuery,
        setSearchQuery,
        dateRange,
        isNewPostDrawerOpen,
        setIsNewPostDrawerOpen,
        meetingsData
    } = useDashboard();

    // Form editing states
    const [editIndex, setEditIndex] = useState(null); // null if new entry
    const [formId, setFormId] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTitle, setFormTitle] = useState('');
    const [formPic, setFormPic] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formPlatform, setFormPlatform] = useState('Instagram');
    const [formViews, setFormViews] = useState('');
    const [formReach, setFormReach] = useState('');
    const [formLikes, setFormLikes] = useState('');
    const [formComments, setFormComments] = useState('');
    const [formFollows, setFormFollows] = useState('');
    const [formRepost, setFormRepost] = useState('');
    const [formShares, setFormShares] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formCommentText, setFormCommentText] = useState('');

    // Inner tabs inside Form Drawer
    const [formTab, setFormTab] = useState('basic'); // 'basic' | 'additional'

    // Table selection & sorting
    const [selectedRows, setSelectedRows] = useState([]);
    const [sortColumn, setSortColumn] = useState('Date');
    const [sortDirection, setSortDirection] = useState('asc');
    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

    // Sidebar state (defaults to today's date dynamically)
    const today = React.useMemo(() => new Date(), []);
    const [selectedDate, setSelectedDate] = useState(() => {
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });
    const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
    const [activeChartTab, setActiveChartTab] = useState('Followers'); // 'Followers' | 'Engagement' | 'Reach'
    const [tableFilterDate, setTableFilterDate] = useState('');

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    // Chart and canvas refs
    const activityCanvasRef = useRef(null);
    const activityChartRef = useRef(null);
    const viewsInputRef = useRef(null);

    // Reset editor fields to defaults
    const resetForm = () => {
        setEditIndex(null);
        setFormId('');
        setFormDate(getLocalDateInputValue());
        setFormTitle('');
        setFormPic('');
        setFormCategory('');
        setFormPlatform('Instagram');
        setFormViews('');
        setFormReach('');
        setFormLikes('');
        setFormComments('');
        setFormFollows('');
        setFormRepost('');
        setFormShares('');
        setFormUrl('');
        setFormCommentText('');
        setFormTab('basic');
        setIsNewPostDrawerOpen(false);
    };

    // Open Custom Date Picker Overlay
    const handleDatePickerClick = () => {
        if (!isUnlocked || editIndex !== null) return;
        onOpenDatePicker((selectedDate) => {
            setFormDate(selectedDate);
        }, formDate);
    };

    const handleTableDatePickerClick = () => {
        onOpenDatePicker((selectedDate) => {
            setTableFilterDate(selectedDate);
        }, tableFilterDate || getLocalDateInputValue());
    };

    // Sync views input focus in edit mode
    useEffect(() => {
        if (editIndex !== null && isNewPostDrawerOpen) {
            const timer = setTimeout(() => {
                if (viewsInputRef.current) {
                    viewsInputRef.current.focus();
                    try { viewsInputRef.current.select(); } catch (e) { }
                }
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [editIndex, isNewPostDrawerOpen]);

    // Initialize date field on mount
    useEffect(() => {
        if (!formDate) {
            setFormDate(getLocalDateInputValue());
        }
    }, [formDate]);

    // Process and sort table data
    const getProcessedData = () => {
        let list = [...currentData];

        // Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(row =>
                String(row['Content Title'] || '').toLowerCase().includes(q) ||
                String(row.ID || '').toLowerCase().includes(q) ||
                String(row.PIC || '').toLowerCase().includes(q) ||
                String(row.Platform || '').toLowerCase().includes(q)
            );
        }

        // Date Range presets
        if (dateRange.start) {
            list = list.filter(row => parseDate(row.Date) >= dateRange.start);
        }
        if (dateRange.end) {
            list = list.filter(row => parseDate(row.Date) <= dateRange.end);
        }
        if (tableFilterDate) {
            list = list.filter(row => parseDate(row.Date) === tableFilterDate);
        }

        // Apply Sorting
        if (sortColumn !== 'none') {
            list.sort((a, b) => {
                let valA = a[sortColumn];
                let valB = b[sortColumn];

                if (['Views', 'Total Engagement', 'Engagement Rate (%)', 'KPI Score', 'KPI Summary'].includes(sortColumn)) {
                    const numA = parseFloat(valA) || 0;
                    const numB = parseFloat(valB) || 0;
                    return sortDirection === 'asc' ? numA - numB : numB - numA;
                }

                if (sortColumn === 'Date') {
                    const dateA = parseDate(valA) || '';
                    const dateB = parseDate(valB) || '';
                    return sortDirection === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
                }

                const strA = String(valA || '').toLowerCase();
                const strB = String(valB || '').toLowerCase();
                if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
                if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return list;
    };

    const processedData = getProcessedData();

    const rowspans = React.useMemo(() => {
        if (!processedData || processedData.length === 0) return [];

        const preprocessed = processedData.map(item => ({
            ...item,
            _parsedDate: parseDate(item.Date),
            _normalizedPic: normalizePicName(item.PIC),
            _groupKey: getContentGroupKey(item)
        }));

        const spans = [];
        for (let r = 0; r < preprocessed.length; r++) {
            spans[r] = {
                Date: 1,
                ID: 1,
                ContentTitle: 1,
                PIC: 1,
                Category: 1,
                KPISummary: 1
            };
        }

        let i = 0;
        while (i < preprocessed.length) {
            let j = i + 1;
            const currentGroupKey = preprocessed[i]._groupKey;

            if (currentGroupKey) {
                while (j < preprocessed.length && preprocessed[j]._groupKey === currentGroupKey) {
                    j++;
                }
            }

            const count = j - i;
            if (count > 1) {
                spans[i].ContentTitle = count;
                spans[i].KPISummary = count;
                for (let k = i + 1; k < j; k++) {
                    spans[k].ContentTitle = 0;
                    spans[k].KPISummary = 0;
                }

                let dateSame = true;
                const dateVal = preprocessed[i]._parsedDate;

                let idSame = true;
                const idVal = preprocessed[i].ID;

                let picSame = true;
                const picVal = preprocessed[i]._normalizedPic;

                let catSame = true;
                const catVal = preprocessed[i].Category;

                for (let k = i + 1; k < j; k++) {
                    if (preprocessed[k]._parsedDate !== dateVal) dateSame = false;
                    if (preprocessed[k].ID !== idVal) idSame = false;
                    if (preprocessed[k]._normalizedPic !== picVal) picSame = false;
                    if (preprocessed[k].Category !== catVal) catSame = false;
                }

                if (dateSame) {
                    spans[i].Date = count;
                    for (let k = i + 1; k < j; k++) spans[k].Date = 0;
                }
                if (idSame) {
                    spans[i].ID = count;
                    for (let k = i + 1; k < j; k++) spans[k].ID = 0;
                }
                if (picSame) {
                    spans[i].PIC = count;
                    for (let k = i + 1; k < j; k++) spans[k].PIC = 0;
                }
                if (catSame) {
                    spans[i].Category = count;
                    for (let k = i + 1; k < j; k++) spans[k].Category = 0;
                }
            }
            i = j;
        }
        return spans;
    }, [processedData]);

    // Stats calculations
    const calculateStats = () => {
        let totalViews = 0;
        let totalReach = 0;
        let totalEngagement = 0;
        let totalRate = 0;
        let rateCount = 0;
        const contentTitles = new Set();

        currentData.forEach(row => {
            totalViews += parseCleanInt(row.Views);
            totalReach += parseCleanInt(row['Account Reach']);
            totalEngagement += parseCleanInt(row['Total Engagement']);

            const rate = parseFloat(row['Engagement Rate (%)']) || 0;
            if (rate > 0) {
                totalRate += rate;
                rateCount++;
            }

            if (row['Content Title']) {
                contentTitles.add(String(row['Content Title']).trim().toLowerCase());
            }
        });

        const avgEngagementRate = rateCount > 0 ? (totalRate / rateCount).toFixed(1) + '%' : '0.0%';

        return {
            contentTitlesSize: contentTitles.size,
            totalViews,
            totalReach,
            totalEngagement,
            avgEngagementRate
        };
    };

    const stats = calculateStats();

    // Channels aggregation
    const getPlatformViews = () => {
        const counts = {
            Instagram: { views: 0 },
            TikTok: { views: 0 },
            YouTube: { views: 0 }
        };

        currentData.forEach(row => {
            const plat = normalizePlatformName(row.Platform);
            if (counts[plat]) {
                counts[plat].views += parseCleanInt(row.Views);
            }
        });

        return counts;
    };

    const platformStats = getPlatformViews();

    const getKpiBadgeClass = (score) => {
        const kpi = parseCleanInt(score);
        if (kpi >= 6) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
        if (kpi >= 5) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
        if (kpi >= 4) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    };

    // Auto calculate KPI Score and Engagement Rate on form
    const autoCalculateMetrics = (viewsInput, reachInput, likesVal, commVal, follVal, repVal, shVal, platformVal) => {
        const views = parseCleanInt(viewsInput);
        const reach = parseCleanInt(reachInput);
        const likes = parseCleanInt(likesVal);
        const comments = parseCleanInt(commVal);
        const follows = parseCleanInt(follVal);
        const repost = parseCleanInt(repVal);
        const shares = parseCleanInt(shVal);

        const totalEngagement = likes + comments + follows + repost + shares;
        let engagementRate = 0;
        if (reach > 0) {
            engagementRate = (totalEngagement / reach) * 100;
        }

        let kpiScore = 3;
        if (views >= 100000) kpiScore = 6;
        else if (views >= 10000) kpiScore = 5;
        else if (views >= 1000) kpiScore = 4;

        let kpiSummary = kpiScore;
        currentData.forEach(row => {
            if (normalizePlatformName(row.Platform) !== normalizePlatformName(platformVal) &&
                String(row['Content Title']).trim().toLowerCase() === (formTitle || '').trim().toLowerCase()) {
                const otherKpi = parseCleanInt(row['KPI Score']);
                if (otherKpi > kpiSummary) kpiSummary = otherKpi;
            }
        });

        return {
            totalEngagement,
            engagementRate: engagementRate.toFixed(2),
            kpiScore,
            kpiSummary
        };
    };

    const formCalculated = autoCalculateMetrics(
        formViews, formReach, formLikes, formComments, formFollows, formRepost, formShares, formPlatform
    );

    const loadRowForEdit = (row, index) => {
        if (!isUnlocked) {
            showAlert('Workspace is locked. Please unlock to edit records.', 'error');
            return;
        }
        setEditIndex(index);
        setFormId(row.ID || '');
        setFormDate(row.Date || getLocalDateInputValue());
        setFormTitle(row['Content Title'] || '');
        setFormPic(normalizePicName(resolveMemberName(row.PIC, memberListData)));
        setFormCategory(row.Category || 'Story Telling');
        setFormPlatform(row.Platform || 'Instagram');
        setFormViews(row.Views || '');
        setFormReach(row['Account Reach'] || '');
        setFormLikes(row.Likes || '');
        setFormComments(row.Comments || '');
        setFormFollows(row.Follows || '');
        setFormRepost(row.Repost || '');
        setFormShares(row.Shares || '');
        setFormUrl(row.URL || '');
        setFormCommentText(row['Comment Text'] || '');
        setFormTab('basic');
        setIsNewPostDrawerOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!isUnlocked) {
            showAlert('Workspace is locked. Please unlock to save entries.', 'error');
            return;
        }

        if (userRole !== 'Admin') {
            showAlert('Only Administrators are authorized to save database entries.', 'error');
            return;
        }

        if (!formPic || !formCategory) {
            showAlert('PIC and Category are required fields.', 'error');
            return;
        }

        let rowId = formId;
        if (!rowId) {
            let maxIdNum = 0;
            currentData.forEach(row => {
                if (row.ID && String(row.ID).startsWith('GAT')) {
                    const num = parseInt(row.ID.replace('GAT', ''), 10) || 0;
                    if (num > maxIdNum) maxIdNum = num;
                }
            });
            rowId = `GAT${String(maxIdNum + 1).padStart(3, '0')}`;
        }

        const calculated = autoCalculateMetrics(
            formViews, formReach, formLikes, formComments, formFollows, formRepost, formShares, formPlatform
        );

        let maxKpiScore = calculated.kpiScore;
        currentData.forEach(row => {
            if (normalizePlatformName(row.Platform) !== normalizePlatformName(formPlatform) &&
                String(row['Content Title']).trim().toLowerCase() === formTitle.trim().toLowerCase()) {
                const otherKpi = parseCleanInt(row['KPI Score']);
                if (otherKpi > maxKpiScore) maxKpiScore = otherKpi;
            }
        });

        const payload = {
            ID: rowId,
            Date: formDate,
            'Content Title': formTitle.trim() || 'Untitled',
            PIC: formPic,
            Category: formCategory,
            Platform: formPlatform,
            Views: parseCleanInt(formViews),
            'Account Reach': parseCleanInt(formReach),
            Likes: parseCleanInt(formLikes),
            Comments: parseCleanInt(formComments),
            Follows: parseCleanInt(formFollows),
            Repost: parseCleanInt(formRepost),
            Shares: parseCleanInt(formShares),
            'Total Engagement': calculated.totalEngagement,
            'Engagement Rate (%)': parseFloat(calculated.engagementRate),
            'KPI Score': calculated.kpiScore,
            'KPI Summary': maxKpiScore,
            URL: formUrl,
            'Comment Text': formCommentText
        };

        let success = false;
        if (editIndex !== null) {
            success = await updateLaporanRow(payload, editIndex);
        } else {
            success = await addLaporanRow(payload);
        }

        if (success) {
            resetForm();
        }
    };

    // Table sorting triggers
    const handleHeaderSort = (colName) => {
        if (sortColumn === colName) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(colName);
            setSortDirection('asc');
        }
    };

    // Bulk deletion
    const handleDeleteSelected = async () => {
        if (selectedRows.length === 0) return;

        const currentDataIndexMap = new Map();
        currentData.forEach((row, index) => {
            if (row.ID && !currentDataIndexMap.has(row.ID)) {
                currentDataIndexMap.set(row.ID, index);
            }
        });

        const rowsToDelete = selectedRows.map(id => {
            const index = currentDataIndexMap.has(id) ? currentDataIndexMap.get(id) : -1;
            return { id, rowIndex: index };
        }).filter(item => item.rowIndex !== -1);

        const success = await deleteBatchLaporanRows(rowsToDelete);
        if (success) {
            setSelectedRows([]);
        }
        setIsDeleteConfirming(false);
    };

    const toggleSelectRow = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(r => r !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === processedData.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(processedData.map(row => row.ID));
        }
    };

    // Audience growth line chart (differentiated by platform, starting from 0)
    useEffect(() => {
        if (currentData.length === 0) return;

        const timer = setTimeout(() => {
            if (typeof window === 'undefined' || !window.Chart || !activityCanvasRef.current) return;

            const Chart = window.Chart;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            // Per-platform monthly arrays (12 items each, initialized to 0)
            const platformValues = {
                Instagram: Array(12).fill(0),
                TikTok: Array(12).fill(0),
                YouTube: Array(12).fill(0),
            };

            // Accumulate actual database metrics by month and platform
            currentData.forEach(row => {
                if (!row.Date) return;
                const d = parseDate(row.Date);
                if (d) {
                    const monthIdx = parseInt(d.split('-')[1], 10) - 1;
                    if (monthIdx >= 0 && monthIdx < 12) {
                        let val = 0;
                        if (activeChartTab === 'Followers') {
                            val = parseCleanInt(row.Follows);
                        } else if (activeChartTab === 'Engagement') {
                            val = parseCleanInt(row['Total Engagement']);
                        } else {
                            val = parseCleanInt(row['Account Reach']);
                        }

                        const platRaw = String(row.Platform || '').trim().toLowerCase();
                        if (platRaw.includes('insta')) {
                            platformValues.Instagram[monthIdx] += val;
                        } else if (platRaw.includes('tik')) {
                            platformValues.TikTok[monthIdx] += val;
                        } else if (platRaw.includes('you') || platRaw.includes('yt')) {
                            platformValues.YouTube[monthIdx] += val;
                        } else {
                            platformValues.Instagram[monthIdx] += val;
                        }
                    }
                }
            });

            // Compute series (starting from 0)
            const computeSeries = (monthlyArr) => {
                if (activeChartTab === 'Followers') {
                    // Cumulative growth starting from 0
                    let cum = 0;
                    return monthlyArr.map(v => {
                        cum += v;
                        return cum;
                    });
                } else {
                    return [...monthlyArr];
                }
            };

            const igData = computeSeries(platformValues.Instagram);
            const ttData = computeSeries(platformValues.TikTok);
            const ytData = computeSeries(platformValues.YouTube);

            // Compute total combined series
            const totalMonthly = Array(12).fill(0).map((_, i) =>
                platformValues.Instagram[i] + platformValues.TikTok[i] + platformValues.YouTube[i]
            );
            const totalData = computeSeries(totalMonthly);

            if (activityChartRef.current) {
                activityChartRef.current.destroy();
            }

            const ctx = activityCanvasRef.current.getContext('2d');

            activityChartRef.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Instagram',
                            data: igData,
                            borderColor: '#E1306C',
                            backgroundColor: 'rgba(225, 48, 108, 0.1)',
                            borderWidth: 2.5,
                            pointRadius: 2,
                            pointHoverRadius: 5,
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'TikTok',
                            data: ttData,
                            borderColor: '#00F2FE',
                            backgroundColor: 'rgba(0, 242, 254, 0.1)',
                            borderWidth: 2.5,
                            pointRadius: 2,
                            pointHoverRadius: 5,
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'YouTube',
                            data: ytData,
                            borderColor: '#FF0000',
                            backgroundColor: 'rgba(255, 0, 0, 0.1)',
                            borderWidth: 2.5,
                            pointRadius: 2,
                            pointHoverRadius: 5,
                            fill: false,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#171f33',
                            titleColor: '#dae2fd',
                            bodyColor: '#bbcabf',
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderWidth: 1,
                            padding: 10,
                            cornerRadius: 4,
                            callbacks: {
                                label: function (context) {
                                    return ' ' + context.dataset.label + ': ' + formatNumber(context.raw);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#bbcabf',
                                font: { family: 'Inter', size: 10 }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            min: 0,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.04)'
                            },
                            ticks: {
                                color: '#bbcabf',
                                font: { family: 'Inter', size: 10 },
                                callback: function (value) {
                                    if (value >= 1000000) return (value / 1000000) + 'M';
                                    if (value >= 1000) return (value / 1000) + 'K';
                                    return value;
                                }
                            }
                        }
                    }
                }
            });

        }, 150);

        return () => clearTimeout(timer);
    }, [currentData, activeChartTab]);

    // Scheduled tasks timeline filtering
    const getScheduledTasksForDay = () => {
        if (!selectedDate) return [];
        const target = parseDate(selectedDate);
        return (scheduleData || []).filter(task => {
            const taskDate = parseDate(task.Date);
            return taskDate === target;
        });
    };

    const scheduledTimeline = getScheduledTasksForDay();

    // Calendar helper calculations
    const getCalendarDays = () => {
        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDayIndex; i++) {
            days.push({ dayNum: '', dateStr: null, isDummy: true });
        }

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({ dayNum: d, dateStr, isDummy: false });
        }
        return days;
    };

    // Get combined calendar tasks (schedules + meetings)
    const combinedTasks = React.useMemo(() => {
        const tasks = [];

        // Build a Set of uploaded/completed task IDs for O(1) lookup
        const uploadedIds = new Set();
        (currentData || []).forEach(row => {
            if (row.ID && row.URL && String(row.URL).trim() !== '') {
                uploadedIds.add(row.ID);
            }
        });

        (scheduleData || []).forEach(task => {
            if (!task.Date || !task.PIC || !task.Category) return;
            const parsedDate = parseDate(task.Date);
            if (parsedDate) {
                const isUploaded = uploadedIds.has(task.ID);

                tasks.push({
                    id: task.ID,
                    date: parsedDate,
                    pic: task.PIC,
                    category: task.Category,
                    contentTitle: task['Content Title'] || '',
                    status: isUploaded,
                    isFromDashboard: true,
                    calculatedStatus: getTaskCalculatedStatus({
                        ...task,
                        Status: isUploaded
                    })
                });
            }
        });

        (meetingsData || []).forEach(m => {
            const parsedDate = parseDate(m.date || m.Date);
            if (parsedDate) {
                tasks.push({
                    id: m.id || m.ID,
                    date: parsedDate,
                    isMeeting: true,
                    pic: 'Meeting',
                    category: 'Recap',
                    calculatedStatus: 'Done'
                });
            }
        });

        return tasks;
    }, [scheduleData, currentData, meetingsData]);

    const calendarDays = getCalendarDays();

    // Calculate dynamic values for goal circle
    const publishedCount = currentData.filter(r => r.URL && String(r.URL).trim() !== '').length;
    const targetCount = 30;
    const goalPercentage = Math.min(Math.round((publishedCount / targetCount) * 100), 100) || 72;

    if (!isUnlocked) {
        return <LockScreen sectionName="Dashboard" />;
    }

    return (
        <div className="space-y-6">

            {/* ========================================================
               1. DESKTOP VIEW LAYOUT (hidden on screens <= 1024px)
               ======================================================== */}
            <div className="hidden lg:grid grid-cols-4 gap-gutter items-start">
                {/* Left/Center 3 Columns */}
                <div className="col-span-3 space-y-6">
                    {/* Performance Overview header strip */}
                    {/* Stats Bento Grid - Equal 5 Column Box Sizes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                        {/* Stat Card 1 - Titles */}
                        <div className="bg-surface-container p-4 rounded-xl flex flex-col justify-between gap-3 border border-outline-variant/30 hover:border-outline/50 transition-all duration-150 shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] sm:text-xs text-on-surface-variant font-medium">Active Titles</span>
                                <span className="material-symbols-outlined text-indigo-400 text-[18px]">tag</span>
                            </div>
                            <div>
                                <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-on-surface font-tabular tracking-tight">{stats.contentTitlesSize}</h4>
                                <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 mt-0.5">Active campaigns</p>
                            </div>
                        </div>
                        {/* Stat Card 2 - Total Views */}
                        <div className="bg-surface-container p-4 rounded-xl flex flex-col justify-between gap-3 border border-outline-variant/30 hover:border-outline/50 transition-all duration-150 shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] sm:text-xs text-on-surface-variant font-medium">Total Views</span>
                                <span className="material-symbols-outlined text-indigo-400 text-[18px]">trending_up</span>
                            </div>
                            <div>
                                <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-on-surface font-tabular tracking-tight">{formatNumber(stats.totalViews)}</h4>
                                <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 mt-0.5">Across all platforms</p>
                            </div>
                        </div>
                        {/* Stat Card 3 - Total Reach */}
                        <div className="bg-surface-container p-4 rounded-xl flex flex-col justify-between gap-3 border border-outline-variant/30 hover:border-outline/50 transition-all duration-150 shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] sm:text-xs text-on-surface-variant font-medium">Total Reach</span>
                                <span className="material-symbols-outlined text-indigo-400 text-[18px]">public</span>
                            </div>
                            <div>
                                <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-on-surface font-tabular tracking-tight">{formatNumber(stats.totalReach)}</h4>
                                <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 mt-0.5">Unique accounts</p>
                            </div>
                        </div>
                        {/* Stat Card 4 - Engagement */}
                        <div className="bg-surface-container p-4 rounded-xl flex flex-col justify-between gap-3 border border-outline-variant/30 hover:border-outline/50 transition-all duration-150 shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] sm:text-xs text-on-surface-variant font-medium">Total Engagement</span>
                                <span className="material-symbols-outlined text-indigo-400 text-[18px]">favorite</span>
                            </div>
                            <div>
                                <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-on-surface font-tabular tracking-tight">{formatNumber(stats.totalEngagement)}</h4>
                                <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 mt-0.5">Likes, comments, shares</p>
                            </div>
                        </div>
                        {/* Stat Card 5 - Eng. Rate */}
                        <div className="bg-surface-container p-4 rounded-xl flex flex-col justify-between gap-3 border border-outline-variant/30 hover:border-outline/50 transition-all duration-150 shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] sm:text-xs text-on-surface-variant font-medium">Engagement Rate</span>
                                <span className="material-symbols-outlined text-indigo-400 text-[18px]">percent</span>
                            </div>
                            <div>
                                <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-on-surface font-tabular tracking-tight">{stats.avgEngagementRate}</h4>
                                <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 mt-0.5">Avg. engagement ratio</p>
                            </div>
                        </div>
                    </div>

                    {/* Promo Banner and traffic channels */}
                    <div className="grid grid-cols-3 gap-gutter">
                        <div className="col-span-2 bg-surface-container border border-outline-variant/30 rounded-xl p-5 flex items-center gap-5 relative overflow-hidden shadow-xs">
                            <span className="absolute top-2 left-4 text-[72px] leading-none font-serif text-on-surface-variant/15 select-none pointer-events-none">&ldquo;</span>
                            <div className="z-10 flex flex-col gap-3 pl-4">
                                <p className="text-body-md font-medium text-on-surface/80 italic leading-relaxed tracking-wide text-pretty">
                                    "Consistency is the foundation of trust — and trust is what turns viewers into community."
                                </p>
                                <span className="text-[10px] text-primary font-bold uppercase tracking-widest font-mono">— GAT Content Team</span>
                            </div>
                        </div>

                        {/* Traffic stats */}
                        <div className="glass-panel p-4 rounded-xl border border-outline-variant/30 flex flex-col justify-between shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center border-b border-outline-variant/15 pb-2.5 mb-2.5">
                                <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Platform Performance</span>
                                <span className="text-[10px] text-primary font-bold uppercase tracking-wider font-mono">Views</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-1 z-10">
                                {/* Instagram Box */}
                                <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:bg-surface-container hover:border-primary/20 hover:scale-[1.03] hover:shadow-sm group">
                                    <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                        <i className="fa-brands fa-instagram text-rose-400 text-[16px]"></i>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] text-on-surface-variant/80 uppercase tracking-widest font-bold font-mono">Instagram</p>
                                        <p className="text-body-sm font-bold text-on-surface mt-1 font-tabular">{formatNumber(platformStats.Instagram.views)}</p>
                                    </div>
                                </div>

                                {/* TikTok Box */}
                                <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:bg-surface-container hover:border-primary/20 hover:scale-[1.03] hover:shadow-sm group">
                                    <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                        <i className="fa-brands fa-tiktok text-teal-400 text-[15px]"></i>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] text-on-surface-variant/80 uppercase tracking-widest font-bold font-mono">TikTok</p>
                                        <p className="text-body-sm font-bold text-on-surface mt-1 font-tabular">{formatNumber(platformStats.TikTok.views)}</p>
                                    </div>
                                </div>

                                {/* YouTube Box */}
                                <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:bg-surface-container hover:border-primary/20 hover:scale-[1.03] hover:shadow-sm group">
                                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                        <i className="fa-brands fa-youtube text-red-500 text-[15px]"></i>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] text-on-surface-variant/80 uppercase tracking-widest font-bold font-mono">YouTube</p>
                                        <p className="text-body-sm font-bold text-on-surface mt-1 font-tabular">{formatNumber(platformStats.YouTube.views)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Table section */}
                    <div className="glass-panel rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm">
                        <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low">
                            <h5 className="font-headline-md text-body-sm font-bold text-on-surface uppercase tracking-wider relative pl-3 before:absolute before:left-0 before:top-0.5 before:w-1 before:h-[90%] before:bg-primary before:rounded-full">Content Table</h5>
                            <div className="flex items-center gap-3">
                                {isUnlocked && userRole === 'Admin' && selectedRows.length > 0 && (
                                    <div className="flex items-center gap-1.5 animate-fade-up">
                                        {isDeleteConfirming ? (
                                            <>
                                                <span className="text-[10px] text-error font-semibold uppercase tracking-wider">Delete {selectedRows.length} items?</span>
                                                <button
                                                    className="bg-error text-on-error hover:opacity-90 px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer"
                                                    onClick={handleDeleteSelected}
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    className="bg-surface-container border border-outline-variant/30 text-on-surface hover:bg-surface-container-high px-2 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer"
                                                    onClick={() => setIsDeleteConfirming(false)}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="bg-error-container/20 text-error border border-error/25 hover:bg-error-container/30 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all micro-interaction cursor-pointer flex items-center gap-1.5"
                                                onClick={() => setIsDeleteConfirming(true)}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span> Delete ({selectedRows.length})
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        className={`bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 micro-interaction cursor-pointer ${tableFilterDate ? 'border-primary text-primary' : ''}`}
                                        onClick={handleTableDatePickerClick}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                                        {tableFilterDate ? formatDisplayDate(tableFilterDate) : 'Choose Date'}
                                    </button>
                                    {tableFilterDate && (
                                        <button
                                            className="bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest px-2 py-1.5 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer"
                                            onClick={() => setTableFilterDate('')}
                                            title="Clear date filter"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">clear</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            {processedData.length === 0 ? (
                                <div className="p-12 text-center space-y-3">
                                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">inbox</span>
                                    <h3 className="font-bold text-body-sm text-on-surface">No data available</h3>
                                    <p className="text-[12px] text-on-surface-variant/70">Create new posts or adjust filters to populate table records.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse text-body-sm">
                                    <caption className="sr-only">Content performance records. Activate a sortable column heading to change the sort order.</caption>
                                    <thead className="bg-surface-container-lowest text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant/20">
                                        <tr>
                                            {isUnlocked && userRole === 'Admin' && (
                                                <th className="px-4 py-3.5 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Select all visible content records"
                                                        className="rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                                        checked={selectedRows.length > 0 && selectedRows.length === processedData.length}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                            )}
                                            <th className="px-3 py-3.5 w-12 text-center">No</th>
                                            <SortableTableHeader column="Date" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5">Date</SortableTableHeader>
                                            <SortableTableHeader column="Content Title" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5">Content title</SortableTableHeader>
                                            <th className="px-4 py-3.5">Platform</th>
                                            <SortableTableHeader column="Views" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5 text-right" align="right">Views</SortableTableHeader>
                                            <SortableTableHeader column="Total Engagement" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5 text-right" align="right">Engagement</SortableTableHeader>
                                            <SortableTableHeader column="KPI Summary" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5 text-center" align="center">Summary</SortableTableHeader>
                                            <th className="px-4 py-3.5 text-center">Link</th>
                                            {isUnlocked && userRole === 'Admin' && <th className="px-4 py-3.5 text-center">Edit</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="">
                                        {processedData.map((row, idx) => {
                                            const isRowSelected = selectedRows.includes(row.ID);
                                            const rowSpan = rowspans[idx] || { Date: 1, ID: 1, ContentTitle: 1, PIC: 1, Category: 1, KPISummary: 1 };
                                            const isNewGroup = rowSpan.ContentTitle > 0;
                                            const rowBorderClass = (idx === 0)
                                                ? ''
                                                : isNewGroup
                                                    ? 'border-t-[2.5px] border-outline-variant/75'
                                                    : 'border-t border-outline-variant/15';

                                            return (
                                                <tr key={`${row.ID}-${idx}`} className={`hover:bg-surface-container/20 transition-colors ${isRowSelected ? 'bg-primary-container/5' : ''} ${rowBorderClass}`}>
                                                    {isUnlocked && userRole === 'Admin' && (
                                                        <td className="px-4 py-3 w-10 text-center">
                                                            <input
                                                                type="checkbox"
                                                                aria-label={`Select ${row['Content Title'] || `content record ${idx + 1}`}`}
                                                                className="rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                                                checked={isRowSelected}
                                                                onChange={() => toggleSelectRow(row.ID)}
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-3 w-12 text-center text-on-surface-variant/70 text-[12px]">{idx + 1}</td>
                                                    {rowSpan.Date > 0 && (
                                                        <td rowSpan={rowSpan.Date} className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant">
                                                            {formatDisplayDate(row.Date)}
                                                        </td>
                                                    )}
                                                    {rowSpan.ContentTitle > 0 && (
                                                        <td rowSpan={rowSpan.ContentTitle} className="px-4 py-3">
                                                            <div className="space-y-0.5 max-w-[220px]">
                                                                <p className="font-semibold text-on-surface leading-snug line-clamp-2" title={row['Content Title']}>
                                                                    {row['Content Title'] || 'Untitled'}
                                                                </p>
                                                                <p className="text-[11px] text-on-surface-variant/80">
                                                                    {row.Category} · PIC: <span className="font-bold text-primary">{normalizePicName(row.PIC)}</span>
                                                                </p>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3">
                                                        <PlatformBadge platform={row.Platform} />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-on-surface font-tabular">
                                                        {formatNumber(row.Views)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-on-surface-variant font-tabular">
                                                        {formatNumber(row['Total Engagement'])}
                                                    </td>
                                                    {rowSpan.KPISummary > 0 && (
                                                        <td rowSpan={rowSpan.KPISummary} className="px-4 py-3 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getKpiBadgeClass(row['KPI Summary'])}`}>
                                                                KPI: {row['KPI Summary'] || '3'}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 text-center">
                                                        {row.URL ? (
                                                            <a href={row.URL} target="_blank" rel="noopener noreferrer" className="inline-flex p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer" title="Open post URL">
                                                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                            </a>
                                                        ) : (
                                                            <span className="text-on-surface-variant/40">—</span>
                                                        )}
                                                    </td>
                                                    {isUnlocked && userRole === 'Admin' && (
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                type="button"
                                                                className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer micro-interaction"
                                                                onClick={() => loadRowForEdit(row, idx)}
                                                                title="Edit metrics"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right 1 Column Sidebar */}
                <div className="space-y-6">
                    {/* Monthly Calendar Widget */}
                    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 shadow-xl">
                        <div className="flex justify-between items-center pb-2 mb-3 border-b border-outline-variant/20">
                            <button className="text-on-surface hover:text-primary cursor-pointer p-1" onClick={handlePrevMonth}>
                                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            </button>
                            <span className="font-semibold text-body-sm text-on-surface">{monthNames[currentMonth]} {currentYear}</span>
                            <button className="text-on-surface hover:text-primary cursor-pointer p-1" onClick={handleNextMonth}>
                                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 py-1">
                            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, idx) => {
                                const isSelected = day.dateStr && selectedDate === day.dateStr;

                                let hasTask = false;
                                let uploadedClass = '';
                                let statusColor = 'text-on-surface hover:bg-surface-container-high';

                                if (day.dateStr && !day.isDummy) {
                                    const dayTasks = combinedTasks.filter(t => t.date === day.dateStr);
                                    hasTask = dayTasks.length > 0;
                                    if (hasTask) {
                                        const hasOverdue = dayTasks.some(t => t.calculatedStatus === 'Overdue');
                                        const hasToday = dayTasks.some(t => t.calculatedStatus === 'Due Today');
                                        const allDone = dayTasks.every(t => t.calculatedStatus === 'Done');

                                        if (allDone) {
                                            statusColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                                        } else if (hasOverdue) {
                                            statusColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                                        } else if (hasToday) {
                                            statusColor = 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
                                        } else {
                                            statusColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                                        }

                                        const isFullyUploaded = dayTasks.every(task => !task.isFromDashboard || task.status);
                                        if (isFullyUploaded) {
                                            uploadedClass = 'font-bold underline decoration-primary decoration-2 underline-offset-2';
                                        }
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        aria-hidden={day.isDummy ? 'true' : undefined}
                                        aria-label={day.isDummy ? undefined : `Show schedule for ${formatDisplayDate(day.dateStr)}`}
                                        tabIndex={day.isDummy ? -1 : undefined}
                                        className={`h-8 w-full border-none rounded text-body-sm cursor-pointer flex items-center justify-center transition-all micro-interaction ${day.isDummy
                                                ? 'bg-transparent text-transparent pointer-events-none'
                                                : isSelected
                                                    ? 'bg-primary text-on-primary font-bold shadow'
                                                    : statusColor
                                            } ${uploadedClass}`}
                                        onClick={() => !day.isDummy && setSelectedDate(day.dateStr)}
                                        disabled={day.isDummy}
                                    >
                                        {day.dayNum}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scheduled timeline card */}
                    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 shadow-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                            <h3 className="text-[11px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Scheduled for this day</h3>
                            {userRole === 'Admin' && (
                                <button
                                    className="w-7 h-7 flex items-center justify-center bg-primary-container text-on-primary-container rounded-lg hover:opacity-90 cursor-pointer transition-opacity"
                                    onClick={() => setIsNewPostDrawerOpen(true)}
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                            )}
                        </div>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1" tabIndex={0} aria-label="Scheduled uploads for the selected date">
                            {scheduledTimeline.length === 0 ? (
                                <div className="py-8 text-center text-on-surface-variant/60 text-body-sm space-y-2">
                                    <span className="material-symbols-outlined text-[36px]">check_circle</span>
                                    <p>No uploads scheduled for this date.</p>
                                </div>
                            ) : (
                                scheduledTimeline.map((task) => (
                                    <div key={task.ID} className="flex gap-3 items-start relative group">
                                        <div className="flex flex-col items-center pt-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                                            <span className="w-[1.5px] bg-outline-variant/30 flex-1 my-1 min-h-[40px]"></span>
                                        </div>
                                        <div className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-lg p-2.5 space-y-1">
                                            <p className="text-[9.5px] text-primary uppercase font-bold tracking-wider">Upload: {task.Category}</p>
                                            <p className="text-xs font-semibold text-on-surface leading-snug line-clamp-2">{task['Content Title']}</p>
                                            <p className="text-[10px] text-on-surface-variant/80">
                                                PIC: <span className="font-semibold">{normalizePicName(task.PIC)}</span> | {task.Status ? 'Published' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chart Container Card */}
                    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 shadow-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                            <h3 className="text-[11px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Growth Performance</h3>
                            <div className="flex bg-surface-container-low border border-outline-variant/20 rounded p-0.5 text-[9px] font-bold uppercase tracking-wider">
                                {['Followers', 'Engagement', 'Reach'].map(tab => (
                                    <button
                                        key={tab}
                                        className={`px-2.5 py-1 rounded cursor-pointer transition-all ${activeChartTab === tab ? 'bg-surface text-primary shadow' : 'text-on-surface-variant hover:text-on-surface'
                                            }`}
                                        onClick={() => setActiveChartTab(tab)}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-52 w-full relative">
                            <canvas ref={activityCanvasRef}></canvas>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 text-[11px] text-on-surface-variant/80 font-semibold">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#E1306C' }}></span> Instagram</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#00F2FE' }}></span> TikTok</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF0000' }}></span> YouTube</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================
               2. MOBILE VIEW LAYOUT (hidden on screens > 1024px)
               ======================================================== */}
            <div className="lg:hidden space-y-6 max-w-md mx-auto pb-20">
                {/* Metrics Stack */}
                <section className="space-y-3">
                    <h2 className="text-label-md text-on-surface-variant uppercase tracking-widest px-1 font-bold">Performance Snapshot</h2>
                    {/* Metric Card 1: Views */}
                    <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between micro-interaction cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center text-primary border border-outline-variant/20">
                                <span className="material-symbols-outlined">visibility</span>
                            </div>
                            <div>
                                <p className="text-body-sm text-on-surface-variant font-semibold">Total Views</p>
                                <p className="text-headline-md font-bold text-on-surface leading-tight">{formatNumber(stats.totalViews)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-primary font-bold text-body-sm">+12.4%</span>
                        </div>
                    </div>
                    {/* Metric Card 2: Reach */}
                    <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between micro-interaction cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary border border-outline-variant/20">
                                <span className="material-symbols-outlined">public</span>
                            </div>
                            <div>
                                <p className="text-body-sm text-on-surface-variant font-semibold">Total Reach</p>
                                <p className="text-headline-md font-bold text-on-surface leading-tight">{formatNumber(stats.totalReach)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-secondary font-bold text-body-sm">+8.1%</span>
                        </div>
                    </div>
                    {/* Metric Card 3: Engagement */}
                    <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between micro-interaction cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary border border-outline-variant/20">
                                <span className="material-symbols-outlined">favorite</span>
                            </div>
                            <div>
                                <p className="text-body-sm text-on-surface-variant font-semibold">Engagements</p>
                                <p className="text-headline-md font-bold text-on-surface leading-tight">{formatNumber(stats.totalEngagement)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-tertiary font-bold text-body-sm">{stats.avgEngagementRate}</span>
                        </div>
                    </div>
                </section>

                {/* Upcoming Posts Scroll */}
                <section className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-label-md text-on-surface-variant uppercase tracking-widest font-bold">Upcoming Pipeline</h2>
                    </div>
                    <div className="flex overflow-x-auto gap-3 hide-scrollbar pb-1">
                        {(() => {
                            const todayStr = getLocalDateInputValue();
                            const upcomingTasks = (scheduleData || [])
                                .filter(task => {
                                    const parsedDateStr = parseDate(task.Date);
                                    return parsedDateStr && parsedDateStr >= todayStr;
                                })
                                .sort((a, b) => {
                                    const dateA = parseDate(a.Date) || '';
                                    const dateB = parseDate(b.Date) || '';
                                    return dateA.localeCompare(dateB);
                                })
                                .slice(0, 5);

                            if (upcomingTasks.length === 0) {
                                return (
                                    <div className="w-full py-6 text-center text-on-surface-variant/60 text-body-sm">
                                        No upcoming posts in pipeline.
                                    </div>
                                );
                            }

                            return upcomingTasks.map((task, idx) => (
                                <div key={task.ID || idx} className="min-w-[260px] bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 flex gap-3 items-center">
                                    <div className="w-12 h-12 rounded bg-surface-container-high flex items-center justify-center text-primary border border-outline-variant/25">
                                        <span className="material-symbols-outlined">calendar_month</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-primary uppercase">{formatDisplayDate(task.Date)}</p>
                                        <p className="text-body-sm font-semibold truncate text-on-surface">{task['Content Title'] || 'Untitled'}</p>
                                        <p className="text-[10px] text-on-surface-variant/80">{task.Category} · {normalizePicName(task.PIC)}</p>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </section>

                {/* Contextual FAB to trigger new post popup */}
                {userRole === 'Admin' && (
                    <button
                        className="fixed right-6 bottom-24 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-transform duration-150 active:scale-95 z-40"
                        onClick={() => setIsNewPostDrawerOpen(true)}
                    >
                        <span className="material-symbols-outlined text-[28px]">add</span>
                    </button>
                )}
            </div>

            {/* ========================================================
               3. SLIDE-OVER FORM DRAWER (shared by desktop and mobile)
               ======================================================== */}
            <div className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[450px] bg-surface-container border-l border-outline-variant/30 flex flex-col justify-between shadow-2xl transition-transform duration-300 ${isNewPostDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                {isNewPostDrawerOpen && (
                    <div className="fixed inset-0 bg-background/50 z-[-1]" onClick={resetForm}></div>
                )}

                {/* Header */}
                <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
                    <h2 className="text-body-lg font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">add_box</span>
                        {editIndex !== null ? 'Edit Post Metrics' : 'Add New Post'}
                    </h2>
                    <button className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer" onClick={resetForm}>
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Tabs switcher */}
                    <div className="flex border-b border-outline-variant/25 pb-0.5">
                        <button
                            type="button"
                            className={`flex-1 pb-2 text-center text-body-sm font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-all ${formTab === 'basic' ? 'border-primary text-on-surface' : 'border-transparent text-on-surface-variant'
                                }`}
                            onClick={() => setFormTab('basic')}
                        >
                            Basic Metrics
                        </button>
                        <button
                            type="button"
                            className={`flex-1 pb-2 text-center text-body-sm font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-all ${formTab === 'additional' ? 'border-transparent border-b-2 border-transparent text-on-surface-variant' : ''
                                } ${formTab === 'additional' ? 'border-primary text-on-surface' : ''
                                }`}
                            onClick={() => setFormTab('additional')}
                        >
                            Additional Info
                        </button>
                    </div>

                    <form onSubmit={handleFormSubmit} id="drawerForm" className="space-y-4 pt-2">
                        {formTab === 'basic' && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant flex items-center gap-1">
                                        Date <span className="text-error">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                                        placeholder="YYYY-MM-DD"
                                        value={formDate}
                                        onClick={handleDatePickerClick}
                                        readOnly
                                        disabled={editIndex !== null}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">
                                        Content Title
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                        placeholder="Enter title (optional)"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        disabled={editIndex !== null}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label htmlFor="dashboard-pic" className="text-body-sm font-semibold text-on-surface-variant">
                                            PIC <span className="text-error">*</span>
                                        </label>
                                        <select
                                            id="dashboard-pic"
                                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                            value={formPic}
                                            onChange={(e) => setFormPic(e.target.value)}
                                            disabled={editIndex !== null}
                                            required
                                        >
                                            <option value="" disabled hidden>Select PIC</option>
                                            {memberListData.map(m => (
                                                <option key={m.NAMA} value={m.NAMA}>{m.NAMA}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="dashboard-category" className="text-body-sm font-semibold text-on-surface-variant">
                                            Category <span className="text-error">*</span>
                                        </label>
                                        <select
                                            id="dashboard-category"
                                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            disabled={editIndex !== null}
                                            required
                                        >
                                            <option value="" disabled hidden>Select Category</option>
                                            {categoriesData.map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {editIndex !== null && (
                                    <div className="space-y-4 pt-2 border-t border-outline-variant/15">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label htmlFor="dashboard-platform" className="text-body-sm font-semibold text-on-surface-variant">Platform</label>
                                                <select
                                                    id="dashboard-platform"
                                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                    value={formPlatform}
                                                    onChange={(e) => setFormPlatform(e.target.value)}
                                                    disabled={true}
                                                >
                                                    {platformsData.map(p => (
                                                        <option key={p.name} value={p.name}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-body-sm font-semibold text-on-surface-variant">Views</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                    placeholder="0"
                                                    value={formViews}
                                                    onChange={(e) => setFormViews(e.target.value)}
                                                    ref={viewsInputRef}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">Account Reach</label>
                                            <input
                                                type="number"
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                placeholder="0"
                                                value={formReach}
                                                onChange={(e) => setFormReach(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-body-sm font-semibold text-on-surface-variant">Likes</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                    placeholder="0"
                                                    value={formLikes}
                                                    onChange={(e) => setFormLikes(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-body-sm font-semibold text-on-surface-variant">Comments</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                    placeholder="0"
                                                    value={formComments}
                                                    onChange={(e) => setFormComments(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-body-sm font-semibold text-on-surface-variant">Followers Gained</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                    placeholder="0"
                                                    value={formFollows}
                                                    onChange={(e) => setFormFollows(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-body-sm font-semibold text-on-surface-variant">Reposts</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                    placeholder="0"
                                                    value={formRepost}
                                                    onChange={(e) => setFormRepost(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">Shares</label>
                                            <input
                                                type="number"
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                placeholder="0"
                                                value={formShares}
                                                onChange={(e) => setFormShares(e.target.value)}
                                            />
                                        </div>

                                        <div className="bg-surface-container-low border border-outline-variant/30 rounded p-3 text-body-sm space-y-2">
                                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px]">monitoring</span> Live Calculation
                                            </span>
                                            <div className="grid grid-cols-2 gap-2 text-[12px] text-on-surface-variant leading-relaxed">
                                                <div>Engagement: <span className="font-bold text-on-surface">{formCalculated.totalEngagement}</span></div>
                                                <div>Eng. Rate: <span className="font-bold text-on-surface">{formCalculated.engagementRate}%</span></div>
                                                <div>KPI Score: <span className="font-bold text-on-surface">{formCalculated.kpiScore}</span></div>
                                                <div>KPI Summary: <span className="font-bold text-on-surface">{formCalculated.kpiSummary}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {formTab === 'additional' && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Post URL</label>
                                    <input
                                        type="url"
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                        placeholder="https://published-link.com/post/123"
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Comment Notes</label>
                                    <textarea
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                        rows="5"
                                        placeholder="Enter any comments or post details"
                                        value={formCommentText}
                                        onChange={(e) => setFormCommentText(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-outline-variant/20 flex gap-3 justify-end bg-surface-container-lowest">
                    <button type="button" className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction cursor-pointer" onClick={resetForm}>
                        Cancel
                    </button>
                    <button type="submit" form="drawerForm" disabled={isMutating} aria-busy={isMutating ? 'true' : 'false'} className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction cursor-pointer flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-70">
                        <span className={`material-symbols-outlined text-[18px] ${isMutating ? 'animate-spin' : ''}`}>{isMutating ? 'progress_activity' : 'save'}</span> {isMutating ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>

        </div>
    );
}
