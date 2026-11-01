export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface Diagnostics {
  frame: number;
  elapsed: number;
  stage: string;
  trainState: string;
  complete: boolean;
  npcBoarded: number;
  player: {
    position: Vec3Like;
    speed: number;
  };
  renderer: {
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
  };
  canvas: {
    clientWidth: number;
    clientHeight: number;
    width: number;
    height: number;
    dpr: number;
  };
}

export function createDiagnostics(): Diagnostics {
  return {
    frame: 0,
    elapsed: 0,
    stage: 'boot',
    trainState: 'idle',
    complete: false,
    npcBoarded: 0,
    player: { position: { x: 0, y: 0, z: 0 }, speed: 0 },
    renderer: { calls: 0, triangles: 0, geometries: 0, textures: 0 },
    canvas: { clientWidth: 0, clientHeight: 0, width: 0, height: 0, dpr: 1 },
  };
}
