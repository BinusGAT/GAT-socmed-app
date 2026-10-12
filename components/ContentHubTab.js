'use client';

import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import DiscardChangesModal from './DiscardChangesModal';
import { useUnsavedChanges } from '../utils/useUnsavedChanges';
import { DeleteConfirmModal } from './Modals';
import UndoDeleteToast from './UndoDeleteToast';
import { useDeferredDelete } from '../utils/useDeferredDelete';
import { getVisiblePostLibraryCategories } from '../utils/postLibraryCategories';
import { isTaskAssignedToUser } from '../utils/rolePermissions';
import {
    normalizePicName,
    getPicDisplayName,
    parseDate,
    getPicBadgeClasses
} from '../utils/helpers';

export default function ContentHubTab() {
    const {
        draftsData,
        scheduleData,
        currentData,
        isUnlocked,
        isMutating,
        userRole,
        saveScriptDraft,
        deleteScriptDraft,
        showAlert,
        memberListData,
        categoriesData,
        appSettingsData,
        userId,
        userName
    } = useDashboard();

    const [selectedDraftTitle, setSelectedDraftTitle] = useState(null);
    const [searchQuery, setSearchQuery] = useState(() => typeof window === 'undefined' ? '' : localStorage.getItem('GAT_content_filter_search') || '');
    const [categoryFilter, setCategoryFilter] = useState(() => typeof window === 'undefined' ? '' : localStorage.getItem('GAT_content_filter_category') || '');
    const [picFilter, setPicFilter] = useState(() => typeof window === 'undefined' ? '' : localStorage.getItem('GAT_content_filter_pic') || '');

    // Editor Form State
    const [formTitle, setFormTitle] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formStatus, setFormStatus] = useState('Idea');
    const [formHook, setFormHook] = useState('');
    const [formScript, setFormScript] = useState('');
    const [formHashtags, setFormHashtags] = useState('');
    const [formCaption, setFormCaption] = useState('');
    const [formReferences, setFormReferences] = useState('');
    const [initialFormState, setInitialFormState] = useState(null);
    const [draftRecovered, setDraftRecovered] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);
    const [pendingDraftTitle, setPendingDraftTitle] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const { pendingDeletion, scheduleDelete, undoDelete } = useDeferredDelete();
    const visibleCategories = getVisiblePostLibraryCategories(
        categoriesData,
        appSettingsData?.post_library_hidden_categories
    );
    const visibleCategoryNames = new Set(visibleCategories.map((category) => category.name));

    const currentFormState = { title: formTitle, category: formCategory, status: formStatus, hook: formHook, script: formScript, hashtags: formHashtags, caption: formCaption, references: formReferences };
    const isFormDirty = Boolean(selectedDraftTitle && initialFormState && JSON.stringify(currentFormState) !== JSON.stringify(initialFormState));
    const draftStorageKey = selectedDraftTitle ? `GAT_storyboard_editor_draft:${userId || 'anonymous'}:${selectedDraftTitle}` : null;
    useUnsavedChanges(isFormDirty);

    useEffect(() => {
        localStorage.setItem('GAT_content_filter_search', searchQuery);
        localStorage.setItem('GAT_content_filter_category', categoryFilter);
        localStorage.setItem('GAT_content_filter_pic', picFilter);
    }, [searchQuery, categoryFilter, picFilter]);

    useEffect(() => {
        if (categoryFilter && !visibleCategoryNames.has(categoryFilter)) {
            setCategoryFilter('');
        }
    }, [categoryFilter, appSettingsData?.post_library_hidden_categories, categoriesData]);

    // Load active draft fields when selection changes
    useEffect(() => {
        const draft = (draftsData || []).find(d => d.title === selectedDraftTitle);
        if (draft) {
            const serverState = { title: draft.title || '', category: draft.category || 'Story Telling', status: draft.status || 'Idea', hook: draft.hook || '', script: draft.script || '', hashtags: draft.hashtags || '', caption: draft.caption || '', references: draft.references || '' };
            let nextState = serverState;
            try {
                const stored = localStorage.getItem(`GAT_storyboard_editor_draft:${userId || 'anonymous'}:${selectedDraftTitle}`);
                if (stored) nextState = JSON.parse(stored);
            } catch {}
            setFormTitle(nextState.title); setFormCategory(nextState.category); setFormStatus(nextState.status);
            setFormHook(nextState.hook); setFormScript(nextState.script); setFormHashtags(nextState.hashtags);
            setFormCaption(nextState.caption); setFormReferences(nextState.references);
            setInitialFormState(serverState);
            setDraftRecovered(JSON.stringify(nextState) !== JSON.stringify(serverState));
        } else {
            setFormTitle('');
            setFormCategory('Story Telling');
            setFormStatus('Idea');
            setFormHook('');
            setFormScript('');
            setFormHashtags('');
            setFormCaption('');
            setFormReferences('');
            setInitialFormState(null);
            setDraftRecovered(false);
        }
    }, [selectedDraftTitle, draftsData, userId]);

    useEffect(() => {
        if (!draftStorageKey || !isFormDirty) return;
        localStorage.setItem(draftStorageKey, JSON.stringify(currentFormState));
    }, [draftStorageKey, isFormDirty, formTitle, formCategory, formStatus, formHook, formScript, formHashtags, formCaption, formReferences]);

    const requestDraftSelection = (title) => {
        if (isFormDirty) {
            setPendingDraftTitle(title ?? '__CLOSE__');
            setIsDiscardOpen(true);
            return;
        }
        setSelectedDraftTitle(title);
    };

    const discardDraftChanges = () => {
        if (draftStorageKey) localStorage.removeItem(draftStorageKey);
        const nextTitle = pendingDraftTitle === '__CLOSE__' ? null : pendingDraftTitle;
        setIsDiscardOpen(false);
        setPendingDraftTitle(null);
        setDraftRecovered(false);
        setSelectedDraftTitle(nextTitle);
    };

    // Resolve PIC and Date from scheduleData
    const getResolvedSchedule = (title) => {
        if (!title) return null;
        const task = (scheduleData || []).find(t =>
            String(t['Content Title'] || '').trim().toLowerCase() === title.trim().toLowerCase()
        );
        if (!task) return null;
        const isUploaded = (currentData || []).some(row =>
            row.ID === task.ID && row.URL && String(row.URL).trim() !== ''
        );
        return { pic: task.PIC, date: task.Date, isUploaded };
    };

    // Filtered drafts list
    const getFilteredDrafts = () => {
        const drafts = (draftsData || [])
            .map((d, index) => ({ d, index }))
            .filter(({ d }) => visibleCategoryNames.has(d.category))
            .filter(({ d }) => userRole !== 'Creator' || (scheduleData || []).some((task) =>
                String(task['Content Title'] || '').trim().toLowerCase() === String(d.title || '').trim().toLowerCase()
                && isTaskAssignedToUser(task, userId, userName)
            ));
        let list = drafts;

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(({ d }) => String(d.title).toLowerCase().includes(q));
        }

        // Category Filter
        if (categoryFilter) {
            list = list.filter(({ d }) => d.category === categoryFilter);
        }

        // PIC Filter
        if (picFilter && userRole !== 'Creator') {
            list = list.filter(({ d }) => {
                const sched = getResolvedSchedule(d.title);
                return sched && normalizePicName(sched.pic) === normalizePicName(picFilter);
            });
        }

        // Sort: Latest scheduled task date first
        list.sort((a, b) => {
            const schedA = getResolvedSchedule(a.d.title);
            const schedB = getResolvedSchedule(b.d.title);

            const timestampA = schedA && parseDate(schedA.date) ? new Date(parseDate(schedA.date)).getTime() : 0;
            const timestampB = schedB && parseDate(schedB.date) ? new Date(parseDate(schedB.date)).getTime() : 0;

            if (timestampA === 0 && timestampB !== 0) return 1;
            if (timestampB === 0 && timestampA !== 0) return -1;

            if (timestampA !== timestampB) {
                return timestampB - timestampA;
            }
            return b.index - a.index;
        });

        return list;
    };

    const filteredDrafts = getFilteredDrafts();

    // Create a new storyboard draft script
    const handleCreateDraft = async () => {
        if (!isUnlocked) {
            showAlert('Workspace is locked. Please unlock to edit.', 'error');
            return;
        }

        const cat = categoryFilter || visibleCategories[0]?.name;
        if (!cat) {
            showAlert('Show at least one Post Library category in Settings before creating a draft.', 'error');
            return;
        }
        const newDraft = {
            title: `New ${cat} Script ${draftsData.length + 1}`,
            category: cat,
            status: 'Idea',
            origin: 'manual',
            hook: '',
            script: '',
            hashtags: cat === 'Motion' ? '#motion #content' : '#storytelling #content',
            caption: '',
            references: ''
        };

        const success = await saveScriptDraft(newDraft);
        if (success) {
            setSelectedDraftTitle(newDraft.title);
            setTimeout(() => {
                const editorEl = document.querySelector('.creative-editor');
                if (editorEl) {
                    editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!isUnlocked) {
            showAlert('Workspace is locked. Please unlock to edit.', 'error');
            return;
        }

        const currentSched = getResolvedSchedule(formTitle);
        const isUploaded = currentSched ? currentSched.isUploaded : false;

        const updatedDraft = {
            title: formTitle.trim() || 'Untitled',
            category: formCategory,
            status: isUploaded ? 'Uploaded' : (formScript && String(formScript).trim() !== '' ? 'Scripting' : 'Idea'),
            origin: (draftsData || []).find(d => d.title === selectedDraftTitle)?.origin || 'manual',
            hook: formHook,
            script: formScript,
            hashtags: formHashtags,
            caption: formCaption,
            references: formReferences
        };

        const success = await saveScriptDraft(updatedDraft);
        if (success) {
            setSelectedDraftTitle(updatedDraft.title);
            setFormTitle(updatedDraft.title);
            if (draftStorageKey) localStorage.removeItem(draftStorageKey);
            setInitialFormState({
                title: updatedDraft.title,
                category: updatedDraft.category,
                status: updatedDraft.status,
                hook: updatedDraft.hook,
                script: updatedDraft.script,
                hashtags: updatedDraft.hashtags,
                caption: updatedDraft.caption,
                references: updatedDraft.references
            });
            setDraftRecovered(false);
            showAlert('Storyboard draft updated.', 'success');
        }
    };

    const handleDeleteDraft = () => {
        if (!selectedDraftTitle) return;
        const draft = (draftsData || []).find(d => d.title === selectedDraftTitle);
        if (!draft) return;

        if (userRole === 'Creator') {
            showAlert('Creators are not authorized to delete storyboard drafts.', 'error');
            return;
        }

        setIsDeleteOpen(true);
    };

    const confirmDeleteDraft = () => {
        const draftTitle = selectedDraftTitle;
        if (!draftTitle) return;
        scheduleDelete({
            label: draftTitle,
            execute: async () => {
                const success = await deleteScriptDraft(draftTitle);
                if (success) setSelectedDraftTitle(null);
            },
        });
        setIsDeleteOpen(false);
    };

    const handleCopyCopywriting = () => {
        let textToCopy = `Title: ${formTitle}\nHook: ${formHook}\n\nScript:\n${formScript}\n\nTags: ${formHashtags}`;
        if (formCaption) {
            textToCopy += `\n\nCaption:\n${formCaption}`;
        }
        if (formReferences) {
            textToCopy += `\n\nReferences:\n${formReferences}`;
        }

        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showAlert('Copywriting copied to clipboard.', 'success');
            })
            .catch(err => {
				showAlert('Failed to copy text: ' + err.message, 'error');
            });
    };

    const schedule = getResolvedSchedule(formTitle);

    if (!isUnlocked) {
        return <LockScreen sectionName="Content Hub" />;
    }



    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center bg-surface border border-border rounded-lg p-3 sm:p-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Posts Library</span>
                    <span className="px-2 py-0.5 bg-muted border border-border text-muted-foreground rounded-md font-mono text-[11px]">
                        {filteredDrafts.length} visible of {(draftsData || []).length} drafts
                    </span>
                </div>
                {isUnlocked && userRole !== 'Creator' && (
                    <button
                        type="button"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-1.5 px-3 rounded-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                        onClick={handleCreateDraft}
                    >
                        <Icon name="add" size={15} /> New Draft
                    </button>
                )}
            </div>

            {/* Backlog Grid & Editor Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">

                {/* Left Side: Idea Backlog (col-span-1) */}
                <div className="border border-border rounded-lg p-3.5 shadow-xs space-y-3 bg-surface">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Idea Backlog</h4>

                        {userRole !== 'Creator' && (
                            <div>
                                <select
                                    value={picFilter}
                                    onChange={(e) => setPicFilter(e.target.value)}
                                    className="bg-background border border-border text-foreground rounded px-2 py-1 text-[11px] font-medium uppercase focus:outline-none focus:border-primary transition-colors"
                                >
                                    <option value="">All PICs</option>
                                    {memberListData.map(m => (
                                        <option key={m.NAMA} value={m.NAMA}>{getPicDisplayName(m.NAMA)}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Category quick selectors */}
                    <div className="flex flex-wrap gap-1.5 border-b border-border pb-2" aria-label="Filter drafts by category">
                        <button
                            type="button"
                            className={`min-w-12 flex-1 font-medium py-1 px-2 rounded-md text-[11px] uppercase transition-colors cursor-pointer text-center ${categoryFilter === '' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            onClick={() => setCategoryFilter('')}
                        >
                            All
                        </button>
                        {visibleCategories.map((category) => (
                            <button
                                key={category.name}
                                type="button"
                                className={`min-w-fit flex-1 font-medium py-1 px-2 rounded-md text-[11px] uppercase transition-colors cursor-pointer text-center ${categoryFilter === category.name ? 'bg-primary text-primary-foreground' : 'bg-muted/40 border border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                onClick={() => setCategoryFilter(category.name)}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>

                    {/* Search query input */}
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center pointer-events-none">
                            <Icon name="search" size={14} />
                        </span>
                        <input
                            type="text"
                            className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                            placeholder="Search backlog drafts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Draft backlog items list */}
                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                        {filteredDrafts.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
                                <Icon name="find_in_page" size={28} className="text-muted-foreground/35 mx-auto" />
                                <p>No storyboard drafts found</p>
                            </div>
                        ) : (
                            filteredDrafts.map(({ d, index }) => {
                                const sched = getResolvedSchedule(d.title);
                                const isSelected = selectedDraftTitle === d.title;

                                let displayStatus = d.status || 'Idea';
                                if (sched && sched.isUploaded) {
                                    displayStatus = 'Uploaded';
                                }

                                let badgeClass = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'; // Idea
                                if (displayStatus === 'Scripting') {
                                    badgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'; // Scripting
                                } else if (displayStatus === 'Uploaded') {
                                    badgeClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'; // Uploaded
                                }

                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => {
                                            requestDraftSelection(d.title);
                                            setTimeout(() => {
                                                const editorEl = document.querySelector('.creative-editor');
                                                if (editorEl) {
                                                    editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                            }, 50);
                                        }}
                                        className={`w-full text-left p-2.5 rounded-md border transition-all cursor-pointer flex flex-col gap-1.5 relative ${isSelected
                                                ? 'bg-primary/5 border-primary ring-1 ring-primary'
                                                : 'bg-muted/20 border-border hover:bg-muted/40'
                                            }`}
                                    >
                                        <p className="font-medium text-foreground text-xs leading-snug">{d.title || 'Untitled Draft'}</p>

                                        <div className="flex justify-between items-center gap-2 mt-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${d.category === 'Motion' ? 'bg-primary' : 'bg-emerald-400'
                                                        }`}></span>
                                                    {d.category}
                                                </span>
                                                {sched && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${getPicBadgeClasses(sched.pic)}`}>
                                                        {getPicDisplayName(sched.pic)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${badgeClass}`}>
                                                {displayStatus}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Creative Editor Panel (col-span-2) */}
                <div className="creative-editor lg:col-span-2 bg-surface border border-border rounded-lg p-5 min-h-[400px]">
                    {!selectedDraftTitle ? (
                        <div className="h-full flex flex-col justify-center items-center text-center p-12 space-y-3">
                            <Icon name="edit_note" size={48} className="text-muted-foreground/30 mx-auto" />
                            <div className="space-y-1">
                                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">No Draft Selected</h3>
                                <p className="text-xs text-muted-foreground max-w-xs">Select a draft script from the idea backlog sidebar or create a new draft to begin writing.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="space-y-4" autoComplete="off">
                            {draftRecovered && (
                                <p role="status" className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-md">
                                    <Icon name="restore" size={14} aria-hidden="true" />
                                    Recovered unsaved storyboard changes from this browser.
                                </p>
                            )}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-3 gap-3">
                                <div>
                                    <h4 className="font-semibold text-sm text-foreground">Storyboard Script Editor</h4>
                                    {schedule ? (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Mapped to schedule: <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${getPicBadgeClasses(schedule.pic)}`}>{schedule.pic}</span> on {schedule.date}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-rose-500 flex items-center gap-1 mt-0.5 font-medium">
                                            <Icon name="warning" size={14} /> Draft is not currently mapped to any Scheduled Task.
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isUnlocked && userRole !== 'Creator' && (
                                        <button
                                            type="button"
                                            className="bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 font-medium py-1.5 px-3 rounded-md text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                                            onClick={handleDeleteDraft}
                                        >
                                            <Icon name="delete" size={14} /> Delete
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="bg-surface border border-border text-foreground hover:bg-muted font-medium py-1.5 px-3 rounded-md text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                                        onClick={() => requestDraftSelection(null)}
                                    >
                                        <Icon name="close" size={14} /> Close
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Draft Title <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-xs text-muted-foreground focus:outline-none cursor-not-allowed"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        required
                                        disabled={true}
                                        placeholder="Enter content title..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Category <span className="text-rose-500">*</span></label>
                                    <select
                                        className="w-full bg-muted/40 border border-border rounded-md px-2.5 py-2 text-xs text-muted-foreground focus:outline-none cursor-not-allowed"
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        disabled={true}
                                        required
                                    >
                                        {visibleCategories.map(c => (
                                            <option key={c.name} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Viral Hook Template / Caption Hook</label>
                                    <input
                                        type="text"
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                        placeholder="e.g. Stop doing X, do this instead..."
                                        value={formHook}
                                        onChange={(e) => setFormHook(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Script Voiceover / Audio Directions</label>
                                    <textarea
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                        rows={6}
                                        placeholder="Write video dialogue, voiceover cues, or visual notes here..."
                                        value={formScript}
                                        onChange={(e) => setFormScript(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Hashtags <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                        placeholder="e.g. #technology #learning #tutorial"
                                        value={formHashtags}
                                        onChange={(e) => setFormHashtags(e.target.value)}
                                        disabled={!isUnlocked}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Caption / Post Description</label>
                                    <textarea
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                        rows={3}
                                        placeholder="Write the accompanying caption, description copy, or call to actions..."
                                        value={formCaption}
                                        onChange={(e) => setFormCaption(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Reference Links (comma separated)</label>
                                    <textarea
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                                        rows={2}
                                        placeholder="e.g. https://instagram.com/reel/123, https://youtube.com/watch?v=abc"
                                        value={formReferences}
                                        onChange={(e) => setFormReferences(e.target.value)}
                                        disabled={!isUnlocked}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Save Draft & Copy Copywriting Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                {isUnlocked && (
                                    <button
                                        type="submit"
                                        disabled={isMutating}
                                        aria-busy={isMutating ? 'true' : 'false'}
                                        className="flex-1 bg-primary text-primary-foreground hover:opacity-90 font-medium py-2 px-4 rounded-md text-xs transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-wait disabled:opacity-60"
                                    >
                                        <Icon name={isMutating ? 'progress_activity' : 'save'} size={15} className={isMutating ? 'animate-spin' : ''} /> {isMutating ? 'Saving...' : 'Save Script Draft'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="flex-1 bg-surface border border-border text-foreground hover:bg-muted font-medium py-2 px-4 rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                    onClick={handleCopyCopywriting}
                                >
                                    <Icon name="content_copy" size={15} /> Copy Copywriting
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            <DiscardChangesModal isOpen={isDiscardOpen} onKeepEditing={() => { setIsDiscardOpen(false); setPendingDraftTitle(null); }} onDiscard={discardDraftChanges} />
            <DeleteConfirmModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={confirmDeleteDraft} title="Delete storyboard draft?" message={`Delete "${selectedDraftTitle}"? You will have a short window to undo.`} />
            <UndoDeleteToast deletion={pendingDeletion} onUndo={() => { if (undoDelete()) showAlert('Draft deletion canceled.', 'info'); }} />
        </div>
    );
}
