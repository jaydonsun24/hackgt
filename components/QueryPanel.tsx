"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_QUERIES } from "@/lib/demo/queries";
import { heardWords } from "@/lib/voice/hear";
import { LANGUAGE_OPTIONS } from "@/lib/format";
import type { useVoice } from "@/lib/voice/useVoice";

const EXAMPLES = [
  { id: "A", label: "Lung cancer, Americus", text: DEMO_QUERIES.A, zip: "31709", language: "es" },
  { id: "B", label: "Type 2 diabetes, Atlanta", text: DEMO_QUERIES.B, zip: "30303", language: "en" },
  { id: "C", label: "Breast cancer, Savannah", text: DEMO_QUERIES.C, zip: "31401", language: "en" },
] as const;

type Voice = ReturnType<typeof useVoice>;
type SearchInput = { text: string; zip: string; language: string };

export function QueryPanel({
  text,
  setText,
  zip,
  setZip,
  radius,
  setRadius,
  language,
  setLanguage,
  loading,
  voice,
  onSearch,
}: {
  text: string;
  setText: (value: string) => void;
  zip: string;
  setZip: (value: string) => void;
  radius: number;
  setRadius: (value: number) => void;
  language: string;
  setLanguage: (value: string) => void;
  loading: boolean;
  voice: Voice;
  onSearch: (override?: SearchInput) => void;
}) {
  const [armed, setArmed] = useState(false);
  const textRef = useRef(text);
  const listeningRef = useRef(false);
  const ignoreStopRef = useRef(false);
  const capturedRef = useRef(false);
  const sessionRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onSearchRef = useRef(onSearch);
  const errorRef = useRef(voice.error);
  const loadingRef = useRef(loading);
  textRef.current = text;
  onSearchRef.current = onSearch;
  errorRef.current = voice.error;
  loadingRef.current = loading;

  useEffect(() => {
    const spoken = voice.transcript.trim();
    if (!spoken || !sessionRef.current) return;
    capturedRef.current = true;
    setText(heardWords(voice.transcript));
  }, [voice.listening, voice.transcript, setText]);

  useEffect(() => {
    const wasListening = listeningRef.current;
    listeningRef.current = voice.listening;
    if (!wasListening && voice.listening) {
      capturedRef.current = false;
      sessionRef.current = true;
      return;
    }
    if (!wasListening || voice.listening) return;
    if (ignoreStopRef.current) {
      ignoreStopRef.current = false;
      capturedRef.current = false;
      sessionRef.current = false;
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const note = textRef.current.trim();
      const spoke = capturedRef.current;
      capturedRef.current = false;
      sessionRef.current = false;
      if (!spoke || errorRef.current || loadingRef.current || note.length < 10) return;
      setArmed(true);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setArmed(false);
        onSearchRef.current();
      }, 1000);
    }, 300);
  }, [voice.listening]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function cancelSend() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    capturedRef.current = false;
    sessionRef.current = false;
    setArmed(false);
  }

  function applyExample(example: (typeof EXAMPLES)[number]) {
    cancelSend();
    if (voice.listening) ignoreStopRef.current = true;
    voice.stop();
    setText(example.text);
    setZip(example.zip);
    setLanguage(example.language);
    onSearch({ text: example.text, zip: example.zip, language: example.language });
  }

  return (
    <form
      className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        cancelSend();
        onSearch();
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor="note" className="text-sm font-medium text-ink">
            De-identified patient note
          </label>
          <textarea
            id="note"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            required
            minLength={10}
            maxLength={4000}
            className="mt-2 w-full resize-y rounded-xl border border-line bg-white px-3 py-3 text-base leading-relaxed text-ink"
          />
          <p className="mt-2 text-sm text-muted">De-identified input only. Nothing is stored.</p>
        </div>
        {voice.supported ? (
          <div className="flex flex-col items-center gap-2 lg:pt-8">
            <button
              type="button"
              aria-pressed={voice.listening}
              aria-label={voice.listening ? "Release to stop listening" : "Hold to talk"}
              className={`relative grid h-20 w-20 place-items-center rounded-full bg-teal text-white ${voice.listening ? "ring-4 ring-teal/30" : ""}`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                cancelSend();
                voice.start("en-US");
              }}
              onPointerUp={() => voice.stop()}
              onPointerCancel={() => voice.stop()}
              onKeyDown={(event) => {
                if (event.repeat) return;
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  cancelSend();
                  voice.start("en-US");
                }
              }}
              onKeyUp={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  voice.stop();
                }
              }}
            >
              {voice.listening ? <span className="absolute inset-0 animate-ping rounded-full bg-teal/40" /> : null}
              <MicIcon />
            </button>
            <span className="max-w-40 text-center text-sm text-muted">{voice.listening ? "Listening" : "Hold to talk"}</span>
          </div>
        ) : null}
      </div>

      {voice.error ? (
        <p role="alert" className="mt-3 text-sm text-copper">
          {voice.error}
        </p>
      ) : voice.status ? (
        <p role="status" className="mt-3 text-sm text-muted">
          {voice.status}
        </p>
      ) : null}
      {armed ? (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#f8efe6] px-3 py-2 text-sm text-ink">
          <span>Sending the note in a moment.</span>
          <button type="button" className="font-medium text-teal underline" onClick={cancelSend}>
            Cancel
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="zip" className="text-sm font-medium text-ink">
            Clinic ZIP
          </label>
          <input
            id="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            value={zip}
            onChange={(event) => setZip(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3"
          />
        </div>
        <div>
          <label htmlFor="radius" className="text-sm font-medium text-ink">
            Radius
          </label>
          <select
            id="radius"
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3"
          >
            {[25, 50, 75, 150].map((miles) => (
              <option key={miles} value={miles}>
                {miles} miles
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="language" className="text-sm font-medium text-ink">
            Patient language
          </label>
          <select
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Finding trials…" : "Find trials"}
        </button>
        <div className="flex flex-wrap gap-2">
          <span className="sr-only">Try an example</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => applyExample(example)}
              className="rounded-full border border-line bg-white px-3 py-2 text-sm text-ink hover:border-teal"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="relative h-8 w-8 fill-none stroke-white" strokeWidth="1.8">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" strokeLinecap="round" />
      <path d="M12 17v4M8 21h8" strokeLinecap="round" />
    </svg>
  );
}
