import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  encrypt,
  decrypt,
  tryDecrypt,
  wipeSecureEncryptionMaterial,
} from './encryption';
import { UndecryptableStorageError, type StorageHealth } from './storageErrors';
import { applyAutoDelete } from './autoDelete';
import { runPostLaunchMigrations } from './postLaunchMigrations';
import {
  deleteAllAvatarFiles,
  deleteExportTempFiles,
  packAvatarsForBackup,
  restoreAvatarsFromBackup,
  clearAvatarMemoryCache,
} from './avatars';
import type { AppData } from '../types';
import { CURRENT_TERMS_VERSION } from './legalVersion';

export type PasswordBackupPayload = {
  format: 'unspoken-backup';
  v: 3;
  appData: AppData;
  avatars: Record<string, string>;
};

export const STORAGE_KEYS = {
  APP_DATA: 'app_data',
  AUTH_SESSION: 'auth_session',
  PIN_HASH: 'pin_hash',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  TERMS_ACCEPTED: 'terms_accepted'
} as const;

// Helper to revive date strings to Date objects in AppData
function reviveAppDataDates(appData: any): AppData {
  // Convert contacts
  appData.contacts = appData.contacts.map((contact: any) => ({
    ...contact,
    createdAt: new Date(contact.createdAt),
  }));
  // Convert messages
  appData.messages = appData.messages.map((message: any) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));
  // Convert conversations
  appData.conversations = appData.conversations.map((conversation: any) => ({
    ...conversation,
    lastMessageAt: conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : undefined,
  }));
  return appData;
}

class StorageManager {
  private static instance: StorageManager;

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async probeStorageHealth(): Promise<StorageHealth> {
    const keys = Object.values(STORAGE_KEYS);
    let anyRaw = false;

    for (const key of keys) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      anyRaw = true;
      try {
        await tryDecrypt(raw, false);
      } catch (e) {
        if (e instanceof UndecryptableStorageError) {
          return 'locked';
        }
        return 'locked';
      }
    }

    const allKeys = await AsyncStorage.getAllKeys();
    for (const key of allKeys) {
      if (keys.includes(key as (typeof keys)[number])) continue;
      if (!key.endsWith('__v2_pending')) continue;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      anyRaw = true;
      if (key.endsWith('__v2_pending')) {
        try {
          await tryDecrypt(raw, false);
        } catch {
          return 'locked';
        }
      }
    }

    return anyRaw ? 'ok' : 'fresh';
  }

  async getItem(key: string): Promise<string | null> {
    const encryptedData = await AsyncStorage.getItem(key);
    if (!encryptedData) return null;

    let decryptedData: string;
    try {
      decryptedData = await decrypt(encryptedData, { allowKeyCreate: true });
    } catch (error) {
      if (error instanceof UndecryptableStorageError) {
        throw error;
      }
      throw new UndecryptableStorageError(key, error);
    }

    if (decryptedData.startsWith('{') || decryptedData.startsWith('[')) {
      try {
        JSON.parse(decryptedData);
      } catch (error: unknown) {
        throw new UndecryptableStorageError(key, error);
      }
    }

    return decryptedData;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      // Validate JSON if the value starts with { or [
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          JSON.parse(value);
        } catch (error: any) {
          throw new Error(`Invalid JSON data for key ${key}: ${error.message}`);
        }
      }
      
      const encryptedData = await encrypt(value);
      await AsyncStorage.setItem(key, encryptedData);
    } catch (error) {
      console.error(`Failed to set encrypted data for key ${key}:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      // console.error(`Failed to remove item ${key}:`, error);
      throw error;
    }
  }

  async getAppData(): Promise<AppData | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_DATA);
    if (!raw) return null;

    const data = await this.getItem(STORAGE_KEYS.APP_DATA);
    if (!data) {
      throw new UndecryptableStorageError(STORAGE_KEYS.APP_DATA);
    }

    return reviveAppDataDates(JSON.parse(data));
  }

  async setAppData(data: AppData): Promise<void> {
    try {
      await this.setItem(STORAGE_KEYS.APP_DATA, JSON.stringify(data));
    } catch (error) {
      // console.error("Error setting app data:", error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
      clearAvatarMemoryCache();
      await wipeSecureEncryptionMaterial();
    } catch (error) {
      console.error("Error clearing storage:", error);
      throw error;
    }
  }

  /**
   * Factory reset (Forgot PIN). Removes:
   * - AsyncStorage: all keys (app_data, auth_session, pin_hash, onboarding_complete,
   *   terms_accepted, any *__v2_pending migration leftovers)
   * - SecureStore: encryption_key, encryption_migrated_v2, keychain_accessibility_migrated
   * - Files: documentDirectory/avatars/, cache unspoken-backup.txt
   */
  async wipeDeviceAndRestart(): Promise<void> {
    clearAvatarMemoryCache();
    await deleteAllAvatarFiles();
    await deleteExportTempFiles();
    await AsyncStorage.clear();
    await wipeSecureEncryptionMaterial();
  }

  async runPostLaunchMigrations(): Promise<void> {
    await runPostLaunchMigrations(
      () => this.getAppData(),
      (data) => this.setAppData(data)
    );
  }

  async runAutoDeleteMaintenance(): Promise<void> {
    const data = await this.getAppData();
    if (!data || data.settings.autoDeleteNeedsReconfirm) return;
    const next = applyAutoDelete(data);
    if (next !== data) {
      await this.setAppData(next);
    }
  }

  // Auth session methods
  async getAuthSession(): Promise<{ expiry: number } | null> {
    try {
      const session = await this.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (!session) return null;
      return JSON.parse(session);
    } catch {
      return null;
    }
  }

  async setAuthSession(expiry: number): Promise<void> {
    await this.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify({ expiry }));
  }

  async clearAuthSession(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }

  // Settings methods
  async getPinHash(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.PIN_HASH);
  }

  async setPinHash(hash: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.PIN_HASH, hash);
  }

  async isOnboardingComplete(): Promise<boolean> {
    const value = await this.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  }

  async setOnboardingComplete(): Promise<void> {
    await this.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  }

  async getTermsAcceptedVersion(): Promise<number> {
    const value = await this.getItem(STORAGE_KEYS.TERMS_ACCEPTED);
    if (!value) return 0;
    if (value === 'true') return 1;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async areTermsAccepted(): Promise<boolean> {
    const version = await this.getTermsAcceptedVersion();
    return version >= CURRENT_TERMS_VERSION;
  }

  async needsTermsReacceptance(): Promise<boolean> {
    const version = await this.getTermsAcceptedVersion();
    return version > 0 && version < CURRENT_TERMS_VERSION;
  }

  async setTermsAccepted(): Promise<void> {
    await this.setItem(STORAGE_KEYS.TERMS_ACCEPTED, String(CURRENT_TERMS_VERSION));
  }

  async exportData(): Promise<string> {
    // Export the current app data as encrypted JSON string
    const appData = await this.getAppData();
    if (!appData) throw new Error('No app data to export');
    // Encrypt the JSON string using the same encryption as setItem
    const json = JSON.stringify(appData);
    const encrypted = await encrypt(json);
    return encrypted;
  }

  async importData(encryptedData: string): Promise<void> {
    // Import app data from an encrypted JSON string
    const decrypted = await decrypt(encryptedData);
    const appData = JSON.parse(decrypted);
    await this.setAppData(appData);
  }

  async exportDataWithPassword(password: string): Promise<string> {
    const appData = await this.getAppData();
    if (!appData) throw new Error('No app data to export');
    const avatars = await packAvatarsForBackup(appData.contacts);
    const payload: PasswordBackupPayload = {
      format: 'unspoken-backup',
      v: 3,
      appData,
      avatars,
    };
    const { encryptWithPassword } = await import('./encryption');
    return encryptWithPassword(JSON.stringify(payload), password);
  }

  async importDataWithPassword(encryptedData: string, password: string): Promise<void> {
    const { decryptWithPassword } = await import('./encryption');
    const decrypted = await decryptWithPassword(encryptedData, password);
    const parsed = JSON.parse(decrypted) as PasswordBackupPayload | AppData;

    if ('format' in parsed && parsed.format === 'unspoken-backup' && parsed.v === 3) {
      await restoreAvatarsFromBackup(parsed.avatars, parsed.appData.contacts);
      await this.setAppData(parsed.appData);
      return;
    }

    const appData = parsed as AppData;
    await this.setAppData(appData);
    const { migrateAllContactAvatars } = await import('./avatars');
    const migrated = await migrateAllContactAvatars(appData.contacts);
    if (migrated.changed) {
      await this.setAppData({ ...appData, contacts: migrated.contacts });
    }
  }
}

export const storage = StorageManager.getInstance();
