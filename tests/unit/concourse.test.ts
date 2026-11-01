import { Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CollisionWorld } from '../../src/core/CollisionWorld';
import { PlayerController } from '../../src/core/PlayerController';
import { InteractionSystem } from '../../src/systems/InteractionSystem';
import {
  CONCOURSE_Y,
  VOID_HALF_WIDTH,
  VOID_X0,
  VOID_X1,
} from '../../src/world/layout';
import { createMaterials } from '../../src/world/kit/materials';
import { buildConcourse, GATE_LINE_X, GATE_Z } from '../../src/world/concourse';

function build() {
  const scene = new Scene();
  const world = new CollisionWorld();
  const interaction = new InteractionSystem();
  const materials = createMaterials();
  const concourse = buildConcourse(scene, world, materials, interaction);
  return { scene, world, interaction, concourse };
}

describe('concourse', () => {
  it('opens the void and keeps the hall floor solid', () => {
    const { world } = build();

    expect(world.groundHeightAt(20, 0, CONCOURSE_Y)).toBeNull();
    expect(world.groundHeightAt(VOID_X0 + 1, VOID_HALF_WIDTH - 0.5, CONCOURSE_Y)).toBeNull();
    expect(world.groundHeightAt(-40, 0, CONCOURSE_Y)).toBeCloseTo(CONCOURSE_Y, 2);
    expect(world.groundHeightAt(VOID_X1 + 2, 10, CONCOURSE_Y)).toBeCloseTo(CONCOURSE_Y, 2);
  });

  it('stops a sprint at the void balustrade', () => {
    const { world } = build();
    const player = new PlayerController(new Vector3(20, CONCOURSE_Y, 12));
    player.yaw = 0;
    const sprint = { forward: 1, right: 0, sprint: true, interact: false };

    for (let i = 0; i < 240; i += 1) {
      player.update(1 / 120, sprint, world, new Vector3());
    }

    expect(player.position.z).toBeGreaterThan(VOID_HALF_WIDTH);
    expect(player.position.z).toBeLessThan(VOID_HALF_WIDTH + 1);
    expect(world.groundHeightAt(player.position.x, player.position.z, player.position.y)).not.toBeNull();
  });

  it('registers gates that open on interact', () => {
    const { interaction, concourse } = build();
    expect(concourse.gateOpen()).toBe(false);

    const targetZ = GATE_Z[2];
    const camera = new PerspectiveCamera(90, 1, 0.1, 100);
    camera.position.set(GATE_LINE_X - 1.6, CONCOURSE_Y + 1.65, targetZ);
    camera.lookAt(GATE_LINE_X, CONCOURSE_Y + 1.0, targetZ);
    camera.updateMatrixWorld(true);

    const target = interaction.update(camera, new Vector3(GATE_LINE_X - 1.6, CONCOURSE_Y, targetZ));
    expect(target).not.toBeNull();
    expect(target!.promptVi).toBe('Soát vé');

    expect(interaction.interact()).toBe(true);
    expect(concourse.gateOpen()).toBe(true);
  });

  it('blocks the aisle while closed and clears it once open', () => {
    const { world, concourse } = build();
    const closed = world.moveCapsule(
      new Vector3(GATE_LINE_X - 1.2, CONCOURSE_Y, GATE_Z[0]),
      new Vector3(2.4, 0, 0),
      0.3,
      1.8,
    );
    expect(closed.position.x).toBeLessThan(GATE_LINE_X - 0.25);

    concourse.setGateOpen(true);
    const open = world.moveCapsule(
      new Vector3(GATE_LINE_X - 1.2, CONCOURSE_Y, GATE_Z[0]),
      new Vector3(2.4, 0, 0),
      0.3,
      1.8,
    );
    expect(open.position.x).toBeGreaterThan(GATE_LINE_X + 0.5);
  });

  it('exposes a descending escalator into the void', () => {
    const { concourse } = build();
    expect(concourse.escalators.length).toBe(2);
    const [west] = concourse.escalators;
    expect(west.direction.x).toBeGreaterThan(0);
    expect(west.direction.y).toBeLessThan(0);
    expect(west.footprint.minX).toBeCloseTo(VOID_X0, 2);
  });
});
