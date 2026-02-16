/**
 * Auth Layout
 * Stack layout for sign-in and sign-up screens.
 */
import { Stack } from "expo-router";
import { colors } from "@/lib/tokens";

export default function AuthLayout() {
   return (
      <Stack
         screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgPrimary },
            animation: "slide_from_right",
         }}
      />
   );
}
