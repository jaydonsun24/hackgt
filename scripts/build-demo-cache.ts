import fs from "fs";
import path from "path";
import { DEMO_QUERIES } from "../lib/demo/queries";
import { loadEnvLocal } from "./load-env";

loadEnvLocal();
process.env.MOCK_AI = "0";
process.env.MOCK_DATA = "0";

if (!process.env.XAI_API_KEY) {
  console.error("Set XAI_API_KEY in .env.local before building the demo cache.");
  process.exit(1);
}

async function main() {
const { runMatch } = await import("../lib/match/run");
const { generateHandout } = await import("../lib/ai/handout");

const dir = path.join(process.cwd(), "data", "demo-cache");
fs.mkdirSync(dir, { recursive: true });

const cases = [
  ["a", DEMO_QUERIES.A, "31709", "es"],
  ["b", DEMO_QUERIES.B, "30303", "en"],
  ["c", DEMO_QUERIES.C, "31401", "en"],
] as const;

let lungTop: Awaited<ReturnType<typeof runMatch>> | null = null;

for (const [key, text, zip, patientLanguage] of cases) {
  const result = await runMatch({ text, zip, radiusMiles: 75, patientLanguage });
  fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(result, null, 2));
  console.log(`${key}: ${result.results.length} ranked, searched ${result.searchedCount}`);
  if (key === "a") lungTop = result;
}

const top = lungTop?.results[0];
if (lungTop && top) {
  const handout = await generateHandout({
    ranked: top,
    criteria: lungTop.criteria,
    language: "es",
    readingLevel: 6,
    withIllustration: true,
  });
  fs.writeFileSync(
    path.join(dir, "a-handout-es.json"),
    JSON.stringify({ nctId: top.trial.nctId, language: "es", handout }, null, 2),
  );
  console.log(`handout: ${handout.title} illustration=${Boolean(handout.illustrationUrl)}`);
}
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
