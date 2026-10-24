/**
 * Comprehensive HUD for Mirage Legends (Otherworld Legends Style)
 * Displays:
 * - 6 Core Combat Stats: Health, Armor, Damage, Critical Rate, Attack Speed, Movement Speed
 * - Active Relic Inventory bar with icons and perks
 * - Giant Boss Health Bar when fighting 10 Wiki Bosses
 * - Real-time Combo Counter & Multiplier
 * - Normal Attack Combo and Dash / Dodge controls
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlayerStats, HeroId, RelicItem, DifficultyMode, DungeonRoomId, DungeonInteractableType } from '../types/game';
import { HERO_CONFIGS, HERO_SKILLS, GINZO_AWAKENED_SKILLS } from '../data/gameData';
import { ItemIcon } from './ItemIcon';
import { DIFFICULTY_CONFIGS } from '../game/combatRules';
import { Shield, Volume2, VolumeX, Pause, HelpCircle, DoorOpen, Compass, Zap, Sparkles, Wind, Flame, Dices, Heart, Maximize, Minimize, Share2, Smartphone, Check, Briefcase, Terminal, X } from 'lucide-react';
import { VirtualJoystick } from './VirtualJoystick';
import type { StageRoomNode, StageRoomType } from '../game/levelSystem';
import { generateHeroTexture } from '../graphics/pixelSprites';

interface StageMapInfo {
  stageNumber: number;
  rooms: StageRoomNode[];
  currentRoomIndex: number;
  visitedRoomIndices: number[];
}

const MAP_SLOTS = Array.from({ length: 25 }, (_, index) => ({
  x: 10 + (index % 5) * 20,
  y: 10 + Math.floor(index / 5) * 20,
}));

const ROOM_DOT: Record<StageRoomType, { icon: string; color: string }> = {
  start: { icon: '⌂', color: '#67e8f9' },
  combat: { icon: '·', color: '#a1a1aa' },
  elite: { icon: '!', color: '#fb7185' },
  shop: { icon: '¢', color: '#fbbf24' },
  chest: { icon: '◆', color: '#fcd34d' },
  altar: { icon: '✦', color: '#67e8f9' },
  boss: { icon: '♛', color: '#f87171' },
  exit: { icon: '↗', color: '#6ee7b7' },
  forge: { icon: '⚒', color: '#fb923c' },
  secret: { icon: '?', color: '#c084fc' },
};

const DungeonMiniMap: React.FC<{ map: StageMapInfo }> = ({ map }) => {
  const visited = new Set(map.visitedRoomIndices);
  const pointFor = (node: StageRoomNode) => MAP_SLOTS[node.mapPosition] ?? MAP_SLOTS[12];
  const edges: Array<{ from: StageRoomNode; to: StageRoomNode }> = [];
  map.rooms.forEach((node) => {
    Object.values(node.connections).forEach((targetId) => {
      const target = map.rooms.find((room) => room.id === targetId);
      if (target && node.id < target.id) edges.push({ from: node, to: target });
    });
  });

  return (
    <div className="w-[148px] rounded-sm border-2 border-[#82705d] bg-[#09090b]/90 p-1 shadow-[0_4px_16px_rgba(0,0,0,.65)] sm:w-[164px]">
      <div className="flex items-center justify-between border-b border-[#51463b] px-1 pb-0.5 font-pixel text-[8px] text-zinc-300">
        <span>ดันเจี้ยน {map.stageNumber}</span>
        <span>{map.currentRoomIndex + 1}-{map.rooms.length}</span>
      </div>
      <div className="relative h-[118px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map(({ from, to }) => {
            const a = pointFor(from);
            const b = pointFor(to);
            const discovered = visited.has(from.id) || visited.has(to.id);
            return <line key={`${from.id}-${to.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={discovered ? '#c8a66b' : '#6b6258'} strokeOpacity={discovered ? 0.9 : 0.38} strokeWidth="2.5" />;
          })}
        </svg>
        {map.rooms.map((room) => {
          const point = pointFor(room);
          const current = room.id === map.currentRoomIndex;
          const discovered = visited.has(room.id) || map.rooms.some((neighbor) => visited.has(neighbor.id) && Object.values(neighbor.connections).includes(room.id));
          const details = ROOM_DOT[room.type];
          return (
            <div
              key={room.id}
              title={discovered ? room.type : 'ห้องที่ยังไม่สำรวจ'}
              className={`absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center border font-pixel text-[10px] leading-none ${current ? 'z-10 border-amber-200 bg-amber-500 text-black shadow-[0_0_9px_#fbbf24]' : discovered ? 'border-[#9d8569] bg-[#302922]' : 'border-zinc-600 bg-[#19191b]'}`}
              style={{ left: `${point.x}%`, top: `${point.y}%`, color: current ? undefined : discovered ? details.color : '#777' }}
            >
              {discovered ? details.icon : '?'}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface HUDProps {
  mode: 'lobby' | 'dungeon';
  stats: PlayerStats;
  activeHeroId: HeroId;
  isGinzoEvolved?: boolean;
  relics: RelicItem[];
  dashCooldown: number;
  dashMaxCooldown: number;
  comboStep: number;
  currentWave: number;
  maxWaves: number;
  dungeonNameTh: string;
  bossInfo?: { name: string; hp: number; maxHp: number; action?: string } | null;
  nearbyInteractable: 'trainer' | 'gate' | null;
  nearbyDungeonInteractable?: DungeonInteractableType | null;
  currentRoom?: DungeonRoomId;
  isLevelRun?: boolean;
  stageMap?: StageMapInfo;
  difficulty?: DifficultyMode;
  onChangeRoom?: (room: DungeonRoomId) => void;
  onInteractDungeon?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenHelp: () => void;
  onPause: () => void;
  onReturnToLobby: () => void;
  onOpenGate: () => void;
  onOpenTrainer: () => void;
  onOpenStatUpgrade?: () => void;
  onOpenInventory?: () => void;
  // Combat Action handlers for touch & click
  onAttack?: () => void;
  onDash?: () => void;
  onSkill?: (slot: 1 | 2 | 3) => void;
  skillCooldowns?: Record<1 | 2 | 3, number>;
  onInteract?: () => void;
  onRunCommand?: (command: string) => boolean;
  oneHitMode?: boolean;
  // Mobile Joystick handler
  onJoystickMove?: (x: number, z: number) => void;
  onJoystickAim?: (angle: number) => void;
}

export const HUD: React.FC<HUDProps> = ({
  mode,
  stats,
  activeHeroId,
  isGinzoEvolved = false,
  relics,
  dashCooldown,
  dashMaxCooldown,
  comboStep,
  currentWave,
  maxWaves,
  dungeonNameTh,
  bossInfo,
  nearbyInteractable,
  nearbyDungeonInteractable,
  currentRoom = 'center',
  isLevelRun = false,
  stageMap,
  difficulty = 'normal',
  onChangeRoom,
  onInteractDungeon,
  isMuted,
  onToggleMute,
  onOpenHelp,
  onPause,
  onReturnToLobby,
  onOpenGate,
  onOpenTrainer,
  onOpenStatUpgrade,
  onOpenInventory,
  onAttack,
  onDash,
  onSkill,
  skillCooldowns,
  onInteract,
  onRunCommand,
  oneHitMode = false,
  onJoystickMove,
  onJoystickAim,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [commandMessage, setCommandMessage] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);
  // Auto-detect touch device or small screen, with user override
  const [forceTouchControls, setForceTouchControls] = useState<boolean>(() => {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024);
  });

  React.useEffect(() => {
    const handleCheck = () => {
      if (window.innerWidth < 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0) {
        setForceTouchControls(true);
      }
    };
    window.addEventListener('resize', handleCheck);
    return () => window.removeEventListener('resize', handleCheck);
  }, []);

  useEffect(() => {
    if (commandOpen) commandInputRef.current?.focus();
  }, [commandOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const requestFullscreen = document.documentElement.requestFullscreen;
      if (requestFullscreen) {
        requestFullscreen.call(document.documentElement).then(() => setIsFullscreen(true)).catch(() => {});
      }
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleShareLink = async () => {
    const sharedLink = { title: 'Asura Mirage: Legends', text: 'มาลองเล่นดันเจี้ยนสุ่ม 20 ชั้นกัน!', url: window.location.href };
    const showSharedToast = () => {
      setCopiedToast(true);
      window.setTimeout(() => setCopiedToast(false), 3000);
    };

    if (navigator.share) {
      try {
        await navigator.share(sharedLink);
        showSharedToast();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(sharedLink.url);
      else throw new Error('Clipboard API unavailable');
      showSharedToast();
    } catch {
      const temporaryInput = document.createElement('textarea');
      temporaryInput.value = sharedLink.url;
      temporaryInput.style.position = 'fixed';
      temporaryInput.style.opacity = '0';
      document.body.appendChild(temporaryInput);
      temporaryInput.select();
      const copied = document.execCommand('copy');
      temporaryInput.remove();
      if (copied) showSharedToast();
      else setCopiedToast(false);
    }
  };

  const heroCfg = HERO_CONFIGS[activeHeroId] || HERO_CONFIGS.ginzo;
  const heroDisplayName = activeHeroId === 'ginzo' && isGinzoEvolved ? 'กินอิ่ม (Ginzo Awakened)' : heroCfg.nameTh;
  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100));
  const referenceDungeonHud = mode === 'dungeon' && isLevelRun;
  const heroPortrait = useMemo(() => {
    const sprite = generateHeroTexture(activeHeroId, 'idle', 0, isGinzoEvolved);
    const source = sprite.image as HTMLCanvasElement;
    const crop = document.createElement('canvas');
    crop.width = 128;
    crop.height = 128;
    const context = crop.getContext('2d');
    if (context) {
      context.imageSmoothingEnabled = false;
      context.drawImage(source, 0, 0, 256, 210, 0, 0, 128, 128);
    }
    sprite.dispose();
    return crop.toDataURL('image/png');
  }, [activeHeroId, isGinzoEvolved]);

  return (
    <div className="pixel-rpg-hud absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-2 sm:p-3 md:p-6 pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      {commandOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/65 p-3 pt-[16vh] pointer-events-auto sm:pt-[20vh]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCommandOpen(false);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="game-command-title" className="w-full max-w-sm border-[3px] border-[#bd9557] bg-[#171416] p-3 text-[#f6e7c9] shadow-[8px_8px_0_rgba(0,0,0,.6)] sm:p-4">
            <div className="mb-3 flex items-center justify-between border-b-2 border-[#514239] pb-2">
              <h2 id="game-command-title" className="flex items-center gap-2 font-pixel text-xs text-amber-200">
                <Terminal size={16} /> ช่องคำสั่ง
              </h2>
              <button type="button" onClick={() => setCommandOpen(false)} className="border-2 border-[#74634f] bg-[#29221d] p-1 text-zinc-200 hover:text-white" aria-label="ปิดช่องคำสั่ง">
                <X size={16} />
              </button>
            </div>
            <p className="mb-3 font-rajdhani text-sm text-[#c3b8a5]">พิมพ์คำสั่งแล้วกด Enter เพื่อใช้ในเกม</p>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const command = commandInput.trim().replace(/\s+/g, '');
                if (!command) return;
                const accepted = onRunCommand?.(command) ?? false;
                setCommandMessage(accepted ? 'เปิดใช้ 1คิว แล้ว — โจมตีมอนสเตอร์ตายทันที' : `ไม่รู้จักคำสั่ง “${command}”`);
                if (accepted) setCommandInput('');
              }}
            >
              <input
                ref={commandInputRef}
                value={commandInput}
                onChange={(event) => setCommandInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    setCommandOpen(false);
                  }
                }}
                maxLength={32}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="เช่น 1คิว"
                aria-label="พิมพ์คำสั่งเกม"
                className="min-w-0 flex-1 border-2 border-[#685846] bg-[#090a0d] px-3 py-2 font-pixel text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400 select-text"
              />
              <button type="submit" className="border-2 border-[#f2ca75] bg-[#a86327] px-3 font-pixel text-[10px] text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.25)] active:translate-y-px">
                ใช้
              </button>
            </form>
            <div className="mt-3 flex items-center justify-between gap-2 font-rajdhani text-xs">
              <span className={commandMessage.includes('ไม่รู้จัก') ? 'text-rose-300' : 'text-emerald-200'} aria-live="polite">
                {commandMessage || (oneHitMode ? 'สถานะ: 1คิว เปิดอยู่' : 'คำสั่งที่ใช้ได้: 1คิว')}
              </span>
              {oneHitMode && <span className="shrink-0 border border-emerald-400 px-1.5 py-1 font-pixel text-[8px] text-emerald-200">1คิว ON</span>}
            </div>
          </section>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-wrap items-start justify-between gap-1 w-full">
          {/* Top-Left: Player Info & 6 Core Stats */}
          <div className={`pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 shadow-xl shadow-black/80 ${referenceDungeonHud ? 'border-[3px] border-[#b98a4d] rounded-sm bg-[#171416]/95' : 'bg-zinc-950/90 border-2 border-amber-600/70 rounded-xl backdrop-blur-xs'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`${referenceDungeonHud ? 'w-12 h-12 sm:w-16 sm:h-16 border-[3px] border-[#d0a65e] rounded-sm bg-[#3a2423]' : 'w-10 h-10 sm:w-12 sm:h-12 bg-zinc-900 border-2 border-amber-500 rounded-lg'} flex items-center justify-center font-pixel text-amber-200 shadow-inner shrink-0 overflow-hidden`}>
                <img src={heroPortrait} alt={heroDisplayName} className="h-full w-full object-cover object-top" />
              </div>

              <div className="flex flex-col space-y-1 w-32 sm:w-44 lg:w-56">
                <div className="flex items-center justify-between text-xs font-rajdhani font-bold tracking-wider text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <span>{heroDisplayName}</span>
                    <span
                      className="text-[9px] font-pixel px-1.5 py-0.2 rounded font-bold"
                      style={{
                        backgroundColor: `${DIFFICULTY_CONFIGS[difficulty]?.badgeColor || '#38bdf8'}20`,
                        color: DIFFICULTY_CONFIGS[difficulty]?.badgeColor || '#38bdf8',
                        border: `1px solid ${DIFFICULTY_CONFIGS[difficulty]?.badgeColor || '#38bdf8'}60`,
                      }}
                    >
                      {DIFFICULTY_CONFIGS[difficulty]?.nameTh || 'ปานกลาง'}
                    </span>
                  </div>
                  <span className="font-pixel text-[10px] text-zinc-400">
                    {mode === 'lobby' ? '🏛️ LOUNGE' : referenceDungeonHud ? `ชั้น ${stageMap?.stageNumber ?? 1}` : `WAVE ${currentWave}/${maxWaves}`}
                  </span>
                </div>

                {/* Health Bar (Health พลังชีวิต) */}
                <div className="relative w-full h-3 bg-zinc-900 border border-red-950 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150"
                    style={{ width: `${hpPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-pixel text-white drop-shadow">
                    {Math.round(stats.hp)} / {stats.maxHp}
                  </span>
                </div>

                {/* Armor Bar (Armor เกราะหรือค่าป้องกัน) */}
                <div className="relative w-full h-2.5 bg-zinc-900 border border-sky-950 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-150"
                    style={{ width: `${shieldPercent}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-1 text-[8px] font-pixel text-sky-200">
                    <span className="flex items-center gap-0.5">
                      <Shield size={8} /> ARMOR
                    </span>
                    <span>{Math.round(stats.shield)}</span>
                  </div>
                </div>

                {/* Gold & Kills */}
                <div className="flex items-center justify-between text-[11px] font-rajdhani pt-0.5">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    🪙 {stats.gold} <span className="text-[9px] text-zinc-400">GOLD</span>
                  </span>
                  <span className="flex items-center gap-1 text-zinc-300 font-bold">
                    ⚔️ {stats.kills} <span className="text-[9px] text-zinc-400">KILLS</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 6 Core Stats Dashboard Strip (Desktop and large tablet view) */}
            <div className={`${referenceDungeonHud ? 'hidden' : 'hidden lg:grid'} border-t sm:border-t-0 sm:border-l border-zinc-800 pt-2 sm:pt-0 sm:pl-3 grid-cols-3 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-rajdhani`}>
              {/* Damage (ความแรงในการโจมตี) */}
              <div className="flex items-center gap-1 text-amber-300" title="Damage (ความแรงในการโจมตี)">
                <Zap size={11} className="text-amber-400 shrink-0" />
                <span className="text-zinc-400 text-[10px]">ATK:</span>
                <span className="font-pixel text-[9px] font-bold text-white">{stats.attackPower}</span>
              </div>
              {/* Armor (เกราะหรือค่าป้องกัน) */}
              <div className="flex items-center gap-1 text-sky-300" title="Armor (เกราะหรือค่าป้องกัน)">
                <Shield size={11} className="text-sky-400 shrink-0" />
                <span className="text-zinc-400 text-[10px]">ARM:</span>
                <span className="font-pixel text-[9px] font-bold text-white">{Math.round(stats.shield)}</span>
              </div>
              {/* Critical Rate (โอกาสโจมตีติดคริติคอล) */}
              <div className="flex items-center gap-1 text-yellow-300" title="Critical Rate (โอกาสติดคริติคอล)">
                <Sparkles size={11} className="text-yellow-400 shrink-0" />
                <span className="text-zinc-400 text-[10px]">CRIT:</span>
                <span className="font-pixel text-[9px] font-bold text-white">{Math.round(stats.critChance * 100)}%</span>
              </div>
              {/* Attack Speed (ความเร็วในการโจมตี) */}
              <div className="flex items-center gap-1 text-rose-300" title="Attack Speed (ความเร็วในการโจมตี)">
                <Flame size={11} className="text-rose-400 shrink-0" />
                <span className="text-zinc-400 text-[10px]">SPD:</span>
                <span className="font-pixel text-[9px] font-bold text-white">{stats.attackSpeed.toFixed(1)}x</span>
              </div>
              {/* Movement Speed (ความเร็วในการเคลื่อนที่) */}
              <div className="flex items-center gap-1 text-emerald-300" title="Movement Speed (ความเร็วเคลื่อนที่)">
                <Wind size={11} className="text-emerald-400 shrink-0" />
                <span className="text-zinc-400 text-[10px]">MOV:</span>
                <span className="font-pixel text-[9px] font-bold text-white">{stats.moveSpeed.toFixed(1)}</span>
              </div>
              {/* Relics count */}
              <div className="flex items-center gap-1 text-purple-300">
                <span className="text-[10px]">RELIC:</span>
                <span className="font-pixel text-[9px] font-bold text-purple-200">{relics.length}</span>
              </div>
            </div>
          </div>

          {/* Top-Center: Dungeon Stage Banner & Multi-Room Navigator */}
          {mode === 'dungeon' && !isLevelRun && (
            <div className="pointer-events-auto flex flex-col items-center gap-1.5 self-center">
              <div className="flex items-center gap-2 bg-zinc-950/85 border border-amber-500/50 px-3.5 py-1 rounded-full text-xs font-rajdhani text-amber-300 font-bold tracking-wide shadow-lg">
                <Compass size={14} className="text-amber-400" />
                <span>{isLevelRun ? 'ดันเจี้ยนทดสอบ · 20 ชั้น' : `${dungeonNameTh} (20 WAVES)`}</span>
              </div>

              {/* 4-Room Chamber Mini-Navigator */}
              {!isLevelRun && (
              <div className="flex items-center gap-1 bg-zinc-950/90 border border-zinc-800 p-1 rounded-xl shadow-xl backdrop-blur-xs">
                {/* West Room (คลังอุปกรณ์) */}
                <button
                  onClick={() => onChangeRoom?.('west')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-rajdhani font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    currentRoom === 'west'
                      ? 'bg-amber-500 text-zinc-950 shadow-md ring-1 ring-white/40'
                      : 'bg-zinc-900/80 hover:bg-zinc-800 text-amber-300 border border-amber-500/30'
                  }`}
                  title="ห้องคลังอุปกรณ์เพิ่มสถานะ (WEST ROOM)"
                >
                  <span>⬅️ อุปกรณ์</span>
                </button>

                {/* Center Room (ลานประลองกลาง 20 เวฟ) */}
                <button
                  onClick={() => onChangeRoom?.('center')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-rajdhani font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    currentRoom === 'center'
                      ? 'bg-emerald-500 text-zinc-950 shadow-md ring-1 ring-white/40'
                      : 'bg-zinc-900/80 hover:bg-zinc-800 text-emerald-300 border border-emerald-500/30'
                  }`}
                  title="ลานประลองกลาง 20 เวฟ (CENTER ARENA)"
                >
                  <span>⚔️ ลานต่อสู้ ({currentWave}/20)</span>
                </button>

                {/* North Room (อุปกรณ์เพิ่มสถานะ) */}
                <button
                  onClick={() => onChangeRoom?.('north')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-rajdhani font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    currentRoom === 'north'
                      ? 'bg-purple-500 text-zinc-950 shadow-md ring-1 ring-white/40'
                      : 'bg-zinc-900/80 hover:bg-zinc-800 text-purple-300 border border-purple-500/30'
                  }`}
                  title="ห้องอุปกรณ์เพิ่มสถานะ (NORTH ROOM)"
                >
                  <span>⬆️ เพิ่มสถานะ</span>
                </button>

                {/* East Room (บ่อน้ำโอสถ) */}
                <button
                  onClick={() => onChangeRoom?.('east')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-rajdhani font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    currentRoom === 'east'
                      ? 'bg-teal-500 text-zinc-950 shadow-md ring-1 ring-white/40'
                      : 'bg-zinc-900/80 hover:bg-zinc-800 text-teal-300 border border-teal-500/30'
                  }`}
                  title="ห้องบ่อน้ำโอสถฟื้นพลัง (EAST ROOM)"
                >
                  <span>➡️ บ่อน้ำโอสถ</span>
                </button>
              </div>
              )}
            </div>
          )}

          {/* Top-Right: Quick Control Buttons */}
          <div className={`pointer-events-auto ml-auto flex max-w-[calc(100vw-12rem)] ${referenceDungeonHud ? 'flex-col items-end gap-1' : 'flex-wrap items-center justify-end gap-1 sm:max-w-none sm:flex-nowrap sm:gap-2'}`}>
            <button
              type="button"
              onClick={() => {
                setCommandMessage('');
                setCommandOpen(true);
              }}
              className="flex items-center gap-1 border-2 border-[#9b805d] bg-[#171416]/95 px-2 py-1.5 font-pixel text-[9px] text-[#f5d898] shadow-[0_2px_0_#09090b] hover:border-amber-300"
              title="เปิดช่องใส่คำสั่งเกม"
            >
              <Terminal size={14} /> <span>คำสั่ง</span>
              {oneHitMode && <span className="border border-emerald-400 px-1 text-emerald-200">1คิว</span>}
            </button>
            {mode === 'lobby' && (
              <div className="flex items-center gap-1.5 mr-1">
                <button
                  onClick={onOpenTrainer}
                  className="px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-sky-500/50 text-sky-300 font-pixel text-[10px] rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="เปลี่ยนตัวละคร"
                >
                  <span className="sm:hidden">🥋</span>
                  <span className="hidden sm:inline">🥋 ฮีโร่</span>
                </button>
                <button
                  onClick={onOpenGate}
                  className="px-2.5 py-1.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400 text-emerald-300 font-pixel text-[10px] rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer ring-1 ring-emerald-400/50"
                  title="Dungeon Gate - ดันเจี้ยนทดสอบแบบสุ่ม 20 ชั้น"
                >
                  <Sparkles size={12} className="text-emerald-400" />
                  <span className="sm:hidden">🌀</span>
                  <span className="hidden sm:inline">🌀 ดันเจี้ยน</span>
                </button>
              </div>
            )}

            {referenceDungeonHud ? (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <button onClick={onReturnToLobby} className="flex items-center gap-1 border-[3px] border-[#53cdb0] bg-[#168b75] px-2 py-1.5 font-pixel text-[8px] text-[#d6fff2] shadow-[inset_0_0_0_1px_#0b4f45] sm:text-[9px]">
                    <DoorOpen size={13} /> กลับล็อบบี้
                  </button>
                  <button onClick={onPause} className="flex h-9 w-9 flex-col items-center justify-center border-2 border-zinc-300 bg-zinc-950/90 text-white shadow-[0_2px_0_#555]" title="หยุดเกม (Esc)">
                    <Pause size={16} />
                    <span className="font-pixel text-[7px] leading-none">Esc</span>
                  </button>
                </div>
                {stageMap && <DungeonMiniMap map={stageMap} />}
                <div className="flex items-center gap-2 border border-[#6c5b49] bg-black/85 px-1.5 py-1 font-pixel text-[9px] text-amber-200 shadow-md">
                  <button onClick={onOpenInventory} className="flex items-center gap-1 border-r border-[#56493c] pr-2 text-zinc-100" title="เปิดกระเป๋าอุปกรณ์ (B)">
                    <span className="text-base">🧰</span><span>[B]</span>
                  </button>
                  <span className="text-amber-300">🪙 {stats.gold}</span>
                </div>
              </div>
            ) : (
              <>
            {mode === 'dungeon' && (
              <button
                onClick={onReturnToLobby}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-amber-600/60 text-amber-300 font-pixel text-[10px] rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="Return to Mirage Lounge"
              >
                <DoorOpen size={14} />
                <span className="hidden sm:inline">กลับล็อบบี้</span>
              </button>
            )}

            {/* Inventory Backpack button */}
            <button
              onClick={onOpenInventory}
              className="p-2 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400 hover:border-amber-300 text-amber-300 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="เปิดกระเป๋าเก็บของ & อุปกรณ์ (B)"
            >
              <Briefcase size={17} />
              <span className="hidden sm:inline font-pixel text-[10px] tracking-wide">กระเป๋า [B]</span>
            </button>

            <button
              onClick={onToggleMute}
              className="hidden sm:flex p-2.5 bg-zinc-950/80 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-400 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
              title="Toggle Sound"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Share Web Link */}
            <button
              onClick={handleShareLink}
              className="flex p-2 sm:p-2.5 bg-zinc-950/80 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-400 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
              title="คัดลอกลิงก์เว็ปแชร์เล่นได้ทุกที่"
            >
              {copiedToast ? <Check size={16} className="text-emerald-400 sm:h-[18px] sm:w-[18px]" /> : <Share2 size={16} className="sm:h-[18px] sm:w-[18px]" />}
            </button>

            {/* Toggle Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 bg-zinc-950/80 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-400 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
              title="เปิดโหมดเต็มจอ (Fullscreen)"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            {/* Toggle On-screen Touch Controls */}
            <button
              onClick={() => setForceTouchControls((prev) => !prev)}
              className={`hidden sm:flex p-2.5 border rounded-lg transition-all shadow-md active:scale-95 cursor-pointer ${
                forceTouchControls
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-zinc-950/80 border-zinc-700 hover:border-amber-400 text-zinc-400'
              }`}
              title="เปิด/ปิดปุ่มสัมผัสบนหน้าจอ (Touch Controls)"
            >
              <Smartphone size={18} />
            </button>

            <button
              onClick={onOpenHelp}
              className="hidden sm:flex p-2.5 bg-zinc-950/80 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-400 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
              title="Controls Guide"
            >
              <HelpCircle size={18} />
            </button>

            <button
              onClick={onPause}
              className="p-2.5 bg-zinc-950/80 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-400 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
              title="Pause Game"
            >
              <Pause size={18} />
            </button>
              </>
            )}
          </div>
        </div>

        {/* Copy toast */}
        {copiedToast && (
          <div className="self-center bg-emerald-950/95 border border-emerald-400 text-emerald-200 px-4 py-2 rounded-xl text-xs font-rajdhani font-bold shadow-xl animate-fade-in pointer-events-none flex items-center gap-2">
            <Check size={16} className="text-emerald-400" />
            <span>แชร์ลิงก์เกมแล้ว เปิดเล่นได้ทั้งมือถือและคอมพิวเตอร์ 🌐</span>
          </div>
        )}

        {/* BOSS HEALTH BAR (Visible when fighting official boss) */}
        {bossInfo && (
          <div className="self-center w-full max-w-xl bg-zinc-950/90 border-2 border-purple-500/80 p-2 rounded-xl shadow-2xl flex flex-col gap-1 pointer-events-none animate-fade-in">
            <div className="flex items-center justify-between text-xs font-rajdhani font-bold px-1">
              <span className="text-purple-300 font-pixel text-[10px] tracking-wide flex items-center gap-1.5">
                👑 BOSS: {bossInfo.name}
              </span>
              {bossInfo.action && <span className="text-pink-300 font-pixel text-[8px]">⚠ {bossInfo.action}</span>}
              <span className="text-zinc-300 font-mono text-[11px]">
                {Math.max(0, Math.round(bossInfo.hp))} / {bossInfo.maxHp}
              </span>
            </div>
            <div className="relative w-full h-3.5 bg-zinc-900 border border-purple-900 rounded-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (bossInfo.hp / bossInfo.maxHp) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Active Relics Rack */}
        {relics.length > 0 && (
          <div className="pointer-events-auto self-start flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800 p-1.5 rounded-lg">
            <span className="text-[9px] font-pixel text-zinc-400 px-1">RELICS:</span>
            {relics.map((r, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded border bg-zinc-900 flex items-center justify-center text-sm shadow cursor-pointer transition-transform hover:scale-110"
                style={{ borderColor: r.iconColor }}
                title={`${r.nameTh}: ${r.descTh}`}
              >
                <ItemIcon itemId={r.id} rarity={r.rarity} color={r.iconColor} size={25} kind="relic" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS BAR: Left Joystick + Center Dock + Right Mobile Actions */}
      <div className={`relative w-full flex items-end justify-between gap-1 pointer-events-none mb-1 sm:mb-2 px-1 sm:px-3 ${referenceDungeonHud ? 'pb-1 sm:pb-2' : ''}`}>
        {/* BOTTOM LEFT: Virtual Joystick (Rendered when touch controls enabled) */}
        <div className="pointer-events-auto w-24 sm:w-32 flex items-center justify-start shrink-0">
          {forceTouchControls && onJoystickMove && (
            <div className="animate-fade-in">
              <VirtualJoystick
                onMove={onJoystickMove}
                onAim={onJoystickAim}
              />
            </div>
          )}
        </div>

        {/* BOTTOM CENTER: Combat Controls Dock */}
        <div className={`flex min-w-0 flex-1 items-center pointer-events-auto ${referenceDungeonHud ? 'justify-end' : 'justify-end sm:justify-center'}`}>
          <div className={`flex items-center gap-1 sm:gap-3 ${referenceDungeonHud ? 'bg-transparent border-0 px-1 py-1 shadow-none' : 'bg-zinc-950/95 border-2 border-amber-600/70 px-1.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl shadow-2xl shadow-black backdrop-blur-xs'}`}>
            {/* Normal Attack (LMB / Tap) */}
            <button
              type="button"
              onClick={onAttack}
              className="flex flex-col items-center group cursor-pointer active:scale-90 transition-transform"
              title="โจมตีปกติ (คลิกซ้าย หรือกดปุ่ม)"
            >
              <div
                className={`relative w-9 h-9 sm:w-[3.55rem] sm:h-[3.55rem] flex flex-col items-center justify-center transition-all ${referenceDungeonHud ? 'rounded-full border-2 border-[#f4eee4] bg-black/50 shadow-[0_0_12px_rgba(255,244,220,.28)]' : 'rounded-lg bg-zinc-900 border-2'} ${
                  comboStep > 0
                    ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/30 bg-amber-950/30'
                    : 'border-zinc-700 hover:border-amber-400'
                }`}
              >
                <span className={referenceDungeonHud ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'}>
                  {activeHeroId === 'ginzo' ? '🗡️' : activeHeroId === 'katherine' ? '🔮' : '🥊'}
                </span>
                {!referenceDungeonHud && <span className="text-[7px] sm:text-[9px] font-pixel text-amber-300 font-bold mt-0.5">
                  {comboStep > 0 ? `COMBO ${comboStep}` : 'ATTACK'}
                </span>}
                {!referenceDungeonHud && <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-zinc-950 font-pixel text-[7px] sm:text-[8px] px-1 py-0.2 rounded font-bold shadow">
                  LMB
                </div>}
              </div>
              <span className={`font-pixel font-bold ${referenceDungeonHud ? 'mt-1 border border-zinc-200 bg-zinc-950 px-1.5 py-0.5 text-[8px] text-white' : 'text-[8px] sm:text-[10px] font-rajdhani text-zinc-400 mt-0.5'}`}>
                {referenceDungeonHud ? 'LMB' : activeHeroId === 'ginzo' ? 'ฟันคอมโบ' : activeHeroId === 'katherine' ? 'ยิงเวท' : 'หมัดคอมโบ'}
              </span>
            </button>

            {/* Active Skills Slots 1, 2, 3 */}
            {(activeHeroId === 'ginzo' && isGinzoEvolved ? GINZO_AWAKENED_SKILLS : HERO_SKILLS[activeHeroId])?.map((skill) => {
              const cd = skillCooldowns?.[skill.slot as (1 | 2 | 3)] ?? 0;
              const isOnCd = cd > 0;
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => onSkill?.(skill.slot as (1 | 2 | 3))}
                  disabled={isOnCd}
                  className="flex flex-col items-center group cursor-pointer active:scale-90 transition-transform disabled:opacity-60"
                  title={`${skill.name} (${skill.nameTh}) [กดเลข ${skill.slot}]`}
                >
                  <div
                    className={`relative w-9 h-9 sm:w-[3.55rem] sm:h-[3.55rem] flex flex-col items-center justify-center overflow-hidden transition-all ${
                      referenceDungeonHud
                        ? 'rounded-full border-2 border-[#f4eee4] bg-black/50 shadow-[0_0_12px_rgba(255,244,220,.28)]'
                        : 'rounded-lg bg-zinc-900 border-2 border-zinc-700 hover:border-amber-400'
                    }`}
                  >
                    <span className={referenceDungeonHud ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'}>
                      <ItemIcon itemId={skill.id} rarity="epic" color={skill.color} size={32} kind="skill" />
                    </span>
                    {!referenceDungeonHud && (
                      <span className="text-[6.5px] sm:text-[8px] font-pixel text-zinc-300 font-bold mt-0.5 line-clamp-1 px-0.5 text-center">
                        {skill.nameTh.length > 7 ? skill.nameTh.slice(0, 6) + '…' : skill.nameTh}
                      </span>
                    )}
                    {isOnCd && (
                      <div
                        className="absolute inset-0 bg-zinc-950/85 flex items-center justify-center text-[10px] sm:text-xs font-pixel text-amber-300 font-bold"
                        style={{
                          clipPath: `polygon(0 0, 100% 0, 100% ${100 - (cd / skill.cooldown) * 100}%, 0 ${100 - (cd / skill.cooldown) * 100}%)`,
                        }}
                      >
                        {cd.toFixed(1)}
                      </div>
                    )}
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-zinc-950 font-pixel text-[7px] sm:text-[8px] px-1 py-0.2 rounded font-bold shadow">
                      {skill.slot}
                    </div>
                  </div>
                  <span className={`font-pixel font-bold ${referenceDungeonHud ? 'mt-1 border border-zinc-200 bg-zinc-950 px-1 py-0.5 text-[7px] text-white' : 'text-[8px] sm:text-[9.5px] font-rajdhani text-zinc-300 mt-0.5 line-clamp-1'}`}>
                    {referenceDungeonHud ? `[${skill.slot}]` : skill.nameTh.slice(0, 5)}
                  </span>
                </button>
              );
            })}

            {/* Dash / Dodge (Space / RMB / Tap) */}
            <button
              type="button"
              onClick={onDash}
              disabled={dashCooldown > 0}
              className={`flex flex-col items-center group cursor-pointer active:scale-90 transition-transform disabled:opacity-60 ${referenceDungeonHud && !forceTouchControls ? 'hidden' : ''}`}
              title="แดชหลบหลีก (Space bar หรือคลิก)"
            >
              <div className={`relative w-9 h-9 sm:w-[3.55rem] sm:h-[3.55rem] flex flex-col items-center justify-center overflow-hidden ${referenceDungeonHud ? 'rounded-full border-2 border-[#f4eee4] bg-black/50 shadow-[0_0_12px_rgba(255,244,220,.28)]' : 'rounded-lg bg-zinc-900 border-2 border-zinc-700 hover:border-sky-400'}`}>
                <span className={referenceDungeonHud ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'}>💨</span>
                {!referenceDungeonHud && <span className="text-[7px] sm:text-[9px] font-pixel text-sky-300 font-bold mt-0.5">DODGE</span>}
                {dashCooldown > 0 && (
                  <div
                    className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center text-xs font-pixel text-sky-400 font-bold"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% ${100 - (dashCooldown / dashMaxCooldown) * 100}%, 0 ${100 - (dashCooldown / dashMaxCooldown) * 100}%)`,
                    }}
                  >
                    {dashCooldown.toFixed(1)}
                  </div>
                )}
                {!referenceDungeonHud && <div className="absolute -top-1.5 -right-1.5 bg-sky-500 text-zinc-950 font-pixel text-[7px] sm:text-[8px] px-1 py-0.2 rounded font-bold shadow">
                  SPACE
                </div>}
              </div>
              <span className={`font-pixel font-bold ${referenceDungeonHud ? 'mt-1 border border-zinc-200 bg-zinc-950 px-1.5 py-0.5 text-[7px] text-white' : 'text-[8px] sm:text-[10px] font-rajdhani text-zinc-400 mt-0.5'}`}>
                {referenceDungeonHud ? 'SPACE' : 'หลบหลีก'}
              </span>
            </button>

          </div>
        </div>

        {/* Touch-only contextual E action floats above the compact controls. */}
        {forceTouchControls && (nearbyInteractable || nearbyDungeonInteractable) && (
          <button
            type="button"
            onClick={() => {
              if (nearbyInteractable === 'trainer') onOpenTrainer();
              else if (nearbyInteractable === 'gate') onOpenGate();
              else onInteract?.();
            }}
            className="pointer-events-auto absolute right-1 bottom-full mb-2 px-3 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-pixel text-[10px] sm:text-xs rounded-xl font-bold shadow-xl border-2 border-yellow-200 active:scale-95 transition-transform animate-pulse cursor-pointer"
          >
            {nearbyDungeonInteractable === 'happy_merchant'
              ? '💬 คุย [E]'
              : nearbyDungeonInteractable === 'boss_altar'
              ? '🗿 ปลุกบอส [E]'
              : nearbyDungeonInteractable === 'shop_item'
              ? '🔎 ดูของ [E]'
              : nearbyDungeonInteractable?.startsWith('door_')
              ? '🚪 เข้า [E]'
              : '✨ ใช้ [E]'}
          </button>
        )}
        {!forceTouchControls && nearbyDungeonInteractable === 'boss_altar' && (
          <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-cyan-300/70 bg-zinc-950/90 px-4 py-2 font-pixel text-sm text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,.32)]">
            กด E เพื่อปลุกบอส
          </div>
        )}
      </div>
    </div>
  );
};
