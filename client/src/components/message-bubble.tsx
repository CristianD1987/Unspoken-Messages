import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import type { Message } from '../types';
import { colors, fonts, radii, typography } from '@/theme';

interface MessageBubbleProps {
  message: Message;
  onLongPress?: () => void;
  disabled?: boolean;
}

export function MessageBubble({ message, onLongPress, disabled }: MessageBubbleProps) {
  const timeStr = format(new Date(message.timestamp), 'HH:mm');

  return (
    <View style={styles.container}>
      <Pressable
        onLongPress={disabled ? undefined : onLongPress}
        delayLongPress={320}
        style={styles.bubble}
      >
        <Text style={typography.bubble}>{message.content}</Text>
        <Text style={styles.note}>(This message was released. It was not sent.)</Text>
      </Pressable>
      <Text style={styles.timestamp}>{timeStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginBottom: 14,
  },
  bubble: {
    backgroundColor: colors.bubble,
    borderTopLeftRadius: radii.bubble.topLeft,
    borderTopRightRadius: radii.bubble.topRight,
    borderBottomRightRadius: radii.bubble.bottomRight,
    borderBottomLeftRadius: radii.bubble.bottomLeft,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textFaint,
    marginTop: 6,
  },
  timestamp: {
    ...typography.captionSmall,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
});
