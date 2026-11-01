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

const GATE_WIDTH = 0.9;
const GATE_DEPTH = 2.2;
const PEDESTAL_HEIGHT = 1.0;

/**
 * One ticket gate: two pedestals with a flap leaf on each. Flaps live in a
 * `flaps` group so they can swing open on a 0→1 parameter.
 */
export function buildGate(materials?: MaterialLibrary): Kit {
  const group = new Group();
  group.name = 'gate';

  const steel = materials?.paintedSteel ?? FALLBACK_STEEL;
  const aluminium = materials?.brushedAluminium ?? FALLBACK_ALUMINIUM;
  const rubber = materials?.rubber ?? FALLBACK_RUBBER;

  const pedestal = new BoxGeometry(GATE_WIDTH, PEDESTAL_HEIGHT, GATE_DEPTH);

  for (const side of [-1, 1]) {
    const body = new Mesh(pedestal, steel);
    body.position.set(side * (GATE_WIDTH / 2 + 0.15), PEDESTAL_HEIGHT / 2, 0);
    body.castShadow = true;
    group.add(body);

    const cap = new Mesh(new BoxGeometry(GATE_WIDTH + 0.04, 0.05, GATE_DEPTH + 0.04), aluminium);
    cap.position.set(side * (GATE_WIDTH / 2 + 0.15), PEDESTAL_HEIGHT + 0.025, 0);
    group.add(cap);

    const reader = new Mesh(new BoxGeometry(0.26, 0.02, 0.26), aluminium);
    reader.position.set(side * (GATE_WIDTH / 2 + 0.15), PEDESTAL_HEIGHT + 0.06, -0.45);
    group.add(reader);
  }

  const flaps = new Group();
  flaps.name = 'flaps';
  for (const side of [-1, 1]) {
    const hinge = new Group();
    hinge.name = `flap-${side > 0 ? 'right' : 'left'}`;
    hinge.position.set(side * (GATE_WIDTH / 2 + 0.15), 0.55, GATE_DEPTH / 2 - 0.35);

    const leaf = new Mesh(new BoxGeometry(GATE_WIDTH * 0.42, 0.62, 0.04), rubber);
    leaf.position.set(-side * (GATE_WIDTH * 0.21), 0, 0);
    hinge.add(leaf);
    flaps.add(hinge);
  }
  group.add(flaps);

  const light = new Mesh(
    new BoxGeometry(0.14, 0.04, GATE_DEPTH * 0.5),
    new MeshStandardMaterial({ color: 0x0d1a14, emissive: 0x2fbf7c, emissiveIntensity: 1.6 }),
  );
  light.position.set(0, PEDESTAL_HEIGHT + 0.055, 0.2);
  group.add(light);

  const colliders: BoxSpec[] = [
    {
      min: new Vector3(-GATE_WIDTH - 0.15, 0, -GATE_DEPTH / 2),
      max: new Vector3(-0.15, PEDESTAL_HEIGHT, GATE_DEPTH / 2),
    },
    {
      min: new Vector3(0.15, 0, -GATE_DEPTH / 2),
      max: new Vector3(GATE_WIDTH + 0.15, PEDESTAL_HEIGHT, GATE_DEPTH / 2),
    },
  ];

  return { group, colliders };
}

/** The barrier line the player walks through at the concourse. */
export function buildGateBarrier(): Mesh {
  return new Mesh(
    new CylinderGeometry(0.03, 0.03, GATE_DEPTH * 0.9, 8),
    new MeshStandardMaterial({ color: 0xb9c2bf, metalness: 0.7, roughness: 0.35 }),
  );
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
