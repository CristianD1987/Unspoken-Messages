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
  imageUrl?: string;
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
  lastMessage?: string;
  lastMessageAt?: Date;
}

export interface AppData {
  settings: {
    pinHash: string;
    biometricEnabled: boolean;
    autoDeleteEnabled: boolean;
    autoDeleteDays: number;
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

export type RootStackParamList = {
  Intro: undefined;
  Onboarding: undefined;
  PinSetup: undefined;
  PinAuth: undefined;
  Home: undefined;
  ContactSelection: undefined;
  Chat: { contactId: string };
  Settings: undefined;
  Terms: undefined;
};
