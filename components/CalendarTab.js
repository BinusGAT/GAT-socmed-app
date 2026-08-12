'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import {
    normalizePicName, 
    getTaskCalculatedStatus,
    getLocalDateInputValue,
    parseDate,
    formatDisplayDate,
    resolveMemberName,
    formatDate,
    getPicBadgeClasses
} from '../utils/helpers';
import { isTaskAssignedToUser } from '../utils/rolePermissions';

const getDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function CalendarTab({ onOpenExport }) {
    const {
        scheduleData,
        meetingsData,
        currentData,
        isUnlocked,
        isMutating,
        userRole,
        userId,
        userName,
        saveCalendarTask,
        deleteCalendarTask,
        memberListData,
        categoriesData,
        showAlert,
        setCurrentView,
        setSelectedMeetingId,
        selectedTaskId,
        setSelectedTaskId
    } = useDashboard();

    const [currentMonth, setCurrentMonth] = useState(() => new Date());

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
                    }),
                    assignedUserId: task.AssignedUserId || ''
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

    const shiftSelectedWeek = (offset) => {
        const baseDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
        baseDate.setDate(baseDate.getDate() + (offset * 7));
        const nextDate = getDateInputValue(baseDate);
        setSelectedDate(nextDate);
        setCurrentMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
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
    const selectedDateObject = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
    const mobileWeekStart = new Date(selectedDateObject);
    mobileWeekStart.setDate(selectedDateObject.getDate() - selectedDateObject.getDay());
    const mobileWeekDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(mobileWeekStart);
        date.setDate(mobileWeekStart.getDate() + index);
        const dateString = getDateInputValue(date);
        return {
            date,
            dateString,
            tasks: tasksByDateMap[dateString] || [],
        };
    });

    // Edit/Delete handlers
    const startEditTask = (task) => {
        if (!isUnlocked) return;
        if (userRole === 'Creator' && !isTaskAssignedToUser(task, userId, userName)) return;
        setEditingTaskId(task.id);
        setFormPic(normalizePicName(resolveMemberName(task.pic, memberListData)));
        setFormCategory(task.category);
        setFormTitle(task.contentTitle || '');
    };

    useEffect(() => {
        if (!selectedTaskId) return;
        const selectedTask = combinedTasks.find((task) =>
            !task.isMeeting && String(task.id) === String(selectedTaskId)
        );
        if (!selectedTask) return;

        const selectedTaskDate = new Date(`${selectedTask.date}T00:00:00`);
        if (Number.isNaN(selectedTaskDate.getTime())) return;

        setSelectedDate(selectedTask.date);
        setCurrentMonth(new Date(selectedTaskDate.getFullYear(), selectedTaskDate.getMonth(), 1));
        startEditTask(selectedTask);
        setSelectedTaskId(null);
    }, [selectedTaskId, scheduleData, currentData]);

    const resetForm = () => {
        setEditingTaskId(null);
        setFormPic('');
        setFormCategory('');
        setFormTitle('');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const isAllowed = isUnlocked && (userRole !== 'Creator' || editingTaskId !== null);
        if (!isAllowed) {
            showAlert('Permission denied. Editing is locked.', 'error');
            return;
        }

        if (!formPic || !formCategory) {
            showAlert('Please fill in PIC and Category.', 'error');
            return;
        }

        let taskID = editingTaskId;
        if (!taskID) {
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

    const formDisabled = !isUnlocked;
    const showForm = isUnlocked && (userRole !== 'Creator' || editingTaskId !== null);

    if (!isUnlocked) {
        return <LockScreen sectionName="Calendar" />;
    }

    const getPicMobileBadgeClass = (pic) => {
        return getPicBadgeClasses(pic);
    };

    return (
        <div className="space-y-5">
            {/* Calendar & Form Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-gutter items-start">
                
                {/* Mobile agenda navigator */}
                <section className="sm:hidden rounded-xl border border-outline-variant/30 bg-surface-container p-3 shadow-sm" aria-labelledby="mobile-planner-period">
                    <div className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => shiftSelectedWeek(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high text-on-surface" aria-label="Previous week">
                            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                        </button>
                        <div className="min-w-0 text-center">
                            <h3 id="mobile-planner-period" className="truncate text-base font-bold text-on-surface">{formatMonthLabel(selectedDateObject)}</h3>
                            <p className="text-xs text-on-surface-variant">{getTasksCountForMonth()} tasks this month</p>
                        </div>
                        <button type="button" onClick={() => shiftSelectedWeek(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high text-on-surface" aria-label="Next week">
                            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-7 gap-1" aria-label="Choose a planning date">
                        {mobileWeekDays.map(({ date, dateString, tasks }) => {
                            const isSelected = dateString === selectedDate;
                            const isToday = dateString === getLocalDateInputValue();
                            return (
                                <button
                                    key={dateString}
                                    type="button"
                                    onClick={() => { setSelectedDate(dateString); setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }}
                                    aria-pressed={isSelected}
                                    aria-label={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${tasks.length ? `, ${tasks.length} scheduled` : ''}`}
                                    className={`flex min-w-0 flex-col items-center gap-1 rounded-lg py-2 transition-colors ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'}`}
                                >
                                    <span className={`text-xs font-semibold ${isSelected ? 'text-on-primary' : 'text-on-surface-variant'}`}>{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                    <span className="text-base font-bold font-tabular">{date.getDate()}</span>
                                    <span className={`h-1.5 min-w-1.5 rounded-full ${tasks.length ? (isSelected ? 'bg-on-primary' : 'bg-primary') : isToday ? 'border border-primary' : 'bg-transparent'}`} aria-hidden="true" />
                                </button>
                            );
                        })}
                    </div>

                    <button type="button" onClick={goToToday} className="mt-3 w-full rounded-lg bg-surface-container-high py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest">
                        Jump to today
                    </button>
                </section>

                {/* Main Month Grid (Left/Center 3 columns) */}
                <div className="hidden sm:block lg:col-span-3 rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm bg-surface-container calendar-shell">
                    
                    {/* Month Toolbar */}
                    <div className="px-5 py-3.5 border-b border-outline-variant/20 flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface-container-low">
                        <div className="flex items-center gap-2">
                            <button className="h-8 w-8 rounded-lg bg-surface-container-highest/50 border border-outline-variant/30 hover:bg-surface-container-highest text-on-surface flex items-center justify-center cursor-pointer transition-colors calendar-nav-btn" onClick={() => shiftMonth(-1)}>
                                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                            </button>
                            <h4 className="font-semibold text-sm text-on-surface font-display px-2 min-w-[140px] text-center">
                                {formatMonthLabel(currentMonth)}
                            </h4>
                            <button className="h-8 w-8 rounded-lg bg-surface-container-highest/50 border border-outline-variant/30 hover:bg-surface-container-highest text-on-surface flex items-center justify-center cursor-pointer transition-colors calendar-nav-btn" onClick={() => shiftMonth(1)}>
                                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 calendar-toolbar-actions">
                            <span className="px-2.5 py-1 bg-surface-container-highest/50 text-on-surface-variant border border-outline-variant/30 rounded-md font-mono text-[11px]">
                                {getTasksCountForMonth()} Tasks
                            </span>
                            <button className="bg-surface-container-highest/50 border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest font-medium py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer" onClick={onOpenExport}>
                                <span className="material-symbols-outlined text-[14px]">image</span> Export
                            </button>
                            <button className="bg-surface-container-highest/50 border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest font-medium py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer" onClick={goToToday}>
                                Today
                            </button>
                        </div>
                    </div>

                    {/* Weekdays indicator */}
                    <div className="grid grid-cols-7 text-center py-2.5 border-b border-outline-variant/20 bg-surface-container-low text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider calendar-weekdays">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                    </div>

                    {/* Days Grid Cells */}
                    <div className="grid grid-cols-7 bg-outline-variant/20 gap-[1px] calendar-days">
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

                            let statusClass = 'bg-surface-container-lowest';
                            let isFullyUploaded = false;

                            if (hasTask) {
                                const hasOverdue = dayTasks.some(t => t.calculatedStatus === 'Overdue');
                                const hasToday = dayTasks.some(t => t.calculatedStatus === 'Due Today');
                                const allDone = dayTasks.every(t => t.calculatedStatus === 'Done');

                                if (allDone) {
                                    statusClass = 'bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10';
                                } else if (hasOverdue) {
                                    statusClass = 'bg-rose-500/5 text-rose-400 hover:bg-rose-500/10';
                                } else if (hasToday) {
                                    statusClass = 'bg-sky-500/5 text-sky-400 hover:bg-sky-500/10';
                                } else {
                                    statusClass = 'bg-amber-500/5 text-amber-400 hover:bg-amber-500/10';
                                }

                                isFullyUploaded = dayTasks.every(task => !task.isFromDashboard || task.status);
                            }

                            const activeBorder = isSelected 
                                ? 'bg-indigo-600/15 border-2 border-indigo-500/60 shadow-xs z-10' 
                                : isToday 
                                ? 'border border-indigo-500/30 bg-indigo-500/5' 
                                : '';

                            if (!isInMonth) {
                                return (
                                    <div key={cellIndex} className="bg-surface-container-lowest/25 aspect-square p-1.5 opacity-30 select-none">
                                        &nbsp;
                                    </div>
                                );
                            }

                            // Distinct items
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
                                <div 
                                    key={cellIndex} 
                                    className={`aspect-square p-2 flex flex-col justify-between items-stretch text-left transition-colors duration-150 cursor-pointer calendar-day ${statusClass} ${activeBorder}`}
                                    onClick={() => setSelectedDate(cellDate)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-[12px] font-bold ${
                                            isToday ? 'bg-primary text-on-primary w-5 h-5 rounded-full flex items-center justify-center font-display shadow-sm' : 'text-on-surface-variant'
                                        }`}>
                                            {dayNumber}
                                        </span>
                                        {isFullyUploaded && (
                                            <span className="material-symbols-outlined text-primary text-[14px]" title="All posts published">
                                                task_alt
                                            </span>
                                        )}
                                    </div>

                                    {/* Task mini-tags stack */}
                                    <div className="space-y-1 overflow-hidden mt-1.5 calendar-day-tasks-container">
                                        {uniqueRenderTasks.slice(0, 3).map((task, idx) => (
                                            <div 
                                                key={idx} 
                                                className={`text-[10.5px] font-bold px-2 py-1 rounded border leading-tight truncate uppercase flex items-center gap-1 calendar-day-task-item hover:opacity-85 transition-all ${
                                                    task.isMeeting 
                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                                        : getPicMobileBadgeClass(task.pic)
                                                }`}
                                                data-is-meeting={String(!!task.isMeeting)}
                                                data-pic={task.pic}
                                                data-category={task.category}
                                                onClick={(e) => {
                                                    if (task.isMeeting) {
                                                        e.stopPropagation();
                                                        setSelectedMeetingId(task.id);
                                                        setCurrentView('meeting');
                                                    }
                                                }}
                                            >
                                                {task.isMeeting ? (
                                                    <span className="flex items-center gap-0.5 calendar-day-task-pill">
                                                        <span className="material-symbols-outlined text-[10px]">handshake</span> Meeting
                                                    </span>
                                                ) : (
                                                    <span className="calendar-day-task-pill">{normalizePicName(task.pic)}: {task.category}</span>
                                                )}
                                            </div>
                                        ))}
                                        {uniqueRenderTasks.length > 3 && (
                                            <div className="text-[8px] font-bold text-on-surface-variant/60 text-center uppercase tracking-tighter">
                                                + {uniqueRenderTasks.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Day Editor Sidebar (Right 1 column) */}
                <div className="space-y-4 sm:space-y-6">
                    
                    {/* Selection Summary Header */}
                    <div className="hidden sm:block bg-surface-container border border-outline-variant/30 rounded-xl p-4 shadow-xl space-y-3">
                        <div>
                            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Selected Date</span>
                            <div className="text-body-lg font-bold text-on-surface flex items-center gap-2 mt-1">
                                <span className="material-symbols-outlined text-primary">calendar_month</span>
                                {formatDisplayDateString(selectedDate)}
                            </div>
                        </div>
                        <p className="text-[11px] text-on-surface-variant/80 italic leading-snug">
                            Click a cell in the monthly grid to schedule new tasks or modify agenda entries for that date.
                        </p>
                    </div>

                    {/* Selected Date Tasks List */}
                    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 shadow-xl space-y-4">
                        <div className="flex items-end justify-between gap-3 border-b border-outline-variant/20 pb-2">
                            <div>
                                <h5 className="text-body-sm font-bold text-on-surface uppercase tracking-wider">Scheduled pipeline</h5>
                                <p className="mt-0.5 text-xs font-semibold text-primary sm:hidden">{formatDisplayDateString(selectedDate)}</p>
                            </div>
                            <span className="text-xs font-semibold text-on-surface-variant">{selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'item' : 'items'}</span>
                        </div>

                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                            {selectedDateTasks.length === 0 ? (
                                <div className="py-6 text-center text-on-surface-variant/60 text-body-sm space-y-1">
                                    <span className="material-symbols-outlined text-[28px] text-on-surface-variant/40">inbox</span>
                                    <p>No tasks scheduled on this day</p>
                                </div>
                            ) : (
                                selectedDateTasks.map((task) => {
                                    const badgeClass = task.calculatedStatus === 'Done' 
                                        ? 'bg-emerald-500/10 text-primary border border-primary/20' 
                                        : task.calculatedStatus === 'Overdue' 
                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                        : task.calculatedStatus === 'Due Today' 
                                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

                                    return (
                                        <div 
                                             key={task.id} 
                                             className={`flex items-center justify-between bg-surface-container-low border border-outline-variant/15 rounded p-3 text-body-sm gap-2 ${
                                                 task.isMeeting ? 'cursor-pointer hover:border-primary/45 transition-all' : ''
                                             }`}
                                             onClick={() => {
                                                 if (task.isMeeting) {
                                                     setSelectedMeetingId(task.id);
                                                     setCurrentView('meeting');
                                                 }
                                             }}
                                        >
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {task.isMeeting ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[11px]">handshake</span> Meeting
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getPicMobileBadgeClass(task.pic)}`}>
                                                                {normalizePicName(task.pic)}
                                                            </span>
                                                            <span className="font-bold text-on-surface">{task.category}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-[12px] text-on-surface-variant/90 font-medium line-clamp-2 sm:line-clamp-1" title={task.contentTitle || 'Untitled'}>
                                                    {task.isMeeting ? 'Meeting Agenda & Recap Details' : (task.contentTitle || 'Untitled')}
                                                </p>
                                                {!task.isMeeting && (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${badgeClass}`}>
                                                            {task.calculatedStatus}
                                                        </span>
                                                        {task.status && (
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase bg-emerald-500/15 text-primary border border-primary/20">
                                                                Uploaded
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {task.isMeeting ? (
                                                <button 
                                                    type="button" 
                                                    className="w-7 h-7 flex items-center justify-center bg-surface-container border border-outline-variant/30 rounded text-on-surface hover:text-primary hover:border-primary cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        setSelectedMeetingId(task.id);
                                                        setCurrentView('meeting');
                                                    }}
                                                    title="Go to meeting memo"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                </button>
                                            ) : (
                                                (!formDisabled || userRole === 'Creator') && (userRole !== 'Creator' || isTaskAssignedToUser(task, userId, userName)) && (
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            type="button" 
                                                            className="w-7 h-7 flex items-center justify-center bg-surface-container border border-outline-variant/30 rounded text-on-surface-variant hover:text-primary hover:border-primary cursor-pointer transition-colors"
                                                            onClick={() => startEditTask(task)}
                                                            title="Edit task details"
                                                        >
                                                            <span className="material-symbols-outlined text-[15px]">edit</span>
                                                        </button>
                                                        {userRole !== 'Creator' && (
                                                            <button 
                                                                type="button" 
                                                                className="w-7 h-7 flex items-center justify-center bg-surface-container border border-outline-variant/30 rounded text-on-surface-variant hover:text-error hover:border-error cursor-pointer transition-colors"
                                                                onClick={() => handleDeleteTask({ id: task.id, title: task.contentTitle })}
                                                                title="Delete task from schedule"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Task Scheduler Form (Right sidebar bottom) */}
                    {showForm && (
                        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 shadow-xl space-y-4">
                            <h5 className="text-body-sm font-bold text-on-surface uppercase tracking-wider pb-2 border-b border-outline-variant/20">
                                {editingTaskId ? 'Edit schedule' : 'Schedule task'}
                            </h5>

                            <form onSubmit={handleFormSubmit} className="space-y-4" autoComplete="off">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-body-sm font-semibold text-on-surface-variant">PIC</label>
                                         <select 
                                             className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed"
                                             value={formPic}
                                             onChange={(e) => setFormPic(e.target.value)}
                                             required
                                             disabled={userRole === 'Creator'}
                                         >
                                             <option value="" disabled hidden>Select PIC</option>
                                             {memberListData.map(m => (
                                                 <option key={m.NAMA} value={m.NAMA}>{m.NAMA}</option>
                                             ))}
                                         </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-body-sm font-semibold text-on-surface-variant">Category</label>
                                        <select 
                                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed"
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            required
                                            disabled={userRole === 'Creator'}
                                        >
                                            <option value="" disabled hidden>Select Category</option>
                                            {categoriesData.map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Content Title / Topic</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                        placeholder="Scheduled title (optional)"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" disabled={isMutating} aria-busy={isMutating ? 'true' : 'false'} className="flex-1 bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-3 rounded text-body-sm transition-opacity flex items-center justify-center gap-1.5 cursor-pointer micro-interaction disabled:cursor-wait disabled:opacity-70">
                                        <span className={`material-symbols-outlined text-[16px] ${isMutating ? 'animate-spin' : ''}`}>{isMutating ? 'progress_activity' : 'save'}</span>
                                        {isMutating ? 'Saving…' : editingTaskId ? 'Save' : 'Add'}
                                    </button>
                                    {editingTaskId && userRole !== 'Creator' && (
                                        <button 
                                            type="button" 
                                            className="bg-error-container/20 text-error border border-error/25 hover:bg-error-container/30 font-semibold py-2 px-3 rounded text-body-sm transition-colors cursor-pointer flex items-center justify-center gap-1 micro-interaction" 
                                            onClick={() => handleDeleteTask({ id: editingTaskId, title: formTitle })}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                                        </button>
                                    )}
                                    <button type="button" className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-3 rounded text-body-sm transition-colors cursor-pointer flex items-center justify-center gap-1 micro-interaction" onClick={resetForm}>
                                        Reset
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Modal Confirmation for calendar task deletion */}
            {taskToDelete && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-xs px-4">
                    <div className="bg-surface-container border border-outline-variant/30 rounded-xl max-w-sm w-full overflow-hidden shadow-2xl animate-scale-up">
                        <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
                            <h2 className="text-body-md font-bold text-error flex items-center gap-2">
                                <span className="material-symbols-outlined">warning</span> Confirm Delete
                            </h2>
                            <button className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer" onClick={() => setTaskToDelete(null)}>
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="px-5 py-4 text-body-sm text-on-surface-variant leading-relaxed">
                            Are you sure you want to delete the task <strong className="text-on-surface">"{taskToDelete.title}"</strong> from the master schedule? This will also remove its associated platform rows in the Laporan database.
                        </div>
                        <div className="px-5 py-4 border-t border-outline-variant/20 flex justify-end gap-3 bg-surface-container-lowest">
                            <button type="button" className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded-lg text-body-sm transition-colors cursor-pointer" onClick={() => setTaskToDelete(null)}>
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="bg-error text-on-error hover:opacity-90 font-semibold py-2 px-4 rounded-lg text-body-sm transition-opacity cursor-pointer flex items-center gap-1.5" 
                                onClick={async () => {
                                    const success = await deleteCalendarTask(taskToDelete.id);
                                    if (success) {
                                        resetForm();
                                    }
                                    setTaskToDelete(null);
                                }}
                            >
                                <span className="material-symbols-outlined text-[18px]">delete</span> Delete Task
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
