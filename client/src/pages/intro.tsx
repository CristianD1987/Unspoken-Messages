import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageCircle } from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { Wordmark } from '@/components/Wordmark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { storage } from '@/lib/storage';
import { colors, fonts, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Intro'>;

export default function IntroPage({ navigation }: Props) {
  const handleAcceptTerms = async () => {
    await storage.setTermsAccepted();
    navigation.replace('Onboarding');
  };

  const handleViewTerms = () => {
    navigation.navigate('Terms');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Wordmark />
      </View>

      <View style={styles.center}>
        <View style={styles.tile}>
          <MessageCircle size={32} color={colors.accent} strokeWidth={1.6} />
        </View>
        <Text style={styles.title}>Unspoken</Text>
        <Text style={styles.subtitle}>A therapeutic space for your thoughts</Text>
        <Text style={styles.body}>
          Express your deepest thoughts in a secure, private environment designed for emotional healing.
        </Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Accept Terms & Continue" onPress={handleAcceptTerms} />
        <Pressable onPress={handleViewTerms} style={styles.linkBtn}>
          <Text style={styles.linkText}>View Terms & Privacy</Text>
        </Pressable>
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
    paddingTop: spacing.section,
    minHeight: 44,
    justifyContent: 'center',
  },
  center: {
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
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.screenTitle,
    fontSize: 36,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 34,
    gap: spacing.xl,
  },
  linkBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
