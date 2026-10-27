import { storage } from './storage';
import type { AppData } from '../types';
import * as Crypto from 'expo-crypto';

/** After backgrounding longer than this, PIN/biometric is required again. */
export const BACKGROUND_UNLOCK_GRACE_MS = 30_000;

export class AuthManager {
  private static instance: AuthManager;
  /** In-memory only — cleared on cold start. */
  private unlocked = false;
  private backgroundedAt: number | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /** Call once per process launch before UI routes anywhere sensitive. */
  async prepareColdStart(): Promise<void> {
    this.unlocked = false;
    this.backgroundedAt = null;
    await storage.clearAuthSession();
  }

  isAuthenticated(): boolean {
    return this.unlocked;
  }

  unlockSession(): void {
    this.unlocked = true;
    this.backgroundedAt = null;
  }

  onAppBackground(): void {
    if (this.unlocked) {
      this.backgroundedAt = Date.now();
    }
  }

  /** Returns false if the user must unlock again (grace expired). */
  async onAppForeground(): Promise<boolean> {
    if (!this.unlocked) return false;
    if (
      this.backgroundedAt != null &&
      Date.now() - this.backgroundedAt > BACKGROUND_UNLOCK_GRACE_MS
    ) {
      await this.logout();
      return false;
    }
    this.backgroundedAt = null;
    return true;
  }

  async authenticate(pin: string): Promise<boolean> {
    try {
      const appData = await storage.getAppData();
      if (!appData?.settings.pinHash) {
        throw new Error('PIN not set up');
      }

      const isValid = await this.verifyPinHash(pin, appData.settings.pinHash);
      if (isValid) {
        this.unlockSession();
      }
      return isValid;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  async setPin(pin: string): Promise<void> {
    try {
      let appData = await storage.getAppData();

      if (!appData) {
        const defaultData: AppData = {
          settings: {
            pinHash: '',
            biometricEnabled: false,
            autoDeleteEnabled: false,
            autoDeleteDays: 30,
            onboardingCompleted: false,
            totalMessagesSent: 0,
            donationIntervalsShown: [],
          },
          contacts: [],
          messages: [],
          conversations: [],
          version: '1.0.0',
        };

        await storage.setAppData(defaultData);
        appData = defaultData;
      }

      appData.settings.pinHash = await this.hashPin(pin);
      appData.settings.onboardingCompleted = true;
      await storage.setAppData(appData);

      const verifyData = await storage.getAppData();
      if (!verifyData?.settings.pinHash) {
        throw new Error('Failed to verify PIN setup');
      }
    } catch (error) {
      console.error('Error in setPin:', error);
      throw new Error(
        'Failed to set PIN: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  async changePin(currentPin: string, newPin: string): Promise<boolean> {
    try {
      const appData = await storage.getAppData();
      if (!appData?.settings.pinHash) {
        throw new Error('PIN not set up');
      }

      const isValid = await this.verifyPinHash(currentPin, appData.settings.pinHash);
      if (!isValid) {
        return false;
      }

      appData.settings.pinHash = await this.hashPin(newPin);
      await storage.setAppData(appData);
      return true;
    } catch (error) {
      console.error('Change PIN error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    this.unlocked = false;
    this.backgroundedAt = null;
    await storage.clearAuthSession();
  }

  private async hashPin(pin: string): Promise<string> {
    const salt = await Crypto.getRandomBytesAsync(16);
    const saltBase64 = Array.from(salt)
      .map((byte) => String.fromCharCode(byte))
      .join('');
    const saltedPin = pin + btoa(saltBase64);

    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedPin);
    return btoa(saltBase64) + ':' + hash;
  }

  private async verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
    try {
      const [storedSaltBase64, storedHashValue] = storedHash.split(':');
      if (!storedSaltBase64 || !storedHashValue) return false;

      const saltedPin = pin + storedSaltBase64;
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        saltedPin
      );
      return hash === storedHashValue;
    } catch (error) {
      console.error('PIN verification error:', error);
      return false;
    }
  }
}

export const auth = AuthManager.getInstance();
