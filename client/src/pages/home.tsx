import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SlidersHorizontal, Plus, MessageCircle, MoreVertical } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { RootStackParamList } from '../types/navigation';
import { auth } from '@/lib/auth';
import { useAppData } from '@/hooks/use-storage';
import { storage } from '@/lib/storage';
import { useAppToast } from '@/components/AppToast';
import { Wordmark } from '@/components/Wordmark';
import { EncryptedAvatar } from '@/components/EncryptedAvatar';
import { AutoDeleteConfirmSheet } from '@/components/sheets/AutoDeleteConfirmSheet';
import {
  saveAvatarFromSourceUri,
  deleteAvatarFile,
  contactHasPhoto,
} from '@/lib/avatars';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  SheetType,
  NewConversationSheet,
  PhoneContactsSheet,
  OptionsSheet,
  RenameSheet,
  ClosureSheet,
  DeleteSheet,
} from '@/components/sheets/ConversationSheets';
import { getContactColorIndex, nextAvatarColor } from '@/lib/avatar';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import { DeleteConversationSheet } from '@/components/sheets/MessageSheets';
import type { AvatarColor, Contact } from '@/types';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomePage({ navigation }: Props) {
  const {
    data,
    isLoading,
    getConversationsWithContacts,
    updateData,
    updateSettings,
    addContact,
    deleteContact,
    reloadData,
  } = useAppData();
  const { showToast } = useAppToast();

  const [sheet, setSheet] = useState<SheetType>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renameVal, setRenameVal] = useState('');
  const [autoDeleteConfirmOpen, setAutoDeleteConfirmOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reloadData();
    }, [reloadData])
  );

  useEffect(() => {
    (async () => {
      if (auth.isAuthenticated()) return;
      const current = navigation.getState().routes[navigation.getState().index]?.name;
      const termsAccepted = await storage.areTermsAccepted();
      if (!termsAccepted) {
        if (current === 'Intro') return;
        navigation.reset({ index: 0, routes: [{ name: 'Intro' }] });
      } else {
        if (current === 'Lock') return;
        navigation.replace('Lock', { mode: 'enter' });
      }
    })();
  }, [navigation]);

  useEffect(() => {
    if (data?.settings.autoDeleteNeedsReconfirm) {
      setAutoDeleteConfirmOpen(true);
    }
  }, [data?.settings.autoDeleteNeedsReconfirm]);

  const finishAutoDeleteReconfirm = (enable: boolean) => {
    updateSettings({
      autoDeleteEnabled: enable,
      autoDeleteNeedsReconfirm: false,
    });
    setAutoDeleteConfirmOpen(false);
  };

  const conversations = getConversationsWithContacts();
  const contacts = data?.contacts ?? [];
  const targetContact = contacts.find((c) => c.id === targetId) ?? null;
  const targetConversation = data?.conversations.find((c) => c.contactId === targetId);

  const closeSheet = () => setSheet(null);

  useHardwareBack(
    useCallback(() => {
      if (sheet) {
        closeSheet();
        return true;
      }
      return false;
    }, [sheet])
  );

  const openChat = (contactId: string) => {
    setSheet(null);
    navigation.navigate('Chat', { contactId });
  };

  const handleCreateContact = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const contactId = await addContact(trimmed);
      setNewName('');
      openChat(contactId);
    } catch {
      showToast('Could not create conversation');
    }
  };

  const handleRenameSave = () => {
    if (!targetId || !renameVal.trim()) return;
    updateData((d) => ({
      ...d,
      contacts: d.contacts.map((c) =>
        c.id === targetId
          ? { ...c, name: renameVal.trim(), avatar: renameVal.trim().charAt(0).toUpperCase() }
          : c
      ),
    }));
    setSheet(null);
  };

  const handleRemovePicture = async () => {
    if (!targetId || !targetContact) return;
    if (targetContact.avatarFile) {
      await deleteAvatarFile(targetContact.avatarFile);
    }
    updateData((d) => ({
      ...d,
      contacts: d.contacts.map((c) =>
        c.id === targetId ? { ...c, avatarFile: undefined, imageUrl: undefined } : c
      ),
    }));
    setSheet(null);
  };

  const handleChangeAvatarColor = () => {
    if (!targetContact) return;
    const newColor = nextAvatarColor(targetContact.color as AvatarColor);
    updateData((d) => ({
      ...d,
      contacts: d.contacts.map((c) =>
        c.id === targetId ? { ...c, color: newColor } : c
      ),
    }));
    setSheet(null);
  };

  const handleChangePicture = async () => {
    if (!targetId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      try {
        const previous = targetContact?.avatarFile;
        const fileName = await saveAvatarFromSourceUri(result.assets[0].uri, previous);
        updateData((d) => ({
          ...d,
          contacts: d.contacts.map((c) =>
            c.id === targetId
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

  const handleClosureAction = () => {
    if (!targetId || targetConversation?.isClosed) return;
    setSheet('closure');
  };

  const confirmClosure = () => {
    if (!targetId) return;
    const closedOn = format(new Date(), 'd MMM');
    updateData((d) => ({
      ...d,
      conversations: d.conversations.map((c) =>
        c.contactId === targetId ? { ...c, isClosed: true, closedOn } : c
      ),
    }));
    setSheet(null);
  };

  const confirmDeleteMessages = () => {
    if (!targetId) return;
    updateData((d) => ({
      ...d,
      messages: d.messages.filter((m) => m.contactId !== targetId),
      conversations: d.conversations.map((c) =>
        c.contactId === targetId
          ? { ...c, lastMessage: undefined, lastMessageAt: undefined, messageCount: 0 }
          : c
      ),
    }));
    setSheet(null);
    showToast('Messages deleted');
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Wordmark />
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        >
          <SlidersHorizontal size={20} color={colors.textMuted} strokeWidth={1.6} />
        </Pressable>
      </View>

      <Text style={[typography.screenTitle, styles.screenTitle]}>Conversations</Text>
      <Text style={styles.caption}>Kept only on this device. Never sent.</Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={conversations.length === 0 ? styles.listEmpty : undefined}
      >
        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyTile}>
              <MessageCircle size={32} color={colors.accent} strokeWidth={1.6} />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>
              Start your therapeutic journey by creating your first conversation.
            </Text>
            <PrimaryButton
              label="Start new conversation"
              onPress={() => {
                setNewName('');
                setSheet('new');
              }}
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          conversations.map((row) => {
            const contact = row!.contact as Contact;
            const colorIndex = getContactColorIndex(contact as Contact, contacts);
            const time =
              row!.lastMessage?.timestamp &&
              format(new Date(row!.lastMessage.timestamp), 'HH:mm');
            return (
              <Pressable
                key={contact.id}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => openChat(contact.id)}
              >
                <EncryptedAvatar
                  name={contact.name}
                  colorIndex={colorIndex}
                  avatarFile={contact.avatarFile}
                  size={52}
                />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={typography.rowName} numberOfLines={1}>
                      {contact.name}
                    </Text>
                    {time ? <Text style={styles.time}>{time}</Text> : null}
                  </View>
                  <View style={styles.rowBottom}>
                    {row!.isClosed ? (
                      <Text style={styles.closureBadge}>CLOSURE</Text>
                    ) : null}
                    <Text style={styles.preview} numberOfLines={1}>
                      {row!.isClosed
                        ? row!.lastMessage?.text ?? 'No messages yet'
                        : row!.lastMessage?.text ?? 'No messages yet'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.menuBtn}
                  onPress={() => {
                    setTargetId(contact.id);
                    setSheet('options');
                  }}
                  hitSlop={8}
                >
                  <MoreVertical size={18} color={colors.textMuted} strokeWidth={1.6} />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {conversations.length > 0 ? (
        <>
          <LinearGradient
            colors={['transparent', colors.bg]}
            style={styles.fade}
            pointerEvents="none"
          />
          <View style={styles.fabWrap}>
            <PrimaryButton
              label="New conversation"
              onPress={() => {
                setNewName('');
                setSheet('new');
              }}
              height={56}
              icon={<Plus size={20} color={colors.accentInk} strokeWidth={2} />}
              style={styles.fab}
              textStyle={{ fontSize: 16 }}
            />
          </View>
        </>
      ) : null}

      <NewConversationSheet
        sheet={sheet}
        onClose={closeSheet}
        newName={newName}
        onNewNameChange={setNewName}
        onCreate={() => handleCreateContact(newName)}
        onOpenContacts={() => setSheet('contacts')}
        targetContact={null}
        allContacts={contacts}
      />
      <PhoneContactsSheet
        sheet={sheet}
        onClose={closeSheet}
        onPick={(name) => handleCreateContact(name)}
      />
      <OptionsSheet
        sheet={sheet}
        onClose={closeSheet}
        targetContact={targetContact}
        allContacts={contacts}
        isClosed={!!targetConversation?.isClosed}
        onRename={() => {
          setRenameVal(targetContact?.name ?? '');
          setSheet('rename');
        }}
        onChangePicture={handleChangePicture}
        onRemovePicture={handleRemovePicture}
        onChangeAvatarColor={handleChangeAvatarColor}
        hasPhoto={targetContact ? contactHasPhoto(targetContact) : false}
        onClosureAction={handleClosureAction}
        onDelete={() => setSheet('delete')}
        onDeleteConversation={() => setSheet('deleteConversation')}
      />
      <RenameSheet
        sheet={sheet}
        onClose={closeSheet}
        targetContact={targetContact}
        allContacts={contacts}
        renameVal={renameVal}
        onRenameChange={setRenameVal}
        onSave={handleRenameSave}
      />
      <ClosureSheet
        sheet={sheet}
        onClose={closeSheet}
        targetContact={targetContact}
        allContacts={contacts}
        onConfirm={confirmClosure}
      />
      <DeleteSheet
        sheet={sheet}
        onClose={closeSheet}
        targetContact={targetContact}
        allContacts={contacts}
        onConfirm={confirmDeleteMessages}
      />
      <DeleteConversationSheet
        visible={sheet === 'deleteConversation'}
        onClose={closeSheet}
        name={targetContact?.name ?? ''}
        onConfirm={() => {
          if (!targetId) return;
          void deleteContact(targetId);
          closeSheet();
        }}
      />
      <AutoDeleteConfirmSheet
        visible={autoDeleteConfirmOpen}
        days={data?.settings.autoDeleteDays ?? 30}
        onClose={() => finishAutoDeleteReconfirm(false)}
        onConfirm={() => finishAutoDeleteReconfirm(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    minHeight: 44,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.xs,
  },
  caption: {
    ...typography.caption,
    paddingHorizontal: spacing.screen,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  list: { flex: 1, paddingHorizontal: spacing.section },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
    padding: spacing.xl,
    borderRadius: 20,
    minHeight: 44,
  },
  rowPressed: { backgroundColor: colors.surface1 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  time: { ...typography.captionSmall, marginLeft: 'auto' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  closureBadge: {
    ...typography.badge,
    color: colors.closure,
    backgroundColor: colors.closureSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  preview: { ...typography.preview, flex: 1 },
  menuBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.section,
    gap: spacing.xl,
  },
  emptyTile: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: typography.chatIntro.fontFamily,
    fontSize: 28,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.preview,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  fabWrap: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: 34,
  },
  fab: { borderRadius: 999 },
});
