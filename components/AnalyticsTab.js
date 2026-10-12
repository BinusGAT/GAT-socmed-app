'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { 
    normalizePicName, 
    formatNumber,
    parseDate,
    aggregateAllChartsData,
    getPicBadgeClasses,
    resolveMemberName,
    getPicDisplayName
} from '../utils/helpers';
import PlatformBadge from './PlatformBadge.jsx';
import Icon from './Icon';

export default function AnalyticsTab({ chartReady = false }) {
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
        memberListData,
        isUnlocked
    } = useDashboard();

    const [hasData, setHasData] = useState(false);

    // KPI Explorer state
    const [kpiExplorerScore, setKpiExplorerScore] = useState(5);
    const [kpiExplorerCategory, setKpiExplorerCategory] = useState('All');

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

    const activeData = [...currentData];

    // Determine data availability
    useEffect(() => {
        if (activeData.length === 0) {
            setHasData(false);
            return;
        }
        setHasData(true);
    }, [activeData]);

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

    const getExplorerMatchingRows = () => {
        return activeData
            .filter(row => {
                const views = parseInt(row.Views) || 0;
                let score = 3;
                if (views >= 100000) score = 6;
                else if (views >= 10000) score = 5;
                else if (views >= 1000) score = 4;
                
                if (score !== kpiExplorerScore) return false;
                
                if (kpiExplorerCategory !== 'All') {
                    if (row.Category !== kpiExplorerCategory) return false;
                }
                
                return true;
            })
            .sort((a, b) => (parseInt(b.Views) || 0) - (parseInt(a.Views) || 0));
    };

    const explorerRows = getExplorerMatchingRows();

    const uniqueCategories = Array.from(
        new Set(
            activeData
                .map(row => row.Category)
                .filter(Boolean)
        )
    ).sort();

    const getExplorerCategorySummary = () => {
        const counts = {};
        explorerRows.forEach(row => {
            const cat = row.Category || 'Unknown';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts);
    };

    const explorerCategories = getExplorerCategorySummary();

    const getTopPerformingContents = () => {
        return [...activeData]
            .sort((a, b) => (parseInt(b.Views) || 0) - (parseInt(a.Views) || 0))
            .slice(0, 5);
    };

    const topContents = getTopPerformingContents();

    const getCreatorLeaderboard = () => {
        const creators = {};
        activeData.forEach(row => {
            const resolved = resolveMemberName(row.PIC, memberListData);
            const pic = getPicDisplayName(resolved || row.PIC);
            if (!pic) return;

            const key = pic.toLowerCase();
            if (!creators[key]) {
                creators[key] = {
                    name: pic,
                    views: 0,
                    posts: new Set()
                };
            }
            creators[key].views += parseInt(row.Views) || 0;
            if (row['Content Title']) {
                creators[key].posts.add(row['Content Title'].trim());
            }
        });

        return Object.values(creators).sort((a, b) => b.views - a.views);
    };

    const creatorLeaderboard = getCreatorLeaderboard();
    const accessibleChartData = aggregateAllChartsData(activeData, memberListData);
    const describeSeries = (labels = [], values = []) => labels.map((label, index) => `${label}: ${formatNumber(values[index] || 0)}`).join('; ');

    // Chart lifecycle
    useEffect(() => {
        if (!hasData) return;

        const renderTimer = setTimeout(() => {
            if (typeof window === 'undefined' || !window.Chart) return;

            const Chart = window.Chart;
            const { trendData, platformData, picData, categoryData } = aggregateAllChartsData(activeData, memberListData);

            if (trendChartRef.current) trendChartRef.current.destroy();
            if (platformChartRef.current) platformChartRef.current.destroy();
            if (picChartRef.current) picChartRef.current.destroy();
            if (categoryChartRef.current) categoryChartRef.current.destroy();

            const textColor = '#bbcabf';
            const gridColor = 'rgba(255, 255, 255, 0.04)';

            // Trend
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
                                borderColor: '#10b981', // primary Emerald
                                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                borderWidth: 2.5,
                                fill: true,
                                tension: 0.35,
                                yAxisID: 'y'
                            },
                            {
                                label: 'Engagement',
                                data: engagementData,
                                borderColor: '#89ceff', // secondary Light Blue
                                backgroundColor: 'rgba(137, 206, 255, 0.05)',
                                borderWidth: 2.5,
                                fill: true,
                                tension: 0.35,
                                yAxisID: 'y1'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { labels: { color: textColor, font: { family: 'Inter', size: 10 } } }
                        },
                        scales: {
                            x: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Inter', size: 9 } }
                            },
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Inter', size: 9 } }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                grid: { drawOnChartArea: false },
                                ticks: { color: textColor, font: { family: 'Inter', size: 9 } }
                            }
                        }
                    }
                });
            }

            // Platform share
            if (platformCanvasRef.current && platformData) {
                const { platforms, platformViews } = platformData;
                platformChartRef.current = new Chart(platformCanvasRef.current, {
                    type: 'doughnut',
                    data: {
                        labels: platforms,
                        datasets: [{
                            data: platformViews,
                            backgroundColor: ['#f43f5e', '#2dd4bf', '#ef4444'],
                            borderWidth: 1,
                            borderColor: '#131b2e'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'right',
                                labels: { color: textColor, font: { family: 'Inter', size: 10 } } 
                            }
                        }
                    }
                });
            }

            // Views by PIC
            if (picCanvasRef.current && picData) {
                const { picLabels, picViews } = picData;
                picChartRef.current = new Chart(picCanvasRef.current, {
                    type: 'bar',
                    data: {
                        labels: picLabels,
                        datasets: [{
                            label: 'Views',
                            data: picViews,
                            backgroundColor: '#10b981',
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
                                ticks: { color: textColor, font: { family: 'Inter', size: 9 } }
                            },
                            y: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Inter', size: 9 } }
                            }
                        }
                    }
                });
            }

            // Category polar area
            if (categoryCanvasRef.current && categoryData) {
                const { catLabels, catViews } = categoryData;
                categoryChartRef.current = new Chart(categoryCanvasRef.current, {
                    type: 'polarArea',
                    data: {
                        labels: catLabels,
                        datasets: [{
                            data: catViews,
                            backgroundColor: [
                                'rgba(16, 185, 129, 0.65)',
                                'rgba(137, 206, 255, 0.65)',
                                'rgba(163, 230, 53, 0.65)',
                                'rgba(251, 113, 133, 0.65)',
                                'rgba(251, 191, 36, 0.65)',
                                'rgba(99, 102, 241, 0.65)'
                            ],
                            borderColor: '#131b2e',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'right',
                                labels: { color: textColor, font: { family: 'Inter', size: 10 } } 
                            }
                        },
                        scales: {
                            r: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, backdropColor: 'transparent', font: { family: 'Inter', size: 8 } }
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
    }, [hasData, activeData, chartReady]);

    if (!isUnlocked) {
        return <LockScreen sectionName="Analytics" />;
    }



    return (
        <div className="space-y-6">
            


            {!hasData ? (
                <div className="p-16 text-center space-y-3 bg-surface border border-border rounded-lg">
                    <Icon name="bar_chart" size={48} className="text-muted-foreground/30 mx-auto" />
                    <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">No Data Available for Analytics</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        There are no published rows in the Database. Populate entries to visualize statistical distributions.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* 1. KPI distribution pills summary */}
                    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-2.5">
                        <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Master KPI Distribution Measures</span>
                        
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                                <Icon name="workspace_premium" size={14} /> KPI 6 (Exceptional): {kpiDistribution.kpiCount6}
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1.5">
                                <Icon name="star" size={14} /> KPI 5 (Excellent): {kpiDistribution.kpiCount5}
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                                <Icon name="grade" size={14} /> KPI 4 (Good): {kpiDistribution.kpiCount4}
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                                <Icon name="flag" size={14} /> KPI 3 (Average): {kpiDistribution.kpiCount3}
                            </span>
                        </div>
                    </div>

                    {/* 2. Stats bento cards (Dynamic summary) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                        <div className="bg-surface border border-border p-4 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Titles</span>
                                <Icon name="tag" size={16} className="text-primary" />
                            </div>
                            <h4 className="text-xl font-bold font-mono text-foreground">{stats.contentTitlesSize}</h4>
                        </div>
                        <div className="bg-surface border border-border p-4 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Total Views</span>
                                <Icon name="trending_up" size={16} className="text-primary" />
                            </div>
                            <h4 className="text-xl font-bold font-mono text-foreground">{formatNumber(stats.totalViews)}</h4>
                        </div>
                        <div className="bg-surface border border-border p-4 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Total Reach</span>
                                <Icon name="public" size={16} className="text-primary" />
                            </div>
                            <h4 className="text-xl font-bold font-mono text-foreground">{formatNumber(stats.totalReach)}</h4>
                        </div>
                        <div className="bg-surface border border-border p-4 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Engagement</span>
                                <Icon name="favorite" size={16} className="text-rose-500" />
                            </div>
                            <h4 className="text-xl font-bold font-mono text-foreground">{formatNumber(stats.totalEngagement)}</h4>
                        </div>
                        <div className="bg-surface border border-border p-4 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Eng. Rate</span>
                                <Icon name="percent" size={16} className="text-emerald-500" />
                            </div>
                            <h4 className="text-xl font-bold font-mono text-foreground">{stats.avgEngagementRate}</h4>
                        </div>
                    </div>

                    {/* 3. Leaderboards: Content vs Creator */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                        
                        {/* Top 5 content list */}
                        <div className="bg-surface border border-border rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                                <Icon name="emoji_events" size={16} className="text-amber-400" />
                                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Top 5 Content Leaders</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border">
                                        <tr>
                                            <th className="px-4 py-2.5 text-center w-14 font-medium">Rank</th>
                                            <th className="px-4 py-2.5 font-medium">Content Title</th>
                                            <th className="px-4 py-2.5 font-medium">PIC</th>
                                            <th className="px-4 py-2.5 font-medium">Platform</th>
                                            <th className="px-4 py-2.5 text-right font-medium">Views</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {topContents.map((row, idx) => (
                                            <tr key={`${row.ID}-${idx}`} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 text-center">
                                                    {idx === 0 ? (
                                                        <Icon name="trophy" size={16} weight="fill" className="text-amber-400 mx-auto" />
                                                    ) : idx === 1 ? (
                                                        <Icon name="trophy" size={16} weight="fill" className="text-zinc-400 mx-auto" />
                                                    ) : idx === 2 ? (
                                                        <Icon name="trophy" size={16} weight="fill" className="text-amber-600 mx-auto" />
                                                    ) : (
                                                        <span className="text-xs font-mono font-medium text-muted-foreground">{idx + 1}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate" title={row['Content Title']}>
                                                    {row['Content Title']}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-medium uppercase ${getPicBadgeClasses(row.PIC)}`}>
                                                        {getPicDisplayName(row.PIC)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <PlatformBadge platform={row.Platform} />
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                                                    {formatNumber(row.Views)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Creator performance leaderboard */}
                        <div className="bg-surface border border-border rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                                <Icon name="groups" size={16} className="text-primary" />
                                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Creator Analytics Performance</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border">
                                        <tr>
                                            <th className="px-4 py-2.5 text-center w-14 font-medium">Rank</th>
                                            <th className="px-4 py-2.5 font-medium">Creator Name</th>
                                            <th className="px-4 py-2.5 text-right font-medium">Total Views</th>
                                            <th className="px-4 py-2.5 text-center font-medium">Total Posts</th>
                                            <th className="px-4 py-2.5 text-right font-medium">Avg Views</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {creatorLeaderboard.map((creator, idx) => {
                                            const postCount = creator.posts.size;
                                            const avgViews = postCount > 0 ? Math.round(creator.views / postCount) : 0;

                                            return (
                                                <tr key={creator.name} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 text-center">
                                                        {idx === 0 ? (
                                                            <Icon name="trophy" size={16} weight="fill" className="text-amber-400 mx-auto" />
                                                        ) : idx === 1 ? (
                                                            <Icon name="trophy" size={16} weight="fill" className="text-zinc-400 mx-auto" />
                                                        ) : idx === 2 ? (
                                                            <Icon name="trophy" size={16} weight="fill" className="text-amber-600 mx-auto" />
                                                        ) : (
                                                            <span className="text-xs font-mono font-medium text-muted-foreground">{idx + 1}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-medium uppercase ${getPicBadgeClasses(creator.name)}`}>
                                                            {creator.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                                                        {formatNumber(creator.views)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono text-muted-foreground text-xs">
                                                        {postCount} posts
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-medium text-primary">
                                                        {formatNumber(avgViews)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 4. KPI Content Explorer */}
                    <div className="bg-surface border border-border rounded-lg overflow-hidden space-y-4">
                        <div className="px-4 py-3 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Icon name="manage_search" size={16} className="text-primary" /> KPI Content Explorer
                            </h4>

                            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                                {/* Category Filter select */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-medium">Category:</span>
                                    <select 
                                        className="bg-background border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                                        value={kpiExplorerCategory}
                                        onChange={(e) => setKpiExplorerCategory(e.target.value)}
                                    >
                                        <option value="All">All Categories</option>
                                        {uniqueCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* KPI Selector buttons */}
                                <div className="flex bg-muted/40 border border-border rounded-md p-0.5 text-[10px] font-mono font-medium uppercase">
                                    {[6, 5].map(k => (
                                        <button
                                            key={k}
                                            type="button"
                                            className={`px-2.5 py-0.5 rounded cursor-pointer transition-all ${
                                                kpiExplorerScore === k ? 'bg-surface text-primary border border-border' : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            onClick={() => setKpiExplorerScore(k)}
                                        >
                                            KPI {k}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Content categories breakdown for selected KPI filter */}
                        <div className="flex flex-wrap gap-1.5 px-4 py-0.5 text-xs items-center text-muted-foreground">
                            <span className="font-medium text-foreground">Categories summary:</span>
                            {explorerCategories.length === 0 ? (
                                <span className="text-xs italic text-muted-foreground/60">No contents in this scope</span>
                            ) : (
                                explorerCategories.map(([cat, count]) => (
                                    <span key={cat} className="px-2 py-0.5 rounded bg-muted/40 border border-border text-[10px] font-medium text-foreground font-mono">
                                        {cat}: {count}
                                    </span>
                                ))
                            )}
                        </div>

                        {/* Explorer items table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-t border-border">
                                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border">
                                    <tr>
                                        <th className="px-4 py-2.5 font-medium">Content Title</th>
                                        <th className="px-4 py-2.5 font-medium">Category</th>
                                        <th className="px-4 py-2.5 font-medium">Creator (PIC)</th>
                                        <th className="px-4 py-2.5 font-medium">Platform</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Views</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {explorerRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-muted-foreground italic">
                                                No database entries matching KPI {kpiExplorerScore} and {kpiExplorerCategory} category filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        explorerRows.map((row, idx) => (
                                            <tr key={`${row.ID}-${idx}`} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-foreground max-w-[260px] truncate" title={row['Content Title']}>
                                                    {row['Content Title']}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{row.Category || 'Story Telling'}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-medium uppercase ${getPicBadgeClasses(row.PIC)}`}>
                                                        {getPicDisplayName(row.PIC)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <PlatformBadge platform={row.Platform} />
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                                                    {formatNumber(row.Views)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 5. Charts Grid sections */}
                    <div className="space-y-5">
                        {/* Line Chart */}
                        <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
                            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Icon name="timeline" size={16} className="text-primary" /> Views & Engagement Trend
                            </h4>
                            <div className="h-80 w-full relative">
                                <canvas ref={trendCanvasRef} role="img" aria-label="Views and engagement trend chart" aria-describedby="trend-chart-summary"></canvas>
                                <p id="trend-chart-summary" className="sr-only">Views by date: {describeSeries(accessibleChartData.trendData?.sortedDates, accessibleChartData.trendData?.viewsData)}. Engagement by date: {describeSeries(accessibleChartData.trendData?.sortedDates, accessibleChartData.trendData?.engagementData)}.</p>
                            </div>
                        </div>

                        {/* Two columns charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                            <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
                                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Icon name="pie_chart" size={16} className="text-primary" /> Platform Distribution
                                </h4>
                                <div className="h-64 w-full relative">
                                    <canvas ref={platformCanvasRef} role="img" aria-label="Platform distribution chart" aria-describedby="platform-chart-summary"></canvas>
                                    <p id="platform-chart-summary" className="sr-only">Views by platform: {describeSeries(accessibleChartData.platformData?.platforms, accessibleChartData.platformData?.platformViews)}.</p>
                                </div>
                            </div>
                            <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
                                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Icon name="bar_chart" size={16} className="text-primary" /> Total Views by Creator
                                </h4>
                                <div className="h-64 w-full relative">
                                    <canvas ref={picCanvasRef} role="img" aria-label="Total views by creator chart" aria-describedby="creator-chart-summary"></canvas>
                                    <p id="creator-chart-summary" className="sr-only">Views by creator: {describeSeries(accessibleChartData.picData?.picLabels, accessibleChartData.picData?.picViews)}.</p>
                                </div>
                            </div>
                        </div>

                        {/* Polar Area chart */}
                        <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
                            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Icon name="bubble_chart" size={16} className="text-primary" /> Category Share (Views)
                            </h4>
                            <div className="h-80 w-full relative">
                                <canvas ref={categoryCanvasRef} role="img" aria-label="Category share by views chart" aria-describedby="category-chart-summary"></canvas>
                                <p id="category-chart-summary" className="sr-only">Views by category: {describeSeries(accessibleChartData.categoryData?.catLabels, accessibleChartData.categoryData?.catViews)}.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
