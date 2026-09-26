import { loadEnvLocal } from "./load-env";
import { mockCriteria, mockCriteriaBreast, mockCriteriaDiabetes } from "../lib/mock/fixtures";

loadEnvLocal();
process.env.MOCK_DATA = "0";
process.env.MOCK_AI = "1";

async function main() {
const { geocodeZip } = await import("../lib/data/geo");
const { searchTrials } = await import("../lib/data/trials");

const zips = ["31709", "30303", "31401"];
for (const zip of zips) {
  const geo = geocodeZip(zip);
  if (!geo) {
    console.error(`geocode failed for ${zip}`);
    process.exit(1);
  }
  console.log(
    `${geo.zip} ${geo.city ?? ""} ${geo.state ?? ""} ${geo.county ?? ""} FIPS ${geo.countyFips ?? ""} ${geo.lat},${geo.lon}`,
  );
}

const cases = [
  ["A lung", mockCriteria],
  ["B diabetes", mockCriteriaDiabetes],
  ["C breast", mockCriteriaBreast],
] as const;

for (const [name, criteria] of cases) {
  const geo = geocodeZip(criteria.zip);
  const trials = await searchTrials(criteria, geo);
  console.log(`\n${name}: ${trials.length} recruiting trials with a site in range`);
  for (const trial of trials.slice(0, 3)) {
    const site = trial.nearestSite;
    const where = site ? `${site.city}, ${site.state}` : "no site";
    const miles = site?.distanceMiles != null ? `${site.distanceMiles} mi` : "distance n/a";
    console.log(`  ${trial.nctId} ${trial.title.slice(0, 80)} — ${where} — ${miles}`);
  }
}
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
