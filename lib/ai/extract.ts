import type { MatchRequest, PatientCriteria, Sex } from "../contracts";
import { matchDemoKey } from "../demo/queries";
import { env } from "../env";
import { clampRadius, normalizeZip } from "../format";
import { mockCriteria, mockCriteriaBreast, mockCriteriaDiabetes } from "../mock/fixtures";
import { grokJson } from "./grok";

const SYSTEM = `You extract trial-search facts from a de-identified clinical note.
Return one JSON object and nothing else.
Use only facts stated in the note. If a fact is missing, use null for scalars and [] for lists. Never guess, infer, or fill a typical value.
Fields:
- condition: the plain clinical term for the main condition, or null
- conditionSynonyms: common search synonyms explicitly supported by the condition name, such as abbreviations. Do not add unrelated diseases.
- age: number or null
- sex: "male", "female", or null
- stage: string or null
- priorTreatments: string[]
- keyFindings: string[] for biomarkers, ECOG, key labs, and comorbidities that are stated
- zip: 5-digit clinic ZIP if stated, else null
- patientLanguage: BCP-47 language if the note states a preference, else null
Do not include the patient's name, address, phone, or record number even if present.`;

function cloneCriteria(criteria: PatientCriteria): PatientCriteria {
  return {
    ...criteria,
    conditionSynonyms: [...criteria.conditionSynonyms],
    priorTreatments: [...criteria.priorTreatments],
    keyFindings: [...criteria.keyFindings],
  };
}

function statedAge(text: string): number | undefined {
  const patterns = [
    /\b(\d{1,3})\s*(?:-|\s)?(?:year|yr)s?\s*old\b/i,
    /\b(\d{1,3})\s*(?:y\/o|yo)\b/i,
    /\bage[d]?\s*(?:of|:)?\s*(\d{1,3})\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const age = Number(match[1]);
    if (Number.isFinite(age) && age >= 0 && age <= 130) return age;
  }
  return undefined;
}

function withoutAge(text: string): string {
  return text
    .replace(/\b\d{1,3}\s*(?:-|\s)?(?:year|yr)s?\s*old\b/gi, " ")
    .replace(/\b\d{1,3}\s*(?:y\/o|yo)\b/gi, " ")
    .replace(/\bage[d]?\s*(?:of|:)?\s*\d{1,3}\b/gi, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ", ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, "");
}

const FILLER = new Set([
  "a",
  "an",
  "the",
  "with",
  "and",
  "or",
  "who",
  "has",
  "had",
  "have",
  "patient",
  "person",
  "old",
  "year",
  "years",
  "of",
  "is",
  "there",
  "this",
  "diagnosed",
  "presents",
  "presented",
  "complains",
  "complaining",
  "suffering",
  "history",
  "from",
  "been",
  "was",
  "in",
  "on",
  "for",
  "his",
  "her",
  "their",
]);
const SEX_WORDS = new Set(["male", "female", "man", "woman", "boy", "girl", "men", "women"]);
const CLINICAL_WORDS = [
  "cancer",
  "carcinoma",
  "pancreatic",
  "pancreas",
  "diabetes",
  "breast",
  "lung",
  "prostate",
  "hypertension",
  "asthma",
  "depression",
  "stroke",
  "obesity",
  "kidney",
  "heart",
  "failure",
  "colorectal",
  "colon",
  "hematuria",
  "melanoma",
  "leukemia",
  "lymphoma",
  "ovarian",
  "cervical",
  "bladder",
  "liver",
  "gastric",
  "stomach",
  "thyroid",
  "myeloma",
  "sarcoma",
  "migraine",
  "arthritis",
  "alzheimer",
  "dementia",
  "seizure",
  "epilepsy",
  "copd",
  "nsclc",
];

function editDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const grid = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let row = 0; row < rows; row += 1) grid[row][0] = row;
  for (let col = 0; col < cols; col += 1) grid[0][col] = col;
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      let best = Math.min(grid[row - 1][col] + 1, grid[row][col - 1] + 1, grid[row - 1][col - 1] + cost);
      if (row > 1 && col > 1 && left[row - 1] === right[col - 2] && left[row - 2] === right[col - 1]) {
        best = Math.min(best, grid[row - 2][col - 2] + 1);
      }
      grid[row][col] = best;
    }
  }
  return grid[left.length][right.length];
}

function correctToken(token: string): string {
  if (token.length < 5 || CLINICAL_WORDS.includes(token)) return token;
  let best = "";
  let bestDistance = 2;
  for (const word of CLINICAL_WORDS) {
    if (Math.abs(word.length - token.length) > 1) continue;
    const distance = editDistance(token, word);
    if (distance < bestDistance) {
      best = word;
      bestDistance = distance;
    } else if (distance === bestDistance) {
      best = "";
    }
  }
  return bestDistance === 1 && best ? best : token;
}

function clinicalPhrase(text: string): string {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9+-]+/)
    .filter(Boolean)
    .map(correctToken);
  const kept: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (SEX_WORDS.has(token) && next !== "breast") continue;
    if (FILLER.has(token)) continue;
    kept.push(token);
  }
  return kept.join(" ");
}

function statedSex(text: string): Sex {
  const lowered = text.toLowerCase();
  const male = /\b(man|male|boy)\b/.test(lowered);
  const female = /\b(woman|female|girl)\b/.test(lowered);
  if (male && !female) return "male";
  if (female && !male) return "female";
  return "any";
}

function statedComplaint(text: string): string {
  let cleaned = text.replace(/\s+/g, " ").trim().replace(/[.?!]+$/g, "");
  cleaned = cleaned.replace(/\b(?:clinic\s+)?zip\s*:?\s*\d{5}\b/gi, " ").replace(/\s+/g, " ").trim();
  cleaned = withoutAge(cleaned);
  const lead =
    /^(?:there\s+is\s+|this\s+is\s+|i\s+have\s+(?:a\s+)?patient\s+)?(?:an?\s+)?(?:\d{1,3}\s*(?:-|\s)?(?:year|yr)s?\s*old\s+)?(?:man|woman|male|female|boy|girl|patient|person)\s*(?:,\s*|\s+)?(?:who\s+)?(?:has\s+been\s+diagnosed\s+with|was\s+diagnosed\s+with|diagnosed\s+with|presents\s+with|presented\s+with|complains\s+of|complaining\s+of|suffering\s+from|history\s+of|has|had|with)\s+/i;
  let body = cleaned.replace(lead, "").replace(/^(?:a|an|the)\s+/i, "").trim();
  if (!body) body = cleaned;
  body = body.replace(/\bstage\s+([0-4]|[ivx]{1,4})\b/gi, " ");
  body = clinicalPhrase(body);
  if (!body) body = clinicalPhrase(cleaned);
  if (body.length > 160) body = `${body.slice(0, 157).trim()}...`;
  return body;
}

function statedCriteria(text: string): PatientCriteria {
  const lowered = text.toLowerCase();
  const stage = lowered.match(/\bstage\s+([0-4]|[ivx]{1,4})\b/i)?.[1];
  return {
    condition: statedComplaint(text),
    conditionSynonyms: [],
    age: statedAge(text),
    sex: statedSex(text),
    stage: stage ? stage.toUpperCase() : undefined,
    priorTreatments: [],
    keyFindings: [],
    radiusMiles: env.defaultRadiusMiles,
    patientLanguage: "en",
  };
}

function pickFixture(text: string): PatientCriteria {
  const demo = matchDemoKey(text);
  if (demo === "A") return cloneCriteria(mockCriteria);
  if (demo === "B") return cloneCriteria(mockCriteriaDiabetes);
  if (demo === "C") return cloneCriteria(mockCriteriaBreast);
  return statedCriteria(text);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function asSex(value: unknown): Sex {
  if (value === "male" || value === "female" || value === "any") return value;
  return "any";
}

function asAge(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 130) return undefined;
  return Math.round(n);
}

function applyOverrides(base: PatientCriteria, req: MatchRequest): PatientCriteria {
  const zip = normalizeZip(req.zip) ?? base.zip;
  const language = (req.patientLanguage || base.patientLanguage || "en").toLowerCase();
  const radius = clampRadius(req.radiusMiles ?? base.radiusMiles ?? env.defaultRadiusMiles, env.defaultRadiusMiles);
  return {
    condition: base.condition.trim(),
    conditionSynonyms: [...new Set(base.conditionSynonyms.map((item) => item.trim()).filter(Boolean))],
    age: base.age,
    sex: base.sex ?? "any",
    stage: base.stage,
    priorTreatments: base.priorTreatments,
    keyFindings: base.keyFindings,
    zip,
    radiusMiles: radius,
    patientLanguage: language,
  };
}

async function fromModel(req: MatchRequest): Promise<PatientCriteria> {
  const parsed = await grokJson<Record<string, unknown>>({
    system: SYSTEM,
    user: req.text,
    temperature: 0,
  });
  return {
    condition: asString(parsed.condition) ?? "",
    conditionSynonyms: asStringList(parsed.conditionSynonyms),
    age: asAge(parsed.age),
    sex: asSex(parsed.sex),
    stage: asString(parsed.stage),
    priorTreatments: asStringList(parsed.priorTreatments),
    keyFindings: asStringList(parsed.keyFindings),
    zip: normalizeZip(asString(parsed.zip)),
    radiusMiles: env.defaultRadiusMiles,
    patientLanguage: asString(parsed.patientLanguage)?.toLowerCase() ?? "en",
  };
}

export async function extractCriteria(req: MatchRequest): Promise<PatientCriteria> {
  const base = env.mockAi ? pickFixture(req.text) : await fromModel(req);
  return applyOverrides(base, req);
}
