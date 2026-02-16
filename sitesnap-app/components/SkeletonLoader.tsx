/**
 * SkeletonLoader Component
 * Shimmer loading placeholders for job cards and photo grids.
 * Design spec: Section 6.4
 */
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import { colors, spacing, radii } from "@/lib/tokens";
import { THUMBNAIL_SIZE } from "./PhotoThumbnail";

interface SkeletonBarProps {
   width: string | number;
   height: number;
}

function SkeletonBar({ width, height }: SkeletonBarProps) {
   const shimmerAnim = useRef(new Animated.Value(0)).current;

   useEffect(() => {
      Animated.loop(
         Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
         }),
      ).start();
   }, [shimmerAnim]);

   const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-200, 200],
   });

   return (
      <View
         style={[
            styles.bar,
            {
               width,
               height,
            },
         ]}
      >
         <Animated.View
            style={[
               styles.shimmerOverlay,
               { transform: [{ translateX }] },
            ]}
         />
      </View>
   );
}

/** Skeleton for a single job card */
export function SkeletonJobCard() {
   return (
      <View
         style={styles.card}
         accessibilityRole="none"
         accessibilityLabel="Loading"
      >
         <SkeletonBar width="60%" height={14} />
         <View style={{ height: spacing.space2 }} />
         <SkeletonBar width="40%" height={10} />
      </View>
   );
}

/** Skeleton for the job list (4 skeleton cards) */
export function SkeletonJobList() {
   return (
      <View>
         {[1, 2, 3, 4].map((i) => (
            <SkeletonJobCard key={i} />
         ))}
      </View>
   );
}

/** Skeleton for a single photo thumbnail */
export function SkeletonThumbnail() {
   const shimmerAnim = useRef(new Animated.Value(0)).current;

   useEffect(() => {
      Animated.loop(
         Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
         }),
      ).start();
   }, [shimmerAnim]);

   const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-THUMBNAIL_SIZE, THUMBNAIL_SIZE],
   });

   return (
      <View style={styles.thumbnail}>
         <Animated.View
            style={[
               styles.shimmerOverlay,
               { transform: [{ translateX }] },
            ]}
         />
      </View>
   );
}

/** Skeleton grid for photo loading (6 items, 2 rows of 3) */
export function SkeletonPhotoGrid() {
   return (
      <View style={styles.grid}>
         {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonThumbnail key={i} />
         ))}
      </View>
   );
}

const styles = StyleSheet.create({
   card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.space4,
      marginBottom: spacing.space3,
   },
   bar: {
      backgroundColor: colors.bgCard,
      borderRadius: radii.sm,
      overflow: "hidden",
   },
   shimmerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.05)",
      width: 200,
   },
   thumbnail: {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      borderRadius: radii.md,
      backgroundColor: colors.bgCard,
      overflow: "hidden",
   },
   grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.space1,
      paddingHorizontal: spacing.space4,
   },
});
