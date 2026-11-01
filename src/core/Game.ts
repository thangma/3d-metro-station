import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
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
import type { EscalatorSpec } from '../world/layout';

const STATE_POSITIONS: Record<string, [number, number, number]> = {
  street: [-30, 0, 12],
  pavilion: [-30, 0.6, 4],
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

    this.scene.background = new Color(0x0a1218);
    this.scene.fog = new Fog(0x0a1218, 80, 320);
    this.buildPlaceholder();

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

  private buildPlaceholder(): void {
    this.world.addBox(new Vector3(-95, -1, -15), new Vector3(95, 0, 15));

    const ground = new Mesh(
      new PlaneGeometry(190, 30),
      new MeshStandardMaterial({ color: 0x1c262b, roughness: 0.9, metalness: 0.05 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const grid = new GridHelper(190, 76, 0x2f4a52, 0x1b3036);
    grid.position.y = 0.01;
    this.scene.add(grid);

    const columnMaterial = new MeshStandardMaterial({
      color: 0x8b9599,
      roughness: 0.55,
      metalness: 0.25,
    });
    const columnGeometry = new BoxGeometry(0.9, 6.75, 0.9);
    for (let i = 0; i < 8; i += 1) {
      const x = -45 + i * 13 + (this.rng() - 0.5) * 0.02;
      const z = i % 2 === 0 ? 3.2 : -3.2;
      const column = new Mesh(columnGeometry, columnMaterial);
      column.position.set(x, 3.375, z);
      this.scene.add(column);
      this.world.addBox(
        new Vector3(x - 0.45, 0, z - 0.45),
        new Vector3(x + 0.45, 6.75, z + 0.45),
      );
    }

    this.scene.add(new HemisphereLight(0xbfd6ff, 0x3a3833, 1.1));
    const sun = new DirectionalLight(0xfff2dd, 2.2);
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
