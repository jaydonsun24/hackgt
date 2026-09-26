import type { PatientCriteria, RankedTrial } from "../contracts";
import { env } from "../env";
import { mockReadback } from "../mock/fixtures";

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function writeReadback(criteria: PatientCriteria, ranked: RankedTrial[]): string {
  if (env.mockAi && ranked.length === 3 && ranked[0]?.trial.nctId === "DEMO-0001") return mockReadback;
  const condition = criteria.condition || "this note";
  if (ranked.length === 0) {
    return `I did not find a recruiting trial within ${criteria.radiusMiles} miles for ${condition}. A wider search radius may turn up more sites.`;
  }
  const top = ranked[0];
  const site = top.trial.nearestSite;
  const place = site ? `${site.city}${site.state ? `, ${site.state}` : ""}` : "a listed site";
  const distance = site?.distanceMiles != null ? `, about ${Math.round(site.distanceMiles)} miles away` : "";
  const outside = site?.distanceMiles != null && site.distanceMiles > criteria.radiusMiles;
  if (outside) {
    return `Nothing is recruiting within ${criteria.radiusMiles} miles for ${condition}. The closest recruiting site is in ${place}, about ${Math.round(site.distanceMiles as number)} miles away.`;
  }
  const count = `I found ${ranked.length} trial${ranked.length === 1 ? "" : "s"} that may fit this ${condition} note.`;
  const best = `The closest match is in ${place}${distance}.`;
  const unclear = top.checks.filter((check) => check.status === "unclear").map((check) => check.criterion);
  const confirm = unclear.length > 0
    ? `Before referring, confirm ${unclear.slice(0, 3).join(", ")}.`
    : "Review the checklist with the study site before referring.";
  return [sentence(count), sentence(best), sentence(confirm)].filter(Boolean).join(" ");
}
