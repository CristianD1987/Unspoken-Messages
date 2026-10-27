import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AlertCircle, ChevronLeft } from 'lucide-react-native';
import { useAppData } from '@/hooks/use-storage';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LegalMarkdown } from '@/components/LegalMarkdown';
import {
  TERMS_OF_USE_MARKDOWN,
  PRIVACY_POLICY_MARKDOWN,
} from '@/content/legalDocuments';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import { colors, fonts, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;
type LegalTab = 'terms' | 'privacy';

const LEGAL_PADDING = 24;

export default function TermsPage({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { updateSettings } = useAppData();
  const requireAccept = route.params?.requireAccept === true;
  const [tab, setTab] = useState<LegalTab>('terms');

  const handleWithdrawConsent = () => {
    updateSettings({ onboardingCompleted: false });
    auth.logout();
    navigation.replace('Lock', { mode: 'enter' });
  };

  useHardwareBack(useCallback(() => requireAccept, [requireAccept]));

  const handleAccept = async () => {
    await storage.setTermsAccepted();
    if (requireAccept) {
      navigation.replace('Home');
    } else {
      navigation.goBack();
    }
  };

  const markdown = tab === 'terms' ? TERMS_OF_USE_MARKDOWN : PRIVACY_POLICY_MARKDOWN;
  const lastUpdatedLine =
    tab === 'terms'
      ? 'Last updated: October 27, 2026'
      : 'Last updated: October 27, 2026';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: LEGAL_PADDING }]}>
        {!requireAccept ? (
          <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={typography.screenTitle}>Terms & Privacy</Text>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'terms' && styles.tabActive]}
            onPress={() => setTab('terms')}
          >
            <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>
              Terms of Use
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'privacy' && styles.tabActive]}
            onPress={() => setTab('privacy')}
          >
            <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>
              Privacy Policy
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: LEGAL_PADDING,
            paddingBottom: insets.bottom + (requireAccept ? 120 : 80),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>{lastUpdatedLine}</Text>
        <LegalMarkdown markdown={markdown} />
        {tab === 'terms' ? (
          <Text style={styles.disclaimer}>
            By using Unspoken, you confirm that you have read, understood, and agree to these Terms
            of Use and our Privacy Policy.
          </Text>
        ) : null}

        {!requireAccept ? (
          <Pressable style={styles.withdrawRow} onPress={handleWithdrawConsent}>
            <AlertCircle size={20} color={colors.danger} strokeWidth={1.6} />
            <Text style={styles.withdrawText}>Withdraw Consent</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {requireAccept ? (
        <View
          style={[
            styles.acceptBar,
            { paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: LEGAL_PADDING },
          ]}
        >
          <PrimaryButton label="Accept & Continue" onPress={handleAccept} />
          <Pressable style={styles.withdrawRow} onPress={handleWithdrawConsent}>
            <AlertCircle size={20} color={colors.danger} strokeWidth={1.6} />
            <Text style={styles.withdrawText}>Withdraw Consent</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: -4,
    marginBottom: spacing.sm,
  },
  backPlaceholder: { height: spacing.sm },
  tabs: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textFaint,
  },
  tabTextActive: {
    color: colors.text,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: spacing.md,
  },
  lastUpdated: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textFaint,
    marginBottom: spacing.xl,
  },
  disclaimer: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
  withdrawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 44,
    marginTop: spacing.xl,
  },
  withdrawText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.danger,
  },
  acceptBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
