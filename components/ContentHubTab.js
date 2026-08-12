'use client';

import React, { useState, useEffect } from 'react';
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
            showAlert('💾 Storyboard draft updated!', 'success');
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
                showAlert('📋 Copywriting copied to clipboard!', 'success');
            })
            .catch(err => {
                showAlert('❌ Failed to copy text: ' + err.message, 'error');
            });
    };

    const schedule = getResolvedSchedule(formTitle);

    if (!isUnlocked) {
        return <LockScreen sectionName="Content Hub" />;
    }



    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center bg-surface-container border border-outline-variant/30 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">Posts Library</span>
                    <span className="px-2.5 py-0.5 bg-surface-container-highest/50 border border-outline-variant/30 text-on-surface-variant rounded-md font-mono text-[11px]">
                        {filteredDrafts.length} visible of {(draftsData || []).length} drafts
                    </span>
                </div>
                {isUnlocked && userRole !== 'Creator' && (
                    <button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm micro-interaction"
                        onClick={handleCreateDraft}
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span> New Draft
                    </button>
                )}
            </div>

            {/* Backlog Grid & Editor Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">

                {/* Left Side: Idea Backlog (col-span-1) */}
                <div className="glass-panel border border-outline-variant/30 rounded-xl p-4 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                        <h4 className="font-bold text-body-sm text-on-surface uppercase tracking-wider">Idea Backlog</h4>

                        {userRole !== 'Creator' && (
                            <div>
                                <select
                                    value={picFilter}
                                    onChange={(e) => setPicFilter(e.target.value)}
                                    className="bg-surface-container-low border border-outline-variant/30 text-on-surface-variant rounded px-2 py-1 text-[11px] font-bold uppercase focus:outline-none"
                                >
                                    <option value="">All PICs</option>
                                    {memberListData.map(m => (
                                        <option key={m.NAMA} value={m.NAMA}>{m.NAMA}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Category quick selectors */}
                    <div className="flex flex-wrap gap-1.5 border-b border-outline-variant/15 pb-2.5" aria-label="Filter drafts by category">
                        <button
                            type="button"
                            className={`min-w-14 flex-1 font-bold py-1.5 px-2 rounded text-[11px] uppercase transition-colors cursor-pointer text-center ${categoryFilter === '' ? 'bg-primary text-on-primary' : 'bg-surface-container-high border border-outline-variant/25 text-on-surface-variant hover:text-on-surface'
                                }`}
                            onClick={() => setCategoryFilter('')}
                        >
                            All
                        </button>
                        {visibleCategories.map((category) => (
                            <button
                                key={category.name}
                                type="button"
                                className={`min-w-fit flex-1 font-bold py-1.5 px-2 rounded text-[11px] uppercase transition-colors cursor-pointer text-center ${categoryFilter === category.name ? 'bg-primary text-on-primary' : 'bg-surface-container-high border border-outline-variant/25 text-on-surface-variant hover:text-on-surface'}`}
                                onClick={() => setCategoryFilter(category.name)}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>

                    {/* Search query input */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 flex items-center">
                            <span className="material-symbols-outlined text-[18px]">search</span>
                        </span>
                        <input
                            type="text"
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded pl-9 pr-3 py-1.5 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary transition-all"
                            placeholder="Search backlog drafts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Draft backlog items list */}
                    <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                        {filteredDrafts.length === 0 ? (
                            <div className="py-12 text-center text-on-surface-variant/50 text-[12px] space-y-2">
                                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">find_in_page</span>
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

                                let badgeClass = 'bg-sky-500/10 text-sky-400 border border-sky-500/20'; // Idea
                                if (displayStatus === 'Scripting') {
                                    badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20'; // Scripting
                                } else if (displayStatus === 'Uploaded') {
                                    badgeClass = 'bg-emerald-500/15 text-primary border border-primary/25'; // Uploaded
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
                                        className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-2 relative ${isSelected
                                                ? 'bg-surface-container-high border-2 border-primary'
                                                : 'bg-surface-container-low border-outline-variant/15 hover:bg-surface-container'
                                            }`}
                                    >
                                        <p className="font-semibold text-on-surface text-body-sm leading-snug">{d.title || 'Untitled Draft'}</p>

                                        <div className="flex justify-between items-center gap-2 mt-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant/80 uppercase">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${d.category === 'Motion' ? 'bg-primary' : 'bg-emerald-400'
                                                        }`}></span>
                                                    {d.category}
                                                </span>
                                                {sched && (
                                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${getPicBadgeClasses(sched.pic)}`}>
                                                        {normalizePicName(sched.pic)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase ${badgeClass}`}>
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
                <div className="creative-editor lg:col-span-2 glass-panel border border-outline-variant/30 rounded-xl p-5 shadow-xl min-h-[400px]">
                    {!selectedDraftTitle ? (
                        <div className="h-full flex flex-col justify-center items-center text-center p-12 space-y-4">
                            <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30">edit_note</span>
                            <div className="space-y-1">
                                <h3 className="font-bold text-body-sm text-on-surface uppercase tracking-wider">No Draft Selected</h3>
                                <p className="text-[12px] text-on-surface-variant/80 max-w-xs">Select a draft script from the idea backlog sidebar or create a new draft to begin writing.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="space-y-5" autoComplete="off">
                            {draftRecovered && <p role="status" className="draft-recovery-note"><span className="material-symbols-outlined" aria-hidden="true">restore</span>Recovered unsaved storyboard changes from this browser.</p>}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-outline-variant/20 pb-3 gap-3">
                                <div>
                                    <h4 className="font-bold text-body-md text-on-surface">Storyboard Script Editor</h4>
                                    {schedule ? (
                                        <p className="text-[11px] text-on-surface-variant/80 mt-1">
                                            Mapped to schedule: <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${getPicBadgeClasses(schedule.pic)}`}>{schedule.pic}</span> on {schedule.date}
                                        </p>
                                    ) : (
                                        <p className="text-[11px] text-error flex items-center gap-1 mt-1 font-semibold">
                                            <span className="material-symbols-outlined text-[14px]">warning</span> Draft is not currently mapped to any Scheduled Task.
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isUnlocked && userRole !== 'Creator' && (
                                        <button
                                            type="button"
                                            className="bg-error-container/20 text-error border border-error/25 hover:bg-error-container/30 font-bold py-1.5 px-3 rounded text-[11px] uppercase transition-colors flex items-center gap-1 cursor-pointer"
                                            onClick={handleDeleteDraft}
                                        >
                                            <span className="material-symbols-outlined text-[15px]">delete</span> Delete
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest font-bold py-1.5 px-3 rounded text-[11px] uppercase transition-colors flex items-center gap-1 cursor-pointer"
                                        onClick={() => requestDraftSelection(null)}
                                    >
                                        <span className="material-symbols-outlined text-[15px]">close</span> Close
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Draft Title <span className="text-error">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface-variant/70 focus:outline-none cursor-not-allowed opacity-75"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        required
                                        disabled={true}
                                        placeholder="Enter content title..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Category <span className="text-error">*</span></label>
                                    <select
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-2 text-body-sm text-on-surface-variant/70 focus:outline-none cursor-not-allowed opacity-75"
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
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Viral Hook Template / Caption Hook</label>
                                    <input
                                        type="text"
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                        placeholder="e.g. Stop doing X, do this instead..."
                                        value={formHook}
                                        onChange={(e) => setFormHook(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Script Voiceover / Audio Directions</label>
                                    <textarea
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary font-mono"
                                        rows={6}
                                        placeholder="Write video dialogue, voiceover cues, or visual notes here..."
                                        value={formScript}
                                        onChange={(e) => setFormScript(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Hashtags <span className="text-error">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                        placeholder="e.g. #technology #learning #tutorial"
                                        value={formHashtags}
                                        onChange={(e) => setFormHashtags(e.target.value)}
                                        disabled={!isUnlocked}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Caption / Post Description</label>
                                    <textarea
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                        rows={3}
                                        placeholder="Write the accompanying caption, description copy, or call to actions..."
                                        value={formCaption}
                                        onChange={(e) => setFormCaption(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Reference Links (comma separated)</label>
                                    <textarea
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary font-mono"
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
                                    <button type="submit" disabled={isMutating} aria-busy={isMutating ? 'true' : 'false'} className="flex-1 bg-primary text-on-primary hover:opacity-90 font-bold py-2.5 px-4 rounded-lg text-body-sm transition-opacity flex items-center justify-center gap-1.5 cursor-pointer micro-interaction shadow-sm disabled:cursor-wait disabled:opacity-70">
                                        <span className={`material-symbols-outlined text-[18px] ${isMutating ? 'animate-spin' : ''}`}>{isMutating ? 'progress_activity' : 'save'}</span> {isMutating ? 'Saving…' : 'Save Script Draft'}
                                    </button>
                                )}
                                <button type="button" className="flex-1 bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest font-bold py-2.5 px-4 rounded-lg text-body-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer micro-interaction" onClick={handleCopyCopywriting}>
                                    <span className="material-symbols-outlined text-[18px]">content_copy</span> Copy Copywriting
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
