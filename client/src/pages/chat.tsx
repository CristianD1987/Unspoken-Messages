import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, MoreHorizontal, ArrowUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { RootStackParamList } from '../types/navigation';
import { MessageBubble } from '@/components/message-bubble';
import { DonationModal } from '@/components/donation-modal';
import { useAppData } from '@/hooks/use-storage';
import { useAppToast } from '@/components/AppToast';
import { auth } from '@/lib/auth';
import { EncryptedAvatar } from '@/components/EncryptedAvatar';
import {
  saveAvatarFromSourceUri,
  deleteAvatarFile,
  contactHasPhoto,
} from '@/lib/avatars';
import { HeartCheckIcon } from '@/components/HeartCheckIcon';
import {
  SheetType,
  OptionsSheet,
  RenameSheet,
  ClosureSheet,
  DeleteSheet,
} from '@/components/sheets/ConversationSheets';
import { getContactColorIndex, nextAvatarColor } from '@/lib/avatar';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import {
  MessageActionsSheet,
  EditMessageSheet,
  DeleteMessageSheet,
  DeleteConversationSheet,
} from '@/components/sheets/MessageSheets';
import type { AvatarColor } from '@/types';
import { colors, fonts, hairline, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatPage({ navigation, route }: Props) {
  const { contactId } = route.params;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetType>(null);
  const [renameVal, setRenameVal] = useState('');
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editMessageVal, setEditMessageVal] = useState('');
  const [messageActionsOpen, setMessageActionsOpen] = useState(false);
  const [editMessageOpen, setEditMessageOpen] = useState(false);
  const [deleteMessageOpen, setDeleteMessageOpen] = useState(false);

  const {
    data,
    addMessage,
    editMessage,
    deleteMessage,
    deleteContact,
    branchNewConversation,
    getContactMessages,
    updateData,
    shouldShowDonationModal,
    markDonationPromptShown,
    reloadData,
  } = useAppData();
  const { showToast } = useAppToast();

  useFocusEffect(
    useCallback(() => {
      reloadData();
    }, [reloadData])
  );

  useEffect(() => {
    (async () => {
      if (!auth.isAuthenticated()) {
        navigation.replace('Lock', { mode: 'enter' });
      }
    })();
  }, [navigation]);

  const contact = data?.contacts.find((c) => c.id === contactId);
  const conversation = data?.conversations.find((c) => c.contactId === contactId);
  const messages = getContactMessages(contactId);
  const isClosed = conversation?.isClosed ?? false;
  const contacts = data?.contacts ?? [];
  const colorIndex = contact ? getContactColorIndex(contact, contacts) : 0;

  const scrollToLatest = useCallback((animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    scrollToLatest(true);
  }, [messages, isClosed, scrollToLatest]);

  useEffect(() => {
    const { show } = shouldShowDonationModal();
    if (show) setDonationModalOpen(true);
  }, [data?.settings.totalMessagesSent, shouldShowDonationModal]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isLoading || isClosed) return;
    setIsLoading(true);
    setDraft('');
    try {
      await addMessage(contactId, text);
      await reloadData();
    } catch {
      showToast('Failed to send message');
      setDraft(text);
    } finally {
      setIsLoading(false);
    }
  };

  const showClosureCta =
    !isClosed && messages.length > 0 && !draft.trim();

  const closeSheet = () => setSheet(null);

  useHardwareBack(
    useCallback(() => {
      if (donationModalOpen) {
        setDonationModalOpen(false);
        markDonationPromptShown();
        return true;
      }
      if (deleteMessageOpen) {
        setDeleteMessageOpen(false);
        return true;
      }
      if (editMessageOpen) {
        setEditMessageOpen(false);
        return true;
      }
      if (messageActionsOpen) {
        setMessageActionsOpen(false);
        return true;
      }
      if (sheet) {
        closeSheet();
        return true;
      }
      return false;
    }, [
      sheet,
      donationModalOpen,
      deleteMessageOpen,
      editMessageOpen,
      messageActionsOpen,
      markDonationPromptShown,
    ])
  );

  const handleClosureAction = () => {
    if (isClosed) return;
    setSheet('closure');
  };

  const handleStartNewAfterClosure = async () => {
    try {
      const newContactId = await branchNewConversation(contactId);
      navigation.replace('Chat', { contactId: newContactId });
    } catch {
      showToast('Could not start a new conversation');
    }
  };

  const confirmClosure = () => {
    const closedOn = format(new Date(), 'd MMM');
    updateData((d) => ({
      ...d,
      conversations: d.conversations.map((c) =>
        c.contactId === contactId ? { ...c, isClosed: true, closedOn } : c
      ),
    }));
    setSheet(null);
  };

  const confirmDelete = () => {
    updateData((d) => ({
      ...d,
      messages: d.messages.filter((m) => m.contactId !== contactId),
      conversations: d.conversations.map((c) =>
        c.contactId === contactId
          ? { ...c, lastMessage: undefined, lastMessageAt: undefined, messageCount: 0 }
          : c
      ),
    }));
    setSheet(null);
    showToast('Messages deleted');
  };

  const handleRemovePicture = async () => {
    if (contact?.avatarFile) {
      await deleteAvatarFile(contact.avatarFile);
    }
    updateData((d) => ({
      ...d,
      contacts: d.contacts.map((c) =>
        c.id === contactId ? { ...c, avatarFile: undefined, imageUrl: undefined } : c
      ),
    }));
    setSheet(null);
  };

  const handleChangeAvatarColor = () => {
    if (!contact) return;
    const newColor = nextAvatarColor(contact.color as AvatarColor);
    updateData((d) => ({
      ...d,
      contacts: d.contacts.map((c) =>
        c.id === contactId ? { ...c, color: newColor } : c
      ),
    }));
    setSheet(null);
  };

  const handleChangePicture = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      try {
        const fileName = await saveAvatarFromSourceUri(
          result.assets[0].uri,
          contact?.avatarFile
        );
        updateData((d) => ({
          ...d,
          contacts: d.contacts.map((c) =>
            c.id === contactId
              ? { ...c, avatarFile: fileName, imageUrl: undefined }
              : c
          ),
        }));
      } catch {
        showToast('Could not save photo');
      }
    }
    setSheet(null);
  };

  if (!contact) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const closedLabel =
    conversation?.closedOn && String(conversation.closedOn).trim()
      ? `CLOSURE · ${conversation.closedOn}`
      : 'CLOSURE';

  const composerBottomInset = focused ? 8 : insets.bottom + 8;

  const messageList = (
    <ScrollView
      ref={scrollRef}
      style={styles.messages}
      contentContainerStyle={[
        styles.messagesContent,
        messages.length === 0 && !isClosed ? styles.messagesEmpty : null,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {messages.length === 0 && !isClosed ? (
        <View style={styles.emptyChat}>
          <EncryptedAvatar
            name={contact.name}
            colorIndex={colorIndex}
            avatarFile={contact.avatarFile}
            size={72}
          />
          <Text style={typography.chatIntro}>Start your conversation with {contact.name}</Text>
          <Text style={styles.emptySub}>
            This is a safe space to express your thoughts and feelings.
          </Text>
        </View>
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              disabled={isClosed}
              onLongPress={() => {
                if (isClosed) return;
                setActiveMessageId(msg.id);
                setMessageActionsOpen(true);
              }}
            />
          ))}
          {isClosed ? (
            <View style={styles.closureDividerRow}>
              <View style={hairline} />
              <Text style={styles.closureDividerText}>{closedLabel}</Text>
              <View style={hairline} />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable style={styles.headerBtn} onPress={() => navigation.navigate('Home')}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={1.8} />
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={() => setSheet('options')}
        >
          <EncryptedAvatar
            name={contact.name}
            colorIndex={colorIndex}
            avatarFile={contact.avatarFile}
            size={40}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{contact.name}</Text>
            <Text style={styles.headerSub}>Private · never sent</Text>
          </View>
        </Pressable>
        <Pressable style={styles.headerRound} onPress={() => setSheet('options')}>
          <MoreHorizontal size={20} color={colors.textMuted} strokeWidth={1.6} />
        </Pressable>
      </View>
      <View style={hairline} />

      {isClosed ? (
        <>
          {messageList}
          <View style={[styles.closedBlock, { paddingBottom: insets.bottom + 8 }]}>
            <Text style={styles.closedFooter}>This conversation has reached closure.</Text>
            <Pressable style={styles.newConvoPill} onPress={handleStartNewAfterClosure}>
              <Text style={styles.newConvoPillText}>
                Start a new conversation with {contact.name}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          {messageList}
          {showClosureCta ? (
            <Pressable style={styles.closureCta} onPress={() => setSheet('closure')}>
              <HeartCheckIcon size={18} />
              <Text style={styles.closureCtaText}>Said everything? Find closure</Text>
            </Pressable>
          ) : null}
          <View style={[styles.composer, { paddingBottom: composerBottomInset }]}>
            <TextInput
              style={[styles.input, focused && styles.inputFocused]}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write what you couldn't say…"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={2000}
              onFocus={() => {
                setFocused(true);
                scrollToLatest(true);
              }}
              onBlur={() => setFocused(false)}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleSend}
            />
            <Pressable
              style={[
                styles.sendBtn,
                { backgroundColor: draft.trim() ? colors.accent : colors.disabledSend },
              ]}
              onPress={handleSend}
              disabled={!draft.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.accentInk} size="small" />
              ) : (
                <ArrowUp
                  size={20}
                  color={draft.trim() ? colors.accentInk : colors.textFaint}
                  strokeWidth={2}
                />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <OptionsSheet
        sheet={sheet}
        onClose={closeSheet}
        targetContact={contact}
        allContacts={contacts}
        isClosed={isClosed}
        onRename={() => {
          setRenameVal(contact.name);
          setSheet('rename');
        }}
        onChangePicture={handleChangePicture}
        onRemovePicture={handleRemovePicture}
        onChangeAvatarColor={handleChangeAvatarColor}
        hasPhoto={contactHasPhoto(contact)}
        onClosureAction={handleClosureAction}
        onDelete={() => setSheet('delete')}
        onDeleteConversation={() => setSheet('deleteConversation')}
      />
      <RenameSheet
        sheet={sheet}
        onClose={closeSheet}
        targetContact={contact}
        allContacts={contacts}
        renameVal={renameVal}
        onRenameChange={setRenameVal}
        onSave={() => {
          if (!renameVal.trim()) return;
          updateData((d) => ({
            ...d,
            contacts: d.contacts.map((c) =>
              c.id === contactId
                ? { ...c, name: renameVal.trim(), avatar: renameVal.trim().charAt(0).toUpperCase() }
                : c
            ),
          }));
          setSheet(null);
        }}
      />
      <ClosureSheet
        sheet={sheet}
        onClose={closeSheet}
        targetContact={contact}
        allContacts={contacts}
        onConfirm={confirmClosure}
      />
      <DeleteSheet
        sheet={sheet}
        onClose={closeSheet}
        targetContact={contact}
        allContacts={contacts}
        onConfirm={confirmDelete}
      />

      <DeleteConversationSheet
        visible={sheet === 'deleteConversation'}
        onClose={closeSheet}
        name={contact.name}
        onConfirm={() => {
          void deleteContact(contactId);
          closeSheet();
          navigation.navigate('Home');
        }}
      />

      <MessageActionsSheet
        visible={messageActionsOpen}
        onClose={() => setMessageActionsOpen(false)}
        onEdit={() => {
          const msg = messages.find((m) => m.id === activeMessageId);
          if (!msg) return;
          setEditMessageVal(msg.content);
          setMessageActionsOpen(false);
          setEditMessageOpen(true);
        }}
        onDelete={() => {
          setMessageActionsOpen(false);
          setDeleteMessageOpen(true);
        }}
      />
      <EditMessageSheet
        visible={editMessageOpen}
        onClose={() => setEditMessageOpen(false)}
        value={editMessageVal}
        onChange={setEditMessageVal}
        onSave={() => {
          if (!activeMessageId || !editMessageVal.trim()) return;
          editMessage(activeMessageId, editMessageVal.trim());
          setEditMessageOpen(false);
          setActiveMessageId(null);
        }}
      />
      <DeleteMessageSheet
        visible={deleteMessageOpen}
        onClose={() => setDeleteMessageOpen(false)}
        onConfirm={() => {
          if (activeMessageId) deleteMessage(activeMessageId);
          setDeleteMessageOpen(false);
          setActiveMessageId(null);
          showToast('Message deleted');
        }}
      />

      <DonationModal
        isOpen={donationModalOpen}
        onClose={() => {
          setDonationModalOpen(false);
          markDonationPromptShown();
        }}
        messageCount={data?.settings.totalMessagesSent || 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.section,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    minWidth: 0,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerName: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.text,
  },
  headerSub: { ...typography.captionSmall },
  headerRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: spacing.screen, paddingVertical: spacing.xl },
  messagesEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyChat: { alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing.section },
  emptySub: {
    ...typography.preview,
    textAlign: 'center',
    lineHeight: 20,
  },
  closureDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginVertical: spacing.xl,
  },
  closureDividerText: {
    ...typography.badge,
    color: colors.closure,
  },
  closureCta: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 40,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.closureBorder,
    backgroundColor: colors.closureSoft,
    marginBottom: spacing.md,
  },
  closureCtaText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.closure,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.section,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 120,
    backgroundColor: colors.surface1,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: 15.5,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedBlock: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  closedFooter: {
    ...typography.preview,
    textAlign: 'center',
  },
  newConvoPill: {
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  newConvoPillText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.accent,
    textAlign: 'center',
  },
});
