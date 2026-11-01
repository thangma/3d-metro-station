import { Vector3 } from 'three';
import { STEP_UP } from '../world/layout';

const EPSILON = 1e-4;
const SLOPE_LIMIT = 1.0; // tan(45°)

export interface BoxSpec {
  min: Vector3;
  max: Vector3;
}

interface RampSpec {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  slope: number;
}

export interface MoveResult {
  position: Vector3;
  grounded: boolean;
}

/**
 * Deterministic capsule-vs-AABB collision with axis-separated sweeps.
 * No physics engine: cheap, stable, and identical on every machine.
 */
export class CollisionWorld {
  private readonly boxes: BoxSpec[] = [];
  private readonly ramps: RampSpec[] = [];
  private readonly scratch = new Vector3();

  addBox(box: BoxSpec): void;
  addBox(min: Vector3, max: Vector3): void;
  addBox(a: BoxSpec | Vector3, b?: Vector3): void {
    const box: BoxSpec = a instanceof Vector3 ? { min: a.clone(), max: b!.clone() } : a;
    this.boxes.push({
      min: box.min.clone().min(box.max),
      max: box.min.clone().max(box.max),
    });
  }

  addRamp(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number): void {
    const run = Math.max(Math.abs(x1 - x0), EPSILON);
    this.ramps.push({ x0, x1, z0, z1, y0, y1, slope: Math.abs(y1 - y0) / run });
  }

  groundHeightAt(x: number, z: number): number | null {
    let best: number | null = null;
    for (const box of this.boxes) {
      if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z) {
        if (best === null || box.max.y > best) best = box.max.y;
      }
    }
    for (const ramp of this.ramps) {
      if (ramp.slope > SLOPE_LIMIT) continue;
      if (x < Math.min(ramp.x0, ramp.x1) || x > Math.max(ramp.x0, ramp.x1)) continue;
      if (z < ramp.z0 || z > ramp.z1) continue;
      const t = (x - ramp.x0) / (ramp.x1 - ramp.x0);
      const height = ramp.y0 + (ramp.y1 - ramp.y0) * t;
      if (best === null || height > best) best = height;
    }
    return best;
  }

  moveCapsule(
    position: Vector3,
    delta: Vector3,
    radius: number,
    height: number,
  ): MoveResult {
    const p = this.scratch.copy(position);

    if (delta.x !== 0) {
      this.sweepAxis(p, radius, height, 'x', delta.x);
    }
    if (delta.z !== 0) {
      this.sweepAxis(p, radius, height, 'z', delta.z);
    }

    p.y += delta.y;
    let grounded = false;

    if (delta.y <= 0) {
      const support = this.groundHeightAt(p.x, p.z);
      if (support !== null && p.y <= support + EPSILON && support - p.y <= STEP_UP) {
        p.y = support;
        grounded = true;
      } else if (support !== null && p.y <= support) {
        p.y = support;
        grounded = true;
      }
    } else {
      const ceiling = this.ceilingHeightAt(p.x, p.z, radius, p.y);
      if (ceiling !== null && p.y + height > ceiling) {
        p.y = ceiling - height;
      }
    }

    if (!grounded) grounded = this.isSupported(p, radius);

    return { position: p.clone(), grounded };
  }

  private sweepAxis(
    p: Vector3,
    radius: number,
    height: number,
    axis: 'x' | 'z',
    delta: number,
  ): void {
    const previous = p[axis];
    p[axis] = previous + delta;

    for (const box of this.boxes) {
      if (box.max.y <= p.y + STEP_UP || box.min.y >= p.y + height) continue;
      const others = axis === 'x' ? 'z' : 'x';
      if (p[others] + radius <= box.min[others] || p[others] - radius >= box.max[others]) {
        continue;
      }

      const low = box.min[axis] - radius;
      const high = box.max[axis] + radius;

      if (delta > 0 && previous <= low + EPSILON && p[axis] >= low) {
        p[axis] = low - EPSILON;
      } else if (delta < 0 && previous >= high - EPSILON && p[axis] <= high) {
        p[axis] = high + EPSILON;
      } else if (p[axis] > low && p[axis] < high) {
        p[axis] = previous < (low + high) / 2 ? low - EPSILON : high + EPSILON;
      }
    }

    for (const ramp of this.ramps) {
      if (ramp.slope <= SLOPE_LIMIT) continue;
      if (p.z + radius <= Math.min(ramp.z0, ramp.z1)) continue;
      if (p.z - radius >= Math.max(ramp.z0, ramp.z1)) continue;
      const minX = Math.min(ramp.x0, ramp.x1);
      const maxX = Math.max(ramp.x0, ramp.x1);
      if (p.x + radius <= minX || p.x - radius >= maxX) continue;
      if (p.y >= Math.max(ramp.y0, ramp.y1) - EPSILON) continue;

      p[axis] = previous;
    }
  }

  private ceilingHeightAt(x: number, z: number, radius: number, feetY: number): number | null {
    let best: number | null = null;
    for (const box of this.boxes) {
      if (box.min.y < feetY + EPSILON) continue;
      if (x + radius <= box.min.x || x - radius >= box.max.x) continue;
      if (z + radius <= box.min.z || z - radius >= box.max.z) continue;
      if (best === null || box.min.y < best) best = box.min.y;
    }
    return best;
  }

  private isSupported(p: Vector3, radius: number): boolean {
    const support = this.groundHeightAt(p.x, p.z);
    if (support !== null && Math.abs(p.y - support) <= EPSILON * 10) return true;
    for (const box of this.boxes) {
      if (p.x + radius <= box.min.x || p.x - radius >= box.max.x) continue;
      if (p.z + radius <= box.min.z || p.z - radius >= box.max.z) continue;
      if (Math.abs(p.y - box.max.y) <= EPSILON * 10) return true;
    }
    return false;
  }
}
