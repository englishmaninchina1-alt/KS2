let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesBound = false;

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  if (!('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

function chooseVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices();
  if (!voices.length) return null;

  const score = (v: SpeechSynthesisVoice): number => {
    let value = 0;
    const lang = v.lang.toLowerCase().replace('_', '-');
    if (lang === 'en-gb') value += 100;
    else if (lang.startsWith('en')) value += 50;
    else return -1;
    if (/female|woman|kate|serena|sonia|libby|hazel|susan|google uk english female/i.test(v.name))
      value += 12;
    if (/natural|neural/i.test(v.name)) value += 8;
    if (v.localService) value += 4;
    if (/daniel|arthur|male/i.test(v.name)) value += 2;
    return value;
  };

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const s = score(voice);
    if (s > bestScore) {
      best = voice;
      bestScore = s;
    }
  }
  return best;
}

function bindVoices() {
  const s = synth();
  if (!s || voicesBound) return;
  voicesBound = true;
  const refresh = () => {
    cachedVoice = chooseVoice();
  };
  refresh();
  s.addEventListener('voiceschanged', refresh);
}

export function speechSupported(): boolean {
  return synth() !== null;
}

export function initSpeech(): void {
  bindVoices();
}

export type SpeakOptions = {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
};

export function speak(text: string, options: SpeakOptions = {}): void {
  const s = synth();
  if (!s) {
    options.onEnd?.();
    return;
  }
  bindVoices();
  s.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = cachedVoice ?? chooseVoice();
  if (voice) {
    cachedVoice = voice;
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'en-GB';
  }
  utterance.rate = options.rate ?? 0.85;
  utterance.pitch = options.pitch ?? 1.05;
  utterance.volume = 1;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();
  // Chrome sometimes ignores the very first utterance until the queue is clear.
  s.resume();
  s.speak(utterance);
}

export function stopSpeaking(): void {
  synth()?.cancel();
}

export type RecorderState = {
  supported: boolean;
  recording: boolean;
  url: string | null;
  error: string | null;
  seconds: number;
};

export function recorderSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined'
  );
}
