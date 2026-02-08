import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { tokens } from "../../lib/tokens";
import { useProjects } from "../../hooks/useProjects";
import { ProjectCard } from "../../components/projects/ProjectCard";
import { MicFAB } from "../../components/ui/MicFAB";
import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { ErrorScreen } from "../../components/ui/ErrorScreen";
import { EmptyScreen } from "../../components/ui/EmptyScreen";
import { VoiceRecordingOverlay } from "../../components/voice/VoiceRecordingOverlay";
import type { Project, ProjectStatus } from "../../types/api";

type FilterOption = "all" | ProjectStatus;

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: "All", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

// Estimated card height for getItemLayout (card + margin)
const CARD_HEIGHT = 120;

export default function ProjectsScreen() {
  const { data: projects, isLoading, error, refetch } = useProjects();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterOption>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return [];
    const sorted = [...projects].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (filter === "all") return sorted;
    return sorted.filter((p) => p.status === filter);
  }, [projects, filter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    setRefreshing(false);
  }, [queryClient]);

  const handleProjectPress = useCallback((project: Project) => {
    router.push({ pathname: "/project/[id]", params: { id: project.id } });
  }, []);

  const handleMicPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVoiceModalVisible(true);
  }, []);

  const renderProject = useCallback(
    ({ item, index }: { item: Project; index: number }) => (
      <ProjectCard
        project={item}
        index={index}
        onPress={() => handleProjectPress(item)}
      />
    ),
    [handleProjectPress],
  );

  const keyExtractor = useCallback((item: Project) => item.id, []);

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error.message} onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text
          style={styles.title}
          accessibilityRole="header"
        >
          Projects
        </Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f.value);
            }}
            style={[
              styles.filterChip,
              filter === f.value && styles.filterChipActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.value }}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f.value && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {filteredProjects.length === 0 && !isLoading ? (
        <EmptyScreen
          title="No projects yet"
          description="Tap the microphone to create your first project"
          icon="folder-open-outline"
        />
      ) : (
        <FlatList
          data={filteredProjects}
          renderItem={renderProject}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.accent}
              colors={[tokens.accent]}
              progressBackgroundColor={tokens.bgPrimary}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          accessibilityLabel="Pull to refresh projects"
        />
      )}

      <MicFAB
        onPress={handleMicPress}
        isRecording={false}
        accessibilityLabel="Create project with voice"
        accessibilityHint="Double tap to start recording a voice project brief"
      />

      <VoiceRecordingOverlay
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bgPrimary,
  },
  header: {
    paddingHorizontal: tokens.space4,
    paddingTop: tokens.space4,
  },
  title: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.text2xl,
    color: tokens.textPrimary,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: tokens.space4,
    paddingTop: tokens.space4,
    paddingBottom: tokens.space3,
    gap: tokens.space2,
  },
  filterChip: {
    paddingVertical: tokens.space1,
    paddingHorizontal: tokens.space3,
    borderRadius: tokens.radiusFull,
    backgroundColor: tokens.bgCardHover,
  },
  filterChipActive: {
    backgroundColor: tokens.accentHover,
  },
  filterChipText: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textXs,
    color: tokens.textSecondary,
  },
  filterChipTextActive: {
    color: tokens.textPrimary,
  },
  list: {
    paddingHorizontal: tokens.space4,
    paddingTop: tokens.space2,
    paddingBottom: tokens.space12,
  },
});
