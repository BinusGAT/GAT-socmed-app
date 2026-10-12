'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
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
        <div className="space-y-6 pb-12">
            {canEdit && (
                <div className="flex justify-end">
                    <button 
                        onClick={() => setIsManageMode(!isManageMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-all ${
                            isManageMode 
                                ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15' 
                                : 'bg-surface border-border text-foreground hover:bg-muted'
                        }`}
                    >
                        <Icon name={isManageMode ? 'edit_off' : 'edit'} size={14} />
                        <span>{isManageMode ? 'Exit Manage Mode' : 'Manage Data'}</span>
                    </button>
                </div>
            )}

            {/* Bento Grid for Summary Metrics */}
            <div className="bg-surface border border-border rounded-lg p-5 space-y-4 relative">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Google Analytics last 3 months</h4>
                    {canEdit && (
                        <button 
                            onClick={handleOpenSummaryModal}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border text-foreground hover:bg-muted rounded-md text-[11px] font-medium transition-colors"
                        >
                            <Icon name="settings" size={13} />
                            <span>Edit Metrics</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {/* Metric 1: Visitors */}
                    <div className="bg-muted/20 border border-border rounded-md p-3.5 space-y-1.5 group hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-medium">Visitors</span>
                            <Icon name="group" size={15} className="group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-border focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-xl font-bold text-foreground tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
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
                                        <Icon name="sync" size={14} className="text-primary animate-spin select-none shrink-0" title="Saving on blur..." />
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-xl font-bold text-foreground tracking-tight font-mono">
                                    {gaSummaryData?.visitors || '-'}
                                </h4>
                            )}
                            <p className="text-[10px] text-muted-foreground leading-normal">
                                Angka ini menunjukan jumlah semua pengunjung di semua halaman.
                            </p>
                        </div>
                    </div>

                    {/* Metric 2: Pageviews */}
                    <div className="bg-muted/20 border border-border rounded-md p-3.5 space-y-1.5 group hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-medium">Pageviews</span>
                            <Icon name="visibility" size={15} className="group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-border focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-xl font-bold text-foreground tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
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
                                        <Icon name="sync" size={14} className="text-primary animate-spin select-none shrink-0" title="Saving on blur..." />
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-xl font-bold text-foreground tracking-tight font-mono">
                                    {gaSummaryData?.pageviews || '-'}
                                </h4>
                            )}
                            <p className="text-[10px] text-muted-foreground leading-normal">
                                Angka ini menunjukkan berapa banyak halaman yang telah dilihat oleh pengunjung.
                            </p>
                        </div>
                    </div>

                    {/* Metric 3: New Visits */}
                    <div className="bg-muted/20 border border-border rounded-md p-3.5 space-y-1.5 group hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-medium">New Visits</span>
                            <Icon name="person_add" size={15} className="group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-border focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-xl font-bold text-foreground tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
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
                                        <Icon name="sync" size={14} className="text-primary animate-spin select-none shrink-0" title="Saving on blur..." />
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-xl font-bold text-foreground tracking-tight font-mono">
                                    {gaSummaryData?.new_visits || '-'}
                                </h4>
                            )}
                            <p className="text-[10px] text-muted-foreground leading-normal">
                                Angka ini menunjukan jumlah yang dimungkinkan adalah pengunjung baru.
                            </p>
                        </div>
                    </div>

                    {/* Metric 4: Avg Time on Site */}
                    <div className="bg-muted/20 border border-border rounded-md p-3.5 space-y-1.5 group hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-medium">Avg. Time on Site</span>
                            <Icon name="schedule" size={15} className="group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-border focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-xl font-bold text-foreground tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
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
                                        <Icon name="sync" size={14} className="text-primary animate-spin select-none shrink-0" title="Saving on blur..." />
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-xl font-bold text-foreground tracking-tight font-mono">
                                    {gaSummaryData?.avg_time_on_site || '-'}
                                </h4>
                            )}
                            <p className="text-[10px] text-muted-foreground leading-normal">
                                Rata-rata waktu yang dihabiskan oleh pengunjung di situs web.
                            </p>
                        </div>
                    </div>

                    {/* Metric 5: Engagement Rate */}
                    <div className="bg-muted/20 border border-border rounded-md p-3.5 space-y-1.5 group hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-medium">% Engagement Rate</span>
                            <Icon name="insights" size={15} className="group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1">
                            {isManageMode ? (
                                <div className="flex items-center gap-1.5 border-b border-border focus-within:border-primary transition-colors">
                                    <input
                                        type="text"
                                        className="bg-transparent text-xl font-bold text-foreground tracking-tight font-mono w-full focus:outline-none py-0.5 select-all"
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
                                        <Icon name="sync" size={14} className="text-primary animate-spin select-none shrink-0" title="Saving on blur..." />
                                    )}
                                </div>
                            ) : (
                                <h4 className="text-xl font-bold text-foreground tracking-tight font-mono">
                                    {gaSummaryData?.engagement_rate || '-'}
                                </h4>
                            )}
                            <p className="text-[10px] text-muted-foreground leading-normal">
                                Persentase metrik yang menunjukkan seberapa aktif pengguna berinteraksi dengan site.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Details Card */}
            <div className="bg-surface border border-border rounded-lg p-5 space-y-4 relative">
                {/* Tab Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-1">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-none">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`pb-2.5 text-xs font-medium border-b-2 transition-colors outline-none whitespace-nowrap cursor-pointer ${
                                        isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded-md text-xs font-medium transition-opacity cursor-pointer"
                        >
                            <Icon name="add" size={14} />
                            <span>Add Item</span>
                        </button>
                    )}
                </div>

                {/* Items List Content */}
                <div className="min-h-[250px] space-y-2">
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                            <Icon name="analytics" size={32} className="text-muted-foreground/30 mx-auto" />
                            <p className="text-muted-foreground text-xs">No statistics added for this tab yet.</p>
                            {isManageMode && (
                                <button 
                                    onClick={handleOpenAddItemModal} 
                                    className="text-primary hover:underline text-xs font-medium cursor-pointer"
                                >
                                    Add the first item
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-border font-sans">
                            {filteredItems.map((item, index) => {
                                return (
                                    <div 
                                        key={item.id} 
                                        className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3.5 min-w-0 pr-4">
                                            {/* Rank Index */}
                                            <span className="text-xs font-mono font-medium text-muted-foreground w-6 shrink-0">
                                                {index + 1}.
                                            </span>

                                            {/* Value Capsule Badge */}
                                            <span className="bg-muted text-foreground text-xs font-mono font-medium px-2 py-0.5 rounded border border-border shrink-0 select-none min-w-[80px] text-center">
                                                {item.metric}
                                            </span>

                                            {/* Target Label / URL Link */}
                                            {activeTab === 'pages' ? (
                                                <a 
                                                    href={getFullUrl(item.label)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline break-all text-xs font-medium"
                                                >
                                                    {item.label}
                                                </a>
                                            ) : (
                                                <span className="text-foreground break-all text-xs font-medium">
                                                    {item.label}
                                                </span>
                                            )}
                                        </div>

                                        {/* CRUD controls in Manage Mode */}
                                        {isManageMode && (
                                            <div className="flex items-center space-x-1 shrink-0">
                                                <button
                                                    onClick={() => handleOpenEditItemModal(item)}
                                                    className="w-7 h-7 rounded-md flex items-center justify-center bg-surface border border-border hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors cursor-pointer"
                                                    title="Edit Item"
                                                >
                                                    <Icon name="edit" size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDeleteItemModal(item)}
                                                    className="w-7 h-7 rounded-md flex items-center justify-center bg-surface border border-border hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground transition-colors cursor-pointer"
                                                    title="Delete Item"
                                                >
                                                    <Icon name="delete" size={13} />
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
                    <div className="w-full max-w-md bg-surface border border-border rounded-lg p-5 shadow-2xl space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-xs font-semibold text-foreground">Edit Summary Metrics</h3>
                            <button className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer transition-colors" onClick={() => setIsSummaryModalOpen(false)}>
                                <Icon name="close" size={15} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSummary} className="space-y-3.5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase font-medium">Visitors</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                    placeholder="e.g. ± 6K"
                                    value={summaryForm.visitors}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, visitors: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase font-medium">Pageviews</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                    placeholder="e.g. 201"
                                    value={summaryForm.pageviews}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, pageviews: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase font-medium">New Visits</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                    placeholder="e.g. ± 6K"
                                    value={summaryForm.new_visits}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, new_visits: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase font-medium">Avg. Time on Site</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                    placeholder="e.g. 00:01:24"
                                    value={summaryForm.avg_time_on_site}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, avg_time_on_site: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase font-medium">Engagement Rate</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                    placeholder="e.g. 48%"
                                    value={summaryForm.engagement_rate}
                                    onChange={(e) => setSummaryForm({ ...summaryForm, engagement_rate: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-border">
                                <button 
                                    type="button" 
                                    className="bg-surface border border-border text-foreground hover:bg-muted font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer" 
                                    onClick={() => setIsSummaryModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-primary text-primary-foreground hover:opacity-90 font-medium py-1.5 px-3 rounded-md text-xs transition-opacity cursor-pointer flex items-center gap-1.5"
                                >
                                    <Icon name="save" size={14} />
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
                    <div className="w-full max-w-md bg-surface border border-border rounded-lg p-5 shadow-2xl space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-xs font-semibold text-foreground">
                                {editingItem ? 'Edit Analytics Item' : 'Add Analytics Item'}
                            </h3>
                            <button className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer transition-colors" onClick={() => setIsItemModalOpen(false)}>
                                <Icon name="close" size={15} />
                            </button>
                        </div>

                        {/* Category Indicator Badge */}
                        <div className="flex items-center justify-between p-2.5 bg-primary/10 border border-primary/20 rounded-md text-primary text-xs font-medium select-none">
                            <span>Tab Category</span>
                            <span className="uppercase text-[10px] font-mono bg-primary text-primary-foreground px-2 py-0.5 rounded tracking-wider">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </span>
                        </div>

                        <form onSubmit={handleSaveItem} className="space-y-3.5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Label / Link URL</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                    placeholder="e.g. /game/mecha-chameleon or Google"
                                    value={itemForm.label}
                                    onChange={(e) => setItemForm({ ...itemForm, label: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Metric / Value</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors font-mono"
                                    placeholder="e.g. 1.2K views or +85% spike"
                                    value={itemForm.metric}
                                    onChange={(e) => setItemForm({ ...itemForm, metric: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-border">
                                <button 
                                    type="button" 
                                    className="bg-surface border border-border text-foreground hover:bg-muted font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer" 
                                    onClick={() => setIsItemModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-primary text-primary-foreground hover:opacity-90 font-medium py-1.5 px-3 rounded-md text-xs transition-opacity cursor-pointer flex items-center gap-1.5"
                                >
                                    <Icon name="save" size={14} />
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
                    <div className="w-full max-w-md bg-surface border border-border rounded-lg p-5 shadow-2xl space-y-4 animate-fade-in">
                        <div className="flex items-center gap-2 text-rose-500 pb-2 border-b border-border">
                            <Icon name="warning" size={18} />
                            <h3 className="text-xs font-semibold text-foreground">Delete Analytics Item</h3>
                        </div>

                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs">
                                Are you sure you want to delete this statistic item? This action is permanent and cannot be undone.
                            </p>
                            {deletingItem && (
                                <div className="p-2.5 bg-muted/40 border border-border rounded-md flex items-center gap-2.5">
                                    <span className="bg-muted text-foreground text-[10px] font-mono px-2 py-0.5 rounded border border-border">
                                        {deletingItem.metric}
                                    </span>
                                    <span className="text-xs font-medium text-foreground truncate break-all">
                                        {deletingItem.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <button 
                                type="button" 
                                className="bg-surface border border-border text-foreground hover:bg-muted font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer" 
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setDeletingItem(null);
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="bg-rose-600 hover:bg-rose-700 text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                onClick={handleDeleteConfirm}
                            >
                                <Icon name="delete" size={14} />
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
