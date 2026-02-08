import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { tokens } from "../../lib/tokens";

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={tokens.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
