import type { VoiceEngine, VoiceHandlers } from "./index";
import { audioIsSpeech, copyChannel, mergeChannels, preloadEar, setEarStatus, transcribeEar } from "./localEar";

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
  length: number;
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}

interface RecognitionErrorEvent {
  error: string;
}

interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  suppressFinal?: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function errorText(code: string): string {
  if (code === "not-allowed") return "Microphone permission was blocked. You can type the note instead.";
  if (code === "audio-capture") return "No microphone was found. You can type the note instead.";
  if (code === "network" || code === "service-not-allowed") {
    return "This browser's speech service didn't respond. You can type the note.";
  }
  if (code === "no-speech") return "No speech was heard. Try again, or type the note.";
  return "Listening stopped. You can type the note instead.";
}

const NOVELTY_VOICE = /rocko|albert|bad news|bahh|bells|boing|bubbles|cellos|zarvox|trinoids|whisper|superstar|organ|princess|junior|kathy|ralph|fred|grandma|grandpa|hysterical|deranged|good news|shelley|eddy|flo|reed|sandy/;
const BRITISH_MALE = /\b(daniel|arthur|oliver|malcolm|thomas|gordon)\b|uk english male/;

function voiceScore(voice: SpeechSynthesisVoice, lang: string): number {
  const name = voice.name.toLowerCase();
  const voiceLang = voice.lang.toLowerCase().replace("_", "-");
  if (NOVELTY_VOICE.test(name)) return -100;
  // Never read one language with another language's voice.
  if (voiceLang.slice(0, 2) !== lang.slice(0, 2)) return -1;
  const english = lang.startsWith("en");
  let score = 0;
  if (english) {
    if (voiceLang.startsWith("en-gb")) score += 10;
    else if (voiceLang.startsWith("en")) score += 2;
    if (BRITISH_MALE.test(name)) score += 8;
    if (name.startsWith("arthur")) score += 4;
    if (name.includes("male") && !name.includes("female")) score += 2;
  } else if (voiceLang.startsWith(lang)) {
    score += 8;
  } else if (voiceLang.slice(0, 2) === lang.slice(0, 2)) {
    score += 4;
  }
  if (name.includes("natural")) score += 4;
  if (name.includes("premium") || name.includes("enhanced")) score += 5;
  if (name.includes("google")) score += 1;
  if (voice.localService) score += 1;
  return score;
}

let active: Recognition | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let sessionSeq = 0;

function preferLocalEar(): boolean {
  try {
    return window.sessionStorage.getItem("refera-local-ear") === "1";
  } catch {
    return false;
  }
}

function rememberLocalEar() {
  try {
    window.sessionStorage.setItem("refera-local-ear", "1");
  } catch {
    /* storage unavailable */
  }
}

interface EarSession {
  id: number;
  handlers: VoiceHandlers;
  chunks: Float32Array[];
  sampleRate: number;
  context: AudioContext | null;
  stream: MediaStream | null;
  processor: ScriptProcessorNode | null;
  mute: GainNode | null;
  source: MediaStreamAudioSourceNode | null;
  recognition: Recognition | null;
  webText: string;
  webDead: boolean;
  micDenied: boolean;
  stopping: boolean;
}

let earSession: EarSession | null = null;

function releaseEar(current: EarSession) {
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
  if (current.recognition) {
    current.recognition.suppressFinal = true;
    try {
      current.recognition.stop();
    } catch {
      try {
        current.recognition.abort();
      } catch {
        /* already stopped */
      }
    }
    if (active === current.recognition) active = null;
  }
}

function attachEar(current: EarSession, stream: MediaStream) {
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
    if (earSession !== current) return;
    current.chunks.push(copyChannel(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(mute);
  mute.connect(context.destination);
  current.source = source;
  current.processor = processor;
  current.mute = mute;
}

function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const current = synth.getVoices();
  if (current.length > 0) return Promise.resolve(current);
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    const timer = window.setTimeout(finish, 500);
    synth.addEventListener("voiceschanged", finish);
  });
}

export const browserVoice: VoiceEngine = {
  isSupported() {
    if (typeof window === "undefined") return false;
    return recognitionCtor() !== null || !!navigator.mediaDevices?.getUserMedia;
  },
  startListening(handlers, lang) {
    this.stopListening();
    const id = ++sessionSeq;
    const context = typeof AudioContext !== "undefined" ? new AudioContext() : null;
    void context?.resume();
    const current: EarSession = {
      id,
      handlers,
      chunks: [],
      sampleRate: context?.sampleRate || 48000,
      context,
      stream: null,
      processor: null,
      mute: null,
      source: null,
      recognition: null,
      webText: "",
      webDead: false,
      micDenied: false,
      stopping: false,
    };
    earSession = current;
    setEarStatus((message) => {
      if (sessionSeq === id) handlers.onStatus?.(message);
    });

    const ask = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (ask) {
      void ask({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } })
        .then((stream) => {
          if (earSession !== current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          attachEar(current, stream);
        })
        .catch((error: unknown) => {
          const name = error instanceof DOMException ? error.name : "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError") current.micDenied = true;
        });
    }

    const Ctor = !preferLocalEar() ? recognitionCtor() : null;
    if (preferLocalEar()) {
      current.webDead = true;
      handlers.onStatus?.("Using on-device recognition…");
      void preloadEar();
    }
    if (Ctor) {
      const rec = new Ctor();
      current.recognition = rec;
      active = rec;
      rec.lang = lang || "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      let committed = "";
      rec.onresult = (event) => {
        if (earSession !== current || current.webDead) return;
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const piece = event.results[index]?.[0]?.transcript ?? "";
          if (event.results[index]?.isFinal) committed = `${committed} ${piece}`.replace(/\s+/g, " ").trim();
          else interim += piece;
        }
        current.webText = `${committed} ${interim}`.replace(/\s+/g, " ").trim();
        if (current.webText) handlers.onPartial?.(current.webText);
      };
      rec.onerror = (event) => {
        if (earSession !== current || event.error === "aborted" || event.error === "no-speech") return;
        if (event.error === "network" || event.error === "service-not-allowed") {
          current.webDead = true;
          rememberLocalEar();
          handlers.onStatus?.("Using on-device recognition…");
          void preloadEar();
          try {
            rec.stop();
          } catch {
            /* ending the browser speech service */
          }
          if (!current.stream && !current.micDenied) {
            const retry = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
            if (retry) {
              void retry({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } })
                .then((stream) => {
                  if (earSession !== current) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                  }
                  attachEar(current, stream);
                })
                .catch((error: unknown) => {
                  const name = error instanceof DOMException ? error.name : "";
                  if (name === "NotAllowedError" || name === "PermissionDeniedError") current.micDenied = true;
                });
            }
          }
          return;
        }
        if (event.error === "not-allowed") {
          current.webDead = true;
          return;
        }
        handlers.onError?.(errorText(event.error));
      };
      rec.onend = () => {
        if (active === rec) active = null;
      };
      try {
        rec.start();
      } catch {
        current.webDead = true;
        handlers.onStatus?.("Using on-device recognition…");
        void preloadEar();
      }
    } else if (!preferLocalEar()) {
      current.webDead = true;
      handlers.onStatus?.("Using on-device recognition…");
      void preloadEar();
    }
  },
  stopListening() {
    const current = earSession;
    if (!current || current.stopping) return;
    current.stopping = true;
    earSession = null;
    const epoch = current.id;
    const webText = current.webText.trim();
    const samples = mergeChannels(current.chunks);
    const sampleRate = current.sampleRate;
    releaseEar(current);

    if (!current.webDead && webText) {
      current.handlers.onFinal(webText);
      return;
    }
    if (!audioIsSpeech(samples, sampleRate)) {
      if (current.webDead && current.micDenied) {
        current.handlers.onError?.("Microphone permission was blocked. You can type the note instead.");
      } else if (current.webDead && samples.length === 0) {
        current.handlers.onError?.("This browser's speech service didn't respond. You can type the note.");
      } else {
        current.handlers.onFinal("");
      }
      return;
    }

    current.handlers.onStatus?.("Turning speech into text on this device…");
    void transcribeEar(samples, sampleRate)
      .then((text) => {
        if (sessionSeq !== epoch) return;
        current.handlers.onFinal(text);
      })
      .catch(() => {
        if (sessionSeq !== epoch) return;
        current.handlers.onError?.("On-device speech recognition couldn't finish. You can type the note.");
      });
  },
  async speak(text, lang) {
    if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;
    const synth = window.speechSynthesis;
    const voices = await voicesReady();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;
    const wanted = (lang || "en-GB").toLowerCase().replace("_", "-");
    const english = wanted.startsWith("en");
    const match = [...voices].sort((a, b) => voiceScore(b, wanted) - voiceScore(a, wanted))[0];
    if (match && voiceScore(match, wanted) > 0) utterance.voice = match;
    utterance.lang = utterance.voice?.lang || (english ? "en-GB" : wanted);
    if (english) {
      utterance.pitch = 0.82;
      utterance.rate = 0.9;
    }
    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });
  },
  stopSpeaking() {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
  },
};
