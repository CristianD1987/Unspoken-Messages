import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Coffee } from 'lucide-react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, radii, spacing, typography } from '@/theme';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageCount: number;
}

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const handleDonate = () => {
    Linking.openURL('https://buymeacoffee.com/unspokendonations');
    onClose();
  };

  return (
    <BottomSheet visible={isOpen} onClose={onClose}>
      <View style={styles.tile}>
        <Coffee size={28} color={colors.accent} strokeWidth={1.6} />
      </View>
      <Text style={styles.title}>Unspoken helped you?</Text>
      <Text style={styles.body}>
        If this space brought you peace or clarity, consider supporting us.
      </Text>
      <PrimaryButton
        label="Support Unspoken"
        onPress={handleDonate}
        icon={<Coffee size={18} color={colors.accentInk} strokeWidth={1.6} />}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 72,
    height: 72,
    borderRadius: radii.emptyTile,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    ...typography.cardTitle,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  body: {
    ...typography.preview,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.md,
  },
});
