import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

export type QualityTier = 'high' | 'balanced';

export class Renderer {
  readonly three: WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.three = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.three.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.three.toneMapping = ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.0;
    this.three.outputColorSpace = SRGBColorSpace;
    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(width: number, height: number): void {
    this.three.setSize(width, height, false);
  }

  get width(): number {
    return this.three.domElement.clientWidth;
  }

  get height(): number {
    return this.three.domElement.clientHeight;
  }

  dispose(): void {
    this.three.dispose();
  }
}
