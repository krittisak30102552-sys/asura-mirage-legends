import React, { useState } from 'react';
import { Check, Coins, X } from 'lucide-react';
import { EquipmentItem, MAX_EQUIPPED_ITEMS } from '../types/game';
import { INITIAL_EQUIPMENT } from '../data/gameData';
import { soundEngine } from '../audio/soundEngine';
import { formatEquipmentStatSummary } from '../game/equipmentStats';

interface EquipmentShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  gold: number;
  inventory: EquipmentItem[];
  equippedItems: EquipmentItem[];
  onBuyEquipment: (item: EquipmentItem) => void;
}

const RARITY: Record<string, { text: string; border: string; label: string }> = {
  common: { text: 'text-zinc-300', border: 'border-zinc-700', label: 'ทั่วไป' },
  rare: { text: 'text-sky-300', border: 'border-sky-600', label: 'หายาก' },
  epic: { text: 'text-purple-300', border: 'border-purple-600', label: 'มหากาพย์' },
  legendary: { text: 'text-amber-300', border: 'border-amber-500', label: 'ตำนาน' },
};

const itemFamily = (item: EquipmentItem) => item.templateId ?? item.id;
const STAT_FIELDS: Array<{
  key: 'bonusAttack' | 'bonusCritChance' | 'bonusAttackSpeed' | 'bonusHp' | 'bonusShield' | 'bonusDefense' | 'bonusMoveSpeed';
  label: string;
  format: (value: number) => string;
}> = [
  { key: 'bonusAttack', label: 'โจมตี', format: (value) => `+${value}` },
  { key: 'bonusCritChance', label: 'คริติคอล', format: (value) => `+${Math.round(value * 100)}%` },
  { key: 'bonusAttackSpeed', label: 'ความเร็วโจมตี', format: (value) => `+${value.toFixed(2)}x` },
  { key: 'bonusHp', label: 'พลังชีวิต', format: (value) => `+${value}` },
  { key: 'bonusShield', label: 'โล่', format: (value) => `+${value}` },
  { key: 'bonusDefense', label: 'ป้องกัน', format: (value) => `+${value}` },
  { key: 'bonusMoveSpeed', label: 'ความเร็วเคลื่อนที่', format: (value) => `+${value.toFixed(1)}` },
];

export const EquipmentShopModal: React.FC<EquipmentShopModalProps> = ({
  isOpen,
  onClose,
  gold,
  inventory,
  equippedItems,
  onBuyEquipment,
}) => {
  const catalog = INITIAL_EQUIPMENT.filter((item) =>
    [item.bonusHp, item.bonusShield, item.bonusAttack, item.bonusDefense, item.bonusCritChance, item.bonusMoveSpeed, item.bonusAttackSpeed]
      .some((bonus) => typeof bonus === 'number' && bonus > 0)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!isOpen) return null;

  const selected = catalog.find((item) => item.id === selectedId) ?? catalog[0];
  const compareItem = selected && equippedItems.find((item) => itemFamily(item) === itemFamily(selected));
  const comparedStats = selected
    ? STAT_FIELDS.filter(({ key }) => (selected[key] ?? 0) > 0 || (compareItem?.[key] ?? 0) > 0)
    : [];
  const buy = (item: EquipmentItem) => {
    if (gold < (item.cost ?? 50)) return;
    soundEngine.playBuy();
    onBuyEquipment(item);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 select-none animate-fade-in pointer-events-auto">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-emerald-500/80 bg-zinc-950 p-4 text-zinc-200 shadow-2xl sm:p-6">
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"><X size={20} /></button>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3 pr-8">
          <div>
            <h2 className="font-pixel text-sm text-emerald-300 sm:text-base">แท่นขายอุปกรณ์บัฟ</h2>
            <p className="mt-1 text-xs text-zinc-400">ซื้อซ้ำได้ ค่าสถานะของแต่ละชิ้นสุ่มต่างกัน · ใส่ได้ {equippedItems.length}/{MAX_EQUIPPED_ITEMS}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-zinc-900 px-3 py-2 font-pixel text-xs text-amber-300"><Coins size={15} /> {gold} เหรียญ</div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[1.2fr_0.8fr] lg:overflow-hidden">
          <div className="grid content-start grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {catalog.map((item) => {
              const rarity = RARITY[item.rarity];
              const isSelected = selected?.id === item.id;
              const equippedCopy = equippedItems.find((current) => itemFamily(current) === itemFamily(item));
              const ownedCount = inventory.filter((owned) => itemFamily(owned) === itemFamily(item)).length;
              return (
                <button key={item.id} onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-3 text-left transition ${rarity.border} bg-zinc-900/70 ${isSelected ? 'ring-2 ring-emerald-300' : 'hover:border-emerald-500 hover:bg-zinc-900'}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold ${rarity.text}`}>{item.nameTh}</div>
                      <div className="mt-0.5 text-[9px] text-zinc-500">{rarity.label}{ownedCount ? ` · มีแล้ว ${ownedCount}` : ''}</div>
                      <div className="mt-1 text-[10px] leading-relaxed text-zinc-300">{formatEquipmentStatSummary(item)}</div>
                      {equippedCopy && <div className="mt-1 text-[9px] text-emerald-300">มีชิ้นนี้ใส่อยู่ · {formatEquipmentStatSummary(equippedCopy)}</div>}
                    </div>
                    <span className="shrink-0 text-[10px] text-amber-300">🪙 {item.cost ?? 50}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <aside className="flex flex-col rounded-xl border border-emerald-800/70 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selected.icon}</span>
                <div>
                  <div className={`font-bold ${RARITY[selected.rarity].text}`}>{selected.nameTh}</div>
                  <div className="text-[10px] text-zinc-500">{RARITY[selected.rarity].label}</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">{selected.descTh}</p>
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="mb-1 text-[10px] font-bold text-zinc-400">ค่าสถานะ</div>
                {selected && comparedStats.map(({ key, label, format }) => {
                  const value = selected[key] ?? 0;
                  const current = compareItem?.[key] ?? value;
                  const color = compareItem
                    ? value > current ? 'text-emerald-300' : value < current ? 'text-rose-400' : 'text-zinc-300'
                    : 'text-emerald-200';
                  return <div key={key} className={`text-xs ${color}`}>{label} {format(value)}</div>;
                })}
                {selected.specialPerkTh && <div className="mt-2 text-[10px] text-purple-300">{selected.specialPerkTh}</div>}
                {compareItem && <div className="mt-3 border-t border-zinc-800 pt-2 text-[10px] text-zinc-400">ชิ้นที่ใส่อยู่: {compareItem.nameTh}<br />{formatEquipmentStatSummary(compareItem)}</div>}
              </div>
              <div className="mt-auto pt-4">
                {equippedItems.length >= MAX_EQUIPPED_ITEMS && <p className="mb-2 text-[10px] text-amber-200">ใส่ครบแล้ว ซื้อเก็บในกระเป๋าได้ แล้วค่อยเลือกสลับในหน้าต่างอุปกรณ์</p>}
                <button onClick={() => buy(selected)} disabled={gold < (selected.cost ?? 50)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400 bg-emerald-700 px-4 py-3 font-pixel text-xs text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
                  <Check size={15} /> ซื้อซ้ำได้ · {selected.cost ?? 50} เหรียญ
                </button>
                <p className="mt-2 text-center text-[9px] text-zinc-500">ค่าสถานะของชิ้นที่ซื้อจะสุ่มแยกกัน</p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
