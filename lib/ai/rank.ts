import type { CheckStatus, CriterionCheck, PatientCriteria, RankedTrial, Trial, Verdict } from "../contracts";
import { env } from "../env";
import {
  mockRanked,
  mockRankedBreast,
  mockRankedDiabetes,
} from "../mock/fixtures";
import { grokJson } from "./grok";

const SYSTEM = `You are screening public ClinicalTrials.gov listings for a physician. The physician will confirm every item. Be conservative.
Return one JSON object: {"trials":[{"nctId":"","score":0,"verdict":"possible","summary":"","checks":[{"criterion":"","status":"unclear","note":""}]}]}.
Rules:
- Use only the patient facts and the eligibility excerpt provided. Do not invent patient facts or trial rules.
- A missing patient fact is "unclear", never "met".
- status is "met", "unclear", or "not_met".
- verdict is "likely", "possible", or "unlikely".
- score is an integer from 0 to 100.
- summary is 1 or 2 sentences for the doctor.
- Include 3 to 6 decisive checks per trial.
- Copy nctId exactly from the input. Do not add trials.
- If the excerpt is truncated or silent on a rule, mark that rule unclear.`;

function cloneTrial(trial: Trial): Trial {
  return {
    ...trial,
    phases: [...trial.phases],
    conditions: [...trial.conditions],
    sites: trial.sites.map((site) => ({ ...site })),
    nearestSite: trial.nearestSite ? { ...trial.nearestSite } : undefined,
  };
}

function canned(trials: Trial[]): RankedTrial[] | null {
  const library = [...mockRanked, ...mockRankedDiabetes, ...mockRankedBreast];
  const byId = new Map(library.map((item) => [item.trial.nctId, item]));
  if (!trials.every((trial) => byId.has(trial.nctId))) return null;
  return trials
    .map((trial) => {
      const row = byId.get(trial.nctId);
      if (!row) return null;
      return {
        ...row,
        trial: cloneTrial(trial),
        checks: row.checks.map((check) => ({ ...check })),
      };
    })
    .filter((item): item is RankedTrial => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function parseYears(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return undefined;
  if (/month/i.test(value)) return n / 12;
  return n;
}

function keywordScore(criteria: PatientCriteria, trial: Trial): number {
  const words = [criteria.condition, ...criteria.conditionSynonyms, criteria.stage ?? "", ...criteria.keyFindings]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  const haystack = `${trial.title} ${trial.conditions.join(" ")} ${trial.eligibilityText}`.toLowerCase();
  let score = 0;
  for (const word of new Set(words)) {
    if (haystack.includes(word)) score += 1;
  }
  return score;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function asVerdict(value: unknown, score: number): Verdict {
  if (value === "likely" || value === "possible" || value === "unlikely") return value;
  if (score >= 75) return "likely";
  if (score >= 45) return "possible";
  return "unlikely";
}

function asStatus(value: unknown): CheckStatus {
  if (value === "met" || value === "unclear" || value === "not_met") return value;
  return "unclear";
}

function heuristicRank(criteria: PatientCriteria, trials: Trial[]): RankedTrial[] {
  const ranked: RankedTrial[] = trials.map((trial) => {
    const checks: CriterionCheck[] = [];
    const haystack = `${trial.title} ${trial.conditions.join(" ")}`.toLowerCase();
    const words = criteria.condition.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
    const conditionHit = words.some((word) => haystack.includes(word));
    checks.push({
      criterion: "Condition matches the listing",
      status: conditionHit ? "met" as const : "unclear" as const,
      note: conditionHit ? "The title or condition list overlaps the stated condition." : "Condition overlap is unclear from the public listing.",
    });

    if (criteria.age == null) {
      checks.push({ criterion: "Age", status: "unclear" as const, note: "Age was not stated in the note." });
    } else {
      const min = parseYears(trial.minAge);
      const max = parseYears(trial.maxAge);
      let status: CheckStatus = "unclear";
      let note = "The listing does not give a clear age bound.";
      if (min != null && criteria.age < min) {
        status = "not_met";
        note = `Age ${criteria.age} is below the listed minimum of ${trial.minAge}.`;
      } else if (max != null && criteria.age > max) {
        status = "not_met";
        note = `Age ${criteria.age} is above the listed maximum of ${trial.maxAge}.`;
      } else if (min != null || max != null) {
        status = "met";
        note = `Age ${criteria.age} is inside the listed range.`;
      }
      checks.push({ criterion: `Age ${criteria.age}`, status, note });
    }

    if (!criteria.sex || criteria.sex === "any") {
      checks.push({ criterion: "Sex", status: "unclear", note: "Sex was not stated in the note." });
    } else if (!trial.sex || trial.sex === "any") {
      checks.push({ criterion: "Sex", status: "met", note: "The listing does not restrict sex." });
    } else if (trial.sex === criteria.sex) {
      checks.push({ criterion: "Sex", status: "met", note: "Sex matches the listing." });
    } else {
      checks.push({ criterion: "Sex", status: "not_met", note: "The listing is limited to a different sex." });
    }

    if (criteria.stage) {
      checks.push({
        criterion: `Stage ${criteria.stage}`,
        status: "unclear",
        note: "Confirm the stage rule in the full eligibility criteria.",
      });
    }
    for (const finding of criteria.keyFindings.slice(0, 2)) {
      checks.push({
        criterion: finding,
        status: "unclear",
        note: "A coordinator needs to confirm this against the protocol.",
      });
    }

    const notMet = checks.some((check) => check.status === "not_met");
    const metCount = checks.filter((check) => check.status === "met").length;
    let score = 42 + metCount * 14 + Math.min(12, keywordScore(criteria, trial) * 3);
    if (notMet) score = Math.min(score, 34);
    if (trial.nearestSite?.distanceMiles != null) score -= Math.min(15, trial.nearestSite.distanceMiles / 12);
    score = clampScore(score);
    const verdict: Verdict = notMet ? "unlikely" : conditionHit && score >= 70 ? "likely" : score >= 45 || conditionHit ? "possible" : "unlikely";
    return {
      trial: cloneTrial(trial),
      score,
      verdict,
      summary: notMet
        ? "A listed requirement conflicts with a fact in the note. Confirm it before ruling the trial out."
        : conditionHit
          ? "The public listing overlaps the note. Confirm every unclear item with the study site."
          : "This listing came up from the words in the note. Confirm that it fits before referring.",
      checks: checks.slice(0, 6),
    };
  });
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      (a.trial.nearestSite?.distanceMiles ?? Number.POSITIVE_INFINITY) -
        (b.trial.nearestSite?.distanceMiles ?? Number.POSITIVE_INFINITY),
  );
  return ranked;
}

function prefilter(criteria: PatientCriteria, trials: Trial[]): Trial[] {
  if (trials.length <= 20) return trials;
  return [...trials].sort((a, b) => keywordScore(criteria, b) - keywordScore(criteria, a)).slice(0, 20);
}

async function grokRank(criteria: PatientCriteria, trials: Trial[]): Promise<RankedTrial[]> {
  const pool = prefilter(criteria, trials);
  const byId = new Map(pool.map((trial) => [trial.nctId.toUpperCase(), trial]));
  const payload = {
    patient: {
      condition: criteria.condition,
      age: criteria.age ?? null,
      sex: criteria.sex ?? "any",
      stage: criteria.stage ?? null,
      priorTreatments: criteria.priorTreatments,
      keyFindings: criteria.keyFindings,
    },
    trials: pool.map((trial) => ({
      nctId: trial.nctId,
      title: trial.title,
      phases: trial.phases,
      minAge: trial.minAge ?? null,
      maxAge: trial.maxAge ?? null,
      sex: trial.sex ?? "any",
      eligibilityText: trial.eligibilityText.slice(0, 3000),
    })),
  };
  const parsed = await grokJson<{ trials?: unknown }>({
    system: SYSTEM,
    user: JSON.stringify(payload),
    temperature: 0.2,
  });
  const rows = Array.isArray(parsed.trials) ? parsed.trials : [];
  const ranked: RankedTrial[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const nctId = typeof record.nctId === "string" ? record.nctId.trim().toUpperCase() : "";
    const trial = byId.get(nctId);
    if (!trial || seen.has(nctId)) continue;
    seen.add(nctId);
    const score = clampScore(typeof record.score === "number" ? record.score : Number(record.score));
    const checks = Array.isArray(record.checks)
      ? record.checks.slice(0, 6).flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const check = item as Record<string, unknown>;
          const criterion = typeof check.criterion === "string" ? check.criterion.trim() : "";
          const note = typeof check.note === "string" ? check.note.trim() : "";
          if (!criterion) return [];
          return [{ criterion, status: asStatus(check.status), note: note || "Confirm with the study site." }];
        })
      : [];
    const hasNotMet = checks.some((check) => check.status === "not_met");
    let verdict = asVerdict(record.verdict, score);
    if (hasNotMet && verdict === "likely") verdict = "possible";
    const summary = typeof record.summary === "string" ? record.summary.trim() : "";
    ranked.push({
      trial: cloneTrial(trial),
      score,
      verdict,
      summary: summary || "Review the checklist against the full eligibility criteria.",
      checks: checks.slice(0, 6),
    });
  }
  ranked.sort((a, b) => b.score - a.score);
  const missing = trials.filter((trial) => !seen.has(trial.nctId.toUpperCase()));
  if (missing.length > 0) ranked.push(...heuristicRank(criteria, missing));
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      (a.trial.nearestSite?.distanceMiles ?? Number.POSITIVE_INFINITY) -
        (b.trial.nearestSite?.distanceMiles ?? Number.POSITIVE_INFINITY),
  );
  return ranked;
}

function milesOf(row: RankedTrial): number | undefined {
  return row.trial.nearestSite?.distanceMiles;
}

function preferClosestWhenOutside(criteria: PatientCriteria, ranked: RankedTrial[]): RankedTrial[] {
  const known = ranked.filter((row) => milesOf(row) != null);
  if (known.length === 0 || known.some((row) => (milesOf(row) as number) <= criteria.radiusMiles)) return ranked;
  return [...ranked].sort((a, b) => (milesOf(a) ?? Number.POSITIVE_INFINITY) - (milesOf(b) ?? Number.POSITIVE_INFINITY));
}

export async function rankTrials(criteria: PatientCriteria, trials: Trial[]): Promise<RankedTrial[]> {
  if (trials.length === 0) return [];
  const ranked = env.mockAi ? (canned(trials) ?? heuristicRank(criteria, trials)) : await grokRank(criteria, trials);
  return preferClosestWhenOutside(criteria, ranked);
}
