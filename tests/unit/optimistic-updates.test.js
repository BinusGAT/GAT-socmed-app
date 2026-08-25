import { describe, expect, it, vi } from 'vitest';

describe('Optimistic Updates State Management', () => {
  it('optimistically inserts a new schedule task immediately', () => {
    const initialSchedule = [
      { ID: 'CT1', PIC: 'Jane Doe', Category: 'Story Telling', 'Content Title': 'First Task', Status: false }
    ];

    const newTask = {
      ID: 'CT2',
      Date: '2026-08-25',
      PIC: 'Alex Morgan',
      Category: 'News',
      'Content Title': 'Second Task',
      Status: false,
      AssignedUserId: 'USR2'
    };

    // Optimistic insert logic
    const exists = initialSchedule.some(t => String(t.ID) === String(newTask.ID));
    const optimisticState = exists
      ? initialSchedule.map(t => String(t.ID) === String(newTask.ID) ? { ...t, ...newTask } : t)
      : [newTask, ...initialSchedule];

    expect(optimisticState.length).toBe(2);
    expect(optimisticState[0].ID).toBe('CT2');
    expect(optimisticState[0]['Content Title']).toBe('Second Task');
  });

  it('optimistically updates an existing schedule task immediately', () => {
    const initialSchedule = [
      { ID: 'CT1', PIC: 'Jane Doe', Category: 'Story Telling', 'Content Title': 'Old Title', Status: false },
      { ID: 'CT2', PIC: 'Alex Morgan', Category: 'News', 'Content Title': 'Second Task', Status: false }
    ];

    const updatedTask = {
      ID: 'CT1',
      Date: '2026-08-26',
      PIC: 'Jane Doe',
      Category: 'Story Telling',
      'Content Title': 'New Updated Title',
      Status: true,
      AssignedUserId: 'USR1'
    };

    const exists = initialSchedule.some(t => String(t.ID) === String(updatedTask.ID));
    const optimisticState = exists
      ? initialSchedule.map(t => String(t.ID) === String(updatedTask.ID) ? { ...t, ...updatedTask } : t)
      : [updatedTask, ...initialSchedule];

    expect(optimisticState.length).toBe(2);
    expect(optimisticState.find(t => t.ID === 'CT1')['Content Title']).toBe('New Updated Title');
    expect(optimisticState.find(t => t.ID === 'CT1').Status).toBe(true);
  });

  it('optimistically removes a task on delete and rolls back on failure', async () => {
    const initialSchedule = [
      { ID: 'CT1', PIC: 'Jane Doe', Category: 'Story Telling', 'Content Title': 'Task 1' },
      { ID: 'CT2', PIC: 'Alex Morgan', Category: 'News', 'Content Title': 'Task 2' }
    ];

    let currentSchedule = initialSchedule;
    const prevSchedule = currentSchedule;

    // Optimistic deletion
    currentSchedule = currentSchedule.filter(t => t.ID !== 'CT1');
    expect(currentSchedule.length).toBe(1);
    expect(currentSchedule[0].ID).toBe('CT2');

    // Simulate API rejection
    const mockApiCall = vi.fn().mockRejectedValue(new Error('Network offline'));

    try {
      await mockApiCall();
    } catch (error) {
      // Rollback to snapshot
      currentSchedule = prevSchedule;
    }

    expect(currentSchedule.length).toBe(2);
    expect(currentSchedule[0].ID).toBe('CT1');
  });

  it('optimistically inserts dashboard metric row and preserves state', () => {
    const initialData = [
      { ID: 'LAP1', PIC: 'Jane Doe', 'Content Title': 'Item 1', Views: '1,000' }
    ];

    const newRow = {
      ID: 'LAP2',
      PIC: 'Alex Morgan',
      'Content Title': 'Item 2',
      Views: '5,000'
    };

    const optimisticData = [newRow, ...initialData];
    expect(optimisticData.length).toBe(2);
    expect(optimisticData[0].ID).toBe('LAP2');
  });
});
