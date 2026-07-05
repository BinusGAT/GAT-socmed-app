'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { 
    normalizePicName, 
    getPicBadgeClass, 
    getTaskCalculatedStatus,
    getLocalDateInputValue,
    parseDate,
    formatDisplayDate,
    resolveMemberName,
    formatDate
} from '../utils/helpers';

export default function CalendarTab({ onOpenExport }) {
    const {
        scheduleData,
        meetingsData,
        currentData,
        isUnlocked,
        userRole,
        saveCalendarTask,
        deleteCalendarTask,
        memberListData,
        showAlert,
        setCurrentView,
        setSelectedMeetingId
    } = useDashboard();

    const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 5, 1));

    useEffect(() => {
        setCurrentMonth(new Date());
    }, []);
    const [selectedDate, setSelectedDate] = useState('');
    
    // Form Edit State
    const [editingTaskId, setEditingTaskId] = useState(null); // null means adding
    const [formPic, setFormPic] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formTitle, setFormTitle] = useState('');
    const [taskToDelete, setTaskToDelete] = useState(null);

    // Initialize selected date to today on load
    useEffect(() => {
        const today = getLocalDateInputValue();
        setSelectedDate(today);
    }, []);

    // Get combined calendar tasks (schedules + meetings)
    const getCombinedTasks = () => {
        const tasks = [];

        // 1. Scheduled Tasks
        (scheduleData || []).forEach(task => {
            if (!task.Date || !task.PIC || !task.Category) return;
            const parsedDate = parseDate(task.Date);
            if (parsedDate) {
                // Determine upload status from currentData
                const isUploaded = currentData.some(row => 
                    row.ID === task.ID && row.URL && String(row.URL).trim() !== ''
                );
                
                tasks.push({
                    id: task.ID,
                    date: parsedDate,
                    pic: task.PIC,
                    category: task.Category,
                    contentTitle: task['Content Title'] || '',
                    status: isUploaded,
                    isFromDashboard: true,
                    calculatedStatus: getTaskCalculatedStatus({
                        ...task,
                        Status: isUploaded
                    })
                });
            }
        });

        // 2. Meeting Memos
        (meetingsData || []).forEach(m => {
            const parsedDate = parseDate(m.date || m.Date);
            if (parsedDate) {
                tasks.push({
                    id: m.id || m.ID,
                    date: parsedDate,
                    isMeeting: true,
                    pic: 'Meeting',
                    category: 'Recap',
                    calculatedStatus: 'Done'
                });
            }
        });

        return tasks;
    };

    const combinedTasks = getCombinedTasks();

    // Map tasks by date
    const tasksByDateMap = {};
    combinedTasks.forEach(task => {
        if (!tasksByDateMap[task.date]) {
            tasksByDateMap[task.date] = [];
        }
        tasksByDateMap[task.date].push(task);
    });

    const getTasksCountForMonth = () => {
        let count = 0;
        const yearVal = currentMonth.getFullYear();
        const monthVal = currentMonth.getMonth();
        const daysInM = new Date(yearVal, monthVal + 1, 0).getDate();
        
        for (let day = 1; day <= daysInM; day++) {
            const cellDate = `${yearVal}-${String(monthVal + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDateMap[cellDate] || [];
            
            const uniqueRenderTasks = [];
            dayTasks.forEach(task => {
                const isDup = uniqueRenderTasks.some(t => 
                    normalizePicName(t.pic) === normalizePicName(task.pic) && 
                    t.category === task.category &&
                    t.isMeeting === task.isMeeting
                );
                if (!isDup) uniqueRenderTasks.push(task);
            });
            count += uniqueRenderTasks.length;
        }
        return count;
    };

    // Calendar Navigation Helpers
    const shiftMonth = (offset) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
    };

    const goToToday = () => {
        const today = getLocalDateInputValue();
        setSelectedDate(today);
        setCurrentMonth(new Date());
    };

    const formatMonthLabel = (date) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    // Calendar Grid Calculation
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    // Shift date string to display format
    const formatDisplayDateString = (dateStr) => {
        if (!dateStr) return '—';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Tasks for the selected date
    const selectedDateTasks = tasksByDateMap[selectedDate] || [];

    // Edit/Delete handlers
    const startEditTask = (task) => {
        if (!isUnlocked || userRole === 'Creator') return;
        setEditingTaskId(task.id);
        setFormPic(normalizePicName(resolveMemberName(task.pic, memberListData)));
        setFormCategory(task.category);
        setFormTitle(task.contentTitle || '');
    };

    const resetForm = () => {
        setEditingTaskId(null);
        setFormPic('');
        setFormCategory('');
        setFormTitle('');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!isUnlocked || userRole === 'Creator') {
            showAlert('Permission denied. Editing is locked.', 'error');
            return;
        }

        if (!formPic || !formCategory) {
            showAlert('Please fill in PIC and Category.', 'error');
            return;
        }

        let taskID = editingTaskId;
        if (!taskID) {
            // Adding a new task, find high ID sequence
            let maxId = 0;
            scheduleData.forEach(t => {
                if (String(t.ID).startsWith('CT')) {
                    const num = parseInt(t.ID.replace('CT', '')) || 0;
                    if (num > maxId) maxId = num;
                }
            });
            taskID = `CT${maxId + 1}`;
        }

        const formattedDate = formatDate(selectedDate);

        const taskPayload = {
            ID: editingTaskId ? taskID : '',
            Date: formattedDate,
            PIC: formPic,
            Category: formCategory,
            'Content Title': formTitle.trim() || 'Untitled',
            Status: false // Initially false (On Progress)
        };

        const success = await saveCalendarTask(taskPayload);
        if (success) {
            resetForm();
        }
    };

    const handleDeleteTask = (task) => {
        setTaskToDelete(task);
    };

    const formDisabled = !isUnlocked || userRole === 'Creator';

    if (!isUnlocked) {
        return <LockScreen sectionName="Calendar" />;
    }

    return (
        <section className="panel panel-calendar" style={{ display: 'block' }}>
            <div className="panel-header">
                <h2>
                    <span className="panel-icon"><i className="fa-solid fa-calendar-days"></i></span> Calendar
                </h2>
                <div className="panel-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="data-count">
                        {getTasksCountForMonth()} tasks this month
                    </span>
                </div>
            </div>
            
            <div className="calendar-shell">
                {/* Toolbar */}
                <div className="calendar-toolbar">
                    <button type="button" className="calendar-nav-btn" onClick={() => shiftMonth(-1)}>
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <div className="calendar-month-label">
                        <span className="calendar-month-prefix">Month:</span>
                        <h3>{formatMonthLabel(currentMonth)}</h3>
                    </div>
                    <div className="calendar-toolbar-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button type="button" className="btn btn-outline btn-sm" onClick={onOpenExport}>
                            <i className="fa-solid fa-file-image"></i> <span className="btn-text">Export</span>
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={goToToday}>Today</button>
                        <button type="button" className="calendar-nav-btn" onClick={() => shiftMonth(1)}>
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                {/* Weekdays */}
                <div className="calendar-weekdays">
                    <div>Sunday</div>
                    <div>Monday</div>
                    <div>Tuesday</div>
                    <div>Wednesday</div>
                    <div>Thursday</div>
                    <div>Friday</div>
                    <div>Saturday</div>
                </div>

                {/* Days Grid */}
                <div className="calendar-days">
                    {Array.from({ length: totalCells }).map((_, cellIndex) => {
                        const dayNumber = cellIndex - startOffset + 1;
                        const isInMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
                        
                        const cellDate = isInMonth
                            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                            : '';
                        
                        const dayTasks = cellDate ? (tasksByDateMap[cellDate] || []) : [];
                        const isSelected = cellDate && cellDate === selectedDate;
                        const isToday = cellDate === getLocalDateInputValue();
                        const hasTask = dayTasks.length > 0;

                        // Calculate status classes
                        let statusClass = '';
                        let isFullyUploaded = false;

                        if (hasTask) {
                            const hasOverdue = dayTasks.some(t => t.calculatedStatus === 'Overdue');
                            const hasToday = dayTasks.some(t => t.calculatedStatus === 'Due Today');
                            const allDone = dayTasks.every(t => t.calculatedStatus === 'Done');

                            if (allDone) {
                                statusClass = ' status-done';
                            } else if (hasOverdue) {
                                statusClass = ' status-overdue';
                            } else if (hasToday) {
                                statusClass = ' status-today';
                            } else {
                                statusClass = ' status-progress';
                            }

                            // Verify every scheduled task on this day is uploaded in currentData with URL
                            isFullyUploaded = dayTasks.every(task => {
                                if (task.isFromDashboard) {
                                    return task.status; // True if matches a row in currentData with a URL
                                }
                                return true; // Meeting is always "done"
                            });
                        }

                        const uploadedClass = isFullyUploaded ? ' date-uploaded' : '';
                        const className = `calendar-day${!isInMonth ? ' empty' : ''}${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}${hasTask ? ' has-task' : ''}${uploadedClass}${statusClass}`;

                        if (!isInMonth) {
                            return <button key={cellIndex} type="button" className={className} disabled>&nbsp;</button>;
                        }

                        // Remove duplicate tasks (same PIC + same category on same cell date) for visualization
                        const uniqueRenderTasks = [];
                        dayTasks.forEach(task => {
                            const isDup = uniqueRenderTasks.some(t => 
                                normalizePicName(t.pic) === normalizePicName(task.pic) && 
                                t.category === task.category &&
                                t.isMeeting === task.isMeeting
                            );
                            if (!isDup) uniqueRenderTasks.push(task);
                        });

                        return (
                            <button 
                                key={cellIndex} 
                                type="button" 
                                className={className}
                                onClick={() => setSelectedDate(cellDate)}
                            >
                                <span className="calendar-day-number">{dayNumber}</span>
                                <div className="calendar-day-tasks-container">
                                    {uniqueRenderTasks.map((task, idx) => (
                                        <div 
                                            key={idx} 
                                            className="calendar-day-task-item" 
                                            data-is-meeting={task.isMeeting ? "true" : "false"}
                                            data-pic={task.isMeeting ? "Meeting" : normalizePicName(task.pic)}
                                            data-category={task.isMeeting ? "Recap" : task.category}
                                            style={task.isMeeting ? { borderLeft: '2px solid var(--warning)' } : undefined}
                                        >
                                            {task.isMeeting ? (
                                                <span className="calendar-day-task-pill" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                                                    <i className="fa-solid fa-handshake"></i> Meeting
                                                </span>
                                            ) : (
                                                <>
                                                    <span className={`calendar-day-task-pill ${getPicBadgeClass(task.pic)}`} data-is-pic="true">
                                                        {normalizePicName(task.pic)}
                                                    </span>
                                                    <span className="calendar-day-task-category">{task.category}</span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Day Editor Panel */}
                <div className="calendar-editor">
                    <div className="calendar-editor-header">
                        <div>
                            <label>Selected Date</label>
                            <div className="calendar-selected-date">{formatDisplayDateString(selectedDate)}</div>
                        </div>
                        <div className="calendar-editor-hint">Click a day to add or update PIC and category</div>
                    </div>

                    {/* Selected Day Tasks List */}
                    <div className="calendar-selected-tasks-list">
                        {selectedDateTasks.length === 0 ? (
                            <p style={{ color: 'var(--ink-muted)', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>No tasks scheduled on this day</p>
                        ) : (
                            selectedDateTasks.map((task) => (
                                <div key={task.id} className="calendar-task-list-item">
                                    <div className="calendar-task-list-item-info">
                                        {task.isMeeting ? (
                                            <>
                                                <span className="badge" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                                                    <i className="fa-solid fa-handshake"></i> Meeting Memo
                                                </span>
                                                <span style={{ fontWeight: 500 }}>Meeting Agenda & Recap Details</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className={`badge ${getPicBadgeClass(task.pic)}`}>{normalizePicName(task.pic)}</span>
                                                <span style={{ fontWeight: 500 }}>{task.category}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--ink-muted)', marginLeft: '8px' }}>— {task.contentTitle}</span>
                                                <span className={`badge badge-status-${task.calculatedStatus === 'Done' ? 'completed' : task.calculatedStatus === 'Overdue' ? 'overdue' : task.calculatedStatus === 'Due Today' ? 'today' : 'progress'}`} style={{ fontSize: '9px', padding: '1px 4px', marginLeft: '6px' }}>
                                                    {task.calculatedStatus}
                                                </span>
                                                {task.status && (
                                                    <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 4px', marginLeft: '6px' }}>
                                                        <i className="fa-solid fa-cloud-arrow-up"></i> Uploaded
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {task.isMeeting ? (
                                        <div className="calendar-task-list-item-actions">
                                            <button 
                                                type="button" 
                                                className="calendar-task-list-btn edit"
                                                onClick={() => {
                                                    setSelectedMeetingId(task.id);
                                                    setCurrentView('meeting');
                                                }}
                                                title="Go to meeting memo"
                                                style={{ color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
                                            >
                                                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        !formDisabled && (
                                            <div className="calendar-task-list-item-actions">
                                                <button 
                                                    type="button" 
                                                    className="calendar-task-list-btn edit"
                                                    onClick={() => startEditTask(task)}
                                                    title="Edit task details"
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="calendar-task-list-btn delete"
                                                    onClick={() => handleDeleteTask({ id: task.id, title: task.contentTitle })}
                                                    title="Delete task from schedule"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Task Scheduler Form */}
                    {!formDisabled && (
                        <form onSubmit={handleFormSubmit} className="calendar-form" autoComplete="off">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>PIC</label>
                                     <select 
                                         className="form-control"
                                         value={formPic}
                                         onChange={(e) => setFormPic(e.target.value)}
                                         required
                                     >
                                         <option value="" disabled hidden>Select PIC</option>
                                         <option value="Kelvin">Kelvin</option>
                                         <option value="Felix">Felix</option>
                                         <option value="Eduard">Eduard</option>
                                         <option value="Anthoni">Anthoni</option>
                                         <option value="Leonardi">Leonardi</option>
                                         <option value="Ruliyanto">Ruliyanto</option>
                                         <option value="Rafael">Rafael</option>
                                     </select>
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select 
                                        className="form-control"
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled hidden>Select Category</option>
                                        <option value="Article Reels">Article Reels</option>
                                        <option value="Story Telling">Story Telling</option>
                                        <option value="News">News</option>
                                        <option value="Talking Head">Talking Head</option>
                                        <option value="Clipper">Clipper</option>
                                        <option value="Motion">Motion</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Content Title / Topic</label>
                                    <input 
                                        type="text" 
                                        className="form-control"
                                        placeholder="Enter scheduled title (optional)"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-actions calendar-actions">
                                <button type="submit" className="btn btn-primary btn-block">
                                    <i className="fa-solid fa-floppy-disk"></i> {editingTaskId ? 'Save Task' : 'Add Task'}
                                </button>
                                {editingTaskId && (
                                    <button type="button" className="btn btn-danger btn-block" onClick={() => handleDeleteTask({ id: editingTaskId, title: formTitle })}>
                                        <i className="fa-solid fa-trash-can"></i> Delete
                                    </button>
                                )}
                                <button type="button" className="btn btn-secondary btn-block" onClick={resetForm}>
                                    <i className="fa-solid fa-arrow-rotate-left"></i> Reset
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            {taskToDelete && typeof window !== 'undefined' && createPortal(
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 1100 }}>
                    <div className="modal-card" style={{ maxWidth: '400px', width: '90%' }}>
                        <div className="modal-card-header" style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <h2 style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-triangle-exclamation"></i> Confirm Delete
                            </h2>
                            <button className="modal-close" onClick={() => setTaskToDelete(null)} aria-label="Close modal">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="modal-card-body" style={{ padding: '20px 24px', fontSize: '14px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                            Are you sure you want to delete the task: <strong style={{ color: 'var(--ink-primary)' }}>"{taskToDelete.title}"</strong> from the master schedule? This will also remove its associated platform rows in the Laporan database.
                        </div>
                        <div className="modal-card-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--hairline)' }}>
                            <button type="button" className="btn btn-outline" onClick={() => setTaskToDelete(null)}>Cancel</button>
                            <button 
                                type="button" 
                                className="btn btn-danger" 
                                onClick={async () => {
                                    const success = await deleteCalendarTask(taskToDelete.id);
                                    if (success) {
                                        resetForm();
                                    }
                                    setTaskToDelete(null);
                                }}
                            >
                                Delete Task
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </section>
    );
}
