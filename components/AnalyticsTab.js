'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { 
    normalizePicName, 
    getPicBadgeClass,
    getPlatformBadgeHtml,
    getPlatformLogoHtml,
    formatNumber,
    parseDate,
    aggregateTrendData,
    aggregatePlatformData,
    aggregatePicData,
    aggregateCategoryData
} from '../utils/helpers';

export default function AnalyticsTab() {
    // Helper to render sanitised HTML securely
    const createSafeHtml = (htmlContent) => {
        if (typeof window !== 'undefined' && window.DOMPurify) {
            return { __html: window.DOMPurify.sanitize(htmlContent) };
        }
        return { __html: htmlContent };
    };

    const {
        currentData,
        dateRange,
        searchQuery,
        mainFilterPic,
        mainFilterCategory,
        mainFilterPlatform,
        darkMode,
        isUnlocked
    } = useDashboard();

    const [hasData, setHasData] = useState(false);

    // KPI Explorer state
    const [kpiExplorerScore, setKpiExplorerScore] = useState(5);

    // Canvas references
    const trendCanvasRef = useRef(null);
    const platformCanvasRef = useRef(null);
    const picCanvasRef = useRef(null);
    const categoryCanvasRef = useRef(null);

    // Chart instance references to avoid canvas reuse errors
    const trendChartRef = useRef(null);
    const platformChartRef = useRef(null);
    const picChartRef = useRef(null);
    const categoryChartRef = useRef(null);

    // Use the complete unfiltered database for global analytics distributions
    const getFilteredData = () => {
        return [...currentData];
    };

    const activeData = getFilteredData();

    // Determine data availability
    useEffect(() => {
        if (activeData.length === 0) {
            setHasData(false);
            return;
        }
        setHasData(true);
    }, [activeData]);

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

        activeData.forEach(row => {
            totalViews += parseInt(row.Views) || 0;
            totalReach += parseInt(row['Account Reach']) || 0;
            totalEngagement += parseInt(row['Total Engagement']) || 0;
            
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
    // KPI DISTRIBUTION & EXPLORER METRICS
    // ----------------------------------------------------
    const getKpiDistribution = () => {
        let kpiCount6 = 0, kpiCount5 = 0, kpiCount4 = 0, kpiCount3 = 0;
        const titleKpiMap = {};

        activeData.forEach(row => {
            const rawTitle = row['Content Title'];
            if (rawTitle) {
                const cleanTitle = String(rawTitle).trim().toLowerCase();
                const summary = parseInt(row['KPI Summary']) || parseInt(row['KPI Score']) || 3;
                if (!titleKpiMap[cleanTitle] || summary > titleKpiMap[cleanTitle]) {
                    titleKpiMap[cleanTitle] = summary;
                }
            }
        });

        Object.values(titleKpiMap).forEach(kpi => {
            if (kpi >= 6) kpiCount6++;
            else if (kpi === 5) kpiCount5++;
            else if (kpi === 4) kpiCount4++;
            else if (kpi === 3) kpiCount3++;
        });

        return { kpiCount6, kpiCount5, kpiCount4, kpiCount3 };
    };

    const kpiDistribution = getKpiDistribution();

    // Filter matching explorer data rows
    const getExplorerMatchingRows = () => {
        return activeData.filter(row => {
            const views = parseInt(row.Views) || 0;
            let score = 3;
            if (views >= 100000) score = 6;
            else if (views >= 10000) score = 5;
            else if (views >= 1000) score = 4;
            return score === kpiExplorerScore;
        });
    };

    const explorerRows = getExplorerMatchingRows();

    // Count categories in explorer
    const getExplorerCategorySummary = () => {
        const counts = {};
        explorerRows.forEach(row => {
            const cat = row.Category || 'Unknown';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts);
    };

    const explorerCategories = getExplorerCategorySummary();

    // ----------------------------------------------------
    // LEADERBOARD DATABASES
    // ----------------------------------------------------
    const getTopPerformingContents = () => {
        return [...activeData]
            .sort((a, b) => (parseInt(b.Views) || 0) - (parseInt(a.Views) || 0))
            .slice(0, 5);
    };

    const topContents = getTopPerformingContents();

    const getCreatorLeaderboard = () => {
        const creators = {};
        activeData.forEach(row => {
            const pic = normalizePicName(row.PIC);
            if (!pic) return;

            if (!creators[pic]) {
                creators[pic] = {
                    name: pic,
                    views: 0,
                    posts: new Set()
                };
            }
            creators[pic].views += parseInt(row.Views) || 0;
            if (row['Content Title']) {
                creators[pic].posts.add(row['Content Title'].trim());
            }
        });

        return Object.values(creators).sort((a, b) => b.views - a.views);
    };

    const creatorLeaderboard = getCreatorLeaderboard();

    const getKpiBadgeClass = (score) => {
        const kpi = parseInt(score) || 0;
        if (kpi >= 6) return 'badge-kpi-excellent';
        if (kpi >= 5) return 'badge-kpi-good';
        if (kpi >= 4) return 'badge-kpi-average';
        return 'badge-kpi-low';
    };

    // ----------------------------------------------------
    // CHART.JS LIFECYCLE MANAGEMENT
    // ----------------------------------------------------
    useEffect(() => {
        if (!hasData) return;

        const renderTimer = setTimeout(() => {
            if (typeof window === 'undefined' || !window.Chart) {
                console.warn('Chart.js library is not loaded on window.');
                return;
            }

            const Chart = window.Chart;

            // 1. Data Aggregation
            const trendData = aggregateTrendData(activeData);
            const platformData = aggregatePlatformData(activeData);
            const picData = aggregatePicData(activeData);
            const categoryData = aggregateCategoryData(activeData);

            // Clean up old charts before rendering new ones
            if (trendChartRef.current) trendChartRef.current.destroy();
            if (platformChartRef.current) platformChartRef.current.destroy();
            if (picChartRef.current) picChartRef.current.destroy();
            if (categoryChartRef.current) categoryChartRef.current.destroy();

            // Font & Grid color configurations
            const textColor = darkMode ? '#d0d6e0' : '#37352f';
            const gridColor = darkMode ? '#23252a' : '#e6e6e6';

            // ----------------------------------------------------
            // CHART 1: PERFORMANCE TREND (LINE)
            // ----------------------------------------------------
            if (trendCanvasRef.current && trendData) {
                const { sortedDates, viewsData, engagementData } = trendData;
                trendChartRef.current = new Chart(trendCanvasRef.current, {
                    type: 'line',
                    data: {
                        labels: sortedDates,
                        datasets: [
                            {
                                label: 'Views',
                                data: viewsData,
                                borderColor: '#0075de',
                                backgroundColor: 'rgba(0, 117, 222, 0.08)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.3,
                                yAxisID: 'y'
                            },
                            {
                                label: 'Engagement',
                                data: engagementData,
                                borderColor: '#1aae39',
                                backgroundColor: 'rgba(26, 174, 57, 0.08)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.3,
                                yAxisID: 'y1'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { labels: { color: textColor, font: { family: 'Inter', size: 11 } } }
                        },
                        scales: {
                            x: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                            },
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                grid: { drawOnChartArea: false },
                                ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                            }
                        }
                    }
                });
            }

            // ----------------------------------------------------
            // CHART 2: PLATFORM DISTRIBUTION (DOUGHNUT)
            // ----------------------------------------------------
            if (platformCanvasRef.current && platformData) {
                const { platforms, platformViews } = platformData;
                platformChartRef.current = new Chart(platformCanvasRef.current, {
                    type: 'doughnut',
                    data: {
                        labels: platforms,
                        datasets: [{
                            data: platformViews,
                            backgroundColor: ['#e1306c', '#00f2fe', '#ff0000'],
                            borderWidth: darkMode ? 1 : 2,
                            borderColor: darkMode ? '#0f1011' : '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'right',
                                labels: { color: textColor, font: { family: 'Inter', size: 11 } } 
                            }
                        }
                    }
                });
            }

            // ----------------------------------------------------
            // CHART 3: VIEWS BY PIC (BAR)
            // ----------------------------------------------------
            if (picCanvasRef.current && picData) {
                const { picLabels, picViews } = picData;
                picChartRef.current = new Chart(picCanvasRef.current, {
                    type: 'bar',
                    data: {
                        labels: picLabels,
                        datasets: [{
                            label: 'Views',
                            data: picViews,
                            backgroundColor: '#5e6ad2',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            x: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                            },
                            y: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                            }
                        }
                    }
                });
            }

            // ----------------------------------------------------
            // CHART 4: CATEGORY DISTRIBUTION (POLAR AREA)
            // ----------------------------------------------------
            if (categoryCanvasRef.current && categoryData) {
                const { catLabels, catViews } = categoryData;
                categoryChartRef.current = new Chart(categoryCanvasRef.current, {
                    type: 'polarArea',
                    data: {
                        labels: catLabels,
                        datasets: [{
                            data: catViews,
                            backgroundColor: [
                                'rgba(94, 106, 210, 0.65)',
                                'rgba(26, 174, 57, 0.65)',
                                'rgba(223, 139, 0, 0.65)',
                                'rgba(235, 87, 87, 0.65)',
                                'rgba(0, 117, 222, 0.65)',
                                'rgba(127, 0, 255, 0.65)'
                            ],
                            borderColor: darkMode ? '#0f1011' : '#ffffff',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'right',
                                labels: { color: textColor, font: { family: 'Inter', size: 11 } } 
                            }
                        },
                        scales: {
                            r: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, backdropColor: 'transparent', font: { family: 'Inter', size: 9 } }
                            }
                        }
                    }
                });
            }
        }, 80);

        return () => {
            clearTimeout(renderTimer);
            if (trendChartRef.current) trendChartRef.current.destroy();
            if (platformChartRef.current) platformChartRef.current.destroy();
            if (picChartRef.current) picChartRef.current.destroy();
            if (categoryChartRef.current) categoryChartRef.current.destroy();
        };
    }, [hasData, activeData, darkMode]);

    if (!isUnlocked) {
        return <LockScreen sectionName="Analytics" />;
    }

    return (
        <section className="charts-section" id="chartsSection" style={{ display: 'block' }}>
            {!hasData ? (
                <div style={{
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%', 
                    minHeight: '400px',
                    color: 'var(--ink-muted)',
                    background: 'var(--canvas-subtle)',
                    border: '1.5px dashed var(--hairline)',
                    borderRadius: 'var(--radius-md)',
                    padding: '30px'
                }}>
                    <i className="fa-solid fa-chart-simple" style={{ fontSize: '40px', marginBottom: '12px', color: 'var(--primary)' }}></i>
                    <h4 style={{ fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '4px' }}>No Data Available for Analytics</h4>
                    <p style={{ fontSize: '12px', margin: 0, textAlign: 'center' }}>
                        No records found in the database. Please add data to display statistical distributions.
                    </p>
                </div>
            ) : (
                <>
                    {/* 1. STATS CARDS SECTION (Copied from Dashboard tab to be visible in Analytics view) */}
                    <section className="stats-section" id="statsSection" style={{ display: 'block', marginBottom: '24px', padding: 0 }}>
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

                    {/* 2. KPI DISTRIBUTION SUMMARY WIDGETS */}
                    <section className="panel kpi-measures-panel" style={{ marginBottom: '24px', padding: '20px', borderRadius: 'var(--radius-lg, 12px)', background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-sm)' }}>
                        <div className="panel-header" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2><span className="panel-icon"><i className="fa-solid fa-trophy text-warning"></i></span> KPI Distribution Measures</h2>
                        </div>
                        <div id="analyticsKpiMeasuresGrid" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ background: 'rgba(94, 106, 210, 0.12)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⭐ KPI 6 (Exceptional): <span style={{ fontWeight: 800, fontSize: '15px' }}>{kpiDistribution.kpiCount6}</span>
                            </div>
                            <div style={{ background: 'rgba(39, 166, 68, 0.12)', color: 'var(--success)', border: '1px solid var(--success)', padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🌟 KPI 5 (Excellent): <span style={{ fontWeight: 800, fontSize: '15px' }}>{kpiDistribution.kpiCount5}</span>
                            </div>
                            <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', border: '1px solid var(--warning)', padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ✨ KPI 4 (Good): <span style={{ fontWeight: 800, fontSize: '15px' }}>{kpiDistribution.kpiCount4}</span>
                            </div>
                            <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🎯 KPI 3 (Average): <span style={{ fontWeight: 800, fontSize: '15px' }}>{kpiDistribution.kpiCount3}</span>
                            </div>
                        </div>
                    </section>

                    {/* 3. VISUAL SUMMARY WIDGETS (Leaderboard, Creator Performance) */}
                    <div className="leaderboards-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '24px' }}>
                        {/* Left Column: Top 5 Content Leaderboard */}
                        <div className="leaderboard-section">
                            <div className="panel leaderboard-card" style={{ height: '100%' }}>
                                <div className="panel-header">
                                    <h2><span className="panel-icon"><i className="fa-solid fa-trophy text-warning"></i></span> Top 5 Performing Contents</h2>
                                </div>
                                <div className="table-container" style={{ minHeight: 'auto' }}>
                                    <table className="leaderboard-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                                                <th>Content Title</th>
                                                <th>PIC</th>
                                                <th>Platform</th>
                                                <th>Views</th>
                                                <th>Engagement Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topContents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No contents found</td>
                                                </tr>
                                            ) : (
                                                topContents.map((row, idx) => {
                                                    const rank = idx + 1;
                                                    const rate = parseFloat(row['Engagement Rate (%)']) || 0;
                                                    return (
                                                        <tr key={`${row.ID}-${idx}`} className="leaderboard-row">
                                                            <td className={`leaderboard-rank leaderboard-rank-${rank}`} style={{ textAlign: 'center' }}>
                                                                {rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                                            </td>
                                                            <td><strong>{row['Content Title'] || 'Untitled'}</strong></td>
                                                            <td><span className={`badge ${getPicBadgeClass(row.PIC)}`}>{normalizePicName(row.PIC)}</span></td>
                                                            <td><span dangerouslySetInnerHTML={createSafeHtml(getPlatformBadgeHtml(row.Platform))}></span></td>
                                                            <td><strong>{formatNumber(row.Views)}</strong></td>
                                                            <td>{rate.toFixed(2)}%</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Creator Performance Analysis */}
                        <div className="leaderboard-section">
                            <div className="panel leaderboard-card" style={{ height: '100%' }}>
                                <div className="panel-header">
                                    <h2><span className="panel-icon"><i className="fa-solid fa-users text-primary"></i></span> Creator Performance Analysis</h2>
                                </div>
                                <div className="table-container" style={{ minHeight: 'auto' }}>
                                    <table className="leaderboard-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                                                <th>Creator Name</th>
                                                <th>Total Views</th>
                                                <th>Total Posts (CTD)</th>
                                                <th>Avg. Views / Post (CTD)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {creatorLeaderboard.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No creators found</td>
                                                </tr>
                                            ) : (
                                                creatorLeaderboard.map((creator, idx) => {
                                                    const rank = idx + 1;
                                                    const postCount = creator.posts.size;
                                                    const avgViews = postCount > 0 ? Math.round(creator.views / postCount) : 0;
                                                    return (
                                                        <tr key={creator.name} className="leaderboard-row">
                                                            <td className={`leaderboard-rank leaderboard-rank-${rank}`} style={{ textAlign: 'center' }}>
                                                                {rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                                            </td>
                                                            <td><span className={`badge ${getPicBadgeClass(creator.name)}`}>{creator.name}</span></td>
                                                            <td><strong>{formatNumber(creator.views)}</strong></td>
                                                            <td>{postCount} items</td>
                                                            <td><strong>{formatNumber(avgViews)}</strong></td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. KPI CONTENT EXPLORER */}
                    <div className="leaderboard-section" style={{ marginBottom: '24px' }}>
                        <div className="panel leaderboard-card">
                            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: 'var(--space-md)' }}>
                                <h2 style={{ margin: 0 }}><span className="panel-icon"><i className="fa-solid fa-magnifying-glass-chart text-success"></i></span> KPI Content Explorer</h2>
                                <div className="kpi-selector-buttons" style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" className={`btn btn-outline btn-sm ${kpiExplorerScore === 5 ? 'active' : ''}`} onClick={() => setKpiExplorerScore(5)}>KPI 5</button>
                                    <button type="button" className={`btn btn-outline btn-sm ${kpiExplorerScore === 4 ? 'active' : ''}`} onClick={() => setKpiExplorerScore(4)}>KPI 4</button>
                                    <button type="button" className={`btn btn-outline btn-sm ${kpiExplorerScore === 3 ? 'active' : ''}`} onClick={() => setKpiExplorerScore(3)}>KPI 3</button>
                                </div>
                            </div>
                            <div id="kpiExplorerCategorySummary" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 'var(--space-md)', fontSize: '13px', padding: '0 var(--space-lg)' }}>
                                <span style={{ fontWeight: 600, marginRight: '8px' }}>Content Types:</span>
                                {explorerCategories.length === 0 ? (
                                    <span style={{ color: 'var(--ink-muted)' }}>No contents in this KPI range</span>
                                ) : (
                                    explorerCategories.map(([cat, count]) => (
                                        <span key={cat} className="badge" style={{ background: 'var(--canvas)', border: '1px solid var(--hairline-strong)', padding: '4px 8px', borderRadius: '12px', fontWeight: 500, fontSize: '11px' }}>
                                            {cat}: {count}
                                        </span>
                                    ))
                                )}
                            </div>
                            <div className="table-container" id="kpiExplorerTableContainer" style={{ minHeight: 'auto' }}>
                                <table className="leaderboard-table">
                                    <thead>
                                        <tr>
                                            <th>Content Title</th>
                                            <th>Category</th>
                                            <th>Creator (PIC)</th>
                                            <th>Platform</th>
                                            <th>Views</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {explorerRows.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-muted)' }}>No contents found.</td>
                                            </tr>
                                        ) : (
                                            explorerRows.map((row, idx) => (
                                                <tr key={`${row.ID}-${idx}`} className="leaderboard-row">
                                                    <td><strong>{row['Content Title'] || 'Untitled'}</strong></td>
                                                    <td>{row.Category || '-'}</td>
                                                    <td><span className={`badge ${getPicBadgeClass(row.PIC)}`}>{normalizePicName(row.PIC)}</span></td>
                                                    <td><span dangerouslySetInnerHTML={createSafeHtml(getPlatformBadgeHtml(row.Platform))}></span></td>
                                                    <td><strong>{formatNumber(row.Views)}</strong></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 5. CHARTS GRID */}
                    <div className="charts-grid">
                        {/* Chart 1: Performance Trend */}
                        <div className="panel chart-card full-width">
                            <div className="panel-header">
                                <h2>
                                    <span className="panel-icon"><i className="fa-solid fa-chart-line"></i></span> Performance Trend
                                </h2>
                            </div>
                            <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
                                <canvas ref={trendCanvasRef}></canvas>
                            </div>
                        </div>

                        {/* Chart 2: Platform Distribution */}
                        <div className="panel chart-card">
                            <div className="panel-header">
                                <h2>
                                    <span className="panel-icon"><i className="fa-solid fa-chart-pie"></i></span> Platform Share (Views)
                                </h2>
                            </div>
                            <div className="chart-container" style={{ position: 'relative', height: '240px' }}>
                                <canvas ref={platformCanvasRef}></canvas>
                            </div>
                        </div>

                        {/* Chart 3: PIC Performance */}
                        <div className="panel chart-card">
                            <div className="panel-header">
                                <h2>
                                    <span className="panel-icon"><i className="fa-solid fa-chart-simple"></i></span> Views by PIC
                                </h2>
                            </div>
                            <div className="chart-container" style={{ position: 'relative', height: '240px' }}>
                                <canvas ref={picCanvasRef}></canvas>
                            </div>
                        </div>

                        {/* Chart 4: Category Distribution */}
                        <div className="panel chart-card full-width">
                            <div className="panel-header">
                                <h2>
                                    <span className="panel-icon"><i className="fa-solid fa-chart-simple"></i></span> Category Distribution (Views)
                                </h2>
                            </div>
                            <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
                                <canvas ref={categoryCanvasRef}></canvas>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
