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

const RAIL_HEIGHT = 1.1;
const POST_SPACING = 2.4;

/**
 * Balustrade running along +X for `length` metres, centred on the origin.
 * Used around the concourse void and along platform edges.
 */
export function buildRailing(length: number, materials?: MaterialLibrary): Kit {
  const group = new Group();
  group.name = 'railing';

  const steel = materials?.paintedSteel ?? FALLBACK_STEEL;
  const glass = materials?.glass ?? FALLBACK_GLASS;

  const postGeometry = new CylinderGeometry(0.035, 0.035, RAIL_HEIGHT, 8);
  const postCount = Math.max(2, Math.round(length / POST_SPACING) + 1);
  const spacing = length / (postCount - 1);
  for (let i = 0; i < postCount; i += 1) {
    const post = new Mesh(postGeometry, steel);
    post.position.set(-length / 2 + i * spacing, RAIL_HEIGHT / 2, 0);
    group.add(post);
  }

  const topRail = new Mesh(new BoxGeometry(length, 0.07, 0.09), steel);
  topRail.position.set(0, RAIL_HEIGHT, 0);
  group.add(topRail);

  const infill = new Mesh(new BoxGeometry(length, RAIL_HEIGHT - 0.24, 0.02), glass);
  infill.position.set(0, (RAIL_HEIGHT - 0.24) / 2 + 0.1, 0);
  group.add(infill);

  const colliders: BoxSpec[] = [
    {
      min: new Vector3(-length / 2, 0, -0.12),
      max: new Vector3(length / 2, RAIL_HEIGHT, 0.12),
    },
  ];

  return { group, colliders };
}

const FALLBACK_STEEL = new MeshStandardMaterial({
  color: 0x9aa3a6,
  metalness: 0.55,
  roughness: 0.4,
});

const FALLBACK_GLASS = new MeshStandardMaterial({
  color: 0xbcd6e2,
  metalness: 0,
  roughness: 0.08,
  transparent: true,
  opacity: 0.22,
});
