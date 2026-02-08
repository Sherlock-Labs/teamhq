# Mobile Component Patterns

**Category:** Development
**Used by:** Zara, Leo, Robert
**Last updated:** 2026-02-07

## When to Use

When building React Native components for the mobile app. These patterns ensure consistency, performance, and platform-native feel.

## StyleSheet Conventions

Always use `StyleSheet.create()` — never inline styles:

```tsx
import { StyleSheet, View, Text } from "react-native";

export function ProjectCard({ title, description }: ProjectCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bgCard,
    borderRadius: tokens.radiusLg,
    padding: tokens.space6,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  title: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textBase,
    color: tokens.textPrimary,
  },
  description: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    marginTop: tokens.space2,
  },
});
```

### Design Tokens

Mirror the web theme tokens into a mobile-friendly format:

```ts
// lib/tokens.ts
export const tokens = {
  // Colors
  bgPrimary: "#09090b",
  bgCard: "#18181b",
  bgCardHover: "#27272a",
  border: "#27272a",
  borderHover: "#3f3f46",
  textPrimary: "#fafafa",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  accent: "#818cf8",
  accentHover: "#6366f1",

  // Spacing (numeric for RN)
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48,

  // Typography
  textXs: 12,
  textSm: 14,
  textBase: 16,
  textLg: 18,
  textXl: 20,
  text2xl: 24,
  text3xl: 30,

  // Radii
  radiusSm: 6,
  radiusMd: 8,
  radiusLg: 12,
  radiusXl: 16,
  radiusFull: 9999,
} as const;
```

## Platform-Specific Code

### Simple Differences — `Platform.select()`

```tsx
import { Platform, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
});
```

### Significant Differences — Platform Files

```
components/
  DatePicker.ios.tsx      # iOS-specific implementation
  DatePicker.android.tsx  # Android-specific implementation
  DatePicker.tsx          # Shared types/exports (optional)
```

Import resolves automatically by platform:
```tsx
import { DatePicker } from "@/components/DatePicker";
```

## Safe Areas

Always handle safe areas — notches, home indicators, status bars:

```tsx
import { SafeAreaView } from "react-native-safe-area-context";

export function ScreenWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}
```

Use `edges` to control which sides get insets. Bottom tabs already handle bottom inset — don't double-pad.

For screens inside a scroll view:

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScrollScreen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + tokens.space6 }}
    >
      {children}
    </ScrollView>
  );
}
```

## Keyboard Avoidance

```tsx
import { KeyboardAvoidingView, Platform } from "react-native";

export function FormScreen({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
```

For forms with many fields, wrap in `KeyboardAwareScrollView` from `react-native-keyboard-aware-scroll-view` if the basic approach isn't enough.

## List Performance

### FlatList — Default Choice

```tsx
import { FlatList } from "react-native";

<FlatList
  data={projects}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ProjectCard project={item} />}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={Platform.OS === "android"}
  getItemLayout={(_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

Key optimizations:
- Always provide `keyExtractor`
- Use `getItemLayout` when items have fixed height (skips measurement)
- `React.memo` on `renderItem` components
- `removeClippedSubviews` on Android (can cause issues on iOS)
- `windowSize={5}` balances memory vs scroll smoothness

### FlashList — For Large Lists (1000+ items)

```tsx
import { FlashList } from "@shopify/flash-list";

<FlashList
  data={items}
  renderItem={({ item }) => <ItemRow item={item} />}
  estimatedItemSize={72}
  keyExtractor={(item) => item.id}
/>
```

FlashList recycles views like native UITableView/RecyclerView. Use it when FlatList stutters on large datasets. Requires `estimatedItemSize`.

## Image Handling

Use `expo-image` instead of the built-in `Image` component:

```tsx
import { Image } from "expo-image";

<Image
  source={{ uri: avatarUrl }}
  style={styles.avatar}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
/>
```

Benefits over `<Image>`:
- Disk and memory caching built in
- Blurhash/thumbhash placeholders
- Animated transitions
- Better performance for lists of images

## Pressable Pattern

Use `Pressable` (not `TouchableOpacity`) for all tappable elements:

```tsx
import { Pressable, StyleSheet } from "react-native";

export function Button({ label, onPress, variant = "primary" }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        pressed && styles.buttonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: tokens.accent,
    paddingVertical: tokens.space3,
    paddingHorizontal: tokens.space6,
    borderRadius: tokens.radiusMd,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: tokens.border,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.textPrimary,
  },
});
```

## Loading / Empty / Error States

Every screen needs all three states. Standard pattern:

```tsx
export function ProjectListScreen() {
  const { data, isLoading, error, refetch } = useProjects();

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error.message} onRetry={refetch} />;
  if (data.length === 0) return <EmptyScreen title="No projects yet" />;

  return <FlatList data={data} renderItem={...} />;
}
```

### Shared State Components

```tsx
// components/ui/LoadingScreen.tsx
export function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={tokens.accent} />
    </View>
  );
}

// components/ui/ErrorScreen.tsx
export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && <Button label="Try Again" onPress={onRetry} />}
    </View>
  );
}

// components/ui/EmptyScreen.tsx
export function EmptyScreen({ title, description, action }: EmptyScreenProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDesc}>{description}</Text>}
      {action}
    </View>
  );
}
```

## Accessibility

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Delete project"
  accessibilityHint="Double tap to permanently delete this project"
  accessibilityState={{ disabled: isDeleting }}
  onPress={handleDelete}
>
```

Key rules:
- Every interactive element needs `accessibilityRole` and `accessibilityLabel`
- Use `accessibilityHint` for non-obvious actions
- Set `accessibilityState` for dynamic states (disabled, selected, checked)
- Group related elements with `accessible={true}` on the parent
- Test with VoiceOver (iOS) and TalkBack (Android) — don't just guess
- Support `useReducedMotion()` for animation preferences (see mobile-animations.md)

## State Management

### Local State — `useState` / `useReducer`

For single-screen state. Don't over-engineer.

### Shared State — Zustand

Preferred for app-wide state. Lightweight, TypeScript-friendly, no providers:

```ts
// stores/auth.ts
import { create } from "zustand";

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => set({ user, token }),
  clearAuth: () => set({ user: null, token: null }),
}));
```

### Server State — TanStack Query (React Query)

For API data. Handles caching, refetching, optimistic updates:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<Project[]>("/projects"),
    staleTime: 30_000,
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}
```

## Anti-patterns

- Inline styles — use `StyleSheet.create()` for performance (styles are sent to native once)
- Hardcoding colors/spacing — use the tokens object
- Using `ScrollView` for long lists — use `FlatList` or `FlashList`
- Nesting `ScrollView` inside `ScrollView` — use `SectionList` or a flat structure
- Using `TouchableOpacity` — use `Pressable` (more flexible, better API)
- Ignoring safe areas — content will hide behind notches and home indicators
- Forgetting `accessibilityRole` on interactive elements
- Global state for everything — use local state when data doesn't leave the screen
- `any` types on props — always define proper interfaces
