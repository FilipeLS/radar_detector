// App.tsx — wires all services together and renders the active screen.

import { Component, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { KeepAwake } from '@capacitor-community/keep-awake';

import type { AppSettings, UserPoint } from './types';
import type { DatasetJson, AlertEvent } from './lib/alertEngine';

import {
  loadSettings,
  saveSettings,
  loadUserPoints,
  hasSeenDisclaimer,
  markDisclaimerSeen,
} from './services/storage';
import { loadDataset, mergeDataset } from './services/dataset';
import { startGps, stopGps, isMockMode, startMock, stopMock } from './services/gps';
import { AlertDispatcher } from './services/alerts';

import { Disclaimer } from './ui/Disclaimer';
import { Home } from './ui/Home';
import { Settings } from './ui/Settings';
import { MyPoints } from './ui/MyPoints';

// ---------------------------------------------------------------------------
// Error boundary — catches render errors, shows a friendly message (R9).
// ---------------------------------------------------------------------------
interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Do not log coordinates or stack traces
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100svh',
            background: '#1a1a1a',
            color: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            textAlign: 'center',
          }}
        >
          Ocorreu um erro. Reinicie o aplicativo.
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS: AppSettings = {
  tiposAtivos: ['RF', 'RM', 'SR', 'SC', 'PRv', 'LOM'],
  vozAtiva: false,
  volume: 0.8,
  manterTela: true,
  avisarAcimaLimite: false,
};

type Screen = 'home' | 'settings' | 'mypoints';

function App() {
  const [ready, setReady] = useState(false);
  const [disclaimerSeen, setDisclaimerSeen] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentPos, setCurrentPos] = useState<{
    lat: number;
    lon: number;
    velKmh: number;
    heading: number | null;
  } | null>(null);
  const [nextEvent, setNextEvent] = useState<AlertEvent | null>(null);
  const [visualAlert, setVisualAlert] = useState<AlertEvent | null>(null);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userPoints, setUserPoints] = useState<UserPoint[]>([]);
  const [baseDataset, setBaseDataset] = useState<DatasetJson>({ meta: {}, pontos: [] });
  const [mergedDataset, setMergedDataset] = useState<DatasetJson>({ meta: {}, pontos: [] });

  const dispatcherRef = useRef<AlertDispatcher | null>(null);
  const currentAlertIdRef = useRef<string | null>(null); // Track current visual alert

  // Load persisted state on mount
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
      setBaseDataset(base);
      setMergedDataset(merged);
      setDisclaimerSeen(seen);

      dispatcherRef.current = new AlertDispatcher(merged, s, (ev) => {
        // Only update visual alert if it's a NEW alert (different id or stage)
        const newAlertId = `${ev.id}-${ev.etapa}`;
        if (currentAlertIdRef.current !== newAlertId) {
          currentAlertIdRef.current = newAlertId;
          setVisualAlert(ev);
        }
        // Always update nextEvent for the info panel
        setNextEvent(ev);
      });

      setReady(true);
    }
    void init();
  }, []);

  // -------------------------------------------------------------------------
  // Monitoring
  // -------------------------------------------------------------------------
  const startMonitoring = async (): Promise<void> => {
    if (isMonitoring) return;

    const onPosition = (pos: NonNullable<typeof currentPos>) => {
      setCurrentPos(pos);
      dispatcherRef.current?.handle(pos);
    };

    try {
      if (isMockMode) {
        startMock(onPosition);
      } else {
        await startGps(onPosition);
      }
    } catch {
      // Non-fatal: GPS start failure is shown via gpsOk=false in UI
    }

    if (settings.manterTela) {
      try {
        await KeepAwake.keepAwake();
      } catch {
        // Not available in browser — non-fatal
      }
    }

    setIsMonitoring(true);
  };

  const stopMonitoring = async (): Promise<void> => {
    if (!isMonitoring) return;

    try {
      if (isMockMode) {
        stopMock();
      } else {
        await stopGps();
      }
    } catch {
      // Non-fatal
    }

    try {
      await KeepAwake.allowSleep();
    } catch {
      // Non-fatal
    }

    setCurrentPos(null);
    setIsMonitoring(false);
  };

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  const handleSaveSettings = (s: AppSettings): void => {
    void saveSettings(s);
    setSettings(s);
    if (dispatcherRef.current) {
      dispatcherRef.current.recreate(mergedDataset, s);
    }
    setScreen('home');
  };

  // -------------------------------------------------------------------------
  // User points
  // -------------------------------------------------------------------------
  const handleUpdateUserPoints = (pts: UserPoint[]): void => {
    setUserPoints(pts);
    const merged = mergeDataset(baseDataset, pts);
    setMergedDataset(merged);
    if (dispatcherRef.current) {
      dispatcherRef.current.recreate(merged, settings);
    }
  };

  // -------------------------------------------------------------------------
  // Replace base dataset
  // -------------------------------------------------------------------------
  const handleReplaceBase = (data: DatasetJson): void => {
    setBaseDataset(data);
    const merged = mergeDataset(data, userPoints);
    setMergedDataset(merged);
    if (dispatcherRef.current) {
      dispatcherRef.current.recreate(merged, settings);
    }
  };

  // -------------------------------------------------------------------------
  // Disclaimer
  // -------------------------------------------------------------------------
  const handleAcceptDisclaimer = (): void => {
    void markDisclaimerSeen();
    setDisclaimerSeen(true);
  };

  // -------------------------------------------------------------------------
  // Visual alert
  // -------------------------------------------------------------------------
  const dismissVisualAlert = useCallback((): void => {
    setVisualAlert(null);
    currentAlertIdRef.current = null; // Clear the current alert ID
  }, []);

  // -------------------------------------------------------------------------
  // Loading splash
  // -------------------------------------------------------------------------
  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100svh',
          background: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
        }}
      >
        Carregando…
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (!disclaimerSeen) {
    return <Disclaimer onAccept={handleAcceptDisclaimer} />;
  }

  if (screen === 'settings') {
    return (
      <Settings
        settings={settings}
        onSave={handleSaveSettings}
        onClose={() => setScreen('home')}
      />
    );
  }

  if (screen === 'mypoints') {
    return (
      <MyPoints
        userPoints={userPoints}
        onUpdate={handleUpdateUserPoints}
        onClose={() => setScreen('home')}
        onReplaceBase={handleReplaceBase}
      />
    );
  }

  return (
    <Home
      isMonitoring={isMonitoring}
      currentPos={currentPos}
      nextEvent={nextEvent}
      visualAlert={visualAlert}
      settings={settings}
      userPoints={userPoints}
      onStart={() => void startMonitoring()}
      onStop={() => void stopMonitoring()}
      onMarkRadar={handleUpdateUserPoints}
      onDismissAlert={dismissVisualAlert}
      onSettingsOpen={() => setScreen('settings')}
      onMyPointsOpen={() => setScreen('mypoints')}
    />
  );
}

function AppWithBoundary() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

export default AppWithBoundary;
