import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "../../lib/tokens";
import { formatRelativeTime, formatDurationMs } from "../../lib/time";
import { useProject } from "../../hooks/useProject";
import { useSessions } from "../../hooks/useSessions";
import { useAddNote } from "../../hooks/useAddNote";
import { useStartSession } from "../../hooks/useStartSession";
import { NotesList } from "../../components/projects/NotesList";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { ErrorScreen } from "../../components/ui/ErrorScreen";
import type { SessionMetadata, SessionStatus } from "../../types/api";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isLoading, error, refetch } = useProject(id);
  const {
    data: sessions,
    isLoading: sessionsLoading,
  } = useSessions(id);
  const addNote = useAddNote(id);
  const startSession = useStartSession(id);
  const [showStartConfirm, setShowStartConfirm] = useState(false);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleStartSession = useCallback(async () => {
    setShowStartConfirm(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startSession.mutateAsync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [startSession]);

  if (isLoading) return <LoadingScreen />;
  if (error || !project) {
    return (
      <ErrorScreen
        message={error?.message ?? "Project not found"}
        onRetry={refetch}
      />
    );
  }

  const hasActiveSession = !!project.activeSessionId;
  const sortedSessions = sessions
    ? [...sessions].sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      )
    : [];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.navHeader}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Go back to projects"
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={tokens.accent} />
          <Text style={styles.backText}>Projects</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Edit project"
          hitSlop={12}
        >
          <Ionicons name="create-outline" size={20} color={tokens.accent} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        <Text style={styles.projectName}>{project.name}</Text>
        <View style={styles.statusRow}>
          <Badge status={project.status} />
          {hasActiveSession && <ActiveSessionDot />}
        </View>

        {project.description ? (
          <Section label="DESCRIPTION">
            <Text style={styles.bodyText}>{project.description}</Text>
          </Section>
        ) : null}

        {project.brief ? (
          <Section label="BRIEF">
            <Text style={styles.bodyText}>{project.brief}</Text>
          </Section>
        ) : null}

        {project.goals ? (
          <Section label="GOALS">
            <Text style={styles.bodyText}>{project.goals}</Text>
          </Section>
        ) : null}

        {project.constraints ? (
          <Section label="CONSTRAINTS">
            <Text style={styles.bodyText}>{project.constraints}</Text>
          </Section>
        ) : null}

        <View style={styles.section}>
          <NotesList
            notes={project.notes}
            onAddNote={(content) => addNote.mutate(content)}
            isAddingNote={addNote.isPending}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            SESSIONS ({sortedSessions.length})
          </Text>
          <View style={styles.divider} />

          {sessionsLoading && (
            <ActivityIndicator
              size="small"
              color={tokens.accent}
              style={{ marginVertical: tokens.space4 }}
            />
          )}

          {sortedSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}

          {!sessionsLoading && sortedSessions.length === 0 && (
            <Text style={styles.emptyText}>No sessions yet</Text>
          )}
        </View>

        <View style={styles.startButtonContainer}>
          <Button
            label={hasActiveSession ? "Session Running" : "Start New Session"}
            onPress={() => setShowStartConfirm(true)}
            disabled={hasActiveSession}
            loading={startSession.isPending}
            fullWidth
            icon={
              hasActiveSession ? (
                <ActiveSessionDot />
              ) : (
                <Ionicons name="play-outline" size={16} color="#ffffff" />
              )
            }
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showStartConfirm}
        title="Start Session"
        message={`Start a new session on "${project.name}"?`}
        confirmLabel="Start"
        onConfirm={handleStartSession}
        onCancel={() => setShowStartConfirm(false)}
      />
    </SafeAreaView>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.divider} />
      {children}
    </View>
  );
}

function SessionCard({ session }: { session: SessionMetadata }) {
  const statusConfig = getSessionStatusConfig(session.status);
  const isRunning = session.status === "running";
  const elapsed = session.durationMs
    ? formatDurationMs(session.durationMs)
    : isRunning
      ? `${formatDurationMs(Date.now() - new Date(session.startedAt).getTime())} elapsed`
      : "";

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionLeft}>
        {isRunning ? (
          <ActiveSessionDot />
        ) : (
          <View
            style={[styles.sessionDot, { backgroundColor: statusConfig.color }]}
          />
        )}
        <Text
          style={[styles.sessionStatus, { color: statusConfig.color }]}
        >
          {statusConfig.label}
        </Text>
      </View>
      <Text style={styles.sessionDuration}>{elapsed}</Text>
    </View>
  );
}

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

  return <Animated.View style={[styles.activeDot, animatedStyle]} />;
}

function getSessionStatusConfig(status: SessionStatus) {
  switch (status) {
    case "running":
      return { label: "Running", color: tokens.statusRunning };
    case "completed":
      return { label: "Completed", color: tokens.statusCompleted };
    case "failed":
      return { label: "Failed", color: tokens.statusFailed };
    case "stopped":
      return { label: "Stopped", color: tokens.textMuted };
    case "timed-out":
      return { label: "Timed Out", color: tokens.statusTimedOut };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bgPrimary,
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.space4,
    height: 44,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.accent,
    marginLeft: tokens.space1,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: tokens.space4,
    paddingBottom: tokens.space12,
  },
  projectName: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.text2xl,
    color: tokens.textPrimary,
    marginTop: tokens.space4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: tokens.space2,
    gap: tokens.space2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.statusRunning,
  },
  section: {
    marginTop: tokens.space6,
  },
  sectionLabel: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.textSm,
    color: tokens.textMuted,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.border,
    marginBottom: tokens.space3,
    marginTop: tokens.space2,
  },
  bodyText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    lineHeight: tokens.textSm * 1.625,
  },
  emptyText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textMuted,
    fontStyle: "italic",
  },
  sessionCard: {
    backgroundColor: tokens.bgCard,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusMd,
    padding: tokens.space3,
    marginBottom: tokens.space2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space2,
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionStatus: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
  },
  sessionDuration: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textXs,
    color: tokens.textMuted,
  },
  startButtonContainer: {
    marginTop: tokens.space6,
  },
});
