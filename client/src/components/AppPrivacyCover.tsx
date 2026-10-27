import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Wordmark } from '@/components/Wordmark';
import { colors } from '@/theme';

/** Shown when the app is inactive/background so the switcher snapshot hides content. */
export function AppPrivacyCover({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.cover} pointerEvents="none">
      <Wordmark />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
});
