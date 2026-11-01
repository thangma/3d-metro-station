import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { proceduralTexture } from '../../src/world/kit/textures';
import { buildColumn } from '../../src/world/kit/column';
import { buildEscalator } from '../../src/world/kit/escalator';
import { createRng } from '../../src/test/rng';

describe('procedural textures', () => {
  it('produces byte-identical pixels for the same seed', () => {
    const a = proceduralTexture('terrazzo', 64, createRng(7));
    const b = proceduralTexture('terrazzo', 64, createRng(7));
    expect(Buffer.compare(Buffer.from(a.albedo), Buffer.from(b.albedo))).toBe(0);
    expect(Buffer.compare(Buffer.from(a.roughness), Buffer.from(b.roughness))).toBe(0);
  });

  it('produces different pixels for a different seed', () => {
    const a = proceduralTexture('terrazzo', 64, createRng(7));
    const b = proceduralTexture('terrazzo', 64, createRng(8));
    expect(Buffer.compare(Buffer.from(a.albedo), Buffer.from(b.albedo))).not.toBe(0);
  });

  it('fills every channel for each material kind', () => {
    for (const kind of ['terrazzo', 'concrete', 'brushed', 'tactile', 'livery'] as const) {
      const texture = proceduralTexture(kind, 32, createRng(3));
      expect(texture.albedo.length).toBe(32 * 32 * 4);
      expect(texture.normal.length).toBe(32 * 32 * 4);
      const alpha = texture.albedo[3];
      expect(alpha).toBe(255);
    }
  });
});

describe('kit builders', () => {
  it('builds a column at the concourse ceiling height', () => {
    const kit = buildColumn();
    const bounds = new Box3().setFromObject(kit.group);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(6.75, 2);
    expect(kit.colliders.length).toBeGreaterThan(0);
  });

  it('builds a 26 m escalator rising 10 m', () => {
    const kit = buildEscalator({ run: 26, rise: 10, width: 1.2 });
    const bounds = new Box3().setFromObject(kit.group);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(26, 1);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThanOrEqual(9.95);
    expect(bounds.max.y - bounds.min.y).toBeLessThan(11.1);
    expect(bounds.max.z - bounds.min.z).toBeLessThan(1.7);
  });
});
