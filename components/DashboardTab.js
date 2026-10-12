'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import {
    normalizePicName,
    getPicDisplayName,
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
import Icon from './Icon';

const parseCleanInt = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[\.\,]/g, '');
    return parseInt(cleaned, 10) || 0;
};

const TABLE_PAGE_SIZE = 100;

export default function DashboardTab({ onOpenDatePicker, chartReady = false, onChartNeeded }) {
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
        selectedPostId,
        setSelectedPostId,
        platformsData,
        showAlert,
        searchQuery,
        setSearchQuery,
        dateRange,
        isNewPostDrawerOpen,
        setIsNewPostDrawerOpen,
        meetingsData,
        setCurrentView,
        setSelectedTaskId
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
    const [tablePage, setTablePage] = useState(1);

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

    useEffect(() => {
        onChartNeeded?.();
    }, [onChartNeeded]);

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
    const handledPostIdRef = useRef(null);

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
        setSelectedPostId(null);
        handledPostIdRef.current = null;
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

    // Process and sort the complete content table only when its inputs change.
    const processedData = React.useMemo(() => {
        let list = [...currentData];
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(row =>
                String(row['Content Title'] || '').toLowerCase().includes(q) ||
                String(row.ID || '').toLowerCase().includes(q) ||
                String(row.PIC || '').toLowerCase().includes(q) ||
                String(row.Platform || '').toLowerCase().includes(q)
            );
        }
        if (dateRange.start) list = list.filter(row => parseDate(row.Date) >= dateRange.start);
        if (dateRange.end) list = list.filter(row => parseDate(row.Date) <= dateRange.end);
        if (tableFilterDate) list = list.filter(row => parseDate(row.Date) === tableFilterDate);
        if (sortColumn !== 'none') {
            list.sort((a, b) => {
                const valA = a[sortColumn];
                const valB = b[sortColumn];
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
                return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            });
        }
        return list;
    }, [currentData, searchQuery, dateRange.start, dateRange.end, tableFilterDate, sortColumn, sortDirection]);

    // Keep content groups together so rowspans never cross a page boundary.
    const tablePages = React.useMemo(() => {
        if (processedData.length === 0) return [];
        const pages = [];
        let start = 0;
        while (start < processedData.length) {
            let end = Math.min(start + TABLE_PAGE_SIZE, processedData.length);
            if (end < processedData.length) {
                const boundaryGroup = getContentGroupKey(processedData[end - 1]);
                while (end < processedData.length && boundaryGroup && getContentGroupKey(processedData[end]) === boundaryGroup) {
                    end++;
                }
            }
            pages.push({ start, rows: processedData.slice(start, end) });
            start = end;
        }
        return pages;
    }, [processedData]);

    useEffect(() => {
        setTablePage(1);
    }, [searchQuery, dateRange.start, dateRange.end, tableFilterDate, sortColumn, sortDirection]);

    useEffect(() => {
        setTablePage((page) => Math.min(page, Math.max(tablePages.length, 1)));
    }, [tablePages.length]);

    const activeTablePage = tablePages[tablePage - 1] || { start: 0, rows: [] };
    const visibleTableData = activeTablePage.rows;

    const rowspans = React.useMemo(() => {
        if (visibleTableData.length === 0) return [];

        const preprocessed = visibleTableData.map(item => ({
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
    }, [visibleTableData]);

    const contentGroupNumbers = React.useMemo(() => {
        let groupNumber = 0;
        for (let index = 0; index < activeTablePage.start; index++) {
            if (index === 0 || getContentGroupKey(processedData[index]) !== getContentGroupKey(processedData[index - 1])) {
                groupNumber++;
            }
        }
        return rowspans.map((span) => span.ContentTitle > 0 ? ++groupNumber : groupNumber);
    }, [rowspans, activeTablePage.start, processedData]);

    // Stats calculations
    const stats = React.useMemo(() => {
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

            const normalizedTitle = String(row['Content Title'] || '').trim().toLowerCase();
            if (normalizedTitle && normalizedTitle !== 'null' && normalizedTitle !== 'untitled') {
                contentTitles.add(normalizedTitle);
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
    }, [currentData]);

    // Channels aggregation
    const platformStats = React.useMemo(() => {
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
    }, [currentData]);

    const platformDistribution = React.useMemo(() => {
        const total = (platformStats.Instagram.views + platformStats.TikTok.views + platformStats.YouTube.views) || 0;
        if (total === 0) {
            return { total: 0, igPct: 33, ttPct: 33, ytPct: 34 };
        }
        const igPct = Math.round((platformStats.Instagram.views / total) * 100);
        const ttPct = Math.round((platformStats.TikTok.views / total) * 100);
        const ytPct = Math.max(0, 100 - igPct - ttPct);
        return { total, igPct, ttPct, ytPct };
    }, [platformStats]);

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
        setFormDate(parseDate(row.Date) || getLocalDateInputValue());
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
        setSelectedPostId(row.ID || null);
        handledPostIdRef.current = row.ID || null;
        setIsNewPostDrawerOpen(true);
    };

    useEffect(() => {
        if (!selectedPostId || handledPostIdRef.current === selectedPostId || currentData.length === 0) return;
        const index = currentData.findIndex((row) => String(row.ID) === String(selectedPostId));
        if (index >= 0) {
            handledPostIdRef.current = selectedPostId;
            loadRowForEdit(currentData[index], index);
            return;
        }
        showAlert(`Post ${selectedPostId} is unavailable. It may have been removed.`, 'warning');
        setSelectedPostId(null);
    }, [selectedPostId, currentData]);

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
                ((row.ID && rowId && String(row.ID) === String(rowId)) ||
                 String(row['Content Title']).trim().toLowerCase() === formTitle.trim().toLowerCase())) {
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
        const visibleIds = visibleTableData.map(row => row.ID);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedRows.includes(id));
        if (allVisibleSelected) {
            setSelectedRows(selectedRows.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedRows(Array.from(new Set([...selectedRows, ...visibleIds])));
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
    }, [currentData, activeChartTab, chartReady]);

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
                    assignedUserId: task.AssignedUserId || '',
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

    const taskOverview = React.useMemo(() => {
        const todayValue = getLocalDateInputValue();
        const activeTasks = combinedTasks
            .filter(task => task.isFromDashboard && task.calculatedStatus !== 'Done')
            .sort((a, b) => a.date.localeCompare(b.date));
        return {
            overdue: activeTasks.filter(task => task.calculatedStatus === 'Overdue'),
            dueToday: activeTasks.filter(task => task.date === todayValue),
            upcoming: activeTasks.filter(task => task.date > todayValue).slice(0, 5)
        };
    }, [combinedTasks]);

    const openTask = (taskId) => {
        setSelectedTaskId(taskId);
        setCurrentView('tasklist');
    };

    const openTaskDirectory = () => setCurrentView('tasklist');
    const openPlanner = () => setCurrentView('calendar');
    const openAnalytics = () => setCurrentView('analytics');

    if (!isUnlocked) {
        return <LockScreen sectionName="Dashboard" />;
    }

    return (
        <div className="space-y-6">

            {/* ========================================================
               1. DESKTOP VIEW LAYOUT (hidden on screens <= 1024px)
               ======================================================== */}
            <div className="hidden lg:grid grid-cols-4 gap-6 items-start">
                {/* Left/Center 3 Columns */}
                <div className="col-span-3 space-y-6">
                    {/* Card-less KPI Band */}
                    <div className="border border-border bg-surface rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border grid grid-cols-2 lg:grid-cols-5">
                        {/* Stat 1 - Lead: Total Views */}
                        <div className="col-span-2 sm:col-span-1 lg:col-span-1 p-4 lg:p-5 flex flex-col justify-between bg-orange-500/[0.03]">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Views</span>
                                <Icon name="trending_up" size={16} className="text-primary" />
                            </div>
                            <div className="mt-3">
                                <h4 className="text-2xl lg:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                                    {formatNumber(stats.totalViews)}
                                </h4>
                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Across all platforms</p>
                            </div>
                        </div>

                        {/* Stat 2 - Active Titles */}
                        <div className="p-4 lg:p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Titles</span>
                                <Icon name="tag" size={16} className="text-zinc-400" />
                            </div>
                            <div className="mt-3">
                                <h4 className="text-xl lg:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                                    {stats.contentTitlesSize}
                                </h4>
                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Active campaigns</p>
                            </div>
                        </div>

                        {/* Stat 3 - Total Reach */}
                        <div className="p-4 lg:p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Reach</span>
                                <Icon name="public" size={16} className="text-zinc-400" />
                            </div>
                            <div className="mt-3">
                                <h4 className="text-xl lg:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                                    {formatNumber(stats.totalReach)}
                                </h4>
                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Unique accounts</p>
                            </div>
                        </div>

                        {/* Stat 4 - Total Engagement */}
                        <div className="p-4 lg:p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Engagement</span>
                                <Icon name="favorite" size={16} className="text-zinc-400" />
                            </div>
                            <div className="mt-3">
                                <h4 className="text-xl lg:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                                    {formatNumber(stats.totalEngagement)}
                                </h4>
                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Likes, comments, shares</p>
                            </div>
                        </div>

                        {/* Stat 5 - Engagement Rate */}
                        <div className="p-4 lg:p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Engagement Rate</span>
                                <Icon name="percent" size={16} className="text-zinc-400" />
                            </div>
                            <div className="mt-3">
                                <h4 className="text-xl lg:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                                    {stats.avgEngagementRate}
                                </h4>
                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Avg. engagement ratio</p>
                            </div>
                        </div>
                    </div>

                    {/* Platform Performance & Growth Performance Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                        {/* Platform Distribution Card */}
                        <div className="xl:col-span-5 border border-border bg-surface rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-border">
                                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Platform Performance</span>
                                <span className="text-[10px] text-primary font-semibold uppercase tracking-wider font-mono">Views</span>
                            </div>

                            {/* Proportional Segmented Bar */}
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                    <div
                                        style={{ width: `${platformDistribution.igPct}%` }}
                                        className="bg-[#E1306C] h-full transition-all duration-300"
                                        title={`Instagram: ${platformDistribution.igPct}%`}
                                    />
                                    <div
                                        style={{ width: `${platformDistribution.ttPct}%` }}
                                        className="bg-[#00F2FE] h-full transition-all duration-300"
                                        title={`TikTok: ${platformDistribution.ttPct}%`}
                                    />
                                    <div
                                        style={{ width: `${platformDistribution.ytPct}%` }}
                                        className="bg-[#FF0000] h-full transition-all duration-300"
                                        title={`YouTube: ${platformDistribution.ytPct}%`}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                                    <span>Instagram {platformDistribution.igPct}%</span>
                                    <span>TikTok {platformDistribution.ttPct}%</span>
                                    <span>YouTube {platformDistribution.ytPct}%</span>
                                </div>
                            </div>

                            {/* Platform Cards */}
                            <div className="grid grid-cols-3 gap-2.5">
                                {/* Instagram */}
                                <div className="border border-border/70 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <Image src="/img/icons/instagram-logo.png" width={18} height={18} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">IG</span>
                                    <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">{formatNumber(platformStats.Instagram.views)}</span>
                                </div>

                                {/* TikTok */}
                                <div className="border border-border/70 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <Image src="/img/icons/tiktok-logo.png" width={17} height={17} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">TT</span>
                                    <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">{formatNumber(platformStats.TikTok.views)}</span>
                                </div>

                                {/* YouTube */}
                                <div className="border border-border/70 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <Image src="/img/icons/youtube-logo.webp" width={18} height={18} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">YT</span>
                                    <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">{formatNumber(platformStats.YouTube.views)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Growth Performance Chart */}
                        <div className="xl:col-span-7 border border-border bg-surface rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-border">
                                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Growth Performance</h3>
                                <div className="flex border border-border rounded-lg p-0.5 text-[10px] font-medium font-mono">
                                    {['Followers', 'Engagement', 'Reach'].map(tab => (
                                        <button
                                            key={tab}
                                            className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                                                activeChartTab === tab
                                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                                                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                                            }`}
                                            onClick={() => setActiveChartTab(tab)}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-44 w-full relative">
                                <canvas ref={activityCanvasRef} role="img" aria-label={`${activeChartTab} performance by platform`} aria-describedby="dashboard-chart-summary" />
                                <p id="dashboard-chart-summary" className="sr-only">Platform views: Instagram {formatNumber(platformStats.Instagram.views)}; TikTok {formatNumber(platformStats.TikTok.views)}; YouTube {formatNumber(platformStats.YouTube.views)}.</p>
                            </div>

                            <div className="flex justify-center gap-4 text-[11px] text-zinc-500 font-mono">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E1306C' }} /> Instagram</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00F2FE' }} /> TikTok</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF0000' }} /> YouTube</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Table section */}
                    <div className="border border-border bg-surface rounded-xl overflow-hidden shadow-xs">
                        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                            <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Content Table</h5>
                            <div className="flex items-center gap-3">
                                {isUnlocked && userRole === 'Admin' && selectedRows.length > 0 && (
                                    <div className="flex items-center gap-1.5 animate-fade-up">
                                        {isDeleteConfirming ? (
                                            <>
                                                <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wider">Delete {selectedRows.length} items?</span>
                                                <button
                                                    className="bg-red-600 text-white hover:opacity-90 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer"
                                                    onClick={handleDeleteSelected}
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    className="border border-border text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer"
                                                    onClick={() => setIsDeleteConfirming(false)}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                                                onClick={() => setIsDeleteConfirming(true)}
                                            >
                                                <Icon name="delete" size={13} /> Delete ({selectedRows.length})
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        className={`border border-border bg-surface text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${tableFilterDate ? 'border-primary text-primary' : ''}`}
                                        onClick={handleTableDatePickerClick}
                                    >
                                        <Icon name="calendar_month" size={13} />
                                        {tableFilterDate ? formatDisplayDate(tableFilterDate) : 'Choose Date'}
                                    </button>
                                    {tableFilterDate && (
                                        <button
                                            className="border border-border bg-surface text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 rounded-md text-xs transition-colors cursor-pointer"
                                            onClick={() => setTableFilterDate('')}
                                            title="Clear date filter"
                                        >
                                            <Icon name="clear" size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            {processedData.length === 0 ? (
                                <div className="p-12 text-center space-y-3">
                                    <Icon name="inbox" size={36} className="text-zinc-400 mx-auto" />
                                    <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">No data available</h3>
                                    <p className="text-xs text-zinc-500">Create new posts or adjust filters to populate table records.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse text-xs">
                                    <caption className="sr-only">Content performance records. Activate a sortable column heading to change the sort order.</caption>
                                    <thead className="bg-zinc-50/70 dark:bg-zinc-900/70 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-border sticky top-0 z-10">
                                        <tr>
                                            {isUnlocked && userRole === 'Admin' && (
                                                <th className="px-4 py-3 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Select all visible content records"
                                                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                                        checked={visibleTableData.length > 0 && visibleTableData.every(row => selectedRows.includes(row.ID))}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                            )}
                                            <th className="px-3 py-3 w-12 text-center font-mono">No</th>
                                            <SortableTableHeader column="Date" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5">Date</SortableTableHeader>
                                            <SortableTableHeader column="Content Title" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5">Content title</SortableTableHeader>
                                            <th className="px-4 py-3">Platform</th>
                                            <SortableTableHeader column="Views" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5 text-right font-mono" align="right">Views</SortableTableHeader>
                                            <SortableTableHeader column="Total Engagement" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5 text-right font-mono" align="right">Engagement</SortableTableHeader>
                                            <SortableTableHeader column="KPI Summary" activeColumn={sortColumn} direction={sortDirection} onSort={handleHeaderSort} className="px-4 py-1.5 text-center font-mono" align="center">Summary</SortableTableHeader>
                                            <th className="px-4 py-3 text-center">Link</th>
                                            {isUnlocked && userRole === 'Admin' && <th className="px-4 py-3 text-center">Edit</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {visibleTableData.map((row, idx) => {
                                            const isRowSelected = selectedRows.includes(row.ID);
                                            const rowSpan = rowspans[idx] || { Date: 1, ID: 1, ContentTitle: 1, PIC: 1, Category: 1, KPISummary: 1 };

                                            return (
                                                <tr key={`${row.ID}-${idx}`} className={`hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-colors ${isRowSelected ? 'bg-orange-500/5' : ''}`}>
                                                    {isUnlocked && userRole === 'Admin' && (
                                                        <td className="px-4 py-2.5 w-10 text-center">
                                                            <input
                                                                type="checkbox"
                                                                aria-label={`Select ${row['Content Title'] || `content record ${idx + 1}`}`}
                                                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                                                checked={isRowSelected}
                                                                onChange={() => toggleSelectRow(row.ID)}
                                                            />
                                                        </td>
                                                    )}
                                                    {rowSpan.ContentTitle > 0 && (
                                                        <td rowSpan={rowSpan.ContentTitle} className="px-3 py-2.5 w-12 text-center text-zinc-400 text-xs font-mono">
                                                            {contentGroupNumbers[idx]}
                                                        </td>
                                                    )}
                                                    {rowSpan.Date > 0 && (
                                                        <td rowSpan={rowSpan.Date} className="px-4 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 font-mono">
                                                            {formatDisplayDate(row.Date)}
                                                        </td>
                                                    )}
                                                    {rowSpan.ContentTitle > 0 && (
                                                        <td rowSpan={rowSpan.ContentTitle} className="px-4 py-2.5">
                                                            <div className="space-y-0.5 max-w-[240px]">
                                                                <p className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2" title={row['Content Title']}>
                                                                    {row['Content Title'] || 'Untitled'}
                                                                </p>
                                                                <p className="text-[11px] text-zinc-500">
                                                                    {row.Category} &middot; PIC: <span className="font-semibold text-primary">{getPicDisplayName(row.PIC)}</span>
                                                                </p>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-2.5">
                                                        <PlatformBadge platform={row.Platform} />
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                                        {formatNumber(row.Views)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-zinc-600 dark:text-zinc-400 font-mono">
                                                        {formatNumber(row['Total Engagement'])}
                                                    </td>
                                                    {rowSpan.KPISummary > 0 && (
                                                        <td rowSpan={rowSpan.KPISummary} className="px-4 py-2.5 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${getKpiBadgeClass(row['KPI Summary'])}`}>
                                                                KPI: {row['KPI Summary'] || '3'}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-2.5 text-center">
                                                        {row.URL ? (
                                                            <a href={row.URL} target="_blank" rel="noopener noreferrer" className="inline-flex p-1 text-zinc-400 hover:text-primary transition-colors cursor-pointer" title="Open post URL">
                                                                <Icon name="open_in_new" size={15} />
                                                            </a>
                                                        ) : (
                                                            <span className="text-zinc-300 dark:text-zinc-700">-</span>
                                                        )}
                                                    </td>
                                                    {isUnlocked && userRole === 'Admin' && (
                                                        <td className="px-4 py-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                className="p-1 text-zinc-400 hover:text-primary transition-colors cursor-pointer"
                                                                onClick={() => loadRowForEdit(row, currentData.indexOf(row))}
                                                                title="Edit metrics"
                                                            >
                                                                <Icon name="edit" size={15} />
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
                        {tablePages.length > 1 && (
                            <nav className="flex items-center justify-between gap-4 border-t border-border bg-zinc-50/50 dark:bg-zinc-900/50 px-5 py-3" aria-label="Content table pagination">
                                <p className="text-xs text-zinc-500 font-mono">
                                    Showing {activeTablePage.start + 1} - {activeTablePage.start + visibleTableData.length} of {processedData.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
                                        disabled={tablePage === 1}
                                        onClick={() => setTablePage(page => Math.max(1, page - 1))}
                                    >
                                        Previous
                                    </button>
                                    <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400" aria-live="polite">
                                        Page {tablePage} of {tablePages.length}
                                    </span>
                                    <button
                                        type="button"
                                        className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
                                        disabled={tablePage === tablePages.length}
                                        onClick={() => setTablePage(page => Math.min(tablePages.length, page + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </nav>
                        )}
                    </div>
                </div>

                {/* Right 1 Column Sidebar */}
                <div className="space-y-6">
                    {userRole !== 'Viewer' && (
                        <section aria-labelledby="dashboard-priority-heading" className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                            <div className="flex items-center justify-between gap-3">
                                <h2 id="dashboard-priority-heading" className="text-xs font-bold text-zinc-900 dark:text-zinc-100">What needs attention</h2>
                                <button type="button" onClick={openTaskDirectory} className="text-[11px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">View all tasks</button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-zinc-50/50 dark:bg-zinc-900/50">
                                <button type="button" onClick={() => taskOverview.overdue[0] ? openTask(taskOverview.overdue[0].id) : openTaskDirectory()} className="flex items-center justify-between gap-2 rounded-l-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                    <span className="text-xs font-medium text-zinc-500">Overdue</span>
                                    <span className={`font-mono text-base font-bold ${taskOverview.overdue.length ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>{taskOverview.overdue.length}</span>
                                </button>
                                <button type="button" onClick={() => taskOverview.dueToday[0] ? openTask(taskOverview.dueToday[0].id) : openPlanner()} className="flex items-center justify-between gap-2 rounded-r-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                    <span className="text-xs font-medium text-zinc-500">Due today</span>
                                    <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">{taskOverview.dueToday.length}</span>
                                </button>
                            </div>
                            <div className="mt-3 border-t border-border pt-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-[10px] font-semibold text-zinc-400 uppercase font-mono tracking-wider">Next deadline</h3>
                                    <button type="button" onClick={openPlanner} className="text-[10px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Planner</button>
                                </div>
                                {taskOverview.upcoming[0] ? (
                                    <button type="button" onClick={() => openTask(taskOverview.upcoming[0].id)} className="mt-1.5 flex w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`Open task ${taskOverview.upcoming[0].contentTitle || 'Untitled'}`}>
                                        <span className="shrink-0 text-[10px] font-mono font-bold text-primary">{formatDisplayDate(taskOverview.upcoming[0].date)}</span>
                                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">{taskOverview.upcoming[0].contentTitle || 'Untitled'}</span>
                                        <Icon name="chevron_right" size={13} className="text-zinc-400 shrink-0" aria-hidden="true" />
                                    </button>
                                ) : <p className="mt-1.5 text-xs text-zinc-400">Nothing scheduled next.</p>}
                            </div>
                        </section>
                    )}

                    {/* Monthly Calendar Widget */}
                    <div className="border border-border bg-surface rounded-xl p-4 shadow-xs">
                        <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-border">
                            <button className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={handlePrevMonth} aria-label="Previous month">
                                <Icon name="chevron_left" size={15} />
                            </button>
                            <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{monthNames[currentMonth]} {currentYear}</span>
                            <button className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={handleNextMonth} aria-label="Next month">
                                <Icon name="chevron_right" size={15} />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 text-center text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, idx) => {
                                const isSelected = day.dateStr && selectedDate === day.dateStr;

                                let hasTask = false;
                                let uploadedClass = '';
                                let statusColor = 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800';

                                if (day.dateStr && !day.isDummy) {
                                    const dayTasks = combinedTasks.filter(t => t.date === day.dateStr);
                                    hasTask = dayTasks.length > 0;
                                    if (hasTask) {
                                        const hasOverdue = dayTasks.some(t => t.calculatedStatus === 'Overdue');
                                        const hasToday = dayTasks.some(t => t.calculatedStatus === 'Due Today');
                                        const allDone = dayTasks.every(t => t.calculatedStatus === 'Done');

                                        if (allDone) {
                                            statusColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
                                        } else if (hasOverdue) {
                                            statusColor = 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
                                        } else if (hasToday) {
                                            statusColor = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
                                        } else {
                                            statusColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
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
                                        className={`h-7 w-full border-none rounded text-xs font-mono cursor-pointer flex items-center justify-center transition-colors ${day.isDummy
                                                ? 'bg-transparent text-transparent pointer-events-none'
                                                : isSelected
                                                    ? 'bg-primary text-on-primary font-bold shadow-xs'
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
                    <div className="border border-border bg-surface rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex justify-between items-center pb-2.5 border-b border-border">
                            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Scheduled for this day</h3>
                            {userRole === 'Admin' && (
                                <button
                                    className="w-6 h-6 flex items-center justify-center bg-primary text-on-primary rounded hover:opacity-90 cursor-pointer transition-opacity"
                                    onClick={() => setIsNewPostDrawerOpen(true)}
                                    title="Add scheduled post"
                                    aria-label="Add scheduled post"
                                >
                                    <Icon name="add" size={14} weight="bold" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1" tabIndex={0} aria-label="Scheduled uploads for the selected date">
                            {scheduledTimeline.length === 0 ? (
                                <div className="py-6 text-center text-zinc-400 text-xs space-y-1.5">
                                    <Icon name="check_circle" size={24} className="mx-auto text-zinc-400" />
                                    <p>No uploads scheduled for this date.</p>
                                </div>
                            ) : (
                                scheduledTimeline.map((task) => (
                                    <div key={task.ID} className="flex gap-2.5 items-start relative group">
                                        <div className="flex flex-col items-center pt-1">
                                            <span className="w-2 h-2 rounded-full bg-primary" />
                                            <span className="w-px bg-border flex-1 my-1 min-h-[36px]" />
                                        </div>
                                        <div className="flex-1 border border-border/80 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-lg p-2.5 space-y-1">
                                            <p className="text-[10px] text-primary uppercase font-bold tracking-wider font-mono">Upload: {task.Category}</p>
                                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{task['Content Title']}</p>
                                            <p className="text-[11px] text-zinc-500 font-mono">
                                                PIC: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{getPicDisplayName(task.PIC)}</span> | {task.Status ? 'Published' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================
               2. MOBILE VIEW LAYOUT (hidden on screens > 1024px)
               ======================================================== */}
            <div className="lg:hidden space-y-6 max-w-md mx-auto pb-20">
                {userRole !== 'Viewer' && (
                    <section aria-labelledby="mobile-priority-heading" className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                        <p className="text-xs font-semibold text-primary">Work overview</p>
                        <h2 id="mobile-priority-heading" className="mt-1 text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">What needs attention</h2>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">Your closest deadlines and publishing work.</p>
                        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                            <button type="button" onClick={() => taskOverview.overdue[0] ? openTask(taskOverview.overdue[0].id) : openTaskDirectory()} className="rounded-lg border border-border bg-zinc-50/50 dark:bg-zinc-900/50 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                <span className="text-xs font-medium text-zinc-500">Overdue</span>
                                <span className={`mt-1 block text-xl font-bold font-mono ${taskOverview.overdue.length ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>{taskOverview.overdue.length}</span>
                            </button>
                            <button type="button" onClick={() => taskOverview.dueToday[0] ? openTask(taskOverview.dueToday[0].id) : openPlanner()} className="rounded-lg border border-border bg-zinc-50/50 dark:bg-zinc-900/50 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                <span className="text-xs font-medium text-zinc-500">Due today</span>
                                <span className="mt-1 block text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{taskOverview.dueToday.length}</span>
                            </button>
                        </div>
                        <button type="button" onClick={openTaskDirectory} className="mt-3.5 w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90 cursor-pointer">View all tasks</button>
                    </section>
                )}

                {/* Upcoming Posts */}
                {userRole !== 'Viewer' && (
                    <section className="space-y-2.5">
                        <div className="flex items-end justify-between gap-3 px-1">
                            <div>
                                <p className="text-xs font-semibold text-primary">Next up</p>
                                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Upcoming deadlines</h2>
                            </div>
                            <button type="button" onClick={openPlanner} className="text-xs font-semibold text-primary cursor-pointer">Planner</button>
                        </div>
                        {taskOverview.upcoming.length === 0 ? (
                            <div className="rounded-xl border border-border bg-surface p-4 text-xs text-zinc-500">Nothing is scheduled next. Open the planner to add work.</div>
                        ) : (
                            <div className="space-y-2">
                                {taskOverview.upcoming.slice(0, 3).map(task => (
                                    <button key={task.id} type="button" onClick={() => openTask(task.id)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer" aria-label={`Open task ${task.contentTitle || 'Untitled'}`}>
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-primary border border-orange-500/20">
                                            <Icon name="calendar_month" size={16} aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[11px] font-bold font-mono text-primary">{formatDisplayDate(task.date)}</span>
                                            <span className="block truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">{task.contentTitle || 'Untitled'}</span>
                                            <span className="block truncate text-[11px] text-zinc-500">{task.category} &middot; {getPicDisplayName(task.pic)}</span>
                                        </span>
                                        <Icon name="chevron_right" size={15} className="text-zinc-400" aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Metrics Stack */}
                <section className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Performance snapshot</h2>
                        <button type="button" onClick={openAnalytics} className="text-xs font-semibold text-primary cursor-pointer">Full analytics</button>
                    </div>
                    {/* Metric Card 1: Views */}
                    <button type="button" onClick={openAnalytics} className="w-full bg-surface p-3.5 rounded-xl border border-border flex items-center justify-between text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-primary border border-orange-500/20 flex items-center justify-center">
                                <Icon name="visibility" size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-medium">Total Views</p>
                                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-tight">{formatNumber(stats.totalViews)}</p>
                            </div>
                        </div>
                        <Icon name="chevron_right" size={15} className="text-zinc-400" aria-hidden="true" />
                    </button>
                    {/* Metric Card 2: Reach */}
                    <button type="button" onClick={openAnalytics} className="w-full bg-surface p-3.5 rounded-xl border border-border flex items-center justify-between text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-border flex items-center justify-center">
                                <Icon name="public" size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-medium">Total Reach</p>
                                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-tight">{formatNumber(stats.totalReach)}</p>
                            </div>
                        </div>
                        <Icon name="chevron_right" size={15} className="text-zinc-400" aria-hidden="true" />
                    </button>
                    {/* Metric Card 3: Engagement */}
                    <button type="button" onClick={openAnalytics} className="w-full bg-surface p-3.5 rounded-xl border border-border flex items-center justify-between text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-border flex items-center justify-center">
                                <Icon name="favorite" size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-medium">Engagements</p>
                                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-tight">{formatNumber(stats.totalEngagement)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-mono font-bold text-xs text-primary">{stats.avgEngagementRate}</span>
                        </div>
                    </button>
                </section>

                {/* Contextual FAB to trigger new post popup */}
                {userRole === 'Admin' && (
                    <button
                        type="button"
                        aria-label="New Post"
                        className="fixed right-5 bottom-20 w-12 h-12 bg-primary text-on-primary rounded-full shadow-md flex items-center justify-center cursor-pointer transition-transform duration-150 active:scale-95 z-40"
                        onClick={() => setIsNewPostDrawerOpen(true)}
                    >
                        <Icon name="add" size={22} weight="bold" />
                    </button>
                )}
            </div>

            {/* ========================================================
               3. SLIDE-OVER FORM DRAWER (shared by desktop and mobile)
               ======================================================== */}
            <div className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[460px] bg-surface border-l border-border flex flex-col justify-between shadow-2xl transition-transform duration-200 ${isNewPostDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                {isNewPostDrawerOpen && (
                    <div className="fixed inset-0 bg-background/50 backdrop-blur-xs z-[-1]" onClick={resetForm}></div>
                )}

                {/* Header */}
                <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-surface">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Icon name="add_box" size={18} className="text-primary" />
                        {editIndex !== null ? 'Edit Post Metrics' : 'Add New Post'}
                    </h2>
                    <button type="button" className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors cursor-pointer" onClick={resetForm} aria-label="Close">
                        <Icon name="close" size={16} />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Tabs switcher */}
                    <div className="flex border-b border-border pb-0.5">
                        <button
                            type="button"
                            className={`flex-1 pb-2 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer border-b-2 transition-all ${formTab === 'basic' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            onClick={() => setFormTab('basic')}
                        >
                            Basic Metrics
                        </button>
                        <button
                            type="button"
                            className={`flex-1 pb-2 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer border-b-2 transition-all ${formTab === 'additional' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
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
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer transition-colors"
                                        placeholder="YYYY-MM-DD"
                                        value={formDate}
                                        onClick={handleDatePickerClick}
                                        readOnly
                                        disabled={editIndex !== null}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        Content Title
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Enter title (optional)"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        disabled={editIndex !== null}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label htmlFor="dashboard-pic" className="text-xs font-medium text-muted-foreground">
                                            PIC <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            id="dashboard-pic"
                                            className="w-full bg-background border border-border rounded-md px-2.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                                            value={formPic}
                                            onChange={(e) => setFormPic(e.target.value)}
                                            disabled={editIndex !== null}
                                            required
                                        >
                                            <option value="" disabled hidden>Select PIC</option>
                                            {memberListData.map(m => (
                                                <option key={m.NAMA} value={m.NAMA}>{getPicDisplayName(m.NAMA)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="dashboard-category" className="text-xs font-medium text-muted-foreground">
                                            Category <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            id="dashboard-category"
                                            className="w-full bg-background border border-border rounded-md px-2.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
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
                                    <div className="space-y-4 pt-2 border-t border-border">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label htmlFor="dashboard-platform" className="text-xs font-medium text-muted-foreground">Platform</label>
                                                <select
                                                    id="dashboard-platform"
                                                    className="w-full bg-background border border-border rounded-md px-2.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
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
                                                <label className="text-xs font-medium text-muted-foreground">Views</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                                    placeholder="0"
                                                    value={formViews}
                                                    onChange={(e) => setFormViews(e.target.value)}
                                                    ref={viewsInputRef}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Account Reach</label>
                                            <input
                                                type="number"
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                                placeholder="0"
                                                value={formReach}
                                                onChange={(e) => setFormReach(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Likes</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                                    placeholder="0"
                                                    value={formLikes}
                                                    onChange={(e) => setFormLikes(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Comments</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                                    placeholder="0"
                                                    value={formComments}
                                                    onChange={(e) => setFormComments(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Followers Gained</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                                    placeholder="0"
                                                    value={formFollows}
                                                    onChange={(e) => setFormFollows(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Reposts</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                                    placeholder="0"
                                                    value={formRepost}
                                                    onChange={(e) => setFormRepost(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Shares</label>
                                            <input
                                                type="number"
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                                placeholder="0"
                                                value={formShares}
                                                onChange={(e) => setFormShares(e.target.value)}
                                            />
                                        </div>

                                        <div className="bg-muted/40 border border-border rounded-md p-3 text-xs space-y-2">
                                            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                                <Icon name="monitoring" size={14} /> Live Calculation
                                            </span>
                                            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground leading-relaxed">
                                                <div>Engagement: <span className="font-semibold font-mono text-foreground">{formCalculated.totalEngagement}</span></div>
                                                <div>Eng. Rate: <span className="font-semibold font-mono text-foreground">{formCalculated.engagementRate}%</span></div>
                                                <div>KPI Score: <span className="font-semibold font-mono text-foreground">{formCalculated.kpiScore}</span></div>
                                                <div>KPI Summary: <span className="font-semibold text-foreground">{formCalculated.kpiSummary}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {formTab === 'additional' && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Post URL</label>
                                    <input
                                        type="url"
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                        placeholder="https://published-link.com/post/123"
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Comment Notes</label>
                                    <textarea
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
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
                <div className="px-5 py-4 border-t border-border flex gap-2.5 justify-end bg-surface">
                    <button type="button" className="bg-muted hover:bg-muted/80 text-foreground font-medium py-2 px-3.5 rounded-md text-xs transition-colors cursor-pointer" onClick={resetForm}>
                        Cancel
                    </button>
                    <button type="submit" form="drawerForm" disabled={isMutating} aria-busy={isMutating ? 'true' : 'false'} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-3.5 rounded-md text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-70">
                        <Icon name={isMutating ? 'progress_activity' : 'save'} size={15} className={isMutating ? 'animate-spin' : ''} />
                        {isMutating ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>

        </div>
    );
}
