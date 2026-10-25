/**
 * Enhanced Combat & Lobby Engine for Mirage Legends
 * Supports:
 * - 6 Core Combat Stats: Health, Armor, Damage, Critical Rate, Attack Speed, Movement Speed
 * - 10 Official Wiki Areas and Bosses: Valentine, Tengu, Muno Wonda, Dr. Universelove, Iblis, Logan, Chen, Kraken, Navy and Louis, Asurendra
 * - Status Effects: Burn (fire DoT), Freeze (ice immobilize), Poison (DoT + slow), Stun (stars interrupt), Slow
 * - Combo system (Step 1, Step 2, Step 3 Finisher with knockback)
 * - Dodge roll repositioning with i-frames and relic shockwaves
 * - Relic acquisition on room clears (Roguelike choice cards)
 * - Random Dungeon Expedition vs Direct Area Selection
 */

import * as THREE from 'three';
import {
  PlayerStats,
  RelicItem,
  DamageNumberItem,
  Projectile,
  GroundItem,
  BreakableProp,
  HeroAnimationState,
  HeroId,
  DungeonMapId,
  WeaponItem,
  EnemyType,
  StatusType,
  ActiveStatus,
  DifficultyMode,
  DungeonRoomId,
  StatUpgradeType,
  DungeonInteractableType,
  EquipmentItem,
  EquipmentPerk,
  EquipmentPerkType,
  MAX_EQUIPPED_ITEMS,
  DungeonRoomType,
} from '../types/game';
import {
  levelSystem,
  StageRoomType,
  BiomeDetails,
  ShopOfferItem,
  RoomDirection,
} from './levelSystem';
import {
  HERO_CONFIGS,
  usesAwakenedKit,
  getHeroSkills,
  INITIAL_WEAPONS,
  INITIAL_EQUIPMENT,
  DUNGEON_MAPS,
  ALL_RELICS,
  STAT_UPGRADES_CONFIG,
} from '../data/gameData';
import { ArenaScene } from '../three/arenaScene';
import { soundEngine } from '../audio/soundEngine';
import { hasEquipmentBonuses, rollEquipmentVariant } from './equipmentStats';
import {
  generateHeroTexture,
  generateEnemyTexture,
  generateNpcTexture,
  generateHappyTexture,
  generateKiBlastTexture,
  generateWhirlwindTexture,
  generateCoinTexture,
  generatePotionTexture,
  generateContactShadowTexture,
} from '../graphics/pixelSprites';
import {
  applyArmorMitigation,
  createStatusEffect,
  tickStatuses,
  aggregateRelicBonuses,
  DIFFICULTY_CONFIGS,
} from './combatRules';
import { PlayerCombat } from './combat';
import type { CombatEvent, Target as CombatTarget } from './combat';

export interface EnemyActor {
  id: number;
  type: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  maxHp: number;
  hp: number;
  speed: number;
  damage: number;
  state: 'chase' | 'windup' | 'skill_windup' | 'skill_release' | 'attack' | 'recover' | 'hurt' | 'dead';
  stateTimer: number;
  facing: number;
  mesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  hpBarGroup: THREE.Group;
  hpBarFill: THREE.Mesh;
  attackCooldown: number;
  targetX: number;
  targetZ: number;
  animFrame: number;
  animTimer: number;
  statuses: ActiveStatus[];
  isBoss?: boolean;
  bossName?: string;
  hasSummonedMinions?: boolean;
  isPhase2?: boolean;
  isHappyBoss?: boolean;
  lastHitDamage?: number;
  happyAttackCount?: number;
  happyTelegraphPoints?: Array<{ x: number; z: number }>;
  bossActionName?: string;
  hpBarWidth?: number;
  bossAttackType?: 'smash' | 'dash' | 'happy_wave' | 'happy_coin_rain';
  skillCooldown?: number;
  skillKind?: 'bolt' | 'slam' | 'volley';
  skillTargetX?: number;
  skillTargetZ?: number;
  skillColor?: number;
}

type LegacyDungeonMapId = Exclude<DungeonMapId, 'bamboo' | 'crypt' | 'ice' | 'forge' | 'sky' | 'test_dungeon'>;

const BIOME_ENEMIES: Record<
  LegacyDungeonMapId,
  { mobA: string; mobB: string; boss: string; bossHp: number; bossDmg: number; bossName: string }
> = {
  undead: { mobA: 'undead_skeleton', mobB: 'undead_ghoul', boss: 'boss_valentine', bossHp: 350, bossDmg: 14, bossName: 'Valentine' },
  japan: { mobA: 'japan_ronin', mobB: 'japan_archer', boss: 'boss_tengu', bossHp: 370, bossDmg: 15, bossName: 'Tengu' },
  elfland: { mobA: 'elf_wisp', mobB: 'elf_treant', boss: 'boss_muno_wonda', bossHp: 380, bossDmg: 15, bossName: 'Muno Wonda' },
  stronghold: { mobA: 'stronghold_drone', mobB: 'stronghold_cyborg', boss: 'boss_dr_universelove', bossHp: 400, bossDmg: 16, bossName: 'Dr. Universelove' },
  desert: { mobA: 'desert_genie', mobB: 'desert_assassin', boss: 'boss_iblis', bossHp: 410, bossDmg: 16, bossName: 'Iblis' },
  wild_west: { mobA: 'west_outlaw', mobB: 'west_gunslinger', boss: 'boss_logan', bossHp: 390, bossDmg: 17, bossName: 'Logan' },
  china: { mobA: 'china_monk', mobB: 'china_spearman', boss: 'boss_chen', bossHp: 420, bossDmg: 17, bossName: 'Chen' },
  norse: { mobA: 'norse_berserker', mobB: 'norse_frostmage', boss: 'boss_kraken', bossHp: 430, bossDmg: 16, bossName: 'Kraken' },
  imperium: { mobA: 'imperium_crusader', mobB: 'imperium_inquisitor', boss: 'boss_navy_louis', bossHp: 440, bossDmg: 18, bossName: 'Navy & Louis' },
  mirage: { mobA: 'mirage_phantom', mobB: 'mirage_sentinel', boss: 'boss_asurendra', bossHp: 480, bossDmg: 20, bossName: 'Asurendra' },
};

export class CombatEngine {
  public arena: ArenaScene;

  // Engine Mode & Procedural Multi-Room Branching
  public currentMode: 'lobby' | 'dungeon' = 'lobby';
  public oneHitMode: boolean = false;
  public currentDungeonMap: DungeonMapId = 'desert';
  public currentRoom: DungeonRoomId = 'center';
  public currentRoomType: DungeonRoomType = 'combat';
  public dungeonRoomDepth: number = 1;
  public maxDungeonRooms: number = 8;
  public doorOptions: { north: DungeonRoomType; west: DungeonRoomType; east: DungeonRoomType } = {
    north: 'combat',
    west: 'equipment_shop',
    east: 'equipment_shop',
  };

  public difficulty: DifficultyMode = 'normal';
  public isRandomExpedition: boolean = false;
  public expeditionSequence: DungeonMapId[] = [];
  public expeditionIndex: number = 0;

  // Level & Biome System (levels.json)
  public isLevelRun: boolean = true;
  public totalRoomWaves: number = 2;
  public currentRoomWave: number = 1;
  public lastNonSecretRoomType: StageRoomType = 'combat';
  public lastOpenedChestReward: any = null;

  // Hero & Inventory
  public activeHeroId: HeroId = 'ginzo';
  public isGinzoEvolved: boolean = false;
  public weapons: WeaponItem[] = [INITIAL_WEAPONS.find((weapon) => weapon.id === 'training_katana') || INITIAL_WEAPONS[0]];
  public equippedWeaponId: string = 'training_katana';

  // Room Altar / Stat Device temporary run upgrades
  public statAltarBonuses = {
    hp: 0,
    shield: 0,
    attack: 0,
    attackSpeed: 0,
    moveSpeed: 0,
    crit: 0,
  };
  public statUpgradeCounts: Record<StatUpgradeType, number> = {
    hp: 0,
    shield: 0,
    attack: 0,
    attackSpeed: 0,
    moveSpeed: 0,
    crit: 0,
  };

  // 6 Primary Combat Stats (Scaled for 10-20 damage range)
  public playerStats: PlayerStats = {
    heroId: 'ginzo',
    maxHp: 95,
    hp: 95,
    maxShield: 40,
    shield: 40,
    attackPower: 12,
    defense: 5,
    attackSpeed: 1.3,
    moveSpeed: 8.2,
    critChance: 0.35,
    critMultiplier: 1.8,
    damageReduction: 0,
    dodgeChance: 0,
    hpRegen: 0,
    lifesteal: 0,
    cooldownReduction: 0,
    coinGain: 0,
    chestLuck: 0,
    gold: 150,
    kills: 0,
    comboCount: 0,
    comboTimer: 0,
    equippedWeaponId: 'training_katana',
    equippedItems: [],
    inventory: [],
  };

  public playerX: number = 0;
  public playerZ: number = 2;
  public playerVx: number = 0;
  public playerVz: number = 0;
  public playerFacing: number = 1;
  public playerAimAngle: number = 0;
  public mouseWorldX: number = 0;
  public mouseWorldZ: number = 0;

  public animState: HeroAnimationState = 'idle';
  public animFrame: number = 0;
  public animTimer: number = 0;
  // Freeze the exact direction for the duration of a swing/cast so the body pose,
  // weapon direction and world-space VFX cannot drift apart if the mouse moves.
  public heroActionAimAngle: number = 0;
  public heroActionFacing: number = 1;
  private actionAnimationTimer: number = 0;
  private actionAnimationDuration: number = 0;
  // Smoothed procedural body motion (squash/stretch, lean, lunge) layered over the pose drawings.
  private heroVisual = { bobY: 0, tilt: 0, sy: 1, sx: 1, lunge: 0 };
  private actionAnimationState: HeroAnimationState | null = null;

  // Combo system
  public comboStep: number = 0;
  public comboWindowTimer: number = 0;
  public isAttacking: boolean = false;
  public attackTimer: number = 0;
  public playerCombat!: PlayerCombat;
  private combatTargets = new WeakMap<object, CombatTarget>();
  public skillCooldowns: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  /** Debug command toggle: allow active skills to be cast without cooldowns. */
  public noSkillCooldown: boolean = false;
  public ginzoUltimateFlashTimer: number = 0;
  public ginzoUltimateTimer: number = 0;
  public ginzoUltimatePath: { startX: number; startZ: number; endX: number; endZ: number } | null = null;
  private ginzoUltimateSequence: {
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    angle: number;
    rawDamage: number;
    elapsed: number;
    hits: number;
    dashed: boolean;
  } | null = null;

  // Dash & Dodge
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  private dashTrailTimer: number = 0;
  public dashCooldown: number = 0;
  public dashMaxCooldown: number = 1.0;
  public isInvulnerable: boolean = false;
  public invulnerableTimer: number = 0;
  public shieldRechargeDelay: number = 0;
  private temporaryAttackSpeedBonus = 0;
  private temporaryAttackSpeedTimer = 0;
  private temporaryGuardShield = 0;
  private temporaryGuardShieldTimer = 0;
  private temporaryDamageReduction = 0;
  private temporaryDamageReductionTimer = 0;
  private critSpeedStacks = 0;
  private critSpeedTimer = 0;
  private lowHpShieldUsedRoomKey: string | null = null;
  private coffinReviveUsedSceneKey: string | null = null;
  private fullHpDamageLockoutTimer = 0;

  // Entities & Relics
  public enemies: EnemyActor[] = [];
  public projectiles: Projectile[] = [];
  public damageNumbers: DamageNumberItem[] = [];
  public groundItems: GroundItem[] = [];
  public relics: RelicItem[] = [];
  public relicChoices: RelicItem[] = [];
  public breakables: BreakableProp[] = [];

  // The lounge has a hero trainer and dungeon gate, but no equipment shop.
  private trainerNpcMesh: THREE.Mesh | null = null;
  public nearbyInteractable: 'trainer' | 'gate' | null = null;
  public nearbyDungeonInteractable: DungeonInteractableType | null = null;
  public nearbyShopItemIndex: number | null = null;
  private hasAutoTriggeredGate: boolean = false;

  // Targeting lock
  public lockedTarget: EnemyActor | null = null;

  // Stage tracking (20 Waves)
  public currentWave: number = 1;
  public maxWaves: number = 20;
  public waveState: 'spawning' | 'fighting' | 'cleared' = 'spawning';
  public currentBoss: EnemyActor | null = null;
  private bossSummonedForRoom = false;
  private pendingBossStageTransition = false;
  private bossStageTransitionTimer = 0;
  private stageAdvanceTransitionTimer = 0;
  private bossIntroTimer = 0;
  private bossIntroDuration = 2.6;

  // Three.js Meshes
  private heroMesh!: THREE.Mesh;
  private heroShadowMesh!: THREE.Mesh;
  private aimCursorMesh!: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private ghostTrails: { mesh: THREE.Mesh; opacity: number }[] = [];
  private hitstopTimer: number = 0;

  // Textures Cache
  private contactShadowTex!: THREE.CanvasTexture;
  private kiBlastTex!: THREE.CanvasTexture;
  private whirlwindTex!: THREE.CanvasTexture;
  private coinTex!: THREE.CanvasTexture;
  private potionTex!: THREE.CanvasTexture;

  // Callbacks
  public onStateChange?: () => void;
  public onGameOver?: (won: boolean) => void;
  public onBossIntro?: (name: string) => void;
  public onCinematicTransition?: (title: string, subtitle: string, duration?: number) => void;
  public onOpenModal?: (
    modal:
      | 'blacksmith'
      | 'trainer'
      | 'gate'
      | 'relic_choice'
      | 'stat_device'
      | 'equipment_shop'
      | 'inventory'
      | 'happy_dialogue'
      | 'forge'
      | 'chest_reward'
      | 'shop_item_detail'
  ) => void;

  constructor(arena: ArenaScene) {
    this.arena = arena;
    this.initTextures();
    this.recalcHeroStats();
    this.initHero();
    this.initAimCursor();
    const thisEngine = this;
    this.playerCombat = new PlayerCombat({
      get pos() { return { x: thisEngine.playerX * 32, y: thisEngine.playerZ * 32 }; },
      get facing() { return thisEngine.playerFacing < 0 ? -1 : 1; },
      get aim() { return { x: Math.cos(thisEngine.playerAimAngle), y: Math.sin(thisEngine.playerAimAngle) }; },
      get heroId() { return thisEngine.activeHeroId; },
      get stats() {
        const weapon = thisEngine.weapons.find((item) => item.id === thisEngine.equippedWeaponId);
        const difficulty = DIFFICULTY_CONFIGS[thisEngine.difficulty] || DIFFICULTY_CONFIGS.normal;
        return {
          damage: (thisEngine.playerStats.attackPower + (weapon?.attackBonus ?? 0)) * difficulty.playerDmgMultiplier,
          attackSpeed: Math.max(0.1, thisEngine.getEffectiveAttackSpeed()),
          critChance: THREE.MathUtils.clamp(thisEngine.playerStats.critChance, 0, 0.75),
          critDamage: thisEngine.playerStats.critMultiplier,
          lifestealPct: 0,
        };
      },
      heal: () => undefined,
      moveBy: (dx, dy) => {
        const inset = thisEngine.currentMode === 'dungeon' ? 1 : 0;
        thisEngine.playerX = THREE.MathUtils.clamp(thisEngine.playerX + dx / 32, thisEngine.arena.bounds.minX + inset, thisEngine.arena.bounds.maxX - inset);
        thisEngine.playerZ = THREE.MathUtils.clamp(thisEngine.playerZ + dy / 32, thisEngine.arena.bounds.minZ + inset, thisEngine.arena.bounds.maxZ - inset);
      },
    }, (event) => this.handlePlayerCombatEvent(event));
    this.enterLobby();
  }

  private initTextures() {
    this.contactShadowTex = generateContactShadowTexture();
    this.kiBlastTex = generateKiBlastTexture();
    this.whirlwindTex = generateWhirlwindTexture();
    this.coinTex = generateCoinTexture();
    this.potionTex = generatePotionTexture();
  }

  public recalcHeroStats() {
    const baseHeroCfg = HERO_CONFIGS[this.activeHeroId] || HERO_CONFIGS.ginzo;
    const awakenedGinzo = this.activeHeroId === 'ginzo' && this.isGinzoEvolved;
    const heroCfg = awakenedGinzo
      ? {
          ...baseHeroCfg,
          maxHp: baseHeroCfg.maxHp + 15,
          maxShield: baseHeroCfg.maxShield + 15,
          attackPower: Math.round(baseHeroCfg.attackPower * 1.22),
          attackSpeed: Number((baseHeroCfg.attackSpeed * 1.12).toFixed(2)),
          moveSpeed: Number((baseHeroCfg.moveSpeed + 0.5).toFixed(2)),
          critChance: Math.min(0.75, baseHeroCfg.critChance + 0.08),
          critMultiplier: baseHeroCfg.critMultiplier + 0.2,
        }
      : baseHeroCfg;
    const weapon = this.weapons.find((w) => w.id === this.equippedWeaponId);

    const bonusAtk = weapon ? weapon.attackBonus : 0;
    const bonusCrit = weapon ? weapon.critBonus : 0;
    const bonusAtkSpd = weapon ? (weapon.attackSpeedBonus || 0) : 0;
    const relicBonus = aggregateRelicBonuses(this.relics.map((r) => r.id));

    // Calculate sum of equipped gear bonuses
    let gearHp = 0;
    let gearShield = 0;
    let gearAtk = 0;
    let gearDef = 0;
    let gearCrit = 0;
    let gearSpd = 0;
    let gearAtkSpd = 0;
    let gearDamagePercent = 0;
    let gearAttackSpeedPercent = 0;
    let gearCritDamagePercent = 0;
    let gearLifesteal = 0;
    let gearMaxHpPercent = 0;
    let gearDamageReduction = 0;
    let gearDodge = 0;
    let gearHpRegen = 0;
    let gearMoveSpeedPercent = 0;
    let gearCooldownReduction = 0;
    let gearCoinGain = 0;
    let gearChestLuck = 0;
    let hotWineRegenCopies = 0;

    for (const item of this.playerStats.equippedItems ?? []) {
      gearHp += item.bonusHp || 0;
      gearShield += item.bonusShield || 0;
      gearAtk += item.bonusAttack || 0;
      gearDef += item.bonusDefense || 0;
      gearCrit += item.bonusCritChance || 0;
      gearSpd += item.bonusMoveSpeed || 0;
      gearAtkSpd += item.bonusAttackSpeed || 0;
      gearDamagePercent += item.bonusDamagePercent || 0;
      gearAttackSpeedPercent += item.bonusAttackSpeedPercent || 0;
      gearCritDamagePercent += item.bonusCritDamagePercent || 0;
      gearLifesteal += item.bonusLifesteal || 0;
      gearMaxHpPercent += item.bonusMaxHpPercent || 0;
      gearDamageReduction += item.bonusDamageReduction || 0;
      gearDodge += item.bonusDodgeChance || 0;
      const itemTemplateId = item.templateId ?? item.id;
      if (itemTemplateId !== 'hot_wine_bottle' || hotWineRegenCopies < 2) {
        gearHpRegen += item.bonusHpRegen || 0;
        if (itemTemplateId === 'hot_wine_bottle') hotWineRegenCopies++;
      }
      gearMoveSpeedPercent += item.bonusMoveSpeedPercent || 0;
      gearCooldownReduction += item.bonusCooldownReduction || 0;
      gearCoinGain += item.bonusCoinGain || 0;
      gearChestLuck += item.bonusChestLuck || 0;
    }

    this.playerStats.heroId = this.activeHeroId;
    const rawMaxHp = heroCfg.maxHp + relicBonus.bonusHp + this.statAltarBonuses.hp + gearHp;
    this.playerStats.maxHp = Math.max(1, Math.round(rawMaxHp * (1 + gearMaxHpPercent)));
    this.playerStats.maxShield = Math.max(0, heroCfg.maxShield + relicBonus.bonusShield + this.statAltarBonuses.shield + gearShield);
    this.playerStats.attackPower = Number(
      ((heroCfg.attackPower + bonusAtk + relicBonus.bonusAttack + this.statAltarBonuses.attack + gearAtk) * (1 + gearDamagePercent)).toFixed(2)
    );
    this.playerStats.attackSpeed = Number(
      ((heroCfg.attackSpeed + bonusAtkSpd + relicBonus.bonusAttackSpeed + this.statAltarBonuses.attackSpeed + gearAtkSpd) * (1 + Math.min(0.75, gearAttackSpeedPercent))).toFixed(2)
    );
    this.playerStats.moveSpeed = Number(
      ((heroCfg.moveSpeed + relicBonus.bonusMoveSpeed + this.statAltarBonuses.moveSpeed + gearSpd) * (1 + Math.min(0.75, gearMoveSpeedPercent))).toFixed(2)
    );
    this.playerStats.critChance = Math.min(
      0.75,
      heroCfg.critChance + bonusCrit + relicBonus.bonusCritChance + this.statAltarBonuses.crit + gearCrit
    );
    this.playerStats.critMultiplier = heroCfg.critMultiplier + gearCritDamagePercent;
    this.playerStats.defense = 5 + gearDef;
    this.playerStats.damageReduction = Math.min(0.75, gearDamageReduction);
    this.playerStats.dodgeChance = Math.min(0.60, gearDodge);
    const hasGuardianCoffin = (this.playerStats.equippedItems ?? []).some(
      (item) => (item.templateId ?? item.id) === 'little_guardian_coffin'
    );
    this.playerStats.hpRegen = hasGuardianCoffin ? 0 : gearHpRegen;
    this.playerStats.lifesteal = Math.min(0.35, gearLifesteal);
    this.playerStats.cooldownReduction = Math.min(0.75, gearCooldownReduction);
    this.playerStats.coinGain = Math.min(1.0, gearCoinGain);
    this.playerStats.chestLuck = Math.min(0.5, gearChestLuck);
    this.playerStats.hp = Math.min(this.playerStats.hp, this.playerStats.maxHp);
    this.playerStats.shield = Math.min(this.playerStats.shield, this.playerStats.maxShield + 60);

  }

  private getEquippedPerks(type?: EquipmentPerkType): EquipmentPerk[] {
    return (this.playerStats.equippedItems ?? [])
      .map((item) => item.perk)
      .filter((perk): perk is EquipmentPerk => Boolean(perk && (!type || perk.type === type)));
  }

  private getEffectiveAttackSpeed(): number {
    return this.playerStats.attackSpeed * (1 + this.temporaryAttackSpeedBonus + this.critSpeedStacks * 0.02);
  }

  private getConditionalDamageMultiplier(): number {
    let bonus = 0;
    const hpRatio = this.playerStats.hp / Math.max(1, this.playerStats.maxHp);
    if (hpRatio < 0.3) {
      bonus += this.getEquippedPerks('low_hp_damage').reduce((sum, perk) => sum + perk.value, 0);
    }
    if (hpRatio >= 0.999 && this.fullHpDamageLockoutTimer <= 0) {
      bonus += this.getEquippedPerks('full_hp_damage').reduce((sum, perk) => sum + perk.value, 0);
    }
    return 1 + Math.min(0.75, bonus);
  }

  private applyEquipmentStatusOnHit(enemy: EnemyActor) {
    for (const perk of this.playerStats.equippedItems.map((item) => item.perk).filter((p): p is EquipmentPerk => Boolean(p?.status))) {
      if (Math.random() <= (perk.chance ?? 0.15)) {
        this.applyStatusEffect(enemy, perk.status!, perk.duration ?? 2, perk.value);
      }
    }
  }

  private handleEquipmentCritical() {
    const perks = this.getEquippedPerks('crit_haste');
    if (!perks.length) return;
    this.critSpeedStacks = Math.min(10, this.critSpeedStacks + perks.length);
    this.critSpeedTimer = Math.max(...perks.map((perk) => perk.duration ?? 4));
  }

  private triggerEquipmentKillEffects() {
    for (const perk of this.getEquippedPerks()) {
      if (perk.type === 'kill_heal') {
        const heal = Math.max(1, Math.round(this.playerStats.maxHp * perk.value));
        const before = this.playerStats.hp;
        this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + heal);
        if (this.playerStats.hp > before) this.spawnDamageNumber(this.playerX, 1.4, this.playerZ, this.playerStats.hp - before, false, false, true);
      } else if (perk.type === 'kill_gold') {
        const amount = Math.round(perk.value * (1 + this.playerStats.coinGain));
        this.playerStats.gold += amount;
      } else if (perk.type === 'kill_haste') {
        this.temporaryAttackSpeedBonus = Math.max(this.temporaryAttackSpeedBonus, perk.value);
        this.temporaryAttackSpeedTimer = Math.max(this.temporaryAttackSpeedTimer, perk.duration ?? 3);
      }
    }
  }

  private triggerEquipmentHitEffects() {
    for (const perk of this.getEquippedPerks()) {
      if (perk.type === 'hit_guard') {
        const shieldGain = Math.max(0, Math.min(perk.value, this.playerStats.maxShield + 60 - this.playerStats.shield));
        this.playerStats.shield += shieldGain;
        this.temporaryGuardShield = Math.min(60, this.temporaryGuardShield + shieldGain);
        this.temporaryGuardShieldTimer = Math.max(this.temporaryGuardShieldTimer, perk.duration ?? 3);
        if (shieldGain > 0) this.arena.spawnSkillBurst(this.playerX, 0.95, this.playerZ, 0x7dd3fc, 10, 2.8, 0.4);
      } else if (perk.type === 'hit_reduce') {
        this.temporaryDamageReduction = Math.max(this.temporaryDamageReduction, perk.value);
        this.temporaryDamageReductionTimer = Math.max(this.temporaryDamageReductionTimer, perk.duration ?? 3);
      } else if (perk.type === 'hit_push') {
        this.arena.spawnSkillBurst(this.playerX, 0.9, this.playerZ, 0x67e8f9, 14, 4.1, 0.38);
        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dx = enemy.x - this.playerX;
          const dz = enemy.z - this.playerZ;
          const distance = Math.hypot(dx, dz);
          if (distance > 0 && distance <= 4.5) {
            enemy.vx += (dx / distance) * perk.value;
            enemy.vz += (dz / distance) * perk.value;
          }
        }
      } else if (perk.type === 'full_hp_damage') {
        this.fullHpDamageLockoutTimer = Math.max(this.fullHpDamageLockoutTimer, perk.duration ?? 0);
      }
    }
  }

  private triggerEquipmentDodgeEffects() {
    const perks = this.getEquippedPerks('dodge_guard');
    let totalShieldGain = 0;
    let duration = 0;
    for (const perk of perks) {
      const shieldGain = Math.max(0, Math.min(perk.value, this.playerStats.maxShield + 60 - this.playerStats.shield));
      this.playerStats.shield += shieldGain;
      this.temporaryGuardShield = Math.min(60, this.temporaryGuardShield + shieldGain);
      totalShieldGain += shieldGain;
      duration = Math.max(duration, perk.duration ?? 3);
    }
    if (totalShieldGain > 0) {
      this.temporaryGuardShieldTimer = Math.max(this.temporaryGuardShieldTimer, duration);
      this.arena.spawnSkillBurst(this.playerX, 0.9, this.playerZ, 0x93c5fd, 12, 2.5, 0.42);
    }
  }

  private tryEquipmentCoffinRevive(): boolean {
    if (this.playerStats.hp > 0) return false;
    const perks = this.getEquippedPerks('revive_once');
    if (!perks.length) return false;

    const stage = levelSystem.run?.stage;
    const sceneKey = stage ? `stage:${stage.stageNumber}` : `wave:${this.currentWave}`;
    if (this.coffinReviveUsedSceneKey === sceneKey) return false;

    const revive = perks[0];
    this.coffinReviveUsedSceneKey = sceneKey;
    this.playerStats.hp = Math.max(1, Math.ceil(this.playerStats.maxHp * revive.value));
    this.isInvulnerable = true;
    this.invulnerableTimer = Math.max(this.invulnerableTimer, revive.duration ?? 2);
    this.arena.spawnSkillBurst(this.playerX, 1, this.playerZ, 0xa78bfa, 24, 4.2, 0.8);
    this.arena.addCameraShake(0.16);
    return true;
  }

  private triggerLowHealthShield() {
    if (this.playerStats.hp / Math.max(1, this.playerStats.maxHp) >= 0.3) return;
    const perks = this.getEquippedPerks('low_hp_shield');
    if (!perks.length) return;
    const stage = levelSystem.run?.stage;
    const roomKey = stage ? `${stage.stageNumber}:${stage.currentRoomIndex}` : `wave:${this.currentWave}`;
    if (this.lowHpShieldUsedRoomKey === roomKey) return;
    this.lowHpShieldUsedRoomKey = roomKey;
    const amount = perks.reduce((sum, perk) => sum + perk.value, 0);
    this.playerStats.shield = Math.min(this.playerStats.maxShield + 60, this.playerStats.shield + amount);
    this.arena.spawnSkillBurst(this.playerX, 0.9, this.playerZ, 0x60a5fa, 14, 2.2, 0.4);
  }

  private getCoinAmount(amount: number): number {
    return Math.max(1, Math.round(amount * (1 + this.playerStats.coinGain)));
  }

  public setHero(heroId: HeroId) {
    this.activeHeroId = heroId;
    this.recalcHeroStats();
    this.playerStats.hp = this.playerStats.maxHp;
    this.playerStats.shield = this.playerStats.maxShield;
    this.updateHeroTexture();
    if (this.onStateChange) this.onStateChange();
  }

  public setGinzoEvolved(enabled: boolean) {
    this.isGinzoEvolved = enabled;
    if (this.activeHeroId === 'ginzo') {
      this.recalcHeroStats();
      this.playerStats.hp = this.playerStats.maxHp;
      this.playerStats.shield = this.playerStats.maxShield;
      this.updateHeroTexture();
      if (enabled) {
        this.arena.spawnSkillBurst(this.playerX, 1.2, this.playerZ, 0xfbbf24, 26, 4.2, 0.85);
        this.arena.addCameraShake(0.24);
        soundEngine.playBossGong();
      } else {
        this.arena.spawnSkillBurst(this.playerX, 0.9, this.playerZ, 0xf1f5f9, 10, 2.3, 0.38);
      }
    }
    if (this.onStateChange) this.onStateChange();
  }

  public addRelic(relic: RelicItem) {
    this.relics.push(relic);
    this.recalcHeroStats();
    soundEngine.playCoin();
    if (this.onStateChange) this.onStateChange();
  }

  public equipItem(item: EquipmentItem, replaceItemId?: string): boolean {
    const equipped = this.playerStats.equippedItems;
    if (equipped.some((current) => current.id === item.id)) return true;

    const replaceIndex = replaceItemId ? equipped.findIndex((current) => current.id === replaceItemId) : -1;
    if (replaceItemId && replaceIndex < 0) return false;
    const templateId = item.templateId ?? item.id;
    if (templateId === 'hot_wine_bottle') {
      const otherWineCopies = equipped.filter((current, index) =>
        index !== replaceIndex && (current.templateId ?? current.id) === templateId
      ).length;
      if (otherWineCopies >= 2) return false;
    }

    const previousMaxShield = this.playerStats.maxShield;
    if (replaceItemId) {
      equipped[replaceIndex] = item;
    } else {
      if (equipped.length >= MAX_EQUIPPED_ITEMS) return false;
      equipped.push(item);
    }
    if (!this.playerStats.inventory.some((current) => current.id === item.id)) {
      this.playerStats.inventory.push(item);
    }
    soundEngine.playEquipItem();
    this.recalcHeroStats();
    this.applyEquipmentArmorIncrease(previousMaxShield);
    if (this.onStateChange) this.onStateChange();
    return true;
  }

  private applyEquipmentArmorIncrease(previousMaxShield: number) {
    const gainedArmor = Math.max(0, this.playerStats.maxShield - previousMaxShield);
    if (gainedArmor <= 0) return;
    this.playerStats.shield = Math.min(this.playerStats.maxShield + 60, this.playerStats.shield + gainedArmor);
  }

  public unequipItem(itemId: string) {
    this.playerStats.equippedItems = this.playerStats.equippedItems.filter((item) => item.id !== itemId);
    soundEngine.playEquipItem();
    this.recalcHeroStats();
    if (this.onStateChange) this.onStateChange();
  }

  public buyEquipment(item: EquipmentItem): boolean {
    const cost = item.cost ?? 50;
    if (this.playerStats.gold < cost) return false;
    const previousMaxShield = this.playerStats.maxShield;
    const templateId = item.templateId ?? item.id;
    const ownedItem = !item.templateId || item.id === templateId
      ? {
          ...rollEquipmentVariant(item),
          id: `${templateId}_owned_${Math.random().toString(36).slice(2, 9)}`,
          templateId,
        }
      : item;
    this.playerStats.gold -= cost;
    if (!this.playerStats.inventory.some((i) => i.id === ownedItem.id)) {
      this.playerStats.inventory.push(ownedItem);
    }
    const alreadyHasThisKind = this.playerStats.equippedItems.some(
      (current) => (current.templateId ?? current.id) === templateId
    );
    if (!alreadyHasThisKind && this.playerStats.equippedItems.length < MAX_EQUIPPED_ITEMS) {
      this.playerStats.equippedItems.push(ownedItem);
    }
    this.recalcHeroStats();
    this.applyEquipmentArmorIncrease(previousMaxShield);
    if (this.onStateChange) this.onStateChange();
    return true;
  }

  private initHero() {
    const geo = new THREE.PlaneGeometry(2.4, 2.8);
    const mat = new THREE.MeshBasicMaterial({
      map: generateHeroTexture(this.activeHeroId, 'idle', 0, this.isGinzoEvolved),
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    this.heroMesh = new THREE.Mesh(geo, mat);
    this.heroMesh.rotation.x = -0.58;
    this.heroMesh.position.set(this.playerX, 1.4, this.playerZ);
    this.arena.actorsGroup.add(this.heroMesh);

    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.1);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this.heroShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.heroShadowMesh.rotation.x = -Math.PI / 2;
    this.heroShadowMesh.position.set(this.playerX, 0.02, this.playerZ);
    this.arena.actorsGroup.add(this.heroShadowMesh);
  }

  private updateHeroTexture() {
    if (!this.heroMesh) return;
    const material = this.heroMesh.material as THREE.MeshBasicMaterial;
    const previousTexture = material.map;
    const isActionPose = this.animState.startsWith('attack');
    const nextTexture = generateHeroTexture(
      this.activeHeroId,
      this.animState,
      this.animFrame,
      this.isGinzoEvolved,
      isActionPose ? this.heroActionAimAngle : this.playerAimAngle,
      isActionPose ? this.heroActionFacing : this.playerFacing
    );
    material.map = nextTexture;
    material.needsUpdate = true;
    // Every animation pose is a freshly drawn canvas texture; dispose the previous
    // GPU texture so smoother animation does not gradually consume graphics memory.
    if (previousTexture && previousTexture !== nextTexture) previousTexture.dispose();
  }

  private beginDirectionalActionAnimation(slot: 1 | 2 | 3 | 4, angle: number, duration = 0.48) {
    this.heroActionAimAngle = angle;
    if (Math.abs(Math.cos(angle)) > 0.1) {
      this.heroActionFacing = Math.cos(angle) >= 0 ? 1 : -1;
    } else {
      this.heroActionFacing = this.playerFacing;
    }
    this.playerFacing = this.heroActionFacing;
    this.actionAnimationState = `attack${slot}` as HeroAnimationState;
    this.actionAnimationTimer = duration;
    this.actionAnimationDuration = duration;
    this.animState = this.actionAnimationState;
    this.animFrame = 0;
    this.animTimer = 0;
    this.updateHeroTexture();
  }

  private initAimCursor() {
    const ringGeo = new THREE.RingGeometry(0.35, 0.45, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.aimCursorMesh = new THREE.Mesh(ringGeo, ringMat);
    this.aimCursorMesh.rotation.x = -Math.PI / 2;
    this.aimCursorMesh.position.set(0, 0.03, 0);
    this.arena.vfxGroup.add(this.aimCursorMesh);
  }

  // ----------------------------------------------------------------------
  // LOBBY MODE
  // ----------------------------------------------------------------------
  public enterLobby() {
    this.currentMode = 'lobby';
    this.clearDungeonEntities();
    this.arena.loadTheme('lobby');

    this.playerX = 0;
    this.playerZ = 4;
    this.playerVx = 0;
    this.playerVz = 0;

    // Training dummies & urns
    this.breakables = [];
    this.arena.breakablesGroup.children.forEach((child) => {
      const gId = (child as any).gameId;
      if (gId) {
        this.breakables.push({
          id: gId,
          x: child.position.x,
          z: child.position.z,
          hp: 9999,
          type: 'urn',
          mesh: child as THREE.Mesh,
        });
      }
    });

    const trainer = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.8),
      new THREE.MeshBasicMaterial({ map: generateNpcTexture('trainer'), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide })
    );
    trainer.rotation.x = -0.58;
    trainer.position.set(8, 1.4, -4);
    this.arena.actorsGroup.add(trainer);
    this.trainerNpcMesh = trainer;

    // Reset temporary relics and stat altar bonuses on return to lobby
    this.relics = [];
    this.temporaryAttackSpeedBonus = 0;
    this.temporaryAttackSpeedTimer = 0;
    this.temporaryDamageReduction = 0;
    this.temporaryDamageReductionTimer = 0;
    this.critSpeedStacks = 0;
    this.critSpeedTimer = 0;
    this.temporaryGuardShield = 0;
    this.temporaryGuardShieldTimer = 0;
    this.lowHpShieldUsedRoomKey = null;
    this.coffinReviveUsedSceneKey = null;
    this.fullHpDamageLockoutTimer = 0;
    this.statAltarBonuses = {
      hp: 0,
      shield: 0,
      attack: 0,
      attackSpeed: 0,
      moveSpeed: 0,
      crit: 0,
    };
    this.statUpgradeCounts = {
      hp: 0,
      shield: 0,
      attack: 0,
      attackSpeed: 0,
      moveSpeed: 0,
      crit: 0,
    };
    this.currentRoom = 'center';
    this.currentWave = 1;
    this.waveState = 'cleared';
    this.equippedWeaponId = 'training_katana';
    this.playerStats.equippedWeaponId = 'training_katana';

    // Recalculate clean baseline stats
    this.recalcHeroStats();
    this.playerStats.hp = this.playerStats.maxHp;
    this.playerStats.shield = this.playerStats.maxShield;
    this.playerStats.comboCount = 0;
    this.playerStats.kills = 0;
    if (this.playerStats.gold < 120) {
      this.playerStats.gold = 120;
    }

    if (this.onStateChange) this.onStateChange();
  }

  public clearDungeonEntities() {
    for (const enemy of this.enemies) {
      if (enemy.hpBarGroup) {
        enemy.hpBarGroup.visible = false;
        this.arena.actorsGroup.remove(enemy.hpBarGroup);
      }
      if (enemy.mesh) this.arena.actorsGroup.remove(enemy.mesh);
      if (enemy.shadowMesh) this.arena.actorsGroup.remove(enemy.shadowMesh);
    }
    this.arena.actorsGroup.clear();
    this.arena.clearTransientVFX();
    this.arena.breakablesGroup.clear();
    this.trainerNpcMesh = null;
    this.enemies = [];
    this.projectiles = [];
    this.damageNumbers = [];
    this.groundItems = [];
    this.breakables = [];
    this.lockedTarget = null;
    this.currentBoss = null;
    this.initHero();
    this.initAimCursor();
  }

  public setDifficulty(mode: DifficultyMode) {
    this.difficulty = mode;
    if (this.onStateChange) this.onStateChange();
  }

  // ----------------------------------------------------------------------
  // ENTER DUNGEON (Supports Random Expedition or Direct Selection)
  // ----------------------------------------------------------------------
  public startRandomExpedition(difficulty?: DifficultyMode) {
    if (difficulty) this.difficulty = difficulty;
    this.startLevelRun(undefined, this.difficulty);
  }

  public enterDungeon(mapId?: DungeonMapId, difficulty?: DifficultyMode) {
    if (difficulty) this.difficulty = difficulty;
    this.startLevelRun(undefined, this.difficulty);
  }

  public startLevelRun(seed?: number, difficulty?: DifficultyMode) {
    if (difficulty) this.difficulty = difficulty;
    // Clear stale lobby interaction targets before entering the dungeon.
    this.nearbyInteractable = null;
    this.nearbyDungeonInteractable = null;
    this.nearbyShopItemIndex = null;
    this.currentMode = 'dungeon';
    this.isLevelRun = true;
    this.bossStageTransitionTimer = 0;
    this.stageAdvanceTransitionTimer = 0;
    this.pendingBossStageTransition = false;

    // Reset temporary relics and stat altar bonuses on starting fresh run
    this.relics = [];
    this.temporaryAttackSpeedBonus = 0;
    this.temporaryAttackSpeedTimer = 0;
    this.temporaryDamageReduction = 0;
    this.temporaryDamageReductionTimer = 0;
    this.critSpeedStacks = 0;
    this.critSpeedTimer = 0;
    this.temporaryGuardShield = 0;
    this.temporaryGuardShieldTimer = 0;
    this.lowHpShieldUsedRoomKey = null;
    this.coffinReviveUsedSceneKey = null;
    this.fullHpDamageLockoutTimer = 0;
    this.statAltarBonuses = {
      hp: 0,
      shield: 0,
      attack: 0,
      attackSpeed: 0,
      moveSpeed: 0,
      crit: 0,
    };
    this.statUpgradeCounts = {
      hp: 0,
      shield: 0,
      attack: 0,
      attackSpeed: 0,
      moveSpeed: 0,
      crit: 0,
    };
    this.recalcHeroStats();
    this.playerStats.hp = this.playerStats.maxHp;
    this.playerStats.shield = this.playerStats.maxShield;

    const run = levelSystem.startNewRun(seed);
    const firstBiome = levelSystem.getCurrentBiome();
    this.currentDungeonMap = firstBiome.id as any;

    this.loadLevelRoom('start');
    soundEngine.playRoomClear();
    if (this.onStateChange) this.onStateChange();
  }

  private getCurrentLevelChestState() {
    if (!levelSystem.run) return null;
    const stage = levelSystem.run.stage;
    const key = stage.isSecretRoomActive ? 'secret' : `room-${stage.currentRoomIndex}`;
    return (stage.chestStates[key] ??= { opened: false, rarity: null });
  }

  private spawnRoomRewardChest(defaultRarity?: 'white' | 'blue' | 'gold' | 'themed') {
    const chestState = this.getCurrentLevelChestState();
    if (!chestState || chestState.opened) return;
    chestState.rarity ??= defaultRarity ?? levelSystem.rollChestRarity(false, this.playerStats.chestLuck);
    this.arena.createChestProp(0, -1.5, chestState.rarity);
  }

  private chooseStatEquipmentForChest(rarity: 'white' | 'blue' | 'gold' | 'themed'): EquipmentItem {
    const statGear = INITIAL_EQUIPMENT.filter(hasEquipmentBonuses);
    const preferredRarities = rarity === 'white'
      ? ['common']
      : rarity === 'blue'
      ? ['rare']
      : ['legendary'];
    const preferred = statGear.filter((item) => preferredRarities.includes(item.rarity));
    const candidates = preferred.length > 0 ? preferred : statGear;
    const run = levelSystem.run;
    const chosen = run ? run.rng.choice(candidates) : candidates[Math.floor(Math.random() * candidates.length)];
    const uniqueId = run ? run.rng.next().toString(36).slice(2) : Math.random().toString(36).slice(2);
    return {
      ...rollEquipmentVariant(chosen, () => run?.rng.next() ?? Math.random()),
      id: `${chosen.id}_drop_${uniqueId}`,
      templateId: chosen.id,
      cost: 0,
    };
  }

  public loadLevelRoom(roomType: StageRoomType) {
    if (!levelSystem.run) {
      levelSystem.startNewRun();
    }
    const run = levelSystem.run!;
    const stage = run.stage;
    const enteringBossArena = roomType === 'boss' && this.pendingBossStageTransition;
    this.bossIntroTimer = 0;
    this.bossStageTransitionTimer = 0;
    this.bossSummonedForRoom = false;
    this.lowHpShieldUsedRoomKey = null;
    const currentBiome = levelSystem.getCurrentBiome();
    this.currentDungeonMap = currentBiome.id as any;
    this.currentRoomType = roomType as any;
    const wasRoomCleared = stage.clearedRoomIndices.includes(stage.currentRoomIndex);

    stage.isSecretRoomActive = false;
    stage.hasSecretWallInCurrentRoom = false;
    this.waveState = !wasRoomCleared && (roomType === 'combat' || roomType === 'elite' || roomType === 'boss')
      ? 'fighting'
      : 'cleared';
    const shopOffers = roomType === 'shop' ? levelSystem.getShopOffersForRoom(stage.currentRoomIndex) : [];

    this.clearDungeonEntities();
    this.arena.removeHappyVendor();
    // The altar sends the player directly into the boss realm, so hide the unusable
    // route arches there and in the boss arena itself.
    const hideBossEncounterRoutes = roomType === 'altar' || roomType === 'boss' || enteringBossArena;
    this.arena.loadRoom(
      enteringBossArena ? 'boss_arena' : roomType as any,
      this.currentDungeonMap,
      hideBossEncounterRoutes ? undefined : this.getDoorLabels()
    );
    this.nearbyDungeonInteractable = null;
    this.nearbyShopItemIndex = null;
    if (roomType === 'shop' && !stage.happyProvokedRoomIndices.includes(stage.currentRoomIndex)) {
      this.arena.createHappyVendor(shopOffers);
    }

    // Player position
    const spawnByEntry: Record<RoomDirection, { x: number; z: number }> = {
      north: { x: 0, z: -6.0 },
      east: { x: 12.5, z: 0 },
      south: { x: 0, z: 5.2 },
      west: { x: -12.5, z: 0 },
    };
    const spawn = enteringBossArena ? { x: 0, z: 5.2 } : stage.entrySide ? spawnByEntry[stage.entrySide] : { x: 0, z: 5.2 };
    this.playerX = spawn.x;
    this.playerZ = spawn.z;
    this.playerVx = 0;
    this.playerVz = 0;
    stage.entrySide = null;

    // Room logic
    if (roomType === 'start') {
      this.waveState = 'cleared';
      this.arena.setPortalActive(false);
      this.initBreakables();
    } else if (roomType === 'combat' || roomType === 'elite') {
      if (!wasRoomCleared) {
        this.waveState = 'fighting';
        this.totalRoomWaves = levelSystem.getEnemyWaveCount(roomType);
        this.currentRoomWave = 1;
        this.spawnLevelCombatWave(1, roomType === 'elite');
      } else {
        this.spawnRoomRewardChest();
      }
      this.initBreakables();
    } else if (roomType === 'shop') {
      this.waveState = 'cleared';
    } else if (roomType === 'chest') {
      this.waveState = 'cleared';
      this.spawnRoomRewardChest();
    } else if (roomType === 'boss') {
      if (!wasRoomCleared) {
        this.waveState = 'fighting';
        this.currentRoomWave = 0;
        if (this.pendingBossStageTransition) {
          this.pendingBossStageTransition = false;
          this.spawnLevelBossAtCurrentAltar();
        }
      } else {
        this.spawnRoomRewardChest('gold');
      }
    } else if (roomType === 'exit') {
      this.waveState = 'cleared';
      this.arena.setPortalActive(true);
    }

    if (roomType !== 'exit') this.arena.setPortalActive(false);

    if (this.onStateChange) this.onStateChange();
  }

  public spawnLevelCombatWave(waveNum: number, isElite: boolean) {
    if (!levelSystem.run) return;
    const run = levelSystem.run;
    const biome = levelSystem.getCurrentBiome();
    const stageId = run.stage.stageId;
    const hpMult = run.hpMultiplier;

    this.currentRoomWave = waveNum;
    this.waveState = 'fighting';
    this.arena.setPortalActive(false);

    const count = levelSystem.getEnemyCountPerWave(stageId, this.difficulty);
    const spawnPositions = [
      { x: -7, z: -5 },
      { x: 7, z: -5 },
      { x: -5, z: 1 },
      { x: 5, z: 1 },
      { x: 0, z: -6 },
      { x: -8, z: 2 },
      { x: 8, z: 2 },
    ];

    for (let i = 0; i < count; i++) {
      const pos = spawnPositions[i % spawnPositions.length];
      const jitterX = pos.x + (Math.random() - 0.5) * 1.5;
      const jitterZ = pos.z + (Math.random() - 0.5) * 1.5;
      const isEliteEnemy = isElite && i === 0;
      const mobType = isEliteEnemy ? biome.mobElite : i % 2 === 0 ? biome.mobA : biome.mobB;
      if (isEliteEnemy) {
        soundEngine.playBossGong();
        this.arena.addCameraShake(0.35);
      }
      this.spawnLevelEnemy(mobType, jitterX, jitterZ, isEliteEnemy, hpMult);
    }
  }

  public spawnLevelEnemy(type: string, x: number, z: number, isElite: boolean, hpMult: number) {
    const id = Date.now() + Math.random();
    const diffConfig = DIFFICULTY_CONFIGS[this.difficulty] || DIFFICULTY_CONFIGS.normal;

    const baseHp = (110 + Math.floor(Math.random() * 25)) * (isElite ? 2.8 : 1.0) * hpMult;
    const hp = Math.round(baseHp * diffConfig.enemyHpMultiplier);
    const baseDmg = 14 * (isElite ? 1.5 : 1.0);
    const damage = Math.round(baseDmg * diffConfig.enemyDmgMultiplier);
    const baseSpeed = 4.0 * (isElite ? 1.15 : 1.0);
    const speed = Number((baseSpeed * diffConfig.enemySpeedMultiplier).toFixed(2));
    const size = isElite ? 3.2 : 2.4;

    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: generateEnemyTexture(type, false, false, 0),
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -0.58;
    mesh.position.set(x, size / 2, z);
    this.arena.actorsGroup.add(mesh);

    const shadowGeo = new THREE.PlaneGeometry(size * 0.7, size * 0.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.02, z);
    this.arena.actorsGroup.add(shadow);

    const hpGroup = new THREE.Group();
    hpGroup.position.set(x, size + 0.3, z);
    hpGroup.rotation.x = -0.58;
    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(isElite ? 2.0 : 1.2, 0.18), new THREE.MeshBasicMaterial({ color: 0x18181b }));
    const hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(isElite ? 2.0 : 1.2, 0.18),
      new THREE.MeshBasicMaterial({ color: isElite ? 0xf59e0b : 0xef4444 })
    );
    hpGroup.add(hpBg);
    hpGroup.add(hpFill);
    this.arena.actorsGroup.add(hpGroup);

    const actor: EnemyActor = {
      id,
      type,
      x,
      z,
      vx: 0,
      vz: 0,
      maxHp: hp,
      hp,
      speed,
      damage,
      state: 'chase',
      stateTimer: 0,
      facing: 1,
      mesh,
      shadowMesh: shadow,
      hpBarGroup: hpGroup,
      hpBarFill: hpFill,
      hpBarWidth: isElite ? 2.0 : 1.2,
      attackCooldown: 1.0 + Math.random() * 1.5,
      skillCooldown: 2.5 + Math.random() * 2.2,
      targetX: x,
      targetZ: z,
      animFrame: 0,
      animTimer: 0,
      statuses: [],
      isBoss: false,
    };
    this.enemies.push(actor);
  }

  public advanceLevelRoom(direction?: RoomDirection) {
    if (!levelSystem.run) return;
    if (!direction || this.waveState !== 'cleared') return;
    if (levelSystem.getCurrentRoomType() === 'altar' && !this.bossSummonedForRoom) return;
    const nextRoom = levelSystem.advanceToNextRoom(direction);
    if (nextRoom) this.loadLevelRoom(nextRoom.nextRoomType);
  }

  public advanceLevelStage() {
    if (!levelSystem.run) return;
    const res = levelSystem.advanceStage();

    if (res.runCompleted) {
      if (this.onGameOver) this.onGameOver(true);
      return;
    }

    soundEngine.playRoomClear();
    this.loadLevelRoom('start');
  }

  public enterSecretRoom() {
    // The randomized test dungeon has no legacy secret-room branch.
  }

  public openChestReward() {
    if (!levelSystem.run) return;
    const roomType = levelSystem.getCurrentRoomType();
    if ((roomType === 'boss' || roomType === 'secret') && this.waveState === 'fighting') return;
    const chestState = this.getCurrentLevelChestState();
    if (!chestState || chestState.opened) return;
    chestState.opened = true;
    const stage = levelSystem.run.stage;
    if (roomType === 'boss' && stage.currentRoomIndex === stage.roomGraph.length - 1) {
      this.arena.setPortalActive(true);
    }

    const rarity = chestState.rarity || 'gold';
    levelSystem.recordChestOpened(rarity);
    const goldAmount = this.getCoinAmount(rarity === 'gold' || rarity === 'themed' ? 100 : rarity === 'blue' ? 65 : 40);
    const equip = this.chooseStatEquipmentForChest(rarity);
    this.playerStats.gold += goldAmount;
    this.buyEquipment(equip);

    const reward = {
      type: 'equipment' as const,
      titleTh: equip.nameTh,
      descTh: equip.descTh,
      icon: equip.icon || '🛡️',
      amount: goldAmount,
      rawItem: equip,
    };

    this.lastOpenedChestReward = { rarity, reward };
    this.arena.hideChestProps();
    soundEngine.playCoin();
    if (this.onOpenModal) {
      this.onOpenModal('chest_reward');
    }
  }

  public bossSummonMinions(boss: EnemyActor) {
    if (!levelSystem.run) return;
    const biome = levelSystem.getCurrentBiome();
    soundEngine.playBossGong();
    this.arena.addCameraShake(0.6);
    // Summon 2-3 minions as requested in prompt: "ท่าเรียกลูกสมุน: เรียก 2-3 ตัวเมื่อเลือดเหลือ 50%"
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const ox = i === 0 ? -5 : i === 1 ? 5 : 0;
      const oz = i === 2 ? 3 : -2;
      this.spawnLevelEnemy(
        i % 2 === 0 ? biome.mobA : biome.mobB,
        boss.x + ox,
        boss.z + oz,
        false,
        levelSystem.run.hpMultiplier
      );
    }
  }

  public bossExecuteSmash(boss: EnemyActor) {
    soundEngine.playTelegraph();
    this.arena.showSmashTelegraph(boss.x, boss.z, 3.4, 0.6, boss.isHappyBoss ? 0xec4899 : 0xef4444);
    boss.state = 'windup';
    boss.bossAttackType = 'smash';
    boss.bossActionName = boss.isHappyBoss ? 'ตบกลับสองเท่า' : 'ท่าฟาด';
    boss.stateTimer = 0.6; // 0.6s telegraph
  }

  public bossExecuteDash(boss: EnemyActor) {
    soundEngine.playTelegraph();
    this.arena.showDashTelegraph(boss.x, boss.z, this.playerX, this.playerZ, 0.5);
    boss.state = 'windup';
    boss.bossAttackType = 'dash';
    if (boss.isHappyBoss) boss.bossActionName = 'พุ่งรองเท้าแตะ';
    boss.targetX = this.playerX;
    boss.targetZ = this.playerZ;
    boss.stateTimer = 0.5;
  }

  private bossExecuteHappyWave(boss: EnemyActor) {
    boss.targetX = this.playerX;
    boss.targetZ = this.playerZ;
    boss.bossActionName = 'คลื่นบึ้งตึง';
    boss.state = 'windup';
    boss.bossAttackType = 'happy_wave';
    boss.stateTimer = 0.8;
    soundEngine.playTelegraph();
    this.arena.showSmashTelegraph(boss.targetX, boss.targetZ, 4.1, 0.8, 0xec4899);
  }

  private bossExecuteHappyCoinRain(boss: EnemyActor) {
    const centerX = this.playerX;
    const centerZ = this.playerZ;
    const offsets = [[0, 0], [-2.6, -1.4], [2.6, -1.4], [-1.5, 2.2], [1.5, 2.2]];
    boss.happyTelegraphPoints = offsets.map(([ox, oz]) => ({
      x: THREE.MathUtils.clamp(centerX + ox, -12, 12),
      z: THREE.MathUtils.clamp(centerZ + oz, -5.5, 4.5),
    }));
    boss.targetX = centerX;
    boss.targetZ = centerZ;
    boss.bossActionName = 'ฝนเหรียญจิ๋ว';
    boss.state = 'windup';
    boss.bossAttackType = 'happy_coin_rain';
    boss.stateTimer = 0.9;
    soundEngine.playTelegraph();
    for (const point of boss.happyTelegraphPoints) {
      this.arena.showSmashTelegraph(point.x, point.z, 1.45, 0.9, 0xfbbf24);
    }
  }

  private getHappyCounterDamage(boss: EnemyActor) {
    return Math.max(1, Math.round((boss.lastHitDamage ?? 8) * 2));
  }

  private initBreakables() {
    const positions = [
      { x: -11, z: -8 },
      { x: 11, z: -8 },
      { x: -11, z: 8 },
      { x: 11, z: 8 },
      { x: -6, z: 7 },
      { x: 6, z: 7 },
    ];
    positions.forEach((pos, i) => {
      const mesh = this.arena.createBreakableUrn(pos.x, pos.z, i + 1);
      this.breakables.push({
        id: i + 1,
        x: pos.x,
        z: pos.z,
        hp: 1,
        type: 'urn',
        mesh,
      });
    });
  }

  public spawnDungeonWave(waveNum: number) {
    this.currentWave = waveNum;
    this.waveState = 'fighting';
    this.arena.setPortalActive(false);

    const config = BIOME_ENEMIES[this.currentDungeonMap as LegacyDungeonMapId] || BIOME_ENEMIES.desert;

    // Escalating 20-wave compositions
    if (waveNum === 1) {
      // Wave 1: 2 basic scouts
      this.spawnEnemy(config.mobA, -5, -4);
      this.spawnEnemy(config.mobA, 5, -4);
    } else if (waveNum === 2) {
      // Wave 2: 3 basic mobs
      this.spawnEnemy(config.mobA, -6, -5);
      this.spawnEnemy(config.mobA, 6, -5);
      this.spawnEnemy(config.mobA, 0, -6);
    } else if (waveNum === 3) {
      // Wave 3: 2 Mob A + 1 Mob B
      this.spawnEnemy(config.mobA, -6, -4);
      this.spawnEnemy(config.mobA, 6, -4);
      this.spawnEnemy(config.mobB, 0, -5);
    } else if (waveNum === 4) {
      // Wave 4: 2 Mob A + 2 Mob B
      this.spawnEnemy(config.mobA, -7, -5);
      this.spawnEnemy(config.mobA, 7, -5);
      this.spawnEnemy(config.mobB, -4, 1);
      this.spawnEnemy(config.mobB, 4, 1);
    } else if (waveNum === 5) {
      // Wave 5: MINI-BOSS (Area Champion) + 2 guards
      soundEngine.playBossGong();
      this.arena.addCameraShake(0.4);
      this.spawnEnemy(config.mobB, 0, -5, true); // Mini-boss!
      this.spawnEnemy(config.mobA, -6, -3);
      this.spawnEnemy(config.mobA, 6, -3);
    } else if (waveNum === 6) {
      // Wave 6: 3 Mob B + 1 Mob A
      this.spawnEnemy(config.mobB, -5, -4);
      this.spawnEnemy(config.mobB, 5, -4);
      this.spawnEnemy(config.mobB, 0, -6);
      this.spawnEnemy(config.mobA, 0, 2);
    } else if (waveNum === 7) {
      // Wave 7: 4 fast rushing Mob B
      this.spawnEnemy(config.mobB, -6, -5);
      this.spawnEnemy(config.mobB, 6, -5);
      this.spawnEnemy(config.mobB, -4, 1);
      this.spawnEnemy(config.mobB, 4, 1);
    } else if (waveNum === 8) {
      // Wave 8: 3 Mob A + 2 Mob B
      this.spawnEnemy(config.mobA, -7, -4);
      this.spawnEnemy(config.mobA, 7, -4);
      this.spawnEnemy(config.mobA, 0, -6);
      this.spawnEnemy(config.mobB, -5, 1);
      this.spawnEnemy(config.mobB, 5, 1);
    } else if (waveNum === 9) {
      // Wave 9: 4 Mob A + 2 Mob B
      this.spawnEnemy(config.mobA, -7, -5);
      this.spawnEnemy(config.mobA, 7, -5);
      this.spawnEnemy(config.mobA, -3, -6);
      this.spawnEnemy(config.mobA, 3, -6);
      this.spawnEnemy(config.mobB, -5, 2);
      this.spawnEnemy(config.mobB, 5, 2);
    } else if (waveNum === 10) {
      // Wave 10: MID-BOSS (Area Vice-Commander)
      soundEngine.playBossGong();
      this.arena.addCameraShake(0.5);
      this.spawnBoss(config.mobB, 550, 24, `${config.bossName} Vice-Commander`, 0, -5);
      this.spawnEnemy(config.mobA, -6, -3);
      this.spawnEnemy(config.mobB, 6, -3);
    } else if (waveNum === 11) {
      // Wave 11: 4 Mob A + 2 Mob B
      this.spawnEnemy(config.mobA, -6, -5);
      this.spawnEnemy(config.mobA, 6, -5);
      this.spawnEnemy(config.mobA, 0, -6);
      this.spawnEnemy(config.mobA, 0, 2);
      this.spawnEnemy(config.mobB, -4, 1);
      this.spawnEnemy(config.mobB, 4, 1);
    } else if (waveNum === 12) {
      // Wave 12: 5 Mob B
      this.spawnEnemy(config.mobB, -7, -4);
      this.spawnEnemy(config.mobB, 7, -4);
      this.spawnEnemy(config.mobB, -3, -6);
      this.spawnEnemy(config.mobB, 3, -6);
      this.spawnEnemy(config.mobB, 0, 2);
    } else if (waveNum === 13) {
      // Wave 13: 4 Mob A + 3 Mob B
      this.spawnEnemy(config.mobA, -7, -5);
      this.spawnEnemy(config.mobA, 7, -5);
      this.spawnEnemy(config.mobA, -3, -6);
      this.spawnEnemy(config.mobA, 3, -6);
      this.spawnEnemy(config.mobB, -5, 1);
      this.spawnEnemy(config.mobB, 5, 1);
      this.spawnEnemy(config.mobB, 0, 3);
    } else if (waveNum === 14) {
      // Wave 14: 6 mixed enemies
      this.spawnEnemy(config.mobA, -8, -5);
      this.spawnEnemy(config.mobA, 8, -5);
      this.spawnEnemy(config.mobA, 0, -6);
      this.spawnEnemy(config.mobB, -6, 2);
      this.spawnEnemy(config.mobB, 6, 2);
      this.spawnEnemy(config.mobB, 0, 3);
    } else if (waveNum === 15) {
      // Wave 15: DUAL MINI-BOSSES!
      soundEngine.playBossGong();
      this.arena.addCameraShake(0.5);
      this.spawnEnemy(config.mobA, -5, -4, true); // Mini-boss 1
      this.spawnEnemy(config.mobB, 5, -4, true); // Mini-boss 2
      this.spawnEnemy(config.mobB, 0, -6);
      this.spawnEnemy(config.mobA, 0, 2);
    } else if (waveNum === 16) {
      // Wave 16: 5 Mob A + 2 Mob B
      this.spawnEnemy(config.mobA, -7, -5);
      this.spawnEnemy(config.mobA, 7, -5);
      this.spawnEnemy(config.mobA, -3, -6);
      this.spawnEnemy(config.mobA, 3, -6);
      this.spawnEnemy(config.mobA, 0, 2);
      this.spawnEnemy(config.mobB, -5, 1);
      this.spawnEnemy(config.mobB, 5, 1);
    } else if (waveNum === 17) {
      // Wave 17: 6 aggressive Mob B
      this.spawnEnemy(config.mobB, -8, -5);
      this.spawnEnemy(config.mobB, 8, -5);
      this.spawnEnemy(config.mobB, -4, -6);
      this.spawnEnemy(config.mobB, 4, -6);
      this.spawnEnemy(config.mobB, -5, 2);
      this.spawnEnemy(config.mobB, 5, 2);
    } else if (waveNum === 18) {
      // Wave 18: 4 Mob A + 4 Mob B
      this.spawnEnemy(config.mobA, -8, -5);
      this.spawnEnemy(config.mobA, 8, -5);
      this.spawnEnemy(config.mobA, -4, -6);
      this.spawnEnemy(config.mobA, 4, -6);
      this.spawnEnemy(config.mobB, -6, 2);
      this.spawnEnemy(config.mobB, 6, 2);
      this.spawnEnemy(config.mobB, -2, 3);
      this.spawnEnemy(config.mobB, 2, 3);
    } else if (waveNum === 19) {
      // Wave 19: 7 mixed elite swarms
      this.spawnEnemy(config.mobA, -8, -5);
      this.spawnEnemy(config.mobA, 8, -5);
      this.spawnEnemy(config.mobA, 0, -6);
      this.spawnEnemy(config.mobB, -6, 1);
      this.spawnEnemy(config.mobB, 6, 1);
      this.spawnEnemy(config.mobB, -3, 3);
      this.spawnEnemy(config.mobB, 3, 3);
    } else {
      // Wave 20: CLIMACTIC GRAND WIKI BOSS!
      soundEngine.playBossGong();
      this.arena.addCameraShake(0.8);
      this.spawnBoss(config.boss, config.bossHp, config.bossDmg, config.bossName, 0, -6);
      // Elite bodyguards
      this.spawnEnemy(config.mobB, -7, -3);
      this.spawnEnemy(config.mobB, 7, -3);
      this.spawnEnemy(config.mobA, 0, 3);
    }
  }

  private spawnEnemy(type: string, x: number, z: number, isMiniBoss: boolean = false) {
    const id = Date.now() + Math.random();
    const diffConfig = DIFFICULTY_CONFIGS[this.difficulty] || DIFFICULTY_CONFIGS.normal;

    const baseHp = (110 + Math.floor(Math.random() * 30)) * (isMiniBoss ? 2.5 : 1.0);
    const hp = Math.round(baseHp * diffConfig.enemyHpMultiplier);
    const baseDmg = 14 * (isMiniBoss ? 1.5 : 1.0);
    const damage = Math.round(baseDmg * diffConfig.enemyDmgMultiplier);
    const baseSpeed = 4.0 * (isMiniBoss ? 1.1 : 1.0);
    const speed = Number((baseSpeed * diffConfig.enemySpeedMultiplier).toFixed(2));
    const size = isMiniBoss ? 3.0 : 2.4;

    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: generateEnemyTexture(type, false, false, 0),
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -0.58;
    mesh.position.set(x, size / 2, z);
    this.arena.actorsGroup.add(mesh);

    const shadowGeo = new THREE.PlaneGeometry(size * 0.7, size * 0.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.02, z);
    this.arena.actorsGroup.add(shadow);

    const hpGroup = new THREE.Group();
    hpGroup.position.set(x, size + 0.3, z);
    hpGroup.rotation.x = -0.58;
    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(isMiniBoss ? 1.8 : 1.2, 0.18), new THREE.MeshBasicMaterial({ color: 0x18181b }));
    const hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(isMiniBoss ? 1.8 : 1.2, 0.18),
      new THREE.MeshBasicMaterial({ color: isMiniBoss ? 0xf59e0b : 0xef4444 })
    );
    hpGroup.add(hpBg);
    hpGroup.add(hpFill);
    this.arena.actorsGroup.add(hpGroup);

    const actor: EnemyActor = {
      id,
      type,
      x,
      z,
      vx: 0,
      vz: 0,
      maxHp: hp,
      hp,
      speed,
      damage,
      state: 'chase',
      stateTimer: 0,
      facing: 1,
      mesh,
      shadowMesh: shadow,
      hpBarGroup: hpGroup,
      hpBarFill: hpFill,
      hpBarWidth: isMiniBoss ? 1.8 : 1.2,
      attackCooldown: 1.0 + Math.random() * 1.5,
      skillCooldown: 2.5 + Math.random() * 2.2,
      targetX: x,
      targetZ: z,
      animFrame: 0,
      animTimer: 0,
      statuses: [],
      isBoss: isMiniBoss,
    };
    this.enemies.push(actor);
  }

  private spawnBoss(bossType: string, hp: number, damage: number, name: string, x: number, z: number) {
    const id = Date.now();
    const diffConfig = DIFFICULTY_CONFIGS[this.difficulty] || DIFFICULTY_CONFIGS.normal;
    const finalHp = Math.round(hp * diffConfig.enemyHpMultiplier);
    const finalDmg = Math.round(damage * diffConfig.enemyDmgMultiplier);
    const speed = Number((4.4 * diffConfig.enemySpeedMultiplier).toFixed(2));
    const size = 3.6;

    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: generateEnemyTexture(bossType, false, false, 0),
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -0.58;
    mesh.position.set(x, size / 2, z);
    this.arena.actorsGroup.add(mesh);

    const shadowGeo = new THREE.PlaneGeometry(2.4, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.02, z);
    this.arena.actorsGroup.add(shadow);

    const hpGroup = new THREE.Group();
    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.24), new THREE.MeshBasicMaterial({ color: 0x111827 }));
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.24), new THREE.MeshBasicMaterial({ color: 0xa855f7 }));
    hpGroup.add(hpBg);
    hpGroup.add(hpFill);
    hpGroup.position.set(x, size + 0.4, z);
    hpGroup.rotation.x = -0.58;
    this.arena.actorsGroup.add(hpGroup);

    const boss: EnemyActor = {
      id,
      type: bossType,
      x,
      z,
      vx: 0,
      vz: 0,
      maxHp: finalHp,
      hp: finalHp,
      speed,
      damage: finalDmg,
      state: 'chase',
      stateTimer: 0,
      facing: 1,
      mesh,
      shadowMesh: shadow,
      hpBarGroup: hpGroup,
      hpBarFill: hpFill,
      hpBarWidth: 2.4,
      attackCooldown: 1.0,
      targetX: x,
      targetZ: z,
      animFrame: 0,
      animTimer: 0,
      statuses: [],
      isBoss: true,
      bossName: name,
      hasSummonedMinions: false,
      isPhase2: false,
    };
    this.enemies.push(boss);
    this.currentBoss = boss;
  }

  // ----------------------------------------------------------------------
  // PROCEDURAL MULTI-ROOM EXPLORATION & BRANCHING
  // ----------------------------------------------------------------------
  public generateNextDoors(depth: number) {
    if (depth >= 6) {
      this.doorOptions = {
        north: 'boss',
        west: 'equipment_shop',
        east: 'equipment_shop',
      };
      return;
    }

    const availablePool: DungeonRoomType[] = [
      'combat',
      'combat',
      'equipment_shop',
      'equipment_shop',
      'healing_pool',
    ];

    const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
    this.doorOptions = {
      north: shuffled[0],
      west: shuffled[1],
      east: shuffled[2] === shuffled[1] ? 'healing_pool' : shuffled[2],
    };
  }

  public getDoorLabels() {
    if (this.isLevelRun && levelSystem.run) {
      const stage = levelSystem.run.stage;
      const node = stage.roomGraph[stage.currentRoomIndex];
      const roomNames: Record<StageRoomType, string> = {
        start: 'จุดเริ่ม',
        combat: 'ห้องมอนสเตอร์',
        elite: 'ห้องมอนสเตอร์ชั้นสูง',
        shop: 'แฮปปี้',
        chest: 'ห้องสมบัติ',
        altar: 'แท่นอัญเชิญบอส',
        boss: 'ห้องบอส',
        exit: 'ทางออก',
        forge: 'ห้องเสริมสถานะ',
        secret: 'ห้องลับ',
      };
      const roomColors: Record<StageRoomType, number> = {
        start: 0x38bdf8,
        combat: 0xef4444,
        elite: 0xf97316,
        shop: 0x10b981,
        chest: 0xfacc15,
        altar: 0x67e8e8,
        boss: 0xa855f7,
        exit: 0x22c55e,
        forge: 0x06b6d4,
        secret: 0xc084fc,
      };
      const getRoute = (direction: RoomDirection, icon: string) => {
        const targetIndex = node?.connections[direction];
        if (targetIndex === undefined) return { label: `🧱 ${icon} ทางตัน`, color: 0x52525b, enabled: false };
        const targetType = stage.rooms[targetIndex];
        return {
          label: `${icon} [E] ${roomNames[targetType]}`,
          color: roomColors[targetType],
          enabled: true,
        };
      };
      return {
        north: getRoute('north', '⬆️'),
        west: getRoute('west', '⬅️'),
        east: getRoute('east', '➡️'),
        south: getRoute('south', '⬇️'),
      };
    }

    const getMeta = (type: DungeonRoomType, dir: string) => {
      switch (type) {
        case 'combat':
          return { label: `⚔️ ${dir} [E] ห้องมอนสเตอร์`, color: 0xef4444 };
        case 'equipment_shop':
          return { label: `🛡️ ${dir} [E] คลังอุปกรณ์และบัฟ`, color: 0x10b981 };
        case 'healing_pool':
          return { label: `🧪 ${dir} [E] บ่อน้ำโอสถ`, color: 0x06b6d4 };
        case 'boss':
          return { label: `👑 ${dir} [E] ศึกบอสประจำด่าน`, color: 0xa855f7 };
        default:
          return { label: `🚪 ${dir} [E] ทางผ่าน`, color: 0x38bdf8 };
      }
    };

    return {
      north: getMeta(this.doorOptions.north, '⬆️'),
      west: getMeta(this.doorOptions.west, '⬅️'),
      east: getMeta(this.doorOptions.east, '➡️'),
      south: { label: '⬇️ [E] กลับห้องก่อนหน้า', color: 0x38bdf8, enabled: true },
    };
  }

  public enterDungeonDoor(direction: 'north' | 'west' | 'east') {
    const nextRoomType = this.doorOptions[direction];
    this.dungeonRoomDepth++;
    this.currentRoomType = nextRoomType;
    this.generateNextDoors(this.dungeonRoomDepth);

    // Position player coming through the opposite entrance
    if (direction === 'north') {
      this.playerX = 0;
      this.playerZ = 5.2;
    } else if (direction === 'west') {
      this.playerX = 12.0;
      this.playerZ = 0;
    } else if (direction === 'east') {
      this.playerX = -12.0;
      this.playerZ = 0;
    }

    this.playerVx = 0;
    this.playerVz = 0;
    soundEngine.playDash();

    this.clearDungeonEntities();
    this.arena.loadRoom(this.currentRoomType, this.currentDungeonMap, this.getDoorLabels());
    this.initBreakables();

    if (this.currentRoomType === 'combat') {
      this.waveState = 'fighting';
      this.spawnDungeonWave(this.dungeonRoomDepth);
    } else if (this.currentRoomType === 'boss') {
      this.waveState = 'fighting';
      this.spawnDungeonWave(20); // Boss wave!
    } else {
      this.waveState = 'cleared';
    }

    if (this.onStateChange) this.onStateChange();
  }

  public changeRoom(targetRoom: DungeonRoomId) {
    if (this.currentRoom === targetRoom) return;
    const prevRoom = this.currentRoom;
    this.currentRoom = targetRoom;

    // Clear entities in current room
    this.clearDungeonEntities();

    // Load new room geometry in arena
    this.arena.loadRoom(targetRoom, this.currentDungeonMap, this.getDoorLabels());

    // Position player at entrance
    if (targetRoom === 'center') {
      if (prevRoom === 'north') {
        this.playerX = 0;
        this.playerZ = -6.8;
      } else if (prevRoom === 'west') {
        this.playerX = -13.0;
        this.playerZ = 0;
      } else if (prevRoom === 'east') {
        this.playerX = 13.0;
        this.playerZ = 0;
      } else {
        this.playerX = 0;
        this.playerZ = 4;
      }
    } else if (targetRoom === 'north') {
      this.playerX = 0;
      this.playerZ = 5.2;
    } else if (targetRoom === 'west') {
      this.playerX = 10.0;
      this.playerZ = 0;
    } else if (targetRoom === 'east') {
      this.playerX = -10.0;
      this.playerZ = 0;
    }

    this.playerVx = 0;
    this.playerVz = 0;
    soundEngine.playDash();

    if (targetRoom === 'center' && this.waveState === 'fighting') {
      this.spawnDungeonWave(this.currentWave);
    }

    if (this.onStateChange) this.onStateChange();
  }

  public spawnGroundEquipmentItem(x: number, z: number, equipment: EquipmentItem) {
    const item: GroundItem = {
      id: Math.random(),
      type: 'equipment',
      x,
      z,
      equipment,
      bobTimer: Math.random() * Math.PI,
    };
    this.groundItems.push(item);

    const geo = new THREE.PlaneGeometry(1.0, 1.0);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#10b981';
    ctx.font = '72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(equipment.icon || '🛡️', 64, 64);
    const tex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.7, z);
    mesh.rotation.x = -0.58;
    (mesh as any).itemData = item;
    this.arena.vfxGroup.add(mesh);
  }

  public buyStatUpgrade(type: StatUpgradeType): boolean {
    const opt = STAT_UPGRADES_CONFIG.find((o) => o.type === type);
    if (!opt) return false;
    if (this.playerStats.gold < opt.cost) return false;

    this.playerStats.gold -= opt.cost;
    this.statUpgradeCounts[type] = (this.statUpgradeCounts[type] || 0) + 1;

    if (type === 'hp') {
      this.statAltarBonuses.hp += 25;
      this.playerStats.hp = Math.min(this.playerStats.maxHp + 25, this.playerStats.hp + 25);
    } else if (type === 'shield') {
      this.statAltarBonuses.shield += 15;
      this.playerStats.shield = Math.min(this.playerStats.maxShield + 15, this.playerStats.shield + 15);
    } else if (type === 'attack') {
      this.statAltarBonuses.attack += 4;
    } else if (type === 'attackSpeed') {
      this.statAltarBonuses.attackSpeed += 0.12;
    } else if (type === 'moveSpeed') {
      this.statAltarBonuses.moveSpeed += 0.5;
    } else if (type === 'crit') {
      this.statAltarBonuses.crit += 0.06;
    }

    this.recalcHeroStats();
    if (this.onStateChange) this.onStateChange();
    return true;
  }

  public deductGold(amount: number): boolean {
    if (this.playerStats.gold < amount) return false;
    this.playerStats.gold -= amount;
    if (this.onStateChange) this.onStateChange();
    return true;
  }

  public useHealingPool(): boolean {
    this.playerStats.hp = this.playerStats.maxHp;
    this.playerStats.shield = this.playerStats.maxShield;
    soundEngine.playLevelUp();
    this.spawnDamageNumber(this.playerX, 2.0, this.playerZ, this.playerStats.maxHp, false);
    if (this.onStateChange) this.onStateChange();
    return true;
  }

  // ----------------------------------------------------------------------
  // INPUT & COMBAT HANDLERS
  // ----------------------------------------------------------------------
  public handleMouseMove(screenX: number, screenY: number, width: number, height: number) {
    const ndcX = (screenX / width) * 2 - 1;
    const ndcY = -(screenY / height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.arena.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    if (intersectPoint) {
      this.mouseWorldX = THREE.MathUtils.clamp(intersectPoint.x, this.arena.bounds.minX - 2, this.arena.bounds.maxX + 2);
      this.mouseWorldZ = THREE.MathUtils.clamp(intersectPoint.z, this.arena.bounds.minZ - 1, this.arena.bounds.maxZ + 2);
      this.aimCursorMesh.position.set(this.mouseWorldX, 0.03, this.mouseWorldZ);

      const dx = this.mouseWorldX - this.playerX;
      const dz = this.mouseWorldZ - this.playerZ;
      this.playerAimAngle = Math.atan2(dz, dx);
      if (dx > 0.1) this.playerFacing = 1;
      else if (dx < -0.1) this.playerFacing = -1;
    }
  }

  public handleAttack() {
    if ((this.currentMode !== 'dungeon' && this.currentMode !== 'lobby') ||
        this.bossIntroTimer > 0 || this.isDashing || this.ginzoUltimateSequence) return;
    this.playerCombat.pressM1();
  }

  /** Ginzo Awakened uses four skills; Bamdee can cast only Crimson Severance. */
  private hasAwakenedKit(): boolean {
    return usesAwakenedKit(this.activeHeroId, this.isGinzoEvolved);
  }

  private castGinzoEvolvedSkill(
    slot: 1 | 2 | 3 | 4,
    pX: number,
    pZ: number,
    angle: number,
    rawDamage: number
  ) {
    if (slot === 4) {
      // Prototype timing: 1.05s charge, dash through nearest target, then 12 cuts at 80ms intervals.
      const target = this.enemies
        .filter((enemy) => enemy.state !== 'dead')
        .sort((a, b) => Math.hypot(a.x - pX, a.z - pZ) - Math.hypot(b.x - pX, b.z - pZ))[0];
      if (!target && this.currentMode !== 'lobby') return;

      const dashPastTarget = 4.6;
      // No enemies exist in the lobby, so showcase the same cinematic along the aim direction.
      const previewDistance = 7.2;
      const targetX = THREE.MathUtils.clamp(
        target ? target.x + Math.cos(angle) * dashPastTarget : pX + Math.cos(angle) * previewDistance,
        this.arena.bounds.minX + 1.2,
        this.arena.bounds.maxX - 1.2
      );
      const targetZ = THREE.MathUtils.clamp(
        target ? target.z + Math.sin(angle) * dashPastTarget : pZ + Math.sin(angle) * previewDistance,
        this.arena.bounds.minZ + 1.2,
        this.arena.bounds.maxZ - 1.2
      );

      this.ginzoUltimateTimer = 0;
      this.ginzoUltimatePath = { startX: pX, startZ: pZ, endX: targetX, endZ: targetZ };
      this.ginzoUltimateSequence = {
        startX: pX, startZ: pZ, endX: targetX, endZ: targetZ,
        angle, rawDamage, elapsed: 0, hits: 0, dashed: false,
      };
      // The cooldown runs after the 2.5s cinematic sequence instead of during it.
      if (!this.noSkillCooldown) this.skillCooldowns[4] += 2.5;
      this.playerVx = 0;
      this.playerVz = 0;
      this.playerAimAngle = angle;
      this.isInvulnerable = true;
      this.invulnerableTimer = Math.max(this.invulnerableTimer, 2.6);
      this.arena.spawnCrimsonSeveranceChargeVFX(pX, pZ, angle);
      this.arena.spawnGroundTelegraph(
        pX, pZ, 2.3, 0.14, 0xf43f5e, 'line', angle,
        Math.hypot(targetX - pX, targetZ - pZ)
      );
      return;
    }

    if (slot === 1) {
      // Shooting Stars: dash through a line of enemies with several chained sword trails.
      const dashDist = 8.5;
      const targetX = THREE.MathUtils.clamp(
        pX + Math.cos(angle) * dashDist,
        this.arena.bounds.minX + 1.2,
        this.arena.bounds.maxX - 1.2
      );
      const targetZ = THREE.MathUtils.clamp(
        pZ + Math.sin(angle) * dashDist,
        this.arena.bounds.minZ + 1.2,
        this.arena.bounds.maxZ - 1.2
      );
      const dx = targetX - pX;
      const dz = targetZ - pZ;
      const lengthSq = Math.max(0.001, dx * dx + dz * dz);

      this.arena.spawnGroundTelegraph(pX, pZ, 1.2, 0.12, 0xfacc15, 'line', angle, dashDist);
      for (let i = 1; i <= 6; i++) {
        const t = i / 7;
        const trailX = pX + dx * t;
        const trailZ = pZ + dz * t;
        const offset = i % 2 ? 0.22 : -0.22;
        this.arena.spawnKatanaArcVFX(trailX, trailZ, angle + offset, 1.05 + t * 0.35, i % 2 ? 0xfef3c7 : 0xfacc15);
      }
      this.arena.spawnDimensionalSlashVFX(targetX, targetZ, angle);
      this.arena.addCameraShake(0.32);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.065);
      this.playerX = targetX;
      this.playerZ = targetZ;
      this.isInvulnerable = true;
      this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.32);

      for (const enemy of this.enemies) {
        if (enemy.state === 'dead') continue;
        const t = THREE.MathUtils.clamp(
          ((enemy.x - pX) * dx + (enemy.z - pZ) * dz) / lengthSq,
          0,
          1
        );
        const projectedX = pX + t * dx;
        const projectedZ = pZ + t * dz;
        const distance = Math.hypot(enemy.x - projectedX, enemy.z - projectedZ);
        if (distance > 2.0) continue;
        this.applyStatusEffect(enemy, 'stun', 0.85);
        this.applyStatusEffect(enemy, 'bleed', 3.2, 20);
        this.damageEnemy(enemy, Math.round(rawDamage), Math.random() < this.playerStats.critChance + 0.12, true);
        enemy.vx += Math.cos(angle) * 13;
        enemy.vz += Math.sin(angle) * 13;
      }
      soundEngine.playKatanaSlash();
      return;
    }

    if (slot === 2) {
      // Tsubame Gaeshi: guarded stance, then a counter only if a threat is within the blade's reach.
      this.arena.spawnKatanaArcVFX(pX, pZ, angle, 1.5, 0xa5f3fc);
      this.arena.spawnGroundTelegraph(pX, pZ, 2.0, 0.1, 0xa5f3fc, 'line', angle, 3.2);
      this.arena.addCameraShake(0.12);
      this.isInvulnerable = true;
      this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.72);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.035);

      window.setTimeout(() => {
        if (!this.hasAwakenedKit() || this.currentMode !== 'dungeon') return;
        const cx = this.playerX;
        const cz = this.playerZ;
        const threats = this.enemies.filter((enemy) => {
          if (enemy.state === 'dead') return false;
          const dx = enemy.x - cx;
          const dz = enemy.z - cz;
          const distance = Math.hypot(dx, dz);
          const enemyAngle = Math.atan2(dz, dx);
          let diff = Math.abs(enemyAngle - angle);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
          return distance <= 5.2 && (diff <= 1.45 || distance <= 1.6);
        });
        if (threats.length === 0) return;

        // A crisp cyan-gold ring appears only when the guard catches a nearby threat.
        this.arena.spawnGroundTelegraph(cx, cz, 2.85, 0.12, 0xa5f3fc, 'circle');
        this.arena.spawnSkillBurst(cx, 0.75, cz, 0xa5f3fc, 12, 2.6, 0.32);
        this.arena.spawnKatanaArcVFX(cx, cz, angle - 0.42, 1.8, 0xfef3c7);
        this.arena.spawnKatanaArcVFX(cx, cz, angle + 0.42, 1.8, 0xfda4af);
        this.arena.spawnDimensionalSlashVFX(cx + Math.cos(angle) * 1.3, cz + Math.sin(angle) * 1.3, angle);
        for (const enemy of threats) {
          this.applyStatusEffect(enemy, 'stun', 1.0);
          this.applyStatusEffect(enemy, 'bleed', 2.5, 16);
          this.damageEnemy(enemy, Math.round(rawDamage * 1.35), Math.random() < this.playerStats.critChance + 0.1, true);
          enemy.vx += Math.cos(angle) * 10;
          enemy.vz += Math.sin(angle) * 10;
        }
        this.arena.addCameraShake(0.36);
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.075);
        soundEngine.playKatanaSlash();
        if (this.onStateChange) this.onStateChange();
      }, 190);
      return;
    }

    // Heirloom Katana: eight fast cuts into a dramatic ninth finishing slash.
    for (let hit = 0; hit < 9; hit++) {
      const hitIndex = hit;
      window.setTimeout(() => {
        if (!this.hasAwakenedKit() || this.currentMode !== 'dungeon') return;

        const finalCut = hitIndex === 8;
        const cx = this.playerX + Math.cos(angle) * (finalCut ? 1.25 : 0.85);
        const cz = this.playerZ + Math.sin(angle) * (finalCut ? 1.25 : 0.85);
        const slashAngle = angle + (finalCut ? 0 : (hitIndex % 2 === 0 ? 0.26 : -0.26));
        this.arena.spawnKatanaArcVFX(
          cx,
          cz,
          slashAngle,
          finalCut ? 2.25 : 0.92 + hitIndex * 0.055,
          finalCut ? 0xfacc15 : (hitIndex % 2 === 0 ? 0xfef3c7 : 0xfda4af)
        );

        if (finalCut) {
          this.arena.spawnDimensionalSlashVFX(cx + Math.cos(angle) * 1.2, cz + Math.sin(angle) * 1.2, angle);
          this.arena.spawnSkillBurst(cx, 1.0, cz, 0xfbbf24, 28, 5.5, 0.72);
          this.arena.addCameraShake(0.48);
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.11);
          soundEngine.playBossGong();
        } else {
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.018);
        }

        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dx = enemy.x - this.playerX;
          const dz = enemy.z - this.playerZ;
          const distance = Math.hypot(dx, dz);
          if (distance > (finalCut ? 5.7 : 4.8)) continue;
          const enemyAngle = Math.atan2(dz, dx);
          let diff = Math.abs(enemyAngle - angle);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
          if (!finalCut && diff > 1.0 && distance > 1.35) continue;
          if (finalCut && diff > 1.35 && distance > 1.6) continue;

          this.damageEnemy(
            enemy,
            Math.max(1, Math.round(rawDamage * (finalCut ? 1.15 : 0.14))),
            finalCut && Math.random() < this.playerStats.critChance + 0.15,
            true
          );
          if (finalCut) {
            this.applyStatusEffect(enemy, 'bleed', 3.5, 24);
            enemy.vx += Math.cos(angle) * 12;
            enemy.vz += Math.sin(angle) * 12;
          }
        }
        if (this.onStateChange) this.onStateChange();
      }, hitIndex * 78);
    }
  }

  public castSkill(slot: 1 | 2 | 3 | 4): boolean {
    if (this.bossIntroTimer > 0 || this.isDashing || this.ginzoUltimateSequence || this.playerStats.hp <= 0) {
      return false;
    }
    if (!this.noSkillCooldown && (this.skillCooldowns[slot] ?? 0) > 0) {
      return false;
    }

    const heroSkills = getHeroSkills(this.activeHeroId, this.isGinzoEvolved);
    if (!heroSkills) return false;
    const skillDef = this.activeHeroId === 'bamdee'
      ? heroSkills.find((skill) => skill.slot === slot)
      : heroSkills[slot - 1];
    if (!skillDef) return false;

    // Set cooldown (accounting for cooldown reduction stat)
    const effectiveCooldown = skillDef.cooldown * (1 - Math.min(0.5, this.playerStats.cooldownReduction || 0));
    this.skillCooldowns[slot] = this.noSkillCooldown ? 0 : effectiveCooldown;

    const heroId = this.activeHeroId;
    let angle = this.playerAimAngle;
    if (this.hasAwakenedKit() && slot === 4) {
      const target = this.enemies
        .filter((enemy) => enemy.state !== 'dead')
        .sort((a, b) => Math.hypot(a.x - this.playerX, a.z - this.playerZ) - Math.hypot(b.x - this.playerX, b.z - this.playerZ))[0];
      if (!target) {
        // In the lobby, allow a visual-only ultimate preview along the player's current aim.
        if (this.currentMode !== 'lobby') { this.skillCooldowns[4] = 0; return false; }
      } else {
        angle = Math.atan2(target.z - this.playerZ, target.x - this.playerX);
      }
    }
    const pX = this.playerX;
    const pZ = this.playerZ;
    const rawDamage = this.playerStats.attackPower * skillDef.damageMultiplier;

    // All skills share the same locked aim as their slash, projectile or cast VFX.
    this.beginDirectionalActionAnimation(slot, angle, slot === 4 ? 2.5 : slot === 3 ? 0.76 : 0.48);

    if (this.hasAwakenedKit()) {
      this.castGinzoEvolvedSkill(slot, pX, pZ, angle, rawDamage);
    } else if (heroId === 'ginzo') {
      if (slot === 1) {
        // Ginzo 1: Dimensional Rift (คมดาบตัดมิติ)
        soundEngine.playKatanaSlash();
        this.arena.spawnDimensionalSlashVFX(pX + Math.cos(angle) * 2.5, pZ + Math.sin(angle) * 2.5, angle);
        this.arena.addCameraShake(0.28);

        let hitCount = 0;
        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dx = enemy.x - pX;
          const dz = enemy.z - pZ;
          const dist = Math.hypot(dx, dz);
          if (dist > 8.0) continue;
          const enemyAngle = Math.atan2(dz, dx);
          let diff = Math.abs(enemyAngle - angle);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
          if (diff <= 0.55 || dist <= 1.8) {
            hitCount++;
            const isCrit = Math.random() < this.playerStats.critChance + 0.15;
            this.applyStatusEffect(enemy, 'bleed', 3.0, 18);
            this.damageEnemy(enemy, Math.round(rawDamage), isCrit, true);
            enemy.vx += Math.cos(angle) * 12;
            enemy.vz += Math.sin(angle) * 12;
          }
        }
        if (hitCount > 0) soundEngine.playHit(true);

      } else if (slot === 2) {
        // Ginzo 2: Sakura Storm (พายุซากุระสลาตัน)
        soundEngine.playWhirlwind();
        this.arena.spawnGroundTelegraph(pX, pZ, 4.4, 0.35, 0xfb7185, 'circle');
        this.arena.spawnSakuraStormVFX(pX, pZ);
        this.arena.addCameraShake(0.38);

        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dist = Math.hypot(enemy.x - pX, enemy.z - pZ);
          if (dist <= 4.6) {
            const isCrit = Math.random() < this.playerStats.critChance;
            this.applyStatusEffect(enemy, 'slow', 3.5);
            this.damageEnemy(enemy, Math.round(rawDamage), isCrit, true);
            const pushAngle = Math.atan2(enemy.z - pZ, enemy.x - pX);
            enemy.vx += Math.cos(pushAngle) * 9;
            enemy.vz += Math.sin(pushAngle) * 9;
          }
        }

      } else {
        // Ginzo 3: Zero-Frame Severance (ดาบตัดมิติศูนย์เฟรม)
        const dashDist = 7.0;
        const targetX = THREE.MathUtils.clamp(
          pX + Math.cos(angle) * dashDist,
          this.arena.bounds.minX + 1.2,
          this.arena.bounds.maxX - 1.2
        );
        const targetZ = THREE.MathUtils.clamp(
          pZ + Math.sin(angle) * dashDist,
          this.arena.bounds.minZ + 1.2,
          this.arena.bounds.maxZ - 1.2
        );

        this.arena.spawnGroundTelegraph(pX, pZ, 1.4, 0.2, 0xffffff, 'line', angle, dashDist);
        this.arena.spawnZeroFrameSeveranceVFX(pX, pZ, targetX, targetZ);
        soundEngine.playBossGong();
        soundEngine.playKatanaSlash();
        this.arena.addCameraShake(0.48);
        this.hitstopTimer = 0.08;

        this.playerX = targetX;
        this.playerZ = targetZ;
        this.invulnerableTimer = 0.45;
        this.isInvulnerable = true;

        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const l2 = Math.hypot(targetX - pX, targetZ - pZ) ** 2;
          const t = Math.max(0, Math.min(1, ((enemy.x - pX) * (targetX - pX) + (enemy.z - pZ) * (targetZ - pZ)) / l2));
          const projX = pX + t * (targetX - pX);
          const projZ = pZ + t * (targetZ - pZ);
          const distToCut = Math.hypot(enemy.x - projX, enemy.z - projZ);
          if (distToCut <= 2.2) {
            this.damageEnemy(enemy, Math.round(rawDamage), true, true);
            this.applyStatusEffect(enemy, 'bleed', 4.0, 35);
          }
        }
      }

    } else if (heroId === 'quan') {
      if (slot === 1) {
        // Quan 1: Heaven Drum Palm (ฝ่ามือกลองสวรรค์)
        soundEngine.playKiExplosion();
        this.arena.spawnHeavenDrumPalmVFX(pX, pZ, angle);
        this.arena.addCameraShake(0.3);

        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dx = enemy.x - pX;
          const dz = enemy.z - pZ;
          const dist = Math.hypot(dx, dz);
          if (dist > 6.0) continue;
          const enemyAngle = Math.atan2(dz, dx);
          let diff = Math.abs(enemyAngle - angle);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
          if (diff <= 0.75 || dist <= 1.8) {
            const isCrit = Math.random() < this.playerStats.critChance;
            this.applyStatusEffect(enemy, 'stun', 1.4);
            this.damageEnemy(enemy, Math.round(rawDamage), isCrit, true);
            enemy.vx += Math.cos(angle) * 16;
            enemy.vz += Math.sin(angle) * 16;
          }
        }

      } else if (slot === 2) {
        // Quan 2: Jade Dragon Spiral (มังกรหยกหมุนวน)
        soundEngine.playWhirlwind();
        this.arena.spawnGroundTelegraph(pX, pZ, 4.2, 0.28, 0x34d399, 'circle');
        this.arena.spawnJadeDragonSpiralVFX(pX, pZ);
        this.arena.addCameraShake(0.34);

        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dist = Math.hypot(enemy.x - pX, enemy.z - pZ);
          if (dist <= 4.5) {
            const isCrit = Math.random() < this.playerStats.critChance;
            const pullAngle = Math.atan2(pZ - enemy.z, pX - enemy.x);
            enemy.vx += Math.cos(pullAngle) * 8;
            enemy.vz += Math.sin(pullAngle) * 8;
            this.applyStatusEffect(enemy, 'shock', 2.5);
            this.damageEnemy(enemy, Math.round(rawDamage), isCrit, true);
          }
        }

      } else {
        // Quan 3: Celestial Dragon Ascension (มังกรสวรรค์ทะยานฟ้า)
        const targetX = this.lockedTarget ? this.lockedTarget.x : pX + Math.cos(angle) * 2.8;
        const targetZ = this.lockedTarget ? this.lockedTarget.z : pZ + Math.sin(angle) * 2.8;

        this.arena.spawnGroundTelegraph(targetX, targetZ, 4.6, 0.35, 0xfbbf24, 'circle');
        this.arena.spawnDragonAscensionVFX(targetX, targetZ);
        soundEngine.playBossGong();
        this.arena.addCameraShake(0.5);
        this.hitstopTimer = 0.06;

        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dist = Math.hypot(enemy.x - targetX, enemy.z - targetZ);
          if (dist <= 5.0) {
            const isCrit = Math.random() < this.playerStats.critChance + 0.2;
            this.applyStatusEffect(enemy, 'stun', 1.8);
            this.damageEnemy(enemy, Math.round(rawDamage), isCrit, true);
            const launchAngle = Math.atan2(enemy.z - targetZ, enemy.x - targetX);
            enemy.vx += Math.cos(launchAngle) * 14;
            enemy.vz += Math.sin(launchAngle) * 14;
          }
        }
      }

    } else if (heroId === 'katherine') {
      if (slot === 1) {
        // Katherine 1: Frost Nova (โนวาน้ำแข็งเยือกแข็ง)
        soundEngine.playPotion();
        this.arena.spawnGroundTelegraph(pX, pZ, 4.2, 0.25, 0x38bdf8, 'circle');
        this.arena.spawnFrostNovaVFX(pX, pZ);
        this.arena.addCameraShake(0.28);

        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dist = Math.hypot(enemy.x - pX, enemy.z - pZ);
          if (dist <= 4.5) {
            const isCrit = Math.random() < this.playerStats.critChance;
            this.applyStatusEffect(enemy, 'freeze', 2.8);
            this.damageEnemy(enemy, Math.round(rawDamage), isCrit, true);
          }
        }

      } else if (slot === 2) {
        // Katherine 2: Thunderbolt Surge (อัสนีบาตสายฟ้าฟาด)
        const range = 8.8;
        const targetX = THREE.MathUtils.clamp(
          pX + Math.cos(angle) * range,
          this.arena.bounds.minX + 1.2,
          this.arena.bounds.maxX - 1.2
        );
        const targetZ = THREE.MathUtils.clamp(
          pZ + Math.sin(angle) * range,
          this.arena.bounds.minZ + 1.2,
          this.arena.bounds.maxZ - 1.2
        );

        this.arena.spawnGroundTelegraph(pX, pZ, 1.2, 0.2, 0xa78bfa, 'line', angle, range);
        this.arena.spawnThunderBoltVFX(pX, pZ, targetX, targetZ);
        soundEngine.playThunderBolt();
        this.arena.addCameraShake(0.32);

        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const l2 = Math.hypot(targetX - pX, targetZ - pZ) ** 2;
          const t = Math.max(0, Math.min(1, ((enemy.x - pX) * (targetX - pX) + (enemy.z - pZ) * (targetZ - pZ)) / l2));
          const projX = pX + t * (targetX - pX);
          const projZ = pZ + t * (targetZ - pZ);
          const dist = Math.hypot(enemy.x - projX, enemy.z - projZ);
          if (dist <= 2.2) {
            const isCrit = Math.random() < this.playerStats.critChance;
            this.applyStatusEffect(enemy, 'shock', 3.0);
            this.applyStatusEffect(enemy, 'stun', 0.8);
            this.damageEnemy(enemy, Math.round(rawDamage), isCrit, true);
          }
        }

      } else {
        // Katherine 3: Meteor Calamity (อุกกาบาตบรรจบดวงดาว)
        const targetX = this.mouseWorldX || (this.lockedTarget ? this.lockedTarget.x : pX + Math.cos(angle) * 4.2);
        const targetZ = this.mouseWorldZ || (this.lockedTarget ? this.lockedTarget.z : pZ + Math.sin(angle) * 4.2);

        this.arena.spawnGroundTelegraph(targetX, targetZ, 4.8, 0.55, 0xf97316, 'circle');
        this.arena.spawnMeteorVFX(targetX, targetZ, () => {
          soundEngine.playKiExplosion();
          this.arena.addCameraShake(0.55);
          for (const enemy of this.enemies) {
            if (enemy.state === 'dead') continue;
            const dist = Math.hypot(enemy.x - targetX, enemy.z - targetZ);
            if (dist <= 5.2) {
              this.applyStatusEffect(enemy, 'burn', 4.5, 30);
              this.damageEnemy(enemy, Math.round(rawDamage), true, true);
            }
          }
        });
      }
    }

    if (this.onStateChange) this.onStateChange();
    return true;
  }

  private handlePlayerCombatEvent(event: CombatEvent) {
    if (event.type === 'swing') {
      this.comboStep = event.step + 1;
      this.isAttacking = true;
      const swingAngle = this.playerAimAngle;
      this.beginDirectionalActionAnimation(
        Math.min(3, this.comboStep) as 1 | 2 | 3,
        swingAngle,
        this.comboStep === 3 ? 0.48 : 0.38
      );
      const x = this.playerX + Math.cos(swingAngle) * 1.1;
      const z = this.playerZ + Math.sin(swingAngle) * 1.1;

      // Hero-specific swing audio
      if (this.activeHeroId === 'ginzo' || this.activeHeroId === 'bamdee') {
        soundEngine.playKatanaSlash();
      } else if (this.activeHeroId === 'quan') {
        soundEngine.playKiExplosion();
      } else {
        soundEngine.playThunderBolt();
      }

      this.arena.spawnHeroComboVFX(this.activeHeroId, this.comboStep, x, z, swingAngle);
      if (this.hasAwakenedKit()) {
        const finisher = event.step === 2;
        this.arena.spawnKatanaArcVFX(x, z, swingAngle + (event.step % 2 ? 0.2 : -0.2), finisher ? 2.05 : 1.25, finisher ? 0xfacc15 : 0xfef3c7);
        this.arena.spawnKatanaArcVFX(x - Math.cos(swingAngle) * 0.45, z - Math.sin(swingAngle) * 0.45, swingAngle + 0.35, finisher ? 1.7 : 0.9, 0xfda4af);
        if (finisher) {
          this.arena.spawnDimensionalSlashVFX(x + Math.cos(swingAngle) * 1.2, z + Math.sin(swingAngle) * 1.2, swingAngle);
          this.arena.spawnSkillBurst(x, 1.0, z, 0xfbbf24, 16, 3.6, 0.42);
          this.arena.addCameraShake(0.34);
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.085);
        } else {
          this.arena.addCameraShake(0.1);
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.025);
        }
      }
    } else if (event.type === 'hit') {
      if (event.crit) this.arena.addCameraShake(0.2);
    }
  }

  private getCombatTargets(): CombatTarget[] {
    const targets = this.enemies.map((enemy) => {
      let target = this.combatTargets.get(enemy);
      if (!target) {
        target = {
          pos: { x: 0, y: 0 },
          radius: enemy.isBoss ? 42 : 24,
          alive: false,
          hit: (damage, knockback, isCrit) => {
            if (enemy.state === 'dead') return;
            const heavy = Math.hypot(knockback.x, knockback.y) >= 200;
            this.damageEnemy(enemy, damage, isCrit, heavy);
            const angle = Math.atan2(knockback.y, knockback.x);
            const force = Math.max(5, Math.hypot(knockback.x, knockback.y) / 24);
            enemy.vx = Math.cos(angle) * force;
            enemy.vz = Math.sin(angle) * force;
          },
        };
        this.combatTargets.set(enemy, target);
      }
      target.pos.x = enemy.x * 32;
      target.pos.y = enemy.z * 32;
      target.alive = enemy.state !== 'dead';
      target.radius = enemy.isBoss ? 42 : 24;
      return target;
    });
    for (const prop of this.breakables) {
      let target = this.combatTargets.get(prop);
      if (!target) {
        target = {
          pos: { x: 0, y: 0 },
          radius: 20,
          alive: true,
          hit: () => this.checkBreakableHits(prop.x, prop.z, 0),
        };
        this.combatTargets.set(prop, target);
      }
      target.pos.x = prop.x * 32;
      target.pos.y = prop.z * 32;
      target.alive = this.breakables.includes(prop);
      targets.push(target);
    }
    return targets;
  }

  public handleDash() {
    if (this.bossIntroTimer > 0 || this.ginzoUltimateSequence) return;
    if (this.dashCooldown > 0 || this.isDashing) return;

    this.isDashing = true;
    this.dashTimer = 0.26;
    this.dashCooldown = this.dashMaxCooldown;
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.35;
    this.animState = 'dash';

    const dashSpeed = 19;
    let angle = this.playerAimAngle;
    if (Math.abs(this.playerVx) > 0.1 || Math.abs(this.playerVz) > 0.1) {
      angle = Math.atan2(this.playerVz, this.playerVx);
    }
    this.playerVx = Math.cos(angle) * dashSpeed;
    this.playerVz = Math.sin(angle) * dashSpeed;
    this.dashTrailTimer = 0.055;

    soundEngine.playDash();
    this.spawnGhostTrail();

    // Relic synergy: Shadow Mantle shockwave on dodge
    const relicPerks = aggregateRelicBonuses(this.relics.map((r) => r.id));
    if (relicPerks.hasDodgeShockwave) {
      soundEngine.playThunderBolt();
      this.arena.addCameraShake(0.25);
      for (const enemy of this.enemies) {
        if (enemy.state === 'dead') continue;
        const d = Math.hypot(enemy.x - this.playerX, enemy.z - this.playerZ);
        if (d <= 3.6) {
          this.applyStatusEffect(enemy, 'stun', 1.2);
          this.damageEnemy(enemy, Math.round(this.playerStats.attackPower * 0.8), false, true);
        }
      }
    }
  }

  public triggerInteraction() {
    if (this.bossIntroTimer > 0) return;
    // Ignore E unless the proximity scan has found an actual interaction target.
    // This prevents stale/no-target presses from triggering unrelated dungeon actions.
    if (this.currentMode === 'lobby' && !this.nearbyInteractable) return;
    if (this.currentMode === 'dungeon' && !this.nearbyDungeonInteractable) return;
    if (this.currentMode === 'lobby') {
      if (this.nearbyInteractable && this.onOpenModal) {
        soundEngine.playCoin();
        this.onOpenModal(this.nearbyInteractable);
      }
    } else if (this.currentMode === 'dungeon') {
      if (this.isLevelRun && levelSystem.run) {
        if (this.nearbyDungeonInteractable === 'boss_altar') {
          this.summonLevelBossAtAltar();
          return;
        } else if (this.nearbyDungeonInteractable === 'chest') {
          this.openChestReward();
          return;
        } else if (this.nearbyDungeonInteractable === 'forge') {
          this.onOpenModal?.('forge');
          return;
        } else if (this.nearbyDungeonInteractable === 'happy_merchant') {
          this.onOpenModal?.('happy_dialogue');
          return;
        } else if (this.nearbyDungeonInteractable === 'shop_item' && this.nearbyShopItemIndex !== null) {
          soundEngine.playCoin();
          this.onOpenModal?.('shop_item_detail');
          return;
        } else if (this.nearbyDungeonInteractable === 'portal') {
          const stage = levelSystem.run.stage;
          const currentRoom = levelSystem.getCurrentRoomType();
          const atFinalBoss = currentRoom === 'boss' &&
            stage.currentRoomIndex === stage.roomGraph.length - 1 &&
            Boolean(stage.chestStates['room-' + stage.currentRoomIndex]?.opened);
          if ((currentRoom === 'exit' || atFinalBoss) && this.waveState === 'cleared') {
            this.advanceLevelStage();
          }
          return;
        } else if (this.nearbyDungeonInteractable === 'door_north') {
          this.advanceLevelRoom('north');
          return;
        } else if (this.nearbyDungeonInteractable === 'door_east') {
          this.advanceLevelRoom('east');
          return;
        } else if (this.nearbyDungeonInteractable === 'door_south') {
          this.advanceLevelRoom('south');
          return;
        } else if (this.nearbyDungeonInteractable === 'door_west') {
          this.advanceLevelRoom('west');
          return;
        }
      }

      if (this.nearbyDungeonInteractable === 'stat_device') {
        soundEngine.playCoin();
        this.onOpenModal?.('stat_device');
      } else if (this.nearbyDungeonInteractable === 'equipment_merchant') {
        soundEngine.playCoin();
        this.onOpenModal?.('equipment_shop');
      } else if (this.nearbyDungeonInteractable === 'healing_pool') {
        this.useHealingPool();
      } else if (this.nearbyDungeonInteractable === 'door_north') {
        this.changeRoom('north');
      } else if (this.nearbyDungeonInteractable === 'door_west') {
        this.changeRoom('west');
      } else if (this.nearbyDungeonInteractable === 'door_east') {
        this.changeRoom('east');
      } else if (this.nearbyDungeonInteractable === 'door_south') {
        this.changeRoom('center');
      } else if (this.nearbyDungeonInteractable === 'door_center') {
        this.changeRoom('center');
      } else if (this.nearbyDungeonInteractable === 'portal') {
        this.useDungeonPortal();
      }
    }
  }

  private summonLevelBossAtAltar() {
    const run = levelSystem.run;
    const roomType = levelSystem.getCurrentRoomType();
    if (!this.isLevelRun || !run || this.bossSummonedForRoom) return;
    if (roomType !== 'altar' && roomType !== 'boss') return;
    if (roomType === 'altar' && this.waveState === 'fighting') return;

    this.bossSummonedForRoom = true;
    this.nearbyDungeonInteractable = null;
    if (roomType === 'altar' && !run.stage.clearedRoomIndices.includes(run.stage.currentRoomIndex)) {
      run.stage.clearedRoomIndices.push(run.stage.currentRoomIndex);
    }

    // Fade to black, move into the dedicated boss realm, then begin the boss reveal.
    this.pendingBossStageTransition = true;
    this.bossStageTransitionTimer = 0.9;
    this.waveState = 'spawning';
    this.arena.setPortalActive(false);
    this.arena.spawnSkillBurst(0, 0.9, -1.2, 0xa855f7, 32, 7.5, 0.9);
    this.arena.addCameraShake(0.55);
    soundEngine.playBossGong();
    this.onCinematicTransition?.('มิติอสูรกำลังเปิดออก', 'เจ้ากำลังถูกส่งเข้าสู่สนามประลองผู้พิทักษ์', 2600);
    this.onStateChange?.();
  }

  private spawnLevelBossAtCurrentAltar() {
    const run = levelSystem.run;
    if (!run) return;
    const biome = levelSystem.getCurrentBiome();
    this.bossSummonedForRoom = true;
    this.nearbyDungeonInteractable = null;
    this.waveState = 'fighting';
    this.currentRoomWave = 1;
    this.bossIntroTimer = this.bossIntroDuration;
    this.arena.setPortalActive(false);

    const bossHp = Math.round(550 * run.hpMultiplier);
    this.spawnBoss(biome.bossId, bossHp, 22, biome.bossNameTh, 0, -1.2);
    if (this.currentBoss) {
      this.currentBoss.mesh.scale.setScalar(0.03);
      const bossMaterial = this.currentBoss.mesh.material;
      if (bossMaterial instanceof THREE.MeshBasicMaterial) bossMaterial.opacity = 0.02;
      this.currentBoss.hpBarGroup.visible = false;
    }

    this.onBossIntro?.(biome.bossNameTh);
    this.onStateChange?.();
  }

  public startHappyMerchantBoss() {
    const run = levelSystem.run;
    if (!run || levelSystem.getCurrentRoomType() !== 'shop') return;
    const stage = run.stage;
    const roomIndex = stage.currentRoomIndex;
    if (stage.happyProvokedRoomIndices.includes(roomIndex)) return;
    stage.happyProvokedRoomIndices.push(roomIndex);
    this.arena.removeHappyVendor();
    this.nearbyDungeonInteractable = null;
    this.nearbyShopItemIndex = null;
    this.waveState = 'fighting';
    this.arena.setPortalActive(false);
    this.spawnHappyMerchantBoss();
    soundEngine.playBossGong();
    this.arena.addCameraShake(0.95);
    this.onStateChange?.();
  }

  public buyHappyShopItem(index: number) {
    const run = levelSystem.run;
    if (!run || levelSystem.getCurrentRoomType() !== 'shop' || run.stage.happyProvokedRoomIndices.includes(run.stage.currentRoomIndex)) return false;
    const offers = levelSystem.getShopOffersForRoom(run.stage.currentRoomIndex);
    const offer = offers[index];
    if (!offer || offer.purchased) return false;
    const equippedItem: EquipmentItem = {
      ...offer.itemData,
      id: `${offer.itemData.id}_${offer.id}`,
      templateId: offer.itemData.templateId ?? offer.itemData.id,
      cost: offer.cost,
    };
    if (!this.buyEquipment(equippedItem)) return false;
    offer.purchased = true;
    this.arena.removeHappyShopItem(index);
    this.nearbyShopItemIndex = null;
    this.nearbyDungeonInteractable = null;
    soundEngine.playBuy();
    this.onStateChange?.();
    return true;
  }

  private spawnHappyMerchantBoss() {
    const x = 0;
    const z = -2.8;
    const size = 1.55;
    const texture = generateHappyTexture();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size * 1.22),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -0.58;
    mesh.position.set(x, size * 1.22 / 2, z);
    this.arena.actorsGroup.add(mesh);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.92),
      new THREE.MeshBasicMaterial({ map: this.contactShadowTex, transparent: true, opacity: 0.72, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.025, z);
    this.arena.actorsGroup.add(shadow);

    const hpWidth = 3.6;
    const hpBarGroup = new THREE.Group();
    hpBarGroup.add(new THREE.Mesh(
      new THREE.PlaneGeometry(hpWidth, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x24101e })
    ));
    const hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(hpWidth, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xec4899 })
    );
    hpBarGroup.add(hpBarFill);
    hpBarGroup.position.set(x, size * 1.22 + 0.55, z);
    hpBarGroup.rotation.x = -0.58;
    this.arena.actorsGroup.add(hpBarGroup);

    const boss: EnemyActor = {
      id: Date.now(),
      type: 'happy',
      x,
      z,
      vx: 0,
      vz: 0,
      maxHp: 300_000,
      hp: 300_000,
      speed: 3.3,
      damage: 16,
      state: 'chase',
      stateTimer: 0,
      facing: 1,
      mesh,
      shadowMesh: shadow,
      hpBarGroup,
      hpBarFill,
      hpBarWidth: hpWidth,
      attackCooldown: 1.4,
      targetX: x,
      targetZ: z,
      animFrame: 0,
      animTimer: 0,
      statuses: [],
      isBoss: true,
      isHappyBoss: true,
      bossName: 'แฮปปี้',
      hasSummonedMinions: false,
      isPhase2: false,
      lastHitDamage: 8,
      happyAttackCount: 0,
      bossActionName: 'รอจังหวะสวนกลับ',
    };
    this.enemies.push(boss);
    this.currentBoss = boss;
  }

  private spawnGhostTrail(x?: number, z?: number, opacity: number = 0.48, facing?: number) {
    const geo = new THREE.PlaneGeometry(2.4, 2.8);
    const mat = new THREE.MeshBasicMaterial({
      map: (this.heroMesh.material as THREE.MeshBasicMaterial).map,
      transparent: true,
      opacity,
      color: 0xffd9e9,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ghost = new THREE.Mesh(geo, mat);
    ghost.position.copy(this.heroMesh.position);
    if (x !== undefined) ghost.position.x = x;
    if (z !== undefined) ghost.position.z = z;
    ghost.scale.copy(this.heroMesh.scale);
    if (facing !== undefined) ghost.scale.x = Math.abs(ghost.scale.x) * (facing >= 0 ? 1 : -1);
    this.arena.vfxGroup.add(ghost);
    this.ghostTrails.push({ mesh: ghost, opacity });
  }

  // ----------------------------------------------------------------------
  // DAMAGE, COMBAT DETECTION & STATUS EFFECTS
  // ----------------------------------------------------------------------
  public applyStatusEffect(enemy: EnemyActor, type: StatusType, duration: number, power: number = 20) {
    // Check if status is already present
    const existing = enemy.statuses.find((s) => s.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
    } else {
      enemy.statuses.push(createStatusEffect(type, duration, power));
    }
  }

  private checkMeleeHits(x: number, z: number, radius: number, rawDamage: number, isHeavy: boolean) {
    let hitAny = false;
    const relicPerks = aggregateRelicBonuses(this.relics.map((r) => r.id));

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;
      const dist = Math.hypot(enemy.x - x, enemy.z - z);
      if (dist <= radius + 0.6) {
        hitAny = true;
        const isCrit = Math.random() < this.playerStats.critChance;
        const totalDamage = isCrit ? rawDamage * this.playerStats.critMultiplier : rawDamage;

        // Apply Status Effects from Relics
        if (relicPerks.hasBurnOnHit) {
          this.applyStatusEffect(enemy, 'burn', 3.0, 15);
        }
        if (relicPerks.hasFreezeOnHit && isCrit) {
          this.applyStatusEffect(enemy, 'freeze', 2.0);
        }
        if (relicPerks.hasVampiricCrit && isCrit) {
          this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 8);
          this.spawnDamageNumber(this.playerX, 1.4, this.playerZ, 8, false, false, true); // Green heal
        }

        this.damageEnemy(enemy, totalDamage, isCrit, isHeavy);
      }
    }

    if (hitAny) {
      soundEngine.playHit(isHeavy);
      this.arena.addCameraShake(isHeavy ? 0.35 : 0.15);
      if (isHeavy) this.hitstopTimer = 0.04;
    }
  }

  private checkBreakableHits(x: number, z: number, radius: number) {
    for (let i = this.breakables.length - 1; i >= 0; i--) {
      const prop = this.breakables[i];
      const dist = Math.hypot(prop.x - x, prop.z - z);
      if (dist <= radius + 0.8) {
        soundEngine.playHit(true);

        if (prop.id === 9001 || prop.id === 9002) {
          const isCrit = Math.random() < this.playerStats.critChance;
          const dmg = Math.round(
            isCrit ? this.playerStats.attackPower * this.playerStats.critMultiplier : this.playerStats.attackPower * (1.0 + Math.random() * 0.4)
          );
          this.spawnDamageNumber(prop.x, 1.5, prop.z, dmg, isCrit);
          this.arena.addCameraShake(0.16);

          if (prop.mesh) {
            prop.mesh.rotation.z = (Math.random() - 0.5) * 0.3;
            setTimeout(() => {
              if (prop.mesh) prop.mesh.rotation.z = 0;
            }, 100);
          }
          continue;
        }

        if (prop.mesh) {
          this.arena.breakablesGroup.remove(prop.mesh);
        }
        if (Math.random() > 0.4) {
          const goldAmount = this.isLevelRun && levelSystem.run
            ? levelSystem.getGoldPerBreakable(levelSystem.run.stage.stageId)
            : 20 + Math.floor(Math.random() * 20);
          this.spawnGroundItem('gold', prop.x, prop.z, goldAmount);
        } else {
          this.spawnGroundItem('potion', prop.x, prop.z);
        }
        this.breakables.splice(i, 1);
      }
    }
  }

  public damageEnemy(enemy: EnemyActor, amount: number, isCrit: boolean, isHeavy: boolean) {
    if (enemy.state === 'dead') return;
    const finalDamage = this.oneHitMode
      ? enemy.hp
      : Math.max(1, Math.round(amount * this.getConditionalDamageMultiplier()));
    const dealtDamage = Math.min(enemy.hp, finalDamage);
    if (enemy.isHappyBoss) enemy.lastHitDamage = Math.max(1, dealtDamage);
    enemy.hp = Math.max(0, enemy.hp - finalDamage);
    enemy.state = 'hurt';
    enemy.stateTimer = 0.18;

    const angle = Math.atan2(enemy.z - this.playerZ, enemy.x - this.playerX);
    const force = isHeavy ? 12 : 5;
    enemy.vx = Math.cos(angle) * force;
    enemy.vz = Math.sin(angle) * force;

    this.spawnDamageNumber(enemy.x, 1.2, enemy.z, dealtDamage, isCrit);
    this.arena.spawnHitImpactVFX(enemy.x, 0.92, enemy.z, isCrit, isHeavy, 0xef4458);
    // A touch of camera kick on crits (skipped during the ultimate, which has its own choreography).
    if (isCrit && !this.ginzoUltimateSequence) this.arena.addCameraShake(0.07);

    this.applyEquipmentStatusOnHit(enemy);
    if (isCrit) this.handleEquipmentCritical();
    if (this.playerStats.lifesteal > 0 && dealtDamage > 0) {
      const healed = dealtDamage * this.playerStats.lifesteal;
      const priorHp = this.playerStats.hp;
      this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + healed);
      if (this.playerStats.hp > priorHp) {
        this.spawnDamageNumber(this.playerX, 1.35, this.playerZ, this.playerStats.hp - priorHp, false, false, true);
      }
    }

    const hpRatio = enemy.hp / enemy.maxHp;
    enemy.hpBarFill.scale.x = Math.max(0.001, hpRatio);
    enemy.hpBarFill.position.x = -(1 - hpRatio) * ((enemy.hpBarWidth ?? 1.2) / 2);

    if (enemy.hp <= 0) this.handleEnemyDeath(enemy);
  }

  private handleEnemyDeath(enemy: EnemyActor) {
    if (enemy.state === 'dead') return;
    enemy.state = 'dead';
    const combatTarget = this.combatTargets.get(enemy);
    if (combatTarget) combatTarget.alive = false;
    enemy.hpBarGroup.visible = false;
    this.arena.actorsGroup.remove(enemy.hpBarGroup);
    this.playerStats.kills++;
    this.playerStats.comboCount++;
    this.playerStats.comboTimer = 3.5;
    this.triggerEquipmentKillEffects();

    if (!this.isLevelRun) {
      const goldAmount = 25 + Math.floor(Math.random() * 25);
      this.spawnGroundItem('gold', enemy.x, enemy.z, goldAmount);
    }

    setTimeout(() => {
      this.arena.actorsGroup.remove(enemy.mesh);
      this.arena.actorsGroup.remove(enemy.shadowMesh);
      this.arena.actorsGroup.remove(enemy.hpBarGroup);
      const idx = this.enemies.indexOf(enemy);
      if (idx !== -1) this.enemies.splice(idx, 1);
      this.checkWaveProgress();
    }, 180);
  }

  public damagePlayer(amount: number) {
    if (this.isInvulnerable) return;

    if (Math.random() < this.playerStats.dodgeChance) {
      this.arena.spawnSkillBurst(this.playerX, 0.8, this.playerZ, 0x93c5fd, 10, 1.8, 0.3);
      this.arena.addCameraShake(0.04);
      this.triggerEquipmentDodgeEffects();
      return;
    }

    // Apply Armor & Mitigation pure rules
    const totalReduction = Math.min(0.75, this.playerStats.damageReduction + this.temporaryDamageReduction);
    const reducedDamage = amount * (1 - totalReduction);
    const permanentShieldBeforeHit = Math.max(0, this.playerStats.shield - this.temporaryGuardShield);
    const mitigation = applyArmorMitigation(reducedDamage, this.playerStats.shield, this.playerStats.hp, this.playerStats.defense);
    const temporaryShieldSpent = Math.max(0, mitigation.shieldDamage - permanentShieldBeforeHit);
    this.temporaryGuardShield = Math.max(0, this.temporaryGuardShield - temporaryShieldSpent);
    this.playerStats.shield = mitigation.remainingShield;
    this.temporaryGuardShield = Math.min(this.temporaryGuardShield, this.playerStats.shield);
    this.playerStats.hp = mitigation.remainingHp;
    this.shieldRechargeDelay = 2.5; // Delay before shield starts regenerating

    soundEngine.playPlayerHurt();
    this.arena.addCameraShake(0.4);
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.5;
    this.animState = 'hurt';

    this.spawnDamageNumber(this.playerX, 1.2, this.playerZ, mitigation.shieldDamage + mitigation.healthDamage, false, true);
    this.triggerEquipmentHitEffects();
    this.tryEquipmentCoffinRevive();
    this.triggerLowHealthShield();

    if (this.playerStats.hp <= 0) {
      this.animState = 'dead';
      if (this.onGameOver) this.onGameOver(false);
    }
  }

  public spawnDamageNumber(
    x: number,
    y: number,
    z: number,
    amount: number,
    isCrit: boolean,
    isPlayer: boolean = false,
    isHeal: boolean = false
  ) {
    const item: DamageNumberItem = {
      id: Math.random(),
      text: isHeal ? `+${Math.round(amount)} HP` : `${Math.round(amount)}`,
      x: x + (Math.random() - 0.5) * 0.4,
      y: y + 1.2,
      z: z + (Math.random() - 0.5) * 0.4,
      color: isHeal ? '#22c55e' : isPlayer ? '#ef4444' : isCrit ? '#facc15' : '#60e35a',
      scale: isCrit ? 1.4 : 1.0,
      life: 0.75,
      maxLife: 0.75,
      vx: (Math.random() - 0.5) * 1.8,
      vy: 2.8,
      vz: (Math.random() - 0.5) * 1.8,
      isCrit,
    };
    this.damageNumbers.push(item);
  }

  public spawnGroundItem(type: 'gold' | 'potion' | 'relic', x: number, z: number, amount: number = 10, relic?: RelicItem) {
    const item: GroundItem = {
      id: Math.random(),
      type,
      x,
      z,
      amount,
      relic,
      bobTimer: Math.random() * Math.PI,
    };
    this.groundItems.push(item);

    const tex = type === 'gold' ? this.coinTex : this.potionTex;
    const geo = new THREE.PlaneGeometry(0.9, 0.9);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.6, z);
    (mesh as any).itemData = item;
    this.arena.vfxGroup.add(mesh);
  }

  private checkWaveProgress() {
    if (this.enemies.length === 0 && this.waveState === 'fighting') {
      if (this.isLevelRun && levelSystem.run) {
        const run = levelSystem.run;
        const currentRoomType = levelSystem.getCurrentRoomType();
        if (currentRoomType === 'boss' && !this.bossSummonedForRoom) return;

        // Check if there are more waves in this combat or elite room
        if (
          (currentRoomType === 'combat' || currentRoomType === 'elite') &&
          this.currentRoomWave < this.totalRoomWaves
        ) {
          this.currentRoomWave++;
          soundEngine.playRoomClear();
          setTimeout(() => {
            this.spawnLevelCombatWave(this.currentRoomWave, currentRoomType === 'elite');
          }, 800);
          return;
        }

        // Room is now fully cleared!
        this.waveState = 'cleared';
        if (!run.stage.clearedRoomIndices.includes(run.stage.currentRoomIndex)) {
          run.stage.clearedRoomIndices.push(run.stage.currentRoomIndex);
        }
        soundEngine.playRoomClear();
        this.arena.setPortalActive(currentRoomType === 'exit');

        if (currentRoomType === 'combat' || currentRoomType === 'elite') {
          this.spawnRoomRewardChest();
        } else if (currentRoomType === 'boss') {
          // Boss clear is a short victory cutscene, then the next stage loads automatically.
          soundEngine.playBossGong();
          this.playerStats.gold += 100;
          this.arena.addCameraShake(0.7);
          this.arena.spawnSkillBurst(0, 0.9, -1.2, 0xfbbf24, 34, 7.2, 0.9);
          this.stageAdvanceTransitionTimer = 2.0;
          this.onCinematicTransition?.('ผู้พิทักษ์พ่ายแพ้', 'มิติถัดไปกำลังปรากฏขึ้น · ได้รับ 100 G', 2600);
        } else if (currentRoomType === 'secret' && run.stage.hasSecretBoss) {
          run.stage.secretBossDefeated = true;
          soundEngine.playBossGong();
          this.spawnRoomRewardChest('themed');
        }
        return;
      }

      this.waveState = 'cleared';
      soundEngine.playRoomClear();
      this.arena.setPortalActive(true);

      const mapCfg = DUNGEON_MAPS.find((m) => m.id === this.currentDungeonMap);
      const totalWaves = mapCfg ? mapCfg.waves : 3;

      if (this.currentWave < totalWaves) {
        // Offer Roguelike Relic Choice on clearing intermediate wave!
        const unowned = ALL_RELICS.filter((r) => !this.relics.some((owned) => owned.id === r.id));
        const pool = unowned.length >= 3 ? unowned : ALL_RELICS;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        this.relicChoices = shuffled.slice(0, 3);
        if (this.onOpenModal) {
          setTimeout(() => {
            this.onOpenModal?.('relic_choice');
          }, 350);
        }
      } else {
        // Boss wave cleared!
        if (this.isRandomExpedition && this.expeditionIndex < this.expeditionSequence.length - 1) {
          // Advance to next expedition biome!
          this.expeditionIndex++;
          const nextBiome = this.expeditionSequence[this.expeditionIndex];
          setTimeout(() => {
            this.enterDungeon(nextBiome);
          }, 1400);
        } else {
          // Conquered all waves / expedition!
          setTimeout(() => {
            if (this.onGameOver) this.onGameOver(true);
          }, 1200);
        }
      }
    }
  }

  private updateGinzoUltimate(dt: number) {
    const sequence = this.ginzoUltimateSequence;
    this.ginzoUltimateFlashTimer = Math.max(0, this.ginzoUltimateFlashTimer - dt);
    if (!sequence) {
      this.ginzoUltimateTimer = 0;
      return;
    }
    if (!this.hasAwakenedKit()) {
      this.ginzoUltimateSequence = null;
      this.ginzoUltimatePath = null;
      this.ginzoUltimateTimer = 0;
      this.actionAnimationState = null;
      this.actionAnimationTimer = 0;
      this.playerVx = 0;
      this.playerVz = 0;
      return;
    }

    sequence.elapsed += dt;
    this.ginzoUltimateTimer = sequence.elapsed;

    // Dash at 1.05s, leaving a bright line and afterimages.
    if (!sequence.dashed && sequence.elapsed >= 1.05) {
      sequence.dashed = true;
      this.playerX = sequence.endX;
      this.playerZ = sequence.endZ;
      for (let ghostIndex = 0; ghostIndex < 7; ghostIndex++) {
        const ghostT = ghostIndex / 6;
        this.spawnGhostTrail(
          THREE.MathUtils.lerp(sequence.startX, sequence.endX, ghostT),
          THREE.MathUtils.lerp(sequence.startZ, sequence.endZ, ghostT),
          0.42 - ghostT * 0.16,
          this.heroActionFacing
        );
      }
      this.playerVx = 0;
      this.playerVz = 0;
      this.ginzoUltimateFlashTimer = 0.3;
      this.arena.spawnZeroFrameSeveranceVFX(sequence.startX, sequence.startZ, sequence.endX, sequence.endZ);
      this.arena.spawnCrimsonUltimateHitVFX(sequence.startX, sequence.startZ, sequence.angle, false);
      this.arena.spawnCrimsonUltimateHitVFX(sequence.endX, sequence.endZ, sequence.angle, true);
      for (let i = 1; i < 7; i++) {
        const t = i / 7;
        const x = THREE.MathUtils.lerp(sequence.startX, sequence.endX, t);
        const z = THREE.MathUtils.lerp(sequence.startZ, sequence.endZ, t);
        this.arena.spawnKatanaArcVFX(
          x, z, sequence.angle + (i % 2 ? -0.35 : 0.35),
          1.05 + t * 0.4, i % 2 ? 0xf43f5e : 0xfff1f2
        );
      }
      this.arena.addCameraShake(0.55);
      soundEngine.playKatanaSlash();
    }

    // Twelve hits, 80ms apart, each clipping all enemies along the dash lane.
    while (sequence.dashed && sequence.hits < 12 &&
      sequence.elapsed >= 1.05 + (sequence.hits + 1) * 0.08) {
      const hitIndex = sequence.hits;
      const finalCut = hitIndex === 11;
      const t = (hitIndex + 1) / 12;
      const hitX = THREE.MathUtils.lerp(sequence.startX, sequence.endX, t);
      const hitZ = THREE.MathUtils.lerp(sequence.startZ, sequence.endZ, t);
      const slashAngle = sequence.angle + (hitIndex % 2 === 0 ? -0.58 : 0.58);

      this.arena.spawnCrimsonUltimateHitVFX(hitX, hitZ, slashAngle, finalCut);
      if (finalCut) {
        this.ginzoUltimateFlashTimer = 0.16;
        this.arena.spawnZeroFrameSeveranceVFX(
          hitX - Math.cos(sequence.angle) * 3.1,
          hitZ - Math.sin(sequence.angle) * 3.1,
          hitX + Math.cos(sequence.angle) * 3.1,
          hitZ + Math.sin(sequence.angle) * 3.1
        );
        this.arena.addCameraShake(0.8);
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
        soundEngine.playBossGong();
      } else if (hitIndex === 3 || hitIndex === 7) {
        soundEngine.playKatanaSlash();
      }

      const dx = sequence.endX - sequence.startX;
      const dz = sequence.endZ - sequence.startZ;
      const lengthSq = Math.max(0.001, dx * dx + dz * dz);
      for (const enemy of this.enemies) {
        if (enemy.state === 'dead') continue;
        const projectedT = THREE.MathUtils.clamp(
          ((enemy.x - sequence.startX) * dx + (enemy.z - sequence.startZ) * dz) / lengthSq,
          0, 1
        );
        const closestX = sequence.startX + dx * projectedT;
        const closestZ = sequence.startZ + dz * projectedT;
        const distanceFromCut = Math.hypot(enemy.x - closestX, enemy.z - closestZ);
        if (distanceFromCut > (finalCut ? 3.0 : 2.55)) continue;

        const isCrit = finalCut
          ? Math.random() < Math.min(1, this.playerStats.critChance + 0.3)
          : Math.random() < this.playerStats.critChance;
        this.damageEnemy(
          enemy,
          Math.max(1, Math.round(sequence.rawDamage * (finalCut ? 1.25 : 0.45))),
          isCrit,
          true
        );
        if (finalCut && enemy.state !== 'dead') {
          this.applyStatusEffect(enemy, 'bleed', 4.5, 45);
          this.applyStatusEffect(enemy, 'stun', 0.85);
          enemy.vx += Math.cos(sequence.angle) * 8;
          enemy.vz += Math.sin(sequence.angle) * 8;
        }
      }
      sequence.hits++;
      this.onStateChange?.();
    }

    if (sequence.elapsed >= 2.5) {
      this.ginzoUltimateSequence = null;
      this.ginzoUltimatePath = null;
      this.ginzoUltimateTimer = 0;
      this.actionAnimationState = null;
      this.actionAnimationTimer = 0;
      this.playerVx = 0;
      this.playerVz = 0;
      this.animState = 'idle';
      this.onStateChange?.();
    }
  }

  // ----------------------------------------------------------------------
  // 60FPS SIMULATION TICK
  // ----------------------------------------------------------------------
  public update(dt: number, moveX: number, moveZ: number) {
    if (this.stageAdvanceTransitionTimer > 0) {
      this.stageAdvanceTransitionTimer = Math.max(0, this.stageAdvanceTransitionTimer - dt);
      if (this.stageAdvanceTransitionTimer === 0) this.advanceLevelStage();
      return;
    }

    if (this.bossStageTransitionTimer > 0) {
      this.bossStageTransitionTimer = Math.max(0, this.bossStageTransitionTimer - dt);
      if (this.bossStageTransitionTimer === 0) {
        const run = levelSystem.run;
        if (!run) return;
        const stage = run.stage;
        const bossIndex = stage.roomGraph.findIndex((node) => node.type === 'boss');
        if (bossIndex < 0) {
          this.pendingBossStageTransition = false;
          this.waveState = 'cleared';
          return;
        }
        if (stage.currentRoomIndex !== bossIndex) {
          if (!stage.clearedRoomIndices.includes(stage.currentRoomIndex)) {
            stage.clearedRoomIndices.push(stage.currentRoomIndex);
          }
          stage.currentRoomIndex = bossIndex;
          if (!stage.visitedRoomIndices.includes(bossIndex)) stage.visitedRoomIndices.push(bossIndex);
        }
        stage.entrySide = null;
        this.pendingBossStageTransition = true;
        this.loadLevelRoom('boss');
        this.arena.addCameraShake(0.35);
      }
      return;
    }

    if (this.bossIntroTimer > 0) {
      this.bossIntroTimer = Math.max(0, this.bossIntroTimer - dt);
      const boss = this.currentBoss;
      if (boss && boss.state !== 'dead') {
        const progress = 1 - this.bossIntroTimer / this.bossIntroDuration;
        const eased = progress * progress * (3 - 2 * progress);
        boss.mesh.scale.setScalar(Math.max(0.03, eased));
        const bossMaterial = boss.mesh.material;
        if (bossMaterial instanceof THREE.MeshBasicMaterial) bossMaterial.opacity = Math.min(1, 0.02 + eased * 0.98);
        boss.mesh.position.y = 1.8 + (1 - eased) * 1.25;
        const shadowMaterial = boss.shadowMesh.material;
        if (shadowMaterial instanceof THREE.MeshBasicMaterial) shadowMaterial.opacity = eased * 0.65;
        boss.hpBarGroup.visible = this.bossIntroTimer === 0;
      }
      if (this.bossIntroTimer === 0 && boss && boss.state !== 'dead') {
        soundEngine.playBossGong();
        this.arena.addCameraShake(0.5);
        this.arena.spawnSkillBurst(boss.x, 0.8, boss.z, 0x6ee7e8, 22, 5.8, 0.72);
      }
      return;
    }
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.updateGinzoUltimate(dt);

    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.noSkillCooldown) {
      this.skillCooldowns[1] = 0;
      this.skillCooldowns[2] = 0;
      this.skillCooldowns[3] = 0;
      this.skillCooldowns[4] = 0;
    } else {
      this.skillCooldowns[1] = Math.max(0, (this.skillCooldowns[1] ?? 0) - dt);
    this.skillCooldowns[2] = Math.max(0, (this.skillCooldowns[2] ?? 0) - dt);
    this.skillCooldowns[3] = Math.max(0, (this.skillCooldowns[3] ?? 0) - dt);
      this.skillCooldowns[4] = Math.max(0, (this.skillCooldowns[4] ?? 0) - dt);
    }
    if (this.temporaryAttackSpeedTimer > 0) {
      this.temporaryAttackSpeedTimer = Math.max(0, this.temporaryAttackSpeedTimer - dt);
      if (this.temporaryAttackSpeedTimer === 0) this.temporaryAttackSpeedBonus = 0;
    }
    if (this.temporaryGuardShieldTimer > 0) {
      this.temporaryGuardShieldTimer = Math.max(0, this.temporaryGuardShieldTimer - dt);
      if (this.temporaryGuardShieldTimer === 0) {
        this.playerStats.shield = Math.max(0, this.playerStats.shield - this.temporaryGuardShield);
        this.temporaryGuardShield = 0;
      }
    }
    if (this.temporaryDamageReductionTimer > 0) {
      this.temporaryDamageReductionTimer = Math.max(0, this.temporaryDamageReductionTimer - dt);
      if (this.temporaryDamageReductionTimer === 0) this.temporaryDamageReduction = 0;
    }
    if (this.critSpeedTimer > 0) {
      this.critSpeedTimer = Math.max(0, this.critSpeedTimer - dt);
      if (this.critSpeedTimer === 0) this.critSpeedStacks = 0;
    }
    if (this.fullHpDamageLockoutTimer > 0) {
      this.fullHpDamageLockoutTimer = Math.max(0, this.fullHpDamageLockoutTimer - dt);
    }

    if (this.playerStats.hpRegen > 0 && this.playerStats.hp < this.playerStats.maxHp) {
      this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + this.playerStats.hpRegen * dt);
    }
    this.triggerLowHealthShield();

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) this.isInvulnerable = false;
    }

    // Shield (Armor) recharge after delay
    if (this.shieldRechargeDelay > 0) {
      this.shieldRechargeDelay -= dt;
    } else if (this.playerStats.shield < this.playerStats.maxShield) {
      this.playerStats.shield = Math.min(this.playerStats.maxShield, this.playerStats.shield + 8 * dt);
    }

    if (!this.ginzoUltimateSequence) {
      this.playerCombat.update(dt, this.getCombatTargets());
      this.comboStep = this.playerCombat.comboStep;
      this.comboWindowTimer = this.playerCombat.comboWindowLeft;
      this.isAttacking = this.playerCombat.isAttacking;
    } else {
      this.isAttacking = false;
    }

    // Keep directional skill poses alive long enough for the full arm/weapon follow-through.
    if (this.actionAnimationTimer > 0) {
      this.actionAnimationTimer = Math.max(0, this.actionAnimationTimer - dt);
      if (this.actionAnimationTimer > 0 && this.actionAnimationState) {
        this.animState = this.actionAnimationState;
      } else {
        this.actionAnimationState = null;
      }
    }

    // Lock movement and other actions for the entire ultimate charge / hit sequence.
    if (this.ginzoUltimateSequence) {
      this.playerVx = 0;
      this.playerVz = 0;
    // Player movement scaled by Movement Speed stat
    } else if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.animState = 'idle';
      }
    } else {
      const targetSpeed = this.playerStats.moveSpeed;
      if (moveX !== 0 || moveZ !== 0) {
        const len = Math.hypot(moveX, moveZ);
        this.playerVx = (moveX / len) * targetSpeed;
        this.playerVz = (moveZ / len) * targetSpeed;
        if (!this.isAttacking && !this.actionAnimationState) this.animState = 'run';
      } else {
        this.playerVx *= Math.exp(-14 * dt);
        this.playerVz *= Math.exp(-14 * dt);
        if (!this.isAttacking && !this.actionAnimationState && Math.abs(this.playerVx) < 0.2 && Math.abs(this.playerVz) < 0.2) {
          this.animState = 'idle';
        }
      }
    }

    this.playerX += this.playerVx * dt;
    this.playerZ += this.playerVz * dt;
    const wallInset = this.currentMode === 'dungeon' ? 1.0 : 0;
    this.playerX = THREE.MathUtils.clamp(this.playerX, this.arena.bounds.minX + wallInset, this.arena.bounds.maxX - wallInset);
    this.playerZ = THREE.MathUtils.clamp(this.playerZ, this.arena.bounds.minZ + wallInset, this.arena.bounds.maxZ - wallInset);

    // Procedural body motion on top of the 12 pose drawings. Each state yields target
    // values (bob, lean, squash/stretch, lunge) that are eased toward every frame, so
    // changing state blends smoothly instead of snapping.
    const motionPhase = (this.animFrame / 12) * Math.PI * 2;
    const runBob = Math.abs(Math.sin(motionPhase * 2));
    const actionPose = this.animState.startsWith('attack');
    const visualAimAngle = actionPose ? this.heroActionAimAngle : this.playerAimAngle;
    const visualFacing = actionPose ? this.heroActionFacing : this.playerFacing;
    const speedRatio = THREE.MathUtils.clamp(
      Math.hypot(this.playerVx, this.playerVz) / Math.max(1, this.playerStats.moveSpeed), 0, 1
    );
    const smooth = (t: number) => t * t * (3 - 2 * t);

    let tBobY = 0;
    let tTilt = 0; // positive = lean forward (resolved against facing below)
    let tSY = 1;
    let tSX = 1;
    let tLunge = 0;

    if (this.isDashing || this.animState === 'dash') {
      tBobY = 0.03;
      tTilt = 0.2;
      tSY = 0.91;
      tSX = 1.15;
    } else if (actionPose) {
      // anticipation -> strike -> recovery, driven by the action timer when there is one
      const progress = this.actionAnimationTimer > 0 && this.actionAnimationDuration > 0
        ? 1 - this.actionAnimationTimer / this.actionAnimationDuration
        : Math.min(1, this.animFrame / 11);
      const power = this.animState === 'attack3' || this.animState === 'attack4' ? 1.45 : 1;
      if (progress < 0.22) {
        const k = smooth(progress / 0.22);
        tSY = 1 - 0.07 * power * k;
        tSX = 1 + 0.05 * power * k;
        tTilt = -0.06 * power * k;
        tBobY = -0.03 * power * k;
      } else if (progress < 0.5) {
        const k = smooth((progress - 0.22) / 0.28);
        tSY = 1 - 0.07 * power + 0.16 * power * k;
        tSX = 1 + 0.05 * power - 0.1 * power * k;
        tTilt = -0.06 * power + 0.24 * power * k;
        tBobY = -0.03 * power + 0.08 * power * k;
        tLunge = 0.3 * power * k;
      } else {
        const k = smooth((progress - 0.5) / 0.5);
        tSY = 1 + 0.09 * power * (1 - k);
        tSX = 1 - 0.05 * power * (1 - k);
        tTilt = 0.18 * power * (1 - k);
        tBobY = 0.05 * power * (1 - k);
        tLunge = 0.3 * power * (1 - k);
      }
    } else if (this.animState === 'hurt') {
      tSY = 0.9;
      tSX = 1.08;
      tTilt = -0.14; // recoil backwards
      tLunge = -0.08;
    } else if (this.animState === 'run') {
      const dirLean = THREE.MathUtils.clamp(this.playerVx / Math.max(1, this.playerStats.moveSpeed), -1, 1);
      tBobY = runBob * 0.075 * speedRatio;
      tTilt = 0.05 * speedRatio + Math.sin(motionPhase) * 0.02 * speedRatio;
      tSY = 0.975 + runBob * 0.05 * speedRatio + (1 - speedRatio) * 0.025;
      tSX = 1.02 - runBob * 0.03 * speedRatio;
      // extra world-space lean in the travel direction
      tTilt += Math.abs(dirLean) * 0.03;
    } else {
      const breath = Math.sin(motionPhase * 0.5);
      tBobY = breath * 0.02;
      tTilt = 0.01 + Math.sin(motionPhase * 0.5 + 0.35) * 0.008;
      tSY = 1 + breath * 0.022;
      tSX = 1 - breath * 0.012;
    }

    const vis = this.heroVisual;
    const rate = actionPose || this.animState === 'hurt' || this.isDashing ? 34 : 16;
    const ease = 1 - Math.exp(-dt * rate);
    vis.bobY += (tBobY - vis.bobY) * ease;
    vis.tilt += (tTilt - vis.tilt) * ease;
    vis.sy += (tSY - vis.sy) * ease;
    vis.sx += (tSX - vis.sx) * ease;
    vis.lunge += (tLunge - vis.lunge) * ease;

    // Keep the feet planted: scaling around the plane's centre would float them.
    const feetLift = (vis.sy - 1) * 1.4;
    const lungeX = Math.cos(visualAimAngle) * vis.lunge;
    const lungeZ = Math.sin(visualAimAngle) * vis.lunge;
    this.heroMesh.position.set(
      this.playerX + lungeX,
      1.4 + vis.bobY + feetLift * Math.cos(0.58),
      this.playerZ + lungeZ - feetLift * Math.sin(0.58)
    );
    this.heroMesh.rotation.x = -0.58;
    this.heroMesh.rotation.y = THREE.MathUtils.clamp(Math.sin(visualAimAngle) * 0.075, -0.075, 0.075);
    // forward lean follows facing: leaning right is a clockwise (negative z) rotation
    this.heroMesh.rotation.z = -visualFacing * vis.tilt;
    const shadowSpread = THREE.MathUtils.clamp(1 - vis.bobY * 1.6 + (vis.sx - 1) * 0.9, 0.8, 1.35);
    this.heroShadowMesh.position.set(this.playerX + lungeX * 0.6, 0.02, this.playerZ + lungeZ * 0.6);
    this.heroShadowMesh.scale.set(shadowSpread, 1, shadowSpread);
    this.heroMesh.scale.set(visualFacing * vis.sx, vis.sy, 1);

    // Twelve pose drawings cycled at 25 FPS, giving the arms and legs a much
    // smoother gait and sword follow-through than the old four-frame animation.
    this.animTimer += dt;
    if (this.animTimer >= 1 / 25) {
      this.animTimer %= 1 / 25;
      this.animFrame = (this.animFrame + 1) % 12;
      this.updateHeroTexture();
    }

    // Ghost trails update
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      const g = this.ghostTrails[i];
      g.opacity -= dt * 2.5;
      if (g.opacity <= 0) {
        this.arena.vfxGroup.remove(g.mesh);
        g.mesh.geometry.dispose();
        (g.mesh.material as THREE.Material).dispose();
        this.ghostTrails.splice(i, 1);
      } else {
        (g.mesh.material as THREE.MeshBasicMaterial).opacity = g.opacity;
      }
    }

    if (this.isDashing) {
      this.dashTrailTimer -= dt;
      if (this.dashTrailTimer <= 0) {
        this.spawnGhostTrail();
        this.dashTrailTimer = 0.055;
      }
    }

    this.updateProjectiles(dt);
    this.updateDamageNumbers(dt);

    if (this.currentMode === 'lobby') {
      this.checkLobbyInteractions();
    } else {
      this.updateEnemies(dt);
      this.updateGroundItems(dt);
      this.checkDungeonInteractions();
      this.checkDungeonPortal();
    }

    if (this.onStateChange) this.onStateChange();
  }

  private checkLobbyInteractions() {
    let nextInteract: 'trainer' | 'gate' | null = null;

    const distTrainer = Math.hypot(this.playerX - 8, this.playerZ + 4);
    if (distTrainer < 3.2) nextInteract = 'trainer';

    const distGate = Math.hypot(this.playerX - 0, this.playerZ - (-7.2));
    const inGateThreshold = Math.abs(this.playerX) <= 2.8 && this.playerZ <= -5.5;

    if (distGate < 3.4 || inGateThreshold) nextInteract = 'gate';

    this.nearbyInteractable = nextInteract;
  }

  private checkDungeonInteractions() {
    let nextInteract: DungeonInteractableType | null = null;

    if (this.isLevelRun && levelSystem.run) {
      const stage = levelSystem.run.stage;
      const roomType = levelSystem.getCurrentRoomType();

      if ((roomType === 'altar' && !this.bossSummonedForRoom && this.waveState === 'cleared') ||
          (roomType === 'boss' && !this.bossSummonedForRoom && this.waveState === 'fighting')) {
        const altarDistance = Math.hypot(this.playerX, this.playerZ - (-1.2));
        if (altarDistance < 3.6) {
          this.nearbyDungeonInteractable = 'boss_altar';
          return;
        }
      }

      // Check Chest interaction
      const chestState = this.getCurrentLevelChestState();
      const chestRoomCleared = ['combat', 'elite', 'boss', 'secret'].includes(roomType) && this.waveState === 'cleared';
      const chestIsAvailable = roomType === 'chest' || chestRoomCleared;
      if (chestIsAvailable && chestState && !chestState.opened) {
        const distChest = Math.hypot(this.playerX - 0, this.playerZ - (-1.5));
        if (distChest < 3.2) {
          this.nearbyDungeonInteractable = 'chest';
          return;
        }
      }

      // Check Forge interaction
      if (roomType === 'forge') {
        const distForge = Math.hypot(this.playerX - 0, this.playerZ - (-1.5));
        if (distForge < 3.2) {
          this.nearbyDungeonInteractable = 'forge';
          return;
        }
      }

      // Check Stage Shop interaction
      if (roomType === 'shop') {
        this.nearbyShopItemIndex = null;
        const happyWasProvoked = stage.happyProvokedRoomIndices.includes(stage.currentRoomIndex);
        if (!happyWasProvoked && this.waveState !== 'fighting') {
          const distHappy = Math.hypot(this.playerX, this.playerZ - (-5.4));
          if (distHappy < 2.7) {
            this.nearbyDungeonInteractable = 'happy_merchant';
            return;
          }
          const offers = levelSystem.getShopOffersForRoom(stage.currentRoomIndex);
          const standXs = [-7, 0, 7];
          let closestItemIndex: number | null = null;
          let closestItemDistance = 2.0;
          for (let index = 0; index < offers.length && index < standXs.length; index++) {
            const offer = offers[index];
            if (offer.purchased) continue;
            const distance = Math.hypot(this.playerX - standXs[index], this.playerZ - (-0.2));
            if (distance < closestItemDistance) {
              closestItemIndex = index;
              closestItemDistance = distance;
            }
          }
          if (closestItemIndex !== null) {
            this.nearbyShopItemIndex = closestItemIndex;
            this.nearbyDungeonInteractable = 'shop_item';
            return;
          }
        }
      }

      // The final room's gate is an E-only interaction that begins the next floor.
      if (roomType === 'exit' && this.waveState === 'cleared' && this.arena.isPortalActive) {
        const portalZ = -2.8;
        const distGate = Math.hypot(this.playerX, this.playerZ - portalZ);
        if (distGate < 3.4) {
          this.nearbyDungeonInteractable = 'portal';
          return;
        }
      }

      // Room routes are entered only by pressing E while standing beside a connected door.
      if (this.waveState === 'cleared' && !(roomType === 'altar' && !this.bossSummonedForRoom)) {
        const node = stage.roomGraph[stage.currentRoomIndex];
        const doors: Array<{ direction: RoomDirection; interactable: DungeonInteractableType; x: number; z: number }> = [
          { direction: 'north', interactable: 'door_north', x: 0, z: this.arena.bounds.minZ },
          { direction: 'west', interactable: 'door_west', x: this.arena.bounds.minX, z: 0 },
          { direction: 'east', interactable: 'door_east', x: this.arena.bounds.maxX, z: 0 },
          { direction: 'south', interactable: 'door_south', x: 0, z: this.arena.bounds.maxZ },
        ];
        let closestDoor: { interactable: DungeonInteractableType; distance: number } | null = null;
        for (const door of doors) {
          if (node?.connections[door.direction] === undefined) continue;
          const distance = Math.hypot(this.playerX - door.x, this.playerZ - door.z);
          if (distance < 2.7 && (!closestDoor || distance < closestDoor.distance)) {
            closestDoor = { interactable: door.interactable, distance };
          }
        }
        if (closestDoor) {
          this.nearbyDungeonInteractable = closestDoor.interactable;
          return;
        }
      }

      this.nearbyDungeonInteractable = null;
      return;
    }

    if (this.currentRoom === 'center') {
      // North door (to stat upgrade device room)
      const distNorth = Math.hypot(this.playerX - 0, this.playerZ - (-8.8));
      if (distNorth < 2.8 || (this.playerZ <= -8.2 && Math.abs(this.playerX) <= 3.2)) {
        nextInteract = 'door_north';
      }

      // West door (to equipment merchant room)
      const distWest = Math.hypot(this.playerX - (-15.5), this.playerZ - 0);
      if (distWest < 2.8 || (this.playerX <= -14.6 && Math.abs(this.playerZ) <= 3.2)) {
        nextInteract = 'door_west';
      }

      // East door (to healing pool & treasure room)
      const distEast = Math.hypot(this.playerX - 15.5, this.playerZ - 0);
      if (distEast < 2.8 || (this.playerX >= 14.6 && Math.abs(this.playerZ) <= 3.2)) {
        nextInteract = 'door_east';
      }
    } else if (this.currentRoom === 'north') {
      // Stat device pedestal at (0, -1.5)
      const distDevice = Math.hypot(this.playerX - 0, this.playerZ - (-1.5));
      if (distDevice < 3.2) {
        nextInteract = 'stat_device';
      }

      // South door back to center at (0, 7.0)
      const distSouth = Math.hypot(this.playerX - 0, this.playerZ - 6.6);
      if (distSouth < 2.8 || (this.playerZ >= 6.0 && Math.abs(this.playerX) <= 3.0)) {
        nextInteract = 'door_center';
      }
    } else if (this.currentRoom === 'west') {
      // Equipment merchant pedestal at (0, -1.5)
      const distMerchant = Math.hypot(this.playerX - 0, this.playerZ - (-1.5));
      if (distMerchant < 3.2) {
        nextInteract = 'equipment_merchant';
      }

      // East door back to center at (12.5, 0)
      const distEast = Math.hypot(this.playerX - 11.8, this.playerZ - 0);
      if (distEast < 2.8 || (this.playerX >= 11.0 && Math.abs(this.playerZ) <= 3.0)) {
        nextInteract = 'door_center';
      }
    } else if (this.currentRoom === 'east') {
      // Healing pool at (0, -1.5)
      const distPool = Math.hypot(this.playerX - 0, this.playerZ - (-1.5));
      if (distPool < 3.2) {
        nextInteract = 'healing_pool';
      }

      // West door back to center at (-12.5, 0)
      const distWest = Math.hypot(this.playerX - (-11.8), this.playerZ - 0);
      if (distWest < 2.8 || (this.playerX <= -11.0 && Math.abs(this.playerZ) <= 3.0)) {
        nextInteract = 'door_center';
      }
    }

    this.nearbyDungeonInteractable = nextInteract;
  }

  private checkDungeonPortal() {
    if (this.waveState === 'cleared' && this.arena.isPortalActive) {
      const portalZ = this.isLevelRun ? -2.8 : -7.2;
      const dist = Math.hypot(this.playerX, this.playerZ - portalZ);
      if (dist < 3.4) this.nearbyDungeonInteractable = 'portal';
    }
  }

  private useDungeonPortal() {
    if (this.isLevelRun && levelSystem.run) {
      const currentRoom = levelSystem.getCurrentRoomType();
      if (currentRoom === 'exit' && this.waveState === 'cleared') this.advanceLevelStage();
      return;
    }
    if (this.waveState !== 'cleared' || !this.arena.isPortalActive) return;
    const mapCfg = DUNGEON_MAPS.find((map) => map.id === this.currentDungeonMap);
    const totalWaves = mapCfg ? mapCfg.waves : 3;
    if (this.currentWave < totalWaves) {
      this.playerX = 0;
      this.playerZ = 5.5;
      this.spawnDungeonWave(this.currentWave + 1);
      soundEngine.playRoomClear();
    } else if (this.onGameOver) {
      this.onGameOver(true);
    }
  }

  private getEnemySkillColor(type: string) {
    if (/(ice|snow|frost)/i.test(type)) return 0x38bdf8;
    if (/(fire|lava|forge|goblin|genie)/i.test(type)) return 0xf97316;
    if (/(ghost|shadow|crypt|blood|undead)/i.test(type)) return 0xa855f7;
    if (/(sky|wind|archer|bird|wisp|angel)/i.test(type)) return 0x22d3ee;
    return 0xef4444;
  }

  private getEnemySkillKind(type: string): NonNullable<EnemyActor['skillKind']> {
    if (/(archer|gunslinger|outlaw|inquisitor|frostmage)/i.test(type)) return 'volley';
    if (/(wisp|ghost|genie|phantom|drone|mage|angel|shadow)/i.test(type)) return 'bolt';
    return 'slam';
  }

  private beginEnemySkill(enemy: EnemyActor) {
    enemy.skillKind = this.getEnemySkillKind(enemy.type);
    enemy.skillColor = this.getEnemySkillColor(enemy.type);
    enemy.skillTargetX = this.playerX;
    enemy.skillTargetZ = this.playerZ;
    enemy.state = 'skill_windup';
    enemy.stateTimer = enemy.skillKind === 'volley' ? 0.92 : 0.78;
    enemy.bossActionName = enemy.skillKind === 'volley'
      ? 'ปล่อยพายุศรสามทาง'
      : enemy.skillKind === 'bolt'
        ? 'ชาร์จกระสุนอาคม'
        : 'สะสมพลังทุบพื้น';
    if (enemy.skillKind === 'volley') {
      this.arena.showEnemyVolleyTelegraph(enemy.x, enemy.z, enemy.skillTargetX, enemy.skillTargetZ, enemy.stateTimer, enemy.skillColor);
    } else if (enemy.skillKind === 'bolt') {
      this.arena.showDashTelegraph(enemy.x, enemy.z, enemy.skillTargetX, enemy.skillTargetZ, enemy.stateTimer, enemy.skillColor);
    } else {
      this.arena.showEnemySkillTelegraph(enemy.skillTargetX, enemy.skillTargetZ, 3.0, enemy.stateTimer, enemy.skillColor);
    }
    soundEngine.playTelegraph();
  }

  private launchEnemySkill(enemy: EnemyActor) {
    const targetX = enemy.skillTargetX ?? this.playerX;
    const targetZ = enemy.skillTargetZ ?? this.playerZ;
    const dx = targetX - enemy.x;
    const dz = targetZ - enemy.z;
    const distance = Math.max(0.6, Math.hypot(dx, dz));
    const angle = Math.atan2(dz, dx);
    const offsets = enemy.skillKind === 'volley' ? [-0.2, 0, 0.2] : [0];
    const scale = enemy.skillKind === 'volley' ? 0.42 : 0.68;

    offsets.forEach((offset) => {
      if (enemy.skillKind === 'volley') {
        this.arena.spawnEnemyArrowProjectileVFX(enemy.x, enemy.z, angle + offset, distance, enemy.skillColor ?? 0x22d3ee, scale * 1.7);
      } else {
        const style = /(fire|lava|forge|goblin|genie)/i.test(enemy.type) ? 'dragon' : 'orb';
        this.arena.spawnSkillProjectileVFX(enemy.x, enemy.z, angle + offset, distance, enemy.skillColor ?? 0x22d3ee, style, scale);
      }
    });
    enemy.state = 'skill_release';
    enemy.stateTimer = 0.36;
  }

  private resolveEnemySkill(enemy: EnemyActor) {
    const targetX = enemy.skillTargetX ?? this.playerX;
    const targetZ = enemy.skillTargetZ ?? this.playerZ;
    const color = enemy.skillColor ?? 0xef4444;
    let hitsPlayer = false;
    if (enemy.skillKind === 'bolt' || enemy.skillKind === 'volley') {
      const rangedSkill = enemy.skillKind === 'volley' ? 'volley' : 'bolt';
      const dx = targetX - enemy.x;
      const dz = targetZ - enemy.z;
      const distance = Math.hypot(dx, dz);
      const baseAngle = Math.atan2(dz, dx);
      const offsets = rangedSkill === 'volley' ? [-0.2, 0, 0.2] : [0];
      const hitRadius = rangedSkill === 'volley' ? 0.9 : 1.35;

      offsets.forEach((offset) => {
        const angle = baseAngle + offset;
        const endX = enemy.x + Math.cos(angle) * distance;
        const endZ = enemy.z + Math.sin(angle) * distance;
        const lengthSq = distance * distance;
        const t = lengthSq > 0
          ? THREE.MathUtils.clamp(((this.playerX - enemy.x) * (endX - enemy.x) + (this.playerZ - enemy.z) * (endZ - enemy.z)) / lengthSq, 0, 1)
          : 0;
        const nearestX = enemy.x + (endX - enemy.x) * t;
        const nearestZ = enemy.z + (endZ - enemy.z) * t;
        if (Math.hypot(this.playerX - nearestX, this.playerZ - nearestZ) <= hitRadius) hitsPlayer = true;
        this.arena.spawnEnemySkillBurst(endX, endZ, color, rangedSkill);
      });
    } else {
      hitsPlayer = Math.hypot(this.playerX - targetX, this.playerZ - targetZ) <= 2.35;
      this.arena.spawnEnemySkillBurst(targetX, targetZ, color, 'slam');
    }
    if (hitsPlayer && !this.isDashing && !this.isInvulnerable) {
      this.damagePlayer(Math.max(1, Math.round(enemy.damage * 1.15)));
      this.arena.addCameraShake(0.22);
    }
    enemy.skillCooldown = 4.5 + Math.random() * 2.2;
    enemy.state = 'attack';
    enemy.stateTimer = 0.34;
  }

  private keepEnemyInsideArena(enemy: EnemyActor) {
    const inset = enemy.isBoss ? 1.9 : 1.25;
    const x = THREE.MathUtils.clamp(enemy.x, this.arena.bounds.minX + inset, this.arena.bounds.maxX - inset);
    const z = THREE.MathUtils.clamp(enemy.z, this.arena.bounds.minZ + inset, this.arena.bounds.maxZ - inset);
    if (x !== enemy.x) enemy.vx = 0;
    if (z !== enemy.z) enemy.vz = 0;
    enemy.x = x;
    enemy.z = z;
  }

  private updateEnemies(dt: number) {
    let closestEnemy: EnemyActor | null = null;
    let closestDist = 12.0;

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      // Status effects tick
      const statusResult = tickStatuses(enemy.statuses, dt);
      enemy.statuses = statusResult.remainingStatuses;
      if (!enemy.isBoss) enemy.skillCooldown = Math.max(0, (enemy.skillCooldown ?? 0) - dt);

      if (statusResult.totalTickDamage > 0) {
        enemy.hp = Math.max(0, enemy.hp - statusResult.totalTickDamage);
        this.spawnDamageNumber(enemy.x, 1.2, enemy.z, statusResult.totalTickDamage, false);
        const hpRatio = enemy.hp / enemy.maxHp;
        enemy.hpBarFill.scale.x = Math.max(0.001, hpRatio);
        enemy.hpBarFill.position.x = -(1 - hpRatio) * ((enemy.hpBarWidth ?? 1.2) / 2);
        if (enemy.hp <= 0) {
          this.handleEnemyDeath(enemy);
          continue;
        }
      }

      // Visual color tint based on status
      const meshMat = enemy.mesh.material as THREE.MeshBasicMaterial;
      if (enemy.statuses.some((s) => s.type === 'freeze')) {
        meshMat.color.setHex(0x38bdf8); // Ice Cyan
      } else if (enemy.statuses.some((s) => s.type === 'burn')) {
        meshMat.color.setHex(0xf97316); // Flaming Orange
      } else if (enemy.statuses.some((s) => s.type === 'poison')) {
        meshMat.color.setHex(0x22c55e); // Toxic Green
      } else if (enemy.statuses.some((s) => s.type === 'bleed')) {
        meshMat.color.setHex(0xef4444); // Bleeding crimson
      } else if (enemy.statuses.some((s) => s.type === 'shock')) {
        meshMat.color.setHex(0xfde047); // Shock yellow
      } else if (enemy.statuses.some((s) => s.type === 'stun')) {
        meshMat.color.setHex(0xfacc15); // Stun Gold
      } else if (enemy.state === 'skill_windup' || enemy.state === 'skill_release') {
        meshMat.color.setHex(enemy.skillColor ?? 0xef4444);
      } else {
        meshMat.color.setHex(0xffffff);
      }

      enemy.x += enemy.vx * dt;
      enemy.z += enemy.vz * dt;
      enemy.vx *= Math.exp(-8 * dt);
      enemy.vz *= Math.exp(-8 * dt);
      this.keepEnemyInsideArena(enemy);

      enemy.facing = this.playerX >= enemy.x ? 1 : -1;
      enemy.mesh.scale.x = Math.abs(enemy.mesh.scale.x) * enemy.facing;

      const dist = Math.hypot(this.playerX - enemy.x, this.playerZ - enemy.z);
      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = enemy;
      }

      // AI Logic: skipped if immobilized by Freeze or Stun!
      if (!statusResult.isImmobilized) {
        const effectiveSpeed = enemy.speed * statusResult.speedMultiplier;

        // BOSS MECHANICS: 50% HP Minions & 30% HP Phase 2
        if (enemy.isBoss) {
          // ท่าเรียกลูกสมุน: เรียก 2-3 ตัวเมื่อเลือดเหลือ 50%
          if (enemy.hp <= enemy.maxHp * 0.5 && !enemy.hasSummonedMinions) {
            enemy.hasSummonedMinions = true;
            if (enemy.isHappyBoss) this.bossExecuteHappyCoinRain(enemy);
            else this.bossSummonMinions(enemy);
          }

          // เฟส 2 (เลือด 30%): ความเร็วเพิ่ม 25% ใช้ท่า 1-2 ต่อกัน
          if (enemy.hp <= enemy.maxHp * 0.3 && !enemy.isPhase2) {
            enemy.isPhase2 = true;
            enemy.speed = Number((enemy.speed * 1.25).toFixed(2));
            soundEngine.playBossGong();
            this.arena.addCameraShake(0.75);
            this.spawnDamageNumber(enemy.x, 2.0, enemy.z, 0, false, false, false);
          }
        }

        if (enemy.state === 'chase') {
          const preferredDist = enemy.isBoss ? 2.8 : (enemy.type.includes('genie') || enemy.type.includes('wisp') ? 2.2 : 1.4);
          const skillRange = this.getEnemySkillKind(enemy.type) === 'slam' ? 5.6 : 9.5;
          if (!enemy.isBoss && enemy.skillCooldown === 0 && dist <= skillRange) {
            this.beginEnemySkill(enemy);
          } else {
            if (dist > preferredDist) {
              const angle = Math.atan2(this.playerZ - enemy.z, this.playerX - enemy.x);
              enemy.x += Math.cos(angle) * effectiveSpeed * dt;
              enemy.z += Math.sin(angle) * effectiveSpeed * dt;
            }

            enemy.attackCooldown -= dt;
            if (enemy.attackCooldown <= 0) {
              if (enemy.isBoss) {
                if (enemy.isHappyBoss) {
                  enemy.happyAttackCount = (enemy.happyAttackCount ?? 0) + 1;
                  const attackIndex = (enemy.happyAttackCount - 1) % 4;
                  if (attackIndex === 0) this.bossExecuteHappyWave(enemy);
                  else if (attackIndex === 1) {
                    enemy.bossActionName = 'พุ่งรองเท้าแตะ';
                    this.bossExecuteDash(enemy);
                  } else if (attackIndex === 2) this.bossExecuteHappyCoinRain(enemy);
                  else {
                    enemy.bossActionName = 'ตบกลับสองเท่า';
                    this.bossExecuteSmash(enemy);
                  }
                  if (enemy.isPhase2) {
                    enemy.attackCooldown = 0.75;
                  }
                  continue;
                }
                // Boss attack selection: Melee Smash vs Half-screen Dash
                if (dist <= 4.0 || (enemy.isPhase2 && Math.random() < 0.5)) {
                  this.bossExecuteSmash(enemy);
                } else {
                  this.bossExecuteDash(enemy);
                }
              } else if (dist <= 2.8) {
                enemy.state = 'windup';
                enemy.stateTimer = 0.45;
                const attackAngle = Math.atan2(this.playerZ - enemy.z, this.playerX - enemy.x);
                this.arena.showEnemyMeleeTelegraph(enemy.x, enemy.z, attackAngle, enemy.stateTimer, this.getEnemySkillColor(enemy.type));
                soundEngine.playTelegraph();
              }
            }
          }
        } else if (enemy.state === 'windup') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            if (enemy.isBoss) {
              if (enemy.bossAttackType === 'smash') {
                // ท่าฟาด: เล็งระยะใกล้ มีสัญญาณเตือน 0.6 วินาที
                enemy.state = 'attack';
                enemy.stateTimer = 0.3;
                soundEngine.playKiExplosion();
                this.arena.spawnEnemySkillBurst(enemy.x, enemy.z, enemy.isHappyBoss ? 0xec4899 : 0xef4444, 'slam');
                this.arena.addCameraShake(0.55);
                if (dist <= 3.8 && !this.isDashing && !this.isInvulnerable) {
                  this.damagePlayer(enemy.isHappyBoss ? this.getHappyCounterDamage(enemy) : Math.round(enemy.damage * 1.4));
                }
                // เฟส 2: ใช้ท่า 1-2 ต่อกัน (Melee Slam immediately chains into Dash!)
                if (enemy.isPhase2) {
                  setTimeout(() => {
                    if (enemy.state !== 'dead') {
                      this.bossExecuteDash(enemy);
                    }
                  }, 320);
                }
              } else if (enemy.bossAttackType === 'dash') {
                // ท่าพุ่ง/ยิงไกล: ข้ามฉากครึ่งหนึ่ง ต้องกระโดด/แดชหลบ
                enemy.state = 'attack';
                enemy.stateTimer = 0.35;
                soundEngine.playDash();
                const dashAng = Math.atan2(enemy.targetZ - enemy.z, enemy.targetX - enemy.x);
                const dashDistance = Math.hypot(enemy.targetX - enemy.x, enemy.targetZ - enemy.z);
                this.arena.spawnSkillProjectileVFX(enemy.x, enemy.z, dashAng, dashDistance, enemy.isHappyBoss ? 0xec4899 : this.getEnemySkillColor(enemy.type), 'blade', enemy.isPhase2 ? 1.35 : 1.05);
                enemy.vx = Math.cos(dashAng) * 22.0;
                enemy.vz = Math.sin(dashAng) * 22.0;

                // Deal damage if player is within charge radius and not dashing/invulnerable
                if (dist <= 3.2 && !this.isDashing && !this.isInvulnerable) {
                  this.damagePlayer(enemy.isHappyBoss ? this.getHappyCounterDamage(enemy) : enemy.damage);
                }

                // เฟส 2: ใช้ท่า 1-2 ต่อกัน (Dash chains into Melee Slam!)
                if (enemy.isPhase2 && Math.random() > 0.4) {
                  setTimeout(() => {
                    if (enemy.state !== 'dead') {
                      this.bossExecuteSmash(enemy);
                    }
                  }, 380);
                }
              } else if (enemy.bossAttackType === 'happy_wave') {
                enemy.state = 'attack';
                enemy.stateTimer = 0.35;
                this.arena.addCameraShake(0.4);
                this.arena.spawnHappyCoinBurst(enemy.targetX, enemy.targetZ);
                const targetDist = Math.hypot(this.playerX - enemy.targetX, this.playerZ - enemy.targetZ);
                if (targetDist <= 4.1 && !this.isDashing && !this.isInvulnerable) {
                  this.damagePlayer(this.getHappyCounterDamage(enemy));
                }
                if (enemy.isPhase2) {
                  setTimeout(() => {
                    if (enemy.state !== 'dead') this.bossExecuteDash(enemy);
                  }, 300);
                }
              } else if (enemy.bossAttackType === 'happy_coin_rain') {
                enemy.state = 'attack';
                enemy.stateTimer = 0.45;
                let caught = false;
                for (const point of enemy.happyTelegraphPoints ?? []) {
                  this.arena.spawnHappyCoinBurst(point.x, point.z);
                  if (!caught && Math.hypot(this.playerX - point.x, this.playerZ - point.z) <= 1.5) caught = true;
                }
                if (caught && !this.isDashing && !this.isInvulnerable) {
                  this.damagePlayer(this.getHappyCounterDamage(enemy));
                }
                if (enemy.isPhase2) {
                  setTimeout(() => {
                    if (enemy.state !== 'dead') this.bossExecuteHappyWave(enemy);
                  }, 300);
                }
              }
            } else {
              enemy.state = 'attack';
              enemy.stateTimer = 0.25;
              const attackAngle = Math.atan2(this.playerZ - enemy.z, this.playerX - enemy.x);
              this.arena.spawnEnemyMeleeSlashVFX(enemy.x, enemy.z, attackAngle, this.getEnemySkillColor(enemy.type));
              if (dist <= 2.4 && !this.isDashing && !this.isInvulnerable) this.damagePlayer(enemy.damage);
            }
          }
        } else if (enemy.state === 'skill_windup') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            if (enemy.skillKind === 'slam') this.resolveEnemySkill(enemy);
            else this.launchEnemySkill(enemy);
          }
        } else if (enemy.state === 'skill_release') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) this.resolveEnemySkill(enemy);
        } else if (enemy.state === 'attack') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'chase';
            enemy.attackCooldown = enemy.isBoss
              ? (enemy.isPhase2 ? 0.9 + Math.random() * 0.6 : 1.5 + Math.random() * 0.8)
              : 1.2 + Math.random();
          }
        } else if (enemy.state === 'hurt') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'chase';
          }
        }
      }

      this.keepEnemyInsideArena(enemy);
      // Squash & stretch: breathing while idle, bobbing when chasing, compress on wind-up,
      // stretch on strike, flatten on hit. Vertical only, so the base (boss-intro) scale is kept.
      const planeH = (enemy.mesh.geometry as THREE.PlaneGeometry).parameters.height;
      const fx = enemy.mesh.userData as { phase?: number; sy?: number };
      const chasing = enemy.state === 'chase';
      fx.phase = (fx.phase ?? Math.random() * Math.PI * 2) + dt * (chasing ? 9 : 2.6);
      const amp = enemy.isBoss ? 0.5 : 1;
      let enemySY = 1 + Math.sin(fx.phase) * (chasing ? 0.04 : 0.016) * amp;
      if (enemy.state === 'windup' || enemy.state === 'skill_windup') enemySY = 1 - 0.1 * amp;
      else if (enemy.state === 'attack' || enemy.state === 'skill_release') enemySY = 1 + 0.1 * amp;
      else if (enemy.state === 'hurt') enemySY = 1 - 0.12 * amp;
      fx.sy = (fx.sy ?? 1) + (enemySY - (fx.sy ?? 1)) * (1 - Math.exp(-dt * 20));
      enemy.mesh.scale.y = Math.abs(enemy.mesh.scale.x) * fx.sy;
      const enemyLift = (fx.sy - 1) * planeH * 0.5;
      enemy.mesh.position.set(
        enemy.x,
        planeH / 2 + enemyLift * Math.cos(0.58),
        enemy.z - enemyLift * Math.sin(0.58)
      );
      enemy.mesh.rotation.x = -0.58;
      enemy.shadowMesh.position.set(enemy.x, 0.02, enemy.z);
      enemy.hpBarGroup.position.set(enemy.x, (enemy.mesh.geometry as THREE.PlaneGeometry).parameters.height + 0.3, enemy.z);
      enemy.hpBarGroup.rotation.x = -0.58;
    }

    this.lockedTarget = closestEnemy;
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;

      if (p.owner === 'player') {
        for (const enemy of this.enemies) {
          if (enemy.state === 'dead') continue;
          const dist = Math.hypot(enemy.x - p.x, enemy.z - p.z);
          if (dist <= p.radius + 0.6) {
            const isCrit = p.crit ?? Math.random() < this.playerStats.critChance;
            const damage = p.crit === undefined && isCrit ? p.damage * this.playerStats.critMultiplier : p.damage;
            this.damageEnemy(enemy, damage, isCrit, true);
            p.penetrateCount--;
            soundEngine.playKiExplosion();
            this.arena.addCameraShake(0.3);
            if (p.penetrateCount <= 0) {
              p.life = 0;
              break;
            }
          }
        }
      }
      if (p.life <= 0) this.projectiles.splice(i, 1);
    }
  }

  private updateDamageNumbers(dt: number) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      d.vy -= 4.0 * dt;
      if (d.life <= 0) this.damageNumbers.splice(i, 1);
    }
  }

  private updateGroundItems(dt: number) {
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const item = this.groundItems[i];
      item.bobTimer += dt * 3;
      const dist = Math.hypot(this.playerX - item.x, this.playerZ - item.z);
      if (dist <= 1.4) {
        if (item.type === 'gold') {
          this.playerStats.gold += this.getCoinAmount(item.amount || 20);
          soundEngine.playCoin();
        } else if (item.type === 'potion') {
          this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 40);
          soundEngine.playPotion();
        }
        const meshIdx = this.arena.vfxGroup.children.findIndex((c) => (c as any).itemData === item);
        if (meshIdx !== -1) {
          this.arena.vfxGroup.remove(this.arena.vfxGroup.children[meshIdx]);
        }
        this.groundItems.splice(i, 1);
      }
    }
  }
}
