// Home — HUD driving screen.
// Portrait: speedometer on top, info below.
// Landscape: speedometer left, info + controls right.

import { useState, useEffect } from 'react';
import type { AlertEvent } from '../lib/alertEngine';
import type { AppSettings, UserPoint } from '../types';
import { saveUserPoints } from '../services/storage';
import { AlertOverlay } from './AlertOverlay';
import { Speedometer } from './Speedometer';
import './Home.css';

const TIPO_ICON: Record<string, string> = {
  RF:  '📷',
  RM:  '📷',
  SR:  '🚦',
  SC:  '🚦',
  PRv: '🚔',
  PED: '🛣️',
  LOM: '〰️',
};

const TIPO_LABEL: Record<string, string> = {
  RF:  'Radar Fixo',
  RM:  'Radar Móvel',
  SR:  'Semáforo c/ Radar',
  SC:  'Semáforo c/ Câmera',
  PRv: 'Polícia Rodoviária',
  PED: 'Pedágio',
  LOM: 'Lombada',
};

function tipoIcon(tipo: string): string {
  return TIPO_ICON[tipo] ?? '⚠️';
}

function tipoLabel(tipo: string): string {
  return TIPO_LABEL[tipo] ?? tipo;
}

function isNightHour(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

function roundToNearest50(value: number): number {
  return Math.round(value / 50) * 50;
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

  useEffect(() => {
    const timer = setInterval(() => setIsNightMode(isNightHour()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const isMock = import.meta.env.VITE_MOCK_GPS === 'true';
  const gpsOk = currentPos !== null;
  const speed = currentPos ? currentPos.velKmh : 0;
  const limit = nextEvent?.limiteKmh ?? 0;

  // Approach countdown in seconds
  const countdownSec = nextEvent && nextEvent.distM <= 1200
    ? Math.max(1, Math.round(nextEvent.distM / (Math.max(speed, 15) / 3.6)))
    : null;

  function handleSaveRadar() {
    if (!currentPos) { setSheetError('Aguarde o GPS'); return; }
    const limiteParsed = limitInput.trim() === '' ? 0 : parseInt(limitInput.trim(), 10);
    if (isNaN(limiteParsed) || limiteParsed < 0) { setSheetError('Limite inválido'); return; }

    const newPoint: UserPoint = {
      id: crypto.randomUUID(),
      lat: currentPos.lat,
      lon: currentPos.lon,
      tipo: selectedTipo,
      limite: limiteParsed,
      criadoEm: Date.now(),
    };
    const updated = [...userPoints, newPoint];
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
    <div className="hud">
      <AlertOverlay alert={visualAlert} onDismiss={onDismissAlert} isNightMode={isNightMode} />

      {/* ── Status bar ── */}
      <div className="hud__bar">
        <div className="hud__gps">
          <span className={`hud__gps-dot${gpsOk ? ' hud__gps-dot--ok' : ''}`} />
          <span>{gpsOk ? 'GPS' : 'SEM SINAL'}</span>
        </div>
        <div className="hud__title">RADARES PR</div>
        <div className="hud__bar-right">
          {isMock && <span className="hud__mock">MOCK</span>}
          <span className="hud__time">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* ── Main HUD body ── */}
      <div className="hud__body">

        {/* Left / top: speedometer gauge */}
        <div className="hud__gauge-col">
          <Speedometer speed={speed} limit={limit} isMonitoring={isMonitoring} />
        </div>

        {/* Right / bottom: info + controls */}
        <div className="hud__info-col">

          {/* Next radar panel */}
          <div className={`hud__radar-panel${nextEvent ? (nextEvent.visual === 'vermelho_piscando' ? ' hud__radar-panel--red' : ' hud__radar-panel--yellow') : ''}`}>
            {nextEvent ? (
              <>
                <div className="hud__radar-icon">{tipoIcon(nextEvent.tipo)}</div>
                <div className="hud__radar-name">{tipoLabel(nextEvent.tipo)}</div>
                <div className="hud__radar-dist">
                  ~{roundToNearest50(nextEvent.distM)} m
                  {limit > 0 && <span className="hud__radar-limit"> · {limit} km/h</span>}
                </div>
                {countdownSec !== null && (
                  <div className="hud__radar-countdown">⏱ {countdownSec}s</div>
                )}
              </>
            ) : (
              <div className="hud__radar-empty">
                <span>—</span>
                <span className="hud__radar-empty-sub">Sem radares próximos</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="hud__actions">
            {isMonitoring ? (
              <button className="hud__btn hud__btn--stop" onClick={onStop}>
                ⏹ PARAR
              </button>
            ) : (
              <button className="hud__btn hud__btn--start" onClick={onStart}>
                ▶ INICIAR
              </button>
            )}
            <button className="hud__btn hud__btn--mark" onClick={handleOpenSheet}>
              📍 MARCAR
            </button>
          </div>

          {/* Nav links */}
          <div className="hud__nav">
            <button className="hud__nav-btn" onClick={onSettingsOpen}>⚙ Config</button>
            <button className="hud__nav-btn" onClick={onMyPointsOpen}>🗂 Pontos</button>
          </div>

        </div>
      </div>

      {/* ── Mark radar bottom sheet ── */}
      {showSheet && (
        <div className="mark-sheet" role="dialog" aria-modal="true" aria-label="Marcar novo radar">
          <div className="mark-sheet__header">
            <span className="mark-sheet__title">Marcar Radar</span>
            <button className="mark-sheet__close" onClick={() => setShowSheet(false)} aria-label="Fechar">✕</button>
          </div>
          <div className="mark-sheet__tipos">
            {TIPOS.map((t) => (
              <button
                key={t}
                className={`mark-sheet__tipo${selectedTipo === t ? ' mark-sheet__tipo--sel' : ''}`}
                onClick={() => setSelectedTipo(t)}
                aria-pressed={selectedTipo === t}
              >
                {tipoIcon(t)} {t}
              </button>
            ))}
          </div>
          <div className="mark-sheet__limit-row">
            <label htmlFor="radar-limit" className="mark-sheet__label">Limite km/h (opcional)</label>
            <input
              id="radar-limit"
              type="number"
              inputMode="numeric"
              className="mark-sheet__input"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="0 = não informado"
              min="0"
              max="200"
            />
          </div>
          {sheetError && <div className="mark-sheet__error" role="alert">{sheetError}</div>}
          <button className="mark-sheet__save" onClick={handleSaveRadar}>SALVAR</button>
        </div>
      )}
    </div>
  );
}
