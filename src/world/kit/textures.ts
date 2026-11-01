export type TextureKind = 'terrazzo' | 'concrete' | 'brushed' | 'tactile' | 'livery';

export interface ProceduralTextureSet {
  albedo: Uint8Array;
  roughness: Uint8Array;
  normal: Uint8Array;
}

type Rgb = [number, number, number];

const TERRAZZO_CHIPS: Rgb[] = [
  [150, 146, 138],
  [178, 172, 162],
  [120, 122, 124],
  [196, 190, 180],
  [132, 110, 92],
];

/**
 * Deterministic, DOM-free texture data. Same seed and size always produce
 * byte-identical arrays, which keeps captures reproducible.
 */
export function proceduralTexture(
  kind: TextureKind,
  size: number,
  rng: () => number,
): ProceduralTextureSet {
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);
  const base = new Float32Array(size * size * 3);

  paint(kind, size, rng, base, height);

  for (let i = 0; i < size * size; i += 1) {
    const r = clamp(base[i * 3]);
    const g = clamp(base[i * 3 + 1]);
    const b = clamp(base[i * 3 + 2]);
    const o = i * 4;

    albedo[o] = r;
    albedo[o + 1] = g;
    albedo[o + 2] = b;
    albedo[o + 3] = 255;

    const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    const rough = clamp(225 - luminance * 70 + (rng() - 0.5) * 14);
    roughness[o] = rough;
    roughness[o + 1] = rough;
    roughness[o + 2] = rough;
    roughness[o + 3] = 255;
  }

  return { albedo, roughness, normal: heightToNormal(height, size) };
}

function paint(
  kind: TextureKind,
  size: number,
  rng: () => number,
  base: Float32Array,
  height: Float32Array,
): void {
  switch (kind) {
    case 'terrazzo':
      fill(base, size, [198, 195, 188]);
      height.fill(0.5);
      paintTerrazzo(base, height, size, rng);
      break;
    case 'concrete':
      paintConcrete(base, height, size, rng);
      break;
    case 'brushed':
      paintBrushed(base, height, size, rng);
      break;
    case 'tactile':
      paintTactile(base, height, size);
      break;
    case 'livery':
      paintLivery(base, height, size, rng);
      break;
  }
}

function paintTerrazzo(
  base: Float32Array,
  height: Float32Array,
  size: number,
  rng: () => number,
): void {
  const chips = Math.round((size * size) / 46);
  for (let i = 0; i < chips; i += 1) {
    const cx = rng() * size;
    const cy = rng() * size;
    const radius = 0.7 + rng() * 2.4;
    const color = TERRAZZO_CHIPS[Math.floor(rng() * TERRAZZO_CHIPS.length)];
    const spread = Math.ceil(radius);
    for (let y = -spread; y <= spread; y += 1) {
      for (let x = -spread; x <= spread; x += 1) {
        if (x * x + y * y > radius * radius) continue;
        const px = Math.floor(cx + x);
        const py = Math.floor(cy + y);
        if (px < 0 || py < 0 || px >= size || py >= size) continue;
        setPixel(base, height, size, px, py, color, 0.62);
      }
    }
  }
}

function paintConcrete(
  base: Float32Array,
  height: Float32Array,
  size: number,
  rng: () => number,
): void {
  const formEvery = Math.max(8, Math.floor(size / 4));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = (rng() - 0.5) * 22;
      const band = y % formEvery === 0 ? -16 : 0;
      const seam = x % Math.floor(size / 2) === 0 ? -8 : 0;
      setPixel(base, height, size, x, y, [186 + grain + band + seam, 182 + grain + band + seam, 174 + grain + band + seam], 0.5 + grain / 90);
    }
  }
}

function paintBrushed(
  base: Float32Array,
  height: Float32Array,
  size: number,
  rng: () => number,
): void {
  for (let y = 0; y < size; y += 1) {
    const streak = (rng() - 0.5) * 16;
    for (let x = 0; x < size; x += 1) {
      const grain = (rng() - 0.5) * 6;
      setPixel(base, height, size, x, y, [148 + streak + grain, 154 + streak + grain, 158 + streak + grain], 0.5 + streak / 60);
    }
  }
}

function paintTactile(base: Float32Array, height: Float32Array, size: number): void {
  const spacing = Math.max(6, Math.floor(size / 8));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const onDot = x % spacing < spacing / 2 && y % spacing < spacing / 2;
      const inset = x % spacing === 0 || y % spacing === 0;
      const color: Rgb = onDot ? [221, 176, 58] : inset ? [170, 134, 44] : [204, 162, 52];
      setPixel(base, height, size, x, y, color, onDot ? 0.92 : 0.2);
    }
  }
}

function paintLivery(
  base: Float32Array,
  height: Float32Array,
  size: number,
  rng: () => number,
): void {
  for (let y = 0; y < size; y += 1) {
    const t = y / size;
    let color: Rgb = [203, 208, 212];
    let h = 0.5;
    if (t > 0.56 && t < 0.63) color = [0, 132, 74];
    else if (t > 0.2 && t < 0.205) color = [90, 96, 100];
    else if (t > 0.78 && t < 0.785) color = [120, 126, 130];
    if (t > 0.56 && t < 0.63) h = 0.55;
    for (let x = 0; x < size; x += 1) {
      const grain = (rng() - 0.5) * 5;
      setPixel(base, height, size, x, y, [color[0] + grain, color[1] + grain, color[2] + grain], h);
    }
  }
}

function fill(base: Float32Array, size: number, color: Rgb): void {
  for (let i = 0; i < size * size; i += 1) {
    base[i * 3] = color[0];
    base[i * 3 + 1] = color[1];
    base[i * 3 + 2] = color[2];
  }
}

function setPixel(
  base: Float32Array,
  height: Float32Array,
  size: number,
  x: number,
  y: number,
  color: Rgb,
  h: number,
): void {
  const i = y * size + x;
  base[i * 3] = color[0];
  base[i * 3 + 1] = color[1];
  base[i * 3 + 2] = color[2];
  height[i] = h;
}

function heightToNormal(height: Float32Array, size: number): Uint8Array {
  const normal = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const up = height[((y - 1 + size) % size) * size + x];
      const down = height[((y + 1) % size) * size + x];
      const dx = (left - right) * 2.2;
      const dy = (up - down) * 2.2;
      const length = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      normal[o] = Math.round(((dx / length) * 0.5 + 0.5) * 255);
      normal[o + 1] = Math.round(((dy / length) * 0.5 + 0.5) * 255);
      normal[o + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      normal[o + 3] = 255;
    }
  }
  return normal;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
