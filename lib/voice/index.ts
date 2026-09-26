import { browserVoice } from "./browser";
import { grokVoice } from "./grok";

export interface VoiceHandlers {
  onPartial?: (t: string) => void;
  onFinal: (t: string) => void;
  onError?: (e: string) => void;
  onStatus?: (t: string) => void;
}

export interface VoiceEngine {
  isSupported(): boolean;
  startListening(h: VoiceHandlers, lang?: string): void;
  stopListening(): void;
  speak(text: string, lang?: string): Promise<void>;
  stopSpeaking(): void;
}

export function getVoiceEngine(): VoiceEngine {
  const requested = process.env.NEXT_PUBLIC_VOICE_ENGINE;
  if (requested === "browser") return browserVoice;
  return grokVoice;
}
