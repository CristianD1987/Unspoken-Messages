import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Delete, Fingerprint } from 'lucide-react-native';
import { colors, typography } from '@/theme';

interface KeypadProps {
  onNumberPress: (number: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  showBiometric?: boolean;
  disabled?: boolean;
}

export function Keypad({
  onNumberPress,
  onDelete,
  onBiometric,
  showBiometric = false,
  disabled = false,
}: KeypadProps) {
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <View style={styles.container}>
      {numbers.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((number) => (
            <TouchableOpacity
              key={number}
              style={styles.button}
              onPress={() => onNumberPress(number)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={typography.keypadDigit}>{number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {showBiometric ? (
          <TouchableOpacity
            style={[styles.button, styles.transparent]}
            onPress={onBiometric}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Fingerprint size={26} color={colors.accent} strokeWidth={1.6} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.button, styles.transparent]} />
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={() => onNumberPress('0')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={typography.keypadDigit}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.transparent]}
          onPress={onDelete}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Delete size={22} color={colors.textMuted} strokeWidth={1.6} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const KEY = 76;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    gap: 28,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  button: {
    width: KEY,
    height: KEY,
    borderRadius: KEY / 2,
    backgroundColor: colors.surface1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
});
