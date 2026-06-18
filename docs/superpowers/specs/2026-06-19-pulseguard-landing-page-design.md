# PulseGuard Landing Page — Design Spec

**Date:** 2026-06-19
**Status:** Approved (design), pending implementation plan
**Owner:** nishantr14

## 1. Goal

A cinematic, scroll-driven landing page for **PulseGuard** — an AI-powered predictive
hardware failure detection platform — built to win **Best UI/UX** and **Best Demo** at
the Dell AI Hackathon. The page tells a story as the user scrolls: from a dark futuristic
data center, through live telemetry, a server degrading in real time, explainable AI
analysis, a fleet digital twin, the model architecture, real performance metrics, the
dashboard, and a final shield-forms-around-the-fleet logo reveal.

It must feel like an Apple / Tesla / Stripe / Linear / Vercel product launch — bespoke,
premium, enterprise-trustworthy. **Not** a generic SaaS template, no stock data-center
clips, no neon-cyberpunk robot-brain clichés.

## 2. Scope & Non-Goals

**In scope:** A standalone front-end marketing site (`landing/`) with 9 scroll scenes, a
live WebGL server-room scene, scroll-tied animations, and real data sourced from the
trained models. A persistent nav + scroll-progress rail and a CTA that launches the
existing ops dashboard.

**Out of scope:** Backend changes, model retraining, the dashboard itself
(`frontend/App.jsx` stays untouched), authentication, deployment infra, CMS.

## 3. Key Decisions (locked during brainstorming)

1. **Project structure — Option A:** standalone Vite + React app in a new `landing/`
   folder. The existing `frontend/App.jsx` dashboard is untouched. The landing CTA
   ("Launch Dashboard") links out to the dashboard (dev server / deployed URL).
2. **Hero background — Option A:** a real React-Three-Fiber server room rendered live in
   the browser (no stock/AI video), reused across Scene 1 (hero dolly), Scene 2 (rack
   flythrough), and Scene 5 (fleet pull-back). An abstract CSS/canvas grid is the
   graceful fallback for low-GPU devices and `prefers-reduced-motion`.
3. **Data authenticity:** every on-screen figure is sourced from the repo's real exported
   data (`frontend_data.json`, `models/metrics.json`). Headline metrics are the genuine
   trained values: storage recall 71% (0.7061), components recall 97% (0.9748), RUL
   ~16 cycles RMSE (15.93), 8 predicted failures in 30 days. Counters animate up to these
   real numbers; the fleet view renders the real 28-node fleet.

## 4. Tech Stack

- **Vite + React 18** — standalone app in `landing/`
- **Tailwind CSS** — custom token layer matching the dashboard `T` palette
- **Framer Motion** — in-view reveals, micro-interactions, counters, nav transitions
- **GSAP + ScrollTrigger** — pinned scroll scenes, scrubbed timelines, SVG path draws
- **React Three Fiber + @react-three/drei + @react-three/postprocessing** — the 3D server room + bloom
- **Lenis** — smooth scroll that GSAP and R3F both subscribe to
- **Recharts** — reused from the dashboard for the degradation timeline chart

## 5. Visual Design System

- **Palette** (reuse dashboard `T` tokens for product continuity):
  - base `#0a0e14`, panel `#111824`, panel2 `#161f2c`, line `#222d3d`
  - text `#e8eef6`, muted `#8a98ab`, faint `#586676`
  - brand violet `#8b8cf0`
  - status: healthy `#3fb98a`, risk `#e0a92e`, critical `#e0564f`
  - **Dell accent** `#0085c3` for trust cues / secondary highlights
- **Typography:** Inter or Geist for display (large, tight tracking); JetBrains Mono / SF
  Mono for all numbers and telemetry readouts. Cinematic, oversized headlines.
- **Texture:** glassmorphism cards (backdrop-blur, hairline border, inner glow),
  volumetric fog, selective bloom on status LEDs, subtle film grain, vignette.
- **Motion language:** slow, weighty, confident easing — no bouncy SaaS springs. Numbers
  count up. Light reacts to data.

## 6. Page Structure — Scene by Scene

| # | Section | UX & content | Primary interaction |
|---|---------|--------------|---------------------|
| 1 | **Hero** | 3D server room, slow camera dolly. Headline "Predict Hardware Failures Before They Happen." Subhead "AI-powered predictive maintenance for enterprise infrastructure." | Pinned; scroll drives camera + headline fade |
| 2 | **Rack Flythrough** | Camera flies between racks; floating glass telemetry chips stream real values: temperature, power, storage health, fan speed, SMART data | Scrubbed camera path; chips reveal on scroll |
| 3 | **Degradation** | One rack desaturates → reddens. Health counter scrubs **96 → 74 → 41 → 5**. Recharts timeline draws the failure approaching | Scroll scrubs health number + chart draw |
| 4 | **AI Analysis (Explainability)** | Glass SHAP-style cards reveal: "Offline Uncorrectable Sectors Increasing", "Thermal Margin Falling", "Power Instability Detected", "Predicted Failure: 10 Days" | Staggered card reveal, impact bars animate |
| 5 | **Fleet View** | 28-node digital twin from real `frontend_data.json`. Healthy nodes glow blue, at-risk orange, critical red. Animated connections. Auto-prioritized triage | Pull-back camera; nodes pulse by tier |
| 6 | **Architecture** | Scroll-scrubbed pipeline draws itself: Telemetry → Storage Model → Component Model → RUL Model → Fusion Engine → Device Health Score | SVG path + node reveals tied to scroll |
| 7 | **Metrics** | Counters animate to real values: **71%** failure recall, **30-day** lead time, **sub-second** predictions, **8** failures prevented | Count-up on in-view |
| 8 | **Dashboard Showcase** | Floating monitor mockups of the real dashboard; glass + parallax hover | Hover parallax, scroll parallax |
| 9 | **Finale** | Everything zooms out; a digital shield forms around the fleet. "Know Which Device Will Fail. Know Why. Know When. Prevent Downtime Before It Happens." → **PULSEGUARD** logo reveal + CTA | Zoom-out, shield draw, logo reveal |

A thin scroll-progress rail and a minimal top nav (logo, scene jumps, "Launch Dashboard"
CTA) persist throughout.

## 7. Animation / Scroll Strategy

- **GSAP ScrollTrigger** owns the spine: each scene is a pinned panel; `scrub` ties camera
  position, health numbers, and SVG path draws directly to scroll offset, so the story is
  deterministic — ideal for a live demo (scrub back and forth, no waiting on autoplay).
- **Framer Motion** owns the texture: `whileInView` staggered reveals, hover states, the
  count-up animations, nav transitions.
- **R3F camera rig** reads a shared scroll value (Lenis → GSAP → React context) so the 3D
  scene and DOM move in lockstep.
- **Reduced motion / low GPU:** respects `prefers-reduced-motion`; swaps the 3D scene for
  the abstract grid fallback, disables scrub, shows final states.

## 8. Three.js Scope

One reused scene: instanced server racks, emissive status LEDs driven by fleet data,
volumetric fog, selective bloom. Hero = wide dolly; Scene 2 = fly-between; Scene 5 = pull
back to fleet constellation. Performance-guarded: instancing, capped device pixel ratio,
lazy-mounted canvas, GPU-tier detection with fallback to the CSS/canvas abstract grid.

## 9. Component Hierarchy

```
App
├─ LenisProvider + GSAP context
├─ Nav  /  ScrollProgress
├─ <Canvas> ServerRoom
│    ├─ CameraRig (scroll-driven)
│    ├─ Racks (instanced)
│    ├─ StatusLights (data-driven emissive)
│    ├─ FleetField (Scene 5 constellation)
│    └─ Effects (bloom, fog)
└─ Sections
     ├─ Hero, RackFlythrough, Degradation, AIAnalysis,
     ├─ FleetView, Architecture, Metrics, DashboardShowcase, Finale
     └─ shared: GlassCard, Counter, SectionWrapper, CTAButton
```

## 10. Folder Structure

```
landing/
  index.html
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
  public/
    data/frontend_data.json        # snapshot copied from repo root
  src/
    main.jsx
    App.jsx
    index.css
    theme.js                       # shared design tokens (mirror dashboard T)
    three/
      ServerRoom.jsx
      Rack.jsx
      StatusLights.jsx
      CameraRig.jsx
      FleetField.jsx
      effects.jsx
    sections/
      Hero.jsx
      RackFlythrough.jsx
      Degradation.jsx
      AIAnalysis.jsx
      FleetView.jsx
      Architecture.jsx
      Metrics.jsx
      DashboardShowcase.jsx
      Finale.jsx
    components/
      Nav.jsx
      ScrollProgress.jsx
      GlassCard.jsx
      Counter.jsx
      SectionWrapper.jsx
      CTAButton.jsx
    hooks/
      useScrollScene.js
      useCountUp.js
      useGpuTier.js
      useReducedMotion.js
    lib/
      gsap.js                      # registers ScrollTrigger
      lenis.js
    data/
      usePulseData.js              # loads public/data/frontend_data.json
```

## 11. Data Flow

`export_data.py` already produces `frontend_data.json` (summary, metrics, fleet, details,
timeline). It is copied into `landing/public/data/frontend_data.json`. The `usePulseData`
hook fetches it and feeds: fleet nodes (Scene 5), the degradation timeline (Scene 3), the
explainability "why" signals (Scene 4), and the metric counters (Scene 7). Every on-screen
number is real and traceable to the trained models.

## 12. Framer Motion Implementation Strategy

- `whileInView` + `viewport={{ once: true, amount }}` for section reveals.
- Staggered children via `variants` + `staggerChildren` for the AI analysis cards and
  telemetry chips.
- A `Counter` component using `useMotionValue` + `animate` for count-ups, fed real values.
- Hover/parallax on dashboard mockups via `whileHover` and `useTransform` on pointer.
- Page-level `AnimatePresence` only where needed (nav, modals); the scroll spine is GSAP.

## 13. GSAP Implementation Strategy

- Register `ScrollTrigger` once in `lib/gsap.js`; connect to Lenis via `scrollerProxy` /
  `lenis.on('scroll', ScrollTrigger.update)`.
- One `ScrollTrigger` timeline per pinned scene with `scrub: true` and `pin: true`.
- Scene 3 degradation: a timeline scrubbing the health value (96→74→41→5) and the chart
  reveal. Scene 6 architecture: `DrawSVGPlugin`-style stroke reveal (or `strokeDashoffset`
  tween) for the pipeline. Camera position is tweened on a proxy object read by the R3F
  `CameraRig` each frame.
- Centralize ScrollTrigger creation/cleanup in `useScrollScene` to avoid leaks on unmount.

## 14. Three.js Opportunities

- Instanced racks (`InstancedMesh`) for many servers cheaply.
- Emissive `StatusLights` whose color/intensity map to fleet tier (blue/orange/red).
- Volumetric fog + `UnrealBloomPass` (via postprocessing) for cinematic depth.
- Scene 5 fleet constellation with animated line connections (`LineSegments`).
- Scene 9 shield: an expanding transparent shell / shader ring around the fleet.

## 15. Execution Roadmap

1. Scaffold Vite app + Tailwind + tokens + Lenis/GSAP wiring; copy data snapshot.
2. Build the 3D server room scene + scroll-driven camera rig (the centerpiece).
3. Section shells with scroll pinning + nav + progress rail.
4. Scenes 1–3 (hero, flythrough, degradation) — the opening punch.
5. Scenes 4–7 (AI cards, fleet, architecture, metrics).
6. Scenes 8–9 (dashboard showcase, finale shield + logo reveal + CTA).
7. Polish pass: bloom, grain, timing, reduced-motion + GPU fallback, responsive/mobile.
8. Wire CTA → dashboard, final QA on a live demo run.

## 16. Success Criteria

- Smooth 60fps scroll on a typical laptop; graceful fallback on low GPU.
- Every metric on screen traceable to real exported data.
- The full story reads top-to-bottom with no dead sections; scrub works backward for demos.
- Looks bespoke and enterprise-grade — passes the "did they really build this in a
  hackathon?" test.
- Respects `prefers-reduced-motion`.
