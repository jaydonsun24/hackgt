import type { SponsorStats } from "@/lib/contracts";

export function SponsorDashboard({ stats }: { stats: SponsorStats }) {
  const max = Math.max(...stats.regions.map((region) => region.referrals));
  const highShare = stats.totalReferrals
    ? Math.round((100 * stats.regions.reduce((sum, region) => sum + region.referrals * region.highSviShare, 0)) / stats.totalReferrals)
    : 0;

  return (
    <div>
      <p className="inline-flex rounded-full bg-[#f8efe6] px-3 py-1 text-sm font-semibold text-copper">
        Simulated data for demonstration
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">Sponsor dashboard</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink">
        Sponsors pay per qualified referral from clinics they can&apos;t otherwise reach.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Total referrals" value={stats.totalReferrals.toLocaleString("en-US")} />
        <Stat label="From high-vulnerability counties" value={`${highShare}%`} />
        <Stat label="Regions covered" value={String(stats.regions.length)} />
      </div>
      <h2 className="mt-8 text-lg font-semibold">Referrals by Georgia region</h2>
      <ul className="mt-4 space-y-4">
        {stats.regions.map((region) => {
          const width = Math.max(42, Math.round((region.referrals / max) * 100));
          const high = Math.round(region.highSviShare * 100);
          return (
            <li key={region.region}>
              <p className="mb-1 text-sm font-medium text-ink">{region.region}</p>
              <div className="h-10 overflow-hidden rounded-full bg-line">
                <div
                  className="flex h-10 max-w-full items-center justify-between gap-2 rounded-full bg-teal px-3 text-sm font-medium text-white"
                  style={{ width: `${width}%`, minWidth: "min(100%, 9.5rem)" }}
                >
                  <span>{region.referrals}</span>
                  <span>{high}% high SVI</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
