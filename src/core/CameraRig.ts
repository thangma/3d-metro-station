import type { PerspectiveCamera } from 'three';
import { EYE_HEIGHT } from '../world/layout';
import type { PlayerController } from './PlayerController';

export class CameraRig {
  constructor(private readonly camera: PerspectiveCamera) {
    this.camera.rotation.order = 'YXZ';
  }

  apply(player: PlayerController): void {
    this.camera.position.set(
      player.position.x,
      player.position.y + EYE_HEIGHT,
      player.position.z,
    );
    this.camera.rotation.set(player.pitch, player.yaw, 0);
  }
}
