import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TeamHQ",
  slug: "teamhq-mobile",
  version: "1.0.0",
  scheme: "teamhq",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#09090b",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.sherlocklabs.teamhq",
    infoPlist: {
      NSMicrophoneUsageDescription:
        "TeamHQ uses the microphone to transcribe voice project briefs.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#09090b",
    },
    package: "com.sherlocklabs.teamhq",
    permissions: ["android.permission.RECORD_AUDIO"],
    edgeToEdgeEnabled: true,
  },
  plugins: ["expo-router", "expo-font"],
  extra: {
    defaultApiUrl: "http://localhost:3002",
  },
});
