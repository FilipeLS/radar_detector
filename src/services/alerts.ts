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
  private settings: AppSettings;
  private onVisualAlert: VisualAlertCallback;

  constructor(
    dataset: DatasetJson,
    settings: AppSettings,
    onVisualAlert: VisualAlertCallback
  ) {
    this.settings = settings;
    this.onVisualAlert = onVisualAlert;
    this.engine = new AlertEngine(dataset, { tiposAtivos: settings.tiposAtivos });
  }

  handle(pos: { lat: number; lon: number; velKmh: number; heading: number | null }): void {
    const events = this.engine.atualizar(pos);
    // Engine returns at most 1 event per call — no extra deduplication needed
    for (const ev of events) {
      // Fire audio (non-blocking; errors are swallowed inside playAlert)
      void playAlert(ev.som, ev.mensagem, this.settings.vozAtiva, this.settings.volume);

      // Always pass visual alert to UI; UI can use ev.acimaDoLimite to decide display
      if (ev.visual) {
        this.onVisualAlert(ev);
      }
    }
  }

  recreate(dataset: DatasetJson, settings: AppSettings): void {
    this.settings = settings;
    this.engine = new AlertEngine(dataset, { tiposAtivos: settings.tiposAtivos });
  }
}
