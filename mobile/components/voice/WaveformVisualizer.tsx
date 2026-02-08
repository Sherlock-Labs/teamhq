import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";
import { tokens } from "../../lib/tokens";
import { springs } from "../../lib/animation";

interface WaveformVisualizerProps {
  audioLevel: number; // 0-1, updated per audio chunk
  isActive: boolean;
}

const BAR_COUNT = 40;
const BAR_WIDTH = 4;
const BAR_GAP = 4;
const MAX_HEIGHT = 80;
const MIN_HEIGHT = 4;
const TOTAL_WIDTH = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP;

export function WaveformVisualizer({
  audioLevel,
  isActive,
}: WaveformVisualizerProps) {
  return (
    <View
      style={styles.container}
      accessibilityLabel="Audio waveform visualization"
      accessibilityRole="image"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <WaveformBar
          key={i}
          index={i}
          audioLevel={audioLevel}
          isActive={isActive}
        />
      ))}
    </View>
  );
}

function WaveformBar({
  index,
  audioLevel,
  isActive,
}: {
  index: number;
  audioLevel: number;
  isActive: boolean;
}) {
  const height = useSharedValue(MIN_HEIGHT);
  const reducedMotion = useReducedMotion();

  // Stable per-bar random seed for organic variation
  const seed = useMemo(() => 0.3 + Math.random() * 0.7, []);

  useEffect(() => {
    if (!isActive) {
      if (reducedMotion) {
        height.value = MIN_HEIGHT;
      } else {
        height.value = withSpring(MIN_HEIGHT, springs.snappy);
      }
      return;
    }

    // Center bars get more height, edges get less — creates a natural waveform shape
    const center = BAR_COUNT / 2;
    const distFromCenter = Math.abs(index - center) / center;
    const levelFactor = audioLevel * (1 - distFromCenter * 0.6) * seed;
    const targetHeight = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * levelFactor;

    if (reducedMotion) {
      height.value = targetHeight;
    } else {
      height.value = withSpring(targetHeight, springs.snappy);
    }
  }, [audioLevel, isActive, index, height, seed, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: isActive
            ? tokens.waveformActive
            : tokens.waveformIdle,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    width: TOTAL_WIDTH,
    height: MAX_HEIGHT,
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
    borderTopLeftRadius: tokens.radiusFull,
    borderTopRightRadius: tokens.radiusFull,
    minHeight: MIN_HEIGHT,
  },
});
