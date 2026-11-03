// GPS service — wraps @capacitor-community/background-geolocation.
// PRIVACY: position data is passed to callbacks only; never stored or logged.

import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location, CallbackError } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface GpsPosition {
  lat: number;
  lon: number;
  velKmh: number;
  heading: number | null;
}

type PositionCallback = (pos: GpsPosition) => void;

let watcherId: string | null = null;
let mockInterval: ReturnType<typeof setInterval> | null = null;

// Compile-time flag — enabled only when VITE_MOCK_GPS=true
export const isMockMode: boolean = import.meta.env['VITE_MOCK_GPS'] === 'true';

export async function startGps(onPosition: PositionCallback): Promise<void> {
  if (watcherId !== null) return;

  watcherId = await BackgroundGeolocation.addWatcher(
    {
      backgroundMessage: 'Monitorando radares',
      backgroundTitle: 'Radares PR',
      requestPermissions: true,
      stale: false,
      distanceFilter: 0,
    },
    (location: Location | undefined, error: CallbackError | undefined) => {
      if (error || !location) return;
      onPosition({
        lat: location.latitude,
        lon: location.longitude,
        velKmh: (location.speed ?? 0) * 3.6,
        heading: location.bearing ?? null,
      });
    }
  );
}

export async function stopGps(): Promise<void> {
  if (watcherId === null) return;
  await BackgroundGeolocation.removeWatcher({ id: watcherId });
  watcherId = null;
}

// Mock GPS — simulates approach to a known radar point in PR.
// Coordinates near a radar on BR-376 km 660 area (approximate, ~80 km/h equivalent spacing ~100 m).
// These are not user coordinates — they are static test fixtures.
const MOCK_COORDS: Array<[number, number]> = [
  [-25.4120, -49.2650],
  [-25.4128, -49.2641],
  [-25.4136, -49.2632],
  [-25.4144, -49.2623],
  [-25.4152, -49.2614],
  [-25.4160, -49.2605],
  [-25.4168, -49.2596],
  [-25.4176, -49.2587],
  [-25.4184, -49.2578],
  [-25.4192, -49.2569],
  [-25.4200, -49.2560],
  [-25.4208, -49.2551],
  [-25.4216, -49.2542],
  [-25.4224, -49.2533],
  [-25.4232, -49.2524],
  [-25.4240, -49.2515],
  [-25.4248, -49.2506],
  [-25.4256, -49.2497],
  [-25.4264, -49.2488],
  [-25.4272, -49.2479],
];

let mockIndex = 0;

export function startMock(onPosition: PositionCallback, intervalMs = 1000): void {
  if (mockInterval !== null) return;
  mockIndex = 0;
  mockInterval = setInterval(() => {
    if (mockIndex >= MOCK_COORDS.length) {
      mockIndex = 0;
    }
    const [lat, lon] = MOCK_COORDS[mockIndex++]!;
    onPosition({ lat, lon, velKmh: 80, heading: 45 });
  }, intervalMs);
}

export function stopMock(): void {
  if (mockInterval !== null) {
    clearInterval(mockInterval);
    mockInterval = null;
  }
}
