/**
 * Hero Selection & Unlock Modal (In-Lobby NPC: Chanyi the Martial Master)
 * Allows player to choose between Quan Huying and Ginzo.
 */

import React from 'react';
import { X, Check, Heart, Shield, Zap, Sparkles } from 'lucide-react';
import { HeroConfig, HeroId } from '../types/game';

interface HeroSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  gold: number;
  heroes: HeroConfig[];
  activeHeroId: HeroId;
  onSelectHero: (heroId: HeroId) => void;
  onUnlockHero: (heroId: HeroId) => void;
}

export const HeroSelectModal: React.FC<HeroSelectModalProps> = ({
  isOpen,
  onClose,
  gold,
  heroes,
  activeHeroId,
  onSelectHero,
  onUnlockHero,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none animate-fade-in">
      <div className="relative w-full max-w-4xl bg-zinc-950 border-2 border-sky-500/80 rounded-2xl p-6 shadow-2xl text-zinc-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-950/50 border border-sky-500 rounded-lg flex items-center justify-center text-2xl">
              📜
            </div>
            <div>
              <h3 className="font-pixel text-sky-400 text-sm">
                วิหารเลือกตัวละคร (HERO SELECTION)
              </h3>
              <p className="text-xs font-rajdhani text-zinc-400">
                "จงเลือกจอมยุทธ์ที่ตรงกับจิตวิญญาณแห่งการต่อสู้ของเจ้า"
              </p>
            </div>
          </div>
          <div className="bg-zinc-900 border border-amber-500/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-pixel text-amber-400">
            <span>🪙 {gold}</span>
            <span className="text-[10px] text-zinc-400 font-rajdhani">GOLD</span>
          </div>
        </div>

        {/* Heroes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {heroes.map((hero) => {
            const isCurrent = activeHeroId === hero.id;
            const canAfford = gold >= hero.cost;

            return (
              <div
                key={hero.id}
                className={`relative p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-sky-950/30 border-sky-400 ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/20'
                    : 'bg-zinc-900/80 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-700 flex items-center justify-center text-2xl">
                        {hero.icon}
                      </div>
                      <div>
                        <div className="font-bold text-base text-zinc-100 font-rajdhani">
                          {hero.nameTh}
                        </div>
                        <div className="text-[11px] text-amber-400 font-semibold font-rajdhani">
                          {hero.titleTh}
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-pixel text-sky-300 bg-sky-950 border border-sky-500 px-1.5 py-0.5 rounded font-bold">
                        <Check size={10} /> ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-300 font-rajdhani leading-relaxed mb-4">
                    {hero.descTh}
                  </p>

                  {/* Character Stats Preview: All 6 Core Stats */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800 text-xs font-rajdhani mb-4">
                    <div className="flex items-center justify-between text-rose-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Heart size={12} /> HP:
                      </span>
                      <span className="font-pixel text-[10px] text-white">{hero.maxHp}</span>
                    </div>
                    <div className="flex items-center justify-between text-sky-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Shield size={12} /> ARMOR:
                      </span>
                      <span className="font-pixel text-[10px] text-white">{hero.maxShield}</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Zap size={12} /> ATK:
                      </span>
                      <span className="font-pixel text-[10px] text-white">{hero.attackPower}</span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Sparkles size={12} /> CRIT:
                      </span>
                      <span className="font-pixel text-[10px] text-white">
                        {Math.round(hero.critChance * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-orange-400">
                      <span className="font-semibold text-[11px]">⚡ ATK SPD:</span>
                      <span className="font-pixel text-[10px] text-white">{hero.attackSpeed.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="font-semibold text-[11px]">🏃 MOV SPD:</span>
                      <span className="font-pixel text-[10px] text-white">{hero.moveSpeed.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Selection / Unlock Button */}
                <div className="border-t border-zinc-800/80 pt-3 flex justify-end">
                  {hero.unlocked ? (
                    <button
                      onClick={() => onSelectHero(hero.id)}
                      disabled={isCurrent}
                      className={`w-full py-2.5 rounded-lg font-pixel text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-zinc-800 text-zinc-500 cursor-default'
                          : 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-zinc-950 active:scale-95 shadow-md shadow-sky-500/30 cursor-pointer'
                      }`}
                    >
                      {isCurrent ? 'เลือกตัวละครนี้อยู่' : 'เลือกเล่น (SELECT HERO)'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onUnlockHero(hero.id)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-lg font-pixel text-xs font-bold transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-zinc-950 active:scale-95 shadow-md cursor-pointer'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      ปลดล็อก (🪙 {hero.cost} GOLD)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
