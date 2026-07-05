'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { 
    normalizePicName, 
    getPicBadgeClass,
    parseDate
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
        showAlert
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
            <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>Resource Links:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {links.map((link, i) => {
                        let shortUrl = link;
                        try {
                            const urlObj = new URL(link);
                            shortUrl = urlObj.hostname + (urlObj.pathname.length > 15 ? urlObj.pathname.slice(0, 15) + '...' : urlObj.pathname);
                        } catch (e) {}
                        return (
                            <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-link" style={{ fontSize: '10px' }}></i> {shortUrl}
                            </a>
                        );
                    })}
                </div>
            </div>
        );
    };

    const schedule = getResolvedSchedule(formTitle);

    return (
        <section className="panel panel-content-hub" style={{ display: 'flex' }}>
            <div className="panel-header">
                <h2>
                    <span className="panel-icon"><i className="fa-solid fa-pen-to-square"></i></span> Content Hub
                </h2>
                <div className="panel-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isUnlocked && userRole !== 'Creator' && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateDraft}>
                            <i className="fa-solid fa-plus"></i> New Draft
                        </button>
                    )}
                    <span className="data-count">{(draftsData || []).length} drafts</span>
                </div>
            </div>

            <div className="content-hub-shell">
                {/* Left Column: Drafts List */}
                <div className="drafts-sidebar">
                    <div className="drafts-sidebar-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        <h3>Idea Backlog</h3>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <select 
                                value={picFilter}
                                onChange={(e) => setPicFilter(e.target.value)}
                                style={{
                                    fontSize: '11px',
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--hairline)',
                                    background: 'var(--canvas)',
                                    color: 'var(--ink)'
                                }}
                            >
                                <option value="">All PICs</option>
                                <option value="Kelvin">Kelvin</option>
                                <option value="Felix">Felix</option>
                                <option value="Eduard">Eduard</option>
                                <option value="Anthoni">Anthoni</option>
                                <option value="Leonardi">Leonardi</option>
                                <option value="Ruliyanto">Ruliyanto</option>
                                <option value="Rafael">Rafael</option>
                            </select>
                        </div>
                    </div>

                    <div className="drafts-sidebar-filters" style={{ display: 'flex', gap: '6px', padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
                        <button type="button" className={`btn btn-sm ${categoryFilter === '' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCategoryFilter('')}>All</button>
                        <button type="button" className={`btn btn-sm ${categoryFilter === 'Story Telling' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCategoryFilter('Story Telling')}>Story Telling</button>
                        <button type="button" className={`btn btn-sm ${categoryFilter === 'Motion' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCategoryFilter('Motion')}>Motion</button>
                    </div>

                    <div style={{ padding: '0 0 10px 0' }}>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search drafts..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="drafts-list">
                        {filteredDrafts.length === 0 ? (
                            <p style={{ color: 'var(--ink-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No drafts found</p>
                        ) : (
                            filteredDrafts.map(({ d, index }) => {
                                const sched = getResolvedSchedule(d.title);
                                const isSelected = selectedDraftTitle === d.title;
                                
                                let displayStatus = d.status || 'Idea';
                                if (sched && sched.isUploaded) {
                                    displayStatus = 'Uploaded';
                                }

                                let badgeClass = 'badge-status-progress'; // Idea (blue)
                                if (displayStatus === 'Scripting') {
                                    badgeClass = 'badge-status-today'; // Scripting (yellow)
                                } else if (displayStatus === 'Uploaded') {
                                    badgeClass = 'badge-status-completed'; // Uploaded (green)
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
                                        className={`draft-item ${isSelected ? 'active' : ''}`}
                                    >
                                        <div className="draft-item-title">{d.title || 'Untitled Draft'}</div>
                                        <div className="draft-item-meta">
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        backgroundColor: d.category === 'Motion' ? 'var(--primary)' : 'var(--success)',
                                                        display: 'inline-block'
                                                    }}></span>
                                                    {d.category}
                                                </span>
                                                {sched && (
                                                    <span className={`badge ${getPicBadgeClass(sched.pic)}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                                                        {normalizePicName(sched.pic)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`badge-status ${badgeClass}`} style={{ fontSize: '9px', padding: '1px 4px', whiteSpace: 'nowrap' }}>
                                                {displayStatus}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Column: Creative Editor */}
                <div className="creative-editor">
                    {!selectedDraftTitle ? (
                        <div className="editor-placeholder">
                            <div className="empty-state">
                                <div className="empty-icon">📝</div>
                                <h3>No draft selected</h3>
                                <p>Select a draft from the backlog or click "+ New Draft" to begin scripting.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="draft-form" autoComplete="off">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Storyboard Script Editor</h3>
                                    {schedule ? (
                                        <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                                            Assigned to <span className={`badge ${getPicBadgeClass(schedule.pic)}`} style={{ fontSize: '9px', padding: '1px 4px' }}>{schedule.pic}</span> scheduled on {schedule.date}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--danger)' }}>
                                            ⚠️ Draft is not currently mapped to any Scheduled Task.
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {isUnlocked && userRole !== 'Creator' && (
                                        <button type="button" className="btn btn-outline btn-danger-hover btn-sm" onClick={handleDeleteDraft}>
                                            <i className="fa-solid fa-trash-can"></i> Delete
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-outline btn-sm mobile-close-btn" onClick={() => {
                                        setSelectedDraftTitle(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}>
                                        <i className="fa-solid fa-xmark"></i> Close
                                    </button>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Draft Title <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        className="form-control"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        required
                                        disabled={!isUnlocked}
                                        placeholder="Enter content title..."
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Category <span className="required">*</span></label>
                                    <select 
                                        className="form-control"
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        disabled={!isUnlocked}
                                        required
                                    >
                                        <option value="Story Telling">Story Telling</option>
                                        <option value="Motion">Motion</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Viral Hook Template / Caption Hook</label>
                                    <input 
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. Stop doing X, do this instead..."
                                        value={formHook}
                                        onChange={(e) => setFormHook(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Script</label>
                                    <textarea 
                                        className="form-control"
                                        rows={5}
                                        placeholder="Write your video script, speaking notes, or visual storyboard directions here..."
                                        value={formScript}
                                        onChange={(e) => setFormScript(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Hashtags <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        className="form-control"
                                        placeholder="e.g. #technology #learning #tutorial"
                                        value={formHashtags}
                                        onChange={(e) => setFormHashtags(e.target.value)}
                                        disabled={!isUnlocked}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Caption / Post Description</label>
                                    <textarea 
                                        className="form-control"
                                        rows={3}
                                        placeholder="Write your post caption, social media description, or secondary copy here..."
                                        value={formCaption}
                                        onChange={(e) => setFormCaption(e.target.value)}
                                        disabled={!isUnlocked}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Reference Links (one URL per line) <span className="required">*</span></label>
                                    <textarea 
                                        className="form-control"
                                        rows={2}
                                        placeholder="e.g. https://instagram.com/reel/...&#10;https://youtube.com/watch?..."
                                        value={formReferences}
                                        onChange={(e) => setFormReferences(e.target.value)}
                                        disabled={!isUnlocked}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Live Preview Panel */}
                            <div className="panel" style={{ background: 'var(--canvas-subtle)', border: '1px solid var(--hairline)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', borderBottom: '1px solid var(--hairline)', paddingBottom: '6px' }}>
                                    <i className="fa-solid fa-magnifying-glass-chart"></i> Live Content Storyboard Preview
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {formHook && (
                                        <div>
                                            <strong style={{ fontSize: '11px', color: 'var(--danger)', textTransform: 'uppercase' }}>🪝 Visual Hook:</strong>
                                            <p style={{ fontSize: '13px', margin: '2px 0 0 0', fontStyle: 'italic', fontWeight: 500 }}>"{formHook}"</p>
                                        </div>
                                    )}
                                    {formScript && (
                                        <div>
                                            <strong style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase' }}>📝 Voiceover Script:</strong>
                                            <p style={{ fontSize: '12px', margin: '2px 0 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.5', background: 'var(--canvas)', padding: '8px 12px', borderLeft: '3px solid var(--primary)', borderRadius: 'var(--radius-xs)' }}>{formScript}</p>
                                        </div>
                                    )}
                                    {(formCaption || formHashtags) && (
                                        <div>
                                            <strong style={{ fontSize: '11px', color: 'var(--success)', textTransform: 'uppercase' }}>📱 Post Caption:</strong>
                                            <p style={{ fontSize: '12px', margin: '2px 0 0 0', fontWeight: 500 }}>
                                                {formCaption} <span style={{ color: 'var(--primary)' }}>{formHashtags}</span>
                                            </p>
                                        </div>
                                    )}
                                    {renderReferencesList(formReferences)}
                                </div>
                            </div>

                            {/* Save Draft & Copy Copywriting */}
                            <div className="form-actions editor-actions" style={{ display: 'flex', gap: '10px' }}>
                                {isUnlocked && (
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        <i className="fa-solid fa-floppy-disk"></i> Save Script Draft
                                    </button>
                                )}
                                <button type="button" className="btn btn-success" onClick={handleCopyCopywriting} style={{ flex: 1 }}>
                                    <i className="fa-solid fa-copy"></i> Copy Copywriting
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
