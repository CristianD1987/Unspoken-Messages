import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, Feather, Heart } from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { Wordmark } from '@/components/Wordmark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PinDots } from '@/components/pin-dots';
import { storage } from '@/lib/storage';
import { useAppData } from '@/hooks/use-storage';
import { colors, fonts, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const STEPS = [
  {
    title: 'Private & Secure',
    description:
      'Your messages are encrypted locally and never leave your device. Password-protected backups are the only way to move them to a new phone.',
    Icon: Lock,
    sage: false,
  },
  {
    title: 'Therapeutic Writing',
    description:
      'Write messages to symbolic contacts — express emotions without expecting responses.',
    Icon: Feather,
    sage: false,
  },
  {
    title: 'Emotional Processing',
    description:
      'Organize conversations on your device only — your words stay private and are never sent anywhere.',
    Icon: Heart,
    sage: true,
  },
] as const;

export default function OnboardingPage({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const { updateSettings } = useAppData();

  const transitionTo = (next: number) => {
    Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const finish = async () => {
    await storage.setOnboardingComplete();
    updateSettings({ onboardingCompleted: true });
    navigation.replace('Lock', { mode: 'create' });
  };

  const s = STEPS[step];
  const Icon = s.Icon;
  const tileBg = s.sage ? colors.closureSoft : colors.accentSoft;
  const iconColor = s.sage ? colors.closure : colors.accent;
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    opacity.setValue(1);
  }, [opacity]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Wordmark />
        {step > 0 ? (
          <Pressable onPress={() => transitionTo(step - 1)} hitSlop={12}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      <Text style={styles.headerTitle}>Welcome to Your Safe Space</Text>
      <Text style={styles.headerSub}>Let's set up your therapeutic journey</Text>

      <Animated.View style={[styles.page, { opacity }]}>
        <View style={[styles.tile, { backgroundColor: tileBg }]}>
          <Icon size={32} color={iconColor} strokeWidth={1.6} />
        </View>
        <Text style={styles.stepTitle}>{s.title}</Text>
        <Text style={styles.stepBody}>{s.description}</Text>
      </Animated.View>

      <View style={styles.dots}>
        <PinDots length={STEPS.length} filled={step + 1} />
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={isLast ? 'Set Up Security PIN' : 'Continue'}
          onPress={() => (isLast ? finish() : transitionTo(step + 1))}
        />
        {!isLast ? (
          <Pressable onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.screen,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.section,
    minHeight: 44,
  },
  backText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
  },
  backPlaceholder: { width: 48 },
  headerTitle: {
    ...typography.screenTitle,
    fontSize: 28,
    marginTop: spacing.xl,
  },
  headerSub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: radii.emptyTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  stepBody: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  dots: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  footer: {
    paddingBottom: 34,
    gap: spacing.md,
  },
  skipBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
  },
});
