// AlertOverlay — renders yellow banner (etapa 1) or full-screen red flash (etapa 2).
// Features: vibration, countdown timer, type icon, night-mode dimming.
// Renders nothing when alert is null.

import { useEffect, useRef, useState } from 'react';
import type { AlertEvent } from '../lib/alertEngine';
import './AlertOverlay.css';

interface AlertOverlayProps {
  alert: AlertEvent | null;
  onDismiss: () => void;
  isNightMode: boolean;
}

const YELLOW_DURATION_MS = 5_000;
const RED_DURATION_MS = 10_000;

// Vibration patterns (ms): [vibrate, pause, vibrate, ...]
const VIB_ETAPA1 = [200];          // single short buzz
const VIB_ETAPA2 = [400, 150, 400, 150, 400]; // triple strong buzz

// Emoji icon per radar type
const TIPO_ICON: Record<string, string> = {
  RF:  '📷',
  RM:  '📷',
  SR:  '🚦',
  SC:  '🚦',
  PRv: '🚔',
  PED: '🛣️',
  LOM: '〰️',
};

function tipoIcon(tipo: string): string {
  return TIPO_ICON[tipo] ?? '⚠️';
}

function vibrate(pattern: number[]): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Non-fatal — vibration not available in browser
  }
}

export function AlertOverlay({ alert, onDismiss, isNightMode }: AlertOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!alert) {
      setCountdown(0);
      return;
    }

    // Create unique ID for this alert to prevent restarts
    const alertId = `${alert.id}-${alert.etapa}`;
    
    // If this is the SAME alert already running, don't restart timers
    if (lastAlertIdRef.current === alertId) {
      return;
    }
    
    lastAlertIdRef.current = alertId;

    // Clear any previous timers
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current !== null) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    const duration = alert.visual === 'amarelo' ? YELLOW_DURATION_MS : RED_DURATION_MS;
    const seconds = Math.round(duration / 1000);

    // Vibrate
    vibrate(alert.visual === 'amarelo' ? VIB_ETAPA1 : VIB_ETAPA2);

    // Countdown - start immediately
    setCountdown(seconds);
    
    let currentCount = seconds;
    countdownRef.current = setInterval(() => {
      currentCount--;
      setCountdown(currentCount);
      
      if (currentCount <= 0) {
        if (countdownRef.current !== null) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      }
    }, 1000);

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      lastAlertIdRef.current = null;
      onDismiss();
    }, duration);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
    };
  }, [alert, onDismiss]);

  if (!alert) return null;

  const icon = tipoIcon(alert.tipo);

  if (alert.visual === 'amarelo') {
    return (
      <div
        className="alert-banner-yellow"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <span className="alert-icon">{icon}</span>
        <span className="alert-message">{alert.mensagem}</span>
        <span className="alert-countdown">{countdown}s</span>
      </div>
    );
  }

  // vermelho_piscando
  return (
    <div
      className={`alert-overlay-red${isNightMode ? ' alert-overlay-red--night' : ''}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span className="alert-overlay-red__icon">{icon}</span>
      <p className="alert-overlay-red__message">{alert.mensagem}</p>
      <span className="alert-overlay-red__countdown">{countdown}s</span>
    </div>
  );
}
