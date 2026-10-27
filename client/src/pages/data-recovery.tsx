import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList } from '@/types/navigation';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ImportBackupSheet } from '@/components/sheets/BackupSheets';
import { ForgotPinSheet } from '@/components/sheets/ForgotPinSheet';
import { storage } from '@/lib/storage';
import { resolveInitialRoute, bootRouteResetRoutes } from '@/lib/bootRoute';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { useHardwareBack } from '@/hooks/useHardwareBack';

type Props = NativeStackScreenProps<RootStackParamList, 'DataRecovery'>;

export default function DataRecoveryPage({ navigation }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [startFreshOpen, setStartFreshOpen] = useState(false);
  const [wiping, setWiping] = useState(false);

  useHardwareBack(
    useCallback(() => {
      if (startFreshOpen) {
        setStartFreshOpen(false);
        return true;
      }
      if (importOpen) {
        setImportOpen(false);
        return true;
      }
      return true;
    }, [importOpen, startFreshOpen])
  );

  const pickBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      let uri: string | undefined;
      if ('assets' in result && result.assets?.length) uri = result.assets[0].uri;
      else if ('uri' in result) uri = (result as { uri: string }).uri;
      if (!uri) return;
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setPendingFile(fileContent);
      setImportError('');
      setImportOpen(true);
    } catch {
      setImportError('Could not read backup file.');
      setImportOpen(true);
    }
  };

  const runImport = async (password: string) => {
    if (!pendingFile) return;
    setBusy(true);
    setImportError('');
    try {
      await storage.importDataWithPassword(pendingFile, password);
      setImportOpen(false);
      setPendingFile(null);
      const route = await resolveInitialRoute();
      navigation.reset(bootRouteResetRoutes(route, { instantTransition: true }));
    } catch {
      setImportError('Wrong password. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.tile}>
          <Lock size={32} color={colors.accent} strokeWidth={1.6} />
        </View>
        <Text style={styles.title}>Your data can't be opened on this device</Text>
        <Text style={styles.body}>
          Unspoken keeps everything encrypted with a key that never leaves the device it was created
          on. To move your conversations, use a password-protected backup.
        </Text>
        <PrimaryButton label="Restore from backup" onPress={pickBackup} style={styles.primary} />
        <Pressable
          style={styles.dangerBtn}
          onPress={() => setStartFreshOpen(true)}
          disabled={busy || wiping}
        >
          <Text style={styles.dangerText}>Start fresh</Text>
        </Pressable>
      </View>

      <ImportBackupSheet
        visible={importOpen}
        onClose={() => {
          setImportOpen(false);
          setPendingFile(null);
          setImportError('');
        }}
        onImport={runImport}
        loading={busy}
        error={importError}
      />

      <ForgotPinSheet
        visible={startFreshOpen}
        title="Start fresh?"
        body="This will permanently erase the unreadable data on this device. You cannot undo this."
        confirmLabel="Erase and start over"
        onClose={() => setStartFreshOpen(false)}
        loading={wiping}
        onConfirm={async () => {
          setWiping(true);
          try {
            await storage.wipeDeviceAndRestart();
            setStartFreshOpen(false);
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
    paddingHorizontal: spacing.screen,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxxxl,
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: radii.card,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.sheetTitle,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...typography.preview,
    textAlign: 'center',
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: spacing.xxxxl,
  },
  primary: {
    alignSelf: 'stretch',
  },
  dangerBtn: {
    marginTop: spacing.xl,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dangerText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
  },
});
