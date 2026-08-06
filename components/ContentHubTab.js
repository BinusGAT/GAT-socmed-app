'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
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
        userRole,
        saveScriptDraft,
        deleteScriptDraft,
        showAlert,
        memberListData,
        categoriesData
    } = useDashboard();

    const [selectedDraftTitle, setSelectedDraftTitle] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [picFilter, setPicFilter] = useState('');

    // Editor Form State
    const [formTitle, setFormTitle] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formStatus, setFormStatus] = useState('Idea');
    const [formHook, setFormHook] = useState('');
    const [formScript, setFormScript] = useState('');
    const [formHashtags, setFormHashtags] = useState('');
    const [formCaption, setFormCaption] = useState('');
    const [formReferences, setFormReferences] = useState('');

    // Load active draft fields when selection changes
    useEffect(() => {
        const draft = (draftsData || []).find(d => d.title === selectedDraftTitle);
        if (draft) {
            setFormTitle(draft.title || '');
            setFormCategory(draft.category || 'Story Telling');
            setFormStatus(draft.status || 'Idea');
            setFormHook(draft.hook || '');
            setFormScript(draft.script || '');
            setFormHashtags(draft.hashtags || '');
            setFormCaption(draft.caption || '');
            setFormReferences(draft.references || '');
        } else {
            setFormTitle('');
            setFormCategory('Story Telling');
            setFormStatus('Idea');
            setFormHook('');
            setFormScript('');
            setFormHashtags('');
            setFormCaption('');
            setFormReferences('');
        }
    }, [selectedDraftTitle, draftsData]);

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
        const drafts = (draftsData || []).map((d, index) => ({ d, index }));
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
        if (picFilter) {
            list = list.filter(({ d }) => {
                const sched = getResolvedSchedule(d.title);
                return sched && normalizePicName(sched.pic) === normalizePicName(picFilter);
            });
        }

        // Sort: Oldest task date first
        list.sort((a, b) => {
            const schedA = getResolvedSchedule(a.d.title);
            const schedB = getResolvedSchedule(b.d.title);

            const timestampA = schedA && parseDate(schedA.date) ? new Date(parseDate(schedA.date)).getTime() : 0;
            const timestampB = schedB && parseDate(schedB.date) ? new Date(parseDate(schedB.date)).getTime() : 0;

            if (timestampA === 0 && timestampB !== 0) return 1;
            if (timestampB === 0 && timestampA !== 0) return -1;

            if (timestampA !== timestampB) {
                return timestampA - timestampB;
            }
            return a.index - b.index;
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

        const cat = categoryFilter || 'Story Telling';
        const newDraft = {
            title: `New ${cat} Script ${draftsData.length + 1}`,
            category: cat,
            status: 'Idea',
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
            title: formTitle,
            category: formCategory,
            status: isUploaded ? 'Uploaded' : (formScript && String(formScript).trim() !== '' ? 'Scripting' : 'Idea'),
            hook: formHook,
            script: formScript,
            hashtags: formHashtags,
            caption: formCaption,
            references: formReferences
        };

        const success = await saveScriptDraft(updatedDraft);
        if (success) {
            setSelectedDraftTitle(updatedDraft.title);
            showAlert('💾 Storyboard draft updated!', 'success');
        }
    };

    const handleDeleteDraft = async () => {
        if (!selectedDraftTitle) return;
        const draft = (draftsData || []).find(d => d.title === selectedDraftTitle);
        if (!draft) return;

        if (userRole === 'Creator') {
            showAlert('Creators are not authorized to delete storyboard drafts.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete draft: "${draft.title}"?`)) return;

        const success = await deleteScriptDraft(draft.title);
        if (success) {
            setSelectedDraftTitle(null);
        }
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

    // Render reference links helper
    const renderReferencesList = (refStr) => {
        if (!refStr) return null;
        const links = refStr.split(',').map(link => link.trim()).filter(Boolean);
        if (links.length === 0) return null;

        return (
            <div className="space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant/75 uppercase tracking-wider">Resource Links</span>
                <div className="flex flex-col gap-1">
                    {links.map((link, i) => {
                        let shortUrl = link;
                        try {
                            const urlObj = new URL(link);
                            shortUrl = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.slice(0, 20) + '...' : urlObj.pathname);
                        } catch (e) { }
                        return (
                            <a
                                key={i}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[12px] text-primary hover:underline inline-flex items-center gap-1.5 font-medium"
                            >
                                <span className="material-symbols-outlined text-[12px]">link</span> {shortUrl}
                            </a>
                        );
                    })}
                </div>
            </div>
        );
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
                        {(draftsData || []).length} Drafts
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

                        {/* PIC selector filter */}
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
                    </div>

                    {/* Category quick selectors */}
                    <div className="flex gap-1.5 border-b border-outline-variant/15 pb-2.5">
                        <button
                            type="button"
                            className={`flex-1 font-bold py-1.5 rounded text-[10px] uppercase transition-colors cursor-pointer text-center ${categoryFilter === '' ? 'bg-primary text-on-primary' : 'bg-surface-container-high border border-outline-variant/25 text-on-surface-variant hover:text-on-surface'
                                }`}
                            onClick={() => setCategoryFilter('')}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className={`flex-1 font-bold py-1.5 rounded text-[10px] uppercase transition-colors cursor-pointer text-center ${categoryFilter === 'Story Telling' ? 'bg-primary text-on-primary' : 'bg-surface-container-high border border-outline-variant/25 text-on-surface-variant hover:text-on-surface'
                                }`}
                            onClick={() => setCategoryFilter('Story Telling')}
                        >
                            Story Telling
                        </button>
                        <button
                            type="button"
                            className={`flex-1 font-bold py-1.5 rounded text-[10px] uppercase transition-colors cursor-pointer text-center ${categoryFilter === 'Motion' ? 'bg-primary text-on-primary' : 'bg-surface-container-high border border-outline-variant/25 text-on-surface-variant hover:text-on-surface'
                                }`}
                            onClick={() => setCategoryFilter('Motion')}
                        >
                            Motion
                        </button>
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
                                            setSelectedDraftTitle(d.title);
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
                                        onClick={() => setSelectedDraftTitle(null)}
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
                                        {categoriesData.map(c => (
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

                            {/* Live Preview Panel Card */}
                            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 space-y-4">
                                <h5 className="text-[10px] font-bold text-on-surface-variant/75 uppercase tracking-wider flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px] text-primary">analytics</span> Live Preview Panel
                                </h5>

                                <div className="space-y-3 text-body-sm">
                                    {formHook && (
                                        <div>
                                            <p className="text-[9px] font-bold text-error uppercase tracking-wider mb-0.5">🪝 Visual Hook</p>
                                            <p className="font-semibold text-on-surface italic">"{formHook}"</p>
                                        </div>
                                    )}
                                    {formScript && (
                                        <div>
                                            <p className="text-[9px] font-bold text-primary uppercase tracking-wider mb-0.5">📝 Voiceover Script</p>
                                            <div className="bg-surface-container-lowest border-l-2 border-primary rounded p-3 text-[12px] font-mono leading-relaxed whitespace-pre-wrap text-on-surface">
                                                {formScript}
                                            </div>
                                        </div>
                                    )}
                                    {(formCaption || formHashtags) && (
                                        <div>
                                            <p className="text-[9px] font-bold text-primary uppercase tracking-wider mb-0.5">📱 Caption & Tags</p>
                                            <p className="text-on-surface text-[12px] leading-relaxed">
                                                {formCaption} <span className="text-primary font-semibold">{formHashtags}</span>
                                            </p>
                                        </div>
                                    )}
                                    {renderReferencesList(formReferences)}
                                </div>
                            </div>

                            {/* Save Draft & Copy Copywriting Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                {isUnlocked && (
                                    <button type="submit" className="flex-1 bg-primary text-on-primary hover:opacity-90 font-bold py-2.5 px-4 rounded-lg text-body-sm transition-opacity flex items-center justify-center gap-1.5 cursor-pointer micro-interaction shadow-sm">
                                        <span className="material-symbols-outlined text-[18px]">save</span> Save Script Draft
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

        </div>
    );
}
