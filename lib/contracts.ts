// FROZEN after Phase 0. Ask before changing.

export interface MatchRequest {
  text: string;            // de-identified note or transcript
  zip?: string;            // clinic ZIP; may also be extracted from text
  radiusMiles?: number;
  patientLanguage?: string; // BCP-47, e.g. "en", "es"
}

export type Sex = "male" | "female" | "any";

export interface PatientCriteria {
  condition: string;
  conditionSynonyms: string[];
  age?: number;
  sex?: Sex;
  stage?: string;
  priorTreatments: string[];
  keyFindings: string[];   // biomarkers, ECOG, key labs, comorbidities
  zip?: string;
  radiusMiles: number;
  patientLanguage: string;
}

export interface TrialSite {
  facility: string; city: string; state: string; zip?: string;
  lat?: number; lon?: number; distanceMiles?: number;
  contactName?: string; contactPhone?: string; contactEmail?: string;
}

export interface Trial {
  nctId: string; title: string; phases: string[]; sponsor?: string;
  conditions: string[]; eligibilityText: string;
  minAge?: string; maxAge?: string; sex?: Sex;
  nearestSite?: TrialSite; sites: TrialSite[];  // closest first
  url: string;                                  // https://clinicaltrials.gov/study/<nctId>
}

export type CheckStatus = "met" | "unclear" | "not_met";
export interface CriterionCheck { criterion: string; status: CheckStatus; note: string; }

export type Verdict = "likely" | "possible" | "unlikely";
export interface RankedTrial {
  trial: Trial; score: number; /* 0-100 */ verdict: Verdict;
  summary: string; checks: CriterionCheck[];
}

export interface GeoPoint {
  zip: string; lat: number; lon: number;
  city?: string; state?: string; county?: string; countyFips?: string;
}

export interface EquitySnapshot {
  county: string; state: string;
  sviOverall?: number;       // 0-1, higher = more vulnerable
  sviLabel: string;
  nearestMatchMiles?: number;
  note: string;
  isIllustrative: boolean;   // true when from fixtures
}

export interface SponsorRegionStat { region: string; referrals: number; highSviShare: number; }
export interface SponsorStats { regions: SponsorRegionStat[]; totalReferrals: number; isIllustrative: true; }

export interface MatchResponse {
  criteria: PatientCriteria;
  results: RankedTrial[];    // best first, max 5
  searchedCount: number;
  readback: string;          // 2-4 sentences spoken aloud
  equity?: EquitySnapshot;
  mocked: { ai: boolean; data: boolean };
  timingsMs: Record<string, number>;
}

export interface HandoutRequest {
  ranked: RankedTrial; criteria: PatientCriteria;
  language: string; readingLevel?: number; withIllustration?: boolean;
}
export interface HandoutSection { heading: string; body: string; }
export interface Handout {
  title: string; language: string; sections: HandoutSection[];
  questionsToAsk: string[]; illustrationUrl?: string; disclaimer: string;
}

export interface ApiError { error: string; stage?: string; }
