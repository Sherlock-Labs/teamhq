/**
 * CameraFAB Component
 * Persistent floating camera button visible on all app screens.
 * Design spec: Section 4.3.1, Section 5.3
 */
import React from "react";
import {
   View,
   Text,
   Pressable,
   StyleSheet,
   Animated,
} from "react-native";
import { Camera } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, spacing, radii, shadows, typography } from "@/lib/tokens";

interface CameraFABProps {
   uploadQueueCount: number;
   onPress: () => void;
}

export const CameraFAB = React.memo(function CameraFAB({
   uploadQueueCount,
   onPress,
}: CameraFABProps) {
   const scaleAnim = React.useRef(new Animated.Value(1)).current;

   const handlePressIn = () => {
      Animated.timing(scaleAnim, {
         toValue: 0.93,
         duration: 100,
         useNativeDriver: true,
      }).start();
   };

   const handlePressOut = () => {
      Animated.timing(scaleAnim, {
         toValue: 1,
         duration: 100,
         useNativeDriver: true,
      }).start();
   };

   const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
   };

   return (
      <Animated.View
         style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
      >
         <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel={
               uploadQueueCount > 0
                  ? `Take photo, ${uploadQueueCount} photos uploading`
                  : "Take photo"
            }
         >
            <Camera size={28} color={colors.white} strokeWidth={2} />
         </Pressable>

         {uploadQueueCount > 0 && (
            <View style={styles.badge}>
               <Text style={styles.badgeText}>
                  {uploadQueueCount > 99
                     ? "99+"
                     : String(uploadQueueCount)}
               </Text>
            </View>
         )}
      </Animated.View>
   );
});

const styles = StyleSheet.create({
   container: {
      position: "absolute",
      alignSelf: "center",
      bottom: 12,
      zIndex: 100,
   },
   fab: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
      ...shadows.fab,
   },
   badge: {
      position: "absolute",
      top: -2,
      right: -2,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.statusWarning,
      borderWidth: 2,
      borderColor: colors.bgElevated,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
   },
   badgeText: {
      fontSize: typography.overline.fontSize,
      fontWeight: "700",
      color: colors.white,
      textAlign: "center",
   },
});
