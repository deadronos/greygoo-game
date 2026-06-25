/**
 * Number / time formatters.
 *
 * Pure presentation helpers — no side effects, safe to use anywhere.
 */

const NUMBER_THRESHOLDS = [
  { max: 0.01,           digits: 2, style: "exp"   as const },
  { max: 10,             digits: 2, style: "fixed" as const },
  { max: 1_000,          digits: 1, style: "fixed" as const },
  { max: 1_000_000,      digits: 0, style: "int"   as const },
  { max: 1_000_000_000,  digits: 2, style: "M"     as const },
  { max: 1_000_000_000_000, digits: 2, style: "B"  as const },
];

/** Compact, human-readable number formatter. */
export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "0";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  for (const t of NUMBER_THRESHOLDS) {
    if (abs < t.max) {
      switch (t.style) {
        case "exp":   return n.toExponential(2);
        case "fixed": return n.toFixed(t.digits);
        case "int":   return Math.floor(n).toLocaleString();
        case "M":     return (n / 1_000_000).toFixed(t.digits) + "M";
        case "B":     return (n / 1_000_000_000).toFixed(t.digits) + "B";
      }
    }
  }
  return n.toExponential(2);
}

/** Integer formatter with thousands separators. */
export function fmtInt(n: number): string {
  return Math.floor(n).toLocaleString();
}

/** Seconds → "Hh Mm Ss" / "Mm Ss" / "Ss" */
export function fmtTime(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h) return `${h}h ${m}m ${ss}s`;
  if (m) return `${m}m ${ss}s`;
  return `${ss}s`;
}

/** Current local time as HH:MM:SS — for log timestamps. */
export function nowHMS(): string {
  const t = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
}

/** Pick the first band whose `max` is greater than the value. */
export function pickBand<T extends { max: number }>(bands: readonly T[], value: number): T {
  for (const band of bands) {
    if (value < band.max) return band;
  }
  return bands[bands.length - 1]!;
}

/** Heat gauge color stop. */
export function heatColor(heat: number, warning: number, critical: number, runaway: number): string {
  if (heat < warning) return "var(--heat-cool)";
  if (heat < critical) return "var(--heat-mid)";
  if (heat < runaway) return "var(--heat-hot)";
  return "var(--heat-melt)";
}