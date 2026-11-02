import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

export type QualityTier = 'high' | 'balanced';

export class Renderer {
  readonly three: WebGLRenderer;
  private quality: QualityTier = 'high';

  constructor(canvas: HTMLCanvasElement) {
    const params = new URLSearchParams(window.location.search);
    const paramQuality = params.get('quality');
    if (paramQuality === 'balanced' || paramQuality === 'high') {
      this.quality = paramQuality;
    } else if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      this.quality = 'balanced';
    }

    this.three = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.three.setPixelRatio(this.quality === 'balanced' ? 1 : Math.min(window.devicePixelRatio, 2));
    this.three.toneMapping = ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.0;
    this.three.outputColorSpace = SRGBColorSpace;
    this.resize(window.innerWidth, window.innerHeight);
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    this.three.setPixelRatio(tier === 'balanced' ? 1 : Math.min(window.devicePixelRatio, 2));
  }

  getQuality(): QualityTier {
    return this.quality;
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
