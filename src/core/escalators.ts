import { Vector3 } from 'three';
import type { EscalatorSpec } from '../world/layout';

const zero = new Vector3();

/** World-space carry for a player standing on any escalator footprint. */
export function resolveCarry(position: Vector3, specs: readonly EscalatorSpec[]): Vector3 {
  for (const spec of specs) {
    const f = spec.footprint;
    if (position.x < f.minX || position.x > f.maxX) continue;
    if (position.z < f.minZ || position.z > f.maxZ) continue;
    if (position.y < f.bottomY - 0.1 || position.y > f.topY + 0.5) continue;
    return spec.direction.clone().normalize().multiplyScalar(spec.speed);
  }
  return zero;
}
