/**
 * Procedural sprite textures for heroes, monsters, and combat effects.
 * The renderer keeps the scene at display resolution while these source textures
 * retain crisp nearest-neighbor sampling for a clean pixel-art silhouette.
 */

import * as THREE from 'three';
import { HeroAnimationState, HeroId, EnemyType } from '../types/game';
import { drawBiomeEnemy } from './biomeSprites';

export function createCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Reduce only character art to a deliberate pixel grid; scene and HUD resolution stay untouched. */
function createActorPixelTexture(source: HTMLCanvasElement): THREE.CanvasTexture {
  const longestSide = Math.max(source.width, source.height);
  const scale = Math.min(1, 80 / longestSide);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return createCanvasTexture(canvas);
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
// HERO SPRITE RENDERER: High-Definition Humanoid Anatomy (Ginzo, Quan, Katherine)
// Canvas: 256 x 320 px (smooth vector drawing, anti-aliased curves and shading)
// ----------------------------------------------------------------------
export function generateHeroTexture(
  heroId: HeroId,
  state: HeroAnimationState,
  frameIndex: number = 0,
  isGinzoEvolved: boolean = false
): THREE.CanvasTexture {
  const W = 256;
  const H = 320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  const f = frameIndex % 4;
  const awakenedGinzo = heroId === 'ginzo' && isGinzoEvolved;
  const cx = 128;
  let cy = 175; // ground/center reference

  // Animation offsets
  let bobY = 0;
  let leanX = 0;
  let legCycle = 0;
  let armSwing = 0;
  let weaponAngle = 0;
  let auraGlow = false;

  if (state === 'idle') {
    bobY = Math.sin((f / 4) * Math.PI * 2) * 3;
  } else if (state === 'run') {
    bobY = Math.abs(Math.sin((f / 4) * Math.PI * 2)) * 6;
    leanX = 6;
    legCycle = Math.sin((f / 4) * Math.PI * 2);
    armSwing = Math.cos((f / 4) * Math.PI * 2);
  } else if (state === 'dash') {
    leanX = 18;
    bobY = 8;
    auraGlow = true;
  } else if (state.startsWith('attack')) {
    const isHeavy = state === 'attack3';
    leanX = isHeavy ? 14 : 8;
    bobY = 4;
    weaponAngle = isHeavy ? 1.2 : 0.6;
    auraGlow = true;
  }

  cy += bobY;

  // Helper drawing functions
  const fillPoly = (pts: [number, number][], fill: string | CanvasGradient, stroke?: string, lineWidth = 2) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const drawCircle = (x: number, y: number, r: number, fill: string | CanvasGradient, stroke?: string, lw = 2) => {
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

  // ====================================================================
  // 1. GINZO (Wandering Ronin Swordsman - Otherworld Legends)
  // Silver ponytail, red haori coat, black hakama, razor steel katana
  // ====================================================================
  if (heroId === 'ginzo') {
    // Ground Shadow
    const shadowGrad = ctx.createRadialGradient(cx, 290, 5, cx, 290, 48);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 290, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Combat aura
    if (auraGlow) {
      const aura = ctx.createRadialGradient(cx + leanX, cy, 30, cx + leanX, cy, 95);
      aura.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
      aura.addColorStop(0.7, 'rgba(244, 63, 94, 0.12)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx + leanX, cy, 95, 0, Math.PI * 2);
      ctx.fill();
    }

    if (awakenedGinzo) {
      // Golden awakening halo and speed-rune streaks: drawn behind the ronin silhouette.
      const awakeningAura = ctx.createRadialGradient(cx, cy, 26, cx, cy, 124);
      awakeningAura.addColorStop(0, 'rgba(253, 230, 138, 0.25)');
      awakeningAura.addColorStop(0.56, 'rgba(251, 191, 36, 0.16)');
      awakeningAura.addColorStop(1, 'rgba(217, 119, 6, 0)');
      ctx.fillStyle = awakeningAura;
      ctx.beginPath();
      ctx.arc(cx, cy, 124, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.strokeStyle = '#fde68a';
      ctx.globalAlpha = state.startsWith('attack') || state === 'dash' ? 0.95 : 0.68;
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 62, 108, -0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let ray = 0; ray < 10; ray++) {
        const a = (ray / 10) * Math.PI * 2 + f * 0.09;
        const inner = 79 + (ray % 3) * 5;
        const outer = inner + 12 + (ray % 2) * 7;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Legs: Black pleated Hakama with smooth fabric folds
    const leftLegX = cx - 18 + legCycle * 14;
    const rightLegX = cx + 18 - legCycle * 14;

    // Hakama Pants
    const hakamaGrad = ctx.createLinearGradient(cx - 30, cy + 40, cx + 30, 275);
    hakamaGrad.addColorStop(0, '#27272a');
    hakamaGrad.addColorStop(0.5, '#18181b');
    hakamaGrad.addColorStop(1, '#09090b');

    // Left Hakama Leg
    fillPoly([
      [cx - 12, cy + 45],
      [leftLegX - 22, 265],
      [leftLegX + 4, 265],
      [cx, cy + 55],
    ], hakamaGrad, '#09090b', 2.5);

    // Right Hakama Leg
    fillPoly([
      [cx, cy + 55],
      [rightLegX - 4, 265],
      [rightLegX + 22, 265],
      [cx + 12, cy + 45],
    ], hakamaGrad, '#09090b', 2.5);

    // Feet: White Tabi Socks & Wooden Geta Sandals
    // Left foot
    drawCircle(leftLegX - 8, 273, 7, '#ffffff', '#09090b', 2);
    fillPoly([[leftLegX - 16, 278], [leftLegX + 2, 278], [leftLegX + 2, 283], [leftLegX - 16, 283]], '#92400e', '#451a03', 1.5);
    // Right foot
    drawCircle(rightLegX + 8, 273, 7, '#ffffff', '#09090b', 2);
    fillPoly([[rightLegX, 278], [rightLegX + 18, 278], [rightLegX + 18, 283], [rightLegX, 283]], '#92400e', '#451a03', 1.5);

    // Flowing Silver Ponytail (behind body)
    const hairGrad = ctx.createLinearGradient(cx - 50, cy - 80, cx, cy);
    hairGrad.addColorStop(0, '#f8fafc');
    hairGrad.addColorStop(0.7, '#cbd5e1');
    hairGrad.addColorStop(1, '#94a3b8');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 42);
    ctx.bezierCurveTo(cx - 45, cy - 48, cx - 75 - (state === 'run' ? 25 : 0), cy - 20, cx - 65 - (state === 'run' ? 30 : 0), cy + 15);
    ctx.bezierCurveTo(cx - 50, cy + 5, cx - 30, cy - 20, cx - 12, cy - 35);
    ctx.closePath();
    ctx.fillStyle = hairGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Hair ribbon
    drawCircle(cx - 16, cy - 40, 5, awakenedGinzo ? '#facc15' : '#ef4444', awakenedGinzo ? '#fef3c7' : '#7f1d1d', 1.5);
    ctx.restore();

    // Torso: Crimson Red Haori Coat with White Kimono V-neck
    const haoriGrad = ctx.createLinearGradient(cx - 35, cy - 20, cx + 35, cy + 50);
    haoriGrad.addColorStop(0, awakenedGinzo ? '#fef3c7' : '#ef4444');
    haoriGrad.addColorStop(0.4, awakenedGinzo ? '#f59e0b' : '#dc2626');
    haoriGrad.addColorStop(1, awakenedGinzo ? '#92400e' : '#991b1b');

    // Haori Back / Body
    fillPoly([
      [cx - 32, cy - 20],
      [cx + 32, cy - 20],
      [cx + 28, cy + 48],
      [cx - 28, cy + 48],
    ], haoriGrad, awakenedGinzo ? '#fde68a' : '#09090b', awakenedGinzo ? 3.5 : 2.5);

    if (awakenedGinzo) {
      ctx.save();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 25, cy - 13);
      ctx.lineTo(cx - 15, cy + 26);
      ctx.moveTo(cx + 25, cy - 13);
      ctx.lineTo(cx + 15, cy + 26);
      ctx.stroke();
      ctx.restore();
    }

    // Inner White Kimono V-Neck
    fillPoly([
      [cx - 14, cy - 20],
      [cx + 14, cy - 20],
      [cx, cy + 18],
    ], '#f8fafc', '#cbd5e1', 1.5);

    // Chest Skin Gap (V-neck opening)
    fillPoly([
      [cx - 6, cy - 14],
      [cx + 6, cy - 14],
      [cx, cy + 8],
    ], '#fed7aa', '#d97706', 1);

    // Black Waist Sash (Obi) with Gold Buckle
    fillPoly([
      [cx - 26, cy + 30],
      [cx + 26, cy + 30],
      [cx + 26, cy + 44],
      [cx - 26, cy + 44],
    ], '#18181b', '#09090b', 2);
    drawCircle(cx, cy + 37, 7, '#fbbf24', '#b45309', 2);

    // Katana Scabbard on Hip
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 34);
    ctx.lineTo(cx - 55, cy + 68);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#18181b';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();
    ctx.restore();

    // Head: Proportioned Anime Face
    const faceGrad = ctx.createLinearGradient(cx, cy - 75, cx, cy - 25);
    faceGrad.addColorStop(0, '#ffedd5');
    faceGrad.addColorStop(1, '#fde68a');

    // Face oval
    ctx.beginPath();
    ctx.ellipse(cx, cy - 48, 22, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = faceGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Sharp anime eyes & eyebrows
    // Left eye
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(cx - 9, cy - 48, 4, 3, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 49, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 48, 4, 3, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 49, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Red eyeliner accent (Ronin styling)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 47);
    ctx.lineTo(cx - 5, cy - 49);
    ctx.moveTo(cx + 14, cy - 47);
    ctx.lineTo(cx + 5, cy - 49);
    ctx.stroke();

    // Eyebrows
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 54);
    ctx.lineTo(cx - 4, cy - 52);
    ctx.moveTo(cx + 15, cy - 54);
    ctx.lineTo(cx + 4, cy - 52);
    ctx.stroke();

    // Silver Bangs & Forehead Hair
    fillPoly([
      [cx - 24, cy - 65],
      [cx + 24, cy - 65],
      [cx + 26, cy - 48],
      [cx + 16, cy - 52],
      [cx + 6, cy - 38],
      [cx, cy - 50],
      [cx - 8, cy - 36],
      [cx - 18, cy - 50],
      [cx - 25, cy - 44],
    ], hairGrad, '#09090b', 2);

    // Left Arm (Sleeve)
    const leftArmX = cx - 35 - armSwing * 12;
    fillPoly([
      [cx - 28, cy - 18],
      [leftArmX - 12, cy + 18],
      [leftArmX + 12, cy + 22],
      [cx - 16, cy + 10],
    ], haoriGrad, '#09090b', 2);
    drawCircle(leftArmX, cy + 26, 7, '#ffedd5', '#d97706', 1.5);

    // Right Arm wielding Katana
    const rightArmX = cx + 32 + (state.startsWith('attack') ? 25 : 0);
    const rightArmY = cy + (state.startsWith('attack') ? -10 : 15);
    fillPoly([
      [cx + 16, cy - 18],
      [cx + 32, cy - 18],
      [rightArmX + 10, rightArmY + 8],
      [rightArmX - 10, rightArmY + 8],
    ], haoriGrad, '#09090b', 2);
    drawCircle(rightArmX, rightArmY + 12, 7, '#ffedd5', '#d97706', 1.5);

    // KATANA: Steel Blade with Metallic Gleam
    ctx.save();
    ctx.translate(rightArmX, rightArmY + 12);
    ctx.rotate(weaponAngle || 0.4);

    // Tsuka (Hilt)
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-16, 8);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Tsuba (Guard)
    drawCircle(0, 0, 7, '#fbbf24', '#78350f', 2);

    // Razor Blade with Mirror Gradient
    const bladeGrad = ctx.createLinearGradient(0, 0, 85, -30);
    bladeGrad.addColorStop(0, '#f8fafc');
    bladeGrad.addColorStop(0.5, '#ffffff');
    bladeGrad.addColorStop(0.8, '#cbd5e1');
    bladeGrad.addColorStop(1, awakenedGinzo ? '#facc15' : '#67e8f9');

    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(82, -24);
    ctx.lineTo(86, -20);
    ctx.lineTo(4, 3);
    ctx.closePath();
    ctx.fillStyle = bladeGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Blade Edge Sparkle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(6, -3);
    ctx.lineTo(84, -23);
    ctx.stroke();

    ctx.restore();
  }

  // ====================================================================
  // 2. QUAN HUYING (Kung Fu Master - Otherworld Legends)
  // Emerald Changshan tunic, gold dragon cloud trim, kung fu pants, Chi
  // ====================================================================
  else if (heroId === 'quan') {
    // Ground Shadow
    const shadowGrad = ctx.createRadialGradient(cx, 290, 5, cx, 290, 48);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 290, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden Chi Flame Aura
    const chiGrad = ctx.createRadialGradient(cx, cy, 35, cx, cy, 95);
    chiGrad.addColorStop(0, auraGlow ? 'rgba(251, 191, 36, 0.35)' : 'rgba(52, 211, 153, 0.15)');
    chiGrad.addColorStop(0.7, auraGlow ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.05)');
    chiGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = chiGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.fill();

    // Legs: Indigo Martial Arts Trousers with White Wraps
    const leftLegX = cx - 18 + legCycle * 14;
    const rightLegX = cx + 18 - legCycle * 14;

    const pantsGrad = ctx.createLinearGradient(cx - 30, cy + 40, cx + 30, 275);
    pantsGrad.addColorStop(0, '#1e1b4b');
    pantsGrad.addColorStop(0.6, '#312e81');
    pantsGrad.addColorStop(1, '#0f172a');

    // Left Kung Fu Leg
    fillPoly([
      [cx - 14, cy + 45],
      [leftLegX - 18, 255],
      [leftLegX + 4, 255],
      [cx, cy + 55],
    ], pantsGrad, '#09090b', 2.5);

    // Right Kung Fu Leg
    fillPoly([
      [cx, cy + 55],
      [rightLegX - 4, 255],
      [rightLegX + 18, 255],
      [cx + 14, cy + 45],
    ], pantsGrad, '#09090b', 2.5);

    // White Shin Wraps
    fillPoly([[leftLegX - 14, 255], [leftLegX + 2, 255], [leftLegX + 2, 273], [leftLegX - 14, 273]], '#f8fafc', '#94a3b8', 1.5);
    fillPoly([[rightLegX - 2, 255], [rightLegX + 14, 255], [rightLegX + 14, 273], [rightLegX - 2, 273]], '#f8fafc', '#94a3b8', 1.5);

    // Kung Fu Slippers (Black cloth with gold edge)
    drawCircle(leftLegX - 6, 278, 8, '#09090b', '#fbbf24', 1.5);
    drawCircle(rightLegX + 6, 278, 8, '#09090b', '#fbbf24', 1.5);

    // Torso: Emerald Changshan Tunic with Gold Trim
    const tunicGrad = ctx.createLinearGradient(cx - 35, cy - 20, cx + 35, cy + 50);
    tunicGrad.addColorStop(0, '#059669');
    tunicGrad.addColorStop(0.5, '#047857');
    tunicGrad.addColorStop(1, '#065f46');

    // Tunic Body
    fillPoly([
      [cx - 28, cy - 20],
      [cx + 28, cy - 20],
      [cx + 26, cy + 52],
      [cx - 26, cy + 52],
    ], tunicGrad, '#09090b', 2.5);

    // Golden Dragon Cloud Motif Embroidery
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 16, -Math.PI * 0.7, Math.PI * 0.7);
    ctx.stroke();
    drawCircle(cx, cy + 8, 6, '#f59e0b', '#fef08a', 1.5);

    // Chinese Mandarin Collar with Gold Trim
    fillPoly([
      [cx - 16, cy - 24],
      [cx + 16, cy - 24],
      [cx + 12, cy - 14],
      [cx - 12, cy - 14],
    ], '#047857', '#fbbf24', 2);

    // Brown Rope Belt with Gold Tassels
    fillPoly([
      [cx - 25, cy + 28],
      [cx + 25, cy + 28],
      [cx + 25, cy + 38],
      [cx - 25, cy + 38],
    ], '#78350f', '#09090b', 2);
    // Tassel hanging down
    fillPoly([[cx - 8, cy + 38], [cx + 2, cy + 38], [cx - 2, cy + 62], [cx - 6, cy + 62]], '#fbbf24', '#b45309', 1.5);

    // Head: Anime Martial Artist Face with High Hair Bun
    const faceGrad = ctx.createLinearGradient(cx, cy - 75, cx, cy - 25);
    faceGrad.addColorStop(0, '#ffedd5');
    faceGrad.addColorStop(1, '#fed7aa');

    ctx.beginPath();
    ctx.ellipse(cx, cy - 48, 22, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = faceGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dark glossy hair with martial topknot bun
    const darkHairGrad = ctx.createLinearGradient(cx - 30, cy - 85, cx + 30, cy - 35);
    darkHairGrad.addColorStop(0, '#18181b');
    darkHairGrad.addColorStop(0.5, '#27272a');
    darkHairGrad.addColorStop(1, '#09090b');

    // Topknot Bun
    drawCircle(cx, cy - 80, 16, darkHairGrad, '#09090b', 2);
    // Golden hairpin & red ribbon
    fillPoly([[cx - 22, cy - 82], [cx + 22, cy - 82], [cx + 18, cy - 78], [cx - 18, cy - 78]], '#fbbf24', '#78350f', 1.5);
    // Flying ribbon
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 80);
    ctx.quadraticCurveTo(cx + 36, cy - 72, cx + 42, cy - 55);
    ctx.stroke();

    // Bangs & Hairline
    fillPoly([
      [cx - 24, cy - 64],
      [cx + 24, cy - 64],
      [cx + 26, cy - 48],
      [cx + 12, cy - 54],
      [cx + 4, cy - 38],
      [cx - 4, cy - 52],
      [cx - 14, cy - 38],
      [cx - 24, cy - 48],
    ], darkHairGrad, '#09090b', 2);

    // Fiery Amber Eyes (Determined martial gaze)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(cx - 9, cy - 48, 4.5, 3.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 49, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 48, 4.5, 3.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 49, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 54);
    ctx.lineTo(cx - 4, cy - 51);
    ctx.moveTo(cx + 15, cy - 54);
    ctx.lineTo(cx + 4, cy - 51);
    ctx.stroke();

    // Toned Arms with Golden Dragon Gauntlets & Chi Flames
    // Left Arm (Fist Stance)
    const lHandX = cx - 38 - (state.startsWith('attack') ? 15 : 0);
    const lHandY = cy + 5;
    fillPoly([
      [cx - 26, cy - 18],
      [lHandX - 10, lHandY - 4],
      [lHandX + 12, lHandY + 14],
      [cx - 16, cy + 8],
    ], '#fed7aa', '#09090b', 2);
    // Golden Dragon Bracer
    fillPoly([[lHandX - 8, lHandY - 2], [lHandX + 8, lHandY + 2], [lHandX + 4, lHandY + 16], [lHandX - 10, lHandY + 12]], '#fbbf24', '#b45309', 2);
    drawCircle(lHandX, lHandY + 18, 9, '#fed7aa', '#09090b', 2);

    // Right Arm (Pounding Fist)
    const rHandX = cx + 38 + (state.startsWith('attack') ? 35 : 0);
    const rHandY = cy + (state.startsWith('attack') ? -12 : 12);
    fillPoly([
      [cx + 16, cy - 18],
      [cx + 28, cy - 18],
      [rHandX + 12, rHandY + 4],
      [rHandX - 8, rHandY + 8],
    ], '#fed7aa', '#09090b', 2);
    // Golden Dragon Bracer
    fillPoly([[rHandX - 6, rHandY], [rHandX + 10, rHandY + 2], [rHandX + 6, rHandY + 16], [rHandX - 8, rHandY + 14]], '#fbbf24', '#b45309', 2);
    drawCircle(rHandX, rHandY + 18, 9, '#fed7aa', '#09090b', 2);

    // Glowing Golden Chi Flames on Fists
    drawCircle(lHandX, lHandY + 18, 14, 'rgba(251, 191, 36, 0.45)');
    drawCircle(rHandX, rHandY + 18, 14, 'rgba(251, 191, 36, 0.45)');
  }

  // ====================================================================
  // 3. KATHERINE (Arch-Sorceress - Otherworld Legends)
  // Blonde curls, curved purple witch hat, starry robe, Starlight Staff
  // ====================================================================
  else {
    // Ground Shadow
    const shadowGrad = ctx.createRadialGradient(cx, 290, 5, cx, 290, 48);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 290, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arcane Mystic Aura
    const arcaneGrad = ctx.createRadialGradient(cx, cy, 35, cx, cy, 100);
    arcaneGrad.addColorStop(0, auraGlow ? 'rgba(168, 85, 247, 0.35)' : 'rgba(147, 51, 234, 0.15)');
    arcaneGrad.addColorStop(0.7, auraGlow ? 'rgba(126, 34, 206, 0.2)' : 'rgba(59, 130, 246, 0.08)');
    arcaneGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = arcaneGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 100, 0, Math.PI * 2);
    ctx.fill();

    // Legs & Boots: Violet Thigh-high Boots under Dress
    const leftLegX = cx - 14 + legCycle * 10;
    const rightLegX = cx + 14 - legCycle * 10;
    fillPoly([[leftLegX - 8, 235], [leftLegX + 8, 235], [leftLegX + 6, 275], [leftLegX - 6, 275]], '#581c87', '#3b0764', 2);
    fillPoly([[rightLegX - 8, 235], [rightLegX + 8, 235], [rightLegX + 6, 275], [rightLegX - 6, 275]], '#581c87', '#3b0764', 2);
    drawCircle(leftLegX, 278, 7, '#3b0764', '#fbbf24', 1.5);
    drawCircle(rightLegX, 278, 7, '#3b0764', '#fbbf24', 1.5);

    // Flowing Sorceress Robe / Dress
    const robeGrad = ctx.createLinearGradient(cx - 45, cy - 20, cx + 45, 260);
    robeGrad.addColorStop(0, '#7e22ce');
    robeGrad.addColorStop(0.5, '#6b21a8');
    robeGrad.addColorStop(1, '#3b0764');

    // Flared Gown Skirt with Gold Star Hem
    fillPoly([
      [cx - 22, cy + 24],
      [cx + 22, cy + 24],
      [cx + 42, 255],
      [cx - 42, 255],
    ], robeGrad, '#09090b', 2.5);

    // Golden Rune Hem
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 41, 253);
    ctx.lineTo(cx + 41, 253);
    ctx.stroke();

    // Corset Bodice & Waist Ribbon
    fillPoly([
      [cx - 24, cy - 20],
      [cx + 24, cy - 20],
      [cx + 22, cy + 26],
      [cx - 22, cy + 26],
    ], '#9333ea', '#09090b', 2);

    // Gold Corset Lacing
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 10);
    ctx.lineTo(cx + 8, cy + 6);
    ctx.moveTo(cx + 8, cy - 10);
    ctx.lineTo(cx - 8, cy + 6);
    ctx.stroke();

    // Flowing Golden-Blonde Hair (Behind Head & Shoulders)
    const blondeGrad = ctx.createLinearGradient(cx - 45, cy - 70, cx + 45, cy + 20);
    blondeGrad.addColorStop(0, '#fef08a');
    blondeGrad.addColorStop(0.5, '#fde047');
    blondeGrad.addColorStop(1, '#eab308');

    // Left Hair Wave
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 45);
    ctx.quadraticCurveTo(cx - 48, cy - 15, cx - 38, cy + 25);
    ctx.quadraticCurveTo(cx - 24, cy + 10, cx - 18, cy - 25);
    ctx.closePath();
    ctx.fillStyle = blondeGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Right Hair Wave
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy - 45);
    ctx.quadraticCurveTo(cx + 48, cy - 15, cx + 38, cy + 25);
    ctx.quadraticCurveTo(cx + 24, cy + 10, cx + 18, cy - 25);
    ctx.closePath();
    ctx.fillStyle = blondeGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head: Delicate Anime Sorceress Face
    const faceGrad = ctx.createLinearGradient(cx, cy - 75, cx, cy - 25);
    faceGrad.addColorStop(0, '#fff1f2');
    faceGrad.addColorStop(1, '#ffedd5');

    ctx.beginPath();
    ctx.ellipse(cx, cy - 48, 21, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = faceGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Sapphire-Blue Anime Eyes
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 48, 4.5, 3.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 7, cy - 49, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy - 48, 4.5, 3.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 9, cy - 49, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Cute blush
    drawCircle(cx - 13, cy - 43, 4, 'rgba(244, 63, 94, 0.3)');
    drawCircle(cx + 13, cy - 43, 4, 'rgba(244, 63, 94, 0.3)');

    // Curved Arch-Sorceress Witch Hat
    const hatGrad = ctx.createLinearGradient(cx - 45, cy - 130, cx + 45, cy - 60);
    hatGrad.addColorStop(0, '#581c87');
    hatGrad.addColorStop(0.6, '#6b21a8');
    hatGrad.addColorStop(1, '#7e22ce');

    // Wide Hat Brim
    ctx.beginPath();
    ctx.ellipse(cx, cy - 64, 46, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = hatGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gold Hat Band
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 64, 28, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing Gold Star Buckle
    drawCircle(cx, cy - 66, 7, '#fbbf24', '#b45309', 2);

    // Pointed Hat Cone with Dramatic Curve
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 68);
    ctx.quadraticCurveTo(cx - 15, cy - 110, cx - 2, cy - 135);
    ctx.quadraticCurveTo(cx + 25, cy - 145, cx + 18, cy - 120);
    ctx.quadraticCurveTo(cx + 16, cy - 90, cx + 26, cy - 68);
    ctx.closePath();
    ctx.fillStyle = hatGrad;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Left Arm holding Staff
    const staffX = cx + 38;
    fillPoly([
      [cx - 20, cy - 18],
      [cx - 34, cy + 4],
      [cx - 20, cy + 18],
      [cx - 12, cy + 6],
    ], robeGrad, '#09090b', 2);
    drawCircle(cx - 22, cy + 18, 6, '#ffedd5', '#d97706', 1.5);

    // Right Arm holding Starlight Staff
    fillPoly([
      [cx + 14, cy - 18],
      [staffX - 10, cy + 8],
      [staffX + 6, cy + 12],
      [cx + 24, cy - 8],
    ], robeGrad, '#09090b', 2);
    drawCircle(staffX - 2, cy + 10, 6, '#ffedd5', '#d97706', 1.5);

    // STARLIGHT ARCHMAGE STAFF
    ctx.save();
    ctx.translate(staffX, cy);

    // Shaft: Polished Ebony with Gold Rings
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -95);
    ctx.lineTo(0, 85);
    ctx.stroke();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, -40);
    ctx.lineTo(4, -40);
    ctx.moveTo(-4, 20);
    ctx.lineTo(4, 20);
    ctx.stroke();

    // Glowing Astral Star Gem at Staff Head
    const gemGrad = ctx.createRadialGradient(0, -98, 2, 0, -98, 20);
    gemGrad.addColorStop(0, '#ffffff');
    gemGrad.addColorStop(0.4, '#38bdf8');
    gemGrad.addColorStop(0.8, '#9333ea');
    gemGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');

    ctx.fillStyle = gemGrad;
    ctx.beginPath();
    ctx.arc(0, -98, 20, 0, Math.PI * 2);
    ctx.fill();

    // Gold Crescent Staff Head surrounding Gem
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -98, 14, -Math.PI * 0.75, Math.PI * 0.75);
    ctx.stroke();

    ctx.restore();
  }

  return createActorPixelTexture(canvas);
}

// ----------------------------------------------------------------------
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
    // Master Chanyi: Martial Sage in White and Jade Robes
    ctx.beginPath();
    ctx.ellipse(cx, cy - 30, 20, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fed7aa';
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // White Topknot Hair
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy - 48, 14, 0, Math.PI * 2);
    ctx.fill();

    // Sage Robe (White with Jade Green Lapels)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 10);
    ctx.lineTo(cx + 26, cy - 10);
    ctx.lineTo(cx + 30, cy + 50);
    ctx.lineTo(cx - 30, cy + 50);
    ctx.closePath();
    ctx.fill();

    // Jade Green Collar & Scroll
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 12, cy + 8, 24, 8); // Ancient martial scroll

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
  return createPixelEffectTexture(canvas, 64);
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
