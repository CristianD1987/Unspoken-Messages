import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radii, spacing, typography } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  showCancel?: boolean;
};

const { height: SCREEN_H } = Dimensions.get('window');

export function BottomSheet({ visible, onClose, children, showCancel = true }: Props) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      backdrop.setValue(0);
      slide.setValue(SCREEN_H);
    }
  }, [visible, backdrop, slide]);

  const close = () => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
            <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        </Pressable>
        <Animated.View style={[styles.panel, { transform: [{ translateY: slide }] }]}>
          <View style={styles.handle} />
          <View style={styles.content}>{children}</View>
          {showCancel ? (
            <Pressable onPress={close} style={styles.cancelBtn} hitSlop={12}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backdrop,
  },
  panel: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: radii.sheetTop,
    borderTopRightRadius: radii.sheetTop,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.section,
    paddingBottom: 34,
    maxHeight: '92%',
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.surface3,
    alignSelf: 'center',
    marginBottom: spacing.xxxl,
  },
  content: {
    gap: spacing.xl,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 15,
  },
});
