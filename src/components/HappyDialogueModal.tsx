import React, { useEffect, useState } from 'react';

interface HappyDialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseFrog: () => void;
}

export const HappyDialogueModal: React.FC<HappyDialogueModalProps> = ({ isOpen, onClose, onChooseFrog }) => {
  const [askedWho, setAskedWho] = useState(false);

  useEffect(() => {
    if (isOpen) setAskedWho(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-pink-400/80 bg-zinc-950 shadow-[0_0_60px_rgba(236,72,153,0.25)]">
        <div className="flex items-center gap-3 border-b border-pink-900/70 bg-gradient-to-r from-pink-950 to-zinc-950 p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-pink-300/60 bg-pink-950 text-4xl">🧍🏻‍♀️</div>
          <div>
            <div className="font-pixel text-sm text-pink-200">แฮปปี้</div>
            <div className="mt-1 text-xs font-bold text-zinc-400">แม่ค้าจิ๋วประจำดันเจี้ยน · ตัวเล็กแต่ใจใหญ่</div>
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-base font-bold leading-relaxed text-zinc-100">
            {askedWho
              ? 'กูแฮปปี้ แม่ค้าประจำดันเจี้ยนไง ของบนแท่นเลือกซื้อได้ แต่อย่ามากวนตอนกูขายของนะเว้ย'
              : 'มึงอีกแล้วหรอวะ'}
          </div>

          {askedWho ? (
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl border border-pink-300 bg-pink-600 px-4 py-3 font-pixel text-xs text-white transition hover:bg-pink-500">
              โอเค ๆ ไปดูของก่อน
            </button>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={onChooseFrog} className="rounded-xl border-2 border-rose-400 bg-rose-950/70 px-4 py-3 font-pixel text-xs text-rose-100 transition hover:bg-rose-700">
                🐸 กบ
              </button>
              <button type="button" onClick={() => setAskedWho(true)} className="rounded-xl border-2 border-zinc-600 bg-zinc-900 px-4 py-3 font-pixel text-xs text-zinc-100 transition hover:border-pink-300 hover:bg-zinc-800">
                มึงใครวะ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
