import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  Vector3,
  type Scene,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CollisionWorld } from '../core/CollisionWorld';
import type { EscalatorSpec } from './layout';
import type { MaterialLibrary } from './kit/materials';
import { buildEscalator } from './kit/escalator';
import { buildSign } from './kit/signage';

export interface PavilionResult {
  stairTop: Vector3;
  stairBottom: Vector3;
  escalators: EscalatorSpec[];
}

export const PAVILION_HALF_WIDTH = 5;
export const STAIR_WIDTH = 3;
export const STAIR_RUN = 26;
export const STAIR_RISE = 10.6;
export const STAIR_TOP_Z = 11.5;
export const STAIR_BOTTOM_Z = -14.5;
export const STAIR_X_OFFSET = -3.2;
export const STAIR_HALF_WIDTH = STAIR_WIDTH / 2;
export const ESCALATOR_X_OFFSET = 0;
export const ESCALATOR_HALF_WIDTH = 0.7;
export const SHAFT_X0 = -35.2;
export const SHAFT_X1 = -29.0;

const LANDING_NEAR_Z = 13.8;
const FACADE_Z = 15;
const PAVILION_HEIGHT = 4.4;
const CLERESTORY_BASE = 2.2;

/**
 * Glazed entrance pavilion on one long side. `side: 1` faces +Z and carries
 * the real stair/escalator descent; `side: -1` is the matching sealed
 * enclosure, since only the passenger path is enterable.
 */
export function buildPavilion(
  scene: Scene,
  world: CollisionWorld,
  materials: MaterialLibrary,
  x: number,
  side: 1 | -1,
): PavilionResult {
  const s = side;
  const facadeZ = FACADE_Z * s;
  const landingNearZ = LANDING_NEAR_Z * s;
  const stairTopZ = STAIR_TOP_Z * s;
  const stairBottomZ = STAIR_BOTTOM_Z * s;

  const group = new Group();
  group.name = `pavilion-${s > 0 ? 'south' : 'north'}`;

  const landingDepth = Math.abs(landingNearZ - stairTopZ);
  const landing = new Mesh(
    new BoxGeometry(PAVILION_HALF_WIDTH * 2, 0.6, landingDepth),
    materials.terrazzo,
  );
  landing.position.set(
    x,
    0.3,
    (landingNearZ + stairTopZ) / 2,
  );
  landing.receiveShadow = true;
  group.add(landing);
  world.addBox(
    new Vector3(x - PAVILION_HALF_WIDTH, -0.05, Math.min(landingNearZ, stairTopZ)),
    new Vector3(x + PAVILION_HALF_WIDTH, 0.6, Math.max(landingNearZ, stairTopZ)),
  );

  // Entrance ramp from the sidewalk up to the 0.6 m landing.
  const rampRun = Math.abs(facadeZ - landingNearZ);
  const ramp = new Mesh(new BoxGeometry(6, 0.12, Math.hypot(rampRun, 0.6)), materials.terrazzo);
  ramp.position.set(x, 0.3, (facadeZ + landingNearZ) / 2);
  ramp.rotation.x = s * Math.atan2(0.6, rampRun);
  group.add(ramp);
  world.addRamp(
    x - 3,
    x + 3,
    facadeZ,
    landingNearZ,
    0,
    0.6,
    'z',
  );

  const stairX = x + STAIR_X_OFFSET;
  const escalatorX = x + ESCALATOR_X_OFFSET;

  if (s > 0) {
    group.add(buildStairFlight(STAIR_RUN, STAIR_RISE, STAIR_WIDTH, materials, stairX, stairBottomZ));

    const escalator = buildEscalator(
      { run: STAIR_RUN, rise: STAIR_RISE, width: 1.4 },
      materials,
    );
    escalator.group.position.set(escalatorX, -10, stairBottomZ);
    escalator.group.rotation.y = -s * (Math.PI / 2);
    group.add(escalator.group);

    // Walkable ramps for the flight and the escalator.
    world.addRamp(
      stairX - STAIR_HALF_WIDTH,
      stairX + STAIR_HALF_WIDTH,
      stairBottomZ,
      stairTopZ,
      -10,
      0.6,
      'z',
    );
    world.addRamp(
      escalatorX - ESCALATOR_HALF_WIDTH,
      escalatorX + ESCALATOR_HALF_WIDTH,
      stairBottomZ,
      stairTopZ,
      -10,
      0.6,
      'z',
    );

    // Shaft walls keep the player on the flight and off the escalator sides.
    for (const edge of [-1, 1]) {
      const wall = new Mesh(new BoxGeometry(0.16, 11.2, STAIR_RUN), materials.concrete);
      wall.position.set(
        stairX + edge * STAIR_HALF_WIDTH,
        -4.8,
        (stairTopZ + stairBottomZ) / 2,
      );
      group.add(wall);
      world.addBox(
        new Vector3(stairX + edge * STAIR_HALF_WIDTH - 0.1, -10.4, Math.min(stairTopZ, stairBottomZ)),
        new Vector3(stairX + edge * STAIR_HALF_WIDTH + 0.1, 1.2, Math.max(stairTopZ, stairBottomZ)),
      );
    }
    for (const edge of [-1, 1]) {
      const wallX = escalatorX + edge * (ESCALATOR_HALF_WIDTH + 0.08);
      world.addBox(
        new Vector3(wallX - 0.06, -10.4, Math.min(stairTopZ, stairBottomZ)),
        new Vector3(wallX + 0.06, 1.2, Math.max(stairTopZ, stairBottomZ)),
      );
    }

    // Parapets across the landing between the two travel strips.
    for (const [x0, x1] of [
      [x - PAVILION_HALF_WIDTH, stairX - STAIR_HALF_WIDTH],
      [stairX + STAIR_HALF_WIDTH, escalatorX - ESCALATOR_HALF_WIDTH],
      [escalatorX + ESCALATOR_HALF_WIDTH, x + PAVILION_HALF_WIDTH],
    ]) {
      if (x1 - x0 < 0.05) continue;
      const parapet = new Mesh(
        new BoxGeometry(x1 - x0, 1.1, 0.12),
        materials.glass,
      );
      parapet.position.set((x0 + x1) / 2, 0.6 + 0.55, stairTopZ);
      group.add(parapet);
      world.addBox(
        new Vector3(x0, 0.6, stairTopZ - 0.06),
        new Vector3(x1, 1.7, stairTopZ + 0.06),
      );
    }
  } else {
    // Sealed counterpart: glass across the stair edge, no descent.
    const seal = new Mesh(
      new BoxGeometry(PAVILION_HALF_WIDTH * 2, PAVILION_HEIGHT, 0.08),
      materials.glass,
    );
    seal.position.set(x, 0.6 + PAVILION_HEIGHT / 2, stairTopZ);
    group.add(seal);
    world.addBox(
      new Vector3(x - PAVILION_HALF_WIDTH, 0.6, stairTopZ - 0.06),
      new Vector3(x + PAVILION_HALF_WIDTH, 0.6 + PAVILION_HEIGHT, stairTopZ + 0.06),
    );
  }

  // Glazed enclosure: side walls, front wall with a door opening, flat roof.
  for (const wallX of [x - PAVILION_HALF_WIDTH, x + PAVILION_HALF_WIDTH]) {
    const wall = new Mesh(
      new BoxGeometry(0.08, PAVILION_HEIGHT, Math.abs(facadeZ - stairTopZ)),
      materials.glass,
    );
    wall.position.set(wallX, 0.6 + PAVILION_HEIGHT / 2, (facadeZ + stairTopZ) / 2);
    group.add(wall);
    world.addBox(
      new Vector3(wallX - 0.06, 0.6, Math.min(facadeZ, stairTopZ)),
      new Vector3(wallX + 0.06, 0.6 + PAVILION_HEIGHT, Math.max(facadeZ, stairTopZ)),
    );
  }

  const doorHalfWidth = 1.7;
  for (const side of [-1, 1]) {
    const panelWidth = PAVILION_HALF_WIDTH - doorHalfWidth;
    const panelHeight = PAVILION_HEIGHT - (CLERESTORY_BASE - 0.6);
    const panel = new Mesh(
      new BoxGeometry(panelWidth, panelHeight, 0.08),
      materials.glass,
    );
    panel.position.set(
      x + side * (doorHalfWidth + panelWidth / 2),
      CLERESTORY_BASE + panelHeight / 2,
      facadeZ,
    );
    group.add(panel);
    world.addBox(
      new Vector3(
        x + side * (doorHalfWidth + panelWidth / 2) - panelWidth / 2,
        CLERESTORY_BASE,
        facadeZ - 0.06,
      ),
      new Vector3(
        x + side * (doorHalfWidth + panelWidth / 2) + panelWidth / 2,
        0.6 + PAVILION_HEIGHT,
        facadeZ + 0.06,
      ),
    );
  }

  // Mullions.
  const mullionGeometry = new BoxGeometry(0.09, PAVILION_HEIGHT, 0.09);
  const mullionCount = 7;
  for (let i = 0; i < mullionCount; i += 1) {
    const t = i / (mullionCount - 1);
    const mullionX = x - PAVILION_HALF_WIDTH + t * PAVILION_HALF_WIDTH * 2;
    for (const z of [facadeZ, (facadeZ + stairTopZ) / 2]) {
      const mullion = new Mesh(mullionGeometry, materials.paintedSteel);
      mullion.position.set(mullionX, 0.6 + PAVILION_HEIGHT / 2, z);
      group.add(mullion);
    }
  }

  const roof = new Mesh(
    new BoxGeometry(PAVILION_HALF_WIDTH * 2 + 0.8, 0.35, Math.abs(facadeZ - stairTopZ) + 0.8),
    materials.concrete,
  );
  roof.position.set(x, 0.6 + PAVILION_HEIGHT + 0.175, (facadeZ + stairTopZ) / 2);
  roof.castShadow = true;
  group.add(roof);
  world.addBox(
    new Vector3(x - PAVILION_HALF_WIDTH - 0.4, 0.6 + PAVILION_HEIGHT, Math.min(facadeZ, stairTopZ) - 0.4),
    new Vector3(x + PAVILION_HALF_WIDTH + 0.4, 0.6 + PAVILION_HEIGHT + 0.35, Math.max(facadeZ, stairTopZ) + 0.4),
  );

  const sign = buildSign('LỐI XUỐNG GA', 'Entrance to the station', {
    width: 3.6,
    height: 0.75,
  }, materials);
  sign.group.position.set(x, 4.0, facadeZ + s * 0.09);
  if (s < 0) sign.group.rotation.y = Math.PI;
  group.add(sign.group);

  scene.add(group);

  const escalators: EscalatorSpec[] = s > 0
    ? [
        {
          position: new Vector3(escalatorX, 0.6, stairTopZ),
          direction: new Vector3(0, -STAIR_RISE, -s * STAIR_RUN).normalize(),
          speed: 0.65,
          footprint: {
            minX: escalatorX - ESCALATOR_HALF_WIDTH,
            maxX: escalatorX + ESCALATOR_HALF_WIDTH,
            minZ: Math.min(stairTopZ, stairBottomZ),
            maxZ: Math.max(stairTopZ, stairBottomZ),
            bottomY: 0.6,
            topY: -10,
          },
        },
      ]
    : [];

  return {
    stairTop: new Vector3(stairX, 0.6, stairTopZ),
    stairBottom: new Vector3(stairX, -10, stairBottomZ),
    escalators,
  };
}

/** Stepped flight built along +X, then rotated into place by the caller. */
function buildStairFlight(
  run: number,
  rise: number,
  width: number,
  materials: MaterialLibrary,
  worldX: number,
  bottomZ: number,
): Group {
  const group = new Group();
  group.name = 'stair-flight';

  const stepCount = Math.round(run / 0.3);
  const stepLength = run / stepCount;
  const stepRise = rise / stepCount;

  const treads: BoxGeometry[] = [];
  for (let i = 0; i < stepCount; i += 1) {
    const tread = new BoxGeometry(stepLength, 0.1, width);
    tread.translate(i * stepLength + stepLength / 2, (i + 0.5) * stepRise, 0);
    treads.push(tread);
  }
  const merged = mergeGeometries(treads, false);
  if (merged) {
    const mesh = new Mesh(merged, materials.terrazzo);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Stringers: a solid band under each edge of the flight.
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(run, rise);
  shape.lineTo(run, rise - 0.45);
  shape.lineTo(0, -0.45);
  shape.closePath();
  const stringerGeometry = new ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: false,
    curveSegments: 1,
  });
  stringerGeometry.translate(0, 0, -0.06);
  for (const edge of [-1, 1]) {
    const stringer = new Mesh(stringerGeometry, materials.paintedSteel);
    stringer.position.z = (edge * width) / 2;
    group.add(stringer);
  }

  group.position.set(worldX, -10, bottomZ);
  group.rotation.y = -Math.PI / 2;
  return group;
}
