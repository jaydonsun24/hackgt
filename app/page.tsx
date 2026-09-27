"use client";

import { animate, stagger } from "animejs";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EquityCard } from "@/components/EquityCard";
import { HandoutModal } from "@/components/HandoutModal";
import { QueryPanel } from "@/components/QueryPanel";
import { ReferralModal } from "@/components/ReferralModal";
import { useShell } from "@/components/Shell";
import { TrialCard } from "@/components/TrialCard";
import type { ApiError, MatchResponse, RankedTrial } from "@/lib/contracts";
import { DEMO_QUERIES } from "@/lib/demo/queries";
import { languageName, sexLabel } from "@/lib/format";
import { reducedMotion, useReveal } from "@/lib/motion";
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
  const resultsRef = useReveal<HTMLDivElement>([response], { selector: '[data-reveal=""]', y: 8, duration: 500, stagger: 50 });
  const chipsRef = useReveal<HTMLUListElement>([response], {
    selector: '[data-reveal="chip"]',
    y: 4,
    stagger: 25,
    duration: 400,
    delay: 100,
  });

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
          ...(demo ? { "x-refera-demo": "1" } : {}),
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
    <div>
      <div className="mb-6 max-w-3xl">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink">Find a recruiting trial</h1>
        <p className="mt-1.5 text-[17px] leading-relaxed text-muted">
          Paste or dictate a de-identified note. Refera searches recruiting studies near the clinic ZIP, checks each one against the note, and
          reads back the closest match.
        </p>
      </div>

      <div ref={resultsRef} className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <div className="lg:col-start-1 lg:row-start-1">
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
        </div>

        <section aria-label="Results" className="min-w-0 space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {loading ? <LoadingSteps step={step} /> : null}

          {error ? (
            <div role="alert" className="border-l-4 border-copper bg-sand px-4 py-4">
              <h2 className="text-base font-semibold text-ink">The search did not finish</h2>
              <p className="mt-1 text-sm text-ink">{error.message}</p>
              {error.stage ? <p className="mt-1 text-sm text-muted">Step: {error.stage}</p> : null}
              <p className="mt-2 text-sm text-muted">If the clinic network is unreliable, turn on Demo mode and try an example again.</p>
              <button type="button" onClick={() => onSearch()} className="mt-3 min-h-10 rounded bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">
                Retry
              </button>
            </div>
          ) : null}

          {response && criteria ? (
            <>
              <div data-reveal="">
                <h2 className="text-xl font-semibold text-ink">
                  {response.results.length === 0
                    ? "No recruiting trials in range"
                    : `${response.results.length} recruiting ${response.results.length === 1 ? "trial" : "trials"} within ${criteria.radiusMiles} miles`}
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  Searched {response.searchedCount} trials in {seconds}s.
                </p>
              </div>

              <section data-reveal="" aria-labelledby="heard">
                <h3 id="heard" className="text-sm font-semibold text-ink">
                  What we heard
                </h3>
                <ul ref={chipsRef} className="mt-2 flex flex-wrap gap-1.5">
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
                      <li key={chip} data-reveal="chip" className="rounded-sm border border-line bg-white px-2 py-0.5 text-sm text-ink">
                        {chip}
                      </li>
                    ))}
                </ul>
              </section>

              <figure data-reveal="" className="border-l-4 border-teal bg-teal-soft px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <figcaption className="flex items-center gap-2 text-sm font-semibold text-teal">
                    <SpeakingWave active={voice.speaking} />
                    {voice.speaking ? "Reading aloud" : "Readback"}
                  </figcaption>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      aria-pressed={muted}
                      onClick={() => {
                        const next = !muted;
                        setMuted(next);
                        if (next) voice.stopSpeaking();
                      }}
                      className={textButton}
                    >
                      {muted ? "Unmute" : "Mute"}
                    </button>
                    <button type="button" onClick={() => voice.stopSpeaking()} className={textButton}>
                      Stop
                    </button>
                    <button type="button" onClick={() => void voice.speak(response.readback, "en-GB")} className={textButton}>
                      Replay
                    </button>
                  </div>
                </div>
                <blockquote className="mt-2 text-[15px] leading-relaxed text-ink">{response.readback}</blockquote>
              </figure>

              {response.results.length === 0 ? (
                <p data-reveal="" className="rounded-md border border-line bg-card p-5 text-sm leading-relaxed text-muted">
                  Nothing came back within {criteria.radiusMiles} miles. Try a wider radius, or broaden the condition in the note.
                </p>
              ) : (
                <ol className="divide-y divide-line rounded-md border border-line bg-card">
                  {response.results.map((ranked) => (
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
                  ))}
                </ol>
              )}
            </>
          ) : !loading && !error ? (
            <div className="rounded-md border border-dashed border-[#bdb4a6] px-5 py-8">
              <h2 className="text-base font-semibold text-ink">No search yet</h2>
              <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">
                Results appear here. Each one shows the nearest site and distance, and which eligibility criteria the note meets, leaves
                unclear, or conflicts with. Try one of the sample notes to see how it works.
              </p>
            </div>
          ) : null}
        </section>

        {response?.equity ? (
          <div className="lg:col-start-1 lg:row-start-2">
            <EquityCard equity={response.equity} />
          </div>
        ) : null}
      </div>

      {packet && criteria ? <ReferralModal ranked={packet} criteria={criteria} onClose={() => setPacket(null)} /> : null}
      {handout && criteria ? (
        <HandoutModal
          ranked={handout}
          criteria={criteria}
          language={criteria.patientLanguage || language}
          demo={demo}
          onClose={() => {
            voice.stopSpeaking();
            setHandout(null);
          }}
          onReadAloud={(spoken, lang) => void voice.speak(spoken, lang)}
          speaking={voice.speaking}
          onStopReading={() => voice.stopSpeaking()}
        />
      ) : null}
    </div>
  );
}

const textButton = "text-sm font-semibold text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal";

function LoadingSteps({ step }: { step: number }) {
  const barRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar || reducedMotion()) return;
    const fill = animate(bar, { width: ["2%", "92%"], duration: 8000, ease: "outCubic" });
    return () => {
      fill.revert();
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-md border border-line bg-card">
      <div className="h-[3px] bg-[#e6e0d5]">
        <div ref={barRef} className="h-full w-1/2 bg-teal" />
      </div>
      <ol aria-live="polite" className="space-y-1.5 px-5 py-4 text-sm">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className={`flex items-center gap-2.5 ${current ? "font-semibold text-ink" : done ? "text-ink" : "text-muted"}`}>
              <span aria-hidden="true" className="w-4 text-center font-mono text-teal">
                {done ? "✓" : current ? "›" : "·"}
              </span>
              {label}
              {current ? "…" : ""}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SpeakingWave({ active }: { active: boolean }) {
  const barsRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = barsRef.current;
    if (!root || !active || reducedMotion()) return;
    const wave = animate(Array.from(root.children), {
      scaleY: [0.35, 1],
      duration: 420,
      delay: stagger(110),
      alternate: true,
      loop: true,
      ease: "inOutSine",
    });
    return () => {
      wave.revert();
    };
  }, [active]);

  return (
    <span ref={barsRef} aria-hidden="true" className="flex h-4 items-center gap-[2px]">
      {[0.55, 0.9, 0.7, 1, 0.6].map((height, index) => (
        <span key={index} className="w-[2px] rounded-full bg-teal" style={{ height: `${height * 100}%` }} />
      ))}
    </span>
  );
}
