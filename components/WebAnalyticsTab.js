'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';

export default function WebAnalyticsTab() {
    const { 
        isUnlocked, 
        userRole, 
        gaSummaryData, 
        gaItemsData, 
        saveGaSummary, 
        saveGaItem, 
        deleteGaItem 
    } = useDashboard();

    // Tab state (mapped to database category strings)
    const [activeTab, setActiveTab] = useState('pages'); // 'pages', 'referrers', 'keywords', 'trending'

    const getFullUrl = (label) => {
        if (!label) return '#';
        if (label.startsWith('http://') || label.startsWith('https://')) {
            return label;
        }
        const cleanLabel = label.startsWith('/') ? label : '/' + label;
        if (cleanLabel.startsWith('/game')) {
            return `https://socs.binus.ac.id${cleanLabel}`;
        }
        return `https://socs.binus.ac.id/game${cleanLabel}`;
    };
    
    // Manage mode toggle for list items
    const [isManageMode, setIsManageMode] = useState(false);

    // Modals state
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Active item being edited/deleted
    const [editingItem, setEditingItem] = useState(null); // null for adding new item
    const [deletingItem, setDeletingItem] = useState(null);

    // Form inputs state
    const [summaryForm, setSummaryForm] = useState({
        visitors: '',
        pageviews: '',
        new_visits: '',
        avg_time_on_site: '',
        engagement_rate: ''
    });

    const [itemForm, setItemForm] = useState({
        label: '',
        metric: ''
    });

    // Inline editing states for the 5 summary cards
    const [tempSummary, setTempSummary] = useState({
        visitors: '',
        pageviews: '',
        new_visits: '',
        avg_time_on_site: '',
        engagement_rate: ''
    });

    useEffect(() => {
        if (gaSummaryData) {
            setTempSummary({
                visitors: gaSummaryData.visitors || '',
                pageviews: gaSummaryData.pageviews || '',
                new_visits: gaSummaryData.new_visits || '',
                avg_time_on_site: gaSummaryData.avg_time_on_site || '',
                engagement_rate: gaSummaryData.engagement_rate || ''
            });
        }
    }, [gaSummaryData]);

    const handleInlineSaveSummary = async (field, value) => {
        if (value === gaSummaryData?.[field]) return;

        const updatedSummary = {
            visitors: gaSummaryData?.visitors || '',
            pageviews: gaSummaryData?.pageviews || '',
            new_visits: gaSummaryData?.new_visits || '',
            avg_time_on_site: gaSummaryData?.avg_time_on_site || '',
            engagement_rate: gaSummaryData?.engagement_rate || '',
            ...tempSummary,
            [field]: value
        };

        const success = await saveGaSummary(updatedSummary);
        if (!success) {
            // Revert state if failed
            setTempSummary(prev => ({
                ...prev,
                [field]: gaSummaryData?.[field] || ''
            }));
        }
    };

    if (!isUnlocked && userRole !== 'Viewer') {
        return <LockScreen sectionName="Web Analytics" />;
    }

    const canEdit = userRole === 'Admin' || userRole === 'Creator';

    // Tabs definition
    const tabs = [
        { id: 'pages', label: 'Top Pages' },
        { id: 'referrers', label: 'Top Referrers' },
        { id: 'keywords', label: 'Top Keyword' },
        { id: 'trending', label: 'Trending Topic' }
    ];

    // Filter items based on active tab
    const filteredItems = (gaItemsData || [])
        .filter(item => item.category === activeTab)
        .sort((a, b) => (b.sort_order - a.sort_order) || (a.id - b.id));

    // Summary modal trigger
    const handleOpenSummaryModal = () => {
        setSummaryForm({
            visitors: gaSummaryData?.visitors || '',
            pageviews: gaSummaryData?.pageviews || '',
            new_visits: gaSummaryData?.new_visits || '',
            avg_time_on_site: gaSummaryData?.avg_time_on_site || '',
            engagement_rate: gaSummaryData?.engagement_rate || ''
        });
        setIsSummaryModalOpen(true);
    };

    const handleSaveSummary = async (e) => {
        e.preventDefault();
        const success = await saveGaSummary(summaryForm);
        if (success) {
            setIsSummaryModalOpen(false);
        }
    };

    // Item modal trigger
    const handleOpenAddItemModal = () => {
        setEditingItem(null);
        setItemForm({
            label: '',
            metric: ''
        });
        setIsItemModalOpen(true);
    };

    const handleOpenEditItemModal = (item) => {
        setEditingItem(item);
        setItemForm({
            label: item.label || '',
            metric: item.metric || ''
        });
        setIsItemModalOpen(true);
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        const payload = {
            id: editingItem?.id,
            category: activeTab,
            label: itemForm.label,
            metric: itemForm.metric
        };
        const success = await saveGaItem(payload);
        if (success) {
            setIsItemModalOpen(false);
        }
    };

    const handleOpenDeleteItemModal = (item) => {
        setDeletingItem(item);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingItem) return;
        const success = await deleteGaItem(deletingItem.id);
        if (success) {
            setIsDeleteModalOpen(false);
            setDeletingItem(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface-container/30 border border-outline-variant/20 rounded-xl p-5 gap-4">
                <div className="space-y-1">
                    <h3 className="text-headline-lg font-bold text-on-surface">Web Analytics</h3>
                    <p className="text-on-surface-variant font-body-sm">Track website traffic, SEO keywords, referrer channels, and engagement statistics.</p>
                </div>
                {canEdit && (
                    <button 
                        onClick={() => setIsManageMode(!isManageMode)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-body-sm font-semibold transition-all duration-200 shadow-sm micro-interaction ${
                            isManageMode 
                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/15'
                                : 'bg-surface-container-high border-outline-variant/30 text-on-surface hover:bg-surface-container-highest'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {isManageMode ? 'edit_off' : 'edit'}
                        </span>
                        <span>{isManageMode ? 'Exit Manage Mode' : 'Manage Data'}</span>
                    </button>
                )}
            </div>

            {/* Premium Bento Grid for Summary Metrics */}
            <div className="bg-surface-container-lowest/40 border border-outline-variant/15 rounded-2xl p-6 space-y-6 shadow-md relative overflow-hidden">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <h4 className="text-body-sm font-bold text-on-surface tracking-wide uppercase">Google Analytics last 3 month</h4>
                    {canEdit && (
                        <button 
                            onClick={handleOpenSummaryModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 rounded-lg text-[11px] font-bold transition-all micro-interaction"
                        >
                            <span className="material-symbols-outlined text-[16px]">settings</span>
                            <span>EDIT METRICS</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Metric 1: Visitors */}
                    <div className="bg-surface-container-low/50 border border-outline-variant/20 rounded-xl p-4 space-y-2 group hover:border-primary/20 transition-all duration-300">
                        <div className="flex justify-between items-center text-on-surface-variant/70">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Visitors</span>
                            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">group</span>
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-outline-variant/35 focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-headline-md font-bold text-on-surface tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
                                        value={tempSummary.visitors}
                                        onChange={(e) => setTempSummary({ ...tempSummary, visitors: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            }
                                        }}
                                        onBlur={(e) => handleInlineSaveSummary('visitors', e.target.value)}
                                    />
                                    {tempSummary.visitors !== gaSummaryData?.visitors && (
                                        <span className="material-symbols-outlined text-[16px] text-primary animate-pulse select-none shrink-0" title="Saving on blur...">sync</span>
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-headline-md font-bold text-on-surface tracking-tight font-mono">
                                    {gaSummaryData?.visitors || '—'}
                                </h4>
                            )}
                            <p className="text-[10px] text-on-surface-variant/60 leading-normal">
                                Angka ini menunjukan jumlah semua pengunjung di semua halaman.
                            </p>
                        </div>
                    </div>

                    {/* Metric 2: Pageviews */}
                    <div className="bg-surface-container-low/50 border border-outline-variant/20 rounded-xl p-4 space-y-2 group hover:border-primary/20 transition-all duration-300">
                        <div className="flex justify-between items-center text-on-surface-variant/70">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Pageviews</span>
                            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">visibility</span>
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-outline-variant/35 focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-headline-md font-bold text-on-surface tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
                                        value={tempSummary.pageviews}
                                        onChange={(e) => setTempSummary({ ...tempSummary, pageviews: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            }
                                        }}
                                        onBlur={(e) => handleInlineSaveSummary('pageviews', e.target.value)}
                                    />
                                    {tempSummary.pageviews !== gaSummaryData?.pageviews && (
                                        <span className="material-symbols-outlined text-[16px] text-primary animate-pulse select-none shrink-0" title="Saving on blur...">sync</span>
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-headline-md font-bold text-on-surface tracking-tight font-mono">
                                    {gaSummaryData?.pageviews || '—'}
                                </h4>
                            )}
                            <p className="text-[10px] text-on-surface-variant/60 leading-normal">
                                Angka ini menunjukkan berapa banyak halaman yang telah dilihat oleh pengunjung.
                            </p>
                        </div>
                    </div>

                    {/* Metric 3: New Visits */}
                    <div className="bg-surface-container-low/50 border border-outline-variant/20 rounded-xl p-4 space-y-2 group hover:border-primary/20 transition-all duration-300">
                        <div className="flex justify-between items-center text-on-surface-variant/70">
                            <span className="text-[10px] font-bold uppercase tracking-wider">New Visits</span>
                            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">person_add</span>
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-outline-variant/35 focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-headline-md font-bold text-on-surface tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
                                        value={tempSummary.new_visits}
                                        onChange={(e) => setTempSummary({ ...tempSummary, new_visits: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            }
                                        }}
                                        onBlur={(e) => handleInlineSaveSummary('new_visits', e.target.value)}
                                    />
                                    {tempSummary.new_visits !== gaSummaryData?.new_visits && (
                                        <span className="material-symbols-outlined text-[16px] text-primary animate-pulse select-none shrink-0" title="Saving on blur...">sync</span>
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-headline-md font-bold text-on-surface tracking-tight font-mono">
                                    {gaSummaryData?.new_visits || '—'}
                                </h4>
                            )}
                            <p className="text-[10px] text-on-surface-variant/60 leading-normal">
                                Angka ini menunjukan jumlah yang dimungkinkan adalah pengunjung baru.
                            </p>
                        </div>
                    </div>

                    {/* Metric 4: Avg Time on Site */}
                    <div className="bg-surface-container-low/50 border border-outline-variant/20 rounded-xl p-4 space-y-2 group hover:border-primary/20 transition-all duration-300">
                        <div className="flex justify-between items-center text-on-surface-variant/70">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Avg. Time on Site</span>
                            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">schedule</span>
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-outline-variant/35 focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-headline-md font-bold text-on-surface tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
                                        value={tempSummary.avg_time_on_site}
                                        onChange={(e) => setTempSummary({ ...tempSummary, avg_time_on_site: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            }
                                        }}
                                        onBlur={(e) => handleInlineSaveSummary('avg_time_on_site', e.target.value)}
                                    />
                                    {tempSummary.avg_time_on_site !== gaSummaryData?.avg_time_on_site && (
                                        <span className="material-symbols-outlined text-[16px] text-primary animate-pulse select-none shrink-0" title="Saving on blur...">sync</span>
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-headline-md font-bold text-on-surface tracking-tight font-mono">
                                    {gaSummaryData?.avg_time_on_site || '—'}
                                </h4>
                            )}
                            <p className="text-[10px] text-on-surface-variant/60 leading-normal">
                                Rata-rata waktu yang dihabiskan oleh pengunjung di situs web.
                            </p>
                        </div>
                    </div>

                    {/* Metric 5: Engagement Rate */}
                    <div className="bg-surface-container-low/50 border border-outline-variant/20 rounded-xl p-4 space-y-2 group hover:border-primary/20 transition-all duration-300">
                        <div className="flex justify-between items-center text-on-surface-variant/70">
                            <span className="text-[10px] font-bold uppercase tracking-wider">% Engagement Rate</span>
                            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">insights</span>
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-outline-variant/35 focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-headline-md font-bold text-on-surface tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
                                        value={tempSummary.engagement_rate}
                                        onChange={(e) => setTempSummary({ ...tempSummary, engagement_rate: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            }
                                        }}
                                        onBlur={(e) => handleInlineSaveSummary('engagement_rate', e.target.value)}
                                    />
                                    {tempSummary.engagement_rate !== gaSummaryData?.engagement_rate && (
                                        <span className="material-symbols-outlined text-[16px] text-primary animate-pulse select-none shrink-0" title="Saving on blur...">sync</span>
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-headline-md font-bold text-on-surface tracking-tight font-mono">
                                    {gaSummaryData?.engagement_rate || '—'}
                                </h4>
                            )}
                            <p className="text-[10px] text-on-surface-variant/60 leading-normal">
                                Persentase metrik yang menunjukkan seberapa aktif pengguna berinteraksi dengan site.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Details Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 shadow-xl space-y-6 relative">
                {/* Tab Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/10 pb-1">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-none">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`pb-3 text-body-md font-semibold border-b-2 transition-all duration-200 outline-none whitespace-nowrap ${
                                        isActive
                                            ? 'border-orange-500 text-orange-500 dark:text-orange-400 font-bold'
                                            : 'border-transparent text-on-surface-variant/60 hover:text-on-surface hover:border-outline-variant/35'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                    {isManageMode && (
                        <button
                            onClick={handleOpenAddItemModal}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary hover:opacity-95 rounded-lg text-body-sm font-semibold transition-all shadow-md micro-interaction"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span>Add Item</span>
                        </button>
                    )}
                </div>

                {/* Items List Content */}
                <div className="min-h-[250px] space-y-4">
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                            <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30">analytics</span>
                            <p className="text-on-surface-variant/60 text-body-sm">No statistics added for this tab yet.</p>
                            {isManageMode && (
                                <button 
                                    onClick={handleOpenAddItemModal} 
                                    className="text-primary hover:underline text-xs font-semibold"
                                >
                                    Add the first item
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-outline-variant/10 font-sans">
                            {filteredItems.map((item, index) => {
                                return (
                                    <div 
                                        key={item.id} 
                                        className="flex items-center justify-between py-3.5 group hover:bg-surface-container-low/20 px-2 rounded-lg transition-colors duration-150"
                                    >
                                        <div className="flex items-center space-x-4 min-w-0 pr-4">
                                            {/* Rank Index */}
                                            <span className="text-body-sm font-bold text-on-surface/80 w-6 shrink-0">
                                                {index + 1}.
                                            </span>

                                            {/* Value Capsule Badge */}
                                            <span className="bg-zinc-850 dark:bg-zinc-700 text-zinc-100 dark:text-zinc-200 text-[11px] font-semibold px-2.5 py-1 rounded-md font-mono shrink-0 select-none shadow-sm min-w-[90px] text-center border border-zinc-750/50">
                                                {item.metric}
                                            </span>

                                            {/* Target Label / URL Link */}
                                            {activeTab === 'pages' ? (
                                                <a 
                                                    href={getFullUrl(item.label)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-sky-600 dark:text-sky-400 hover:underline break-all text-body-sm font-medium"
                                                >
                                                    {item.label}
                                                </a>
                                            ) : (
                                                <span className="text-on-surface/90 break-all text-body-sm font-medium">
                                                    {item.label}
                                                </span>
                                            )}
                                        </div>

                                        {/* CRUD controls in Manage Mode */}
                                        {isManageMode && (
                                            <div className="flex items-center space-x-1.5 shrink-0 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenEditItemModal(item)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-high hover:bg-primary/10 hover:text-primary text-on-surface-variant transition-colors micro-interaction"
                                                    title="Edit Item"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDeleteItemModal(item)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-high hover:bg-error/10 hover:text-error text-on-surface-variant transition-colors micro-interaction"
                                                    title="Delete Item"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Edit Summary Metrics */}
            {isSummaryModalOpen && createPortal(
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
                    <div className="w-full max-w-md bg-surface-container border border-outline-variant/30 rounded-xl p-6 shadow-2xl space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                            <h3 className="text-headline-sm font-bold text-on-surface">Edit Summary Metrics</h3>
                            <button className="text-on-surface-variant hover:text-on-surface p-1 micro-interaction" onClick={() => setIsSummaryModalOpen(false)}>
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveSummary} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">Visitors</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                                    placeholder="e.g. ± 6K"
                                    value={summaryForm.visitors}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, visitors: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">Pageviews</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                                    placeholder="e.g. 201"
                                    value={summaryForm.pageviews}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, pageviews: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">New Visits</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                                    placeholder="e.g. ± 6K"
                                    value={summaryForm.new_visits}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, new_visits: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">Avg. Time on Site</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                                    placeholder="e.g. 00:01:24"
                                    value={summaryForm.avg_time_on_site}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, avg_time_on_site: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">Engagement Rate</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                                    placeholder="e.g. 48%"
                                    value={summaryForm.engagement_rate}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, engagement_rate: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                                <button 
                                    type="button" 
                                    className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction" 
                                    onClick={() => setIsSummaryModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">save</span>
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Add/Edit List Item */}
            {isItemModalOpen && createPortal(
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
                    <div className="w-full max-w-md bg-surface-container border border-outline-variant/30 rounded-xl p-6 shadow-2xl space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                            <h3 className="text-headline-sm font-bold text-on-surface">
                                {editingItem ? 'Edit Analytics Item' : 'Add Analytics Item'}
                            </h3>
                            <button className="text-on-surface-variant hover:text-on-surface p-1 micro-interaction" onClick={() => setIsItemModalOpen(false)}>
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Category Indicator Badge */}
                        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-body-sm font-semibold select-none">
                            <span>Tab Category</span>
                            <span className="uppercase text-[11px] bg-primary text-on-primary px-2 py-0.5 rounded tracking-wider">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </span>
                        </div>

                        <form onSubmit={handleSaveItem} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">Label / Link URL</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                                    placeholder="e.g. /game/mecha-chameleon or Google"
                                    value={itemForm.label}
                                    onChange={(e) => setItemForm({ ...itemForm, label: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">Metric / Value</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                                    placeholder="e.g. 1.2K views or +85% spike"
                                    value={itemForm.metric}
                                    onChange={(e) => setItemForm({ ...itemForm, metric: e.target.value })}
                                />
                            </div>



                            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                                <button 
                                    type="button" 
                                    className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction" 
                                    onClick={() => setIsItemModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">save</span>
                                    <span>Save Item</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Confirm Delete Item */}
            {isDeleteModalOpen && createPortal(
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
                    <div className="w-full max-w-md bg-surface-container border border-outline-variant/30 rounded-xl p-6 shadow-2xl space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 text-error pb-2 border-b border-outline-variant/20">
                            <span className="material-symbols-outlined text-[24px]">warning</span>
                            <h3 className="text-headline-sm font-bold text-on-surface">Delete Analytics Item</h3>
                        </div>

                        <div className="space-y-2">
                            <p className="text-on-surface-variant text-body-sm">
                                Are you sure you want to delete this statistic item? This action is permanent and cannot be undone.
                            </p>
                            {deletingItem && (
                                <div className="p-3 bg-surface-container-low border border-outline-variant/25 rounded flex items-center gap-3">
                                    <span className="bg-zinc-800 text-zinc-100 text-[10px] font-mono px-2 py-0.5 rounded">
                                        {deletingItem.metric}
                                    </span>
                                    <span className="text-body-sm font-medium text-on-surface truncate break-all">
                                        {deletingItem.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                type="button" 
                                className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction" 
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setDeletingItem(null);
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="bg-error text-on-error hover:opacity-90 font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction flex items-center gap-1.5"
                                onClick={handleDeleteConfirm}
                            >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                <span>Delete Item</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
