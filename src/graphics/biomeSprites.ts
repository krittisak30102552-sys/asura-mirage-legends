/**
 * High-Definition Sprites for the 6 Biomes, their Core Mobs, End-of-Biome Bosses,
 * and Secret Bosses as specified in the Level System:
 *
 * 1. ป่าไผ่หมอก (bamboo):
 *    - Mobs: หมาป่า (bamboo_wolf), นักธนูไผ่ (bamboo_archer), ต้นไม้เดินได้ (bamboo_treant)
 *    - Boss: เสือขาวผู้พิทักษ์ (boss_bamboo_tiger)
 *    - Secret Boss: ราชินีหมอก (boss_mist_queen)
 *
 * 2. สุสานใต้ดิน (crypt):
 *    - Mobs: โครงกระดูก (crypt_skeleton), ผี (crypt_ghost), นักบวชศพ (crypt_priest)
 *    - Boss: ขุนศพเฝ้าสุสาน (boss_crypt_warden)
 *    - Secret Boss: จอมมารเลือด (boss_blood_demon)
 *
 * 3. ซากเมืองทะเลทราย (desert):
 *    - Mobs: แมงป่อง (desert_scorpion), โจรทราย (desert_bandit), มัมมี่ (desert_mummy)
 *    - Boss: จอมวิญญาณไฟ (boss_fire_spirit)
 *    - Secret Boss: ราชาทราย (boss_sand_king)
 *
 * 4. ปราสาทน้ำแข็ง (ice):
 *    - Mobs: หมาป่าหิมะ (ice_wolf), ทหารน้ำแข็ง (ice_soldier), ผีหิมะ (ice_ghost)
 *    - Boss: อัศวินน้ำแข็ง (boss_ice_knight)
 *    - Secret Boss: ราชินีหิมะ (boss_snow_queen)
 *
 * 5. โรงหลอมภูเขาไฟ (forge):
 *    - Mobs: ก็อบลินช่างตี (forge_goblin), หุ่นเหล็ก (forge_automaton), ค้างคาวไฟ (forge_bat)
 *    - Boss: ยักษ์ช่างตีเหล็ก (boss_blacksmith_giant)
 *    - Secret Boss: มังกรลาวา (boss_lava_dragon)
 *
 * 6. วังเมฆา (sky):
 *    - Mobs: นกกระเรียนเวทย์ (sky_crane), ทหารสวรรค์ (sky_soldier), เงา (sky_shadow)
 *    - Boss: เทพธิดาแห่งสายลม (boss_wind_goddess)
 *    - Secret Boss: ราชันย์เงา (boss_shadow_monarch)
 */

import * as THREE from 'three';

export function createPixelCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function drawBiomeEnemy(
  ctx: CanvasRenderingContext2D,
  type: string,
  cx: number,
  cy: number,
  bob: number,
  hurt: boolean
): boolean {
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

  // --------------------------------------------------------------------------
  // 1. BAMBOO FOREST (ป่าไผ่หมอก)
  // --------------------------------------------------------------------------
  if (type === 'bamboo_wolf') {
    // หมาป่าไผ่: Agile emerald/gray wolf
    const col = hurt ? '#fca5a5' : '#334155';
    const under = hurt ? '#fee2e2' : '#94a3b8';
    // Body & tail
    fillPoly([[cx - 36, cy + 10 + bob], [cx + 36, cy + 10 + bob], [cx + 25, cy + 40], [cx - 25, cy + 40]], col, '#0f172a', 2);
    // Bushy tail
    fillPoly([[cx - 35, cy + 15 + bob], [cx - 65, cy + 5 + bob], [cx - 45, cy + 35 + bob]], under, '#0f172a', 1.5);
    // Head with sharp muzzle
    drawCircle(cx + 22, cy - 8 + bob, 18, col, '#0f172a', 2);
    fillPoly([[cx + 28, cy - 8 + bob], [cx + 52, cy - 4 + bob], [cx + 30, cy + 6 + bob]], under, '#0f172a', 2);
    // Ears
    fillPoly([[cx + 12, cy - 22 + bob], [cx + 22, cy - 42 + bob], [cx + 28, cy - 20 + bob]], col, '#0f172a', 2);
    fillPoly([[cx + 26, cy - 20 + bob], [cx + 36, cy - 38 + bob], [cx + 40, cy - 18 + bob]], col, '#0f172a', 2);
    // Glowing emerald eyes & nose
    drawCircle(cx + 32, cy - 10 + bob, 3, '#10b981');
    drawCircle(cx + 50, cy - 4 + bob, 2.5, '#0f172a');
    return true;
  }

  if (type === 'bamboo_archer') {
    // นักธนูไผ่: Conical bamboo hat, jade tunic, bamboo bow
    const col = hurt ? '#fca5a5' : '#15803d';
    // Legs & body
    fillPoly([[cx - 18, cy + 30 + bob], [cx + 18, cy + 30 + bob], [cx + 14, cy + 65], [cx - 14, cy + 65]], '#1e293b', '#0f172a', 2);
    fillPoly([[cx - 24, cy - 5 + bob], [cx + 24, cy - 5 + bob], [cx + 20, cy + 35 + bob], [cx - 20, cy + 35 + bob]], col, '#0f172a', 2);
    // Face
    drawCircle(cx, cy - 22 + bob, 15, '#fed7aa', '#0f172a', 2);
    // Straw Bamboo Hat
    fillPoly([[cx - 42, cy - 22 + bob], [cx, cy - 52 + bob], [cx + 42, cy - 22 + bob]], '#ca8a04', '#78350f', 2.5);
    // Bamboo Bow
    ctx.strokeStyle = '#65a30d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx + 32, cy + 10 + bob, 26, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 42, cy - 12 + bob);
    ctx.lineTo(cx + 42, cy + 32 + bob);
    ctx.stroke();
    return true;
  }

  if (type === 'bamboo_treant') {
    // ต้นไม้เดินได้: Sturdy bamboo/wood treant with leaves
    const bark = hurt ? '#fca5a5' : '#78350f';
    const leaves = hurt ? '#fecaca' : '#15803d';
    // Massive trunk torso
    fillPoly([[cx - 35, cy - 25 + bob], [cx + 35, cy - 25 + bob], [cx + 42, cy + 55], [cx - 42, cy + 55]], bark, '#1c1917', 3);
    // Head canopy
    drawCircle(cx, cy - 42 + bob, 32, leaves, '#052e16', 3);
    drawCircle(cx - 25, cy - 35 + bob, 20, leaves, '#052e16', 2);
    drawCircle(cx + 25, cy - 35 + bob, 20, leaves, '#052e16', 2);
    // Glowing spirit eyes
    drawCircle(cx - 14, cy - 15 + bob, 4.5, '#4ade80');
    drawCircle(cx + 14, cy - 15 + bob, 4.5, '#4ade80');
    // Branch arms
    fillPoly([[cx - 32, cy - 10 + bob], [cx - 65, cy + 15 + bob], [cx - 48, cy + 25 + bob]], bark, '#1c1917', 2);
    fillPoly([[cx + 32, cy - 10 + bob], [cx + 65, cy + 15 + bob], [cx + 48, cy + 25 + bob]], bark, '#1c1917', 2);
    return true;
  }

  if (type === 'boss_bamboo_tiger') {
    // บอส: เสือขาวผู้พิทักษ์ (White Tiger Guardian)
    const whiteFur = hurt ? '#fca5a5' : '#f8fafc';
    const stripe = hurt ? '#fee2e2' : '#0284c7';
    // Colossal tiger body
    fillPoly([[cx - 55, cy - 10 + bob], [cx + 55, cy - 10 + bob], [cx + 45, cy + 65], [cx - 45, cy + 65]], whiteFur, '#0f172a', 3);
    // Tiger Stripes
    [-20, 0, 20].forEach((ox) => {
      fillPoly([[cx + ox - 8, cy + 5 + bob], [cx + ox + 8, cy + 5 + bob], [cx + ox, cy + 40 + bob]], stripe);
    });
    // Massive tiger head
    drawCircle(cx, cy - 38 + bob, 36, whiteFur, '#0f172a', 3);
    // Tiger Ears
    fillPoly([[cx - 36, cy - 55 + bob], [cx - 24, cy - 82 + bob], [cx - 12, cy - 58 + bob]], whiteFur, '#0f172a', 2.5);
    fillPoly([[cx + 12, cy - 58 + bob], [cx + 24, cy - 82 + bob], [cx + 36, cy - 55 + bob]], whiteFur, '#0f172a', 2.5);
    // Piercing Azure Lightning Eyes
    drawCircle(cx - 15, cy - 38 + bob, 6, '#38bdf8', '#0284c7', 2);
    drawCircle(cx + 15, cy - 38 + bob, 6, '#38bdf8', '#0284c7', 2);
    // Snout and Fangs
    fillPoly([[cx - 16, cy - 25 + bob], [cx + 16, cy - 25 + bob], [cx, cy - 12 + bob]], '#334155');
    fillPoly([[cx - 10, cy - 15 + bob], [cx - 6, cy - 2 + bob], [cx - 2, cy - 15 + bob]], '#f8fafc');
    fillPoly([[cx + 2, cy - 15 + bob], [cx + 6, cy - 2 + bob], [cx + 10, cy - 15 + bob]], '#f8fafc');
    return true;
  }

  if (type === 'boss_mist_queen') {
    // บอสลับ: ราชินีหมอก (Mist Queen)
    const robe = hurt ? '#fca5a5' : '#047857';
    const veil = hurt ? '#fee2e2' : '#6ee7b7';
    // Ethereal floating robes
    fillPoly([[cx - 42, cy - 15 + bob], [cx + 42, cy - 15 + bob], [cx + 50, cy + 65 + bob * 1.5], [cx - 50, cy + 65 + bob * 1.5]], robe, '#064e3b', 2.5);
    // Flowing emerald mist veil
    drawCircle(cx, cy - 40 + bob, 24, veil, '#047857', 2);
    // Crown of jade branches
    fillPoly([[cx - 22, cy - 60 + bob], [cx - 32, cy - 88 + bob], [cx - 12, cy - 65 + bob]], '#34d399', '#064e3b', 2);
    fillPoly([[cx + 22, cy - 60 + bob], [cx + 32, cy - 88 + bob], [cx + 12, cy - 65 + bob]], '#34d399', '#064e3b', 2);
    fillPoly([[cx - 8, cy - 62 + bob], [cx, cy - 95 + bob], [cx + 8, cy - 62 + bob]], '#10b981', '#064e3b', 2);
    // Glowing emerald gaze
    drawCircle(cx - 8, cy - 40 + bob, 4, '#10b981');
    drawCircle(cx + 8, cy - 40 + bob, 4, '#10b981');
    return true;
  }

  // --------------------------------------------------------------------------
  // 2. UNDERGROUND CRYPT (สุสานใต้ดิน)
  // --------------------------------------------------------------------------
  if (type === 'crypt_skeleton') {
    // โครงกระดูก: Skeleton warrior
    const bone = hurt ? '#fca5a5' : '#e2e8f0';
    // Ribcage & spine
    fillPoly([[cx - 20, cy - 8 + bob], [cx + 20, cy - 8 + bob], [cx + 12, cy + 40], [cx - 12, cy + 40]], bone, '#1e293b', 2);
    // Skull
    drawCircle(cx, cy - 28 + bob, 16, bone, '#1e293b', 2);
    // Dark eye sockets
    drawCircle(cx - 6, cy - 28 + bob, 4, '#09090b');
    drawCircle(cx + 6, cy - 28 + bob, 4, '#09090b');
    // Rusted iron sword
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy + 25 + bob);
    ctx.lineTo(cx + 48, cy - 15 + bob);
    ctx.stroke();
    return true;
  }

  if (type === 'crypt_ghost') {
    // ผี: Floating blue specter
    const col = hurt ? '#fca5a5' : '#818cf8';
    fillPoly([[cx - 28, cy - 20 + bob], [cx + 28, cy - 20 + bob], [cx + 22, cy + 45 + bob], [cx, cy + 30 + bob], [cx - 22, cy + 45 + bob]], col, '#312e81', 2);
    drawCircle(cx, cy - 28 + bob, 20, col, '#312e81', 2);
    drawCircle(cx - 7, cy - 28 + bob, 4, '#ffffff');
    drawCircle(cx + 7, cy - 28 + bob, 4, '#ffffff');
    return true;
  }

  if (type === 'crypt_priest') {
    // นักบวชศพ: Necromancer priest
    const robe = hurt ? '#fca5a5' : '#4c1d95';
    fillPoly([[cx - 30, cy - 15 + bob], [cx + 30, cy - 15 + bob], [cx + 26, cy + 55], [cx - 26, cy + 55]], robe, '#1e1b4b', 2.5);
    drawCircle(cx, cy - 35 + bob, 18, '#1e1b4b', '#581c87', 2);
    // Glowing violet eyes
    drawCircle(cx - 6, cy - 35 + bob, 3.5, '#c084fc');
    drawCircle(cx + 6, cy - 35 + bob, 3.5, '#c084fc');
    // Bone Staff with skull head
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 25, cy + 45);
    ctx.lineTo(cx + 35, cy - 50 + bob);
    ctx.stroke();
    drawCircle(cx + 36, cy - 55 + bob, 9, '#f8fafc', '#1e1b4b', 2);
    return true;
  }

  if (type === 'boss_crypt_warden') {
    // บอส: ขุนศพเฝ้าสุสาน (Crypt Warden)
    const armor = hurt ? '#fca5a5' : '#1e1b4b';
    const trim = hurt ? '#fee2e2' : '#7c3aed';
    // Colossal horned death knight
    fillPoly([[cx - 48, cy - 15 + bob], [cx + 48, cy - 15 + bob], [cx + 42, cy + 68], [cx - 42, cy + 68]], armor, '#09090b', 3);
    // Horned Skull Helm
    drawCircle(cx, cy - 42 + bob, 26, '#312e81', '#09090b', 3);
    // Massive horns
    fillPoly([[cx - 22, cy - 55 + bob], [cx - 52, cy - 85 + bob], [cx - 15, cy - 65 + bob]], trim, '#09090b', 2.5);
    fillPoly([[cx + 22, cy - 55 + bob], [cx + 52, cy - 85 + bob], [cx + 15, cy - 65 + bob]], trim, '#09090b', 2.5);
    // Glowing soul eyes
    drawCircle(cx - 9, cy - 42 + bob, 5, '#a855f7');
    drawCircle(cx + 9, cy - 42 + bob, 5, '#a855f7');
    // Massive Greatsword
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx + 35, cy + 50);
    ctx.lineTo(cx + 65, cy - 45 + bob);
    ctx.stroke();
    return true;
  }

  if (type === 'boss_blood_demon') {
    // บอสลับ: จอมมารเลือด (Blood Demon)
    const crimson = hurt ? '#fca5a5' : '#991b1b';
    const darkCol = hurt ? '#fee2e2' : '#450a0a';
    // Demon wings
    fillPoly([[cx - 30, cy - 20 + bob], [cx - 82, cy - 65 + bob], [cx - 65, cy + 25 + bob], [cx - 20, cy + 15]], darkCol, '#09090b', 2.5);
    fillPoly([[cx + 30, cy - 20 + bob], [cx + 82, cy - 65 + bob], [cx + 65, cy + 25 + bob], [cx + 20, cy + 15]], darkCol, '#09090b', 2.5);
    // Muscular crimson torso
    fillPoly([[cx - 42, cy - 15 + bob], [cx + 42, cy - 15 + bob], [cx + 35, cy + 65], [cx - 35, cy + 65]], crimson, '#450a0a', 3);
    drawCircle(cx, cy - 40 + bob, 24, crimson, '#450a0a', 3);
    // Curved demon horns
    fillPoly([[cx - 18, cy - 58 + bob], [cx - 42, cy - 88 + bob], [cx - 8, cy - 64 + bob]], '#18181b', '#ef4444', 2);
    fillPoly([[cx + 18, cy - 58 + bob], [cx + 42, cy - 88 + bob], [cx + 8, cy - 64 + bob]], '#18181b', '#ef4444', 2);
    // Flaming blood eyes
    drawCircle(cx - 8, cy - 40 + bob, 5, '#f87171');
    drawCircle(cx + 8, cy - 40 + bob, 5, '#f87171');
    return true;
  }

  // --------------------------------------------------------------------------
  // 3. DESERT CITY RUINS (ซากเมืองทะเลทราย)
  // --------------------------------------------------------------------------
  if (type === 'desert_scorpion') {
    // แมงป่อง: Golden venomous scorpion
    const col = hurt ? '#fca5a5' : '#d97706';
    fillPoly([[cx - 30, cy + 5 + bob], [cx + 30, cy + 5 + bob], [cx + 20, cy + 40], [cx - 20, cy + 40]], col, '#78350f', 2);
    // Pincers
    fillPoly([[cx - 25, cy + 5 + bob], [cx - 50, cy - 15 + bob], [cx - 32, cy + 15 + bob]], col, '#78350f', 2);
    fillPoly([[cx + 25, cy + 5 + bob], [cx + 50, cy - 15 + bob], [cx + 32, cy + 15 + bob]], col, '#78350f', 2);
    // Curved Stinger Tail
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 35);
    ctx.quadraticCurveTo(cx - 35, cy + 50, cx - 25, cy - 25 + bob);
    ctx.stroke();
    drawCircle(cx - 22, cy - 26 + bob, 5, '#ef4444', '#78350f', 2);
    return true;
  }

  if (type === 'desert_bandit') {
    // โจรทราย: Hooded desert thief
    const col = hurt ? '#fca5a5' : '#b45309';
    fillPoly([[cx - 22, cy - 8 + bob], [cx + 22, cy - 8 + bob], [cx + 18, cy + 55], [cx - 18, cy + 55]], col, '#451a03', 2);
    drawCircle(cx, cy - 28 + bob, 16, '#fed7aa', '#451a03', 2);
    // Face scarf wrap
    fillPoly([[cx - 18, cy - 26 + bob], [cx + 18, cy - 26 + bob], [cx + 12, cy - 12 + bob], [cx - 12, cy - 12 + bob]], '#78350f');
    drawCircle(cx - 6, cy - 32 + bob, 3, '#09090b');
    drawCircle(cx + 6, cy - 32 + bob, 3, '#09090b');
    return true;
  }

  if (type === 'desert_mummy') {
    // มัมมี่: Linen wrapped ancient corpse
    const col = hurt ? '#fca5a5' : '#d6d3d1';
    fillPoly([[cx - 28, cy - 15 + bob], [cx + 28, cy - 15 + bob], [cx + 24, cy + 60], [cx - 24, cy + 60]], col, '#44403c', 2.5);
    drawCircle(cx, cy - 35 + bob, 18, col, '#44403c', 2.5);
    // Glowing golden eyes through wraps
    drawCircle(cx - 6, cy - 35 + bob, 4, '#f59e0b');
    drawCircle(cx + 6, cy - 35 + bob, 4, '#f59e0b');
    return true;
  }

  if (type === 'boss_fire_spirit') {
    // บอส: จอมวิญญาณไฟ (Fire Spirit Lord)
    const flame = hurt ? '#fca5a5' : '#f97316';
    const core = hurt ? '#fee2e2' : '#fef08a';
    fillPoly([[cx - 45, cy - 15 + bob], [cx + 45, cy - 15 + bob], [cx + 25, cy + 70 + bob * 2], [cx, cy + 50], [cx - 25, cy + 70 + bob * 2]], flame, '#c2410c', 3);
    drawCircle(cx, cy - 38 + bob, 26, flame, '#c2410c', 3);
    drawCircle(cx, cy - 38 + bob, 14, core);
    drawCircle(cx - 8, cy - 40 + bob, 5, '#ef4444');
    drawCircle(cx + 8, cy - 40 + bob, 5, '#ef4444');
    return true;
  }

  if (type === 'boss_sand_king') {
    // บอสลับ: ราชาทราย (Sand King)
    const gold = hurt ? '#fca5a5' : '#f59e0b';
    fillPoly([[cx - 50, cy - 15 + bob], [cx + 50, cy - 15 + bob], [cx + 42, cy + 68], [cx - 42, cy + 68]], gold, '#78350f', 3);
    // Pharaoh Headdress (Nemes)
    fillPoly([[cx - 38, cy - 25 + bob], [cx - 48, cy + 25 + bob], [cx - 22, cy - 15 + bob]], '#0284c7', '#082f49', 2);
    fillPoly([[cx + 38, cy - 25 + bob], [cx + 48, cy + 25 + bob], [cx + 22, cy - 15 + bob]], '#0284c7', '#082f49', 2);
    drawCircle(cx, cy - 42 + bob, 24, '#fed7aa', '#78350f', 2.5);
    // Golden Cobra Crown
    fillPoly([[cx - 16, cy - 64 + bob], [cx, cy - 88 + bob], [cx + 16, cy - 64 + bob]], '#fbbf24', '#78350f', 2);
    drawCircle(cx - 8, cy - 42 + bob, 4.5, '#ef4444');
    drawCircle(cx + 8, cy - 42 + bob, 4.5, '#ef4444');
    return true;
  }

  // --------------------------------------------------------------------------
  // 4. ICE CASTLE (ปราสาทน้ำแข็ง)
  // --------------------------------------------------------------------------
  if (type === 'ice_wolf') {
    // หมาป่าหิมะ: Frost wolf with icy blue fur
    const col = hurt ? '#fca5a5' : '#e0f2fe';
    fillPoly([[cx - 36, cy + 10 + bob], [cx + 36, cy + 10 + bob], [cx + 25, cy + 40], [cx - 25, cy + 40]], col, '#0284c7', 2);
    drawCircle(cx + 22, cy - 8 + bob, 18, col, '#0284c7', 2);
    drawCircle(cx + 32, cy - 10 + bob, 3.5, '#0284c7');
    return true;
  }

  if (type === 'ice_soldier') {
    // ทหารน้ำแข็ง: Crystal knight
    const col = hurt ? '#fca5a5' : '#38bdf8';
    fillPoly([[cx - 26, cy - 10 + bob], [cx + 26, cy - 10 + bob], [cx + 22, cy + 55], [cx - 22, cy + 55]], col, '#0369a1', 2.5);
    drawCircle(cx, cy - 32 + bob, 18, '#bae6fd', '#0369a1', 2);
    drawCircle(cx - 6, cy - 32 + bob, 3.5, '#0284c7');
    drawCircle(cx + 6, cy - 32 + bob, 3.5, '#0284c7');
    return true;
  }

  if (type === 'ice_ghost') {
    // ผีหิมะ: Snow phantom
    const col = hurt ? '#fca5a5' : '#bae6fd';
    fillPoly([[cx - 26, cy - 20 + bob], [cx + 26, cy - 20 + bob], [cx + 18, cy + 45 + bob], [cx - 18, cy + 45 + bob]], col, '#0284c7', 2);
    drawCircle(cx, cy - 28 + bob, 18, col, '#0284c7', 2);
    drawCircle(cx - 6, cy - 28 + bob, 4, '#0369a1');
    drawCircle(cx + 6, cy - 28 + bob, 4, '#0369a1');
    return true;
  }

  if (type === 'boss_ice_knight') {
    // บอส: อัศวินน้ำแข็ง (Ice Knight)
    const crystal = hurt ? '#fca5a5' : '#0284c7';
    fillPoly([[cx - 48, cy - 15 + bob], [cx + 48, cy - 15 + bob], [cx + 42, cy + 68], [cx - 42, cy + 68]], crystal, '#0c4a6e', 3);
    drawCircle(cx, cy - 42 + bob, 26, '#e0f2fe', '#0c4a6e', 3);
    // Glacial Lance
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + 35, cy + 50);
    ctx.lineTo(cx + 65, cy - 45 + bob);
    ctx.stroke();
    return true;
  }

  if (type === 'boss_snow_queen') {
    // บอสลับ: ราชินีหิมะ (Snow Queen)
    const dress = hurt ? '#fca5a5' : '#0369a1';
    fillPoly([[cx - 42, cy - 15 + bob], [cx + 42, cy - 15 + bob], [cx + 50, cy + 68 + bob], [cx - 50, cy + 68 + bob]], dress, '#082f49', 2.5);
    drawCircle(cx, cy - 40 + bob, 24, '#f0f9ff', '#082f49', 2.5);
    // Ice Crown
    fillPoly([[cx - 20, cy - 62 + bob], [cx - 30, cy - 90 + bob], [cx - 10, cy - 65 + bob]], '#38bdf8');
    fillPoly([[cx + 20, cy - 62 + bob], [cx + 30, cy - 90 + bob], [cx + 10, cy - 65 + bob]], '#38bdf8');
    fillPoly([[cx - 8, cy - 64 + bob], [cx, cy - 98 + bob], [cx + 8, cy - 64 + bob]], '#bae6fd');
    return true;
  }

  // --------------------------------------------------------------------------
  // 5. VOLCANO FORGE (โรงหลอมภูเขาไฟ)
  // --------------------------------------------------------------------------
  if (type === 'forge_goblin') {
    // ก็อบลินช่างตี: Hammer goblin
    const col = hurt ? '#fca5a5' : '#84cc16';
    fillPoly([[cx - 24, cy - 5 + bob], [cx + 24, cy - 5 + bob], [cx + 20, cy + 45], [cx - 20, cy + 45]], '#78350f', '#451a03', 2);
    drawCircle(cx, cy - 25 + bob, 18, col, '#365314', 2);
    // Big pointed ears
    fillPoly([[cx - 15, cy - 25 + bob], [cx - 45, cy - 35 + bob], [cx - 15, cy - 15 + bob]], col, '#365314', 2);
    fillPoly([[cx + 15, cy - 25 + bob], [cx + 45, cy - 35 + bob], [cx + 15, cy - 15 + bob]], col, '#365314', 2);
    // Hammer
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy + 30);
    ctx.lineTo(cx + 42, cy - 10 + bob);
    ctx.stroke();
    return true;
  }

  if (type === 'forge_automaton') {
    // หุ่นเหล็ก: Heavy iron machine
    const iron = hurt ? '#fca5a5' : '#475569';
    fillPoly([[cx - 34, cy - 15 + bob], [cx + 34, cy - 15 + bob], [cx + 38, cy + 55], [cx - 38, cy + 55]], iron, '#0f172a', 3);
    // Furnace Core
    drawCircle(cx, cy + 15 + bob, 12, '#ea580c', '#c2410c', 2);
    // Head block
    fillPoly([[cx - 20, cy - 52 + bob], [cx + 20, cy - 52 + bob], [cx + 20, cy - 22 + bob], [cx - 20, cy - 22 + bob]], iron, '#0f172a', 2.5);
    drawCircle(cx - 7, cy - 36 + bob, 3.5, '#ef4444');
    drawCircle(cx + 7, cy - 36 + bob, 3.5, '#ef4444');
    return true;
  }

  if (type === 'forge_bat') {
    // ค้างคาวไฟ: Flying fiery bat
    const bat = hurt ? '#fca5a5' : '#b91c1c';
    fillPoly([[cx - 10, cy + bob], [cx - 48, cy - 25 + bob], [cx - 35, cy + 20 + bob]], bat, '#450a0a', 2);
    fillPoly([[cx + 10, cy + bob], [cx + 48, cy - 25 + bob], [cx + 35, cy + 20 + bob]], bat, '#450a0a', 2);
    drawCircle(cx, cy + bob, 12, '#450a0a', '#b91c1c', 2);
    drawCircle(cx - 4, cy - 2 + bob, 2.5, '#facc15');
    drawCircle(cx + 4, cy - 2 + bob, 2.5, '#facc15');
    return true;
  }

  if (type === 'boss_blacksmith_giant') {
    // บอส: ยักษ์ช่างตีเหล็ก (Blacksmith Giant)
    const giant = hurt ? '#fca5a5' : '#c2410c';
    fillPoly([[cx - 52, cy - 15 + bob], [cx + 52, cy - 15 + bob], [cx + 45, cy + 68], [cx - 45, cy + 68]], '#78350f', '#09090b', 3);
    drawCircle(cx, cy - 42 + bob, 28, giant, '#09090b', 3);
    // Fiery Beard
    fillPoly([[cx - 25, cy - 30 + bob], [cx + 25, cy - 30 + bob], [cx, cy + 10 + bob]], '#ea580c');
    // Massive Anvil Sledgehammer
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx + 35, cy + 50);
    ctx.lineTo(cx + 65, cy - 40 + bob);
    ctx.stroke();
    return true;
  }

  if (type === 'boss_lava_dragon') {
    // บอสลับ: มังกรลาวา (Lava Dragon)
    const dragon = hurt ? '#fca5a5' : '#7f1d1d';
    fillPoly([[cx - 55, cy - 10 + bob], [cx + 55, cy - 10 + bob], [cx + 45, cy + 68], [cx - 45, cy + 68]], dragon, '#09090b', 3);
    // Dragon Horns & Snout
    fillPoly([[cx - 25, cy - 55 + bob], [cx - 60, cy - 85 + bob], [cx - 15, cy - 65 + bob]], '#ea580c');
    fillPoly([[cx + 25, cy - 55 + bob], [cx + 60, cy - 85 + bob], [cx + 15, cy - 65 + bob]], '#ea580c');
    drawCircle(cx, cy - 40 + bob, 26, dragon, '#09090b', 3);
    drawCircle(cx - 8, cy - 40 + bob, 5, '#facc15');
    drawCircle(cx + 8, cy - 40 + bob, 5, '#facc15');
    return true;
  }

  // --------------------------------------------------------------------------
  // 6. CLOUD PALACE (วังเมฆา)
  // --------------------------------------------------------------------------
  if (type === 'sky_crane') {
    // นกกระเรียนเวทย์: Mystic white crane
    const col = hurt ? '#fca5a5' : '#f8fafc';
    fillPoly([[cx - 15, cy + bob], [cx - 55, cy - 25 + bob], [cx - 35, cy + 30 + bob]], col, '#1e293b', 2);
    fillPoly([[cx + 15, cy + bob], [cx + 55, cy - 25 + bob], [cx + 35, cy + 30 + bob]], col, '#1e293b', 2);
    drawCircle(cx, cy - 22 + bob, 15, col, '#1e293b', 2);
    // Red Crown on head
    drawCircle(cx, cy - 32 + bob, 5, '#ef4444');
    return true;
  }

  if (type === 'sky_soldier') {
    // ทหารสวรรค์: Celestial guard in gold armor
    const gold = hurt ? '#fca5a5' : '#eab308';
    fillPoly([[cx - 26, cy - 10 + bob], [cx + 26, cy - 10 + bob], [cx + 22, cy + 55], [cx - 22, cy + 55]], gold, '#713f12', 2.5);
    drawCircle(cx, cy - 32 + bob, 18, gold, '#713f12', 2);
    // Halberd
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy + 45);
    ctx.lineTo(cx + 42, cy - 35 + bob);
    ctx.stroke();
    return true;
  }

  if (type === 'sky_shadow') {
    // เงา: Shadow phantom
    const shadow = hurt ? '#fca5a5' : '#1e1b4b';
    fillPoly([[cx - 28, cy - 15 + bob], [cx + 28, cy - 15 + bob], [cx + 22, cy + 50 + bob], [cx - 22, cy + 50 + bob]], shadow, '#4338ca', 2);
    drawCircle(cx, cy - 32 + bob, 18, shadow, '#4338ca', 2);
    drawCircle(cx - 6, cy - 32 + bob, 4, '#c084fc');
    drawCircle(cx + 6, cy - 32 + bob, 4, '#c084fc');
    return true;
  }

  if (type === 'boss_wind_goddess') {
    // บอส: เทพธิดาแห่งสายลม (Goddess of Wind)
    const gown = hurt ? '#fca5a5' : '#f8fafc';
    fillPoly([[cx - 45, cy - 15 + bob], [cx + 45, cy - 15 + bob], [cx + 52, cy + 68 + bob], [cx - 52, cy + 68 + bob]], gown, '#0284c7', 2.5);
    // Golden wings
    fillPoly([[cx - 30, cy - 25 + bob], [cx - 75, cy - 65 + bob], [cx - 55, cy + 20 + bob]], '#fbbf24', '#78350f', 2);
    fillPoly([[cx + 30, cy - 25 + bob], [cx + 75, cy - 65 + bob], [cx + 55, cy + 20 + bob]], '#fbbf24', '#78350f', 2);
    drawCircle(cx, cy - 40 + bob, 24, '#fed7aa', '#78350f', 2);
    drawCircle(cx - 8, cy - 40 + bob, 4.5, '#38bdf8');
    drawCircle(cx + 8, cy - 40 + bob, 4.5, '#38bdf8');
    return true;
  }

  if (type === 'boss_shadow_monarch') {
    // บอสลับ: ราชันย์เงา (Shadow Monarch)
    const voidCol = hurt ? '#fca5a5' : '#09090b';
    fillPoly([[cx - 48, cy - 15 + bob], [cx + 48, cy - 15 + bob], [cx + 42, cy + 68], [cx - 42, cy + 68]], voidCol, '#7c3aed', 3);
    drawCircle(cx, cy - 42 + bob, 26, voidCol, '#7c3aed', 3);
    // Void Crown
    fillPoly([[cx - 22, cy - 62 + bob], [cx - 32, cy - 92 + bob], [cx - 12, cy - 68 + bob]], '#a855f7');
    fillPoly([[cx + 22, cy - 62 + bob], [cx + 32, cy - 92 + bob], [cx + 12, cy - 68 + bob]], '#a855f7');
    fillPoly([[cx - 8, cy - 65 + bob], [cx, cy - 100 + bob], [cx + 8, cy - 65 + bob]], '#c084fc');
    // Glowing violet eyes
    drawCircle(cx - 9, cy - 42 + bob, 5, '#c084fc');
    drawCircle(cx + 9, cy - 42 + bob, 5, '#c084fc');
    return true;
  }

  return false;
}

/**
 * Generate Chest Texture based on Rarity (White, Blue, Gold, Themed)
 */
export function generateChestTexture(rarity: 'white' | 'blue' | 'gold' | 'themed'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const baseCol =
    rarity === 'gold' ? '#f59e0b' : rarity === 'blue' ? '#0284c7' : rarity === 'themed' ? '#a855f7' : '#94a3b8';
  const trimCol =
    rarity === 'gold' ? '#fef08a' : rarity === 'blue' ? '#38bdf8' : rarity === 'themed' ? '#f43f5e' : '#e2e8f0';

  // Chest body
  ctx.fillStyle = baseCol;
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(16, 48, 96, 64, 8);
  ctx.fill();
  ctx.stroke();

  // Chest lid
  ctx.fillStyle = trimCol;
  ctx.beginPath();
  ctx.roundRect(12, 28, 104, 28, [12, 12, 4, 4]);
  ctx.fill();
  ctx.stroke();

  // Keyhole lock
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(64, 66, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(60, 66, 8, 14);

  return createPixelCanvasTexture(canvas);
}

/**
 * Distorted Secret Wall Texture: Shimmering dimensional ripple with arcane runes
 */
export function generateDistortedWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Swirling dimensional vortex
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  grad.addColorStop(0, 'rgba(168, 85, 247, 0.95)');
  grad.addColorStop(0.4, 'rgba(56, 189, 248, 0.7)');
  grad.addColorStop(0.8, 'rgba(14, 165, 233, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Concentric ripple rings
  ctx.lineWidth = 3;
  [30, 55, 80, 105].forEach((r, i) => {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(192, 132, 252, 0.8)' : 'rgba(56, 189, 248, 0.8)';
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  return createPixelCanvasTexture(canvas);
}
