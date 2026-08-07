'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { DeleteConfirmModal, LinkModal } from './Modals';
import { 
    normalizePicName, 
    getLocalDateInputValue,
    parseDate,
    getPicBadgeClasses
} from '../utils/helpers';

const getToolbarBtnStyle = (isActive) => {
    return isActive ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-primary)' } : {};
};

export default function MeetingsTab({ onOpenDatePicker }) {
    const {
        meetingsData,
        isUnlocked,
        userRole,
        saveMeetingMemo,
        deleteMeetingMemo,
        internListData,
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
                const attList = Array.isArray(meeting.attendees)
                    ? meeting.attendees
                    : (meeting.attendees ? meeting.attendees.split(',').map(a => a.trim()).filter(Boolean) : []);
                setFormAttendees(Array.from(new Set(attList)));
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

    // Auto-scroll left-hand directory list to position selected memo into view
    useEffect(() => {
        if (selectedMeetingId && selectedMeetingId !== 'NEW') {
            setSearchQuery('');
            setDateFilter('');
            const timer = setTimeout(() => {
                const memoEl = document.getElementById(`memo-item-${selectedMeetingId}`);
                if (memoEl) {
                    memoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedMeetingId]);

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
        return (internListData || []).map((intern) => intern.name).filter(Boolean);
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
        setTimeout(() => {
            const detailEl = document.querySelector('.meeting-main-content');
            if (detailEl) {
                detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
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

    const handleEditorPaste = (e) => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        if (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const allElements = doc.body.querySelectorAll('*');
            allElements.forEach(el => {
                el.removeAttribute('class');
                const style = el.getAttribute('style');
                if (style) {
                    const cleanedStyle = style
                        .split(';')
                        .map(prop => prop.trim())
                        .filter(prop => {
                            const lower = prop.toLowerCase();
                            return !(
                                lower.startsWith('color') || 
                                lower.startsWith('background') || 
                                lower.startsWith('font-') ||
                                lower.includes('color:') ||
                                lower.includes('background:') ||
                                lower.includes('font-')
                            );
                        })
                        .join(';');
                    if (cleanedStyle) {
                        el.setAttribute('style', cleanedStyle);
                    } else {
                        el.removeAttribute('style');
                    }
                }
            });
            document.execCommand('insertHTML', false, doc.body.innerHTML);
        } else {
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        }
        if (editorRef.current) {
            setFormRecap(editorRef.current.innerHTML);
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
                        if (attr === 'style') {
                             const cleanedVal = val
                                 .split(';')
                                 .map(prop => prop.trim())
                                 .filter(prop => {
                                     const lower = prop.toLowerCase();
                                     return !(
                                         lower.startsWith('color') || 
                                         lower.startsWith('background') || 
                                         lower.startsWith('font-') ||
                                         lower.includes('color:') ||
                                         lower.includes('background:') ||
                                         lower.includes('font-')
                                     );
                                 })
                                 .join(';');
                             if (cleanedVal) {
                                 cleanEl.setAttribute('style', cleanedVal);
                             }
                         } else {
                             cleanEl.setAttribute(attr, val);
                         }
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
        <div className="space-y-6">
            
            {/* Top Action Bar */}
            <div className="flex justify-end items-center gap-3">
                {isUnlocked && userRole !== 'Creator' && (
                    <button 
                        type="button" 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm micro-interaction" 
                        onClick={handleCreateNewMemo}
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span> Create Memo
                    </button>
                )}
                <span className="px-3 py-1.5 bg-surface-container-high border border-outline-variant/30 text-on-surface-variant rounded-xl text-xs font-bold uppercase">
                    {(meetingsData || []).length} Memos
                </span>
            </div>

            {/* Split layout Directory sidebar & detail editor */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
                
                {/* Left Side: Memo Directory sidebar (col-span-1) */}
                <div className="glass-panel border border-outline-variant/30 rounded-xl p-4 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                        <h4 className="font-bold text-body-sm text-on-surface uppercase tracking-wider">Memo Directory</h4>
                    </div>

                    {/* Date filter field with clear filter option */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 flex items-center">
                                <span className="material-symbols-outlined text-[18px]">date_range</span>
                            </span>
                            <input 
                                type="text" 
                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded pl-9 pr-3 py-1.5 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary cursor-pointer" 
                                placeholder="Filter by date..." 
                                readOnly
                                value={dateFilter}
                                onClick={handleFilterDateClick}
                            />
                        </div>
                        {dateFilter && (
                            <button 
                                className="bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer" 
                                onClick={() => setDateFilter('')} 
                                title="Clear filters"
                            >
                                <span className="material-symbols-outlined text-[14px]">clear</span>
                            </button>
                        )}
                    </div>

                    {/* Memos list stack */}
                    <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                        {filteredMeetings.length === 0 ? (
                            <div className="py-12 text-center text-on-surface-variant/50 text-[12px] space-y-2">
                                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">event_busy</span>
                                <p>No memos found</p>
                            </div>
                        ) : (
                            filteredMeetings.map((memo) => {
                                const isSelected = selectedMeetingId === memo.id;
                                const countAtt = Array.isArray(memo.attendees) ? memo.attendees.length : (memo.attendees ? memo.attendees.split(',').filter(Boolean).length : 0);
                                const plainRecap = (memo.recap || '').replace(/<[^>]*>/g, '').trim();
                                const snippet = plainRecap.length > 80 ? plainRecap.substring(0, 80) + '...' : plainRecap;

                                return (
                                    <button
                                        key={memo.id}
                                        id={`memo-item-${memo.id}`}
                                        type="button"
                                        onClick={() => {
                                            setSelectedMeetingId(memo.id);
                                            setTimeout(() => {
                                                const detailEl = document.querySelector('.meeting-main-content');
                                                if (detailEl) {
                                                    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                            }, 50);
                                        }}
                                        className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-2 relative ${
                                            isSelected 
                                                ? 'bg-surface-container-high border-2 border-primary active' 
                                                : 'bg-surface-container-low border-outline-variant/15 hover:bg-surface-container'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-semibold">
                                            <span className="material-symbols-outlined text-[13px] text-primary">calendar_today</span>
                                            {parseDate(memo.date)}
                                        </div>
                                        
                                        <div className="flex justify-between items-center gap-2 mt-0.5">
                                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase ${
                                                countAtt > 0 ? 'bg-emerald-500/10 text-primary border border-primary/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                            }`}>
                                                {countAtt === 1 ? '1 Attendee' : `${countAtt} Attendees`}
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase bg-emerald-500/15 text-primary border border-primary/25">
                                                Done
                                            </span>
                                        </div>

                                        <p className="text-[11.5px] text-on-surface-variant/80 italic leading-snug line-clamp-2">
                                            {snippet || 'No recap written yet.'}
                                        </p>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Main Detail Viewer or Form Editor (col-span-2) */}
                <div className="meeting-main-content lg:col-span-2 glass-panel border border-outline-variant/30 rounded-xl p-5 shadow-xl min-h-[400px]">
                    {!selectedMeetingId ? (
                        <div className="h-full flex flex-col justify-center items-center text-center p-12 space-y-4">
                            <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30">handshake</span>
                            <div className="space-y-1">
                                <h3 className="font-bold text-body-sm text-on-surface uppercase tracking-wider">No Memo Selected</h3>
                                <p className="text-[12px] text-on-surface-variant/80 max-w-xs">Select a meeting memo from the directory list sidebar or create a new memo to view recap contents.</p>
                            </div>
                        </div>
                    ) : !isEditing ? (
                        /* VIEW MODE */
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-outline-variant/20 pb-3 gap-3">
                                <h4 className="font-bold text-body-md text-on-surface flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-primary">calendar_today</span>
                                    Date: {parseDate(formDate)}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button" 
                                        className="bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest font-bold py-1.5 px-3 rounded text-[11px] uppercase transition-colors flex items-center gap-1 cursor-pointer" 
                                        onClick={() => setSelectedMeetingId(null)}
                                    >
                                        <span className="material-symbols-outlined text-[15px]">close</span> Close
                                    </button>
                                    {userRole !== 'Creator' && !actionsDisabled && (
                                        <button 
                                            type="button" 
                                            className="bg-primary text-on-primary hover:opacity-90 font-bold py-1.5 px-3 rounded text-[11px] uppercase transition-opacity flex items-center gap-1 cursor-pointer" 
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <span className="material-symbols-outlined text-[15px]">edit</span> Edit
                                        </button>
                                    )}
                                    {userRole !== 'Creator' && (
                                        <button 
                                            type="button" 
                                            className="bg-error-container/20 text-error border border-error/25 hover:bg-error-container/30 font-bold py-1.5 px-3 rounded text-[11px] uppercase transition-colors flex items-center gap-1 cursor-pointer" 
                                            onClick={() => setIsDeleteConfirmOpen(true)}
                                        >
                                            <span className="material-symbols-outlined text-[15px]">delete</span> Delete
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Attendance grids info block */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3.5 space-y-2">
                                    <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider">Attendees</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {formAttendees.length === 0 ? (
                                            <span className="text-[11.5px] text-on-surface-variant/60 italic">None present</span>
                                        ) : (
                                            formAttendees.map(att => (
                                                <span key={att} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPicBadgeClasses(att)}`}>
                                                    {normalizePicName(att)}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3.5 space-y-2">
                                    <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider">Absentees</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {absentees.length === 0 ? (
                                            <span className="text-[11.5px] text-on-surface-variant/60 italic">None absent</span>
                                        ) : (
                                            absentees.map(name => (
                                                <span key={name} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container border border-outline-variant/35 text-on-surface-variant/60">
                                                    {normalizePicName(name)}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3.5 space-y-2">
                                    <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider">Video Recap</label>
                                    <div className="flex flex-col gap-1 items-start">
                                        {(() => {
                                            const links = formVideoRecap ? formVideoRecap.split(/[\s,]+/).map(l => l.trim()).filter(Boolean) : [];
                                            return links.length > 0 ? (
                                                links.map((link, idx) => (
                                                    <a 
                                                        key={idx}
                                                        href={link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-[12px] text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">videocam</span> Video Recap {links.length > 1 ? `#${idx + 1}` : ''}
                                                    </a>
                                                ))
                                            ) : (
                                                <span className="text-[11.5px] text-on-surface-variant/60 italic">None provided</span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Recap details */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider pb-1.5 border-b border-outline-variant/20 block">
                                    Meeting Recap Detail Notes
                                </label>
                                <div 
                                    className="meeting-recap-text-container bg-surface-container-lowest border border-outline-variant/35 rounded-lg p-5 text-body-sm leading-relaxed text-on-surface prose dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={createSafeHtml(formRecap)}
                                />
                            </div>
                        </div>
                    ) : (
                        /* EDIT MODE */
                        <form onSubmit={handleSaveMemo} className="space-y-5" autoComplete="off">
                            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
                                <h4 className="font-bold text-body-md text-on-surface flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-primary">edit_note</span>
                                    {selectedMeetingId === 'NEW' ? 'Create Meeting Memo' : 'Edit Meeting Memo'}
                                </h4>
                                <button 
                                    type="button" 
                                    className="bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest font-bold py-1.5 px-3 rounded text-[11px] uppercase transition-colors flex items-center gap-1 cursor-pointer" 
                                    onClick={handleCancelEdit}
                                >
                                    <span className="material-symbols-outlined text-[15px]">close</span> Close
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Date <span className="text-error">*</span></label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer" 
                                        placeholder="YYYY-MM-DD" 
                                        readOnly
                                        required
                                        value={formDate}
                                        onClick={handleDatePickerClick}
                                        disabled={actionsDisabled}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Video Recap URL(s)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary" 
                                        placeholder="e.g. https://link1.com, https://link2.com" 
                                        value={formVideoRecap}
                                        onChange={(e) => setFormVideoRecap(e.target.value)}
                                        disabled={actionsDisabled}
                                    />
                                </div>

                                {/* Attendees checkboxes */}
                                <div className="space-y-2">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Attendees Presence Checklist</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low/40 border border-outline-variant/20 rounded p-4">
                                        {meetingMembers.length === 0 ? (
                                            <span className="col-span-full text-[11.5px] text-on-surface-variant/60 italic">
                                                No users with the intern role were found.
                                            </span>
                                        ) : meetingMembers.map(name => {
                                            const isChecked = formAttendees.includes(name);
                                            return (
                                                <label 
                                                    key={name} 
                                                    className="flex items-center gap-2 cursor-pointer select-none text-[12px] text-on-surface font-medium"
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={() => handleAttendeeToggle(name)}
                                                        disabled={actionsDisabled}
                                                        className="rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                                    />
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${getPicBadgeClasses(name)}`}>
                                                        {normalizePicName(name)}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Rich Text Editor Recap */}
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Meeting Recap Notes <span className="text-error">*</span></label>
                                    
                                    {/* Format toolbar using Material symbols */}
                                    <div className="flex flex-wrap gap-1 bg-surface-container-low border border-outline-variant/35 rounded-t p-1">
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} style={getToolbarBtnStyle(activeStyles.bold)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }} title="Bold">
                                            <span className="material-symbols-outlined text-[18px]">format_bold</span>
                                        </button>
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} style={getToolbarBtnStyle(activeStyles.italic)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }} title="Italic">
                                            <span className="material-symbols-outlined text-[18px]">format_italic</span>
                                        </button>
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} style={getToolbarBtnStyle(activeStyles.underline)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('underline'); }} title="Underline">
                                            <span className="material-symbols-outlined text-[18px]">format_underlined</span>
                                        </button>
                                        
                                        <div className="w-[1px] bg-outline-variant/30 my-1 self-stretch mx-1"></div>
                                        
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} style={getToolbarBtnStyle(activeStyles.insertUnorderedList)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('insertUnorderedList'); }} title="Bulleted List">
                                            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                                        </button>
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} style={getToolbarBtnStyle(activeStyles.insertOrderedList)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('insertOrderedList'); }} title="Numbered List">
                                            <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
                                        </button>
                                        
                                        <div className="w-[1px] bg-outline-variant/30 my-1 self-stretch mx-1"></div>
                                        
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} style={getToolbarBtnStyle(activeStyles.justifyLeft)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyLeft'); }} title="Align Left">
                                            <span className="material-symbols-outlined text-[18px]">format_align_left</span>
                                        </button>
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} style={getToolbarBtnStyle(activeStyles.justifyCenter)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyCenter'); }} title="Align Center">
                                            <span className="material-symbols-outlined text-[18px]">format_align_center</span>
                                        </button>
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} style={getToolbarBtnStyle(activeStyles.justifyRight)} onMouseDown={(e) => { e.preventDefault(); applyFormatting('justifyRight'); }} title="Align Right">
                                            <span className="material-symbols-outlined text-[18px]">format_align_right</span>
                                        </button>
                                        
                                        <div className="w-[1px] bg-outline-variant/30 my-1 self-stretch mx-1"></div>
                                        
                                        <button type="button" className={`p-1.5 hover:bg-surface-container-high rounded text-on-surface flex items-center justify-center cursor-pointer`} onMouseDown={handleLinkClick} title="Insert Link">
                                            <span className="material-symbols-outlined text-[18px]">link</span>
                                        </button>
                                    </div>
                                    
                                    <div 
                                        ref={editorRef}
                                        id="meetingFormRecap" 
                                        className="w-full bg-surface-container-low border border-outline-variant/35 border-t-0 rounded-b p-4 text-body-sm text-on-surface focus:outline-none focus:border-primary min-h-[220px]" 
                                        contentEditable={!actionsDisabled} 
                                        onBlur={(e) => setFormRecap(e.currentTarget.innerHTML)}
                                        onKeyUp={handleEditorKeyUp}
                                        onMouseUp={updateActiveStyles}
                                        onPaste={handleEditorPaste}
                                        placeholder="Write down the details of what was discussed, action items, next steps..."
                                        data-placeholder="Write down the details of what was discussed, action items, next steps..."
                                    />
                                </div>
                            </div>

                            {/* Form submit/cancel actions */}
                            <div className="flex gap-3 pt-2">
                                {isUnlocked && userRole !== 'Creator' && (
                                    <button type="submit" className="flex-1 bg-primary text-on-primary hover:opacity-90 font-bold py-2.5 px-4 rounded-lg text-body-sm transition-opacity flex items-center justify-center gap-1.5 cursor-pointer micro-interaction shadow-md">
                                        <span className="material-symbols-outlined text-[18px]">save</span> Save Memo
                                    </button>
                                )}
                                <button type="button" className="flex-1 bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest font-bold py-2.5 px-4 rounded-lg text-body-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 micro-interaction" onClick={handleCancelEdit}>
                                    <span className="material-symbols-outlined text-[18px]">close</span> Cancel
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
        </div>
    );
}
