import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_USER_ID_KEY = 'unspoken_user_id';

/** Remove legacy analytics identifiers from older builds. */
export async function cleanupLegacyTrackingStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LEGACY_USER_ID_KEY);
  } catch {
    /* ignore */
  }
}
