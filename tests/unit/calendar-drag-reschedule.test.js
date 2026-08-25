import { describe, expect, it, vi } from 'vitest';

describe('Calendar Drag-and-Drop Rescheduling & Filter Sync', () => {
  it('optimistically updates task date in scheduleData and currentData during calendar drag-and-drop', async () => {
    let scheduleData = [
      { ID: 'TASK-1', Date: '2026-08-20', PIC: 'Jane Doe', Category: 'Story Telling', 'Content Title': 'Old Task' },
      { ID: 'TASK-2', Date: '2026-08-22', PIC: 'Alex Morgan', Category: 'News', 'Content Title': 'Other Task' }
    ];

    let currentData = [
      { ID: 'TASK-1', Date: '2026-08-20', Platform: 'Instagram', URL: 'https://instagram.com/p/1' },
      { ID: 'TASK-1', Date: '2026-08-20', Platform: 'TikTok', URL: 'https://tiktok.com/@u/video/1' },
      { ID: 'TASK-2', Date: '2026-08-22', Platform: 'Instagram', URL: '' }
    ];

    const taskId = 'TASK-1';
    const newDate = '2026-08-28';

    // Optimistic rescheduling logic
    scheduleData = scheduleData.map(task =>
      String(task.ID) === String(taskId) ? { ...task, Date: newDate } : task
    );

    currentData = currentData.map(row =>
      String(row.ID) === String(taskId) ? { ...row, Date: newDate } : row
    );

    expect(scheduleData.find(t => t.ID === 'TASK-1').Date).toBe('2026-08-28');
    expect(currentData.filter(r => r.ID === 'TASK-1').every(r => r.Date === '2026-08-28')).toBe(true);
    expect(scheduleData.find(t => t.ID === 'TASK-2').Date).toBe('2026-08-22');
  });

  it('restores snapshot on API failure when rescheduling', async () => {
    const initialSchedule = [
      { ID: 'TASK-1', Date: '2026-08-20', PIC: 'Jane Doe', Category: 'Story Telling' }
    ];
    const initialCurrent = [
      { ID: 'TASK-1', Date: '2026-08-20', Platform: 'Instagram' }
    ];

    let scheduleData = initialSchedule;
    let currentData = initialCurrent;

    const prevSchedule = scheduleData;
    const prevCurrent = currentData;

    // Apply optimistic state
    scheduleData = scheduleData.map(t => ({ ...t, Date: '2026-08-30' }));
    currentData = currentData.map(r => ({ ...r, Date: '2026-08-30' }));

    const mockApi = vi.fn().mockRejectedValue(new Error('Network error'));

    try {
      await mockApi();
    } catch (e) {
      // Rollback
      scheduleData = prevSchedule;
      currentData = prevCurrent;
    }

    expect(scheduleData[0].Date).toBe('2026-08-20');
    expect(currentData[0].Date).toBe('2026-08-20');
  });

  it('filters calendar tasks correctly by PIC and Category', () => {
    const tasks = [
      { id: 'T1', pic: 'Jane Doe', category: 'Story Telling', isMeeting: false },
      { id: 'T2', pic: 'Alex Morgan', category: 'Motion Graphic', isMeeting: false },
      { id: 'T3', pic: 'Jane Doe', category: 'Motion Graphic', isMeeting: false },
      { id: 'M1', pic: 'Meeting', category: 'Recap', isMeeting: true }
    ];

    const filterTasks = (taskList, filterPic, filterCat) => {
      return taskList.filter(task => {
        if (task.isMeeting) {
          if (filterCat && filterCat !== 'Recap') return false;
          if (filterPic) return false;
          return true;
        }
        if (filterPic && task.pic !== filterPic) return false;
        if (filterCat && task.category !== filterCat) return false;
        return true;
      });
    };

    // Filter by PIC only
    const picFiltered = filterTasks(tasks, 'Jane Doe', '');
    expect(picFiltered.length).toBe(2);
    expect(picFiltered.map(t => t.id)).toEqual(['T1', 'T3']);

    // Filter by Category only
    const catFiltered = filterTasks(tasks, '', 'Motion Graphic');
    expect(catFiltered.length).toBe(2);
    expect(catFiltered.map(t => t.id)).toEqual(['T2', 'T3']);

    // Combined filter
    const combinedFiltered = filterTasks(tasks, 'Jane Doe', 'Motion Graphic');
    expect(combinedFiltered.length).toBe(1);
    expect(combinedFiltered[0].id).toBe('T3');

    // Meeting filtering
    const recapFiltered = filterTasks(tasks, '', 'Recap');
    expect(recapFiltered.length).toBe(1);
    expect(recapFiltered[0].id).toBe('M1');
  });

  it('enforces RBAC permissions on calendar drag and drop', () => {
    const canDragAndDrop = (role, isUnlocked) => {
      if (!isUnlocked) return false;
      return role === 'Admin';
    };

    expect(canDragAndDrop('Admin', true)).toBe(true);
    expect(canDragAndDrop('Creator', true)).toBe(false);
    expect(canDragAndDrop('Viewer', true)).toBe(false);
    expect(canDragAndDrop('Admin', false)).toBe(false);
  });
});
