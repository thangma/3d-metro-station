import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { InteractionSystem } from '../../src/systems/InteractionSystem';

function cameraLookingForward(): PerspectiveCamera {
  const camera = new PerspectiveCamera(90, 1, 0.1, 100);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);
  camera.updateMatrixWorld(true);
  return camera;
}

describe('InteractionSystem', () => {
  it('selects the nearest target inside the view cone', () => {
    const system = new InteractionSystem();
    const near = { position: new Vector3(0, 0, -1.2), radius: 0.4, promptVi: 'Gần', promptEn: 'Near', action: vi.fn() };
    const far = { position: new Vector3(0, 0, -2.4), radius: 0.4, promptVi: 'Xa', promptEn: 'Far', action: vi.fn() };
    system.register(far);
    system.register(near);

    expect(system.update(cameraLookingForward(), new Vector3())).toBe(near);
  });

  it('ignores targets behind the player', () => {
    const system = new InteractionSystem();
    system.register({ position: new Vector3(0, 0, 2), radius: 0.4, promptVi: 'Sau', promptEn: 'Behind', action: vi.fn() });

    expect(system.update(cameraLookingForward(), new Vector3())).toBeNull();
  });

  it('ignores targets outside the 35 degree cone', () => {
    const system = new InteractionSystem();
    system.register({ position: new Vector3(2, 0, -2), radius: 0.4, promptVi: 'Bên', promptEn: 'Side', action: vi.fn() });

    expect(system.update(cameraLookingForward(), new Vector3())).toBeNull();
  });

  it('skips disabled targets', () => {
    const system = new InteractionSystem();
    system.register({
      position: new Vector3(0, 0, -2),
      radius: 0.4,
      promptVi: 'Khóa',
      promptEn: 'Locked',
      action: vi.fn(),
      enabled: () => false,
    });

    expect(system.update(cameraLookingForward(), new Vector3())).toBeNull();
  });

  it('interact() returns false with no target and invokes the target action otherwise', () => {
    const system = new InteractionSystem();
    const action = vi.fn();
    expect(system.interact()).toBe(false);

    system.register({ position: new Vector3(0, 0, -2), radius: 0.4, promptVi: 'Mở', promptEn: 'Open', action });
    system.update(cameraLookingForward(), new Vector3());

    expect(system.interact()).toBe(true);
    expect(action).toHaveBeenCalledOnce();
  });
});
