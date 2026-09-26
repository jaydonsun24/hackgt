import type { PatientCriteria, Sex, Trial, TrialSite } from "../contracts";
import type { GeoPoint } from "../contracts";
import { env } from "../env";
import { haversineMiles, normalizeZip } from "../format";
import { geocodeZip } from "./geo";
import {
  mockCriteria,
  mockCriteriaBreast,
  mockCriteriaDiabetes,
  mockTrials,
  mockTrialsBreast,
  mockTrialsDiabetes,
} from "../mock/fixtures";

const FIELDS = [
  "NCTId",
  "BriefTitle",
  "Phase",
  "LeadSponsorName",
  "Condition",
  "EligibilityCriteria",
  "MinimumAge",
  "MaximumAge",
  "Sex",
  "LocationFacility",
  "LocationCity",
  "LocationState",
  "LocationZip",
  "LocationCountry",
  "LocationStatus",
  "LocationGeoPoint",
  "LocationContactName",
  "LocationContactPhone",
  "LocationContactEMail",
  "CentralContactName",
  "CentralContactPhone",
  "CentralContactEMail",
].join(",");

interface CtContact {
  name?: string;
  phone?: string;
  email?: string;
}

interface CtLocation {
  facility?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  status?: string;
  geoPoint?: { lat?: number; lon?: number };
  contacts?: CtContact[];
}

interface CtStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
    conditionsModule?: { conditions?: string[] };
    designModule?: { phases?: string[] };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
    };
    contactsLocationsModule?: {
      centralContacts?: CtContact[];
      locations?: CtLocation[];
    };
  };
}

function cloneTrial(trial: Trial): Trial {
  return {
    ...trial,
    phases: [...trial.phases],
    conditions: [...trial.conditions],
    sites: trial.sites.map((item) => ({ ...item })),
    nearestSite: trial.nearestSite ? { ...trial.nearestSite } : undefined,
  };
}

function sameDemoPatient(criteria: PatientCriteria, fixture: PatientCriteria): boolean {
  return (
    criteria.condition === fixture.condition &&
    criteria.age === fixture.age &&
    (criteria.stage ?? "") === (fixture.stage ?? "") &&
    criteria.priorTreatments.join("|") === fixture.priorTreatments.join("|")
  );
}

function mockForCriteria(criteria: PatientCriteria): Trial[] | null {
  if (sameDemoPatient(criteria, mockCriteria)) return mockTrials.map(cloneTrial);
  if (sameDemoPatient(criteria, mockCriteriaDiabetes)) return mockTrialsDiabetes.map(cloneTrial);
  if (sameDemoPatient(criteria, mockCriteriaBreast)) return mockTrialsBreast.map(cloneTrial);
  return null;
}

function retrievalQuery(criteria: PatientCriteria): string {
  const spoken = criteria.condition.toLowerCase();
  const extras: string[] = [];
  const urinary = /\b(pee|peeing|urine|urinary|urinating)\b/.test(spoken);
  if (urinary && /\bblood\b/.test(spoken)) extras.push("hematuria");
  else if (urinary) extras.push("urinary symptoms");
  return [conditionQuery(criteria, true), ...extras].filter(Boolean).join(" OR ");
}

function normSex(raw?: string): Sex {
  const value = (raw ?? "").toUpperCase();
  if (value === "MALE") return "male";
  if (value === "FEMALE") return "female";
  return "any";
}

function cleanTerm(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s.+-]/gu, " ").replace(/\s+/g, " ").trim();
}

function conditionQuery(criteria: PatientCriteria, synonyms: boolean): string {
  const parts = synonyms
    ? [criteria.condition, ...criteria.conditionSynonyms]
    : [criteria.condition];
  const unique = new Set<string>();
  for (const part of parts) {
    const cleaned = cleanTerm(part);
    if (cleaned) unique.add(cleaned);
  }
  return [...unique].join(" OR ");
}

function siteCoordinates(location: CtLocation): { lat: number; lon: number } | null {
  const lat = location.geoPoint?.lat;
  const lon = location.geoPoint?.lon;
  if (typeof lat === "number" && typeof lon === "number") return { lat, lon };
  const zip = normalizeZip(location.zip);
  if (!zip) return null;
  const geo = geocodeZip(zip);
  if (!geo) return null;
  return { lat: geo.lat, lon: geo.lon };
}

function mapStudy(study: CtStudy, origin: GeoPoint | null, radius: number): Trial | null {
  const protocol = study.protocolSection;
  const nctId = protocol?.identificationModule?.nctId?.trim();
  if (!nctId || !/^NCT\d+$/i.test(nctId)) return null;
  const locations = protocol?.contactsLocationsModule?.locations ?? [];
  const central = protocol?.contactsLocationsModule?.centralContacts?.[0];
  const sites: TrialSite[] = [];

  for (const location of locations) {
    if ("status" in location && location.status !== "RECRUITING") continue;
    const coords = siteCoordinates(location);
    let distanceMiles: number | undefined;
    if (origin && coords) {
      distanceMiles = Math.round(haversineMiles(origin.lat, origin.lon, coords.lat, coords.lon) * 10) / 10;
      if (distanceMiles > radius) continue;
    } else if (origin && !coords) {
      continue;
    }
    const contact = location.contacts?.[0];
    sites.push({
      facility: location.facility?.trim() || "Site name not listed",
      city: location.city?.trim() || "City not listed",
      state: location.state?.trim() || "",
      zip: location.zip,
      lat: coords?.lat,
      lon: coords?.lon,
      distanceMiles,
      contactName: contact?.name,
      contactPhone: contact?.phone,
      contactEmail: contact?.email,
    });
  }

  sites.sort((a, b) => (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY));
  const kept = sites.slice(0, 5);
  if (kept.length === 0) return null;
  const nearest = { ...kept[0] };
  if (!nearest.contactName && central?.name) nearest.contactName = central.name;
  if (!nearest.contactPhone && central?.phone) nearest.contactPhone = central.phone;
  if (!nearest.contactEmail && central?.email) nearest.contactEmail = central.email;
  kept[0] = nearest;

  const eligibility = protocol?.eligibilityModule;
  return {
    nctId,
    title: protocol?.identificationModule?.briefTitle?.trim() || nctId,
    phases: protocol?.designModule?.phases ?? [],
    sponsor: protocol?.sponsorCollaboratorsModule?.leadSponsor?.name,
    conditions: protocol?.conditionsModule?.conditions ?? [],
    eligibilityText: eligibility?.eligibilityCriteria ?? "",
    minAge: eligibility?.minimumAge,
    maxAge: eligibility?.maximumAge,
    sex: normSex(eligibility?.sex),
    nearestSite: nearest,
    sites: kept,
    url: `https://clinicaltrials.gov/study/${nctId}`,
  };
}

async function fetchStudies(query: string, origin: GeoPoint | null, radius: number): Promise<Trial[]> {
  const trials: Trial[] = [];
  const seen = new Set<string>();
  let pageToken = "";
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({
      "query.cond": query,
      "filter.overallStatus": "RECRUITING",
      pageSize: "100",
      fields: FIELDS,
    });
    if (origin) {
      const lat = origin.lat.toFixed(5);
      const lon = origin.lon.toFixed(5);
      params.set("filter.geo", `distance(${lat},${lon},${radius}mi)`);
    }
    if (pageToken) params.set("pageToken", pageToken);
    const url = `${env.ctgovBaseUrl}/studies?${params.toString()}`;
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error("ClinicalTrials.gov did not respond. Try again, or turn on Demo mode.");
    }
    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov returned ${response.status}. Try again, or turn on Demo mode.`);
    }
    const payload = (await response.json()) as { studies?: CtStudy[]; nextPageToken?: string };
    for (const study of payload.studies ?? []) {
      const trial = mapStudy(study, origin, radius);
      if (!trial || seen.has(trial.nctId.toUpperCase())) continue;
      seen.add(trial.nctId.toUpperCase());
      trials.push(trial);
    }
    if (!payload.nextPageToken) break;
    pageToken = payload.nextPageToken;
  }
  trials.sort(
    (a, b) =>
      (a.nearestSite?.distanceMiles ?? Number.POSITIVE_INFINITY) -
      (b.nearestSite?.distanceMiles ?? Number.POSITIVE_INFINITY),
  );
  return trials;
}

function withinRadius(trials: Trial[], radius: number): Trial[] {
  return trials.filter((trial) => {
    const miles = trial.nearestSite?.distanceMiles;
    return miles == null || miles <= radius;
  });
}

async function searchLive(criteria: PatientCriteria, geo: GeoPoint | null): Promise<Trial[]> {
  const query = retrievalQuery(criteria);
  if (!query) return [];
  const radius = criteria.radiusMiles;
  let trials = await fetchStudies(query, geo, radius);
  if (trials.length === 0) {
    const plain = conditionQuery(criteria, false);
    if (plain && plain !== query) trials = await fetchStudies(plain, geo, radius);
  }
  return trials;
}

export async function searchTrials(criteria: PatientCriteria, geo: GeoPoint | null): Promise<Trial[]> {
  try {
    return await searchLive(criteria, geo);
  } catch (error) {
    const fixtures = mockForCriteria(criteria);
    if (fixtures) return withinRadius(fixtures, criteria.radiusMiles);
    throw error;
  }
}
