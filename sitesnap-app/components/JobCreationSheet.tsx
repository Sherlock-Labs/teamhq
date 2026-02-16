/**
 * JobCreationSheet Component
 * Bottom sheet modal for creating a new job. Two fields, one required.
 * Design spec: Section 4.2
 */
import React, { useState, useRef, useCallback } from "react";
import {
   View,
   Text,
   TextInput,
   Pressable,
   Modal,
   ActivityIndicator,
   StyleSheet,
   KeyboardAvoidingView,
   Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors, spacing, radii, typography, shadows } from "@/lib/tokens";

interface JobCreationSheetProps {
   visible: boolean;
   onSubmit: (name: string, address?: string) => Promise<void>;
   onDismiss: () => void;
}

export const JobCreationSheet = React.memo(function JobCreationSheet({
   visible,
   onSubmit,
   onDismiss,
}: JobCreationSheetProps) {
   const insets = useSafeAreaInsets();
   const [name, setName] = useState("");
   const [address, setAddress] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [nameError, setNameError] = useState<string | null>(null);
   const addressRef = useRef<TextInput>(null);

   const handleSubmit = useCallback(async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
         setNameError("Job name is required");
         return;
      }
      setNameError(null);
      setError(null);
      setIsLoading(true);

      try {
         await onSubmit(trimmedName, address.trim() || undefined);
         // Reset on success
         setName("");
         setAddress("");
      } catch (err) {
         if (err instanceof Error && err.message.includes("network")) {
            setError("No connection. Check your signal and try again.");
         } else {
            setError("Couldn't create job. Try again.");
         }
      } finally {
         setIsLoading(false);
      }
   }, [name, address, onSubmit]);

   const handleDismiss = useCallback(() => {
      if (!isLoading) {
         setNameError(null);
         setError(null);
         onDismiss();
      }
   }, [isLoading, onDismiss]);

   const showCharCount = name.length >= 80;

   return (
      <Modal
         visible={visible}
         transparent
         animationType="slide"
         onRequestClose={handleDismiss}
      >
         <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardView}
         >
            <Pressable style={styles.overlay} onPress={handleDismiss}>
               <View />
            </Pressable>

            <View
               style={[
                  styles.sheet,
                  { paddingBottom: insets.bottom + spacing.space6 },
               ]}
            >
               <View style={styles.dragHandle} />

               {/* Header */}
               <View style={styles.header}>
                  <Text style={styles.title}>New Job</Text>
                  <Pressable
                     onPress={handleDismiss}
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

               {/* Job Name */}
               <View style={styles.fieldGroup}>
                  <Text style={styles.label}>JOB NAME *</Text>
                  <TextInput
                     value={name}
                     onChangeText={(text) => {
                        setName(text);
                        if (nameError) setNameError(null);
                     }}
                     placeholder="e.g. Johnson Bathroom Remodel"
                     placeholderTextColor={colors.textTertiary}
                     style={[
                        styles.input,
                        nameError ? styles.inputError : undefined,
                     ]}
                     maxLength={100}
                     returnKeyType="next"
                     onSubmitEditing={() => addressRef.current?.focus()}
                     autoFocus
                     accessibilityLabel="Job name, required"
                  />
                  <View style={styles.inputFooter}>
                     {nameError && (
                        <Text style={styles.errorText}>{nameError}</Text>
                     )}
                     {showCharCount && (
                        <Text style={styles.charCount}>
                           {name.length}/100
                        </Text>
                     )}
                  </View>
               </View>

               {/* Address */}
               <View style={styles.fieldGroup}>
                  <Text style={styles.label}>ADDRESS (OPTIONAL)</Text>
                  <TextInput
                     ref={addressRef}
                     value={address}
                     onChangeText={setAddress}
                     placeholder="e.g. 123 Oak Street"
                     placeholderTextColor={colors.textTertiary}
                     style={styles.input}
                     returnKeyType="done"
                     onSubmitEditing={handleSubmit}
                     accessibilityLabel="Address, optional"
                  />
               </View>

               {/* Submit button */}
               <Pressable
                  onPress={handleSubmit}
                  disabled={isLoading}
                  style={({ pressed }) => [
                     styles.submitButton,
                     pressed && !isLoading && styles.submitButtonPressed,
                     isLoading && styles.submitButtonLoading,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Create job"
               >
                  {isLoading ? (
                     <ActivityIndicator size={20} color={colors.white} />
                  ) : (
                     <Text style={styles.submitButtonText}>Create Job</Text>
                  )}
               </Pressable>

               {/* Server error */}
               {error && (
                  <Text style={styles.serverError}>{error}</Text>
               )}
            </View>
         </KeyboardAvoidingView>
      </Modal>
   );
});

const styles = StyleSheet.create({
   keyboardView: {
      flex: 1,
   },
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
      marginBottom: spacing.space5,
   },
   title: {
      fontSize: typography.heading.fontSize,
      fontWeight: typography.heading.fontWeight,
      color: colors.textPrimary,
   },
   closeButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
   },
   fieldGroup: {
      marginBottom: spacing.space5,
   },
   label: {
      fontSize: typography.overline.fontSize,
      fontWeight: typography.overline.fontWeight,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.textSecondary,
      marginBottom: spacing.space2,
   },
   input: {
      height: 52,
      backgroundColor: colors.bgInput,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.space4,
      fontSize: typography.bodyLg.fontSize,
      color: colors.textPrimary,
   },
   inputError: {
      borderColor: colors.statusError,
   },
   inputFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.space1,
   },
   errorText: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.statusError,
   },
   charCount: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.textSecondary,
      marginLeft: "auto",
   },
   submitButton: {
      height: 52,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.space6,
   },
   submitButtonPressed: {
      backgroundColor: colors.accentHover,
      transform: [{ scale: 0.98 }],
   },
   submitButtonLoading: {
      opacity: 0.7,
   },
   submitButtonText: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
      color: colors.white,
   },
   serverError: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.statusError,
      textAlign: "center",
      marginTop: spacing.space3,
   },
});
