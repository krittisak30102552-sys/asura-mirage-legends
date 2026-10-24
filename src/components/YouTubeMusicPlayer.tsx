import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, X, Grip, Search, KeyRound } from 'lucide-react';

const DEFAULT_YOUTUBE_VIDEO_ID = 'iggmiF7DNoM';
const DEFAULT_YOUTUBE_URL = 'https://www.youtube.com/watch?v=' + DEFAULT_YOUTUBE_VIDEO_ID;
const YOUTUBE_API_KEY_STORAGE = 'asura-mirage-youtube-api-key';

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

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: {
    message?: string;
    errors?: Array<{ reason?: string }>;
  };
}

function readSavedApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(YOUTUBE_API_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
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

/**
 * Search runs inside this game panel using the official YouTube Data API.
 * A user-supplied API key is stored only in this browser's local storage.
 */
export const YouTubeMusicPlayer: React.FC<YouTubeMusicPlayerProps> = ({ isMuted }) => {
  const savedKey = readSavedApiKey();
  const [isOpen, setIsOpen] = useState(false);
  const [videoId, setVideoId] = useState(DEFAULT_YOUTUBE_VIDEO_ID);
  const [urlInput, setUrlInput] = useState(DEFAULT_YOUTUBE_URL);
  const [urlError, setUrlError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [apiKey, setApiKey] = useState(savedKey);
  const [apiKeyDraft, setApiKeyDraft] = useState(savedKey);
  const [showApiKey, setShowApiKey] = useState(() => !savedKey);
  const [keyMessage, setKeyMessage] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('เพลงที่ส่งมาให้');

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
  }, [position, isOpen, showApiKey, searchResults.length]);

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

  const handleSaveApiKey = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextKey = apiKeyDraft.trim();
    if (!nextKey) {
      setApiKey('');
      setKeyMessage('');
      try {
        window.localStorage.removeItem(YOUTUBE_API_KEY_STORAGE);
      } catch {
        // Storage can be disabled by the browser; search will then ask for the key again.
      }
      setSearchResults([]);
      setSearchError('ใส่ YouTube Data API key ก่อนค้นหา');
      return;
    }

    try {
      window.localStorage.setItem(YOUTUBE_API_KEY_STORAGE, nextKey);
      setApiKey(nextKey);
      setKeyMessage('บันทึกคีย์ไว้ในเบราว์เซอร์นี้แล้ว');
      setSearchError('');
      setSearchResults([]);
      setShowApiKey(false);
    } catch {
      setApiKey(nextKey);
      setKeyMessage('ใช้คีย์ได้ในรอบนี้ แต่เบราว์เซอร์ไม่อนุญาตให้บันทึก');
    }
  };

  const handleYouTubeSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchError('พิมพ์ชื่อเพลงหรือศิลปินก่อนนะ');
      return;
    }
    if (!apiKey.trim()) {
      setShowApiKey(true);
      setSearchError('ตั้งค่า YouTube API key ในส่วนด้านล่างก่อน เพื่อค้นหาและแสดงผลในเกม');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults: '8',
      videoEmbeddable: 'true',
      safeSearch: 'strict',
      key: apiKey.trim(),
    });

    try {
      const response = await fetch('https://www.googleapis.com/youtube/v3/search?' + params.toString());
      const payload = await response.json() as YouTubeSearchResponse;
      if (!response.ok) {
        const reason = payload.error?.errors?.[0]?.reason ?? '';
        if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
          setSearchError('โควตาค้นหา YouTube ของคีย์นี้หมดแล้ว ลองใหม่พรุ่งนี้หรือใช้คีย์อื่น');
        } else if (response.status === 400 || response.status === 403) {
          setSearchError('คีย์ไม่ถูกต้อง หรือยังไม่ได้เปิดใช้ YouTube Data API v3');
        } else {
          setSearchError(payload.error?.message || 'ค้นหาไม่สำเร็จ ลองอีกครั้งนะ');
        }
        return;
      }

      const validResults = (payload.items ?? []).filter((item) =>
        Boolean(item.id?.videoId && item.snippet?.title)
      );
      setSearchResults(validResults);
      if (validResults.length === 0) setSearchError('ไม่พบวิดีโอที่เล่นในตัวเกมได้ ลองคำค้นอื่นดู');
    } catch {
      setSearchError('เชื่อมต่อ YouTube ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSongSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextVideoId = extractYouTubeVideoId(urlInput);
    if (!nextVideoId) {
      setUrlError('ลิงก์ไม่ถูกต้อง ลองวางลิงก์ YouTube อีกครั้ง');
      return;
    }
    setUrlError('');
    setVideoId(nextVideoId);
    setSelectedTitle('เพลงจากลิงก์ที่วาง');
  };

  const selectSearchResult = (item: YouTubeSearchItem) => {
    const nextVideoId = item.id?.videoId;
    if (!nextVideoId) return;
    setVideoId(nextVideoId);
    setUrlInput('https://www.youtube.com/watch?v=' + nextVideoId);
    setSelectedTitle(item.snippet?.title ?? 'เพลงที่เลือก');
    setUrlError('');
  };

  const playerSrc = 'https://www.youtube.com/embed/' + videoId
    + '?autoplay=1&controls=1&loop=1&playlist=' + videoId
    + '&playsinline=1&rel=0&enablejsapi=1&origin=' + encodeURIComponent(window.location.origin);

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
          className="flex max-h-[86vh] w-[320px] max-w-[92vw] flex-col overflow-hidden rounded-xl border-2 border-amber-500/80 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,.8)]"
          aria-label="ค้นหาและเล่นเพลง YouTube ในเกม"
        >
          <div
            {...dragHandlers}
            className="flex shrink-0 cursor-grab touch-none items-center justify-between gap-2 border-b border-amber-700/50 bg-zinc-900 px-3 py-2 active:cursor-grabbing"
            title="จับตรงนี้แล้วลากเพื่อย้ายตำแหน่ง"
          >
            <div className="flex min-w-0 items-center gap-2 text-amber-200">
              <Grip size={15} className="shrink-0 text-amber-500" />
              <Music2 size={16} className="shrink-0" />
              <span className="truncate text-xs font-bold">ค้นหาเพลง YouTube</span>
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

          <div className="min-h-0 overflow-y-auto">
            <form onSubmit={handleYouTubeSearch} className="flex gap-1.5 border-b border-zinc-800 p-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  if (searchError) setSearchError('');
                }}
                placeholder="ชื่อเพลง / ศิลปิน / OST"
                aria-label="ค้นหาเพลงบน YouTube"
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-300 bg-amber-500 px-2.5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
              >
                <Search size={13} /> {isSearching ? 'ค้นหา…' : 'ค้นหา'}
              </button>
            </form>

            <details open={showApiKey} onToggle={(event) => setShowApiKey(event.currentTarget.open)} className="border-b border-zinc-800 px-2 py-1.5">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-amber-200">
                <KeyRound size={13} /> ตั้งค่า YouTube API key {apiKey ? '✓' : '(ต้องตั้งค่าครั้งแรก)'}
              </summary>
              <form onSubmit={handleSaveApiKey} className="mt-2 flex gap-1.5">
                <input
                  type="password"
                  value={apiKeyDraft}
                  onChange={(event) => {
                    setApiKeyDraft(event.target.value);
                    setKeyMessage('');
                  }}
                  autoComplete="off"
                  placeholder="วาง API key ของ YouTube"
                  aria-label="YouTube Data API key"
                  className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded border border-zinc-600 bg-zinc-800 px-2 py-2 text-[11px] font-bold text-white hover:bg-zinc-700"
                >
                  บันทึก
                </button>
              </form>
              <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-500">
                การค้นหาในเกมใช้ YouTube Data API v3 คีย์จะถูกเก็บในเบราว์เซอร์นี้เท่านั้น ควรจำกัดคีย์ให้ใช้ได้เฉพาะโดเมนของเกม
              </p>
              {keyMessage && <p className="mt-1 text-[10px] text-emerald-300">{keyMessage}</p>}
            </details>

            {searchError && <p role="alert" className="px-2 py-2 text-[11px] leading-relaxed text-rose-300">{searchError}</p>}

            {searchResults.length > 0 && (
              <div className="max-h-[170px] overflow-y-auto border-b border-zinc-800" aria-label="ผลการค้นหาเพลง">
                {searchResults.map((item) => {
                  const resultId = item.id?.videoId;
                  if (!resultId) return null;
                  const thumb = item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url;
                  const active = resultId === videoId;
                  return (
                    <button
                      type="button"
                      key={resultId}
                      onClick={() => selectSearchResult(item)}
                      className={'flex w-full items-center gap-2 border-b border-zinc-900 px-2 py-2 text-left transition hover:bg-zinc-800 ' + (active ? 'bg-amber-950/70' : 'bg-zinc-950')}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" loading="lazy" className="h-10 w-[58px] shrink-0 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-[58px] shrink-0 items-center justify-center rounded bg-zinc-800"><Music2 size={17} /></div>
                      )}
                      <span className="min-w-0">
                        <span className="block line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-100">{item.snippet?.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-zinc-400">{item.snippet?.channelTitle}</span>
                      </span>
                      {active && <span className="ml-auto shrink-0 text-[9px] font-bold text-amber-300">กำลังเล่น</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="px-2 pt-2 text-[11px] font-bold text-zinc-300">หรือวางลิงก์เพลงโดยตรง</div>
            <form onSubmit={handleSongSubmit} className="flex gap-1.5 p-2">
              <input
                type="url"
                value={urlInput}
                onChange={(event) => {
                  setUrlInput(event.target.value);
                  if (urlError) setUrlError('');
                }}
                placeholder="วางลิงก์ YouTube"
                aria-label="ลิงก์เพลง YouTube"
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-amber-400"
              />
              <button
                type="submit"
                className="shrink-0 rounded border border-amber-300 bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300"
              >
                เล่น
              </button>
            </form>
            {urlError && <p role="alert" className="px-2 pb-2 text-[11px] text-rose-300">{urlError}</p>}

            <div className="border-t border-zinc-800 px-3 py-2">
              <p className="mb-1 truncate text-[10px] text-amber-200" title={selectedTitle}>กำลังเลือก: {selectedTitle}</p>
              <iframe
                key={videoId}
                ref={iframeRef}
                title="เพลง YouTube ที่เลือก"
                src={playerSrc}
                width="320"
                height="180"
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                onLoad={() => {
                  window.setTimeout(() => sendPlayerCommand(isMuted ? 'mute' : 'unMute'), 350);
                }}
                className="block h-[180px] w-full border-0 bg-black"
              />
              <p className="mt-1 text-[10px] text-zinc-500">ลากแถบด้านบนเพื่อย้ายหน้าต่าง · ถ้าไม่เล่นเองให้กด ▶</p>
            </div>
          </div>
        </section>
      ) : (
        <button
          type="button"
          {...dragHandlers}
          onClick={handlePlayerToggle}
          className="flex cursor-grab touch-none items-center gap-2 rounded-full border-2 border-amber-300 bg-zinc-950/95 px-4 py-3 text-xs font-bold text-amber-200 shadow-[0_6px_24px_rgba(0,0,0,.65)] transition hover:bg-zinc-900 active:cursor-grabbing"
          aria-label="เปิดค้นหาเพลง YouTube หรือลากเพื่อย้ายตำแหน่ง"
          title="กดเพื่อค้นหาเพลง หรือลากเพื่อย้ายตำแหน่ง"
        >
          <Grip size={15} className="text-amber-500" />
          <Music2 size={17} />
          <span>ค้นหาเพลงในเกม</span>
          <span className="animate-pulse text-emerald-300">●</span>
        </button>
      )}
    </div>
  );
};
