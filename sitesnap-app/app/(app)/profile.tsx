/**
 * Profile / Settings Screen
 * Business name, trade, subscription status, sign out.
 * Design spec: Section 4.7
 */
import React, { useState, useCallback } from "react";
import {
   View,
   Text,
   TextInput,
   Pressable,
   ScrollView,
   Alert,
   ActionSheetIOS,
   Platform,
   Linking,
   StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { getMe, updateMe, getBillingStatus } from "@/lib/api";
import { useSiteSnapStore } from "@/lib/store";
import { useToast } from "@/lib/toast-context";
import { FREE_TIER_JOB_LIMIT, TRADE_OPTIONS } from "@/lib/constants";
import { colors, spacing, radii, typography } from "@/lib/tokens";
import type { TradeType } from "@/lib/types";

export default function ProfileScreen() {
   const insets = useSafeAreaInsets();
   const router = useRouter();
   const { signOut } = useAuth();
   const queryClient = useQueryClient();
   const { showToast } = useToast();
   const setUserInfo = useSiteSnapStore((s) => s.setUserInfo);

   const [isEditingName, setIsEditingName] = useState(false);
   const [nameInput, setNameInput] = useState("");

   // Fetch profile
   const { data: profile } = useQuery({
      queryKey: ["me"],
      queryFn: getMe,
   });

   // Fetch billing
   const { data: billing } = useQuery({
      queryKey: ["billing"],
      queryFn: getBillingStatus,
   });

   // Update profile
   const updateMutation = useMutation({
      mutationFn: (data: { businessName?: string; trade?: TradeType }) =>
         updateMe(data),
      onSuccess: (result) => {
         queryClient.invalidateQueries({ queryKey: ["me"] });
         setUserInfo(result.plan, result.activeJobCount);
         showToast("Profile updated", "success");
      },
   });

   const handleEditName = useCallback(() => {
      setNameInput(profile?.businessName ?? "");
      setIsEditingName(true);
   }, [profile]);

   const handleSaveName = useCallback(() => {
      updateMutation.mutate({
         businessName: nameInput.trim() || undefined,
      });
      setIsEditingName(false);
   }, [nameInput, updateMutation]);

   const handleTradePicker = useCallback(() => {
      if (Platform.OS === "ios") {
         ActionSheetIOS.showActionSheetWithOptions(
            {
               options: [
                  "Cancel",
                  ...TRADE_OPTIONS.map((t) => t.label),
               ],
               cancelButtonIndex: 0,
            },
            (buttonIndex) => {
               if (buttonIndex > 0) {
                  const trade = TRADE_OPTIONS[buttonIndex - 1].value;
                  updateMutation.mutate({ trade });
               }
            },
         );
      }
   }, [updateMutation]);

   const handleSignOut = useCallback(() => {
      Alert.alert("Sign out of SiteSnap?", undefined, [
         { text: "Cancel", style: "cancel" },
         {
            text: "Sign Out",
            style: "destructive",
            onPress: async () => {
               await signOut();
               router.replace("/(auth)/sign-in");
            },
         },
      ]);
   }, [signOut, router]);

   const isFree = profile?.plan === "free";
   const currentTrade = TRADE_OPTIONS.find(
      (t) => t.value === profile?.trade,
   )?.label ?? "Not set";

   return (
      <ScrollView
         style={styles.screen}
         contentContainerStyle={[
            styles.contentContainer,
            { paddingTop: insets.top + spacing.space4 },
         ]}
      >
         {/* Title */}
         <Text style={styles.title}>Profile</Text>

         {/* Business Info Section */}
         <Text style={styles.sectionLabel}>BUSINESS INFO</Text>
         <View style={styles.group}>
            {/* Business Name */}
            <Pressable
               onPress={handleEditName}
               style={styles.row}
               accessibilityRole="button"
               accessibilityLabel={`Business name: ${profile?.businessName ?? "Not set"}`}
            >
               <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Business Name</Text>
                  {isEditingName ? (
                     <View style={styles.editRow}>
                        <TextInput
                           value={nameInput}
                           onChangeText={setNameInput}
                           style={styles.inlineInput}
                           autoFocus
                           onSubmitEditing={handleSaveName}
                           returnKeyType="done"
                           placeholder="Add business name"
                           placeholderTextColor={colors.textTertiary}
                        />
                        <Pressable
                           onPress={handleSaveName}
                           style={styles.doneButton}
                           accessibilityRole="button"
                           accessibilityLabel="Save business name"
                        >
                           <Text style={styles.doneButtonText}>Done</Text>
                        </Pressable>
                     </View>
                  ) : (
                     <Text
                        style={[
                           styles.rowValue,
                           !profile?.businessName &&
                              styles.rowValuePlaceholder,
                        ]}
                     >
                        {profile?.businessName ?? "Add business name"}
                     </Text>
                  )}
               </View>
            </Pressable>

            <View style={styles.separator} />

            {/* Trade */}
            <Pressable
               onPress={handleTradePicker}
               style={styles.row}
               accessibilityRole="button"
               accessibilityLabel={`Trade: ${currentTrade}`}
            >
               <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Trade</Text>
                  <View style={styles.tradeRow}>
                     <Text style={styles.rowValue}>{currentTrade}</Text>
                     <ChevronDown
                        size={16}
                        color={colors.textTertiary}
                        strokeWidth={2}
                     />
                  </View>
               </View>
            </Pressable>
         </View>

         {/* Subscription Section */}
         <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
         <View style={styles.group}>
            <View style={styles.row}>
               <View style={styles.rowContent}>
                  <Text style={styles.planName}>
                     {isFree ? "Free Plan" : "Pro Plan"}
                  </Text>
                  {isFree && (
                     <Text style={styles.planDetail}>
                        {profile?.activeJobCount ?? 0} of{" "}
                        {FREE_TIER_JOB_LIMIT} active jobs
                     </Text>
                  )}
                  {!isFree && billing && (
                     <Text style={styles.planDetail}>
                        Active subscription
                        {billing.expiresAt &&
                           ` - Renews ${new Date(billing.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                     </Text>
                  )}
                  {isFree && (
                     <Pressable
                        onPress={() => router.push("/(app)/upgrade")}
                        style={styles.upgradeLink}
                        accessibilityRole="link"
                        accessibilityLabel="Upgrade to Pro"
                     >
                        <Text style={styles.upgradeLinkText}>
                           Upgrade to Pro
                        </Text>
                        <ChevronRight
                           size={16}
                           color={colors.accent}
                           strokeWidth={2}
                        />
                     </Pressable>
                  )}
                  {!isFree && (
                     <Pressable
                        onPress={() =>
                           Linking.openURL(
                              "https://apps.apple.com/account/subscriptions",
                           )
                        }
                        style={styles.manageLink}
                        accessibilityRole="link"
                        accessibilityLabel="Manage subscription"
                     >
                        <Text style={styles.manageLinkText}>
                           Manage Subscription
                        </Text>
                     </Pressable>
                  )}
               </View>
            </View>
         </View>

         {/* Account Section */}
         <Text style={styles.sectionLabel}>ACCOUNT</Text>
         <View style={styles.group}>
            {/* Email */}
            <View style={styles.row}>
               <View style={styles.rowContent}>
                  <Text style={styles.rowValue}>
                     {profile?.email ?? ""}
                  </Text>
               </View>
            </View>

            <View style={styles.separator} />

            {/* Sign Out */}
            <Pressable
               onPress={handleSignOut}
               style={styles.row}
               accessibilityRole="button"
               accessibilityLabel="Sign out"
            >
               <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
         </View>
      </ScrollView>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
   },
   contentContainer: {
      paddingBottom: spacing.space16,
   },
   title: {
      fontSize: typography.title.fontSize,
      fontWeight: typography.title.fontWeight,
      color: colors.textPrimary,
      paddingHorizontal: spacing.space8,
      marginBottom: spacing.space4,
   },
   sectionLabel: {
      fontSize: typography.overline.fontSize,
      fontWeight: typography.overline.fontWeight,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.textSecondary,
      paddingTop: spacing.space5,
      paddingBottom: spacing.space2,
      paddingHorizontal: spacing.space4,
   },
   group: {
      marginHorizontal: spacing.space4,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      overflow: "hidden",
   },
   row: {
      minHeight: 52,
      paddingHorizontal: spacing.space4,
      justifyContent: "center",
   },
   rowContent: {
      paddingVertical: spacing.space3,
   },
   rowLabel: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.textSecondary,
   },
   rowValue: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: typography.bodyLg.fontWeight,
      color: colors.textPrimary,
      marginTop: 2,
   },
   rowValuePlaceholder: {
      color: colors.textTertiary,
   },
   editRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
   },
   inlineInput: {
      flex: 1,
      fontSize: typography.bodyLg.fontSize,
      color: colors.textPrimary,
      height: 36,
      paddingVertical: 0,
   },
   doneButton: {
      paddingHorizontal: spacing.space3,
      paddingVertical: spacing.space1,
   },
   doneButtonText: {
      fontSize: typography.body.fontSize,
      fontWeight: "600",
      color: colors.accent,
   },
   tradeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
   },
   separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: spacing.space4,
   },
   planName: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
      color: colors.textPrimary,
   },
   planDetail: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
      marginTop: 2,
   },
   upgradeLink: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.space2,
   },
   upgradeLinkText: {
      fontSize: typography.body.fontSize,
      fontWeight: "500",
      color: colors.accent,
   },
   manageLink: {
      marginTop: spacing.space2,
   },
   manageLinkText: {
      fontSize: typography.body.fontSize,
      fontWeight: "500",
      color: colors.textSecondary,
   },
   signOutText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.statusError,
   },
});
