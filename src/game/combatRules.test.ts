import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDamage,
  applyArmorMitigation,
  calculateAttackCadence,
  createStatusEffect,
  tickStatuses,
  aggregateRelicBonuses,
} from './combatRules.ts';
import type { CombatStats } from './combatRules.ts';

const mockPlayerStats: CombatStats = {
  hp: 100,
  maxHp: 100,
  shield: 50,
  maxShield: 50,
  attackPower: 30,
  critChance: 0.5,
  critMultiplier: 2.0,
  attackSpeed: 1.0,
  moveSpeed: 8.0,
  defense: 10,
};

test('calculateDamage handles combo steps and non-critical hits correctly', () => {
  // Step 1 non-crit: 30 * 1.0 * 1.0 = 30
  const hit1 = calculateDamage(mockPlayerStats, 1, 0, 0, false);
  // force non-crit by passing 0 crit chance mock
  const nonCritStats = { ...mockPlayerStats, critChance: 0 };
  const res1 = calculateDamage(nonCritStats, 1, 0, 0, false);
  assert.equal(res1.damage, 30);
  assert.equal(res1.isFinisher, false);

  // Step 2 non-crit: 30 * 1.4 = 42
  const res2 = calculateDamage(nonCritStats, 2, 0, 0, false);
  assert.equal(res2.damage, 42);

  // Step 3 Finisher non-crit: 30 * 2.2 = 66
  const res3 = calculateDamage(nonCritStats, 3, 0, 0, false);
  assert.equal(res3.damage, 66);
  assert.equal(res3.isFinisher, true);
});

test('calculateDamage respects forced critical strikes and weapon bonuses', () => {
  // Base 30 + weapon 10 = 40. Crit multiplier 2.0 = 80 damage
  const critResult = calculateDamage(mockPlayerStats, 1, 10, 0, true);
  assert.equal(critResult.damage, 80);
  assert.equal(critResult.isCrit, true);
});

test('applyArmorMitigation absorbs full damage when armor exceeds attack', () => {
  // Incoming 30 damage against 50 armor
  const result = applyArmorMitigation(30, 50, 100, 0);
  assert.equal(result.shieldDamage, 30);
  assert.equal(result.remainingShield, 20);
  assert.equal(result.healthDamage, 0);
  assert.equal(result.remainingHp, 100);
});

test('applyArmorMitigation spills over into HP when armor is broken', () => {
  // Incoming 70 damage against 40 armor
  const result = applyArmorMitigation(70, 40, 100, 0);
  assert.equal(result.shieldDamage, 40);
  assert.equal(result.remainingShield, 0);
  assert.equal(result.healthDamage, 30);
  assert.equal(result.remainingHp, 70);
});

test('calculateAttackCadence scales interval inversely with attack speed', () => {
  const baseInterval = 0.3;
  // 1.0x attack speed => 0.30s
  assert.equal(calculateAttackCadence(baseInterval, 1.0), 0.3);
  // 2.0x attack speed => 0.15s
  assert.equal(calculateAttackCadence(baseInterval, 2.0), 0.15);
});

test('status effects tick damage and apply immobilization', () => {
  const burn = createStatusEffect('burn', 2.0, 30);
  const freeze = createStatusEffect('freeze', 1.5);

  const initial = [burn, freeze];
  // Advance dt by 0.4s (triggers burn tick)
  const tick1 = tickStatuses(initial, 0.4);
  assert.equal(tick1.isImmobilized, true);
  assert.equal(tick1.speedMultiplier, 0);
  assert.ok(tick1.totalTickDamage > 0, 'Burn should have dealt DoT damage');
  assert.equal(tick1.remainingStatuses.length, 2);

  // Advance by 1.2s (freeze should expire, leaving only burn)
  const tick2 = tickStatuses(tick1.remainingStatuses, 1.2);
  assert.equal(tick2.isImmobilized, false);
  assert.equal(tick2.speedMultiplier, 1.0);
});

test('aggregateRelicBonuses aggregates stat boosts and combat perks', () => {
  const relics = ['dragon_jade', 'berserker_mask', 'hermes_boots'];
  const aggregated = aggregateRelicBonuses(relics);

  assert.equal(aggregated.bonusAttack, 15);
  assert.equal(aggregated.hasBurnOnHit, true);
  assert.equal(aggregated.bonusCritChance, 0.15);
  assert.equal(aggregated.bonusAttackSpeed, 0.35);
  assert.equal(aggregated.bonusMoveSpeed, 1.6);
});

test('calculateDamage scales with difficulty multiplier', () => {
  const nonCritStats = { ...mockPlayerStats, critChance: 0 };
  // Base 30, impossible mode (0.75x) => 23
  const impossibleHit = calculateDamage(nonCritStats, 1, 0, 0, false, 0.75);
  assert.equal(impossibleHit.damage, 23);

  // Easy mode (1.15x) => 35
  const easyHit = calculateDamage(nonCritStats, 1, 0, 0, false, 1.15);
  assert.equal(easyHit.damage, 35);
});
