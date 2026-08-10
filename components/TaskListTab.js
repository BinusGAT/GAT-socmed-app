'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { DeleteConfirmModal } from './Modals';
import SortableTableHeader from './SortableTableHeader';
import EmptyState from './EmptyState';
import DiscardChangesModal from './DiscardChangesModal';
import UndoDeleteToast from './UndoDeleteToast';
import { useDeferredDelete } from '../utils/useDeferredDelete';
import { isTaskAssignedToUser } from '../utils/rolePermissions';
import { useDialogFocus } from '../utils/useDialogFocus';
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

    // Delete confirmation state
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
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
                assignedUserId: task.AssignedUserId || ''
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
                normalizePicName(task.pic) === normalizePicName(tasklistFilterPic)
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

    const openAddModal = () => {
        if (!isUnlocked || userRole === 'Viewer') return;
        setModalTaskId('');
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
            ID: modalTaskId ? taskID : '',
            Date: formattedDate,
            PIC: modalPic,
            Category: modalCategory,
            'Content Title': modalTitle.trim() || 'Untitled',
            Status: modalStatus
        };

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

    const handleDeleteConfirm = () => {
        if (!isUnlocked || userRole !== 'Admin') {
            showAlert('Permission denied. Only admins can delete tasks.', 'error');
            return;
        }
        if (taskToDelete) {
            const taskId = taskToDelete;
            const task = getTasks().find((item) => item.id === taskId);
            scheduleDelete({
                label: task?.contentTitle || `Task ${taskId}`,
                execute: () => deleteCalendarTask(taskId),
            });
            setIsDeleteConfirmOpen(false);
            setTaskToDelete(null);
        }
    };

    const showActions = isUnlocked && userRole !== 'Viewer';
    const canCreateTask = isUnlocked && userRole === 'Admin';
    const canEditTask = (task) => userRole === 'Admin' || (userRole === 'Creator' && isTaskAssignedToUser(task, userId, userName));

    if (!isUnlocked) {
        return <LockScreen sectionName="Task List" />;
    }



    return (
        <div className="space-y-4">
            {/* Filters panel */}
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">Task Directory</span>
                    <span className="px-2.5 py-0.5 bg-surface-container-highest/50 border border-outline-variant/30 text-on-surface-variant rounded-md font-mono text-[11px]">
                        {processedTasks.length} items
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {canCreateTask && (
                        <button 
                            type="button" 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-1.5 px-3.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs" 
                            onClick={openAddModal}
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span> Add Scheduled Task
                        </button>
                    )}
                    {/* Reset button */}
                    {(tasklistSearch || tasklistFilterPic || tasklistFilterStatus) && (
                        <button 
                            className="bg-surface-container-high border border-outline-variant/30 hover:bg-surface-container-highest text-on-surface font-bold py-2 px-3 rounded text-[11px] uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            onClick={() => {
                                setTasklistSearch('');
                                setTasklistFilterPic('');
                                setTasklistFilterStatus('');
                            }}
                        >
                            <span className="material-symbols-outlined text-[14px]">restart_alt</span> Reset
                        </button>
                    )}

                    {/* Search query input */}
                    <div className="relative flex-1 sm:w-60">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 flex items-center">
                            <span className="material-symbols-outlined text-[18px]">search</span>
                        </span>
                        <input 
                            type="text" 
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded pl-9 pr-3 py-1.5 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                            placeholder="Search tasks..."
                            value={tasklistSearch}
                            onChange={(e) => setTasklistSearch(e.target.value)}
                        />
                    </div>

                    {/* PIC filter dropdown */}
                    <div className="sm:w-40">
                        <select 
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                            value={tasklistFilterPic}
                            onChange={(e) => setTasklistFilterPic(e.target.value)}
                        >
                            <option value="">All PICs</option>
                            {memberListData.map(m => (
                                <option key={m.NAMA} value={m.NAMA}>{m.NAMA}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status filter dropdown */}
                    <div className="sm:w-44">
                        <select 
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary"
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
            <div className="glass-panel rounded-xl overflow-hidden border border-outline-variant/30 shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-body-sm">
                        <caption className="sr-only">Scheduled content tasks. Activate a sortable column heading to change the sort order.</caption>
                        <thead className="bg-surface-container-low text-on-surface-variant text-xs tracking-wide border-b border-outline-variant/20">
                            <tr>
                                <SortableTableHeader column="Date" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-5 py-1.5">Scheduled date</SortableTableHeader>
                                <SortableTableHeader column="contentTitle" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-5 py-1.5">Content title / topic</SortableTableHeader>
                                <SortableTableHeader column="pic" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-5 py-1.5">PIC</SortableTableHeader>
                                <SortableTableHeader column="category" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-5 py-1.5">Category</SortableTableHeader>
                                <SortableTableHeader column="calculatedStatus" activeColumn={sortField} direction={sortAsc ? 'asc' : 'desc'} onSort={handleSort} className="px-5 py-1.5">Timeline status</SortableTableHeader>
                                {showActions && <th className="px-5 py-4 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/15">
                            {processedTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={showActions ? 6 : 5} className="p-12 text-center text-on-surface-variant/60">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <span className="material-symbols-outlined text-[42px] text-on-surface-variant/35">info</span>
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
                                                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-primary border border-primary/20">Done</span>;
                                            case 'Overdue':
                                                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">Overdue</span>;
                                            case 'Due Today':
                                                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">Due Today</span>;
                                            default:
                                                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">On Progress</span>;
                                        }
                                    })();

                                    return (
                                        <tr key={task.id} className="hover:bg-surface-container/20 transition-colors">
                                            <td className="px-5 py-3.5 text-on-surface-variant/90 font-medium text-[13px]">{task.rawDate}</td>
                                            <td className="px-5 py-3.5 font-semibold text-on-surface max-w-[280px] truncate" title={task.contentTitle}>
                                                {task.contentTitle}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPicBadgeClasses(task.pic)}`}>
                                                    {normalizePicName(task.pic)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container-high border border-outline-variant/30 text-on-surface-variant">
                                                    {task.category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {statusPill}
                                                    {task.status && (
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-primary border border-primary/20 flex items-center gap-0.5">
                                                            <span className="material-symbols-outlined text-[12px]">task_alt</span> Uploaded
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {showActions && (
                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        {canEditTask(task) && <button
                                                            className="w-7 h-7 flex items-center justify-center bg-surface-container border border-outline-variant/30 rounded text-on-surface-variant hover:text-primary hover:border-primary cursor-pointer transition-colors"
                                                            onClick={() => openEditModal(task)}
                                                            title="Edit schedule details"
                                                        >
                                                            <span className="material-symbols-outlined text-[15px]">edit</span>
                                                        </button>}
                                                        {userRole === 'Admin' && (
                                                            <button 
                                                                className="w-7 h-7 flex items-center justify-center bg-surface-container border border-outline-variant/30 rounded text-on-surface-variant hover:text-error hover:border-error cursor-pointer transition-colors"
                                                                onClick={() => handleDeleteTask(task.id)}
                                                                title="Delete schedule entry"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">delete</span>
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
                    <div ref={taskDialogRef} role="dialog" aria-modal="true" aria-labelledby="task-editor-title" tabIndex={-1} className="bg-surface-container border border-outline-variant/30 rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
                        <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
                            <h2 id="task-editor-title" className="text-body-md font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[22px]">assignment</span>
                                {modalTaskId ? `Update Scheduled Task (${modalTaskId})` : 'Add Scheduled Task'}
                            </h2>
                            <button type="button" aria-label="Close task editor" className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer" onClick={closeEditor}>
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleModalSubmit} autoComplete="off" noValidate>
                            <div className="px-5 py-4 space-y-4">
                                {draftRecovered && <p role="status" className="draft-recovery-note"><span className="material-symbols-outlined" aria-hidden="true">restore</span>Recovered an unsaved task draft from this browser.</p>}
                                {formError && <p role="alert" className="form-error-summary"><span className="material-symbols-outlined" aria-hidden="true">error</span>{formError}</p>}
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Content Title / Topic</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary" 
                                        placeholder="Enter title (optional)"
                                        value={modalTitle}
                                        onChange={(e) => setModalTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Scheduled Date <span className="text-error">*</span></label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer" 
                                        placeholder="YYYY-MM-DD" 
                                        readOnly
                                        required
                                        value={modalDate}
                                        onClick={handleModalDateClick}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-body-sm font-semibold text-on-surface-variant">PIC <span className="text-error">*</span></label>
                                        <select 
                                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                            required
                                            value={modalPic}
                                            onChange={(e) => { setModalPic(e.target.value); setFormError(''); }}
                                        >
                                            <option value="" disabled hidden>Select PIC</option>
                                            {memberListData.map(m => (
                                                <option key={m.NAMA} value={m.NAMA}>{m.NAMA}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-body-sm font-semibold text-on-surface-variant">Category <span className="text-error">*</span></label>
                                        <select 
                                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                            required
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
                            </div>
                            <div className="px-5 py-4 border-t border-outline-variant/20 flex justify-end gap-3 bg-surface-container-lowest">
                                <button type="button" className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded-lg text-body-sm transition-colors cursor-pointer" onClick={closeEditor}>Cancel</button>
                                <button type="submit" disabled={isMutating} aria-busy={isMutating ? 'true' : 'false'} className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-4 rounded-lg text-body-sm transition-opacity cursor-pointer flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-70">
                                    <span className={`material-symbols-outlined text-[18px] ${isMutating ? 'animate-spin' : ''}`}>{isMutating ? 'progress_activity' : 'save'}</span> {isMutating ? 'Saving…' : 'Save Task'}
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
                title="Delete scheduled task?"
                message={`Are you sure you want to remove task ID: ${taskToDelete}?`}
            />
            <DiscardChangesModal isOpen={isDiscardOpen} onKeepEditing={() => setIsDiscardOpen(false)} onDiscard={discardAndClose} />
            <UndoDeleteToast deletion={pendingDeletion} onUndo={() => { if (undoDelete()) showAlert('Task deletion canceled.', 'info'); }} />
        </div>
    );
}
