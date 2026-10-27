import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';
import { bootRouteResetRoutes } from '@/lib/bootRoute';
import { storage } from '@/lib/storage';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type ResetOptions = { animate?: boolean };

export function resetToIntro(options?: ResetOptions): void {
  if (!navigationRef.isReady()) return;
  const instant = options?.animate === false;
  navigationRef.reset(
    bootRouteResetRoutes({ name: 'Intro' }, { instantTransition: instant })
  );
}

export function resetToLockEnter(options?: ResetOptions): void {
  if (!navigationRef.isReady()) return;
  const instant = options?.animate === false;
  navigationRef.reset(
    bootRouteResetRoutes(
      { name: 'Lock', params: { mode: 'enter' } },
      { instantTransition: instant }
    )
  );
}

export async function resetAfterSessionEnded(options?: ResetOptions): Promise<void> {
  if (!navigationRef.isReady()) return;
  const termsAccepted = await storage.areTermsAccepted();
  if (!termsAccepted) {
    resetToIntro(options);
  } else {
    resetToLockEnter(options);
  }
}
