import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as LocalAuthentication from 'expo-local-authentication';
import { RootStackParamList } from '../types/navigation';
import { Keypad } from '@/components/keypad';
import { PinDots } from '@/components/pin-dots';
import { Wordmark } from '@/components/Wordmark';
import { Toggle } from '@/components/Toggle';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { useAppData } from '@/hooks/use-storage';
import { useAppToast } from '@/components/AppToast';
import { colors, fonts, spacing, typography } from '@/theme';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import { ForgotPinSheet } from '@/components/sheets/ForgotPinSheet';
import { navigateAfterUnlock } from '@/lib/navigateAfterUnlock';

type Props = NativeStackScreenProps<RootStackParamList, 'Lock'>;
type LockMode = 'create' | 'confirm' | 'enter';

const COPY: Record<LockMode, [string, string]> = {
  create: ['Create your PIN', 'Choose a 4-digit code to secure your app'],
  confirm: ['Confirm your PIN', 'Enter the same code once more'],
  enter: ['Welcome back', 'Enter your PIN to continue'],
};

export default function LockPage({ navigation, route }: Props) {
  const changingPin = route.params?.mode === 'change';
  const initialMode: LockMode =
    route.params?.mode === 'enter' ? 'enter' : 'create';

  const [lockMode, setLockMode] = useState<LockMode>(initialMode);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [biometricDraft, setBiometricDraft] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [wiping, setWiping] = useState(false);

  const { data, updateSettings } = useAppData();
  const { showToast } = useAppToast();

  useEffect(() => {
    if (route.params?.mode === 'enter') setLockMode('enter');
    else if (route.params?.mode === 'change') setLockMode('create');
    else if (route.params?.mode === 'create') setLockMode('create');
  }, [route.params?.mode]);

  const [title, subtitleDefault] = COPY[lockMode];
  const subtitle = error || subtitleDefault;
  const subtitleColor = error ? colors.danger : colors.textMuted;

  const completePin = useCallback(
    async (fullPin: string) => {
      if (lockMode === 'create') {
        setFirstPin(fullPin);
        setPin('');
        setLockMode('confirm');
        return;
      }
      if (lockMode === 'confirm') {
        if (fullPin !== firstPin) {
          setError("PINs didn't match. Try again.");
          setPin('');
          setFirstPin('');
          setLockMode('create');
          return;
        }
        setProcessing(true);
        try {
          await auth.setPin(fullPin);
          if (!changingPin && biometricDraft) {
            updateSettings({ biometricEnabled: true });
          }
          if (changingPin) {
            auth.unlockSession();
            navigation.replace('Settings');
            showToast('PIN updated');
          } else {
            auth.unlockSession();
            void navigateAfterUnlock(navigation);
          }
        } catch {
          setError("PINs didn't match. Try again.");
          setPin('');
        } finally {
          setProcessing(false);
        }
        return;
      }
      setProcessing(true);
      try {
        const ok = await auth.authenticate(fullPin);
        if (ok) {
          await storage.runAutoDeleteMaintenance();
          void navigateAfterUnlock(navigation);
        } else {
          setError('Wrong PIN. Try again.');
          setPin('');
        }
      } finally {
        setProcessing(false);
      }
    },
    [lockMode, firstPin, changingPin, biometricDraft, navigation, showToast, updateSettings]
  );

  const pressDigit = (d: string) => {
    if (processing || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 4) {
      setTimeout(() => completePin(next), 200);
    }
  };

  const handleBiometricUnlock = async () => {
    if (processing || lockMode !== 'enter') return;
    if (!data?.settings.biometricEnabled) return;
    setProcessing(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) throw new Error('unavailable');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Unspoken',
        fallbackLabel: 'Use PIN instead',
      });
      if (result.success) {
        auth.unlockSession();
        await storage.runAutoDeleteMaintenance();
        void navigateAfterUnlock(navigation);
      }
    } catch {
      showToast('Biometric authentication failed');
    } finally {
      setProcessing(false);
    }
  };

  useHardwareBack(
    useCallback(() => {
      if (forgotOpen) {
        setForgotOpen(false);
        return true;
      }
      if (changingPin) return false;
      if (lockMode === 'enter') return true;
      return false;
    }, [changingPin, lockMode, forgotOpen])
  );

  const showBioKey = lockMode === 'enter' && !!data?.settings.biometricEnabled;
  const showBioSetup = lockMode !== 'enter' && !changingPin;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Wordmark />
        {changingPin ? (
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={12}
            style={styles.cancelTop}
          >
            <Text style={styles.cancelTopText}>Cancel</Text>
          </Pressable>
        ) : (
          <View style={styles.cancelTop} />
        )}
      </View>

      <View style={styles.centerBlock}>
        <Text style={typography.lockTitle}>{title}</Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
        <View style={styles.dotsWrap}>
          <PinDots length={4} filled={pin.length} error={!!error} />
        </View>
      </View>

      <View style={styles.bottom}>
        <Keypad
          onNumberPress={pressDigit}
          onDelete={() => !processing && pin.length > 0 && setPin(pin.slice(0, -1))}
          showBiometric={showBioKey}
          onBiometric={handleBiometricUnlock}
          disabled={processing}
        />
        {showBioSetup ? (
          <View style={styles.bioCard}>
            <Text style={styles.bioLabel}>Enable biometric authentication</Text>
            <Toggle value={biometricDraft} onValueChange={setBiometricDraft} variant="compact" />
          </View>
        ) : null}
        {lockMode === 'enter' && !changingPin ? (
          <Pressable
            style={styles.forgotBtn}
            onPress={() => setForgotOpen(true)}
            disabled={processing}
          >
            <Text style={styles.forgotText}>Forgot PIN?</Text>
          </Pressable>
        ) : null}
      </View>

      <ForgotPinSheet
        visible={forgotOpen}
        onClose={() => setForgotOpen(false)}
        loading={wiping}
        onConfirm={async () => {
          setWiping(true);
          try {
            await storage.wipeDeviceAndRestart();
            setForgotOpen(false);
            navigation.reset({ index: 0, routes: [{ name: 'Intro' }] });
          } finally {
            setWiping(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.section,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.section,
    minHeight: 44,
  },
  cancelTop: {
    minWidth: 60,
    alignItems: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelTopText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 64,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.section,
  },
  dotsWrap: {
    marginTop: 38,
  },
  bottom: {
    paddingBottom: 34,
    gap: spacing.section,
  },
  bioCard: {
    backgroundColor: colors.surface1,
    borderRadius: 18,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  bioLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
    marginRight: spacing.xl,
  },
  forgotBtn: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  forgotText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
  },
});
