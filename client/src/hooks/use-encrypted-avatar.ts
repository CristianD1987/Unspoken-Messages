import { useEffect, useState } from 'react';
import { getAvatarDataUri } from '@/lib/avatars';

/** In-memory decrypted data URI only — never written to disk. */
export function useEncryptedAvatar(avatarFile?: string | null): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!avatarFile) {
      setUri(null);
      return;
    }
    getAvatarDataUri(avatarFile).then((dataUri) => {
      if (!cancelled) setUri(dataUri);
    });
    return () => {
      cancelled = true;
    };
  }, [avatarFile]);

  return uri;
}
