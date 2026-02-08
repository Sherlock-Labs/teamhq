# Mobile Animation Patterns

**Category:** Development
**Used by:** Leo, Zara, Robert
**Last updated:** 2026-02-07

## When to Use

When implementing animations, transitions, and gesture-driven interactions in React Native. All animations should run on the UI thread at 60fps. This guide covers React Native Reanimated and Gesture Handler — the team's standard animation stack.

## Core Concepts

### Shared Values

Shared values live on the UI thread. Updating them doesn't trigger React re-renders:

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

export function ScaleButton({ children, onPress }: ScaleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={onPress}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
```

### Animation Functions

| Function | Use Case |
|----------|----------|
| `withSpring` | Natural, bouncy motion. Buttons, cards, sheets. |
| `withTiming` | Precise, linear motion. Fades, progress bars. |
| `withDelay` | Stagger animations in a sequence. |
| `withSequence` | Chain animations one after another. |
| `withRepeat` | Looping animations. Spinners, pulses. |
| `withDecay` | Momentum-based. Fling gestures, scroll physics. |

### Spring Configs

Standard spring presets for consistency:

```ts
// lib/animation.ts
export const springs = {
  // Snappy — buttons, toggles, small elements
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },

  // Gentle — cards, modals, sheets
  gentle: { damping: 20, stiffness: 180, mass: 1 },

  // Bouncy — playful reveals, success states
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },

  // Heavy — large panels, full-screen transitions
  heavy: { damping: 25, stiffness: 150, mass: 1.2 },
} as const;
```

Usage:
```tsx
scale.value = withSpring(1, springs.snappy);
translateY.value = withSpring(0, springs.gentle);
```

## Gesture Handler Patterns

### Basic Gesture

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

export function DraggableCard() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* content */}
      </Animated.View>
    </GestureDetector>
  );
}
```

### Gesture Composition

Combine gestures with `Gesture.Simultaneous()`, `Gesture.Exclusive()`, or `Gesture.Race()`:

```tsx
// Pinch-to-zoom + pan at the same time
const pinch = Gesture.Pinch()
  .onUpdate((e) => { scale.value = e.scale; });

const pan = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX;
    translateY.value = e.translationY;
  });

const composed = Gesture.Simultaneous(pinch, pan);

return (
  <GestureDetector gesture={composed}>
    <Animated.View style={animatedStyle} />
  </GestureDetector>
);
```

### Swipe-to-Dismiss

Common pattern for cards, notifications, bottom sheets:

```tsx
export function SwipeToDismiss({ children, onDismiss, threshold = 150 }: SwipeToDismissProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])  // Don't activate on vertical scroll
    .onUpdate((e) => {
      translateX.value = e.translationX;
      opacity.value = interpolate(
        Math.abs(e.translationX),
        [0, threshold],
        [1, 0.3],
        Extrapolation.CLAMP
      );
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > threshold) {
        const direction = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * 400, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateX.value = withSpring(0, springs.snappy);
        opacity.value = withSpring(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
```

## Bottom Sheet

Standard pattern using gesture + Reanimated:

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Dimensions } from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SNAP_POINTS = [SCREEN_HEIGHT * 0.9, SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT * 0.15];

export function BottomSheet({ children, onClose }: BottomSheetProps) {
  const translateY = useSharedValue(SNAP_POINTS[1]);
  const context = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(e.translationY + context.value, SNAP_POINTS[2]);
    })
    .onEnd((e) => {
      // Snap to nearest point, or dismiss if dragged far down
      if (translateY.value > SNAP_POINTS[0] * 0.85) {
        translateY.value = withSpring(SCREEN_HEIGHT, springs.heavy, () => {
          runOnJS(onClose)();
        });
      } else {
        // Find nearest snap point
        const nearest = SNAP_POINTS.reduce((prev, curr) =>
          Math.abs(curr - translateY.value) < Math.abs(prev - translateY.value) ? curr : prev
        );
        translateY.value = withSpring(nearest, springs.gentle);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [SNAP_POINTS[2], SCREEN_HEIGHT],
      [0.5, 0],
    ),
  }));

  return (
    <>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, animatedStyle]}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
}
```

## Layout Animations

Automatic enter/exit animations for items in a list:

```tsx
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from "react-native-reanimated";

export function AnimatedList({ items }: AnimatedListProps) {
  return (
    <Animated.FlatList
      data={items}
      keyExtractor={(item) => item.id}
      itemLayoutAnimation={LinearTransition.springify().damping(20).stiffness(200)}
      renderItem={({ item, index }) => (
        <Animated.View
          entering={FadeInDown.delay(index * 50).springify()}
          exiting={FadeOutLeft.duration(200)}
        >
          <ItemCard item={item} />
        </Animated.View>
      )}
    />
  );
}
```

### Standard Enter/Exit Presets

```ts
// lib/animation.ts
import { FadeInDown, FadeInUp, FadeOutDown, FadeOutLeft, SlideInRight, SlideOutRight } from "react-native-reanimated";

export const entering = {
  fadeUp: FadeInUp.springify().damping(20).stiffness(200),
  fadeDown: FadeInDown.springify().damping(20).stiffness(200),
  slideRight: SlideInRight.springify().damping(20).stiffness(200),
};

export const exiting = {
  fadeDown: FadeOutDown.duration(200),
  fadeLeft: FadeOutLeft.duration(200),
  slideRight: SlideOutRight.duration(200),
};
```

## Interpolation

Map one value range to another:

```tsx
import { interpolate, Extrapolation } from "react-native-reanimated";

const animatedStyle = useAnimatedStyle(() => {
  const scale = interpolate(
    scrollY.value,
    [0, 100],           // input range
    [1, 0.8],           // output range
    Extrapolation.CLAMP // prevent values outside range
  );

  const opacity = interpolate(
    scrollY.value,
    [0, 50, 100],
    [1, 0.8, 0.3],
    Extrapolation.CLAMP
  );

  return { transform: [{ scale }], opacity };
});
```

### Color Interpolation

```tsx
import { interpolateColor } from "react-native-reanimated";

const animatedStyle = useAnimatedStyle(() => {
  const backgroundColor = interpolateColor(
    progress.value,
    [0, 1],
    ["#18181b", "#818cf8"]
  );
  return { backgroundColor };
});
```

## Scroll-Driven Animations

Collapsing headers, parallax, fade-on-scroll:

```tsx
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate } from "react-native-reanimated";

export function CollapsibleHeader({ children }: CollapsibleHeaderProps) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 120], [200, 80], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, 80], [1, 0.9], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.header, headerStyle]}>
        {/* header content */}
      </Animated.View>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
        {children}
      </Animated.ScrollView>
    </View>
  );
}
```

## Reduced Motion

Always respect user accessibility preferences:

```tsx
import { useReducedMotion } from "react-native-reanimated";

export function AnimatedCard({ children }: AnimatedCardProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      // Skip animation, go directly to final state
      scale.value = 1;
      opacity.value = 1;
    } else {
      scale.value = withSpring(1, springs.gentle);
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
```

Rules for reduced motion:
- Check `useReducedMotion()` at the top of any animated component
- When reduced motion is on: skip transitions, use instant state changes or simple opacity fades
- Layout animations can use `LinearTransition` with short duration instead of spring
- Never skip functional animations (progress indicators, loading states) — only decorative ones

## Performance Rules

1. **Never read shared values on the JS thread** — only inside `useAnimatedStyle`, `useAnimatedScrollHandler`, or worklets
2. **Use `runOnJS()` to call JS functions from worklets** — e.g., `runOnJS(onDismiss)()` inside gesture handlers
3. **Avoid `useAnimatedStyle` depending on React state** — derive everything from shared values
4. **Profile with `useFrameCallback`** to detect dropped frames:
   ```tsx
   useFrameCallback((frameInfo) => {
     if (frameInfo.timeSincePreviousFrame > 20) {
       console.warn("Dropped frame:", frameInfo.timeSincePreviousFrame);
     }
   });
   ```
5. **Keep `scrollEventThrottle={16}`** on animated scroll views (1 event per frame)
6. **Avoid animating `width`/`height`** — use `transform: [{ scale }]` instead (GPU-accelerated)
7. **Batch shared value updates** — multiple assignments in one callback are batched automatically

## Anti-patterns

- Using React state for animation values — causes JS bridge round-trips, stutters at 30fps
- Animating width/height/top/left instead of transform/opacity — triggers layout recalculation
- Forgetting `runOnJS()` when calling callbacks from worklets — crashes silently
- Using `Animated` from `react-native` instead of `react-native-reanimated` — old API, JS thread only
- Ignoring `useReducedMotion()` — accessibility violation, bad UX for motion-sensitive users
- `scrollEventThrottle` not set or set too high — choppy scroll-driven animations
- Creating shared values inside render without `useSharedValue` — memory leaks
- Over-animating — not everything needs to bounce. Use animation to clarify state changes, not to decorate
