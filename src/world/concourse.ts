import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector3,
  type Scene,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BoxSpec, CollisionWorld } from '../core/CollisionWorld';
import {
  BOX_HALF_LENGTH,
  BOX_HALF_WIDTH,
  CONCOURSE_CEILING,
  CONCOURSE_Y,
  ESCALATOR_RUN_PLATFORM,
  PAVILION_X,
  PLATFORM_Y,
  VOID_HALF_WIDTH,
  VOID_X0,
  VOID_X1,
  type EscalatorSpec,
} from './layout';
import type { MaterialLibrary } from './kit/materials';
import { buildBench } from './kit/bench';
import { buildEscalator } from './kit/escalator';
import { buildGate, gateFlapBox, GATE_AISLE, GATE_PEDESTAL_DEPTH } from './kit/gate';
import { buildRailing } from './kit/railing';
import { buildSign } from './kit/signage';
import type { InteractionSystem } from '../systems/InteractionSystem';

export const GATE_LINE_X = -12;
export const GATE_Z = [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5];

const FLIGHT_WIDTH = 1.8;
const STAIR_Z_CENTER = -1.1;
const ESCALATOR_Z_CENTER = 1.1;
const OPENING_HALF_WIDTH = 2.25;
const FLOOR_THICKNESS = 0.4;
const ESCALATOR_WEST_X1 = VOID_X0 + ESCALATOR_RUN_PLATFORM;
const ESCALATOR_EAST_X0 = VOID_X1 - ESCALATOR_RUN_PLATFORM;
const GATE_OPEN_TIME = 0.6;

export interface ConcourseResult {
  gateOpen(): boolean;
  setGateOpen(open: boolean): void;
  escalators: EscalatorSpec[];
  update(dt: number): void;
}

/**
 * Concourse level at Y = -10: ticket hall, gate line, the 63.5 x 12.6 m void
 * with its balustrades, and the two escalators down to the platform.
 */
export function buildConcourse(
  scene: Scene,
  world: CollisionWorld,
  materials: MaterialLibrary,
  interaction: InteractionSystem,
): ConcourseResult {
  const group = new Group();
  group.name = 'concourse';

  buildFloor(group, world, materials);
  buildWallsAndCeiling(group, world, materials);
  buildBalustrades(group, world, materials);
  buildHallFurniture(group, world, materials);

  const gates = buildGateLine(group, world, materials);
  const escalators = buildEscalators(group, world, materials);
  buildGateScreens(group, world, materials);

  scene.add(group);

  let open = false;
  let amount = 0;
  let target = 0;
  let flapColliders: BoxSpec[] = [];

  const syncColliders = (isOpen: boolean): void => {
    if (isOpen) {
      for (const box of flapColliders) world.removeBox(box);
      flapColliders = [];
    } else if (flapColliders.length === 0) {
      for (const z of GATE_Z) {
        const box = gateFlapBox();
        flapColliders.push(
          world.addBox(
            new Vector3(box.min.x + GATE_LINE_X, box.min.y + CONCOURSE_Y, box.min.z + z),
            new Vector3(box.max.x + GATE_LINE_X, box.max.y + CONCOURSE_Y, box.max.z + z),
          ),
        );
      }
    }
  };

  const applyFlaps = (): void => {
    gates.forEach((gate, index) => {
      const side = GATE_Z[index] < 0 ? 1 : -1;
      gate.left.rotation.y = -side * amount * 1.35;
      gate.right.rotation.y = side * amount * 1.35;
    });
  };

  const setGateOpen = (value: boolean): void => {
    open = value;
    target = value ? 1 : 0;
    syncColliders(value);
    if (!value) applyFlaps();
  };

  syncColliders(false);

  // One prompt per gate so the player can scan at whichever aisle they reach.
  for (const z of GATE_Z) {
    interaction.register({
      position: new Vector3(GATE_LINE_X + 0.35, CONCOURSE_Y + 1.25, z),
      radius: 1.2,
      promptVi: 'Soát vé',
      promptEn: 'Scan ticket',
      action: () => setGateOpen(true),
      enabled: () => !open,
    });
  }

  return {
    gateOpen: () => open,
    setGateOpen,
    escalators,
    update(dt: number): void {
      if (amount === target) return;
      const step = dt / GATE_OPEN_TIME;
      amount = Math.max(0, Math.min(1, amount + (target > amount ? step : -step)));
      applyFlaps();
    },
  };
}

function buildFloor(group: Group, world: CollisionWorld, materials: MaterialLibrary): void {
  const y0 = CONCOURSE_Y - FLOOR_THICKNESS;
  const y1 = CONCOURSE_Y;

  const addSlab = (x0: number, x1: number, z0: number, z1: number): void => {
    const slab = new Mesh(
      new BoxGeometry(x1 - x0, FLOOR_THICKNESS, z1 - z0),
      materials.terrazzo,
    );
    slab.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    slab.receiveShadow = true;
    group.add(slab);
    world.addBox(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1));
  };

  addSlab(-BOX_HALF_LENGTH, VOID_X0, -BOX_HALF_WIDTH, BOX_HALF_WIDTH);
  addSlab(VOID_X1, BOX_HALF_LENGTH, -BOX_HALF_WIDTH, BOX_HALF_WIDTH);
  addSlab(VOID_X0, VOID_X1, -BOX_HALF_WIDTH, -VOID_HALF_WIDTH);
  addSlab(VOID_X0, VOID_X1, VOID_HALF_WIDTH, BOX_HALF_WIDTH);
}

function buildWallsAndCeiling(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  const height = CONCOURSE_CEILING - CONCOURSE_Y;

  for (const side of [-1, 1]) {
    const wall = new Mesh(
      new BoxGeometry(BOX_HALF_LENGTH * 2, height, 0.5),
      materials.concrete,
    );
    wall.position.set(0, CONCOURSE_Y + height / 2, side * (BOX_HALF_WIDTH + 0.25));
    wall.receiveShadow = true;
    group.add(wall);
    world.addBox(
      new Vector3(-BOX_HALF_LENGTH, CONCOURSE_Y, side * BOX_HALF_WIDTH),
      new Vector3(BOX_HALF_LENGTH, CONCOURSE_CEILING, side * (BOX_HALF_WIDTH + 0.5)),
    );
  }

  for (const side of [-1, 1]) {
    const wall = new Mesh(
      new BoxGeometry(0.5, height, BOX_HALF_WIDTH * 2),
      materials.concrete,
    );
    wall.position.set(side * (BOX_HALF_LENGTH + 0.25), CONCOURSE_Y + height / 2, 0);
    group.add(wall);
    world.addBox(
      new Vector3(side * BOX_HALF_LENGTH, CONCOURSE_Y, -BOX_HALF_WIDTH),
      new Vector3(side * (BOX_HALF_LENGTH + 0.5), CONCOURSE_CEILING, BOX_HALF_WIDTH),
    );
  }

  // Ceiling, cut open over the pavilion stair shaft.
  const y0 = CONCOURSE_CEILING - 0.4;
  const addCeiling = (x0: number, x1: number, z0: number, z1: number): void => {
    const slab = new Mesh(
      new BoxGeometry(x1 - x0, 0.4, z1 - z0),
      materials.concrete,
    );
    slab.position.set((x0 + x1) / 2, y0 + 0.2, (z0 + z1) / 2);
    group.add(slab);
    world.addBox(new Vector3(x0, y0, z0), new Vector3(x1, CONCOURSE_CEILING, z1));
  };

  const shaftX0 = PAVILION_X - 5.2;
  const shaftX1 = PAVILION_X + 4.2;
  addCeiling(-BOX_HALF_LENGTH, shaftX0, -BOX_HALF_WIDTH, BOX_HALF_WIDTH);
  addCeiling(shaftX1, BOX_HALF_LENGTH, -BOX_HALF_WIDTH, BOX_HALF_WIDTH);
  addCeiling(shaftX0, shaftX1, -BOX_HALF_WIDTH, -8.5);
  addCeiling(shaftX0, shaftX1, 11.5, BOX_HALF_WIDTH);

  // LED lines running the length of the hall.
  const stripGeometry = new BoxGeometry(0.28, 0.06, 2.6);
  const rows = [-11.5, -4.5, 4.5, 11.5];
  const perRow = 29;
  const strips = new InstancedMesh(stripGeometry, materials.ledStrip, rows.length * perRow);
  const matrix = new Matrix4();
  let index = 0;
  for (const z of rows) {
    for (let i = 0; i < perRow; i += 1) {
      const x = -88 + 3 + i * 6;
      matrix.makeTranslation(x, CONCOURSE_CEILING - 0.06, z);
      strips.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  group.add(strips);

  // Pilasters along both walls (instanced to keep draw calls low).
  const pilasterX: number[] = [];
  for (let x = -80; x <= 80; x += 16) pilasterX.push(x);
  const totalPilasters = pilasterX.length * 2;
  const pilasterGeom = new BoxGeometry(0.8, height, 0.8);
  const pilasterMesh = new InstancedMesh(pilasterGeom, materials.paintedSteel, totalPilasters);
  const pilMatrix = new Matrix4();
  let pilIdx = 0;

  for (const side of [-1, 1]) {
    for (const x of pilasterX) {
      pilMatrix.makeTranslation(x, CONCOURSE_Y + height / 2, side * (BOX_HALF_WIDTH - 0.9));
      pilasterMesh.setMatrixAt(pilIdx++, pilMatrix);
      world.addBox(
        new Vector3(x - 0.5, CONCOURSE_Y, side * (BOX_HALF_WIDTH - 0.9) - 0.5),
        new Vector3(x + 0.5, CONCOURSE_CEILING, side * (BOX_HALF_WIDTH - 0.9) + 0.5),
      );
    }
  }
  group.add(pilasterMesh);
}

function buildBalustrades(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  const halfLength = (VOID_X1 - VOID_X0) / 2;
  const centreX = (VOID_X0 + VOID_X1) / 2;

  for (const side of [-1, 1]) {
    addRail(group, world, materials, centreX, side * VOID_HALF_WIDTH, halfLength * 2, true);
  }

  const edgeLength = VOID_HALF_WIDTH - OPENING_HALF_WIDTH;
  const edgeCentre = OPENING_HALF_WIDTH + edgeLength / 2;
  for (const x of [VOID_X0, VOID_X1]) {
    for (const side of [-1, 1]) {
      addRail(group, world, materials, x, side * edgeCentre, edgeLength, false);
    }
  }
}

function addRail(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
  x: number,
  z: number,
  length: number,
  alongX: boolean,
): void {
  const kit = buildRailing(length, materials);
  kit.group.position.set(x, CONCOURSE_Y, z);
  if (!alongX) kit.group.rotation.y = Math.PI / 2;
  group.add(kit.group);

  if (alongX) {
    world.addBox(
      new Vector3(x - length / 2, CONCOURSE_Y, z - 0.12),
      new Vector3(x + length / 2, CONCOURSE_Y + 1.1, z + 0.12),
    );
  } else {
    world.addBox(
      new Vector3(x - 0.12, CONCOURSE_Y, z - length / 2),
      new Vector3(x + 0.12, CONCOURSE_Y + 1.1, z + length / 2),
    );
  }
}

function buildGateLine(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): Array<{ left: Group; right: Group }> {
  const gates: Array<{ left: Group; right: Group }> = [];

  for (const z of GATE_Z) {
    const kit = buildGate(materials);
    kit.group.position.set(GATE_LINE_X, CONCOURSE_Y, z);
    group.add(kit.group);

    for (const collider of kit.colliders) {
      world.addBox(
        new Vector3(collider.min.x + GATE_LINE_X, collider.min.y + CONCOURSE_Y, collider.min.z + z),
        new Vector3(collider.max.x + GATE_LINE_X, collider.max.y + CONCOURSE_Y, collider.max.z + z),
      );
    }

    const left = kit.group.getObjectByName('flap-left') as Group | undefined;
    const right = kit.group.getObjectByName('flap-right') as Group | undefined;
    if (left && right) gates.push({ left, right });
  }

  return gates;
}

/** Railings flanking the gate bank, sealing the paid/unpaid boundary. */
function buildGateScreens(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  const bankHalf =
    Math.max(...GATE_Z.map((z) => Math.abs(z))) + GATE_AISLE / 2 + GATE_PEDESTAL_DEPTH;
  const length = BOX_HALF_WIDTH - bankHalf;
  const centre = bankHalf + length / 2;

  for (const side of [-1, 1]) {
    const kit = buildRailing(length, materials);
    kit.group.position.set(GATE_LINE_X, CONCOURSE_Y, side * centre);
    kit.group.rotation.y = Math.PI / 2;
    group.add(kit.group);

    world.addBox(
      new Vector3(GATE_LINE_X - 0.12, CONCOURSE_Y, side * bankHalf),
      new Vector3(GATE_LINE_X + 0.12, CONCOURSE_Y + 1.1, side * BOX_HALF_WIDTH),
    );
  }
}

function buildConcourseStairFlight(
  run: number,
  rise: number,
  width: number,
  materials: MaterialLibrary,
): Group {
  const group = new Group();
  group.name = 'concourse-stair-flight';

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

  return group;
}

function buildEscalators(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): EscalatorSpec[] {
  const specs: EscalatorSpec[] = [];

  const addBank = (
    topX: number,
    bottomX: number,
    rotation: number,
  ): void => {
    const run = Math.abs(bottomX - topX);
    const rise = CONCOURSE_Y - PLATFORM_Y;
    const minX = Math.min(topX, bottomX);
    const maxX = Math.max(topX, bottomX);

    // 1. Pedestrian Staircase
    const stairFlight = buildConcourseStairFlight(run, rise, FLIGHT_WIDTH, materials);
    stairFlight.position.set(bottomX, PLATFORM_Y, STAIR_Z_CENTER);
    stairFlight.rotation.y = rotation;
    group.add(stairFlight);

    const yAtMinX = topX < bottomX ? CONCOURSE_Y : PLATFORM_Y;
    const yAtMaxX = topX < bottomX ? PLATFORM_Y : CONCOURSE_Y;

    // Walkable ramp for pedestrian stairs
    world.addRamp(
      minX,
      maxX,
      STAIR_Z_CENTER - FLIGHT_WIDTH / 2,
      STAIR_Z_CENTER + FLIGHT_WIDTH / 2,
      yAtMinX,
      yAtMaxX,
      'x',
    );

    // 2. Automatic Motorized Escalator
    const escalatorKit = buildEscalator(
      { run, rise, width: FLIGHT_WIDTH },
      materials,
    );
    escalatorKit.group.position.set(bottomX, PLATFORM_Y, ESCALATOR_Z_CENTER);
    escalatorKit.group.rotation.y = rotation;
    group.add(escalatorKit.group);

    // Walkable ramp for escalator
    world.addRamp(
      minX,
      maxX,
      ESCALATOR_Z_CENTER - FLIGHT_WIDTH / 2,
      ESCALATOR_Z_CENTER + FLIGHT_WIDTH / 2,
      yAtMinX,
      yAtMaxX,
      'x',
    );

    // Escalator carry spec
    specs.push({
      position: new Vector3(topX, CONCOURSE_Y, ESCALATOR_Z_CENTER),
      direction: new Vector3(bottomX - topX, PLATFORM_Y - CONCOURSE_Y, 0).normalize(),
      speed: 0.65,
      footprint: {
        minX,
        maxX,
        minZ: ESCALATOR_Z_CENTER - FLIGHT_WIDTH / 2,
        maxZ: ESCALATOR_Z_CENTER + FLIGHT_WIDTH / 2,
        bottomY: PLATFORM_Y,
        topY: CONCOURSE_Y,
      },
    });

    // Balustrade walls: outer edge of stairs, central dividing rail, outer edge of escalator
    // Outer stair wall
    const outerStairZ = STAIR_Z_CENTER - FLIGHT_WIDTH / 2;
    world.addBox(
      new Vector3(minX, PLATFORM_Y - 0.4, outerStairZ - 0.1),
      new Vector3(maxX, CONCOURSE_Y + 1.1, outerStairZ + 0.05),
    );

    // Dividing center balustrade between stair and escalator
    world.addBox(
      new Vector3(minX, PLATFORM_Y - 0.4, -0.1),
      new Vector3(maxX, CONCOURSE_Y + 1.1, 0.1),
    );
    const centerDivider = new Mesh(
      new BoxGeometry(maxX - minX, 1.1, 0.12),
      materials.glass,
    );
    centerDivider.position.set((minX + maxX) / 2, (CONCOURSE_Y + PLATFORM_Y) / 2 + 0.55, 0);
    // Orient divider parallel to slope
    group.add(centerDivider);

    // Outer escalator wall
    const outerEscalatorZ = ESCALATOR_Z_CENTER + FLIGHT_WIDTH / 2;
    world.addBox(
      new Vector3(minX, PLATFORM_Y - 0.4, outerEscalatorZ - 0.05),
      new Vector3(maxX, CONCOURSE_Y + 1.1, outerEscalatorZ + 0.1),
    );
  };

  // West bank: top at the gate line edge, descending east into the void.
  addBank(VOID_X0, ESCALATOR_WEST_X1, Math.PI);
  // East bank: top at the far void edge, descending west.
  addBank(VOID_X1, ESCALATOR_EAST_X0, 0);

  return specs;
}

function buildHallFurniture(
  group: Group,
  world: CollisionWorld,
  materials: MaterialLibrary,
): void {
  const machineMaterial = materials.paintedSteel;
  const screenMaterial = new MeshStandardMaterial({
    color: 0x0b1e26,
    emissive: 0x2f9fd0,
    emissiveIntensity: 1.2,
  });

  for (let i = 0; i < 3; i += 1) {
    const x = -22 + i * 2.4;
    const body = new Mesh(new BoxGeometry(1.2, 1.9, 0.8), machineMaterial);
    body.position.set(x, CONCOURSE_Y + 0.95, -10.4);
    group.add(body);
    world.addBox(
      new Vector3(x - 0.6, CONCOURSE_Y, -10.8),
      new Vector3(x + 0.6, CONCOURSE_Y + 1.9, -10.0),
    );

    const screen = new Mesh(new BoxGeometry(0.8, 0.5, 0.03), screenMaterial);
    screen.position.set(x, CONCOURSE_Y + 1.35, -9.98);
    group.add(screen);
  }

  const desk = new Mesh(new BoxGeometry(7, 1.15, 1.4), materials.paintedSteel);
  desk.position.set(-58, CONCOURSE_Y + 0.575, 9);
  group.add(desk);
  world.addBox(
    new Vector3(-61.5, CONCOURSE_Y, 8.3),
    new Vector3(-54.5, CONCOURSE_Y + 1.15, 9.7),
  );

  for (const x of [40, 76]) {
    const door = new Mesh(new BoxGeometry(1.8, 2.4, 0.12), materials.brushedAluminium);
    door.position.set(x, CONCOURSE_Y + 1.2, BOX_HALF_WIDTH - 0.06);
    group.add(door);

    const sign = buildSign('PHÒNG KỸ THUẬT', 'Staff only', { width: 2.4, height: 0.55 }, materials);
    sign.group.position.set(x, CONCOURSE_Y + 2.7, BOX_HALF_WIDTH - 0.08);
    sign.group.rotation.y = Math.PI;
    group.add(sign.group);
  }

  for (const x of [-70, -30, 10]) {
    const bench = buildBench(materials);
    bench.group.position.set(x, CONCOURSE_Y, -12.6);
    group.add(bench.group);
    for (const collider of bench.colliders) {
      world.addBox(
        new Vector3(collider.min.x + x, collider.min.y + CONCOURSE_Y, collider.min.z - 12.6),
        new Vector3(collider.max.x + x, collider.max.y + CONCOURSE_Y, collider.max.z - 12.6),
      );
    }
  }

  const wayfinding = buildSign('LỐI RA', 'Way out', { width: 3.2, height: 0.7 }, materials);
  wayfinding.group.position.set(-20, CONCOURSE_Y + 3.4, BOX_HALF_WIDTH - 0.2);
  wayfinding.group.rotation.y = Math.PI;
  group.add(wayfinding.group);

  // Ticket gate aisle markings.
  const aisle = new Mesh(new BoxGeometry(0.05, 0.01, GATE_AISLE), materials.tactilePaving);
  aisle.position.set(GATE_LINE_X, CONCOURSE_Y + 0.005, 0);
  group.add(aisle);
}

export { CONCOURSE_Y as CONCOURSE_FLOOR_Y, VOID_X0 as VOID_START, VOID_X1 as VOID_END };
