export const DEMO_QUERIES = {
  A: "58 year old man, stage III non-small cell lung cancer, EGFR negative, finished carboplatin and pemetrexed two months ago, ECOG 1. Clinic ZIP 31709. Patient prefers Spanish.",
  B: "62 year old woman, type 2 diabetes, HbA1c 9.1 on metformin, BMI 34. ZIP 30303.",
  C: "47 year old woman, stage II HER2-positive breast cancer, newly diagnosed, no treatment yet. ZIP 31401. Prefers English.",
} as const;

export type DemoKey = keyof typeof DEMO_QUERIES;

export function normalizeQuery(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function matchDemoKey(text: string): DemoKey | null {
  const n = normalizeQuery(text);
  if (n === normalizeQuery(DEMO_QUERIES.A)) return "A";
  if (n === normalizeQuery(DEMO_QUERIES.B)) return "B";
  if (n === normalizeQuery(DEMO_QUERIES.C)) return "C";
  return null;
}
