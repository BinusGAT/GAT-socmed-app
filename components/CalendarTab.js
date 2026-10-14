'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { TaskLinksModal } from './Modals';
import {
    normalizePicName, 
    getPicDisplayName,
    getPicShortName,
    getTaskCalculatedStatus,
    getLocalDateInputValue,
    parseDate,
    formatDisplayDate,
    resolveMemberName,
    formatDate,
    getPicBadgeClasses,
    calculateRecurringDates
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
        rescheduleCalendarTask,
        deleteCalendarTask,
        memberListData,
        categoriesData,
        showAlert,
        setCurrentView,
        setSelectedMeetingId,
        selectedTaskId,
        setSelectedTaskId,
        setSelectedPostId,
        tasklistFilterPic,
        setTasklistFilterPic,
        tasklistFilterCategory,
        setTasklistFilterCategory
    } = useDashboard();

    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => getLocalDateInputValue());
    
    // Form Edit State
    const [editingTaskId, setEditingTaskId] = useState(null); // null means adding
    const [formPic, setFormPic] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formTitle, setFormTitle] = useState('');
    const [taskToDelete, setTaskToDelete] = useState(null);

    // Recurrence & Series State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFreq, setRecurrenceFreq] = useState('weekly');
    const [recurrenceLimitType, setRecurrenceLimitType] = useState('count');
    const [recurrenceCount, setRecurrenceCount] = useState(4);
    const [recurrenceUntilDate, setRecurrenceUntilDate] = useState('');
    const [seriesEditOption, setSeriesEditOption] = useState('single');

    // Drag and Drop, Quick Reschedule, Popover & Link Modal States
    const [dragOverDate, setDragOverDate] = useState(null);
    const [draggingTaskId, setDraggingTaskId] = useState(null);
    const [quickRescheduleTaskId, setQuickRescheduleTaskId] = useState(null);
    const [quickRescheduleCustomDate, setQuickRescheduleCustomDate] = useState('');
    const [activePopoverDate, setActivePopoverDate] = useState(null);
    const [linksModalTask, setLinksModalTask] = useState(null);

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
                    assignedUserId: task.AssignedUserId || '',
                    series_id: task.series_id || '',
                    recurrence_rule: task.recurrence_rule || ''
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

        return tasks.filter(task => {
            if (task.isMeeting) {
                if (tasklistFilterCategory && tasklistFilterCategory !== 'Recap') return false;
                if (tasklistFilterPic) return false;
                return true;
            }
            if (tasklistFilterPic && normalizePicName(resolveMemberName(task.pic, memberListData)) !== normalizePicName(tasklistFilterPic)) {
                return false;
            }
            if (tasklistFilterCategory && task.category !== tasklistFilterCategory) {
                return false;
            }
            return true;
        });
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
                    getPicDisplayName(t.pic) === getPicDisplayName(task.pic) && 
                    t.category === task.category &&
                    t.isMeeting === task.isMeeting
                );
                if (!isDup) uniqueRenderTasks.push(task);
            });
            count += uniqueRenderTasks.length;
        }
        return count;
    };

    // Category counts for interactive pill bar (filtered by PIC if selected)
    const categoryCounts = useMemo(() => {
        const counts = { total: 0 };
        (scheduleData || []).forEach(task => {
            if (!task.Date || !task.PIC || !task.Category) return;
            if (tasklistFilterPic && normalizePicName(resolveMemberName(task.PIC, memberListData)) !== normalizePicName(tasklistFilterPic)) {
                return;
            }
            counts.total = (counts.total || 0) + 1;
            const cat = task.Category;
            counts[cat] = (counts[cat] || 0) + 1;
        });
        if (!tasklistFilterPic) {
            (meetingsData || []).forEach(m => {
                if (m.date || m.Date) {
                    counts.total = (counts.total || 0) + 1;
                    counts['Recap'] = (counts['Recap'] || 0) + 1;
                }
            });
        }
        return counts;
    }, [scheduleData, meetingsData, tasklistFilterPic, memberListData]);

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
        if (!dateStr) return '-';
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
    const currentEditingTask = useMemo(() => {
        if (!editingTaskId) return null;
        return scheduleData.find(t => String(t.ID) === String(editingTaskId)) || null;
    }, [editingTaskId, scheduleData]);

    const startEditTask = (task) => {
        if (!isUnlocked) return;
        if (userRole === 'Creator' && !isTaskAssignedToUser(task, userId, userName)) return;
        setEditingTaskId(task.id);
        setFormPic(normalizePicName(resolveMemberName(task.pic, memberListData)));
        setFormCategory(task.category);
        setFormTitle(task.contentTitle || '');
        setSeriesEditOption('single');
        setIsRecurring(false);
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
        setIsRecurring(false);
        setRecurrenceFreq('weekly');
        setRecurrenceLimitType('count');
        setRecurrenceCount(4);
        setRecurrenceUntilDate('');
        setSeriesEditOption('single');
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
        if (!taskID && !isRecurring) {
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
            ID: taskID,
            Date: formattedDate,
            PIC: formPic,
            Category: formCategory,
            'Content Title': formTitle.trim() || 'Untitled',
            Status: false // Initially false (On Progress)
        };

        if (!editingTaskId && isRecurring) {
            taskPayload.recurrence = {
                frequency: recurrenceFreq,
                limitType: recurrenceLimitType,
                count: recurrenceCount,
                untilDate: recurrenceUntilDate
            };
        } else if (editingTaskId && currentEditingTask?.series_id) {
            taskPayload.series_id = currentEditingTask.series_id;
            taskPayload.applyToSeries = seriesEditOption;
        }

        const success = await saveCalendarTask(taskPayload);
        if (success) {
            resetForm();
        }
    };

    const handleDeleteTask = (task) => {
        const fullTask = scheduleData.find(t => String(t.ID) === String(task.id));
        setTaskToDelete({
            id: task.id,
            title: task.contentTitle || task.title || fullTask?.['Content Title'] || 'Untitled',
            series_id: task.series_id || fullTask?.series_id || null,
            date: task.date || fullTask?.Date || ''
        });
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
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <Icon name="calendar_view_month" size={20} className="text-primary" />
                    <div>
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Calendar Directory</h4>
                        <p className="text-[11px] text-muted-foreground font-mono">{combinedTasks.length} {combinedTasks.length === 1 ? 'task' : 'tasks'} scheduled</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    {/* Reset button */}
                    {(tasklistFilterPic || tasklistFilterCategory) && (
                        <button 
                            type="button"
                            className="bg-muted hover:bg-muted/80 border border-border text-foreground font-medium py-1.5 px-3 rounded-md text-[11px] uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            onClick={() => {
                                setTasklistFilterPic('');
                                setTasklistFilterCategory('');
                            }}
                        >
                            <Icon name="restart_alt" size={13} /> Reset
                        </button>
                    )}

                    {/* PIC filter */}
                    <div className="flex-1 sm:w-40 min-w-[130px]">
                        <select 
                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                            value={tasklistFilterPic}
                            onChange={(e) => setTasklistFilterPic(e.target.value)}
                        >
                            <option value="">All PICs</option>
                            {memberListData.map(m => (
                                <option key={m.NAMA} value={m.NAMA}>{getPicDisplayName(m.NAMA)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category filter */}
                    <div className="flex-1 sm:w-40 min-w-[130px]">
                        <select 
                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                            value={tasklistFilterCategory}
                            onChange={(e) => setTasklistFilterCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categoriesData.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Interactive Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar" role="region" aria-label="Category Filters">
                <button
                    type="button"
                    onClick={() => setTasklistFilterCategory('')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                        !tasklistFilterCategory
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border'
                    }`}
                >
                    <span>All</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold leading-none ${
                        !tasklistFilterCategory ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                        {categoryCounts.total || 0}
                    </span>
                </button>
                {categoriesData.map(cat => {
                    const count = categoryCounts[cat.name] || 0;
                    const isActive = tasklistFilterCategory === cat.name;
                    return (
                        <button
                            key={cat.name}
                            type="button"
                            onClick={() => setTasklistFilterCategory(isActive ? '' : cat.name)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                                isActive
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border'
                            }`}
                        >
                            <span>{cat.name}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold leading-none ${
                                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
                {(categoryCounts['Recap'] > 0 || tasklistFilterCategory === 'Recap') && (
                    <button
                        type="button"
                        onClick={() => setTasklistFilterCategory(tasklistFilterCategory === 'Recap' ? '' : 'Recap')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                            tasklistFilterCategory === 'Recap'
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border'
                        }`}
                    >
                        <span>Recap</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold leading-none ${
                            tasklistFilterCategory === 'Recap' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                            {categoryCounts['Recap'] || 0}
                        </span>
                    </button>
                )}
            </div>

            {/* Calendar & Form Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start calendar-layout">
                
                {/* Mobile agenda navigator */}
                <section className="sm:hidden rounded-lg border border-border bg-surface p-3 shadow-xs" aria-labelledby="mobile-planner-period">
                    <div className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => shiftSelectedWeek(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60 text-foreground hover:bg-muted transition-colors" aria-label="Previous week">
                            <Icon name="chevron_left" size={16} />
                        </button>
                        <div className="min-w-0 text-center">
                            <h3 id="mobile-planner-period" className="truncate text-sm font-semibold text-foreground">{formatMonthLabel(selectedDateObject)}</h3>
                            <p className="text-xs text-muted-foreground font-mono">{getTasksCountForMonth()} tasks this month</p>
                        </div>
                        <button type="button" onClick={() => shiftSelectedWeek(1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60 text-foreground hover:bg-muted transition-colors" aria-label="Next week">
                            <Icon name="chevron_right" size={16} />
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
                                    className={`flex min-w-0 flex-col items-center gap-1 rounded-md py-2 transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-foreground hover:bg-muted'}`}
                                >
                                    <span className={`text-xs font-medium ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                    <span className="text-sm font-semibold font-mono">{date.getDate()}</span>
                                    <span className={`h-1.5 min-w-1.5 rounded-full ${tasks.length ? (isSelected ? 'bg-primary-foreground' : 'bg-primary') : isToday ? 'border border-primary' : 'bg-transparent'}`} aria-hidden="true" />
                                </button>
                            );
                        })}
                    </div>

                    <button type="button" onClick={goToToday} className="mt-3 w-full rounded-md bg-muted py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/80">
                        Jump to today
                    </button>
                </section>

                {/* Main Month Grid (Left/Center 3 columns) */}
                <div className="hidden sm:block lg:col-span-8 rounded-lg overflow-hidden border border-border shadow-xs bg-surface calendar-shell">
                    
                    {/* Month Toolbar */}
                    <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-surface">
                        <div className="flex items-center gap-1.5">
                            <button className="h-7 w-7 rounded-md bg-muted/60 hover:bg-muted border border-border text-foreground flex items-center justify-center cursor-pointer transition-colors calendar-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                                <Icon name="chevron_left" size={14} />
                            </button>
                            <h4 className="font-semibold text-sm text-foreground px-2 min-w-[140px] text-center">
                                {formatMonthLabel(currentMonth)}
                            </h4>
                            <button className="h-7 w-7 rounded-md bg-muted/60 hover:bg-muted border border-border text-foreground flex items-center justify-center cursor-pointer transition-colors calendar-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
                                <Icon name="chevron_right" size={14} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 calendar-toolbar-actions">
                            {userRole === 'Admin' && (
                                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                    <Icon name="drag_indicator" size={13} /> Drag to reschedule
                                </span>
                            )}
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded-md font-mono text-[11px]">
                                {getTasksCountForMonth()} Tasks
                            </span>
                            <button className="bg-muted/60 hover:bg-muted border border-border text-foreground font-medium py-1 px-2.5 rounded-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer" onClick={onOpenExport}>
                                <Icon name="image" size={13} /> Export
                            </button>
                            <button className="bg-muted/60 hover:bg-muted border border-border text-foreground font-medium py-1 px-2.5 rounded-md text-xs transition-colors cursor-pointer" onClick={goToToday}>
                                Today
                            </button>
                        </div>
                    </div>

                    {/* Weekdays indicator */}
                    <div className="grid grid-cols-7 text-center py-2 border-b border-border bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider calendar-weekdays">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                    </div>

                    {/* Days Grid Cells */}
                    <div className="grid grid-cols-7 bg-border gap-[1px] calendar-days" style={{ '--cal-rows': Math.ceil(totalCells / 7) }}>
                        {Array.from({ length: totalCells }).map((_, cellIndex) => {
                            // 6-week months have shorter rows: 2 pills + "more" keeps content inside the cell
                            const maxPills = totalCells > 35 ? 2 : 3;
                            const dayNumber = cellIndex - startOffset + 1;
                            const isInMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
                            
                            const cellDate = isInMonth
                                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                                : '';
                            
                            const dayTasks = cellDate ? (tasksByDateMap[cellDate] || []) : [];
                            const isSelected = cellDate && cellDate === selectedDate;
                            const isToday = cellDate === getLocalDateInputValue();
                            const hasTask = dayTasks.length > 0;
                            const isDropTarget = dragOverDate === cellDate;

                            let statusClass = 'bg-surface hover:bg-muted/20';
                            let isFullyUploaded = false;

                            if (hasTask) {
                                const hasOverdue = dayTasks.some(t => t.calculatedStatus === 'Overdue');
                                const hasToday = dayTasks.some(t => t.calculatedStatus === 'Due Today');
                                const allDone = dayTasks.every(t => t.calculatedStatus === 'Done');

                                if (allDone) {
                                    statusClass = 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10';
                                } else if (hasOverdue) {
                                    statusClass = 'bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10';
                                } else if (hasToday) {
                                    statusClass = 'bg-sky-500/5 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10';
                                } else {
                                    statusClass = 'bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10';
                                }

                                isFullyUploaded = dayTasks.every(task => !task.isFromDashboard || task.status);
                            }

                            const activeBorder = isDropTarget
                                ? 'ring-2 ring-primary ring-inset bg-primary/20 scale-[1.01] shadow-sm z-20'
                                : isSelected 
                                ? 'ring-2 ring-primary ring-inset bg-primary/10 shadow-xs z-10' 
                                : isToday 
                                ? 'border border-primary/40 bg-primary/5' 
                                : '';

                            if (!isInMonth) {
                                return (
                                    <div key={cellIndex} className="bg-muted/20 aspect-square lg:aspect-auto p-1.5 opacity-25 select-none">
                                        &nbsp;
                                    </div>
                                );
                            }

                            // Distinct items
                            const uniqueRenderTasks = [];
                            dayTasks.forEach(task => {
                                const isDup = uniqueRenderTasks.some(t => 
                                    getPicDisplayName(t.pic) === getPicDisplayName(task.pic) && 
                                    t.category === task.category &&
                                    t.isMeeting === task.isMeeting
                                );
                                if (!isDup) uniqueRenderTasks.push(task);
                            });

                            return (
                                <div 
                                    key={cellIndex} 
                                    className={`aspect-square lg:aspect-auto min-h-0 overflow-hidden p-2 flex flex-col justify-start items-stretch text-left transition-all duration-150 cursor-pointer calendar-day ${statusClass} ${activeBorder}`}
                                    onClick={() => setSelectedDate(cellDate)}
                                    onDragOver={(e) => {
                                        if (userRole === 'Admin' && cellDate) {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            setDragOverDate(cellDate);
                                        }
                                    }}
                                    onDragLeave={() => {
                                        if (dragOverDate === cellDate) setDragOverDate(null);
                                    }}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        setDragOverDate(null);
                                        setDraggingTaskId(null);
                                        if (userRole === 'Admin' && cellDate) {
                                            const droppedTaskId = e.dataTransfer.getData('text/plain');
                                            if (droppedTaskId) {
                                                await rescheduleCalendarTask(droppedTaskId, cellDate);
                                            }
                                        }
                                    }}
                                >
                                    <div className="flex justify-between items-center gap-1 mb-0.5">
                                        <span className={`text-sm font-mono font-medium ${
                                            isToday ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center shadow-xs' : 'text-muted-foreground'
                                        }`}>
                                            {dayNumber}
                                        </span>
                                        <span className="flex items-center gap-1 min-w-0">
                                            {uniqueRenderTasks.length > maxPills && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDate(cellDate);
                                                        setActivePopoverDate(cellDate);
                                                    }}
                                                    className="text-[11px] font-medium font-mono text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded px-1.5 py-0.5 leading-none whitespace-nowrap transition-colors cursor-pointer"
                                                    aria-label={`Show ${uniqueRenderTasks.length - maxPills} more tasks`}
                                                >
                                                    +{uniqueRenderTasks.length - maxPills} more
                                                </button>
                                            )}
                                            {isFullyUploaded && (
                                                <Icon name="task_alt" size={13} className="text-primary shrink-0" />
                                            )}
                                        </span>
                                    </div>

                                    {/* Task mini-tags stack */}
                                    <div className="space-y-0.5 overflow-hidden mt-1 calendar-day-tasks-container">
                                        {uniqueRenderTasks.slice(0, maxPills).map((task, idx) => (
                                            <div 
                                                key={idx} 
                                                draggable={userRole === 'Admin' && !task.isMeeting}
                                                onDragStart={(e) => {
                                                    if (userRole === 'Admin' && !task.isMeeting) {
                                                        e.dataTransfer.setData('text/plain', String(task.id));
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        setDraggingTaskId(task.id);
                                                    }
                                                }}
                                                onDragEnd={() => {
                                                    setDraggingTaskId(null);
                                                    setDragOverDate(null);
                                                }}
                                                className={`text-xs font-medium px-1.5 py-0.5 rounded border leading-snug truncate flex items-center gap-1 calendar-day-task-item hover:opacity-85 transition-all ${
                                                    userRole === 'Admin' && !task.isMeeting ? 'cursor-grab active:cursor-grabbing' : ''
                                                } ${
                                                    draggingTaskId === task.id ? 'opacity-40 scale-95' : ''
                                                } ${
                                                    task.isMeeting 
                                                        ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20' 
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
                                                        <Icon name="handshake" size={10} /> Meeting
                                                    </span>
                                                ) : (
                                                    <span className="calendar-day-task-pill flex items-center gap-1 overflow-hidden">
                                                        {task.series_id && (
                                                            <Icon name="repeat" size={10} className="shrink-0" />
                                                        )}
                                                        <span className="truncate">{getPicDisplayName(task.pic)}: {task.category}</span>
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Day Editor Sidebar (Right 1 column) */}
                <div className="space-y-3 lg:col-span-4 calendar-side-panel">
                    
                    {/* Selected Date & Scheduled Pipeline Card */}
                    <div className="bg-surface border border-border rounded-lg p-3 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Icon name="calendar_month" size={15} className="text-primary shrink-0" />
                                <h5 className="text-xs font-semibold text-foreground truncate">
                                    {formatDisplayDateString(selectedDate)}
                                </h5>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground shrink-0 bg-muted/60 px-1.5 py-0.5 rounded">
                                {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                        </div>

                        <div className="space-y-2 max-h-[160px] 2k:max-h-[220px] overflow-y-auto pr-0.5">
                            {selectedDateTasks.length === 0 ? (
                                <div className="py-2.5 px-3 rounded-md bg-muted/20 border border-dashed border-border/70 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                                    <Icon name="event_available" size={14} className="text-muted-foreground/60 shrink-0" />
                                    <span>No tasks scheduled on this day</span>
                                </div>
                            ) : (
                                selectedDateTasks.map((task) => {
                                    const badgeClass = task.calculatedStatus === 'Done' 
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                        : task.calculatedStatus === 'Overdue' 
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                                        : task.calculatedStatus === 'Due Today' 
                                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' 
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';

                                    return (
                                        <div 
                                             key={task.id} 
                                             className={`bg-muted/30 border border-border rounded-md p-2.5 text-xs ${
                                                 task.isMeeting ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''
                                             }`}
                                        >
                                            <div 
                                                className="flex items-center justify-between gap-2"
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
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                            <Icon name="handshake" size={11} /> Meeting
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${getPicMobileBadgeClass(task.pic)}`}>
                                                                {getPicDisplayName(task.pic)}
                                                            </span>
                                                            <span className="font-semibold text-foreground">{task.category}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground font-medium line-clamp-2 sm:line-clamp-1 flex items-center gap-1" title={task.contentTitle || 'Untitled'}>
                                                    {task.series_id && (
                                                        <Icon name="repeat" size={12} className="text-primary shrink-0" />
                                                    )}
                                                    <span>{task.isMeeting ? 'Meeting Agenda & Recap Details' : (task.contentTitle || 'Untitled')}</span>
                                                </p>
                                                {!task.isMeeting && (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${badgeClass}`}>
                                                            {task.calculatedStatus}
                                                        </span>
                                                        {task.status && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setLinksModalTask(task)}
                                                                className="px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5 transition-colors cursor-pointer"
                                                                title="View live platform URLs"
                                                            >
                                                                Uploaded <Icon name="open_in_new" size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {task.isMeeting ? (
                                                <button 
                                                    type="button" 
                                                    className="w-7 h-7 flex items-center justify-center bg-muted/60 hover:bg-muted border border-border rounded-md text-foreground hover:text-primary transition-colors cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedMeetingId(task.id);
                                                        setCurrentView('meeting');
                                                    }}
                                                    title="Go to meeting memo"
                                                >
                                                    <Icon name="open_in_new" size={14} />
                                                </button>
                                            ) : (
                                                (!formDisabled || userRole === 'Creator') && (userRole !== 'Creator' || isTaskAssignedToUser(task, userId, userName)) && (
                                                    <div className="flex items-center gap-1">
                                                        {userRole === 'Admin' && (
                                                            <button 
                                                                type="button" 
                                                                className={`w-7 h-7 flex items-center justify-center border rounded-md cursor-pointer transition-colors ${
                                                                    quickRescheduleTaskId === task.id ? 'text-primary border-primary bg-primary/10' : 'bg-muted/60 hover:bg-muted border-border text-muted-foreground hover:text-foreground'
                                                                }`}
                                                                onClick={() => {
                                                                    if (quickRescheduleTaskId === task.id) {
                                                                        setQuickRescheduleTaskId(null);
                                                                    } else {
                                                                        setQuickRescheduleTaskId(task.id);
                                                                        setQuickRescheduleCustomDate(task.date || selectedDate || getLocalDateInputValue());
                                                                    }
                                                                }}
                                                                title="Quick reschedule"
                                                            >
                                                                <Icon name="event_repeat" size={14} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            type="button" 
                                                            className="w-7 h-7 flex items-center justify-center bg-muted/60 hover:bg-muted border border-border rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                                            onClick={() => startEditTask(task)}
                                                            title="Edit task details"
                                                        >
                                                            <Icon name="edit" size={14} />
                                                        </button>
                                                        {userRole !== 'Creator' && (
                                                            <button 
                                                                type="button" 
                                                                className="w-7 h-7 flex items-center justify-center bg-muted/60 hover:bg-rose-500/10 border border-border rounded-md text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 cursor-pointer transition-colors"
                                                                onClick={() => handleDeleteTask({ id: task.id, title: task.contentTitle, series_id: task.series_id, date: task.date })}
                                                                title="Delete task from schedule"
                                                            >
                                                                <Icon name="delete" size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                        {quickRescheduleTaskId === task.id && (
                                            <div className="mt-2.5 pt-2.5 border-t border-border space-y-2">
                                                <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Icon name="schedule" size={13} className="text-primary" /> Quick Reschedule
                                                    </span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setQuickRescheduleTaskId(null)}
                                                        className="text-muted-foreground hover:text-foreground p-0.5"
                                                    >
                                                        <Icon name="close" size={13} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 text-[11px] font-medium bg-muted hover:bg-muted/80 border border-border rounded-md text-foreground transition-colors cursor-pointer"
                                                        onClick={async () => {
                                                            const baseDate = new Date(`${task.date}T00:00:00`);
                                                            baseDate.setDate(baseDate.getDate() + 1);
                                                            const y = baseDate.getFullYear();
                                                            const m = String(baseDate.getMonth() + 1).padStart(2, '0');
                                                            const d = String(baseDate.getDate()).padStart(2, '0');
                                                            await rescheduleCalendarTask(task.id, `${y}-${m}-${d}`);
                                                            setQuickRescheduleTaskId(null);
                                                        }}
                                                    >
                                                        +1 Day
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 text-[11px] font-medium bg-muted hover:bg-muted/80 border border-border rounded-md text-foreground transition-colors cursor-pointer"
                                                        onClick={async () => {
                                                            const baseDate = new Date(`${task.date}T00:00:00`);
                                                            baseDate.setDate(baseDate.getDate() + 7);
                                                            const y = baseDate.getFullYear();
                                                            const m = String(baseDate.getMonth() + 1).padStart(2, '0');
                                                            const d = String(baseDate.getDate()).padStart(2, '0');
                                                            await rescheduleCalendarTask(task.id, `${y}-${m}-${d}`);
                                                            setQuickRescheduleTaskId(null);
                                                        }}
                                                    >
                                                        +1 Week
                                                    </button>
                                                    <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                                                        <input 
                                                            type="date"
                                                            value={quickRescheduleCustomDate}
                                                            onChange={(e) => setQuickRescheduleCustomDate(e.target.value)}
                                                            className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="px-2.5 py-1 text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
                                                            onClick={async () => {
                                                                if (quickRescheduleCustomDate) {
                                                                    await rescheduleCalendarTask(task.id, quickRescheduleCustomDate);
                                                                    setQuickRescheduleTaskId(null);
                                                                }
                                                            }}
                                                        >
                                                            Move
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                            )}
                        </div>
                    </div>

                    {/* Task Scheduler Form (Right sidebar bottom) */}
                    {showForm && (
                        <div className="bg-surface border border-border rounded-lg p-3 shadow-xs space-y-2.5">
                            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider pb-1.5 border-b border-border flex items-center justify-between">
                                <span>{editingTaskId ? (userRole === 'Creator' ? 'Edit Content Title' : 'Edit schedule') : 'Schedule task'}</span>
                                {userRole === 'Creator' && (
                                    <div className="relative group inline-flex items-center">
                                        <span 
                                            className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold cursor-help transition-colors group-hover:bg-primary group-hover:text-primary-foreground select-none" 
                                            aria-label="Creator mode info"
                                        >
                                            !
                                        </span>
                                        <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block z-50 w-64 p-2.5 bg-surface border border-border rounded-md shadow-xl text-[11px] font-normal text-muted-foreground normal-case leading-relaxed pointer-events-none">
                                            Creator mode: PIC and Category are managed by Admin. You can edit the <strong className="text-foreground">Content Title</strong>.
                                        </div>
                                    </div>
                                )}
                            </h5>
                            <form onSubmit={handleFormSubmit} className="space-y-2.5" autoComplete="off">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">PIC</label>
                                        <select 
                                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                            value={formPic}
                                            onChange={(e) => setFormPic(e.target.value)}
                                            required
                                            disabled={userRole === 'Creator'}
                                        >
                                            <option value="" disabled hidden>Select PIC</option>
                                            {memberListData.map(m => (
                                                <option key={m.NAMA} value={m.NAMA}>{getPicDisplayName(m.NAMA)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                                        <select 
                                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
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
                                    <label className="text-xs font-medium text-muted-foreground">Content Title / Topic</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Scheduled title (optional)"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                    />
                                </div>

                                {!editingTaskId && userRole === 'Admin' && (
                                    <div className="pt-2 border-t border-border space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                                            <input 
                                                type="checkbox"
                                                checked={isRecurring}
                                                onChange={(e) => setIsRecurring(e.target.checked)}
                                                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                                            />
                                            <span className="flex items-center gap-1.5">
                                                <Icon name="repeat" size={14} className="text-primary" />
                                                Repeat schedule
                                            </span>
                                        </label>
                                        {isRecurring && (
                                            <div className="bg-muted/30 border border-border rounded-md p-2.5 space-y-2.5">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">Frequency</label>
                                                        <select 
                                                            value={recurrenceFreq}
                                                            onChange={(e) => setRecurrenceFreq(e.target.value)}
                                                            className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                                                        >
                                                            <option value="daily">Daily</option>
                                                            <option value="weekly">Weekly</option>
                                                            <option value="biweekly">Bi-weekly</option>
                                                            <option value="monthly">Monthly</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">Ends</label>
                                                        <select 
                                                            value={recurrenceLimitType}
                                                            onChange={(e) => setRecurrenceLimitType(e.target.value)}
                                                            className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                                                        >
                                                            <option value="count">After count</option>
                                                            <option value="untilDate">On date</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {recurrenceLimitType === 'count' ? (
                                                    <div>
                                                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">Occurrences (2 - 12)</label>
                                                        <input 
                                                            type="number"
                                                            min="2"
                                                            max="12"
                                                            value={recurrenceCount}
                                                            onChange={(e) => setRecurrenceCount(Math.min(Math.max(Number(e.target.value) || 2, 2), 12))}
                                                            className="w-full bg-background border border-border rounded-md px-2.5 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">Until date (max 6 months)</label>
                                                        <input 
                                                            type="date"
                                                            value={recurrenceUntilDate}
                                                            onChange={(e) => setRecurrenceUntilDate(e.target.value)}
                                                            className="w-full bg-background border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {editingTaskId && currentEditingTask?.series_id && userRole === 'Admin' && (
                                    <div className="pt-2 border-t border-border space-y-2">
                                        <label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                            <Icon name="repeat" size={14} />
                                            Recurring Series Options
                                        </label>
                                        <div className="bg-muted/30 border border-border rounded-md p-2 space-y-1.5 text-xs text-foreground">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio"
                                                    name="seriesEditOption"
                                                    value="single"
                                                    checked={seriesEditOption === 'single'}
                                                    onChange={() => setSeriesEditOption('single')}
                                                    className="text-primary focus:ring-primary"
                                                />
                                                <span>Update only this task</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio"
                                                    name="seriesEditOption"
                                                    value="future"
                                                    checked={seriesEditOption === 'future'}
                                                    onChange={() => setSeriesEditOption('future')}
                                                    className="text-primary focus:ring-primary"
                                                />
                                                <span>Update this and all future tasks in series</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" disabled={isMutating} aria-busy={isMutating ? 'true' : 'false'} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-1.5 px-3 rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
                                        <Icon name={isMutating ? 'progress_activity' : 'save'} size={14} className={isMutating ? 'animate-spin' : ''} />
                                        {isMutating ? 'Saving…' : editingTaskId ? 'Save' : 'Add'}
                                    </button>
                                    {editingTaskId && userRole !== 'Creator' && (
                                        <button 
                                            type="button" 
                                            className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center gap-1" 
                                            onClick={() => handleDeleteTask({ id: editingTaskId, title: formTitle, series_id: currentEditingTask?.series_id, date: currentEditingTask?.Date })}
                                        >
                                            <Icon name="delete" size={14} /> Delete
                                        </button>
                                    )}
                                    <button type="button" className="bg-muted hover:bg-muted/80 text-foreground font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center gap-1" onClick={resetForm}>
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
                    <div className="bg-surface border border-border rounded-lg max-w-md w-full overflow-hidden shadow-xl">
                        <div className="px-4 py-3.5 border-b border-border flex justify-between items-center bg-surface">
                            <h2 className="text-sm font-semibold text-rose-500 flex items-center gap-2">
                                <Icon name="warning" size={16} /> Confirm Delete
                            </h2>
                            <button type="button" className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors cursor-pointer" onClick={() => setTaskToDelete(null)} aria-label="Close">
                                <Icon name="close" size={16} />
                            </button>
                        </div>
                        <div className="px-4 py-3.5 text-xs text-muted-foreground leading-relaxed space-y-2">
                            <p>
                                Are you sure you want to delete <strong className="text-foreground">"{taskToDelete.title}"</strong> from the master schedule?
                            </p>
                            {taskToDelete.series_id && (
                                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-md text-xs text-foreground space-y-1">
                                    <p className="font-medium flex items-center gap-1.5 text-primary">
                                        <Icon name="repeat" size={14} /> This task is part of a recurring series.
                                    </p>
                                    <p className="text-muted-foreground">Choose how you want to apply this deletion:</p>
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row justify-end gap-2 bg-surface">
                            <button type="button" className="bg-muted hover:bg-muted/80 text-foreground font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer" onClick={() => setTaskToDelete(null)}>
                                Cancel
                            </button>
                            {taskToDelete.series_id ? (
                                <>
                                    <button 
                                        type="button" 
                                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                                        onClick={async () => {
                                            const success = await deleteCalendarTask(taskToDelete.id, 'single');
                                            if (success) resetForm();
                                            setTaskToDelete(null);
                                        }}
                                    >
                                        This task only
                                    </button>
                                    <button 
                                        type="button" 
                                        className="bg-rose-500/80 hover:bg-rose-500 text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                                        onClick={async () => {
                                            const success = await deleteCalendarTask(taskToDelete.id, 'future');
                                            if (success) resetForm();
                                            setTaskToDelete(null);
                                        }}
                                    >
                                        This and future tasks
                                    </button>
                                    <button 
                                        type="button" 
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                                        onClick={async () => {
                                            const success = await deleteCalendarTask(taskToDelete.id, 'all');
                                            if (success) resetForm();
                                            setTaskToDelete(null);
                                        }}
                                    >
                                        Entire series
                                    </button>
                                </>
                            ) : (
                                <button 
                                    type="button" 
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-1.5" 
                                    onClick={async () => {
                                        const success = await deleteCalendarTask(taskToDelete.id, 'single');
                                        if (success) {
                                            resetForm();
                                        }
                                        setTaskToDelete(null);
                                    }}
                                >
                                    <Icon name="delete" size={14} /> Delete Task
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Popover Modal for Days with High Task Density */}
            {activePopoverDate && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-xs px-4">
                    <div className="bg-surface border border-border rounded-lg max-w-md w-full overflow-hidden shadow-xl">
                        <div className="px-4 py-3.5 border-b border-border flex justify-between items-center bg-surface">
                            <div className="flex items-center gap-2">
                                <Icon name="event_note" size={16} className="text-primary" />
                                <h3 className="text-sm font-semibold text-foreground">
                                    Tasks on {formatDisplayDateString(activePopoverDate)}
                                </h3>
                            </div>
                            <button 
                                type="button" 
                                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors cursor-pointer" 
                                onClick={() => setActivePopoverDate(null)}
                                aria-label="Close"
                            >
                                <Icon name="close" size={16} />
                            </button>
                        </div>
                        <div className="p-3.5 space-y-2 max-h-[380px] overflow-y-auto">
                            {(tasksByDateMap[activePopoverDate] || []).map((task) => (
                                <div 
                                    key={task.id}
                                    className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 border border-border hover:border-primary/40 transition-colors"
                                >
                                    <div className="space-y-1 min-w-0 flex-1 pr-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {task.isMeeting ? (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                    <Icon name="handshake" size={11} /> Meeting
                                                </span>
                                            ) : (
                                                <>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${getPicMobileBadgeClass(task.pic)}`}>
                                                        {getPicDisplayName(task.pic)}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-foreground">{task.category}</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-foreground truncate">
                                            {task.isMeeting ? 'Meeting Agenda & Recap Details' : (task.contentTitle || 'Untitled')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {task.isMeeting ? (
                                            <button 
                                                type="button" 
                                                className="h-7 px-2.5 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setSelectedMeetingId(task.id);
                                                    setCurrentView('meeting');
                                                    setActivePopoverDate(null);
                                                }}
                                            >
                                                Open <Icon name="arrow_forward" size={13} />
                                            </button>
                                        ) : (
                                            <button 
                                                type="button" 
                                                className="h-7 px-2.5 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    startEditTask(task);
                                                    setActivePopoverDate(null);
                                                }}
                                            >
                                                Edit <Icon name="edit" size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-4 py-3 border-t border-border flex justify-end bg-surface">
                            <button 
                                type="button" 
                                className="bg-muted hover:bg-muted/80 text-foreground font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer" 
                                onClick={() => setActivePopoverDate(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Task Live Platform Links & Status Modal */}
            <TaskLinksModal 
                isOpen={!!linksModalTask} 
                onClose={() => setLinksModalTask(null)} 
                task={linksModalTask} 
            />
        </div>
    );
}
