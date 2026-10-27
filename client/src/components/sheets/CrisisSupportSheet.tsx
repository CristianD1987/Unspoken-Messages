import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { colors, fonts, spacing } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CrisisSupportSheet({ visible, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Need support right now?</Text>
      <Text style={styles.body}>
        If you're in crisis or thinking about harming yourself, please contact your local emergency
        number (112 in the EU) or a crisis helpline in your country.
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansMedium,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    paddingBottom: spacing.xl,
  },
});
