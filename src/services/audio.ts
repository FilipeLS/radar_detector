// Audio service — Web Audio API for beeps/alarms, TTS for voice alerts.
// Routes audio through the alarm channel on Android via TTS category:'alarm'.

import { TextToSpeech } from '@capacitor-community/text-to-speech';

// Lazily created, shared AudioContext instance
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export async function playBip(): Promise<void> {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
}

export async function playAlarm(): Promise<void> {
  const ctx = getAudioContext();

  const cycleLength = 0.5; // seconds per cycle
  const cycles = 3;

  for (let i = 0; i < cycles; i++) {
    const start = ctx.currentTime + i * cycleLength;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, start);
    oscillator.frequency.linearRampToValueAtTime(880, start + cycleLength * 0.8);
    gainNode.gain.setValueAtTime(0.8, start);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + cycleLength);

    oscillator.start(start);
    oscillator.stop(start + cycleLength);
  }
}

export async function speak(text: string, volume: number): Promise<void> {
  try {
    await TextToSpeech.speak({
      text,
      lang: 'pt-BR',
      rate: 1.0,
      pitch: 1.0,
      volume,
      category: 'alarm',
    });
  } catch {
    // Log a non-sensitive message — never log coordinates or user data
    console.warn('[audio] TTS falhou; usando apenas som.');
  }
}

export async function playAlert(
  som: 'aviso' | 'alarme',
  mensagem: string,
  vozAtiva: boolean,
  volume: number
): Promise<void> {
  // Play the sound first so it happens even if TTS fails
  if (som === 'aviso') {
    await playBip();
  } else {
    await playAlarm();
  }

  if (vozAtiva) {
    try {
      await speak(mensagem, volume);
    } catch {
      // speak() already suppresses its own errors; fall back to alarm if voice fails
      if (som === 'aviso') {
        await playBip();
      } else {
        await playAlarm();
      }
    }
  }
}
