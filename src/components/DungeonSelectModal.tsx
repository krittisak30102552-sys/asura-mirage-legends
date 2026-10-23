import React, { useEffect, useState } from 'react';
import { X, Play, ShieldAlert, DoorOpen, Dices, Footprints, Sparkles } from 'lucide-react';
import { DifficultyMode } from '../types/game';
import { DIFFICULTY_CONFIGS } from '../game/combatRules';

interface DungeonSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDifficulty?: DifficultyMode;
  onSelectDifficulty?: (mode: DifficultyMode) => void;
  onStartLevelRun: (difficulty: DifficultyMode) => void;
}

export const DungeonSelectModal: React.FC<DungeonSelectModalProps> = ({
  isOpen,
  onClose,
  currentDifficulty = 'normal',
  onSelectDifficulty,
  onStartLevelRun,
}) => {
  const [selectedDiff, setSelectedDiff] = useState<DifficultyMode>(currentDifficulty);

  useEffect(() => setSelectedDiff(currentDifficulty), [currentDifficulty]);

  if (!isOpen) return null;

  const handleDifficultyChange = (diff: DifficultyMode) => {
    setSelectedDiff(diff);
    onSelectDifficulty?.(diff);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-violet-500/90 rounded-2xl p-5 sm:p-7 shadow-2xl text-zinc-200 overflow-hidden">
        <button
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-violet-950/70 border border-violet-400 flex items-center justify-center text-2xl shrink-0">
            🕳️
          </div>
          <div>
            <h3 className="font-pixel text-violet-300 text-sm">ดันเจี้ยนทดสอบ</h3>
            <p className="text-xs font-rajdhani text-zinc-400">สุ่มผัง 5×5 ทุกชั้น · 20 ชั้น · ชั้นละ 7–10 ห้อง</p>
          </div>
        </div>

        <div className="mb-5 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-pixel text-zinc-300 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-400" /> เลือกระดับความยาก
            </span>
            <span
              className="text-[10px] font-pixel px-2 py-0.5 rounded font-bold"
              style={{
                backgroundColor: `${DIFFICULTY_CONFIGS[selectedDiff].badgeColor}25`,
                color: DIFFICULTY_CONFIGS[selectedDiff].badgeColor,
                border: `1px solid ${DIFFICULTY_CONFIGS[selectedDiff].badgeColor}`,
              }}
            >
              {DIFFICULTY_CONFIGS[selectedDiff].nameTh}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.values(DIFFICULTY_CONFIGS) as Array<(typeof DIFFICULTY_CONFIGS)[DifficultyMode]>).map((diff) => {
              const isSelected = selectedDiff === diff.id;
              return (
                <button
                  key={diff.id}
                  onClick={() => handleDifficultyChange(diff.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected ? 'bg-zinc-800 shadow-md ring-1' : 'bg-zinc-950/70 hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                  style={{ borderColor: isSelected ? diff.badgeColor : undefined }}
                >
                  <span className="font-pixel text-[11px] font-bold" style={{ color: isSelected ? diff.badgeColor : '#a1a1aa' }}>
                    {diff.id === 'easy' && '🌱 '}
                    {diff.id === 'normal' && '⚔️ '}
                    {diff.id === 'hard' && '🔥 '}
                    {diff.id === 'impossible' && '💀 '}
                    {diff.nameTh}
                  </span>
                  <span className="text-[10px] font-rajdhani text-zinc-300 line-clamp-1 leading-tight mt-1">{diff.descTh}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/40">
            <div className="flex items-center gap-2 text-violet-300 font-pixel text-[10px] mb-2">
              <Dices size={15} /> ทางเดินสุ่มทุกชั้น
            </div>
            <p className="text-xs font-rajdhani text-zinc-300 leading-relaxed">
              ผังสุ่มจากช่องกลาง มี 7–10 ห้อง เชื่อมด้วยประตูจริง ห้องต่อสู้ อีลิท ร้านค้า สมบัติ และบอสอยู่ลึกสุด
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/35">
            <div className="flex items-center gap-2 text-emerald-300 font-pixel text-[10px] mb-2">
              <Footprints size={15} /> เดินสำรวจเอง
            </div>
            <p className="text-xs font-rajdhani text-zinc-300 leading-relaxed">
              กำแพงขวางทางจริง ประตูและทางขึ้นชั้นต้องเดินเข้าใกล้แล้วกด E เท่านั้น ร้านค้าและของรางวัลมีแต่อุปกรณ์เพิ่มสถานะ
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-violet-950/70 to-zinc-900 border border-violet-500/40 mb-5">
          <div className="flex items-center gap-3">
            <Sparkles size={23} className="text-amber-300 shrink-0" />
            <div>
              <div className="font-pixel text-[11px] text-amber-200">ห้องสุดท้ายคือประตูไปชั้นถัดไป</div>
              <div className="text-[11px] font-rajdhani text-zinc-400">สำรวจห้องที่เชื่อมถึงกัน มินิแมพค่อย ๆ เปิดเผยห้องข้างเคียง</div>
            </div>
          </div>
          <DoorOpen size={19} className="text-violet-300 shrink-0" />
        </div>

        <button
          onClick={() => onStartLevelRun(selectedDiff)}
          className="w-full px-6 py-3.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-white font-pixel text-xs rounded-xl shadow-xl shadow-violet-500/30 active:scale-[0.99] transition-all cursor-pointer font-bold flex items-center justify-center gap-2 border border-violet-300/60"
        >
          <Play size={16} className="fill-white" />
          <span>เริ่มดันเจี้ยน 20 ชั้น</span>
        </button>
      </div>
    </div>
  );
};
