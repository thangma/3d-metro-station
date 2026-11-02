import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PointLight,
  Vector3,
  type Scene,
} from 'three';
import { Box3 } from 'three';
import type { MaterialLibrary } from './kit/materials';
import {
  CAR_COUNT,
  PLATFORM_HALF_WIDTH,
  PLATFORM_Y,
  TRACK_WIDTH,
} from './layout';

export interface TrainResult {
  group: Group;
  setDoorOpen(v: number): void;
  setHeadlights(v: number): void;
  setPositionX(x: number): void;
  playerDoorway: Box3;
  carLocalSeats: Vector3[];
}

const CAR_WIDTH = 2.8;
const CAR_HEIGHT = 3.6;
const DOOR_OFFSETS = [-8.25, -2.75, 2.75, 8.25];
const DOOR_LEAF_WIDTH = 0.9;
const DOOR_HEIGHT = 2.1;

export function buildTrain(
  scene: Scene,
  materials: MaterialLibrary,
): TrainResult {
  const group = new Group();
  group.name = 'train-metropolis';

  const trackZ = PLATFORM_HALF_WIDTH + TRACK_WIDTH / 2;
  const trainFloorY = PLATFORM_Y + 0.1;
  group.position.set(0, trainFloorY, trackZ);

  const doorLeaves: Mesh[] = [];
  const carLocalSeats: Vector3[] = [];
  const headlights: PointLight[] = [];

  const carCenters = [-44, -22, 0, 22, 44];

  for (let c = 0; c < CAR_COUNT; c++) {
    const carX = carCenters[c];
    const isLeadCar = c === 0;
    const isTailCar = c === CAR_COUNT - 1;

    const carGroup = new Group();
    carGroup.name = `train-car-${c}`;
    carGroup.position.set(carX, 0, 0);

    const carLen = isLeadCar || isTailCar ? 21.0 : 21.4;
    const carCenterOffset = isLeadCar ? 0.2 : isTailCar ? -0.2 : 0;

    const bodyGeom = new BoxGeometry(carLen, CAR_HEIGHT, CAR_WIDTH);
    const body = new Mesh(bodyGeom, materials.trainLivery);
    body.position.set(carCenterOffset, CAR_HEIGHT / 2, 0);
    body.castShadow = true;
    carGroup.add(body);

    const stripe = new Mesh(
      new BoxGeometry(carLen - 0.2, 0.9, CAR_WIDTH + 0.02),
      materials.paintedSteel,
    );
    stripe.position.set(carCenterOffset, 1.8, 0);
    carGroup.add(stripe);

    const glass = new Mesh(
      new BoxGeometry(carLen - 0.4, 0.65, CAR_WIDTH + 0.04),
      materials.psdGlass,
    );
    glass.position.set(carCenterOffset, 1.85, 0);
    carGroup.add(glass);

    for (const bogieOffset of [-7.0, 7.0]) {
      const bogie = new Mesh(
        new BoxGeometry(3.2, 0.6, CAR_WIDTH - 0.4),
        materials.paintedSteel,
      );
      bogie.position.set(bogieOffset, -0.3, 0);
      carGroup.add(bogie);
    }

    for (const seatX of [-6, -4, 4, 6]) {
      for (const seatSide of [-1, 1]) {
        carLocalSeats.push(new Vector3(carX + seatX, trainFloorY + 0.45, trackZ + seatSide * 0.8));
      }
    }


    for (let d = 0; d < DOOR_OFFSETS.length; d++) {
      const doorOffsetX = DOOR_OFFSETS[d];
      const doorIndex = c * 4 + d;

      const doorway = new Group();
      doorway.name = `train-doorway-${doorIndex}`;
      doorway.position.set(doorOffsetX, 0, -CAR_WIDTH / 2);
      carGroup.add(doorway);

      for (const side of [-1, 1]) {
        const leaf = new Mesh(
          new BoxGeometry(DOOR_LEAF_WIDTH, DOOR_HEIGHT, 0.05),
          materials.paintedSteel,
        );
        leaf.name = `train-door-leaf-${doorIndex}-${side > 0 ? 'right' : 'left'}`;
        leaf.position.set(doorOffsetX + side * (DOOR_LEAF_WIDTH / 2), DOOR_HEIGHT / 2, -CAR_WIDTH / 2 - 0.02);
        carGroup.add(leaf);
        doorLeaves.push(leaf);
      }
    }

    if (isLeadCar) {
      const light = new PointLight(0xfff5dd, 3, 40);
      light.position.set(-10.3 - 0.2, 1.2, 0);
      carGroup.add(light);
      headlights.push(light);

      const marker = new Mesh(
        new BoxGeometry(0.04, 0.3, 1.6),
        materials.ledStrip,
      );
      marker.position.set(-10.3 + 0.02, 1.2, 0);
      carGroup.add(marker);
    }

    group.add(carGroup);
  }

  // Instanced seats across all 5 cars (5 * 8 = 40 seats)
  const seatGeom = new BoxGeometry(1.6, 0.45, 0.5);
  const seatsMesh = new InstancedMesh(seatGeom, materials.paintedSteel, carCenters.length * 8);
  const seatMat = new Matrix4();
  let seatIdx = 0;
  for (const carX of carCenters) {
    for (const seatX of [-6, -4, 4, 6]) {
      for (const seatSide of [-1, 1]) {
        seatMat.makeTranslation(carX + seatX, 0.45 / 2, seatSide * (CAR_WIDTH / 2 - 0.35));
        seatsMesh.setMatrixAt(seatIdx++, seatMat);
      }
    }
  }
  group.add(seatsMesh);

  // Instanced grab poles across all 5 cars (5 * 3 = 15 poles)
  const poleGeom = new BoxGeometry(0.04, CAR_HEIGHT - 0.2, 0.04);
  const polesMesh = new InstancedMesh(poleGeom, materials.brushedAluminium, carCenters.length * 3);
  const poleMat = new Matrix4();
  let poleIdx = 0;
  for (const carX of carCenters) {
    for (const poleX of [-5, 0, 5]) {
      poleMat.makeTranslation(carX + poleX, CAR_HEIGHT / 2, 0);
      polesMesh.setMatrixAt(poleIdx++, poleMat);
    }
  }
  group.add(polesMesh);

  const doorwayCenterX = 2.75;
  const doorwayCenterZ = trackZ - CAR_WIDTH / 2;
  const playerDoorway = new Box3(
    new Vector3(doorwayCenterX - 0.9, trainFloorY, doorwayCenterZ - 0.4),
    new Vector3(doorwayCenterX + 0.9, trainFloorY + DOOR_HEIGHT, doorwayCenterZ + 0.4),
  );

  scene.add(group);

  const initialLeafPositions = doorLeaves.map((l) => l.position.x);

  const setDoorOpen = (v: number): void => {
    const clamped = Math.max(0, Math.min(1, v));
    const slide = clamped * 1.35;
    for (let i = 0; i < doorLeaves.length; i++) {
      const leaf = doorLeaves[i];
      const isRight = leaf.name.endsWith('right');
      const base = initialLeafPositions[i];
      leaf.position.x = isRight ? base + slide : base - slide;
    }
  };

  const setHeadlights = (v: number): void => {
    for (const light of headlights) {
      light.intensity = v * 3.5;
    }
  };

  const setPositionX = (x: number): void => {
    group.position.x = x;
    playerDoorway.min.x = x + doorwayCenterX - 0.9;
    playerDoorway.max.x = x + doorwayCenterX + 0.9;
  };

  return {
    group,
    setDoorOpen,
    setHeadlights,
    setPositionX,
    playerDoorway,
    carLocalSeats,
  };
}
