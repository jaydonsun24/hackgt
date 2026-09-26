import type { SponsorStats } from "../contracts";
import { env } from "../env";
import { mockSponsorStats } from "../mock/fixtures";

function copyStats(stats: SponsorStats): SponsorStats {
  return {
    isIllustrative: true,
    totalReferrals: stats.totalReferrals,
    regions: stats.regions.map((region) => ({ ...region })),
  };
}

export function getSponsorStats(): SponsorStats {
  if (env.mockData) return copyStats(mockSponsorStats);
  return copyStats(mockSponsorStats);
}
