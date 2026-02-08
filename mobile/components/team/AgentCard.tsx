import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { tokens } from "../../lib/tokens";
import type { Agent } from "../../lib/agents";

interface AgentCardProps {
  agent: Agent;
  onPress: () => void;
  cardWidth: number;
}

export const AgentCard = React.memo(function AgentCard({
  agent,
  onPress,
  cardWidth,
}: AgentCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${agent.name}, ${agent.role}`}
      accessibilityHint="Double tap to see more about this agent"
    >
      <Image
        source={agent.avatar}
        style={styles.avatar}
        contentFit="cover"
        transition={200}
      />
      <Text style={styles.name} numberOfLines={1}>
        {agent.name}
      </Text>
      <Text style={styles.role} numberOfLines={2}>
        {agent.role}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bgCard,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusLg,
    padding: tokens.space4,
    alignItems: "center",
  },
  pressed: {
    backgroundColor: tokens.bgCardHover,
    transform: [{ scale: 0.97 }],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  name: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textBase,
    color: tokens.textPrimary,
    marginTop: tokens.space3,
    textAlign: "center",
  },
  role: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textXs,
    color: tokens.textSecondary,
    marginTop: tokens.space1,
    textAlign: "center",
  },
});
