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
  ginzoUpgradeLevel: number;
  isGinzoEvolved: boolean;
  onUpgradeGinzo: () => void;
  onToggleGinzoForm: () => void;
}

export const HeroSelectModal: React.FC<HeroSelectModalProps> = ({
  isOpen,
  onClose,
  gold,
  heroes,
  activeHeroId,
  onSelectHero,
  onUnlockHero,
  ginzoUpgradeLevel,
  isGinzoEvolved,
  onUpgradeGinzo,
  onToggleGinzoForm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none animate-fade-in">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto bg-zinc-950 border-2 border-sky-500/80 rounded-2xl p-4 sm:p-6 shadow-2xl text-zinc-200">
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

        {/* Ginzo Awakened upgrade track: ten paid steps, then freely switch forms. */}
        <section className="mt-5 rounded-xl border-2 border-amber-400/60 bg-gradient-to-r from-zinc-950 via-amber-950/30 to-rose-950/30 p-4 shadow-[0_0_24px_rgba(251,191,36,.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-amber-300/60 bg-zinc-950 text-3xl shadow-[0_0_18px_rgba(251,191,36,.14)]">
                ⚔️
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-pixel text-xs text-amber-200">กินโซ · เส้นทางดาบสืบทอด</h4>
                  <span className="rounded border border-rose-300/40 bg-rose-950/60 px-2 py-0.5 font-pixel text-[8px] text-rose-200">
                    {ginzoUpgradeLevel >= 10 ? 'AWAKENED' : `ขั้น ${ginzoUpgradeLevel}/10`}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300 font-rajdhani">
                  อัปเกรดครบ 10 ขั้นเพื่อปลดล็อก <strong className="text-amber-200">กินอิ่ม</strong> · ขั้นละ 10 เหรียญ รวม 100 เหรียญ
                </p>
              </div>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-xs text-zinc-400 font-rajdhani">ร่างที่กำลังใช้</p>
              <p className="font-pixel text-[10px] text-amber-200">
                {activeHeroId !== 'ginzo' ? 'ตัวละครอื่น' : isGinzoEvolved ? 'กินอิ่ม · ร่างอัปเกรด' : 'กินโซ · ร่างปกติ'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-10 gap-1.5" aria-label={`ความคืบหน้าการอัปเกรด ${ginzoUpgradeLevel} จาก 10 ขั้น`}>
            {Array.from({ length: 10 }, (_, index) => (
              <div
                key={index}
                className={`h-2.5 rounded-sm border transition-colors ${index < ginzoUpgradeLevel ? 'border-amber-200 bg-gradient-to-r from-amber-300 to-rose-400 shadow-[0_0_8px_rgba(251,191,36,.28)]' : 'border-zinc-700 bg-zinc-900'}`}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-zinc-400 font-rajdhani">
              {ginzoUpgradeLevel >= 10
                ? 'ปลดล็อกแล้ว! สกิลดาบดาวตก · ดาบโต้กลับ · คาตานะสืบทอด พร้อมเอฟเฟกต์ซามูไรอนิเมะ'
                : `เหรียญในกระเป๋า: ${gold} G · อัปเกรดครั้งถัดไปใช้ 10 G`}
            </p>
            {ginzoUpgradeLevel < 10 ? (
              <button
                type="button"
                onClick={onUpgradeGinzo}
                disabled={gold < 10}
                className={`w-full rounded-lg border-2 px-4 py-2.5 font-pixel text-[10px] font-bold transition-all sm:w-auto ${gold >= 10 ? 'border-amber-200 bg-gradient-to-r from-amber-400 to-rose-400 text-zinc-950 shadow-[0_0_16px_rgba(251,191,36,.18)] hover:brightness-110 active:scale-95' : 'cursor-not-allowed border-zinc-700 bg-zinc-900 text-zinc-600'}`}
              >
                อัปเกรดขั้น {ginzoUpgradeLevel + 1} · 10 🪙
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleGinzoForm}
                className="w-full rounded-lg border-2 border-amber-200 bg-gradient-to-r from-amber-300 to-yellow-100 px-4 py-2.5 font-pixel text-[10px] font-bold text-zinc-950 shadow-[0_0_18px_rgba(251,191,36,.2)] transition-all hover:brightness-110 active:scale-95 sm:w-auto"
              >
                {isGinzoEvolved ? 'กลับเป็นกินโซ' : 'ใช้ร่างกินอิ่ม'}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
