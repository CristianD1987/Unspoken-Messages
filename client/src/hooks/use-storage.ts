import { useState, useEffect, useCallback } from "react";
import { storage } from "../lib/storage";
import type { AppData, Contact, Message, Conversation, AvatarColor } from "../types";
import 'react-native-get-random-values'; // sus in fisier, o singura data
import 'react-native-get-random-values'; // Trebuie primul
import { v4 as uuidv4 } from 'uuid';
import { deleteAvatarFile, duplicateAvatarFile } from "@/lib/avatars";
import { UndecryptableStorageError } from "@/lib/storageErrors";


export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const appData = await storage.getAppData();
        if (!appData) {
          // Initialize with default data
          const defaultData: AppData = {
            settings: {
              pinHash: "",
              biometricEnabled: false,
              autoDeleteEnabled: false,
              autoDeleteDays: 30,
              onboardingCompleted: false,
              totalMessagesSent: 0,
              donationIntervalsShown: [],
              donationCycleIndex: 0,
              donationNextAt: 5,
            },
            contacts: [],
            messages: [],
            conversations: [],
            version: "1.0.0"
          };
          await storage.setAppData(defaultData);
          setData(defaultData);
        } else {
          // Migrate settings if missing donationCycleIndex or donationNextAt
          if (
            typeof appData.settings.donationCycleIndex === 'undefined' ||
            typeof appData.settings.donationNextAt === 'undefined'
          ) {
            appData.settings.donationCycleIndex = 0;
            appData.settings.donationNextAt = 5;
          }
          setData(appData);
        }
      } catch (error) {
        if (error instanceof UndecryptableStorageError) {
          setData(null);
        } else {
          console.error("Failed to load app data:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Expose reloadData to force reload from storage
  const reloadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const appData = await storage.getAppData();
      if (appData) {
        setData(appData);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateData = useCallback((updater: (data: AppData) => AppData) => {
    setData(currentData => {
      if (!currentData) return null;
      
      const newData = updater(currentData);
      try {
        storage.setAppData(newData);
        return newData;
      } catch (error) {
        console.error("Failed to save app data:", error);
        return currentData;
      }
    });
  }, []);

  const updateDataSync = useCallback((updater: (data: AppData) => AppData): AppData | null => {
    const currentData = data;
    if (!currentData) return null;
    
    const newData = updater(currentData);
    try {
      storage.setAppData(newData);
      setData(newData);
      return newData;
    } catch (error) {
      console.error("Failed to save app data:", error);
      return currentData;
    }
  }, [data]);

  const addContact = useCallback(async (name: string): Promise<string> => {
    const avatarColors: AvatarColor[] = [
      "from-pink-500 to-rose-600",
      "from-blue-500 to-indigo-600",
      "from-purple-500 to-violet-600",
      "from-green-500 to-emerald-600",
      "from-orange-500 to-amber-600",
      "from-red-500 to-pink-600",
      "from-cyan-500 to-blue-600",
      "from-violet-500 to-purple-600",
    ];

    const trimmedName = name.trim();
    const latestData = await storage.getAppData();
    if (!latestData) throw new Error("Failed to load app data");
    // Check for duplicate
    if (latestData.contacts.some(contact => contact.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error("Contact with this name already exists");
    }
    const contactId = uuidv4();
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const newContact: Contact = {
      id: contactId,
      name: trimmedName,
      avatar: trimmedName.charAt(0),
      color: randomColor,
      createdAt: new Date(),
    };
    const newConversation: Conversation = {
      id: uuidv4(),
      contactId: newContact.id,
      messageCount: 0,
      unreadCount: 0,
      isClosed: false,
      lastMessage: undefined,
      lastMessageAt: undefined,
    };
    const updatedData: AppData = {
      ...latestData,
      contacts: [...latestData.contacts, newContact],
      conversations: [...latestData.conversations, newConversation],
    };
    await storage.setAppData(updatedData);
    setData(updatedData);
    return contactId;
  }, []);

  /** New open conversation with the same display name and a copied avatar file. */
  const branchNewConversation = useCallback(async (sourceContactId: string): Promise<string> => {
    const latestData = await storage.getAppData();
    if (!latestData) throw new Error('Failed to load app data');
    const source = latestData.contacts.find((c) => c.id === sourceContactId);
    if (!source) throw new Error('Contact not found');

    const avatarFile = await duplicateAvatarFile(source.avatarFile);
    const contactId = uuidv4();
    const newContact: Contact = {
      id: contactId,
      name: source.name,
      avatar: source.avatar,
      color: source.color,
      createdAt: new Date(),
      avatarFile,
    };
    const newConversation: Conversation = {
      id: uuidv4(),
      contactId,
      messageCount: 0,
      unreadCount: 0,
      isClosed: false,
      lastMessage: undefined,
      lastMessageAt: undefined,
    };
    const updatedData: AppData = {
      ...latestData,
      contacts: [...latestData.contacts, newContact],
      conversations: [...latestData.conversations, newConversation],
    };
    await storage.setAppData(updatedData);
    setData(updatedData);
    return contactId;
  }, []);

  const addMessage = useCallback(async (contactId: string, content: string) => {
    // Always fetch the latest data from storage before updating
    const latestData = await storage.getAppData();
    if (!latestData) throw new Error("Failed to load app data");
    const message: Message = {
      id: uuidv4(),
      contactId,
      content,
      timestamp: new Date(),
      isRead: true,
    };
    let updatedConversations = [...latestData.conversations];
    let conversationIndex = latestData.conversations.findIndex(c => c.contactId === contactId);
    if (conversationIndex !== -1) {
      // Update existing conversation
      updatedConversations[conversationIndex] = {
        ...updatedConversations[conversationIndex],
        lastMessage: content,
        lastMessageAt: new Date(),
        messageCount: updatedConversations[conversationIndex].messageCount + 1,
      };
    } else {
      // Create new conversation if it doesn't exist
      updatedConversations.push({
        id: uuidv4(),
        contactId,
        lastMessage: content,
        lastMessageAt: new Date(),
        messageCount: 1,
        unreadCount: 0,
        isClosed: false,
      });
    }
    const newTotalMessages = latestData.settings.totalMessagesSent + 1;
    const updatedData: AppData = {
      ...latestData,
      messages: [...latestData.messages, message],
      conversations: updatedConversations,
      settings: {
        ...latestData.settings,
        totalMessagesSent: newTotalMessages,
      }
    };
    await storage.setAppData(updatedData);
    setData(updatedData);
  }, []);

  const editMessage = useCallback((messageId: string, newContent: string) => {
    updateData(data => {
      const messageIndex = data.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return data;

      const updatedMessages = [...data.messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: newContent,
      };

      // Update conversation's last message if this was the most recent message
      const message = updatedMessages[messageIndex];
      const contactMessages = updatedMessages.filter(m => m.contactId === message.contactId);
      const isLastMessage = contactMessages[contactMessages.length - 1].id === messageId;

      let updatedConversations = data.conversations;
      if (isLastMessage) {
        updatedConversations = data.conversations.map(conv => 
          conv.contactId === message.contactId 
            ? { ...conv, lastMessage: newContent }
            : conv
        );
      }

      return {
        ...data,
        messages: updatedMessages,
        conversations: updatedConversations,
      };
    });
  }, [updateData]);

  const deleteContact = useCallback(async (contactId: string) => {
    const contact = data?.contacts.find((c) => c.id === contactId);
    if (contact?.avatarFile) {
      await deleteAvatarFile(contact.avatarFile);
    }
    updateData((d) => ({
      ...d,
      contacts: d.contacts.filter((c) => c.id !== contactId),
      messages: d.messages.filter((m) => m.contactId !== contactId),
      conversations: d.conversations.filter((c) => c.contactId !== contactId),
    }));
  }, [updateData, data?.contacts]);

  const updateSettings = useCallback((settings: Partial<AppData['settings']>) => {
    updateData(data => ({
      ...data,
      settings: { ...data.settings, ...settings },
    }));
  }, [updateData]);

  const getContactMessages = useCallback((contactId: string): Message[] => {
    if (!data) return [];
    return data.messages
      .filter(m => m.contactId === contactId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [data]);

  const getConversationsWithContacts = useCallback(() => {
    if (!data) return [];
    return data.conversations.map(conversation => {
      const contact = data.contacts.find(c => c.id === conversation.contactId);
      if (!contact) return null;
      // Find the last message from the messages array
      const lastMessageObj = data.messages
        .filter(m => m.contactId === contact.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      // Fallback: use conversation.lastMessage if no message object found
      let lastMessage = undefined;
      if (lastMessageObj) {
        lastMessage = {
          text: lastMessageObj.content,
          timestamp: lastMessageObj.timestamp.toString(),
        };
      } else if (conversation.lastMessage) {
        lastMessage = {
          text: conversation.lastMessage,
          timestamp: conversation.lastMessageAt ? conversation.lastMessageAt.toString() : '',
        };
      }
      return {
        contact: {
          id: contact.id,
          name: contact.name,
          avatar: contact.avatar,
          color: contact.color,
          avatarFile: contact.avatarFile,
          imageUrl: contact.imageUrl,
        },
        lastMessage,
        isClosed: conversation.isClosed,
        closedOn: conversation.closedOn,
      };
    })
      .filter(Boolean)
      .sort((a, b) => {
        const ta = a!.lastMessage?.timestamp
          ? new Date(a!.lastMessage.timestamp).getTime()
          : 0;
        const tb = b!.lastMessage?.timestamp
          ? new Date(b!.lastMessage.timestamp).getTime()
          : 0;
        return tb - ta;
      });
  }, [data]);

  // Custom donation modal cycle: 5, 10, 20, then reset to 5
  const donationCycle = [5, 10, 20];
  const shouldShowDonationModal = useCallback(() => {
    if (!data) return { show: false, nextAt: 0, totalMessages: 0 };
    const totalMessages = data.settings.totalMessagesSent || 0;
    const cycleIndex = data.settings.donationCycleIndex || 0;
    const nextAt = (data.settings.donationNextAt != null)
      ? data.settings.donationNextAt
      : donationCycle[0];
    if (totalMessages >= nextAt) {
      return { show: true, nextAt, totalMessages };
    }
    return { show: false, nextAt, totalMessages };
  }, [data]);

  const markDonationPromptShown = useCallback(() => {
    if (!data) return;
    const cycleIndex = data.settings.donationCycleIndex || 0;
    let nextIndex = cycleIndex + 1;
    if (nextIndex >= donationCycle.length) nextIndex = 0;
    const nextAt = (data.settings.totalMessagesSent || 0) + donationCycle[nextIndex];
    updateData(prevData => ({
      ...prevData,
      settings: {
        ...prevData.settings,
        donationCycleIndex: nextIndex,
        donationNextAt: nextAt,
      }
    }));
  }, [data, updateData]);

  const resetDonationCounter = useCallback(() => {
    if (!data) return;
    
    updateData(prevData => ({
      ...prevData,
      settings: {
        ...prevData.settings,
        totalMessagesSent: 0,
        donationIntervalsShown: [],
      }
    }));
  }, [data, updateData]);

  const clearAllData = useCallback(() => {
    storage.clearAllData();
    window.location.reload();
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    updateData(data => {
      const messageToDelete = data.messages.find(m => m.id === messageId);
      if (!messageToDelete) return data;
      const updatedMessages = data.messages.filter(m => m.id !== messageId);
      // Update conversation's last message if this was the most recent message
      const contactMessages = updatedMessages.filter(m => m.contactId === messageToDelete.contactId);
      let updatedConversations = data.conversations;
      if (contactMessages.length > 0) {
        const lastMsg = contactMessages[contactMessages.length - 1];
        updatedConversations = data.conversations.map(conv =>
          conv.contactId === messageToDelete.contactId
            ? { ...conv, lastMessage: lastMsg.content, lastMessageAt: lastMsg.timestamp }
            : conv
        );
      } else {
        // No messages left for this contact
        updatedConversations = data.conversations.map(conv =>
          conv.contactId === messageToDelete.contactId
            ? { ...conv, lastMessage: undefined, lastMessageAt: undefined, messageCount: 0 }
            : conv
        );
      }
      return {
        ...data,
        messages: updatedMessages,
        conversations: updatedConversations,
      };
    });
  }, [updateData]);

  return {
    data,
    isLoading,
    updateData,
    addContact,
    branchNewConversation,
    addMessage,
    editMessage,
    deleteMessage,
    deleteContact,
    updateSettings,
    getContactMessages,
    getConversationsWithContacts,
    shouldShowDonationModal,
    markDonationPromptShown,
    resetDonationCounter,
    clearAllData,
    reloadData,
  };
}
