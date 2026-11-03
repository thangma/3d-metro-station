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
import { TrainSystem } from '../systems/TrainSystem';
import { NpcSystem } from '../systems/NpcSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { buildNavGraph } from '../world/nav';
import { Hud } from '../ui/Hud';
import { Title } from '../ui/Title';
import { createDiagnostics, type Diagnostics } from '../test/diagnostics';
import { installHooks } from '../test/hooks';
import { createRng } from '../test/rng';
import { PAVILION_X, PAVILION_Y, type EscalatorSpec } from '../world/layout';
import { buildSite } from '../world/site';
import { buildPavilion } from '../world/pavilion';
import { buildConcourse, type ConcourseResult } from '../world/concourse';
import { buildPlatform, type PlatformResult } from '../world/platform';
import { buildTrain, type TrainResult } from '../world/train';
import { createMaterials, type MaterialLibrary } from '../world/kit/materials';

const STATE_POSITIONS: Record<string, [number, number, number, number?]> = {
  street: [PAVILION_X, 0, 17.5, 0],
  pavilion: [PAVILION_X, PAVILION_Y, 12.6, 0],
  concourse: [-20, -10, -1.1, -Math.PI / 2],
  platform: [8, -16.75, 2.5, 0],
  boarding: [0, -16.75, 2, 0],
  complete: [0, -16.75, 6, 0],
};

export class Game {
  readonly renderer: Renderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly cameraRig: CameraRig;
  private readonly world = new CollisionWorld();
  private readonly materials: MaterialLibrary;
  private concourse!: ConcourseResult;
  private platform!: PlatformResult;
  train!: TrainResult;
  readonly trainSystem = new TrainSystem();
  readonly npcSystem: NpcSystem;
  readonly audioSystem = new AudioSystem();
  readonly title: Title;
  private readonly player = new PlayerController(
    new Vector3(STATE_POSITIONS.street[0], STATE_POSITIONS.street[1], STATE_POSITIONS.street[2]),
  );
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
  private zone: 'street' | 'pavilion' | 'concourse' | 'platform' | 'train' = 'street';
  private autoMode = false;
  private autoWaypointIndex = 0;
  private autoWaitTimer = 0;
  private autoBadge?: HTMLElement;

  constructor(canvas: HTMLCanvasElement, hud: Hud) {
    this.hud = hud;
    const overlay = document.querySelector<HTMLElement>('#overlay') || document.body;
    this.title = new Title(
      overlay,
      () => {
        void this.audioSystem.unlock();
      },
      () => {
        this.toggleAutoMode(true);
      },
    );
    this.initAutoBadge();
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

    const nav = buildNavGraph();
    this.npcSystem = new NpcSystem(this.scene, () => this.rng(), nav, this.trainSystem);
    this.npcSystem.spawn(50);

    this.loop = new Loop(this.update, this.render);
    this.input = new InputController(
      canvas,
      (paused) => this.loop.setPaused(paused),
      () => void this.audioSystem.unlock(),
    );
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

  nextRandom(): number {
    return this.rng();
  }

  setState(name: string): { state: string } {
    const position = STATE_POSITIONS[name];
    if (!position) throw new Error(`Unknown state: ${name}`);
    this.player.teleport(position[0], position[1], position[2]);
    if (position[3] !== undefined) {
      this.player.yaw = position[3];
      this.player.pitch = 0;
    }
    this.cameraRig.apply(this.player);
    this.stage = name;
    this.title.hide();
    if (name === 'boarding') {
      this.trainSystem.forceState('boarding');
    } else if (name === 'platform') {
      this.trainSystem.forceState('idle');
    } else if (name === 'complete') {
      this.trainSystem.forceState('complete');
    }
    this.resolveCurrentZone();
    return { state: name };
  }

  setPausedForScreenshot(paused: boolean): void {
    if (paused) this.loop.setPaused(true);
    else this.input.setPaused(false);
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    this.npcSystem.setReducedMotion(enabled);
  }

  hideDebugUi(hidden: boolean): void {
    this.debugUiHidden = hidden;
  }

  toggleAutoMode(enabled?: boolean): boolean {
    this.autoMode = enabled !== undefined ? enabled : !this.autoMode;
    if (this.autoMode) {
      this.autoWaypointIndex = 0;
      this.autoWaitTimer = 0;
      if (this.stage === 'complete') {
        this.restart();
      }
    }
    this.updateAutoBadge();
    return this.autoMode;
  }

  private initAutoBadge(): void {
    const badge = document.createElement('button');
    badge.className = 'auto-mode-badge';
    badge.dataset.testid = 'auto-mode-toggle';
    badge.textContent = 'Auto Mode: OFF';
    badge.addEventListener('click', () => {
      this.toggleAutoMode();
    });
    document.body.appendChild(badge);
    this.autoBadge = badge;
  }

  private updateAutoBadge(): void {
    if (this.autoBadge) {
      this.autoBadge.textContent = this.autoMode ? 'Auto Mode: ON' : 'Auto Mode: OFF';
      this.autoBadge.style.borderColor = this.autoMode ? '#4ee0a5' : '#38bdf8';
      this.autoBadge.style.color = this.autoMode ? '#4ee0a5' : '#38bdf8';
    }
  }

  private buildWorld(): void {
    buildSite(this.scene, this.world, this.materials);
    const south = buildPavilion(this.scene, this.world, this.materials, PAVILION_X, 1);
    this.escalators.push(...south.escalators);
    buildPavilion(this.scene, this.world, this.materials, PAVILION_X, -1);

    this.concourse = buildConcourse(
      this.scene,
      this.world,
      this.materials,
      this.interaction,
    );
    this.escalators.push(...this.concourse.escalators);

    this.platform = buildPlatform(
      this.scene,
      this.world,
      this.materials,
      this.interaction,
    );

    this.train = buildTrain(
      this.scene,
      this.materials,
    );

    this.scene.add(new HemisphereLight(0xdfeaf5, 0x4a4640, 1.5));
    const sun = new DirectionalLight(0xfff2dd, 2.6);
    sun.position.set(40, 60, 20);
    this.scene.add(sun);
  }

  private readonly update = (dt: number): void => {
    this.elapsed += dt;

    let input = this.input.pressed();
    const look = this.input.takeLook(dt);
    this.player.look(look.x, look.y);

    const carry = resolveCarry(this.player.position, this.escalators);

    if (this.autoMode) {
      this.updateAutoTour(dt);
      input = { forward: 0, right: 0, sprint: false, interact: false };
    }

    this.player.update(dt, input, this.world, carry);
    this.cameraRig.apply(this.player);
    this.concourse.update(dt);

    this.resolveCurrentZone();

    const playerInDoorway = this.train.playerDoorway.containsPoint(this.player.position);
    this.trainSystem.update(dt, { playerInDoorway });

    this.train.setPositionX(this.trainSystem.positionX);
    this.train.setDoorOpen(this.trainSystem.doorOpen);
    this.train.setHeadlights(this.trainSystem.speed > 0 ? 1 : 0.4);
    this.platform.setPsdOpen(this.trainSystem.doorOpen);
    this.platform.update(dt);
    this.npcSystem.update(dt);

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

  get currentZone(): 'street' | 'pavilion' | 'concourse' | 'platform' | 'train' {
    return this.zone;
  }

  completeRun(): void {
    void this.hud.fade(1, 1000).then(() => {
      this.hud.showEndCard(() => {
        this.restart();
      });
    });
  }

  restart(): void {
    this.hud.hideEndCard();
    this.trainSystem.forceState('idle');
    this.setState('street');
    this.autoWaypointIndex = 0;
    this.autoWaitTimer = 0;
    void this.hud.fade(0, 500);
  }

  private updateAutoTour(dt: number): void {
    if (this.autoWaitTimer > 0) {
      this.autoWaitTimer -= dt;
      return;
    }

    const waypoints: Array<{
      pos: [number, number, number];
      yaw: number;
      speed: number;
      onReach?: () => void;
      canProceed?: () => boolean;
    }> = [
      // 1. Street -> Pavilion landing
      { pos: [-30, 0.6, 14], yaw: 0, speed: 4.8 },
      // 2. Entrance -> Pavilion stairs top
      { pos: [-33.2, 0.6, 11.5], yaw: 0, speed: 4.5 },
      // 3. Pavilion stairs descent
      { pos: [-33.2, -10, -8.5], yaw: 0, speed: 5.0 },
      // 3b. Step clear off stair shaft into concourse
      { pos: [-33.2, -10, -11.0], yaw: 0, speed: 5.0 },
      // 3c. Walk into central concourse circulation aisle
      { pos: [-20.0, -10, -11.0], yaw: -Math.PI / 2, speed: 5.0 },
      // 4. Ticket hall approach
      { pos: [-20, -10, -1.1], yaw: -Math.PI / 2, speed: 5.0 },
      // 5. Gate line: auto-scan ticket
      {
        pos: [-12.5, -10, -1.1],
        yaw: -Math.PI / 2,
        speed: 4.0,
        onReach: () => {
          this.concourse.setGateOpen(true);
          this.hud.showCaption('Đã soát vé thành công / Ticket scanned', 2000);
          this.autoWaitTimer = 0.5;
        },
      },
      // 6. Walk through gate towards escalator
      { pos: [-10, -10, 1.1], yaw: -Math.PI / 2, speed: 4.8 },
      // 7. Descend escalator down to platform
      { pos: [3, -16.75, 1.1], yaw: -Math.PI / 2, speed: 4.5 },
      // 8. Walk along platform towards train PSD doors
      {
        pos: [0, -16.75, 5.0],
        yaw: Math.PI,
        speed: 4.5,
        onReach: () => {
          this.trainSystem.requestArrival();
        },
      },
      // 9. Approach PSD bay door
      {
        pos: [0, -16.75, 7.0],
        yaw: Math.PI,
        speed: 3.5,
        canProceed: () => this.trainSystem.isBoardingOpen(),
      },
      // 10. Board into metro car
      {
        pos: [0, -16.75, 8.8],
        yaw: Math.PI,
        speed: 2.8,
        onReach: () => {
          this.completeRun();
          this.autoMode = false;
          this.updateAutoBadge();
        },
      },
    ];

    if (this.autoWaypointIndex >= waypoints.length) {
      return;
    }

    const current = waypoints[this.autoWaypointIndex];
    if (current.canProceed && !current.canProceed()) {
      return;
    }

    const targetPos = new Vector3(...current.pos);
    const diff = targetPos.clone().sub(this.player.position);
    const distH = Math.hypot(diff.x, diff.z);

    if (distH < 0.35) {
      if (current.onReach) {
        current.onReach();
      }
      this.autoWaypointIndex += 1;
      return;
    }

    const step = Math.min(distH, current.speed * dt);
    const dirX = (diff.x / distH) * step;
    const dirZ = (diff.z / distH) * step;

    this.player.position.x += dirX;
    this.player.position.z += dirZ;
    const ground = this.world.groundHeightAt(this.player.position.x, this.player.position.z, this.player.position.y);
    if (ground !== null) {
      this.player.position.y = ground;
    }

    this.player.yaw = current.yaw;
    this.player.pitch = 0;
  }

  private resolveCurrentZone(): void {
    const y = this.player.position.y;
    let nextZone: 'street' | 'pavilion' | 'concourse' | 'platform' | 'train' = 'street';

    if (y < -15.0) {
      if (this.player.position.z > 7.5) {
        nextZone = 'train';
      } else {
        nextZone = 'platform';
      }
    } else if (y < -4.0) {
      nextZone = 'concourse';
    } else if (y > 0.4 && this.player.position.z < 15.0) {
      nextZone = 'pavilion';
    } else {
      nextZone = 'street';
    }

    if (nextZone !== this.zone) {
      this.zone = nextZone;
      const audioZone = nextZone === 'pavilion' ? 'concourse' : nextZone;
      this.audioSystem.setZone(audioZone);

      if (nextZone === 'platform' && this.trainSystem.state === 'idle') {
        this.trainSystem.requestArrival();
      }
    }
  }
}
