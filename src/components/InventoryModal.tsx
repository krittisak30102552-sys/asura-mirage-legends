import React, { useState } from 'react';
import { Check, Heart, Minus, Shield, Sparkles, Wind, X, Zap } from 'lucide-react';
import { EquipmentItem, MAX_EQUIPPED_ITEMS, PlayerStats } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { EQUIPMENT_STAT_DEFINITIONS } from '../game/equipmentStats';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  equippedItems: EquipmentItem[];
  inventory: EquipmentItem[];
  onEquipItem: (item: EquipmentItem, replaceItemId?: string) => void;
  onUnequipItem: (itemId: string) => void;
}

const RARITY_COLORS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  common: { border: 'border-zinc-600', bg: 'bg-zinc-900', text: 'text-zinc-200', label: 'ทั่วไป · 1 ค่า' },
  rare: { border: 'border-sky-500', bg: 'bg-sky-950/40', text: 'text-sky-300', label: 'หายาก · 2 ค่า' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-950/40', text: 'text-purple-300', label: 'มหากาพย์ · 2 ค่า' },
  legendary: { border: 'border-amber-400', bg: 'bg-amber-950/40', text: 'text-amber-300', label: 'ตำนาน · 2 ค่า + พิเศษ' },
};

const itemFamily = (item: EquipmentItem) => item.templateId ?? item.id;

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  stats,
  equippedItems,
  inventory,
  onEquipItem,
  onUnequipItem,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  if (!isOpen) return null;

  const selectedItem = inventory.find((item) => item.id === selectedItemId) ?? inventory[0] ?? null;
  const isEquipped = (item: EquipmentItem) => equippedItems.some((equipped) => equipped.id === item.id);
  const compareItem = selectedItem
    ? equippedItems.find((equipped) => itemFamily(equipped) === itemFamily(selectedItem) && equipped.id !== selectedItem.id)
    : undefined;

  const handleUnequip = (itemId: string) => {
    soundEngine.playEquipItem();
    onUnequipItem(itemId);
  };

  const handleEquip = (item: EquipmentItem, replaceItemId?: string) => {
    soundEngine.playEquipItem();
    onEquipItem(item, replaceItemId);
  };

  const renderItemStats = (item: EquipmentItem, comparison?: EquipmentItem) => {
    const visibleStats = EQUIPMENT_STAT_DEFINITIONS.filter(({ key }) =>
      (item[key] ?? 0) !== 0 || (comparison?.[key] ?? 0) !== 0
    );
    if (!visibleStats.length) {
      return <span className="text-[10px] text-zinc-400">{item.specialPerkTh || item.descTh}</span>;
    }

    return visibleStats.map(({ key, label, format }) => {
      const value = item[key] ?? 0;
      const comparedValue = comparison?.[key] ?? value;
      const color = comparison
        ? value > comparedValue ? 'text-emerald-300' : value < comparedValue ? 'text-rose-400' : 'text-zinc-300'
        : value < 0 ? 'text-rose-400' : 'text-emerald-300';
      return (
        <span key={key} className={`mr-2 inline-block text-[10px] ${color}`}>
          {label} {format(value)}
        </span>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 select-none animate-fade-in pointer-events-auto">
      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border-2 border-amber-600/80 bg-zinc-950 p-4 text-zinc-200 shadow-2xl sm:p-6">
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white">
          <X size={20} />
        </button>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3 pr-8">
          <div>
            <h2 className="font-pixel text-sm text-amber-300 sm:text-base">อุปกรณ์เพิ่มสถานะ</h2>
            <p className="mt-1 text-xs text-zinc-400">ใส่ได้สูงสุด {MAX_EQUIPPED_ITEMS} ชิ้น · ของชนิดเดียวกันเทียบค่าสถานะให้แล้ว</p>
          </div>
          <div className="rounded-lg border border-amber-500/40 bg-zinc-900 px-3 py-2 font-pixel text-xs text-amber-300">
            {equippedItems.length}/{MAX_EQUIPPED_ITEMS} ชิ้นที่ใส่
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[0.9fr_1.1fr] lg:overflow-hidden">
          <section className="flex min-h-0 flex-col rounded-xl border border-amber-900/60 bg-zinc-900/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-pixel text-[11px] text-amber-200">ช่องอุปกรณ์</h3>
              <span className="text-[10px] text-zinc-500">กด − เพื่อถอด</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:overflow-y-auto lg:pr-1">
              {Array.from({ length: MAX_EQUIPPED_ITEMS }, (_, index) => {
                const item = equippedItems[index];
                const rarity = item ? RARITY_COLORS[item.rarity] : null;
                return (
                  <div key={item?.id ?? `empty-${index}`} className={`relative min-h-24 rounded-xl border p-2 ${item ? `${rarity?.border} ${rarity?.bg}` : 'border-dashed border-zinc-700 bg-zinc-950/50'}`}>
                    {item ? (
                      <>
                        <button onClick={() => setSelectedItemId(item.id)} className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
                          <span className="text-2xl">{item.icon}</span>
                          <span className="line-clamp-2 text-[10px] leading-tight text-zinc-200">{item.nameTh}</span>
                        </button>
                        <button onClick={() => handleUnequip(item.id)} title="ถอดอุปกรณ์" className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-zinc-300 hover:text-rose-300">
                          <Minus size={12} />
                        </button>
                        <span className="absolute bottom-1 left-1 text-[8px] text-zinc-500">#{index + 1}</span>
                      </>
                    ) : (
                      <div className="flex h-full min-h-20 flex-col items-center justify-center text-center text-zinc-600">
                        <PlusIcon />
                        <span className="mt-1 text-[9px]">ช่องว่าง {index + 1}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-center">
              <div><Heart className="mx-auto mb-1 text-rose-400" size={15} /><span className="text-[10px]">HP {Math.round(stats.maxHp)}</span></div>
              <div><Zap className="mx-auto mb-1 text-amber-300" size={15} /><span className="text-[10px]">โจมตี {stats.attackPower}</span></div>
              <div><Shield className="mx-auto mb-1 text-sky-300" size={15} /><span className="text-[10px]">โล่ {Math.round(stats.maxShield)}</span></div>
              <div><Sparkles className="mx-auto mb-1 text-purple-300" size={15} /><span className="text-[10px]">คริ {Math.round(stats.critChance * 100)}%</span></div>
              <div><Wind className="mx-auto mb-1 text-emerald-300" size={15} /><span className="text-[10px]">เคลื่อนที่ {stats.moveSpeed.toFixed(1)}</span></div>
              <div><Shield className="mx-auto mb-1 text-cyan-300" size={15} /><span className="text-[10px]">ป้องกัน {stats.defense}</span></div>
              <div><Zap className="mx-auto mb-1 text-amber-300" size={15} /><span className="text-[10px]">ความเร็วตี {stats.attackSpeed.toFixed(2)}x</span></div>
              <div><Heart className="mx-auto mb-1 text-rose-300" size={15} /><span className="text-[10px]">ดูดเลือด {Math.round(stats.lifesteal * 100)}%</span></div>
              <div><Shield className="mx-auto mb-1 text-sky-300" size={15} /><span className="text-[10px]">ลดดาเมจ {Math.round(stats.damageReduction * 100)}%</span></div>
              <div><Wind className="mx-auto mb-1 text-cyan-300" size={15} /><span className="text-[10px]">หลบ {Math.round(stats.dodgeChance * 100)}%</span></div>
              <div><Heart className="mx-auto mb-1 text-green-300" size={15} /><span className="text-[10px]">ฟื้น {stats.hpRegen.toFixed(1)}/วิ</span></div>
              <div><Zap className="mx-auto mb-1 text-violet-300" size={15} /><span className="text-[10px]">ลดคูลดาวน์ {Math.round(stats.cooldownReduction * 100)}%</span></div>
              <div><Sparkles className="mx-auto mb-1 text-yellow-200" size={15} /><span className="text-[10px]">คริดาเมจ {stats.critMultiplier.toFixed(2)}x</span></div>
              <div><span className="mb-1 block text-sm">🪙</span><span className="text-[10px]">เหรียญ +{Math.round(stats.coinGain * 100)}%</span></div>
              <div><span className="mb-1 block text-sm">📦</span><span className="text-[10px]">โชคกล่อง +{Math.round(stats.chestLuck * 100)}%</span></div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-pixel text-[11px] text-zinc-100">อุปกรณ์ทั้งหมด</h3>
              <span className="text-[10px] text-zinc-500">{inventory.length} ชิ้น</span>
            </div>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {inventory.map((item) => {
                const rarity = RARITY_COLORS[item.rarity];
                const equipped = isEquipped(item);
                const comparison = equipped
                  ? undefined
                  : equippedItems.find((current) => itemFamily(current) === itemFamily(item));
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`rounded-xl border p-3 text-left transition ${rarity.border} ${rarity.bg} ${isSelected ? 'ring-2 ring-amber-300' : 'hover:brightness-125'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-xs font-bold ${rarity.text}`}>{item.nameTh}</span>
                          {equipped && <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[8px] text-emerald-300">ใส่อยู่</span>}
                        </div>
                        <span className="text-[9px] text-zinc-500">{rarity.label}</span>
                        <div className="mt-1 leading-relaxed">{renderItemStats(item, comparison)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {inventory.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">ยังไม่มีอุปกรณ์ ลองเปิดกล่องหรือแวะหาแฮปปี้ดูสิ</p>}
            </div>

            {selectedItem && (
              <div className="mt-3 rounded-xl border border-amber-700/50 bg-zinc-950 p-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{selectedItem.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-amber-100">{selectedItem.nameTh}</div>
                    <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">{selectedItem.descTh}</p>
                    {selectedItem.specialPerkTh && <p className="mt-2 text-[10px] leading-relaxed text-purple-200">✦ {selectedItem.specialPerkTh}</p>}
                    {compareItem && <p className="mt-2 text-[10px] text-zinc-500">เทียบกับชิ้นที่ใส่อยู่: <span className="text-amber-200">{compareItem.nameTh}</span></p>}
                    <div className="mt-1 leading-relaxed">{renderItemStats(selectedItem, compareItem)}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {isEquipped(selectedItem) ? (
                    <button onClick={() => handleUnequip(selectedItem.id)} className="rounded-lg border border-rose-700 bg-rose-950/60 px-3 py-2 text-xs text-rose-200 hover:bg-rose-900">ถอดชิ้นนี้</button>
                  ) : (
                    <>
                      {equippedItems.length < MAX_EQUIPPED_ITEMS && (
                        <button onClick={() => handleEquip(selectedItem)} className="rounded-lg border border-emerald-600 bg-emerald-950/70 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900">สวมใส่เพิ่ม</button>
                      )}
                      {compareItem && (
                        <button onClick={() => handleEquip(selectedItem, compareItem.id)} className="rounded-lg border border-sky-600 bg-sky-950/70 px-3 py-2 text-xs text-sky-200 hover:bg-sky-900">แทนที่ชิ้นเดิม: {compareItem.nameTh}</button>
                      )}
                      {equippedItems.length >= MAX_EQUIPPED_ITEMS && !compareItem && (
                        <div className="w-full">
                          <p className="mb-2 text-[10px] text-amber-200">ใส่ครบ 10 ชิ้นแล้ว เลือกชิ้นที่จะให้แทนที่:</p>
                          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                            {equippedItems.map((item, index) => (
                              <button key={item.id} onClick={() => handleEquip(selectedItem, item.id)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[9px] text-zinc-300 hover:border-amber-400 hover:text-white">
                                แทน #{index + 1} {item.nameTh}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {isEquipped(selectedItem) && <span className="flex items-center gap-1 self-center text-[10px] text-emerald-300"><Check size={13} /> กำลังใช้</span>}
                  {!isEquipped(selectedItem) && compareItem && <span className="self-center text-[10px] text-zinc-500">ตัวเลขเขียว = ดีกว่า · แดง = ด้อยกว่า</span>}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

const PlusIcon: React.FC = () => <span className="text-xl leading-none">＋</span>;
