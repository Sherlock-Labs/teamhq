import { create } from "zustand";

// Voice recording state — skeleton for Zara to extend with recording logic
interface VoiceStore {
  isRecording: boolean;
  transcript: string;
  isConnected: boolean;
  audioLevel: number;
  duration: number;
  error: string | null;

  setRecording: (recording: boolean) => void;
  setTranscript: (transcript: string) => void;
  appendTranscript: (text: string) => void;
  setConnected: (connected: boolean) => void;
  setAudioLevel: (level: number) => void;
  setDuration: (seconds: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  isRecording: false,
  transcript: "",
  isConnected: false,
  audioLevel: 0,
  duration: 0,
  error: null,
};

export const useVoiceStore = create<VoiceStore>((set) => ({
  ...initialState,
  setRecording: (recording) => set({ isRecording: recording }),
  setTranscript: (transcript) => set({ transcript }),
  appendTranscript: (text) =>
    set((state) => ({ transcript: state.transcript + text })),
  setConnected: (connected) => set({ isConnected: connected }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setDuration: (seconds) => set({ duration: seconds }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
