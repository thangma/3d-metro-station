import type { PlayerInput } from './PlayerController';

const MOUSE_SENSITIVITY = 0.0022;
const KEY_LOOK_SPEED = 1.8;

export class InputController {
  private readonly keys = new Set<string>();
  private readonly canvas: HTMLCanvasElement;
  private readonly onPauseChange: (paused: boolean) => void;
  private paused = false;
  private mouseX = 0;
  private mouseY = 0;
  private interactQueued = false;
  private justAcquiredLock = false;
  private readonly onUserInteraction?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    onPauseChange: (paused: boolean) => void,
    onUserInteraction?: () => void,
  ) {
    this.canvas = canvas;
    this.onPauseChange = onPauseChange;
    this.onUserInteraction = onUserInteraction;
    this.bind();
  }

  pressed(): PlayerInput {
    if (this.paused) {
      return { forward: 0, right: 0, sprint: false, interact: false };
    }
    const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const right = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    return {
      forward,
      right,
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      interact: this.interactQueued,
    };
  }

  /** Mouse and arrow-key look, returned as radians for this frame. */
  takeLook(dt: number): { x: number; y: number } {
    const mouse = this.paused ? { x: 0, y: 0 } : { x: this.mouseX, y: this.mouseY };
    this.mouseX = 0;
    this.mouseY = 0;

    if (this.paused) return { x: 0, y: 0 };

    const keyX = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
    const keyY = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);

    return {
      x: mouse.x * MOUSE_SENSITIVITY + keyX * KEY_LOOK_SPEED * dt,
      y: mouse.y * MOUSE_SENSITIVITY + keyY * KEY_LOOK_SPEED * dt,
    };
  }

  consumeInteract(): boolean {
    if (!this.interactQueued) return false;
    this.interactQueued = false;
    return true;
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.keys.clear();
    this.mouseX = 0;
    this.mouseY = 0;
    if (paused && document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
    this.onPauseChange(paused);
  }

  get isPaused(): boolean {
    return this.paused;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.canvas.removeEventListener('click', this.handleClick);
  }

  private bind(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.canvas.addEventListener('click', this.handleClick);
  }

  private readonly handleClick = (): void => {
    this.setPaused(false);
    this.onUserInteraction?.();
    this.justAcquiredLock = true;
    this.mouseX = 0;
    this.mouseY = 0;
    if (document.pointerLockElement !== this.canvas) {
      try {
        void this.canvas.requestPointerLock();
      } catch {
        // Pointer lock is optional; keyboard look remains available.
      }
    }
  };

  private readonly handlePointerLockChange = (): void => {
    if (document.pointerLockElement === this.canvas) {
      this.justAcquiredLock = true;
      this.mouseX = 0;
      this.mouseY = 0;
    } else if (!this.paused) {
      this.setPaused(true);
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      this.setPaused(true);
      return;
    }
    if (event.code === 'KeyE' && !event.repeat) {
      this.interactQueued = true;
    }
    if (event.code.startsWith('Arrow')) event.preventDefault();
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.setPaused(true);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (this.paused || document.pointerLockElement !== this.canvas) return;
    if (this.justAcquiredLock) {
      this.justAcquiredLock = false;
      return;
    }
    this.mouseX += event.movementX;
    this.mouseY += event.movementY;
  };
}
