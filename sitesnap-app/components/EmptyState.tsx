/**
 * EmptyState Component
 * Reusable centered empty state with icon, heading, subtext, and optional CTA.
 * Design spec: Section 4.1.1, 4.4.5
 */
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radii, typography } from "@/lib/tokens";

interface EmptyStateProps {
   icon: React.ReactNode;
   heading: string;
   subtext: string;
   ctaLabel?: string;
   onCtaPress?: () => void;
}

export const EmptyState = React.memo(function EmptyState({
   icon,
   heading,
   subtext,
   ctaLabel,
   onCtaPress,
}: EmptyStateProps) {
   return (
      <View style={styles.container}>
         {icon}
         <Text style={styles.heading}>{heading}</Text>
         <Text style={styles.subtext}>{subtext}</Text>
         {ctaLabel && onCtaPress && (
            <Pressable
               onPress={onCtaPress}
               style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && styles.ctaButtonPressed,
               ]}
               accessibilityRole="button"
               accessibilityLabel={ctaLabel}
            >
               <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>
         )}
      </View>
   );
});

const styles = StyleSheet.create({
   container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.space8,
   },
   heading: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "500",
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.space4,
   },
   subtext: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
      textAlign: "center",
      maxWidth: 260,
      marginTop: spacing.space2,
   },
   ctaButton: {
      height: 36,
      paddingHorizontal: spacing.space6,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.space6,
   },
   ctaButtonPressed: {
      backgroundColor: colors.accentHover,
      transform: [{ scale: 0.97 }],
   },
   ctaText: {
      fontSize: typography.label.fontSize,
      fontWeight: "600",
      color: colors.white,
   },
});
