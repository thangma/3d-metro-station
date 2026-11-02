import { Vector3 } from 'three';
import {
  CONCOURSE_Y,
  PAVILION_X,
  PLATFORM_HALF_WIDTH,
  PLATFORM_Y,
  TRACK_WIDTH,
  VOID_X0,
  psdBayCenters,
} from './layout';

export interface NavGraph {
  waypoints: Vector3[];
  queueSlots: Vector3[];
  seats: Vector3[];
}

export function buildNavGraph(): NavGraph {
  const waypoints: Vector3[] = [
    new Vector3(PAVILION_X, 0, 17),
    new Vector3(PAVILION_X, 0.6, 13),
    new Vector3(PAVILION_X, -10, -5),
    new Vector3(-12, CONCOURSE_Y, -1.1),
    new Vector3(VOID_X0, CONCOURSE_Y, 0),
    new Vector3(VOID_X0 + 13, PLATFORM_Y, 0),
    new Vector3(10, PLATFORM_Y, 0),
  ];

  const bayCenters = psdBayCenters();
  const queueSlots: Vector3[] = [];
  for (const x of bayCenters) {
    for (let slot = 1; slot <= 3; slot++) {
      queueSlots.push(
        new Vector3(x, PLATFORM_Y, PLATFORM_HALF_WIDTH - slot * 0.7),
      );
    }
  }

  const trackZ = PLATFORM_HALF_WIDTH + TRACK_WIDTH / 2;
  const carCenters = [-44, -22, 0, 22, 44];
  const seats: Vector3[] = [];
  for (const carX of carCenters) {
    for (const seatX of [-6, -4, 4, 6]) {
      for (const seatSide of [-1, 1]) {
        seats.push(new Vector3(carX + seatX, PLATFORM_Y + 0.5, trackZ + seatSide * 0.8));
      }
    }
  }

  return { waypoints, queueSlots, seats };
}
