"use client";

import type { CheckStatus, RankedTrial, Verdict } from "@/lib/contracts";
import { checkLabel, formatPhases, verdictLabel } from "@/lib/format";

const verdictColor: Record<Verdict, string> = {
  likely: "#1e6b3a",
  possible: "#8a5a00",
  unlikely: "#5b6670",
};

const checkMark: Record<CheckStatus, { mark: string; color: string }> = {
  met: { mark: "✓", color: "#1e6b3a" },
  unclear: { mark: "?", color: "#8a5a00" },
  not_met: { mark: "✗", color: "#a3321f" },
};

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
  const tally = (["met", "unclear", "not_met"] as const)
    .map((status) => ({ status, count: ranked.checks.filter((check) => check.status === status).length }))
    .filter((item) => item.count > 0)
    .map((item) => `${item.count} ${checkLabel(item.status).toLowerCase()}`)
    .join(", ");

  return (
    <li data-reveal="" className="px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 text-sm">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: verdictColor[ranked.verdict] }} />
          <span className="font-semibold" style={{ color: verdictColor[ranked.verdict] }}>
            {verdictLabel(ranked.verdict)}
          </span>
          <span className="font-mono text-muted">
            <span className="sr-only">Score </span>
            {ranked.score}/100
          </span>
        </p>
        {demo ? (
          <span className="font-mono text-sm text-muted">Demo trial · {trial.nctId}</span>
        ) : (
          <a href={trial.url} target="_blank" rel="noreferrer" className="font-mono text-sm text-teal underline underline-offset-2">
            {trial.nctId}
          </a>
        )}
      </div>

      <h3 className="mt-2 text-[17px] font-semibold leading-snug text-ink">{trial.title}</h3>
      <p className="mt-1 text-sm text-muted">
        {formatPhases(trial.phases)}
        {trial.sponsor ? ` · ${trial.sponsor}` : ""}
      </p>

      {site ? (
        <p className="mt-3 text-sm text-ink">
          <span className="text-muted">Nearest site: </span>
          {`${site.facility}, ${site.city}${site.state ? `, ${site.state}` : ""}`}
          {site.distanceMiles != null ? <span className="ml-2 whitespace-nowrap font-mono font-medium">{site.distanceMiles} mi</span> : null}
        </p>
      ) : null}

      <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-ink">{ranked.summary}</p>

      <details className="mt-3">
        <summary className="inline-flex cursor-pointer justify-start text-sm font-semibold text-teal hover:underline">
          Eligibility: {tally || "no criteria listed"}
        </summary>
        <ul className="mt-2 space-y-2 border-l-2 border-line pl-4">
          {ranked.checks.map((check) => (
            <li key={`${check.criterion}-${check.status}`} className="flex gap-2.5 text-sm">
              <span aria-hidden="true" className="w-3 shrink-0 font-bold" style={{ color: checkMark[check.status].color }}>
                {checkMark[check.status].mark}
              </span>
              <span>
                <span className="font-medium text-ink">
                  {checkLabel(check.status)} · {check.criterion}
                </span>
                <span className="block text-muted">{check.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex gap-2">
          <button type="button" onClick={onPacket} className="min-h-10 rounded bg-teal px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-dark">
            Referral packet
          </button>
          <button
            type="button"
            onClick={onHandout}
            className="min-h-10 rounded border border-teal bg-white px-3.5 py-2 text-sm font-semibold text-teal hover:bg-teal-soft"
          >
            Patient handout
          </button>
        </div>
        {site?.contactName || site?.contactPhone || site?.contactEmail ? (
          <p className="flex flex-wrap gap-x-3 text-sm text-muted">
            {site?.contactName ? <span>Contact: {site.contactName}</span> : null}
            {site?.contactPhone ? (
              <a className="font-mono text-teal underline underline-offset-2" href={`tel:${site.contactPhone}`}>
                {site.contactPhone}
              </a>
            ) : null}
            {site?.contactEmail ? (
              <a className="break-all text-teal underline underline-offset-2" href={`mailto:${site.contactEmail}`}>
                {site.contactEmail}
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}
