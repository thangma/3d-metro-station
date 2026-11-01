import { Vector3, type Camera } from 'three';

const MAX_DISTANCE = 2.5;
const MAX_ANGLE = (35 * Math.PI) / 180;
const COS_MAX_ANGLE = Math.cos(MAX_ANGLE);

export interface Interactable {
  position: Vector3;
  radius: number;
  promptVi: string;
  promptEn: string;
  action(): void;
  enabled?: () => boolean;
}

export class InteractionSystem {
  private readonly targets: Interactable[] = [];
  private readonly forward = new Vector3();
  private readonly toTarget = new Vector3();
  private current: Interactable | null = null;

  register(target: Interactable): void {
    this.targets.push(target);
  }

  get active(): Interactable | null {
    return this.current;
  }

  update(camera: Camera, playerPosition: Vector3): Interactable | null {
    camera.getWorldDirection(this.forward);
    let best: Interactable | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      if (target.enabled && !target.enabled()) continue;

      const reach = MAX_DISTANCE + target.radius;
      if (playerPosition.distanceTo(target.position) > reach) continue;

      this.toTarget.copy(target.position).sub(camera.position);
      const distance = this.toTarget.length();
      if (distance === 0) continue;
      this.toTarget.divideScalar(distance);
      if (this.toTarget.dot(this.forward) < COS_MAX_ANGLE) continue;

      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }

    this.current = best;
    return best;
  }

  interact(): boolean {
    if (!this.current) return false;
    this.current.action();
    return true;
  }
}
