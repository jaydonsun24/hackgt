"use client";

import { browserVoice } from "./browser";
import type { VoiceEngine, VoiceHandlers } from "./index";
import { audioIsSpeech, copyChannel, mergeChannels, resampleTo16k, transcribeEar } from "./localEar";

let inflight: AbortController | null = null;
let generation = 0;
let outputCtx: AudioContext | null = null;
let outputNode: AudioBufferSourceNode | null = null;
let elementAudio: HTMLAudioElement | null = null;
let elementUrl: string | null = null;
let unlockedElement: HTMLAudioElement | null = null;

function outputContext(): AudioContext {
  if (!outputCtx || outputCtx.state === "closed") outputCtx = new AudioContext();
  return outputCtx;
}

function ensureUnlockedElement(): HTMLAudioElement {
  if (unlockedElement) return unlockedElement;
  const audio = new Audio();
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  unlockedElement = audio;
  return audio;
}

async function resumeOutput(): Promise<AudioContext> {
  const context = outputContext();
  if (context.state === "suspended") await context.resume();
  return context;
}

function unlockAudio() {
  if (typeof window === "undefined") return;
  void resumeOutput();
  const audio = ensureUnlockedElement();
  if (!audio.paused && !audio.ended) return;
  // Prime the shared element under a user gesture so later blob playback is allowed.
  const silent =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==";
  if (audio.src !== silent) audio.src = silent;
  void audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
  }).catch(() => undefined);
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockAudio, true);
  window.addEventListener("keydown", unlockAudio, true);
}

function stopPlayback() {
  inflight?.abort();
  inflight = null;
  if (outputNode) {
    try {
      outputNode.stop();
    } catch {
      /* already stopped */
    }
    outputNode = null;
  }
  if (elementAudio) {
    elementAudio.onended = null;
    elementAudio.onerror = null;
    elementAudio.onloadeddata = null;
    elementAudio.pause();
    if (elementAudio !== unlockedElement) elementAudio.src = "";
    elementAudio = null;
  }
  if (elementUrl) {
    URL.revokeObjectURL(elementUrl);
    elementUrl = null;
  }
}

function playElement(bytes: ArrayBuffer, contentType: string, mine: number): Promise<void> {
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType || "audio/mpeg" }));
  elementUrl = url;
  const audio = ensureUnlockedElement();
  elementAudio = audio;
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
  audio.src = url;
  return new Promise((resolve, reject) => {
    const finish = () => {
      if (elementAudio === audio) elementAudio = null;
      if (elementUrl === url) {
        URL.revokeObjectURL(url);
        elementUrl = null;
      }
      resolve();
    };
    audio.onended = finish;
    audio.onerror = () => reject(new Error("Audio failed to play."));
    const start = () => {
      if (mine !== generation) {
        audio.pause();
        finish();
        return;
      }
      void audio.play().then(() => {
        if (mine !== generation) {
          audio.pause();
          finish();
        }
      }).catch(reject);
    };
    if (audio.readyState >= 2) start();
    else audio.onloadeddata = start;
  });
}

async function playViaContext(bytes: ArrayBuffer, mine: number): Promise<void> {
  const context = await resumeOutput();
  if (mine !== generation) return;
  const decoded = await context.decodeAudioData(bytes.slice(0));
  if (mine !== generation) return;
  if (context.state === "suspended") await context.resume();
  if (mine !== generation) return;
  await new Promise<void>((resolve, reject) => {
    const source = context.createBufferSource();
    source.buffer = decoded;
    source.connect(context.destination);
    outputNode = source;
    source.onended = () => {
      if (outputNode === source) outputNode = null;
      resolve();
    };
    try {
      source.start();
    } catch (error) {
      reject(error);
    }
  });
}

async function playBytes(bytes: ArrayBuffer, contentType: string, mine: number): Promise<void> {
  if (mine !== generation) return;
  try {
    await playViaContext(bytes, mine);
  } catch (error) {
    if (mine !== generation) return;
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    // Grok audio was received — keep trying Web Audio / element playback; never speechSynthesis.
    await resumeOutput();
    if (mine !== generation) return;
    try {
      await playElement(bytes, contentType, mine);
    } catch {
      if (mine !== generation) return;
      await playViaContext(bytes, mine);
    }
  }
}

async function fetchGrokAudio(text: string, lang: string | undefined, mine: number): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController();
  inflight = controller;
  const response = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ text, language: lang || "en" }),
    signal: controller.signal,
  });
  if (mine !== generation || inflight !== controller) return null;
  if (!response.ok) throw new Error("Voice request failed.");
  const bytes = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "";
  if (mine !== generation) return null;
  if (!bytes.byteLength || contentType.includes("json")) throw new Error("Voice response was not audio.");
  return { bytes, contentType };
}

function encodeWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

interface ListenSession {
  id: number;
  handlers: VoiceHandlers;
  lang: string;
  chunks: Float32Array[];
  sampleRate: number;
  context: AudioContext | null;
  stream: MediaStream | null;
  processor: ScriptProcessorNode | null;
  mute: GainNode | null;
  source: MediaStreamAudioSourceNode | null;
  stopping: boolean;
  usingBrowser: boolean;
  micDenied: boolean;
}

let listenSeq = 0;
let listenSession: ListenSession | null = null;

function releaseListen(current: ListenSession) {
  try {
    current.processor?.disconnect();
  } catch {
    /* already disconnected */
  }
  try {
    current.source?.disconnect();
  } catch {
    /* already disconnected */
  }
  try {
    current.mute?.disconnect();
  } catch {
    /* already disconnected */
  }
  current.stream?.getTracks().forEach((track) => track.stop());
  void current.context?.close().catch(() => undefined);
  current.processor = null;
  current.source = null;
  current.mute = null;
  current.stream = null;
}

function attachListen(current: ListenSession, stream: MediaStream) {
  const context = current.context;
  if (!context || current.stopping) {
    stream.getTracks().forEach((track) => track.stop());
    return;
  }
  current.stream = stream;
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const mute = context.createGain();
  mute.gain.value = 0;
  processor.onaudioprocess = (event) => {
    if (listenSession !== current) return;
    current.chunks.push(copyChannel(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(mute);
  mute.connect(context.destination);
  current.source = source;
  current.processor = processor;
  current.mute = mute;
}

async function transcribeGrok(samples: Float32Array, sampleRate: number, lang: string): Promise<string> {
  const wav = encodeWav(resampleTo16k(samples, sampleRate));
  const body = new FormData();
  body.append("language", lang || "en");
  body.append("file", wav, "note.wav");
  const response = await fetch("/api/stt", { method: "POST", body, cache: "no-store" });
  if (!response.ok) throw new Error("Transcription failed.");
  const payload = (await response.json()) as { text?: unknown };
  return typeof payload.text === "string" ? payload.text.replace(/\s+/g, " ").trim() : "";
}

export const grokVoice: VoiceEngine = {
  isSupported() {
    return browserVoice.isSupported();
  },
  startListening(handlers: VoiceHandlers, lang?: string) {
    this.stopListening();
    unlockAudio();
    const id = ++listenSeq;
    const context = typeof AudioContext !== "undefined" ? new AudioContext() : null;
    void context?.resume();
    const current: ListenSession = {
      id,
      handlers,
      lang: lang || "en-US",
      chunks: [],
      sampleRate: context?.sampleRate || 48000,
      context,
      stream: null,
      processor: null,
      mute: null,
      source: null,
      stopping: false,
      usingBrowser: false,
      micDenied: false,
    };
    listenSession = current;
    const ask = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (!ask || !context) {
      current.usingBrowser = true;
      browserVoice.startListening(handlers, lang);
      return;
    }
    void ask({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } })
      .then((stream) => {
        if (listenSession !== current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        attachListen(current, stream);
      })
      .catch((error: unknown) => {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") current.micDenied = true;
      });
  },
  stopListening() {
    const current = listenSession;
    if (!current || current.stopping) return;
    current.stopping = true;
    listenSession = null;
    if (current.usingBrowser) {
      browserVoice.stopListening();
      return;
    }
    const samples = mergeChannels(current.chunks);
    const sampleRate = current.sampleRate;
    releaseListen(current);
    if (current.micDenied && samples.length === 0) {
      current.handlers.onError?.("Microphone permission was blocked. You can type the note instead.");
      return;
    }
    if (!audioIsSpeech(samples, sampleRate)) {
      current.handlers.onFinal("");
      return;
    }
    const epoch = current.id;
    current.handlers.onStatus?.("Turning speech into text…");
    void transcribeGrok(samples, sampleRate, current.lang)
      .then((text) => text || transcribeEar(samples, sampleRate))
      .catch(() => transcribeEar(samples, sampleRate))
      .then((text) => {
        if (listenSeq !== epoch) return;
        current.handlers.onFinal(text);
      })
      .catch(() => {
        if (listenSeq !== epoch) return;
        current.handlers.onError?.("Speech recognition couldn't finish. You can type the note.");
      });
  },
  async speak(text: string, lang?: string) {
    const mine = ++generation;
    stopPlayback();
    browserVoice.stopSpeaking();
    unlockAudio();
    if (!text.trim()) return;
    let audio: { bytes: ArrayBuffer; contentType: string } | null = null;
    try {
      audio = await fetchGrokAudio(text, lang, mine);
    } catch (error) {
      if (mine !== generation) return;
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return;
      // Only use the Mac/browser voice when the xAI TTS request itself failed.
      stopPlayback();
      if (mine !== generation) return;
      await browserVoice.speak(text, lang);
      return;
    }
    if (!audio || mine !== generation) return;
    try {
      await playBytes(audio.bytes, audio.contentType, mine);
    } catch (error) {
      if (mine !== generation) return;
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return;
      // Grok audio arrived — do not fall back to speechSynthesis (Arthur / en-GB).
      stopPlayback();
    }
  },
  stopSpeaking() {
    generation += 1;
    stopPlayback();
    browserVoice.stopSpeaking();
  },
};
