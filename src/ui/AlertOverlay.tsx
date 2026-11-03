// AlertOverlay — renders yellow banner (etapa 1) or full-screen red flash (etapa 2).
// Renders nothing when alert is null.

import { useEffect, useRef } from 'react';
import type { AlertEvent } from '../lib/alertEngine';
import './AlertOverlay.css';

interface AlertOverlayProps {
  alert: AlertEvent | null;
  onDismiss: () => void;
}

const YELLOW_DURATION_MS = 5_000;
const RED_DURATION_MS = 8_000;

export function AlertOverlay({ alert, onDismiss }: AlertOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!alert) return;

    // Clear any previous timer whenever a new alert arrives
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const duration = alert.visual === 'amarelo' ? YELLOW_DURATION_MS : RED_DURATION_MS;
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  if (!alert) return null;

  if (alert.visual === 'amarelo') {
    return (
      <div
        className="alert-banner-yellow"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {alert.mensagem}
      </div>
    );
  }

  // vermelho_piscando
  return (
    <div
      className="alert-overlay-red"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <p className="alert-overlay-red__message">{alert.mensagem}</p>
    </div>
  );
}
