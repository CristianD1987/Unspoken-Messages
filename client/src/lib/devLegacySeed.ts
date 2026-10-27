import { storage } from '@/lib/storage';
import type { AppData } from '@/types';

/** Dev-only: writes app_data in the pre-redesign shape (no closedOn, tailwind-style avatar colors). */
export async function seedLegacyAppData(): Promise<void> {
  if (!__DEV__) return;

  const legacy: AppData = {
    version: '1.0.0',
    settings: {
      pinHash: '',
      biometricEnabled: true,
      autoDeleteEnabled: false,
      autoDeleteDays: 30,
      onboardingCompleted: true,
      totalMessagesSent: 3,
      donationIntervalsShown: [],
      donationCycleIndex: 0,
      donationNextAt: 5,
    },
    contacts: [
      {
        id: 'legacy-contact-1',
        name: 'Mama',
        avatar: 'M',
        color: 'from-purple-500 to-violet-600',
        createdAt: new Date('2024-06-01'),
        imageUrl: undefined,
      },
    ],
    messages: [
      {
        id: 'legacy-msg-1',
        contactId: 'legacy-contact-1',
        content: 'I never said this out loud.',
        timestamp: new Date('2024-06-02T10:30:00'),
        isRead: true,
      },
    ],
    conversations: [
      {
        id: 'legacy-conv-1',
        contactId: 'legacy-contact-1',
        messageCount: 1,
        unreadCount: 0,
        isClosed: true,
        lastMessage: 'I never said this out loud.',
        lastMessageAt: new Date('2024-06-02T10:30:00'),
      },
    ],
  };

  await storage.setAppData(legacy);
}
