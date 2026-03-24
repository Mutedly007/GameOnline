'use client';

// Web Audio API sound effects - no external files needed
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not supported
  }
}

export const sounds = {
  click: () => playTone(800, 0.08, 'sine', 0.15),

  countdownTick: () => playTone(600, 0.15, 'sine', 0.25),

  countdownGo: () => {
    playTone(880, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(1100, 0.25, 'sine', 0.3), 100);
  },

  submit: () => {
    playTone(523, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 80);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.2), 160);
  },

  roundEnd: () => {
    playTone(440, 0.2, 'triangle', 0.25);
    setTimeout(() => playTone(550, 0.2, 'triangle', 0.25), 150);
    setTimeout(() => playTone(660, 0.3, 'triangle', 0.25), 300);
  },

  victory: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 0.2, 'sine', 0.25), i * 120);
    });
  },

  error: () => playTone(200, 0.3, 'sawtooth', 0.15),

  vote: () => playTone(400, 0.1, 'square', 0.1),

  timerWarning: () => playTone(900, 0.1, 'square', 0.2),
};
