import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  useReducedMotion,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../../lib/tokens";
import { springs } from "../../lib/animation";

interface MicFABProps {
  onPress: () => void;
  isRecording: boolean;
  audioLevel?: number; // 0-1, for pulse intensity when recording
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function MicFAB({
  onPress,
  isRecording,
  audioLevel = 0,
  accessibilityLabel: customLabel,
  accessibilityHint: customHint,
}: MicFABProps) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }

    // Cancel any existing animation before starting new one
    cancelAnimation(scale);

    if (isRecording) {
      // Recording pulse — more energetic, faster
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
      );
    } else {
      // Idle breathing — subtle, inviting
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 2000 }),
          withTiming(1, { duration: 2000 }),
        ),
        -1,
      );
    }

    return () => {
      cancelAnimation(scale);
    };
  }, [scale, reducedMotion, isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          if (!reducedMotion) {
            scale.value = withSpring(0.9, springs.snappy);
          }
        }}
        onPressOut={() => {
          if (!reducedMotion) {
            scale.value = withSpring(1, springs.snappy);
          }
        }}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={customLabel ?? "Create project with voice"}
        accessibilityHint={customHint ?? "Double tap to start recording a voice project brief"}
      >
        <Ionicons name="mic" size={24} color="#ffffff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: tokens.space4,
    right: tokens.space4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.accentHover,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabPressed: {
    opacity: 0.9,
  },
});
