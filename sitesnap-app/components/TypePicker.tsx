/**
 * TypePicker Component
 * Bottom sheet for manually reclassifying a photo's type.
 * Design spec: Section 4.4.4
 */
import React, { useCallback } from "react";
import {
   View,
   Text,
   Pressable,
   Modal,
   ScrollView,
   StyleSheet,
} from "react-native";
import { X, Check } from "lucide-react-native";
import { colors, spacing, radii, typography, shadows } from "@/lib/tokens";
import { photoTypeBadgeColors } from "@/lib/tokens";
import { PHOTO_TYPE_FULL_LABELS, CLASSIFIABLE_TYPES } from "@/lib/constants";
import type { PhotoType, ClassifiableType } from "@/lib/types";

interface TypePickerProps {
   visible: boolean;
   currentType: PhotoType;
   onSelect: (type: ClassifiableType | "unclassified") => void;
   onDismiss: () => void;
}

const ALL_OPTIONS: (ClassifiableType | "unclassified")[] = [
   ...CLASSIFIABLE_TYPES,
   "unclassified",
];

export const TypePicker = React.memo(function TypePicker({
   visible,
   currentType,
   onSelect,
   onDismiss,
}: TypePickerProps) {
   const handleSelect = useCallback(
      (type: ClassifiableType | "unclassified") => {
         onSelect(type);
         onDismiss();
      },
      [onSelect, onDismiss],
   );

   return (
      <Modal
         visible={visible}
         transparent
         animationType="slide"
         onRequestClose={onDismiss}
      >
         <Pressable style={styles.overlay} onPress={onDismiss}>
            <View />
         </Pressable>

         <View style={styles.sheet}>
            <View style={styles.dragHandle} />

            <View style={styles.header}>
               <Text style={styles.title}>Classify Photo</Text>
               <Pressable
                  onPress={onDismiss}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={12}
               >
                  <X
                     size={24}
                     color={colors.textSecondary}
                     strokeWidth={2}
                  />
               </Pressable>
            </View>

            <ScrollView
               showsVerticalScrollIndicator={false}
               style={styles.list}
            >
               {ALL_OPTIONS.map((type) => {
                  const isSelected = currentType === type;
                  const badgeColor = photoTypeBadgeColors[type];
                  return (
                     <Pressable
                        key={type}
                        onPress={() => handleSelect(type)}
                        style={({ pressed }) => [
                           styles.row,
                           pressed && styles.rowPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Classify as ${PHOTO_TYPE_FULL_LABELS[type]}`}
                     >
                        {/* Type badge preview */}
                        <View
                           style={[
                              styles.badge,
                              { backgroundColor: badgeColor.bg },
                           ]}
                        >
                           <Text
                              style={[
                                 styles.badgeText,
                                 { color: badgeColor.text },
                              ]}
                           >
                              {PHOTO_TYPE_FULL_LABELS[type].toUpperCase()}
                           </Text>
                        </View>

                        {/* Type name */}
                        <Text style={styles.typeName}>
                           {PHOTO_TYPE_FULL_LABELS[type]}
                        </Text>

                        {/* Checkmark if selected */}
                        {isSelected && (
                           <Check
                              size={20}
                              color={colors.accent}
                              strokeWidth={2}
                           />
                        )}
                     </Pressable>
                  );
               })}
            </ScrollView>
         </View>
      </Modal>
   );
});

const styles = StyleSheet.create({
   overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
   },
   sheet: {
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: spacing.space6,
      paddingHorizontal: spacing.space8,
      paddingBottom: spacing.space10,
      maxHeight: "70%",
      ...shadows.lg,
   },
   dragHandle: {
      width: 36,
      height: 4,
      borderRadius: radii.full,
      backgroundColor: colors.borderStrong,
      alignSelf: "center",
      marginBottom: spacing.space4,
   },
   header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.space4,
   },
   title: {
      fontSize: typography.heading.fontSize,
      fontWeight: typography.heading.fontWeight,
      color: colors.textPrimary,
   },
   closeButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
   },
   list: {
      flexGrow: 0,
   },
   row: {
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.space3,
   },
   rowPressed: {
      backgroundColor: colors.bgHover,
   },
   badge: {
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: radii.sm,
   },
   badgeText: {
      fontSize: typography.overline.fontSize,
      fontWeight: typography.overline.fontWeight,
      letterSpacing: 1,
      textTransform: "uppercase",
   },
   typeName: {
      flex: 1,
      fontSize: typography.bodyLg.fontSize,
      fontWeight: typography.bodyLg.fontWeight,
      color: colors.textPrimary,
   },
});
