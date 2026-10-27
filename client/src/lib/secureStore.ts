import * as SecureStore from 'expo-secure-store';

export const KEYCHAIN_ACCESSIBILITY_MIGRATION_FLAG = 'keychain_accessibility_migrated';

const SECURE_WRITE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** All SecureStore keys the app uses (no list API — maintain for wipe / migration). */
export const APP_SECURE_STORE_KEYS = [
  'encryption_key',
  'encryption_migrated_v2',
  KEYCHAIN_ACCESSIBILITY_MIGRATION_FLAG,
] as const;

export async function secureStoreGet(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function secureStoreSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, SECURE_WRITE_OPTIONS);
}

export async function secureStoreDelete(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, SECURE_WRITE_OPTIONS);
}

/**
 * Re-save existing SecureStore values with WHEN_UNLOCKED_THIS_DEVICE_ONLY.
 * Never generates a new encryption key — read old, write new, verify read-back.
 */
export async function migrateKeychainAccessibility(): Promise<void> {
  const migrated = await secureStoreGet(KEYCHAIN_ACCESSIBILITY_MIGRATION_FLAG);
  if (migrated === 'done') return;

  const keysToResave = ['encryption_key', 'encryption_migrated_v2'] as const;
  const snapshot: Record<string, string | null> = {};
  for (const key of keysToResave) {
    snapshot[key] = await secureStoreGet(key);
  }

  for (const key of keysToResave) {
    const value = snapshot[key];
    if (value == null) continue;
    await secureStoreSet(key, value);
    const verify = await secureStoreGet(key);
    if (verify !== value) {
      throw new Error(`Keychain accessibility migration failed for ${key}`);
    }
  }

  await secureStoreSet(KEYCHAIN_ACCESSIBILITY_MIGRATION_FLAG, 'done');
  const flagVerify = await secureStoreGet(KEYCHAIN_ACCESSIBILITY_MIGRATION_FLAG);
  if (flagVerify !== 'done') {
    throw new Error('Keychain accessibility migration flag verify failed');
  }
}

export async function wipeAllSecureStoreKeys(): Promise<void> {
  for (const key of APP_SECURE_STORE_KEYS) {
    try {
      await secureStoreDelete(key);
    } catch {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        /* ignore */
      }
    }
  }
}
