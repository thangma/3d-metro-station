import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { BoxSpec } from '../../core/CollisionWorld';
import type { MaterialLibrary } from './materials';
import { type Kit } from './types';

export interface PsdBayOptions {
  /** Clear opening plus frame, in metres. */
  width?: number;
  height?: number;
  panelThickness?: number;
}

/**
 * One platform screen door bay centred on the group origin, spanning Z from
 * the platform edge outward. The two sliding leaves sit in `doors`, so callers
 * can animate them open; the returned colliders cover the closed leaves.
 */
export function buildPsdBay(options: PsdBayOptions = {}, materials?: MaterialLibrary): Kit {
  const width = options.width ?? 2.0;
  const height = options.height ?? 2.6;
  const thickness = options.panelThickness ?? 0.06;

  const steel = materials?.paintedSteel ?? FALLBACK_STEEL;
  const glass = materials?.psdGlass ?? FALLBACK_GLASS;
  const group = new Group();
  group.name = 'psd-bay';

  const frameWidth = 0.1;
  const leafWidth = (width - frameWidth * 2) / 2;
  const doors = new Group();
  doors.name = 'doors';

  for (const side of [-1, 1]) {
    // Each sliding leaf covers half the clear opening.
    const leaf = new Mesh(new BoxGeometry(leafWidth, height, thickness), glass);
    leaf.position.set(side * (leafWidth / 2), height / 2, 0);
    leaf.name = `psd-leaf-${side > 0 ? 'right' : 'left'}`;
    doors.add(leaf);

    const rail = new Mesh(new BoxGeometry(leafWidth, 0.06, thickness * 2), steel);
    rail.position.set(side * (leafWidth / 2), height - 0.03, 0);
    doors.add(rail);
  }

  group.add(doors);

  for (const side of [-1, 1]) {
    const post = new Mesh(new BoxGeometry(frameWidth, height, thickness * 1.6), steel);
    post.position.set(side * (width / 2 - frameWidth / 2), height / 2, 0);
    group.add(post);
  }

  const header = new Mesh(new BoxGeometry(width, 0.18, thickness * 1.6), steel);
  header.position.set(0, height + 0.09, 0);
  group.add(header);

  const sill = new Mesh(new BoxGeometry(width, 0.08, 0.24), steel);
  sill.position.set(0, 0.04, 0);
  group.add(sill);

  const colliders: BoxSpec[] = [
    {
      min: new Vector3(-width / 2, 0, -thickness),
      max: new Vector3(width / 2, height, thickness),
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
  color: 0xa8ccc6,
  metalness: 0,
  roughness: 0.1,
  transparent: true,
  opacity: 0.28,
});
