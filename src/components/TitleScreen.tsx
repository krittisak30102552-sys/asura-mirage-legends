/**
 * Title Screen for Mirage Legends (Otherworld Legends 2.5D Pixel Action)
 * Features bespoke inline SVG title lockup, Start CTA, and controls hint line.
 */

import React, { useEffect, useState } from 'react';
import { Play, Sparkles, Volume2, VolumeX, Maximize, Minimize, Share2, Check, Globe } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenGuide: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  isMuted,
  onToggleMute,
  onOpenGuide,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {});
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between items-center p-4 sm:p-6 md:p-12 pointer-events-auto bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/70 select-none overflow-y-auto">
      {/* Top Bar: Web Badge, Audio, Share & Fullscreen */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2 bg-zinc-950/80 border border-amber-600/40 px-3 py-1.5 rounded-full text-xs font-rajdhani text-amber-300 font-semibold tracking-wider">
          <Globe size={14} className="text-amber-400" />
          <span>WEB EDITION · เล่นได้ทุกอุปกรณ์</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2.5 bg-zinc-950/80 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-400 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            title="คัดลอกลิงก์เว็ปแชร์ให้เพื่อนหรือเปิดในมือถือ"
          >
            {copied ? <Check size={18} className="text-emerald-400" /> : <Share2 size={18} />}
            <span className="text-[11px] hidden sm:inline">{copied ? 'คัดลอกแล้ว!' : 'แชร์เว็ป'}</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-zinc-950/80 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-400 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            title="เต็มจอ (Fullscreen)"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <button
            onClick={onToggleMute}
            className="p-2.5 bg-zinc-950/80 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-400 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece: Bespoke Title Lockup */}
      <div className="flex flex-col items-center text-center max-w-2xl my-auto">
        {/* Decorative Badge */}
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 font-pixel text-[10px] tracking-widest uppercase">
          ⚔️ ASURA MIRAGE REALM ⚔️
        </div>

        {/* Bespoke Inline SVG Logo */}
        <div className="relative mb-3">
          <svg
            className="w-80 sm:w-96 md:w-[480px] h-24 overflow-visible drop-shadow-[0_10px_25px_rgba(245,158,11,0.4)]"
            viewBox="0 0 500 100"
          >
            <defs>
              <linearGradient id="titleGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <text
              x="250"
              y="68"
              textAnchor="middle"
              className="font-cinzel font-extrabold tracking-wider"
              fontSize="52"
              fill="url(#titleGold)"
              stroke="#78350f"
              strokeWidth="2"
              filter="url(#glow)"
            >
              MIRAGE LEGENDS
            </text>
          </svg>
        </div>

        {/* Thai Subtitle */}
        <h2 className="text-xl sm:text-2xl font-rajdhani font-bold text-zinc-100 tracking-wide drop-shadow-md mb-2">
          มหาศึกจอมยุทธ์แดนมายา 2.5D Pixel Action
        </h2>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mb-8 leading-relaxed font-rajdhani font-medium">
          สวมบทจอมยุทธ์เสื้อเขียว บุกตะลุยดันเจี้ยนสไตล์ Otherworld Legends
          ต่อสู้แบบเรียลไทม์ เล็งทิศทางด้วยเมาส์ ปล่อยคอมโบหมัดเท้า และสะสมไอเทมสุดแกร่ง!
        </p>

        {/* Primary Start CTA Button */}
        <button
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 font-pixel text-xs tracking-wider rounded-lg shadow-2xl shadow-amber-500/40 border-2 border-yellow-200 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Play size={18} className="fill-zinc-950 transition-transform group-hover:translate-x-1" />
          <span>START TRIAL (เริ่มประลอง)</span>
          <span className="ml-2 text-[9px] bg-zinc-950 text-amber-300 px-1.5 py-0.5 rounded font-mono">
            SPACE / ENTER
          </span>
        </button>

        <button
          onClick={onOpenGuide}
          className="mt-4 text-xs font-rajdhani text-zinc-400 hover:text-amber-400 transition-colors underline underline-offset-4 cursor-pointer"
        >
          วิธีบังคับและคำอธิบายสกิล 1-3
        </button>
      </div>

      {/* Bottom Hint Line */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between text-xs font-rajdhani text-zinc-400 border-t border-zinc-800/80 pt-4 px-2">
        <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-0">
          <span className="text-amber-400 font-bold">CONTROLS:</span>
          <span>💻 คอมพิวเตอร์: WASD เคลื่อนที่ · เมาส์ เล็ง/โจมตี · 1-3 สกิล · Space แดช</span>
          <span className="text-zinc-600 hidden md:inline">|</span>
          <span className="text-sky-300">📱 มือถือ: จอยสติ๊กสัมผัสบนจอ & ปุ่มโจมตี/สกิล</span>
        </div>
        <div className="text-[11px] text-zinc-500">
          HTML5 WebGL 60FPS · 100% Web Playable
        </div>
      </div>
    </div>
  );
};
