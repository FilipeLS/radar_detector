// alertEngine.js — motor de alertas de radar (aproximado, 2 etapas)
// Uso: const motor = new AlertEngine(dadosJson); const eventos = motor.atualizar({lat, lon, velKmh, heading});
// Funciona em JS/TS (Capacitor, React) — sem dependências.

const NOMES = {
  RF: "radar", RM: "radar", SR: "radar no semáforo", SC: "câmera no semáforo",
  PRv: "posto da Polícia Rodoviária", LOM: "lombada", PED: "pedágio",
};

export const CONFIG_PADRAO = {
  // Distâncias NOMINAIS. O disparo usa folga (tolerância) porque a localização é aproximada.
  etapa1M: 1000,          // "Atenção, radar próximo"
  etapa2M: 500,           // "Devagar, radar a 500 metros"
  tolerancia: 0.10,       // dispara a partir de 10% antes da distância nominal (1100 m / 550 m)
  resetM: 1500,           // só rearma o ponto depois de se afastar além disso
  velMinKmh: 15,          // parado/devagar: sem alerta
  anguloFrenteGraus: 80,  // ponto precisa estar "à frente" (±80°) quando há direção do GPS
  tiposAtivos: ["RF", "RM", "SR", "SC", "PRv", "LOM"],  // PED desligado por padrão
  celulaGraus: 0.02,      // grade de busca (~2,2 km)
};

const R = 6371000, RAD = Math.PI / 180;

export function distanciaM(lat1, lon1, lat2, lon2) {
  const x = (lon2 - lon1) * RAD * Math.cos(((lat1 + lat2) / 2) * RAD);
  const y = (lat2 - lat1) * RAD;
  return Math.sqrt(x * x + y * y) * R;
}

function rumo(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * RAD) * Math.cos(lat2 * RAD);
  const x = Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) -
            Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos((lon2 - lon1) * RAD);
  return ((Math.atan2(y, x) / RAD) + 360) % 360;
}

function difAngulo(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export class AlertEngine {
  /** @param {{meta:object, pontos:Array<[number,number,string,number]>}} dados */
  constructor(dados, config = {}) {
    this.cfg = { ...CONFIG_PADRAO, ...config };
    this.pontos = dados.pontos.map((p, i) => ({ id: i, lat: p[0], lon: p[1], tipo: p[2], limite: p[3] }));
    this.grade = new Map();
    for (const p of this.pontos) {
      if (!this.cfg.tiposAtivos.includes(p.tipo)) continue;
      const k = this._chave(p.lat, p.lon);
      if (!this.grade.has(k)) this.grade.set(k, []);
      this.grade.get(k).push(p);
    }
    this.estado = new Map(); // id -> { etapa, minDist, ultimaDist }
  }

  _chave(lat, lon) {
    const c = this.cfg.celulaGraus;
    return `${Math.floor(lat / c)}:${Math.floor(lon / c)}`;
  }

  _vizinhos(lat, lon) {
    const c = this.cfg.celulaGraus, cy = Math.floor(lat / c), cx = Math.floor(lon / c), out = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const l = this.grade.get(`${cy + dy}:${cx + dx}`);
        if (l) out.push(...l);
      }
    return out;
  }

  /**
   * Chamar a cada atualização do GPS (~1 s).
   * @param {{lat:number, lon:number, velKmh:number, heading?:number|null}} pos
   * @returns eventos a tocar/exibir (normalmente 0 ou 1)
   */
  atualizar({ lat, lon, velKmh, heading = null }) {
    const c = this.cfg, eventos = [];
    const lim1 = c.etapa1M * (1 + c.tolerancia), lim2 = c.etapa2M * (1 + c.tolerancia);
    const temDirecao = heading != null && velKmh >= c.velMinKmh;

    for (const p of this._vizinhos(lat, lon)) {
      const d = distanciaM(lat, lon, p.lat, p.lon);
      let st = this.estado.get(p.id);
      if (!st) { st = { etapa: 0, minDist: Infinity, ultimaDist: d }; this.estado.set(p.id, st); }

      // rearmar quando se afasta bastante
      if (d > c.resetM) { st.etapa = 0; st.minDist = Infinity; st.ultimaDist = d; continue; }

      const aproximando = d < st.ultimaDist;
      st.minDist = Math.min(st.minDist, d);
      st.ultimaDist = d;

      if (velKmh < c.velMinKmh) continue;
      if (d > lim1) continue;

      // precisa estar vindo em direção ao ponto (ou à frente), aproximado
      const aFrente = !temDirecao || difAngulo(heading, rumo(lat, lon, p.lat, p.lon)) <= c.anguloFrenteGraus;
      if (!aFrente || !aproximando) continue;

      let nova = 0;
      if (d <= lim2) nova = 2; else if (d <= lim1) nova = 1;
      if (nova > st.etapa) {
        st.etapa = nova;
        eventos.push(this._evento(p, nova, d, velKmh));
      }
    }
    // vários pontos juntos (ex.: ida/volta, sequência): fala só o mais próximo
    eventos.sort((a, b) => b.etapa - a.etapa || a.distM - b.distM);
    return eventos.slice(0, 1);
  }

  _evento(p, etapa, d, velKmh) {
    const nome = NOMES[p.tipo] || "ponto de fiscalização";
    const cap = nome.charAt(0).toUpperCase() + nome.slice(1);
    const mensagem = etapa === 1
      ? `Atenção, ${nome} próximo`
      : `Devagar, ${nome} a ${this.cfg.etapa2M} metros`;
    return {
      id: p.id, tipo: p.tipo, etapa, mensagem,
      distM: Math.round(d), limiteKmh: p.limite || null,
      acimaDoLimite: !!p.limite && velKmh > p.limite - 3,
      // etapa 1: aviso amarelo + som curto. etapa 2: tela vermelha piscando + sirene.
      visual: etapa === 1 ? "amarelo" : "vermelho_piscando",
      som: etapa === 1 ? "aviso" : "alarme",
      titulo: cap,
    };
  }
}
