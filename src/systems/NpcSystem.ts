import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
  type Scene,
} from 'three';
import type { NavGraph } from '../world/nav';
import type { TrainSystem } from './TrainSystem';

interface NpcAgent {
  position: Vector3;
  target: Vector3;
  seat: Vector3;
  speed: number;
  heightScale: number;
  rotationY: number;
  state: 'walking' | 'queued' | 'boarding' | 'seated';
  cycle: number;
  leftLegAngle: number;
  rightLegAngle: number;
}

const CLOTHING_COLORS = [
  0x2b4c7e,
  0x8c3b2b,
  0x3c6e47,
  0x555555,
  0xb89758,
];

export class NpcSystem {
  private readonly scene: Scene;
  private readonly rng: () => number;
  private readonly nav: NavGraph;
  private readonly train: TrainSystem;
  private agents: NpcAgent[] = [];
  private reducedMotion = false;

  private torsoMesh: InstancedMesh | null = null;
  private headMesh: InstancedMesh | null = null;
  private leftLegMesh: InstancedMesh | null = null;
  private rightLegMesh: InstancedMesh | null = null;

  private readonly matrix = new Matrix4();
  private readonly subMatrix = new Matrix4();

  constructor(scene: Scene, rng: () => number, nav: NavGraph, train: TrainSystem) {
    this.scene = scene;
    this.rng = rng;
    this.nav = nav;
    this.train = train;
  }

  get positions(): Vector3[] {
    return this.agents.map((a) => a.position);
  }

  get queuedCount(): number {
    return this.agents.filter((a) => a.state === 'queued' || a.state === 'boarding' || a.state === 'seated').length;
  }

  get boardedCount(): number {
    return this.agents.filter((a) => a.state === 'seated').length;
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
  }

  spawn(count: number): void {
    this.agents = [];

    const slotCount = this.nav.queueSlots.length;

    const skinMaterial = new MeshStandardMaterial({ color: 0xdeb887, roughness: 0.8 });
    const clothMaterial = new MeshStandardMaterial({ color: 0x2b4c7e, roughness: 0.7 });
    const pantsMaterial = new MeshStandardMaterial({ color: 0x22222b, roughness: 0.8 });

    const torsoGeom = new BoxGeometry(0.38, 0.55, 0.22);
    const headGeom = new BoxGeometry(0.2, 0.24, 0.2);
    const legGeom = new BoxGeometry(0.14, 0.75, 0.16);

    this.torsoMesh = new InstancedMesh(torsoGeom, clothMaterial, count);
    this.headMesh = new InstancedMesh(headGeom, skinMaterial, count);
    this.leftLegMesh = new InstancedMesh(legGeom, pantsMaterial, count);
    this.rightLegMesh = new InstancedMesh(legGeom, pantsMaterial, count);

    for (let i = 0; i < count; i++) {
      const slot = this.nav.queueSlots[i % slotCount];

      let nearestSeat = this.nav.seats[0];
      let minDist = Number.POSITIVE_INFINITY;
      for (const s of this.nav.seats) {
        const d = Math.abs(s.x - slot.x);
        if (d < minDist) {
          minDist = d;
          nearestSeat = s;
        }
      }
      const seat = nearestSeat;

      const colorHex = CLOTHING_COLORS[Math.floor(this.rng() * CLOTHING_COLORS.length)];
      this.torsoMesh.setColorAt(i, new Color(colorHex));

      const heightScale = 0.9 + this.rng() * 0.2;
      const speed = 1.0 + this.rng() * 0.4;

      const startX = -25 + (this.rng() - 0.5) * 10;
      const startZ = (this.rng() - 0.5) * 6;
      const startPos = new Vector3(startX, slot.y, startZ);

      this.agents.push({
        position: startPos,
        target: slot.clone(),
        seat: seat.clone(),
        speed,
        heightScale,
        rotationY: 0,
        state: 'walking',
        cycle: this.rng() * Math.PI * 2,
        leftLegAngle: 0,
        rightLegAngle: 0,
      });
    }

    if (this.torsoMesh.instanceColor) this.torsoMesh.instanceColor.needsUpdate = true;

    this.scene.add(this.torsoMesh);
    this.scene.add(this.headMesh);
    this.scene.add(this.leftLegMesh);
    this.scene.add(this.rightLegMesh);

    this.updateMeshMatrices();
  }

  update(dt: number): void {
    const isBoardingOpen = this.train.isBoardingOpen();

    for (const agent of this.agents) {
      if (agent.state === 'walking') {
        const toTarget = new Vector3().subVectors(agent.target, agent.position);
        toTarget.y = 0;
        const dist = toTarget.length();
        const step = agent.speed * dt;

        if (dist <= step || dist < 0.2) {
          agent.position.copy(agent.target);
          agent.state = 'queued';
          agent.leftLegAngle = 0;
          agent.rightLegAngle = 0;
        } else {
          toTarget.normalize();
          agent.position.addScaledVector(toTarget, step);
          agent.rotationY = Math.atan2(toTarget.x, toTarget.z);

          if (!this.reducedMotion) {
            agent.cycle += dt * agent.speed * 8;
            agent.leftLegAngle = Math.sin(agent.cycle) * 0.45;
            agent.rightLegAngle = -Math.sin(agent.cycle) * 0.45;
          }
        }
      } else if (agent.state === 'queued') {
        agent.leftLegAngle = 0;
        agent.rightLegAngle = 0;
        if (isBoardingOpen) {
          agent.state = 'boarding';
        }
      } else if (agent.state === 'boarding') {
        const toSeat = new Vector3().subVectors(agent.seat, agent.position);
        toSeat.y = 0;
        const dist = toSeat.length();
        const step = agent.speed * dt * 1.5;

        if (dist <= step || dist < 0.3) {
          agent.position.copy(agent.seat);
          agent.state = 'seated';
          agent.leftLegAngle = 0;
          agent.rightLegAngle = 0;
        } else {
          toSeat.normalize();
          agent.position.addScaledVector(toSeat, step);
          agent.rotationY = Math.atan2(toSeat.x, toSeat.z);

          if (!this.reducedMotion) {
            agent.cycle += dt * agent.speed * 8;
            agent.leftLegAngle = Math.sin(agent.cycle) * 0.45;
            agent.rightLegAngle = -Math.sin(agent.cycle) * 0.45;
          }
        }
      }
    }

    this.updateMeshMatrices();
  }

  private updateMeshMatrices(): void {
    if (!this.torsoMesh || !this.headMesh || !this.leftLegMesh || !this.rightLegMesh) return;

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      const yOffset = a.state === 'seated' ? -0.3 : 0;
      const h = a.heightScale;

      this.matrix.makeRotationY(a.rotationY);
      this.matrix.setPosition(a.position.x, a.position.y + yOffset, a.position.z);

      this.subMatrix.makeTranslation(0, 1.05 * h, 0);
      this.subMatrix.scale(new Vector3(1, h, 1));
      this.subMatrix.premultiply(this.matrix);
      this.torsoMesh.setMatrixAt(i, this.subMatrix);

      this.subMatrix.makeTranslation(0, 1.5 * h, 0);
      this.subMatrix.scale(new Vector3(1, h, 1));
      this.subMatrix.premultiply(this.matrix);
      this.headMesh.setMatrixAt(i, this.subMatrix);

      this.subMatrix.makeRotationX(a.leftLegAngle);
      this.subMatrix.setPosition(-0.1, 0.4 * h, 0);
      this.subMatrix.scale(new Vector3(1, h, 1));
      this.subMatrix.premultiply(this.matrix);
      this.leftLegMesh.setMatrixAt(i, this.subMatrix);

      this.subMatrix.makeRotationX(a.rightLegAngle);
      this.subMatrix.setPosition(0.1, 0.4 * h, 0);
      this.subMatrix.scale(new Vector3(1, h, 1));
      this.subMatrix.premultiply(this.matrix);
      this.rightLegMesh.setMatrixAt(i, this.subMatrix);
    }

    this.torsoMesh.instanceMatrix.needsUpdate = true;
    this.headMesh.instanceMatrix.needsUpdate = true;
    this.leftLegMesh.instanceMatrix.needsUpdate = true;
    this.rightLegMesh.instanceMatrix.needsUpdate = true;
  }
}
