import type { AppData } from '@/types';
import { migrateAllContactAvatars } from './avatars';
import { migrateLocalEncryption } from './encryption';
import { cleanupLegacyTrackingStorage } from './trackingCleanup';

/** Runs once at cold start: storage cipher v2, auto-delete re-confirm, avatar encryption. */
export async function runPostLaunchMigrations(
  getAppData: () => Promise<AppData | null>,
  setAppData: (data: AppData) => Promise<void>
): Promise<void> {
  await cleanupLegacyTrackingStorage();
  await migrateLocalEncryption();

  let data = await getAppData();
  if (!data) return;

  let dirty = false;

  if (
    data.settings.autoDeleteEnabled &&
    data.settings.autoDeleteNeedsReconfirm === undefined
  ) {
    data = {
      ...data,
      settings: {
        ...data.settings,
        autoDeleteEnabled: false,
        autoDeleteNeedsReconfirm: true,
      },
    };
    dirty = true;
  }

  const avatarResult = await migrateAllContactAvatars(data.contacts);
  if (avatarResult.changed) {
    data = { ...data, contacts: avatarResult.contacts };
    dirty = true;
  }

  if (dirty) {
    await setAppData(data);
  }
}
