import React from 'react';
import { Check, Plus, Sparkles, Trash2, X, Wrench } from 'lucide-react';

export const UPDATE_VERSION = '1.2.2';

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
                <li className="flex gap-2"><span className="text-emerald-300">•</span><span>Bamdee มีสกิลเพียงช่องเดียว คือ <strong>Hiken – Crimson Severance (พิฆาตโลหิต)</strong> ในช่อง 4 ตามไฟล์ต้นฉบับ</span></li>
              </ul>
            </section>
            <section className="rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4">
              <h3 className="flex items-center gap-2 font-pixel text-[10px] text-sky-300"><Wrench size={15} /> ปรับปรุง</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-200">
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>ตัวละคร v1.2.2 — Remaster เฟรมพิกเซล:</strong> Ginzo ใช้สไปรต์ Idle แบบแอนิเมชัน พร้อมโทนทองสำหรับร่าง Awakened; Katherine ใช้สไปรต์อ้างอิงพร้อมท่าขยับตามสถานะเดิน พุ่ง โจมตี เจ็บ และล้ม</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>Quan + Bamdee:</strong> ปรับภาพ procedural ให้คมแบบ Pixel Art ด้วยพาเลตสีและการกรองแบบ nearest-neighbor โดยคงชุดท่าเดิมและระบบต่อสู้ไว้; Bamdee ยังคงมีเพียง Hiken – Crimson Severance ช่อง 4</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>Lobby v1.1.8 — จัดผังบ้านใหม่:</strong> จำกัดพื้นให้พอดีกับตัวบ้าน เพิ่มผนังรอบห้อง คานหลังคา และปรับกล้องให้อยู่ในตัวบ้านเพื่อลดภาพนอกแมพ</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>Lobby v1.1.9 — เปิดมุมกล้อง:</strong> เอาคานและชายหลังคาที่พาดเหนือพื้นที่เล่นออก ให้เห็นตัวละครและฉากได้เต็มขึ้น โดยคงผนังไม้รอบห้องไว้</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>UI v1.2.0 — Mirage Glow:</strong> เพิ่มไล่สีแบบบาง ๆ แสงสะท้อนและเงานุ่มให้แผง HUD เมนูหลัก ปุ่มสำคัญ และหน้าต่างเมนู พร้อมเอฟเฟกต์ hover/focus ที่ชัดขึ้นโดยไม่รบกวนการอ่านหรือเปลี่ยนตำแหน่งปุ่ม</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>UI v1.2.1 — Mirage Glass:</strong> เพิ่มมิติให้หน้าต่างและการ์ดเมนูด้วยแสงทอง–ฟ้าแบบบาง ๆ เงาซ้อนนุ่ม ๆ ปุ่มไล่สีมีไฮไลต์และยกขึ้นเล็กน้อยเมื่อชี้เมาส์ พร้อมขอบเรืองแสงให้ HUD และช่องสกิลชัดขึ้น โดยไม่เปลี่ยนตำแหน่งหรือการทำงานของปุ่ม</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>Master Chanyi:</strong> วาด NPC ใหม่ให้เห็นใบหน้า ดวงตา หนวดเครา เสื้อคลุมสีขาวขอบหยก มือ กางเกง และรองเท้าชัดขึ้น พร้อมปรับสัดส่วนให้ดูเป็นคนมากกว่าเดิม</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>แยกพื้นที่เป็นมุมนั่งเล่น ทางเดินกลาง จุดครูฝึกด้านหลังขวา และมุม dummy ด้านหน้าขวา พร้อมย้ายป้ายให้ตรงกับตัวละคร</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>Lobby — บ้านพักแฟนตาซี:</strong> เปลี่ยนฉากเป็นห้องไม้แสนอบอุ่น เพิ่มหน้าต่าง ภาพแขวน โซฟา พรม ชั้นหนังสือ เตาผิง โคมไฟ และต้นไม้กระถาง</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>เหลือหุ่นซ้อมสกิลใน Lobby เพียงตัวเดียว และขยับป้ายให้ตรงกับตำแหน่งหุ่น</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>Ginzo + Bamdee — โจมตีปกติ:</strong> สร้างคอมโบดาบ 3 จังหวะใหม่ พร้อมเส้นฟันสีขาวงาช้าง ขอบทอง และจังหวะปิดคอมโบที่หนักแน่นขึ้น ตัดเอฟเฟกต์โจมตีเก่าที่ซ้อนกันออก</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span><strong>Ginzo — สกิล 1 คลื่นดาบมิติ:</strong> ทำภาพคลื่นดาบใหม่ทั้งชุด มีแกนแสงสีขาว รอยแยกสีทอง เส้นพุ่งและเศษมิติที่เคลื่อนที่ไปข้างหน้า โดยไม่เปลี่ยนดาเมจหรือกลไกพุ่งผ่านศัตรู</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>HUD ของ Bamdee แสดงเฉพาะสกิลพิฆาตโลหิตหนึ่งสกิล</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>คงเอฟเฟกต์และระบบต่อสู้สำหรับ Hiken – Crimson Severance โดยไม่เปิดสกิลอื่นของ Ginzo ให้ Bamdee</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>ปรับเอฟเฟกต์โจมตีให้เนียนขึ้น พร้อมแสงฟุ้งและเส้นกระแทกตอนโดนตี</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>ปรับตัวเลขดาเมจให้เด้งแล้วค่อยจาง ใส่ comma คั่นหลักพัน และเพิ่มไฮไลต์สีทองเมื่อคริติคอล</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>เพิ่มแรงสั่นกล้องเล็กน้อยเมื่อคริติคอล โดยไม่รบกวนจังหวะอัลติ</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>เอฟเฟกต์คอมโบดาบ Ginzo/Bamdee ใช้แสงและเส้นฟันชุดใหม่ แทนกลีบซากุระจากระบบเก่า</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>กดใช้สกิลใน Lobby เพื่อทดลองแอนิเมชันและเอฟเฟกต์ได้ โดยท่าอัลติของแบมดีจะแสดงเป็นตัวอย่างเมื่อไม่มีศัตรู</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>ปรับกล้อง Lobby ให้เป็นมุมเฉียงติดตามตัวละครแบบเดียวกับในดันเจี้ยน</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>สามารถกดโจมตีปกติใน Lobby เพื่อทดลองคอมโบดาบและเอฟเฟกต์ได้</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>เปลี่ยนเอฟเฟกต์ตีปกติให้ใช้ชุด 3D ใหม่ โดยถอดเอฟเฟกต์ Canvas2D และแสงฟันดาบเก่าที่ซ้อนกันออก</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-1 shrink-0 text-sky-300" /><span>ถอดเส้นเตือนพื้นแบบเดิมจากสกิล 1 ของ Ginzo และ Quan คงเอฟเฟกต์สกิลชุดใหม่ไว้</span></li>
              </ul>
            </section>
            <section className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <h3 className="flex items-center gap-2 font-pixel text-[10px] text-zinc-300"><Trash2 size={15} /> นำออก</h3>
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-zinc-300"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" /> นำสกิลอื่นของ Ginzo อีก 3 ช่องออกจาก Bamdee เหลือเฉพาะ Hiken – Crimson Severance</p>
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
