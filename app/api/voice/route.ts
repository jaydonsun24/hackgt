import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

const LANGUAGES: Record<string, string> = {
  en: "en",
  es: "es-MX",
  vi: "vi",
  ko: "ko",
  zh: "zh",
  ja: "ja",
  fr: "fr",
  de: "de",
  pt: "pt-BR",
  ar: "ar-SA",
  hi: "hi",
  id: "id",
  it: "it",
  ru: "ru",
  tr: "tr",
  bn: "bn",
};

function ttsLanguage(code: unknown): string {
  if (typeof code !== "string" || !code.trim()) return "en";
  const key = code.toLowerCase().split("-")[0];
  return LANGUAGES[key] ?? "auto";
}

async function synthesize(text: string, language: string, voiceId: string, withFormat: boolean): Promise<Response> {
  const body: Record<string, unknown> = {
    text,
    voice_id: voiceId,
    language,
    text_normalization: true,
    speed: language === "en" ? 0.95 : 1,
  };
  if (withFormat) body.output_format = { codec: "mp3", sample_rate: 24000, bit_rate: 128000 };
  return fetch(`${env.xaiBaseUrl}/tts`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${env.xaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
}

function audioResponse(bytes: Uint8Array, contentType: string): Response {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(copy, {
    headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
  });
}

function fromPayload(bytes: Uint8Array, contentType: string): Response {
  const type = contentType.toLowerCase();
  const looksJson = type.includes("json") || bytes[0] === 0x7b;
  if (!looksJson) return audioResponse(bytes, type.startsWith("audio/") ? contentType : "audio/mpeg");
  let parsed: { audio?: unknown; content_type?: unknown };
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as { audio?: unknown; content_type?: unknown };
  } catch {
    return Response.json({ error: "The voice response could not be read." }, { status: 502, headers: noStore });
  }
  if (typeof parsed.audio !== "string" || !parsed.audio) {
    return Response.json({ error: "The voice response had no audio." }, { status: 502, headers: noStore });
  }
  const decoded = Buffer.from(parsed.audio, "base64");
  const mime = typeof parsed.content_type === "string" && parsed.content_type.startsWith("audio/") ? parsed.content_type : "audio/mpeg";
  return audioResponse(decoded, mime);
}

export async function POST(request: Request) {
  if (!env.xaiKey) {
    return Response.json({ error: "XAI_API_KEY is not set on the server." }, { status: 503, headers: noStore });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "The request body must be JSON." }, { status: 400, headers: noStore });
  }
  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "The request body must be an object." }, { status: 400, headers: noStore });
  }
  const text = typeof (payload as { text?: unknown }).text === "string" ? (payload as { text: string }).text.trim() : "";
  if (!text) return Response.json({ error: "Text is required." }, { status: 400, headers: noStore });
  const spoken = text.slice(0, 15_000);
  const language = ttsLanguage((payload as { language?: unknown }).language);
  const voiceId = env.xaiVoiceId;

  let response: Response;
  try {
    response = await synthesize(spoken, language, voiceId, true);
    if (response.status === 400) response = await synthesize(spoken, language, voiceId, false);
    if (response.status === 400 && voiceId !== "eve") response = await synthesize(spoken, language, "eve", false);
  } catch {
    return Response.json({ error: "The voice service could not be reached." }, { status: 502, headers: noStore });
  }
  if (!response.ok) {
    return Response.json({ error: "The voice service rejected the request." }, { status: 502, headers: noStore });
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) {
    return Response.json({ error: "The voice service returned no audio." }, { status: 502, headers: noStore });
  }
  return fromPayload(bytes, response.headers.get("content-type") || "");
}
