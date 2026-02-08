import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { tokens } from "../../lib/tokens";
import type { Project } from "../../types/api";
import { formatRelativeTime } from "../../lib/time";

interface ProjectCardProps {
  project: Project;
  index: number;
  onPress: () => void;
}

export const ProjectCard = memo(function ProjectCard({
  project,
  index,
  onPress,
}: ProjectCardProps) {
  const hasActiveSession = !!project.activeSessionId;

  return (
    <Animated.View entering={FadeInUp.delay(index * 30).springify().damping(20)}>
      <Card
        onPress={onPress}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${project.name}, ${project.status.replace("-", " ")}, updated ${formatRelativeTime(project.updatedAt)}`}
      >
        <View style={styles.titleRow}>
          {hasActiveSession && <ActiveSessionDot />}
          <Text style={styles.name} numberOfLines={1}>
            {project.name}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Badge status={project.status} />
          <Text style={styles.timestamp}>
            {formatRelativeTime(project.updatedAt)}
          </Text>
        </View>

        {project.brief ? (
          <Text style={styles.brief} numberOfLines={2}>
            {project.brief}
          </Text>
        ) : null}
      </Card>
    </Animated.View>
  );
});

function ActiveSessionDot() {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.activeDot, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: tokens.space3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.statusCompleted,
    marginRight: tokens.space2,
  },
  name: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textBase,
    color: tokens.textPrimary,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: tokens.space2,
  },
  timestamp: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textXs,
    color: tokens.textMuted,
  },
  brief: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    marginTop: tokens.space3,
    lineHeight: tokens.textSm * 1.5,
  },
});
