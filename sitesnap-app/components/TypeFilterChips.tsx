/**
 * TypeFilterChips Component
 * Horizontal scrollable row of filter chips for Job Detail and Search.
 * Design spec: Section 5.2
 */
import React, { useCallback } from "react";
import {
   View,
   Text,
   ScrollView,
   Pressable,
   StyleSheet,
} from "react-native";
import {
   colors,
   spacing,
   radii,
   typography,
   photoTypeBadgeColors,
} from "@/lib/tokens";
import { PHOTO_TYPE_FULL_LABELS } from "@/lib/constants";
import type { PhotoType } from "@/lib/types";

interface TypeCount {
   type: PhotoType;
   count: number;
}

interface TypeFilterChipsProps {
   types: TypeCount[];
   activeTypes: string[];
   onToggle: (type: string) => void;
   showAllChip?: boolean;
}

export const TypeFilterChips = React.memo(function TypeFilterChips({
   types,
   activeTypes,
   onToggle,
   showAllChip = true,
}: TypeFilterChipsProps) {
   const isAllActive = activeTypes.length === 0;

   const handleAllPress = useCallback(() => {
      onToggle("all");
   }, [onToggle]);

   return (
      <ScrollView
         horizontal
         showsHorizontalScrollIndicator={false}
         contentContainerStyle={styles.container}
      >
         {showAllChip && (
            <Pressable
               onPress={handleAllPress}
               style={({ pressed }) => [
                  styles.chip,
                  isAllActive && styles.chipAllActive,
                  pressed && styles.chipPressed,
               ]}
               accessibilityRole="button"
               accessibilityState={{ selected: isAllActive }}
               accessibilityLabel="All photos filter"
            >
               <Text
                  style={[
                     styles.chipText,
                     isAllActive && styles.chipTextAllActive,
                  ]}
               >
                  All
               </Text>
            </Pressable>
         )}
         {types.map(({ type, count }) => {
            const isActive = activeTypes.includes(type);
            const badgeColor = photoTypeBadgeColors[type];
            return (
               <Pressable
                  key={type}
                  onPress={() => onToggle(type)}
                  style={({ pressed }) => [
                     styles.chip,
                     isActive && {
                        backgroundColor: badgeColor.bg,
                        borderColor: badgeColor.text,
                     },
                     pressed && styles.chipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${PHOTO_TYPE_FULL_LABELS[type]} filter, ${count} photos`}
               >
                  <Text
                     style={[
                        styles.chipText,
                        isActive && { color: badgeColor.text },
                     ]}
                  >
                     {PHOTO_TYPE_FULL_LABELS[type]} ({count})
                  </Text>
               </Pressable>
            );
         })}
      </ScrollView>
   );
});

const styles = StyleSheet.create({
   container: {
      paddingHorizontal: spacing.space4,
      gap: spacing.space2,
      flexDirection: "row",
      alignItems: "center",
   },
   chip: {
      height: 32,
      paddingHorizontal: spacing.space3,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "transparent",
      justifyContent: "center",
      alignItems: "center",
      minWidth: 44,
   },
   chipPressed: {
      opacity: 0.7,
   },
   chipAllActive: {
      backgroundColor: colors.accentMuted,
      borderColor: colors.accent,
   },
   chipText: {
      fontSize: typography.label.fontSize,
      fontWeight: "500",
      color: colors.textSecondary,
   },
   chipTextAllActive: {
      color: colors.accent,
   },
});
