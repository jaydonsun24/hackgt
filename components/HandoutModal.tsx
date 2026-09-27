"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ApiError, Handout, HandoutRequest, PatientCriteria, RankedTrial } from "@/lib/contracts";
import { LANGUAGE_OPTIONS, languageName } from "@/lib/format";
import { questionsHeading } from "@/lib/ai/handout-copy";
import { useModalMotion } from "@/lib/motion";

export function HandoutModal({
  ranked,
  criteria,
  language,
  demo,
  onClose,
  onReadAloud,
}: {
  ranked: RankedTrial;
  criteria: PatientCriteria;
  language: string;
  demo: boolean;
  onClose: () => void;
  onReadAloud: (text: string, language: string) => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  useModalMotion(backdropRef, dialogRef);
  const [handout, setHandout] = useState<Handout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setHandout(null);
    const body: HandoutRequest = {
      ranked,
      criteria,
      language: currentLanguage,
      readingLevel: 6,
      withIllustration: true,
    };
    fetch("/api/handout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(demo ? { "x-refera-demo": "1" } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as Handout | ApiError;
        if (!response.ok || !("sections" in payload)) {
          const message = "error" in payload ? payload.error : "The handout could not be written.";
          throw new Error(message);
        }
        setHandout(payload);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "The handout could not be written.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ranked, criteria, currentLanguage, demo]);

  useEffect(() => {
    const root = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    function items() {
      return Array.from(root?.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea") ?? []).filter(
        (item) => !item.hasAttribute("disabled"),
      );
    }
    items()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  const spoken = handout
    ? [handout.title, ...handout.sections.flatMap((section) => [section.heading, section.body]), ...handout.questionsToAsk, handout.disclaimer].join(". ")
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        ref={backdropRef}
        type="button"
        className="no-print absolute inset-0 bg-ink/50"
        aria-label="Close patient handout"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="print-target relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-md border border-line bg-white p-6 shadow-overlay sm:p-8"
      >
        <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm font-medium text-ink" htmlFor="handout-language">
            Handout language
            <select
              id="handout-language"
              value={currentLanguage}
              onChange={(event) => setCurrentLanguage(event.target.value)}
              className="ml-2 rounded border border-[#a79f93] bg-white px-2.5 py-2"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onClose} className={`self-start ${closeButton}`}>
            <CloseIcon />
            Close
          </button>
        </div>

        {loading ? (
          <div className="mt-4" aria-live="polite">
            <p className="sr-only">Writing the handout in {languageName(currentLanguage)}.</p>
            <div className="animate-pulse space-y-3" aria-hidden="true">
              <div className="aspect-video rounded bg-line/70" />
              <div className="h-7 w-2/3 rounded bg-line/70" />
              <div className="h-4 rounded bg-line/70" />
              <div className="h-4 w-5/6 rounded bg-line/70" />
              <div className="h-4 w-4/6 rounded bg-line/70" />
            </div>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 border-l-4 border-copper bg-sand px-3 py-2 text-sm text-ink">
            {error}
          </p>
        ) : null}
        {handout ? (
          <article className="mt-4">
            {handout.illustrationUrl ? (
              // Remote or data-URL illustration from the handout API. next/image cannot accept both.
              <img
                src={handout.illustrationUrl}
                alt="Friendly illustration of a clinic visit, with no text."
                className="aspect-video w-full rounded bg-paper object-cover"
              />
            ) : null}
            <h2 id={titleId} className="mt-5 text-2xl font-semibold leading-snug text-ink">
              {handout.title}
            </h2>
            {handout.sections.map((section) => (
              <section key={section.heading} className="mt-4">
                <h3 className="text-base font-semibold">{section.heading}</h3>
                <p className="mt-1 text-sm leading-relaxed">{section.body}</p>
              </section>
            ))}
            <section className="mt-4">
              <h3 className="text-base font-semibold">{questionsHeading(handout.language)}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {handout.questionsToAsk.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </section>
            <p className="mt-4 text-sm text-muted">{handout.disclaimer}</p>
            <div className="no-print mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => onReadAloud(spoken, handout.language)}
                className="min-h-11 rounded border border-teal px-5 py-2 text-sm font-semibold text-teal hover:bg-teal-soft"
              >
                Read aloud
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-11 rounded bg-teal px-5 py-2 text-sm font-semibold text-white hover:bg-teal-dark"
              >
                Print / Save PDF
              </button>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}

const closeButton =
  "inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-semibold text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal";

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

