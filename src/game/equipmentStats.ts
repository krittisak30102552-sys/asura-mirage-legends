import { EquipmentItem, EquipmentPerk, ItemRarity } from '../types/game';

export const EQUIPMENT_RARITY_META: Record<ItemRarity, { label: string; weight: number }> = {
  common: { label: 'ทั่วไป · 1 ค่าสถานะ', weight: 55 },
  rare: { label: 'หายาก · 2 ค่าสถานะ', weight: 28 },
  epic: { label: 'มหากาพย์ · 2 ค่าสถานะ', weight: 13 },
  legendary: { label: 'ตำนาน · 2 ค่าสถานะ + พลังพิเศษ', weight: 4 },
};

export type EquipmentStatKey =
  | 'bonusDamagePercent' | 'bonusAttackSpeedPercent' | 'bonusCritChance' | 'bonusCritDamagePercent'
  | 'bonusLifesteal' | 'bonusMaxHpPercent' | 'bonusHp' | 'bonusShield' | 'bonusDamageReduction'
  | 'bonusDodgeChance' | 'bonusHpRegen' | 'bonusMoveSpeedPercent' | 'bonusMoveSpeed'
  | 'bonusCooldownReduction' | 'bonusCoinGain' | 'bonusChestLuck'
  | 'bonusAttack' | 'bonusAttackSpeed' | 'bonusDefense';

export interface EquipmentStatDefinition {
  key: EquipmentStatKey;
  label: string;
  format: (value: number) => string;
}

const signed = (value: number, digits = 0) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
const percent = (value: number) => `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`;

export const EQUIPMENT_STAT_DEFINITIONS: EquipmentStatDefinition[] = [
  { key: 'bonusDamagePercent', label: 'ดาเมจ', format: percent },
  { key: 'bonusAttackSpeedPercent', label: 'ความเร็วโจมตี', format: percent },
  { key: 'bonusCritChance', label: 'โอกาสคริติคอล', format: percent },
  { key: 'bonusCritDamagePercent', label: 'ดาเมจคริติคอล', format: percent },
  { key: 'bonusLifesteal', label: 'ดูดเลือด', format: percent },
  { key: 'bonusMaxHpPercent', label: 'เลือดสูงสุด', format: percent },
  { key: 'bonusHp', label: 'เลือดสูงสุด', format: (value) => `${signed(value)}` },
  { key: 'bonusShield', label: 'เกราะ / โล่', format: (value) => `${signed(value)}` },
  { key: 'bonusDamageReduction', label: 'ลดดาเมจที่ได้รับ', format: percent },
  { key: 'bonusDodgeChance', label: 'หลบหลีก', format: percent },
  { key: 'bonusHpRegen', label: 'ฟื้นเลือดต่อวินาที', format: (value) => `${signed(value, 1)} / วิ` },
  { key: 'bonusMoveSpeedPercent', label: 'ความเร็วเดิน', format: percent },
  { key: 'bonusMoveSpeed', label: 'ความเร็วเดิน', format: (value) => `${signed(value, 1)}` },
  { key: 'bonusCooldownReduction', label: 'ลดคูลดาวน์สกิล', format: percent },
  { key: 'bonusCoinGain', label: 'เหรียญที่ได้', format: percent },
  { key: 'bonusChestLuck', label: 'โชคกล่อง', format: percent },
  { key: 'bonusAttack', label: 'ดาเมจ (ค่าคงที่)', format: (value) => `${signed(value)}` },
  { key: 'bonusAttackSpeed', label: 'ความเร็วโจมตี (เดิม)', format: (value) => `${signed(value, 2)}x` },
  { key: 'bonusDefense', label: 'ป้องกัน (ค่าคงที่)', format: (value) => `${signed(value)}` },
];

export function getEquipmentStatEntries(item: EquipmentItem) {
  return EQUIPMENT_STAT_DEFINITIONS
    .map((definition) => ({ ...definition, value: item[definition.key] ?? 0 }))
    .filter((entry) => entry.value !== 0);
}

export function formatEquipmentStatBonuses(item: EquipmentItem): string[] {
  const stats = getEquipmentStatEntries(item).map(({ label, format, value }) => `${label} ${format(value)}`);
  if (item.perk && item.specialPerkTh) stats.push(item.specialPerkTh);
  return stats;
}

export function formatEquipmentStatSummary(item: EquipmentItem): string {
  const stats = formatEquipmentStatBonuses(item);
  return stats.length ? stats.join(' · ') : item.descTh || 'อุปกรณ์พิเศษ';
}

const rollBetween = (min: number, max: number, random: () => number, decimals = 2) =>
  Number((min + random() * (max - min)).toFixed(decimals));

const ROLLABLE_STATS: Array<{ key: EquipmentStatKey; roll: (random: () => number) => number }> = [
  { key: 'bonusDamagePercent', roll: (r) => rollBetween(0.05, 0.20, r) },
  { key: 'bonusAttackSpeedPercent', roll: (r) => rollBetween(0.05, 0.15, r) },
  { key: 'bonusCritChance', roll: (r) => rollBetween(0.03, 0.10, r) },
  { key: 'bonusCritDamagePercent', roll: (r) => rollBetween(0.10, 0.30, r) },
  { key: 'bonusLifesteal', roll: (r) => rollBetween(0.01, 0.04, r) },
  { key: 'bonusMaxHpPercent', roll: (r) => rollBetween(0.10, 0.20, r) },
  { key: 'bonusHp', roll: (r) => Math.round(20 + r() * 40) },
  { key: 'bonusShield', roll: (r) => Math.round((10 + r() * 30) / 2) * 2 },
  { key: 'bonusDamageReduction', roll: (r) => rollBetween(0.03, 0.10, r) },
  { key: 'bonusDodgeChance', roll: (r) => rollBetween(0.03, 0.08, r) },
  { key: 'bonusHpRegen', roll: (r) => rollBetween(0.5, 2, r, 1) },
  { key: 'bonusMoveSpeedPercent', roll: (r) => rollBetween(0.05, 0.12, r) },
  { key: 'bonusCooldownReduction', roll: (r) => rollBetween(0.05, 0.15, r) },
  { key: 'bonusCoinGain', roll: (r) => rollBetween(0.10, 0.30, r) },
  { key: 'bonusChestLuck', roll: (r) => rollBetween(0.03, 0.10, r) },
];

const PERK_POOL: Array<{ perk: EquipmentPerk; text: string }> = [
  { perk: { type: 'kill_heal', value: 0.04 }, text: 'สังหารศัตรูแล้วฟื้นเลือด 4% ของเลือดสูงสุด' },
  { perk: { type: 'kill_gold', value: 10 }, text: 'สังหารศัตรูแล้วรับเหรียญเพิ่ม 10 เหรียญ' },
  { perk: { type: 'kill_haste', value: 0.12, duration: 3 }, text: 'สังหารศัตรูแล้วความเร็วโจมตี +12% นาน 3 วินาที' },
  { perk: { type: 'hit_guard', value: 10, duration: 3 }, text: 'เมื่อโดนโจมตี รับโล่ชั่วคราว 10 แต้ม นาน 3 วินาที' },
  { perk: { type: 'hit_reduce', value: 0.20, duration: 3 }, text: 'เมื่อโดนโจมตี ลดดาเมจที่ได้รับ 20% นาน 3 วินาที' },
  { perk: { type: 'hit_push', value: 4 }, text: 'เมื่อโดนโจมตี ผลักศัตรูรอบตัวถอยออกไป' },
  { perk: { type: 'crit_haste', value: 0.02, duration: 4 }, text: 'คริติคอลสะสมความเร็วโจมตี +2% สูงสุด 10 ชั้น นาน 4 วินาที' },
  { perk: { type: 'low_hp_damage', value: 0.20 }, text: 'เมื่อเลือดต่ำกว่า 30% ดาเมจเพิ่ม 20%' },
  { perk: { type: 'low_hp_shield', value: 25 }, text: 'เมื่อเลือดต่ำกว่า 30% รับโล่ฉุกเฉิน 25 แต้ม 1 ครั้งต่อห้อง' },
  { perk: { type: 'full_hp_damage', value: 0.15 }, text: 'เมื่อเลือดเต็ม ดาเมจเพิ่ม 15%' },
  { perk: { type: 'status_burn', status: 'burn', chance: 0.22, duration: 2.5, value: 12 }, text: 'การโจมตีมีโอกาส 22% ทำให้ติดไฟ' },
  { perk: { type: 'status_bleed', status: 'bleed', chance: 0.22, duration: 3, value: 10 }, text: 'การโจมตีมีโอกาส 22% ทำให้เลือดออก' },
  { perk: { type: 'status_slow', status: 'slow', chance: 0.22, duration: 2.2, value: 12 }, text: 'การโจมตีมีโอกาส 22% ทำให้ศัตรูช้าลง' },
  { perk: { type: 'status_shock', status: 'shock', chance: 0.18, duration: 0.45, value: 8 }, text: 'การโจมตีมีโอกาส 18% ช็อกและขัดจังหวะศัตรู' },
];

const LEGACY_AFFIX_KEYS: EquipmentStatKey[] = ['bonusAttack', 'bonusAttackSpeed', 'bonusDefense'];
const ALL_AFFIX_KEYS = [...ROLLABLE_STATS.map(({ key }) => key), ...LEGACY_AFFIX_KEYS] as EquipmentStatKey[];

export function rollEquipmentVariant(item: EquipmentItem, random: () => number = Math.random): EquipmentItem {
  const rolled: EquipmentItem = {
    ...item,
    templateId: item.templateId ?? item.id,
    bonusHp: undefined,
    bonusShield: undefined,
    bonusAttack: undefined,
    bonusDefense: undefined,
    bonusCritChance: undefined,
    bonusMoveSpeed: undefined,
    bonusAttackSpeed: undefined,
    bonusDamagePercent: undefined,
    bonusAttackSpeedPercent: undefined,
    bonusCritDamagePercent: undefined,
    bonusLifesteal: undefined,
    bonusMaxHpPercent: undefined,
    bonusDamageReduction: undefined,
    bonusDodgeChance: undefined,
    bonusHpRegen: undefined,
    bonusMoveSpeedPercent: undefined,
    bonusCooldownReduction: undefined,
    bonusCoinGain: undefined,
    bonusChestLuck: undefined,
    perk: undefined,
    specialPerkTh: undefined,
  };
  const amount = item.rarity === 'common' ? 1 : 2;
  const isTradeoffLegendary = item.rarity === 'legendary' && random() < 0.34;
  if (isTradeoffLegendary) {
    rolled.bonusDamagePercent = 0.40;
    rolled.bonusMaxHpPercent = -0.20;
  } else {
    const pool = [...ROLLABLE_STATS];
    for (let i = 0; i < amount; i++) {
      const index = Math.floor(random() * pool.length);
      const affix = pool.splice(index, 1)[0];
      (rolled as any)[affix.key] = affix.roll(random);
    }
  }

  if (item.rarity === 'legendary') {
    const { perk, text } = PERK_POOL[Math.floor(random() * PERK_POOL.length)];
    rolled.perk = perk;
    rolled.specialPerkTh = text;
  }

  // Existing template descriptions listed their old fixed bonuses. Replace them
  // with a short accurate line; the exact rolled values are shown separately.
  rolled.descTh = 'อุปกรณ์เพิ่มสถานะสุ่มตามระดับความหายาก ค่าที่ได้รับแสดงด้านล่าง';
  return rolled;
}

export function countEquipmentAffixes(item: EquipmentItem): number {
  return ALL_AFFIX_KEYS.filter((key) => typeof item[key] === 'number' && item[key] !== 0).length;
}
