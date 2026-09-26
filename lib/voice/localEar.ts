type ProgressEvent = {
  status?: string;
  progress?: number;
  file?: string;
};

type AsrResult = { text?: string } | Array<{ text?: string }>;
type Transcriber = (audio: Float32Array) => Promise<AsrResult>;

let loader: Promise<Transcriber> | null = null;
let statusSink: ((message: string) => void) | null = null;

export function setEarStatus(sink: ((message: string) => void) | null) {
  statusSink = sink;
}

function report(message: string) {
  statusSink?.(message);
}

export function preloadEar(): Promise<Transcriber> {
  if (!loader) {
    loader = loadEar().catch((error) => {
      loader = null;
      throw error;
    });
  }
  return loader;
}

async function loadEar(): Promise<Transcriber> {
  report("Downloading on-device speech recognition…");
  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  const model = await pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny.en", {
    dtype: "q8",
    device: "wasm",
    progress_callback: (update: ProgressEvent) => {
      if (update.status === "progress" && typeof update.progress === "number") {
        report(`Downloading on-device speech recognition… ${Math.round(update.progress)}%`);
      } else if (update.status === "initiate" || update.status === "download") {
        report("Downloading on-device speech recognition…");
      }
    },
  });
  return model as Transcriber;
}

export function copyChannel(channel: Float32Array): Float32Array {
  return new Float32Array(channel);
}

export function mergeChannels(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

export function resampleTo16k(input: Float32Array, sampleRate: number): Float32Array {
  const target = 16000;
  if (sampleRate === target) return input;
  if (input.length === 0) return input;
  const ratio = sampleRate / target;
  const length = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const mix = position - left;
    output[index] = input[left] * (1 - mix) + input[right] * mix;
  }
  return output;
}

export function audioIsSpeech(samples: Float32Array, sampleRate: number): boolean {
  if (samples.length < sampleRate * 0.25) return false;
  let energy = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(samples.length / 12000));
  for (let index = 0; index < samples.length; index += step) {
    const sample = samples[index];
    energy += sample * sample;
    count += 1;
  }
  return count > 0 && Math.sqrt(energy / count) > 0.012;
}

const HALLUCINATION = /^(thanks for watching\.?|thank you\.?|you\.?|bye\.?|subtitles by the amara\.org community\.?)$/i;

export async function transcribeEar(samples: Float32Array, sampleRate: number): Promise<string> {
  const audio = resampleTo16k(samples, sampleRate);
  if (!audioIsSpeech(audio, 16000)) return "";
  report("Turning speech into text on this device…");
  const transcriber = await preloadEar();
  const result = await transcriber(audio);
  const text = (Array.isArray(result) ? result[0]?.text : result.text) ?? "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  const seconds = audio.length / 16000;
  if (seconds < 1.6 && HALLUCINATION.test(cleaned)) return "";
  return cleaned;
}
