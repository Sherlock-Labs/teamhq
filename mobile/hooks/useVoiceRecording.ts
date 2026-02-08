import { useCallback, useRef, useState } from "react";
import { ExpoAudioStream } from "@mykin-ai/expo-audio-stream";
import { createVoiceSocket } from "../lib/websocket";
import type { ServerVoiceMessage } from "../types/voice";

const SILENCE_THRESHOLD = 0.05;
const SILENCE_DETECT_MS = 2000;
const SILENCE_COUNTDOWN_MS = 3000;

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  transcript: string;
  isConnected: boolean;
  audioLevel: number;
  duration: number;
  silenceCountdown: number | null; // null if not counting down, 0-3000 ms remaining
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

  const socketRef = useRef<ReturnType<typeof createVoiceSocket> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const silenceStartRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    silenceStartRef.current = null;
    setSilenceCountdown(null);
  }, []);

  const handleServerMessage = useCallback((msg: ServerVoiceMessage) => {
    switch (msg.type) {
      case "ready":
        setIsConnected(true);
        break;
      case "transcript":
        setTranscript(msg.text);
        break;
      case "done":
        setTranscript(msg.text);
        break;
      case "error":
        setError(msg.message);
        break;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    clearTimers();

    // Stop audio capture
    ExpoAudioStream.stop().catch((err: unknown) => {
      console.warn("Error stopping audio stream:", err);
    });

    // Tell the server we're done
    if (socketRef.current) {
      socketRef.current.send({ type: "stop" });
    }
  }, [clearTimers]);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    setDuration(0);
    setAudioLevel(0);
    setSilenceCountdown(null);
    silenceStartRef.current = null;

    // Open WebSocket to server
    const socket = createVoiceSocket(handleServerMessage);
    socketRef.current = socket;

    // Wait for the WebSocket to open
    await new Promise<void>((resolve, reject) => {
      socket.ws.onopen = () => resolve();
      const origOnError = socket.ws.onerror;
      socket.ws.onerror = (event: Event) => {
        if (origOnError) origOnError.call(socket.ws, event);
        reject(new Error("Failed to connect to transcription service"));
      };
      // Timeout after 10 seconds
      setTimeout(
        () => reject(new Error("Connection timeout")),
        10_000,
      );
    });

    // Start audio capture
    await ExpoAudioStream.start({
      sampleRate: 16000,
      channels: 1,
      encoding: "pcm_16bit",
      interval: 480,
      onAudioStream: (event: { data: string; position: number; soundLevel?: number }) => {
        // Send audio chunk to server
        if (socketRef.current) {
          socketRef.current.send({ type: "audio", data: event.data });
        }

        // Update audio level for visualization
        const level = event.soundLevel ?? 0;
        setAudioLevel(Math.min(1, Math.max(0, level)));

        // Silence detection
        if (level < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          }
          const silentFor = Date.now() - silenceStartRef.current;

          if (silentFor >= SILENCE_DETECT_MS) {
            // Start countdown
            const countdownElapsed = silentFor - SILENCE_DETECT_MS;
            const remaining = SILENCE_COUNTDOWN_MS - countdownElapsed;

            if (remaining <= 0) {
              // Auto-stop
              stopRecording();
              return;
            }
            setSilenceCountdown(remaining);
          }
        } else {
          // Speech detected, reset silence tracking
          silenceStartRef.current = null;
          setSilenceCountdown(null);
        }
      },
    });

    isRecordingRef.current = true;
    setIsRecording(true);

    // Duration counter
    const startTime = Date.now();
    durationIntervalRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, [handleServerMessage, stopRecording]);

  const reset = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    clearTimers();
    setIsRecording(false);
    setTranscript("");
    setIsConnected(false);
    setAudioLevel(0);
    setDuration(0);
    setSilenceCountdown(null);
    setError(null);
  }, [stopRecording, clearTimers]);

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
