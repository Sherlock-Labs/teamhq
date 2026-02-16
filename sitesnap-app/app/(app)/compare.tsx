/**
 * Comparison Preview Screen
 * Shows the server-generated before/after comparison image with share/save.
 * Design spec: Section 4.5.2
 */
import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { generateComparison } from "@/lib/api";
import { ComparisonPreview } from "@/components/ComparisonPreview";
import { useToast } from "@/lib/toast-context";
import { colors, spacing, typography } from "@/lib/tokens";

export default function CompareScreen() {
   const { beforeId, afterId } = useLocalSearchParams<{
      beforeId: string;
      afterId: string;
   }>();
   const insets = useSafeAreaInsets();
   const router = useRouter();
   const { showToast } = useToast();

   // Remote presigned URL for display via expo-image
   const [comparisonUrl, setComparisonUrl] = useState<string | null>(null);
   // Local file URI for share/save operations
   const [localFileUri, setLocalFileUri] = useState<string | null>(null);

   // Generate comparison -- server returns { comparisonUrl, comparisonId }
   const generateMutation = useMutation({
      mutationFn: () =>
         generateComparison({
            beforePhotoId: beforeId,
            afterPhotoId: afterId,
         }),
      onSuccess: async (data) => {
         // Set the presigned URL immediately for display
         setComparisonUrl(data.comparisonUrl);
         // Download to local cache for share/save operations
         try {
            const localUri = `${FileSystem.cacheDirectory}comparison_${data.comparisonId}.jpg`;
            const download = await FileSystem.downloadAsync(
               data.comparisonUrl,
               localUri,
            );
            setLocalFileUri(download.uri);
         } catch {
            // Display still works via the remote URL; share/save will be
            // disabled until a retry succeeds
            console.warn("Failed to cache comparison image locally");
         }
      },
   });

   useEffect(() => {
      if (beforeId && afterId) {
         generateMutation.mutate();
      }
   }, [beforeId, afterId]);

   const handleShare = useCallback(async () => {
      if (!localFileUri) return;
      try {
         await Sharing.shareAsync(localFileUri, {
            mimeType: "image/jpeg",
            UTI: "public.jpeg",
         });
      } catch {
         showToast("Couldn't share. Try again.", "error");
      }
   }, [localFileUri, showToast]);

   const handleSave = useCallback(async () => {
      if (!localFileUri) return;
      try {
         const { status } = await MediaLibrary.requestPermissionsAsync();
         if (status !== "granted") {
            showToast("Permission needed to save photos.", "error");
            return;
         }
         await MediaLibrary.saveToLibraryAsync(localFileUri);
         showToast("Saved to camera roll", "success");
      } catch {
         showToast("Couldn't save. Try again.", "error");
      }
   }, [localFileUri, showToast]);

   const handleRetry = useCallback(() => {
      setComparisonUrl(null);
      setLocalFileUri(null);
      generateMutation.mutate();
   }, [generateMutation]);

   return (
      <View style={styles.screen}>
         {/* Header */}
         <View style={[styles.header, { paddingTop: insets.top }]}>
            <Pressable
               onPress={() => router.back()}
               style={styles.headerButton}
               accessibilityRole="button"
               accessibilityLabel="Go back"
               hitSlop={8}
            >
               <ChevronLeft
                  size={24}
                  color={colors.textSecondary}
                  strokeWidth={2}
               />
            </Pressable>
            <Text style={styles.headerTitle}>Comparison</Text>
            <View style={styles.headerButton} />
         </View>

         {/* Comparison preview */}
         <View style={styles.content}>
            <ComparisonPreview
               imageUri={comparisonUrl}
               localFileUri={localFileUri}
               isLoading={generateMutation.isPending}
               error={
                  generateMutation.isError
                     ? "Couldn't create comparison."
                     : null
               }
               onShare={handleShare}
               onSave={handleSave}
               onRetry={handleRetry}
            />
         </View>
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
      alignItems: "center",
      height: 56,
      backgroundColor: colors.bgElevated,
      paddingHorizontal: spacing.space2,
   },
   headerButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
   },
   headerTitle: {
      flex: 1,
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
      color: colors.textPrimary,
      textAlign: "center",
   },
   content: {
      flex: 1,
      justifyContent: "center",
      paddingTop: spacing.space6,
   },
});
