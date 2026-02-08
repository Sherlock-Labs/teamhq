import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../../lib/tokens";

interface EmptyScreenProps {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
}

export function EmptyScreen({
  title,
  description,
  icon = "folder-open-outline",
  action,
}: EmptyScreenProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name={icon as any}
        size={48}
        color={tokens.textMuted}
      />
      <Text style={styles.title}>{title}</Text>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space8,
  },
  title: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textLg,
    color: tokens.textPrimary,
    marginTop: tokens.space4,
    textAlign: "center",
  },
  description: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    marginTop: tokens.space2,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: tokens.textSm * 1.5,
  },
});
