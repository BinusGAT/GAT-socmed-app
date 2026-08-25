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

  it('optimistically updates a specific platform row without turning sibling rows into duplicates of the edited platform', () => {
    const initialData = [
      {
        ID: '112',
        Date: '01/07/2026',
        'Content Title': 'The Free Sheperd',
        PIC: 'Anthoni',
        Category: 'Story Telling',
        Platform: 'Instagram',
        Views: 1000,
        Likes: 25,
        'KPI Score': 3,
        'KPI Summary': 3
      },
      {
        ID: '112',
        Date: '01/07/2026',
        'Content Title': 'The Free Sheperd',
        PIC: 'Anthoni',
        Category: 'Story Telling',
        Platform: 'TikTok',
        Views: 0,
        Likes: 0,
        'KPI Score': 3,
        'KPI Summary': 3
      },
      {
        ID: '112',
        Date: '01/07/2026',
        'Content Title': 'The Free Sheperd',
        PIC: 'Anthoni',
        Category: 'Story Telling',
        Platform: 'Youtube',
        Views: 500,
        Likes: 10,
        'KPI Score': 3,
        'KPI Summary': 3
      }
    ];

    const editedTikTokPayload = {
      ID: '112',
      Date: '01/07/2026',
      'Content Title': 'The Free Sheperd',
      PIC: 'Anthoni',
      Category: 'Story Telling',
      Platform: 'TikTok',
      Views: 20000,
      Likes: 50,
      'Total Engagement': 50,
      'KPI Score': 5,
      'KPI Summary': 5,
      rowIndex: 1
    };

    const updatedData = initialData.map((item, idx) => {
      const isExactMatch = (editedTikTokPayload.rowIndex !== undefined && idx === editedTikTokPayload.rowIndex) ||
        (item.ID && editedTikTokPayload.ID && String(item.ID) === String(editedTikTokPayload.ID) && String(item.Platform).toLowerCase() === String(editedTikTokPayload.Platform).toLowerCase());

      if (isExactMatch) {
        return { ...item, ...editedTikTokPayload };
      }

      if (item.ID && editedTikTokPayload.ID && String(item.ID) === String(editedTikTokPayload.ID)) {
        return {
          ...item,
          Date: editedTikTokPayload.Date,
          'Content Title': editedTikTokPayload['Content Title'],
          PIC: editedTikTokPayload.PIC,
          Category: editedTikTokPayload.Category,
          AssignedUserId: editedTikTokPayload.AssignedUserId,
          'KPI Summary': editedTikTokPayload['KPI Summary']
        };
      }

      return item;
    });

    expect(updatedData[0].Platform).toBe('Instagram');
    expect(updatedData[0].Views).toBe(1000);
    expect(updatedData[0]['KPI Summary']).toBe(5);

    expect(updatedData[1].Platform).toBe('TikTok');
    expect(updatedData[1].Views).toBe(20000);
    expect(updatedData[1].Likes).toBe(50);
    expect(updatedData[1]['KPI Summary']).toBe(5);

    expect(updatedData[2].Platform).toBe('Youtube');
    expect(updatedData[2].Views).toBe(500);
    expect(updatedData[2]['KPI Summary']).toBe(5);
  });
});
