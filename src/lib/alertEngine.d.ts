// Type declarations for alertEngine.js

export interface AlertEvent {
  id: number;
  tipo: string;
  etapa: 1 | 2;
  mensagem: string;
  distM: number;
  limiteKmh: number | null;
  acimaDoLimite: boolean;
  visual: 'amarelo' | 'vermelho_piscando';
  som: 'aviso' | 'alarme';
  titulo: string;
}

export interface Position {
  lat: number;
  lon: number;
  velKmh: number;
  heading?: number | null;
}

export interface EngineConfig {
  etapa1M: number;
  etapa2M: number;
  tolerancia: number;
  resetM: number;
  velMinKmh: number;
  anguloFrenteGraus: number;
  tiposAtivos: string[];
  celulaGraus: number;
}

export interface DatasetJson {
  meta: object;
  pontos: Array<[number, number, string, number]>;
}

export declare class AlertEngine {
  constructor(dados: DatasetJson, config?: Partial<EngineConfig>);
  atualizar(pos: Position): AlertEvent[];
}

export declare const CONFIG_PADRAO: EngineConfig;

export declare function distanciaM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number;
