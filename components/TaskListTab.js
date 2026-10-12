'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { DeleteConfirmModal, TaskLinksModal } from './Modals';
import SortableTableHeader from './SortableTableHeader';
import EmptyState from './EmptyState';
import DiscardChangesModal from './DiscardChangesModal';
import UndoDeleteToast from './UndoDeleteToast';
import { useDeferredDelete } from '../utils/useDeferredDelete';
import { isTaskAssignedToUser } from '../utils/rolePermissions';
import { useDialogFocus } from '../utils/useDialogFocus';
import { 
    normalizePicName, 
    getPicDisplayName,
    getTaskCalculatedStatus,
    getLocalDateInputValue,
    parseDate,
    formatDisplayDate,
    resolveMemberName,
    formatDate,
    getPicBadgeClasses
} from '../utils/helpers';

export default function TaskListTab({ onOpenDatePicker }) {
    const {
        scheduleData,
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
        tasklistSearch, setTasklistSearch,
        tasklistFilterPic, setTasklistFilterPic,
        tasklistFilterCategory, setTasklistFilterCategory,
        tasklistFilterStatus, setTasklistFilterStatus,
        selectedTaskId, setSelectedTaskId
    } = useDashboard();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTaskId, setModalTaskId] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [modalDate, setModalDate] = useState('');
    const [modalPic, setModalPic] = useState('');
    const [modalCategory, setModalCategory] = useState('');
    const [modalStatus, setModalStatus] = useState(false);
    const [formError, setFormError] = useState('');
    const [initialFormState, setInitialFormState] = useState(null);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);
    const [draftRecovered, setDraftRecovered] = useState(false);
    const handledTaskIdRef = React.useRef(null);

    // Recurrence & Series State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFreq, setRecurrenceFreq] = useState('weekly');
    const [recurrenceLimitType, setRecurrenceLimitType] = useState('count');
    const [recurrenceCount, setRecurrenceCount] = useState(4);
    const [recurrenceUntilDate, setRecurrenceUntilDate] = useState('');
    const [seriesEditOption, setSeriesEditOption] = useState('single');

    // Delete confirmation state
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [linksModalTask, setLinksModalTask] = useState(null);
    const { pendingDeletion, scheduleDelete, undoDelete } = useDeferredDelete();

    // Sort states
    const [sortField, setSortField] = useState('Date');
    const [sortAsc, setSortAsc] = useState(true);

    // Get combined tasks list (schedules with resolved status)
    const getTasks = () => {
        const list = [];
        (scheduleData || []).forEach(task => {
            const parsedDate = parseDate(task.Date);
            const isUploaded = currentData.some(row => 
                row.ID === task.ID && row.URL && String(row.URL).trim() !== ''
            );

            const calculatedStatus = getTaskCalculatedStatus({
                ...task,
                Status: isUploaded
            });

            list.push({
                id: task.ID,
                date: parsedDate || '',
                rawDate: task.Date,
                pic: task.PIC,
                contentTitle: task['Content Title'] || '',
                category: task.Category,
                status: isUploaded,
                calculatedStatus: calculatedStatus,
                assignedUserId: task.AssignedUserId || '',
                series_id: task.series_id || '',
                recurrence_rule: task.recurrence_rule || ''
            });
        });
        return list;
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    const getProcessedTasks = () => {
        const query = tasklistSearch ? tasklistSearch.toLowerCase().trim() : '';
        
        return getTasks()
            .filter(task => !query || 
                task.contentTitle.toLowerCase().includes(query) ||
                task.id.toLowerCase().includes(query)
            )
            .filter(task => !tasklistFilterPic || 
                normalizePicName(resolveMemberName(task.pic, memberListData)) === normalizePicName(tasklistFilterPic)
            )
            .filter(task => !tasklistFilterCategory || 
                task.category === tasklistFilterCategory
            )
            .filter(task => !tasklistFilterStatus || 
                task.calculatedStatus === tasklistFilterStatus
            )
            .sort((a, b) => {
                const isDate = sortField === 'Date';
                const valA = isDate ? (a.date || '') : String(a[sortField] || '').toLowerCase();
                const valB = isDate ? (b.date || '') : String(b[sortField] || '').toLowerCase();

                if (valA < valB) return sortAsc ? -1 : 1;
                if (valA > valB) return sortAsc ? 1 : -1;
                return 0;
            });
    };

    const processedTasks = getProcessedTasks();
    const taskDraftKey = `GAT_task_editor_draft:${userId || 'anonymous'}`;
    const currentFormState = { title: modalTitle, date: modalDate, pic: modalPic, category: modalCategory, status: modalStatus };
    const isFormDirty = isModalOpen && initialFormState && JSON.stringify(currentFormState) !== JSON.stringify(initialFormState);

    const applyFormState = (state) => {
        setModalTitle(state.title || '');
        setModalDate(state.date || getLocalDateInputValue());
        setModalPic(state.pic || '');
        setModalCategory(state.category || '');
        setModalStatus(Boolean(state.status));
        setInitialFormState(state);
    };

    const currentEditingTask = useMemo(() => {
        if (!modalTaskId) return null;
        return getTasks().find((task) => String(task.id) === String(modalTaskId)) || null;
    }, [modalTaskId, scheduleData, currentData]);

    const taskToDeleteItem = useMemo(() => {
        if (!taskToDelete) return null;
        return getTasks().find((task) => String(task.id) === String(taskToDelete)) || null;
    }, [taskToDelete, scheduleData, currentData]);

    const openAddModal = () => {
        if (!isUnlocked || userRole === 'Viewer') return;
        setModalTaskId('');
        setIsRecurring(false);
        setRecurrenceFreq('weekly');
        setRecurrenceLimitType('count');
        setRecurrenceCount(4);
        setRecurrenceUntilDate('');
        setSeriesEditOption('single');
        const blankState = { title: '', date: getLocalDateInputValue(), pic: '', category: '', status: false };
        let nextState = blankState;
        let recovered = false;
        try {
            const storedDraft = localStorage.getItem(taskDraftKey);
            if (storedDraft) {
                nextState = JSON.parse(storedDraft);
                recovered = true;
            }
        } catch {}
        applyFormState(nextState);
        if (recovered) setInitialFormState(blankState);
        setDraftRecovered(recovered);
        setFormError('');
        setIsModalOpen(true);
    };

    const openEditModal = (task) => {
        if (!isUnlocked || userRole === 'Viewer') return;
        if (userRole === 'Creator' && !isTaskAssignedToUser(task, userId, userName)) return;
        setModalTaskId(task.id);
        setIsRecurring(false);
        setSeriesEditOption('single');
        const nextState = {
            title: task.contentTitle,
            date: task.date || getLocalDateInputValue(),
            pic: normalizePicName(resolveMemberName(task.pic, memberListData)),
            category: task.category,
            status: task.status,
        };
        applyFormState(nextState);
        setDraftRecovered(false);
        setFormError('');
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (!selectedTaskId) return;
        if (handledTaskIdRef.current === selectedTaskId) return;
        const selectedTask = getTasks().find((task) => String(task.id) === String(selectedTaskId));
        if (!selectedTask) return;

        handledTaskIdRef.current = selectedTaskId;
        openEditModal(selectedTask);
    }, [selectedTaskId, scheduleData, currentData]);

    useEffect(() => {
        if (!isModalOpen || modalTaskId || !isFormDirty) return;
        localStorage.setItem(taskDraftKey, JSON.stringify(currentFormState));
    }, [isModalOpen, modalTaskId, modalTitle, modalDate, modalPic, modalCategory, modalStatus, isFormDirty, taskDraftKey]);

    useEffect(() => {
        if (!isFormDirty) return;
        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isFormDirty]);

    const closeEditor = () => {
        if (isFormDirty) {
            setIsDiscardOpen(true);
            return;
        }
        setIsModalOpen(false);
        setSelectedTaskId(null);
        handledTaskIdRef.current = null;
    };

    const discardAndClose = () => {
        if (!modalTaskId) localStorage.removeItem(taskDraftKey);
        setDraftRecovered(false);
        setIsDiscardOpen(false);
        setIsModalOpen(false);
        setSelectedTaskId(null);
        handledTaskIdRef.current = null;
    };
    const taskDialogRef = useDialogFocus(isModalOpen && !isDiscardOpen, { onEscape: closeEditor });

    const handleModalDateClick = () => {
        onOpenDatePicker((selectedDate) => {
            setModalDate(selectedDate);
        });
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        if (!isUnlocked || userRole === 'Viewer') {
            showAlert('Permission denied. Editing is locked.', 'error');
            return;
        }

        if (!modalDate || !modalPic || !modalCategory) {
            setFormError('Choose a scheduled date, PIC, and category before saving.');
            return;
        }
        setFormError('');

        let taskID = modalTaskId;
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

        const formattedDate = formatDate(modalDate);

        const taskPayload = {
            ID: taskID,
            Date: formattedDate,
            PIC: modalPic,
            Category: modalCategory,
            'Content Title': modalTitle.trim() || 'Untitled',
            Status: modalStatus
        };

        if (!modalTaskId && isRecurring) {
            taskPayload.recurrence = {
                frequency: recurrenceFreq,
                limitType: recurrenceLimitType,
                count: recurrenceCount,
                untilDate: recurrenceUntilDate
            };
        } else if (modalTaskId && currentEditingTask?.series_id) {
            taskPayload.series_id = currentEditingTask.series_id;
            taskPayload.applyToSeries = seriesEditOption;
        }

        const success = await saveCalendarTask(taskPayload);
        if (success) {
            if (!modalTaskId) localStorage.removeItem(taskDraftKey);
            setDraftRecovered(false);
            setIsModalOpen(false);
            setSelectedTaskId(null);
            handledTaskIdRef.current = null;
        }
    };

    const handleDeleteTask = (taskId) => {
        if (!isUnlocked || userRole !== 'Admin') {
            showAlert('Permission denied. Only admins can delete tasks.', 'error');
            return;
        }
        setTaskToDelete(taskId);
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = (scope = 'single') => {
        if (!isUnlocked || userRole !== 'Admin') {
            showAlert('Permission denied. Only admins can delete tasks.', 'error');
            return;
        }
        if (taskToDelete) {
            const taskId = taskToDelete;
            const task = getTasks().find((item) => item.id === taskId);
            scheduleDelete({
                label: task?.contentTitle || `Task ${taskId}`,
                execute: () => deleteCalendarTask(taskId, scope),
            });
            setIsDeleteConfirmOpen(false);
            setTaskToDelete(null);
        }
    };

    const showActions = isUnlocked && userRole === 'Admin';
    const canCreateTask = isUnlocked && userRole === 'Admin';
    const canEditTask = (task) => userRole === 'Admin' || (userRole === 'Creator' && isTaskAssignedToUser(task, userId, userName));

    if (!isUnlocked) {
        return <LockScreen sectionName="Task List" />;
    }



    return (
        <div className="space-y-4">
            {/* Filters panel */}
            <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Task Directory</span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded-md font-mono text-[11px]">
                        {processedTasks.length} items
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                    {canCreateTask && (
                        <button 
                            type="button" 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-1.5 px-3 rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]" 
                            onClick={openAddModal}
                        >
                            <Icon name="add" size={15} /> Add Scheduled Task
                        </button>
                    )}
                    {/* Reset button */}
                    {(tasklistSearch || tasklistFilterPic || tasklistFilterCategory || tasklistFilterStatus) && (
                        <button 
                            type="button"
                            className="bg-muted hover:bg-muted/80 border border-border text-foreground font-medium py-1.5 px-2.5 rounded-md text-[11px] uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            onClick={() => {
                                setTasklistSearch('');
                                setTasklistFilterPic('');
                                setTasklistFilterCategory('');
                                setTasklistFilterStatus('');
                            }}
                        >
                            <Icon name="restart_alt" size={13} /> Reset
                        </button>
                    )}

                    {/* Search query input */}
                    <div className="relative flex-1 sm:w-56">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center pointer-events-none">
                            <Icon name="search" size={14} />
                        </span>
                        <input 
                            type="text" 
                            className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" 
                            placeholder="Search tasks..."
                            value={tasklistSearch}
                            onChange={(e) => setTasklistSearch(e.target.value)}
                        />
                    </div>

                    {/* PIC filter dropdown */}
                    <div className="sm:w-36">
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

                    {/* Category filter dropdown */}
                    <div className="sm:w-36">
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

                    {/* Status filter dropdown */}
                    <div className="sm:w-36">
                        <select 
                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                            value={tasklistFilterStatus}
                            onChange={(e) => setTasklistFilterStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="On Progress">On Progress</option>
                            <option value="Due Today">Due Today</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tasks Table directory */}
            <div className="rounded-lg overflow-hidden border border-border bg-surface shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <caption className="sr-only">Scheduled content tasks. Activate a sortable column heading to change the sort order.</caption>
                        <thead className="bg-muted/30 text-muted-foreground text-xs font-medium tracking-wide border-b border-border">
                            <tr>
                                <SortableTableHeader column="Date" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-4 py-2.5">Scheduled date</SortableTableHeader>
                                <SortableTableHeader column="contentTitle" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-4 py-2.5">Content title / topic</SortableTableHeader>
                                <SortableTableHeader column="pic" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-4 py-2.5">PIC</SortableTableHeader>
                                <SortableTableHeader column="category" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-4 py-2.5">Category</SortableTableHeader>
                                <SortableTableHeader column="calculatedStatus" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-4 py-2.5">Timeline status</SortableTableHeader>
                                {showActions && <th className="px-4 py-2.5 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {processedTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={showActions ? 6 : 5} className="p-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <Icon name="info" size={32} className="text-muted-foreground/35 mb-1" />
                                            <EmptyState
                                                icon={scheduleData.length ? 'filter_alt_off' : 'event_busy'}
                                                title={scheduleData.length ? 'No tasks match these filters' : 'No scheduled tasks yet'}
                                                description={scheduleData.length ? 'Clear the current filters to see the full task directory.' : 'Add the first scheduled task to start planning content.'}
                                                actionLabel={scheduleData.length ? 'Clear filters' : (canCreateTask ? 'Add scheduled task' : undefined)}
                                                onAction={scheduleData.length ? () => {
                                                    setTasklistSearch('');
                                                    setTasklistFilterPic('');
                                                    setTasklistFilterStatus('');
                                                } : (canCreateTask ? openAddModal : undefined)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                processedTasks.map((task) => {
                                    const statusPill = (() => {
                                        switch (task.calculatedStatus) {
                                            case 'Done':
                                                return <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Done</span>;
                                            case 'Overdue':
                                                return <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Overdue</span>;
                                            case 'Due Today':
                                                return <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">Due Today</span>;
                                            default:
                                                return <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">On Progress</span>;
                                        }
                                    })();

                                    return (
                                        <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{task.rawDate}</td>
                                            <td className="px-4 py-3 font-medium text-foreground max-w-[280px] truncate" title={task.contentTitle}>
                                                <span className="inline-flex items-center gap-1.5 max-w-full truncate">
                                                    {task.series_id && (
                                                        <Icon name="repeat" size={13} className="text-primary shrink-0" />
                                                    )}
                                                    <span className="truncate">{task.contentTitle}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getPicBadgeClasses(task.pic)}`}>
                                                    {getPicDisplayName(task.pic)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-muted border border-border text-foreground">
                                                    {task.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {statusPill}
                                                    {task.status && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setLinksModalTask(task)}
                                                            className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 transition-colors cursor-pointer group"
                                                            title="View live platform URLs"
                                                        >
                                                            <Icon name="task_alt" size={11} /> Uploaded
                                                            <Icon name="open_in_new" size={10} className="opacity-70 group-hover:opacity-100" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            {showActions && (
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex gap-1.5 justify-center">
                                                        {canEditTask(task) && <button
                                                            className="w-7 h-7 flex items-center justify-center bg-muted/60 hover:bg-muted border border-border rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                                            onClick={() => openEditModal(task)}
                                                            title="Edit schedule details"
                                                        >
                                                            <Icon name="edit" size={14} />
                                                        </button>}
                                                        {userRole === 'Admin' && (
                                                            <button 
                                                                className="w-7 h-7 flex items-center justify-center bg-muted/60 hover:bg-rose-500/10 border border-border rounded-md text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 cursor-pointer transition-colors"
                                                                onClick={() => handleDeleteTask(task.id)}
                                                                title="Delete schedule entry"
                                                            >
                                                                <Icon name="delete" size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Task Edit/Create Modal (centered overlay dialog) */}
            {isModalOpen && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-xs px-4">
                    <div ref={taskDialogRef} role="dialog" aria-modal="true" aria-labelledby="task-editor-title" tabIndex={-1} className="bg-surface border border-border rounded-lg max-w-md w-full overflow-hidden shadow-xl animate-scale-up">
                        <div className="px-4 py-3.5 border-b border-border flex justify-between items-center bg-surface">
                            <h2 id="task-editor-title" className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Icon name="assignment" size={18} className="text-primary" />
                                <span>{modalTaskId ? (userRole === 'Creator' ? `Edit Content Title (${modalTaskId})` : `Update Scheduled Task (${modalTaskId})`) : 'Add Scheduled Task'}</span>
                                {userRole === 'Creator' && (
                                    <div className="relative group inline-flex items-center">
                                        <span 
                                            className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold cursor-help transition-colors group-hover:bg-primary group-hover:text-primary-foreground select-none" 
                                            aria-label="Creator mode info"
                                        >
                                            !
                                        </span>
                                        <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-50 w-64 p-2.5 bg-surface border border-border rounded-md shadow-xl text-[11px] font-normal text-muted-foreground normal-case leading-relaxed pointer-events-none">
                                            Creator mode: Date, PIC, and Category are managed by Admin. You can edit the <strong className="text-foreground">Content Title</strong>.
                                        </div>
                                    </div>
                                )}
                            </h2>
                            <button type="button" aria-label="Close task editor" className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors cursor-pointer" onClick={closeEditor}>
                                <Icon name="close" size={16} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleModalSubmit} autoComplete="off" noValidate>
                            <div className="px-4 py-3.5 space-y-3.5">
                                {draftRecovered && <p role="status" className="draft-recovery-note flex items-center gap-1.5 text-xs text-primary"><Icon name="restore" size={14} />Recovered an unsaved task draft from this browser.</p>}
                                {formError && <p role="alert" className="form-error-summary flex items-center gap-1.5 text-xs text-rose-500"><Icon name="error" size={14} />{formError}</p>}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Content Title / Topic</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" 
                                        placeholder="Enter title (optional)"
                                        value={modalTitle}
                                        onChange={(e) => setModalTitle(e.target.value)}
                                        autoFocus={userRole === 'Creator'}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Scheduled Date <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="text" 
                                        className={`w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors ${userRole === 'Creator' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`} 
                                        placeholder="YYYY-MM-DD" 
                                        readOnly
                                        required
                                        disabled={userRole === 'Creator'}
                                        value={modalDate}
                                        onClick={userRole === 'Creator' ? undefined : handleModalDateClick}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">PIC <span className="text-rose-500">*</span></label>
                                        <select 
                                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                            required
                                            disabled={userRole === 'Creator'}
                                            value={modalPic}
                                            onChange={(e) => { setModalPic(e.target.value); setFormError(''); }}
                                        >
                                            <option value="" disabled hidden>Select PIC</option>
                                            {memberListData.map(m => (
                                                <option key={m.NAMA} value={m.NAMA}>{getPicDisplayName(m.NAMA)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Category <span className="text-rose-500">*</span></label>
                                        <select 
                                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                            required
                                            disabled={userRole === 'Creator'}
                                            value={modalCategory}
                                            onChange={(e) => setModalCategory(e.target.value)}
                                        >
                                            <option value="" disabled hidden>Select Category</option>
                                            {categoriesData.map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {!modalTaskId && userRole === 'Admin' && (
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

                                {modalTaskId && currentEditingTask?.series_id && userRole === 'Admin' && (
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
                            </div>
                            <div className="px-4 py-3 border-t border-border flex justify-end gap-2 bg-surface">
                                <button type="button" className="bg-muted hover:bg-muted/80 text-foreground font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer" onClick={closeEditor}>Cancel</button>
                                <button type="submit" disabled={isMutating} aria-busy={isMutating ? 'true' : 'false'} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-1.5 px-3.5 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
                                    <Icon name={isMutating ? 'progress_activity' : 'save'} size={14} className={isMutating ? 'animate-spin' : ''} /> {isMutating ? 'Saving…' : 'Save Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Deletion Dialog */}
            <DeleteConfirmModal 
                isOpen={isDeleteConfirmOpen} 
                onClose={() => {
                    setIsDeleteConfirmOpen(false);
                    setTaskToDelete(null);
                }} 
                onConfirm={handleDeleteConfirm} 
                isPending={isMutating}
                seriesOptions={{ isSeries: Boolean(taskToDeleteItem?.series_id) }}
                title="Delete scheduled task?"
                message={`Are you sure you want to remove task ID: ${taskToDelete}?`}
            />
            <DiscardChangesModal isOpen={isDiscardOpen} onKeepEditing={() => setIsDiscardOpen(false)} onDiscard={discardAndClose} />
            <TaskLinksModal isOpen={!!linksModalTask} onClose={() => setLinksModalTask(null)} task={linksModalTask} />
            <UndoDeleteToast deletion={pendingDeletion} onUndo={() => { if (undoDelete()) showAlert('Task deletion canceled.', 'info'); }} />
        </div>
    );
}
