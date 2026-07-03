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

export default function TaskListTab({ onOpenDatePicker }) {
    const {
        scheduleData,
        currentData,
        isUnlocked,
        userRole,
        saveCalendarTask,
        deleteCalendarTask,
        memberListData,
        showAlert,
        tasklistSearch, setTasklistSearch,
        tasklistFilterPic, setTasklistFilterPic,
        tasklistFilterStatus, setTasklistFilterStatus
    } = useDashboard();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTaskId, setModalTaskId] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [modalDate, setModalDate] = useState('');
    const [modalPic, setModalPic] = useState('');
    const [modalCategory, setModalCategory] = useState('');
    const [modalStatus, setModalStatus] = useState(false);

    // Sort states
    const [sortField, setSortField] = useState('Date');
    const [sortAsc, setSortAsc] = useState(true);

    // Get combined tasks list (schedules with resolved status)
    const getTasks = () => {
        const list = [];
        (scheduleData || []).forEach(task => {
            const parsedDate = parseDate(task.Date);
            
            // Resolve actual uploaded status from currentData
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
                calculatedStatus: calculatedStatus
            });
        });
        return list;
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true); // default asc
        }
    };

    const getProcessedTasks = () => {
        let list = getTasks();

        // 1. Search Query
        if (tasklistSearch) {
            const query = tasklistSearch.toLowerCase().trim();
            list = list.filter(task => 
                task.contentTitle.toLowerCase().includes(query) ||
                task.id.toLowerCase().includes(query)
            );
        }

        // 2. PIC Filter
        if (tasklistFilterPic) {
            list = list.filter(task => normalizePicName(task.pic) === normalizePicName(tasklistFilterPic));
        }

        // 3. Status Filter
        if (tasklistFilterStatus) {
            list = list.filter(task => task.calculatedStatus === tasklistFilterStatus);
        }

        // 4. Sort
        list.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (['Date'].includes(sortField)) {
                valA = a.date || '';
                valB = b.date || '';
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });

        return list;
    };

    const processedTasks = getProcessedTasks();

    const openAddModal = () => {
        if (!isUnlocked || userRole === 'Creator') return;
        setModalTaskId('');
        setModalTitle('');
        setModalDate(getLocalDateInputValue());
        setModalPic('');
        setModalCategory('');
        setModalStatus(false);
        setIsModalOpen(true);
    };

    const openEditModal = (task) => {
        if (!isUnlocked || userRole === 'Creator') return;
        setModalTaskId(task.id);
        setModalTitle(task.contentTitle);
        setModalDate(task.date || getLocalDateInputValue());
        setModalPic(normalizePicName(resolveMemberName(task.pic, memberListData)));
        setModalCategory(task.category);
        setModalStatus(task.status);
        setIsModalOpen(true);
    };

    const handleModalDateClick = () => {
        onOpenDatePicker((selectedDate) => {
            setModalDate(selectedDate);
        });
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        if (!isUnlocked || userRole === 'Creator') {
            showAlert('Permission denied. Editing is locked.', 'error');
            return;
        }

        let taskID = modalTaskId;
        if (!taskID) {
            // High sequence ID calculator
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
            setIsModalOpen(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm(`Are you sure you want to remove task ID: ${taskId}?`)) return;
        await deleteCalendarTask(taskId);
    };

    const actionsDisabled = !isUnlocked || userRole === 'Creator';

    if (!isUnlocked) {
        return <LockScreen sectionName="Task List" />;
    }

    return (
        <section className="panel panel-tasklist" style={{ display: 'block' }}>
            <div className="panel-header">
                <h2><span className="panel-icon"><i className="fa-solid fa-list-check"></i></span> Scheduled Task Directory</h2>
                <div className="panel-actions">
                    <span className="data-count">{processedTasks.length} items</span>
                </div>
            </div>

            {/* Bulk Actions & Filters Wrapper */}
            <div className="bulk-actions" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="bulk-actions-left">
                    {!actionsDisabled && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
                            <i className="fa-solid fa-plus"></i> Add Scheduled Task
                        </button>
                    )}
                </div>

                <div className="bulk-actions-right" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', width: 'auto', flex: 1 }}>
                    {(tasklistSearch || tasklistFilterPic || tasklistFilterStatus) && (
                        <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                                setTasklistSearch('');
                                setTasklistFilterPic('');
                                setTasklistFilterStatus('');
                            }}
                        >
                            <i className="fa-solid fa-arrow-rotate-left"></i> Set to Default
                        </button>
                    )}
                    <div className="search-wrapper">
                        <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Search tasks..."
                            value={tasklistSearch}
                            onChange={(e) => setTasklistSearch(e.target.value)}
                        />
                    </div>
                    <div>
                        <select 
                            className="form-control"
                            style={{ height: '36px', padding: '0 12px', fontSize: '13px', width: '130px' }}
                            value={tasklistFilterPic}
                            onChange={(e) => setTasklistFilterPic(e.target.value)}
                        >
                            <option value="">All PICs</option>
                            {memberListData.map(m => (
                                <option key={m.NAMA} value={m.NAMA}>{m.NAMA}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <select 
                            className="form-control"
                            style={{ height: '36px', padding: '0 12px', fontSize: '13px', width: '130px' }}
                            value={tasklistFilterStatus}
                            onChange={(e) => setTasklistFilterStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="On Progress">🔵 On Progress</option>
                            <option value="Due Today">🔴 Due Today</option>
                            <option value="Overdue">⚠️ Overdue</option>
                            <option value="Done">✅ Done</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Directory table */}
            <div className="table-container" id="tasklistTableContainer">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('Date')} style={{ cursor: 'pointer' }}>Scheduled Date <i className={`fa-solid ${sortField === 'Date' ? (sortAsc ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i></th>
                            <th onClick={() => handleSort('contentTitle')} style={{ cursor: 'pointer' }}>Content Title / Topic <i className={`fa-solid ${sortField === 'contentTitle' ? (sortAsc ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i></th>
                            <th onClick={() => handleSort('pic')} style={{ cursor: 'pointer' }}>PIC <i className={`fa-solid ${sortField === 'pic' ? (sortAsc ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i></th>
                            <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>Category <i className={`fa-solid ${sortField === 'category' ? (sortAsc ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i></th>
                            <th onClick={() => handleSort('calculatedStatus')} style={{ cursor: 'pointer' }}>Timeline Status <i className={`fa-solid ${sortField === 'calculatedStatus' ? (sortAsc ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`}></i></th>
                            {!actionsDisabled && <th style={{ textAlign: 'center' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {processedTasks.length === 0 ? (
                            <tr>
                                <td colSpan={actionsDisabled ? 5 : 6} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-muted)' }}>
                                    No scheduled tasks found matching query.
                                </td>
                            </tr>
                        ) : (
                            processedTasks.map((task) => {
                                const statusPill = (() => {
                                    switch (task.calculatedStatus) {
                                        case 'Done':
                                            return <span className="badge badge-status-completed">Done</span>;
                                        case 'Overdue':
                                            return <span className="badge badge-status-overdue">Overdue</span>;
                                        case 'Due Today':
                                            return <span className="badge badge-status-today">Due Today</span>;
                                        default:
                                            return <span className="badge badge-status-progress">On Progress</span>;
                                    }
                                })();

                                return (
                                    <tr key={task.id}>
                                        <td>{task.rawDate}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{task.contentTitle}</td>
                                        <td>
                                            <span className={`badge ${getPicBadgeClass(task.pic)}`}>
                                                {normalizePicName(task.pic)}
                                            </span>
                                        </td>
                                        <td><span className="badge badge-category-default">{task.category}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {statusPill}
                                                {task.status && (
                                                    <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 4px' }}>
                                                        <i className="fa-solid fa-cloud-arrow-up"></i> Uploaded
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {!actionsDisabled && (
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button 
                                                        className="btn btn-outline btn-xs"
                                                        onClick={() => openEditModal(task)}
                                                        title="Edit schedule details"
                                                    >
                                                        <i className="fa-solid fa-pen"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-outline btn-xs btn-danger-hover"
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        title="Delete schedule entry"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
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

            {/* 5. ADD/EDIT TASK MODAL */}
            {isModalOpen && typeof window !== 'undefined' && createPortal(
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-card">
                        <div className="modal-card-header">
                            <h2>
                                <i className="fa-solid fa-list-check"></i> {modalTaskId ? `Update Scheduled Task (${modalTaskId})` : 'Add Scheduled Task'}
                            </h2>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handleModalSubmit} autoComplete="off">
                            <div className="modal-card-body">
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label>Content Title / Topic</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="Enter title (optional)"
                                        value={modalTitle}
                                        onChange={(e) => setModalTitle(e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label>Scheduled Date <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        className="form-control custom-date-input" 
                                        placeholder="YYYY-MM-DD" 
                                        readOnly
                                        required
                                        value={modalDate}
                                        onClick={handleModalDateClick}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className="form-row" style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>PIC <span className="required">*</span></label>
                                        <select 
                                            className="form-control"
                                            required
                                            value={modalPic}
                                            onChange={(e) => setFormPic(e.target.value) || setModalPic(e.target.value)}
                                            style={{ width: '100%' }}
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
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Category <span className="required">*</span></label>
                                        <select 
                                            className="form-control"
                                            required
                                            value={modalCategory}
                                            onChange={(e) => setModalCategory(e.target.value)}
                                            style={{ width: '100%' }}
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
                            </div>
                            <div className="modal-card-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Task</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </section>
    );
}
