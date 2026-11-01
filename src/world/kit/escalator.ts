import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BoxSpec } from '../../core/CollisionWorld';
import type { MaterialLibrary } from './materials';
import { type Kit } from './types';

export interface EscalatorOptions {
  /** Horizontal travel in metres. */
  run: number;
  /** Vertical travel in metres. */
  rise: number;
  /** Clear width between balustrades in metres. */
  width: number;
}

const STEP_DEPTH = 0.4;
const BALUSTRADE_HEIGHT = 0.9;
const PANEL_THICKNESS = 0.06;
const HANDRAIL_SIZE = 0.08;

/**
 * Escalator kit built along +X: the underside starts at the group origin and
 * climbs to (run, rise). Callers place and rotate the group per bank.
 */
export function buildEscalator(options: EscalatorOptions, materials?: MaterialLibrary): Kit {
  const { run, rise, width } = options;
  const group = new Group();
  group.name = 'escalator';

  const steel = materials?.brushedAluminium ?? FALLBACK_STEEL;
  const handrail = materials?.rubber ?? FALLBACK_RUBBER;
  const stepMaterial = materials?.paintedSteel ?? FALLBACK_STEEL;

  // Balustrade side panels follow the incline; their top edge carries the handrail.
  const panelShape = new Shape();
  panelShape.moveTo(0, 0);
  panelShape.lineTo(run, rise);
  panelShape.lineTo(run, rise + BALUSTRADE_HEIGHT);
  panelShape.lineTo(0, BALUSTRADE_HEIGHT);
  panelShape.closePath();

  const panelGeometry = new ExtrudeGeometry(panelShape, {
    depth: PANEL_THICKNESS,
    bevelEnabled: false,
    curveSegments: 1,
  });
  panelGeometry.translate(0, 0, -PANEL_THICKNESS / 2);

  for (const side of [-1, 1]) {
    const panel = new Mesh(panelGeometry, steel);
    panel.position.z = side * (width / 2 + PANEL_THICKNESS / 2 + 0.01);
    panel.castShadow = true;
    panel.receiveShadow = true;
    group.add(panel);
  }

  // Handrail: a thin band riding the top of each balustrade.
  const railShape = new Shape();
  railShape.moveTo(0, BALUSTRADE_HEIGHT - 0.02);
  railShape.lineTo(run, rise + BALUSTRADE_HEIGHT - 0.02);
  railShape.lineTo(run, rise + BALUSTRADE_HEIGHT + HANDRAIL_SIZE);
  railShape.lineTo(0, BALUSTRADE_HEIGHT + HANDRAIL_SIZE);
  railShape.closePath();

  const railGeometry = new ExtrudeGeometry(railShape, {
    depth: HANDRAIL_SIZE,
    bevelEnabled: false,
    curveSegments: 1,
  });
  railGeometry.translate(0, 0, -HANDRAIL_SIZE / 2);

  for (const side of [-1, 1]) {
    const rail = new Mesh(railGeometry, handrail);
    rail.position.z = side * (width / 2 + PANEL_THICKNESS / 2 + 0.01);
    group.add(rail);
  }

  // Treads: one merged staircase so the whole run costs a single draw call.
  const stepCount = Math.max(2, Math.round(run / STEP_DEPTH));
  const stepLength = run / stepCount;
  const stepRise = rise / stepCount;
  const treads: BoxGeometry[] = [];
  for (let i = 0; i < stepCount; i += 1) {
    const tread = new BoxGeometry(stepLength, 0.12, width);
    tread.translate(i * stepLength + stepLength / 2, (i + 1) * stepRise - 0.06, 0);
    treads.push(tread);
  }
  const merged = mergeGeometries(treads, false);
  if (merged) {
    const steps = new Mesh(merged, stepMaterial);
    steps.receiveShadow = true;
    group.add(steps);
  }

  const colliders: BoxSpec[] = [
    {
      min: new Vector3(0, 0, width / 2),
      max: new Vector3(run, rise + BALUSTRADE_HEIGHT, width / 2 + 0.1),
    },
    {
      min: new Vector3(0, 0, -width / 2 - 0.1),
      max: new Vector3(run, rise + BALUSTRADE_HEIGHT, -width / 2),
    },
  ];

  return { group, colliders };
}

const FALLBACK_STEEL = new MeshStandardMaterial({
  color: 0x9aa3a6,
  metalness: 0.6,
  roughness: 0.42,
});

const FALLBACK_RUBBER = new MeshStandardMaterial({
  color: 0x24282a,
  metalness: 0.05,
  roughness: 0.92,
});
