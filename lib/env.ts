function read(name: string): string | undefined {
  return process.env[name];
}

function num(name: string, fallback: number): number {
  const raw = read(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export const env = {
  get mockAi() {
    return read("MOCK_AI") !== "0";
  },
  get mockData() {
    return read("MOCK_DATA") !== "0";
  },
  get xaiKey() {
    return read("XAI_API_KEY") ?? "";
  },
  get xaiBaseUrl() {
    return trimSlash(read("XAI_BASE_URL") || "https://api.x.ai/v1");
  },
  get xaiTextModel() {
    return read("XAI_TEXT_MODEL") || "grok-4.6";
  },
  get xaiImageModel() {
    return read("XAI_IMAGE_MODEL") || "grok-imagine-image-2.0";
  },
  get xaiVoiceId() {
    return (read("XAI_VOICE_ID") || "rex").trim() || "rex";
  },
  get ctgovBaseUrl() {
    return trimSlash(read("CTGOV_BASE_URL") || "https://clinicaltrials.gov/api/v2");
  },
  get defaultRadiusMiles() {
    return num("DEFAULT_RADIUS_MILES", 75);
  },
};
