import { Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../../src/core/CollisionWorld';
import { createMaterials } from '../../src/world/kit/materials';
import { InteractionSystem } from '../../src/systems/InteractionSystem';
import {
  PLATFORM_HALF_WIDTH,
  PLATFORM_Y,
  PSD_BAY_COUNT,
  PSD_BAY_SPACING,
} from '../../src/world/layout';
import { buildPlatform } from '../../src/world/platform';

function build() {
  const scene = new Scene();
  const world = new CollisionWorld();
  const materials = createMaterials();
  const interaction = new InteractionSystem();
  const platform = buildPlatform(scene, world, materials, interaction);
  return { scene, world, interaction, platform };
}

describe('platform level', () => {
  it('stops forward motion at the platform edges Z = +/- 7.43', () => {
    const { world } = build();

    const south = world.moveCapsule(
      new Vector3(0, PLATFORM_Y, PLATFORM_HALF_WIDTH - 0.4),
      new Vector3(0, 0, 1.0),
      0.3,
      1.8,
    );
    expect(south.position.z).toBeLessThanOrEqual(PLATFORM_HALF_WIDTH);

    const north = world.moveCapsule(
      new Vector3(0, PLATFORM_Y, -PLATFORM_HALF_WIDTH + 0.4),
      new Vector3(0, 0, -1.0),
      0.3,
      1.8,
    );
    expect(north.position.z).toBeGreaterThanOrEqual(-PLATFORM_HALF_WIDTH);
  });

  it('blocks the player with PSD panels until setPsdOpen(1)', () => {
    const { world, platform } = build();

    const bayCenter = platform.doorZones[10].getCenter(new Vector3());
    const before = world.moveCapsule(
      new Vector3(bayCenter.x, PLATFORM_Y, bayCenter.z > 0 ? bayCenter.z - 0.5 : bayCenter.z + 0.5),
      new Vector3(0, 0, bayCenter.z > 0 ? 1.0 : -1.0),
      0.3,
      1.8,
    );
    expect(Math.abs(before.position.z)).toBeLessThan(Math.abs(bayCenter.z));

    platform.setPsdOpen(1);
    const after = world.moveCapsule(
      new Vector3(bayCenter.x, PLATFORM_Y, bayCenter.z > 0 ? bayCenter.z - 0.5 : bayCenter.z + 0.5),
      new Vector3(0, 0, bayCenter.z > 0 ? 1.0 : -1.0),
      0.3,
      1.8,
    );
    expect(Math.abs(after.position.z)).toBeGreaterThanOrEqual(Math.abs(bayCenter.z) - 0.1);
  });

  it('provides 20 door zones per side spaced at 5.5 m', () => {
    const { platform } = build();
    expect(platform.doorZones.length).toBe(PSD_BAY_COUNT * 2);

    const southZones = platform.doorZones.filter((z) => z.min.z > 0);
    const northZones = platform.doorZones.filter((z) => z.max.z < 0);
    expect(southZones.length).toBe(PSD_BAY_COUNT);
    expect(northZones.length).toBe(PSD_BAY_COUNT);

    southZones.sort((a, b) => a.min.x - b.min.x);
    for (let i = 1; i < southZones.length; i++) {
      const prevX = (southZones[i - 1].min.x + southZones[i - 1].max.x) / 2;
      const currX = (southZones[i].min.x + southZones[i].max.x) / 2;
      expect(currX - prevX).toBeCloseTo(PSD_BAY_SPACING, 2);
    }
  });

  it('returns -17.05 for groundHeightAt over the trackbed', () => {
    const { world } = build();
    const trackbedZ = PLATFORM_HALF_WIDTH + 1.5;
    const height = world.groundHeightAt(0, trackbedZ, PLATFORM_Y);
    expect(height).toBeCloseTo(-17.05, 2);
  });
});
