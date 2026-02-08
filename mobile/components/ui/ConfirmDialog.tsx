import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp, FadeOut } from "react-native-reanimated";
import { tokens } from "../../lib/tokens";
import { Button } from "./Button";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <Animated.View
          entering={FadeInUp.springify()}
          style={styles.dialog}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Button label={confirmLabel} onPress={onConfirm} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dialog: {
    backgroundColor: tokens.bgCard,
    borderRadius: tokens.radiusXl,
    padding: tokens.space6,
    width: "85%",
    maxWidth: 320,
  },
  title: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.textLg,
    color: tokens.textPrimary,
    textAlign: "center",
  },
  message: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    textAlign: "center",
    marginTop: tokens.space3,
    lineHeight: tokens.textSm * 1.5,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: tokens.space6,
  },
  cancelButton: {
    paddingVertical: tokens.space3,
    paddingHorizontal: tokens.space4,
  },
  cancelText: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.textMuted,
  },
});
