import { Box3, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createMaterials } from '../../src/world/kit/materials';
import { psdBayCenters } from '../../src/world/layout';
import { buildTrain } from '../../src/world/train';

describe('five-car train assembly', () => {
  it('measures 108.6 m +/- 0.05 m in total length', () => {
    const scene = new Scene();
    const materials = createMaterials();
    const train = buildTrain(scene, materials);

    const bounds = new Box3().setFromObject(train.group);
    const length = bounds.max.x - bounds.min.x;
    expect(length).toBeCloseTo(108.6, 1);
  });

  it('moves all 40 door panels by >= 1.3 m on setDoorOpen(1)', () => {
    const scene = new Scene();
    const materials = createMaterials();
    const train = buildTrain(scene, materials);

    const initialPositions: Vector3[] = [];
    const doors: any[] = [];
    train.group.traverse((obj) => {
      if (obj.name.startsWith('train-door-leaf')) {
        doors.push(obj);
        initialPositions.push(obj.position.clone());
      }
    });

    expect(doors.length).toBe(40);

    train.setDoorOpen(1);

    for (let i = 0; i < doors.length; i++) {
      const dist = doors[i].position.distanceTo(initialPositions[i]);
      expect(dist).toBeGreaterThanOrEqual(1.3);
    }
  });

  it('aligns door X positions to the 20 PSD bay centres when train is at X = 0', () => {
    const scene = new Scene();
    const materials = createMaterials();
    const train = buildTrain(scene, materials);
    train.setPositionX(0);

    const bayCenters = psdBayCenters();
    const doorCentersX = new Set<number>();

    train.group.traverse((obj) => {
      if (obj.name.startsWith('train-doorway-')) {
        const worldPos = obj.getWorldPosition(new Vector3());
        doorCentersX.add(Math.round(worldPos.x * 10) / 10);
      }
    });

    expect(doorCentersX.size).toBe(20);
    for (const bayX of bayCenters) {
      const match = Array.from(doorCentersX).some((dx) => Math.abs(dx - bayX) < 0.1);
      expect(match).toBe(true);
    }
  });

  it('provides playerDoorway spanning one door opening at world scale', () => {
    const scene = new Scene();
    const materials = createMaterials();
    const train = buildTrain(scene, materials);

    const size = train.playerDoorway.getSize(new Vector3());
    expect(size.x).toBeGreaterThan(1.2);
    expect(size.x).toBeLessThan(2.5);
    expect(size.y).toBeGreaterThan(1.8);
    expect(size.z).toBeGreaterThan(0.5);
  });
});
