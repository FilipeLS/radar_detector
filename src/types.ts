// Shared application types

export interface AppSettings {
  tiposAtivos: string[];
  vozAtiva: boolean;
  volume: number;
  manterTela: boolean;
  avisarAcimaLimite: boolean;
}

export interface UserPoint {
  id: string;
  lat: number;
  lon: number;
  tipo: string;
  limite: number;
  criadoEm: number;
}

export type { DatasetJson } from './lib/alertEngine';
