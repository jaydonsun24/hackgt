import fs from "fs";
import path from "path";
import type { EquitySnapshot, GeoPoint } from "../contracts";
import { env } from "../env";
import { mockEquity } from "../mock/fixtures";

interface SviRow {
  county: string;
  state: string;
  rpl: number | null;
}

let table: Map<string, SviRow> | null = null;

function loadTable(): Map<string, SviRow> {
  if (table) return table;
  const file = path.join(process.cwd(), "data", "svi-ga-2022.csv");
  const text = fs.readFileSync(file, "utf8");
  const map = new Map<string, SviRow>();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (const line of lines.slice(1)) {
    const [fipsRaw, countyRaw, stateRaw, rplRaw] = line.split(",");
    if (!fipsRaw) continue;
    const fips = fipsRaw.trim().padStart(5, "0");
    const rpl = rplRaw == null || rplRaw.trim() === "" ? null : Number(rplRaw);
    map.set(fips, {
      county: (countyRaw ?? "").replace(/ County$/, "").trim(),
      state: (stateRaw ?? "").trim(),
      rpl: rpl != null && Number.isFinite(rpl) ? rpl : null,
    });
  }
  table = map;
  return map;
}

export function sviLabel(value: number): string {
  if (value >= 0.75) return "High vulnerability (top 25% nationally)";
  if (value >= 0.5) return "Moderate–high vulnerability";
  return "Lower vulnerability";
}

function vulnerabilityClause(value: number): string {
  if (value >= 0.75) return "is in the highest quarter of U.S. counties on the CDC Social Vulnerability Index (2022)";
  if (value >= 0.5) return "has moderate to high social vulnerability on the CDC Social Vulnerability Index (2022)";
  return "has lower social vulnerability on the CDC Social Vulnerability Index (2022)";
}

function distanceClause(miles?: number): string {
  if (miles == null || !Number.isFinite(miles)) return "no nearby match distance was available";
  return `the nearest match is ${Math.round(miles)} miles away`;
}

function illustrativeFallback(geo: GeoPoint | null, nearestMatchMiles?: number): EquitySnapshot {
  if (!geo || geo.countyFips === "13261" || geo.zip === "31709") {
    return {
      ...mockEquity,
      nearestMatchMiles: nearestMatchMiles ?? mockEquity.nearestMatchMiles,
      isIllustrative: true,
    };
  }
  const county = geo.county ?? "This county";
  const state = geo.state === "GA" ? "Georgia" : geo.state ?? "";
  return {
    county,
    state,
    sviLabel: "Illustrative estimate",
    nearestMatchMiles,
    note: `${county} County, ${state} is shown with illustrative social-vulnerability data, and ${distanceClause(nearestMatchMiles)}.`,
    isIllustrative: true,
  };
}

export function getEquitySnapshot(geo: GeoPoint | null, nearestMatchMiles?: number): EquitySnapshot | undefined {
  if (!geo?.countyFips) return env.mockData ? illustrativeFallback(geo, nearestMatchMiles) : undefined;
  try {
    const row = loadTable().get(geo.countyFips);
    if (!row || row.rpl == null || row.rpl < 0 || row.rpl === -999) {
      return illustrativeFallback(geo, nearestMatchMiles);
    }
    const county = (geo.county || row.county).replace(/ County$/i, "");
    const state = row.state || (geo.state === "GA" ? "Georgia" : geo.state) || "";
    return {
      county,
      state,
      sviOverall: row.rpl,
      sviLabel: sviLabel(row.rpl),
      nearestMatchMiles,
      note: `${county} County, ${state} ${vulnerabilityClause(row.rpl)}, and ${distanceClause(nearestMatchMiles)}.`,
      isIllustrative: false,
    };
  } catch {
    return illustrativeFallback(geo, nearestMatchMiles);
  }
}
