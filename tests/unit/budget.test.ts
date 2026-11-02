import { describe, expect, it } from 'vitest';
import { Scene } from 'three';
import { CollisionWorld } from '../../src/core/CollisionWorld';
import { createMaterials } from '../../src/world/kit/materials';
import { InteractionSystem } from '../../src/systems/InteractionSystem';
import { buildConcourse } from '../../src/world/concourse';
import { buildPlatform } from '../../src/world/platform';
import { buildTrain } from '../../src/world/train';

describe('rendering budgets', () => {
  it('concourse, platform, and train triangle budget check', () => {
    const scene = new Scene();
    const world = new CollisionWorld();
    const interaction = new InteractionSystem();
    const materials = createMaterials();

    buildConcourse(scene, world, materials, interaction);
    buildPlatform(scene, world, materials, interaction);
    buildTrain(scene, materials);

    let totalTriangles = 0;
    scene.traverse((obj: any) => {
      if (obj.isMesh && obj.geometry) {
        const geom = obj.geometry;
        const count = geom.index ? geom.index.count / 3 : (geom.attributes.position?.count ?? 0) / 3;
        const instances = obj.count ?? 1;
        totalTriangles += count * instances;
      }
    });

    expect(totalTriangles).toBeLessThan(1_500_000);
    expect(totalTriangles).toBeGreaterThan(1_000);
  });
});
