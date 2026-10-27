import React from 'react';
import { Avatar } from '@/components/Avatar';
import { useEncryptedAvatar } from '@/hooks/use-encrypted-avatar';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';

type Props = {
  name: string;
  colorIndex: number;
  avatarFile?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function EncryptedAvatar({
  name,
  colorIndex,
  avatarFile,
  size,
  style,
  imageStyle,
}: Props) {
  const uri = useEncryptedAvatar(avatarFile);
  return (
    <Avatar
      name={name}
      colorIndex={colorIndex}
      imageUri={uri}
      size={size}
      style={style}
      imageStyle={imageStyle}
    />
  );
}
