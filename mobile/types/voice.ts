// Voice-related types for WebSocket messages and extraction

// Messages the mobile client sends to the server
export interface AudioMessage {
  type: "audio";
  data: string; // base64-encoded PCM (16kHz, 16-bit, mono)
}

export interface StopMessage {
  type: "stop";
}

export type ClientVoiceMessage = AudioMessage | StopMessage;

// Messages the server sends to the mobile client
export interface ReadyMessage {
  type: "ready";
}

export interface TranscriptMessage {
  type: "transcript";
  text: string;
  final: boolean;
}

export interface DoneMessage {
  type: "done";
  text: string;
}

export interface VoiceErrorMessage {
  type: "error";
  message: string;
}

export type ServerVoiceMessage =
  | ReadyMessage
  | TranscriptMessage
  | DoneMessage
  | VoiceErrorMessage;

// POST /api/voice/extract response
export interface VoiceExtractionResult {
  name: string;
  description: string;
  brief: string;
  goals: string;
  constraints: string;
  priority: "high" | "medium" | "low";
}

// Voice recording states for the overlay
export type VoiceOverlayState =
  | "recording"
  | "review"
  | "creating"
  | "error"
  | "permission-denied";
