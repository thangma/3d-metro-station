# Metro Station 3D (Ga Metro Trung Tâm)

An interactive 3D underground metro station walkthrough and simulation built with **Three.js**, **TypeScript**, and **Vite**.

Experience entering from the Saigon street pavilion, descending through the concourse, scanning through the fare gates, taking escalators down to the platform, and boarding a metro train.

---

## Features

- **Realistic Underground Station Environment:**
  - **Street Pavilion:** Sunlit street entrance pavilion with stairs leading underground.
  - **Concourse Level:** Wide circulation halls, ticket vending machines, and smart fare gates.
  - **Station Navigation:** Smooth staircase walking ramps and motorized escalators connecting concourse and platform levels.
  - **Platform Level:** Platform screen doors (PSDs), platform directional banners ("Ga Trung Tâm"), tactile paving, and waiting passengers.
  - **Animated Metro Train:** Automatic train arrival, deceleration, door opening sync with PSDs, passenger boarding, and chime audio.

- **Dual Navigation Modes:**
  - **Manual Exploration:** First-person free walk with mouse look, sprint, and jump.
  - **Auto Tour Mode (Tự động):** Guided autonomous walkthrough escorting the player smoothly through all station zones and boarding the arriving train.

- **Audio & Diagnostics:**
  - Dynamic zone-based ambient sounds (street traffic, concourse echo, platform hum, train arriving chimes, door alerts).
  - Real-time diagnostic HUD for performance profiling (draw calls, triangles, geometry memory, FPS).

---

## Controls

| Key / Input | Action |
| --- | --- |
| `W`, `A`, `S`, `D` / Arrows | Move forward, left, backward, right |
| `Shift` | Sprint |
| `Space` | Jump |
| Mouse | Look around (pointer lock on click) |
| `E` | Interact (scan ticket at fare gate) |
| `Escape` | Pause / Release pointer lock |
| `M` / Button | Toggle Auto Tour Mode |

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm**

### Installation

```bash
npm install
```

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## Testing

The project is backed by a comprehensive suite of unit and end-to-end integration tests:

### Unit Tests (Vitest)

Runs unit tests covering world geometry, collision math, physics movement, audio triggers, and train state machines:

```bash
npm test
```

### End-to-End Tests (Playwright)

Runs headless browser tests validating rendering, user inputs, zone triggers, audio context, and complete game loop runs:

```bash
npx playwright test
```

---

## Project Structure

```
├── docs/                 # Design documentation & specs
├── src/
│   ├── audio/            # Web Audio API synthesizers and ambient controllers
│   ├── core/             # Game loop, input handling, player controller, camera
│   ├── systems/          # Train state machine, NPC wandering/boarding systems
│   ├── ui/               # Title overlay, HUD, captions, prompt dialogs
│   ├── utils/            # Math helpers, color utilities, sound generators
│   └── world/            # 3D meshes (street, concourse, platform, train, stairs/escalators)
├── tests/                # Playwright end-to-end integration tests
└── vitest.config.ts      # Unit testing configuration
```
