import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radii, spacing, typography } from '@/theme';

type ActionsProps = {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function MessageActionsSheet({ visible, onClose, onEdit, onDelete }: ActionsProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.group}>
        <Pressable style={styles.row} onPress={onEdit}>
          <Pencil size={20} color={colors.accent} strokeWidth={1.6} />
          <Text style={[styles.rowText, { color: colors.accent }]}>Edit message</Text>
        </Pressable>
      </View>
      <View style={[styles.group, { marginTop: spacing.xl }]}>
        <Pressable style={styles.row} onPress={onDelete}>
          <Trash2 size={20} color={colors.danger} strokeWidth={1.6} />
          <Text style={[styles.rowText, { color: colors.danger }]}>Delete message</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

type EditProps = {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
};

export function EditMessageSheet({ visible, onClose, value, onChange, onSave }: EditProps) {
  const ok = value.trim().length > 0;
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={typography.sheetTitle}>Edit message</Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChange}
        multiline
        placeholderTextColor={colors.textFaint}
        autoFocus
      />
      <PrimaryButton label="Save" onPress={onSave} disabled={!ok} />
    </BottomSheet>
  );
}

type DeleteOneProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteMessageSheet({ visible, onClose, onConfirm }: DeleteOneProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={typography.sheetTitle}>Delete this message?</Text>
      <Text style={styles.body}>This can't be undone.</Text>
      <PrimaryButton label="Delete message" variant="danger" onPress={onConfirm} />
    </BottomSheet>
  );
}

type DeleteConvoProps = {
  visible: boolean;
  onClose: () => void;
  name: string;
  onConfirm: () => void;
};

export function DeleteConversationSheet({ visible, onClose, name, onConfirm }: DeleteConvoProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={typography.sheetTitle}>Delete conversation?</Text>
      <Text style={styles.body}>
        Everything with {name} will be removed from this device. This can't be undone.
      </Text>
      <PrimaryButton label="Delete conversation" variant="danger" onPress={onConfirm} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface2,
    borderRadius: radii.sheetRowGroup,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },
  rowText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 16,
  },
  textInput: {
    minHeight: 52,
    backgroundColor: colors.bg,
    borderRadius: radii.input,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  body: {
    ...typography.preview,
    lineHeight: 20,
  },
});
