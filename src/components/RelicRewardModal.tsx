/**
 * Roguelike Power-Up / Relic Selection Modal
 * Appears when clearing rooms/waves, giving player a choice of 3 powerful relics
 */

import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { RelicItem } from '../types/game';

interface RelicRewardModalProps {
  isOpen: boolean;
  relics: RelicItem[];
  onSelectRelic: (relic: RelicItem) => void;
}

export const RelicRewardModal: React.FC<RelicRewardModalProps> = ({
  isOpen,
  relics,
  onSelectRelic,
}) => {
  if (!isOpen || relics.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none animate-fade-in">
      <div className="relative w-full max-w-3xl bg-zinc-950 border-2 border-amber-500 rounded-2xl p-6 md:p-8 shadow-2xl text-zinc-100">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/50 rounded-full text-amber-300 font-pixel text-[10px] tracking-wider mb-2">
            <Sparkles size={13} className="text-amber-400" />
            <span>ROOM CLEARED • SELECT A POWER-UP</span>
          </div>
          <h2 className="font-cinzel text-2xl sm:text-3xl font-black text-amber-400 tracking-wide">
            เลือกไอเทมเสริมพลัง (RELIC BOON)
          </h2>
          <p className="text-xs sm:text-sm font-rajdhani text-zinc-400 mt-1">
            เลือก 1 ใน 3 ไอเทมโบราณเพื่อเสริมค่าสถานะ พลังโจมตี เกราะ หรือสถานะผิดปกติในการต่อสู้
          </p>
        </div>

        {/* 3 Relic Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {relics.map((relic) => {
            const isLegendary = relic.rarity === 'legendary';
            const isRare = relic.rarity === 'rare';

            return (
              <div
                key={relic.id}
                className={`group relative p-5 rounded-xl border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                  isLegendary
                    ? 'bg-gradient-to-b from-purple-950/40 to-zinc-950 border-purple-500/80 hover:border-purple-400 hover:shadow-purple-500/30 ring-1 ring-purple-500/40'
                    : isRare
                    ? 'bg-gradient-to-b from-sky-950/40 to-zinc-950 border-sky-500/80 hover:border-sky-400 hover:shadow-sky-500/30 ring-1 ring-sky-500/40'
                    : 'bg-zinc-900/90 border-zinc-700 hover:border-amber-400 hover:shadow-amber-500/20'
                }`}
              >
                <div>
                  {/* Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-3xl p-2.5 rounded-lg border bg-zinc-950 shadow-inner"
                      style={{ borderColor: relic.iconColor }}
                    >
                      {relic.iconSymbol}
                    </span>
                    <span
                      className={`text-[9px] font-pixel font-bold px-2 py-0.5 rounded uppercase border ${
                        isLegendary
                          ? 'bg-purple-950 text-purple-300 border-purple-500'
                          : isRare
                          ? 'bg-sky-950 text-sky-300 border-sky-500'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-600'
                      }`}
                    >
                      {relic.rarity}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-zinc-100 font-rajdhani group-hover:text-amber-300 transition-colors">
                    {relic.nameTh}
                  </h3>
                  <div className="text-[11px] text-zinc-400 font-mono mb-2">
                    {relic.name}
                  </div>

                  <p className="text-xs text-zinc-300 font-rajdhani leading-relaxed mb-4">
                    {relic.descTh}
                  </p>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={() => onSelectRelic(relic)}
                  className={`w-full py-2.5 rounded-lg font-pixel text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                    isLegendary
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white'
                      : isRare
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-zinc-950'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950'
                  }`}
                >
                  <Check size={14} />
                  <span>SELECT (เลือกชิ้นนี้)</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
