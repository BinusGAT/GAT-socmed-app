'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { DeleteConfirmModal, LinkModal } from './Modals';
import { 
    normalizePicName, 
    getPicBadgeClass,
    getLocalDateInputValue,
    parseDate
} from '../utils/helpers';

export default function MeetingsTab({ onOpenDatePicker }) {
    const {
        meetingsData,
        isUnlocked,
        userRole,
        saveMeetingMemo,
        deleteMeetingMemo,
        memberListData,
        showAlert,
        selectedMeetingId,
        setSelectedMeetingId
    } = useDashboard();

    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const editorRef = useRef(null);


    // Scroll selected meeting item into view
    useEffect(() => {
        if (selectedMeetingId) {
            setTimeout(() => {
                const activeItem = document.querySelector('.meeting-item.active');
                if (activeItem) {
                    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
        }
    }, [selectedMeetingId]);

    // Editor Form State
    const [formDate, setFormDate] = useState('');
    const [formAttendees, setFormAttendees] = useState([]); // array of selected attendee names
    const [formRecap, setFormRecap] = useState('');
    const [formVideoRecap, setFormVideoRecap] = useState('');

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const savedSelectionRef = useRef(null);
    const [activeStyles, setActiveStyles] = useState({
        bold: false,
        italic: false,
        underline: false,
        insertUnorderedList: false,
        insertOrderedList: false,
        justifyLeft: false,
        justifyCenter: false,
        justifyRight: false
    });

    const updateActiveStyles = () => {
        if (typeof document === 'undefined') return;
        setActiveStyles({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            insertUnorderedList: document.queryCommandState('insertUnorderedList'),
            insertOrderedList: document.queryCommandState('insertOrderedList'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight')
        });
    };

    const getToolbarBtnStyle = (isActive) => {
        return isActive ? { backgroundColor: 'var(--primary-bg)', color: 'var(--primary)', fontWeight: 'bold' } : {};
    };

    // Ensure all links in the viewing recap container target _blank (new tab)
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const container = document.querySelector('.meeting-recap-text-container');
        if (container) {
            container.querySelectorAll('a').forEach(a => {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            });
        }
    }, [formRecap, isEditing]);

    // Reset editor fields when selection changes
    useEffect(() => {
        if (selectedMeetingId !== null && selectedMeetingId !== 'NEW') {
            const meeting = (meetingsData || []).find(m => m.id === selectedMeetingId);
            if (meeting) {
                setFormDate(parseDate(meeting.date) || getLocalDateInputValue());
                const rawAttList = meeting.attendees 
                    ? meeting.attendees.split(',').map(a => a.trim()).filter(Boolean)
                    : [];
                const attList = Array.from(new Set(rawAttList));
                setFormAttendees(attList);
                setFormRecap(meeting.recap || '');
                setFormVideoRecap(meeting.videoRecap || '');
                setIsEditing(false); // Default to view mode when switching memos
                return;
            }
        }
        if (selectedMeetingId === 'NEW') {
            setFormDate(getLocalDateInputValue());
            setFormAttendees([]);
            setFormRecap('');
            setFormVideoRecap('');
            setIsEditing(true);
            return;
        }
        // Default / None selected
        setFormDate(getLocalDateInputValue());
        setFormAttendees([]);
        setFormRecap('');
        setFormVideoRecap('');
        setIsEditing(false);
    }, [selectedMeetingId, meetingsData]);

    // Update contenteditable element content when isEditing becomes true or when switching to editable view
    useEffect(() => {
        if (isEditing && editorRef.current) {
            if (selectedMeetingId === 'NEW') {
                editorRef.current.innerHTML = '';
            } else {
                editorRef.current.innerHTML = sanitizeHtmlString(formRecap);
            }
        }
    }, [isEditing, selectedMeetingId]);

    const handleDatePickerClick = () => {
        if (!isUnlocked) return;
        onOpenDatePicker((selectedDate) => {
            setFormDate(selectedDate);
        });
    };

    const handleFilterDateClick = () => {
        onOpenDatePicker((selectedDate) => {
            setDateFilter(selectedDate);
        });
    };

    // Filtered meetings list
    const getFilteredMeetings = () => {
        let list = [...(meetingsData || [])];

        // Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(m => 
                String(m.recap).toLowerCase().includes(q)
            );
        }

        // Date Filter
        if (dateFilter) {
            list = list.filter(m => m.date === dateFilter);
        }

        // Sort: Oldest first
        list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        return list;
    };

    const filteredMeetings = getFilteredMeetings();

    const getMeetingMembers = () => {
        const list = (memberListData || []).map(m => m.NAMA).filter(Boolean);
        const hasPakFajar = list.some(name => name.toLowerCase() === 'pak fajar');
        if (!hasPakFajar) {
            list.unshift('Pak Fajar');
        }
        return list;
    };

    const handleAttendeeToggle = (name) => {
        if (formAttendees.includes(name)) {
            setFormAttendees(formAttendees.filter(a => a !== name));
        } else {
            setFormAttendees([...formAttendees, name]);
        }
    };
    
    const handleCreateNewMemo = () => {
        if (!isUnlocked || userRole === 'Creator') return;
        setSelectedMeetingId('NEW');
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (selectedMeetingId === 'NEW') {
            setSelectedMeetingId(null);
        }
    };

    const handleSaveMemo = async (e) => {
        e.preventDefault();
        if (!isUnlocked || userRole === 'Creator') {
            showAlert('Permission denied. Editing is locked.', 'error');
            return;
        }

        if (!formRecap || String(formRecap).trim() === '' || formRecap === '<br>') {
            showAlert('Please enter meeting recap details.', 'error');
            return;
        }

        let memoId = selectedMeetingId;
        if (!memoId || memoId === 'NEW') {
            let maxNum = 0;
            (meetingsData || []).forEach(m => {
                if (String(m.id).startsWith('MM')) {
                    const num = parseInt(m.id.replace('MM', '')) || 0;
                    if (num > maxNum) maxNum = num;
                }
            });
            memoId = `MM${maxNum + 1}`;
        }

        const memoPayload = {
            id: memoId,
            date: formDate,
            attendees: formAttendees,
            recap: formRecap,
            videoRecap: formVideoRecap
        };

        const success = await saveMeetingMemo(memoPayload);
        if (success) {
            setSelectedMeetingId(memoId);
            setIsEditing(false);
        }
    };

    const handleDeleteMemo = async () => {
        if (!selectedMeetingId || selectedMeetingId === 'NEW') return;
        
        if (userRole === 'Creator') {
            showAlert('Creators are not authorized to delete meeting memos.', 'error');
            return;
        }

        const success = await deleteMeetingMemo(selectedMeetingId);
        if (success) {
            setIsDeleteConfirmOpen(false);
            setSelectedMeetingId(null);
            setIsEditing(false);
        }
    };

    // WYSIWYG Formatting Helpers
    const safeExecCommand = (command, value = null) => {
        if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
            try {
                document.execCommand(command, false, value);
            } catch (err) {
                console.warn(`execCommand('${command}') is not supported or failed:`, err);
            }
        }
    };

    const applyFormatting = (command) => {
        safeExecCommand(command);
        if (editorRef.current) {
            setFormRecap(editorRef.current.innerHTML);
        }
        updateActiveStyles();
    };

    const saveSelection = () => {
        if (typeof window !== 'undefined' && window.getSelection) {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                savedSelectionRef.current = sel.getRangeAt(0);
            }
        }
    };

    const restoreSelection = () => {
        if (savedSelectionRef.current && typeof window !== 'undefined' && window.getSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelectionRef.current);
        }
    };

    const handleLinkClick = (e) => {
        e.preventDefault();
        saveSelection();
        setIsLinkModalOpen(true);
    };

    const handleLinkConfirm = (url) => {
        setIsLinkModalOpen(false);
        restoreSelection();
        if (url) {
            let formattedUrl = url.trim();
            if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = 'https://' + formattedUrl;
            }
            safeExecCommand('createLink', formattedUrl);

            if (editorRef.current) {
                editorRef.current.querySelectorAll('a').forEach(a => {
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                });
                setFormRecap(editorRef.current.innerHTML);
            }
        }
    };

    const handleEditorKeyUp = (e) => {
        if (e.key === ' ' || e.code === 'Space') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const textNode = range.startContainer;
                if (textNode.nodeType === Node.TEXT_NODE) {
                    const text = textNode.textContent;
                    const offset = range.startOffset;
                    const typedText = text.substring(0, offset);
                    if (typedText === '1. ') {
                        textNode.textContent = text.substring(offset);
                        safeExecCommand('insertOrderedList');
                        if (editorRef.current) {
                            setFormRecap(editorRef.current.innerHTML);
                        }
                    } else if (typedText === '* ' || typedText === '- ') {
                        textNode.textContent = text.substring(offset);
                        safeExecCommand('insertUnorderedList');
                        if (editorRef.current) {
                            setFormRecap(editorRef.current.innerHTML);
                        }
                    }
                }
            }
        }
        updateActiveStyles();
    };

    const sanitizeHtmlString = (html) => {
        if (typeof window !== 'undefined' && window.DOMPurify) {
            return window.DOMPurify.sanitize(html);
        }
        if (typeof window === 'undefined') return '';
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html || '', 'text/html');
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
            return container.innerHTML;
        } catch (e) {
            console.error('HTML Sanitization error:', e);
            return '';
        }
    };

    const createSafeHtml = (htmlContent) => {
        return { __html: sanitizeHtmlString(htmlContent) };
    };

    const meetingMembers = getMeetingMembers();
    const absentees = meetingMembers.filter(name => !formAttendees.includes(name));
    const actionsDisabled = !isUnlocked || userRole === 'Creator';

    if (!isUnlocked) {
        return <LockScreen sectionName="Meetings" />;
    }

    return (
        <section className="panel panel-meeting" style={{ display: 'flex' }}>
            <div className="panel-header">
                <h2>
                    <span className="panel-icon"><i className="fa-solid fa-handshake"></i></span> Meeting Memos
                </h2>
                <div className="panel-actions">
                    {isUnlocked && userRole !== 'Creator' && (
                        <button type="button" className="btn btn-primary" onClick={handleCreateNewMemo}>
                            <i className="fa-solid fa-plus"></i> Create Meeting Memo
                        </button>
                    )}
                </div>
            </div>

            <div className="meeting-split-container">
                {/* Memo Sidebar */}
                <div className="meeting-sidebar">
                    <div className="drafts-sidebar-header" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        <h3>Memo Directory</h3>
                    </div>

                    <div className="meeting-search-wrapper" style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                            <input 
                                type="text" 
                                className="form-control custom-date-input" 
                                style={{ flex: 1 }}
                                placeholder="Filter by date..." 
                                readOnly
                                value={dateFilter}
                                onClick={handleFilterDateClick}
                            />
                            {dateFilter && (
                                <button className="btn btn-outline btn-sm" onClick={() => setDateFilter('')} title="Clear filters">
                                    <i className="fa-solid fa-filter-circle-xmark"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="meeting-list-container">
                        {filteredMeetings.length === 0 ? (
                            <p style={{ color: 'var(--ink-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No memos found</p>
                        ) : (
                            filteredMeetings.map((memo) => {
                                const isSelected = selectedMeetingId === memo.id;
                                const countAtt = Array.isArray(memo.attendees) ? memo.attendees.length : (memo.attendees ? memo.attendees.split(',').filter(Boolean).length : 0);
                                const plainRecap = (memo.recap || '').replace(/<[^>]*>/g, '').trim();
                                const snippet = plainRecap.length > 80 ? plainRecap.substring(0, 80) + '...' : plainRecap;

                                return (
                                    <button
                                        key={memo.id}
                                        type="button"
                                        onClick={() => setSelectedMeetingId(memo.id)}
                                        className={`meeting-item ${isSelected ? 'active' : ''}`}
                                    >
                                        <div className="meeting-item-date">
                                            <i className="fa-solid fa-calendar-day"></i> {parseDate(memo.date)}
                                        </div>
                                        <div className="meeting-item-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <span className={`badge ${countAtt > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {countAtt === 1 ? '1 Attendee' : `${countAtt} Attendees`}
                                                </span>
                                            </div>
                                            <span className="badge-status badge-status-completed" style={{ fontSize: '9px', padding: '1px 4px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                Done
                                            </span>
                                        </div>
                                        <div className="meeting-item-snippet" style={{ marginTop: '6px' }}>
                                            {snippet || 'No recap written yet.'}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Area: Details / Editor */}
                <div className="meeting-main-content">
                    {!selectedMeetingId ? (
                        <div className="meeting-placeholder-state">
                            <i className="fa-solid fa-handshake" style={{ fontSize: '48px', color: 'var(--ink-muted)', marginBottom: '12px' }}></i>
                            <h3>No Meeting Selected</h3>
                            <p>Select a meeting memo from the sidebar list to view its details, attendees, and recaps.</p>
                        </div>
                    ) : !isEditing ? (
                        /* VIEW MODE */
                        <div className="meeting-detail-card">
                            <div className="meeting-details-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-calendar-day" style={{ color: 'var(--primary)' }}></i> Date: {parseDate(formDate)}
                                </h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {userRole !== 'Creator' && (
                                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                                            <i className="fa-solid fa-pen"></i> Edit
                                        </button>
                                    )}
                                    {userRole !== 'Creator' && (
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setIsDeleteConfirmOpen(true)}>
                                            <i className="fa-solid fa-trash-can"></i> Delete
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="meeting-meta-section" style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                                <div className="meta-block" style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Attendees</label>
                                    <div className="meeting-badge-list" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {formAttendees.length === 0 ? (
                                            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>None present</span>
                                        ) : (
                                            formAttendees.map(att => (
                                                <span key={att} className={`badge ${getPicBadgeClass(att)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{normalizePicName(att)}</span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="meta-block" style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Absentees</label>
                                    <div className="meeting-badge-list" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {absentees.length === 0 ? (
                                            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>None absent</span>
                                        ) : (
                                            absentees.map(name => (
                                                <span key={name} className="badge badge-pic-default" style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.7 }}>{normalizePicName(name)}</span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="meta-block" style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Video Recap</label>
                                    <div className="meeting-badge-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                        {(() => {
                                            const links = formVideoRecap ? formVideoRecap.split(/[\s,]+/).map(l => l.trim()).filter(Boolean) : [];
                                            return links.length > 0 ? (
                                                links.map((link, idx) => (
                                                    <a 
                                                        key={idx}
                                                        href={link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        style={{ fontSize: '12px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'underline' }}
                                                    >
                                                        <i className="fa-solid fa-video"></i> Watch Video Recap {links.length > 1 ? `#${idx + 1}` : ''}
                                                    </a>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>None provided</span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="meeting-recap-section">
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid var(--hairline)', paddingBottom: '6px' }}>Meeting Recap</label>
                                <div 
                                    className="meeting-recap-text-container" 
                                    style={{
                                        fontSize: '13px', 
                                        lineHeight: '1.6', 
                                        color: 'var(--ink)', 
                                        background: 'var(--surface)', 
                                        padding: '16px', 
                                        borderRadius: 'var(--radius-md)', 
                                        border: '1px solid var(--hairline)'
                                    }}
                                    dangerouslySetInnerHTML={createSafeHtml(formRecap)}
                                />
                            </div>
                        </div>
                    ) : (
                        /* EDIT MODE */
                        <form onSubmit={handleSaveMemo} className="meeting-detail-card" autoComplete="off">
                            <div className="meeting-details-header" style={{ borderBottom: '1px solid var(--hairline)', paddingBottom: '12px', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-file-pen" style={{ color: 'var(--primary)' }}></i> {selectedMeetingId === 'NEW' ? 'Create Meeting Memo' : 'Edit Meeting Memo'}
                                </h3>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Date <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        className="form-control custom-date-input" 
                                        placeholder="YYYY-MM-DD" 
                                        readOnly
                                        required
                                        value={formDate}
                                        onClick={handleDatePickerClick}
                                        disabled={actionsDisabled}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Video Recap URL(s) <span style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 'normal' }}>(Optional, separate multiple links with commas)</span></label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="e.g. https://link1.com, https://link2.com" 
                                        value={formVideoRecap}
                                        onChange={(e) => setFormVideoRecap(e.target.value)}
                                        disabled={actionsDisabled}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Attendees checkboxes */}
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '8px' }}>Attendees (Check who attended the meeting)</label>
                                <div className="member-checkbox-grid">
                                    {meetingMembers.map(name => {
                                        const isChecked = formAttendees.includes(name);
                                        return (
                                            <label 
                                                key={name} 
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '8px', 
                                                    cursor: 'pointer',
                                                    margin: 0,
                                                    padding: '2px 0',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked}
                                                    onChange={() => handleAttendeeToggle(name)}
                                                    disabled={actionsDisabled}
                                                    style={{ 
                                                        width: '16px', 
                                                        height: '16px', 
                                                        margin: 0,
                                                        flexShrink: 0,
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                                <span className={`badge ${getPicBadgeClass(name)}`} style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-block' }}>
                                                    {normalizePicName(name)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recap Rich Text Editor */}
                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Meeting Recap <span className="required">*</span></label>
                                    <div className="rich-text-toolbar" style={{ marginBottom: '6px' }}>
                                        <button type="button" className="btn btn-sm" style={getToolbarBtnStyle(activeStyles.bold)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }} title="Bold"><i className="fa-solid fa-bold"></i></button>
                                        <button type="button" className="btn btn-sm" style={getToolbarBtnStyle(activeStyles.italic)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }} title="Italic"><i className="fa-solid fa-italic"></i></button>
                                        <button type="button" className="btn btn-sm" style={getToolbarBtnStyle(activeStyles.underline)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('underline'); }} title="Underline"><i className="fa-solid fa-underline"></i></button>
                                        <div className="toolbar-separator"></div>
                                        <button type="button" className="btn btn-sm" style={getToolbarBtnStyle(activeStyles.insertUnorderedList)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('insertUnorderedList'); }} title="Bulleted List"><i className="fa-solid fa-list-ul"></i></button>
                                        <button type="button" className="btn btn-sm" style={getToolbarBtnStyle(activeStyles.insertOrderedList)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('insertOrderedList'); }} title="Numbered List"><i className="fa-solid fa-list-ol"></i></button>
                                        <div className="toolbar-separator"></div>
                                        <button type="button" className="btn btn-sm" style={getToolbarBtnStyle(activeStyles.justifyLeft)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyLeft'); }} title="Align Left"><i className="fa-solid fa-align-left"></i></button>
                                        <button type="button" className="btn btn-sm" style={getToolbarBtnStyle(activeStyles.justifyCenter)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyCenter'); }} title="Align Center"><i className="fa-solid fa-align-center"></i></button>
                                        <button type="button" className="btn btn-sm" style={getToolbarBtnStyle(activeStyles.justifyRight)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyRight'); }} title="Align Right"><i className="fa-solid fa-align-right"></i></button>
                                        <div className="toolbar-separator"></div>
                                        <button type="button" className="btn btn-sm" onMouseDown={handleLinkClick} title="Insert Link"><i className="fa-solid fa-link"></i></button>
                                    </div>
                                    <div 
                                        ref={editorRef}
                                        id="meetingFormRecap" 
                                        className="form-control rich-text-editor" 
                                        contentEditable={!actionsDisabled} 
                                        onBlur={(e) => setFormRecap(e.currentTarget.innerHTML)}
                                        onKeyUp={handleEditorKeyUp}
                                        onMouseUp={updateActiveStyles}
                                        style={{ minHeight: '200px', fontFamily: 'inherit', resize: 'vertical', padding: '12px' }}
                                        placeholder="Write down the details of what was discussed, action items, next steps..."
                                        data-placeholder="Write down the details of what was discussed, action items, next steps..."
                                    />
                                </div>
                            </div>

                            {/* Form actions */}
                            <div className="form-actions editor-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                {isUnlocked && userRole !== 'Creator' && (
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fa-solid fa-floppy-disk"></i> Save Memo
                                    </button>
                                )}
                                <button type="button" className="btn btn-outline" onClick={handleCancelEdit}>
                                    <i className="fa-solid fa-xmark"></i> Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <DeleteConfirmModal 
                isOpen={isDeleteConfirmOpen} 
                onClose={() => setIsDeleteConfirmOpen(false)} 
                onConfirm={handleDeleteMemo} 
                message="Are you sure you want to delete this meeting memo?"
            />

            <LinkModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onConfirm={handleLinkConfirm}
            />
        </section>
    );
}
