// Audio service — Web Audio API only. No TTS/voice.
// etapa 1: single short beep
// etapa 2: 3 cycles × 3 beeps spread across 10s red overlay

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Short single beep — etapa 1 */
export async function playBip(): Promise<void> {
  const ctx = getAudioContext();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

/** Triple alarm — 3 cycles × 3 beeps spread evenly across 10s.
 *  Each beep: 0.4s with small gap
 *  Each cycle: 3 beeps × (0.4s beep + 0.1s gap) = 1.5s
 *  Total beep time: 3 cycles × 1.5s = 4.5s
 *  Remaining time: 10s - 4.5s = 5.5s
 *  Gap between cycles: 5.5s / 2 = 2.75s
 *  Timeline: [cycle1: 0s-1.5s] [gap: 2.75s] [cycle2: 4.25s-5.75s] [gap: 2.75s] [cycle3: 8.5s-10s]
 *  Called ONCE per alert event — never call again during the same overlay. */
export async function playAlarm(): Promise<void> {
  const ctx           = getAudioContext();
  const beepDuration  = 0.4;   // seconds per beep (longer, more audible)
  const beepGap       = 0.1;   // tiny gap between beeps in same cycle
  const beepsPerCycle = 3;
  const cycles        = 3;
  const cycleGap      = 2.75;  // gap between cycles to spread across 10s

  let t = ctx.currentTime;

  for (let c = 0; c < cycles; c++) {
    // Play 3 beeps in quick succession
    for (let i = 0; i < beepsPerCycle; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(880, t + beepDuration * 0.8);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + beepDuration);
      osc.start(t);
      osc.stop(t + beepDuration);
      t += beepDuration + beepGap;
    }
    // Add gap before next cycle (except after the last cycle)
    if (c < cycles - 1) t += cycleGap;
  }
}

/** Dispatches the correct sound for each alert step. No voice. */
export async function playAlert(som: 'aviso' | 'alarme'): Promise<void> {
  if (som === 'aviso') {
    await playBip();
  } else {
    await playAlarm();
  }
}
