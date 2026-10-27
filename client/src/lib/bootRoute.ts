import { storage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import {
  clearSecureStoreForFreshInstall,
  migrateKeychainAccessibility,
} from '@/lib/secureStore';
import { migrateLocalEncryption } from '@/lib/encryption';
import { cleanupLegacyTrackingStorage } from '@/lib/trackingCleanup';
import type { RootStackParamList } from '@/types/navigation';

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

/** Map boot resolution to a single-stack navigation reset. */
export function bootRouteResetRoutes(route: BootRoute): {
  index: number;
  routes: Array<{ name: keyof RootStackParamList; params?: object }>;
} {
  switch (route.name) {
    case 'Lock':
      return { index: 0, routes: [{ name: 'Lock', params: route.params }] };
    case 'Chat':
      return { index: 0, routes: [{ name: 'Chat', params: route.params }] };
    case 'Settings':
      return { index: 0, routes: [{ name: 'Settings', params: route.params }] };
    default:
      return { index: 0, routes: [{ name: route.name }] };
  }
}
