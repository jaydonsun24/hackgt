"use client";

import { animate, stagger, type Target } from "animejs";
import { useLayoutEffect, useRef } from "react";
import type { SponsorStats } from "@/lib/contracts";
import { reducedMotion, useCountUp, useReveal } from "@/lib/motion";

// Chart marks, checked with the dataviz palette validator against the card surface.
const OTHER_FILL = "#00909c";
const HIGH_FILL = "#b8612a";

export function SponsorDashboard({ stats }: { stats: SponsorStats }) {
  const max = Math.max(...stats.regions.map((region) => region.referrals));
  const highShare = stats.totalReferrals
    ? Math.round((100 * stats.regions.reduce((sum, region) => sum + region.referrals * region.highSviShare, 0)) / stats.totalReferrals)
    : 0;
  const rootRef = useReveal<HTMLDivElement>([], { y: 8, duration: 500, stagger: 80 });
  const barsRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const list = barsRef.current;
    if (!list || reducedMotion()) return;
    const bars = Array.from(list.querySelectorAll<HTMLElement>("[data-bar]"));
    const grow = animate(bars, {
      width: (bar: Target) => ["0%", (bar as HTMLElement).dataset.bar ?? "0%"],
      duration: 1100,
      delay: stagger(80, { start: 450 }),
      ease: "outExpo",
    });
    return () => {
      grow.revert();
    };
  }, []);

  return (
    <div ref={rootRef}>
      <div className="max-w-3xl">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink">Sponsor dashboard</h1>
        <p className="mt-1.5 text-[17px] leading-relaxed text-muted">
          Sponsors pay per qualified referral from clinics they can&apos;t otherwise reach.
        </p>
        <p className="mt-4 border-l-4 border-gold bg-sand px-3 py-2 text-sm text-ink">
          <span className="font-semibold">Simulated data for demonstration.</span> These numbers are not real clinic activity.
        </p>
      </div>

      <div data-reveal="" className="mt-6 grid divide-y divide-line rounded-md border border-line bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label="Total referrals" value={stats.totalReferrals} format={(n) => Math.round(n).toLocaleString("en-US")} />
        <Stat label="From high-vulnerability counties" value={highShare} format={(n) => `${Math.round(n)}%`} />
        <Stat label="Regions covered" value={stats.regions.length} format={(n) => String(Math.round(n))} />
      </div>

      <section data-reveal="" aria-labelledby="regions" className="mt-6 rounded-md border border-line bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="regions" className="text-lg font-semibold text-ink">
              Referrals by Georgia region
            </h2>
            <p className="mt-1 text-sm text-muted">Each bar splits referrals from high-vulnerability counties and all other counties.</p>
          </div>
          <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: HIGH_FILL }} />
              High-vulnerability counties
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: OTHER_FILL }} />
              Other counties
            </li>
          </ul>
        </div>

        <ul ref={barsRef} className="mt-6 space-y-4">
          {stats.regions.map((region) => {
            const width = `${(region.referrals / max) * 100}%`;
            const high = Math.round(region.highSviShare * 100);
            const highCount = Math.round(region.referrals * region.highSviShare);
            const summary = `${region.region}: ${region.referrals} referrals, ${highCount} (${high}%) from high-vulnerability counties`;
            return (
              <li key={region.region} className="grid gap-1.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                <p className="text-sm font-medium text-ink">{region.region}</p>
                <div className="mr-36">
                  <div data-bar={width} className="group relative flex h-6" style={{ width }}>
                    <div
                      tabIndex={0}
                      aria-label={summary}
                      className="flex h-full w-full gap-[2px] outline-offset-4"
                    >
                      <span className="h-full" style={{ width: `${high}%`, background: HIGH_FILL }} />
                      <span className="h-full flex-1 rounded-r-[4px]" style={{ background: OTHER_FILL }} />
                    </div>
                    <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap text-sm">
                      <span className="font-semibold tabular-nums text-ink">{region.referrals}</span>
                      <span className="text-muted"> · {high}% high SVI</span>
                    </span>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden w-max max-w-64 rounded bg-ink px-3 py-2 text-xs leading-relaxed text-white shadow-overlay group-focus-within:block group-hover:block"
                    >
                      <span className="block font-semibold">{region.region}</span>
                      {region.referrals} referrals · {highCount} from high-vulnerability counties
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <details className="mt-6 border-t border-line pt-4">
          <summary className="inline-flex cursor-pointer justify-start text-sm font-semibold text-teal hover:underline">View as table</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th scope="col" className="py-1.5 pr-4 font-medium">Region</th>
                  <th scope="col" className="py-1.5 pr-4 text-right font-medium">Referrals</th>
                  <th scope="col" className="py-1.5 text-right font-medium">High SVI share</th>
                </tr>
              </thead>
              <tbody className="tabular-nums text-ink">
                {stats.regions.map((region) => (
                  <tr key={region.region} className="border-t border-line/60">
                    <th scope="row" className="py-1.5 pr-4 font-medium">{region.region}</th>
                    <td className="py-1.5 pr-4 text-right">{region.referrals}</td>
                    <td className="py-1.5 text-right">{Math.round(region.highSviShare * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}

function Stat({ label, value, format }: { label: string; value: number; format: (n: number) => string }) {
  const shown = useCountUp(value, 1400, 250);
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-mono text-3xl font-medium tabular-nums text-ink">
        <span aria-hidden="true">{format(shown)}</span>
        <span className="sr-only">{format(value)}</span>
      </p>
    </div>
  );
}
