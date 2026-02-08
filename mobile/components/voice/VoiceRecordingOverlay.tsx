import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { tokens } from "../../lib/tokens";
import { formatDuration } from "../../lib/time";
import { useVoiceRecording } from "../../hooks/useVoiceRecording";
import { useVoiceExtraction } from "../../hooks/useVoiceExtraction";
import { useCreateProject } from "../../hooks/useCreateProject";
import { useStartSession } from "../../hooks/useStartSession";
import { TranscriptView } from "./TranscriptView";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { Button } from "../ui/Button";
import type { VoiceOverlayState } from "../../types/voice";

interface VoiceRecordingOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export function VoiceRecordingOverlay({
  visible,
  onClose,
}: VoiceRecordingOverlayProps) {
  const [state, setState] = useState<VoiceOverlayState>("recording");
  const [projectName, setProjectName] = useState("");
  const [editableTranscript, setEditableTranscript] = useState("");
  const [creationError, setCreationError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const voice = useVoiceRecording();
  const extraction = useVoiceExtraction();
  const createProject = useCreateProject();
  // useStartSession needs a projectId but we don't know it yet during creation,
  // so we'll call the mutation directly with a dynamic hook
  const startSession = useStartSession(createdProjectId ?? "");

  // Start recording when the modal opens
  useEffect(() => {
    if (visible) {
      setState("recording");
      setProjectName("");
      setEditableTranscript("");
      setCreationError(null);
      setCreatedProjectId(null);

      startRecordingFlow();
    }

    return () => {
      voice.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const startRecordingFlow = async () => {
    try {
      // TODO: Check microphone permission first
      // If denied, setState("permission-denied")
      await voice.startRecording();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start recording";
      if (msg.includes("permission")) {
        setState("permission-denied");
      } else {
        voice.reset();
        setState("error");
      }
    }
  };

  // When recording stops, transition to review state
  const handleStop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    voice.stopRecording();

    const transcript = voice.transcript;
    setEditableTranscript(transcript);
    setState("review");

    // Fire extraction in background
    if (transcript.trim()) {
      extraction.mutate(transcript);
    }
  }, [voice, extraction]);

  // Auto-fill project name when extraction completes
  useEffect(() => {
    if (extraction.data && !projectName) {
      setProjectName(extraction.data.name);
    }
  }, [extraction.data, projectName]);

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    voice.reset();
    onClose();
  };

  const handleRerecord = () => {
    voice.reset();
    setProjectName("");
    setEditableTranscript("");
    setState("recording");
    startRecordingFlow();
  };

  const handleCreateAndGo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState("creating");
    setCreationError(null);

    try {
      const extractedData = extraction.data;
      const payload = {
        name: projectName.trim() || extractedData?.name || "Untitled Project",
        description: extractedData?.description ?? "",
        brief: editableTranscript,
        goals: extractedData?.goals ?? "",
        constraints: extractedData?.constraints ?? "",
      };

      const project = await createProject.mutateAsync(payload);
      setCreatedProjectId(project.id);

      // Start session
      try {
        await startSession.mutateAsync();
      } catch {
        // Project created but session failed -- still navigate
        console.warn("Session start failed, project created successfully");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      router.push({ pathname: "/project/[id]", params: { id: project.id } });
    } catch (err) {
      setState("review");
      setCreationError(
        err instanceof Error
          ? err.message
          : "Couldn't create the project. Check your connection and try again.",
      );
    }
  };

  const handleSaveDraft = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState("creating");
    setCreationError(null);

    try {
      const extractedData = extraction.data;
      const payload = {
        name: projectName.trim() || extractedData?.name || "Untitled Project",
        description: extractedData?.description ?? "",
        brief: editableTranscript,
        goals: extractedData?.goals ?? "",
        constraints: extractedData?.constraints ?? "",
      };

      const project = await createProject.mutateAsync(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      router.push({ pathname: "/project/[id]", params: { id: project.id } });
    } catch (err) {
      setState("review");
      setCreationError(
        err instanceof Error
          ? err.message
          : "Couldn't create the project. Check your connection and try again.",
      );
    }
  };

  const renderContent = () => {
    switch (state) {
      case "recording":
        return renderRecording();
      case "review":
        return renderReview();
      case "creating":
        return renderCreating();
      case "error":
        return renderError();
      case "permission-denied":
        return renderPermissionDenied();
    }
  };

  const renderRecording = () => (
    <View style={styles.recordingContainer}>
      <View style={styles.topBar}>
        <View />
        <Pressable onPress={handleCancel} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.recordingContent}>
        <WaveformVisualizer
          audioLevel={voice.audioLevel}
          isActive={voice.isRecording}
        />

        <Text style={styles.durationText}>
          {formatDuration(voice.duration)}
        </Text>

        {voice.error && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.inlineError}>
            <Ionicons name="alert-circle" size={20} color={tokens.statusFailed} />
            <Text style={styles.inlineErrorText}>
              Transcription unavailable. You can still record -- add text manually after.
            </Text>
          </Animated.View>
        )}

        <TranscriptView text={voice.transcript} isLive />
      </View>

      <View style={styles.stopSection}>
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [
            styles.stopButton,
            pressed && styles.stopButtonPressed,
          ]}
          accessibilityLabel="Stop recording"
          accessibilityHint="Double tap to stop recording and review your transcript"
        >
          <Ionicons name="stop" size={28} color="#ffffff" />
        </Pressable>
        <Text style={styles.stopLabel}>Stop</Text>
      </View>
    </View>
  );

  const renderReview = () => (
    <KeyboardAvoidingView
      style={styles.reviewContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topBar}>
        <Pressable onPress={handleRerecord} hitSlop={12}>
          <Text style={styles.cancelText}>Re-record</Text>
        </Pressable>
        <Pressable onPress={handleCancel} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.reviewScroll}
        keyboardShouldPersistTaps="handled"
      >
        {creationError && (
          <Animated.View entering={FadeInUp.duration(200)} style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{creationError}</Text>
            <Pressable onPress={() => setCreationError(null)}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          </Animated.View>
        )}

        <Text style={styles.fieldLabel}>Project Name</Text>
        {extraction.isPending && (
          <View style={styles.extractingRow}>
            <Text style={styles.extractingText}>Generating...</Text>
          </View>
        )}
        <TextInput
          style={styles.nameInput}
          value={projectName}
          onChangeText={setProjectName}
          placeholder={
            extraction.isPending ? "Generating name..." : "Enter a project name"
          }
          placeholderTextColor={tokens.textMuted}
          cursorColor={tokens.accent}
          selectionColor="rgba(129, 140, 248, 0.3)"
        />

        <Text style={[styles.fieldLabel, { marginTop: tokens.space4 }]}>
          Transcript
        </Text>
        <TextInput
          style={styles.transcriptInput}
          value={editableTranscript}
          onChangeText={setEditableTranscript}
          placeholder="Enter your project brief..."
          placeholderTextColor={tokens.textMuted}
          multiline
          textAlignVertical="top"
          cursorColor={tokens.accent}
          selectionColor="rgba(129, 140, 248, 0.3)"
        />
      </ScrollView>

      <View style={styles.reviewButtons}>
        <Button
          label="Create & Go"
          onPress={handleCreateAndGo}
          loading={state === "creating"}
          disabled={!editableTranscript.trim()}
          fullWidth
          icon={<Ionicons name="play" size={16} color="#ffffff" />}
        />
        <View style={{ height: tokens.space3 }} />
        <Button
          label="Save Draft"
          onPress={handleSaveDraft}
          variant="secondary"
          disabled={!editableTranscript.trim()}
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );

  const renderCreating = () => (
    <View style={styles.creatingContainer}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.creatingContent}>
        <Text style={styles.creatingText}>Creating...</Text>
      </Animated.View>
    </View>
  );

  const renderError = () => (
    <View style={styles.centeredContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={tokens.statusFailed} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>
        {voice.error || "An unexpected error occurred. Please try again."}
      </Text>
      <View style={{ marginTop: tokens.space6 }}>
        <Button label="Try Again" onPress={handleRerecord} />
      </View>
      <Pressable onPress={handleCancel} style={{ marginTop: tokens.space3 }}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );

  const renderPermissionDenied = () => (
    <View style={styles.centeredContainer}>
      <Ionicons name="mic-off-outline" size={48} color={tokens.textMuted} />
      <Text style={styles.errorTitle}>Microphone Access Needed</Text>
      <Text style={styles.errorSubtitle}>
        TeamHQ needs microphone access to transcribe your voice. You can enable
        it in Settings.
      </Text>
      <View style={{ marginTop: tokens.space6 }}>
        <Button
          label="Open Settings"
          onPress={() => Linking.openSettings()}
        />
      </View>
      <View style={{ marginTop: tokens.space3 }}>
        <Button
          label="Enter Text Instead"
          variant="secondary"
          onPress={() => {
            setState("review");
          }}
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>{renderContent()}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(9, 9, 11, 0.98)",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space4,
    paddingTop: tokens.space12,
    paddingBottom: tokens.space2,
  },
  cancelText: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.accent,
  },

  // Recording state
  recordingContainer: {
    flex: 1,
  },
  recordingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: tokens.space12,
  },
  durationText: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textLg,
    color: tokens.textMuted,
    marginTop: tokens.space4,
    marginBottom: tokens.space8,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.bgCard,
    borderWidth: 1,
    borderColor: tokens.statusFailed,
    borderRadius: tokens.radiusMd,
    padding: tokens.space3,
    marginHorizontal: tokens.space4,
    marginBottom: tokens.space4,
    gap: tokens.space2,
  },
  inlineErrorText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    flex: 1,
  },
  stopSection: {
    alignItems: "center",
    paddingBottom: tokens.space12,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.statusFailed,
    alignItems: "center",
    justifyContent: "center",
  },
  stopButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.9 }],
  },
  stopLabel: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textXs,
    color: tokens.textMuted,
    marginTop: tokens.space2,
  },

  // Review state
  reviewContainer: {
    flex: 1,
  },
  reviewScroll: {
    flex: 1,
    paddingHorizontal: tokens.space4,
  },
  fieldLabel: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.textMuted,
    marginBottom: tokens.space2,
  },
  extractingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: tokens.space1,
  },
  extractingText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textXs,
    color: tokens.accent,
    fontStyle: "italic",
  },
  nameInput: {
    backgroundColor: tokens.bgCard,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusMd,
    paddingHorizontal: tokens.space3,
    paddingVertical: tokens.space3,
    fontFamily: "Inter-Medium",
    fontSize: tokens.textBase,
    color: tokens.textPrimary,
  },
  transcriptInput: {
    backgroundColor: tokens.bgCard,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusMd,
    padding: tokens.space3,
    fontFamily: "Inter-Regular",
    fontSize: tokens.textBase,
    color: tokens.textPrimary,
    lineHeight: tokens.textBase * 1.625,
    minHeight: 120,
    maxHeight: 300,
  },
  reviewButtons: {
    paddingHorizontal: tokens.space4,
    paddingBottom: tokens.space12,
    paddingTop: tokens.space4,
  },

  // Error banner
  errorBanner: {
    backgroundColor: tokens.bgCard,
    borderLeftWidth: 4,
    borderLeftColor: tokens.statusFailed,
    borderRadius: tokens.radiusMd,
    padding: tokens.space3,
    marginBottom: tokens.space4,
  },
  errorBannerText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.statusFailed,
  },
  dismissText: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.accent,
    marginTop: tokens.space2,
  },

  // Creating state
  creatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  creatingContent: {
    alignItems: "center",
  },
  creatingText: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textLg,
    color: tokens.textSecondary,
    marginTop: tokens.space4,
  },

  // Centered states (error, permission denied)
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space8,
  },
  errorTitle: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textLg,
    color: tokens.textPrimary,
    marginTop: tokens.space4,
    textAlign: "center",
  },
  errorSubtitle: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    marginTop: tokens.space2,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: tokens.textSm * 1.5,
  },
});
