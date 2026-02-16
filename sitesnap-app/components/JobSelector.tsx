/**
 * JobSelector Component
 * Bottom sheet for choosing which job to assign photos to.
 * Shown when user taps Camera FAB with no active job set.
 * Design spec: Section 4.3.2, Section 5.7
 */
import React from "react";
import {
   View,
   Text,
   Pressable,
   ScrollView,
   Modal,
   StyleSheet,
} from "react-native";
import { X, Plus } from "lucide-react-native";
import { colors, spacing, radii, typography, shadows } from "@/lib/tokens";
import type { Job } from "@/lib/types";

interface JobSelectorProps {
   visible: boolean;
   jobs: Job[];
   onSelect: (jobId: string) => void;
   onCreateNew: () => void;
   onDismiss: () => void;
}

export const JobSelector = React.memo(function JobSelector({
   visible,
   jobs,
   onSelect,
   onCreateNew,
   onDismiss,
}: JobSelectorProps) {
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
               <Text style={styles.title}>
                  Which job are you working on?
               </Text>
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
               style={styles.list}
               showsVerticalScrollIndicator={false}
            >
               {jobs.map((job) => (
                  <Pressable
                     key={job.id}
                     onPress={() => onSelect(job.id)}
                     style={({ pressed }) => [
                        styles.jobRow,
                        pressed && styles.jobRowPressed,
                     ]}
                     accessibilityRole="button"
                     accessibilityLabel={`Select ${job.name}`}
                  >
                     <Text
                        style={styles.jobName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                     >
                        {job.name}
                     </Text>
                     {job.address && (
                        <Text
                           style={styles.jobAddress}
                           numberOfLines={1}
                           ellipsizeMode="tail"
                        >
                           {job.address}
                        </Text>
                     )}
                  </Pressable>
               ))}

               <Pressable
                  onPress={onCreateNew}
                  style={({ pressed }) => [
                     styles.jobRow,
                     styles.newJobRow,
                     pressed && styles.jobRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Create new job"
               >
                  <View style={styles.newJobContent}>
                     <Plus
                        size={20}
                        color={colors.accent}
                        strokeWidth={2}
                     />
                     <Text style={styles.newJobText}>New Job</Text>
                  </View>
               </Pressable>
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
      flex: 1,
      marginRight: spacing.space4,
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
   jobRow: {
      height: 56,
      justifyContent: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
   },
   jobRowPressed: {
      backgroundColor: colors.bgHover,
   },
   jobName: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: typography.bodyLg.fontWeight,
      color: colors.textPrimary,
   },
   jobAddress: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.textSecondary,
      marginTop: 2,
   },
   newJobRow: {
      borderBottomWidth: 0,
   },
   newJobContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.space2,
   },
   newJobText: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "500",
      color: colors.accent,
   },
});
