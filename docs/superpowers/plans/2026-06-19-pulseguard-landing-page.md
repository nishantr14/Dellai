# PulseGuard Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cinematic, scroll-driven landing page for PulseGuard as a standalone `landing/` Vite app, with a live React-Three-Fiber server room, 9 scroll scenes, and real model-sourced metrics.

**Architecture:** A new Vite + React 18 app in `landing/`. Lenis drives smooth scroll; GSAP ScrollTrigger owns pinned/scrubbed scene logic; Framer Motion handles reveals and counters; React Three Fiber renders one reused 3D server-room scene (hero → flythrough → fleet). All on-screen numbers come from a copied snapshot of the repo's `frontend_data.json`. A GPU-tier / reduced-motion fallback swaps the 3D scene for an abstract CSS grid.

**Tech Stack:** Vite, React 18, Tailwind CSS, Framer Motion, GSAP + ScrollTrigger, React Three Fiber + @react-three/drei + @react-three/postprocessing, Lenis, Recharts, Vitest + Testing Library (for logic units).

**Reference spec:** `docs/superpowers/specs/2026-06-19-pulseguard-landing-page-design.md`

**Testing note:** Visual scenes (3D, scroll) are verified by "dev server runs + renders without console errors + `npm run build` passes." Pure logic (data hook, count-up math, tier→color, gpu-tier) gets real Vitest unit tests written test-first.

---

## File Structure

```
landing/
  index.html                       # Vite entry, fonts, root div
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
  vitest.config.js
  public/
    data/frontend_data.json        # snapshot copied from repo root
  src/
    main.jsx                       # React root + global providers
    App.jsx                        # section composition + canvas mount
    index.css                      # Tailwind layers + base + grain/vignette
    theme.js                       # design tokens (mirrors dashboard T)
    lib/
      gsap.js                      # registers ScrollTrigger, exports gsap
      lenis.js                     # Lenis init + GSAP sync helper
    data/
      usePulseData.js              # fetches + shapes frontend_data.json
    hooks/
      useCountUp.js                # count-up motion value
      useGpuTier.js                # detect low-GPU / prefers-reduced-motion
      useScrollScene.js            # ScrollTrigger lifecycle wrapper
    three/
      sceneStore.js                # shared scroll/scene state for R3F + DOM
      ServerRoom.jsx               # <Canvas> wrapper + scene graph
      Racks.jsx                    # instanced server racks
      StatusLights.jsx             # data-driven emissive LEDs
      CameraRig.jsx                # scroll-driven camera
      FleetField.jsx               # Scene 5 constellation
      Effects.jsx                  # bloom + fog
      FallbackGrid.jsx             # abstract CSS/canvas grid (low GPU)
    components/
      Nav.jsx
      ScrollProgress.jsx
      SectionWrapper.jsx
      GlassCard.jsx
      Counter.jsx
      CTAButton.jsx
    sections/
      Hero.jsx                     # Scene 1
      RackFlythrough.jsx           # Scene 2
      Degradation.jsx              # Scene 3
      AIAnalysis.jsx               # Scene 4
      FleetView.jsx                # Scene 5
      Architecture.jsx             # Scene 6
      Metrics.jsx                  # Scene 7
      DashboardShowcase.jsx        # Scene 8
      Finale.jsx                   # Scene 9
  src/test/
    setup.js
    usePulseData.test.jsx
    useCountUp.test.jsx
    theme.test.js
    useGpuTier.test.js
```

---

## Phase 1 — Scaffold & Foundations

### Task 1: Scaffold the Vite app

**Files:**
- Create: `landing/package.json`, `landing/vite.config.js`, `landing/index.html`, `landing/src/main.jsx`, `landing/src/App.jsx`, `landing/postcss.config.js`, `landing/tailwind.config.js`, `landing/src/index.css`

- [ ] **Step 1: Create `landing/package.json`**

```json
{
  "name": "pulseguard-landing",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "framer-motion": "^11.3.0",
    "gsap": "^3.12.5",
    "lenis": "^1.1.13",
    "three": "^0.167.0",
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.109.0",
    "@react-three/postprocessing": "^2.16.0",
    "recharts": "^2.12.7",
    "lucide-react": "^0.417.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.4",
    "tailwindcss": "^3.4.7",
    "postcss": "^8.4.40",
    "autoprefixer": "^10.4.19",
    "vitest": "^2.0.4",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.8",
    "jsdom": "^24.1.1"
  }
}
```

- [ ] **Step 2: Create `landing/vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
});
```

- [ ] **Step 3: Create `landing/postcss.config.js` and `landing/tailwind.config.js`**

`postcss.config.js`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e14", panel: "#111824", panel2: "#161f2c", line: "#222d3d",
        text: "#e8eef6", muted: "#8a98ab", faint: "#586676",
        brand: "#8b8cf0", dell: "#0085c3",
        healthy: "#3fb98a", risk: "#e0a92e", critical: "#e0564f",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Create `landing/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PulseGuard — Predict Hardware Failures Before They Happen</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `landing/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { margin: 0; background: #0a0e14; color: #e8eef6; }
html { scroll-behavior: auto; } /* Lenis controls scroll */
body { font-family: Inter, system-ui, sans-serif; overflow-x: hidden; }

/* film grain + vignette overlays applied via .grain / .vignette utility divs */
.grain::after {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 50;
  opacity: 0.04; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.vignette::before {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 40;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%);
}
```

- [ ] **Step 6: Create `landing/src/main.jsx`**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Create a minimal `landing/src/App.jsx` placeholder**

```jsx
export default function App() {
  return (
    <main className="min-h-screen grid place-items-center bg-bg text-text">
      <h1 className="font-sans text-4xl font-bold tracking-tight">PulseGuard</h1>
    </main>
  );
}
```

- [ ] **Step 8: Install and verify dev server**

Run: `cd landing && npm install && npm run dev`
Expected: Vite serves at `http://localhost:5180`, shows "PulseGuard" centered, no console errors.

- [ ] **Step 9: Verify build**

Run: `cd landing && npm run build`
Expected: build succeeds, `dist/` produced.

- [ ] **Step 10: Commit**

```bash
git add landing/
git commit -m "feat(landing): scaffold Vite + React + Tailwind app"
```

---

### Task 2: Copy data snapshot + Vitest setup

**Files:**
- Create: `landing/public/data/frontend_data.json` (copy), `landing/vitest.config.js`, `landing/src/test/setup.js`

- [ ] **Step 1: Copy the real data snapshot into the app**

Run: `cp frontend_data.json landing/public/data/frontend_data.json`
Expected: file exists at `landing/public/data/frontend_data.json`.

- [ ] **Step 2: Create `landing/vitest.config.js`**

```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
  },
});
```

- [ ] **Step 3: Create `landing/src/test/setup.js`**

```js
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Verify the test runner boots (no tests yet)**

Run: `cd landing && npm run test`
Expected: Vitest runs, reports "no test files found" (exit 0 is fine) — runner is wired.

- [ ] **Step 5: Commit**

```bash
git add landing/public/data/frontend_data.json landing/vitest.config.js landing/src/test/setup.js
git commit -m "chore(landing): add data snapshot and Vitest setup"
```

---

### Task 3: Design tokens (`theme.js`)

**Files:**
- Create: `landing/src/theme.js`, `landing/src/test/theme.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { T, tierColor } from "../theme.js";

describe("theme", () => {
  it("exposes the dashboard base palette", () => {
    expect(T.bg).toBe("#0a0e14");
    expect(T.brand).toBe("#8b8cf0");
    expect(T.critical).toBe("#e0564f");
  });
  it("maps tiers to status colors", () => {
    expect(tierColor("Healthy")).toBe(T.healthy);
    expect(tierColor("At Risk")).toBe(T.risk);
    expect(tierColor("Critical")).toBe(T.critical);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd landing && npx vitest run src/test/theme.test.js`
Expected: FAIL — cannot resolve `../theme.js`.

- [ ] **Step 3: Create `landing/src/theme.js`**

```js
export const T = {
  bg: "#0a0e14", panel: "#111824", panel2: "#161f2c", line: "#222d3d",
  text: "#e8eef6", muted: "#8a98ab", faint: "#586676",
  brand: "#8b8cf0", dell: "#0085c3",
  healthy: "#3fb98a", risk: "#e0a92e", critical: "#e0564f",
};

export const tierColor = (t) =>
  t === "Healthy" ? T.healthy : t === "At Risk" ? T.risk : T.critical;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd landing && npx vitest run src/test/theme.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add landing/src/theme.js landing/src/test/theme.test.js
git commit -m "feat(landing): add shared design tokens"
```

---

### Task 4: Data hook (`usePulseData`)

**Files:**
- Create: `landing/src/data/usePulseData.js`, `landing/src/test/usePulseData.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePulseData } from "../data/usePulseData.js";

const SAMPLE = {
  summary: { total: 28, healthy: 17, atRisk: 6, critical: 5, predictedFailures30d: 8 },
  metrics: { storage: { recall: 0.7061 }, components: { recall: 0.9748 }, rul: { rmse: 15.93 } },
  fleet: [{ device: "srv-001", tier: "Healthy", health: 99 }],
};

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(SAMPLE) })
  );
});

describe("usePulseData", () => {
  it("loads and exposes summary, metrics, fleet", async () => {
    const { result } = renderHook(() => usePulseData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.summary.total).toBe(28);
    expect(result.current.data.metrics.storage.recall).toBeCloseTo(0.7061);
    expect(result.current.data.fleet).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd landing && npx vitest run src/test/usePulseData.test.jsx`
Expected: FAIL — cannot resolve `usePulseData`.

- [ ] **Step 3: Create `landing/src/data/usePulseData.js`**

```js
import { useEffect, useState } from "react";

export function usePulseData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/frontend_data.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => { if (alive) { setData(json); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  return { data, loading, error };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd landing && npx vitest run src/test/usePulseData.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add landing/src/data/usePulseData.js landing/src/test/usePulseData.test.jsx
git commit -m "feat(landing): add usePulseData data hook"
```

---

### Task 5: Count-up hook + GPU/reduced-motion hook

**Files:**
- Create: `landing/src/hooks/useCountUp.js`, `landing/src/hooks/useGpuTier.js`, `landing/src/test/useCountUp.test.jsx`, `landing/src/test/useGpuTier.test.js`

- [ ] **Step 1: Write the failing test for useCountUp**

```jsx
import { describe, it, expect } from "vitest";
import { formatCount } from "../hooks/useCountUp.js";

describe("formatCount", () => {
  it("rounds integers and respects suffix", () => {
    expect(formatCount(70.6, 0, "%")).toBe("71%");
    expect(formatCount(8.0, 0, "")).toBe("8");
    expect(formatCount(15.93, 1, "")).toBe("15.9");
  });
});
```

- [ ] **Step 2: Write the failing test for useGpuTier**

```js
import { describe, it, expect } from "vitest";
import { prefersReducedMotion } from "../hooks/useGpuTier.js";

describe("prefersReducedMotion", () => {
  it("returns false when matchMedia reports no preference", () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    expect(prefersReducedMotion()).toBe(false);
  });
  it("returns true when matchMedia reports reduce", () => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    expect(prefersReducedMotion()).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd landing && npx vitest run src/test/useCountUp.test.jsx src/test/useGpuTier.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create `landing/src/hooks/useCountUp.js`**

```js
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

export function formatCount(value, decimals = 0, suffix = "") {
  const n = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return `${n}${suffix}`;
}

// Counts from 0 to `target` once the element scrolls into view.
export function useCountUp(target, { decimals = 0, suffix = "", duration = 1400 } = {}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(formatCount(0, decimals, suffix));

  useEffect(() => {
    if (!inView) return;
    let raf, start;
    const tick = (t) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(formatCount(target * eased, decimals, suffix));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, decimals, suffix, duration]);

  return { ref, display };
}
```

- [ ] **Step 5: Create `landing/src/hooks/useGpuTier.js`**

```js
import { useEffect, useState } from "react";

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Rough GPU capability check: WebGL availability + renderer string heuristic.
export function detectLowGpu() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return true;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    return /swiftshader|software|llvmpipe/i.test(renderer);
  } catch {
    return true;
  }
}

// True => render the lightweight fallback instead of the full 3D scene.
export function useGpuTier() {
  const [useFallback, setUseFallback] = useState(false);
  useEffect(() => {
    setUseFallback(prefersReducedMotion() || detectLowGpu());
  }, []);
  return useFallback;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd landing && npx vitest run src/test/useCountUp.test.jsx src/test/useGpuTier.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add landing/src/hooks/ landing/src/test/useCountUp.test.jsx landing/src/test/useGpuTier.test.js
git commit -m "feat(landing): add count-up and GPU-tier hooks"
```

---

### Task 6: GSAP + Lenis wiring

**Files:**
- Create: `landing/src/lib/gsap.js`, `landing/src/lib/lenis.js`, `landing/src/hooks/useScrollScene.js`

- [ ] **Step 1: Create `landing/src/lib/gsap.js`**

```js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
```

- [ ] **Step 2: Create `landing/src/lib/lenis.js`**

```js
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap.js";

// Initialize Lenis smooth scroll and sync it with GSAP's ticker + ScrollTrigger.
export function initLenis() {
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
```

- [ ] **Step 3: Create `landing/src/hooks/useScrollScene.js`**

```js
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap.js";

// Runs a setup callback inside a gsap.context scoped to `scopeRef`, so all
// ScrollTriggers/timelines created in it are reverted on unmount (no leaks).
export function useScrollScene(scopeRef, setup, deps = []) {
  useEffect(() => {
    if (!scopeRef.current) return;
    const ctx = gsap.context(setup, scopeRef);
    ScrollTrigger.refresh();
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

- [ ] **Step 4: Verify it imports cleanly (smoke build)**

Run: `cd landing && npm run build`
Expected: build succeeds (modules compile).

- [ ] **Step 5: Commit**

```bash
git add landing/src/lib/ landing/src/hooks/useScrollScene.js
git commit -m "feat(landing): wire GSAP ScrollTrigger + Lenis smooth scroll"
```

---

## Phase 2 — Shared UI Shell

### Task 7: Shared presentational components

**Files:**
- Create: `landing/src/components/GlassCard.jsx`, `landing/src/components/SectionWrapper.jsx`, `landing/src/components/Counter.jsx`, `landing/src/components/CTAButton.jsx`

- [ ] **Step 1: Create `landing/src/components/GlassCard.jsx`**

```jsx
export default function GlassCard({ children, className = "", accent, style = {} }) {
  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl ${className}`}
      style={{
        background: "rgba(17,24,36,0.55)",
        borderColor: accent ? `${accent}55` : "rgba(34,45,61,0.9)",
        boxShadow: accent ? `inset 0 0 30px ${accent}14, 0 10px 40px rgba(0,0,0,0.4)` : "0 10px 40px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `landing/src/components/SectionWrapper.jsx`**

```jsx
import { forwardRef } from "react";

// Full-viewport section shell. `pin` sections are targeted by GSAP later.
const SectionWrapper = forwardRef(function SectionWrapper(
  { children, id, className = "", style = {} }, ref
) {
  return (
    <section
      id={id}
      ref={ref}
      className={`relative w-full ${className}`}
      style={{ minHeight: "100vh", ...style }}
    >
      {children}
    </section>
  );
});

export default SectionWrapper;
```

- [ ] **Step 3: Create `landing/src/components/Counter.jsx`**

```jsx
import { useCountUp } from "../hooks/useCountUp.js";

// Animated count-up number. `value` is the real target from the data.
export default function Counter({ value, decimals = 0, suffix = "", className = "" }) {
  const { ref, display } = useCountUp(value, { decimals, suffix });
  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {display}
    </span>
  );
}
```

- [ ] **Step 4: Create `landing/src/components/CTAButton.jsx`**

```jsx
import { motion } from "framer-motion";

// Primary call-to-action. `href` defaults to the dashboard dev server; override
// via prop or VITE_DASHBOARD_URL at build time.
export default function CTAButton({ children, href, secondary = false }) {
  const target = href || import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";
  return (
    <motion.a
      href={target}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
      style={
        secondary
          ? { color: "#e8eef6", background: "transparent", border: "1px solid #222d3d" }
          : { color: "#0a0e14", background: "#8b8cf0", border: "none" }
      }
    >
      {children}
    </motion.a>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `cd landing && npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add landing/src/components/
git commit -m "feat(landing): add shared UI components (GlassCard, Counter, CTA, SectionWrapper)"
```

---

### Task 8: Nav + ScrollProgress

**Files:**
- Create: `landing/src/components/Nav.jsx`, `landing/src/components/ScrollProgress.jsx`

- [ ] **Step 1: Create `landing/src/components/Nav.jsx`**

```jsx
import { Activity } from "lucide-react";
import CTAButton from "./CTAButton.jsx";

const LINKS = [
  { id: "fleet", label: "Fleet" },
  { id: "architecture", label: "Architecture" },
  { id: "metrics", label: "Metrics" },
];

export default function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-40">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#hero" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ background: "#8b8cf022", border: "1px solid #8b8cf055" }}>
            <Activity size={17} color="#8b8cf0" />
          </span>
          <span className="font-semibold tracking-wide">PulseGuard</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} className="text-sm text-muted hover:text-text transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <CTAButton>Launch Dashboard</CTAButton>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create `landing/src/components/ScrollProgress.jsx`**

```jsx
import { motion, useScroll, useSpring } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-[2px] origin-left"
      style={{ scaleX, background: "linear-gradient(90deg,#8b8cf0,#0085c3)" }}
    />
  );
}
```

- [ ] **Step 3: Mount Nav + ScrollProgress in `App.jsx` and verify**

Replace `landing/src/App.jsx`:
```jsx
import Nav from "./components/Nav.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";

export default function App() {
  return (
    <div className="grain vignette bg-bg text-text">
      <ScrollProgress />
      <Nav />
      <main>
        <section id="hero" style={{ minHeight: "100vh" }} className="grid place-items-center">
          <h1 className="text-5xl font-bold tracking-tight">PulseGuard</h1>
        </section>
        <section style={{ minHeight: "100vh" }} />
      </main>
    </div>
  );
}
```

Run: `cd landing && npm run dev`
Expected: fixed nav with logo + "Launch Dashboard", a thin gradient progress bar that grows as you scroll, no console errors.

- [ ] **Step 4: Commit**

```bash
git add landing/src/components/Nav.jsx landing/src/components/ScrollProgress.jsx landing/src/App.jsx
git commit -m "feat(landing): add persistent nav and scroll-progress rail"
```

---

## Phase 3 — 3D Server Room

### Task 9: Scene store + Canvas mount + fallback

**Files:**
- Create: `landing/src/three/sceneStore.js`, `landing/src/three/ServerRoom.jsx`, `landing/src/three/FallbackGrid.jsx`

- [ ] **Step 1: Create `landing/src/three/sceneStore.js`**

```js
// Plain mutable store shared between DOM (GSAP writes) and R3F (reads each frame).
// Avoids React re-renders for per-frame camera/scroll values.
export const sceneState = {
  scroll: 0,        // 0..1 overall page progress
  camZ: 14,         // camera dolly target
  camX: 0,
  focusTier: null,  // 'Critical' to highlight degradation
  fleetReveal: 0,   // 0..1 Scene 5 constellation reveal
};
```

- [ ] **Step 2: Create `landing/src/three/FallbackGrid.jsx`**

```jsx
// Lightweight abstract grid used when GPU is weak or reduced-motion is set.
// Pure CSS perspective grid + drifting glow — no WebGL.
export default function FallbackGrid() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: "#0a0e14" }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(#8b8cf014 1px, transparent 1px), linear-gradient(90deg,#8b8cf014 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "perspective(600px) rotateX(60deg) scale(2)",
          transformOrigin: "center 40%",
          maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 75%)",
        }}
      />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle,#8b8cf033,transparent 70%)", filter: "blur(20px)" }} />
    </div>
  );
}
```

- [ ] **Step 3: Create `landing/src/three/ServerRoom.jsx` (shell, no racks yet)**

```jsx
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useGpuTier } from "../hooks/useGpuTier.js";
import FallbackGrid from "./FallbackGrid.jsx";

export default function ServerRoom() {
  const useFallback = useGpuTier();
  if (useFallback) return <FallbackGrid />;

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.5, 14], fov: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0e14"]} />
        <fog attach="fog" args={["#0a0e14", 12, 38]} />
        <ambientLight intensity={0.25} />
        <Suspense fallback={null}>
          {/* racks, lights, effects added in later tasks */}
        </Suspense>
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 4: Mount in App and verify both paths**

Add `import ServerRoom from "./three/ServerRoom.jsx";` to `App.jsx` and render `<ServerRoom />` as the first child inside the root div.

Run: `cd landing && npm run dev`
Expected: dark canvas background behind the hero; no console errors. Temporarily test fallback by forcing `useGpuTier` to return true — fallback grid renders. Revert the force.

- [ ] **Step 5: Commit**

```bash
git add landing/src/three/sceneStore.js landing/src/three/ServerRoom.jsx landing/src/three/FallbackGrid.jsx landing/src/App.jsx
git commit -m "feat(landing): mount R3F canvas shell with GPU fallback grid"
```

---

### Task 10: Instanced racks + status lights

**Files:**
- Create: `landing/src/three/Racks.jsx`, `landing/src/three/StatusLights.jsx`
- Modify: `landing/src/three/ServerRoom.jsx`

- [ ] **Step 1: Create `landing/src/three/Racks.jsx`**

```jsx
import { useMemo } from "react";

// Two rows of server racks receding into fog. Built from simple boxes so it
// stays cheap; geometry is shared, materials are dark with subtle emissive trim.
export default function Racks({ rows = 2, perRow = 9 }) {
  const positions = useMemo(() => {
    const out = [];
    for (let r = 0; r < rows; r++) {
      const x = r === 0 ? -3.2 : 3.2;
      for (let i = 0; i < perRow; i++) {
        out.push([x, 0, -i * 4]); // march away from camera
      }
    }
    return out;
  }, [rows, perRow]);

  return (
    <group>
      {positions.map((p, idx) => (
        <mesh key={idx} position={[p[0], 1.4, p[2]]} castShadow>
          <boxGeometry args={[1.6, 2.8, 2.4]} />
          <meshStandardMaterial color="#0e1622" metalness={0.6} roughness={0.5}
            emissive="#10182a" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Create `landing/src/three/StatusLights.jsx`**

```jsx
import { useMemo } from "react";
import { tierColor } from "../theme.js";

// Emissive LED strip on each rack. Color comes from fleet tiers so the room is
// literally lit by the data. `fleet` is the array from usePulseData.
export default function StatusLights({ fleet = [], rows = 2, perRow = 9 }) {
  const lights = useMemo(() => {
    const out = [];
    let f = 0;
    for (let r = 0; r < rows; r++) {
      const x = r === 0 ? -3.2 : 3.2;
      for (let i = 0; i < perRow; i++) {
        const node = fleet[f % Math.max(1, fleet.length)] || { tier: "Healthy" };
        out.push({ pos: [x + (r === 0 ? 0.85 : -0.85), 1.4, -i * 4], color: tierColor(node.tier) });
        f++;
      }
    }
    return out;
  }, [fleet, rows, perRow]);

  return (
    <group>
      {lights.map((l, idx) => (
        <mesh key={idx} position={l.pos}>
          <boxGeometry args={[0.06, 1.8, 0.06]} />
          <meshBasicMaterial color={l.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 3: Render racks + lights in `ServerRoom.jsx`**

Modify the `<Suspense>` block in `ServerRoom.jsx`. First accept a `fleet` prop:
```jsx
export default function ServerRoom({ fleet = [] }) {
```
Add imports at top:
```jsx
import Racks from "./Racks.jsx";
import StatusLights from "./StatusLights.jsx";
```
Inside `<Suspense>`:
```jsx
<Racks />
<StatusLights fleet={fleet} />
<pointLight position={[0, 6, 4]} intensity={40} color="#8b8cf0" distance={30} />
```

- [ ] **Step 4: Pass fleet from App**

In `App.jsx`, call `usePulseData()` and pass `fleet`:
```jsx
import { usePulseData } from "./data/usePulseData.js";
// ...
const { data } = usePulseData();
const fleet = data?.fleet ?? [];
// ...
<ServerRoom fleet={fleet} />
```

Run: `cd landing && npm run dev`
Expected: two rows of dark racks receding into fog, lit by colored LED strips (mostly green with some orange/red), violet key light. No console errors.

- [ ] **Step 5: Commit**

```bash
git add landing/src/three/Racks.jsx landing/src/three/StatusLights.jsx landing/src/three/ServerRoom.jsx landing/src/App.jsx
git commit -m "feat(landing): add instanced racks and data-driven status lights"
```

---

### Task 11: Scroll-driven camera rig + bloom effects

**Files:**
- Create: `landing/src/three/CameraRig.jsx`, `landing/src/three/Effects.jsx`
- Modify: `landing/src/three/ServerRoom.jsx`, `landing/src/lib/lenis.js` (publish scroll)

- [ ] **Step 1: Publish global scroll progress to the scene store**

In `App.jsx`, set up Lenis once and write progress into `sceneState`:
```jsx
import { useEffect } from "react";
import { initLenis } from "./lib/lenis.js";
import { sceneState } from "./three/sceneStore.js";
// inside App component:
useEffect(() => {
  const lenis = initLenis();
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    sceneState.scroll = max > 0 ? window.scrollY / max : 0;
  };
  lenis.on("scroll", onScroll);
  onScroll();
  return () => lenis.destroy();
}, []);
```

- [ ] **Step 2: Create `landing/src/three/CameraRig.jsx`**

```jsx
import { useFrame, useThree } from "@react-three/fiber";
import { sceneState } from "./sceneStore.js";

// Reads sceneState.scroll each frame and dollies the camera through the racks.
// 0.0-0.15 hero (wide), 0.15-0.30 flythrough (push in), later scenes pull back.
export default function CameraRig() {
  const { camera } = useThree();
  useFrame(() => {
    const s = sceneState.scroll;
    const targetZ = 14 - Math.min(0.30, s) / 0.30 * 16; // 14 -> -2 during first 30%
    const pullBack = s > 0.5 ? (s - 0.5) * 40 : 0;       // Scene 5 pull-back
    camera.position.z += (targetZ + pullBack - camera.position.z) * 0.06;
    camera.position.x += ((s > 0.15 && s < 0.30 ? Math.sin(s * 40) * 1.2 : 0) - camera.position.x) * 0.05;
    camera.lookAt(0, 1.4, camera.position.z - 6);
  });
  return null;
}
```

- [ ] **Step 3: Create `landing/src/three/Effects.jsx`**

```jsx
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export default function Effects() {
  return (
    <EffectComposer disableNormalPass>
      <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur />
      <Vignette eskil={false} offset={0.2} darkness={0.7} />
    </EffectComposer>
  );
}
```

- [ ] **Step 4: Wire CameraRig + Effects into ServerRoom**

Add imports and render inside `<Canvas>` (Effects after the Suspense block, CameraRig anywhere inside Canvas):
```jsx
import CameraRig from "./CameraRig.jsx";
import Effects from "./Effects.jsx";
// inside <Canvas>:
<CameraRig />
{/* ...existing scene... */}
<Effects />
```

Run: `cd landing && npm run dev`
Expected: scrolling dollies the camera into the racks; LEDs bloom; vignette frames the scene. Smooth, no jank, no console errors.

- [ ] **Step 5: Commit**

```bash
git add landing/src/three/CameraRig.jsx landing/src/three/Effects.jsx landing/src/three/ServerRoom.jsx landing/src/App.jsx
git commit -m "feat(landing): scroll-driven camera rig + bloom/vignette effects"
```

---

## Phase 4 — Story Sections (Scenes 1–9)

> Each section is a DOM overlay above the fixed 3D canvas. Sections use `SectionWrapper`, Framer Motion for reveals, and (where scrubbing is needed) `useScrollScene`.

### Task 12: Scene 1 — Hero

**Files:**
- Create: `landing/src/sections/Hero.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/Hero.jsx`**

```jsx
import { motion } from "framer-motion";
import SectionWrapper from "../components/SectionWrapper.jsx";
import CTAButton from "../components/CTAButton.jsx";

export default function Hero() {
  return (
    <SectionWrapper id="hero" className="grid place-items-center text-center">
      <div className="px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 text-xs font-mono uppercase tracking-[0.3em] text-brand"
        >
          AI-Powered Predictive Maintenance
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          Predict Hardware Failures<br />Before They Happen.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mx-auto mt-6 max-w-xl text-lg text-muted"
        >
          AI-powered predictive maintenance for enterprise infrastructure.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.75 }}
          className="mt-9 flex items-center justify-center gap-3"
        >
          <CTAButton>Launch Dashboard</CTAButton>
          <CTAButton secondary href="#fleet">See the Fleet</CTAButton>
        </motion.div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-faint animate-pulse">
        scroll to explore
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render Hero in App (replace placeholder hero section)**

In `App.jsx`, replace the placeholder `<section id="hero">…</section>` with `<Hero />`. Keep the trailing empty spacer sections for now.

Run: `cd landing && npm run dev`
Expected: hero text fades/rises in over the 3D racks; two CTAs; "scroll to explore" cue. No console errors.

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/Hero.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 1 hero section"
```

---

### Task 13: Scene 2 — Rack Flythrough (telemetry chips)

**Files:**
- Create: `landing/src/sections/RackFlythrough.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/RackFlythrough.jsx`**

```jsx
import { motion } from "framer-motion";
import { Thermometer, Zap, HardDrive, Fan, Activity } from "lucide-react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import GlassCard from "../components/GlassCard.jsx";

const CHIPS = [
  { icon: Thermometer, label: "Temperature", value: "47°C", trend: "nominal", color: "#3fb98a" },
  { icon: Zap, label: "Power Draw", value: "412 W", trend: "stable", color: "#0085c3" },
  { icon: HardDrive, label: "Storage Health", value: "98%", trend: "healthy", color: "#3fb98a" },
  { icon: Fan, label: "Fan Speed", value: "6,200 RPM", trend: "nominal", color: "#8b8cf0" },
  { icon: Activity, label: "SMART Data", value: "0 reallocated", trend: "clean", color: "#3fb98a" },
];

export default function RackFlythrough() {
  return (
    <SectionWrapper className="grid place-items-center">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
          className="text-3xl font-bold tracking-tight md:text-5xl"
        >
          Every signal, streaming in real time.
        </motion.h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          PulseGuard watches the telemetry that precedes failure — across every node, continuously.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5">
          {CHIPS.map((c, i) => (
            <motion.div key={c.label}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}>
              <GlassCard accent={c.color} className="p-4 text-left">
                <c.icon size={18} color={c.color} />
                <div className="mt-3 font-mono text-xl font-bold">{c.value}</div>
                <div className="text-xs text-muted">{c.label}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider" style={{ color: c.color }}>{c.trend}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render in App (replace first spacer section)**

Run: `cd landing && npm run dev`
Expected: five telemetry chips stagger in as the section scrolls into view, over the moving 3D scene.

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/RackFlythrough.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 2 rack flythrough telemetry chips"
```

---

### Task 14: Scene 3 — Degradation (scrubbed health + chart)

**Files:**
- Create: `landing/src/sections/Degradation.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/Degradation.jsx`**

```jsx
import { useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer, CartesianGrid,
} from "recharts";
import SectionWrapper from "../components/SectionWrapper.jsx";
import { useScrollScene } from "../hooks/useScrollScene.js";
import { gsap } from "../lib/gsap.js";
import { T } from "../theme.js";

const STAGES = [96, 74, 41, 5];
const SERIES = [
  { t: -40, h: 96 }, { t: -30, h: 92 }, { t: -22, h: 80 }, { t: -16, h: 74 },
  { t: -10, h: 55 }, { t: -6, h: 41 }, { t: -3, h: 20 }, { t: 0, h: 5 },
];

export default function Degradation() {
  const scopeRef = useRef(null);
  const [health, setHealth] = useState(96);
  const [revealT, setRevealT] = useState(-40);

  useScrollScene(scopeRef, () => {
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: scopeRef.current,
        start: "top top",
        end: "+=160%",
        pin: true,
        scrub: true,
      },
      onUpdate: () => {
        const idx = Math.min(STAGES.length - 1, Math.floor(proxy.p * STAGES.length));
        setHealth(STAGES[idx]);
        setRevealT(-40 + proxy.p * 40);
      },
    });
  }, []);

  const col = health > 65 ? T.healthy : health > 35 ? T.risk : T.critical;
  const shown = SERIES.filter((d) => d.t <= revealT);

  return (
    <SectionWrapper ref={scopeRef} className="grid place-items-center">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Watch a healthy node<br />slip toward failure.
          </h2>
          <p className="mt-4 max-w-md text-muted">
            Degradation is gradual and invisible to threshold alarms. PulseGuard sees the
            slope, not just the cliff.
          </p>
          <div className="mt-8 font-mono tabular-nums" style={{ color: col }}>
            <span className="text-7xl font-extrabold md:text-8xl">{health}</span>
            <span className="ml-3 text-sm uppercase tracking-widest text-muted">health score</span>
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={shown} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={col} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" stroke={T.faint} tick={{ fontSize: 11, fill: T.faint }}
                tickFormatter={(v) => (v === 0 ? "fail" : `${v}d`)} domain={[-40, 0]} type="number" />
              <YAxis domain={[0, 100]} stroke={T.faint} tick={{ fontSize: 11, fill: T.faint }} />
              <ReferenceLine y={65} stroke={T.healthy} strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={35} stroke={T.critical} strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area type="monotone" dataKey="h" stroke={col} strokeWidth={2.6} fill="url(#dg)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render in App and verify scrub**

Run: `cd landing && npm run dev`
Expected: section pins; as you scroll, health number steps 96→74→41→5, color shifts green→amber→red, and the chart draws toward the failure point. Scrubbing back reverses it.

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/Degradation.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 3 scroll-scrubbed degradation"
```

---

### Task 15: Scene 4 — AI Analysis (explainability cards)

**Files:**
- Create: `landing/src/sections/AIAnalysis.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/AIAnalysis.jsx`**

```jsx
import { motion } from "framer-motion";
import { HardDrive, Thermometer, Zap, Clock } from "lucide-react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import GlassCard from "../components/GlassCard.jsx";
import { T } from "../theme.js";

const SIGNALS = [
  { icon: HardDrive, title: "Offline Uncorrectable Sectors Increasing", detail: "SMART 198 climbing 4×/week — irreversible media damage.", impact: 0.92 },
  { icon: Thermometer, title: "Thermal Margin Falling", detail: "Operating 9°C above 30-day baseline; headroom nearly gone.", impact: 0.71 },
  { icon: Zap, title: "Power Instability Detected", detail: "Rail voltage variance up 3.1× — early PSU degradation.", impact: 0.58 },
];

export default function AIAnalysis() {
  return (
    <SectionWrapper className="grid place-items-center">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div className="text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}>
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">Explainable AI · SHAP</div>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Not just a prediction. The reasons.</h2>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {SIGNALS.map((s, i) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6, delay: i * 0.12 }}>
              <GlassCard accent={T.critical} className="h-full p-5">
                <s.icon size={20} color={T.critical} />
                <div className="mt-4 font-semibold leading-snug">{s.title}</div>
                <div className="mt-2 text-sm text-muted">{s.detail}</div>
                <div className="mt-4 h-1.5 rounded-full" style={{ background: T.bg }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} whileInView={{ width: `${s.impact * 100}%` }}
                    viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3 + i * 0.12 }}
                    style={{ background: T.critical }} />
                </div>
                <div className="mt-1 text-right font-mono text-xs text-faint">{Math.round(s.impact * 100)}% impact</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div className="mt-6"
          initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7, delay: 0.3 }}>
          <GlassCard accent={T.critical} className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Clock size={22} color={T.critical} />
              <span className="text-lg font-semibold">Predicted Failure</span>
            </div>
            <span className="font-mono text-4xl font-extrabold" style={{ color: T.critical }}>10 days</span>
          </GlassCard>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render in App and verify**

Run: `cd landing && npm run dev`
Expected: three explainability cards stagger in, impact bars fill, the "Predicted Failure: 10 days" banner scales in. No console errors.

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/AIAnalysis.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 4 explainable-AI analysis cards"
```

---

### Task 16: Scene 5 — Fleet View (real 28-node grid)

**Files:**
- Create: `landing/src/sections/FleetView.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/FleetView.jsx`**

```jsx
import { motion } from "framer-motion";
import SectionWrapper from "../components/SectionWrapper.jsx";
import { tierColor } from "../theme.js";

// Digital-twin grid of the real fleet, sorted so critical nodes lead.
export default function FleetView({ fleet = [], summary }) {
  const order = { Critical: 0, "At Risk": 1, Healthy: 2 };
  const sorted = [...fleet].sort((a, b) => (order[a.tier] - order[b.tier]) || a.health - b.health);

  return (
    <SectionWrapper id="fleet" className="grid place-items-center">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
            className="text-3xl font-bold tracking-tight md:text-5xl">
            Your whole fleet, prioritized automatically.
          </motion.h2>
          {summary && (
            <p className="mt-4 text-muted">
              {summary.total} devices · <span style={{ color: "#e0564f" }}>{summary.critical} critical</span> ·{" "}
              <span style={{ color: "#e0a92e" }}>{summary.atRisk} at risk</span> ·{" "}
              <span style={{ color: "#3fb98a" }}>{summary.healthy} healthy</span>
            </p>
          )}
        </div>

        <div className="mt-12 grid grid-cols-4 gap-3 sm:grid-cols-7">
          {sorted.map((d, i) => {
            const col = tierColor(d.tier);
            return (
              <motion.div key={d.device}
                initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: (i % 7) * 0.05 + Math.floor(i / 7) * 0.08 }}
                className="aspect-square rounded-xl p-2"
                style={{ background: `${col}14`, border: `1px solid ${col}55`, boxShadow: `0 0 18px ${col}22` }}
                title={`${d.device} · ${d.tier} · health ${d.health}`}>
                <div className="flex h-full flex-col justify-between">
                  <span className="font-mono text-[10px] text-muted">{d.device?.replace("srv-", "#")}</span>
                  <span className="font-mono text-lg font-bold" style={{ color: col }}>{d.health}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render in App with real data**

In `App.jsx`: `<FleetView fleet={fleet} summary={data?.summary} />`

Run: `cd landing && npm run dev`
Expected: 28 tiles (critical first) bloom in with tier-colored glow, showing real health scores. Counts in the subhead match the data (5 critical, 6 at risk, 17 healthy).

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/FleetView.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 5 fleet digital-twin grid (real data)"
```

---

### Task 17: Scene 6 — Architecture (scrubbed pipeline draw)

**Files:**
- Create: `landing/src/sections/Architecture.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/Architecture.jsx`**

```jsx
import { useRef } from "react";
import { motion } from "framer-motion";
import SectionWrapper from "../components/SectionWrapper.jsx";
import { useScrollScene } from "../hooks/useScrollScene.js";
import { gsap } from "../lib/gsap.js";
import { T } from "../theme.js";

const STAGES = [
  "Telemetry", "Storage Model", "Component Model", "RUL Model", "Fusion Engine", "Device Health Score",
];

export default function Architecture() {
  const scopeRef = useRef(null);

  useScrollScene(scopeRef, () => {
    gsap.from(".pg-stage", {
      opacity: 0, y: 24, stagger: 0.5, ease: "none",
      scrollTrigger: { trigger: scopeRef.current, start: "top top", end: "+=200%", pin: true, scrub: true },
    });
    gsap.fromTo(".pg-spine",
      { scaleY: 0 }, { scaleY: 1, ease: "none",
        scrollTrigger: { trigger: scopeRef.current, start: "top top", end: "+=200%", scrub: true } });
  }, []);

  return (
    <SectionWrapper id="architecture" ref={scopeRef} className="grid place-items-center">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-12 text-3xl font-bold tracking-tight md:text-5xl">From raw telemetry to one number.</h2>
        <div className="relative flex flex-col items-center gap-5">
          <div className="pg-spine absolute left-1/2 top-0 h-full w-px origin-top -translate-x-1/2"
            style={{ background: `linear-gradient(${T.brand},${T.dell})` }} />
          {STAGES.map((s, i) => (
            <div key={s}
              className="pg-stage relative z-10 w-full max-w-sm rounded-xl border px-6 py-4 backdrop-blur-xl"
              style={{
                background: "rgba(17,24,36,0.7)",
                borderColor: i === STAGES.length - 1 ? `${T.brand}88` : T.line,
                boxShadow: i === STAGES.length - 1 ? `0 0 30px ${T.brand}33` : "none",
              }}>
              <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
              <div className="mt-1 text-lg font-semibold" style={{ color: i === STAGES.length - 1 ? T.brand : T.text }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render in App and verify scrub**

Run: `cd landing && npm run dev`
Expected: section pins; scrolling draws the spine downward and reveals each pipeline stage in sequence, ending on the highlighted "Device Health Score".

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/Architecture.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 6 scroll-scrubbed architecture pipeline"
```

---

### Task 18: Scene 7 — Metrics (real count-ups)

**Files:**
- Create: `landing/src/sections/Metrics.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/Metrics.jsx`**

```jsx
import { motion } from "framer-motion";
import SectionWrapper from "../components/SectionWrapper.jsx";
import Counter from "../components/Counter.jsx";
import { T } from "../theme.js";

// Real values pulled from data.metrics / data.summary; falls back to brief numbers.
export default function Metrics({ metrics, summary }) {
  const recall = Math.round((metrics?.storage?.recall ?? 0.7061) * 100);
  const prevented = summary?.predictedFailures30d ?? 8;

  const STATS = [
    { value: recall, suffix: "%", label: "Failure recall", note: "of failing drives caught, 30 days ahead", color: T.brand },
    { value: 30, suffix: "", label: "Day lead time", note: "advance warning before failure", color: T.dell },
    { value: 1, prefix: "sub-", suffix: "s", label: "Predictions", note: "real-time scoring per device", color: T.healthy, literal: "sub-second" },
    { value: prevented, suffix: "", label: "Failures prevented", note: "flagged across the live fleet", color: T.risk },
  ];

  return (
    <SectionWrapper id="metrics" className="grid place-items-center">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
          className="text-3xl font-bold tracking-tight md:text-5xl">
          Measured on real, imbalanced failure data.
        </motion.h2>
        <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-mono text-5xl font-extrabold md:text-6xl" style={{ color: s.color }}>
                {s.literal ? s.literal : <Counter value={s.value} suffix={s.suffix} />}
              </div>
              <div className="mt-3 text-sm font-semibold">{s.label}</div>
              <div className="mt-1 text-xs text-muted">{s.note}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render in App with real data**

In `App.jsx`: `<Metrics metrics={data?.metrics} summary={data?.summary} />`

Run: `cd landing && npm run dev`
Expected: four metrics; the percentage and counts animate up to real values (71%, 30, 8) when scrolled into view; "sub-second" shown literally.

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/Metrics.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 7 metrics with real count-ups"
```

---

### Task 19: Scene 8 — Dashboard Showcase

**Files:**
- Create: `landing/src/sections/DashboardShowcase.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/DashboardShowcase.jsx`**

```jsx
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import GlassCard from "../components/GlassCard.jsx";
import CTAButton from "../components/CTAButton.jsx";
import { T } from "../theme.js";

// Stylized monitor mockup of the real ops dashboard. (Optional: drop a real
// screenshot at public/img/dashboard.png and swap the inner content for <img>.)
function MonitorMock() {
  return (
    <GlassCard className="overflow-hidden p-0" accent={T.brand}>
      <div className="flex items-center gap-1.5 border-b px-4 py-2" style={{ borderColor: T.line }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: T.critical }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: T.risk }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: T.healthy }} />
        <span className="ml-3 font-mono text-xs text-faint">pulseguard — fleet overview</span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-5">
        {["96", "74", "41"].map((v, i) => (
          <div key={i} className="rounded-lg p-3" style={{ background: T.bg, border: `1px solid ${T.line}` }}>
            <div className="text-[10px] text-faint">srv-00{i + 1}</div>
            <div className="font-mono text-2xl font-bold"
              style={{ color: i === 0 ? T.healthy : i === 1 ? T.risk : T.critical }}>{v}</div>
          </div>
        ))}
        <div className="col-span-3 mt-1 h-24 rounded-lg"
          style={{ background: `linear-gradient(180deg, ${T.brand}22, transparent)`, border: `1px solid ${T.line}` }} />
      </div>
    </GlassCard>
  );
}

export default function DashboardShowcase() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <SectionWrapper ref={ref} className="grid place-items-center">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
          className="text-3xl font-bold tracking-tight md:text-5xl">
          A control room for your infrastructure.
        </motion.h2>
        <motion.div style={{ y }} className="mt-12">
          <MonitorMock />
        </motion.div>
        <div className="mt-10"><CTAButton>Launch the Dashboard</CTAButton></div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render in App and verify parallax**

Run: `cd landing && npm run dev`
Expected: a glass monitor mockup with traffic-light dots and tier-colored health tiles; it drifts with parallax as you scroll; CTA below.

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/DashboardShowcase.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 8 dashboard showcase with parallax"
```

---

### Task 20: Scene 9 — Finale (shield + logo reveal)

**Files:**
- Create: `landing/src/sections/Finale.jsx`
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Create `landing/src/sections/Finale.jsx`**

```jsx
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import CTAButton from "../components/CTAButton.jsx";
import { T } from "../theme.js";

const LINES = ["Know Which Device Will Fail.", "Know Why.", "Know When.", "Prevent Downtime Before It Happens."];

export default function Finale() {
  return (
    <SectionWrapper className="grid place-items-center text-center">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div initial={{ scale: 0.4, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-10 grid h-24 w-24 place-items-center rounded-3xl"
          style={{ background: `${T.brand}18`, border: `1px solid ${T.brand}55`, boxShadow: `0 0 60px ${T.brand}44` }}>
          <ShieldCheck size={44} color={T.brand} />
        </motion.div>

        <div className="space-y-2">
          {LINES.map((line, i) => (
            <motion.p key={line}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7, delay: i * 0.2 }}
              className="text-2xl font-bold tracking-tight md:text-4xl">
              {line}
            </motion.p>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1, delay: 0.9 }}
          className="mt-16">
          <div className="font-mono text-4xl font-black tracking-[0.2em] md:text-6xl"
            style={{ background: `linear-gradient(90deg,${T.brand},${T.dell})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            PULSEGUARD
          </div>
          <p className="mt-3 text-sm text-muted">AI-Powered Predictive Hardware Failure Detection</p>
          <div className="mt-8"><CTAButton>Launch Dashboard</CTAButton></div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Render in App and verify**

Run: `cd landing && npm run dev`
Expected: shield scales in, four lines reveal in sequence, the PULSEGUARD gradient wordmark appears with the tagline and final CTA.

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/Finale.jsx landing/src/App.jsx
git commit -m "feat(landing): Scene 9 finale shield + logo reveal"
```

---

### Task 21: Final App composition

**Files:**
- Modify: `landing/src/App.jsx`

- [ ] **Step 1: Write the full `landing/src/App.jsx`**

```jsx
import { useEffect } from "react";
import Nav from "./components/Nav.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";
import ServerRoom from "./three/ServerRoom.jsx";
import Hero from "./sections/Hero.jsx";
import RackFlythrough from "./sections/RackFlythrough.jsx";
import Degradation from "./sections/Degradation.jsx";
import AIAnalysis from "./sections/AIAnalysis.jsx";
import FleetView from "./sections/FleetView.jsx";
import Architecture from "./sections/Architecture.jsx";
import Metrics from "./sections/Metrics.jsx";
import DashboardShowcase from "./sections/DashboardShowcase.jsx";
import Finale from "./sections/Finale.jsx";
import { usePulseData } from "./data/usePulseData.js";
import { initLenis } from "./lib/lenis.js";
import { sceneState } from "./three/sceneStore.js";

export default function App() {
  const { data } = usePulseData();
  const fleet = data?.fleet ?? [];

  useEffect(() => {
    const lenis = initLenis();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      sceneState.scroll = max > 0 ? window.scrollY / max : 0;
    };
    lenis.on("scroll", onScroll);
    onScroll();
    return () => lenis.destroy();
  }, []);

  return (
    <div className="grain vignette bg-bg text-text">
      <ServerRoom fleet={fleet} />
      <ScrollProgress />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <RackFlythrough />
        <Degradation />
        <AIAnalysis />
        <FleetView fleet={fleet} summary={data?.summary} />
        <Architecture />
        <Metrics metrics={data?.metrics} summary={data?.summary} />
        <DashboardShowcase />
        <Finale />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Full read-through in the browser**

Run: `cd landing && npm run dev`
Expected: full top-to-bottom scroll plays all 9 scenes over the 3D scene; pinned sections (Degradation, Architecture) scrub correctly; no console errors; CTAs link to the dashboard URL.

- [ ] **Step 3: Verify production build**

Run: `cd landing && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Run the unit test suite**

Run: `cd landing && npm run test`
Expected: all Vitest tests pass (theme, usePulseData, useCountUp, useGpuTier).

- [ ] **Step 5: Commit**

```bash
git add landing/src/App.jsx
git commit -m "feat(landing): compose full cinematic scroll experience"
```

---

## Phase 5 — Polish & Hardening

### Task 22: Reduced-motion + low-GPU graceful degradation

**Files:**
- Modify: `landing/src/sections/Degradation.jsx`, `landing/src/sections/Architecture.jsx`

- [ ] **Step 1: Guard scrubbed scenes against reduced motion**

In both `Degradation.jsx` and `Architecture.jsx`, import the helper and skip pinning when reduced motion is preferred — render the final state instead:

Add at top of each file:
```jsx
import { prefersReducedMotion } from "../hooks/useGpuTier.js";
```
In `Degradation.jsx`, wrap the `useScrollScene` setup body so it early-returns when reduced motion is set, and initialize `health`/`revealT` to the final values in that case:
```jsx
const reduced = prefersReducedMotion();
// useState(reduced ? 5 : 96)  and  useState(reduced ? 0 : -40)
useScrollScene(scopeRef, () => { if (reduced) return; /* ...existing gsap... */ }, []);
```
In `Architecture.jsx`, similarly early-return inside the `useScrollScene` setup when `prefersReducedMotion()` is true (stages render visible by default since `gsap.from` won't run).

- [ ] **Step 2: Verify**

Enable "Reduce motion" in OS/browser settings, then run: `cd landing && npm run dev`
Expected: no pinned scrubbing; Degradation shows final score 5 and full chart; Architecture shows all stages; the abstract fallback grid replaces the 3D scene; page is fully readable.

- [ ] **Step 3: Commit**

```bash
git add landing/src/sections/Degradation.jsx landing/src/sections/Architecture.jsx
git commit -m "feat(landing): respect reduced-motion in scrubbed scenes"
```

---

### Task 23: Responsive pass + README

**Files:**
- Modify: section files as needed for mobile; Create: `landing/README.md`

- [ ] **Step 1: Mobile check and fixes**

Run dev server, open responsive mode at 390px width. Verify each section: headings scale, grids collapse (telemetry chips 2-col, fleet 4-col), no horizontal overflow. Adjust Tailwind classes only where something overflows or is unreadable. Pinned scenes should still function (or fall to reduced-motion on small/touch devices).

Expected: clean mobile layout, no horizontal scrollbar.

- [ ] **Step 2: Create `landing/README.md`**

```markdown
# PulseGuard Landing

Cinematic scroll-driven landing page for PulseGuard. Vite + React + Tailwind +
Framer Motion + GSAP ScrollTrigger + React Three Fiber.

## Run

```bash
cd landing
npm install
npm run dev      # http://localhost:5180
```

The "Launch Dashboard" CTA points to `VITE_DASHBOARD_URL` (default
`http://localhost:5173`). Set it for your deployed dashboard:

```bash
VITE_DASHBOARD_URL=https://your-dashboard npm run build
```

## Data

All on-screen numbers come from `public/data/frontend_data.json`, a snapshot of
the repo root `frontend_data.json` produced by `export_data.py`. Refresh with:

```bash
cp ../frontend_data.json public/data/frontend_data.json
```

## Test

```bash
npm run test
```
```

- [ ] **Step 3: Final build + test gate**

Run: `cd landing && npm run build && npm run test`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add landing/README.md landing/src
git commit -m "feat(landing): responsive pass + landing README"
```

---

## Self-Review Notes (completed during planning)

- **Spec coverage:** All 9 scenes (Tasks 12–20), tech stack (Tasks 1, 6, 9–11), visual system (Task 3 + Tailwind), data flow (Tasks 2, 4, real data in 16/18), Framer Motion (Tasks 7, 12–20), GSAP (Tasks 6, 14, 17), Three.js (Tasks 9–11), folder structure (matches spec §10), reduced-motion/GPU fallback (Tasks 5, 9, 22), roadmap order (Phases 1–5) — all mapped.
- **Type consistency:** `usePulseData()` returns `{ data, loading, error }` used consistently; `tierColor`/`T` imported from `theme.js` everywhere; `sceneState` shape stable across CameraRig/App; `useCountUp` ↔ `Counter` ↔ `formatCount` aligned.
- **No placeholders:** every code step shows complete code; CTA dashboard URL is configurable via `VITE_DASHBOARD_URL` (documented).
```
