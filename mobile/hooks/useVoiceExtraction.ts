import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { VoiceExtractionResult } from "../types/voice";

export function useVoiceExtraction() {
  return useMutation({
    mutationFn: (transcript: string) =>
      apiFetch<VoiceExtractionResult>("/api/voice/extract", {
        method: "POST",
        body: JSON.stringify({ transcript }),
      }),
  });
}
