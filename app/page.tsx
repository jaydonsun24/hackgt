"use client";

import { useEffect, useRef, useState } from "react";
import { EquityCard } from "@/components/EquityCard";
import { HandoutModal } from "@/components/HandoutModal";
import { QueryPanel } from "@/components/QueryPanel";
import { ReferralModal } from "@/components/ReferralModal";
import { useShell } from "@/components/Shell";
import { TrialCard } from "@/components/TrialCard";
import type { ApiError, MatchResponse, RankedTrial } from "@/lib/contracts";
import { DEMO_QUERIES } from "@/lib/demo/queries";
import { languageName, sexLabel } from "@/lib/format";
import { useVoice } from "@/lib/voice/useVoice";

const STEPS = ["Understanding note", "Searching trials", "Checking eligibility"] as const;

type SearchInput = { text: string; zip: string; language: string };

export default function HomePage() {
  const { demo, setMockBadge } = useShell();
  const voice = useVoice();
  const [text, setText] = useState<string>(DEMO_QUERIES.A);
  const [zip, setZip] = useState("31709");
  const [radius, setRadius] = useState(75);
  const [language, setLanguage] = useState("es");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ message: string; stage?: string } | null>(null);
  const [response, setResponse] = useState<MatchResponse | null>(null);
  const [packet, setPacket] = useState<RankedTrial | null>(null);
  const [handout, setHandout] = useState<RankedTrial | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const requestId = useRef(0);
  mutedRef.current = muted;

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const first = window.setTimeout(() => setStep(1), 2500);
    const second = window.setTimeout(() => setStep(2), 5000);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [loading]);

  useEffect(() => {
    setMockBadge(Boolean(response && (response.mocked.ai || response.mocked.data)));
  }, [response, setMockBadge]);

  useEffect(() => () => setMockBadge(false), [setMockBadge]);

  async function onSearch(override?: SearchInput) {
    const note = (override?.text ?? text).trim();
    const clinicZip = (override?.zip ?? zip).trim();
    const patientLanguage = override?.language ?? language;
    if (note.length < 10) {
      setError({ message: "Enter a de-identified note between 10 and 4000 characters.", stage: "validate" });
      return;
    }
    const id = requestId.current + 1;
    requestId.current = id;
    setLoading(true);
    setError(null);
    setPacket(null);
    setHandout(null);
    voice.stopSpeaking();
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(demo ? { "x-trialpath-demo": "1" } : {}),
        },
        body: JSON.stringify({
          text: note,
          zip: clinicZip || undefined,
          radiusMiles: radius,
          patientLanguage,
        }),
      });
      const payload = (await res.json()) as MatchResponse | ApiError;
      if (requestId.current !== id) return;
      if (!res.ok || !("results" in payload)) {
        const message = "error" in payload ? payload.error : "The search failed.";
        setResponse(null);
        setError({ message, stage: "stage" in payload ? payload.stage : undefined });
        return;
      }
      setResponse(payload);
      if (!mutedRef.current && payload.readback) void voice.speak(payload.readback, "en-GB");
    } catch {
      if (requestId.current !== id) return;
      setResponse(null);
      setError({ message: "The search could not be completed.", stage: "match" });
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }

  const criteria = response?.criteria;
  const seconds = response ? (response.timingsMs.total / 1000).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <QueryPanel
        text={text}
        setText={setText}
        zip={zip}
        setZip={setZip}
        radius={radius}
        setRadius={setRadius}
        language={language}
        setLanguage={setLanguage}
        loading={loading}
        voice={voice}
        onSearch={onSearch}
      />

      {loading ? (
        <ol aria-live="polite" className="grid gap-2 sm:grid-cols-3">
          {STEPS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={`rounded-xl border px-3 py-3 text-sm ${index <= step ? "border-teal bg-white font-medium text-teal" : "border-line text-muted"}`}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-2xl border border-[#e7c7b4] bg-[#f8efe6] p-4">
          <h2 className="text-base font-semibold text-ink">The search did not finish</h2>
          <p className="mt-1 text-sm text-ink">{error.message}</p>
          {error.stage ? <p className="mt-1 text-sm text-muted">Step: {error.stage}</p> : null}
          <p className="mt-2 text-sm text-muted">If the clinic network is unreliable, turn on Demo mode and try an example again.</p>
          <button type="button" onClick={() => onSearch()} className="mt-3 min-h-11 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white">
            Retry
          </button>
        </div>
      ) : null}

      {response && criteria ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section aria-labelledby="heard">
              <h2 id="heard" className="text-lg font-semibold">
                What we heard
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {[
                  criteria.condition,
                  criteria.age != null ? `Age ${criteria.age}` : "",
                  sexLabel(criteria.sex) ?? "",
                  criteria.stage ? `Stage ${criteria.stage}` : "",
                  ...criteria.priorTreatments,
                  ...criteria.keyFindings,
                  criteria.zip ? `ZIP ${criteria.zip}` : "",
                  languageName(criteria.patientLanguage),
                ]
                  .filter(Boolean)
                  .map((chip) => (
                    <li key={chip} className="rounded-full bg-white px-3 py-1 text-sm text-ink ring-1 ring-line">
                      {chip}
                    </li>
                  ))}
              </ul>
            </section>

            <div className="rounded-2xl border border-teal/30 bg-[#e7f2f3] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm leading-relaxed text-ink">{response.readback}</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !muted;
                      setMuted(next);
                      if (next) voice.stopSpeaking();
                    }}
                    className="rounded-full border border-teal px-3 py-2 text-sm font-medium text-teal"
                  >
                    {muted ? "Unmute" : "Mute"}
                  </button>
                  <button type="button" onClick={() => voice.stopSpeaking()} className="rounded-full border border-teal px-3 py-2 text-sm font-medium text-teal">
                    Stop
                  </button>
                  <button type="button" onClick={() => void voice.speak(response.readback, "en-GB")} className="rounded-full border border-teal px-3 py-2 text-sm font-medium text-teal">
                    Replay
                  </button>
                </div>
              </div>
            </div>

            {response.results.length === 0 ? (
              <div className="rounded-2xl border border-line bg-card p-5">
                <h2 className="text-lg font-semibold">No recruiting trials in range</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Nothing came back within {criteria.radiusMiles} miles. Try a wider radius, or broaden the condition in the note.
                </p>
              </div>
            ) : (
              response.results.map((ranked) => (
                <TrialCard
                  key={ranked.trial.nctId}
                  ranked={ranked}
                  onPacket={() => {
                    setHandout(null);
                    setPacket(ranked);
                  }}
                  onHandout={() => {
                    setPacket(null);
                    setHandout(ranked);
                  }}
                />
              ))
            )}
            <p className="text-sm text-muted">
              Searched {response.searchedCount} trials in {seconds}s.
            </p>
          </div>
          {response.equity ? <EquityCard equity={response.equity} /> : <div />}
        </div>
      ) : null}

      {packet && criteria ? <ReferralModal ranked={packet} criteria={criteria} onClose={() => setPacket(null)} /> : null}
      {handout && criteria ? (
        <HandoutModal
          ranked={handout}
          criteria={criteria}
          language={criteria.patientLanguage || language}
          demo={demo}
          onClose={() => setHandout(null)}
          onReadAloud={(spoken, lang) => void voice.speak(spoken, lang)}
        />
      ) : null}
    </div>
  );
}
