import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';
import { storage } from '@/lib/storage';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function resetToIntro(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({ index: 0, routes: [{ name: 'Intro' }] });
}

export function resetToLockEnter(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({
    index: 0,
    routes: [{ name: 'Lock', params: { mode: 'enter' } }],
  });
}

export async function resetAfterSessionEnded(): Promise<void> {
  if (!navigationRef.isReady()) return;
  const termsAccepted = await storage.areTermsAccepted();
  if (!termsAccepted) {
    resetToIntro();
  } else {
    resetToLockEnter();
  }
}
