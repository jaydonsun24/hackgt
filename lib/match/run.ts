import type { MatchRequest, MatchResponse } from "../contracts";
import { extractCriteria } from "../ai/extract";
import { rankTrials } from "../ai/rank";
import { writeReadback } from "../ai/readback";
import { getEquitySnapshot } from "../data/equity";
import { locateZip } from "../data/geo";
import { searchTrials } from "../data/trials";
import { env } from "../env";
import { StageError } from "../errors";

async function stage<T>(timings: Record<string, number>, name: string, fn: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await fn();
  } catch (error) {
    if (error instanceof StageError) throw error;
    const message = error instanceof Error && error.message ? error.message : "This step failed.";
    throw new StageError(name, message);
  } finally {
    timings[name] = Math.round(performance.now() - started);
  }
}

export async function runMatch(req: MatchRequest): Promise<MatchResponse> {
  const started = performance.now();
  const timingsMs: Record<string, number> = {};
  const criteria = await stage(timingsMs, "extract", () => extractCriteria(req));

  const geo = await stage(timingsMs, "geocode", async () => {
    if (!criteria.zip) return null;
    const point = await locateZip(criteria.zip);
    if (!point) {
      throw new Error(`Clinic ZIP ${criteria.zip} could not be located. Check the ZIP and search again.`);
    }
    return point;
  });

  const trials = await stage(timingsMs, "search", () => searchTrials(criteria, geo));
  const results = await stage(timingsMs, "rank", () => rankTrials(criteria, trials));
  const readback = await stage(timingsMs, "readback", async () => writeReadback(criteria, results));

  let equity;
  const equityStarted = performance.now();
  try {
    equity = getEquitySnapshot(geo, results[0]?.trial.nearestSite?.distanceMiles);
  } catch {
    equity = undefined;
  }
  timingsMs.equity = Math.round(performance.now() - equityStarted);
  timingsMs.total = Math.round(performance.now() - started);

  return {
    criteria,
    results,
    searchedCount: trials.length,
    readback,
    equity,
    mocked: { ai: env.mockAi, data: env.mockData },
    timingsMs,
  };
}
