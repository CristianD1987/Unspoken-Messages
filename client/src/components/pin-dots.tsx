import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/theme';

interface PinDotsProps {
  length: number;
  filled: number;
  error?: boolean;
  style?: object;
}

export function PinDots({ length, filled, error, style }: PinDotsProps) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length }, (_, index) => (
        <PinDot key={index} active={index < filled} error={error && index >= filled} />
      ))}
    </View>
  );
}

function PinDot({ active, error }: { active: boolean; error?: boolean }) {
  const scale = useRef(new Animated.Value(active ? 1 : 1)).current;

  useEffect(() => {
    if (active) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [active, scale]);

  const borderColor = active
    ? colors.accent
    : error
      ? colors.danger
      : colors.pinDotEmpty;

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          borderColor,
          backgroundColor: active ? colors.accent : 'transparent',
          transform: [{ scale }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1.5,
  },
});
