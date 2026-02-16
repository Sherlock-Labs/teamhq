/**
 * TypeBadge Component
 * Color-coded classification badge for photo thumbnails and viewers.
 * Design spec: Section 5.1
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { photoTypeBadgeColors, radii, typography } from "@/lib/tokens";
import { PHOTO_TYPE_LABELS } from "@/lib/constants";
import type { PhotoType } from "@/lib/types";

interface TypeBadgeProps {
   type: PhotoType;
   size?: "small" | "default";
}

export const TypeBadge = React.memo(function TypeBadge({
   type,
   size = "default",
}: TypeBadgeProps) {
   const badgeColors = photoTypeBadgeColors[type];
   const label = PHOTO_TYPE_LABELS[type];

   return (
      <View
         style={[
            styles.badge,
            { backgroundColor: badgeColors.bg },
            size === "small" && styles.badgeSmall,
         ]}
         accessibilityRole="text"
         accessibilityLabel={`Photo type: ${type}`}
      >
         <Text
            style={[
               styles.badgeText,
               { color: badgeColors.text },
               size === "small" && styles.badgeTextSmall,
            ]}
         >
            {label}
         </Text>
      </View>
   );
});

const styles = StyleSheet.create({
   badge: {
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: radii.sm,
      alignSelf: "flex-start",
   },
   badgeSmall: {
      paddingVertical: 2,
      paddingHorizontal: 4,
   },
   badgeText: {
      fontSize: typography.overline.fontSize,
      fontWeight: typography.overline.fontWeight,
      letterSpacing: typography.overline.letterSpacing,
      textTransform: "uppercase",
   },
   badgeTextSmall: {
      fontSize: 10,
   },
});
