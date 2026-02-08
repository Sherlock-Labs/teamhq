# React Native & Expo Conventions

**Category:** Development
**Used by:** Zara, Leo, Andrei
**Last updated:** 2026-02-07

## When to Use

When building or maintaining a React Native app using Expo's managed workflow. This is the team's default mobile stack.

## Project Structure

```
app/                    # Expo Router file-based routes
  (tabs)/               # Tab layout group
    _layout.tsx         # Tab navigator config
    index.tsx           # Home tab
    search.tsx          # Search tab
    profile.tsx         # Profile tab
  (auth)/               # Auth flow group
    _layout.tsx         # Stack navigator for auth
    login.tsx
    register.tsx
  _layout.tsx           # Root layout (providers, fonts, splash)
  +not-found.tsx        # 404 screen
components/             # Shared UI components
  ui/                   # Primitives (Button, Input, Card, etc.)
  [feature]/            # Feature-specific components
hooks/                  # Custom hooks
lib/                    # Utilities, API client, constants
  api.ts                # API client (fetch wrapper or tRPC)
  constants.ts          # App-wide constants
  storage.ts            # AsyncStorage helpers
stores/                 # State management (Zustand stores)
types/                  # Shared TypeScript types
assets/                 # Static assets (images, fonts)
```

## App Configuration

Use `app.config.ts` (not `app.json`) for dynamic configuration:

```ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "AppName",
  slug: "app-name",
  version: "1.0.0",
  scheme: "appname",
  orientation: "portrait",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#09090b",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.sherlocklabs.appname",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#09090b",
    },
    package: "com.sherlocklabs.appname",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    ["expo-notifications", { icon: "./assets/notification-icon.png" }],
  ],
});
```

## Environment Variables

Use `expo-constants` + `app.config.ts` for env vars — never hardcode:

```ts
// app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    apiUrl: process.env.API_URL ?? "http://localhost:3002",
    eas: { projectId: "your-project-id" },
  },
});

// lib/constants.ts
import Constants from "expo-constants";

export const API_URL = Constants.expoConfig?.extra?.apiUrl as string;
```

For secrets that differ per build profile, use EAS environment variables:
```bash
eas secret:create --name API_URL --value https://api.example.com --scope project
```

## Expo Router Patterns

### Root Layout (providers, fonts, splash screen)

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
```

### Type-Safe Navigation

```tsx
import { router } from "expo-router";

// Navigate with type-safe params
router.push({ pathname: "/project/[id]", params: { id: project.id } });

// Go back
router.back();

// Replace (no back gesture)
router.replace("/login");
```

### Route Params

```tsx
// app/project/[id].tsx
import { useLocalSearchParams } from "expo-router";

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // ...
}
```

## EAS Build & Update

### Build Profiles (`eas.json`)

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {
      "ios": { "appleId": "team@sherlocklabs.io", "ascAppId": "123456789" }
    }
  }
}
```

### Common Commands

```bash
# Development build (for simulators)
eas build --profile development --platform ios

# Preview build (for internal testers via TestFlight / internal track)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# OTA update (skips app store review)
eas update --branch production --message "Fix crash on profile screen"

# Submit to stores
eas submit --platform ios --latest
```

### OTA Update Strategy

- Use `expo-updates` for JS-only changes (bug fixes, copy, styling)
- OTA updates skip app store review — use for non-breaking changes only
- Native code changes (new SDK modules, config plugin changes) require a new build
- Set `updates.fallbackToCacheTimeout: 0` for instant startup (loads cached bundle, downloads update in background)

## Expo SDK Module Usage

Prefer Expo modules over third-party alternatives:

| Need | Use | Not |
|------|-----|-----|
| Camera | `expo-camera` | `react-native-camera` |
| Image picker | `expo-image-picker` | `react-native-image-picker` |
| Secure storage | `expo-secure-store` | `@react-native-async-storage` (for secrets) |
| Notifications | `expo-notifications` | `react-native-push-notification` |
| Biometrics | `expo-local-authentication` | `react-native-biometrics` |
| Location | `expo-location` | `react-native-geolocation` |
| File system | `expo-file-system` | `react-native-fs` |
| Haptics | `expo-haptics` | `react-native-haptic-feedback` |
| Web browser | `expo-web-browser` | `react-native-inappbrowser` |
| Image display | `expo-image` | `react-native-fast-image` |

Only reach for third-party native packages if an Expo module genuinely doesn't cover the use case. If a third-party package requires a custom dev client, get Andrei's approval first.

## API Client Pattern

```ts
// lib/api.ts
import { API_URL } from "./constants";
import * as SecureStore from "expo-secure-store";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("auth_token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }

  return res.json();
}

class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API ${status}: ${body}`);
  }
}
```

## Anti-patterns

- Using `app.json` instead of `app.config.ts` — lose dynamic config, env vars
- Hardcoding API URLs or secrets in source code
- Ejecting from managed workflow for something Expo already supports
- Using `react-native-navigation` instead of Expo Router — different paradigm, not compatible with Expo's file-based routing
- Installing packages with `npm install` instead of `npx expo install` — Expo pins compatible versions
- Ignoring the Expo SDK version compatibility matrix when adding packages
- Storing auth tokens in AsyncStorage instead of SecureStore
