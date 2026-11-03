// App.tsx — wires all services together.
// Real UI is implemented in FEAT-003 (Home, AlertOverlay, Settings, MyPoints).
// This file manages application state and service lifecycle.

import { useEffect, useRef, useState } from 'react';
import { KeepAwake } from '@capacitor-community/keep-awake';

import type { AppSettings, UserPoint } from './types';
import type { DatasetJson, AlertEvent } from './lib/alertEngine';

import {
  loadSettings,
  saveSettings,
  loadUserPoints,
  saveUserPoints,
  hasSeenDisclaimer,
  markDisclaimerSeen,
} from './services/storage';
import { loadDataset, mergeDataset } from './services/dataset';
import { startGps, stopGps, isMockMode, startMock, stopMock } from './services/gps';
import { AlertDispatcher } from './services/alerts';

export interface AppState {
  isMonitoring: boolean;
  currentPos: { lat: number; lon: number; velKmh: number; heading: number | null } | null;
  nextEvent: AlertEvent | null;
  visualAlert: AlertEvent | null;
  settings: AppSettings;
  userPoints: UserPoint[];
  dataset: DatasetJson;
  disclaimerSeen: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  updateSettings: (s: AppSettings) => Promise<void>;
  updateUserPoints: (pts: UserPoint[]) => Promise<void>;
  dismissVisualAlert: () => void;
  markDisclaimerSeenHandler: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  tiposAtivos: ['RF', 'RM', 'SR', 'SC', 'PRv', 'LOM'],
  vozAtiva: true,
  volume: 0.8,
  manterTela: true,
  avisarAcimaLimite: false,
};

function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentPos, setCurrentPos] = useState<AppState['currentPos']>(null);
  const [nextEvent, setNextEvent] = useState<AlertEvent | null>(null);
  const [visualAlert, setVisualAlert] = useState<AlertEvent | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userPoints, setUserPoints] = useState<UserPoint[]>([]);
  const [dataset, setDataset] = useState<DatasetJson>({ meta: {}, pontos: [] });
  const [disclaimerSeen, setDisclaimerSeen] = useState(false);
  const [ready, setReady] = useState(false);

  const dispatcherRef = useRef<AlertDispatcher | null>(null);

  // Load all persisted state on mount
  useEffect(() => {
    async function init() {
      const [s, pts, seen] = await Promise.all([
        loadSettings(),
        loadUserPoints(),
        hasSeenDisclaimer(),
      ]);
      const base = loadDataset();
      const merged = mergeDataset(base, pts);

      setSettings(s);
      setUserPoints(pts);
      setDataset(merged);
      setDisclaimerSeen(seen);

      dispatcherRef.current = new AlertDispatcher(merged, s, (ev) => {
        setVisualAlert(ev);
        setNextEvent(ev);
      });

      setReady(true);
    }
    void init();
  }, []);

  const startMonitoring = async (): Promise<void> => {
    if (isMonitoring) return;

    const onPosition = (pos: NonNullable<AppState['currentPos']>) => {
      setCurrentPos(pos);
      dispatcherRef.current?.handle(pos);
    };

    if (isMockMode) {
      startMock(onPosition);
    } else {
      await startGps(onPosition);
    }

    if (settings.manterTela) {
      try {
        await KeepAwake.keepAwake();
      } catch {
        // KeepAwake may not be available in browser — non-fatal
      }
    }

    setIsMonitoring(true);
  };

  const stopMonitoring = async (): Promise<void> => {
    if (!isMonitoring) return;

    if (isMockMode) {
      stopMock();
    } else {
      await stopGps();
    }

    try {
      await KeepAwake.allowSleep();
    } catch {
      // Non-fatal
    }

    setCurrentPos(null);
    setIsMonitoring(false);
  };

  const updateSettings = async (s: AppSettings): Promise<void> => {
    await saveSettings(s);
    setSettings(s);
    // Recreate dispatcher so engine picks up new tiposAtivos
    if (dispatcherRef.current) {
      dispatcherRef.current.recreate(dataset, s);
    }
  };

  const updateUserPoints = async (pts: UserPoint[]): Promise<void> => {
    await saveUserPoints(pts);
    setUserPoints(pts);
    const base = loadDataset();
    const merged = mergeDataset(base, pts);
    setDataset(merged);
    // Recreate engine with new merged dataset
    if (dispatcherRef.current) {
      dispatcherRef.current.recreate(merged, settings);
    }
  };

  const dismissVisualAlert = (): void => {
    setVisualAlert(null);
  };

  const markDisclaimerSeenHandler = async (): Promise<void> => {
    await markDisclaimerSeen();
    setDisclaimerSeen(true);
  };

  if (!ready) {
    return <div>Radares PR loading...</div>;
  }

  // Real UI (FEAT-003) will replace this placeholder.
  // All state and handlers are available for child components via props or context.
  const appState: AppState = {
    isMonitoring,
    currentPos,
    nextEvent,
    visualAlert,
    settings,
    userPoints,
    dataset,
    disclaimerSeen,
    startMonitoring,
    stopMonitoring,
    updateSettings,
    updateUserPoints,
    dismissVisualAlert,
    markDisclaimerSeenHandler,
  };

  return (
    <div data-app-state={JSON.stringify({ isMonitoring, ready })}>
      {/* Placeholder — FEAT-003 replaces this with Home, AlertOverlay, Settings, MyPoints */}
      <div>Radares PR</div>
      <div style={{ display: 'none' }}>{JSON.stringify(Object.keys(appState))}</div>
    </div>
  );
}

export default App;
