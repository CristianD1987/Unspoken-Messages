import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { encode as encodeBase64, decode as decodeBase64 } from 'base-64';
import type { Contact } from '@/types';
import { decryptBytes, encryptBytes } from './encryption';

export const AVATAR_DIR = `${FileSystem.documentDirectory}avatars/`;
const MAX_EDGE = 512;
const memoryCache = new Map<string, string>();

function b64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return encodeBase64(binary);
}

function bytesFromB64(b64: string): Uint8Array {
  const binary = decodeBase64(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function clearAvatarMemoryCache(): void {
  memoryCache.clear();
}

export function avatarFilePath(fileName: string): string {
  return `${AVATAR_DIR}${fileName}`;
}

export async function ensureAvatarDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(AVATAR_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AVATAR_DIR, { intermediates: true });
  }
}

async function newAvatarFileName(): Promise<string> {
  const id = await Crypto.randomUUID();
  return `${id}.enc`;
}

/** Resize, encrypt, write to avatars/. Returns filename only. */
export async function saveAvatarFromSourceUri(
  sourceUri: string,
  previousFile?: string
): Promise<string> {
  await ensureAvatarDir();
  const resized = await manipulateAsync(
    sourceUri,
    [{ resize: { width: MAX_EDGE } }],
    { compress: 0.85, format: SaveFormat.JPEG }
  );
  const b64 = await FileSystem.readAsStringAsync(resized.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const jpegBytes = bytesFromB64(b64);
  const encrypted = await encryptBytes(jpegBytes);
  const fileName = await newAvatarFileName();
  await FileSystem.writeAsStringAsync(avatarFilePath(fileName), b64FromBytes(encrypted), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (previousFile) {
    await deleteAvatarFile(previousFile);
  }
  memoryCache.delete(fileName);
  return fileName;
}

/** Copy encrypted avatar blob to a new file (separate from the source contact). */
export async function duplicateAvatarFile(
  sourceFile?: string | null
): Promise<string | undefined> {
  if (!sourceFile) return undefined;
  await ensureAvatarDir();
  const path = avatarFilePath(sourceFile);
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return undefined;
  const stored = await FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const fileName = await newAvatarFileName();
  await FileSystem.writeAsStringAsync(avatarFilePath(fileName), stored, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileName;
}

export async function deleteAvatarFile(fileName?: string | null): Promise<void> {
  if (!fileName) return;
  memoryCache.delete(fileName);
  try {
    const path = avatarFilePath(fileName);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export async function getAvatarDataUri(fileName?: string | null): Promise<string | null> {
  if (!fileName) return null;
  const cached = memoryCache.get(fileName);
  if (cached) return cached;

  try {
    const path = avatarFilePath(fileName);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const stored = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const packed = bytesFromB64(stored);
    const jpegBytes = await decryptBytes(packed);
    const b64 = b64FromBytes(jpegBytes);
    const uri = `data:image/jpeg;base64,${b64}`;
    memoryCache.set(fileName, uri);
    return uri;
  } catch {
    return null;
  }
}

export async function migrateContactAvatar(contact: Contact): Promise<Contact> {
  const { imageUrl, avatarFile, ...rest } = contact;
  if (avatarFile && !imageUrl) {
    return contact;
  }
  if (avatarFile && imageUrl) {
    return { ...rest, avatarFile, imageUrl: undefined };
  }
  if (!imageUrl) {
    return { ...rest, avatarFile: undefined, imageUrl: undefined };
  }
  try {
    const info = await FileSystem.getInfoAsync(imageUrl);
    if (!info.exists) {
      return { ...rest, avatarFile: undefined, imageUrl: undefined };
    }
    const fileName = await saveAvatarFromSourceUri(imageUrl);
    return { ...rest, avatarFile: fileName, imageUrl: undefined };
  } catch {
    return { ...rest, avatarFile: undefined, imageUrl: undefined };
  }
}

export async function migrateAllContactAvatars(contacts: Contact[]): Promise<{
  contacts: Contact[];
  changed: boolean;
}> {
  let changed = false;
  const next: Contact[] = [];
  for (const c of contacts) {
    const migrated = await migrateContactAvatar(c);
    if (
      migrated.avatarFile !== c.avatarFile ||
      migrated.imageUrl !== c.imageUrl
    ) {
      changed = true;
    }
    next.push(migrated);
  }
  return { contacts: next, changed };
}

/** Plain JPEG bytes (base64) for password backup — decrypted image, not device-key blob. */
export async function packAvatarsForBackup(contacts: Contact[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const c of contacts) {
    if (!c.avatarFile) continue;
    const uri = await getAvatarDataUri(c.avatarFile);
    if (!uri) continue;
    const b64 = uri.replace(/^data:image\/jpeg;base64,/, '');
    out[c.avatarFile] = b64;
  }
  return out;
}

export async function restoreAvatarsFromBackup(
  avatars: Record<string, string> | undefined,
  contacts: Contact[]
): Promise<void> {
  if (!avatars || Object.keys(avatars).length === 0) return;
  await ensureAvatarDir();
  const used = new Set(contacts.map((c) => c.avatarFile).filter(Boolean) as string[]);
  for (const fileName of used) {
    const b64 = avatars[fileName];
    if (!b64) continue;
    const jpegBytes = bytesFromB64(b64);
    const encrypted = await encryptBytes(jpegBytes);
    await FileSystem.writeAsStringAsync(avatarFilePath(fileName), b64FromBytes(encrypted), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    memoryCache.delete(fileName);
  }
}

export async function deleteAllAvatarFiles(): Promise<void> {
  clearAvatarMemoryCache();
  try {
    const info = await FileSystem.getInfoAsync(AVATAR_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(AVATAR_DIR, { idempotent: true });
    }
  } catch {
    /* ignore */
  }
}

export async function deleteExportTempFiles(): Promise<void> {
  try {
    const cache = FileSystem.cacheDirectory;
    if (!cache) return;
    const backup = `${cache}unspoken-backup.txt`;
    const info = await FileSystem.getInfoAsync(backup);
    if (info.exists) await FileSystem.deleteAsync(backup, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export function contactHasPhoto(contact: Pick<Contact, 'avatarFile' | 'imageUrl'>): boolean {
  return !!(contact.avatarFile || contact.imageUrl);
}
