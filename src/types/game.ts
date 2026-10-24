/**
 * Type definitions for Mirage Legends (Otherworld Legends Style)
 */

export type GameMode = 'title' | 'lobby' | 'playing' | 'paused' | 'gameover' | 'victory';

export type DifficultyMode = 'easy' | 'normal' | 'hard' | 'impossible';

export type DungeonRoomId = 'center' | 'north' | 'west' | 'east';

export type StatUpgradeType = 'hp' | 'shield' | 'attack' | 'attackSpeed' | 'moveSpeed' | 'crit';

export type HeroId = 'quan' | 'ginzo' | 'katherine' | 'bamdee';

export interface HeroConfig {
  id: HeroId;
  name: string;
  nameTh: string;
  titleTh: string;
  descTh: string;
  maxHp: number;
  maxShield: number; // Armor
  attackPower: number; // Damage
  moveSpeed: number; // Movement speed
  attackSpeed: number; // Attack speed
  critChance: number; // Critical rate
  critMultiplier: number;
  unlocked: boolean;
  cost: number;
  icon: string;
}

export interface ActiveSkillDef {
  id: string;
  slot: 1 | 2 | 3 | 4;
  name: string;
  nameTh: string;
  descTh: string;
  icon: string;
  color: string;
  badgeBg: string;
  cooldown: number;
  damageMultiplier: number;
}

export type DungeonMapId =
  | 'undead'
  | 'japan'
  | 'elfland'
  | 'stronghold'
  | 'desert'
  | 'wild_west'
  | 'china'
  | 'norse'
  | 'imperium'
  | 'mirage'
  | 'bamboo'
  | 'crypt'
  | 'ice'
  | 'forge'
  | 'sky'
  | 'test_dungeon';

export interface DungeonMapConfig {
  id: DungeonMapId;
  name: string;
  nameTh: string;
  descTh: string;
  bossName: string;
  bossNameTh: string;
  bossTitleTh: string;
  bossDescTh: string;
  recommendedPower: number;
  waves: number;
  theme: DungeonMapId;
  bgTileColor: string;
  floorType: 'stone' | 'wood' | 'metal' | 'moss' | 'sand' | 'ice' | 'marble' | 'celestial';
  ambientColor: number;
  accentColor: number;
  icon: string;
}

export type DungeonRoomType =
  | 'combat'
  | 'equipment_shop'
  | 'healing_pool'
  | 'stat_device'
  | 'boss'
  | 'start'
  | 'elite'
  | 'shop'
  | 'chest'
  | 'forge'
  | 'exit'
  | 'secret'
  | 'center'
  | 'north'
  | 'west'
  | 'east';

export const MAX_EQUIPPED_ITEMS = 10;

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type EquipmentPerkType =
  | 'kill_heal'
  | 'kill_gold'
  | 'kill_haste'
  | 'hit_guard'
  | 'hit_reduce'
  | 'hit_push'
  | 'crit_haste'
  | 'low_hp_damage'
  | 'low_hp_shield'
  | 'full_hp_damage'
  | 'status_burn'
  | 'status_bleed'
  | 'status_slow'
  | 'status_shock'
  | 'dodge_guard'
  | 'revive_once';

export interface EquipmentPerk {
  type: EquipmentPerkType;
  value: number;
  duration?: number;
  chance?: number;
  status?: 'burn' | 'bleed' | 'slow' | 'shock';
}

export interface EquipmentItem {
  id: string;
  templateId?: string;
  name: string;
  nameTh: string;
  descTh: string;
  rarity: ItemRarity;
  icon: string;
  bonusHp?: number;
  bonusShield?: number;
  bonusAttack?: number; // Balanced for 10-20 damage scale (+1 to +3)
  bonusDefense?: number;
  bonusCritChance?: number;
  bonusMoveSpeed?: number;
  bonusAttackSpeed?: number;
  bonusDamagePercent?: number;
  bonusAttackSpeedPercent?: number;
  bonusCritDamagePercent?: number;
  bonusLifesteal?: number;
  bonusMaxHpPercent?: number;
  bonusDamageReduction?: number;
  bonusDodgeChance?: number;
  bonusHpRegen?: number;
  bonusMoveSpeedPercent?: number;
  bonusCooldownReduction?: number;
  bonusCoinGain?: number;
  bonusChestLuck?: number;
  perk?: EquipmentPerk;
  specialPerkTh?: string;
  cost?: number;
  /** Keep this curated item's authored stats instead of rolling random affixes. */
  fixedStats?: boolean;
}

export type WeaponRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface WeaponItem {
  id: string;
  name: string;
  nameTh: string;
  descTh: string;
  type: 'fist' | 'katana' | 'blade' | 'polearm' | 'staff' | 'greatsword' | 'gun';
  rarity?: WeaponRarity;
  attackBonus: number;
  critBonus: number;
  attackSpeedBonus?: number;
  cost: number;
  owned: boolean;
  icon: string;
  specialEffectTh?: string;
  attackStyleTh?: string;
}

export type HeroAnimationState =
  | 'idle'
  | 'run'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'attack4'
  | 'dash'
  | 'hurt'
  | 'dead';

export type StatusType = 'burn' | 'bleed' | 'shock' | 'freeze' | 'poison' | 'stun' | 'slow';

export interface ActiveStatus {
  type: StatusType;
  duration: number;
  maxDuration: number;
  tickTimer: number;
  tickInterval: number;
  tickDamage: number;
  slowRatio: number;
}

export type EnemyType =
  // Standard mobs
  | 'undead_skeleton'
  | 'undead_ghoul'
  | 'japan_ronin'
  | 'japan_archer'
  | 'elf_wisp'
  | 'elf_treant'
  | 'stronghold_drone'
  | 'stronghold_cyborg'
  | 'desert_genie'
  | 'desert_assassin'
  | 'west_outlaw'
  | 'west_gunslinger'
  | 'china_monk'
  | 'china_spearman'
  | 'norse_berserker'
  | 'norse_frostmage'
  | 'imperium_crusader'
  | 'imperium_inquisitor'
  | 'mirage_phantom'
  | 'mirage_sentinel'
  // 10 Official Wiki Bosses
  | 'boss_valentine'
  | 'boss_tengu'
  | 'boss_muno_wonda'
  | 'boss_dr_universelove'
  | 'boss_iblis'
  | 'boss_logan'
  | 'boss_chen'
  | 'boss_kraken'
  | 'boss_navy_louis'
  | 'boss_asurendra';

export interface PlayerStats {
  heroId: HeroId;
  maxHp: number; // Health
  hp: number;
  maxShield: number; // Armor
  shield: number;
  attackPower: number; // Damage
  defense: number;
  moveSpeed: number; // Movement speed
  attackSpeed: number; // Attack speed
  critChance: number; // Critical rate
  critMultiplier: number;
  damageReduction: number;
  dodgeChance: number;
  hpRegen: number;
  lifesteal: number;
  cooldownReduction: number;
  coinGain: number;
  chestLuck: number;
  gold: number;
  kills: number;
  comboCount: number;
  comboTimer: number;
  equippedWeaponId: string;
  equippedItems: EquipmentItem[];
  inventory: EquipmentItem[];
}

export interface RelicItem {
  id: string;
  name: string;
  nameTh: string;
  desc: string;
  descTh: string;
  rarity: 'common' | 'rare' | 'legendary';
  iconColor: string;
  iconSymbol: string;
  bonusHp?: number;
  bonusShield?: number;
  bonusAttack?: number;
  bonusCrit?: number;
  bonusAttackSpeed?: number;
  bonusMoveSpeed?: number;
}

export interface DamageNumberItem {
  id: number;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  isCrit: boolean;
}

export interface Projectile {
  id: number;
  owner: 'player' | 'enemy';
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  crit?: boolean;
  penetrateCount: number;
  type: 'ki_blast' | 'katana_slash' | 'archer_arrow' | 'boss_wave' | 'palace_orb' | 'bullet' | 'laser' | 'feather' | 'water_orb';
  life: number;
  maxLife: number;
  color: string;
  trailTimer: number;
}

export interface GroundItem {
  id: number;
  type: 'gold' | 'potion' | 'relic' | 'equipment';
  x: number;
  z: number;
  amount?: number;
  relic?: RelicItem;
  equipment?: EquipmentItem;
  bobTimer: number;
}

export interface BreakableProp {
  id: number;
  x: number;
  z: number;
  hp: number;
  type: 'urn' | 'lantern' | 'crate' | 'coffin' | 'crystal';
  mesh?: any;
}

export type DungeonInteractableType =
  | 'stat_device'
  | 'equipment_merchant'
  | 'happy_merchant'
  | 'shop_item'
  | 'healing_pool'
  | 'door_north'
  | 'door_west'
  | 'door_east'
  | 'door_south'
  | 'door_center'
  | 'secret_wall'
  | 'chest'
  | 'forge'
  | 'boss_altar'
  | 'portal';

export interface NpcActor {
  id: 'blacksmith' | 'trainer' | 'gatekeeper' | 'stat_device' | 'healing_pool';
  nameTh: string;
  titleTh: string;
  x: number;
  z: number;
  radius: number;
  mesh?: any;
}
