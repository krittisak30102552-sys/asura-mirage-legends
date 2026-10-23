// M1 combo 3 ท่า + เอฟเฟกต์การโจมตี (Canvas2D)
// ไม่พึ่งไลบรารี ใช้ต่อกับเกมเดิมผ่าน interface Owner / Target ด้านล่าง

export interface Vec2 { x: number; y: number }

export interface Stats {
  damage: number;            // ดาเมจพื้นฐาน
  attackSpeed: number;       // 1 = ปกติ, 1.2 = +20%
  critChance: number;        // 0..1
  critDamage: number;        // 1.5 = คริโดน +50%
  lifestealPct: number;      // 0..1
}

export interface Target {
  pos: Vec2;
  radius: number;
  alive: boolean;
  hit(damage: number, knockback: Vec2, isCrit: boolean): void;
}

export interface Owner {
  pos: Vec2;
  facing: 1 | -1;
  aim: Vec2;
  heroId?: 'ginzo' | 'quan' | 'katherine';
  stats: Stats;
  heal(amount: number): void;
  moveBy(dx: number, dy: number): void; // ใช้ตอนพุ่ง (ควรเช็กชนกำแพงในนี้)
}

export type CombatEvent =
  | { type: 'swing'; step: number }
  | { type: 'hit'; damage: number; crit: boolean; target: Target }
  | { type: 'combo_end' };

export type GhostRenderer = (ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1, alpha: number) => void;

// ---------- ค่าที่ปรับบาลานซ์ ----------
const deg = (d: number) => (d * Math.PI) / 180;

interface SwingDef {
  dmg: number; range: number; arc: number;
  windup: number; active: number; recovery: number; // วินาที (ก่อนหารด้วย attackSpeed)
  lunge: number; knock: number; hitstop: number;
}

const COMBO: SwingDef[] = [
  { dmg: 1.0, range: 70, arc: deg(100), windup: 0.05, active: 0.08, recovery: 0.18, lunge: 14, knock: 90,  hitstop: 0.04 },
  { dmg: 1.1, range: 75, arc: deg(110), windup: 0.05, active: 0.08, recovery: 0.20, lunge: 16, knock: 110, hitstop: 0.05 },
  { dmg: 1.8, range: 95, arc: deg(150), windup: 0.10, active: 0.10, recovery: 0.32, lunge: 30, knock: 260, hitstop: 0.09 }, // ท่าจบ
];
const COMBO_WINDOW = 0.45;   // เวลาที่ต่อคอมโบได้หลังจบท่า
const FINISH_COOLDOWN = 0.35; // คูลดาวน์ M1 หลังท่าจบ (ก่อนเริ่มคอมโบใหม่)
const INPUT_BUFFER = 0.25;   // กดล่วงหน้าได้
const CANCEL_AT = 0.6;       // กดซ้อนได้เมื่อ recovery ผ่านไป 60%

// ---------- ตัวช่วย ----------
const TAU = Math.PI * 2;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
function angDiff(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

// ---------- เอฟเฟกต์ ----------
interface Slash { x: number; y: number; a: number; arc: number; range: number; t: number; life: number; rgb: string; flip: 1 | -1; isCross?: boolean }
interface Spark { x: number; y: number; vx: number; vy: number; t: number; life: number; size: number; rgb: string }
interface Ghost { x: number; y: number; facing: 1 | -1; t: number; life: number; color?: string }
interface Ring { x: number; y: number; r: number; t: number; life: number; rgb: string }
interface Petal { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; t: number; life: number; color: string }

export class CombatFx {
  private slashes: Slash[] = [];
  private sparks: Spark[] = [];
  private ghosts: Ghost[] = [];
  private rings: Ring[] = [];
  private petals: Petal[] = [];
  private shakeT = 0;
  private shakeDur = 0.0001;
  private shakeMag = 0;

  slash(x: number, y: number, a: number, arc: number, range: number, rgb: string, life: number, flip: 1 | -1, isCross: boolean = false) {
    this.slashes.push({ x, y, a, arc, range, t: 0, life, rgb, flip, isCross });
  }
  burst(x: number, y: number, n: number, rgb: string) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * TAU;
      const sp = 120 + Math.random() * 220;
      this.sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, life: 0.25 + Math.random() * 0.2, size: 2 + Math.random() * 2, rgb });
    }
  }
  petalBurst(x: number, y: number, n: number, color: string = '244,114,182') {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * TAU;
      const sp = 40 + Math.random() * 110;
      this.petals.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 20,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 8,
        t: 0,
        life: 0.45 + Math.random() * 0.35,
        color,
      });
    }
  }
  ghost(x: number, y: number, facing: 1 | -1, life: number, color?: string) {
    this.ghosts.push({ x, y, facing, t: 0, life, color });
  }
  ring(x: number, y: number, r: number, rgb: string) { this.rings.push({ x, y, r, t: 0, life: 0.3, rgb }); }
  shake(mag: number, dur: number) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, dur); this.shakeDur = Math.max(this.shakeDur, dur); }

  /** เอาไปบวกกับตำแหน่งกล้องตอนวาด */
  shakeOffset(): Vec2 {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    const k = (this.shakeT / this.shakeDur) * this.shakeMag;
    return { x: (Math.random() * 2 - 1) * k, y: (Math.random() * 2 - 1) * k };
  }

  update(dt: number) {
    for (const s of this.slashes) s.t += dt;
    for (const p of this.sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; }
    for (const g of this.ghosts) g.t += dt;
    for (const r of this.rings) r.t += dt;
    for (const pt of this.petals) {
      pt.t += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 45 * dt; // gentle gravity
      pt.vx *= 0.94;
      pt.rot += pt.vrot * dt;
    }
    this.slashes = this.slashes.filter(s => s.t < s.life);
    this.sparks = this.sparks.filter(p => p.t < p.life);
    this.ghosts = this.ghosts.filter(g => g.t < g.life);
    this.rings = this.rings.filter(r => r.t < r.life);
    this.petals = this.petals.filter(pt => pt.t < pt.life);
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) { this.shakeMag = 0; this.shakeDur = 0.0001; } }
  }

  draw(ctx: CanvasRenderingContext2D, ghostRenderer?: GhostRenderer) {
    ctx.save();
    for (const g of this.ghosts) {
      const a = (1 - g.t / g.life) * 0.55;
      if (ghostRenderer) ghostRenderer(ctx, g.x, g.y, g.facing, a);
      else {
        ctx.globalAlpha = a;
        ctx.fillStyle = g.color || '#7fe3ff';
        ctx.fillRect(g.x - 10, g.y - 28, 20, 40);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';

    for (const s of this.slashes) {
      const p = s.t / s.life;
      const sweep = easeOut(Math.min(1, p * 1.6));
      const fade = 1 - p;
      const start = s.a - (s.arc / 2) * s.flip;
      const end = start + s.arc * sweep * s.flip;
      const ccw = s.flip === -1;
      const grad = ctx.createRadialGradient(s.x, s.y, s.range * 0.45, s.x, s.y, s.range);
      grad.addColorStop(0, `rgba(${s.rgb},0)`);
      grad.addColorStop(0.75, `rgba(${s.rgb},0.65)`);
      grad.addColorStop(1, 'rgba(255,255,255,0.95)');
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.range, start, end, ccw);
      ctx.arc(s.x, s.y, s.range * 0.55, end, start, !ccw);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // If cross slash (Combo 2 Rose Cross Rift), render the intersecting counter-angle slash
      if (s.isCross) {
        const cStart = s.a + (s.arc / 2) * s.flip;
        const cEnd = cStart - s.arc * sweep * s.flip;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.range * 0.85, cStart, cEnd, !ccw);
        ctx.arc(s.x, s.y, s.range * 0.45, cEnd, cStart, ccw);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    for (const r of this.rings) {
      const p = r.t / r.life;
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = `rgb(${r.rgb})`;
      ctx.lineWidth = 3.5 * (1 - p) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * easeOut(p), 0, TAU);
      ctx.stroke();
    }

    for (const p of this.sparks) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.strokeStyle = `rgb(${p.rgb})`;
      ctx.lineWidth = p.size * 0.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      ctx.stroke();
    }

    // Sakura petals for Ginzo / floral bursts
    for (const pt of this.petals) {
      const p = pt.t / pt.life;
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.fillStyle = `rgb(${pt.color})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

/** วงคูลดาวน์สำหรับ HUD: ratio 0 = พร้อมใช้, 1 = เพิ่งกด */
export function drawCooldownRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ratio: number, label: string) {
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  const ready = ratio <= 0;
  ctx.strokeStyle = ready ? '#7fe3ff' : '#ffb347';
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - ratio));
  ctx.stroke();
  ctx.fillStyle = ready ? '#ffffff' : 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

// ---------- ระบบต่อสู้หลัก ----------
type M1State = 'idle' | 'windup' | 'active' | 'recovery';
export class PlayerCombat {
  readonly fx = new CombatFx();

  private m1: M1State = 'idle';
  private step = 0;           // index ของท่าที่กำลังตี (หรือท่าถัดไปตอน idle)
  private t = 0;
  private comboT = 0;
  private m1Cd = 0;
  private bufferT = 0;
  private hitSet = new Set<Target>();
  private flip: 1 | -1 = 1;

  private hitstop = 0;

  constructor(private owner: Owner, private onEvent?: (e: CombatEvent) => void) {}

  // ----- ให้เกมเรียก -----
  pressM1() { this.bufferT = INPUT_BUFFER; }

  get isAttacking(): boolean { return this.m1 !== 'idle'; }
  get comboStep(): number { return this.m1 !== 'idle' ? this.step + 1 : this.comboT > 0 ? this.step : 0; }
  get comboWindowLeft(): number { return this.comboT; }
  update(dt: number, targets: Target[]) {
    this.fx.update(dt);
    if (this.hitstop > 0) { this.hitstop -= dt; return; } // หยุดเฟรมสั้นๆ ให้หนักมือ

    this.m1Cd = Math.max(0, this.m1Cd - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    this.bufferT = Math.max(0, this.bufferT - dt);
    this.updateM1(dt, targets);
  }

  // ----- M1 -----
  private startSwing() {
    if (this.comboT <= 0) this.step = 0;
    this.m1 = 'windup'; this.t = 0; this.bufferT = 0; this.comboT = 0;
    this.flip = this.flip === 1 ? -1 : 1;
    this.emit({ type: 'swing', step: this.step });
  }

  private endSwing() {
    const spd = this.owner.stats.attackSpeed;
    this.m1 = 'idle'; this.t = 0;
    if (this.step === COMBO.length - 1) {
      this.step = 0; this.comboT = 0;
      this.m1Cd = FINISH_COOLDOWN / spd;
      this.emit({ type: 'combo_end' });
    } else {
      this.step++;
      this.comboT = COMBO_WINDOW;
    }
  }

  private updateM1(dt: number, targets: Target[]) {
    const def = COMBO[this.step];
    const spd = this.owner.stats.attackSpeed;
    const sdt = dt * spd;
    switch (this.m1) {
      case 'idle':
        if (this.bufferT > 0 && this.m1Cd <= 0) this.startSwing();
        break;
      case 'windup':
        this.t += sdt;
        if (this.t >= def.windup) {
          this.m1 = 'active'; this.t = 0; this.hitSet.clear();
          const o = this.owner;
          const hero = o.heroId || 'ginzo';
          const heavy = this.step === COMBO.length - 1;
          const aimAngle = Math.atan2(o.aim.y, o.aim.x);

          if (hero === 'ginzo') {
            if (this.step === 0) {
              // Combo 1: Silver Moon — silver crescent + pink ghost after-image
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc, def.range, '241,245,249', 0.22, this.flip);
              this.fx.ghost(o.pos.x - Math.cos(aimAngle) * 12, o.pos.y - Math.sin(aimAngle) * 12, o.facing, 0.25, '#fb7185');
            } else if (this.step === 1) {
              // Combo 2: Rose Cross Rift — dual intersecting rose cross slashes
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc * 1.1, def.range, '244,63,94', 0.24, this.flip, true);
              this.fx.petalBurst(o.pos.x, o.pos.y, 4, '251,113,133');
            } else {
              // Combo 3: Abyssal Crescent — deep dimensional crescent + sakura explosion
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc * 1.25, def.range * 1.15, '236,72,153', 0.32, this.flip);
              this.fx.petalBurst(o.pos.x, o.pos.y, 14, '244,114,182');
              this.fx.ring(o.pos.x, o.pos.y, 35, '244,114,182');
            }
          } else if (hero === 'quan') {
            if (this.step === 0) {
              // Combo 1: Jade Pulse — cyan/gold fist shockwave
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc * 0.9, def.range * 0.9, '56,189,248', 0.2, this.flip);
              this.fx.ring(o.pos.x, o.pos.y, 24, '250,204,21');
            } else if (this.step === 1) {
              // Combo 2: Azure Dragon Orbit — circular swirl ring around player
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc * 1.2, def.range, '34,211,238', 0.24, this.flip);
              this.fx.ring(o.pos.x, o.pos.y, 38, '34,211,238');
            } else {
              // Combo 3: Sky-Rising Dragon — golden energy burst + expanding ring
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc * 1.35, def.range * 1.2, '251,191,36', 0.34, this.flip);
              this.fx.ring(o.pos.x, o.pos.y, 50, '251,191,36');
              this.fx.burst(o.pos.x, o.pos.y, 12, '253,224,71');
            }
          } else if (hero === 'katherine') {
            if (this.step === 0) {
              // Combo 1: Frost Shard — crystalline ice projectile trail
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc * 0.75, def.range * 1.1, '125,211,252', 0.22, this.flip);
              this.fx.burst(o.pos.x, o.pos.y, 6, '224,242,254');
            } else if (this.step === 1) {
              // Combo 2: Storm Relay — branching electric storm discharge
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc, def.range * 1.1, '167,139,250', 0.24, this.flip);
              this.fx.burst(o.pos.x, o.pos.y, 10, '147,197,253');
            } else {
              // Combo 3: Astral Convergence — crystal flare & violet thunder burst
              this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc * 1.4, def.range * 1.25, '192,132,252', 0.34, this.flip);
              this.fx.ring(o.pos.x, o.pos.y, 45, '192,132,252');
              this.fx.burst(o.pos.x, o.pos.y, 16, '244,114,182');
            }
          } else {
            this.fx.slash(o.pos.x, o.pos.y, aimAngle, def.arc, def.range, heavy ? '255,190,90' : '255,255,255', heavy ? 0.28 : 0.18, this.flip);
          }
        }
        break;
      case 'active':
        this.t += sdt;
        const aim = this.owner.aim;
        this.owner.moveBy(aim.x * def.lunge * (sdt / def.active), aim.y * def.lunge * (sdt / def.active));
        this.sweep(def, targets);
        if (this.t >= def.active) { this.m1 = 'recovery'; this.t = 0; }
        break;
      case 'recovery':
        this.t += sdt;
        if (this.bufferT > 0 && this.step < COMBO.length - 1 && this.t >= def.recovery * CANCEL_AT) {
          this.endSwing(); this.startSwing(); // ต่อคอมโบลื่นๆ
        } else if (this.t >= def.recovery) {
          this.endSwing();
        }
        break;
    }
  }

  private sweep(def: SwingDef, targets: Target[]) {
    const o = this.owner;
    const base = Math.atan2(o.aim.y, o.aim.x);
    for (const tg of targets) {
      if (!tg.alive || this.hitSet.has(tg)) continue;
      const dx = tg.pos.x - o.pos.x, dy = tg.pos.y - o.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > def.range + tg.radius) continue;
      if (dist > tg.radius && angDiff(Math.atan2(dy, dx), base) > def.arc / 2) continue;
      this.hitSet.add(tg);
      this.applyHit(tg, def.dmg, def.knock, def.hitstop, this.step === COMBO.length - 1);
    }
  }

  // ----- ดาเมจรวม -----
  private applyHit(tg: Target, mult: number, knock: number, hitstop: number, heavy: boolean) {
    const s = this.owner.stats;
    const crit = Math.random() < s.critChance;
    const dmg = Math.round(s.damage * mult * (crit ? s.critDamage : 1));
    const dx = tg.pos.x - this.owner.pos.x, dy = tg.pos.y - this.owner.pos.y;
    const len = Math.hypot(dx, dy) || 1;
    tg.hit(dmg, { x: (dx / len) * knock, y: (dy / len) * knock }, crit);
    if (s.lifestealPct > 0) this.owner.heal(dmg * s.lifestealPct);
    this.hitstop = Math.max(this.hitstop, hitstop);
    this.fx.burst(tg.pos.x, tg.pos.y, crit ? 14 : 8, crit ? '255,211,107' : '255,255,255');
    if (heavy || crit) this.fx.shake(heavy ? 6 : 3, 0.12);
    this.emit({ type: 'hit', damage: dmg, crit, target: tg });
  }

  private emit(e: CombatEvent) { this.onEvent?.(e); }
}
