'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { 
    normalizePicName, 
    getPicBadgeClass,
    getPlatformBadgeHtml,
    formatNumber,
    getLocalDateInputValue,
    parseDate,
    resolveMemberName,
    normalizePlatformName
} from '../utils/helpers';

const parseCleanInt = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[\.\,]/g, '');
    return parseInt(cleaned, 10) || 0;
};

export default function DashboardTab({ onOpenDatePicker }) {
    // Helper to render sanitised HTML securely
    const createSafeHtml = (htmlContent) => {
        if (typeof window !== 'undefined' && window.DOMPurify) {
            return { __html: window.DOMPurify.sanitize(htmlContent) };
        }
        if (typeof window === 'undefined') return { __html: '' };
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent || '', 'text/html');
            const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'span', 'i'];
            const allowedAttrs = {
                'a': ['href', 'target', 'rel'],
                'span': ['class', 'style'],
                'i': ['class', 'style']
            };
            const sanitizeNode = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return document.createTextNode(node.nodeValue);
                }
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return null;
                }
                const tagName = node.tagName.toLowerCase();
                if (!allowedTags.includes(tagName)) {
                    return document.createTextNode(node.textContent);
                }
                const cleanEl = document.createElement(tagName);
                const attrs = allowedAttrs[tagName] || [];
                for (const attr of attrs) {
                    if (node.hasAttribute(attr)) {
                        const val = node.getAttribute(attr);
                        if (attr === 'href' && /^\s*javascript:/i.test(val)) {
                            continue;
                        }
                        cleanEl.setAttribute(attr, val);
                    }
                }
                node.childNodes.forEach(child => {
                    const cleanChild = sanitizeNode(child);
                    if (cleanChild) {
                        cleanEl.appendChild(cleanChild);
                    }
                });
                return cleanEl;
            };
            const container = document.createElement('div');
            doc.body.childNodes.forEach(child => {
                const cleanChild = sanitizeNode(child);
                if (cleanChild) {
                    container.appendChild(cleanChild);
                }
            });
            return { __html: container.innerHTML };
        } catch (e) {
            console.error('HTML Sanitization error:', e);
            return { __html: '' };
        }
    };

    const {
        currentData,
        isUnlocked,
        userRole,
        addLaporanRow,
        updateLaporanRow,
        deleteLaporanRow,
        deleteBatchLaporanRows,
        memberListData,
        showAlert,
        searchQuery,
        setSearchQuery,
        mainFilterPic,
        setMainFilterPic,
        mainFilterCategory,
        setMainFilterCategory,
        mainFilterPlatform,
        setMainFilterPlatform,
        dateRange
    } = useDashboard();

    // Visual display toggles
    const [isFormVisible, setIsFormVisible] = useState(true);

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

    // Inner tabs inside Form Panel
    const [formTab, setFormTab] = useState('basic'); // 'basic' | 'metrics' | 'additional'

    // Table selection states
    const [selectedRows, setSelectedRows] = useState([]);

    // Table sorting states (Default is 'Date' ascending)
    const [sortColumn, setSortColumn] = useState('Date');
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc' | 'none'

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
    };

    // Initialize date field on mount
    useEffect(() => {
        if (!formDate) {
            setFormDate(getLocalDateInputValue());
        }
    }, [formDate]);

    // Open Custom Date Picker Overlay
    const handleDatePickerClick = () => {
        if (!isUnlocked || editIndex !== null) return;
        onOpenDatePicker((selectedDate) => {
            setFormDate(selectedDate);
        }, formDate);
    };

    // Sort, filter, and process data for active view
    const getProcessedData = () => {
        let list = [...currentData];

        // Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(row => 
                String(row['Content Title'] || '').toLowerCase().includes(q) ||
                String(row.ID || '').toLowerCase().includes(q) ||
                String(row['Comment Text'] || '').toLowerCase().includes(q) ||
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

        // Apply Sorting (exactly like handleHeaderSort in script.js)
        if (sortColumn !== 'none') {
            list.sort((a, b) => {
                let valA = a[sortColumn];
                let valB = b[sortColumn];

                // Number comparison
                if (['Views', 'Account Reach', 'Likes', 'Comments', 'Follows', 'Repost', 'Shares', 'Total Engagement', 'Engagement Rate (%)', 'KPI Score', 'KPI Summary'].includes(sortColumn)) {
                    const numA = parseFloat(valA) || 0;
                    const numB = parseFloat(valB) || 0;
                    return sortDirection === 'asc' ? numA - numB : numB - numA;
                }

                // Date comparison
                if (sortColumn === 'Date') {
                    const dateA = parseDate(valA) || '';
                    const dateB = parseDate(valB) || '';
                    return sortDirection === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
                }

                // String fallback
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

    // ----------------------------------------------------
    // ROWSPAN CALCULATION LOGIC
    // ----------------------------------------------------
    const calculateRowspans = (rows) => {
        const rowspans = [];
        for (let r = 0; r < rows.length; r++) {
            rowspans[r] = {
                Date: 1,
                ID: 1,
                ContentTitle: 1,
                PIC: 1,
                Category: 1,
                KPISummary: 1
            };
        }

        let i = 0;
        while (i < rows.length) {
            let j = i + 1;
            const currentTitle = String(rows[i]['Content Title'] || '').trim().toLowerCase();

            if (currentTitle) {
                while (j < rows.length && String(rows[j]['Content Title'] || '').trim().toLowerCase() === currentTitle) {
                    j++;
                }
            }

            const count = j - i;
            if (count > 1) {
                rowspans[i].ContentTitle = count;
                rowspans[i].KPISummary = count;
                for (let k = i + 1; k < j; k++) {
                    rowspans[k].ContentTitle = 0;
                    rowspans[k].KPISummary = 0;
                }

                // Check Date
                let dateSame = true;
                const dateVal = String(rows[i].Date || '');
                for (let k = i + 1; k < j; k++) {
                    if (String(rows[k].Date || '') !== dateVal) {
                        dateSame = false;
                        break;
                    }
                }
                if (dateSame) {
                    rowspans[i].Date = count;
                    for (let k = i + 1; k < j; k++) rowspans[k].Date = 0;
                }

                // Check ID
                let idSame = true;
                const idVal = rows[i].ID;
                for (let k = i + 1; k < j; k++) {
                    if (rows[k].ID !== idVal) {
                        idSame = false;
                        break;
                    }
                }
                if (idSame) {
                    rowspans[i].ID = count;
                    for (let k = i + 1; k < j; k++) rowspans[k].ID = 0;
                }
            }
            i = j;
        }
        return rowspans;
    };

    const rowspans = calculateRowspans(processedData);

    // ----------------------------------------------------
    // KPI CALCULATION AND METRICS HELPERS
    // ----------------------------------------------------
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

        const avgEngagementRate = rateCount > 0 ? (totalRate / rateCount).toFixed(2) + '%' : '0.00%';

        return {
            contentTitlesSize: contentTitles.size,
            totalViews,
            totalReach,
            totalEngagement,
            avgEngagementRate
        };
    };

    const stats = calculateStats();

    // ----------------------------------------------------
    // METRICS STYLING HELPERS
    // ----------------------------------------------------
    const hasZeroEngagementMetrics = (row) => {
        const metrics = ['Views', 'Account Reach', 'Likes', 'Comments', 'Follows', 'Repost', 'Shares'];
        return metrics.every(metric => parseCleanInt(row?.[metric]) === 0);
    };

    const getKpiBadgeClass = (score) => {
        const kpi = parseCleanInt(score);
        if (kpi >= 6) return 'badge-kpi-excellent';
        if (kpi >= 5) return 'badge-kpi-good';
        if (kpi >= 4) return 'badge-kpi-average';
        return 'badge-kpi-low';
    };

    // ----------------------------------------------------
    // FORM AUTO CALCULATE METRICS
    // ----------------------------------------------------
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
        const plat = String(platformVal || '').trim().toLowerCase();
        
        if (plat === 'instagram' || plat === 'tiktok' || plat === 'youtube') {
            if (views >= 100000) kpiScore = 6;
            else if (views >= 10000) kpiScore = 5;
            else if (views >= 1000) kpiScore = 4;
        } else {
            if (views >= 100000) kpiScore = 6;
            else if (views >= 10000) kpiScore = 5;
            else if (views >= 1000) kpiScore = 4;
        }

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

    // ----------------------------------------------------
    // EDIT & SAVE ACTIONS
    // ----------------------------------------------------
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

        const el = document.getElementById('formPanel');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!isUnlocked) {
            showAlert('Workspace is locked. Please unlock to save entries.', 'error');
            return;
        }

        if (userRole === 'Creator') {
            showAlert('Creators are not authorized to save database entries.', 'error');
            return;
        }

        if (!formTitle || !formPic) {
            showAlert('Content Title and PIC are required fields.', 'error');
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



    // ----------------------------------------------------
    // TABLE SELECTION & SORTING UTILS
    // ----------------------------------------------------
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

    const handleDeleteSelected = async () => {
        if (selectedRows.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} selected records?`)) return;

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
    };

    const handleExportSelected = () => {
        if (selectedRows.length === 0) return;
        
        if (typeof window === 'undefined' || !window.XLSX) {
            showAlert('Export library is loading. Please try again.', 'error');
            return;
        }

        try {
            const XLSX = window.XLSX;
            const exportData = currentData.filter(row => selectedRows.includes(row.ID));
            
            const headers = [
                'Date', 'ID', 'Content Title', 'PIC', 'Category', 'Platform', 
                'Views', 'Account Reach', 'Likes', 'Comments', 'Follows', 'Repost', 
                'Shares', 'Total Engagement', 'Engagement Rate (%)', 'KPI Score', 
                'KPI Summary', 'URL', 'Comment Text'
            ];

            const rows = exportData.map(row => {
                const r = {};
                headers.forEach(h => { r[h] = row[h] !== undefined ? row[h] : ''; });
                return r;
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Selected Data');
            XLSX.writeFile(wb, `GAT_Selected_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showAlert('💾 Selected rows exported successfully!', 'success');
        } catch (e) {
            showAlert(`❌ Export failed: ${e.message}`, 'error');
        }
    };

    const handleHeaderSort = (key) => {
        if (sortColumn === key) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortColumn('none');
                setSortDirection('asc');
            }
        } else {
            setSortColumn(key);
            setSortDirection('asc');
        }
    };

    const showCheckboxes = isUnlocked && userRole !== 'Creator';
    const showActions = isUnlocked && userRole !== 'Creator';

    if (!isUnlocked) {
        return <LockScreen sectionName="Dashboard" />;
    }

    return (
        <>
            {/* 1. STATS CARDS GRID (Visible only if there is data) */}
            {currentData.length > 0 && (
                <section className="stats-section" id="statsSection" style={{ display: 'block' }}>
                    <div className="stats-grid" id="statsGrid">
                        <div className="stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Content Titles</span>
                                <span className="stat-icon"><i className="fa-solid fa-hashtag text-primary"></i></span>
                            </div>
                            <div className="stat-value primary">{stats.contentTitlesSize}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Total Views</span>
                                <span className="stat-icon"><i className="fa-solid fa-eye text-primary"></i></span>
                            </div>
                            <div className="stat-value primary">{formatNumber(stats.totalViews)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Total Reach</span>
                                <span className="stat-icon"><i className="fa-solid fa-users text-primary"></i></span>
                            </div>
                            <div className="stat-value primary">{formatNumber(stats.totalReach)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Total Engagement</span>
                                <span className="stat-icon"><i className="fa-solid fa-thumbs-up text-success"></i></span>
                            </div>
                            <div className="stat-value success">{formatNumber(stats.totalEngagement)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Avg Engagement Rate</span>
                                <span className="stat-icon"><i className="fa-solid fa-percent text-warning"></i></span>
                            </div>
                            <div className="stat-value warning">{stats.avgEngagementRate}</div>
                        </div>
                    </div>
                </section>
            )}

            {/* 2. CONTENT AREA */}
            <div className={`content-area ${(!isFormVisible || userRole === 'Creator') ? 'form-collapsed' : ''}`}>
                {/* Form Panel */}
                {isUnlocked && userRole !== 'Creator' && (
                    <section className="panel panel-form" id="formPanel" style={{ display: isFormVisible ? 'block' : 'none' }}>
                        <div className="panel-header">
                            <h2 id="formTitle">
                                <span className="panel-icon">
                                    <i className="fa-solid fa-circle-plus"></i>
                                </span> 
                                <span id="formTitleText">{editIndex !== null ? 'Edit Data' : 'Add New Data'}</span>
                            </h2>
                            {editIndex !== null && (
                                <button className="btn-close" onClick={resetForm} id="cancelBtn" title="Cancel edit" type="button">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>
                        <div className="panel-body">
                            <form onSubmit={handleFormSubmit} className="form" autoComplete="off" id="dataForm">
                                <input type="hidden" id="editRowIndex" />

                                <div className="form-tabs-wrapper">
                                    <div className="form-tabs">
                                        <button 
                                            type="button" 
                                            className={`tab ${formTab === 'basic' ? 'active' : ''}`}
                                            onClick={() => setFormTab('basic')}
                                        >
                                            <i className="fa-solid fa-file-invoice"></i> Basic
                                        </button>
                                        <button 
                                            type="button" 
                                            className={`tab ${formTab === 'additional' ? 'active' : ''}`}
                                            onClick={() => setFormTab('additional')}
                                        >
                                            <i className="fa-solid fa-paperclip"></i> Additional
                                        </button>
                                    </div>
                                </div>

                                <div className="form-tab-content">
                                    {/* Tab 1: Basic */}
                                    {formTab === 'basic' && (
                                        <div className="form-section-tab active">
                                            <div className="form-row">
                                                <div className="form-group full">
                                                    <label>Date <span className="required">*</span></label>
                                                    <input 
                                                        type="text" 
                                                        className="form-control custom-date-input" 
                                                        placeholder="YYYY-MM-DD"
                                                        value={formDate}
                                                        onClick={handleDatePickerClick}
                                                        readOnly
                                                        disabled={editIndex !== null}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group full">
                                                    <label>Content Title</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-control"
                                                        placeholder="Enter content title (optional)"
                                                        value={formTitle}
                                                        onChange={(e) => setFormTitle(e.target.value)}
                                                        disabled={editIndex !== null}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>PIC <span className="required">*</span></label>
                                                    <select 
                                                        className="form-control"
                                                        value={formPic}
                                                        onChange={(e) => setFormPic(e.target.value)}
                                                        disabled={editIndex !== null}
                                                        required
                                                    >
                                                        <option value="" disabled hidden>Select PIC</option>
                                                        <option value="Kelvin">Kelvin</option>
                                                        <option value="Felix">Felix</option>
                                                        <option value="Eduard">Eduard</option>
                                                        <option value="Anthoni">Anthoni</option>
                                                        <option value="Leonardi">Leonardi</option>
                                                        <option value="Ruliyanto">Ruliyanto</option>
                                                        <option value="Rafael">Rafael</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Category <span className="required">*</span></label>
                                                    <select 
                                                        className="form-control"
                                                        value={formCategory}
                                                        onChange={(e) => setFormCategory(e.target.value)}
                                                        disabled={editIndex !== null}
                                                        required
                                                    >
                                                        <option value="" disabled hidden>Select Category</option>
                                                        <option value="Article Reels">Article Reels</option>
                                                        <option value="Story Telling">Story Telling</option>
                                                        <option value="News">News</option>
                                                        <option value="Talking Head">Talking Head</option>
                                                        <option value="Clipper">Clipper</option>
                                                        <option value="Motion">Motion</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {editIndex !== null && (
                                                <>
                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label>Platform</label>
                                                            <select 
                                                                className="form-control"
                                                                value={formPlatform}
                                                                disabled
                                                            >
                                                                <option value="Instagram">Instagram</option>
                                                                <option value="TikTok">TikTok</option>
                                                                <option value="Youtube">Youtube</option>
                                                            </select>
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Views</label>
                                                            <input 
                                                                type="number" 
                                                                className="form-control"
                                                                placeholder="0"
                                                                value={formViews}
                                                                onChange={(e) => setFormViews(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-row">
                                                        <div className="form-group full">
                                                            <label>Account Reach</label>
                                                            <input 
                                                                type="number" 
                                                                className="form-control"
                                                                placeholder="0"
                                                                value={formReach}
                                                                onChange={(e) => setFormReach(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label>Likes</label>
                                                            <input 
                                                                type="number" 
                                                                className="form-control"
                                                                placeholder="0"
                                                                value={formLikes}
                                                                onChange={(e) => setFormLikes(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Comments</label>
                                                            <input 
                                                                type="number" 
                                                                className="form-control"
                                                                placeholder="0"
                                                                value={formComments}
                                                                onChange={(e) => setFormComments(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label>Follows</label>
                                                            <input 
                                                                type="number" 
                                                                className="form-control"
                                                                placeholder="0"
                                                                value={formFollows}
                                                                onChange={(e) => setFormFollows(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Repost</label>
                                                            <input 
                                                                type="number" 
                                                                className="form-control"
                                                                placeholder="0"
                                                                value={formRepost}
                                                                onChange={(e) => setFormRepost(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-row">
                                                        <div className="form-group full">
                                                            <label>Shares</label>
                                                            <input 
                                                                type="number" 
                                                                className="form-control"
                                                                placeholder="0"
                                                                value={formShares}
                                                                onChange={(e) => setFormShares(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Edit Restriction Note */}
                                                    <div className="form-row" style={{ marginTop: '12px', marginBottom: '12px' }}>
                                                        <div className="form-group full" style={{ marginBottom: 0 }}>
                                                            <p style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 500, display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--canvas)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--hairline-strong)', margin: 0, lineHeight: 1.4 }}>
                                                                <i className="fa-solid fa-circle-info" style={{ color: 'var(--primary)', fontSize: '14px' }}></i>
                                                                <span>Note: Date, Content Title, PIC, Category, and Platform can only be changed in the Task List.</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Calculated Results */}
                                                    <div className="metrics-calculated">
                                                        <h4><i className="fa-solid fa-calculator"></i> Calculated Results</h4>
                                                        <div className="metrics-grid">
                                                            <div className="metric-box">
                                                                <label>Total Engagement</label>
                                                                <div className="metric-value">{formCalculated.totalEngagement}</div>
                                                            </div>
                                                            <div className="metric-box" title="Engagement Rate is calculated from: Views, Reach, Likes, Comments, Follows, Repost, Shares">
                                                                <label>Engagement Rate</label>
                                                                <div className="metric-value">{formCalculated.engagementRate}%</div>
                                                            </div>
                                                            <div className="metric-box">
                                                                <label>KPI Score</label>
                                                                <div className="metric-value">{formCalculated.kpiScore}</div>
                                                            </div>
                                                            <div className="metric-box">
                                                                <label>KPI Summary</label>
                                                                <div className="metric-value">{formCalculated.kpiSummary}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab 2: Additional */}
                                    {formTab === 'additional' && (
                                        <div className="form-section-tab active">
                                            <div className="form-row">
                                                <div className="form-group full">
                                                    <label>URL</label>
                                                    <input 
                                                        type="url" 
                                                        className="form-control"
                                                        placeholder="https://example.com"
                                                        value={formUrl}
                                                        onChange={(e) => setFormUrl(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group full">
                                                    <label>Comment Text</label>
                                                    <textarea 
                                                        className="form-control"
                                                        rows="3"
                                                        placeholder="Additional notes or comments"
                                                        value={formCommentText}
                                                        onChange={(e) => setFormCommentText(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary btn-block" id="submitBtn">
                                        <span><i className="fa-solid fa-floppy-disk"></i> Save</span>
                                    </button>
                                    <button type="button" className="btn btn-secondary btn-block" onClick={resetForm}>
                                        <i className="fa-solid fa-arrow-rotate-left"></i> Reset
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                )}

                {/* Table Panel */}
                <div className="panel panel-table">
                    <div className="panel-header">
                        <h2><span className="panel-icon"><i className="fa-solid fa-table"></i></span> Content Data</h2>
                        <div className="panel-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {isUnlocked && userRole !== 'Creator' && (
                                <button 
                                    type="button" 
                                    className="btn btn-outline btn-sm" 
                                    onClick={() => setIsFormVisible(!isFormVisible)}
                                    id="toggleFormBtn"
                                >
                                    <i className={`fa-solid ${isFormVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i> {isFormVisible ? 'Hide Form' : 'Show Form'}
                                </button>
                            )}
                            <span className="data-count" id="dataCount">{processedData.length} items</span>
                        </div>
                    </div>

                    {/* Bulk Actions & Search Wrapper (NO dropdown filters, matching index.html) */}
                    <div className="bulk-actions">
                        <div className="bulk-actions-left">
                            {showCheckboxes && selectedRows.length > 0 && (
                                <>
                                    <button className="btn btn-sm btn-danger" onClick={handleDeleteSelected} id="deleteSelectedBtn">
                                        <i className="fa-solid fa-trash-can"></i> Delete
                                    </button>
                                    <button className="btn btn-sm btn-primary" onClick={handleExportSelected} id="exportSelectedBtn">
                                        <i className="fa-solid fa-file-export"></i> Export
                                    </button>
                                    <span className="selected-count" id="selectedCountDisplay" style={{ display: 'inline' }}>
                                        <span id="selectedCount">{selectedRows.length}</span> selected
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="bulk-actions-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {searchQuery && (
                                <button 
                                    className="btn btn-outline btn-sm" 
                                    onClick={() => setSearchQuery('')}
                                    id="resetFiltersBtn"
                                    style={{ display: 'inline-flex' }}
                                >
                                    <i className="fa-solid fa-arrow-rotate-left"></i> Set to Default
                                </button>
                            )}
                            <div className="search-wrapper">
                                <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                                <input
                                    type="text"
                                    className="search-input"
                                    id="searchInput"
                                    placeholder="Search title, PIC, platform..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table Shell */}
                    <div className="table-container" id="dataTable">
                        {processedData.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <h3>No data available</h3>
                                <p>Add new data or import from Excel</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        {showCheckboxes && (
                                            <th style={{ width: '40px' }} className="checkbox-col">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedRows.length > 0 && selectedRows.length === processedData.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                        )}
                                        <th>No</th>
                                        <th onClick={() => handleHeaderSort('Date')} style={{ cursor: 'pointer' }}>
                                            Date <i className={`fa-solid ${sortColumn === 'Date' ? (sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i>
                                        </th>
                                        <th>Content Title</th>
                                        <th>PIC</th>
                                        <th>Category</th>
                                        <th>Platform</th>
                                        <th onClick={() => handleHeaderSort('Views')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                            Views <i className={`fa-solid ${sortColumn === 'Views' ? (sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i>
                                        </th>
                                        <th style={{ textAlign: 'right' }}>Reach</th>
                                        <th style={{ textAlign: 'right' }}>Likes</th>
                                        <th style={{ textAlign: 'right' }}>Comments</th>
                                        <th style={{ textAlign: 'right' }}>Follows</th>
                                        <th style={{ textAlign: 'right' }}>Repost</th>
                                        <th style={{ textAlign: 'right' }}>Shares</th>
                                        <th style={{ textAlign: 'right' }}>Total Eng</th>
                                        <th 
                                            onClick={() => handleHeaderSort('Engagement Rate (%)')} 
                                            style={{ cursor: 'pointer', textAlign: 'right' }}
                                            title="Engagement Rate is calculated from: Views, Reach, Likes, Comments, Follows, Repost, Shares"
                                        >
                                            Rate % <i className={`fa-solid ${sortColumn === 'Engagement Rate (%)' ? (sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i>
                                        </th>
                                        <th onClick={() => handleHeaderSort('KPI Score')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                                            KPI <i className={`fa-solid ${sortColumn === 'KPI Score' ? (sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i>
                                        </th>
                                        <th style={{ textAlign: 'center' }}>Summary</th>
                                        <th style={{ textAlign: 'center' }}>Link</th>
                                        {showActions && <th style={{ textAlign: 'center' }}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const currentDataIndexMap = new Map();
                                        currentData.forEach((r, i) => {
                                            if (r.ID && !currentDataIndexMap.has(r.ID)) {
                                                currentDataIndexMap.set(r.ID, i);
                                            }
                                        });

                                        return processedData.map((row, idx) => {
                                            const mainIndex = currentDataIndexMap.has(row.ID) ? currentDataIndexMap.get(row.ID) : -1;
                                            const isRowSelected = selectedRows.includes(row.ID);
                                            const isZeroMetrics = hasZeroEngagementMetrics(row);
                                        const metricClass = isZeroMetrics ? 'cell-danger' : '';

                                        return (
                                            <tr key={`${row.ID}-${idx}`} className={`${isRowSelected ? 'selected' : ''}`}>
                                                {showCheckboxes && (
                                                    <td className="checkbox-col">
                                                        <input 
                                                            type="checkbox"
                                                            checked={isRowSelected}
                                                            onChange={() => toggleSelectRow(row.ID)}
                                                        />
                                                    </td>
                                                )}
                                                <td>{idx + 1}</td>
                                                
                                                {/* Date Cell with rowspan */}
                                                {rowspans[idx].Date > 0 && (
                                                    <td rowSpan={rowspans[idx].Date}>{row.Date}</td>
                                                )}

                                                {/* Content Title Cell with rowspan */}
                                                {rowspans[idx].ContentTitle > 0 && (
                                                    <td rowSpan={rowspans[idx].ContentTitle}>
                                                        <div className="line-clamp-3" title={row['Content Title']}>
                                                            {row['Content Title'] || 'Untitled'}
                                                        </div>
                                                    </td>
                                                )}

                                                {/* PIC badge (No rowspan, rendered for every row) */}
                                                <td>
                                                    <span className={`badge ${getPicBadgeClass(row.PIC)}`}>
                                                        {normalizePicName(row.PIC)}
                                                    </span>
                                                </td>

                                                {/* Category (No rowspan, rendered for every row) */}
                                                <td>{row.Category || '—'}</td>

                                                {/* Platform */}
                                                <td>
                                                    <span dangerouslySetInnerHTML={createSafeHtml(getPlatformBadgeHtml(row.Platform))}></span>
                                                </td>

                                                {/* Metric columns */}
                                                <td className={metricClass} style={{ textAlign: 'right', fontWeight: 700 }}>
                                                    {formatNumber(row.Views)}
                                                </td>
                                                <td className={metricClass} style={{ textAlign: 'right' }}>
                                                    {formatNumber(row['Account Reach'])}
                                                </td>
                                                <td className={metricClass} style={{ textAlign: 'right' }}>
                                                    {formatNumber(row.Likes)}
                                                </td>
                                                <td className={metricClass} style={{ textAlign: 'right' }}>
                                                    {formatNumber(row.Comments)}
                                                </td>
                                                <td className={metricClass} style={{ textAlign: 'right' }}>
                                                    {formatNumber(row.Follows)}
                                                </td>
                                                <td className={metricClass} style={{ textAlign: 'right' }}>
                                                    {formatNumber(row.Repost)}
                                                </td>
                                                <td className={metricClass} style={{ textAlign: 'right' }}>
                                                    {formatNumber(row.Shares)}
                                                </td>
                                                <td className={metricClass} style={{ textAlign: 'right' }}>
                                                    {formatNumber(row['Total Engagement'])}
                                                </td>
                                                <td className={metricClass} style={{ textAlign: 'right' }}>
                                                    {(parseFloat(row['Engagement Rate (%)']) || 0).toFixed(2)}%
                                                </td>

                                                {/* KPI Score badge */}
                                                <td>
                                                    <span className={`badge ${getKpiBadgeClass(row['KPI Score'])}`}>
                                                        {row['KPI Score'] || '3'}
                                                    </span>
                                                </td>

                                                {/* KPI Summary Cell with rowspan */}
                                                {rowspans[idx].KPISummary > 0 && (
                                                    <td rowSpan={rowspans[idx].KPISummary} style={{ textAlign: 'center' }}>
                                                        <span className={`badge ${getKpiBadgeClass(row['KPI Summary'])}`}>
                                                            {row['KPI Summary'] || '3'}
                                                        </span>
                                                    </td>
                                                )}

                                                {/* Link Cell */}
                                                <td style={{ textAlign: 'center' }}>
                                                    {row.URL ? (
                                                        <a 
                                                            href={row.URL} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="table-link-icon" 
                                                            title="Go to Link"
                                                        >
                                                            <i className="fa-solid fa-link"></i>
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: 'var(--ink-faint)' }}>—</span>
                                                    )}
                                                </td>

                                                {/* Actions column */}
                                                {showActions && (
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                            <button 
                                                                type="button" 
                                                                className="action-btn edit"
                                                                onClick={() => loadRowForEdit(row, mainIndex)}
                                                                title="Edit"
                                                            >
                                                                <i className="fa-solid fa-pen"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    });
                                })()}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
