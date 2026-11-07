import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRefreshScheduler, PROACTIVE_REFRESH_MS } from './token-refresh';

const MIN = 60_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-08T08:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('createRefreshScheduler', () => {
  it('refreshes 13 minutes after a token is applied, two minutes before the 15-minute expiry', () => {
    expect(PROACTIVE_REFRESH_MS).toBe(13 * MIN);
    const refresh = vi.fn(async () => 'next');
    const s = createRefreshScheduler({ refresh });
    s.tokenApplied();
    vi.advanceTimersByTime(13 * MIN - 1);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('restarts the clock when a newer token arrives', () => {
    const refresh = vi.fn(async () => 'next');
    const s = createRefreshScheduler({ refresh });
    s.tokenApplied();
    vi.advanceTimersByTime(10 * MIN);
    s.tokenApplied();
    vi.advanceTimersByTime(10 * MIN);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3 * MIN);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops after the session is cleared', () => {
    const refresh = vi.fn(async () => null);
    const s = createRefreshScheduler({ refresh });
    s.tokenApplied();
    s.cleared();
    vi.advanceTimersByTime(60 * MIN);
    expect(refresh).not.toHaveBeenCalled();
    expect(s.tokenAgeMs()).toBeNull();
  });

  it('on tab focus, refreshes a token older than 13 minutes even if the timer was throttled', () => {
    const refresh = vi.fn(async () => 'next');
    const s = createRefreshScheduler({ refresh });
    s.tokenApplied();
    // A sleeping laptop or a throttled background tab: the wall clock moves, the timer does not fire.
    vi.setSystemTime(Date.now() + 40 * MIN);
    expect(refresh).not.toHaveBeenCalled();
    s.onResume();
    expect(refresh).toHaveBeenCalledTimes(1);
    // The pending timer was dropped, so the late timer cannot fire a second refresh.
    vi.advanceTimersByTime(13 * MIN);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('ignores focus while the token is still fresh or when nobody is signed in', () => {
    const refresh = vi.fn(async () => 'next');
    const s = createRefreshScheduler({ refresh });
    s.onResume();
    expect(refresh).not.toHaveBeenCalled();
    s.tokenApplied();
    vi.advanceTimersByTime(5 * MIN);
    s.onResume();
    expect(refresh).not.toHaveBeenCalled();
    expect(s.tokenAgeMs()).toBe(5 * MIN);
  });

  it('keeps working after a refresh that rejects', async () => {
    const refresh = vi.fn(async () => {
      throw new Error('offline');
    });
    const s = createRefreshScheduler({ refresh });
    s.tokenApplied();
    await vi.advanceTimersByTimeAsync(13 * MIN);
    expect(refresh).toHaveBeenCalledTimes(1);
    s.tokenApplied();
    await vi.advanceTimersByTimeAsync(13 * MIN);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
