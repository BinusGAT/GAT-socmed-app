import { describe, expect, it, vi } from 'vitest';

describe('App Focus & Visibility Database Revalidation', () => {
  it('triggers quiet refresh when tab becomes visible after cooldown', () => {
    let lastRefresh = 0;
    const cooldownMs = 20000;
    const mockRefresh = vi.fn();

    const handleFocus = (now, visibilityState, isOnline, isDrawerOpen, loadingPhase) => {
      if (visibilityState !== 'visible') return;
      if (now - lastRefresh < cooldownMs) return;
      if (!isOnline) return;
      if (loadingPhase === 'mutation') return;
      if (isDrawerOpen) return;

      lastRefresh = now;
      mockRefresh(true);
    };

    const t1 = 30000;
    handleFocus(t1, 'visible', true, false, 'idle');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledWith(true);

    // Rapid focus switch within cooldown should NOT trigger refresh
    handleFocus(t1 + 5000, 'visible', true, false, 'idle');
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // After cooldown has passed, next focus triggers refresh
    handleFocus(t1 + 21000, 'visible', true, false, 'idle');
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });

  it('skips focus refresh if offline, drawer is open, or during mutation', () => {
    const cooldownMs = 20000;
    let lastRefresh = 0;
    const mockRefresh = vi.fn();

    const handleFocus = (now, visibilityState, isOnline, isDrawerOpen, loadingPhase) => {
      if (visibilityState !== 'visible') return;
      if (now - lastRefresh < cooldownMs) return;
      if (!isOnline) return;
      if (loadingPhase === 'mutation') return;
      if (isDrawerOpen) return;

      lastRefresh = now;
      mockRefresh(true);
    };

    // When offline
    handleFocus(50000, 'visible', false, false, 'idle');
    expect(mockRefresh).not.toHaveBeenCalled();

    // When drawer is open (user actively composing/editing)
    handleFocus(50000, 'visible', true, true, 'idle');
    expect(mockRefresh).not.toHaveBeenCalled();

    // When mutation in progress
    handleFocus(50000, 'visible', true, false, 'mutation');
    expect(mockRefresh).not.toHaveBeenCalled();

    // When tab is hidden
    handleFocus(50000, 'hidden', true, false, 'idle');
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
