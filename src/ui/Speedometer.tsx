// Speedometer — aviation-style analogue gauge in pure SVG.
//
// Angle convention (used everywhere consistently):
//   0° = top (12 o'clock), clockwise positive  — same as "clock degrees"
//
// Arc sweep: 225° (7 o'clock) → 495° = 135° (5 o'clock)  — 270° total
//   0 km/h  → 225°  (bottom-left,  ~7 o'clock)
//   200 km/h→ 135°  (bottom-right, ~5 o'clock)  [225 + 270 = 495 mod 360 = 135]

import './Speedometer.css';

interface SpeedometerProps {
  speed: number;
  limit: number;
  isMonitoring: boolean;
}

// ── Layout constants ──────────────────────────────────────────────────────────
const VW   = 300;   // viewBox width
const VH   = 300;   // viewBox height — extra room below for readout in the gap
const CX   = 150;   // gauge centre x
const CY   = 148;   // gauge centre y — higher so bottom gap is visible
const R    = 108;   // arc/tick-outer radius
const R_TI_MAJ = 92; // tick inner — major
const R_TI_MIN = 98; // tick inner — minor
const R_LBL    = 74; // label radius

const MAX_KMH   = 200;
const ANG_START = 225;   // degrees at 0 km/h  (clock convention)
const ANG_SWEEP = 270;   // total sweep

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Clock-degrees → SVG cartesian  (0° = top, clockwise) */
function polar(r: number, angleDeg: number, cx = CX, cy = CY) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** km/h → clock-degrees position on arc */
function kmhToDeg(kmh: number): number {
  return ANG_START + (Math.max(0, Math.min(kmh, MAX_KMH)) / MAX_KMH) * ANG_SWEEP;
}

/** SVG arc-path between two clock-degree angles */
function arcPath(r: number, a1: number, a2: number): string {
  const s = polar(r, a1);
  const e = polar(r, a2);
  // normalise sweep so we always go clockwise
  let sweep = ((a2 - a1) % 360 + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

/** Colour based on speed vs limit */
function gaugeColor(speed: number, limit: number, active: boolean): string {
  if (!active)      return '#2d3748';
  if (limit <= 0)   return '#e2b94a';
  if (speed < limit * 0.85) return '#22c55e';
  if (speed < limit)        return '#e2b94a';
  return '#ef4444';
}

// ── Pre-compute ticks & labels (static) ──────────────────────────────────────
const TICKS: { d: string; major: boolean }[] = [];
const LBLS:  { x: number; y: number; text: string }[] = [];

for (let v = 0; v <= MAX_KMH; v += 10) {
  const major = v % 20 === 0;
  const ang   = kmhToDeg(v);
  const po    = polar(R, ang);
  const pi    = polar(major ? R_TI_MAJ : R_TI_MIN, ang);
  TICKS.push({ d: `M ${po.x.toFixed(2)} ${po.y.toFixed(2)} L ${pi.x.toFixed(2)} ${pi.y.toFixed(2)}`, major });

  // label every 20 km/h (all major ticks)
  if (major) {
    const pl = polar(R_LBL, ang);
    LBLS.push({ x: pl.x, y: pl.y, text: String(v) });
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function Speedometer({ speed, limit, isMonitoring }: SpeedometerProps) {
  const color       = gaugeColor(speed, limit, isMonitoring);
  const needleAngle = kmhToDeg(Math.max(0, Math.min(speed, MAX_KMH)));
  const arcEnd      = kmhToDeg(Math.max(0, Math.min(speed, MAX_KMH)));

  // Calculate needle endpoints using polar coordinates
  const needleTip  = polar(R - 14, needleAngle);
  const needleBase = polar(10, needleAngle);
  const needleTail = polar(18, needleAngle + 180); // opposite direction

  return (
    <div className="speedo-wrap" aria-hidden="true">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="speedo-svg" xmlns="http://www.w3.org/2000/svg">

        {/* ── Track arc ── */}
        <path
          d={arcPath(R, ANG_START, ANG_START + ANG_SWEEP)}
          fill="none" stroke="#1e2533" strokeWidth="13" strokeLinecap="round"
        />

        {/* ── Active arc (filled up to current speed) ── */}
        {speed > 0 && (
          <path
            d={arcPath(R, ANG_START, arcEnd)}
            fill="none" stroke={color} strokeWidth="13" strokeLinecap="round"
            className="speedo-active-arc"
          />
        )}

        {/* ── Speed-limit marker (red triangle outside arc) ── */}
        {limit > 0 && (() => {
          const ld = kmhToDeg(Math.min(limit, MAX_KMH));
          const p1 = polar(R + 8,  ld);
          const p2 = polar(R + 17, ld - 4);
          const p3 = polar(R + 17, ld + 4);
          return (
            <polygon
              points={`${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)}`}
              fill="#ef4444" opacity="0.9"
            />
          );
        })()}

        {/* ── Tick marks ── */}
        {TICKS.map((t, i) => (
          <path key={i} d={t.d}
            stroke={t.major ? '#6b7280' : '#374151'}
            strokeWidth={t.major ? 2 : 1}
          />
        ))}

        {/* ── Numeric labels ── */}
        {LBLS.map((l, i) => (
          <text key={i} x={l.x} y={l.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="12" fill="#6b7280"
            fontFamily="system-ui, sans-serif" fontWeight="600"
          >
            {l.text}
          </text>
        ))}

        {/* ── Needle (drawn directly at the correct angle) ── */}
        <g className="speedo-needle">
          <line 
            x1={needleBase.x} y1={needleBase.y}
            x2={needleTip.x} y2={needleTip.y}
            stroke={color} strokeWidth="3" strokeLinecap="round"
          />
          <line 
            x1={CX} y1={CY}
            x2={needleTail.x} y2={needleTail.y}
            stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.45"
          />
        </g>

        {/* ── Hub ── */}
        <circle cx={CX} cy={CY} r="11" fill="#0a0d12" stroke={color} strokeWidth="2.5" />
        <circle cx={CX} cy={CY} r="4.5" fill={color} />

        {/* ── Digital readout — in the gap at the bottom of the arc (6 o'clock) ── */}
        <text
          x={CX} y={CY + 52}
          textAnchor="middle" fontSize="42" fontWeight="900"
          fill={color}
          fontFamily="system-ui, 'Segoe UI', monospace"
          letterSpacing="-1"
          className="speedo-active-arc"
        >
          {Math.round(Math.max(0, speed))}
        </text>
        <text
          x={CX} y={CY + 74}
          textAnchor="middle" fontSize="11" fill="#6b7280"
          fontFamily="system-ui, sans-serif" fontWeight="600" letterSpacing="2"
        >
          KM/H
        </text>

      </svg>
    </div>
  );
}
