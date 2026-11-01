# 3D Metro Station — Design Specification

Date: 2026-11-01
Status: Approved for planning
Source drawings: `image_0.jpg` – `image_6.jpg` (project root)

## 1. Purpose

A first-person, walkable, real-time reconstruction of an underground metro station
modelled from the supplied architectural drawings. The player makes one complete
passenger journey: sidewalk → entrance pavilion → concourse → platform → aboard a
five-car Alstom Metropolis train, which then departs. It is a walkthrough with full
first-person controls, not a combat game.

Success means a player can walk the entire route at true architectural scale and the
station reads as a built place: correct levels, correct proportions, coherent
materials, believable light, and a train arrival that feels scheduled rather than
scripted.

## 2. Success criteria

1. The full route is traversable without clipping, falling through geometry, or
   getting stuck, on desktop at 1920×1080.
2. Every level sits at its drawn elevation: pavilion `+0.600`, concourse `−10.000`,
   platform `−16.750`, underside slab `−19.500`.
3. The 110 m island platform, 14.86 m width, 30 m box, and 190 m site length match
   the canonical values in §4 within ±50 mm on any single dimension and ±1% on
   overall extents.
4. The train arrives, decelerates, stops, opens in sync with the PSDs, boards NPCs,
   and departs — one continuous state machine, no desync between doors and PSDs.
5. Materials, lighting, and signage are authored, not placeholder: no untextured
   boxes on the player path, no fog-as-detail, no generic HUD cards.
6. Production build succeeds; the game runs from `dist/` on a static host.
7. The 10-category visual scorecard averages ≥ 2.3 with no category below 2.

## 3. Non-goals

- No weapons, enemies, damage, or shooting.
- No second station and no tunnel ride segment beyond the departure shot.
- No enterable back-of-house: staff rooms, MEP rooms, ticket office interior, and the
  under-platform level at `−19.500` are modelled but sealed.
- No external asset generation (no Tripo/Gemini/ElevenLabs keys are available). All
  geometry, textures, and audio are produced procedurally at runtime.
- No multiplayer, save system, or settings menu beyond volume and pointer-lock
  recovery.

## 4. Dimensional basis

### 4.1 Canonical values

| Item | Value | Source |
| --- | --- | --- |
| Site length (overall) | 190,000 mm | image_0, image_1, image_6 |
| Station box length | 176,000 mm | image_0 |
| Station box width | 30,000 mm | image_1, image_3, image_6 (3-3) |
| Structural bays | 3 × 9,600 mm + walls | image_2 (A–D grid) |
| Column axes | 32 lines | image_2, image_3, image_5 |
| Street level | ±0.000 | image_0, image_1 |
| Pavilion floor | +0.600 | image_1, image_2 |
| Upper storey | +5.000 | image_0, image_6 |
| Concourse | −10.000 | image_0, image_2 |
| Platform | −16.750 | image_0, image_3 |
| Underside slab | −19.500 | image_0, image_5 |
| Concourse floorplate | 5,600 m² | image_2 |
| Platform-level floorplate | 5,200 m² | image_3, image_5 |
| Open void | 800 m² | image_2 |
| Central bay | 95,000 mm long | image_2 |
| Escalator run, concourse | 26,000 mm | image_2 |
| Island platform | 110,000 × 14,860 mm | image_3 |
| Platform edge strip | 3,670 mm | image_3 |
| Train | Alstom Metropolis, 5 cars | image_4 |

### 4.2 Reconciliation rules

The drawings contain dimension chains that do not sum cleanly. These resolutions are
canonical for the build:

1. **Gross areas.** `S=5600m2` and `S=5200m2` are whole-floorplate areas, not the area
   of the named zone. `176 × 30 = 5,280 m²` is consistent with both within drafting
   tolerance.
2. **Void.** `800 m² ÷ 12,600 mm = 63.5 m`. The open void is a 63.5 × 12.6 m
   rectangle centred in the 95 m central bay; the remainder of the bay is escalator
   landing and balustrade.
3. **Cross-section.** `3,900 + 3,670 + 14,860 + 3,670 + 3,900 = 30,000 mm`. Z order:
   side service zone, track 1, island platform, track 2, side service zone.
4. **Longitudinal layout.** 190 m site, 176 m finished box, 110 m platform centred in
   the box, leaving 33 m of end rooms and vertical circulation at each end.
5. Where a conflict remains, the dimension string overrides the scaled drawing.

### 4.3 Coordinate system

1 unit = 1 metre. `+X` along the station axis, `−95 → +95`. `+Z` across the box,
`−15 → +15`. `Y` up, street at `0.000`. Platform occupies `X −55 → +55`,
`Z −7.43 → +7.43`.

## 5. Spatial layout and circulation

**Street (±0.000).** Sidewalk with tactile paving, 30 m roadway, tree pits at 15 m
spacing, bollards, vent structures, glass-and-steel entrance pavilions on both long
sides at `X ≈ −30`.

**Pavilion (+0.600).** Glazed enclosure with a flat roof, a 0.6 m landing, a straight
flight of stairs and a parallel escalator descending into the concourse. Signage:
`LỐI XUỐNG GA`.

**Concourse (−10.000).** 176 × 30 m floorplate. Sảnh (ticket hall) at the pavilion
side, ticket gates at the hall boundary, ticket machines and a customer-service desk
along the side wall. The central 95 m bay holds the void; balustrades and a 1.1 m
guard rail surround it. Sealed rooms with doors line both ends. Linear LED coffers run
on the 9.6 m grid. Two escalator pairs descend from the concourse to the platform at
the near and far ends of the void.

**Platform (−16.750).** 110 × 14.86 m island. Two rows of columns on the 9.6 m grid,
polished stone floor, tactile edge strips, benches, wayfinding totems, ceiling LED
lines, glass platform screen doors on both edges, trackbeds beyond with third rail and
drainage, tunnel portals at both ends.

**Train.** Five cars, ~110 m coupled, stopped with car doors aligned to PSD bays.
Interior: bench seating, poles, grab handles, LED strip lighting, route map, door
indicators.

## 6. Player experience flow

1. Spawn on the sidewalk, pavilion visible, daylight audio bed.
2. Approach and enter the pavilion; prompt to descend.
3. Stairs/escalator down; ambient shifts from street to HVAC.
4. Concourse: tap card at the gates (`E`), gates chirp and open.
5. Walk the hall alongside the void balustrade, look down at the platform, hear the
   arrival announcement.
6. Escalator to the platform; passengers are already queuing at the PSDs.
7. Train arrives, brakes, stops; PSDs and car doors open together; NPCs board.
8. Player steps inside; doors close; the train departs; end card with restart.

## 7. Architecture

Stack: Vite + TypeScript + Three.js (WebGL2). No physics engine, no state library.

```
src/
  core/
    Game.ts             orchestration, resize, visibility, pause
    Renderer.ts         renderer, tone mapping, post chain, quality tiers
    Loop.ts             fixed-step update + render
    InputController.ts  pointer lock, keys, gamepad-free
    PlayerController.ts movement, stairs/ramp snapping, escalator carry
    CollisionWorld.ts   AABB + ramp colliders, capsule sliding
  world/
    site.ts             street, sidewalk, road, street furniture
    pavilion.ts         glass pavilion, landing, stair, escalator
    concourse.ts        hall, gates, balustrades, rooms, ceiling
    platform.ts         platform, columns, PSDs, trackbed, portals
    train.ts            car assembly, doors, interior, lights
    kit/                parametric builders: column, coffer, gate, bench,
                        escalator, PSD panel, signage, railing, texture atlas
  systems/
    TrainSystem.ts      arrival state machine
    NpcSystem.ts        archetypes, paths, queueing, boarding
    InteractionSystem.ts raycast prompts and actions
    AudioSystem.ts      procedural Web Audio beds and one-shots
    Hud.ts              prompt, captions, fade, end card
  test/
    hooks.ts            window.__THREE_GAME_TEST_HOOKS__
    rng.ts              seeded RNG
```

**Key interfaces**

- `TrainSystem.state` is the single source of truth for door/PSD/NPC timing; nothing
  else owns a door timer.
- `CollisionWorld` exposes `addBox`, `addRamp`, `moveCapsule(from, delta, radius)`.
- `InteractionSystem` exposes `register(target, prompt, action)` and resolves the
  nearest target within 2.5 m of the camera ray.
- `hooks` exposes `getState()`, `teleport(zone)`, `advanceTrain()`, `getMetrics()`,
  and zone names `street | pavilion | concourse | platform | train`.

## 8. Systems

### 8.1 Player and collision

Capsule radius 0.30 m, eye height 1.65 m, walk 3.2 m/s, sprint 5.6 m/s, FOV 90.
Pointer lock with click-to-resume and an accessible fallback banner. Stairs are ramps
with a hidden step shader; escalators add a constant velocity to the player while
standing on their footprint. Collision is capsule-vs-AABB with slope limit 45°;
platform edges, PSDs, railings, columns, gates, and the train body are solid.

### 8.2 Train state machine

| State | Duration | Behaviour |
| --- | --- | --- |
| `approaching` | 6 s | headlights ramp, rumble rises, train enters from +X |
| `decelerating` | 4 s | speed eases to zero, brake squeal, nose settles on mark |
| `stopped` | 1.5 s | idle hum, PSD status lights turn green |
| `doorsOpening` | 2 s | PSDs and car doors animate together |
| `boarding` | 6 s | queued NPCs walk to assigned seats; player may enter |
| `doorsClosing` | 2 s | chime, doors close, NPCs clear the threshold |
| `departing` | 5 s | train accelerates into −X tunnel, lights recede |
| `complete` | — | fade to end card, restart available |

Transitions are time-driven but gated: `doorsOpening` cannot start until speed is
zero, and `boarding` cannot end while the player is in a doorway.

### 8.3 NPCs

~50 passengers across three archetypes, each an articulated low-poly figure (hips,
torso, head, two-segment arms and legs) with a procedural walk cycle and idle sway.
Behaviour: enter through gates, walk spline paths to the platform, queue at assigned
PSD bays, board when `doorsOpening` completes, then sit or stand in a car. Seeded
placement and timing; NPCs are non-blocking to the player.

### 8.4 Interaction

Single contextual action on `E`, resolved by camera ray within 2.5 m. Targets: gate
card reader, ticket machine (inert flavour), station map, and the train threshold.
Prompt text is localized Vietnamese with an English subtitle line.

### 8.5 Audio

Fully procedural Web Audio, no files: filtered-noise HVAC and tunnel drone, escalator
motor hum, surface-aware footsteps, crowd murmur from modulated noise bands, gate
chirps, door chimes, train rumble and brake squeal, and speech-synthesis announcements
in Vietnamese with caption fallback. Master bus with a volume control and a mute key.

### 8.6 UI

Title card with start, in-world interaction prompt, announcement captions, fade-to-black
transitions, and the end card. No minimap, no stats, no health.

## 9. Art direction and rendering

- **Language:** physically grounded realism, Hanoi Metro identity, no stylization.
- **Materials:** canvas-generated albedo/roughness/normal for terrazzo, board-formed
  concrete, painted steel, brushed aluminium, tinted glass, tactile paving, and
  train livery. Reflection via environment map, not planar mirrors.
- **Light:** 5,500 K daylight and sky outside; 4,000 K linear LED inside; PSD edge
  lighting and train headlights as accents. Emissive strips carry the interior, with
  hemisphere fill and SSAO to seat objects.
- **Post:** ACES tone mapping, SSAO, subtle bloom, SMAA. No chromatic aberration, no
  vignette-as-polish.
- **Signage:** Vietnamese primary, English secondary, matching the drawings.

## 10. Performance budgets

| Metric | Budget |
| --- | --- |
| Draw calls | ≤ 300 |
| Triangles | ≤ 1.5 M |
| Textures | ≤ 64 MB VRAM |
| Frame time | ≤ 16.6 ms at 1920×1080, integrated GPU |
| Static geometry | merged per material |
| Repeats | InstancedMesh (columns, lights, PSDs, sleepers, seats) |
| Loading | single scene, no streaming |

Quality tiers: `high` (SSAO, bloom, SMAA) and `balanced` (no SSAO, FXAA) selected by a
startup benchmark and overridable by URL parameter.

## 11. Testing and verification

- `npm run build` must pass; `dist/` served statically must run.
- Playwright smoke test: load, pointer-lock start, walk the full route with simulated
  input, board, reach `complete`. Teleport hooks are for reset and diagnostics only;
  the smoke test must actually traverse the route.
- Canvas inspection: non-blank pixels, colour entropy, edge density, luminance
  contrast, render-budget rows.
- Captures at 1920×1080 and 390×844.
- Bot playtest walking the route and reporting progress and stalls.
- Visual scorecard across all 10 categories with measured evidence.
- Deterministic hooks and seeded RNG so runs are reproducible.
- Evidence written to `artifacts/evidence.json` and `artifacts/final-evidence.md`.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| 190 m scene exceeds draw-call budget | merge per material, instance repeats, section culling |
| Long sightlines through the void expose unfinished geometry | author the platform before the concourse is opened up |
| Procedural textures look flat up close | normal + roughness maps, edge wear, AO decals |
| Escalator/stairs feel wrong | ramp colliders plus velocity carry, verified by bot walk |
| Train/PSD desync | single state machine owns all door timing |
| No API keys for audio/voice | procedural Web Audio plus speech synthesis fallback |
| Mobile performance | desktop-first, `balanced` tier, capture-only mobile check |

## 13. Resolved decisions

- Product is a walkthrough with FPS controls; no combat.
- Journey ends after boarding, doors close, train departs, end card.
- Only the passenger path is enterable; back-of-house is sealed.
- Approach A: procedural kit in one continuous real-scale Three.js scene.
- All assets procedural; no external generation.
