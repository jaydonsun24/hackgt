"use client";

import type { RankedTrial } from "@/lib/contracts";
import { checkLabel, formatPhases, verdictLabel } from "@/lib/format";

const verdictClass = {
  likely: "bg-[#e5f6ec] text-[#0d5c34]",
  possible: "bg-[#fbf3e0] text-[#7a4e0d]",
  unlikely: "bg-[#eef1f3] text-[#3f4a54]",
} as const;

export function TrialCard({
  ranked,
  onPacket,
  onHandout,
}: {
  ranked: RankedTrial;
  onPacket: () => void;
  onHandout: () => void;
}) {
  const { trial } = ranked;
  const site = trial.nearestSite;
  const demo = trial.url === "#demo" || trial.url.startsWith("#");
  return (
    <article className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${verdictClass[ranked.verdict]}`}>
          {verdictLabel(ranked.verdict)}
        </span>
        <span className="text-sm font-medium text-muted">Score {ranked.score}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-ink">{trial.title}</h3>
      <p className="mt-1 text-sm text-muted">
        {formatPhases(trial.phases)}
        {trial.sponsor ? ` · ${trial.sponsor}` : ""}
      </p>
      {site ? (
        <p className="mt-3 text-sm text-ink">
          {`Nearest site: ${site.facility}, ${site.city}${site.state ? `, ${site.state}` : ""}${site.distanceMiles != null ? ` · ${site.distanceMiles} miles` : ""}`}
        </p>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-ink">{ranked.summary}</p>
      <details className="mt-4 rounded-xl border border-line bg-white">
        <summary className="cursor-pointer px-3 py-3 text-sm font-medium text-teal">Eligibility checklist</summary>
        <ul className="space-y-3 px-3 pb-3">
          {ranked.checks.map((check) => (
            <li key={`${check.criterion}-${check.status}`} className="text-sm">
              <p className="font-medium text-ink">
                <span aria-hidden="true">{check.status === "met" ? "✓" : check.status === "not_met" ? "✗" : "?"}</span>{" "}
                {checkLabel(check.status)} · {check.criterion}
              </p>
              <p className="mt-1 text-muted">{check.note}</p>
            </li>
          ))}
        </ul>
      </details>
      <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center">
        {demo ? (
          <span className="font-medium text-muted">Demo trial · {trial.nctId}</span>
        ) : (
          <a href={trial.url} target="_blank" rel="noreferrer" className="font-medium text-teal underline">
            {trial.nctId}
          </a>
        )}
        {site?.contactName ? <span className="text-muted">Contact {site.contactName}</span> : null}
        {site?.contactPhone ? (
          <a className="text-teal underline" href={`tel:${site.contactPhone}`}>
            {site.contactPhone}
          </a>
        ) : null}
        {site?.contactEmail ? (
          <a className="break-all text-teal underline" href={`mailto:${site.contactEmail}`}>
            {site.contactEmail}
          </a>
        ) : null}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onPacket} className="min-h-11 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white">
          Referral packet
        </button>
        <button type="button" onClick={onHandout} className="min-h-11 rounded-full border border-teal px-4 py-2 text-sm font-semibold text-teal">
          Patient handout
        </button>
      </div>
    </article>
  );
}
