import type { EquitySnapshot } from "@/lib/contracts";

export function EquityCard({ equity }: { equity: EquitySnapshot }) {
  const percent = equity.sviOverall == null ? null : Math.round(equity.sviOverall * 100);
  return (
    <aside className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-ink">Equity Lens</h2>
        {equity.isIllustrative ? (
          <span className="rounded-full bg-[#f8efe6] px-2 py-1 text-xs font-medium text-copper">Illustrative data</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-ink">
        {equity.county} County, {equity.state}
      </p>
      {percent != null ? (
        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{percent}</span>
            <span className="text-right text-muted">{equity.sviLabel}</span>
          </div>
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={`Social vulnerability percentile ${percent} out of 100`}
            className="h-3 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-teal" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">CDC Social Vulnerability Index, 0 to 100. Higher means more vulnerable.</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">{equity.sviLabel}</p>
      )}
      <p className="mt-4 text-sm text-ink">
        {equity.nearestMatchMiles != null
          ? `Nearest match: ${Math.round(equity.nearestMatchMiles)} miles`
          : "Nearest match distance is not available."}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{equity.note}</p>
    </aside>
  );
}
