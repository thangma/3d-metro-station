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

export const GATE_AISLE = 0.9;
export const GATE_HEIGHT = 1.0;
export const GATE_PEDESTAL_DEPTH = 0.65;
export const GATE_LENGTH = 1.2;

/**
 * Ticket gate with its aisle along X and pedestals either side in Z. The two
 * flap leaves live in a `flaps` group; callers rotate `flap-left` and
 * `flap-right` about Y to open the aisle.
 */
export function buildGate(materials?: MaterialLibrary): Kit {
  const group = new Group();
  group.name = 'gate';

  const steel = materials?.paintedSteel ?? FALLBACK_STEEL;
  const aluminium = materials?.brushedAluminium ?? FALLBACK_ALUMINIUM;
  const rubber = materials?.rubber ?? FALLBACK_RUBBER;

  const pedestalGeometry = new BoxGeometry(
    GATE_LENGTH,
    GATE_HEIGHT,
    GATE_PEDESTAL_DEPTH,
  );

  for (const side of [-1, 1]) {
    const z = side * (GATE_AISLE / 2 + GATE_PEDESTAL_DEPTH / 2);

    const body = new Mesh(pedestalGeometry, steel);
    body.position.set(0, GATE_HEIGHT / 2, z);
    body.castShadow = true;
    group.add(body);

    const cap = new Mesh(
      new BoxGeometry(GATE_LENGTH + 0.04, 0.05, GATE_PEDESTAL_DEPTH + 0.04),
      aluminium,
    );
    cap.position.set(0, GATE_HEIGHT + 0.025, z);
    group.add(cap);

    const reader = new Mesh(new BoxGeometry(0.26, 0.02, 0.22), aluminium);
    reader.position.set(-0.2, GATE_HEIGHT + 0.06, z);
    group.add(reader);

    // Flap leaf hinged on the pedestal, reaching across half the aisle.
    const hinge = new Group();
    hinge.name = side > 0 ? 'flap-right' : 'flap-left';
    hinge.position.set(0, 0.55, side * (GATE_AISLE / 2));

    const leaf = new Mesh(new BoxGeometry(0.05, 0.6, GATE_AISLE / 2), rubber);
    leaf.position.set(0, 0, -side * (GATE_AISLE / 4));
    hinge.add(leaf);
    group.add(hinge);
  }

  const status = new Mesh(
    new BoxGeometry(0.1, 0.04, 0.3),
    new MeshStandardMaterial({
      color: 0x0d1a14,
      emissive: 0x2fbf7c,
      emissiveIntensity: 1.8,
    }),
  );
  status.position.set(-0.3, GATE_HEIGHT + 0.045, 0);
  group.add(status);

  const colliders: BoxSpec[] = [-1, 1].map((side) => {
    const z = side * (GATE_AISLE / 2 + GATE_PEDESTAL_DEPTH / 2);
    return {
      min: new Vector3(-GATE_LENGTH / 2, 0, z - GATE_PEDESTAL_DEPTH / 2),
      max: new Vector3(GATE_LENGTH / 2, GATE_HEIGHT, z + GATE_PEDESTAL_DEPTH / 2),
    };
  });

  return { group, colliders };
}

/** Collider for the closed leaves, spanning the aisle. */
export function gateFlapBox(): BoxSpec {
  return {
    min: new Vector3(-0.05, 0, -GATE_AISLE / 2),
    max: new Vector3(0.05, 0.85, GATE_AISLE / 2),
  };
}

const FALLBACK_STEEL = new MeshStandardMaterial({
  color: 0x9aa3a6,
  metalness: 0.5,
  roughness: 0.45,
});

const FALLBACK_ALUMINIUM = new MeshStandardMaterial({
  color: 0xc3cacd,
  metalness: 0.85,
  roughness: 0.3,
});

const FALLBACK_RUBBER = new MeshStandardMaterial({
  color: 0x24282a,
  metalness: 0.05,
  roughness: 0.9,
});
