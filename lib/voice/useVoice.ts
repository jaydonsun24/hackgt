"use client";

import { useEffect, useRef, useState } from "react";
import { getVoiceEngine, type VoiceEngine } from "./index";

export function useVoice() {
  const engineRef = useRef<VoiceEngine | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    const engine = getVoiceEngine();
    engineRef.current = engine;
    setSupported(engine.isSupported());
    return () => {
      engine.stopListening();
      engine.stopSpeaking();
    };
  }, []);

  function start(lang?: string) {
    const engine = engineRef.current;
    if (!engine) return;
    closingRef.current = false;
    setError(null);
    setStatus(null);
    setTranscript("");
    setListening(true);
    engine.startListening(
      {
        onPartial: (text) => setTranscript(text),
        onFinal: (text) => {
          if (text) setTranscript(text);
          if (closingRef.current) {
            closingRef.current = false;
            setStatus(null);
            setListening(false);
          }
        },
        onError: (message) => {
          closingRef.current = false;
          setStatus(null);
          setError(message);
          setListening(false);
        },
        onStatus: (message) => setStatus(message),
      },
      lang,
    );
  }

  function stop() {
    closingRef.current = true;
    engineRef.current?.stopListening();
  }

  async function speak(text: string, lang?: string) {
    const engine = engineRef.current;
    if (!engine) return;
    setSpeaking(true);
    try {
      await engine.speak(text, lang);
    } finally {
      setSpeaking(false);
    }
  }

  function stopSpeaking() {
    engineRef.current?.stopSpeaking();
    setSpeaking(false);
  }

  return { supported, listening, speaking, transcript, error, status, start, stop, speak, stopSpeaking };
}
