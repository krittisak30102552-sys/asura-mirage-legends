/**
 * Stat Upgrade Modal (North Chamber Device: อุปกรณ์เพิ่มสถานะ)
 * Allows player to spend dungeon gold to enhance their 6 core combat stats:
 * - Health (พลังชีวิต)
 * - Armor (เกราะหรือค่าป้องกัน)
 * - Damage (ความแรงในการโจมตี)
 * - Critical Rate (โอกาสติดคริติคอล)
 * - Attack Speed (ความเร็วในการโจมตี)
 * - Movement Speed (ความเร็วในการเคลื่อนที่)
 */

import React from 'react';
import { X, Zap, Shield, Heart, Sparkles, Wind, Flame, Plus, Check } from 'lucide-react';
import { PlayerStats, StatUpgradeType } from '../types/game';
import { STAT_UPGRADES_CONFIG, StatUpgradeOption } from '../data/gameData';
import { soundEngine } from '../audio/soundEngine';

interface StatUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  gold: number;
  upgradeCounts: Record<StatUpgradeType, number>;
  onBuyUpgrade: (type: StatUpgradeType) => boolean;
}

export const StatUpgradeModal: React.FC<StatUpgradeModalProps> = ({
  isOpen,
  onClose,
  stats,
  gold,
  upgradeCounts,
  onBuyUpgrade,
}) => {
  if (!isOpen) return null;

  const handlePurchase = (opt: StatUpgradeOption) => {
    if (gold < opt.cost) {
      soundEngine.playHurt();
      return;
    }
    const success = onBuyUpgrade(opt.type);
    if (success) {
      soundEngine.playCoin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-purple-500/90 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-200 flex flex-col justify-between overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-950/70 border border-purple-500 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-purple-500/20">
              🔮
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-pixel text-purple-400 text-sm font-bold">
                  อุปกรณ์เพิ่มสถานะ (STAT AMPLIFICATION DEVICE)
                </h3>
                <span className="text-[9px] font-pixel bg-purple-500 text-zinc-950 font-bold px-1.5 py-0.5 rounded">
                  NORTH ROOM
                </span>
              </div>
              <p className="text-xs font-rajdhani text-zinc-400 mt-0.5">
                แท่นศิลาจารึกพลังโบราณ ใช้เหรียญทองเพื่อเสริมค่าสถานะการต่อสู้ถาวรตลอดการลงดันเจี้ยนรอบนี้
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-amber-500/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-pixel text-amber-400 shrink-0">
            <span>🪙 {gold}</span>
            <span className="text-[10px] text-zinc-400 font-rajdhani">GOLD</span>
          </div>
        </div>

        {/* Current Stat Summary Ribbon */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl mb-4 text-center font-rajdhani text-xs">
          <div className="flex flex-col items-center">
            <span className="text-zinc-400 text-[10px]">HP สูงสุด</span>
            <span className="font-pixel text-xs text-rose-400 font-bold">{stats.maxHp}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-400 text-[10px]">เกราะป้องกัน</span>
            <span className="font-pixel text-xs text-sky-400 font-bold">{stats.maxShield}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-400 text-[10px]">ดาเมจ (ATK)</span>
            <span className="font-pixel text-xs text-amber-400 font-bold">{stats.attackPower}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-400 text-[10px]">ความเร็วโจมตี</span>
            <span className="font-pixel text-xs text-pink-400 font-bold">{stats.attackSpeed.toFixed(2)}x</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-400 text-[10px]">ความเร็วเดิน</span>
            <span className="font-pixel text-xs text-emerald-400 font-bold">{stats.moveSpeed.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-400 text-[10px]">คริติคอล</span>
            <span className="font-pixel text-xs text-purple-400 font-bold">{Math.round(stats.critChance * 100)}%</span>
          </div>
        </div>

        {/* Stat Upgrade Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[50vh] pr-1">
          {STAT_UPGRADES_CONFIG.map((opt) => {
            const count = upgradeCounts[opt.type] || 0;
            const canAfford = gold >= opt.cost;

            return (
              <div
                key={opt.type}
                className="bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/70 p-3.5 rounded-xl flex items-center justify-between gap-3 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border"
                    style={{ backgroundColor: `${opt.iconColor}22`, borderColor: opt.iconColor }}
                  >
                    {opt.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-zinc-100 font-rajdhani">
                        {opt.nameTh}
                      </span>
                      {count > 0 && (
                        <span className="text-[9px] font-pixel bg-purple-900/80 text-purple-300 px-1 py-0.2 rounded border border-purple-600">
                          +{count}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-pixel text-emerald-400 mt-0.5">
                      {opt.bonusText}
                    </div>
                    <div className="text-[10px] font-rajdhani text-zinc-400">
                      {opt.descTh}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(opt)}
                  disabled={!canAfford}
                  className={`px-3.5 py-2 rounded-lg font-pixel text-[10px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    canAfford
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md active:scale-95'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>🪙 {opt.cost}</span>
                  <Plus size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-rajdhani text-zinc-400">
          <span>💡 คำแนะนำ: ค่าสถานะที่อัปเกรดในห้องนี้จะส่งผลตลอดทั้ง 20 เวฟ และจะรีเซ็ตเมื่อกลับล็อบบี้</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-pixel text-[10px] rounded-lg transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
