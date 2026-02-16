/**
 * App Tab Layout
 * Two tabs (Home, Profile) + Camera FAB overlay.
 * Design spec: Section 3 (Navigation Structure)
 */
import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Home, User } from "lucide-react-native";
import { CameraFAB } from "@/components/CameraFAB";
import { JobSelector } from "@/components/JobSelector";
import { JobCreationSheet } from "@/components/JobCreationSheet";
import { useSiteSnapStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getJobs, createJob } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { colors, spacing, typography } from "@/lib/tokens";
import * as Haptics from "expo-haptics";
import type { Job } from "@/lib/types";

export default function AppLayout() {
   const router = useRouter();
   const queryClient = useQueryClient();
   const { showToast } = useToast();
   const activeJobId = useSiteSnapStore((s) => s.activeJobId);
   const setActiveJob = useSiteSnapStore((s) => s.setActiveJob);
   const uploadQueue = useSiteSnapStore((s) => s.uploadQueue);

   const [showJobSelector, setShowJobSelector] = useState(false);
   const [showJobCreation, setShowJobCreation] = useState(false);

   // Fetch jobs for the selector
   const { data: jobsData } = useQuery({
      queryKey: ["jobs", "active"],
      queryFn: () => getJobs({ status: "active", limit: 50 }),
   });

   const createJobMutation = useMutation({
      mutationFn: (data: { name: string; address?: string }) =>
         createJob(data),
      onSuccess: (newJob) => {
         queryClient.invalidateQueries({ queryKey: ["jobs"] });
         setActiveJob(newJob.id);
         setShowJobCreation(false);
         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
         showToast("Job created", "success");
         // Navigate to camera or job detail
         router.push(`/(app)/jobs/${newJob.id}`);
      },
   });

   const handleFABPress = useCallback(() => {
      if (activeJobId) {
         // Go to camera -- for now push to the job detail
         // Camera will be integrated as a full-screen modal
         router.push(`/(app)/jobs/${activeJobId}`);
      } else {
         setShowJobSelector(true);
      }
   }, [activeJobId, router]);

   const handleJobSelect = useCallback(
      (jobId: string) => {
         setActiveJob(jobId);
         setShowJobSelector(false);
         router.push(`/(app)/jobs/${jobId}`);
      },
      [setActiveJob, router],
   );

   const handleCreateNewFromSelector = useCallback(() => {
      setShowJobSelector(false);
      setShowJobCreation(true);
   }, []);

   const handleCreateJob = useCallback(
      async (name: string, address?: string) => {
         await createJobMutation.mutateAsync({ name, address });
      },
      [createJobMutation],
   );

   const uploadQueueCount = uploadQueue.length;
   const jobs: Job[] = jobsData?.jobs ?? [];

   return (
      <View style={styles.container}>
         <Tabs
            screenOptions={{
               headerShown: false,
               tabBarStyle: styles.tabBar,
               tabBarActiveTintColor: colors.accent,
               tabBarInactiveTintColor: colors.textTertiary,
               tabBarLabelStyle: styles.tabBarLabel,
            }}
         >
            <Tabs.Screen
               name="home/index"
               options={{
                  title: "Jobs",
                  tabBarIcon: ({ color, size }) => (
                     <Home size={size} color={color} strokeWidth={2} />
                  ),
               }}
            />
            <Tabs.Screen
               name="profile"
               options={{
                  title: "Me",
                  tabBarIcon: ({ color, size }) => (
                     <User size={size} color={color} strokeWidth={2} />
                  ),
               }}
            />
            {/* Hidden screens -- accessible via navigation but not shown in tab bar */}
            <Tabs.Screen
               name="jobs/[id]"
               options={{
                  href: null,
               }}
            />
            <Tabs.Screen
               name="search"
               options={{
                  href: null,
               }}
            />
            <Tabs.Screen
               name="compare"
               options={{
                  href: null,
               }}
            />
            <Tabs.Screen
               name="upgrade"
               options={{
                  href: null,
               }}
            />
         </Tabs>

         {/* Camera FAB -- always visible */}
         <CameraFAB
            uploadQueueCount={uploadQueueCount}
            onPress={handleFABPress}
         />

         {/* Job Selector bottom sheet */}
         <JobSelector
            visible={showJobSelector}
            jobs={jobs}
            onSelect={handleJobSelect}
            onCreateNew={handleCreateNewFromSelector}
            onDismiss={() => setShowJobSelector(false)}
         />

         {/* Job Creation bottom sheet */}
         <JobCreationSheet
            visible={showJobCreation}
            onSubmit={handleCreateJob}
            onDismiss={() => setShowJobCreation(false)}
         />
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
   },
   tabBar: {
      backgroundColor: colors.bgElevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      height: 84,
      paddingBottom: 0,
   },
   tabBarLabel: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
   },
});
