import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { colors, typography } from '@/theme';

export function Wordmark() {
  return (
    <View style={styles.row}>
      <Lock size={15} color={colors.accent} strokeWidth={1.6} />
      <Text style={typography.wordmark}>Unspoken</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
