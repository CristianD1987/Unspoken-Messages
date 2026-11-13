import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Heart } from 'lucide-react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTipJar } from '@/components/TipJarProvider';
import { colors, radii, spacing, typography } from '@/theme';

interface TipJarSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TipJarSheet({ isOpen, onClose }: TipJarSheetProps) {
  const { available, loading, tips, status, purchase, resetStatus } = useTipJar();
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // Never show an empty sheet: if the store has nothing to offer, close quietly.
  useEffect(() => {
    if (isOpen && !loading && !available) onClose();
  }, [isOpen, loading, available, onClose]);

  const handleClose = () => {
    setSelectedSku(null);
    resetStatus();
    onClose();
  };

  const purchasing = status === 'purchasing';

  return (
    <BottomSheet visible={isOpen && (loading || available)} onClose={handleClose}>
      <View style={styles.tile}>
        <Heart size={28} color={colors.accent} strokeWidth={1.6} />
      </View>

      {status === 'thanks' ? (
        <>
          <Text style={styles.title}>Thank you</Text>
          <Text style={styles.body}>
            Your tip means a lot and helps keep Unspoken free and private.
          </Text>
          <PrimaryButton label="Close" onPress={handleClose} variant="surface" />
        </>
      ) : (
        <>
          <Text style={styles.title}>Leave a tip</Text>
          <Text style={styles.body}>
            Unspoken is free. If it helped you, you can leave an optional tip. Tips are a one-time
            thank-you and don't unlock anything.
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : (
            <View style={styles.list}>
              {tips.map((tip) => (
                <PrimaryButton
                  key={tip.id}
                  label={`${tip.displayName || tip.title} · ${tip.displayPrice}`}
                  onPress={() => {
                    setSelectedSku(tip.id);
                    purchase(tip.id);
                  }}
                  disabled={purchasing}
                  loading={purchasing && selectedSku === tip.id}
                />
              ))}
            </View>
          )}

          {status === 'error' ? (
            <Text style={styles.error}>
              The purchase couldn't be completed. Please try again later.
            </Text>
          ) : null}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 72,
    height: 72,
    borderRadius: radii.emptyTile,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    ...typography.cardTitle,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  body: {
    ...typography.preview,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  error: {
    ...typography.preview,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
