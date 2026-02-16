/**
 * Root Layout
 * Wraps the app in ClerkProvider, QueryClientProvider, PostHogProvider, SafeAreaProvider.
 * Sets up IAP listeners and API token provider.
 */
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PostHogProvider } from "posthog-react-native";
import * as SecureStore from "expo-secure-store";
import { setTokenProvider } from "@/lib/api";
import { initIAP, cleanupIAP, setupPurchaseListeners, retryPendingReceipts } from "@/lib/iap";
import { CLERK_PUBLISHABLE_KEY, POSTHOG_API_KEY, POSTHOG_HOST } from "@/lib/constants";
import { ToastProvider } from "@/lib/toast-context";
import { colors } from "@/lib/tokens";

const queryClient = new QueryClient({
   defaultOptions: {
      queries: {
         staleTime: 30_000,
         retry: 2,
      },
   },
});

/** Clerk token cache using expo-secure-store */
const tokenCache = {
   async getToken(key: string): Promise<string | null> {
      try {
         return await SecureStore.getItemAsync(key);
      } catch {
         return null;
      }
   },
   async saveToken(key: string, value: string): Promise<void> {
      try {
         await SecureStore.setItemAsync(key, value);
      } catch {
         // Ignore save errors
      }
   },
   async clearToken(key: string): Promise<void> {
      try {
         await SecureStore.deleteItemAsync(key);
      } catch {
         // Ignore delete errors
      }
   },
};

/** Sets up the API token provider using Clerk's getToken */
function AuthBridge({ children }: { children: React.ReactNode }) {
   const { getToken } = useAuth();

   useEffect(() => {
      setTokenProvider(() => getToken());
   }, [getToken]);

   return <>{children}</>;
}

/** IAP initialization */
function IAPBridge({ children }: { children: React.ReactNode }) {
   useEffect(() => {
      initIAP();
      const cleanup = setupPurchaseListeners();
      retryPendingReceipts();

      return () => {
         cleanup();
         cleanupIAP();
      };
   }, []);

   return <>{children}</>;
}

export default function RootLayout() {
   return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
         <SafeAreaProvider>
            <ClerkProvider
               publishableKey={CLERK_PUBLISHABLE_KEY}
               tokenCache={tokenCache}
            >
               <ClerkLoaded>
                  <QueryClientProvider client={queryClient}>
                     <PostHogProvider
                        apiKey={POSTHOG_API_KEY}
                        options={{ host: POSTHOG_HOST }}
                     >
                        <AuthBridge>
                           <IAPBridge>
                              <ToastProvider>
                                 <StatusBar style="light" />
                                 <Stack
                                    screenOptions={{
                                       headerShown: false,
                                       contentStyle: {
                                          backgroundColor: colors.bgPrimary,
                                       },
                                       animation: "slide_from_right",
                                    }}
                                 />
                              </ToastProvider>
                           </IAPBridge>
                        </AuthBridge>
                     </PostHogProvider>
                  </QueryClientProvider>
               </ClerkLoaded>
            </ClerkProvider>
         </SafeAreaProvider>
      </GestureHandlerRootView>
   );
}
