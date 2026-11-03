// Home — main driving screen (R5).
// Displays speed, next-point info, Start/Stop and Marcar Radar buttons.
// Inline bottom sheet for marking a new radar point (R7, Step 3).

import { useState, useEffect } from 'react';
import type { AlertEvent } from '../lib/alertEngine';
import type { AppSettings, UserPoint } from '../types';
import { saveUserPoints } from '../services/storage';
import { AlertOverlay } from './AlertOverlay';
import './Home.css';

// Emoji icon per radar type (used in next-point block)
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

// Night mode: between 20:00 and 06:00
function isNightHour(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

const TIPOS = ['RF', 'RM', 'SR', 'SC', 'PRv', 'LOM'] as const;
type TipoRadar = (typeof TIPOS)[number];

interface HomeProps {
  isMonitoring: boolean;
  currentPos: { lat: number; lon: number; velKmh: number; heading: number | null } | null;
  nextEvent: AlertEvent | null;
  visualAlert: AlertEvent | null;
  settings: AppSettings;
  userPoints: UserPoint[];
  onStart: () => void;
  onStop: () => void;
  onMarkRadar: (pts: UserPoint[]) => void;
  onDismissAlert: () => void;
  onSettingsOpen: () => void;
  onMyPointsOpen: () => void;
}

function roundToNearest50(value: number): number {
  return Math.round(value / 50) * 50;
}

export function Home({
  isMonitoring,
  currentPos,
  nextEvent,
  visualAlert,
  userPoints,
  onStart,
  onStop,
  onMarkRadar,
  onDismissAlert,
  onSettingsOpen,
  onMyPointsOpen,
}: HomeProps) {
  const [showSheet, setShowSheet] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoRadar>('RF');
  const [limitInput, setLimitInput] = useState('');
  const [sheetError, setSheetError] = useState('');
  const [isNightMode, setIsNightMode] = useState(isNightHour);

  // Re-check night mode every minute
  useEffect(() => {
    const timer = setInterval(() => setIsNightMode(isNightHour()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const isMock = import.meta.env.VITE_MOCK_GPS === 'true';

  const gpsOk = currentPos !== null;
  const speed = currentPos ? Math.round(currentPos.velKmh) : 0;

  function handleSaveRadar() {
    if (!currentPos) {
      setSheetError('Aguarde o GPS');
      return;
    }

    const limiteParsed = limitInput.trim() === '' ? 0 : parseInt(limitInput.trim(), 10);
    if (isNaN(limiteParsed) || limiteParsed < 0) {
      setSheetError('Limite inválido');
      return;
    }

    const newPoint: UserPoint = {
      id: crypto.randomUUID(),
      lat: currentPos.lat,
      lon: currentPos.lon,
      tipo: selectedTipo,
      limite: limiteParsed,
      criadoEm: Date.now(),
    };

    const updated = [...userPoints, newPoint];
    // Fire and forget — saveUserPoints handles its own errors
    void saveUserPoints(updated);
    onMarkRadar(updated);
    setShowSheet(false);
    setLimitInput('');
    setSheetError('');
    setSelectedTipo('RF');
  }

  function handleOpenSheet() {
    setSheetError('');
    setLimitInput('');
    setSelectedTipo('RF');
    setShowSheet(true);
  }

  return (
    <div className="home">
      <AlertOverlay alert={visualAlert} onDismiss={onDismissAlert} isNightMode={isNightMode} />

      {/* Top status bar */}
      <div className="home__status-bar">
        <div className="home__gps-row">
          <span className={`home__gps-dot ${gpsOk ? 'home__gps-dot--ok' : 'home__gps-dot--off'}`} aria-hidden="true" />
          <span className="home__gps-label">{gpsOk ? 'GPS ok' : 'Sem sinal'}</span>
        </div>
        {isMock && <span className="home__mock-badge">MOCK</span>}
      </div>

      {/* Speed display */}
      <div className="home__speed-block">
        <span className="home__speed-value" aria-label={`${speed} quilômetros por hora`}>
          {speed}
        </span>
        <span className="home__speed-unit">km/h</span>
      </div>

      {/* Next point info */}
      <div className="home__next-block">
        {nextEvent ? (
          <>
            <div className="home__next-tipo">
              <span className="home__next-icon">{tipoIcon(nextEvent.tipo)}</span>
              {nextEvent.tipo}
            </div>
            <div className="home__next-detail">
              {nextEvent.limiteKmh && nextEvent.limiteKmh > 0
                ? `Limite ${nextEvent.limiteKmh} km/h · `
                : ''}
              ~{roundToNearest50(nextEvent.distM)} m
            </div>
            {/* Countdown: show "Radar em X… X-1… 1…" only when close (etapa 1 ou 2) */}
            {nextEvent.distM <= 1200 && (
              <div className="home__next-countdown">
                ⏱ {Math.max(1, Math.round(nextEvent.distM / (Math.max(currentPos?.velKmh ?? 60, 15) / 3.6)))}s
              </div>
            )}
          </>
        ) : (
          <div className="home__next-empty">—</div>
        )}
      </div>

      {/* Action buttons */}
      <div className="home__buttons">
        {isMonitoring ? (
          <button
            className="home__btn-primary home__btn-primary--stop"
            onClick={onStop}
            aria-label="Parar monitoramento"
          >
            PARAR MONITORAMENTO
          </button>
        ) : (
          <button
            className="home__btn-primary home__btn-primary--start"
            onClick={onStart}
            aria-label="Iniciar monitoramento"
          >
            INICIAR MONITORAMENTO
          </button>
        )}

        <button
          className="home__btn-secondary"
          onClick={handleOpenSheet}
          aria-label="Marcar radar aqui"
        >
          MARCAR RADAR AQUI
        </button>
      </div>

      {/* Bottom navigation links */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0 20px' }}>
        <button className="home__settings-link" onClick={onSettingsOpen}>
          ⚙ Configurações
        </button>
        <button className="home__settings-link" onClick={onMyPointsOpen}>
          📍 Meus Pontos
        </button>
      </div>

      {/* Mark radar bottom sheet */}
      {showSheet && (
        <div
          className="mark-radar-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Marcar novo radar"
        >
          <div className="mark-radar-sheet__header">
            <span className="mark-radar-sheet__title">Marcar Radar</span>
            <button
              className="mark-radar-sheet__close"
              onClick={() => setShowSheet(false)}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="mark-radar-sheet__tipo-row">
            {TIPOS.map((t) => (
              <button
                key={t}
                className={`mark-radar-sheet__tipo-btn${selectedTipo === t ? ' mark-radar-sheet__tipo-btn--selected' : ''}`}
                onClick={() => setSelectedTipo(t)}
                aria-pressed={selectedTipo === t}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mark-radar-sheet__limit-row">
            <label htmlFor="radar-limit" className="mark-radar-sheet__limit-label">
              Limite km/h (opcional)
            </label>
            <input
              id="radar-limit"
              type="number"
              inputMode="numeric"
              className="mark-radar-sheet__limit-input"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="0 = não informado"
              min="0"
              max="200"
            />
          </div>

          {sheetError && (
            <div className="mark-radar-sheet__error" role="alert">
              {sheetError}
            </div>
          )}

          <button className="mark-radar-sheet__save-btn" onClick={handleSaveRadar}>
            SALVAR
          </button>
        </div>
      )}
    </div>
  );
}
