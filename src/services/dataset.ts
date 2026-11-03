// Dataset service — loads base data, merges user points, validates imports.

import type { DatasetJson, UserPoint } from '../types';
import baseData from '../data/radares_pr.json';

const KNOWN_TIPOS = new Set(['RF', 'RM', 'SR', 'SC', 'PRv', 'PED', 'LOM']);

// Paraná bounding box
const LAT_MIN = -26.7;
const LAT_MAX = -22.5;
const LON_MIN = -54.6;
const LON_MAX = -48.0;

const MAX_BYTES = 5_000_000;

export function loadDataset(): DatasetJson {
  return baseData as DatasetJson;
}

export function mergeDataset(base: DatasetJson, userPoints: UserPoint[]): DatasetJson {
  if (userPoints.length === 0) return base;
  const extraPontos: Array<[number, number, string, number]> = userPoints.map(
    (p) => [p.lat, p.lon, p.tipo, p.limite]
  );
  return {
    meta: base.meta,
    pontos: [...base.pontos, ...extraPontos],
  };
}

type ValidateResult =
  | { ok: true; data: DatasetJson }
  | { ok: false; error: string };

export function validateImport(raw: unknown, maxBytes: number = MAX_BYTES): ValidateResult {
  try {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, error: 'Arquivo inválido: formato incorreto.' };
    }

    const serialized = JSON.stringify(raw);
    if (serialized.length > maxBytes) {
      return { ok: false, error: 'Arquivo muito grande (máximo 5 MB).' };
    }

    const obj = raw as Record<string, unknown>;

    if (!obj.meta || typeof obj.meta !== 'object') {
      return { ok: false, error: 'Arquivo inválido: campo "meta" ausente.' };
    }

    if (!Array.isArray(obj.pontos)) {
      return { ok: false, error: 'Arquivo inválido: campo "pontos" ausente ou inválido.' };
    }

    for (let i = 0; i < obj.pontos.length; i++) {
      const p = (obj.pontos as unknown[])[i];
      if (!Array.isArray(p) || p.length !== 4) {
        return { ok: false, error: `Ponto ${i} inválido: deve ser um array de 4 elementos.` };
      }
      const [lat, lon, tipo, limite] = p as unknown[];

      if (typeof lat !== 'number' || lat < LAT_MIN || lat > LAT_MAX) {
        return { ok: false, error: `Ponto ${i} inválido: latitude fora do Paraná.` };
      }
      if (typeof lon !== 'number' || lon < LON_MIN || lon > LON_MAX) {
        return { ok: false, error: `Ponto ${i} inválido: longitude fora do Paraná.` };
      }
      if (typeof tipo !== 'string' || !KNOWN_TIPOS.has(tipo)) {
        return { ok: false, error: `Ponto ${i} inválido: tipo "${String(tipo)}" desconhecido.` };
      }
      if (typeof limite !== 'number') {
        return { ok: false, error: `Ponto ${i} inválido: limite deve ser número.` };
      }
    }

    return { ok: true, data: raw as DatasetJson };
  } catch {
    return { ok: false, error: 'Erro ao processar o arquivo.' };
  }
}
