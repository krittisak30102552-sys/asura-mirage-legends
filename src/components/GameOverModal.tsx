/**
 * Game Over / Defeat Modal for Mirage Legends
 */

import React from 'react';
import { RotateCcw, Skull } from 'lucide-react';
import { PlayerStats } from '../types/game';

interface GameOverModalProps {
  stats: PlayerStats;
  currentWave: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  currentWave,
  onRestart,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border-2 border-red-600/80 rounded-xl p-6 shadow-2xl text-center text-zinc-200">
        <div className="w-16 h-16 bg-red-950/60 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Skull size={32} className="text-red-400" />
        </div>

        <h2 className="font-cinzel text-2xl font-black text-red-500 tracking-wider mb-1">
          FALLEN IN MIRAGE
        </h2>
        <div className="text-sm font-rajdhani text-zinc-400 mb-6 font-semibold">
          ท่านพ่ายแพ้ในการทดสอบแห่งแดนมายา
        </div>

        {/* Battle Stats Summary */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-4 mb-6 space-y-2 text-xs font-rajdhani">
          <div className="flex justify-between items-center text-zinc-300">
            <span>ไปถึงสเตจ (Reached Stage):</span>
            <span className="font-bold text-amber-400 font-pixel text-[11px]">
              STAGE {currentWave}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span>ศัตรูที่กำจัด (Enemies Slain):</span>
            <span className="font-bold text-white font-pixel text-[11px]">
              {stats.kills}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span>ทองที่เก็บได้ (Gold Acquired):</span>
            <span className="font-bold text-amber-400 font-pixel text-[11px]">
              🪙 {stats.gold}
            </span>
          </div>
        </div>

        {/* Play Again CTA */}
        <button
          onClick={onRestart}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-pixel text-xs tracking-wider rounded-lg shadow-xl shadow-red-600/30 active:scale-95 transition-all cursor-pointer font-bold"
        >
          <RotateCcw size={16} />
          <span>RETRY TRIAL (ท้าทายใหม่)</span>
        </button>
      </div>
    </div>
  );
};
