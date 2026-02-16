/**
 * Home Screen (Job List)
 * Shows all jobs sorted by most recent activity.
 * Design spec: Section 4.1
 */
import React, { useState, useCallback, useMemo } from "react";
import {
   View,
   Text,
   FlatList,
   Pressable,
   RefreshControl,
   Alert,
   StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
   Search,
   User,
   Camera,
   AlertCircle,
   Plus,
} from "lucide-react-native";
import { getJobs, getMe, updateJob } from "@/lib/api";
import { useSiteSnapStore } from "@/lib/store";
import { JobCard } from "@/components/JobCard";
import { JobCreationSheet } from "@/components/JobCreationSheet";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonJobList } from "@/components/SkeletonLoader";
import { useToast } from "@/lib/toast-context";
import { purchaseSubscription } from "@/lib/iap";
import { FREE_TIER_JOB_LIMIT } from "@/lib/constants";
import { colors, spacing, radii, typography } from "@/lib/tokens";
import * as Haptics from "expo-haptics";
import { createJob } from "@/lib/api";
import type { Job } from "@/lib/types";

export default function HomeScreen() {
   const insets = useSafeAreaInsets();
   const router = useRouter();
   const queryClient = useQueryClient();
   const { showToast } = useToast();
   const activeJobId = useSiteSnapStore((s) => s.activeJobId);
   const setActiveJob = useSiteSnapStore((s) => s.setActiveJob);
   const setUserInfo = useSiteSnapStore((s) => s.setUserInfo);

   const [showJobCreation, setShowJobCreation] = useState(false);
   const [showUpgrade, setShowUpgrade] = useState(false);

   // Fetch user profile
   const { data: profile } = useQuery({
      queryKey: ["me"],
      queryFn: getMe,
      onSuccess: (data) => {
         setUserInfo(data.plan, data.activeJobCount);
      },
   });

   // Fetch active jobs
   const {
      data: jobsData,
      isLoading,
      isError,
      refetch,
      isRefetching,
   } = useQuery({
      queryKey: ["jobs", "active"],
      queryFn: () => getJobs({ status: "active", limit: 50 }),
   });

   // Fetch archived jobs
   const { data: archivedData } = useQuery({
      queryKey: ["jobs", "archived"],
      queryFn: () => getJobs({ status: "archived", limit: 50 }),
   });

   const [showArchived, setShowArchived] = useState(false);

   const archiveMutation = useMutation({
      mutationFn: (jobId: string) =>
         updateJob(jobId, { status: "archived" }),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["jobs"] });
         queryClient.invalidateQueries({ queryKey: ["me"] });
         showToast("Job archived", "success");
      },
   });

   const unarchiveMutation = useMutation({
      mutationFn: (jobId: string) =>
         updateJob(jobId, { status: "active" }),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["jobs"] });
         queryClient.invalidateQueries({ queryKey: ["me"] });
         showToast("Job restored", "success");
      },
   });

   const createJobMutation = useMutation({
      mutationFn: (data: { name: string; address?: string }) =>
         createJob(data),
      onSuccess: (newJob) => {
         queryClient.invalidateQueries({ queryKey: ["jobs"] });
         queryClient.invalidateQueries({ queryKey: ["me"] });
         setActiveJob(newJob.id);
         setShowJobCreation(false);
         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
         showToast("Job created", "success");
         router.push(`/(app)/jobs/${newJob.id}`);
      },
   });

   const jobs: Job[] = useMemo(() => {
      if (!jobsData?.jobs) return [];
      // Sort by lastPhotoAt descending, jobs with no photos sort by createdAt
      return [...jobsData.jobs].sort((a, b) => {
         const aDate = a.lastPhotoAt ?? a.createdAt;
         const bDate = b.lastPhotoAt ?? b.createdAt;
         return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
   }, [jobsData]);

   const archivedJobs: Job[] = archivedData?.jobs ?? [];
   const isFree = profile?.plan === "free";
   const activeJobCount = profile?.activeJobCount ?? jobs.length;

   const handleNewJobPress = useCallback(() => {
      if (isFree && activeJobCount >= FREE_TIER_JOB_LIMIT) {
         setShowUpgrade(true);
      } else {
         setShowJobCreation(true);
      }
   }, [isFree, activeJobCount]);

   const handleJobPress = useCallback(
      (job: Job) => {
         router.push(`/(app)/jobs/${job.id}`);
      },
      [router],
   );

   const handleArchive = useCallback(
      (job: Job) => {
         Alert.alert(
            "Archive this job?",
            "You can find it in Archived Jobs.",
            [
               { text: "Cancel", style: "cancel" },
               {
                  text: "Archive",
                  onPress: () => archiveMutation.mutate(job.id),
               },
            ],
         );
      },
      [archiveMutation],
   );

   const handleCreateJob = useCallback(
      async (name: string, address?: string) => {
         await createJobMutation.mutateAsync({ name, address });
      },
      [createJobMutation],
   );

   const handleSubscribe = useCallback(async () => {
      const result = await purchaseSubscription();
      if (result.plan === "pro") {
         setUserInfo("pro", activeJobCount);
         queryClient.invalidateQueries({ queryKey: ["me"] });
         showToast("You're all set! Unlimited jobs unlocked.", "success");
         setShowUpgrade(false);
      }
   }, [activeJobCount, setUserInfo, queryClient, showToast]);

   const renderJobCard = useCallback(
      ({ item }: { item: Job }) => (
         <JobCard
            job={item}
            isActive={item.id === activeJobId}
            onPress={() => handleJobPress(item)}
         />
      ),
      [activeJobId, handleJobPress],
   );

   const keyExtractor = useCallback((item: Job) => item.id, []);

   const ListHeader = useMemo(
      () => (
         <>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
               <Text style={styles.headerTitle}>SiteSnap</Text>
               <View style={styles.headerActions}>
                  <Pressable
                     onPress={() => router.push("/(app)/search")}
                     style={styles.headerButton}
                     accessibilityRole="button"
                     accessibilityLabel="Search photos"
                     hitSlop={8}
                  >
                     <Search
                        size={24}
                        color={colors.textSecondary}
                        strokeWidth={2}
                     />
                  </Pressable>
               </View>
            </View>

            {/* Free tier indicator + New Job button */}
            <View style={styles.subHeader}>
               {isFree && (
                  <Text style={styles.jobCount}>
                     {activeJobCount} of {FREE_TIER_JOB_LIMIT} jobs
                  </Text>
               )}
               {!isFree && <View />}
               <Pressable
                  onPress={handleNewJobPress}
                  style={({ pressed }) => [
                     styles.newJobButton,
                     pressed && styles.newJobButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Create new job"
               >
                  <Text style={styles.newJobButtonText}>+ New Job</Text>
               </Pressable>
            </View>
         </>
      ),
      [
         insets.top,
         router,
         isFree,
         activeJobCount,
         handleNewJobPress,
      ],
   );

   // Error state
   if (isError && !isLoading) {
      return (
         <View style={[styles.screen, { paddingTop: insets.top }]}>
            {ListHeader}
            <EmptyState
               icon={
                  <AlertCircle
                     size={32}
                     color={colors.statusError}
                     strokeWidth={2}
                  />
               }
               heading="Couldn't load jobs."
               subtext="Pull to retry."
            />
         </View>
      );
   }

   return (
      <View style={styles.screen}>
         <FlatList
            data={jobs}
            renderItem={renderJobCard}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
               isLoading ? (
                  <View style={styles.listContent}>
                     <SkeletonJobList />
                  </View>
               ) : (
                  <EmptyState
                     icon={
                        <Camera
                           size={48}
                           color={colors.textTertiary}
                           strokeWidth={2}
                        />
                     }
                     heading="No jobs yet."
                     subtext="Tap '+ New Job' to start organizing your job site photos."
                     ctaLabel="+ Create First Job"
                     onCtaPress={handleNewJobPress}
                  />
               )
            }
            contentContainerStyle={[
               styles.listContent,
               jobs.length === 0 && !isLoading && styles.listEmpty,
            ]}
            refreshControl={
               <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={() => refetch()}
                  tintColor={colors.accent}
               />
            }
            ListFooterComponent={
               archivedJobs.length > 0 ? (
                  <View style={styles.archivedSection}>
                     <Pressable
                        onPress={() => setShowArchived(!showArchived)}
                        style={styles.archivedToggle}
                        accessibilityRole="button"
                        accessibilityLabel={`${showArchived ? "Hide" : "Show"} archived jobs`}
                     >
                        <Text style={styles.archivedLabel}>
                           Archived ({archivedJobs.length})
                        </Text>
                     </Pressable>
                     {showArchived &&
                        archivedJobs.map((job) => (
                           <View key={job.id} style={{ opacity: 0.6 }}>
                              <JobCard
                                 job={job}
                                 isActive={false}
                                 onPress={() =>
                                    handleJobPress(job)
                                 }
                              />
                           </View>
                        ))}
                  </View>
               ) : null
            }
            contentInset={{ bottom: 100 }}
            contentInsetAdjustmentBehavior="automatic"
         />

         {/* Job Creation sheet */}
         <JobCreationSheet
            visible={showJobCreation}
            onSubmit={handleCreateJob}
            onDismiss={() => setShowJobCreation(false)}
         />

         {/* Upgrade sheet */}
         <UpgradeSheet
            visible={showUpgrade}
            activeJobCount={activeJobCount}
            jobLimit={FREE_TIER_JOB_LIMIT}
            onSubscribe={handleSubscribe}
            onDismiss={() => setShowUpgrade(false)}
         />
      </View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
   },
   header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      height: 56,
      backgroundColor: colors.bgElevated,
      paddingHorizontal: spacing.space8,
   },
   headerTitle: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
      color: colors.textPrimary,
   },
   headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.space2,
   },
   headerButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
   },
   subHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.space4,
      paddingVertical: spacing.space3,
   },
   jobCount: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.textSecondary,
   },
   newJobButton: {
      height: 36,
      paddingHorizontal: spacing.space4,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      justifyContent: "center",
      alignItems: "center",
   },
   newJobButtonPressed: {
      backgroundColor: colors.accentHover,
      transform: [{ scale: 0.97 }],
   },
   newJobButtonText: {
      fontSize: typography.label.fontSize,
      fontWeight: "600",
      color: colors.white,
   },
   listContent: {
      paddingHorizontal: spacing.space4,
   },
   listEmpty: {
      flex: 1,
   },
   archivedSection: {
      marginTop: spacing.space5,
   },
   archivedToggle: {
      paddingVertical: spacing.space2,
   },
   archivedLabel: {
      fontSize: typography.label.fontSize,
      fontWeight: typography.label.fontWeight,
      color: colors.textSecondary,
   },
});
