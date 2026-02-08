import { useCallback, useState } from "react";

// NOTE: @mykin-ai/expo-audio-stream requires a custom dev build (EAS).
// This stub provides the same interface so the app loads in Expo Go.
// Voice recording will show an error; all other screens work normally.

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  transcript: string;
  isConnected: boolean;
  audioLevel: number;
  duration: number;
  silenceCountdown: number | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    setError(
      "Voice recording requires a custom dev build. Run: eas build --profile development --platform ios"
    );
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const reset = useCallback(() => {
    setIsRecording(false);
    setTranscript("");
    setIsConnected(false);
    setAudioLevel(0);
    setDuration(0);
    setSilenceCountdown(null);
    setError(null);
  }, []);

  return {
    isRecording,
    transcript,
    isConnected,
    audioLevel,
    duration,
    silenceCountdown,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
