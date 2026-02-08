import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  useReducedMotion,
} from "react-native-reanimated";
import { tokens } from "../../lib/tokens";

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = tokens.radiusMd,
  style,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    shimmer.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, [shimmer, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = reducedMotion
      ? 1
      : interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    return { opacity };
  });

  return (
    <View style={{ width: width as number, height, borderRadius }}>
      <Animated.View
        style={[
          styles.skeleton,
          { width: "100%", height: "100%", borderRadius },
          animatedStyle,
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: tokens.bgCardHover,
  },
});
