import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../../lib/tokens";
import type { ProjectStatus } from "../../types/api";

interface BadgeProps {
  status: ProjectStatus;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; bg: string }
> = {
  planned: {
    label: "Planned",
    color: tokens.statusPlanned,
    bg: "rgba(129, 140, 248, 0.1)",
  },
  "in-progress": {
    label: "In Progress",
    color: tokens.statusInProgress,
    bg: "rgba(250, 204, 21, 0.1)",
  },
  completed: {
    label: "Completed",
    color: tokens.statusCompleted,
    bg: "rgba(74, 222, 128, 0.1)",
  },
};

export function Badge({ status }: BadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.space1,
    paddingHorizontal: tokens.space2,
    borderRadius: tokens.radiusFull,
    gap: tokens.space2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textXs,
  },
});
