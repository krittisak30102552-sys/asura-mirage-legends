import React, { useEffect, useRef, useState } from 'react';
import { Youtube, X, Grip, Search, Play, ExternalLink } from 'lucide-react';

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

const DEFAULT_VIDEO_ID = 'iggmiF7DNoM';
const LEGACY_API_KEY_STORAGE = 'asura-mirage-youtube-api-key';

function extractVideoId(input: string): string | null {
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v');
      if (!id) id = url.pathname.match(/^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/)?.[1] ?? null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * A draggable mini YouTube player. Videos are played through YouTube's official
 * embed. Search results are opened on YouTube itself, since the full YouTube
 * website cannot be embedded in another page and API keys are intentionally not used.
 */
export const YouTubeMusicPlayer: React.FC<YouTubeMusicPlayerProps> = ({ isMuted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [videoId, setVideoId] = useState(DEFAULT_VIDEO_ID);
  const [videoInput, setVideoInput] = useState('https://www.youtube.com/watch?v=' + DEFAULT_VIDEO_ID);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [position, setPosition] = useState<PlayerPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Remove an old key saved by the previous search panel. No API key is used now.
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_API_KEY_STORAGE);
    } catch {
      // Ignore disabled browser storage.
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: isMuted ? 'mute' : 'unMute', args: [] }),
        'https://www.youtube.com',
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isOpen, isMuted, videoId]);

  useEffect(() => {
    const onResize = () => {
      const root = rootRef.current;
      if (!root || !position) return;
      const maxLeft = Math.max(8, window.innerWidth - root.offsetWidth - 8);
      const maxTop = Math.max(8, window.innerHeight - root.offsetHeight - 8);
      setPosition((current) => current ? {
        left: Math.max(8, Math.min(current.left, maxLeft)),
        top: Math.max(8, Math.min(current.top, maxTop)),
      } : null);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [position]);

  const beginDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const root = rootRef.current;
    if (!root) return;
    event.preventDefault();
    const rect = root.getBoundingClientRect();
    const start = { left: rect.left, top: rect.top };
    setPosition(start);
    dragRef.current = {
      ...start,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const root = rootRef.current;
    if (!drag || !root || drag.pointerId !== event.pointerId) return;
    const maxLeft = Math.max(8, window.innerWidth - root.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - root.offsetHeight - 8);
    setPosition({
      left: Math.max(8, Math.min(drag.left + event.clientX - drag.startX, maxLeft)),
      top: Math.max(8, Math.min(drag.top + event.clientY - drag.startY, maxTop)),
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

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setError('พิมพ์คำค้นก่อนนะ');
      return;
    }
    // The YouTube results page blocks being embedded inside this game.
    window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
    setError('เลือกคลิปจาก YouTube แล้วคัดลอกลิงก์มาวางในช่องด้านล่างเพื่อเล่นในหน้าต่างเกม');
  };

  const handlePlayVideo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = extractVideoId(videoInput);
    if (!id) {
      setError('ลิงก์ไม่ถูกต้อง วางลิงก์ YouTube หรือ Video ID 11 ตัวอักษร');
      return;
    }
    setVideoId(id);
    setVideoInput('https://www.youtube.com/watch?v=' + id);
    setError('');
    setIsOpen(true);
  };

  const positionStyle: React.CSSProperties = position
    ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' }
    : { right: 12, bottom: 12 };

  const playerSrc = 'https://www.youtube.com/embed/' + videoId
    + '?autoplay=0&controls=1&playsinline=1&rel=0&enablejsapi=1&origin='
    + encodeURIComponent(window.location.origin);

  return (
    <div ref={rootRef} data-youtube-player-root style={positionStyle} className="pointer-events-auto fixed z-[45] font-rajdhani">
      {isOpen ? (
        <section className="flex max-h-[86vh] w-[330px] max-w-[94vw] flex-col overflow-hidden rounded-xl border-2 border-red-500/80 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,.8)]" aria-label="หน้าต่าง YouTube ในเกม">
          <div {...dragHandlers} className="flex shrink-0 cursor-grab touch-none items-center justify-between gap-2 border-b border-red-900/60 bg-zinc-900 px-3 py-2 active:cursor-grabbing" title="จับตรงนี้เพื่อลากหน้าต่าง">
            <div className="flex min-w-0 items-center gap-2 text-white">
              <Grip size={15} className="shrink-0 text-zinc-400" />
              <Youtube size={18} className="shrink-0 text-red-500" />
              <span className="truncate text-xs font-bold">YouTube · เล่นในเกม</span>
            </div>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setIsOpen(false)} aria-label="ย่อ YouTube" className="shrink-0 rounded p-1 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto">
            <form onSubmit={handleSearch} className="flex gap-1.5 border-b border-zinc-800 p-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setError(''); }}
                placeholder="ค้นหาคลิปอะไรก็ได้…"
                aria-label="ค้นหาวิดีโอบน YouTube"
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-red-400"
              />
              <button type="submit" className="inline-flex shrink-0 items-center gap-1 rounded border border-red-400 bg-red-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-red-500">
                <Search size={13} /> ค้นหา
              </button>
            </form>

            {error && <p role="status" className="px-2 pt-2 text-[10px] leading-relaxed text-amber-200">{error}</p>}

            <div className="px-2 pt-2 text-[11px] font-bold text-zinc-300">วางลิงก์คลิปเพื่อเล่นในเกม</div>
            <form onSubmit={handlePlayVideo} className="flex gap-1.5 p-2">
              <input
                type="text"
                value={videoInput}
                onChange={(e) => { setVideoInput(e.target.value); setError(''); }}
                placeholder="วางลิงก์ YouTube / Video ID"
                aria-label="ลิงก์วิดีโอ YouTube"
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-red-400"
              />
              <button type="submit" className="inline-flex shrink-0 items-center gap-1 rounded border border-red-400 bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500">
                <Play size={13} /> เล่น
              </button>
            </form>

            <div className="border-t border-zinc-800 px-2 py-2">
              <iframe
                key={videoId}
                ref={iframeRef}
                title="YouTube video player"
                src={playerSrc}
                width="300"
                height="200"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="block h-[200px] w-full border-0 bg-black"
              />
              <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                <ExternalLink size={10} /> ค้นหาบน YouTube แล้วนำลิงก์กลับมาวางตรงนี้ · ลากแถบด้านบนเพื่อย้าย
              </p>
            </div>
          </div>
        </section>
      ) : (
        <button
          type="button"
          {...dragHandlers}
          onClick={() => setIsOpen(true)}
          className="flex cursor-grab touch-none items-center gap-2 rounded-full border-2 border-red-500/80 bg-zinc-950/95 px-4 py-3 text-xs font-bold text-white shadow-[0_6px_24px_rgba(0,0,0,.65)] transition hover:border-red-400 hover:bg-zinc-900 active:cursor-grabbing"
          aria-label="เปิดหน้าต่าง YouTube ในเกม"
          title="กดเพื่อเปิด YouTube ในเกม หรือลากเพื่อย้ายตำแหน่ง"
        >
          <Grip size={15} className="text-zinc-400" />
          <Youtube size={18} className="text-red-500" />
          <span>YouTube</span>
        </button>
      )}
    </div>
  );
};
