import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Coffee,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../types/navigation';
import { useAppData } from '@/hooks/use-storage';
import { storage } from '@/lib/storage';
import { useAppToast } from '@/components/AppToast';
import { Toggle } from '@/components/Toggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ExportBackupSheet, ImportBackupSheet } from '@/components/sheets/BackupSheets';
import { AutoDeleteConfirmSheet } from '@/components/sheets/AutoDeleteConfirmSheet';
import { CrisisSupportSheet } from '@/components/sheets/CrisisSupportSheet';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import { seedLegacyAppData } from '@/lib/devLegacySeed';
import { colors, fonts, hairline, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsPage({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { data, updateSettings, reloadData } = useAppData();
  const { showToast } = useAppToast();

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devTapCount, setDevTapCount] = useState(0);
  const [autoDeleteConfirmOpen, setAutoDeleteConfirmOpen] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);

  useHardwareBack(
    useCallback(() => {
      if (exportOpen) {
        setExportOpen(false);
        return true;
      }
      if (importOpen) {
        setImportOpen(false);
        setPendingFile(null);
        setImportError('');
        return true;
      }
      return false;
    }, [exportOpen, importOpen])
  );

  const startImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });
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
      showToast('Import failed');
    }
  };

  const runExport = async (password: string) => {
    setBusy(true);
    try {
      const exportedData = await storage.exportDataWithPassword(password);
      const fileUri = FileSystem.cacheDirectory + 'unspoken-backup.txt';
      await FileSystem.writeAsStringAsync(fileUri, exportedData, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Export Unspoken Backup',
        UTI: 'public.text',
      });
      setExportOpen(false);
      showToast('Backup file exported');
    } catch {
      showToast('Export failed');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (password: string) => {
    if (!pendingFile) return;
    setBusy(true);
    setImportError('');
    try {
      await storage.importDataWithPassword(pendingFile, password);
      await reloadData();
      setImportOpen(false);
      setPendingFile(null);
      showToast('Data imported');
    } catch {
      setImportError('Wrong password. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const onDevSeedPress = async () => {
    if (!__DEV__) return;
    const next = devTapCount + 1;
    setDevTapCount(next);
    if (next >= 5) {
      setDevTapCount(0);
      await seedLegacyAppData();
      await reloadData();
      showToast('Legacy dev seed written');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : spacing.md }]}>
        <Pressable style={styles.back} onPress={() => navigation.navigate('Home')}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={1.8} />
        </Pressable>
        <Text style={[typography.screenTitle, styles.screenTitle]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Biometric authentication</Text>
              <Text style={styles.rowSub}>Use fingerprint or Face ID</Text>
            </View>
            <Toggle
              variant="settings"
              value={!!data?.settings.biometricEnabled}
              onValueChange={(v) => updateSettings({ biometricEnabled: v })}
            />
          </View>
          <View style={[hairline, styles.cardHairline]} />
          <View style={styles.rowBetween}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Auto-delete messages</Text>
              <Text style={styles.rowSub}>
                Remove messages after {data?.settings.autoDeleteDays ?? 30} days
              </Text>
            </View>
            <Toggle
              variant="settings"
              value={!!data?.settings.autoDeleteEnabled}
              onValueChange={(v) => {
                if (v) {
                  setAutoDeleteConfirmOpen(true);
                } else {
                  updateSettings({ autoDeleteEnabled: false, autoDeleteNeedsReconfirm: false });
                }
              }}
            />
          </View>
          <View style={[hairline, styles.cardHairline]} />
          <Pressable
            style={styles.linkRow}
            onPress={() => navigation.navigate('Lock', { mode: 'change' })}
          >
            <Text style={styles.linkText}>Change PIN</Text>
            <ChevronRight size={18} color={colors.textFaint} strokeWidth={1.6} />
          </Pressable>
        </View>

        {__DEV__ ? (
          <Pressable onPress={onDevSeedPress}>
            <Text style={styles.sectionLabel}>YOUR DATA</Text>
          </Pressable>
        ) : (
          <Text style={styles.sectionLabel}>YOUR DATA</Text>
        )}
        <Text style={styles.dataCaption}>
          Backups are the only way to move your conversations to a new phone.
        </Text>
        <View style={styles.grid}>
          <Pressable style={styles.tile} onPress={() => setExportOpen(true)}>
            <Download size={22} color={colors.accent} strokeWidth={1.6} />
            <Text style={styles.tileText}>Export data</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={startImport}>
            <Upload size={22} color={colors.accent} strokeWidth={1.6} />
            <Text style={styles.tileText}>Import data</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Text style={typography.cardTitle}>Therapeutic benefits</Text>
          <Text style={styles.aboutBody}>
            Everything you write stays encrypted on this device. Unspoken does not collect or send
            your data. Unspoken offers a safe space for emotional expression, helping you process thoughts and
            feelings through therapeutic writing. Messages remain private, supporting your mental
            wellness journey without pressure or judgment.
          </Text>
          <View style={[hairline, styles.cardHairline]} />
          <Pressable style={styles.linkRow} onPress={() => setCrisisOpen(true)}>
            <Text style={styles.linkText}>Need support right now?</Text>
            <ChevronRight size={18} color={colors.textFaint} strokeWidth={1.6} />
          </Pressable>
          <View style={[hairline, styles.cardHairline]} />
          <Pressable style={styles.linkRow} onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.linkText}>Terms & Privacy</Text>
            <ChevronRight size={18} color={colors.textFaint} strokeWidth={1.6} />
          </Pressable>
        </View>

        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Support & development</Text>
          <Text style={styles.supportBody}>
            If you find Unspoken helpful, consider supporting its development. Your feedback and
            support help us grow!
          </Text>
          <PrimaryButton
            label="Support Unspoken"
            onPress={() => Linking.openURL('https://buymeacoffee.com/unspokendonations')}
            icon={<Coffee size={18} color={colors.accentInk} strokeWidth={1.6} />}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </ScrollView>

      <CrisisSupportSheet visible={crisisOpen} onClose={() => setCrisisOpen(false)} />

      <ExportBackupSheet
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={runExport}
        loading={busy}
      />
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
      <AutoDeleteConfirmSheet
        visible={autoDeleteConfirmOpen}
        days={data?.settings.autoDeleteDays ?? 30}
        onClose={() => {
          updateSettings({ autoDeleteEnabled: false, autoDeleteNeedsReconfirm: false });
          setAutoDeleteConfirmOpen(false);
        }}
        onConfirm={() => {
          updateSettings({ autoDeleteEnabled: true, autoDeleteNeedsReconfirm: false });
          setAutoDeleteConfirmOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: -4,
  },
  screenTitle: {
    marginTop: spacing.xs,
  },
  scroll: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 40,
    gap: spacing.xl,
  },
  sectionLabel: {
    ...typography.sectionLabel,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dataCaption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textFaint,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.card,
    padding: spacing.xxxxl,
  },
  cardHairline: { marginVertical: spacing.xl },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  rowInfo: { flex: 1 },
  rowTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.text,
  },
  rowSub: {
    ...typography.caption,
    marginTop: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  linkText: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radii.card,
    padding: spacing.xxxxl,
    gap: spacing.xl,
    minHeight: 100,
  },
  tileText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.text,
  },
  aboutBody: {
    ...typography.preview,
    lineHeight: 21,
    marginTop: spacing.xl,
  },
  supportCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.card,
    padding: spacing.xxxxl,
    marginTop: spacing.md,
  },
  supportTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.text,
  },
  supportBody: {
    ...typography.preview,
    lineHeight: 21,
    marginTop: spacing.md,
  },
});
