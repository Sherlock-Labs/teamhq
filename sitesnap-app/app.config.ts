import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
   ...config,
   name: "SiteSnap",
   slug: "sitesnap",
   version: "1.0.0",
   scheme: "sitesnap",
   orientation: "portrait",
   icon: "./assets/icon.png",
   userInterfaceStyle: "dark",
   splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0C0E12",
   },
   ios: {
      supportsTablet: false,
      bundleIdentifier: "com.sherlocklabs.sitesnap",
      usesIAP: true,
      infoPlist: {
         NSCameraUsageDescription:
            "SiteSnap needs camera access to take job site photos.",
         NSPhotoLibraryUsageDescription:
            "SiteSnap needs photo library access to import existing job site photos.",
         NSPhotoLibraryAddUsageDescription:
            "SiteSnap saves comparison images and photos to your camera roll.",
      },
   },
   android: {
      adaptiveIcon: {
         foregroundImage: "./assets/adaptive-icon.png",
         backgroundColor: "#0C0E12",
      },
      package: "com.sherlocklabs.sitesnap",
   },
   plugins: [
      "expo-router",
      "expo-secure-store",
      [
         "expo-camera",
         {
            cameraPermission:
               "SiteSnap needs camera access to take job site photos.",
         },
      ],
      [
         "expo-image-picker",
         {
            photosPermission:
               "SiteSnap needs photo library access to import existing job site photos.",
         },
      ],
      [
         "expo-media-library",
         {
            photosPermission:
               "SiteSnap saves comparison images to your camera roll.",
            savePhotosPermission:
               "SiteSnap saves comparison images to your camera roll.",
         },
      ],
   ],
   extra: {
      apiUrl: process.env.API_URL ?? "http://localhost:3001",
      clerkPublishableKey:
         process.env.CLERK_PUBLISHABLE_KEY ?? "pk_test_placeholder",
      posthogApiKey: process.env.POSTHOG_API_KEY ?? "",
      posthogHost:
         process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      eas: {
         projectId: process.env.EAS_PROJECT_ID ?? "",
      },
   },
});
