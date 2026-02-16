/**
 * Entry Redirect
 * Redirects signed-in users to (app) and signed-out users to (auth).
 */
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

export default function Index() {
   const { isSignedIn, isLoaded } = useAuth();

   if (!isLoaded) {
      // Clerk still loading -- stay on splash
      return null;
   }

   if (isSignedIn) {
      return <Redirect href="/(app)/home" />;
   }

   return <Redirect href="/(auth)/sign-in" />;
}
