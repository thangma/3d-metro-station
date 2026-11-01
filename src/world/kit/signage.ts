import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { BoxSpec } from '../../core/CollisionWorld';
import type { MaterialLibrary } from './materials';
import { type Kit } from './types';

export interface SignOptions {
  width?: number;
  height?: number;
  /** Background colour of the sign plate. */
  background?: string;
  foreground?: string;
}

/**
 * Vietnamese/English wayfinding sign. The plate carries a generated canvas
 * texture so no external font files or images are needed.
 */
export function buildSign(
  textVi: string,
  textEn: string,
  options: SignOptions = {},
  materials?: MaterialLibrary,
): Kit {
  const width = options.width ?? 2.4;
  const height = options.height ?? 0.8;
  const background = options.background ?? '#0b2a24';
  const foreground = options.foreground ?? '#f2f4f2';

  const group = new Group();
  group.name = 'sign';

  const texture = signTexture(textVi, textEn, background, foreground);
  const faceMaterial = new MeshBasicMaterial({ map: texture, toneMapped: false });
  const plateMaterial = materials?.brushedAluminium ?? FALLBACK_ALUMINIUM;

  const plate = new Mesh(new BoxGeometry(width, height, 0.06), plateMaterial);
  group.add(plate);

  const face = new Mesh(new BoxGeometry(width * 0.98, height * 0.9, 0.005), faceMaterial);
  face.position.z = 0.033;
  group.add(face);

  const colliders: BoxSpec[] = [
    {
      min: new Vector3(-width / 2, 0, -0.06),
      max: new Vector3(width / 2, height, 0.06),
    },
  ];

  return { group, colliders };
}

function signTexture(
  textVi: string,
  textEn: string,
  background: string,
  foreground: string,
): CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const width = 512;
  const height = 170;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = foreground;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '600 54px "Segoe UI", system-ui, sans-serif';
  context.fillText(textVi, width / 2, height * 0.38);

  context.globalAlpha = 0.75;
  context.font = '400 30px "Segoe UI", system-ui, sans-serif';
  context.fillText(textEn, width / 2, height * 0.72);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const FALLBACK_ALUMINIUM = new MeshStandardMaterial({
  color: 0x2b3436,
  metalness: 0.7,
  roughness: 0.35,
});
