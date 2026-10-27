import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts, radii, shadows } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'accent' | 'closure' | 'danger' | 'surface';
  style?: ViewStyle;
  textStyle?: TextStyle;
  height?: number;
  icon?: React.ReactNode;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'accent',
  style,
  textStyle,
  height = 54,
  icon,
}: Props) {
  const bg =
    variant === 'accent'
      ? disabled
        ? colors.disabledCreate
        : colors.accent
      : variant === 'closure'
        ? colors.closure
        : variant === 'danger'
          ? colors.danger
          : colors.surface2;

  const textColor =
    variant === 'accent'
      ? colors.accentInk
      : variant === 'closure'
        ? colors.closureInk
        : variant === 'danger'
          ? colors.dangerInk
          : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { height, backgroundColor: bg, opacity: pressed ? 0.92 : 1 },
        variant === 'accent' && !disabled ? shadows.primaryFloating : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: textColor }, textStyle]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
});
