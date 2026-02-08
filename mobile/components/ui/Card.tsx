import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle, AccessibilityRole } from "react-native";
import { tokens } from "../../lib/tokens";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}

export function Card({
  children,
  onPress,
  style,
  accessibilityRole,
  accessibilityLabel,
}: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          style,
        ]}
        accessibilityRole={accessibilityRole ?? "button"}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bgCard,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusLg,
    padding: tokens.space4,
  },
  pressed: {
    backgroundColor: tokens.bgCardHover,
    transform: [{ scale: 0.98 }],
  },
});
