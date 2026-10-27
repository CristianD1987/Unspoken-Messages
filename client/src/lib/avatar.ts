import type { AvatarColor, Contact } from '@/types';
import { avatarColors } from '@/theme';

export const AVATAR_COLOR_CYCLE: AvatarColor[] = [
  'from-pink-500 to-rose-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-violet-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-amber-600',
  'from-red-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
];

export function nextAvatarColor(current: AvatarColor | undefined): AvatarColor {
  const idx = AVATAR_COLOR_CYCLE.indexOf(current as AvatarColor);
  const next = idx >= 0 ? (idx + 1) % AVATAR_COLOR_CYCLE.length : 0;
  return AVATAR_COLOR_CYCLE[next];
}

export function getContactColorIndex(contact: Contact, contacts: Contact[]): number {
  const idx = contacts.findIndex((c) => c.id === contact.id);
  if (idx >= 0) return idx % avatarColors.length;
  let hash = 0;
  for (let i = 0; i < contact.id.length; i++) {
    hash = (hash + contact.id.charCodeAt(i)) % avatarColors.length;
  }
  return hash;
}

export function getContactInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}
