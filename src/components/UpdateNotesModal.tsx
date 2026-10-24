import React from 'react';
import { Check, Plus, Sparkles, Trash2, X, Wrench } from 'lucide-react';

export const UPDATE_VERSION = '1.1.0';

interface UpdateNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateNotesModal: React.FC<UpdateNotesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-notes-title"
    >
      <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan-300/40 bg-zinc-950 text-zinc-100 shadow-[0_0_80px_rgba(34,211,238,.12)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-blue-500 to-fuchsia-500" />
        <button type="button" onClick={onClose} aria-label="ปิดหน้าต่างอัปเดต" className="absolute right-3 top-3 z-10 rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
        <div className="bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,.18),transparent_45%)] px-5 pb-5 pt-7 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-2xl">✨</div>
            <div>
              <div className="font-pixel text-[8px] tracking-[0.25em] text-cyan-300">ASURA MIRAGE // PATCH NOTES</div>
              <h2 id="update-notes-title" className="mt-2 font-pixel text-base text-white sm:text-xl">มีอัปเดตใหม่แล้ว!</h2>
              <div className="mt-2 inline-flex rounded-md border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 font-pixel text-[9px] text-cyan-200">VERSION v{UPDATE_VERSION}</div>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-zinc-300">นักรบเอ๋ย นี่คือรายการเปลี่ยนแปลงของแพตช์ล่าสุด</p>
          <div className="mt-5 space-y-3">
            <section className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4">
              <h3 className="flex items-center gap-2 font-pixel text-[10px] text-emerald-300"><Plus size={15} /> เพิ่มเข้ามา</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-200">
                <li className="flex gap-2"><span className="text-emerald-300">•</span><span><strong>Bamdee Vivo</strong> ตัวละครนักดาบใหม่ ปลดล็อกได้ฟรี พร้อมรูปลักษณ์โทนสี Vivo</span></li>
                <li className="flex gap-2"><span className="text-emerald-300">•</span><span>ใช้ชุดสกิลร่างตื่น 4 ช่องของ Ginzo รวม <strong>Hiken – Crimson Severance (พิฆาตโลหิต)</strong></span></li>
              </ul>
            </section>
            <section className="rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4">
              <h3 className="flex items-center gap-2 font-pixel text-[10px] text-sky-300"><Wrench size={15} /> ปรับปรุง</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-200">
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>HUD แสดงชุดสกิลและปุ่มโจมตีของ Bamdee ให้ถูกต้อง</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>เชื่อมคอมโบดาบ เอฟเฟกต์ตัวละคร และเสียงสกิลให้ใช้แนวทางเดียวกับ Ginzo Awakened</span></li>
              </ul>
            </section>
            <section className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <h3 className="flex items-center gap-2 font-pixel text-[10px] text-zinc-300"><Trash2 size={15} /> นำออก</h3>
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-zinc-300"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" /> ไม่มีการลบตัวละครหรือระบบเดิมในแพตช์นี้</p>
            </section>
          </div>
          <button type="button" onClick={onClose} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 font-pixel text-[10px] text-zinc-950 shadow-lg shadow-cyan-900/30 transition hover:brightness-110 active:scale-[0.99]">
            รับทราบ • เข้าเกม <Check size={16} />
          </button>
          <p className="mt-3 text-center text-[10px] text-zinc-500">หน้าต่างนี้จะแสดงอีกครั้งเมื่อมีการเพิ่มเลขเวอร์ชันอัปเดตใหม่</p>
        </div>
      </div>
    </div>
  );
};
