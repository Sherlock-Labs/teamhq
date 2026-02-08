import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "../../lib/tokens";

interface TranscriptViewProps {
  text: string;
  isLive: boolean;
}

export function TranscriptView({ text, isLive }: TranscriptViewProps) {
  const scrollRef = React.useRef<ScrollView>(null);

  // Auto-scroll to bottom as text grows
  React.useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [text, isLive]);

  if (!text && isLive) {
    return <ListeningPlaceholder />;
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(150)}>
        <Text
          style={styles.text}
          accessibilityLiveRegion="polite"
        >
          {text}
          {isLive && <BlinkingCursor />}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

function ListeningPlaceholder() {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.placeholderContainer}>
      <Animated.Text style={[styles.placeholder, animatedStyle]}>
        Listening...
      </Animated.Text>
    </View>
  );
}

function BlinkingCursor() {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.cursor, animatedStyle]}>
      {"\u258F"}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 180, // roughly 6 lines at textLg
    paddingHorizontal: tokens.space6,
  },
  text: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textLg,
    color: tokens.textPrimary,
    lineHeight: tokens.textLg * 1.625,
    textAlign: "center",
  },
  cursor: {
    color: tokens.accent,
    fontSize: tokens.textLg,
  },
  placeholderContainer: {
    alignItems: "center",
    paddingHorizontal: tokens.space6,
  },
  placeholder: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textLg,
    color: tokens.textMuted,
    fontStyle: "italic",
  },
});
