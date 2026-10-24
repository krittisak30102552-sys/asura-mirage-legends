import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, X, ExternalLink } from 'lucide-react';

const YOUTUBE_VIDEO_ID = 'iggmiF7DNoM';
const YOUTUBE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`;

interface YouTubeMusicPlayerProps {
  isMuted: boolean;
}

/**
 * Plays the user's chosen soundtrack through YouTube's official embedded player.
 * The player is only created after a click so browsers are more likely to allow audio.
 */
export const YouTubeMusicPlayer: React.FC<YouTubeMusicPlayerProps> = ({ isMuted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sendPlayerCommand = useCallback((func: 'mute' | 'unMute') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: '' }),
      'https://www.youtube.com',
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      sendPlayerCommand(isMuted ? 'mute' : 'unMute');
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isOpen, isMuted, sendPlayerCommand]);

  const playerSrc = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&controls=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-[45] font-rajdhani">
      {isOpen ? (
        <section
          className="w-[280px] max-w-[88vw] overflow-hidden rounded-xl border-2 border-amber-500/80 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,.8)]"
          aria-label="ตัวเล่นเพลงประกอบจาก YouTube"
        >
          <div className="flex items-center justify-between gap-2 border-b border-amber-700/50 bg-zinc-900 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-amber-200">
              <Music2 size={16} className="shrink-0" />
              <span className="truncate text-xs font-bold">เพลงธีมจาก YouTube</span>
              <span className="rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold text-white">LIVE PLAYER</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="ปิดตัวเล่นเพลง"
              title="ปิดตัวเล่นเพลง"
              className="rounded p-1 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <iframe
            ref={iframeRef}
            title="เพลงธีมที่เลือกจาก YouTube"
            src={playerSrc}
            width="280"
            height="220"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => {
              window.setTimeout(() => sendPlayerCommand(isMuted ? 'mute' : 'unMute'), 350);
            }}
            className="block h-[220px] w-full border-0 bg-black"
          />
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-zinc-400">
            <span>ถ้าไม่เริ่มเอง กด ▶ ในตัวเล่นได้เลย</span>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-amber-300 hover:text-amber-100"
            >
              เปิด YouTube <ExternalLink size={11} />
            </a>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border-2 border-amber-300 bg-zinc-950/95 px-4 py-3 text-xs font-bold text-amber-200 shadow-[0_6px_24px_rgba(0,0,0,.65)] transition hover:scale-[1.03] hover:bg-zinc-900 active:scale-95"
          aria-label="เปิดเพลงธีมจาก YouTube"
        >
          <Music2 size={17} />
          <span>เปิดเพลงจาก YouTube</span>
          <span className="animate-pulse text-emerald-300">●</span>
        </button>
      )}
    </div>
  );
};
