/**
 * Pure combat rules and calculations for Mirage Legends
 * Decoupled from Three.js and DOM for fast deterministic unit testing
 */

export interface CombatStats {
  hp: number;
  maxHp: number;
  shield: number; // Armor / Protection
  maxShield: number;
  attackPower: number; // Damage
  critChance: number; // Critical Rate (0 - 1.0)
  critMultiplier: number;
  attackSpeed: number; // Attacks per second multiplier (e.g. 1.0 - 2.5)
  moveSpeed: number; // Movement speed (e.g. 7.0 - 10.0)
  defense: number; // Flat defense / damage reduction
}

export type StatusType = 'burn' | 'bleed' | 'shock' | 'freeze' | 'poison' | 'stun' | 'slow';

export interface ActiveStatus {
  type: StatusType;
  duration: number; // Remaining seconds
  maxDuration: number;
  tickTimer: number; // Timer for DoT damage ticks
  tickInterval: number; // Seconds between ticks
  tickDamage: number; // Damage per tick
  slowRatio: number; // Percentage slow (0 - 1.0)
}

export interface DamageCalculationResult {
  damage: number;
  isCrit: boolean;
  isFinisher: boolean;
  statusToApply?: StatusType;
}

export interface MitigationResult {
  shieldDamage: number;
  healthDamage: number;
  remainingShield: number;
  remainingHp: number;
}

export type DifficultyMode = 'easy' | 'normal' | 'hard' | 'impossible';

export interface DifficultyConfig {
  id: DifficultyMode;
  nameTh: string;
  descTh: string;
  enemyHpMultiplier: number;
  enemyDmgMultiplier: number;
  enemySpeedMultiplier: number;
  playerDmgMultiplier: number;
  badgeColor: string;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  easy: {
    id: 'easy',
    nameTh: 'ง่าย (Easy)',
    descTh: 'ศัตรูพลังชีวิตน้อย ดาเมจเบา เหมาะสำหรับเริ่มเล่น',
    enemyHpMultiplier: 0.75,
    enemyDmgMultiplier: 0.7,
    enemySpeedMultiplier: 0.85,
    playerDmgMultiplier: 1.15,
    badgeColor: '#10b981',
  },
  normal: {
    id: 'normal',
    nameTh: 'ปานกลาง (Normal)',
    descTh: 'ความยากระดับมาตรฐานของเกม สมดุลท้าทายกำลังดี',
    enemyHpMultiplier: 1.0,
    enemyDmgMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    playerDmgMultiplier: 1.0,
    badgeColor: '#38bdf8',
  },
  hard: {
    id: 'hard',
    nameTh: 'ยาก (Hard)',
    descTh: 'ศัตรูอึดและตีหนัก เคลื่อนที่รวดเร็วขึ้น ต้องการการหลบหลีกที่แม่นยำ',
    enemyHpMultiplier: 1.45,
    enemyDmgMultiplier: 1.4,
    enemySpeedMultiplier: 1.15,
    playerDmgMultiplier: 0.88,
    badgeColor: '#f59e0b',
  },
  impossible: {
    id: 'impossible',
    nameTh: 'เป็นไปไม่ได้ (Impossible)',
    descTh: 'โหมดนรกแตก! ศัตรูเลือดมหาศาล โจมตีรุนแรงถึงตายและพุ่งใส่ไม่หยุด',
    enemyHpMultiplier: 2.2,
    enemyDmgMultiplier: 2.0,
    enemySpeedMultiplier: 1.3,
    playerDmgMultiplier: 0.75,
    badgeColor: '#ef4444',
  },
};

/**
 * Calculates raw outgoing damage, checking for critical strike and combo step modifiers
 */
export function calculateDamage(
  attackerStats: CombatStats,
  comboStep: number = 1,
  weaponBonus: number = 0,
  relicDamageBonus: number = 0,
  forceCrit: boolean = false,
  difficultyMultiplier: number = 1.0,
  applyVariance: boolean = false
): DamageCalculationResult {
  const isFinisher = comboStep >= 3;
  const comboMultiplier = comboStep === 1 ? 1.0 : comboStep === 2 ? 1.4 : 2.2;
  const rawAttack = (attackerStats.attackPower + weaponBonus + relicDamageBonus) * comboMultiplier * difficultyMultiplier;

  const isCrit = forceCrit || Math.random() < attackerStats.critChance;
  const multiplier = isCrit ? attackerStats.critMultiplier : 1.0;
  const variance = applyVariance ? (Math.random() - 0.5) * 2 : 0;
  const damage = Math.max(1, Math.round(rawAttack * multiplier + variance));

  return {
    damage,
    isCrit,
    isFinisher,
  };
}

/**
 * Applies Armor (Shield) and defense mitigation to incoming damage.
 * Armor absorbs 100% of damage until depleted; remaining damage hits Health.
 */
export function applyArmorMitigation(
  incomingDamage: number,
  currentShield: number,
  currentHp: number,
  defense: number = 0
): MitigationResult {
  // Flat defense reduces damage by a percentage (min 1 damage)
  const reductionFactor = Math.max(0.2, 1 - defense / (defense + 50));
  const effectiveDamage = Math.max(1, Math.round(incomingDamage * reductionFactor));

  let shieldDamage = 0;
  let healthDamage = 0;
  let remainingShield = currentShield;
  let remainingHp = currentHp;

  if (currentShield > 0) {
    if (currentShield >= effectiveDamage) {
      shieldDamage = effectiveDamage;
      remainingShield = currentShield - effectiveDamage;
      healthDamage = 0;
    } else {
      shieldDamage = currentShield;
      const overflow = effectiveDamage - currentShield;
      remainingShield = 0;
      healthDamage = overflow;
      remainingHp = Math.max(0, currentHp - overflow);
    }
  } else {
    healthDamage = effectiveDamage;
    remainingHp = Math.max(0, currentHp - effectiveDamage);
  }

  return {
    shieldDamage,
    healthDamage,
    remainingShield,
    remainingHp,
  };
}

/**
 * Calculates attack animation and combo window duration based on Attack Speed
 */
export function calculateAttackCadence(baseDuration: number, attackSpeed: number): number {
  const safeSpeed = Math.max(0.5, Math.min(3.5, attackSpeed));
  return Number((baseDuration / safeSpeed).toFixed(3));
}

/**
 * Checks if status effect can be applied and creates initial status object
 */
export function createStatusEffect(type: StatusType, duration: number, power: number = 10): ActiveStatus {
  switch (type) {
    case 'burn':
      return {
        type: 'burn',
        duration,
        maxDuration: duration,
        tickTimer: 0.4,
        tickInterval: 0.4,
        tickDamage: Math.max(3, Math.round(power * 0.4)),
        slowRatio: 0,
      };
    case 'bleed':
      return {
        type: 'bleed', duration, maxDuration: duration, tickTimer: 0.5, tickInterval: 0.5,
        tickDamage: Math.max(2, Math.round(power * 0.35)), slowRatio: 0,
      };
    case 'shock':
      return {
        type: 'shock', duration, maxDuration: duration, tickTimer: 0.25, tickInterval: 0.25,
        tickDamage: Math.max(1, Math.round(power * 0.15)), slowRatio: 0.65,
      };
    case 'poison':
      return {
        type: 'poison',
        duration,
        maxDuration: duration,
        tickTimer: 0.5,
        tickInterval: 0.5,
        tickDamage: Math.max(2, Math.round(power * 0.25)),
        slowRatio: 0.25, // 25% slow
      };
    case 'freeze':
      return {
        type: 'freeze',
        duration,
        maxDuration: duration,
        tickTimer: 0,
        tickInterval: 0,
        tickDamage: 0,
        slowRatio: 1.0, // 100% stop
      };
    case 'stun':
      return {
        type: 'stun',
        duration,
        maxDuration: duration,
        tickTimer: 0,
        tickInterval: 0,
        tickDamage: 0,
        slowRatio: 1.0, // Stun stops all actions
      };
    case 'slow':
      return {
        type: 'slow',
        duration,
        maxDuration: duration,
        tickTimer: 0,
        tickInterval: 0,
        tickDamage: 0,
        slowRatio: 0.4, // 40% slow
      };
  }
}

/**
 * Updates status effects over a delta-time step, triggering periodic damage ticks
 */
export function tickStatuses(
  statuses: ActiveStatus[],
  dt: number
): { remainingStatuses: ActiveStatus[]; totalTickDamage: number; isImmobilized: boolean; speedMultiplier: number } {
  let totalTickDamage = 0;
  let isImmobilized = false;
  let maxSlowRatio = 0;
  const remainingStatuses: ActiveStatus[] = [];

  for (const status of statuses) {
    status.duration -= dt;
    if (status.duration <= 0) continue;

    // Check DoT ticks
    if (status.tickInterval > 0) {
      status.tickTimer -= dt;
      if (status.tickTimer <= 0) {
        status.tickTimer += status.tickInterval;
        totalTickDamage += status.tickDamage;
      }
    }

    if (status.type === 'freeze' || status.type === 'stun' || status.type === 'shock') {
      isImmobilized = true;
    }
    if (status.slowRatio > maxSlowRatio) {
      maxSlowRatio = status.slowRatio;
    }

    remainingStatuses.push(status);
  }

  const speedMultiplier = isImmobilized ? 0 : Math.max(0.1, 1 - maxSlowRatio);

  return {
    remainingStatuses,
    totalTickDamage,
    isImmobilized,
    speedMultiplier,
  };
}

/**
 * Resolves relic stat bonuses into net player stats
 */
export function aggregateRelicBonuses(relicIds: string[]): {
  bonusHp: number;
  bonusShield: number;
  bonusAttack: number;
  bonusCritChance: number;
  bonusAttackSpeed: number;
  bonusMoveSpeed: number;
  hasBurnOnHit: boolean;
  hasFreezeOnHit: boolean;
  hasDodgeShockwave: boolean;
  hasVampiricCrit: boolean;
} {
  let bonusHp = 0;
  let bonusShield = 0;
  let bonusAttack = 0;
  let bonusCritChance = 0;
  let bonusAttackSpeed = 0;
  let bonusMoveSpeed = 0;
  let hasBurnOnHit = false;
  let hasFreezeOnHit = false;
  let hasDodgeShockwave = false;
  let hasVampiricCrit = false;

  for (const id of relicIds) {
    if (id === 'dragon_jade') {
      bonusAttack += 15;
      hasBurnOnHit = true;
    } else if (id === 'glacial_shard') {
      bonusShield += 15;
      hasFreezeOnHit = true;
    } else if (id === 'berserker_mask') {
      bonusAttackSpeed += 0.35;
      bonusCritChance += 0.15;
    } else if (id === 'titan_plate') {
      bonusShield += 35;
      bonusHp += 20;
    } else if (id === 'hermes_boots') {
      bonusMoveSpeed += 1.6;
    } else if (id === 'vampire_fangs') {
      hasVampiricCrit = true;
    } else if (id === 'thunder_pearl') {
      bonusAttack += 10;
      bonusAttackSpeed += 0.2;
    } else if (id === 'shadow_cloak') {
      hasDodgeShockwave = true;
      bonusMoveSpeed += 0.8;
    }
  }

  return {
    bonusHp,
    bonusShield,
    bonusAttack,
    bonusCritChance,
    bonusAttackSpeed,
    bonusMoveSpeed,
    hasBurnOnHit,
    hasFreezeOnHit,
    hasDodgeShockwave,
    hasVampiricCrit,
  };
}
