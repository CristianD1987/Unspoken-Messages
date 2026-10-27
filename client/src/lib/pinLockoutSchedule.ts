/** Delay applied after the Nth consecutive failed unlock attempt (ms). Attempts 1–4: none. */
export function lockoutDelayMsForFailedAttemptCount(failedAttempts: number): number {
  if (failedAttempts < 5) return 0;
  if (failedAttempts === 5) return 30_000;
  if (failedAttempts === 6) return 60_000;
  if (failedAttempts === 7) return 5 * 60_000;
  if (failedAttempts === 8) return 15 * 60_000;
  return 60 * 60_000;
}

export function attemptsLeftBeforeLockout(failedAttempts: number): number {
  return Math.max(0, 5 - failedAttempts);
}

export function attemptsLeftBeforeErase(
  failedAttempts: number,
  eraseEnabled: boolean
): number | null {
  if (!eraseEnabled || failedAttempts < 7) return null;
  return Math.max(0, 10 - failedAttempts);
}

export function unlockPinFailureSubtitle(
  failedAttempts: number,
  eraseEnabled: boolean
): string {
  const eraseLeft = attemptsLeftBeforeErase(failedAttempts, eraseEnabled);
  if (eraseLeft !== null) {
    return `${eraseLeft} attempt${eraseLeft === 1 ? '' : 's'} left before all data is erased.`;
  }
  const lockLeft = attemptsLeftBeforeLockout(failedAttempts);
  if (failedAttempts >= 3 && lockLeft > 0) {
    return `Wrong PIN. ${lockLeft} attempt${lockLeft === 1 ? '' : 's'} left before a short lock.`;
  }
  return 'Wrong PIN. Try again.';
}

export function formatLockoutCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
