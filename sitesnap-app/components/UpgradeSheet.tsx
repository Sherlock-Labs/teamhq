/**
 * UpgradeSheet Component
 * Full-screen modal upgrade prompt for free-tier users hitting the job limit.
 * Design spec: Section 4.8, Section 5.6
 */
import React, { useState, useCallback } from "react";
import {
   View,
   Text,
   Pressable,
   Modal,
   ActivityIndicator,
   StyleSheet,
   ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Unlock, Check } from "lucide-react-native";
import { colors, spacing, radii, typography } from "@/lib/tokens";

interface UpgradeSheetProps {
   visible: boolean;
   activeJobCount: number;
   jobLimit: number;
   onSubscribe: () => Promise<void>;
   onDismiss: () => void;
}

const VALUE_PROPS = [
   "Unlimited active jobs",
   "Unlimited photos per job",
   "Before/after comparisons",
   "Search across all jobs",
];

export const UpgradeSheet = React.memo(function UpgradeSheet({
   visible,
   activeJobCount,
   jobLimit,
   onSubscribe,
   onDismiss,
}: UpgradeSheetProps) {
   const insets = useSafeAreaInsets();
   const [isLoading, setIsLoading] = useState(false);

   const handleSubscribe = useCallback(async () => {
      setIsLoading(true);
      try {
         await onSubscribe();
      } finally {
         setIsLoading(false);
      }
   }, [onSubscribe]);

   return (
      <Modal
         visible={visible}
         transparent={false}
         animationType="slide"
         onRequestClose={onDismiss}
      >
         <View
            style={[
               styles.container,
               { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
         >
            {/* Close button */}
            <Pressable
               onPress={onDismiss}
               style={styles.closeButton}
               accessibilityRole="button"
               accessibilityLabel="Close"
               hitSlop={12}
            >
               <X size={24} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>

            <ScrollView
               contentContainerStyle={styles.content}
               showsVerticalScrollIndicator={false}
            >
               {/* Icon */}
               <Unlock
                  size={48}
                  color={colors.accent}
                  strokeWidth={2}
               />

               {/* Headlines */}
               <Text style={styles.headline}>
                  You've hit the limit.
               </Text>
               <Text style={styles.subHeadline}>
                  {activeJobCount} of {jobLimit} active jobs used.
               </Text>
               <Text style={styles.body}>
                  Upgrade to keep creating jobs.
               </Text>

               {/* Value prop card */}
               <View style={styles.valuePropCard}>
                  {VALUE_PROPS.map((prop) => (
                     <View key={prop} style={styles.valuePropRow}>
                        <Check
                           size={18}
                           color={colors.statusSuccess}
                           strokeWidth={2}
                        />
                        <Text style={styles.valuePropText}>{prop}</Text>
                     </View>
                  ))}
               </View>

               {/* Price */}
               <Text style={styles.price}>$4.99/month</Text>

               {/* Subscribe button */}
               <Pressable
                  onPress={handleSubscribe}
                  disabled={isLoading}
                  style={({ pressed }) => [
                     styles.subscribeButton,
                     pressed && !isLoading && styles.subscribeButtonPressed,
                     isLoading && styles.subscribeButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Subscribe to SiteSnap Pro for $4.99 per month"
               >
                  {isLoading ? (
                     <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                     <Text style={styles.subscribeButtonText}>
                        Subscribe
                     </Text>
                  )}
               </Pressable>

               {/* Maybe Later */}
               <Pressable
                  onPress={onDismiss}
                  style={styles.maybeLaterButton}
                  accessibilityRole="button"
                  accessibilityLabel="Maybe later, dismiss upgrade"
               >
                  <Text style={styles.maybeLaterText}>Maybe Later</Text>
               </Pressable>

               {/* Tip */}
               <Text style={styles.tipText}>
                  Tip: Archive finished jobs to free up slots without
                  upgrading.
               </Text>
            </ScrollView>
         </View>
      </Modal>
   );
});

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
   },
   closeButton: {
      position: "absolute",
      top: 0,
      right: spacing.space4,
      zIndex: 10,
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
   },
   content: {
      alignItems: "center",
      paddingHorizontal: spacing.space8,
      paddingTop: spacing.space16,
   },
   headline: {
      fontSize: typography.title.fontSize,
      fontWeight: typography.title.fontWeight,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.space6,
   },
   subHeadline: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: typography.bodyLg.fontWeight,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.space2,
   },
   body: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.space1,
   },
   valuePropCard: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.space4,
      marginTop: spacing.space6,
      width: "100%",
   },
   valuePropRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 36,
      gap: spacing.space2,
   },
   valuePropText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textPrimary,
   },
   price: {
      fontSize: typography.heading.fontSize,
      fontWeight: typography.heading.fontWeight,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.space6,
   },
   subscribeButton: {
      width: "100%",
      height: 56,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.space5,
   },
   subscribeButtonPressed: {
      backgroundColor: colors.accentHover,
      transform: [{ scale: 0.98 }],
   },
   subscribeButtonDisabled: {
      opacity: 0.7,
   },
   subscribeButtonText: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "700",
      color: colors.white,
   },
   maybeLaterButton: {
      marginTop: spacing.space4,
      padding: spacing.space2,
   },
   maybeLaterText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
      textAlign: "center",
   },
   tipText: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.textTertiary,
      textAlign: "center",
      maxWidth: 260,
      marginTop: spacing.space6,
   },
});
