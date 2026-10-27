import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { legalCopy } from '@/copy/legal';
import { spacing, typography } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function WithdrawConsentSheet({ visible, onClose, onConfirm }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={typography.sheetTitle}>{legalCopy.withdrawTitle}</Text>
      <Text style={styles.body}>{legalCopy.withdrawBody}</Text>
      <PrimaryButton
        label={legalCopy.withdrawConfirm}
        variant="danger"
        onPress={onConfirm}
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
