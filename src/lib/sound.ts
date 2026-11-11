let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

type ToneOptions = {
  frequency: number;
  start?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
};

function tone({ frequency, start = 0, duration = 0.16, type = 'sine', gain = 0.14 }: ToneOptions) {
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const now = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

export function playCorrect(): void {
  tone({ frequency: 660, duration: 0.12, type: 'triangle' });
  tone({ frequency: 880, start: 0.1, duration: 0.16, type: 'triangle' });
}

export function playWrong(): void {
  tone({ frequency: 220, duration: 0.18, type: 'sawtooth', gain: 0.08 });
  tone({ frequency: 165, start: 0.12, duration: 0.22, type: 'sawtooth', gain: 0.07 });
}

export function playPop(): void {
  tone({ frequency: 520, duration: 0.07, type: 'sine', gain: 0.1 });
}

export function playWin(): void {
  const notes = [523, 659, 784, 1046];
  notes.forEach((f, i) => tone({ frequency: f, start: i * 0.11, duration: 0.2, type: 'triangle' }));
}

export function playTick(): void {
  tone({ frequency: 380, duration: 0.05, type: 'square', gain: 0.05 });
}
