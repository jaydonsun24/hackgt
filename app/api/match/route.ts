import type { MatchRequest } from "@/lib/contracts";
import { readMatchCache } from "@/lib/demo/cache";
import { env } from "@/lib/env";
import { asStageError } from "@/lib/errors";
import { clampRadius, normalizeZip } from "@/lib/format";
import { runMatch } from "@/lib/match/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function jsonError(error: string, stage: string, status: number) {
  return Response.json({ error, stage }, { status, headers: noStore });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("The request body must be JSON.", "validate", 400);
  }
  if (!payload || typeof payload !== "object") {
    return jsonError("The request body must be an object.", "validate", 400);
  }
  const body = payload as Partial<MatchRequest>;
  if (typeof body.text !== "string") {
    return jsonError("Enter a de-identified note between 10 and 4000 characters.", "validate", 400);
  }
  const text = body.text.trim();
  if (text.length < 10 || text.length > 4000) {
    return jsonError("Enter a de-identified note between 10 and 4000 characters.", "validate", 400);
  }
  let zip: string | undefined;
  if (typeof body.zip === "string" && body.zip.trim()) {
    zip = normalizeZip(body.zip);
    if (!zip) return jsonError("Enter a 5-digit clinic ZIP.", "validate", 400);
  }
  let radiusMiles = env.defaultRadiusMiles;
  if (body.radiusMiles != null && body.radiusMiles !== ("" as unknown)) {
    const numeric = typeof body.radiusMiles === "number" ? body.radiusMiles : Number(body.radiusMiles);
    if (!Number.isFinite(numeric)) return jsonError("Radius must be a number.", "validate", 400);
    radiusMiles = clampRadius(numeric, env.defaultRadiusMiles);
  }
  const patientLanguage = typeof body.patientLanguage === "string" && body.patientLanguage.trim()
    ? body.patientLanguage.trim().toLowerCase()
    : undefined;

  if (request.headers.get("x-trialpath-demo") === "1") {
    const cached = readMatchCache(text);
    if (cached) {
      return Response.json(
        { ...cached, timingsMs: { ...cached.timingsMs, cache: 1 } },
        { headers: noStore },
      );
    }
  }

  try {
    const result = await runMatch({ text, zip, radiusMiles, patientLanguage });
    return Response.json(result, { headers: noStore });
  } catch (error) {
    const stageError = asStageError(error, "match");
    return jsonError(stageError.message, stageError.stage, 500);
  }
}
