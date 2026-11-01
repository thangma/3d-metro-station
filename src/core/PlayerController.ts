import { Vector3 } from 'three';
import type { CollisionWorld } from './CollisionWorld';
import { CAPSULE_HEIGHT, CAPSULE_RADIUS, SPRINT_SPEED, WALK_SPEED } from '../world/layout';

export interface PlayerInput {
  forward: number;
  right: number;
  sprint: boolean;
  interact: boolean;
}

const GROUND_ACCEL = 12;
const AIR_CONTROL = 0.35;
const GROUND_DRAG = 14;
const AIR_DRAG = 2;
const GRAVITY = 24;
const PITCH_LIMIT = (89 * Math.PI) / 180;

export class PlayerController {
  readonly position: Vector3;
  readonly velocity = new Vector3();
  yaw = 0;
  pitch = 0;
  grounded = false;

  constructor(start: Vector3) {
    this.position = start.clone();
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  teleport(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
  }

  look(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch - deltaY));
  }

  update(dt: number, input: PlayerInput, world: CollisionWorld, carry: Vector3): void {
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const forwardX = -sin;
    const forwardZ = -cos;
    const rightX = cos;
    const rightZ = -sin;

    let desiredX = forwardX * input.forward + rightX * input.right;
    let desiredZ = forwardZ * input.forward + rightZ * input.right;
    const desiredLength = Math.hypot(desiredX, desiredZ);
    const maxSpeed = input.sprint ? SPRINT_SPEED : WALK_SPEED;

    if (desiredLength > 0) {
      desiredX /= desiredLength;
      desiredZ /= desiredLength;
      const accel = GROUND_ACCEL * (this.grounded ? 1 : AIR_CONTROL);
      this.velocity.x += desiredX * accel * dt;
      this.velocity.z += desiredZ * accel * dt;
      this.clampHorizontal(maxSpeed);
    } else {
      const drag = (this.grounded ? GROUND_DRAG : AIR_DRAG) * dt;
      this.velocity.x = moveToward(this.velocity.x, 0, drag * Math.abs(this.velocity.x) + drag * 0.5);
      this.velocity.z = moveToward(this.velocity.z, 0, drag * Math.abs(this.velocity.z) + drag * 0.5);
    }

    const onCarry = carry.lengthSq() > 0;
    if (onCarry) {
      this.velocity.y = 0;
    } else {
      this.velocity.y -= GRAVITY * dt;
    }

    const delta = new Vector3(
      this.velocity.x * dt + carry.x * dt,
      this.velocity.y * dt + carry.y * dt,
      this.velocity.z * dt + carry.z * dt,
    );
    const result = world.moveCapsule(this.position, delta, CAPSULE_RADIUS, CAPSULE_HEIGHT);
    this.position.copy(result.position);
    this.grounded = result.grounded || onCarry;

    if (this.grounded && this.velocity.y < 0) this.velocity.y = 0;
  }

  private clampHorizontal(maxSpeed: number): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed <= maxSpeed) return;
    const scale = maxSpeed / speed;
    this.velocity.x *= scale;
    this.velocity.z *= scale;
  }
}

function moveToward(value: number, target: number, maxDelta: number): number {
  if (Math.abs(value - target) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
}
