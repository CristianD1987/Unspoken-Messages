import * as Crypto from 'expo-crypto';
import { encode as encodeBase64, decode as decodeBase64 } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils.js';
import { secureStoreGet, secureStoreSet, wipeAllSecureStoreKeys } from './secureStore';
import { UndecryptableStorageError } from './storageErrors';

const MIGRATION_STORAGE_KEYS = [
  'app_data',
  'auth_session',
  'pin_hash',
  'onboarding_complete',
  'terms_accepted',
] as const;

export const ENCRYPTION_KEY_STORAGE = 'encryption_key';
export const MIGRATION_FLAG = 'encryption_migrated_v2';
const V2_PREFIX = 'v2:';
const PBKDF2_ITERATIONS = 100_000;

let cachedDeviceKey: Uint8Array | null = null;

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return encodeBase64(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = decodeBase64(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function randomBytes(length: number): Promise<Uint8Array> {
  const buf = await Crypto.getRandomBytesAsync(length);
  return new Uint8Array(buf);
}

async function getDeviceKey(allowCreate = true): Promise<Uint8Array | null> {
  if (cachedDeviceKey) return cachedDeviceKey;
  const stored = await secureStoreGet(ENCRYPTION_KEY_STORAGE);
  if (stored) {
    cachedDeviceKey = b64ToBytes(stored);
    if (cachedDeviceKey.length === 32) return cachedDeviceKey;
  }
  if (!allowCreate) return null;
  const key = await randomBytes(32);
  await secureStoreSet(ENCRYPTION_KEY_STORAGE, bytesToB64(key));
  cachedDeviceKey = key;
  return key;
}

export function resetEncryptionKeyCache(): void {
  cachedDeviceKey = null;
}

/** Legacy XOR scheme (v1) — IV bytes were stored but not used in the cipher. */
async function decryptLegacy(encryptedData: string, allowKeyCreate: boolean): Promise<string> {
  const masterB64 = await secureStoreGet(ENCRYPTION_KEY_STORAGE);
  if (!masterB64) {
    throw new UndecryptableStorageError('encryption_key');
  }
  const key = masterB64;

  const data = b64ToBytes(encryptedData);
  const salt = data.slice(16, 32);
  const encrypted = data.slice(32);

  const derivedKey = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    key + bytesToB64(salt)
  );
  const keyBytes = new Uint8Array(derivedKey.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  return bytesToUtf8(decrypted);
}

async function encryptV2(plaintext: string): Promise<string> {
  const key = await getDeviceKey(true);
  if (!key) throw new Error('Failed to obtain device encryption key');
  const iv = await randomBytes(12);
  const cipher = gcm(key, iv);
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext));
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);
  return `${V2_PREFIX}${bytesToB64(packed)}`;
}

async function decryptV2(payload: string, allowKeyCreate: boolean): Promise<string> {
  const key = await getDeviceKey(allowKeyCreate);
  if (!key) throw new UndecryptableStorageError('encryption_key');
  const packed = b64ToBytes(payload);
  const iv = packed.slice(0, 12);
  const ciphertext = packed.slice(12);
  try {
    const cipher = gcm(key, iv);
    const plain = cipher.decrypt(ciphertext);
    return bytesToUtf8(plain);
  } catch (cause) {
    throw new UndecryptableStorageError('app_data', cause);
  }
}

export async function encryptBytes(data: Uint8Array): Promise<Uint8Array> {
  const key = await getDeviceKey(true);
  if (!key) throw new Error('Failed to obtain device encryption key');
  const iv = await randomBytes(12);
  const cipher = gcm(key, iv);
  const ciphertext = cipher.encrypt(data);
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);
  return packed;
}

export async function decryptBytes(packed: Uint8Array): Promise<Uint8Array> {
  const key = await getDeviceKey(true);
  if (!key) throw new UndecryptableStorageError('encryption_key');
  const iv = packed.slice(0, 12);
  const ciphertext = packed.slice(12);
  const cipher = gcm(key, iv);
  return cipher.decrypt(ciphertext);
}

export async function encrypt(data: string): Promise<string> {
  return encryptV2(data);
}

export async function tryDecrypt(
  encryptedData: string,
  allowKeyCreate = false
): Promise<string> {
  try {
    if (encryptedData.startsWith(V2_PREFIX)) {
      return decryptV2(encryptedData.slice(V2_PREFIX.length), allowKeyCreate);
    }
    return decryptLegacy(encryptedData, allowKeyCreate);
  } catch (e) {
    if (e instanceof UndecryptableStorageError) throw e;
    throw new UndecryptableStorageError('unknown', e);
  }
}

export async function decrypt(
  encryptedData: string,
  options?: { allowKeyCreate?: boolean }
): Promise<string> {
  return tryDecrypt(encryptedData, options?.allowKeyCreate ?? true);
}

export async function migrateLocalEncryption(): Promise<void> {
  const flag = await secureStoreGet(MIGRATION_FLAG);
  if (flag === 'done') return;

  const keys = MIGRATION_STORAGE_KEYS;
  let allDone = true;
  for (const storageKey of keys) {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) continue;
    if (raw.startsWith(V2_PREFIX)) continue;
    const pendingKey = `${storageKey}__v2_pending`;
    try {
      const pending = await AsyncStorage.getItem(pendingKey);
      if (pending?.startsWith(V2_PREFIX)) {
        await AsyncStorage.setItem(storageKey, pending);
        await AsyncStorage.removeItem(pendingKey);
        continue;
      }
      const plaintext = await tryDecrypt(raw, false);
      const reencrypted = await encryptV2(plaintext);
      await AsyncStorage.setItem(pendingKey, reencrypted);
      await AsyncStorage.setItem(storageKey, reencrypted);
      await AsyncStorage.removeItem(pendingKey);
    } catch (e) {
      allDone = false;
      console.warn(`Encryption migration skipped for ${storageKey}`, e);
    }
  }

  if (allDone) {
    await secureStoreSet(MIGRATION_FLAG, 'done');
  }
}

export async function wipeSecureEncryptionMaterial(): Promise<void> {
  cachedDeviceKey = null;
  await wipeAllSecureStoreKeys();
}

export async function encryptWithPassword(data: string, password: string): Promise<string> {
  const salt = await randomBytes(16);
  const iv = await randomBytes(12);
  const passwordBytes = utf8ToBytes(password);
  const key = await pbkdf2Async(sha256, passwordBytes, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: 32,
  });
  const cipher = gcm(key, iv);
  const ciphertext = cipher.encrypt(utf8ToBytes(data));
  return JSON.stringify({
    v: 2,
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(ciphertext),
  });
}

export async function decryptWithPassword(encryptedData: string, password: string): Promise<string> {
  try {
    const parsed = JSON.parse(encryptedData);
    if (parsed.v === 2 && parsed.alg === 'AES-256-GCM') {
      const salt = b64ToBytes(parsed.salt);
      const iv = b64ToBytes(parsed.iv);
      const ciphertext = b64ToBytes(parsed.ciphertext);
      const passwordBytes = utf8ToBytes(password);
      const key = await pbkdf2Async(sha256, passwordBytes, salt, {
        c: parsed.iterations ?? PBKDF2_ITERATIONS,
        dkLen: 32,
      });
      const cipher = gcm(key, iv);
      const plain = cipher.decrypt(ciphertext);
      const text = bytesToUtf8(plain);
      if (!text) throw new Error('Empty plaintext');
      return text;
    }

    const CryptoJS = await import('crypto-js');
    const { salt, iv, ciphertext } = parsed;
    const saltWA = CryptoJS.enc.Base64.parse(salt);
    const ivWA = CryptoJS.enc.Base64.parse(iv);
    const key = CryptoJS.PBKDF2(password, saltWA, { keySize: 256 / 32, iterations: 100000 });
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv: ivWA });
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plaintext) throw new Error('Wrong password');
    return plaintext;
  } catch {
    throw new Error('Could not decrypt or import the backup. Wrong password?');
  }
}

export async function hashPin(pin: string): Promise<string> {
  const salt = await randomBytes(16);
  const saltString = bytesToB64(salt);
  const saltedPin = pin + saltString;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedPin);
  return `${saltString}:${hash}`;
}

export async function verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
  try {
    const [storedSalt, storedHashValue] = storedHash.split(':');
    if (!storedSalt || !storedHashValue) return false;
    const saltedPin = pin + storedSalt;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedPin);
    return hash === storedHashValue;
  } catch {
    return false;
  }
}
