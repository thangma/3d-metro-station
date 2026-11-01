import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../../src/core/CollisionWorld';

const RADIUS = 0.3;
const HEIGHT = 1.8;

function withFloor(): CollisionWorld {
  const world = new CollisionWorld();
  world.addBox(new Vector3(-50, -2, -50), new Vector3(50, 0, 50));
  return world;
}

describe('CollisionWorld', () => {
  it('stops horizontal motion at a wall and slides along it', () => {
    const world = withFloor();
    world.addBox(new Vector3(1, 0, -10), new Vector3(1.2, 5, 10));

    const hit = world.moveCapsule(new Vector3(0, 0, 0), new Vector3(2, 0, 0), RADIUS, HEIGHT);
    expect(hit.position.x).toBeCloseTo(0.7, 2);

    const slide = world.moveCapsule(hit.position, new Vector3(2, 0, 1), RADIUS, HEIGHT);
    expect(slide.position.x).toBeCloseTo(0.7, 2);
    expect(slide.position.z).toBeCloseTo(1, 2);
  });

  it('lands on a box top and reports grounded', () => {
    const world = withFloor();
    const fall = world.moveCapsule(new Vector3(0, 3, 0), new Vector3(0, -4, 0), RADIUS, HEIGHT);
    expect(fall.position.y).toBeCloseTo(0, 3);
    expect(fall.grounded).toBe(true);
  });

  it('walks up a 30 degree ramp', () => {
    const world = withFloor();
    world.addRamp(0, 4, -2, 2, 0, 2.3094);
    expect(world.groundHeightAt(2, 0)).toBeCloseTo(1.1547, 3);

    let position = new Vector3(-1, 0, 0);
    for (let i = 0; i < 20; i += 1) {
      position = world.moveCapsule(position, new Vector3(0.1, 0, 0), RADIUS, HEIGHT).position;
    }
    expect(position.x).toBeCloseTo(1, 1);
    expect(position.y).toBeGreaterThan(0.4);
  });

  it('blocks a 60 degree ramp', () => {
    const world = withFloor();
    world.addRamp(0, 3, -2, 2, 0, 5.1962);

    let position = new Vector3(-0.5, 0, 0);
    for (let i = 0; i < 20; i += 1) {
      position = world.moveCapsule(position, new Vector3(0.1, 0, 0), RADIUS, HEIGHT).position;
    }
    expect(position.x).toBeLessThan(0.05);
    expect(position.y).toBeCloseTo(0, 2);
  });

  it('does not tunnel through a thin wall at a large step', () => {
    const world = withFloor();
    world.addBox(new Vector3(1, 0, -10), new Vector3(1.2, 5, 10));
    const result = world.moveCapsule(new Vector3(0, 0, 0), new Vector3(3, 0, 0), RADIUS, HEIGHT);
    expect(result.position.x).toBeLessThanOrEqual(0.71);
  });

  it('reports no ground over a hole and the slope height mid-ramp', () => {
    const empty = new CollisionWorld();
    expect(empty.groundHeightAt(0, 0)).toBeNull();

    const world = withFloor();
    world.addRamp(0, 4, -2, 2, 0, 2.3094);
    expect(world.groundHeightAt(2, 0)).toBeCloseTo(1.1547, 3);
    expect(world.groundHeightAt(-2, 0)).toBeCloseTo(0, 3);
  });
});
