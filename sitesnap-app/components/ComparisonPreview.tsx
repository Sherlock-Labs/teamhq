/**
 * ComparisonPreview Component
 * Displays the server-generated before/after comparison image with share/save.
 * Design spec: Section 4.5.2, Section 5.8
 */
import React from "react";
import {
   View,
   Text,
   Pressable,
   ActivityIndicator,
   StyleSheet,
   Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Share2, Download, AlertCircle } from "lucide-react-native";
import { colors, spacing, radii, typography, shadows } from "@/lib/tokens";

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_SIZE = SCREEN_WIDTH - spacing.space4 * 2;

interface ComparisonPreviewProps {
   /** Remote presigned URL or local file URI for displaying the image */
   imageUri: string | null;
   /** Local file URI required for share/save. When null, share/save buttons are disabled. */
   localFileUri?: string | null;
   isLoading: boolean;
   error: string | null;
   onShare: () => void;
   onSave: () => void;
   onRetry: () => void;
}

export const ComparisonPreview = React.memo(function ComparisonPreview({
   imageUri,
   localFileUri,
   isLoading,
   error,
   onShare,
   onSave,
   onRetry,
}: ComparisonPreviewProps) {
   // Image can display as soon as we have a URL (remote or local)
   // Share/save require a local file — fall back to imageUri for backwards compat
   const hasLocalFile = localFileUri != null || (imageUri != null && imageUri.startsWith("file://"));
   const buttonsDisabled = isLoading || !!error || !hasLocalFile;

   return (
      <View style={styles.container}>
         {/* Image preview area */}
         <View style={styles.imageContainer}>
            {isLoading && (
               <View style={styles.loadingState}>
                  <ActivityIndicator size={32} color={colors.accent} />
                  <Text style={styles.loadingText}>
                     Creating your comparison...
                  </Text>
               </View>
            )}

            {error && !isLoading && (
               <View style={styles.errorState}>
                  <AlertCircle
                     size={32}
                     color={colors.statusError}
                     strokeWidth={2}
                  />
                  <Text style={styles.errorText}>
                     Couldn't create comparison. Try again.
                  </Text>
                  <Pressable
                     onPress={onRetry}
                     style={({ pressed }) => [
                        styles.retryButton,
                        pressed && styles.retryButtonPressed,
                     ]}
                     accessibilityRole="button"
                     accessibilityLabel="Retry comparison"
                  >
                     <Text style={styles.retryButtonText}>Retry</Text>
                  </Pressable>
               </View>
            )}

            {imageUri && !isLoading && !error && (
               <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  contentFit="contain"
                  transition={200}
               />
            )}
         </View>

         {/* Action buttons */}
         <View style={styles.actions}>
            <Pressable
               onPress={onShare}
               disabled={buttonsDisabled}
               style={({ pressed }) => [
                  styles.shareButton,
                  pressed && !buttonsDisabled && styles.shareButtonPressed,
                  buttonsDisabled && styles.buttonDisabled,
               ]}
               accessibilityRole="button"
               accessibilityLabel="Share comparison"
            >
               <Share2 size={20} color={colors.white} strokeWidth={2} />
               <Text style={styles.shareButtonText}>Share</Text>
            </Pressable>

            <Pressable
               onPress={onSave}
               disabled={buttonsDisabled}
               style={({ pressed }) => [
                  styles.saveButton,
                  pressed && !buttonsDisabled && styles.saveButtonPressed,
                  buttonsDisabled && styles.buttonDisabled,
               ]}
               accessibilityRole="button"
               accessibilityLabel="Save comparison to camera roll"
            >
               <Download
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={2}
               />
               <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
         </View>
      </View>
   );
});

const styles = StyleSheet.create({
   container: {
      paddingHorizontal: spacing.space4,
   },
   imageContainer: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      borderRadius: radii.md,
      backgroundColor: colors.bgCard,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
      ...shadows.md,
   },
   image: {
      width: "100%",
      height: "100%",
   },
   loadingState: {
      alignItems: "center",
      gap: spacing.space3,
   },
   loadingText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
   },
   errorState: {
      alignItems: "center",
      gap: spacing.space3,
      paddingHorizontal: spacing.space8,
   },
   errorText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
      textAlign: "center",
   },
   retryButton: {
      height: 48,
      paddingHorizontal: spacing.space4,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radii.md,
      justifyContent: "center",
      alignItems: "center",
   },
   retryButtonPressed: {
      backgroundColor: colors.accentMuted,
   },
   retryButtonText: {
      fontSize: typography.body.fontSize,
      fontWeight: "500",
      color: colors.accent,
   },
   actions: {
      flexDirection: "row",
      gap: spacing.space3,
      marginTop: spacing.space5,
   },
   shareButton: {
      flex: 1,
      height: 52,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.space2,
   },
   shareButtonPressed: {
      backgroundColor: colors.accentHover,
      transform: [{ scale: 0.98 }],
   },
   shareButtonText: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
      color: colors.white,
   },
   saveButton: {
      flex: 1,
      height: 52,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.space2,
   },
   saveButtonPressed: {
      backgroundColor: colors.bgHover,
      transform: [{ scale: 0.98 }],
   },
   saveButtonText: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "500",
      color: colors.textPrimary,
   },
   buttonDisabled: {
      opacity: 0.5,
   },
});
