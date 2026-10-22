/**
 * Pause Modal for Mirage Legends
 */

import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none animate-fade-in">
      <div className="w-full max-w-sm bg-zinc-950 border-2 border-amber-600/70 rounded-xl p-6 shadow-2xl text-center text-zinc-200">
        <h3 className="font-cinzel text-xl font-bold text-amber-400 mb-1">
          GAME PAUSED
        </h3>
        <p className="text-xs font-rajdhani text-zinc-400 mb-6 font-semibold">
          พักการประลองชั่วคราว
        </p>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-pixel text-xs rounded transition-all active:scale-95 flex items-center justify-center gap-2 font-bold cursor-pointer"
          >
            <Play size={16} />
            <span>RESUME (เล่นต่อ)</span>
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-pixel text-xs rounded transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={18} />}
            <span>{isMuted ? 'UNMUTE (เปิดเสียง)' : 'MUTE (ปิดเสียง)'}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-red-950/60 hover:bg-red-900/60 border border-red-700 text-red-300 font-pixel text-xs rounded transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>RESTART RUN (เริ่มใหม่)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
