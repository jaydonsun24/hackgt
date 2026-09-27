import type { HandoutRequest } from "@/lib/contracts";
import { generateHandout } from "@/lib/ai/handout";
import { readHandoutCache } from "@/lib/demo/cache";
import { asStageError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "The request body must be JSON.", stage: "validate" }, { status: 400, headers: noStore });
  }
  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "The request body must be an object.", stage: "validate" }, { status: 400, headers: noStore });
  }
  const body = payload as Partial<HandoutRequest>;
  if (!body.ranked?.trial?.nctId || !body.criteria?.condition || typeof body.language !== "string") {
    return Response.json(
      { error: "A trial, the extracted criteria, and a language are required.", stage: "validate" },
      { status: 400, headers: noStore },
    );
  }
  const handoutRequest: HandoutRequest = {
    ranked: body.ranked,
    criteria: body.criteria,
    language: body.language,
    readingLevel: typeof body.readingLevel === "number" ? body.readingLevel : 6,
    withIllustration: Boolean(body.withIllustration),
  };

  if (request.headers.get("x-refera-demo") === "1") {
    const cached = readHandoutCache(handoutRequest);
    if (cached) return Response.json(cached, { headers: noStore });
  }

  try {
    const handout = await generateHandout(handoutRequest);
    return Response.json(handout, { headers: noStore });
  } catch (error) {
    const stageError = asStageError(error, "handout");
    return Response.json({ error: stageError.message, stage: "handout" }, { status: 500, headers: noStore });
  }
}
