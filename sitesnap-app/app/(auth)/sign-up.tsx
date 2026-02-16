/**
 * Sign Up Screen
 * Email/password registration with Google OAuth option.
 * Design spec: Section 4.9
 */
import React, { useState, useCallback } from "react";
import {
   View,
   Text,
   TextInput,
   Pressable,
   ActivityIndicator,
   StyleSheet,
   ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useRouter, Link } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { colors, spacing, radii, typography } from "@/lib/tokens";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
   const insets = useSafeAreaInsets();
   const router = useRouter();
   const { signUp, setActive, isLoaded } = useSignUp();
   const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [isGoogleLoading, setIsGoogleLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const handleSignUp = useCallback(async () => {
      if (!isLoaded) return;
      setError(null);
      setIsLoading(true);

      try {
         const result = await signUp.create({
            emailAddress: email,
            password,
         });

         if (result.status === "complete" && result.createdSessionId) {
            await setActive({ session: result.createdSessionId });
            router.replace("/(app)/home");
         } else {
            // May need email verification -- handle pending state
            setError(
               "Please check your email to verify your account.",
            );
         }
      } catch (err: unknown) {
         const message =
            err instanceof Error
               ? err.message
               : "Sign up failed. Try again.";
         setError(message);
      } finally {
         setIsLoading(false);
      }
   }, [isLoaded, email, password, signUp, setActive, router]);

   const handleGoogleSignUp = useCallback(async () => {
      setError(null);
      setIsGoogleLoading(true);

      try {
         const { createdSessionId, setActive: setOAuthActive } =
            await startOAuthFlow();

         if (createdSessionId && setOAuthActive) {
            await setOAuthActive({ session: createdSessionId });
            router.replace("/(app)/home");
         }
      } catch (err: unknown) {
         const message =
            err instanceof Error
               ? err.message
               : "Google sign up failed. Try again.";
         setError(message);
      } finally {
         setIsGoogleLoading(false);
      }
   }, [startOAuthFlow, router]);

   return (
      <ScrollView
         style={[styles.container, { paddingTop: insets.top }]}
         contentContainerStyle={styles.contentContainer}
         keyboardShouldPersistTaps="handled"
      >
         {/* Back button */}
         <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
         >
            <ChevronLeft
               size={24}
               color={colors.textSecondary}
               strokeWidth={2}
            />
         </Pressable>

         <Text style={styles.heading}>Create your account</Text>

         {/* Email input */}
         <View style={styles.fieldGroup}>
            <TextInput
               value={email}
               onChangeText={setEmail}
               placeholder="Email"
               placeholderTextColor={colors.textTertiary}
               style={styles.input}
               autoCapitalize="none"
               keyboardType="email-address"
               textContentType="emailAddress"
               autoComplete="email"
               accessibilityLabel="Email address"
            />
         </View>

         {/* Password input */}
         <View style={styles.fieldGroup}>
            <TextInput
               value={password}
               onChangeText={setPassword}
               placeholder="Password"
               placeholderTextColor={colors.textTertiary}
               style={styles.input}
               secureTextEntry
               textContentType="newPassword"
               autoComplete="new-password"
               accessibilityLabel="Password"
            />
         </View>

         {/* Error message */}
         {error && <Text style={styles.error}>{error}</Text>}

         {/* Continue button */}
         <Pressable
            onPress={handleSignUp}
            disabled={isLoading || isGoogleLoading}
            style={({ pressed }) => [
               styles.primaryButton,
               pressed && !isLoading && styles.primaryButtonPressed,
               isLoading && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create account"
         >
            {isLoading ? (
               <ActivityIndicator size={20} color={colors.white} />
            ) : (
               <Text style={styles.primaryButtonText}>Continue</Text>
            )}
         </Pressable>

         {/* Divider */}
         <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
         </View>

         {/* Google button */}
         <Pressable
            onPress={handleGoogleSignUp}
            disabled={isLoading || isGoogleLoading}
            style={({ pressed }) => [
               styles.socialButton,
               pressed && !isGoogleLoading && styles.socialButtonPressed,
               isGoogleLoading && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
         >
            {isGoogleLoading ? (
               <ActivityIndicator size={20} color={colors.textPrimary} />
            ) : (
               <>
                  <Text style={styles.googleG}>G</Text>
                  <Text style={styles.socialButtonText}>
                     Continue with Google
                  </Text>
               </>
            )}
         </Pressable>

         {/* Sign in link */}
         <View style={styles.switchRow}>
            <Text style={styles.switchText}>
               Already have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
               <Pressable accessibilityRole="link">
                  <Text style={styles.switchLink}>Sign in</Text>
               </Pressable>
            </Link>
         </View>
      </ScrollView>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
   },
   contentContainer: {
      paddingHorizontal: spacing.space8,
      paddingBottom: spacing.space10,
   },
   backButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: -spacing.space3,
      marginBottom: spacing.space4,
   },
   heading: {
      fontSize: typography.heading.fontSize,
      fontWeight: typography.heading.fontWeight,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.space8,
   },
   fieldGroup: {
      marginBottom: spacing.space5,
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
   error: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.statusError,
      textAlign: "center",
      marginBottom: spacing.space4,
   },
   primaryButton: {
      height: 52,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      justifyContent: "center",
      alignItems: "center",
   },
   primaryButtonPressed: {
      backgroundColor: colors.accentHover,
      transform: [{ scale: 0.98 }],
   },
   primaryButtonText: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
      color: colors.white,
   },
   buttonDisabled: {
      opacity: 0.5,
   },
   divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.space6,
   },
   dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
   },
   dividerText: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.textTertiary,
      marginHorizontal: spacing.space3,
   },
   socialButton: {
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
   socialButtonPressed: {
      backgroundColor: colors.bgHover,
   },
   googleG: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
   },
   socialButtonText: {
      fontSize: typography.body.fontSize,
      fontWeight: "500",
      color: colors.textPrimary,
   },
   switchRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: spacing.space6,
   },
   switchText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
   },
   switchLink: {
      fontSize: typography.body.fontSize,
      fontWeight: "500",
      color: colors.accent,
   },
});
