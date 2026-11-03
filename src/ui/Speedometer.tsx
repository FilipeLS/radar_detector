// Speedometer — analogue aviation-style gauge rendered in pure SVG.
// Arc spans from -225° to 45° (270° sweep), 0–200 km/h.
// Needle rotates smoothly via CSS transition.
// Arc color: green → amber → red based on speed vs limit.

import './Speedometer.css';

interface SpeedometerProps {
  speed: number;       // current speed km/h
  limit: number;       // speed limit km/h (0 = unknown)
  isMonitoring: boolean;
}

const CX = 150;        // SVG centre x
const CY = 155;        // SVG centre y (slightly below centre for arc room)
const R_ARC = 120;     // arc radius
const R_TICK_OUTER = 108;
const R_TICK_INNER_MAJ = 94;
const R_TICK_INNER_MIN = 100;
const R_LABEL = 80;

const START_DEG = 225;   // angle at 0 km/h (measuring from 3-o'clock, clockwise)
const SWEEP_DEG = 270;   // total sweep
const MAX_KMH = 200;

/** Convert km/h to SVG rotation angle (degrees from SVG 0°=3-o'clock) */
function speedToDeg(kmh: number): number {
  const clamped = Math.max(0, Math.min(kmh, MAX_KMH));
  const fraction = clamped / MAX_KMH;
  // 0 km/h → -225° (i.e. 135°), 200 km/h → 45°
  return -START_DEG + fraction * SWEEP_DEG;
}

/** Polar to Cartesian */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/** Build SVG arc path between two angles */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

/** Arc start/end in "clock" degrees (0=top, clockwise) */
const ARC_START = 360 - START_DEG; // = 135°
const ARC_END = ARC_START + SWEEP_DEG; // = 405° = 45°

function speedToArcEnd(kmh: number): number {
  return ARC_START + (Math.min(kmh, MAX_KMH) / MAX_KMH) * SWEEP_DEG;
}

/** Color based on speed vs limit */
function needleColor(speed: number, limit: number): string {
  if (limit <= 0) return '#e2b94a';          // amber — no limit info
  if (speed < limit * 0.85) return '#22c55e'; // green — well under
  if (speed < limit) return '#e2b94a';        // amber — approaching
  return '#ef4444';                           // red — over limit
}

function arcColor(speed: number, limit: number): string {
  return needleColor(speed, limit);
}

/** Build tick marks and labels */
function buildTicks() {
  const ticks: { path: string; major: boolean }[] = [];
  const labels: { x: number; y: number; text: string }[] = [];

  for (let kmh = 0; kmh <= MAX_KMH; kmh += 10) {
    const major = kmh % 20 === 0;
    const angleDeg = ARC_START + (kmh / MAX_KMH) * SWEEP_DEG;
    const outer = polar(CX, CY, R_TICK_OUTER, angleDeg);
    const inner = polar(CX, CY, major ? R_TICK_INNER_MAJ : R_TICK_INNER_MIN, angleDeg);
    ticks.push({ path: `M ${outer.x} ${outer.y} L ${inner.x} ${inner.y}`, major });

    if (major && kmh % 40 === 0) {
      const lp = polar(CX, CY, R_LABEL, angleDeg);
      labels.push({ x: lp.x, y: lp.y, text: String(kmh) });
    }
  }
  return { ticks, labels };
}

const { ticks, labels } = buildTicks();

export function Speedometer({ speed, limit, isMonitoring }: SpeedometerProps) {
  const clampedSpeed = Math.max(0, Math.min(speed, MAX_KMH));
  const rotation = speedToDeg(clampedSpeed);
  const color = isMonitoring ? needleColor(speed, limit) : '#4b5563';
  const activeArcEnd = speedToArcEnd(clampedSpeed);
  const activeArcColor = isMonitoring ? arcColor(speed, limit) : '#2d3748';

  return (
    <div className="speedo-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 300 230"
        className="speedo-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Background arc (track) ── */}
        <path
          d={arcPath(CX, CY, R_ARC, ARC_START, ARC_END)}
          fill="none"
          stroke="#1e2533"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* ── Active arc (speed fill) ── */}
        {clampedSpeed > 0 && (
          <path
            d={arcPath(CX, CY, R_ARC, ARC_START, activeArcEnd)}
            fill="none"
            stroke={activeArcColor}
            strokeWidth="14"
            strokeLinecap="round"
            className="speedo-active-arc"
          />
        )}

        {/* ── Limit marker (small triangle on arc) ── */}
        {limit > 0 && (
          <>
            {(() => {
              const limitDeg = ARC_START + (Math.min(limit, MAX_KMH) / MAX_KMH) * SWEEP_DEG;
              const p1 = polar(CX, CY, R_ARC + 10, limitDeg);
              const p2 = polar(CX, CY, R_ARC + 18, limitDeg - 4);
              const p3 = polar(CX, CY, R_ARC + 18, limitDeg + 4);
              return (
                <polygon
                  points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                  fill="#ef4444"
                  opacity="0.9"
                />
              );
            })()}
          </>
        )}

        {/* ── Tick marks ── */}
        {ticks.map((t, i) => (
          <path
            key={i}
            d={t.path}
            stroke={t.major ? '#6b7280' : '#374151'}
            strokeWidth={t.major ? 2 : 1}
          />
        ))}

        {/* ── Labels ── */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fill="#6b7280"
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
          >
            {l.text}
          </text>
        ))}

        {/* ── Needle ── */}
        <g
          className="speedo-needle"
          style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${CX}px ${CY}px` }}
        >
          {/* needle body */}
          <line
            x1={CX}
            y1={CY + 14}
            x2={CX}
            y2={CY - R_ARC + 16}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* needle tail */}
          <line
            x1={CX}
            y1={CY + 14}
            x2={CX}
            y2={CY + 22}
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.5"
          />
        </g>

        {/* ── Centre hub ── */}
        <circle cx={CX} cy={CY} r="10" fill="#0f1117" stroke={color} strokeWidth="2.5" />
        <circle cx={CX} cy={CY} r="4" fill={color} />

        {/* ── Digital speed readout ── */}
        <text
          x={CX}
          y={CY + 44}
          textAnchor="middle"
          fontSize="38"
          fontWeight="900"
          fill={color}
          fontFamily="system-ui, 'Segoe UI', monospace"
          letterSpacing="-1"
        >
          {Math.round(speed)}
        </text>
        <text
          x={CX}
          y={CY + 62}
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
          letterSpacing="1"
        >
          KM/H
        </text>
      </svg>
    </div>
  );
}
