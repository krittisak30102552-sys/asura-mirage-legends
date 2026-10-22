/**
 * Victory / Trial Cleared Modal for Mirage Legends
 */

import React from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import { PlayerStats, RelicItem } from '../types/game';

interface VictoryModalProps {
  stats: PlayerStats;
  relics: RelicItem[];
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  relics,
  onRestart,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border-2 border-amber-500 rounded-xl p-6 shadow-2xl text-center text-zinc-200">
        <div className="w-16 h-16 bg-amber-500/20 border-2 border-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Trophy size={32} className="text-amber-400" />
        </div>

        <h2 className="font-cinzel text-2xl font-black text-amber-400 tracking-wider mb-1">
          MIRAGE CONQUERED!
        </h2>
        <div className="text-sm font-rajdhani text-amber-200/90 mb-6 font-semibold">
          พิชิตดินแดนมายาสำเร็จ ปราบจอมมารคาเงะลงได้!
        </div>

        {/* Victory Stats */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-4 mb-4 space-y-2 text-xs font-rajdhani">
          <div className="flex justify-between items-center text-zinc-300">
            <span>สถานะ (Status):</span>
            <span className="font-bold text-emerald-400 font-pixel text-[11px]">
              ALL STAGES CLEARED
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span>ศัตรูทั้งหมด (Total Kills):</span>
            <span className="font-bold text-white font-pixel text-[11px]">
              {stats.kills}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span>ทองสะสม (Gold Collected):</span>
            <span className="font-bold text-amber-400 font-pixel text-[11px]">
              🪙 {stats.gold}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span>ไอเทมโบราณ:</span>
            <span className="font-bold text-purple-400 font-pixel text-[11px]">
              {relics.length} RELICS
            </span>
          </div>
        </div>

        {/* Collected Relics Display */}
        {relics.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {relics.map((r, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded bg-zinc-900 border border-amber-500/50 flex items-center justify-center text-base"
                title={`${r.nameTh} (${r.name})`}
              >
                {r.iconSymbol}
              </div>
            ))}
          </div>
        )}

        {/* Play Again */}
        <button
          onClick={onRestart}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-pixel text-xs tracking-wider rounded-lg shadow-xl shadow-amber-500/40 active:scale-95 transition-all cursor-pointer font-bold"
        >
          <RotateCcw size={16} />
          <span>PLAY AGAIN (ประลองอีกครั้ง)</span>
        </button>
      </div>
    </div>
  );
};
