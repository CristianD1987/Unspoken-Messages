import { storage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import {
  clearSecureStoreForFreshInstall,
  migrateKeychainAccessibility,
} from '@/lib/secureStore';
import { migrateLocalEncryption } from '@/lib/encryption';
import { cleanupLegacyTrackingStorage } from '@/lib/trackingCleanup';
import { UndecryptableStorageError } from '@/lib/storageErrors';
import type { InitialState } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

export type BootRouteResult = {
  route: BootRoute;
  recoveredFromError: boolean;
};

export const BOOT_RESOLVE_TIMEOUT_MS = 10_000;

export type BootRoute =
  | { name: 'Intro' }
  | { name: 'Onboarding' }
  | { name: 'Lock'; params?: RootStackParamList['Lock'] }
  | { name: 'Home' }
  | { name: 'Chat'; params: RootStackParamList['Chat'] }
  | { name: 'Settings'; params?: RootStackParamList['Settings'] }
  | { name: 'Terms' }
  | { name: 'DataRecovery' };

export async function resolveBootRoute(): Promise<BootRoute> {
  await cleanupLegacyTrackingStorage();

  let health = await storage.probeStorageHealth();
  if (health === 'locked') {
    return { name: 'DataRecovery' };
  }
  if (health === 'fresh') {
    await clearSecureStoreForFreshInstall();
  }

  await auth.prepareColdStart();
  await migrateKeychainAccessibility();

  await migrateLocalEncryption();
  health = await storage.probeStorageHealth();
  if (health === 'locked') {
    return { name: 'DataRecovery' };
  }

  await storage.runPostLaunchMigrations();
  return resolveInitialRoute();
}

/** Safe fallback when boot throws — read-only checks, no wipe or migrations. */
export async function resolveBootRouteFallback(): Promise<BootRoute> {
  try {
    if ((await storage.probeStorageHealth()) === 'locked') {
      return { name: 'DataRecovery' };
    }
  } catch {
    return { name: 'DataRecovery' };
  }

  try {
    if (!(await storage.areTermsAccepted())) {
      return { name: 'Intro' };
    }
  } catch {
    return { name: 'Intro' };
  }

  return { name: 'Lock', params: { mode: 'enter' } };
}

let bootRouteInFlight: Promise<BootRouteResult> | null = null;

async function runSafeResolveBootRoute(): Promise<BootRouteResult> {
  try {
    const route = await resolveBootRoute();
    return { route, recoveredFromError: false };
  } catch (error) {
    if (__DEV__) {
      console.error('[boot] resolveBootRoute failed', error);
      if (error instanceof UndecryptableStorageError) {
        console.error('[boot] undecryptable key:', error.storageKey);
      }
    }
    const route = await resolveBootRouteFallback();
    return { route, recoveredFromError: true };
  }
}

/** Single-flight: concurrent callers (including Try again) share one in-flight boot. */
export function safeResolveBootRoute(): Promise<BootRouteResult> {
  if (bootRouteInFlight) {
    return bootRouteInFlight;
  }
  bootRouteInFlight = runSafeResolveBootRoute().finally(() => {
    bootRouteInFlight = null;
  });
  return bootRouteInFlight;
}

export async function resolveInitialRoute(): Promise<BootRoute> {
  const termsAccepted = await storage.areTermsAccepted();
  if (!termsAccepted) {
    return { name: 'Intro' };
  }

  const data = await storage.getAppData();
  const onboardingDone =
    !!data?.settings?.onboardingCompleted || (await storage.isOnboardingComplete());

  if (data?.settings?.pinHash) {
    return { name: 'Lock', params: { mode: 'enter' } };
  }
  if (!onboardingDone) {
    return { name: 'Intro' };
  }
  return { name: 'Lock', params: { mode: 'create' } };
}

/** Initial stack state for NavigationContainer (cold start — no reset/navigate). */
export function bootToInitialNavigationState(boot: BootRoute): InitialState {
  return bootRouteResetRoutes(boot) as InitialState;
}

/** Map boot resolution to a single-stack navigation reset. */
export function bootRouteResetRoutes(
  route: BootRoute,
  options?: { instantTransition?: boolean }
): {
  index: number;
  routes: Array<{ name: keyof RootStackParamList; params?: object }>;
} {
  const instant = options?.instantTransition ? { instantTransition: true as const } : {};
  switch (route.name) {
    case 'Lock':
      return {
        index: 0,
        routes: [{ name: 'Lock', params: { ...route.params, ...instant } }],
      };
    case 'Chat':
      return { index: 0, routes: [{ name: 'Chat', params: route.params }] };
    case 'Settings':
      return { index: 0, routes: [{ name: 'Settings', params: route.params }] };
    case 'Intro':
      return {
        index: 0,
        routes: [{ name: 'Intro', params: instant.instantTransition ? instant : undefined }],
      };
    case 'DataRecovery':
      return {
        index: 0,
        routes: [
          { name: 'DataRecovery', params: instant.instantTransition ? instant : undefined },
        ],
      };
    default:
      return { index: 0, routes: [{ name: route.name }] };
  }
}
