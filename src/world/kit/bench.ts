import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { BoxSpec } from '../../core/CollisionWorld';
import type { MaterialLibrary } from './materials';
import { type Kit } from './types';

const SEAT_LENGTH = 2.4;
const SEAT_HEIGHT = 0.45;

/** Platform bench: seat slab, backrest, and steel legs. */
export function buildBench(materials?: MaterialLibrary): Kit {
  const group = new Group();
  group.name = 'bench';

  const steel = materials?.brushedAluminium ?? FALLBACK_STEEL;
  const seat = materials?.paintedSteel ?? FALLBACK_SEAT;

  const slab = new Mesh(new BoxGeometry(SEAT_LENGTH, 0.07, 0.42), seat);
  slab.position.set(0, SEAT_HEIGHT, 0);
  slab.castShadow = true;
  group.add(slab);

  const back = new Mesh(new BoxGeometry(SEAT_LENGTH, 0.34, 0.06), seat);
  back.position.set(0, SEAT_HEIGHT + 0.22, -0.2);
  group.add(back);

  const legGeometry = new CylinderGeometry(0.035, 0.035, SEAT_HEIGHT, 8);
  for (const x of [-SEAT_LENGTH / 2 + 0.22, SEAT_LENGTH / 2 - 0.22]) {
    for (const z of [-0.14, 0.14]) {
      const leg = new Mesh(legGeometry, steel);
      leg.position.set(x, SEAT_HEIGHT / 2, z);
      group.add(leg);
    }
  }

  const colliders: BoxSpec[] = [
    {
      min: new Vector3(-SEAT_LENGTH / 2, 0, -0.24),
      max: new Vector3(SEAT_LENGTH / 2, SEAT_HEIGHT + 0.4, 0.24),
    },
  ];

  return { group, colliders };
}

const FALLBACK_STEEL = new MeshStandardMaterial({
  color: 0xc3cacd,
  metalness: 0.8,
  roughness: 0.32,
});

const FALLBACK_SEAT = new MeshStandardMaterial({
  color: 0x4d5658,
  metalness: 0.25,
  roughness: 0.6,
});
