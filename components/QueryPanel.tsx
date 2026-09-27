"use client";

import { animate } from "animejs";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEMO_QUERIES } from "@/lib/demo/queries";
import { heardWords } from "@/lib/voice/hear";
import { LANGUAGE_OPTIONS } from "@/lib/format";
import { reducedMotion } from "@/lib/motion";
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

  const dotRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const dot = dotRef.current;
    if (!dot || !voice.listening || reducedMotion()) return;
    const pulse = animate(dot, { opacity: [1, 0.25], scale: [1, 0.8], duration: 700, alternate: true, loop: true, ease: "inOutSine" });
    return () => {
      pulse.revert();
    };
  }, [voice.listening]);

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
      className="rounded-md border border-line bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        cancelSend();
        onSearch();
      }}
    >
      <label htmlFor="note" className="block text-[15px] font-semibold text-ink">
        Patient note
      </label>
      <p id="note-hint" className="mt-0.5 text-sm text-muted">
        De-identified input only. Nothing is stored.
      </p>
      <textarea
        id="note"
        aria-describedby="note-hint"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={7}
        required
        minLength={10}
        maxLength={4000}
        className="mt-2 w-full resize-y rounded border border-[#a79f93] bg-white px-3 py-2.5 text-[15px] leading-relaxed text-ink"
      />
      <p className="mt-1 text-right font-mono text-xs text-muted">{text.length}/4000</p>

      {voice.error ? (
        <p role="alert" className="mt-2 border-l-4 border-copper bg-sand px-3 py-2 text-sm text-ink">
          {voice.error}
        </p>
      ) : voice.status ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {voice.status}
        </p>
      ) : null}
      {armed ? (
        <div role="status" className="mt-2 flex flex-wrap items-center gap-3 border-l-4 border-gold bg-sand px-3 py-2 text-sm text-ink">
          <span>Sending the note in a moment.</span>
          <button type="button" className="font-semibold text-teal underline underline-offset-2" onClick={cancelSend}>
            Cancel
          </button>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="zip" className="block text-sm font-semibold text-ink">
            Clinic ZIP
          </label>
          <input
            id="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            value={zip}
            onChange={(event) => setZip(event.target.value)}
            className={`${fieldClass} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="radius" className="block text-sm font-semibold text-ink">
            Radius
          </label>
          <select id="radius" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className={fieldClass}>
            {[25, 50, 75, 150].map((miles) => (
              <option key={miles} value={miles}>
                {miles} miles
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="language" className="block text-sm font-semibold text-ink">
            Patient language
          </label>
          <select id="language" value={language} onChange={(event) => setLanguage(event.target.value)} className={fieldClass}>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 flex-1 rounded bg-teal px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-teal-dark disabled:cursor-progress disabled:opacity-70"
        >
          {loading ? "Finding trials…" : "Find trials"}
        </button>
        {voice.supported ? (
          <button
            type="button"
            aria-pressed={voice.listening}
            aria-label={voice.listening ? "Release to stop listening" : "Hold to talk"}
            className={`inline-flex min-h-11 touch-none select-none items-center justify-center gap-2 rounded border px-4 py-2.5 text-[15px] font-semibold ${
              voice.listening ? "border-ink bg-ink text-white" : "border-teal bg-white text-teal hover:bg-teal-soft"
            }`}
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
            {voice.listening ? <span ref={dotRef} aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#e5484d]" /> : <MicIcon />}
            {voice.listening ? "Listening" : "Hold to talk"}
          </button>
        ) : null}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm font-semibold text-ink">Sample notes</p>
        <ul className="mt-1.5 space-y-1">
          {EXAMPLES.map((example) => (
            <li key={example.id}>
              <button
                type="button"
                onClick={() => applyExample(example)}
                className="text-left text-sm text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
              >
                {example.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}

const fieldClass = "mt-1 w-full rounded border border-[#a79f93] bg-white px-3 py-2.5 text-[15px] text-ink";

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
    </svg>
  );
}
