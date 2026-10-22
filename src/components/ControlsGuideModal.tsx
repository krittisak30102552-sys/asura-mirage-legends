/**
 * Controls, Stats & Mechanics Guide Modal for Mirage Legends
 * Explains:
 * - 6 Core Combat Stats: Health, Armor, Damage, Critical Rate, Attack Speed, Movement Speed
 * - Normal Attack, Combo Chain, Dash / Dodge with i-frames & synergies
 * - Status Effects: Burn, Freeze, Poison, Stun, Slow
 * - 10 Major Biomes & Wiki Bosses from Otherworld Legends
 */

import React, { useState } from 'react';
import { X, MousePointer, Sparkles, Shield, Flame, Compass, Heart, Zap, Wind } from 'lucide-react';
import { DUNGEON_MAPS } from '../data/gameData';

interface ControlsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsGuideModal: React.FC<ControlsGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tab, setTab] = useState<'controls' | 'stats' | 'status' | 'biomes'>('controls');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950 border-2 border-amber-600/80 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-200 flex flex-col justify-between overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-3">
          <span className="font-pixel text-amber-400 text-sm">📖 คู่มือระบบการต่อสู้ (GAMEPLAY GUIDE)</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 mb-3 shrink-0">
          <button
            onClick={() => setTab('controls')}
            className={`flex-1 py-1.5 text-xs font-rajdhani font-bold rounded cursor-pointer transition-colors ${
              tab === 'controls' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            การควบคุม & สกิล
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`flex-1 py-1.5 text-xs font-rajdhani font-bold rounded cursor-pointer transition-colors ${
              tab === 'stats' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            6 ค่าสถานะพื้นฐาน
          </button>
          <button
            onClick={() => setTab('status')}
            className={`flex-1 py-1.5 text-xs font-rajdhani font-bold rounded cursor-pointer transition-colors ${
              tab === 'status' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            สถานะผิดปกติ & ไอเทม
          </button>
          <button
            onClick={() => setTab('biomes')}
            className={`flex-1 py-1.5 text-xs font-rajdhani font-bold rounded cursor-pointer transition-colors ${
              tab === 'biomes' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            10 พื้นที่ & บอสตามวิกิ
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto pr-1 space-y-3 max-h-[56vh]">
          {tab === 'controls' && (
            <div className="space-y-3">
              {/* Movement & Aiming */}
              <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                <h4 className="font-rajdhani font-bold text-amber-300 text-sm flex items-center gap-2 mb-1.5">
                  <MousePointer size={15} /> การเคลื่อนที่และเล็งโจมตี
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-rajdhani">
                  <div>
                    <span className="font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded mr-1">WASD / ลูกศร</span>
                    <span>เคลื่อนที่ 8 ทิศทาง (บนคอมพิวเตอร์)</span>
                  </div>
                  <div>
                    <span className="font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded mr-1">เมาส์ (Mouse)</span>
                    <span>เล็งเป้าหมาย 360 องศา</span>
                  </div>
                  <div>
                    <span className="font-bold text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded mr-1">คลิกซ้าย (LMB)</span>
                    <span>การโจมตีปกติ & คอมโบ 3 จังหวะ</span>
                  </div>
                  <div>
                    <span className="font-bold text-sky-400 bg-zinc-800 px-1.5 py-0.5 rounded mr-1">Space / คลิกขวา</span>
                    <span>หลบหลีก (Dodge Roll อมตะ)</span>
                  </div>
                  <div>
                    <span className="font-bold text-purple-300 bg-zinc-800 px-1.5 py-0.5 rounded mr-1">Q / Z / X</span>
                    <span>ใช้สกิล 1, 2, 3 (หรือปุ่ม 1, 2, 3)</span>
                  </div>
                </div>

                {/* Mobile Touch Controls Section */}
                <div className="mt-2.5 pt-2 border-t border-zinc-800 flex flex-col gap-1.5 text-xs font-rajdhani">
                  <div className="text-amber-300 font-bold flex items-center gap-1.5">
                    <span>📱 สำหรับการเล่นบนเว็บบราวเซอร์มือถือ & แท็บเล็ต (Mobile / Tablet)</span>
                  </div>
                  <div className="text-zinc-300 space-y-1 text-[11px] leading-relaxed">
                    <p>• <b>จอยสติ๊กสัมผัสซ้ายล่าง (Virtual Joystick):</b> แตะแล้วลากเพื่อเดินไปในทิศทางที่ต้องการ 360 องศา</p>
                    <p>• <b>ปุ่มโจมตีขวาล่าง (Attack Button):</b> แตะปุ่มวงกลมสีส้มเพื่อโจมตีคอมโบต่อเนื่อง</p>
                    <p>• <b>ปุ่มสกิลและแดช (Skills & Dodge):</b> สามารถแตะไอคอนสกิล 1-3 หรือปุ่มแดชบนหน้าจอเพื่อกดใช้งานได้ทันที</p>
                    <p>• <b>ปุ่มโหมดเต็มจอ (Fullscreen):</b> แตะไอคอนสี่เหลี่ยมขวาบนเพื่อเล่นแบบเต็มจอไม่มีแถบที่อยู่บราวเซอร์</p>
                  </div>
                </div>
              </div>

              {/* Active Skills */}
              <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 space-y-2">
                <h4 className="font-rajdhani font-bold text-amber-400 text-sm flex items-center gap-1.5">
                  <Sparkles size={15} /> 3 สกิลประจำตัวละคร (Q / Z / X หรือเลข 1, 2, 3)
                </h4>
                <p className="text-xs text-zinc-300 font-rajdhani leading-relaxed">
                  ตัวละครแต่ละตัวมีความสามารถและคูลดาวน์เฉพาะตัว เช่น กินโซ (Ginzo) มีวิชาดาบอิไอพุ่งฟันและระบำซากุระ, กวนฮุ่ยอิง (Quan) มีหมัดรัวและเตะพายุดูดศัตรู, แคเธอรีน (Katherine) ปล่อยไอเย็นแช่แข็งและฝนดาวตกเพลิง
                </p>
              </div>
            </div>
          )}

          {tab === 'stats' && (
            <div className="space-y-2 text-xs font-rajdhani">
              <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <Heart size={16} /> Health (พลังชีวิต)
                </div>
                <p className="text-zinc-300">
                  พลังชีวิตของตัวละคร หากลดลงเหลือ 0 จะพ่ายแพ้การทดสอบ สามารถฟื้นฟูได้จากยาฟื้นพลังหรือไอเทมดูดเลือด
                </p>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <Shield size={16} /> Armor (เกราะหรือค่าป้องกัน)
                </div>
                <p className="text-zinc-300">
                  เกราะป้องกันความเสียหาย จะรับความเสียหายแทนพลังชีวิต 100% จนกว่าจะแตก และจะเริ่มฟื้นฟูอัตโนมัติอย่างรวดเร็วหลังไม่ได้รับดาเมจ 2.5 วินาที
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1 text-amber-300 font-bold mb-1">
                    <Zap size={14} /> Damage (ความแรงโจมตี)
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    พลังโจมตีพื้นฐาน ผสานกับอุปกรณ์และไอเทมเสริมสถานะ
                  </p>
                </div>

                <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1 text-yellow-300 font-bold mb-1">
                    <Sparkles size={14} /> Critical Rate (คริติคอล)
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    โอกาสในการโจมตีโดนจุดสำคัญ ทำดาเมจทวีคูณ 2.0x - 2.2x
                  </p>
                </div>

                <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1 text-rose-300 font-bold mb-1">
                    <Flame size={14} /> Attack Speed (ความเร็วโจมตี)
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    ลดระยะเวลาระหว่างหมัด/ดาบ ทำให้ต่อคอมโบได้รวดเร็วลื่นไหล
                  </p>
                </div>

                <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-1 text-emerald-300 font-bold mb-1">
                    <Wind size={14} /> Movement Speed (ความเร็วเคลื่อนที่)
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    ความเร็วในการเดิน วิ่ง และระยะพุ่งหลบหลีกการโจมตี
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'status' && (
            <div className="space-y-2 text-xs font-rajdhani">
              <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                <h4 className="font-bold text-amber-300 text-sm mb-2">
                  ⚡ สถานะผิดปกติในการต่อสู้ (STATUS EFFECTS)
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-orange-400">🔥 ติดไฟ (Burn):</span>
                    <span className="text-zinc-300">เผาผลาญความเสียหายต่อเนื่องเป็นวินาที (DoT) ตัวศัตรูจะเปลี่ยนเป็นสีส้มเพลิง</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-cyan-400">❄️ แช่แข็ง (Freeze):</span>
                    <span className="text-zinc-300">แช่แข็งศัตรูในผลึกน้ำแข็ง หยุดการเคลื่อนไหวและการโจมตีโดยสมบูรณ์ 2 วินาที</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">🧪 ติดพิษ (Poison):</span>
                    <span className="text-zinc-300">สร้างความเสียหายต่อเนื่องและชะลอความเร็วการเคลื่อนที่ลง</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-yellow-400">💫 มึนงง (Stun):</span>
                    <span className="text-zinc-300">ขัดจังหวะการโจมตีของศัตรูทันที และทำให้หยุดนิ่งชั่วขณะ</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-lg border border-purple-500/50">
                <h4 className="font-bold text-purple-300 text-sm mb-1">
                  🎁 การเสริมค่าสถานะและความก้าวหน้า (RELIC SYSTEM)
                </h4>
                <p className="text-zinc-300 leading-relaxed">
                  เมื่อเคลียร์ห้องแต่ละห้องหรือซื้อจากช่างตีเหล็ก จะสามารถเลือกไอเทมเสริมพลัง 1 ใน 3 ชิ้น เช่น หยกมังกรเพลิง (ทำให้โจมตีติดไฟ), หน้ากากเบอร์เซิร์ก (เพิ่มความเร็วโจมตี +35%), หรือผ้าคลุมเงา (หลบหลีกแล้วปล่อยคลื่นสตันรอบตัว)
                </p>
              </div>
            </div>
          )}

          {tab === 'biomes' && (
            <div className="space-y-2 text-xs font-rajdhani">
              <div className="text-amber-400 font-bold mb-1">
                7.1 กลุ่มพื้นที่หลักและบอสประจำพื้นที่ตามวิกิ (Otherworld Legends Wiki):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DUNGEON_MAPS.map((m) => (
                  <div key={m.id} className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-start gap-2">
                    <span className="text-xl shrink-0">{m.icon}</span>
                    <div>
                      <div className="font-bold text-zinc-200">{m.nameTh}</div>
                      <div className="text-purple-400 font-pixel text-[10px]">บอส: {m.bossName}</div>
                      <div className="text-zinc-400 text-[10px]">{m.bossDescTh}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-pixel text-xs rounded-lg transition-all active:scale-95 cursor-pointer font-bold"
          >
            GOT IT (เข้าใจแล้ว)
          </button>
        </div>
      </div>
    </div>
  );
};
