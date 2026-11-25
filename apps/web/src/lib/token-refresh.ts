/** Access tokens live 15 minutes; renewing at 13 leaves room for a slow network or a busy tab. */
export const PROACTIVE_REFRESH_MS = 13 * 60_000;

export interface RefreshScheduler {
  /** A new access token is in use: restart the clock. */
  tokenApplied(): void;
  /** Signed out or the refresh failed: stop renewing. */
  cleared(): void;
  /** The tab regained focus/visibility; background tabs throttle timers, so check the age directly. */
  onResume(): void;
  tokenAgeMs(): number | null;
}

export function createRefreshScheduler({
  refresh,
  refreshAfterMs = PROACTIVE_REFRESH_MS,
  now = () => Date.now(),
}: {
  refresh: () => Promise<unknown>;
  refreshAfterMs?: number;
  now?: () => number;
}): RefreshScheduler {
  let issuedAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stopTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const fire = () => {
    stopTimer();
    void refresh().catch(() => undefined);
  };

  return {
    tokenApplied() {
      stopTimer();
      issuedAt = now();
      timer = setTimeout(fire, refreshAfterMs);
    },
    cleared() {
      stopTimer();
      issuedAt = null;
    },
    onResume() {
      if (issuedAt !== null && now() - issuedAt >= refreshAfterMs) fire();
    },
    tokenAgeMs() {
      return issuedAt === null ? null : now() - issuedAt;
    },
  };
}
