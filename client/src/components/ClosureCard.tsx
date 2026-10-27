import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { HeartCheckIcon } from '@/components/HeartCheckIcon';
import { closureCopy } from '@/copy/closure';
import { colors, fonts, radii, spacing } from '@/theme';

type Props = {
  contactName: string;
  onStartNew: () => void;
  shouldReveal: boolean;
};

export function ClosureCard({ contactName, onStartNew, shouldReveal }: Props) {
  const opacity = useRef(new Animated.Value(shouldReveal ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(shouldReveal ? 10 : 0)).current;

  useEffect(() => {
    if (!shouldReveal) return;
    opacity.setValue(0);
    translateY.setValue(10);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shouldReveal, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.iconCircle}>
        <HeartCheckIcon size={22} />
      </View>
      <Text style={styles.title}>{closureCopy.cardTitle}</Text>
      <Text style={styles.body}>{closureCopy.cardBody}</Text>
      <Pressable style={styles.pill} onPress={onStartNew}>
        <Text style={styles.pillText}>{closureCopy.startNewConversation(contactName)}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 6,
    marginTop: spacing.xl,
    backgroundColor: 'rgba(156,203,181,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(156,203,181,0.25)',
    borderRadius: radii.card,
    padding: spacing.section,
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.closureSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  pill: {
    marginTop: spacing.xxxl,
    minHeight: 44,
    alignSelf: 'stretch',
    borderRadius: radii.pill,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  pillText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.accent,
    textAlign: 'center',
  },
});
