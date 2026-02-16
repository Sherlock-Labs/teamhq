/**
 * Toast Component
 * Brief feedback notifications. Slides down from top, auto-dismisses.
 * Design spec: Section 6.1
 */
import React, { useEffect, useRef, useCallback } from "react";
import {
   View,
   Text,
   Animated,
   StyleSheet,
   Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, AlertCircle, Info } from "lucide-react-native";
import { colors, spacing, radii, typography, shadows } from "@/lib/tokens";

type ToastType = "success" | "error" | "info";

interface ToastData {
   message: string;
   type: ToastType;
   id: string;
}

interface ToastProps {
   toast: ToastData | null;
   onDismiss: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const AUTO_DISMISS_MS = 2500;

const ICONS: Record<ToastType, React.ReactNode> = {
   success: <Check size={18} color={colors.statusSuccess} strokeWidth={2} />,
   error: (
      <AlertCircle size={18} color={colors.statusError} strokeWidth={2} />
   ),
   info: <Info size={18} color={colors.accent} strokeWidth={2} />,
};

export const Toast = React.memo(function Toast({
   toast,
   onDismiss,
}: ToastProps) {
   const insets = useSafeAreaInsets();
   const translateY = useRef(new Animated.Value(-100)).current;
   const opacity = useRef(new Animated.Value(0)).current;
   const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   const dismiss = useCallback(() => {
      Animated.parallel([
         Animated.timing(translateY, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
         }),
         Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
         }),
      ]).start(() => {
         onDismiss();
      });
   }, [translateY, opacity, onDismiss]);

   useEffect(() => {
      if (toast) {
         // Show
         Animated.parallel([
            Animated.timing(translateY, {
               toValue: 0,
               duration: 200,
               useNativeDriver: true,
            }),
            Animated.timing(opacity, {
               toValue: 1,
               duration: 200,
               useNativeDriver: true,
            }),
         ]).start();

         // Auto-dismiss
         if (timerRef.current) clearTimeout(timerRef.current);
         timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
      }

      return () => {
         if (timerRef.current) clearTimeout(timerRef.current);
      };
   }, [toast, translateY, opacity, dismiss]);

   if (!toast) return null;

   return (
      <Animated.View
         style={[
            styles.container,
            {
               top: insets.top + spacing.space2,
               transform: [{ translateY }],
               opacity,
            },
         ]}
         accessibilityRole="alert"
         accessibilityLiveRegion="polite"
      >
         <View style={styles.content}>
            {ICONS[toast.type]}
            <Text style={styles.text} numberOfLines={2}>
               {toast.message}
            </Text>
         </View>
      </Animated.View>
   );
});

export type { ToastData, ToastType };

const styles = StyleSheet.create({
   container: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 1000,
      alignItems: "center",
   },
   content: {
      flexDirection: "row",
      alignItems: "center",
      height: 44,
      maxWidth: SCREEN_WIDTH * 0.8,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.space4,
      gap: spacing.space2,
      ...shadows.md,
   },
   text: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textPrimary,
      flexShrink: 1,
   },
});
