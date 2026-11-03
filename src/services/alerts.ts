// Alert dispatcher — feeds GPS positions into the AlertEngine and routes events
// to the visual overlay and audio subsystem.

import { AlertEngine } from '../lib/alertEngine';
import type { AlertEvent, DatasetJson } from '../lib/alertEngine';
import type { AppSettings } from '../types';
import { playAlert } from './audio';

export type { AlertEvent };

export type VisualAlertCallback = (event: AlertEvent) => void;

export class AlertDispatcher {
  private engine: AlertEngine;
  private onVisualAlert: VisualAlertCallback;
  private lastSoundAlertId: string | null = null; // Track last SOUND to prevent duplicate audio

  constructor(
    dataset: DatasetJson,
    settings: AppSettings,
    onVisualAlert: VisualAlertCallback
  ) {
    this.onVisualAlert = onVisualAlert;
    this.engine = new AlertEngine(dataset, { tiposAtivos: settings.tiposAtivos });
  }

  handle(pos: { lat: number; lon: number; velKmh: number; heading: number | null }): void {
    const events = this.engine.atualizar(pos);
    // Engine returns at most 1 event per call
    for (const ev of events) {
      // Create unique alert ID based on point id and stage
      const alertId = `${ev.id}-${ev.etapa}`;
      
      // Only fire audio if this is a NEW alert (not the same point + stage as last sound)
      if (this.lastSoundAlertId !== alertId) {
        void playAlert(ev.som);
        this.lastSoundAlertId = alertId;
        
        // Clear the sound alert ID after the overlay duration to allow re-triggering
        const duration = ev.visual === 'amarelo' ? 5000 : 10000;
        setTimeout(() => {
          if (this.lastSoundAlertId === alertId) {
            this.lastSoundAlertId = null;
          }
        }, duration);
      }

      // Always pass event to callback - the App component decides if visual should update
      if (ev.visual) {
        this.onVisualAlert(ev);
      }
    }
  }

  recreate(dataset: DatasetJson, settings: AppSettings): void {
    this.engine = new AlertEngine(dataset, { tiposAtivos: settings.tiposAtivos });
    this.lastSoundAlertId = null; // Reset on recreate
  }
}
