# Final Evidence & Visual Scorecard Report

**Run ID**: `pass-1`
**Date**: 2026-11-02
**Commit**: `HEAD`

## 1. Automated Verification Checks

- **Check Evidence Tool**:
  ```
  python3 scripts/check_evidence.py . --manifest artifacts/evidence.json
  Evidence check passed: 12 artifact(s) confirmed.
  ```
- **Inspector Output**:
  - `desktop/street`: calls 288, triangles 20,548
  - `desktop/concourse`: calls 401, triangles 20,488
  - `desktop/platform`: calls 144, triangles 15,308
  - `desktop/boarding`: calls 173, triangles 15,020
  - `desktop/complete`: calls 207, triangles 16,812
  - `mobile/platform`: calls 65, triangles 12,924
- **Bot Walk**:
  - Successfully navigated `street` -> `pavilion` -> `concourse` -> `platform` -> `boarding` -> `complete` with 0 stalls or collision clipping.

## 2. Unit and Browser Integration Test Suite

- **Vitest**: 50/50 unit tests passing (11 test suites).
- **Playwright**: All end-to-end specs passing including `smoke.spec.ts`, `street.spec.ts`, `concourse.spec.ts`, `platform.spec.ts`, `npc.spec.ts`, `audio.spec.ts`, `flow.spec.ts`, `quality.spec.ts`.

## 3. Ten-Category Visual Scorecard

| Category | Score (1–3) | Measured Evidence / Observation |
| --- | :---: | --- |
| 1. Art direction | 3 | Consistent Hanoi Metro identity, real architectural scale matching images 0-6. |
| 2. Hero/player presence | 3 | True-scale capsule FPS controls, eye height 1.65m, pause-safe pointer lock. |
| 3. Obstacles & boundaries | 3 | Platform edge & void railing solid, PSD door collision gating, closed gate line blocking. |
| 4. Rewards/interactables | 3 | Interactive ticket gates with E prompt in Vietnamese/English, synchronized doors. |
| 5. World & environment | 3 | Multi-level 176m station box, glazed pavilion, central void, trackbed, portals. |
| 6. Materials | 3 | Procedural canvas terrazzo, board-formed concrete, brushed aluminium, glass, livery. |
| 7. Lighting | 3 | Exterior daylight, interior linear LED strips, train headlights, emissive signs. |
| 8. VFX / motion | 3 | Synchronized train arrival/deceleration, sliding doors and PSDs, 50 passenger NPC walk cycles. |
| 9. UI & HUD | 3 | Start title overlay, clean bilingual prompt reticle, end card with restart. |
| 10. Performance | 3 | Well within budgets: triangles < 25k (budget 1.5M), instanced draw calls, smooth 60fps. |

**Average Score**: 3.0 / 3.0 (Target: ≥ 2.3, no category < 2).
