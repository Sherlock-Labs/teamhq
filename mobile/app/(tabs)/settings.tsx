import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../../lib/tokens";
import { useSettingsStore } from "../../stores/settings";
import { Button } from "../../components/ui/Button";

type ConnectionStatus = "idle" | "testing" | "connected" | "failed";
type VoxtralStatus = "idle" | "checking" | "reachable" | "unreachable";

export default function SettingsScreen() {
  const { apiUrl, setApiUrl, setConnectionStatus } = useSettingsStore();
  const [urlInput, setUrlInput] = useState(apiUrl);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("idle");
  const [voxtralStatus, setVoxtralStatus] = useState<VoxtralStatus>("idle");
  const [voxtralLatency, setVoxtralLatency] = useState<number | null>(null);

  // Debounced save of API URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (urlInput !== apiUrl) {
        setApiUrl(urlInput);
        setConnStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [urlInput, apiUrl, setApiUrl]);

  // Check Voxtral health on mount
  useEffect(() => {
    checkVoxtralHealth();
  }, [apiUrl]);

  const testConnection = useCallback(async () => {
    setConnStatus("testing");
    try {
      const res = await fetch(`${urlInput}/api/projects`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setConnStatus("connected");
        setConnectionStatus(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setConnStatus("failed");
        setConnectionStatus(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setConnStatus("failed");
      setConnectionStatus(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [urlInput, setConnectionStatus]);

  const checkVoxtralHealth = useCallback(async () => {
    setVoxtralStatus("checking");
    try {
      const start = Date.now();
      const res = await fetch(`${apiUrl}/api/voice/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        if (data.voxtral === "ok") {
          setVoxtralStatus("reachable");
          setVoxtralLatency(data.latencyMs ?? latency);
        } else {
          setVoxtralStatus("unreachable");
          setVoxtralLatency(null);
        }
      } else {
        setVoxtralStatus("unreachable");
        setVoxtralLatency(null);
      }
    } catch {
      setVoxtralStatus("unreachable");
      setVoxtralLatency(null);
    }
  }, [apiUrl]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>

        {/* Connection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONNECTION</Text>
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>API Base URL</Text>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://localhost:3002"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            selectionColor={`${tokens.accent}4D`}
            cursorColor={tokens.accent}
            accessibilityLabel="API base URL"
            accessibilityHint="Enter the URL of your TeamHQ server"
          />

          <View style={styles.testRow}>
            <Button
              label="Test Connection"
              onPress={testConnection}
              variant="secondary"
              loading={connStatus === "testing"}
            />
            <StatusDot status={connStatus} />
          </View>

          <View style={styles.voxtralRow}>
            <Text style={styles.fieldLabel}>Voxtral Transcription</Text>
            <View style={styles.statusRow}>
              <VoxtralDot status={voxtralStatus} />
              <Text style={styles.statusText}>
                {voxtralStatus === "checking" && "Checking..."}
                {voxtralStatus === "reachable" &&
                  `Reachable${voxtralLatency ? ` (${voxtralLatency}ms)` : ""}`}
                {voxtralStatus === "unreachable" && "Unreachable"}
                {voxtralStatus === "idle" && "Not checked"}
              </Text>
            </View>
          </View>
        </View>

        {/* Network Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NETWORK HELP</Text>
          <View style={styles.divider} />
          <Text style={styles.helpText}>To connect from your phone:</Text>
          <Text style={styles.helpBullet}>
            {"\u2022"} On same WiFi: Use your Mac's local IP (e.g.,
            192.168.1.x:3002)
          </Text>
          <Text style={styles.helpBullet}>
            {"\u2022"} From anywhere: Use Tailscale hostname (e.g.,
            mac.tailnet:3002)
          </Text>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.divider} />
          <Text style={styles.aboutName}>TeamHQ Mobile</Text>
          <Text style={styles.aboutVersion}>v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  if (status === "idle") return null;

  let color: string;
  let label: string;
  switch (status) {
    case "testing":
      color = tokens.accent;
      label = "Testing...";
      break;
    case "connected":
      color = tokens.statusCompleted;
      label = "Connected";
      break;
    case "failed":
      color = tokens.statusFailed;
      label = "Failed";
      break;
  }

  return (
    <View
      style={styles.statusRow}
      accessibilityLabel={`Connection status: ${label}`}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function VoxtralDot({ status }: { status: VoxtralStatus }) {
  let color: string;
  switch (status) {
    case "checking":
      color = tokens.accent;
      break;
    case "reachable":
      color = tokens.statusCompleted;
      break;
    case "unreachable":
      color = tokens.statusFailed;
      break;
    default:
      color = tokens.textMuted;
  }

  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bgPrimary,
  },
  content: {
    paddingHorizontal: tokens.space4,
    paddingBottom: tokens.space12,
  },
  title: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.text2xl,
    color: tokens.textPrimary,
    paddingTop: tokens.space4,
    marginBottom: tokens.space6,
  },

  // Sections
  section: {
    marginBottom: tokens.space8,
  },
  sectionLabel: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.textSm,
    color: tokens.textMuted,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.border,
    marginTop: tokens.space2,
    marginBottom: tokens.space3,
  },

  // Fields
  fieldLabel: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.textMuted,
    marginBottom: tokens.space2,
  },
  input: {
    backgroundColor: tokens.bgCard,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusMd,
    padding: tokens.space3,
    fontFamily: "Inter-Regular",
    fontSize: tokens.textBase,
    color: tokens.textPrimary,
  },

  // Test connection
  testRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: tokens.space3,
    gap: tokens.space3,
  },

  // Status indicators
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space2,
    marginTop: tokens.space2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
  },

  // Voxtral
  voxtralRow: {
    marginTop: tokens.space6,
  },

  // Help
  helpText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    lineHeight: tokens.textSm * tokens.leadingRelaxed,
    marginBottom: tokens.space2,
  },
  helpBullet: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    lineHeight: tokens.textSm * tokens.leadingRelaxed,
    paddingLeft: tokens.space2,
    marginBottom: tokens.space1,
  },

  // About
  aboutName: {
    fontFamily: "Inter-Medium",
    fontSize: tokens.textSm,
    color: tokens.textPrimary,
  },
  aboutVersion: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textXs,
    color: tokens.textMuted,
    marginTop: tokens.space1,
  },
});
