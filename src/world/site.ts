import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Scene,
} from 'three';
import type { CollisionWorld } from '../core/CollisionWorld';
import {
  BOX_HALF_LENGTH,
  BOX_HALF_WIDTH,
  PAVILION_X,
  SITE_HALF_LENGTH,
} from './layout';
import type { MaterialLibrary } from './kit/materials';
import {
  ESCALATOR_HALF_WIDTH,
  ESCALATOR_X_OFFSET,
  SHAFT_X0,
  SHAFT_X1,
  STAIR_BOTTOM_Z,
  STAIR_HALF_WIDTH,
  STAIR_TOP_Z,
  STAIR_X_OFFSET,
} from './pavilion';

const SIDEWALK_DEPTH = 7;
const ROAD_DEPTH = 30;
const KERB_HEIGHT = 0.15;

/**
 * Street level at Y = 0: plaza roof over the station box, sidewalks either
 * side, a 30 m roadway, and the furniture that frames the walk to the
 * pavilion. Street furniture is instanced to keep draw calls low.
 */
export function buildSite(
  scene: Scene,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  const group = new Group();
  group.name = 'site';

  buildRoof(group, world, materials);
  buildSidewalk(group, world, materials, 1);
  buildSidewalk(group, world, materials, -1);
  buildTrees(group, world, materials);
  buildBollards(group, world, materials);
  buildVents(group, world, materials);
  buildLamps(group, materials);
  buildBackdrop(group);

  scene.add(group);
}

/** Station roof at street level, with the pavilion shaft cut out of it. */
function buildRoof(group: Group, world: CollisionWorld, materials: MaterialLibrary): void {
  const y0 = -0.5;
  const y1 = 0;
  const z0 = -BOX_HALF_WIDTH;
  const z1 = BOX_HALF_WIDTH;

  const addSlab = (x0: number, x1: number, zMin: number, zMax: number): void => {
    if (x1 - x0 <= 0.001 || zMax - zMin <= 0.001) return;
    const slab = new Mesh(
      new BoxGeometry(x1 - x0, y1 - y0, zMax - zMin),
      materials.concrete,
    );
    slab.position.set((x0 + x1) / 2, (y0 + y1) / 2, (zMin + zMax) / 2);
    slab.receiveShadow = true;
    group.add(slab);
    world.addBox(new Vector3(x0, y0, zMin), new Vector3(x1, y1, zMax));
  };

  addSlab(-BOX_HALF_LENGTH, SHAFT_X0, z0, z1);
  addSlab(SHAFT_X1, BOX_HALF_LENGTH, z0, z1);
  addSlab(SHAFT_X0, SHAFT_X1, STAIR_TOP_Z, z1);
  addSlab(SHAFT_X0, SHAFT_X1, z0, STAIR_BOTTOM_Z);

  // Narrow ribs bridge the well between the stair and escalator slots.
  addSlab(SHAFT_X0, PAVILION_X + STAIR_X_OFFSET - STAIR_HALF_WIDTH, STAIR_BOTTOM_Z, STAIR_TOP_Z);
  addSlab(
    PAVILION_X + STAIR_X_OFFSET + STAIR_HALF_WIDTH,
    PAVILION_X + ESCALATOR_X_OFFSET - ESCALATOR_HALF_WIDTH,
    STAIR_BOTTOM_Z,
    STAIR_TOP_Z,
  );
  addSlab(
    PAVILION_X + ESCALATOR_X_OFFSET + ESCALATOR_HALF_WIDTH,
    SHAFT_X1,
    STAIR_BOTTOM_Z,
    STAIR_TOP_Z,
  );

  // Parapet along the roof edge, broken at the pavilion entrances.
  for (const z of [z0, z1]) {
    const segments: Array<[number, number]> = [
      [-BOX_HALF_LENGTH, SHAFT_X0 + 0.5],
      [SHAFT_X1 - 0.5, BOX_HALF_LENGTH],
    ];
    for (const [x0, x1] of segments) {
      const parapet = new Mesh(
        new BoxGeometry(x1 - x0, 0.5, 0.3),
        materials.concrete,
      );
      parapet.position.set((x0 + x1) / 2, 0.25, z);
      group.add(parapet);
      world.addBox(
        new Vector3(x0, 0, z - 0.15),
        new Vector3(x1, 0.5, z + 0.15),
      );
    }
  }
}

function buildSidewalk(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
  side: 1 | -1,
): void {
  const s = side;
  const inner = BOX_HALF_WIDTH * s;
  const outer = (BOX_HALF_WIDTH + SIDEWALK_DEPTH) * s;

  const walk = new Mesh(
    new BoxGeometry(SITE_HALF_LENGTH * 2, 0.3, SIDEWALK_DEPTH),
    materials.terrazzo,
  );
  walk.position.set(0, -0.15, (inner + outer) / 2);
  walk.receiveShadow = true;
  group.add(walk);
  world.addBox(
    new Vector3(-SITE_HALF_LENGTH, -1, Math.min(inner, outer)),
    new Vector3(SITE_HALF_LENGTH, 0, Math.max(inner, outer)),
  );

  // Tactile guidance strip runs the length of the pavement.
  const tactile = new Mesh(
    new BoxGeometry(SITE_HALF_LENGTH * 2, 0.02, 0.6),
    materials.tactilePaving,
  );
  tactile.position.set(0, 0.011, inner + s * 2.4);
  group.add(tactile);

  // Kerb and roadway.
  const kerbZ = (BOX_HALF_WIDTH + SIDEWALK_DEPTH) * s;
  const kerb = new Mesh(
    new BoxGeometry(SITE_HALF_LENGTH * 2, KERB_HEIGHT + 0.05, 0.3),
    materials.concrete,
  );
  kerb.position.set(0, (KERB_HEIGHT + 0.05) / 2 - 0.05, kerbZ);
  group.add(kerb);
  world.addBox(
    new Vector3(-SITE_HALF_LENGTH, -0.6, kerbZ - 0.15),
    new Vector3(SITE_HALF_LENGTH, KERB_HEIGHT, kerbZ + 0.15),
  );

  const roadZ = kerbZ + s * 1;
  const roadOuter = kerbZ + s * (ROAD_DEPTH + 1);
  const road = new Mesh(
    new BoxGeometry(SITE_HALF_LENGTH * 2, 0.2, ROAD_DEPTH),
    new MeshStandardMaterial({ color: 0x24272b, roughness: 0.96, metalness: 0.02 }),
  );
  road.position.set(0, -0.25, (roadZ + roadOuter) / 2);
  road.receiveShadow = true;
  group.add(road);
  world.addBox(
    new Vector3(-SITE_HALF_LENGTH, -1.5, Math.min(roadZ, roadOuter)),
    new Vector3(SITE_HALF_LENGTH, -0.15, Math.max(roadZ, roadOuter)),
  );

  // Lane markings (instanced).
  const markingGeometry = new BoxGeometry(3, 0.02, 0.16);
  const markingMaterial = new MeshStandardMaterial({ color: 0xd8d3c0, roughness: 0.9 });
  const laneZ = [kerbZ + s * 10, kerbZ + s * 20];
  const xValues: number[] = [];
  for (let x = -SITE_HALF_LENGTH + 4; x < SITE_HALF_LENGTH; x += 8) {
    xValues.push(x);
  }
  const markings = new InstancedMesh(markingGeometry, markingMaterial, laneZ.length * xValues.length);
  const markMat = new Matrix4();
  let markIdx = 0;
  for (const z of laneZ) {
    for (const x of xValues) {
      markMat.makeTranslation(x, -0.139, z);
      markings.setMatrixAt(markIdx++, markMat);
    }
  }
  group.add(markings);
}

function buildTrees(group: Group, world: CollisionWorld, materials: MaterialLibrary): void {
  const positions: Array<[number, number]> = [];
  for (let x = -90; x <= 90; x += 15) {
    positions.push([x, BOX_HALF_WIDTH + 3.5]);
    positions.push([x, -BOX_HALF_WIDTH - 3.5]);
  }

  const trunkGeometry = new CylinderGeometry(0.16, 0.2, 2.8, 7);
  const trunkMaterial = new MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 });
  const canopyGeometry = new SphereGeometry(1.7, 9, 7);
  const canopyMaterial = new MeshStandardMaterial({ color: 0x27503a, roughness: 0.85 });
  const pitGeom = new BoxGeometry(1.6, 0.04, 1.6);

  const trunks = new InstancedMesh(trunkGeometry, trunkMaterial, positions.length);
  const canopies = new InstancedMesh(canopyGeometry, canopyMaterial, positions.length);
  const pits = new InstancedMesh(pitGeom, materials.concrete, positions.length);
  const matrix = new Matrix4();

  positions.forEach(([x, z], index) => {
    matrix.makeTranslation(x, 1.4, z);
    trunks.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, 3.6, z);
    canopies.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, 0.02, z);
    pits.setMatrixAt(index, matrix);

    world.addBox(
      new Vector3(x - 0.25, 0, z - 0.25),
      new Vector3(x + 0.25, 2.8, z + 0.25),
    );
  });

  trunks.castShadow = true;
  canopies.castShadow = true;
  group.add(trunks, canopies, pits);
}

function buildBollards(group: Group, world: CollisionWorld, materials: MaterialLibrary): void {
  const positions: Array<[number, number]> = [];
  for (let x = -92; x <= 92; x += 8) {
    positions.push([x, BOX_HALF_WIDTH + 0.9]);
    positions.push([x, -BOX_HALF_WIDTH - 0.9]);
  }
  const geometry = new CylinderGeometry(0.1, 0.12, 0.95, 8);
  const mesh = new InstancedMesh(geometry, materials.brushedAluminium, positions.length);
  const matrix = new Matrix4();

  positions.forEach(([x, z], index) => {
    matrix.makeTranslation(x, 0.475, z);
    mesh.setMatrixAt(index, matrix);
    world.addBox(
      new Vector3(x - 0.14, 0, z - 0.14),
      new Vector3(x + 0.14, 0.95, z + 0.14),
    );
  });

  mesh.castShadow = true;
  group.add(mesh);
}

function buildVents(group: Group, world: CollisionWorld, materials: MaterialLibrary): void {
  const ventPositions: Array<[number, number]> = [];
  for (const side of [1, -1]) {
    for (const x of [-70, 0, 70]) {
      ventPositions.push([x, side * (BOX_HALF_WIDTH + 2.2)]);
    }
  }

  const ventGeom = new BoxGeometry(6, 0.9, 1.6);
  const grilleGeom = new BoxGeometry(5.2, 0.06, 1.2);
  const grilleMat = new MeshStandardMaterial({ color: 0x171b1d, roughness: 0.8 });

  const vents = new InstancedMesh(ventGeom, materials.concrete, ventPositions.length);
  const grilles = new InstancedMesh(grilleGeom, grilleMat, ventPositions.length);
  const vMat = new Matrix4();

  ventPositions.forEach(([x, z], idx) => {
    vMat.makeTranslation(x, 0.45, z);
    vents.setMatrixAt(idx, vMat);

    vMat.makeTranslation(x, 0.92, z);
    grilles.setMatrixAt(idx, vMat);

    world.addBox(
      new Vector3(x - 3, 0, z - 0.8),
      new Vector3(x + 3, 0.9, z + 0.8),
    );
  });

  group.add(vents, grilles);
}

function buildLamps(group: Group, materials: MaterialLibrary): void {
  const poleMaterial = materials.paintedSteel;
  const headMaterial = new MeshStandardMaterial({
    color: 0x1a1a18,
    emissive: 0xffe7bd,
    emissiveIntensity: 1.4,
  });

  const positions: Array<[number, number]> = [];
  for (const side of [1, -1]) {
    for (let x = -75; x <= 75; x += 30) {
      positions.push([x, side]);
    }
  }

  const poleGeom = new CylinderGeometry(0.07, 0.09, 6.4, 8);
  const headGeom = new BoxGeometry(0.7, 0.12, 0.3);

  const poles = new InstancedMesh(poleGeom, poleMaterial, positions.length);
  const heads = new InstancedMesh(headGeom, headMaterial, positions.length);

  const mat = new Matrix4();
  positions.forEach(([x, side], idx) => {
    const z = side * (BOX_HALF_WIDTH + 6.5);
    mat.makeTranslation(x, 3.2, z);
    poles.setMatrixAt(idx, mat);

    mat.makeTranslation(x, 6.0, z - side * 1.3);
    heads.setMatrixAt(idx, mat);
  });

  group.add(poles, heads);
}

/** Low-detail city blocks behind the road, only for depth cues. */
function buildBackdrop(group: Group): void {
  const palette = [0x2a3038, 0x333a40, 0x262d33];
  for (const side of [1, -1]) {
    for (let i = 0; i < 9; i += 1) {
      const x = -88 + i * 22;
      const height = 12 + ((i * 7 + (side > 0 ? 3 : 0)) % 5) * 3.2;
      const width = 14 + ((i * 5) % 3) * 4;
      const block = new Mesh(
        new BoxGeometry(width, height, 16),
        new MeshStandardMaterial({
          color: palette[i % palette.length],
          roughness: 0.9,
          metalness: 0.05,
        }),
      );
      block.position.set(x, height / 2 - 0.2, side * (BOX_HALF_WIDTH + ROAD_DEPTH + 22));
      group.add(block);
    }
  }
}

/** Player spawn on the sidewalk in front of the entrance pavilion. */
export const STREET_SPAWN = new Vector3(PAVILION_X, 0, BOX_HALF_WIDTH + 2.5);

/** Where the pavilion's glazing meets the pavement. */
export const PAVILION_MOUTH = new Vector3(PAVILION_X, 0, BOX_HALF_WIDTH);
