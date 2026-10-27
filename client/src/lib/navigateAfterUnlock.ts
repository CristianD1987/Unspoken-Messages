import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { storage } from '@/lib/storage';

export async function navigateAfterUnlock(
  navigation: NativeStackNavigationProp<RootStackParamList>
) {
  const termsAccepted = await storage.areTermsAccepted();
  if (!termsAccepted) {
    navigation.reset({ index: 0, routes: [{ name: 'Intro' }] });
    return;
  }
  const needsUpdate = await storage.needsTermsReacceptance();
  if (needsUpdate) {
    navigation.replace('Terms', { requireAccept: true });
    return;
  }
  navigation.replace('Home');
}
