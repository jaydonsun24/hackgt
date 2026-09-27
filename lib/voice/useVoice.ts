"use client";

import { useEffect, useRef, useState } from "react";
import { heardWords } from "./hear";
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
  const speakSeqRef = useRef(0);

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
        onPartial: (text) => setTranscript(heardWords(text)),
        onFinal: (text) => {
          const heard = heardWords(text);
          if (heard) setTranscript(heard);
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
    const mine = ++speakSeqRef.current;
    setSpeaking(true);
    try {
      await engine.speak(text, lang);
    } finally {
      // A newer speak() owns the flag now; don't clear it when this one is cut off.
      if (speakSeqRef.current === mine) setSpeaking(false);
    }
  }

  function stopSpeaking() {
    speakSeqRef.current += 1;
    engineRef.current?.stopSpeaking();
    setSpeaking(false);
  }

  return { supported, listening, speaking, transcript, error, status, start, stop, speak, stopSpeaking };
}
