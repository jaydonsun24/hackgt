import { env } from "@/lib/env";
import { heardWords } from "@/lib/voice/hear";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function sttLanguage(code: unknown): string {
  if (typeof code !== "string" || !code.trim()) return "en";
  const key = code.toLowerCase().split("-")[0];
  return /^[a-z]{2}$/.test(key) ? key : "en";
}

const KEYTERMS = ["male", "female", "man", "woman", "age", "years old", "pancreatic", "cancer"];

async function transcribe(file: File, language: string, formatted: boolean, biased: boolean): Promise<Response> {
  const outbound = new FormData();
  outbound.append("language", language);
  if (formatted) outbound.append("format", "true");
  if (biased) {
    for (const term of KEYTERMS) outbound.append("keyterm", term);
  }
  outbound.append("file", file, "note.wav");
  return fetch(`${env.xaiBaseUrl}/stt`, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${env.xaiKey}` },
    body: outbound,
    signal: AbortSignal.timeout(30_000),
  });
}

export async function GET() {
  if (!env.xaiKey) return new Response(null, { status: 503, headers: noStore });
  return new Response(null, { status: 204, headers: noStore });
}

export async function POST(request: Request) {
  if (!env.xaiKey) {
    return Response.json({ error: "XAI_API_KEY is not set on the server." }, { status: 503, headers: noStore });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "The recording must be sent as form data." }, { status: 400, headers: noStore });
  }
  const audio = form.get("file");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "Audio is required." }, { status: 400, headers: noStore });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return Response.json({ error: "The recording is too long." }, { status: 413, headers: noStore });
  }
  const file = new File([audio], "note.wav", { type: audio.type || "audio/wav" });
  const language = sttLanguage(form.get("language"));

  let response: Response;
  try {
    response = await transcribe(file, language, true, true);
    if (response.status === 400) response = await transcribe(file, language, true, false);
    if (response.status === 400) response = await transcribe(file, language, false, false);
  } catch {
    return Response.json({ error: "The transcription service could not be reached." }, { status: 502, headers: noStore });
  }
  if (!response.ok) {
    return Response.json({ error: "The transcription service rejected the recording." }, { status: 502, headers: noStore });
  }
  let payload: { text?: unknown };
  try {
    payload = (await response.json()) as { text?: unknown };
  } catch {
    return Response.json({ error: "The transcript could not be read." }, { status: 502, headers: noStore });
  }
  const text = typeof payload.text === "string" ? heardWords(payload.text.replace(/\s+/g, " ").trim()) : "";
  return Response.json({ text }, { headers: noStore });
}
