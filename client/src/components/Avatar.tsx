import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle, StyleProp } from 'react-native';
import { avatarColors, colors, fonts } from '@/theme';

type Props = {
  name: string;
  colorIndex: number;
  imageUri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function Avatar({ name, colorIndex, imageUri, size = 52, style, imageStyle }: Props) {
  const bg = avatarColors[colorIndex % avatarColors.length];
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const fontSize = size * 0.38;

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
          imageStyle,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface2,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.serifMedium,
    color: colors.accentInk,
  },
});
