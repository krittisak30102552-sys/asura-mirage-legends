/**
 * Procedural sprite textures for heroes, monsters, and combat effects.
 * Playable heroes use original frame-by-frame pixel art; enemies and combat effects keep their existing renderers.
 */

import * as THREE from 'three';
import { HeroAnimationState, HeroId, EnemyType } from '../types/game';
import { drawBiomeEnemy } from './biomeSprites';

export function createCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  // Generic smooth texture helper remains for environment and enemy effects.
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Smooth 2D character texture: the source canvas is kept at full resolution (no
 * pixel-grid downsample) and sampled with trilinear filtering so edges stay clean
 * at any camera zoom. The optional tint is applied with a canvas filter.
 */
function createActorPixelTexture(source: HTMLCanvasElement, tintFilter?: string): THREE.CanvasTexture {
  let canvas = source;
  if (tintFilter) {
    canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.filter = tintFilter;
    ctx.drawImage(source, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}



// ----------------------------------------------------------------------
// ORIGINAL PIXEL HERO ART
// Drawn for Asura Mirage Legends: visual references guide the style only.
// Every limb, face, garment, weapon, and animation pose is rendered here.
// 96 x 120 low-resolution canvas + nearest-neighbour sampling = crisp pixels.
// ----------------------------------------------------------------------
type PixelHeroPalette = {
  outline: string; skin: string; skinShade: string; hair: string; hairShade: string;
  hairLight: string; coat: string; coatShade: string; coatLight: string; pants: string;
  pantsShade: string; boots: string; belt: string; metal: string; metalLight: string;
  accent: string; accentShade: string; eye: string;
};

const HERO_PIXEL_PALETTES: Record<HeroId, PixelHeroPalette> = {
  ginzo: {
    outline: '#15131b', skin: '#f0b58b', skinShade: '#b96959',
    hair: '#f0f0e9', hairShade: '#989eaa', hairLight: '#ffffff',
    coat: '#a91f31', coatShade: '#5a1224', coatLight: '#ed4c4d',
    pants: '#34202a', pantsShade: '#201c2b', boots: '#101d29',
    belt: '#36252c', metal: '#a7b5c4', metalLight: '#f7f7ed',
    accent: '#e7c8a0', accentShade: '#765144', eye: '#30232b'
  },
  quan: {
    outline: '#171922', skin: '#f0bc91', skinShade: '#b66f56',
    hair: '#24202b', hairShade: '#12151e', hairLight: '#5a4350',
    coat: '#e7e1c8', coatShade: '#969da9', coatLight: '#fff7de',
    pants: '#283344', pantsShade: '#161f2e', boots: '#171a24',
    belt: '#b52b39', metal: '#8ed8d0', metalLight: '#d7fff2',
    accent: '#39a9a1', accentShade: '#19656e', eye: '#29212a'
  },
  katherine: {
    outline: '#191624', skin: '#ffe0c1', skinShade: '#cd8f7c',
    hair: '#f1c45b', hairShade: '#b87b32', hairLight: '#fff0a1',
    coat: '#30233f', coatShade: '#1c1a31', coatLight: '#58446b',
    pants: '#29253c', pantsShade: '#171728', boots: '#131522',
    belt: '#b84c8e', metal: '#d9deef', metalLight: '#ffffff',
    accent: '#b76bd0', accentShade: '#6e4099', eye: '#4a6a9a'
  },
  bamdee: {
    outline: '#101922', skin: '#edb18a', skinShade: '#a96155',
    hair: '#eef4ec', hairShade: '#98b9bb', hairLight: '#ffffff',
    coat: '#087d68', coatShade: '#064239', coatLight: '#23d6a2',
    pants: '#192a36', pantsShade: '#0d1a27', boots: '#0b1921',
    belt: '#d4b653', metal: '#8ce5d3', metalLight: '#e6fff5',
    accent: '#a7f56b', accentShade: '#246c54', eye: '#20262d'
  }
};

function pixelPoly(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, fill: string, outline: string, lineWidth = 2): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'miter';
  ctx.stroke();
}

function pixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, outline?: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2);
  }
}

function pixelLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.strokeStyle = color;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawPixelKatana(
  ctx: CanvasRenderingContext2D, hx: number, hy: number, angle: number,
  palette: PixelHeroPalette, gold: boolean, teal = false
): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  const guardX = hx + dx * 5;
  const guardY = hy + dy * 5;
  const bladeStartX = hx + dx * 7;
  const bladeStartY = hy + dy * 7;
  const tipX = hx + dx * 39;
  const tipY = hy + dy * 39;
  const bladeWidth = 2.5;

  pixelPoly(ctx, [
    [bladeStartX + px * bladeWidth + dx * 2, bladeStartY + py * bladeWidth + dy * 2],
    [tipX - dx * 2 + px, tipY - dy * 2 + py],
    [tipX + dx * 1.5, tipY + dy * 1.5],
    [tipX - dx * 2 - px, tipY - dy * 2 - py],
    [bladeStartX - px * bladeWidth + dx * 2, bladeStartY - py * bladeWidth + dy * 2]
  ], gold ? '#f6c94b' : teal ? '#5cebd0' : palette.metal, palette.outline, 2);

  pixelLine(ctx, bladeStartX + px * 0.5, bladeStartY + py * 0.5,
    tipX - dx * 3 + px * 0.5, tipY - dy * 3 + py * 0.5,
    gold ? '#fff2a1' : teal ? '#e3fff8' : palette.metalLight, 1.5);

  // Dark wrapped handle, alternating wrap stitches, and a distinctive guard.
  pixelLine(ctx, hx - dx * 8, hy - dy * 8, guardX, guardY, palette.outline, 6);
  pixelLine(ctx, hx - dx * 8, hy - dy * 8, guardX, guardY, palette.accentShade, 3);
  for (let i = 1; i <= 3; i++) {
    const t = i * 2;
    pixelRect(ctx, hx - dx * t - 1, hy - dy * t - 1, 3, 2,
      i % 2 ? (gold ? '#ffdc67' : palette.accent) : palette.outline);
  }
  pixelLine(ctx, guardX + px * 4.5, guardY + py * 4.5,
    guardX - px * 4.5, guardY - py * 4.5,
    palette.outline, 5);
  pixelLine(ctx, guardX + px * 4.5, guardY + py * 4.5,
    guardX - px * 4.5, guardY - py * 4.5,
    gold ? '#ffdd64' : palette.accent, 2.5);
}

function drawPixelStaff(
  ctx: CanvasRenderingContext2D, hx: number, hy: number, angle: number,
  palette: PixelHeroPalette, frame: number, casting: boolean
): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  const endX = hx + dx * 33;
  const endY = hy + dy * 33;
  const bottomX = hx - dx * 25;
  const bottomY = hy - dy * 25;
  pixelLine(ctx, bottomX, bottomY, endX, endY, palette.outline, 6);
  pixelLine(ctx, bottomX, bottomY, endX, endY, palette.metal, 3);
  pixelLine(ctx, bottomX, bottomY, endX, endY, palette.metalLight, 1);
  for (let i = 0; i < 4; i++) {
    const t = -15 + i * 5;
    const x = hx + dx * t;
    const y = hy + dy * t;
    pixelLine(ctx, x + px * 3, y + py * 3, x - px * 3, y - py * 3,
      i % 2 ? palette.accent : palette.accentShade, 2);
  }
  const gem = casting && frame % 3 === 0 ? '#fff3b8' : '#b9f7ff';
  pixelPoly(ctx, [
    [endX, endY - 7], [endX + 6, endY], [endX, endY + 7], [endX - 6, endY]
  ], palette.accent, palette.outline, 2);
  pixelPoly(ctx, [
    [endX, endY - 4], [endX + 3, endY], [endX, endY + 3], [endX - 3, endY]
  ], gem, palette.metalLight, 1);
  // Crescent prongs are part of the staff silhouette, not a floating ring effect.
  pixelLine(ctx, endX - px * 7 + dx * 2, endY - py * 7 + dy * 2,
    endX + px * 7 + dx * 2, endY + py * 7 + dy * 2, palette.outline, 3);
  pixelLine(ctx, endX - px * 7 + dx * 2, endY - py * 7 + dy * 2,
    endX + px * 7 + dx * 2, endY + py * 7 + dy * 2, palette.accent, 1.5);
}

function drawPixelBoot(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, palette: PixelHeroPalette): void {
  pixelPoly(ctx, [[x, y], [x + width - 3, y], [x + width, y + 5], [x + width, y + 8], [x - 2, y + 8], [x - 2, y + 4]],
    palette.boots, palette.outline, 2);
  pixelRect(ctx, x, y + 3, width - 2, 2, palette.accentShade);
}

function drawSamuraiPixelHero(
  ctx: CanvasRenderingContext2D, palette: PixelHeroPalette, frame: number,
  state: HeroAnimationState, weaponAngle: number, bob: number,
  runStep: number, armSwing: number, lunge: number, gold: boolean, teal: boolean
): void {
  const out = palette.outline;
  const leg = state === 'run' ? runStep : state.startsWith('attack') ? Math.round(Math.sin(frame / 11 * Math.PI) * 2) : 0;
  const bodyY = -bob + lunge;

  // Split hakama legs; knees, folded cuffs and boots shift independently in the run cycle.
  pixelPoly(ctx, [[34 + leg, 64 + bodyY], [46 + leg, 65 + bodyY], [45, 83 + bodyY],
    [39 + leg, 99 + bodyY], [29 + leg, 99 + bodyY], [33, 82 + bodyY]],
    palette.pants, out);
  pixelPoly(ctx, [[47 - leg, 65 + bodyY], [58 - leg, 64 + bodyY], [61, 82 + bodyY],
    [65 - leg, 99 + bodyY], [54 - leg, 99 + bodyY], [49, 82 + bodyY]],
    palette.pantsShade, out);
  pixelRect(ctx, 34 + leg, 82 + bodyY, 10, 3, palette.accentShade);
  pixelRect(ctx, 52 - leg, 82 + bodyY, 9, 3, palette.accentShade);
  drawPixelBoot(ctx, 29 + leg, 98 + bodyY, 14, palette);
  drawPixelBoot(ctx, 53 - leg, 98 + bodyY, 14, palette);

  // Dark inner tunic and asymmetric haori, with a separate collar, hem and seam lights.
  pixelPoly(ctx, [[38, 34 + bodyY], [53, 34 + bodyY], [60, 45 + bodyY],
    [57, 68 + bodyY], [33, 68 + bodyY], [29, 46 + bodyY]], palette.coatShade, out);
  pixelPoly(ctx, [[37, 36 + bodyY], [48, 36 + bodyY], [48, 66 + bodyY],
    [34, 66 + bodyY], [31, 47 + bodyY]], palette.coat, out);
  pixelPoly(ctx, [[48, 36 + bodyY], [54, 37 + bodyY], [60, 46 + bodyY],
    [56, 67 + bodyY], [47, 67 + bodyY]], palette.coatShade, out);
  pixelPoly(ctx, [[42, 36 + bodyY], [48, 39 + bodyY], [53, 35 + bodyY],
    [50, 45 + bodyY], [45, 47 + bodyY]], palette.metalLight, out, 1.5);
  pixelRect(ctx, 45, 47 + bodyY, 4, 18, gold ? '#f7d35f' : teal ? '#54e6bc' : palette.accent, out);
  pixelRect(ctx, 35, 61 + bodyY, 21, 6, palette.belt, out);
  pixelRect(ctx, 46, 61 + bodyY, 5, 6, gold ? '#ffe28a' : palette.metalLight, out);
  pixelRect(ctx, 35, 67 + bodyY, 21, 2, out);

  // Far sleeve and arm are drawn behind the torso.
  pixelPoly(ctx, [[34, 39 + bodyY], [42, 42 + bodyY], [38 + armSwing, 53 + bodyY],
    [30 + armSwing, 52 + bodyY], [28, 45 + bodyY]], palette.coatShade, out);
  pixelPoly(ctx, [[54, 40 + bodyY], [60, 43 + bodyY], [63 + armSwing, 51 + bodyY],
    [59 + armSwing, 56 + bodyY], [52, 49 + bodyY]], palette.coat, out);
  pixelRect(ctx, 57 + armSwing, 52 + bodyY, 7, 6, palette.skin, out);
  pixelRect(ctx, 34 + armSwing, 51 + bodyY, 6, 5, palette.skin, out);
  pixelRect(ctx, 59 + armSwing, 52 + bodyY, 3, 2, palette.skinShade);

  // Face framed by white hair and a tied-back, tapered ponytail.
  pixelPoly(ctx, [[37, 20 + bodyY], [43, 16 + bodyY], [54, 18 + bodyY],
    [59, 25 + bodyY], [56, 34 + bodyY], [41, 35 + bodyY], [37, 29 + bodyY]],
    palette.skin, out);
  pixelPoly(ctx, [[38, 23 + bodyY], [34, 15 + bodyY], [40, 8 + bodyY],
    [52, 8 + bodyY], [59, 16 + bodyY], [56, 23 + bodyY], [48, 18 + bodyY],
    [43, 23 + bodyY], [41, 30 + bodyY], [37, 27 + bodyY]], palette.hair, out);
  pixelPoly(ctx, [[40, 12 + bodyY], [32, 10 + bodyY], [24, 14 + bodyY],
    [31, 17 + bodyY], [25, 22 + bodyY], [35, 23 + bodyY], [40, 18 + bodyY]],
    palette.hairShade, out);
  pixelPoly(ctx, [[39, 10 + bodyY], [44, 7 + bodyY], [53, 10 + bodyY],
    [58, 16 + bodyY], [50, 14 + bodyY], [43, 15 + bodyY]], palette.hairLight, out, 1);
  pixelRect(ctx, 43, 27 + bodyY, 2, 2, palette.eye);
  pixelRect(ctx, 51, 27 + bodyY, 2, 2, palette.eye);
  pixelRect(ctx, 45, 31 + bodyY, 5, 1, palette.skinShade);
  pixelRect(ctx, 40, 33 + bodyY, 14, 2, palette.skinShade);
  // Red hair tie on Ginzo, green-gold cord on Bamdee, gold clasp on the awakened form.
  pixelRect(ctx, 34, 16 + bodyY, 4, 3, gold ? '#ffe18a' : teal ? '#baf77c' : '#d94b47', out);
  pixelRect(ctx, 49, 21 + bodyY, 5, 2, palette.metalLight);

  // Katana and the gripping hand are separate pieces, so the blade sweeps through frames.
  const swordAngle = weaponAngle;
  drawPixelKatana(ctx, 62 + armSwing, 54 + bodyY, swordAngle, palette, gold, teal);
  pixelRect(ctx, 60 + armSwing, 51 + bodyY, 5, 6, palette.skin, out);
  pixelRect(ctx, 61 + armSwing, 54 + bodyY, 3, 2, palette.skinShade);

  // A tiny gold or jade spark appears only in selected frames; no constant magic ring.
  if ((gold || teal) && (frame === 2 || frame === 6 || frame === 10) && state !== 'dead') {
    const sx = 81 + Math.round(Math.cos(swordAngle) * 2);
    const sy = 42 + Math.round(Math.sin(swordAngle) * 2);
    pixelRect(ctx, sx, sy, 3, 3, gold ? '#fff0a1' : '#b9ffd9');
    pixelRect(ctx, sx + 1, sy - 2, 1, 7, gold ? '#fff0a1' : '#b9ffd9');
  }
}

function drawKatherinePixelHero(
  ctx: CanvasRenderingContext2D, palette: PixelHeroPalette, frame: number,
  state: HeroAnimationState, staffAngle: number, bob: number,
  runStep: number, armSwing: number, lunge: number
): void {
  const out = palette.outline;
  const bodyY = -bob + lunge;
  const leg = state === 'run' ? runStep : state.startsWith('attack') ? Math.round(Math.sin(frame / 11 * Math.PI) * 2) : 0;

  pixelPoly(ctx, [[36 + leg, 67 + bodyY], [47 + leg, 67 + bodyY], [43, 86 + bodyY],
    [39 + leg, 101 + bodyY], [30 + leg, 101 + bodyY], [33, 84 + bodyY]],
    palette.pants, out);
  pixelPoly(ctx, [[47 - leg, 67 + bodyY], [57 - leg, 66 + bodyY], [61, 84 + bodyY],
    [65 - leg, 101 + bodyY], [55 - leg, 101 + bodyY], [50, 84 + bodyY]],
    palette.pantsShade, out);
  drawPixelBoot(ctx, 30 + leg, 100 + bodyY, 13, palette);
  drawPixelBoot(ctx, 54 - leg, 100 + bodyY, 13, palette);

  // Layered skirt panels and a dark bodice make Katherine read as a mage, not a recolour.
  pixelPoly(ctx, [[35, 51 + bodyY], [57, 51 + bodyY], [63, 72 + bodyY],
    [48, 78 + bodyY], [30, 72 + bodyY]], palette.accentShade, out);
  pixelPoly(ctx, [[37, 55 + bodyY], [46, 56 + bodyY], [47, 74 + bodyY],
    [34, 70 + bodyY]], palette.coatLight, out, 1.5);
  pixelPoly(ctx, [[47, 56 + bodyY], [56, 54 + bodyY], [60, 70 + bodyY],
    [49, 75 + bodyY]], palette.accent, out, 1.5);
  pixelRect(ctx, 40, 45 + bodyY, 13, 20, palette.coat, out);
  pixelPoly(ctx, [[40, 43 + bodyY], [45, 40 + bodyY], [54, 43 + bodyY],
    [58, 52 + bodyY], [50, 57 + bodyY], [39, 53 + bodyY]], palette.coatShade, out);
  pixelPoly(ctx, [[43, 41 + bodyY], [48, 46 + bodyY], [53, 41 + bodyY],
    [51, 49 + bodyY], [46, 51 + bodyY]], palette.metalLight, out, 1);
  pixelRect(ctx, 41, 61 + bodyY, 13, 4, palette.belt, out);
  pixelRect(ctx, 46, 61 + bodyY, 4, 4, palette.metalLight, out);
  // Cape tails flutter in opposite directions in the run loop.
  const capeFlutter = state === 'run' ? Math.round(Math.sin(frame / 12 * Math.PI * 2) * 3) : state.startsWith('attack') ? -2 : 0;
  pixelPoly(ctx, [[36, 40 + bodyY], [43, 43 + bodyY], [37 - capeFlutter, 59 + bodyY],
    [30 - capeFlutter, 65 + bodyY], [32, 49 + bodyY]], palette.accentShade, out);
  pixelPoly(ctx, [[53, 42 + bodyY], [60, 42 + bodyY], [65 + capeFlutter, 57 + bodyY],
    [61 + capeFlutter, 63 + bodyY], [54, 51 + bodyY]], palette.accent, out);

  // Far hand, near sleeve, then a small gripping hand.
  pixelPoly(ctx, [[34, 40 + bodyY], [42, 43 + bodyY], [39 + armSwing, 52 + bodyY],
    [33 + armSwing, 54 + bodyY], [30, 46 + bodyY]], palette.coat, out);
  pixelPoly(ctx, [[53, 41 + bodyY], [60, 43 + bodyY], [62 + armSwing, 49 + bodyY],
    [59 + armSwing, 54 + bodyY], [52, 49 + bodyY]], palette.coatLight, out);
  pixelRect(ctx, 59 + armSwing, 51 + bodyY, 6, 5, palette.skin, out);

  // Face, layered blonde fringe, long side locks, and a gold hair ornament.
  pixelPoly(ctx, [[39, 20 + bodyY], [43, 17 + bodyY], [53, 18 + bodyY],
    [57, 25 + bodyY], [55, 34 + bodyY], [42, 34 + bodyY], [38, 28 + bodyY]],
    palette.skin, out);
  pixelPoly(ctx, [[37, 24 + bodyY], [36, 15 + bodyY], [43, 10 + bodyY],
    [53, 11 + bodyY], [59, 18 + bodyY], [58, 28 + bodyY], [54, 35 + bodyY],
    [51, 26 + bodyY], [48, 20 + bodyY], [44, 25 + bodyY], [41, 23 + bodyY]],
    palette.hair, out);
  pixelPoly(ctx, [[39, 24 + bodyY], [33, 20 + bodyY], [35, 32 + bodyY],
    [39, 39 + bodyY], [43, 34 + bodyY]], palette.hairShade, out);
  pixelPoly(ctx, [[52, 23 + bodyY], [58, 22 + bodyY], [59, 33 + bodyY],
    [55, 40 + bodyY], [52, 34 + bodyY]], palette.hairShade, out);
  pixelPoly(ctx, [[39, 16 + bodyY], [44, 11 + bodyY], [52, 13 + bodyY],
    [56, 18 + bodyY], [47, 16 + bodyY], [42, 21 + bodyY]], palette.hairLight, out, 1);
  pixelRect(ctx, 43, 27 + bodyY, 2, 2, palette.eye);
  pixelRect(ctx, 51, 27 + bodyY, 2, 2, palette.eye);
  pixelRect(ctx, 45, 31 + bodyY, 5, 1, palette.skinShade);
  pixelRect(ctx, 51, 11 + bodyY, 4, 3, '#f8e4a1', out);
  pixelRect(ctx, 55, 13 + bodyY, 3, 2, palette.accent);

  // Staff angle changes during casts; the gem glints on alternating key frames.
  const anchorX = 61 + armSwing;
  const anchorY = 52 + bodyY;
  drawPixelStaff(ctx, anchorX, anchorY, staffAngle, palette, frame, state.startsWith('attack'));
  pixelRect(ctx, anchorX - 2, anchorY - 2, 6, 6, palette.skin, out);

  if (state.startsWith('attack') && (frame === 3 || frame === 6 || frame === 9)) {
    const gx = anchorX + Math.round(Math.cos(staffAngle) * 34);
    const gy = anchorY + Math.round(Math.sin(staffAngle) * 34);
    pixelPoly(ctx, [[gx, gy - 4], [gx + 3, gy], [gx, gy + 4], [gx - 3, gy]], '#fff4b4', palette.accent, 1);
  }
}

function drawQuanPixelHero(
  ctx: CanvasRenderingContext2D, palette: PixelHeroPalette, frame: number,
  state: HeroAnimationState, bob: number, runStep: number, armSwing: number, lunge: number
): void {
  const out = palette.outline;
  const bodyY = -bob + lunge;
  const leg = state === 'run' ? runStep : state.startsWith('attack') ? Math.round(Math.sin(frame / 11 * Math.PI) * 2) : 0;
  const punchCurve = state.startsWith('attack') ? [0, 1, 3, 7, 11, 13, 10, 6, 3, 1, 0, 0][frame] : 0;

  pixelPoly(ctx, [[35 + leg, 66 + bodyY], [46 + leg, 66 + bodyY], [43, 83 + bodyY],
    [39 + leg, 100 + bodyY], [29 + leg, 100 + bodyY], [33, 83 + bodyY]], palette.pants, out);
  pixelPoly(ctx, [[48 - leg, 66 + bodyY], [57 - leg, 66 + bodyY], [61, 83 + bodyY],
    [65 - leg, 100 + bodyY], [55 - leg, 100 + bodyY], [50, 83 + bodyY]], palette.pantsShade, out);
  drawPixelBoot(ctx, 29 + leg, 99 + bodyY, 14, palette);
  drawPixelBoot(ctx, 54 - leg, 99 + bodyY, 14, palette);

  pixelPoly(ctx, [[36, 39 + bodyY], [54, 39 + bodyY], [61, 49 + bodyY],
    [57, 67 + bodyY], [34, 67 + bodyY], [29, 49 + bodyY]], palette.coat, out);
  pixelPoly(ctx, [[45, 40 + bodyY], [53, 41 + bodyY], [59, 51 + bodyY],
    [55, 65 + bodyY], [47, 65 + bodyY]], palette.coatShade, out);
  pixelPoly(ctx, [[40, 38 + bodyY], [46, 42 + bodyY], [53, 38 + bodyY],
    [50, 48 + bodyY], [45, 48 + bodyY]], palette.metalLight, out, 1.5);
  pixelRect(ctx, 34, 59 + bodyY, 23, 6, palette.belt, out);
  pixelRect(ctx, 47, 59 + bodyY, 5, 6, palette.metalLight, out);
  pixelPoly(ctx, [[31, 41 + bodyY], [40, 42 + bodyY], [37, 53 + bodyY],
    [29, 54 + bodyY], [27, 47 + bodyY]], palette.accent, out);
  pixelPoly(ctx, [[52, 41 + bodyY], [59 + punchCurve, 44 + bodyY], [65 + punchCurve, 51 + bodyY],
    [59 + punchCurve, 56 + bodyY], [51, 50 + bodyY]], palette.accentShade, out);
  pixelRect(ctx, 31, 49 + bodyY, 8, 6, palette.skin, out);
  pixelRect(ctx, 57 + punchCurve, 49 + bodyY, 8, 7, palette.skin, out);
  pixelRect(ctx, 59 + punchCurve, 47 + bodyY, 5, 3, palette.skinShade);
  pixelRect(ctx, 32, 50 + bodyY, 7, 2, palette.skinShade);

  // Hair knot, ribbon and fringe.
  pixelPoly(ctx, [[37, 21 + bodyY], [41, 16 + bodyY], [53, 18 + bodyY],
    [58, 25 + bodyY], [55, 34 + bodyY], [42, 34 + bodyY], [37, 28 + bodyY]],
    palette.skin, out);
  pixelPoly(ctx, [[37, 24 + bodyY], [34, 16 + bodyY], [42, 11 + bodyY],
    [53, 12 + bodyY], [58, 20 + bodyY], [53, 23 + bodyY], [46, 18 + bodyY],
    [42, 26 + bodyY]], palette.hair, out);
  pixelPoly(ctx, [[43, 12 + bodyY], [44, 6 + bodyY], [51, 6 + bodyY],
    [56, 12 + bodyY], [52, 17 + bodyY]], palette.hairShade, out);
  pixelRect(ctx, 44, 27 + bodyY, 2, 2, palette.eye);
  pixelRect(ctx, 51, 27 + bodyY, 2, 2, palette.eye);
  pixelRect(ctx, 45, 31 + bodyY, 5, 1, palette.skinShade);
  pixelRect(ctx, 44, 13 + bodyY, 7, 2, palette.accent);
}

function addPixelCombatSpark(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, frame: number): void {
  if (frame % 3 !== 0) return;
  pixelRect(ctx, x, y - 3, 2, 8, color);
  pixelRect(ctx, x - 3, y, 8, 2, color);
}

function generateOriginalHeroPixelTexture(
  heroId: HeroId,
  state: HeroAnimationState,
  frameIndex: number,
  isGinzoEvolved: boolean,
  aimAngle: number,
  facing: number
): THREE.CanvasTexture {
  const W = 96;
  const H = 120;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const frame = ((frameIndex % 12) + 12) % 12;
  const phase = frame / 12 * Math.PI * 2;
  const isAttack = state.startsWith('attack');
  const attackSlot = Number(state.replace('attack', '')) || 1;
  const attackT = frame / 11;
  const strikeCurve = Math.sin(attackT * Math.PI);
  const palette = { ...HERO_PIXEL_PALETTES[heroId] };
  const awakened = heroId === 'ginzo' && isGinzoEvolved;

  if (awakened) {
    // A full remaster palette: deep bronze shadows, amber cloth, bright gold trim.
    palette.coat = '#e2a52c';
    palette.coatShade = '#835019';
    palette.coatLight = '#ffe06a';
    palette.accent = '#ffd45e';
    palette.accentShade = '#9a6320';
    palette.belt = '#54381d';
    palette.metal = '#fff0a2';
    palette.metalLight = '#ffffff';
  }

  const bob = state === 'idle'
    ? Math.round(Math.sin(phase) * 1.25)
    : state === 'run'
      ? Math.round(Math.abs(Math.sin(phase * 2)) * 2.5)
      : state === 'dash'
        ? Math.round(1 + Math.sin(phase) * 1.5)
        : isAttack ? Math.round(strikeCurve * (attackSlot >= 3 ? 3 : 1)) : 0;
  const runStep = state === 'run' ? Math.round(Math.sin(phase) * 5)
    : state === 'dash' ? Math.round(Math.sin(phase) * 3)
      : state === 'idle' ? Math.round(Math.sin(phase) * 1) : 0;
  const armSwing = state === 'run' ? Math.round(Math.cos(phase) * 3)
    : isAttack ? Math.round(strikeCurve * (attackSlot >= 3 ? 6 : 3))
      : state === 'idle' ? Math.round(Math.sin(phase) * 1.5) : 0;
  const lunge = state === 'dash' ? 4 : isAttack ? Math.round(strikeCurve * (attackSlot >= 3 ? 5 : 3)) : 0;
  const screenAimAngle = Math.atan2(Math.sin(aimAngle) * 0.58, Math.cos(aimAngle));
  const localAimAngle = facing < 0 ? Math.PI - screenAimAngle : screenAimAngle;
  const slashFrames = [-0.9, -0.75, -0.55, -0.25, 0.15, 0.55, 0.9, 0.72, 0.42, 0.15, -0.08, -0.25];

  ctx.save();
  if (state === 'dead') {
    ctx.translate(48, 108);
    ctx.rotate(facing < 0 ? -0.72 : 0.72);
    ctx.scale(1.04, 0.62);
    ctx.translate(-48, -108);
  }
  if (facing < 0) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  const bodyTilt = state === 'run' ? Math.sin(phase) * -0.025
    : state === 'dash' ? -0.11
      : isAttack ? -strikeCurve * (attackSlot >= 3 ? 0.085 : 0.045) : 0;
  ctx.translate(48, 78 - bob);
  ctx.rotate(bodyTilt);
  ctx.translate(-48, -78);

  // Katherine's staff has its own arm and keyframed casting arc. Samurai sword
  // arcs likewise change pose every frame instead of rotating a still image.
  if (heroId === 'katherine') {
    const staffBase = state === 'idle' ? -0.82 + Math.sin(phase) * 0.045
      : state === 'run' ? -0.72 + Math.sin(phase) * 0.1
        : isAttack ? localAimAngle - 0.36 + slashFrames[frame] * 0.16
          : state === 'dash' ? localAimAngle - 0.12 : -0.82;
    drawKatherinePixelHero(ctx, palette, frame, state, staffBase, bob, runStep, armSwing, lunge);
    if (isAttack) addPixelCombatSpark(ctx, 78, 31 + Math.round(Math.sin(phase) * 2), '#fff4b4', frame);
  } else if (heroId === 'quan') {
    drawQuanPixelHero(ctx, palette, frame, state, bob, runStep, armSwing, lunge);
    if (isAttack) addPixelCombatSpark(ctx, 73 + Math.round(strikeCurve * 5), 52, palette.metalLight, frame);
  } else {
    const baseAngle = state === 'idle' ? 0.27 + Math.sin(phase) * 0.045
      : state === 'run' ? 0.22 + Math.sin(phase) * 0.12
        : isAttack ? localAimAngle + slashFrames[frame] * (attackSlot >= 3 ? 1.05 : 0.82)
          : state === 'dash' ? localAimAngle - 0.18 : 0.27;
    drawSamuraiPixelHero(ctx, palette, frame, state, baseAngle, bob, runStep, armSwing, lunge,
      awakened, heroId === 'bamdee');
  }

  // Hurt feedback is a handful of bright pixels so the silhouette stays readable.
  if (state === 'hurt') {
    pixelRect(ctx, 33, 42, 3, 3, '#fff6df');
    pixelRect(ctx, 57, 50, 2, 4, '#fff6df');
  }
  if (awakened && state !== 'dead' && (frame === 1 || frame === 5 || frame === 9)) {
    addPixelCombatSpark(ctx, 67, 34, '#ffe98a', frame);
    pixelRect(ctx, 29, 50, 2, 2, '#ffd65b');
  }
  if (heroId === 'bamdee' && state !== 'dead' && (frame === 2 || frame === 8)) {
    pixelRect(ctx, 26, 41, 2, 4, '#80ffe0');
  }

  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}


function createPixelEffectTexture(source: HTMLCanvasElement, maxSide: number): THREE.CanvasTexture {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return createCanvasTexture(canvas);
}

// ----------------------------------------------------------------------
// HERO SPRITE RENDERER: frame-animated pixel-art heroes (Ginzo, Quan, Katherine, Bamdee).
// Ginzo/Katherine use the supplied references; Quan/Bamdee keep procedural 12-pose rigs.
// ----------------------------------------------------------------------
export function generateHeroTexture(
  heroId: HeroId,
  state: HeroAnimationState,
  frameIndex: number = 0,
  isGinzoEvolved: boolean = false,
  aimAngle: number = 0,
  facing: number = 1
): THREE.CanvasTexture {
  return generateOriginalHeroPixelTexture(heroId, state, frameIndex, isGinzoEvolved, aimAngle, facing);
}

// ENEMY SPRITE GENERATOR (Illustrated Smooth Graphics for Mobs & 10 Wiki Bosses)
// ----------------------------------------------------------------------
export function generateEnemyTexture(
  type: EnemyType | string,
  isHurt: boolean | string = false,
  isAttacking: boolean = false,
  frameIndex: number = 0
): THREE.CanvasTexture {
  const W = 180;
  const H = 220;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  const hurt = typeof isHurt === 'boolean' ? isHurt : isHurt === 'hurt';
  const cx = 90;
  const cy = 110;
  const f = frameIndex % 4;
  const bob = Math.sin((f / 4) * Math.PI * 2) * 3;

  // Check 6 Biome Mobs, Bosses, and Secret Bosses first
  if (drawBiomeEnemy(ctx, type, cx, cy, bob, hurt)) {
    return createActorPixelTexture(canvas);
  }

  const fillPoly = (pts: [number, number][], fill: string, stroke?: string, lw: number = 2) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const drawCircle = (x: number, y: number, r: number, fill: string, stroke?: string, lw: number = 2) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  };

  // ---------------------------------------------------------
  // 10 OFFICIAL WIKI BOSSES
  // ---------------------------------------------------------
  if (type === 'boss_valentine') {
    // 1. Valentine (Undead Vampire Count)
    const capeCol = hurt ? '#fca5a5' : '#1e1b4b';
    const innerCape = hurt ? '#fee2e2' : '#991b1b';
    // Flowing Bat Cape
    fillPoly([[cx - 45, cy - 30], [cx + 45, cy - 30], [cx + 52, cy + 70 + bob], [cx, cy + 60], [cx - 52, cy + 70 + bob]], capeCol, '#09090b', 2.5);
    fillPoly([[cx - 30, cy - 20], [cx + 30, cy - 20], [cx + 25, cy + 55], [cx - 25, cy + 55]], innerCape);
    // Pale Vampire Face & Slicked Raven Hair
    drawCircle(cx, cy - 38 + bob, 22, hurt ? '#fecaca' : '#f1f5f9', '#09090b', 2);
    fillPoly([[cx - 22, cy - 56 + bob], [cx + 22, cy - 56 + bob], [cx + 15, cy - 36 + bob], [cx - 15, cy - 36 + bob]], '#09090b');
    // Crimson Glowing Vampire Eyes & Fangs
    drawCircle(cx - 7, cy - 38 + bob, 3, '#ef4444');
    drawCircle(cx + 7, cy - 38 + bob, 3, '#ef4444');
    // Aristocratic High Collar
    fillPoly([[cx - 26, cy - 36 + bob], [cx - 36, cy - 65 + bob], [cx - 16, cy - 22 + bob]], '#b91c1c', '#09090b', 1.5);
    fillPoly([[cx + 26, cy - 36 + bob], [cx + 36, cy - 65 + bob], [cx + 16, cy - 22 + bob]], '#b91c1c', '#09090b', 1.5);
    // Blood Rapier
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx + 25, cy + 20 + bob);
    ctx.lineTo(cx + 60, cy - 25 + bob);
    ctx.stroke();
    drawCircle(cx + 25, cy + 20 + bob, 6, '#fbbf24', '#78350f', 1.5);

  } else if (type === 'boss_tengu') {
    // 2. Tengu (Japan Crow Demon)
    const robeCol = hurt ? '#fca5a5' : '#7f1d1d';
    // Black Feathered Wings
    fillPoly([[cx - 25, cy - 20], [cx - 72, cy - 55 + bob], [cx - 60, cy + 30 + bob], [cx - 20, cy + 20]], '#09090b', '#374151', 2);
    fillPoly([[cx + 25, cy - 20], [cx + 72, cy - 55 + bob], [cx + 60, cy + 30 + bob], [cx + 20, cy + 20]], '#09090b', '#374151', 2);
    // Red Tengu Mask with Long Nose
    drawCircle(cx, cy - 35 + bob, 23, hurt ? '#fecaca' : '#dc2626', '#451a03', 2);
    // Long Pinocchio-like Red Nose
    fillPoly([[cx - 4, cy - 36 + bob], [cx - 38, cy - 34 + bob], [cx - 4, cy - 28 + bob]], '#b91c1c', '#451a03', 2);
    // Gold Eyeballs
    drawCircle(cx - 8, cy - 40 + bob, 4, '#fbbf24');
    drawCircle(cx + 8, cy - 40 + bob, 4, '#fbbf24');
    // Mountain Monk Garb & Beads
    fillPoly([[cx - 26, cy - 12 + bob], [cx + 26, cy - 12 + bob], [cx + 20, cy + 50 + bob], [cx - 20, cy + 50 + bob]], robeCol, '#09090b', 2);
    drawCircle(cx, cy + 12 + bob, 8, '#451a03', '#fbbf24', 1.5);
    // Feather Wind Fan (Hauchiwa)
    fillPoly([[cx + 28, cy + 15 + bob], [cx + 58, cy - 10 + bob], [cx + 62, cy + 25 + bob]], '#f8fafc', '#09090b', 2);

  } else if (type === 'boss_muno_wonda') {
    // 3. Muno Wonda (Elfland Tree Shaman)
    const barkCol = hurt ? '#fca5a5' : '#78350f';
    // Giant Antlers / Wooden Horns
    fillPoly([[cx - 15, cy - 45 + bob], [cx - 50, cy - 80 + bob], [cx - 30, cy - 55 + bob]], '#451a03', '#1c1917', 2);
    fillPoly([[cx + 15, cy - 45 + bob], [cx + 50, cy - 80 + bob], [cx + 30, cy - 55 + bob]], '#451a03', '#1c1917', 2);
    // Ancient Mask with Emerald Glow Eyes
    drawCircle(cx, cy - 34 + bob, 24, barkCol, '#1c1917', 2.5);
    drawCircle(cx - 8, cy - 34 + bob, 4, '#10b981');
    drawCircle(cx + 8, cy - 34 + bob, 4, '#10b981');
    // Mossy Cloak
    fillPoly([[cx - 32, cy - 10 + bob], [cx + 32, cy - 10 + bob], [cx + 28, cy + 55 + bob], [cx - 28, cy + 55 + bob]], '#15803d', '#052e16', 2.5);
    // Spirit Wisps floating around
    drawCircle(cx - 35, cy + 10 + bob, 6, '#34d399', '#059669', 1.5);
    drawCircle(cx + 38, cy + 30 - bob, 7, '#a7f3d0', '#10b981', 1.5);

  } else if (type === 'boss_dr_universelove') {
    // 4. Dr. Universelove (Stronghold Cyborg Scientist)
    const metalCol = hurt ? '#fca5a5' : '#64748b';
    // Lab Coat Torso
    fillPoly([[cx - 28, cy - 15 + bob], [cx + 28, cy - 15 + bob], [cx + 24, cy + 55 + bob], [cx - 24, cy + 55 + bob]], '#f8fafc', '#1e293b', 2);
    // Cyber Face: Left Normal, Right Mechanical with Glowing Laser Monocle
    drawCircle(cx, cy - 38 + bob, 22, hurt ? '#fecaca' : '#fed7aa', '#1e293b', 2);
    fillPoly([[cx, cy - 55 + bob], [cx + 22, cy - 55 + bob], [cx + 22, cy - 20 + bob], [cx, cy - 20 + bob]], metalCol);
    drawCircle(cx + 8, cy - 38 + bob, 5, '#38bdf8', '#0284c7', 2);
    drawCircle(cx - 8, cy - 38 + bob, 3, '#1e293b');
    // Massive Mechanical Prosthetic Clamp Arm
    fillPoly([[cx + 28, cy - 5 + bob], [cx + 62, cy - 5 + bob], [cx + 65, cy + 30 + bob], [cx + 45, cy + 30 + bob]], '#334155', '#0f172a', 2);
    fillPoly([[cx + 60, cy + 25 + bob], [cx + 72, cy + 15 + bob], [cx + 65, cy + 45 + bob]], '#fbbf24', '#78350f', 1.5);

  } else if (type === 'boss_iblis') {
    // 5. Iblis (Desert Djinn Sand Emperor)
    const djinnCol = hurt ? '#fca5a5' : '#7c3aed';
    // Golden Sultan Crown
    fillPoly([[cx - 20, cy - 50 + bob], [cx, cy - 75 + bob], [cx + 20, cy - 50 + bob]], '#fbbf24', '#78350f', 2);
    drawCircle(cx, cy - 56 + bob, 5, '#ef4444');
    // Muscular Djinn Torso
    drawCircle(cx, cy - 32 + bob, 22, djinnCol, '#2e1065', 2);
    drawCircle(cx - 8, cy - 32 + bob, 3.5, '#fbbf24');
    drawCircle(cx + 8, cy - 32 + bob, 3.5, '#fbbf24');
    fillPoly([[cx - 32, cy - 10 + bob], [cx + 32, cy - 10 + bob], [cx + 18, cy + 35 + bob], [cx - 18, cy + 35 + bob]], djinnCol, '#2e1065', 2);
    // Sand Tornado Tail
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 35 + bob);
    ctx.quadraticCurveTo(cx + 35, cy + 65, cx, cy + 85);
    ctx.quadraticCurveTo(cx - 35, cy + 65, cx + 18, cy + 35 + bob);
    ctx.fillStyle = '#d97706';
    ctx.fill();
    // Dual Golden Scimitars
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx - 38, cy + 5 + bob, 22, -0.8, 1.2);
    ctx.arc(cx + 38, cy + 5 + bob, 22, 1.8, 3.8);
    ctx.stroke();

  } else if (type === 'boss_logan') {
    // 6. Logan (Wild West Outlaw Gunslinger)
    const leatherCol = hurt ? '#fca5a5' : '#78350f';
    // Duster Coat & Poncho
    fillPoly([[cx - 32, cy - 12 + bob], [cx + 32, cy - 12 + bob], [cx + 26, cy + 60 + bob], [cx - 26, cy + 60 + bob]], leatherCol, '#451a03', 2);
    // Red Bandit Bandana over lower face
    drawCircle(cx, cy - 36 + bob, 22, '#fed7aa', '#451a03', 2);
    fillPoly([[cx - 16, cy - 32 + bob], [cx + 16, cy - 32 + bob], [cx, cy - 16 + bob]], '#dc2626', '#7f1d1d', 1.5);
    // Steely Outlaw Gaze
    drawCircle(cx - 7, cy - 40 + bob, 2.5, '#09090b');
    drawCircle(cx + 7, cy - 40 + bob, 2.5, '#09090b');
    // Wide-brim Western Stetson Hat
    ctx.beginPath();
    ctx.ellipse(cx, cy - 50 + bob, 48, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#451a03';
    ctx.fill();
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    fillPoly([[cx - 20, cy - 50 + bob], [cx + 20, cy - 50 + bob], [cx + 16, cy - 74 + bob], [cx - 16, cy - 74 + bob]], '#572202', '#1c1917', 2);
    // Dual Chrome Revolvers
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 25, cy + 18 + bob);
    ctx.lineTo(cx - 45, cy + 18 + bob);
    ctx.moveTo(cx + 25, cy + 18 + bob);
    ctx.lineTo(cx + 45, cy + 18 + bob);
    ctx.stroke();

  } else if (type === 'boss_chen') {
    // 7. Chen (China Shaolin Martial Arts Warlord)
    const silkCol = hurt ? '#fca5a5' : '#b91c1c';
    // Master Robe with Golden Cloud Trim
    fillPoly([[cx - 30, cy - 15 + bob], [cx + 30, cy - 15 + bob], [cx + 24, cy + 55 + bob], [cx - 24, cy + 55 + bob]], silkCol, '#450a0a', 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy + 10 + bob, 15, -Math.PI * 0.7, Math.PI * 0.7);
    ctx.stroke();
    // Bald Martial Artist with Prayer Beads
    drawCircle(cx, cy - 38 + bob, 22, hurt ? '#fecaca' : '#fed7aa', '#450a0a', 2);
    drawCircle(cx - 8, cy - 38 + bob, 3.5, '#b45309');
    drawCircle(cx + 8, cy - 38 + bob, 3.5, '#b45309');
    // Golden Dragon Chi Flaming Fists
    drawCircle(cx - 32, cy + 15 + bob, 14, 'rgba(251, 191, 36, 0.45)');
    drawCircle(cx + 32, cy + 15 + bob, 14, 'rgba(251, 191, 36, 0.45)');
    drawCircle(cx - 32, cy + 15 + bob, 8, '#fed7aa', '#b45309', 2);
    drawCircle(cx + 32, cy + 15 + bob, 8, '#fed7aa', '#b45309', 2);

  } else if (type === 'boss_kraken') {
    // 8. Kraken (Norse Frost Sea Behemoth)
    const oceanCol = hurt ? '#fca5a5' : '#0369a1';
    // 4 Giant Tentacles flailing
    [-45, -20, 20, 45].forEach((tx, idx) => {
      ctx.beginPath();
      ctx.moveTo(cx + tx * 0.5, cy + 20);
      ctx.quadraticCurveTo(cx + tx * 1.5, cy - 40 + (idx % 2 === 0 ? bob * 2 : -bob * 2), cx + tx * 1.2, cy - 70);
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#0284c7';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#e0f2fe';
      ctx.stroke();
    });
    // Massive Squid/Monster Head with Glowing Eyes
    drawCircle(cx, cy - 25 + bob, 30, oceanCol, '#082f49', 2.5);
    drawCircle(cx - 12, cy - 25 + bob, 6, '#38bdf8', '#ffffff', 2);
    drawCircle(cx + 12, cy - 25 + bob, 6, '#38bdf8', '#ffffff', 2);

  } else if (type === 'boss_navy_louis') {
    // 9. Navy and Louis (Imperium Twin Imperial Champions)
    // Standing side by side: Navy with Lion Tower Shield, Louis with Golden Lance
    const armorCol = hurt ? '#fca5a5' : '#f8fafc';
    // Navy (Left - Tower Shield)
    drawCircle(cx - 24, cy - 35 + bob, 18, armorCol, '#1e293b', 2);
    fillPoly([[cx - 36, cy - 15 + bob], [cx - 10, cy - 15 + bob], [cx - 10, cy + 50 + bob], [cx - 36, cy + 50 + bob]], '#1e293b');
    // Lion Tower Shield
    fillPoly([[cx - 48, cy - 25 + bob], [cx - 18, cy - 25 + bob], [cx - 22, cy + 55 + bob], [cx - 44, cy + 55 + bob]], '#fbbf24', '#78350f', 2.5);
    drawCircle(cx - 33, cy + 10 + bob, 8, '#b45309', '#fef08a', 1.5);
    // Louis (Right - Golden Rapier)
    drawCircle(cx + 24, cy - 35 + bob, 18, armorCol, '#1e293b', 2);
    fillPoly([[cx + 10, cy - 15 + bob], [cx + 36, cy - 15 + bob], [cx + 36, cy + 50 + bob], [cx + 10, cy + 50 + bob]], '#1e293b');
    // Golden Rapier
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx + 25, cy + 20 + bob);
    ctx.lineTo(cx + 65, cy - 30 + bob);
    ctx.stroke();

  } else if (type === 'boss_asurendra') {
    // 10. Asurendra (Mirage Six-Armed Supreme God)
    const godGold = hurt ? '#fca5a5' : '#f59e0b';
    // Flaming Sacred Halo behind head
    const haloGrad = ctx.createRadialGradient(cx, cy - 45 + bob, 10, cx, cy - 45 + bob, 45);
    haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
    haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
    haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - 45 + bob, 45, 0, Math.PI * 2);
    ctx.fill();
    // 6 Arms extended in mudra stances
    const armAngles = [-0.9, -0.4, 0.1, Math.PI + 0.9, Math.PI + 0.4, Math.PI - 0.1];
    armAngles.forEach((ang) => {
      const ax = cx + Math.cos(ang) * 42;
      const ay = cy - 15 + bob + Math.sin(ang) * 36;
      ctx.strokeStyle = godGold;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 15 + bob);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      drawCircle(ax, ay, 7, '#fef08a', '#78350f', 2);
    });
    // Divine Celestial Face with Third Eye & Crown
    drawCircle(cx, cy - 42 + bob, 25, godGold, '#78350f', 2.5);
    // Third Eye (Vertical on Forehead)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 50 + bob, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Two Normal Eyes
    drawCircle(cx - 9, cy - 40 + bob, 3.5, '#ffffff', '#78350f', 1);
    drawCircle(cx + 9, cy - 40 + bob, 3.5, '#ffffff', '#78350f', 1);
    // Crown
    fillPoly([[cx - 18, cy - 65 + bob], [cx, cy - 85 + bob], [cx + 18, cy - 65 + bob]], '#fef08a', '#b45309', 2);
    // Torso in Lotus Plate
    fillPoly([[cx - 32, cy - 15 + bob], [cx + 32, cy - 15 + bob], [cx + 25, cy + 55 + bob], [cx - 25, cy + 55 + bob]], '#b45309', '#78350f', 2);

  } else {
    // ---------------------------------------------------------
    // THEMATIC BIOME MOBS
    // ---------------------------------------------------------
    const mainCol = hurt ? '#fca5a5' : '#475569';
    drawCircle(cx, cy - 30 + bob, 20, mainCol, '#09090b', 2);
    drawCircle(cx - 6, cy - 30 + bob, 3, '#ef4444');
    drawCircle(cx + 6, cy - 30 + bob, 3, '#ef4444');
    fillPoly([[cx - 24, cy - 10 + bob], [cx + 24, cy - 10 + bob], [cx + 18, cy + 45 + bob], [cx - 18, cy + 45 + bob]], mainCol, '#09090b', 2);
  }

  return createActorPixelTexture(canvas);
}

// ----------------------------------------------------------------------
// NPC SPRITE GENERATOR
// ----------------------------------------------------------------------
export function generateNpcTexture(id: 'blacksmith' | 'trainer' | 'gatekeeper'): THREE.CanvasTexture {
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  const cx = 80;
  const cy = 80;

  if (id === 'blacksmith') {
    // Khan the Blacksmith: Leather apron, muscular arms, iron hammer
    ctx.beginPath();
    ctx.ellipse(cx, cy - 30, 20, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Red Bandana
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(cx - 20, cy - 45, 40, 14);

    // Leather Apron
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 10);
    ctx.lineTo(cx + 24, cy - 10);
    ctx.lineTo(cx + 28, cy + 50);
    ctx.lineTo(cx - 28, cy + 50);
    ctx.closePath();
    ctx.fill();

    // Big Sledgehammer in Hand
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + 26, cy + 40);
    ctx.lineTo(cx + 38, cy - 10);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx + 24, cy - 25, 28, 16);

  } else if (id === 'trainer') {
    // Master Chanyi: a readable human martial-arts teacher in a white and jade robe.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Ground shadow and staff.
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 66, 30, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#68452d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy + 58);
    ctx.lineTo(cx - 38, cy - 35);
    ctx.stroke();

    // Legs and shoes show beneath the robe.
    ctx.fillStyle = '#4b5563';
    ctx.strokeStyle = '#26313b';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 19, cy + 35, 16, 22);
    ctx.strokeRect(cx - 19, cy + 35, 16, 22);
    ctx.fillRect(cx + 3, cy + 35, 16, 22);
    ctx.strokeRect(cx + 3, cy + 35, 16, 22);
    ctx.fillStyle = '#292b32';
    ctx.beginPath();
    ctx.roundRect(cx - 23, cy + 53, 23, 9, 3);
    ctx.roundRect(cx + 1, cy + 53, 23, 9, 3);
    ctx.fill();

    // Flowing white robe with separate sleeves.
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#34424d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 19, cy - 9);
    ctx.lineTo(cx - 30, cy - 3);
    ctx.lineTo(cx - 40, cy + 20);
    ctx.lineTo(cx - 32, cy + 29);
    ctx.lineTo(cx - 20, cy + 14);
    ctx.lineTo(cx - 29, cy + 47);
    ctx.lineTo(cx + 29, cy + 47);
    ctx.lineTo(cx + 20, cy + 14);
    ctx.lineTo(cx + 32, cy + 29);
    ctx.lineTo(cx + 40, cy + 20);
    ctx.lineTo(cx + 30, cy - 3);
    ctx.lineTo(cx + 19, cy - 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hands and cuffs.
    ctx.fillStyle = '#edf2f7';
    ctx.fillRect(cx - 39, cy + 20, 9, 10);
    ctx.fillRect(cx + 30, cy + 20, 9, 10);
    ctx.fillStyle = '#edb991';
    ctx.beginPath();
    ctx.ellipse(cx - 35, cy + 35, 5, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 35, cy + 35, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#34424d';
    ctx.stroke();

    // Jade collar, sash and robe folds.
    ctx.strokeStyle = '#159477';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy - 8);
    ctx.lineTo(cx, cy + 12);
    ctx.lineTo(cx + 13, cy - 8);
    ctx.stroke();
    ctx.fillStyle = '#c99c48';
    ctx.fillRect(cx - 20, cy + 24, 40, 7);
    ctx.fillStyle = '#f7e5b1';
    ctx.fillRect(cx - 3, cy + 25, 7, 5);
    ctx.strokeStyle = '#bdc8d0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 37);
    ctx.lineTo(cx - 9, cy + 43);
    ctx.moveTo(cx + 14, cy + 37);
    ctx.lineTo(cx + 9, cy + 43);
    ctx.stroke();

    // Neck, ears and face.
    ctx.fillStyle = '#d99b72';
    ctx.fillRect(cx - 7, cy - 18, 14, 14);
    ctx.fillStyle = '#edb991';
    ctx.beginPath();
    ctx.ellipse(cx - 19, cy - 30, 5, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 19, cy - 30, 5, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy - 31, 18, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#34424d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // White hair and topknot.
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 35);
    ctx.quadraticCurveTo(cx - 22, cy - 57, cx, cy - 57);
    ctx.quadraticCurveTo(cx + 21, cy - 57, cx + 18, cy - 35);
    ctx.quadraticCurveTo(cx + 8, cy - 43, cx, cy - 41);
    ctx.quadraticCurveTo(cx - 8, cy - 42, cx - 18, cy - 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 57, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes, brows, nose and short white beard give the face definition.
    ctx.strokeStyle = '#687581';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 34);
    ctx.lineTo(cx - 5, cy - 36);
    ctx.moveTo(cx + 5, cy - 36);
    ctx.lineTo(cx + 12, cy - 34);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 29, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 8, cy - 29, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#27313a';
    ctx.beginPath();
    ctx.arc(cx - 7, cy - 29, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy - 29, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b87658';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 27);
    ctx.lineTo(cx - 1, cy - 20);
    ctx.lineTo(cx + 3, cy - 20);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 18);
    ctx.quadraticCurveTo(cx, cy - 13, cx + 10, cy - 18);
    ctx.quadraticCurveTo(cx + 6, cy - 8, cx, cy - 9);
    ctx.quadraticCurveTo(cx - 6, cy - 8, cx - 10, cy - 18);
    ctx.fill();
  } else {
    // Gatekeeper
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy - 20, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  return createActorPixelTexture(canvas);
}

export function generateHappyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Compact, game-styled portrait inspired by the photo: tied dark hair,
  // oversized sand-colored sweatshirt, loose plaid pants, and sandals.
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.ellipse(128, 304, 48, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ponytail behind the head.
  ctx.fillStyle = '#17151a';
  ctx.beginPath();
  ctx.moveTo(151, 46);
  ctx.bezierCurveTo(176, 48, 179, 73, 167, 91);
  ctx.bezierCurveTo(159, 103, 154, 111, 161, 124);
  ctx.bezierCurveTo(146, 119, 139, 106, 145, 91);
  ctx.bezierCurveTo(152, 74, 157, 59, 151, 46);
  ctx.fill();
  ctx.fillStyle = '#b9a7a0';
  ctx.beginPath();
  ctx.ellipse(160, 112, 7, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Head, ears, and short rounded fringe.
  ctx.fillStyle = '#e8bea5';
  ctx.beginPath();
  ctx.ellipse(126, 49, 29, 35, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#211d22';
  ctx.beginPath();
  ctx.moveTo(98, 52);
  ctx.quadraticCurveTo(92, 19, 121, 12);
  ctx.quadraticCurveTo(155, 9, 158, 39);
  ctx.quadraticCurveTo(150, 32, 143, 34);
  ctx.quadraticCurveTo(133, 43, 122, 38);
  ctx.quadraticCurveTo(112, 49, 98, 52);
  ctx.fill();
  ctx.strokeStyle = '#17151a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(105, 46);
  ctx.quadraticCurveTo(103, 59, 110, 67);
  ctx.stroke();

  // Tiny expressive eyes and a pout.
  ctx.fillStyle = '#262125';
  ctx.beginPath();
  ctx.ellipse(116, 52, 2.6, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(138, 51, 2.6, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9b5659';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(123, 68);
  ctx.quadraticCurveTo(130, 64, 136, 69);
  ctx.stroke();

  // Oversized beige sweatshirt, with dropped shoulders and long sleeves.
  ctx.fillStyle = '#d8cbbd';
  ctx.strokeStyle = '#9c8e82';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(111, 82);
  ctx.lineTo(92, 85);
  ctx.lineTo(75, 99);
  ctx.lineTo(54, 157);
  ctx.quadraticCurveTo(52, 168, 65, 173);
  ctx.lineTo(82, 177);
  ctx.lineTo(91, 155);
  ctx.lineTo(89, 216);
  ctx.quadraticCurveTo(128, 230, 166, 216);
  ctx.lineTo(160, 151);
  ctx.lineTo(173, 174);
  ctx.quadraticCurveTo(185, 174, 193, 165);
  ctx.lineTo(170, 103);
  ctx.quadraticCurveTo(164, 88, 147, 83);
  ctx.quadraticCurveTo(128, 94, 111, 82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f1e8dc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(104, 90);
  ctx.quadraticCurveTo(127, 107, 151, 90);
  ctx.stroke();
  ctx.fillStyle = '#a89a8e';
  ctx.fillRect(116, 136, 24, 3);
  ctx.fillStyle = '#b4a698';
  ctx.fillRect(124, 133, 3, 8);

  // Cuffs and hands.
  ctx.fillStyle = '#c7b8aa';
  ctx.fillRect(57, 158, 25, 11);
  ctx.fillRect(171, 158, 22, 11);
  ctx.fillStyle = '#e8bea5';
  ctx.beginPath();
  ctx.ellipse(70, 174, 9, 7, -0.2, 0, Math.PI * 2);
  ctx.ellipse(183, 172, 9, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Loose dark plaid trousers.
  ctx.fillStyle = '#222733';
  ctx.strokeStyle = '#11141b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(92, 214);
  ctx.lineTo(164, 214);
  ctx.lineTo(169, 286);
  ctx.quadraticCurveTo(155, 291, 136, 286);
  ctx.lineTo(128, 246);
  ctx.lineTo(119, 287);
  ctx.quadraticCurveTo(101, 292, 86, 286);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#9b9ba0';
  ctx.lineWidth = 2;
  for (const y of [229, 247, 265, 280]) {
    ctx.beginPath();
    ctx.moveTo(91, y);
    ctx.lineTo(166, y + 2);
    ctx.stroke();
  }
  for (const x of [100, 115, 141, 157]) {
    ctx.beginPath();
    ctx.moveTo(x, 218);
    ctx.lineTo(x + (x < 128 ? 3 : -2), 286);
    ctx.stroke();
  }
  ctx.strokeStyle = '#596071';
  ctx.lineWidth = 1;
  for (const y of [237, 256, 274]) {
    ctx.beginPath();
    ctx.moveTo(93, y);
    ctx.lineTo(166, y + 1);
    ctx.stroke();
  }

  // Sandals.
  ctx.fillStyle = '#17191d';
  ctx.beginPath();
  ctx.roundRect(82, 285, 41, 19, 8);
  ctx.roundRect(137, 285, 42, 19, 8);
  ctx.fill();
  ctx.strokeStyle = '#b2a99e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(95, 288);
  ctx.lineTo(106, 299);
  ctx.lineTo(116, 288);
  ctx.moveTo(150, 288);
  ctx.lineTo(161, 299);
  ctx.lineTo(172, 288);
  ctx.stroke();

  return createActorPixelTexture(canvas);
}

// ----------------------------------------------------------------------
// VFX & PROJECTILE TEXTURES (High Resolution)
// ----------------------------------------------------------------------
export function generateKiBlastTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, '#67e8f9');
  grad.addColorStop(0.65, '#0284c7');
  grad.addColorStop(1, 'rgba(2, 132, 199, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  return createCanvasTexture(canvas);
}

export function generateWeaponSlashTexture(weaponType: string = 'katana', comboStep: number = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.translate(128, 128);

  const isFinisher = comboStep === 3;

  if (weaponType === 'greatsword') {
    // Heavy Flaming Colossal Arc (210 degrees)
    const arcRadius = isFinisher ? 104 : 96;
    // Outer flame flare
    ctx.strokeStyle = isFinisher ? 'rgba(239, 68, 68, 0.45)' : 'rgba(249, 115, 22, 0.35)';
    ctx.lineWidth = isFinisher ? 36 : 28;
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, -Math.PI * 0.85, Math.PI * 0.35);
    ctx.stroke();

    // Blazing golden core
    ctx.strokeStyle = isFinisher ? '#f59e0b' : '#fbbf24';
    ctx.lineWidth = isFinisher ? 16 : 12;
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, -Math.PI * 0.8, Math.PI * 0.3);
    ctx.stroke();

    // Razor white energy line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, -Math.PI * 0.75, Math.PI * 0.25);
    ctx.stroke();

    // Embers along arc
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * 0.7 + i * 0.18;
      const r = arcRadius + (Math.random() - 0.5) * 16;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (weaponType === 'blade') {
    // Ultra-Fast Twin Azure Dagger Crescent
    const r1 = 88;
    const r2 = 102;
    // Outer cyan glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(0, 0, r1, -Math.PI * 0.75, Math.PI * 0.25);
    ctx.stroke();

    // Twin razor lines
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, r1, -Math.PI * 0.7, Math.PI * 0.2);
    ctx.stroke();

    if (isFinisher) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r2, -Math.PI * 0.65, Math.PI * 0.15);
      ctx.stroke();
    }

    // White cutting core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r1, -Math.PI * 0.65, Math.PI * 0.15);
    ctx.stroke();

  } else if (weaponType === 'polearm') {
    // Piercing Linear Lance Flash & Crescent Ripple
    const r = 95;
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.45, Math.PI * 0.1);
    ctx.stroke();

    // Golden core
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.4, Math.PI * 0.05);
    ctx.stroke();

    // Center spear tip thrust beam
    const grad = ctx.createLinearGradient(-40, 0, 110, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#facc15');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-20, -5);
    ctx.lineTo(110, 0);
    ctx.lineTo(-20, 5);
    ctx.closePath();
    ctx.fill();

  } else if (weaponType === 'staff') {
    // Mystic Starlight & Void Arc
    const r = 92;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.75, Math.PI * 0.25);
    ctx.stroke();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.7, Math.PI * 0.2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.65, Math.PI * 0.15);
    ctx.stroke();

  } else if (weaponType === 'fist') {
    // Kinetic Supersonic Shock Ripple
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(0, 0, 85, -Math.PI * 0.5, Math.PI * 0.1);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 85, -Math.PI * 0.45, Math.PI * 0.05);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 85, -Math.PI * 0.4, 0);
    ctx.stroke();

  } else {
    // Katana: a pale rose outer trail, bright silver edge, and clean white core.
    const r = isFinisher ? 100 : 90;
    ctx.strokeStyle = isFinisher ? 'rgba(244, 63, 94, 0.42)' : 'rgba(244, 114, 182, 0.36)';
    ctx.lineWidth = isFinisher ? 34 : 27;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.78, Math.PI * 0.25);
    ctx.stroke();

    // Soft blush trail around the razor edge
    ctx.strokeStyle = isFinisher ? '#f9a8d4' : '#fbcfe8';
    ctx.lineWidth = isFinisher ? 18 : 14;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.72, Math.PI * 0.2);
    ctx.stroke();

    // Bright white blade trail, with tiny glints at both ends.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isFinisher ? 8 : 6;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.68, Math.PI * 0.16);
    ctx.stroke();

    ctx.fillStyle = '#fff7fb';
    [-Math.PI * 0.68, Math.PI * 0.16].forEach((angle) => {
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      ctx.beginPath();
      ctx.moveTo(px, py - 7);
      ctx.lineTo(px + 10, py);
      ctx.lineTo(px, py + 7);
      ctx.lineTo(px - 10, py);
      ctx.closePath();
      ctx.fill();
    });
  }

  ctx.restore();
  return weaponType === 'katana' ? createPixelEffectTexture(canvas, 128) : createCanvasTexture(canvas);
}

export function generateSlashTexture(): THREE.CanvasTexture {
  return generateWeaponSlashTexture('katana', 1);
}

export function generateSparkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, '#fef08a');
  grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.6)');
  grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  return createCanvasTexture(canvas);
}

export function generateHitFlashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.translate(64, 64);

  // Jagged red impact burst with a warm core, like a crisp hit frame in a pixel brawler.
  const drawBurst = (color: string, scale: number, points: number, innerRatio: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = (i % 2 === 0 ? 58 : 58 * innerRatio) * scale;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };

  drawBurst('#be123c', 1.0, 8, 0.58);
  drawBurst('#fb3f55', 0.82, 8, 0.62);
  drawBurst('#ffd166', 0.47, 6, 0.56);
  drawBurst('#ffffff', 0.22, 4, 0.34);

  ctx.restore();
  return createPixelEffectTexture(canvas, 128);
}

export function generateShockwaveRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 30, 64, 64, 62);
  grad.addColorStop(0, 'rgba(250, 204, 21, 0)');
  grad.addColorStop(0.7, 'rgba(250, 204, 21, 0.85)');
  grad.addColorStop(0.9, '#ffffff');
  grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();
  return createCanvasTexture(canvas);
}

export function generateWhirlwindTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.translate(128, 128);

  for (let r = 35; r <= 110; r += 24) {
    const grad = ctx.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#ffffff');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.restore();
  return createCanvasTexture(canvas);
}

export function generateCoinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(32, 32, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Inner Chinese Coin Square Hole
  ctx.fillStyle = '#b45309';
  ctx.fillRect(24, 24, 16, 16);
  return createCanvasTexture(canvas);
}

export function generatePotionTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(32, 38, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.fillRect(26, 10, 12, 10);
  return createCanvasTexture(canvas);
}

export function generateContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
