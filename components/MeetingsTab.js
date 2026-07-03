'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { DeleteConfirmModal } from './Modals';
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

    // Reset selected meeting ID when switching away (unmounting)
    useEffect(() => {
        return () => {
            setSelectedMeetingId(null);
        };
    }, [setSelectedMeetingId]);

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
                setIsEditing(false); // Default to view mode when switching memos
                return;
            }
        }
        if (selectedMeetingId === 'NEW') {
            setFormDate(getLocalDateInputValue());
            setFormAttendees([]);
            setFormRecap('');
            setIsEditing(true);
            return;
        }
        // Default / None selected
        setFormDate(getLocalDateInputValue());
        setFormAttendees([]);
        setFormRecap('');
        setIsEditing(false);
    }, [selectedMeetingId, meetingsData]);

    // Update contenteditable element content when isEditing becomes true or when switching to editable view
    useEffect(() => {
        if (isEditing && editorRef.current) {
            editorRef.current.innerHTML = formRecap;
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
        // Start with the dynamic list from memberListData
        const list = (memberListData || []).map(m => m.NAMA).filter(Boolean);
        
        // Ensure "Pak Fajar" is present
        const hasPakFajar = list.some(name => name.toLowerCase() === 'pak fajar');
        if (!hasPakFajar) {
            list.unshift('Pak Fajar');
        }
        
        return list;
    };

    // Toggle attendee checkbox
    const handleAttendeeToggle = (name) => {
        if (formAttendees.includes(name)) {
            setFormAttendees(formAttendees.filter(a => a !== name));
        } else {
            setFormAttendees([...formAttendees, name]);
        }
    };

    const handleCreateNewMemo = () => {
        if (!isUnlocked) {
            showAlert('Workspace is locked. Please unlock to edit.', 'error');
            return;
        }
        setSelectedMeetingId('NEW'); // Marker for new memo
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (selectedMeetingId === 'NEW') {
            setSelectedMeetingId(null);
        }
        setIsEditing(false);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!isUnlocked) {
            showAlert('Workspace is locked. Please unlock to edit.', 'error');
            return;
        }

        if (userRole === 'Creator') {
            showAlert('Creators are not authorized to save meeting memos.', 'error');
            return;
        }

        let memoId = selectedMeetingId;
        if (memoId === 'NEW' || !memoId) {
            // Use timestamp-based ID to match the original HTML dashboard format
            memoId = `M${Date.now()}`;
        }

        const memoPayload = {
            id: memoId,
            date: formDate,
            attendees: formAttendees.join(', '),
            agenda: '',
            recap: formRecap
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
    const applyFormatting = (command) => {
        document.execCommand(command, false, null);
        if (editorRef.current) {
            setFormRecap(editorRef.current.innerHTML);
        }
    };

    const applyLink = () => {
        const url = prompt('Enter link URL:', 'https://');
        if (url) {
            let formattedUrl = url.trim();
            if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = 'https://' + formattedUrl;
            }
            document.execCommand('createLink', false, formattedUrl);

            if (editorRef.current) {
                editorRef.current.querySelectorAll('a').forEach(a => {
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                });
                setFormRecap(editorRef.current.innerHTML);
            }
        }
    };

    // Helper to render sanitised HTML securely
    const createSafeHtml = (htmlContent) => {
        if (typeof window !== 'undefined' && window.DOMPurify) {
            return { __html: window.DOMPurify.sanitize(htmlContent) };
        }
        return { __html: htmlContent };
    };

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
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input 
                                type="text" 
                                className="form-control custom-date-input" 
                                style={{ width: '130px' }}
                                placeholder="YYYY-MM-DD" 
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
                                const countAtt = memo.attendees ? memo.attendees.split(',').filter(Boolean).length : 0;
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
                                        {getMeetingMembers().filter(name => !formAttendees.includes(name)).length === 0 ? (
                                            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>None absent</span>
                                        ) : (
                                            getMeetingMembers().filter(name => !formAttendees.includes(name)).map(name => (
                                                <span key={name} className="badge badge-pic-default" style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.7 }}>{normalizePicName(name)}</span>
                                            ))
                                        )}
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
                        <form onSubmit={handleFormSubmit} className="meeting-detail-card" autoComplete="off">
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

                            {/* Attendees checkboxes */}
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '8px' }}>Attendees (Check who attended the meeting)</label>
                                <div className="member-checkbox-grid">
                                    {getMeetingMembers().map(name => {
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
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }} title="Bold"><i className="fa-solid fa-bold"></i></button>
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }} title="Italic"><i className="fa-solid fa-italic"></i></button>
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyFormatting('underline'); }} title="Underline"><i className="fa-solid fa-underline"></i></button>
                                        <div className="toolbar-separator"></div>
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyFormatting('insertUnorderedList'); }} title="Bulleted List"><i className="fa-solid fa-list-ul"></i></button>
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyFormatting('insertOrderedList'); }} title="Numbered List"><i className="fa-solid fa-list-ol"></i></button>
                                        <div className="toolbar-separator"></div>
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyLeft'); }} title="Align Left"><i className="fa-solid fa-align-left"></i></button>
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyCenter'); }} title="Align Center"><i className="fa-solid fa-align-center"></i></button>
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyRight'); }} title="Align Right"><i className="fa-solid fa-align-right"></i></button>
                                        <div className="toolbar-separator"></div>
                                        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); applyLink(); }} title="Insert Link"><i className="fa-solid fa-link"></i></button>
                                    </div>
                                    <div 
                                        ref={editorRef}
                                        id="meetingFormRecap" 
                                        className="form-control rich-text-editor" 
                                        contentEditable={!actionsDisabled} 
                                        onBlur={(e) => setFormRecap(e.currentTarget.innerHTML)}
                                        style={{ minHeight: '200px', fontFamily: 'inherit', resize: 'vertical', padding: '12px' }}
                                        placeholder="Write down the details of what was discussed, action items, next steps..."
                                        data-placeholder="Write down the details of what was discussed, action items, next steps..."
                                    />
                                </div>
                            </div>

                            {/* Form actions */}
                            <div className="form-actions editor-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                {isUnlocked && (
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
        </section>
    );
}
