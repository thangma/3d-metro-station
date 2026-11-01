import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { BoxSpec } from '../../core/CollisionWorld';
import type { MaterialLibrary } from './materials';
import { type Kit } from './types';

const FALLBACK = new MeshStandardMaterial({ color: 0x8f989c, metalness: 0.35, roughness: 0.45 });

/** 6.75 m concourse column with plinth, shaft, and capital. */
export function buildColumn(materials?: MaterialLibrary): Kit {
  const material = materials?.paintedSteel ?? FALLBACK;
  const group = new Group();
  group.name = 'column';

  const plinth = new Mesh(new BoxGeometry(1.0, 0.15, 1.0), material);
  plinth.position.y = 0.075;
  plinth.castShadow = true;

  const shaft = new Mesh(new BoxGeometry(0.8, 6.45, 0.8), material);
  shaft.position.y = 0.15 + 6.45 / 2;

  const capital = new Mesh(new BoxGeometry(1.0, 0.15, 1.0), material);
  capital.position.y = 6.675;

  group.add(plinth, shaft, capital);

  const collider: BoxSpec = {
    min: new Vector3(-0.5, 0, -0.5),
    max: new Vector3(0.5, 6.75, 0.5),
  };

  return { group, colliders: [collider] };
}
