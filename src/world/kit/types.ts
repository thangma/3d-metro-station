import type { BoxSpec } from '../../core/CollisionWorld';
import type { Group } from 'three';

export interface Kit {
  group: Group;
  colliders: BoxSpec[];
}

export function emptyKit(group: Group): Kit {
  return { group, colliders: [] };
}
