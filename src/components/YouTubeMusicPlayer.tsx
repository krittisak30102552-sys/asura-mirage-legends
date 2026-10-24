import React from 'react';
import { Youtube, ExternalLink } from 'lucide-react';

interface YouTubeMusicPlayerProps {
  isMuted: boolean;
}

/**
 * Opens the real YouTube website so players can search for any video.
 * No API key or in-game search setup is needed.
 */
export const YouTubeMusicPlayer: React.FC<YouTubeMusicPlayerProps> = () => {
  return (
    <a
      href="https://www.youtube.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="pointer-events-auto fixed bottom-3 right-3 z-[45] inline-flex items-center gap-2 rounded-full border-2 border-red-500/80 bg-zinc-950/95 px-4 py-3 font-rajdhani text-xs font-bold text-white shadow-[0_6px_24px_rgba(0,0,0,.65)] transition hover:border-red-400 hover:bg-zinc-900"
      aria-label="เปิด YouTube เพื่อค้นหาวิดีโออะไรก็ได้"
      title="เปิด YouTube เพื่อค้นหาเพลงหรือวิดีโออะไรก็ได้"
    >
      <Youtube size={19} className="text-red-500" />
      <span>เปิด YouTube</span>
      <ExternalLink size={13} className="text-zinc-400" />
    </a>
  );
};
