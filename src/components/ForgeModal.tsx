/**
 * Forge Room Modal (In X-2):
 * Offers attack, defense, and healing stat upgrades.
 */

import React from 'react';
import { X, Shield, Sparkles } from 'lucide-react';

interface ForgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerGold: number;
  onUpgradeAttack: (cost: number) => void;
  onUpgradeArmor: (cost: number) => void;
  onReforgeRepair: (cost: number) => void;
  forgeUsed: boolean;
}

export const ForgeModal: React.FC<ForgeModalProps> = ({
  isOpen,
  onClose,
  playerGold,
  onUpgradeAttack,
  onUpgradeArmor,
  onReforgeRepair,
  forgeUsed,
}) => {
  if (!isOpen) return null;

  const costWeapon = 60;
  const costArmor = 50;
  const costRepair = 40;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none animate-fade-in backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-zinc-950 border-2 border-orange-500/90 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-200 flex flex-col justify-between overflow-hidden">
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
            <div className="w-12 h-12 bg-orange-950/60 border border-orange-500 rounded-lg flex items-center justify-center text-2xl shrink-0">
              ⚒️
            </div>
            <div>
              <h3 className="font-pixel text-orange-400 text-sm">
                แท่นเสริมสถานะ (STATUS FORGE)
              </h3>
              <p className="text-xs font-rajdhani text-zinc-400">
                เพิ่มพลังโจมตี เกราะป้องกัน หรือฟื้นฟูร่างกาย
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/60 px-3 py-1.5 rounded-lg mr-8">
            <span className="text-amber-400 text-sm font-pixel">💰</span>
            <span className="text-amber-300 font-pixel text-sm">{playerGold}</span>
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3 mb-5">
          {/* Upgrade 1: Attack stat */}
          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-700 flex items-center justify-between hover:border-orange-400 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-950/60 border border-orange-500/40 flex items-center justify-center text-xl shrink-0">
                ✨
              </div>
              <div>
                <h4 className="font-rajdhani font-bold text-sm text-zinc-100">
                  รูนเพิ่มพลังโจมตี
                </h4>
                <p className="text-xs font-rajdhani text-zinc-400">
                  เพิ่มพลังโจมตีพื้นฐาน +2 Damage อย่างถาวรสำหรับรันนี้
                </p>
              </div>
            </div>

            <button
              disabled={playerGold < costWeapon || forgeUsed}
              onClick={() => onUpgradeAttack(costWeapon)}
              className={`py-2 px-4 rounded-lg font-pixel text-xs font-bold transition-all flex items-center gap-1.5 ${
                playerGold >= costWeapon && !forgeUsed
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 cursor-pointer active:scale-95 shadow-md'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              }`}
            >
              <span>หลอม {costWeapon} 💰</span>
            </button>
          </div>

          {/* Upgrade 2: Armor / Shield */}
          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-700 flex items-center justify-between hover:border-orange-400 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
                🛡️
              </div>
              <div>
                <h4 className="font-rajdhani font-bold text-sm text-zinc-100">
                  ชุบเกราะเหล็กกล้า (REINFORCE ARMOR)
                </h4>
                <p className="text-xs font-rajdhani text-zinc-400">
                  เพิ่มเกราะป้องกัน Armor +15 และ Defense +2 ถาวร
                </p>
              </div>
            </div>

            <button
              disabled={playerGold < costArmor || forgeUsed}
              onClick={() => onUpgradeArmor(costArmor)}
              className={`py-2 px-4 rounded-lg font-pixel text-xs font-bold transition-all flex items-center gap-1.5 ${
                playerGold >= costArmor && !forgeUsed
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 cursor-pointer active:scale-95 shadow-md'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              }`}
            >
              <span>ชุบ {costArmor} 💰</span>
            </button>
          </div>

          {/* Upgrade 3: Repair & Heal */}
          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-700 flex items-center justify-between hover:border-orange-400 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-xl shrink-0">
                💖
              </div>
              <div>
                <h4 className="font-rajdhani font-bold text-sm text-zinc-100">
                  ซ่อมแซมและฟื้นฟูชีพ (TEMPER & RESTORE)
                </h4>
                <p className="text-xs font-rajdhani text-zinc-400">
                  ฟื้นฟูเลือดและเกราะให้เต็ม 100% พร้อมรับมือฉากต่อไป
                </p>
              </div>
            </div>

            <button
              disabled={playerGold < costRepair || forgeUsed}
              onClick={() => onReforgeRepair(costRepair)}
              className={`py-2 px-4 rounded-lg font-pixel text-xs font-bold transition-all flex items-center gap-1.5 ${
                playerGold >= costRepair && !forgeUsed
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-zinc-950 cursor-pointer active:scale-95 shadow-md'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              }`}
            >
              <span>ซ่อม {costRepair} 💰</span>
            </button>
          </div>
        </div>

        {forgeUsed && (
          <div className="bg-orange-950/40 border border-orange-500/60 p-2.5 rounded-xl text-center font-rajdhani text-xs text-orange-300">
            🔥 โรงหลอมได้ทำงานเสร็จสิ้นแล้วสำหรับฉากนี้
          </div>
        )}
      </div>
    </div>
  );
};
