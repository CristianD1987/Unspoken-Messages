import { secureStoreGet, secureStoreSet, secureStoreDelete } from './secureStore';
import { lockoutDelayMsForFailedAttemptCount } from './pinLockoutSchedule';
import { storage } from './storage';

export const PIN_LOCKOUT_SECURE_KEY = 'pin_lockout_state';

export type PinLockoutState = {
  failedAttempts: number;
  lockedUntil: number;
  lastAttemptAt: number;
};

const EMPTY: PinLockoutState = {
  failedAttempts: 0,
  lockedUntil: 0,
  lastAttemptAt: 0,
};

function parseState(raw: string | null): PinLockoutState {
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as Partial<PinLockoutState>;
    return {
      failedAttempts: Number(parsed.failedAttempts) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
      lastAttemptAt: Number(parsed.lastAttemptAt) || 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

async function writeState(state: PinLockoutState): Promise<void> {
  await secureStoreSet(PIN_LOCKOUT_SECURE_KEY, JSON.stringify(state));
}

export function normalizeClockTamper(state: PinLockoutState, now: number): PinLockoutState {
  if (state.lastAttemptAt > 0 && now < state.lastAttemptAt && state.failedAttempts >= 5) {
    const delay = lockoutDelayMsForFailedAttemptCount(state.failedAttempts);
    return {
      ...state,
      lockedUntil: now + delay,
      lastAttemptAt: now,
    };
  }
  return state;
}

export async function readPinLockoutState(): Promise<PinLockoutState> {
  const raw = await secureStoreGet(PIN_LOCKOUT_SECURE_KEY);
  return parseState(raw);
}

export async function clearPinLockoutState(): Promise<void> {
  try {
    await secureStoreDelete(PIN_LOCKOUT_SECURE_KEY);
  } catch {
    /* ignore */
  }
}

export async function resetPinLockoutOnSuccess(): Promise<void> {
  await clearPinLockoutState();
}

export async function getEffectivePinLockoutState(now = Date.now()): Promise<PinLockoutState> {
  let state = await readPinLockoutState();
  const tampered = normalizeClockTamper(state, now);
  if (
    tampered.lockedUntil !== state.lockedUntil ||
    tampered.lastAttemptAt !== state.lastAttemptAt
  ) {
    state = tampered;
    await writeState(state);
  }
  if (state.lockedUntil > 0 && now >= state.lockedUntil) {
    state = { ...state, lockedUntil: 0 };
    await writeState(state);
  }
  return state;
}

export function isPinLockoutActive(state: PinLockoutState, now = Date.now()): boolean {
  return state.lockedUntil > now;
}

export function pinLockoutRemainingMs(state: PinLockoutState, now = Date.now()): number {
  return Math.max(0, state.lockedUntil - now);
}

export type FailedPinAttemptResult = {
  state: PinLockoutState;
  shouldWipe: boolean;
};

export async function registerFailedPinAttempt(now = Date.now()): Promise<FailedPinAttemptResult> {
  let state = await getEffectivePinLockoutState(now);
  state = { ...state, failedAttempts: state.failedAttempts + 1 };
  const delay = lockoutDelayMsForFailedAttemptCount(state.failedAttempts);
  state.lockedUntil = delay > 0 ? now + delay : 0;
  state.lastAttemptAt = now;
  await writeState(state);

  const appData = await storage.getAppData();
  const eraseEnabled = !!appData?.settings.eraseAfterTenFailedAttempts;
  const shouldWipe = eraseEnabled && state.failedAttempts >= 10;

  return { state, shouldWipe };
}
