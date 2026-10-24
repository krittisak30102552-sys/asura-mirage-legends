import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, X, ExternalLink, Grip } from 'lucide-react';

const DEFAULT_YOUTUBE_VIDEO_ID = 'iggmiF7DNoM';
const DEFAULT_YOUTUBE_URL = `https://www.youtube.com/watch?v=${DEFAULT_YOUTUBE_VIDEO_ID}`;

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

function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  let candidate: string | null = null;

  if (hostname === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (
    hostname === 'youtube.com' ||
    hostname === 'm.youtube.com' ||
    hostname === 'music.youtube.com' ||
    hostname === 'youtube-nocookie.com'
  ) {
    candidate = url.searchParams.get('v');
    if (!candidate) {
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      candidate = match?.[1] ?? null;
    }
  }

  return candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

/** Draggable YouTube music panel; accepts any valid YouTube video URL. */
export const YouTubeMusicPlayer: React.FC<YouTubeMusicPlayerProps> = ({ isMuted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [videoId, setVideoId] = useState(DEFAULT_YOUTUBE_VIDEO_ID);
  const [urlInput, setUrlInput] = useState(DEFAULT_YOUTUBE_URL);
  const [urlError, setUrlError] = useState('');
  const [position, setPosition] = useState<PlayerPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);

  const sendPlayerCommand = useCallback((func: 'mute' | 'unMute') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      'https://www.youtube.com',
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      sendPlayerCommand(isMuted ? 'mute' : 'unMute');
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isOpen, isMuted, videoId, sendPlayerCommand]);

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
  }, [position, isOpen]);

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

  const handleSongSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextVideoId = extractYouTubeVideoId(urlInput);
    if (!nextVideoId) {
      setUrlError('ลิงก์ไม่ถูกต้อง ลองวางลิงก์เพลงจาก YouTube อีกครั้ง');
      return;
    }
    setUrlError('');
    setVideoId(nextVideoId);
  };

  const playerSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&loop=1&playlist=${videoId}&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  const currentYouTubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
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
          className="w-[300px] max-w-[90vw] overflow-hidden rounded-xl border-2 border-amber-500/80 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,.8)]"
          aria-label="ตัวเล่นเพลง YouTube"
        >
          <div
            {...dragHandlers}
            className="flex cursor-grab touch-none items-center justify-between gap-2 border-b border-amber-700/50 bg-zinc-900 px-3 py-2 active:cursor-grabbing"
            title="จับตรงนี้แล้วลากเพื่อย้ายตำแหน่ง"
          >
            <div className="flex min-w-0 items-center gap-2 text-amber-200">
              <Grip size={15} className="shrink-0 text-amber-500" />
              <Music2 size={16} className="shrink-0" />
              <span className="truncate text-xs font-bold">เปิดเพลง YouTube</span>
              <span className="rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold text-white">LIVE</span>
            </div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setIsOpen(false)}
              aria-label="ย่อหน้าต่างเพลง"
              title="ย่อหน้าต่างเพลง"
              className="shrink-0 rounded p-1 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSongSubmit} className="flex gap-1.5 border-b border-zinc-800 p-2">
            <input
              type="url"
              value={urlInput}
              onChange={(event) => {
                setUrlInput(event.target.value);
                if (urlError) setUrlError('');
              }}
              placeholder="วางลิงก์เพลง YouTube"
              aria-label="ลิงก์เพลง YouTube"
              className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-amber-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded border border-amber-300 bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300"
            >
              เล่นเพลง
            </button>
          </form>
          {urlError && <p role="alert" className="px-2 pt-1 text-[11px] text-rose-300">{urlError}</p>}

          <iframe
            key={videoId}
            ref={iframeRef}
            title="เพลง YouTube ที่เลือก"
            src={playerSrc}
            width="300"
            height="200"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => {
              window.setTimeout(() => sendPlayerCommand(isMuted ? 'mute' : 'unMute'), 350);
            }}
            className="block h-[200px] w-full border-0 bg-black"
          />
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-zinc-400">
            <span>ลากแถบด้านบนเพื่อย้ายตำแหน่ง</span>
            <a
              href={currentYouTubeUrl}
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
          {...dragHandlers}
          onClick={handlePlayerToggle}
          className="flex cursor-grab touch-none items-center gap-2 rounded-full border-2 border-amber-300 bg-zinc-950/95 px-4 py-3 text-xs font-bold text-amber-200 shadow-[0_6px_24px_rgba(0,0,0,.65)] transition hover:bg-zinc-900 active:cursor-grabbing"
          aria-label="เปิดเพลง YouTube หรือลากเพื่อย้ายตำแหน่ง"
          title="กดเพื่อเปิดเพลง หรือลากเพื่อย้ายตำแหน่ง"
        >
          <Grip size={15} className="text-amber-500" />
          <Music2 size={17} />
          <span>เปิดเพลง YouTube</span>
          <span className="animate-pulse text-emerald-300">●</span>
        </button>
      )}
    </div>
  );
};
