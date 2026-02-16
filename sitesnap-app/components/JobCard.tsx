/**
 * JobCard Component
 * List item for the Home screen job list.
 * Design spec: Section 4.1, Section 5.4
 */
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors, spacing, radii, typography } from "@/lib/tokens";
import { formatRelativeTime, pluralize } from "@/lib/utils";
import type { Job } from "@/lib/types";

interface JobCardProps {
   job: Job;
   isActive: boolean;
   onPress: () => void;
}

export const JobCard = React.memo(function JobCard({
   job,
   isActive,
   onPress,
}: JobCardProps) {
   const address = job.address || "No address";
   const photoText = pluralize(job.photoCount, "photo");
   const lastActivity = formatRelativeTime(job.lastPhotoAt);

   return (
      <Pressable
         onPress={onPress}
         style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed,
         ]}
         accessibilityRole="button"
         accessibilityLabel={`${job.name}, ${photoText}, ${lastActivity}${isActive ? ", active job" : ""}`}
      >
         <View style={styles.row1}>
            <View style={styles.nameRow}>
               {isActive && <View style={styles.activeDot} />}
               <Text
                  style={styles.jobName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
               >
                  {job.name}
               </Text>
            </View>
            <ChevronRight
               size={16}
               color={colors.textTertiary}
               strokeWidth={2}
            />
         </View>
         <View style={styles.row2}>
            <Text
               style={styles.meta}
               numberOfLines={1}
               ellipsizeMode="tail"
            >
               {address}
               <Text style={styles.separator}> {"\u2013"} </Text>
               {photoText}
               <Text style={styles.separator}> {"\u2013"} </Text>
               {lastActivity}
            </Text>
         </View>
      </Pressable>
   );
});

const styles = StyleSheet.create({
   card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.space4,
      marginBottom: spacing.space3,
   },
   cardPressed: {
      backgroundColor: colors.bgHover,
   },
   row1: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
   },
   nameRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: spacing.space2,
   },
   activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.statusActive,
      marginRight: spacing.space1,
   },
   jobName: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
      color: colors.textPrimary,
      flex: 1,
   },
   row2: {
      marginTop: spacing.space1,
   },
   meta: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.textSecondary,
   },
   separator: {
      color: colors.textTertiary,
   },
});
