/**
 * PhotoThumbnail Component
 * Grid item for photo timelines and search results.
 * Supports shimmer loading, upload failed retry, and type badge overlay.
 * Design spec: Section 4.4, Section 5.5
 */
import React, { useCallback } from "react";
import {
   View,
   Text,
   Pressable,
   StyleSheet,
   Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { RotateCcw } from "lucide-react-native";
import { colors, spacing, radii, typography } from "@/lib/tokens";
import { TypeBadge } from "./TypeBadge";
import { formatTime } from "@/lib/utils";
import type { Photo, PhotoType } from "@/lib/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.space4 * 2;
const GRID_GAP = spacing.space1;
const THUMBNAIL_SIZE = (SCREEN_WIDTH - GRID_PADDING - GRID_GAP * 2) / 3;

interface PhotoThumbnailProps {
   photo: Photo;
   onPress: () => void;
   onLongPressBadge?: () => void;
   isUploading?: boolean;
   isFailed?: boolean;
   onRetry?: () => void;
   /** Used for comparison selection mode */
   selectionNumber?: number | null;
}

export const PhotoThumbnail = React.memo(function PhotoThumbnail({
   photo,
   onPress,
   onLongPressBadge,
   isUploading,
   isFailed,
   onRetry,
   selectionNumber,
}: PhotoThumbnailProps) {
   const handlePress = useCallback(() => {
      if (isFailed && onRetry) {
         onRetry();
         return;
      }
      onPress();
   }, [isFailed, onRetry, onPress]);

   return (
      <Pressable
         onPress={handlePress}
         style={({ pressed }) => [
            styles.container,
            pressed && styles.pressed,
         ]}
         accessibilityRole="image"
         accessibilityLabel={`${photo.type} photo, ${formatTime(photo.takenAt)}${photo.scene ? `, ${photo.scene}` : ""}`}
      >
         {/* Photo image or placeholder */}
         {photo.thumbnailUrl && !isUploading ? (
            <Image
               source={{ uri: photo.thumbnailUrl }}
               style={styles.image}
               contentFit="cover"
               cachePolicy="disk"
               transition={200}
            />
         ) : (
            <View style={styles.placeholder}>
               {isUploading && <View style={styles.shimmer} />}
            </View>
         )}

         {/* Failed upload overlay */}
         {isFailed && (
            <View style={styles.failedOverlay}>
               <RotateCcw size={24} color={colors.white} strokeWidth={2} />
            </View>
         )}

         {/* Selection overlay for comparison mode */}
         {selectionNumber !== null && selectionNumber !== undefined && (
            <View style={styles.selectionOverlay}>
               <View style={styles.selectionNumber}>
                  <Text style={styles.selectionNumberText}>
                     {selectionNumber}
                  </Text>
               </View>
            </View>
         )}

         {/* Type badge - bottom left */}
         {!isUploading && !isFailed && (
            <Pressable
               onLongPress={onLongPressBadge}
               style={styles.badgeContainer}
            >
               <TypeBadge type={photo.type} size="small" />
            </Pressable>
         )}

         {/* Pending badge for uploading */}
         {isUploading && (
            <View style={styles.badgeContainer}>
               <TypeBadge type="pending" size="small" />
            </View>
         )}

         {/* Failed badge */}
         {isFailed && (
            <View style={styles.badgeContainer}>
               <View style={styles.retryBadge}>
                  <Text style={styles.retryBadgeText}>RETRY</Text>
               </View>
            </View>
         )}

         {/* Timestamp - bottom right */}
         {!isFailed && (
            <View style={styles.timeContainer}>
               <Text style={styles.timeText}>
                  {formatTime(photo.takenAt)}
               </Text>
            </View>
         )}
      </Pressable>
   );
});

export { THUMBNAIL_SIZE };

const styles = StyleSheet.create({
   container: {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      borderRadius: radii.md,
      overflow: "hidden",
      backgroundColor: colors.bgCard,
   },
   pressed: {
      transform: [{ scale: 0.95 }],
   },
   image: {
      width: "100%",
      height: "100%",
   },
   placeholder: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.bgCard,
   },
   shimmer: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.bgHover,
      opacity: 0.5,
   },
   failedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
   },
   selectionOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(79, 142, 247, 0.3)",
   },
   selectionNumber: {
      position: "absolute",
      top: 6,
      left: 6,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
   },
   selectionNumberText: {
      fontSize: typography.label.fontSize,
      fontWeight: "700",
      color: colors.white,
   },
   badgeContainer: {
      position: "absolute",
      bottom: 6,
      left: 6,
   },
   retryBadge: {
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: radii.sm,
      backgroundColor: "rgba(245, 158, 11, 0.15)",
   },
   retryBadgeText: {
      fontSize: typography.overline.fontSize,
      fontWeight: typography.overline.fontWeight,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.statusWarning,
   },
   timeContainer: {
      position: "absolute",
      bottom: 6,
      right: 6,
   },
   timeText: {
      fontSize: typography.overline.fontSize,
      fontWeight: "500",
      color: colors.white,
      textShadowColor: "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
   },
});
