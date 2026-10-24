import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, X, ExternalLink, Grip } from 'lucide-react';

const YOUTUBE_VIDEO_ID = 'iggmiF7DNoM';
const YOUTUBE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`;

interface YouTubeMusicPlayerProps {
  isMuted: boolean;
}

interface PlayerPosition {
  left: number;
  top: number;
}

interface DragState extends PlayerPosition {
  pointerId: number;
  startX: number;
  startY: number;
}

export const YouTubeMusicPlayer: React.FC<YouTubeMusicPlayerProps> = ({ isMuted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PlayerPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);

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

  useEffect(() => {
    const clampPosition = () => {
      if (!rootRef.current || !position) return;
      const rect = rootRef.current.getBoundingClientRect();
      const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
      const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
      setPosition((current) => current ? ({
        left: Math.max(8, Math.min(current.left, maxLeft)),
        top: Math.max(8, Math.min(current.top, maxTop)),
      }) : null);
    };
    window.addEventListener('resize', clampPosition);
    return () => window.removeEventListener('resize', clampPosition);
  }, [position]);

  const beginDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const root = rootRef.current;
    if (!root) return;

    event.preventDefault();
    const rect = root.getBoundingClientRect();
    const startPosition = { left: rect.left, top: rect.top };
    setPosition(startPosition);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      ...startPosition,
    };
    didDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const root = rootRef.current;
    if (!drag || !root || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;

    const maxLeft = Math.max(8, window.innerWidth - root.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - root.offsetHeight - 8);
    setPosition({
      left: Math.max(8, Math.min(drag.left + dx, maxLeft)),
      top: Math.max(8, Math.min(drag.top + dy, maxTop)),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const dragHandlers = {
    onPointerDown: beginDrag,
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  const handlePlayerToggle = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setIsOpen(true);
  };

  const handlePlayerClose = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen(false);
  };

  const playerSrc = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&controls=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  const positionStyle: React.CSSProperties = position
    ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' }
    : { right: 12, bottom: 12 };

  return (
    <div
      ref={rootRef}
      data-music-player-root
      style={positionStyle}
      className="pointer-events-auto fixed z-[45] font-rajdhani"
    >
      {isOpen ? (
        <section
          className="w-[280px] max-w-[88vw] overflow-hidden rounded-xl border-2 border-amber-500/80 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,.8)]"
          aria-label="ตัวเล่นเพลงประกอบจาก YouTube"
        >
          <div
            {...dragHandlers}
            className="flex cursor-grab touch-none items-center justify-between gap-2 border-b border-amber-700/50 bg-zinc-900 px-3 py-2 active:cursor-grabbing"
            title="จับตรงนี้แล้วลากเพื่อย้ายตำแหน่ง"
          >
            <div className="flex min-w-0 items-center gap-2 text-amber-200">
              <Grip size={15} className="shrink-0 text-amber-500" />
              <Music2 size={16} className="shrink-0" />
              <span className="truncate text-xs font-bold">เพลงธีมจาก YouTube</span>
              <span className="rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold text-white">LIVE</span>
            </div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setIsOpen(false)}
              aria-label="ย่อและปิดหน้าต่างเพลง"
              title="ย่อหน้าต่างเพลง"
              className="shrink-0 rounded p-1 text-zinc-300 hover:bg-zinc-800 hover:text-white"
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
            <span>ลากด้านบนย้ายตำแหน่ง · ▶ เริ่มเพลง</span>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-amber-300 hover:text-amber-100"
            >
              YouTube <ExternalLink size={11} />
            </a>
          </div>
        </section>
      ) : (
        <button
          type="button"
          {...dragHandlers}
          onClick={handlePlayerToggle}
          className="flex cursor-grab touch-none items-center gap-2 rounded-full border-2 border-amber-300 bg-zinc-950/95 px-4 py-3 text-xs font-bold text-amber-200 shadow-[0_6px_24px_rgba(0,0,0,.65)] transition hover:bg-zinc-900 active:cursor-grabbing"
          aria-label="เปิดเพลงธีมจาก YouTube หรือลากเพื่อย้ายตำแหน่ง"
          title="กดเพื่อเปิดเพลง หรือลากเพื่อย้ายตำแหน่ง"
        >
          <Grip size={15} className="text-amber-500" />
          <Music2 size={17} />
          <span>เปิดเพลงจาก YouTube</span>
          <span className="animate-pulse text-emerald-300">●</span>
        </button>
      )}
    </div>
  );
};
