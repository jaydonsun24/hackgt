import { DEMO_QUERIES } from "../lib/demo/queries";
import { loadEnvLocal } from "./load-env";

loadEnvLocal();
process.env.MOCK_AI = "0";
process.env.MOCK_DATA = "0";

if (!process.env.XAI_API_KEY) {
  console.error("Set XAI_API_KEY in .env.local before running scripts/test-ai.ts.");
  process.exit(1);
}

async function main() {
const { runMatch } = await import("../lib/match/run");

const cases = [
  ["A", DEMO_QUERIES.A, "31709", "es"],
  ["B", DEMO_QUERIES.B, "30303", "en"],
  ["C", DEMO_QUERIES.C, "31401", "en"],
] as const;

for (const [name, text, zip, patientLanguage] of cases) {
  const result = await runMatch({ text, zip, radiusMiles: 75, patientLanguage });
  console.log(`\n=== ${name} ${result.criteria.condition} ===`);
  console.log(result.readback);
  console.log(`searched ${result.searchedCount} in ${result.timingsMs.total} ms`);
  for (const row of result.results) {
    const site = row.trial.nearestSite;
    console.log(
      `${row.verdict} ${row.score} ${row.trial.nctId} ${site?.city ?? ""} ${site?.distanceMiles ?? "?"} mi`,
    );
    console.log(`  ${row.summary}`);
  }
}
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
