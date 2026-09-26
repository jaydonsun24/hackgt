import type { GeoPoint } from "../contracts";
import { env } from "../env";
import { normalizeZip } from "../format";
import { mockGeo, mockGeoAtlanta, mockGeoSavannah } from "../mock/fixtures";
import zipTable from "../../data/zips.json";

type ZipRecord = {
  zip: string;
  lat: number;
  lon: number;
  state: string;
  county: string;
  countyFips: string;
  city?: string;
};

const zips = zipTable as Record<string, ZipRecord>;

const mockByZip: Record<string, GeoPoint> = {
  "31709": mockGeo,
  "30303": mockGeoAtlanta,
  "31401": mockGeoSavannah,
};

export function geocodeZip(zip?: string): GeoPoint | null {
  const normalized = normalizeZip(zip);
  if (!normalized) return null;
  if (env.mockData && mockByZip[normalized]) return { ...mockByZip[normalized] };
  const row = zips[normalized];
  if (!row) return null;
  return {
    zip: row.zip,
    lat: row.lat,
    lon: row.lon,
    city: row.city,
    state: row.state,
    county: row.county,
    countyFips: row.countyFips,
  };
}

const remoteZips = new Map<string, GeoPoint>();

export async function locateZip(zip?: string): Promise<GeoPoint | null> {
  const local = geocodeZip(zip);
  if (local) return local;
  const normalized = normalizeZip(zip);
  if (!normalized) return null;
  const cached = remoteZips.get(normalized);
  if (cached) return { ...cached };
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${normalized}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      places?: {
        "place name"?: string;
        longitude?: string;
        latitude?: string;
        "state abbreviation"?: string;
      }[];
    };
    const place = body.places?.[0];
    const lat = Number(place?.latitude);
    const lon = Number(place?.longitude);
    if (!place || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const point: GeoPoint = {
      zip: normalized,
      lat,
      lon,
      city: place["place name"],
      state: place["state abbreviation"],
    };
    remoteZips.set(normalized, point);
    return { ...point };
  } catch {
    return null;
  }
}
