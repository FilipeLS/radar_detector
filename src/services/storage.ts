// Storage service — wraps @capacitor/preferences.
// PRIVACY: coordinates are NEVER stored or logged here.

import { Preferences } from '@capacitor/preferences';
import type { AppSettings, UserPoint } from '../types';

const DEFAULTS: AppSettings = {
  tiposAtivos: ['RF', 'RM', 'SR', 'SC', 'PRv', 'LOM'],
  vozAtiva: false,
  volume: 0.8,
  manterTela: true,
  avisarAcimaLimite: false,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const { value } = await Preferences.get({ key: 'settings' });
    if (!value) return { ...DEFAULTS };
    const parsed = JSON.parse(value) as Partial<AppSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await Preferences.set({ key: 'settings', value: JSON.stringify(s) });
}

export async function loadUserPoints(): Promise<UserPoint[]> {
  try {
    const { value } = await Preferences.get({ key: 'userPoints' });
    if (!value) return [];
    return JSON.parse(value) as UserPoint[];
  } catch {
    return [];
  }
}

export async function saveUserPoints(pts: UserPoint[]): Promise<void> {
  await Preferences.set({ key: 'userPoints', value: JSON.stringify(pts) });
}

export async function hasSeenDisclaimer(): Promise<boolean> {
  const { value } = await Preferences.get({ key: 'disclaimerSeen' });
  return value === 'true';
}

export async function markDisclaimerSeen(): Promise<void> {
  await Preferences.set({ key: 'disclaimerSeen', value: 'true' });
}
