import { env } from "../env";

interface GrokArgs {
  system: string;
  user: string;
  temperature?: number;
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("The model returned data that could not be read.");
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

async function complete(args: GrokArgs, includeTemperature: boolean): Promise<unknown> {
  if (!env.xaiKey) throw new Error("XAI_API_KEY is not set on the server.");
  const body: Record<string, unknown> = {
    model: env.xaiTextModel,
    stream: false,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  };
  if (includeTemperature && args.temperature != null) body.temperature = args.temperature;

  let response: Response;
  try {
    response = await fetch(`${env.xaiBaseUrl}/chat/completions`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${env.xaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (isTimeout(error)) throw new RetryableError("The model timed out. Try again.");
    throw new Error("The model could not be reached. Try again.");
  }

  if (response.status >= 500) throw new RetryableError("The model service returned an error. Try again.");
  if (response.status === 400 && includeTemperature) {
    const detail = await response.text();
    if (/temperature/i.test(detail)) return complete(args, false);
    throw new Error("The model rejected the request.");
  }
  if (!response.ok) throw new Error("The model rejected the request.");

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The model returned an empty response.");
  }
  try {
    return extractJson(content);
  } catch {
    throw new Error("The model returned data that could not be read.");
  }
}

export async function grokJson<T>(args: GrokArgs): Promise<T> {
  try {
    return (await complete(args, true)) as T;
  } catch (error) {
    if (!(error instanceof RetryableError)) throw error;
    return (await complete(args, true)) as T;
  }
}
