"use client";

import { animate } from "animejs";
import { useLayoutEffect, useRef } from "react";
import type { EquitySnapshot } from "@/lib/contracts";
import { reducedMotion, useCountUp } from "@/lib/motion";

export function EquityCard({ equity }: { equity: EquitySnapshot }) {
  const percent = equity.sviOverall == null ? null : Math.round(equity.sviOverall * 100);
  const shownPercent = useCountUp(percent ?? 0, 1200, 250);
  const fillRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fill = fillRef.current;
    if (!fill || percent == null || reducedMotion()) return;
    const grow = animate(fill, { width: ["0%", `${percent}%`], duration: 1200, delay: 250, ease: "outExpo" });
    return () => {
      grow.revert();
    };
  }, [percent]);

  return (
    <aside data-reveal="" aria-labelledby="equity-title" className="rounded-md border border-line bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="equity-title" className="text-[15px] font-semibold text-ink">
          Equity Lens
        </h2>
        {equity.isIllustrative ? <span className="text-xs text-copper">Illustrative data</span> : null}
      </div>
      <p className="mt-0.5 text-sm text-muted">
        {equity.county} County, {equity.state}
      </p>

      {percent != null ? (
        <div className="mt-4">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-3xl font-medium tabular-nums text-ink">{Math.round(shownPercent)}</span>
            <span className="text-sm text-muted">of 100 · {equity.sviLabel}</span>
          </p>
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={`Social vulnerability percentile ${percent} out of 100`}
            className="mt-2 h-2 overflow-hidden rounded-sm bg-[#e6e0d5]"
          >
            <div ref={fillRef} className="h-full bg-copper" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">CDC Social Vulnerability Index, 0 to 100. Higher means more vulnerable.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">{equity.sviLabel}</p>
      )}

      <p className="mt-4 border-t border-line pt-3 text-sm text-ink">
        {equity.nearestMatchMiles != null ? (
          <>
            Nearest match: <span className="font-mono font-medium">{Math.round(equity.nearestMatchMiles)} miles</span>
          </>
        ) : (
          "Nearest match distance is not available."
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{equity.note}</p>
    </aside>
  );
}
