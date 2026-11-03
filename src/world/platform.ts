import {
  Box3,
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Vector3,
  type Scene,
} from 'three';
import type { BoxSpec, CollisionWorld } from '../core/CollisionWorld';
import type { MaterialLibrary } from './kit/materials';
import type { InteractionSystem } from '../systems/InteractionSystem';
import {
  BOX_HALF_LENGTH,
  PLATFORM_CEILING,
  PLATFORM_HALF_WIDTH,
  PLATFORM_X0,
  PLATFORM_X1,
  PLATFORM_Y,
  PSD_BAY_WIDTH,
  TRACK_WIDTH,
  psdBayCenters,
} from './layout';
import { buildBench } from './kit/bench';
import { buildSign } from './kit/signage';

export interface PlatformResult {
  psdOpen: number;
  setPsdOpen(v: number): void;
  doorZones: Box3[];
  update(dt: number): void;
}

export const TRACKBED_Y = -17.05;

export function buildPlatform(
  scene: Scene,
  world: CollisionWorld,
  materials: MaterialLibrary,
  _interaction: InteractionSystem,
): PlatformResult {
  const group = new Group();
  group.name = 'platform';

  buildIslandSlab(group, world, materials);
  buildTrackbeds(group, world, materials);
  buildColumnsAndCeiling(group, world, materials);
  buildFurnitureAndPortals(group, world, materials);

  const { doorZones, psdColliders, leftLeaves, rightLeaves } = buildPsdBays(
    group,
    world,
    materials,
  );

  scene.add(group);

  let openAmount = 0;
  let targetOpen = 0;
  let activeColliders: BoxSpec[] = [...psdColliders];

  const syncColliders = (isOpen: boolean): void => {
    if (isOpen) {
      for (const box of activeColliders) {
        world.removeBox(box);
      }
      activeColliders = [];
    } else if (activeColliders.length === 0) {
      activeColliders = psdColliders.map((box) =>
        world.addBox(box.min, box.max),
      );
    }
  };

  const applyLeaves = (amount: number): void => {
    const slide = amount * 0.7;
    for (const leaf of leftLeaves) {
      leaf.position.x = -0.45 - slide;
    }
    for (const leaf of rightLeaves) {
      leaf.position.x = 0.45 + slide;
    }
  };

  const setPsdOpen = (v: number): void => {
    targetOpen = Math.max(0, Math.min(1, v));
    if (targetOpen > 0.5 && activeColliders.length > 0) {
      syncColliders(true);
    } else if (targetOpen <= 0.5 && activeColliders.length === 0) {
      syncColliders(false);
    }
    if (v === 0 || v === 1) {
      openAmount = targetOpen;
      applyLeaves(openAmount);
    }
  };

  return {
    get psdOpen() {
      return openAmount;
    },
    setPsdOpen,
    doorZones,
    update(dt: number) {
      if (openAmount === targetOpen) return;
      const speed = 1.0;
      const step = speed * dt;
      if (openAmount < targetOpen) {
        openAmount = Math.min(targetOpen, openAmount + step);
      } else {
        openAmount = Math.max(targetOpen, openAmount - step);
      }
      applyLeaves(openAmount);
      if (openAmount > 0.5 && activeColliders.length > 0) {
        syncColliders(true);
      } else if (openAmount <= 0.5 && activeColliders.length === 0) {
        syncColliders(false);
      }
    },
  };
}

function buildIslandSlab(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  const length = PLATFORM_X1 - PLATFORM_X0;
  const width = PLATFORM_HALF_WIDTH * 2;
  const thickness = 0.4;

  const slab = new Mesh(
    new BoxGeometry(length, thickness, width),
    materials.terrazzo,
  );
  slab.position.set((PLATFORM_X0 + PLATFORM_X1) / 2, PLATFORM_Y - thickness / 2, 0);
  slab.receiveShadow = true;
  group.add(slab);

  world.addBox(
    new Vector3(PLATFORM_X0, PLATFORM_Y - thickness, -PLATFORM_HALF_WIDTH),
    new Vector3(PLATFORM_X1, PLATFORM_Y, PLATFORM_HALF_WIDTH),
  );

  const centers = psdBayCenters();
  for (const side of [-1, 1]) {
    const z = side * PLATFORM_HALF_WIDTH;
    const tactile = new Mesh(
      new BoxGeometry(length, 0.01, 0.4),
      materials.tactilePaving,
    );
    tactile.position.set(0, PLATFORM_Y + 0.005, z - side * 0.2);
    group.add(tactile);

    const firstBayX0 = centers[0] - PSD_BAY_WIDTH / 2;
    const lastBayX1 = centers[centers.length - 1] + PSD_BAY_WIDTH / 2;

    world.addBox(
      new Vector3(PLATFORM_X0, PLATFORM_Y, z - 0.1),
      new Vector3(firstBayX0, PLATFORM_Y + 2.6, z + 0.1),
    );
    world.addBox(
      new Vector3(lastBayX1, PLATFORM_Y, z - 0.1),
      new Vector3(PLATFORM_X1, PLATFORM_Y + 2.6, z + 0.1),
    );

    for (let i = 0; i < centers.length - 1; i++) {
      const bayEndX = centers[i] + PSD_BAY_WIDTH / 2;
      const nextBayStartX = centers[i + 1] - PSD_BAY_WIDTH / 2;
      world.addBox(
        new Vector3(bayEndX, PLATFORM_Y, z - 0.06),
        new Vector3(nextBayStartX, PLATFORM_Y + 2.6, z + 0.06),
      );
    }
  }

  // Instanced fixed screens between bays
  const screenLen = centers[1] - centers[0] - PSD_BAY_WIDTH;
  const screenGeom = new BoxGeometry(screenLen, 2.6, 0.06);
  const fixedScreens = new InstancedMesh(screenGeom, materials.psdGlass, (centers.length - 1) * 2);
  const screenMat = new Matrix4();
  let screenIdx = 0;
  for (const side of [-1, 1]) {
    const z = side * PLATFORM_HALF_WIDTH;
    for (let i = 0; i < centers.length - 1; i++) {
      const midX = (centers[i] + centers[i + 1]) / 2;
      screenMat.makeTranslation(midX, PLATFORM_Y + 1.3, z);
      fixedScreens.setMatrixAt(screenIdx++, screenMat);
    }
  }
  group.add(fixedScreens);

  for (const endX of [PLATFORM_X0, PLATFORM_X1]) {
    const wall = new Mesh(
      new BoxGeometry(0.4, 6.55, width),
      materials.concrete,
    );
    wall.position.set(endX, PLATFORM_Y + 6.55 / 2, 0);
    group.add(wall);
    world.addBox(
      new Vector3(endX - 0.2, PLATFORM_Y, -PLATFORM_HALF_WIDTH),
      new Vector3(endX + 0.2, PLATFORM_CEILING, PLATFORM_HALF_WIDTH),
    );
  }
}

function buildTrackbeds(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  const length = BOX_HALF_LENGTH * 2;
  const trackbedThickness = 0.5;

  for (const side of [-1, 1]) {
    const trackCenterZ = side * (PLATFORM_HALF_WIDTH + TRACK_WIDTH / 2);

    const bed = new Mesh(
      new BoxGeometry(length, trackbedThickness, TRACK_WIDTH),
      materials.concrete,
    );
    bed.position.set(0, TRACKBED_Y - trackbedThickness / 2, trackCenterZ);
    bed.receiveShadow = true;
    group.add(bed);

    world.addBox(
      new Vector3(-BOX_HALF_LENGTH, TRACKBED_Y - trackbedThickness, trackCenterZ - TRACK_WIDTH / 2),
      new Vector3(BOX_HALF_LENGTH, TRACKBED_Y, trackCenterZ + TRACK_WIDTH / 2),
    );

    for (const railOffset of [-0.7175, 0.7175]) {
      const rail = new Mesh(
        new BoxGeometry(length, 0.15, 0.08),
        materials.paintedSteel,
      );
      rail.position.set(0, TRACKBED_Y + 0.075, trackCenterZ + railOffset);
      group.add(rail);
    }

    const outerWallZ = side * (PLATFORM_HALF_WIDTH + TRACK_WIDTH + 1.95);
    const outerWall = new Mesh(
      new BoxGeometry(length, 6.55, 0.4),
      materials.concrete,
    );
    outerWall.position.set(0, TRACKBED_Y + 6.55 / 2, outerWallZ);
    group.add(outerWall);
    world.addBox(
      new Vector3(-BOX_HALF_LENGTH, TRACKBED_Y, outerWallZ - 0.2),
      new Vector3(BOX_HALF_LENGTH, PLATFORM_CEILING, outerWallZ + 0.2),
    );
  }
}

function buildColumnsAndCeiling(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  const columnZ = [-4.5, 4.5];
  const xCoords: number[] = [];
  for (let x = -48; x <= 48; x += 9.6) {
    xCoords.push(x);
  }

  const totalCols = columnZ.length * xCoords.length;
  const colHeight = 6.55;
  const colGeom = new BoxGeometry(0.8, colHeight, 0.8);
  const colMesh = new InstancedMesh(colGeom, materials.paintedSteel, totalCols);
  const colMatrix = new Matrix4();
  let colIdx = 0;

  for (const z of columnZ) {
    for (const x of xCoords) {
      colMatrix.makeTranslation(x, PLATFORM_Y + colHeight / 2, z);
      colMesh.setMatrixAt(colIdx++, colMatrix);
      world.addBox(
        new Vector3(x - 0.5, PLATFORM_Y, z - 0.5),
        new Vector3(x + 0.5, PLATFORM_CEILING, z + 0.5),
      );
    }
  }
  group.add(colMesh);

  const stripGeometry = new BoxGeometry(0.28, 0.06, 2.6);
  const rows = [-4.5, 0, 4.5];
  const perRow = 20;
  const strips = new InstancedMesh(stripGeometry, materials.ledStrip, rows.length * perRow);
  const stripMatrix = new Matrix4();
  let index = 0;
  for (const z of rows) {
    for (let i = 0; i < perRow; i += 1) {
      const x = -50 + i * 5.2;
      stripMatrix.makeTranslation(x, PLATFORM_CEILING - 0.06, z);
      strips.setMatrixAt(index, stripMatrix);
      index += 1;
    }
  }
  group.add(strips);
}

function buildFurnitureAndPortals(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  for (const x of [-35, -15, 15, 35]) {
    const bench = buildBench(materials);
    bench.group.position.set(x, PLATFORM_Y, 0);
    group.add(bench.group);
    for (const collider of bench.colliders) {
      world.addBox(
        new Vector3(collider.min.x + x, collider.min.y + PLATFORM_Y, collider.min.z),
        new Vector3(collider.max.x + x, collider.max.y + PLATFORM_Y, collider.max.z),
      );
    }
  }

  const sign = buildSign('GA TRUNG TÂM', 'Central Station', { width: 3.5, height: 0.8 }, materials);
  sign.group.position.set(22, PLATFORM_Y + 3.2, 0);
  group.add(sign.group);

  for (const side of [-1, 1]) {
    for (const dir of [-1, 1]) {
      const trackCenterZ = side * (PLATFORM_HALF_WIDTH + TRACK_WIDTH / 2);
      const portalX = dir * BOX_HALF_LENGTH;
      const portal = new Mesh(
        new BoxGeometry(0.6, 6.55, TRACK_WIDTH + 1),
        materials.concrete,
      );
      portal.position.set(portalX, TRACKBED_Y + 6.55 / 2, trackCenterZ);
      group.add(portal);
      world.addBox(
        new Vector3(portalX - 0.3, TRACKBED_Y, trackCenterZ - TRACK_WIDTH / 2 - 0.5),
        new Vector3(portalX + 0.3, PLATFORM_CEILING, trackCenterZ + TRACK_WIDTH / 2 + 0.5),
      );
    }
  }
}

function buildPsdBays(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): {
  doorZones: Box3[];
  psdColliders: BoxSpec[];
  leftLeaves: Mesh[];
  rightLeaves: Mesh[];
} {
  const doorZones: Box3[] = [];
  const psdColliders: BoxSpec[] = [];
  const leftLeaves: Mesh[] = [];
  const rightLeaves: Mesh[] = [];
  const centers = psdBayCenters();
  const totalBays = centers.length * 2;

  const frameWidth = 0.1;
  const height = 2.6;
  const thickness = 0.06;

  const postGeom = new BoxGeometry(frameWidth, height, thickness * 1.6);
  const headerGeom = new BoxGeometry(PSD_BAY_WIDTH, 0.18, thickness * 1.6);
  const sillGeom = new BoxGeometry(PSD_BAY_WIDTH, 0.08, 0.24);

  const postsMesh = new InstancedMesh(postGeom, materials.paintedSteel, totalBays * 2);
  const headersMesh = new InstancedMesh(headerGeom, materials.paintedSteel, totalBays);
  const sillsMesh = new InstancedMesh(sillGeom, materials.paintedSteel, totalBays);

  const mat = new Matrix4();
  let postIdx = 0;
  let bayIdx = 0;

  const leafWidth = (PSD_BAY_WIDTH - frameWidth * 2) / 2;
  const leafGeom = new BoxGeometry(leafWidth, height, thickness);

  for (const side of [-1, 1]) {
    const z = side * PLATFORM_HALF_WIDTH;
    for (const x of centers) {
      for (const pSide of [-1, 1]) {
        mat.makeTranslation(x + pSide * (PSD_BAY_WIDTH / 2 - frameWidth / 2), PLATFORM_Y + height / 2, z);
        postsMesh.setMatrixAt(postIdx++, mat);
      }
      mat.makeTranslation(x, PLATFORM_Y + height + 0.09, z);
      headersMesh.setMatrixAt(bayIdx, mat);
      mat.makeTranslation(x, PLATFORM_Y + 0.04, z);
      sillsMesh.setMatrixAt(bayIdx, mat);
      bayIdx++;

      const left = new Mesh(leafGeom, materials.psdGlass);
      left.position.set(x - 0.45, PLATFORM_Y + height / 2, z);
      left.name = 'psd-leaf-left';
      group.add(left);
      leftLeaves.push(left);

      const right = new Mesh(leafGeom, materials.psdGlass);
      right.position.set(x + 0.45, PLATFORM_Y + height / 2, z);
      right.name = 'psd-leaf-right';
      group.add(right);
      rightLeaves.push(right);

      const colliderBox: BoxSpec = {
        min: new Vector3(x - PSD_BAY_WIDTH / 2, PLATFORM_Y, z - 0.08),
        max: new Vector3(x + PSD_BAY_WIDTH / 2, PLATFORM_Y + 2.6, z + 0.08),
      };
      const added = world.addBox(colliderBox.min, colliderBox.max);
      psdColliders.push(added);

      doorZones.push(
        new Box3(
          new Vector3(x - PSD_BAY_WIDTH / 2, PLATFORM_Y, z - 0.6),
          new Vector3(x + PSD_BAY_WIDTH / 2, PLATFORM_Y + 2.6, z + 0.6),
        ),
      );
    }
  }

  group.add(postsMesh, headersMesh, sillsMesh);

  return { doorZones, psdColliders, leftLeaves, rightLeaves };
}
