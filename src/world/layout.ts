import type { Vector3 } from 'three';

/** Canonical station dimensions in metres. See spec §4. */
export const SITE_HALF_LENGTH = 95;
export const BOX_HALF_LENGTH = 88;
export const BOX_HALF_WIDTH = 15;

export const PAVILION_X = -30;
export const PAVILION_Y = 0.6;

export const CONCOURSE_Y = -10;
export const PLATFORM_Y = -16.75;
export const SLAB_Y = -19.5;

export const PLATFORM_X0 = -55;
export const PLATFORM_X1 = 55;
export const PLATFORM_HALF_WIDTH = 7.43;

export const VOID_X0 = -10;
export const VOID_X1 = 53.5;
export const VOID_HALF_WIDTH = 6.3;

export const TRACK_WIDTH = 3.67;
export const SIDE_ZONE = 3.9;

export const ESCALATOR_RUN_CONCOURSE = 26;
export const ESCALATOR_RUN_PLATFORM = 13;

export const CAR_COUNT = 5;
export const CAR_LENGTH = 21.4;
export const CAR_GAP = 0.4;

export const PSD_BAY_COUNT = 20;
export const PSD_BAY_SPACING = 5.5;
export const PSD_BAY_WIDTH = 2.0;
export const PSD_FIRST_CENTER = -((PSD_BAY_COUNT - 1) * PSD_BAY_SPACING) / 2;

export const EYE_HEIGHT = 1.65;
export const CAPSULE_RADIUS = 0.3;
export const CAPSULE_HEIGHT = 1.8;
export const WALK_SPEED = 3.2;
export const SPRINT_SPEED = 5.6;
export const STEP_UP = 0.25;

export const CONCOURSE_CEILING = -3.4;
export const PLATFORM_CEILING = -10.2;

export interface EscalatorSpec {
  position: Vector3;
  direction: Vector3;
  speed: number;
  footprint: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    bottomY: number;
    topY: number;
  };
}

export function psdBayCenters(): number[] {
  return Array.from({ length: PSD_BAY_COUNT }, (_, i) => PSD_FIRST_CENTER + i * PSD_BAY_SPACING);
}
