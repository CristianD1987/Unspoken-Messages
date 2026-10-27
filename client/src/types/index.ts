export interface NavigationState {
  currentPage: string;
  previousPage?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  sessionExpiry?: number;
}

export interface PinState {
  current: string;
  confirmed?: string;
  isConfirming: boolean;
}

export type AvatarColor = 
  | "from-pink-500 to-rose-600"
  | "from-blue-500 to-indigo-600"
  | "from-purple-500 to-violet-600"
  | "from-green-500 to-emerald-600"
  | "from-orange-500 to-amber-600"
  | "from-red-500 to-pink-600"
  | "from-cyan-500 to-blue-600"
  | "from-violet-500 to-purple-600";

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  color: AvatarColor;
  createdAt: Date;
  /** @deprecated Legacy cache URI — migrated to `avatarFile`. */
  imageUrl?: string;
  /** Encrypted avatar filename under documentDirectory/avatars/ */
  avatarFile?: string;
}

export interface Message {
  id: string;
  contactId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  contactId: string;
  messageCount: number;
  unreadCount: number;
  isClosed: boolean;
  closedOn?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
}

export interface AppData {
  settings: {
    pinHash: string;
    biometricEnabled: boolean;
    autoDeleteEnabled: boolean;
    autoDeleteDays: number;
    /** When true, show re-confirm sheet and block auto-delete until cleared. */
    autoDeleteNeedsReconfirm?: boolean;
    onboardingCompleted: boolean;
    totalMessagesSent: number;
    donationIntervalsShown: number[];
    donationCycleIndex?: number;
    donationNextAt?: number;
  };
  contacts: Contact[];
  messages: Message[];
  conversations: Conversation[];
  version: string;
}

