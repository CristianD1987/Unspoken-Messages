import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, radii, spacing, typography } from '@/theme';

export const BACKUP_MIN_PASSWORD = 8;

type ExportProps = {
  visible: boolean;
  onClose: () => void;
  onExport: (password: string) => Promise<void>;
  loading?: boolean;
};

export function ExportBackupSheet({ visible, onClose, onExport, loading }: ExportProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setPassword('');
    setConfirm('');
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const canSubmit =
    password.length >= BACKUP_MIN_PASSWORD &&
    password === confirm &&
    !loading;

  const submit = async () => {
    if (password.length < BACKUP_MIN_PASSWORD) {
      setError(`Use at least ${BACKUP_MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    await onExport(password);
    reset();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <Text style={typography.sheetTitle}>Protect your backup</Text>
      <Text style={styles.hint}>Choose a password to encrypt your export file.</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.textFaint}
      />
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="Confirm password"
        placeholderTextColor={colors.textFaint}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Export"
        onPress={submit}
        disabled={!canSubmit}
        loading={loading}
      />
    </BottomSheet>
  );
}

type ImportProps = {
  visible: boolean;
  onClose: () => void;
  onImport: (password: string) => Promise<void>;
  loading?: boolean;
  error?: string;
};

export function ImportBackupSheet({
  visible,
  onClose,
  onImport,
  loading,
  error,
}: ImportProps) {
  const [password, setPassword] = useState('');

  const close = () => {
    setPassword('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <Text style={typography.sheetTitle}>Enter backup password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.textFaint}
        autoFocus
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Import"
        onPress={() => onImport(password)}
        disabled={!password || loading}
        loading={loading}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.preview,
    lineHeight: 20,
  },
  input: {
    height: 52,
    backgroundColor: colors.bg,
    borderRadius: radii.input,
    paddingHorizontal: spacing.xl,
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.danger,
  },
});
