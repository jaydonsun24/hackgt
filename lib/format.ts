import type { CheckStatus, Sex, Verdict } from "./contracts";

export function clampRadius(n: number, fallback = 75): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(300, Math.max(10, Math.round(n)));
}

export function normalizeZip(zip?: string): string | undefined {
  if (!zip) return undefined;
  const match = zip.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match?.[1];
}

export function formatPhase(phase: string): string {
  if (/early[_\s-]*phase[_\s-]*1/i.test(phase)) return "Early Phase 1";
  const numbered = phase.match(/phase[_\s-]*(\d)/i);
  if (numbered) return `Phase ${numbered[1]}`;
  return phase.replaceAll("_", " ");
}

export function formatPhases(phases: string[]): string {
  if (phases.length === 0) return "Phase not listed";
  return phases.map(formatPhase).join(", ");
}

export function verdictLabel(verdict: Verdict): string {
  if (verdict === "likely") return "Likely";
  if (verdict === "possible") return "Possible";
  return "Unlikely";
}

export function checkLabel(status: CheckStatus): string {
  if (status === "met") return "Met";
  if (status === "not_met") return "Not met";
  return "Unclear";
}

export function sexLabel(sex?: Sex): string | undefined {
  if (sex === "male") return "Male";
  if (sex === "female") return "Female";
  return undefined;
}

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "vi", label: "Vietnamese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ht", label: "Haitian Creole" },
] as const;

export function languageName(code: string): string {
  const hit = LANGUAGE_OPTIONS.find((item) => item.code === code.toLowerCase().split("-")[0]);
  return hit?.label ?? code;
}

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earth = 3958.7613;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}
