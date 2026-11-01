import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../../src/core/CollisionWorld';
import { PlayerController } from '../../src/core/PlayerController';
import { resolveCarry } from '../../src/core/escalators';
import type { EscalatorSpec } from '../../src/world/layout';

const DT = 1 / 120;
const ZERO = new Vector3();

function floorWorld(): CollisionWorld {
  const world = new CollisionWorld();
  world.addBox(new Vector3(-50, -2, -50), new Vector3(50, 0, 50));
  return world;
}

describe('PlayerController', () => {
  it('accelerates to walk speed within 0.4 seconds', () => {
    const world = floorWorld();
    const player = new PlayerController(new Vector3(0, 0, 0));
    const input = { forward: 1, right: 0, sprint: false, interact: false };

    for (let i = 0; i < 48; i += 1) player.update(DT, input, world, ZERO);

    expect(player.speed).toBeGreaterThan(3.0);
    expect(player.speed).toBeLessThanOrEqual(3.21);
  });

  it('reaches sprint speed and no further', () => {
    const world = floorWorld();
    const player = new PlayerController(new Vector3(0, 0, 0));
    const input = { forward: 1, right: 0, sprint: true, interact: false };

    for (let i = 0; i < 90; i += 1) player.update(DT, input, world, ZERO);

    expect(player.speed).toBeGreaterThan(5.4);
    expect(player.speed).toBeLessThanOrEqual(5.61);
  });

  it('falls under gravity and settles grounded on the floor', () => {
    const world = floorWorld();
    const player = new PlayerController(new Vector3(0, 3, 0));
    const idle = { forward: 0, right: 0, sprint: false, interact: false };

    for (let i = 0; i < 240; i += 1) player.update(DT, idle, world, ZERO);

    expect(player.position.y).toBeCloseTo(0, 2);
    expect(player.grounded).toBe(true);
  });

  it('is carried upward by an escalator without horizontal input', () => {
    const world = floorWorld();
    const player = new PlayerController(new Vector3(0, 0, 0));
    const idle = { forward: 0, right: 0, sprint: false, interact: false };
    const carry = new Vector3(0, 0.65, 0);

    for (let i = 0; i < 120; i += 1) player.update(DT, idle, world, carry);

    expect(player.position.y).toBeGreaterThan(0.6);
    expect(player.position.x).toBeCloseTo(0, 3);
  });

  it('moves slower when walking against the carry direction', () => {
    const world = floorWorld();
    const player = new PlayerController(new Vector3(0, 0, 0));
    const forward = { forward: 1, right: 0, sprint: false, interact: false };
    const against = new Vector3(0, 0, 0.65);

    for (let i = 0; i < 120; i += 1) player.update(DT, forward, world, against);

    const z = player.position.z;
    expect(z).toBeLessThan(0);
    expect(Math.abs(z)).toBeLessThan(3.0);
  });
});

describe('resolveCarry', () => {
  const spec: EscalatorSpec = {
    position: new Vector3(0, 0, 0),
    direction: new Vector3(0, 1, 0),
    speed: 0.65,
    footprint: { minX: -1, maxX: 1, minZ: -1, maxZ: 1, bottomY: 0, topY: 3 },
  };

  it('returns the carry vector inside the footprint', () => {
    const carry = resolveCarry(new Vector3(0, 1, 0), [spec]);
    expect(carry.y).toBeCloseTo(0.65, 3);
  });

  it('returns zero outside the footprint', () => {
    expect(resolveCarry(new Vector3(5, 1, 0), [spec]).length()).toBe(0);
  });

  it('returns zero after stepping off the top', () => {
    expect(resolveCarry(new Vector3(0, 4, 0), [spec]).length()).toBe(0);
  });
});
