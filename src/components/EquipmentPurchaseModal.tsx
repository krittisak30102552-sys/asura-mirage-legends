import React from 'react';
import { Check, Coins, Heart, Shield, Sparkles, Wind, X, Zap } from 'lucide-react';
import { EquipmentItem, MAX_EQUIPPED_ITEMS } from '../types/game';
import { ShopOfferItem } from '../game/levelSystem';
import { EQUIPMENT_STAT_DEFINITIONS, EquipmentStatKey } from '../game/equipmentStats';

interface EquipmentPurchaseModalProps {
  offer: ShopOfferItem | null;
  gold: number;
  equippedItems: EquipmentItem[];
  onClose: () => void;
  onPurchase: () => void;
}

const rarityStyle = {
  common: { label: 'ทั่วไป · 1 ค่า', frame: 'border-zinc-500/70', text: 'text-zinc-200', glow: 'shadow-zinc-500/10' },
  rare: { label: 'หายาก · 2 ค่า หรือพลังตามเงื่อนไข', frame: 'border-sky-400/80', text: 'text-sky-200', glow: 'shadow-sky-500/20' },
  epic: { label: 'มหากาพย์ · 2 ค่า', frame: 'border-purple-400/80', text: 'text-purple-200', glow: 'shadow-purple-500/20' },
  legendary: { label: 'ตำนาน · ค่าสูง + พลังพิเศษ', frame: 'border-amber-300/90', text: 'text-amber-200', glow: 'shadow-amber-400/25' },
} as const;

const statIcon = (key: EquipmentStatKey) => {
  if (['bonusDamagePercent', 'bonusAttack'].includes(key)) return <Zap size={15} />;
  if (['bonusAttackSpeedPercent', 'bonusAttackSpeed', 'bonusMoveSpeedPercent', 'bonusMoveSpeed'].includes(key)) return <Wind size={15} />;
  if (['bonusHp', 'bonusMaxHpPercent', 'bonusHpRegen', 'bonusLifesteal'].includes(key)) return <Heart size={15} />;
  if (['bonusShield', 'bonusDefense', 'bonusDamageReduction', 'bonusDodgeChance'].includes(key)) return <Shield size={15} />;
  if (key === 'bonusCoinGain') return <Coins size={15} />;
  return <Sparkles size={15} />;
};
const statRows = EQUIPMENT_STAT_DEFINITIONS.map((stat) => ({ ...stat, icon: statIcon(stat.key) }));

const itemFamily = (item: EquipmentItem) => item.templateId ?? item.id;

export const EquipmentPurchaseModal: React.FC<EquipmentPurchaseModalProps> = ({
  offer,
  gold,
  equippedItems,
  onClose,
  onPurchase,
}) => {
  if (!offer) return null;

  const item = offer.itemData;
  const rarity = rarityStyle[item.rarity];
  const comparison = equippedItems.find((equipped) => itemFamily(equipped) === itemFamily(item));
  const visibleStats = statRows.filter(({ key }) => (item[key] ?? 0) !== 0 || (comparison?.[key] ?? 0) !== 0);
  const canAfford = gold >= offer.cost;
  const canAutoEquip = !comparison && equippedItems.length < MAX_EQUIPPED_ITEMS;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="purchase-item-title" className={`relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 ${rarity.frame} bg-zinc-950 text-zinc-100 shadow-2xl ${rarity.glow}`}>
        <button type="button" onClick={onClose} aria-label="ปิดรายละเอียด" className="absolute right-3 top-3 z-10 rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <X size={20} />
        </button>

        <header className="flex items-center gap-4 border-b border-zinc-800 bg-gradient-to-r from-pink-950/60 to-zinc-950 p-5 pr-14">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border ${rarity.frame} bg-zinc-900 text-4xl`}>{offer.icon}</div>
          <div className="min-w-0">
            <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${rarity.text}`}>{rarity.label} · อุปกรณ์เพิ่มสถานะ</div>
            <h2 id="purchase-item-title" className="mt-1 text-lg font-black leading-tight text-white">{offer.nameTh}</h2>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-300"><Coins size={14} /> ราคา {offer.cost} เหรียญ</div>
          </div>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
          <section>
            <h3 className="mb-1 text-xs font-bold tracking-wide text-zinc-300">ไอเทมนี้ทำอะไรได้?</h3>
            <p className="text-sm leading-relaxed text-zinc-400">{item.descTh || offer.descTh || 'อุปกรณ์ชิ้นนี้ช่วยเพิ่มค่าสถานะของตัวละคร'}</p>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <h3 className="mb-2 text-xs font-bold tracking-wide text-emerald-200">ค่าสถานะที่จะได้รับ</h3>
            {visibleStats.length ? (
              <div className="space-y-1.5">
                {visibleStats.map(({ key, label, icon, format }) => {
                  const value = item[key] ?? 0;
                  const current = comparison?.[key] ?? 0;
                  const color = comparison
                    ? value > current ? 'text-emerald-300' : value < current ? 'text-rose-400' : 'text-zinc-300'
                    : value < 0 ? 'text-rose-400' : 'text-emerald-300';
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-zinc-400">{icon}<span>{label}</span></span>
                      <span className={`font-bold ${color}`}>{format(value)}{comparison && <span className="ml-2 text-[10px] font-normal text-zinc-500">(ใส่อยู่ {format(current)})</span>}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-emerald-200">{item.specialPerkTh || 'อุปกรณ์พิเศษ'}</p>
            )}
          </section>

          {item.specialPerkTh && visibleStats.length > 0 && (
            <section className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3">
              <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-purple-200"><Sparkles size={14} /> ความสามารถพิเศษ</h3>
              <p className="text-sm leading-relaxed text-purple-100/80">{item.specialPerkTh}</p>
            </section>
          )}

          {comparison ? (
            <p className="rounded-lg border border-zinc-800 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">มี <span className="text-white">{comparison.nameTh}</span> ใส่อยู่แล้ว · <span className="text-emerald-300">สีเขียว = ค่าดีกว่า</span> · <span className="text-rose-400">สีแดง = ค่าต่ำกว่า</span> · ซื้อแล้วเก็บในกระเป๋าเพื่อเลือกแทนชิ้นเดิมได้</p>
          ) : canAutoEquip ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-200"><Check size={14} /> ยังไม่มีของชนิดนี้ และมีช่องว่าง ซื้อแล้วใส่ให้อัตโนมัติ</p>
          ) : (
            <p className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">ใส่ครบ {MAX_EQUIPPED_ITEMS} ชิ้นแล้ว · ซื้อแล้วเก็บในกระเป๋า จากนั้นเลือกชิ้นที่จะเปลี่ยนในหน้าอุปกรณ์</p>
          )}
        </div>

        <footer className="flex gap-2 border-t border-zinc-800 bg-zinc-950 p-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800">กลับไปดูของ</button>
          <button type="button" onClick={onPurchase} disabled={!canAfford} className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-3 text-sm font-black text-zinc-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            {canAfford ? `ซื้อ · ${offer.cost} 🪙` : `ขาดอีก ${offer.cost - gold} เหรียญ`}
          </button>
        </footer>
      </section>
    </div>
  );
};
