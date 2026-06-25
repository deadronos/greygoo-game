/**
 * Biosphere visualization.
 *
 * Renders the central canvas: hex-grid territory, nanite particles,
 * threat pulses, and heat overlay. Drawn on requestAnimationFrame; the
 * component owns the canvas lifecycle.
 */

import { useEffect, useRef } from "react";

import { selectDerived, selectState, shallow, useGameStore } from "@/store/gameStore";
import { HEAT_WARNING_FRAC, HEAT_CRITICAL_FRAC } from "@/systems/constants";
import { heatCap } from "@/systems/state";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Hex {
  x: number;
  y: number;
  size: number;
  lit: number;
  target: number;
}

export function BiosphereViz() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    particles: [] as Particle[],
    hexes: [] as Hex[],
    pulse: 0,
  });
  const rafRef = useRef<number | null>(null);

  // Init canvas + particles + hex grid
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    function init() {
      const ctx = c!.getContext("2d");
      if (!ctx) return;
      const W = c!.clientWidth;
      const H = c!.clientHeight;
      c!.width = W;
      c!.height = H;
      stateRef.current.particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 1 + Math.random() * 1.5,
      }));
      const size = 22;
      const w = size * Math.sqrt(3);
      const h = size * 1.5;
      const hexes: Hex[] = [];
      for (let row = 0, y = 0; y < H + size; row++, y += h) {
        for (let x = (row % 2) * w / 2; x < W + w; x += w) {
          hexes.push({ x, y, size, lit: 0, target: 0 });
        }
      }
      stateRef.current.hexes = hexes;
    }
    init();
    const onResize = () => init();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Animation loop
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    function drawHex(g: CanvasRenderingContext2D, x: number, y: number, s: number, lit: number, heatFrac: number) {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = x + s * Math.cos(a);
        const py = y + s * Math.sin(a);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      if (lit > 0.01) {
        const a = 0.2 + lit * 0.3;
        const color = heatFrac > 0.5
          ? `rgba(255, ${Math.floor(140 - heatFrac * 100)}, 60, ${a})`
          : `rgba(123, 214, 106, ${a})`;
        g.fillStyle = color;
        g.fill();
        g.strokeStyle = `rgba(123, 214, 106, ${a * 1.2})`;
        g.lineWidth = 1;
        g.stroke();
      } else {
        g.strokeStyle = "rgba(88, 225, 196, 0.05)";
        g.lineWidth = 0.5;
        g.stroke();
      }
    }

    function frame() {
      const { state } = useGameStore.getState();
      const W = c!.width;
      const H = c!.height;
      stateRef.current.pulse += 0.02;
      const g = ctx!;

      // background fade
      g.fillStyle = "rgba(4, 8, 12, 0.35)";
      g.fillRect(0, 0, W, H);

      const heatFrac = state.heat / heatCap(state);
      g.fillStyle = `rgba(255, 60, 80, ${heatFrac * 0.18})`;
      g.fillRect(0, 0, W, H);

      const hot = heatFrac > 0.7;
      const grad = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.min(W, H) / 2);
      grad.addColorStop(
        0,
        hot
          ? `rgba(255, 40, 100, ${0.25 + heatFrac * 0.3})`
          : `rgba(88, 225, 196, ${0.10 + Math.sin(stateRef.current.pulse) * 0.05})`,
      );
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);

      const ecoFrac = state.ecophagy / 100;
      for (const hx of stateRef.current.hexes) {
        const dx = (hx.x - W / 2) / (W / 2);
        const dy = (hx.y - H / 2) / (H / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        hx.target = dist < ecoFrac * 1.1 ? 1 : 0;
        hx.lit += (hx.target - hx.lit) * 0.05;
        if (hx.lit < 0.01) continue;
        drawHex(g, hx.x, hx.y, hx.size, hx.lit, heatFrac);
      }

      // particles
      g.fillStyle = hot ? "#ff5a78" : "#58e1c4";
      for (const p of stateRef.current.particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        g.globalAlpha = 0.7;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      // threats
      for (const t of state.threats) {
        const seed = t.id * 1234.5678;
        const tx = W * 0.15 + ((Math.sin(seed) + 1) / 2) * W * 0.7;
        const ty = H * 0.15 + ((Math.cos(seed * 1.3) + 1) / 2) * H * 0.7;
        const sz = 12 + t.type.tier * 5;
        const pulseR = sz + Math.sin(stateRef.current.pulse * 4 + t.id) * 4;
        g.strokeStyle = "rgba(255,77,94,0.8)";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(tx, ty, pulseR, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = "rgba(255,77,94,0.25)";
        g.fill();
        g.fillStyle = "#ff4d5e";
        g.font = "bold 10px monospace";
        g.textAlign = "center";
        g.fillText(t.type.tier.toString(), tx, ty + 3);
      }
      g.textAlign = "start";

      // outline
      g.strokeStyle = "rgba(88, 225, 196, 0.3)";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(W / 2, H / 2, Math.min(W, H) * 0.45, 0, Math.PI * 2);
      g.stroke();

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const state = useGameStore(selectState);
  const derived = useGameStore(selectDerived, shallow);

  // Cap-scaled thresholds so the temperature label stays consistent
  // with the simulation after the Diamondoid Chassis upgrade raises
  // the heat cap above the base 100.
  const cap = heatCap(state);
  const temperatureColor =
    state.heat < cap * HEAT_WARNING_FRAC ? "var(--accent)" :
    state.heat < cap * HEAT_CRITICAL_FRAC ? "var(--warn)" :
    "var(--danger)";

  return (
    <div className="viz" id="viz">
      <canvas ref={canvasRef} id="viz-canvas" width={600} height={600} />
      <div className="viz-overlay">
        <div className="viz-temp" style={{ color: temperatureColor }}>
          {Math.round(derived.temperatureKelvin)} K
        </div>
        <div className="viz-tag">SAMPLE SITE</div>
      </div>
    </div>
  );
}

// CSS lives in the global stylesheet (viz is part of the legacy look).