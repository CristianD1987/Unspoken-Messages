import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, WithdrawCancelReturn } from '@/types/navigation';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';

export function resolveWithdrawCancelReturn(
  requireAccept: boolean,
  explicit?: WithdrawCancelReturn
): WithdrawCancelReturn {
  if (explicit) return explicit;
  if (requireAccept) {
    return { name: 'Terms', params: { requireAccept: true } };
  }
  return { name: 'Terms' };
}

export function cancelWithdrawConsent(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  returnTo?: WithdrawCancelReturn
): void {
  const target = returnTo ?? { name: 'Terms' };
  navigation.reset({
    index: 0,
    routes: [{ name: target.name, params: target.params }],
  });
}

export async function completeWithdrawConsent(
  navigation: NativeStackNavigationProp<RootStackParamList>
): Promise<void> {
  await storage.clearTermsAccepted();
  await auth.logout();
  navigation.reset({ index: 0, routes: [{ name: 'Intro' }] });
}
