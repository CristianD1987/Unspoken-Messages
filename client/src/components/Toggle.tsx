import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme';

type Variant = 'compact' | 'settings';

const sizes: Record<Variant, { width: number; height: number; knob: number }> = {
  compact: { width: 46, height: 28, knob: 22 },
  settings: { width: 50, height: 30, knob: 24 },
};

type Props = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Toggle({
  value,
  onValueChange,
  variant = 'compact',
  disabled,
  style,
}: Props) {
  const { width, height, knob } = sizes[variant];
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.disabledSend, colors.accent],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, width - knob - 2],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[{ width, height }, style]}
    >
      <Animated.View
        style={[
          styles.track,
          {
            width,
            height,
            borderRadius: height / 2,
            backgroundColor: trackColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
  },
  knob: {
    backgroundColor: colors.text,
    position: 'absolute',
    top: 2,
  },
});
