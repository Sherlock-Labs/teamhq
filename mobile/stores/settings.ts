import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsStore {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  isConnected: boolean;
  setConnectionStatus: (connected: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      apiUrl: "http://192.168.1.70:3002",
      setApiUrl: (url) => set({ apiUrl: url }),
      isConnected: false,
      setConnectionStatus: (connected) => set({ isConnected: connected }),
    }),
    {
      name: "teamhq-settings",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0 && state?.apiUrl === "http://localhost:3002") {
          state.apiUrl = "http://192.168.1.70:3002";
        }
        return state as SettingsStore;
      },
    },
  ),
);
