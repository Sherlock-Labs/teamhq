/**
 * Upgrade Screen
 * Full-screen upgrade prompt presented as a modal.
 * Design spec: Section 4.8
 */
import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe } from "@/lib/api";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import { useSiteSnapStore } from "@/lib/store";
import { useToast } from "@/lib/toast-context";
import { purchaseSubscription } from "@/lib/iap";
import { FREE_TIER_JOB_LIMIT } from "@/lib/constants";
import { colors } from "@/lib/tokens";

export default function UpgradeScreen() {
   const router = useRouter();
   const queryClient = useQueryClient();
   const { showToast } = useToast();
   const setUserInfo = useSiteSnapStore((s) => s.setUserInfo);

   const { data: profile } = useQuery({
      queryKey: ["me"],
      queryFn: getMe,
   });

   const handleSubscribe = useCallback(async () => {
      const result = await purchaseSubscription();
      if (result.plan === "pro") {
         setUserInfo("pro", profile?.activeJobCount ?? 0);
         queryClient.invalidateQueries({ queryKey: ["me"] });
         queryClient.invalidateQueries({ queryKey: ["billing"] });
         showToast("You're all set! Unlimited jobs unlocked.", "success");
         setTimeout(() => router.back(), 1500);
      }
   }, [profile, setUserInfo, queryClient, showToast, router]);

   const handleDismiss = useCallback(() => {
      router.back();
   }, [router]);

   return (
      <View style={styles.screen}>
         <UpgradeSheet
            visible
            activeJobCount={profile?.activeJobCount ?? 0}
            jobLimit={FREE_TIER_JOB_LIMIT}
            onSubscribe={handleSubscribe}
            onDismiss={handleDismiss}
         />
      </View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
   },
});
