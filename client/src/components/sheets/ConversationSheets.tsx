import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import {
  Pencil,
  Image as ImageIcon,
  Trash2,
  Smartphone,
  Palette,
  XCircle,
} from 'lucide-react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Avatar } from '@/components/Avatar';
import { EncryptedAvatar } from '@/components/EncryptedAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { HeartCheckIcon } from '@/components/HeartCheckIcon';
import { colors, hairline, radii, spacing, typography } from '@/theme';
import type { Contact } from '@/types';
import { getContactColorIndex } from '@/lib/avatar';

export type SheetType =
  | 'new'
  | 'contacts'
  | 'options'
  | 'rename'
  | 'closure'
  | 'delete'
  | 'deleteConversation'
  | null;

type BaseProps = {
  sheet: SheetType;
  onClose: () => void;
  targetContact: Contact | null;
  allContacts: Contact[];
};

type NewProps = BaseProps & {
  newName: string;
  onNewNameChange: (v: string) => void;
  onCreate: () => void;
  onOpenContacts: () => void;
};

export function NewConversationSheet({
  sheet,
  onClose,
  newName,
  onNewNameChange,
  onCreate,
  onOpenContacts,
}: NewProps) {
  const canCreate = newName.trim().length > 0;
  return (
    <BottomSheet visible={sheet === 'new'} onClose={onClose}>
      <Text style={typography.sheetTitle}>Who is this for?</Text>
      <View style={styles.nameRow}>
        <TextInput
          value={newName}
          onChangeText={onNewNameChange}
          placeholder="Name"
          placeholderTextColor={colors.textFaint}
          style={styles.nameInput}
          returnKeyType="done"
          onSubmitEditing={() => canCreate && onCreate()}
        />
        <Pressable
          onPress={onCreate}
          disabled={!canCreate}
          style={[styles.createChip, { backgroundColor: canCreate ? colors.accent : colors.disabledCreate }]}
        >
          <Text style={[styles.createChipText, { color: colors.accentInk }]}>Create</Text>
        </Pressable>
      </View>
      <View style={styles.orRow}>
        <View style={hairline} />
        <Text style={styles.orText}>or</Text>
        <View style={hairline} />
      </View>
      <Pressable style={styles.surfaceBtn} onPress={onOpenContacts}>
        <Smartphone size={18} color={colors.text} strokeWidth={1.6} />
        <Text style={styles.surfaceBtnText}>Access phone contacts</Text>
      </Pressable>
    </BottomSheet>
  );
}

type ContactsProps = {
  sheet: SheetType;
  onClose: () => void;
  onPick: (name: string) => void;
};

export function PhoneContactsSheet({ sheet, onClose, onPick }: ContactsProps) {
  const [items, setItems] = useState<{ name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (sheet !== 'contacts') return;
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setItems([]);
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name],
        sort: Contacts.SortTypes.FirstName,
      });
      setItems(
        data
          .filter((c) => c.name)
          .map((c) => ({ name: c.name! }))
          .slice(0, 200)
      );
    })();
  }, [sheet]);

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <BottomSheet visible={sheet === 'contacts'} onClose={onClose}>
      <Text style={typography.sheetTitle}>Phone contacts</Text>
      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search contacts..."
        placeholderTextColor={colors.textFaint}
        style={styles.nameInputFull}
      />
      <ScrollView style={styles.contactsScroll} keyboardShouldPersistTaps="handled">
        {filtered.map((item, i) => (
          <Pressable key={`${item.name}-${i}`} style={styles.contactRow} onPress={() => onPick(item.name)}>
            <Avatar name={item.name} colorIndex={i} size={40} />
            <Text style={typography.rowName}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

type OptionsProps = BaseProps & {
  isClosed: boolean;
  hasPhoto?: boolean;
  onRename: () => void;
  onChangePicture: () => void;
  onRemovePicture?: () => void;
  onChangeAvatarColor?: () => void;
  onClosureAction: () => void;
  onDelete: () => void;
  onDeleteConversation: () => void;
};

export function OptionsSheet({
  sheet,
  onClose,
  targetContact,
  allContacts,
  isClosed,
  onRename,
  onChangePicture,
  onRemovePicture,
  onChangeAvatarColor,
  onClosureAction,
  onDelete,
  onDeleteConversation,
  hasPhoto,
}: OptionsProps) {
  if (!targetContact) return null;
  const colorIndex = getContactColorIndex(targetContact, allContacts);

  return (
    <BottomSheet visible={sheet === 'options'} onClose={onClose}>
      <View style={styles.optionsHeader}>
        <EncryptedAvatar
          name={targetContact.name}
          colorIndex={colorIndex}
          avatarFile={targetContact.avatarFile}
          size={44}
        />
        <Text style={[typography.sheetTitle, { flex: 1 }]}>{targetContact.name}</Text>
      </View>
      <View style={styles.rowGroup}>
        <SheetRow icon={<Pencil size={20} color={colors.text} strokeWidth={1.6} />} label="Rename" onPress={onRename} />
        <View style={[hairline, styles.indentedHairline]} />
        <SheetRow
          icon={<ImageIcon size={20} color={colors.text} strokeWidth={1.6} />}
          label="Change picture"
          onPress={onChangePicture}
        />
        {hasPhoto && onRemovePicture ? (
          <>
            <View style={[hairline, styles.indentedHairline]} />
            <SheetRow
              icon={<XCircle size={20} color={colors.text} strokeWidth={1.6} />}
              label="Remove picture"
              onPress={onRemovePicture}
            />
          </>
        ) : null}
        {onChangeAvatarColor ? (
          <>
            <View style={[hairline, styles.indentedHairline]} />
            <SheetRow
              icon={<Palette size={20} color={colors.text} strokeWidth={1.6} />}
              label="Change avatar color"
              onPress={onChangeAvatarColor}
            />
          </>
        ) : null}
        {!isClosed ? (
          <>
            <View style={[hairline, styles.indentedHairline]} />
            <SheetRow
              icon={<HeartCheckIcon size={20} />}
              label="Closure"
              labelColor={colors.closure}
              onPress={onClosureAction}
            />
          </>
        ) : null}
      </View>
      <View style={[styles.rowGroup, { marginTop: spacing.xl }]}>
        <SheetRow
          icon={<Trash2 size={20} color={colors.danger} strokeWidth={1.6} />}
          label="Delete all messages"
          labelColor={colors.danger}
          onPress={onDelete}
        />
        <View style={[hairline, styles.indentedHairline]} />
        <SheetRow
          icon={<Trash2 size={20} color={colors.danger} strokeWidth={1.6} />}
          label="Delete conversation"
          labelColor={colors.danger}
          onPress={onDeleteConversation}
        />
      </View>
    </BottomSheet>
  );
}

function SheetRow({
  icon,
  label,
  onPress,
  labelColor = colors.text,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  labelColor?: string;
}) {
  return (
    <Pressable style={styles.sheetRow} onPress={onPress}>
      <View style={styles.sheetRowIcon}>{icon}</View>
      <Text style={[typography.bodyMedium, { color: labelColor, fontSize: 16 }]}>{label}</Text>
    </Pressable>
  );
}

type RenameProps = BaseProps & {
  renameVal: string;
  onRenameChange: (v: string) => void;
  onSave: () => void;
};

export function RenameSheet({
  sheet,
  onClose,
  renameVal,
  onRenameChange,
  onSave,
}: RenameProps) {
  const ok = renameVal.trim().length > 0;
  return (
    <BottomSheet visible={sheet === 'rename'} onClose={onClose}>
      <Text style={typography.sheetTitle}>Rename</Text>
      <TextInput
        value={renameVal}
        onChangeText={onRenameChange}
        style={styles.nameInputFull}
        placeholderTextColor={colors.textFaint}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => ok && onSave()}
      />
      <PrimaryButton label="Save" onPress={onSave} disabled={!ok} />
    </BottomSheet>
  );
}

type ClosureProps = BaseProps & {
  onConfirm: () => void;
};

export function ClosureSheet({ sheet, onClose, targetContact, onConfirm }: ClosureProps) {
  if (!targetContact) return null;
  return (
    <BottomSheet visible={sheet === 'closure'} onClose={onClose}>
      <View style={styles.closureIconTile}>
        <HeartCheckIcon size={28} />
      </View>
      <Text style={typography.sheetTitle}>Find closure with {targetContact.name}?</Text>
      <Text style={[typography.preview, { lineHeight: 21 }]}>
        Your words stay saved here, but this conversation will be closed for good. This is permanent
        and can't be undone. You can always start a new conversation with {targetContact.name}{' '}
        later.
      </Text>
      <PrimaryButton label="Mark closure" variant="closure" onPress={onConfirm} />
    </BottomSheet>
  );
}

type DeleteProps = BaseProps & {
  onConfirm: () => void;
};

export function DeleteSheet({ sheet, onClose, targetContact, onConfirm }: DeleteProps) {
  if (!targetContact) return null;
  return (
    <BottomSheet visible={sheet === 'delete'} onClose={onClose}>
      <Text style={typography.sheetTitle}>Delete all messages?</Text>
      <Text style={[typography.preview, { lineHeight: 20 }]}>
        Everything you wrote to {targetContact.name} will be erased from this device. This can't be undone.
      </Text>
      <PrimaryButton label="Delete messages" variant="danger" onPress={onConfirm} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    height: 52,
    backgroundColor: colors.bg,
    borderRadius: radii.input,
    paddingHorizontal: spacing.xl,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameInputFull: {
    height: 52,
    backgroundColor: colors.bg,
    borderRadius: radii.input,
    paddingHorizontal: spacing.xl,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createChip: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  createChipText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    fontWeight: '500',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  orText: {
    ...typography.caption,
  },
  surfaceBtn: {
    height: 52,
    backgroundColor: colors.surface2,
    borderRadius: radii.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  surfaceBtnText: {
    ...typography.bodyMedium,
  },
  contactsScroll: {
    maxHeight: 360,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: radii.sheetRowGroup,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  rowGroup: {
    backgroundColor: colors.surface2,
    borderRadius: radii.sheetRowGroup,
    overflow: 'hidden',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  sheetRowIcon: {
    width: 28,
    alignItems: 'center',
  },
  indentedHairline: {
    marginLeft: 52,
  },
  closureIconTile: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.closureSoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
