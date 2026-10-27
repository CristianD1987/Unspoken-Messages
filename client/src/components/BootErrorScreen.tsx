import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, spacing, typography } from '@/theme';

type Props = {
  onRetry: () => void;
};

export function BootErrorScreen({ onRetry }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Something went wrong while opening Unspoken.</Text>
        <PrimaryButton label="Try again" onPress={onRetry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.screen,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.section,
  },
  title: {
    ...typography.preview,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
