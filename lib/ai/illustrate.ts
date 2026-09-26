import { env } from "../env";

function asImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length < 16) return undefined;
  if (value.startsWith("data:image/")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return value;
  } catch {
    return undefined;
  }
  return undefined;
}

export async function illustrate(prompt: string): Promise<string | undefined> {
  if (!prompt.trim() || !env.xaiKey || !env.xaiImageModel) return undefined;
  try {
    const response = await fetch(`${env.xaiBaseUrl}/images/generations`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${env.xaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.xaiImageModel,
        prompt,
        n: 1,
        response_format: "b64_json",
        aspect_ratio: "16:9",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return undefined;
    const payload = (await response.json()) as {
      data?: { b64_json?: string; url?: string }[];
    };
    const first = payload.data?.[0];
    if (first?.b64_json) return asImageUrl(`data:image/jpeg;base64,${first.b64_json}`);
    return asImageUrl(first?.url);
  } catch {
    return undefined;
  }
}
