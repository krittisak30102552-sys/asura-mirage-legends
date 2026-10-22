/**
 * Chest Reward Modal:
 * Handles chest openings with pity system display
 * White 60%, Blue 30%, Gold 10%, Themed (Secret Boss)
 * Pity: After 3 non-gold chests, next gets +15%
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { EquipmentItem } from '../types/game';
import { EQUIPMENT_STAT_DEFINITIONS, formatEquipmentStatSummary } from '../game/equipmentStats';

interface ChestRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rarity: 'white' | 'blue' | 'gold' | 'themed';
  reward: {
    type: 'gold' | 'relic' | 'equipment';
    titleTh: string;
    descTh: string;
    icon: string;
    amount?: number;
    rawItem?: EquipmentItem;
  };
  consecutiveNonGold: number;
  equippedItems: EquipmentItem[];
  onReplaceEquipment: (item: EquipmentItem, replaceItemId: string) => void;
}

export const ChestRewardModal: React.FC<ChestRewardModalProps> = ({
  isOpen,
  onClose,
  rarity,
  reward,
  consecutiveNonGold,
  equippedItems,
  onReplaceEquipment,
}) => {
  const [opened, setOpened] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) setOpened(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const rarityMeta = {
    white: {
      nameTh: 'หีบทั่วไป (WHITE CHEST)',
      badgeColor: '#94a3b8',
      bgGlow: 'from-slate-900/80 to-zinc-950',
      borderCol: 'border-slate-500',
      icon: '📦',
      chance: '60%',
    },
    blue: {
      nameTh: 'หีบหายาก (BLUE CHEST)',
      badgeColor: '#38bdf8',
      bgGlow: 'from-sky-950/80 to-zinc-950',
      borderCol: 'border-sky-500',
      icon: '💎',
      chance: '30%',
    },
    gold: {
      nameTh: 'หีบทองคำในตำนาน (GOLD CHEST)',
      badgeColor: '#fbbf24',
      bgGlow: 'from-amber-950/80 to-zinc-950',
      borderCol: 'border-amber-400',
      icon: '👑',
      chance: '10%',
    },
    themed: {
      nameTh: 'หีบลับประจำบอส (THEMED SECRET CHEST)',
      badgeColor: '#c084fc',
      bgGlow: 'from-purple-950/80 to-zinc-950',
      borderCol: 'border-purple-400',
      icon: '🔮',
      chance: 'UNIQUE',
    },
  }[rarity];
  const equipmentRarityLabel = reward.rawItem ? ({
    common: 'ทั่วไป · 1 ค่าสถานะ',
    rare: 'หายาก · 2 ค่า หรือพลังตามเงื่อนไข',
    epic: 'มหากาพย์ · 2 ค่าสถานะ',
    legendary: 'ตำนาน · ค่าสูง + พลังพิเศษ',
  }[reward.rawItem.rarity]) : null;
  const family = (item: EquipmentItem) => item.templateId ?? item.id;
  const comparisonItem = reward.rawItem
    ? equippedItems.find((item) => family(item) === family(reward.rawItem!) && item.id !== reward.rawItem!.id)
    : undefined;
  const compareStats = reward.rawItem && comparisonItem
    ? EQUIPMENT_STAT_DEFINITIONS.filter(({ key }) => (reward.rawItem?.[key] ?? 0) !== 0 || (comparisonItem[key] ?? 0) !== 0)
    : [];

  const handleOpenChest = () => {
    setOpened(true);
  };

  const handleConfirm = () => {
    setOpened(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none animate-fade-in backdrop-blur-xs">
      <div
        className={`relative w-full max-w-md bg-zinc-950 border-2 ${rarityMeta.borderCol} rounded-2xl p-6 shadow-2xl text-zinc-200 flex flex-col items-center justify-between overflow-hidden`}
      >
        {/* Rarity Header */}
        <div className="flex flex-col items-center text-center mb-4">
          <span
            className="text-[10px] font-pixel px-2.5 py-0.5 rounded-full font-bold mb-2 uppercase"
            style={{
              backgroundColor: `${rarityMeta.badgeColor}20`,
              color: rarityMeta.badgeColor,
              border: `1px solid ${rarityMeta.badgeColor}`,
            }}
          >
            {rarityMeta.nameTh}
          </span>
          <h3 className="font-pixel text-zinc-100 text-sm">
            {opened ? 'สมบัติที่ได้รับ (CHEST REWARDS)' : 'ค้นพบหีบสมบัติประจำห้อง!'}
          </h3>
        </div>

        {/* Interactive Chest Graphic */}
        <div className="my-4 flex flex-col items-center justify-center">
          {!opened ? (
            <button
              onClick={handleOpenChest}
              className="group cursor-pointer flex flex-col items-center p-6 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-amber-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black"
            >
              <div className="text-6xl mb-2 animate-bounce">{rarityMeta.icon}</div>
              <span className="font-pixel text-xs text-amber-300 font-bold group-hover:text-amber-200">
                [ คลิกเพื่อเปิดหีบ ]
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center animate-fade-in text-center p-5 rounded-2xl bg-zinc-900/90 border border-zinc-700 w-full shadow-inner">
              <div className="text-5xl mb-3 animate-pulse">{reward.icon}</div>
              <h4 className="font-rajdhani font-bold text-lg text-amber-300 mb-1">
                {reward.titleTh}
              </h4>
              {reward.rawItem && (
                <>
                  <div className="text-[10px] font-pixel text-purple-300 mb-1">ระดับอุปกรณ์: {equipmentRarityLabel}</div>
                  {reward.rawItem.specialPerkTh && comparisonItem && <p className="mb-2 max-w-xs text-[10px] leading-snug text-purple-200">✦ {reward.rawItem.specialPerkTh}</p>}
                  {comparisonItem ? (
                    <div className="mb-2 max-w-xs text-left">
                      <p className="mb-1 text-[9px] text-zinc-400">เทียบกับชิ้นที่ใส่อยู่: {comparisonItem.nameTh}</p>
                      <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                        {compareStats.map(({ key, label, format }) => {
                          const candidate = reward.rawItem?.[key] ?? 0;
                          const current = comparisonItem[key] ?? 0;
                          const color = candidate > current ? 'text-emerald-300' : candidate < current ? 'text-rose-400' : 'text-zinc-300';
                          return <span key={key} className={`text-[10px] font-bold ${color}`}>{label} {format(candidate)}</span>;
                        })}
                      </div>
                      <p className="mt-1 text-center text-[9px] text-zinc-500">เขียว = ดีกว่า · แดง = ด้อยกว่า</p>
                    </div>
                  ) : (
                    <p className="mb-2 max-w-xs text-[11px] font-bold leading-snug text-emerald-200">{formatEquipmentStatSummary(reward.rawItem)}</p>
                  )}
                </>
              )}
              <p className="text-xs font-rajdhani text-zinc-300 leading-snug max-w-xs mb-2">
                {reward.descTh}
              </p>
              {reward.amount && (
                <div className="bg-amber-950/60 border border-amber-500/60 px-3 py-1 rounded font-pixel text-xs text-amber-300">
                  +{reward.amount} เหรียญทอง 💰
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pity Counter Info */}
        <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 mb-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-rajdhani text-zinc-400">
            <Sparkles size={12} className="text-amber-400" />
            <span>ระบบ Pity กล่องทอง:</span>
            <span className="font-bold text-amber-300 font-pixel text-[10px]">
              {consecutiveNonGold}/3
            </span>
            {consecutiveNonGold >= 3 ? (
              <span className="text-emerald-400 font-bold font-rajdhani ml-1">
                (การันตีเพิ่มโอกาสทอง +15%!)
              </span>
            ) : (
              <span className="text-zinc-500 font-rajdhani ml-1">
                (ไม่เจอกล่องทอง 3 ครั้งติด กล่องถัดไป +15%)
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {opened && (
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-zinc-950 font-pixel text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={14} />
            <span>รับของรางวัล (CLAIM REWARD)</span>
          </button>
        )}
        {opened && reward.rawItem && comparisonItem && (
          <button
            onClick={() => onReplaceEquipment(reward.rawItem!, comparisonItem.id)}
            className="mt-2 w-full rounded-xl border border-sky-500 bg-sky-950/70 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-900"
          >
            เปลี่ยนมาใส่ชิ้นนี้แทน {comparisonItem.nameTh}
          </button>
        )}
      </div>
    </div>
  );
};
