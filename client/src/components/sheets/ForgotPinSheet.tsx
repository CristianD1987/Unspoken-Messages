import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing, typography } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  body?: string;
  confirmLabel?: string;
};

export function ForgotPinSheet({
  visible,
  onClose,
  onConfirm,
  loading,
  title = 'Reset Unspoken?',
  body = "Without your PIN, your conversations can't be recovered. Everything on this device will be erased.",
  confirmLabel = 'Erase and reset',
}: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={typography.sheetTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <PrimaryButton
        label={confirmLabel}
        variant="danger"
        onPress={onConfirm}
        loading={loading}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.preview,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
});
