import type { AppData } from '@/types';

/** Returns a new AppData if messages were removed; otherwise the same reference. */
export function applyAutoDelete(data: AppData): AppData {
  if (data.settings.autoDeleteNeedsReconfirm) return data;
  if (!data.settings.autoDeleteEnabled) return data;

  const days = Math.max(1, data.settings.autoDeleteDays || 30);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const closedContactIds = new Set(
    data.conversations.filter((c) => c.isClosed).map((c) => c.contactId)
  );

  const keptMessages = data.messages.filter((m) => {
    if (closedContactIds.has(m.contactId)) return true;
    return new Date(m.timestamp).getTime() >= cutoff;
  });

  if (keptMessages.length === data.messages.length) return data;

  const updatedMessages = keptMessages;
  const updatedConversations = data.conversations.map((conv) => {
    const contactMessages = updatedMessages
      .filter((m) => m.contactId === conv.contactId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (contactMessages.length === 0) {
      return {
        ...conv,
        lastMessage: undefined,
        lastMessageAt: undefined,
        messageCount: 0,
      };
    }
    const last = contactMessages[contactMessages.length - 1];
    return {
      ...conv,
      lastMessage: last.content,
      lastMessageAt: last.timestamp,
      messageCount: contactMessages.length,
    };
  });

  return {
    ...data,
    messages: updatedMessages,
    conversations: updatedConversations,
  };
}
