# 3D Metro Station Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-person, real-scale walkthrough of a Hanoi metro station from street level to a departing five-car train, in Three.js.

**Architecture:** One continuous Three.js scene assembled from parametric kits (column, coffer, PSD panel, gate, escalator, train car) at true architectural scale. Static geometry merges per material; repeats use instancing. A deterministic fixed-step loop feeds a capsule controller, a single train state machine, and seeded NPC pathing. All verification runs through the scaffold's test-hook contract and Playwright.

**Tech Stack:** TypeScript 7 (strict), Vite 8.3, Three.js 0.187, Vitest 5 for pure logic, Playwright 1.64 + pngjs for browser QA, Web Audio for sound.

**Spec:** `docs/superpowers/specs/2026-11-01-3d-metro-station-design.md`

## Global Constraints

- 1 unit = 1 metre. `X ∈ [−95, +95]` along the station, `Z ∈ [−15, +15]` across it, `Y` up, street at `0.000`.
- Levels: pavilion `+0.600`, concourse `−10.000`, platform `−16.750`, slab `−19.500`.
- Station box 176 m long × 30 m wide; platform `X ∈ [−55, +55]`, half-width `7.43`; void 63.5 × 12.6 m.
- Cross-section Z bands: service `3.9`, track `3.67`, island platform `14.86`, track `3.67`, service `3.9` (sums to 30.0).
- FOV 90, eye height 1.65 m, capsule radius 0.30 m, walk 3.2 m/s, sprint 5.6 m/s, slope limit 45°.
- Fixed timestep 1/120 s, max 5 substeps per frame; render interpolation allowed.
- Budgets: ≤ 300 draw calls, ≤ 1.5 M triangles, ≤ 64 MB textures, 60 fps at 1920×1080.
- No external assets, API keys, or audio files. Every texture and sound is generated procedurally and deterministically.
- All randomness flows through one seeded RNG (`src/test/rng.ts`).
- Test hooks are exactly: `seed(number)`, `setState(string)`, `setPausedForScreenshot(boolean)`, `setReducedMotion(boolean)`, `hideDebugUi(boolean)` on `window.__THREE_GAME_TEST_HOOKS__`.
- Canonical hook states: `street`, `pavilion`, `concourse`, `platform`, `boarding`, `complete`.
- Signage is Vietnamese with English subtitles. `npm run build` must pass with `tsc` strict.
- Commit after every task.

## Review Focus

1. **Platform edge and void railing.** A player pressing forward at the edge, or sprinting into the balustrade, must be stopped — never fall to the trackbed or through the void.
2. **Escalator boundaries.** Standing at the edge of an escalator, walking against its direction, or stepping off mid-run must not trap, launch, or permanently push the player.
3. **Closing doors with the player in the threshold.** `boarding` must not end while any part of the player capsule is between the PSD and car door; the state machine waits, and no crushing or teleporting occurs.
4. **Pointer-lock loss and resize.** Pressing Esc, clicking away, or resizing mid-route must pause input without accumulating movement, and rendering must recover at the new size.
5. **Long text at 90° FOV and narrow widths.** Prompts, captions, and the end card must not clip, overlap the interaction point, or overflow at 390 px wide.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html` | Toolchain, dev server on 5188, static-hosting base `./` |
| `scripts/inspect-threejs-canvas.mjs` | Copied from the QA skill; canvas pixel and render-budget inspector |
| `src/main.ts` | Boot, hooks installation, DOM shell |
| `src/styles.css` | Title, prompt, captions, end card, pause banner |
| `src/core/Game.ts` | Owns scene, systems, zones, frame orchestration |
| `src/core/Loop.ts` | Fixed-step accumulator and interpolation |
| `src/core/Renderer.ts` | Renderer, tone mapping, post chain, quality tier |
| `src/core/InputController.ts` | Pointer lock, keyboard, mouse, arrow-key look fallback |
| `src/core/PlayerController.ts` | Movement, gravity, escalator carry, camera pose |
| `src/core/CollisionWorld.ts` | AABBs, ramps, capsule sweep, ground queries |
| `src/core/CameraRig.ts` | Yaw/pitch application, FOV 90, shake-free by default |
| `src/world/layout.ts` | Single source of dimensional constants |
| `src/world/site.ts` | Sidewalk, road, street furniture, pavilions |
| `src/world/pavilion.ts` | Glass enclosure, landing, stair, escalator to concourse |
| `src/world/concourse.ts` | Hall, gates, balustrades, sealed rooms, ceiling coffers |
| `src/world/platform.ts` | Platform, columns, PSDs, trackbed, portals, signage |
| `src/world/train.ts` | Five-car assembly, doors, interior, headlights |
| `src/world/nav.ts` | Waypoints, queue slots, and seat targets for passengers |
| `src/world/kit/*` | Parametric builders and shared material factory |
| `src/systems/TrainSystem.ts` | Arrival/door/departure state machine |
| `src/systems/NpcSystem.ts` | Passengers, paths, queues, boarding |
| `src/systems/InteractionSystem.ts` | Ray-target registry and prompts |
| `src/systems/AudioSystem.ts` | Procedural Web Audio beds and one-shots |
| `src/ui/Hud.ts` | Title, prompt, captions, fade, end card |
| `src/ui/Title.ts` | Start overlay and restart wiring |
| `src/test/rng.ts` | Seeded RNG (`mulberry32`) |
| `src/test/hooks.ts` | Hook installation and canonical states |
| `src/test/diagnostics.ts` | `__THREE_GAME_DIAGNOSTICS__` payload |
| `tests/*.spec.ts` | Browser smoke, traversal, interaction, viewport tests |
| `tests/bot-walk.ts` | Scripted route walk with stall reporting |
| `artifacts/evidence.json` | Declared capture set for the QA inspector |

---

### Task 1: Walking skeleton — toolchain, fixed loop, renderer, hooks

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `src/styles.css`, `src/main.ts`
- Create: `src/core/Game.ts`, `src/core/Loop.ts`, `src/core/Renderer.ts`
- Create: `src/test/rng.ts`, `src/test/hooks.ts`, `src/test/diagnostics.ts`, `src/vite-env.d.ts`
- Create: `scripts/inspect-threejs-canvas.mjs` (copy from `~/.agents/skills/threejs-qa-release/scripts/`)
- Test: `tests/smoke.spec.ts`

**Interfaces:**
- Produces: `createRng(seed: number): () => number`, `class Game { constructor(canvas: HTMLCanvasElement); start(): void; setPaused(p: boolean): void; setState(name: string): { state: string }; getDiagnostics(): ThreeGameDiagnostics }`
- Produces: `Loop` with `constructor(update: (dt: number) => void, render: (alpha: number) => void)`, `start()`, `setPaused(p: boolean)`, fixed `STEP = 1/120`.

- [ ] **Step 1: Scaffold the project.** Add dependencies `three@^0.187.0`, `lil-gui@^0.21.0`; dev dependencies `vite@^8.3.5`, `typescript@^7.0.2`, `@types/three@^0.187.0`, `@types/node@^26.6.6`, `vitest@^5.0.5`, `@playwright/test@^1.64.1`, `pngjs@^7.0.0`, `@types/pngjs@^6.0.5`. Scripts: `dev` (`vite --host 127.0.0.1 --port 5188`), `build` (`tsc && vite build`), `preview`, `test` (`playwright test`), `test:unit` (`vitest run`), `inspect:canvas`.
- [ ] **Step 2: Write the failing smoke test** in `tests/smoke.spec.ts`: loads the page, asserts `window.__THREE_GAME_TEST_HOOKS__` exposes the five functions, asserts `__THREE_GAME_DIAGNOSTICS__.frame > 0`, asserts zero console errors, and asserts the canvas has more than one distinct pixel colour via `page.screenshot` + `pngjs`.
- [ ] **Step 3: Run it and confirm it fails** with a missing-hooks error before any implementation exists.
- [ ] **Step 4: Implement** `Loop`, `Renderer` (WebGL2, ACES tone mapping, sRGB output, pixel ratio capped at 2), `Game` with a placeholder grid floor and sky, `rng.ts` (`mulberry32`), `diagnostics.ts`, and `hooks.ts` wiring all five hooks. `setState` must throw on unknown names.
- [ ] **Step 5: Run the smoke test** and confirm it passes.
- [ ] **Step 6: Commit** `feat: walking skeleton with fixed loop and test hooks`.

---

### Task 2: Layout constants and capsule collision

**Files:**
- Create: `src/world/layout.ts`, `src/core/CollisionWorld.ts`
- Test: `tests/unit/collision.test.ts`

**Interfaces:**
- Produces `layout.ts` constants: `SITE_HALF_LENGTH = 95`, `BOX_HALF_LENGTH = 88`, `BOX_HALF_WIDTH = 15`, `PAVILION_X = -30`, `PAVILION_Y = 0.6`, `CONCOURSE_Y = -10`, `PLATFORM_Y = -16.75`, `SLAB_Y = -19.5`, `PLATFORM_HALF_WIDTH = 7.43`, `PLATFORM_X0 = -55`, `PLATFORM_X1 = 55`, `VOID_X0 = -10`, `VOID_X1 = 53.5`, `VOID_HALF_WIDTH = 6.3`, `TRACK_WIDTH = 3.67`, `ESCALATOR_RUN_CONCOURSE = 26`, `ESCALATOR_RUN_PLATFORM = 13`, `CAR_COUNT = 5`, `CAR_LENGTH = 21.4`, `CAR_GAP = 0.4`, `PSD_BAY_COUNT = 20`, `PSD_BAY_SPACING = 5.5`, `PSD_BAY_WIDTH = 2.0`.
- Produces: `interface BoxSpec { min: Vector3; max: Vector3 }`.
- Produces: `class CollisionWorld { addBox(box: BoxSpec): void; addBox(min: Vector3, max: Vector3): void; addRamp(x0,x1,z0,z1,y0,y1): void; moveCapsule(pos: Vector3, delta: Vector3, radius: number, height: number): { position: Vector3; grounded: boolean }; groundHeightAt(x: number, z: number): number | null }`.

- [ ] **Step 1: Write failing unit tests** for: a box stops horizontal motion and allows sliding along the wall; a 3 m fall lands on a box top with `grounded === true`; a 30° ramp is walkable while a 60° surface is not; a 5.6 m/s step into a 0.2 m-thick wall does not tunnel; `groundHeightAt` returns `null` over a hole and the ramp height mid-slope.
- [ ] **Step 2: Run** `npx vitest run tests/unit/collision.test.ts` and confirm failure.
- [ ] **Step 3: Implement** axis-separated resolution (X, then Z, then Y) against AABBs, with ramp height lookup and a 0.25 m step-up allowance. No physics engine, no allocation inside `moveCapsule` (reuse scratch vectors).
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: collision world and dimensional layout`.

---

### Task 3: Player controller, input, camera

**Files:**
- Create: `src/core/InputController.ts`, `src/core/PlayerController.ts`, `src/core/CameraRig.ts`
- Modify: `src/core/Game.ts`, `src/main.ts`, `src/styles.css`
- Test: `tests/unit/player.test.ts`, `tests/input.spec.ts`

**Interfaces:**
- Produces: `interface PlayerInput { forward: number; right: number; sprint: boolean; interact: boolean }`
- Produces: `class PlayerController { position: Vector3; velocity: Vector3; yaw: number; pitch: number; grounded: boolean; update(dt: number, input: PlayerInput, world: CollisionWorld, carry: Vector3): void; teleport(x,y,z): void }`
- Produces: `class InputController { pressed(): PlayerInput; consumeInteract(): boolean; setPaused(p: boolean): void; dispose(): void }` — WASD, Shift, `E`, mouse look, arrow-key look fallback, pointer-lock reacquire on click.

- [ ] **Step 1: Write failing unit tests** for acceleration reaching 3.2 m/s within 0.4 s, sprint reaching 5.6 m/s, gravity settling on a floor, and escalator `carry` moving the player without changing horizontal input. Escalator tests: carry applies only inside the footprint rectangle; walking against the carry direction nets a slower world speed rather than a launch; stepping off the side leaves no residual velocity.
- [ ] **Step 2: Write failing browser test** `tests/input.spec.ts`: after clicking the canvas, `KeyW` moves the player forward; pressing `Escape` pauses input so position is unchanged over 500 ms; resizing to 1280×720 keeps the canvas sized to the window and the loop running.
- [ ] **Step 3: Run both and confirm failure.**
- [ ] **Step 4: Implement** the controller with 12 m/s² acceleration, 14 m/s² ground drag, gravity −24 m/s², air control 0.35, and camera yaw clamp ±89°. Pointer-lock loss shows a "Click to resume" banner and zeroes the input state.
- [ ] **Step 5: Run the tests** and confirm pass.
- [ ] **Step 6: Commit** `feat: first-person controller with pause-safe input`.

---

### Task 4: Interaction system and prompt UI

**Files:**
- Create: `src/systems/InteractionSystem.ts`, `src/ui/Hud.ts`, `src/ui/hud.css`
- Modify: `src/core/Game.ts`, `src/main.ts`
- Test: `tests/unit/interaction.test.ts`, `tests/prompt.spec.ts`

**Interfaces:**
- Produces: `interface Interactable { position: Vector3; radius: number; promptVi: string; promptEn: string; action(): void; enabled?: () => boolean }`
- Produces: `class InteractionSystem { register(t: Interactable): void; update(camera: Camera, playerPos: Vector3): Interactable | null; interact(): boolean }` — nearest target within 2.5 m of the camera ray, angle < 35°.
- Produces: `class Hud { setPrompt(vi: string | null, en?: string): void; caption(text: string, ms: number): void; fade(to: number, ms: number): Promise<void>; showEndCard(): void; hideEndCard(): void }`

- [ ] **Step 1: Write failing unit tests:** the nearest in-cone target wins over a farther one; a target behind the player is not selected; `enabled: () => false` skips a target; `interact()` returns `false` with no target.
- [ ] **Step 2: Write failing browser test** `tests/prompt.spec.ts`: the prompt element shows Vietnamese and English lines, and at 390 px width neither line overflows its container or overlaps the centre reticle.
- [ ] **Step 3: Run and confirm failure.**
- [ ] **Step 4: Implement** the system and HUD with `pointer-events: none`, safe-area padding, `clamp()` typography, and a 1 px reticle.
- [ ] **Step 5: Run the tests** and confirm pass.
- [ ] **Step 6: Commit** `feat: interaction targets and prompt HUD`.

---

### Task 5: Material and geometry kit

**Files:**
- Create: `src/world/kit/materials.ts`, `src/world/kit/textures.ts`, `src/world/kit/column.ts`, `src/world/kit/psd.ts`, `src/world/kit/gate.ts`, `src/world/kit/escalator.ts`, `src/world/kit/signage.ts`, `src/world/kit/railing.ts`, `src/world/kit/bench.ts`
- Test: `tests/unit/kit.test.ts`

**Interfaces:**
- Produces: `createMaterials(renderer: WebGLRenderer): MaterialLibrary` with named entries `terrazzo`, `concrete`, `paintedSteel`, `brushedAluminium`, `glass`, `psdGlass`, `tactilePaving`, `trainLivery`, `ledStrip`, `rubber`.
- Produces: `canvasTexture(kind: 'terrazzo'|'concrete'|'brushed'|'tactile'|'livery', size: number, rng: () => number): { map: Texture; roughnessMap: Texture; normalMap: Texture }`.
- Produces: `interface Kit { group: Group; colliders: BoxSpec[] }` and builders returning it: `buildColumn(): Kit`, `buildPsdBay(): Kit`, `buildGate(): Kit`, `buildEscalator({ run, rise, width }): Kit`, `buildSign(textVi, textEn): Kit`, `buildRailing(length): Kit`, `buildBench(): Kit`.

- [ ] **Step 1: Write failing tests:** the same seed produces byte-identical texture pixels; `buildEscalator({run: 26, rise: 10, width: 1.2})` returns a group whose bounding box is 26 m long and 10 m tall within 0.05 m; `buildColumn()` height is 6.75 m.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** 512² canvas textures with 2×2 repeats, `MeshStandardMaterial` with roughness/metalness per surface, and builders that merge static meshes and declare collider boxes.
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: procedural materials and architectural kit`.

---

### Task 6: Street level and entrance pavilion

**Files:**
- Create: `src/world/site.ts`, `src/world/pavilion.ts`
- Modify: `src/core/Game.ts`
- Test: `tests/unit/pavilion.test.ts`, `tests/street.spec.ts`

**Interfaces:**
- Produces: `buildSite(scene: Scene, world: CollisionWorld, materials: MaterialLibrary): void` — sidewalk, 30 m road, kerbs, tree pits at 15 m, bollards, vent structures, two pavilions.
- Produces: `buildPavilion(scene, world, materials, x: number, side: 1 | -1): { stairTop: Vector3; stairBottom: Vector3; escalator: { position: Vector3; direction: Vector3; speed: number } }`.

- [ ] **Step 1: Write failing unit test:** the pavilion descent path from `(PAVILION_X, 0.6, 0)` reaches `Y ≈ −10` with no gap in `groundHeightAt` along the route; the stair collider slope is ≤ 45°.
- [ ] **Step 2: Write failing browser test** `tests/street.spec.ts`: at state `street` the scene is non-blank, walking forward 3 s descends the stairs, and the player's `Y` decreases monotonically after entering the stair footprint.
- [ ] **Step 3: Run and confirm failure.**
- [ ] **Step 4: Implement** glazed pavilion with mullions, roof, 0.6 m landing, stair flight beside a 26 m escalator, signage `LỐI XUỐNG GA`, and colliders for every solid.
- [ ] **Step 5: Run the tests** and confirm pass.
- [ ] **Step 6: Commit** `feat: street level and glazed entrance pavilion`.

---

### Task 7: Concourse — hall, gates, void, balustrades

**Files:**
- Create: `src/world/concourse.ts`
- Modify: `src/core/Game.ts`
- Test: `tests/unit/concourse.test.ts`, `tests/concourse.spec.ts`

**Interfaces:**
- Produces: `buildConcourse(scene, world, materials, interaction: InteractionSystem): { gateOpen: () => boolean; setGateOpen(v: boolean): void; escalators: EscalatorSpec[] }` — 176 × 30 m floorplate at `Y = −10`, Sảnh, six gates at `X = VOID_X0`, 1.1 m balustrade around the 63.5 × 12.6 m void, sealed rooms, ceiling coffers with LED lines, escalators to the platform at `X ≈ −5` and `X ≈ 48`. `EscalatorSpec` is `{ position: Vector3; direction: Vector3; speed: number; footprint: Box3 }`, defined in `layout.ts`.

- [ ] **Step 1: Write failing unit tests:** `groundHeightAt` returns `null` inside the void rectangle and `−10` on the hall; the balustrade collider blocks a sprint toward the void edge (position stops ≥ 0.3 m short); the gate target is registered and `interact()` flips `gateOpen`.
- [ ] **Step 2: Write failing browser test:** at `concourse`, the gate prompt appears within range, `E` opens the gate, and the player cannot walk through it while closed.
- [ ] **Step 3: Run and confirm failure.**
- [ ] **Step 4: Implement** the level, floor/ceiling of the void, sealed-room doors with signage, ticket machines and a customer-service desk in the Sảnh, and gate animation (0.6 s swing, chirp hook).
- [ ] **Step 5: Run the tests** and confirm pass.
- [ ] **Step 6: Commit** `feat: concourse hall, gates, and void balustrade`.

---

### Task 8: Platform — columns, PSDs, trackbed

**Files:**
- Create: `src/world/platform.ts`
- Modify: `src/core/Game.ts`
- Test: `tests/unit/platform.test.ts`, `tests/platform.spec.ts`

**Interfaces:**
- Produces: `buildPlatform(scene, world, materials, interaction): { psdOpen: number; setPsdOpen(v: number): void; doorZones: Box3[] }` — 110 × 14.86 m island at `Y = −16.75`, 20 PSD bays per side at 5.5 m spacing, two column rows, trackbeds with rails and drainage, tunnel portals, benches, wayfinding, tactile edge strips.

- [ ] **Step 1: Write failing unit tests:** platform edge colliders stop forward motion at `Z = ±7.43`; PSD panels block the player until `setPsdOpen(1)`; `doorZones` has 20 entries per side with centres spaced 5.5 m; `groundHeightAt` over the trackbed returns `−17.05`.
- [ ] **Step 2: Write failing browser test:** at `platform`, the canvas is non-blank, sprinting at the edge leaves the player on the platform, and PSD panels animate open within 2 s of `setPsdOpen(1)`.
- [ ] **Step 3: Run and confirm failure.**
- [ ] **Step 4: Implement** the platform, including instanced columns/PSDs, emissive ceiling lines, and trackbed colliders that the player cannot reach.
- [ ] **Step 5: Run the tests** and confirm pass.
- [ ] **Step 6: Commit** `feat: island platform with PSDs and trackbed`.

---

### Task 9: Train — five-car assembly and interior

**Files:**
- Create: `src/world/train.ts`
- Modify: `src/core/Game.ts`
- Test: `tests/unit/train.test.ts`

**Interfaces:**
- Produces: `buildTrain(scene, materials): { group: Group; setDoorOpen(v: number): void; setHeadlights(v: number): void; setPositionX(x: number): void; playerDoorway: Box3; carLocalSeats: Vector3[] }` — 5 cars, `CAR_LENGTH = 21.4`, `CAR_GAP = 0.4`, total 108.6 m; four doors per car per side aligned to PSD bays. `playerDoorway` is the union of the doorway boxes for the car nearest the platform centre, at world scale, used by `Game` to compute `playerInDoorway` for `TrainSystem`.

- [ ] **Step 1: Write failing unit tests:** total train length is 108.6 m ± 0.05; `setDoorOpen(1)` moves all 40 door panels by ≥ 1.3 m; door X positions match the 20 PSD bay centres when the train is at `X = 0` (bay centres at `−52.25 + 5.5k`, door offsets within each car at `−8.25, −2.75, +2.75, +8.25` from car centre); `playerDoorway` spans one door opening.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** extruded car bodies with livery band, glazing, bogies, headlights, and an interior with benches, poles, LED strips, and route map. Doors animate on a 0→1 parameter.
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: five-car Alstom Metropolis train`.

---

### Task 10: Train arrival state machine

**Files:**
- Create: `src/systems/TrainSystem.ts`
- Modify: `src/core/Game.ts`
- Test: `tests/unit/trainSystem.test.ts`

**Interfaces:**
- Produces: `type TrainState = 'idle'|'approaching'|'decelerating'|'stopped'|'doorsOpening'|'boarding'|'doorsClosing'|'departing'|'complete'`
- Produces: `class TrainSystem { state: TrainState; speed: number; doorOpen: number; update(dt: number, ctx: { playerInDoorway: boolean }): void; requestArrival(): void; forceState(s: TrainState): void; isBoardingOpen(): boolean }` with durations `approaching 6`, `decelerating 4`, `stopped 1.5`, `doorsOpening 2`, `boarding 6`, `doorsClosing 2`, `departing 5`.

- [ ] **Step 1: Write failing tests:** the sequence advances only in order; `doorsOpening` cannot begin while `speed > 0`; `boarding` does not advance to `doorsClosing` while `playerInDoorway` is true; `boarding` resumes and completes once it clears; `departing` ends in `complete`; `doorOpen` is 1 during `boarding` and 0 after `doorsClosing`.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** the machine with explicit transition guards and no timers outside `update`. In `Game`, compute `playerInDoorway` from the player capsule bounds against `train.playerDoorway` each fixed step and pass it in.
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: gated train arrival state machine`.

---

### Task 11: Passengers and boarding

**Files:**
- Create: `src/systems/NpcSystem.ts`, `src/world/nav.ts`
- Modify: `src/core/Game.ts`
- Test: `tests/unit/npc.test.ts`, `tests/npc.spec.ts`

**Interfaces:**
- Produces: `buildNavGraph(): NavGraph` with waypoints `street → pavilion → concourse → gates → platform → queue slots → car seats`, where `interface NavGraph { waypoints: Vector3[]; queueSlots: Vector3[]; seats: Vector3[] }`.
- Produces: `class NpcSystem { constructor(scene: Scene, rng: () => number, nav: NavGraph, train: TrainSystem); spawn(count: number): void; update(dt: number): void; boardedCount: number; setReducedMotion(v: boolean): void }` — 50 passengers, speeds 1.0–1.4 m/s, three archetypes.

- [ ] **Step 1: Write failing unit tests:** seeding `npc.spawn(50)` twice produces identical initial positions; every NPC reaches its queue slot within 60 simulated seconds; no NPC boards before `doorOpen > 0.9`; all 50 have boarded by the end of `boarding` when the player is clear.
- [ ] **Step 2: Write failing browser test:** at `boarding`, NPCs are visible on the platform and `boardedCount` increases over 6 s.
- [ ] **Step 3: Run and confirm failure.**
- [ ] **Step 4: Implement** articulated low-poly figures with procedural walk cycles, spline path following, queue slot assignment, and seat targets. NPCs do not collide with the player.
- [ ] **Step 5: Run the tests** and confirm pass.
- [ ] **Step 6: Commit** `feat: passenger NPCs with queueing and boarding`.

---

### Task 12: Procedural audio

**Files:**
- Create: `src/systems/AudioSystem.ts`
- Modify: `src/core/Game.ts`
- Test: `tests/audio.spec.ts`

**Interfaces:**
- Produces: `class AudioSystem { unlock(): Promise<void>; setZone(zone: 'street'|'concourse'|'platform'|'train'): void; footstep(surface: 'stone'|'concrete'|'metal'): void; oneShot(name: 'gate'|'chime'|'brake'|'announce'): void; setMasterVolume(v: number): void; setMuted(m: boolean): void; dispose(): void }`

- [ ] **Step 1: Write failing browser test:** audio stays silent before the first click; after the start click the context is `running`; muting sets master gain to 0; no console or decode errors; zone changes crossfade without clicks (assert no error and gain ramps within 1 s).
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** oscillator/noise beds for HVAC, escalator, street, and crowd; synthesized footsteps by surface; gate chirp, door chime, brake squeal; announcements via `speechSynthesis` with a Vietnamese string and caption fallback.
- [ ] **Step 4: Run the test** and confirm pass.
- [ ] **Step 5: Commit** `feat: procedural station audio`.

---

### Task 13: Title, zone flow, end card

**Files:**
- Create: `src/ui/Title.ts`
- Modify: `src/core/Game.ts`, `src/ui/Hud.ts`, `src/styles.css`
- Test: `tests/flow.spec.ts`

**Interfaces:**
- Produces: zone resolution `resolveZone(position: Vector3): 'street'|'pavilion'|'concourse'|'platform'|'train'`.
- Produces: `Game.completeRun(): void` — fade, show `Hành trình hoàn tất`, restart button.

- [ ] **Step 1: Write failing browser test:** the title blocks input until Start; starting unlocks audio; walking from `street` to `platform` resolves zones in order; reaching `complete` shows the end card and Restart returns to `street` with the train reset to `idle`.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** title overlay, zone-based audio and announcements, fade transitions, and restart.
- [ ] **Step 4: Run the test** and confirm pass.
- [ ] **Step 5: Commit** `feat: title flow, zone audio, and end card`.

---

### Task 14: Lighting, post-processing, quality tiers

**Files:**
- Modify: `src/core/Renderer.ts`, `src/core/Game.ts`, `src/world/*`
- Test: `tests/quality.spec.ts`, `tests/unit/budget.test.ts`

**Interfaces:**
- Produces: `Renderer.setQuality('high'|'balanced')`; `?quality=` URL override; auto-select `balanced` when `navigator.hardwareConcurrency < 4`.
- Produces: `Game.getRenderStats(): { calls: number; triangles: number; textures: number }`.

- [ ] **Step 1: Write failing tests:** `high` enables SSAO and bloom passes while `balanced` does not; draw calls ≤ 300 and triangles ≤ 1.5 M at `platform` and `concourse`; exposing the exterior does not drop below 55 fps over a 10 s sample.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** hemisphere + directional daylight, interior emissive LED plus a small number of spotlights, SSAO, bloom thresholded on emissive, SMAA, and the quality switch. Fix any over-budget row by merging or instancing.
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: lighting, post chain, and quality tiers`.

---

### Task 15: Verification pass and evidence

**Files:**
- Create: `artifacts/evidence.json`, `artifacts/final-evidence.md`, `tests/bot-walk.ts`, `scripts/check_evidence.py` (copy from `~/.agents/skills/threejs-game-director/scripts/`)
- Modify: `tests/*.spec.ts`
- Test: full suite

**Interfaces:**
- Consumes: hooks `seed`, `setState`, `setPausedForScreenshot`, `setReducedMotion`, `hideDebugUi`; states `street`, `concourse`, `platform`, `boarding`, `complete`.

- [ ] **Step 1: Write `artifacts/evidence.json`** with `runId: "pass-1"` and captures: desktop `street`, desktop `concourse`, desktop `platform`, desktop `boarding`, desktop `complete`, mobile `platform`. Each report path under `artifacts/pass-1/`.
- [ ] **Step 2: Implement `setState`** for each name to teleport the player, force the matching train state, and complete scene setup; force `complete` to run the full departure.
- [ ] **Step 3: Run** `npm run build` and confirm `tsc` and Vite succeed, then `npm run preview` and load the built `dist/` on port 5188.
- [ ] **Step 4: Run** `npx playwright test` and confirm all tests pass against the dev server.
- [ ] **Step 4: Run the inspector**: `node scripts/inspect-threejs-canvas.mjs --manifest artifacts/evidence.json --url http://127.0.0.1:5188 --seed 42` with the dev server on port 5188, and confirm six PASS lines with no over-budget rows.
- [ ] **Step 5: Run** `python scripts/check_evidence.py . --manifest artifacts/evidence.json` and confirm coverage.
- [ ] **Step 6: Run the bot walk** and record progress, stalls, and completion time in `artifacts/final-evidence.md`.
- [ ] **Step 7: Commit** `test: evidence manifest and full verification pass`.

---

### Task 16: Visual scorecard and polish

**Files:**
- Modify: whichever surfaces score below 2
- Update: `artifacts/final-evidence.md`

- [ ] **Step 1: View the anchor images** `threejs-aaa-graphics-builder/assets/scorecard-anchors/scene-1..3.jpg` before scoring.
- [ ] **Step 2: Score all ten categories** against the capture set with one line of measured evidence each: art direction, hero/player (here: the train and the player's first-person presence), obstacles/enemies (here: PSDs, platform edges, gates), rewards/interactables (gates, train doors), world/environment, materials, lighting, VFX/motion (doors, train arrival, NPC flow), UI/HUD, performance evidence.
- [ ] **Step 3: Fix every category below 2** and re-capture. Record before/after; a new build uses `not captured` for before, never an invented number.
- [ ] **Step 4: Confirm thresholds** — all categories ≥ 2, average ≥ 2.3, no automatic failures.
- [ ] **Step 5: Document** the scorecard and remaining risks in `artifacts/final-evidence.md`.
- [ ] **Step 6: Commit** `polish: visual scorecard pass`.
