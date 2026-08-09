import { afterEach, describe, expect, it, vi } from 'vitest';
import { callSheetsAPI } from '../../utils/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('callSheetsAPI request coalescing', () => {
  it('shares an in-flight request for identical mutations', async () => {
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => { resolveFetch = resolve; });
    const fetchMock = vi.fn(() => fetchPromise);
    vi.stubGlobal('fetch', fetchMock);

    const first = callSheetsAPI('save_schedule', { ID: 'TASK-001' });
    const second = callSheetsAPI('save_schedule', { ID: 'TASK-001' });

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      json: async () => ({ success: true }),
    });

    await expect(first).resolves.toEqual({ success: true });
  });
});
