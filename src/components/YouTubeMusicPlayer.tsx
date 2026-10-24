import React, { useEffect, useRef, useState } from 'react';
import { Youtube, X, Grip, Search, Play, LoaderCircle } from 'lucide-react';

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

interface VideoSearchResult {
  type?: string;
  title?: string;
  videoId?: string;
  author?: string;
  lengthSeconds?: number;
  viewCount?: number;
  videoThumbnails?: Array<{ quality?: string; url?: string }>;
}

const DEFAULT_VIDEO_ID = 'iggmiF7DNoM';
const LEGACY_API_KEY_STORAGE = 'asura-mirage-youtube-api-key';

// Public, keyless search endpoints. They are community-hosted, so fail over if one is unavailable.
const SEARCH_ENDPOINTS = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yt.chocolatemoo53.com',
  'https://invidious.tiekoetter.com',
];

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

function formatDuration(seconds?: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return mins + ':' + secs;
}

function formatViews(views?: number): string {
  if (typeof views !== 'number' || !Number.isFinite(views) || views < 0) return '';
  if (views >= 1_000_000) return (views / 1_000_000).toFixed(1) + 'M views';
  if (views >= 1_000) return (views / 1_000).toFixed(1) + 'K views';
  return views + ' views';
}

/**
 * Floating in-game player with API-key-free video search.
 * The full youtube.com homepage blocks iframe embedding, so the panel searches
 * through public community endpoints and plays selected videos in YouTube's embed player.
 */
export const YouTubeMusicPlayer: React.FC<YouTubeMusicPlayerProps> = ({ isMuted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [videoId, setVideoId] = useState(DEFAULT_VIDEO_ID);
  const [videoInput, setVideoInput] = useState('https://www.youtube.com/watch?v=' + DEFAULT_VIDEO_ID);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<PlayerPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const searchRequestRef = useRef(0);

  // Remove a key left in local storage by the older search panel; no key is used anymore.
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

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setError('พิมพ์ชื่อคลิป เพลง หรือช่องที่อยากค้นหาก่อนนะ');
      setSearchResults([]);
      return;
    }

    const requestId = ++searchRequestRef.current;
    setIsSearching(true);
    setError('');
    setSearchResults([]);

    for (const endpoint of SEARCH_ENDPOINTS) {
      try {
        const url = endpoint + '/api/v1/search?q=' + encodeURIComponent(query) + '&type=video';
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) continue;
        const payload = await response.json() as VideoSearchResult[];
        if (!Array.isArray(payload)) continue;

        const results = payload.filter((item) =>
          item &&
          typeof item.videoId === 'string' &&
          /^[a-zA-Z0-9_-]{11}$/.test(item.videoId) &&
          typeof item.title === 'string' &&
          item.title.length > 0 &&
          (!item.type || item.type === 'video')
        ).slice(0, 12);

        if (requestId !== searchRequestRef.current) return;
        if (results.length > 0) {
          setSearchResults(results);
          setError('');
          setIsSearching(false);
          return;
        }
      } catch {
        // Try the next community endpoint if this one is offline or blocks cross-origin access.
      }
      if (requestId !== searchRequestRef.current) return;
    }

    if (requestId === searchRequestRef.current) {
      setError('ตอนนี้บริการค้นหาคลิปไม่ตอบสนอง ลองใหม่อีกครั้งได้เลย (ไม่ต้องใช้ API Key)');
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: VideoSearchResult) => {
    const id = item.videoId;
    if (!id) return;
    setVideoId(id);
    setVideoInput('https://www.youtube.com/watch?v=' + id);
    setError('');
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
        <section className="flex max-h-[88vh] w-[340px] max-w-[94vw] flex-col overflow-hidden rounded-xl border-2 border-red-500/80 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,.8)]" aria-label="หน้าต่าง YouTube ในเกม">
          <div {...dragHandlers} className="flex shrink-0 cursor-grab touch-none items-center justify-between gap-2 border-b border-red-900/60 bg-zinc-900 px-3 py-2 active:cursor-grabbing" title="จับตรงนี้เพื่อลากหน้าต่าง">
            <div className="flex min-w-0 items-center gap-2 text-white">
              <Grip size={15} className="shrink-0 text-zinc-400" />
              <Youtube size={18} className="shrink-0 text-red-500" />
              <span className="truncate text-xs font-bold">YouTube · ค้นหาในเกม</span>
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
                placeholder="ค้นหาคลิป เพลง เกม ได้หมด…"
                aria-label="ค้นหาวิดีโอ"
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-red-400"
              />
              <button type="submit" disabled={isSearching} className="inline-flex shrink-0 items-center gap-1 rounded border border-red-400 bg-red-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
                {isSearching ? <LoaderCircle size={13} className="animate-spin" /> : <Search size={13} />}
                {isSearching ? 'ค้นหา…' : 'ค้นหา'}
              </button>
            </form>

            {error && <p role="status" className="px-2 py-2 text-[10px] leading-relaxed text-amber-200">{error}</p>}

            {searchResults.length > 0 && (
              <div className="max-h-[190px] overflow-y-auto border-b border-zinc-800" aria-label="ผลการค้นหา">
                {searchResults.map((item) => {
                  const id = item.videoId;
                  if (!id) return null;
                  const rawThumb = item.videoThumbnails?.find((image) => image.quality === 'medium')?.url
                    ?? item.videoThumbnails?.[0]?.url;
                  const thumb = rawThumb
                    ? (rawThumb.startsWith('//') ? 'https:' + rawThumb : rawThumb.startsWith('/') ? 'https://inv.nadeko.net' + rawThumb : rawThumb)
                    : 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg';
                  const active = id === videoId;
                  const duration = formatDuration(item.lengthSeconds);
                  const views = formatViews(item.viewCount);
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => selectSearchResult(item)}
                      className={'flex w-full items-center gap-2 border-b border-zinc-900 px-2 py-2 text-left transition hover:bg-zinc-800 ' + (active ? 'bg-red-950/60' : 'bg-zinc-950')}
                    >
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          const image = event.currentTarget;
                          const fallback = 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg';
                          if (image.src !== fallback) image.src = fallback;
                          else image.style.visibility = 'hidden';
                        }}
                        className="h-11 w-[62px] shrink-0 rounded object-cover bg-zinc-800"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-100">{item.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-zinc-400">{item.author || 'YouTube'}</span>
                        {(duration || views) && <span className="mt-0.5 block truncate text-[9px] text-zinc-500">{[duration, views].filter(Boolean).join(' · ')}</span>}
                      </span>
                      {active && <span className="shrink-0 text-[9px] font-bold text-red-300">เลือกอยู่</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="px-2 pt-2 text-[11px] font-bold text-zinc-300">หรือวางลิงก์คลิปโดยตรง</div>
            <form onSubmit={handlePlayVideo} className="flex gap-1.5 p-2">
              <input
                type="text"
                value={videoInput}
                onChange={(e) => { setVideoInput(e.target.value); setError(''); }}
                placeholder="วางลิงก์ YouTube"
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
              <p className="mt-1 text-[10px] text-zinc-500">เลือกผลค้นหาเพื่อเปลี่ยนคลิป โดยยังอยู่ในเกม · ลากแถบด้านบนเพื่อย้ายหน้าต่าง</p>
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
