import React, { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, {
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated";
import { tokens } from "../../lib/tokens";
import { agents, Agent } from "../../lib/agents";
import { AgentCard } from "../../components/team/AgentCard";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COLUMN_GAP = tokens.space3;
const HORIZONTAL_PADDING = tokens.space4;
const CARD_WIDTH =
  (SCREEN_WIDTH - 2 * HORIZONTAL_PADDING - COLUMN_GAP) / 2;

export default function TeamScreen() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item, index }: { item: Agent; index: number }) => {
      const enterAnimation = reducedMotion
        ? undefined
        : FadeInUp.delay(index * 50)
            .springify()
            .damping(20);

      return (
        <Animated.View
          entering={enterAnimation}
          style={styles.cardWrapper}
        >
          <AgentCard
            agent={item}
            onPress={() => setSelectedAgent(item)}
            cardWidth={CARD_WIDTH}
          />
        </Animated.View>
      );
    },
    [reducedMotion],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Team
        </Text>
        <Text style={styles.subtitle}>{agents.length} agents</Text>
      </View>

      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + tokens.space6 },
        ]}
        showsVerticalScrollIndicator={false}
        accessibilityRole="list"
      />

      {/* Agent Detail Bottom Sheet (modal) */}
      <Modal
        visible={selectedAgent !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAgent(null)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={styles.sheetBackdropTouchable}
            onPress={() => setSelectedAgent(null)}
          />
          <View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + tokens.space6 },
            ]}
            accessibilityViewIsModal
          >
            <View style={styles.handle} />
            {selectedAgent && (
              <View style={styles.sheetContent}>
                <Image
                  source={selectedAgent.avatar}
                  style={styles.sheetAvatar}
                  contentFit="cover"
                  transition={200}
                />
                <Text style={styles.sheetName}>{selectedAgent.name}</Text>
                <Text style={styles.sheetRole}>{selectedAgent.role}</Text>
                <Text style={styles.sheetDescription}>
                  {selectedAgent.description}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bgPrimary,
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: tokens.space4,
    paddingBottom: tokens.space4,
  },
  title: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.text2xl,
    color: tokens.textPrimary,
  },
  subtitle: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    marginTop: tokens.space1,
  },
  list: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
  },
  cardWrapper: {
    flex: 1,
  },

  // Bottom sheet
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    backgroundColor: tokens.bgCard,
    borderTopLeftRadius: tokens.radiusXl,
    borderTopRightRadius: tokens.radiusXl,
    minHeight: "40%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: tokens.bgCardHover,
    borderRadius: tokens.radiusFull,
    alignSelf: "center",
    marginTop: tokens.space2,
  },
  sheetContent: {
    alignItems: "center",
    paddingHorizontal: tokens.space6,
    paddingTop: tokens.space4,
  },
  sheetAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  sheetName: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.textXl,
    color: tokens.textPrimary,
    marginTop: tokens.space3,
    textAlign: "center",
  },
  sheetRole: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.accent,
    marginTop: tokens.space1,
    textAlign: "center",
  },
  sheetDescription: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    lineHeight: tokens.textSm * tokens.leadingRelaxed,
    marginTop: tokens.space4,
    textAlign: "center",
    maxWidth: 300,
  },
});
