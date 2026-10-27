import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { spacing, typography } from '@/theme';

type Props = {
  visible: boolean;
  days: number;
  onClose: () => void;
  onConfirm: () => void;
};

export function AutoDeleteConfirmSheet({ visible, days, onClose, onConfirm }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={typography.sheetTitle}>Auto-delete is now active</Text>
      <Text style={styles.body}>
        Messages older than {days} days will be permanently erased from this device. Turn it on?
      </Text>
      <PrimaryButton label="Turn on" onPress={onConfirm} />
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
