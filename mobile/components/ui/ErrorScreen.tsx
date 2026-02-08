import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../../lib/tokens";
import { Button } from "./Button";

interface ErrorScreenProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="cloud-offline-outline"
        size={48}
        color={tokens.statusFailed}
      />
      <Text style={styles.title}>Couldn't load projects</Text>
      <Text style={styles.subtitle}>{message}</Text>
      {onRetry && (
        <View style={styles.button}>
          <Button label="Try Again" onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bgPrimary,
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
  subtitle: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    marginTop: tokens.space2,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: tokens.textSm * 1.5,
  },
  button: {
    marginTop: tokens.space6,
  },
});
