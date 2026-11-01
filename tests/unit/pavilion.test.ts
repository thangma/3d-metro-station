import { Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../../src/core/CollisionWorld';
import { PAVILION_X, PAVILION_Y } from '../../src/world/layout';
import { createMaterials } from '../../src/world/kit/materials';
import { buildPavilion } from '../../src/world/pavilion';

function build() {
  const scene = new Scene();
  const world = new CollisionWorld();
  const materials = createMaterials();
  const result = buildPavilion(scene, world, materials, PAVILION_X, 1);
  return { world, result };
}

describe('entrance pavilion', () => {
  it('returns a walkable path from the landing to the concourse', () => {
    const { world, result } = build();

    let feet = PAVILION_Y;
    let previous = feet;
    let samples = 0;
    const bottom = result.stairBottom.z + 0.4;
    for (let z = 12.5; z >= bottom; z -= 0.1) {
      const height = world.groundHeightAt(result.stairTop.x, z, feet);
      expect(height, `no floor at z=${z.toFixed(2)}`).not.toBeNull();
      expect(height!).toBeLessThanOrEqual(previous + 0.02);
      feet = height!;
      previous = feet;
      samples += 1;
    }

    expect(samples).toBeGreaterThan(200);
    expect(previous).toBeCloseTo(-10, 0);
  });

  it('keeps the stair slope under 45 degrees', () => {
    const { result } = build();
    const rise = Math.abs(result.stairTop.y - result.stairBottom.y);
    const run = Math.abs(result.stairTop.z - result.stairBottom.z);
    expect(rise / run).toBeLessThanOrEqual(1);
    expect(result.stairTop.y).toBeCloseTo(PAVILION_Y, 2);
    expect(result.stairBottom.y).toBeCloseTo(-10, 2);
  });

  it('registers an escalator covering the descent', () => {
    const { result } = build();
    expect(result.escalators).toHaveLength(1);
    const spec = result.escalators[0];
    expect(spec.footprint.minZ).toBeCloseTo(result.stairBottom.z, 2);
    expect(spec.footprint.maxZ).toBeCloseTo(result.stairTop.z, 2);
    expect(spec.direction.y).toBeLessThan(0);
  });

  it('seals the matching pavilion on the far side', () => {
    const scene = new Scene();
    const world = new CollisionWorld();
    const materials = createMaterials();
    const sealed = buildPavilion(scene, world, materials, PAVILION_X, -1);

    expect(sealed.escalators).toHaveLength(0);
    expect(world.groundHeightAt(PAVILION_X, -12.6, 0.6)).toBeCloseTo(0.6, 2);
  });
});
