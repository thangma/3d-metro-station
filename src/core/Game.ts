import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
} from 'three';
import { CameraRig } from './CameraRig';
import { CollisionWorld } from './CollisionWorld';
import { InputController } from './InputController';
import { Loop } from './Loop';
import { PlayerController } from './PlayerController';
import { Renderer } from './Renderer';
import { resolveCarry } from './escalators';
import { InteractionSystem } from '../systems/InteractionSystem';
import { Hud } from '../ui/Hud';
import { createDiagnostics, type Diagnostics } from '../test/diagnostics';
import { installHooks } from '../test/hooks';
import { createRng } from '../test/rng';
import { PAVILION_X, PAVILION_Y, type EscalatorSpec } from '../world/layout';
import { buildSite } from '../world/site';
import { buildPavilion } from '../world/pavilion';
import { createMaterials, type MaterialLibrary } from '../world/kit/materials';

const STATE_POSITIONS: Record<string, [number, number, number]> = {
  street: [PAVILION_X, 0, 17.5],
  pavilion: [PAVILION_X, PAVILION_Y, 12.6],
  concourse: [-40, -10, 0],
  platform: [0, -16.75, 0],
  boarding: [0, -16.75, 2],
  complete: [0, -16.75, 6],
};

/**
 * Owns the scene, world systems, and frame orchestration.
 * The placeholder world is replaced by the station in later tasks.
 */
export class Game {
  private readonly renderer: Renderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly cameraRig: CameraRig;
  private readonly world = new CollisionWorld();
  private readonly materials: MaterialLibrary;
  private readonly player = new PlayerController(new Vector3(...STATE_POSITIONS.street));
  private readonly input: InputController;
  private readonly loop: Loop;
  private readonly diagnostics = createDiagnostics();
  private readonly escalators: EscalatorSpec[] = [];
  readonly interaction = new InteractionSystem();
  readonly hud: Hud;

  private rng = createRng(42);
  private stage = 'street';
  private reducedMotion = false;
  private debugUiHidden = false;
  private elapsed = 0;

  constructor(canvas: HTMLCanvasElement, hud: Hud) {
    this.hud = hud;
    this.renderer = new Renderer(canvas);
    this.camera = new PerspectiveCamera(
      90,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      400,
    );
    this.cameraRig = new CameraRig(this.camera);
    this.cameraRig.apply(this.player);

    this.scene.background = new Color(0x9fb6c6);
    this.scene.fog = new Fog(0xb9c9d2, 70, 340);
    this.materials = createMaterials(this.renderer.three);
    this.buildWorld();

    this.loop = new Loop(this.update, this.render);
    this.input = new InputController(canvas, (paused) => this.loop.setPaused(paused));
  }

  start(): void {
    this.loop.start();
  }

  installHooks(): void {
    installHooks(this);
  }

  resize(): void {
    const width = window.innerWidth;
    const height = Math.max(1, window.innerHeight);
    this.renderer.resize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  getDiagnostics(): Diagnostics {
    return this.diagnostics;
  }

  seed(value: number): void {
    this.rng = createRng(value);
  }

  /** Seeded randomness shared by every system that needs it. */
  nextRandom(): number {
    return this.rng();
  }

  setState(name: string): { state: string } {
    const position = STATE_POSITIONS[name];
    if (!position) throw new Error(`Unknown state: ${name}`);
    this.player.teleport(position[0], position[1], position[2]);
    this.cameraRig.apply(this.player);
    this.stage = name;
    return { state: name };
  }

  setPausedForScreenshot(paused: boolean): void {
    if (paused) this.loop.setPaused(true);
    else this.input.setPaused(false);
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  hideDebugUi(hidden: boolean): void {
    this.debugUiHidden = hidden;
  }

  private buildWorld(): void {
    buildSite(this.scene, this.world, this.materials);
    const south = buildPavilion(this.scene, this.world, this.materials, PAVILION_X, 1);
    this.escalators.push(...south.escalators);
    buildPavilion(this.scene, this.world, this.materials, PAVILION_X, -1);

    this.scene.add(new HemisphereLight(0xdfeaf5, 0x4a4640, 1.5));
    const sun = new DirectionalLight(0xfff2dd, 2.6);
    sun.position.set(40, 60, 20);
    this.scene.add(sun);
  }

  private readonly update = (dt: number): void => {
    this.elapsed += dt;

    const input = this.input.pressed();
    const look = this.input.takeLook(dt);
    this.player.look(look.x, look.y);

    const carry = resolveCarry(this.player.position, this.escalators);
    this.player.update(dt, input, this.world, carry);
    this.cameraRig.apply(this.player);

    const target = this.interaction.update(this.camera, this.player.position);
    this.hud.setPrompt(target ? target.promptVi : null, target?.promptEn);

    if (this.input.consumeInteract()) {
      this.interaction.interact();
    }
  };

  private readonly render = (): void => {
    this.renderer.three.render(this.scene, this.camera);
    this.writeDiagnostics();
  };

  private writeDiagnostics(): void {
    const info = this.renderer.three.info;
    const canvas = this.renderer.three.domElement;
    const diagnostics = this.diagnostics;
    diagnostics.frame += 1;
    diagnostics.elapsed = this.elapsed;
    diagnostics.stage = this.stage;
    diagnostics.player.position.x = this.player.position.x;
    diagnostics.player.position.y = this.player.position.y;
    diagnostics.player.position.z = this.player.position.z;
    diagnostics.player.speed = this.player.speed;
    diagnostics.renderer.calls = info.render.calls;
    diagnostics.renderer.triangles = info.render.triangles;
    diagnostics.renderer.geometries = info.memory.geometries;
    diagnostics.renderer.textures = info.memory.textures;
    diagnostics.canvas.clientWidth = canvas.clientWidth;
    diagnostics.canvas.clientHeight = canvas.clientHeight;
    diagnostics.canvas.width = canvas.width;
    diagnostics.canvas.height = canvas.height;
    diagnostics.canvas.dpr = this.renderer.three.getPixelRatio();
    window.__THREE_GAME_DIAGNOSTICS__ = diagnostics;
  }

  get isReducedMotion(): boolean {
    return this.reducedMotion;
  }

  get isDebugUiHidden(): boolean {
    return this.debugUiHidden;
  }
}
