import {
  DataTexture,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { createRng } from '../../test/rng';
import { proceduralTexture, type TextureKind } from './textures';

export interface MaterialLibrary {
  terrazzo: MeshStandardMaterial;
  concrete: MeshStandardMaterial;
  paintedSteel: MeshStandardMaterial;
  brushedAluminium: MeshStandardMaterial;
  glass: MeshPhysicalMaterial;
  psdGlass: MeshPhysicalMaterial;
  tactilePaving: MeshStandardMaterial;
  trainLivery: MeshStandardMaterial;
  ledStrip: MeshStandardMaterial;
  rubber: MeshStandardMaterial;
}

const SIZE = 256;

export function createMaterials(renderer?: WebGLRenderer): MaterialLibrary {
  const anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  const rng = createRng(1337);

  const terrazzo = mapsFor('terrazzo', rng, anisotropy, 0.7);
  const concrete = mapsFor('concrete', rng, anisotropy, 0.95);
  const brushed = mapsFor('brushed', rng, anisotropy, 0.4);
  const tactile = mapsFor('tactile', rng, anisotropy, 0.85);
  const livery = mapsFor('livery', rng, anisotropy, 0.45);

  return {
    terrazzo: new MeshStandardMaterial({
      ...terrazzo,
      metalness: 0.06,
      roughness: 1,
    }),
    concrete: new MeshStandardMaterial({
      ...concrete,
      metalness: 0.02,
      roughness: 1,
    }),
    paintedSteel: new MeshStandardMaterial({
      color: 0x9aa3a6,
      metalness: 0.4,
      roughness: 0.42,
    }),
    brushedAluminium: new MeshStandardMaterial({
      ...brushed,
      metalness: 0.82,
      roughness: 0.55,
    }),
    glass: new MeshPhysicalMaterial({
      color: 0xbcd6e2,
      metalness: 0,
      roughness: 0.06,
      transparent: true,
      opacity: 0.26,
      side: 2,
      depthWrite: false,
    }),
    psdGlass: new MeshPhysicalMaterial({
      color: 0x9fc9c4,
      metalness: 0,
      roughness: 0.08,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    tactilePaving: new MeshStandardMaterial({
      ...tactile,
      metalness: 0,
      roughness: 0.9,
    }),
    trainLivery: new MeshStandardMaterial({
      ...livery,
      metalness: 0.45,
      roughness: 0.48,
    }),
    ledStrip: new MeshStandardMaterial({
      color: 0x1a1a18,
      emissive: 0xfff1d2,
      emissiveIntensity: 2.6,
      roughness: 0.5,
    }),
    rubber: new MeshStandardMaterial({
      color: 0x24282a,
      roughness: 0.92,
      metalness: 0.05,
    }),
  };
}

function mapsFor(
  kind: TextureKind,
  rng: () => number,
  anisotropy: number,
  repeat: number,
): { map: Texture; normalMap: Texture; roughnessMap: Texture } {
  const set = proceduralTexture(kind, SIZE, rng);
  const map = dataTexture(set.albedo, SIZE, true, anisotropy);
  const normalMap = dataTexture(set.normal, SIZE, false, anisotropy);
  const roughnessMap = dataTexture(set.roughness, SIZE, false, anisotropy);
  for (const texture of [map, normalMap, roughnessMap]) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(repeat, repeat);
  }
  return { map, normalMap, roughnessMap };
}

function dataTexture(
  data: Uint8Array,
  size: number,
  srgb: boolean,
  anisotropy: number,
): DataTexture {
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.needsUpdate = true;
  texture.anisotropy = anisotropy;
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return texture;
}
