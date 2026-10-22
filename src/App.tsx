/**
 * Mirage Legends - Otherworld Legends Inspired 2.5D Action RPG
 * Features:
 * - Direct Start into Lobby (The Mirage Lounge)
 * - Equipment and stat upgrades only
 * - Hero Shrine NPC to select/unlock characters (Ginzo with red robe & katana slashes or Quan Huying)
 * - Dungeon Gate to select Map (Arabian Mirage Palace from screenshot, Bamboo Courtyard, Boss Altar)
 * - Comic Starburst Damage Numbers & Target Brackets [ ] exactly matching user screenshot!
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ArenaScene } from './three/arenaScene';
import { CombatEngine } from './game/combatEngine';
import { soundEngine } from './audio/soundEngine';
import {
  GameMode,
  HeroId,
  DungeonMapId,
  PlayerStats,
  SkillInfo,
  RelicItem,
  DifficultyMode,
  DungeonRoomId,
  DungeonInteractableType,
  StatUpgradeType,
} from './types/game';
import { DUNGEON_MAPS, HERO_CONFIGS } from './data/gameData';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { ControlsGuideModal } from './components/ControlsGuideModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { PauseModal } from './components/PauseModal';
import { HeroSelectModal } from './components/HeroSelectModal';
import { DungeonSelectModal } from './components/DungeonSelectModal';
import { RelicRewardModal } from './components/RelicRewardModal';
import { StatUpgradeModal } from './components/StatUpgradeModal';
import { InventoryModal } from './components/InventoryModal';
import { EquipmentShopModal } from './components/EquipmentShopModal';
import { EquipmentItem } from './types/game';
import { HappyDialogueModal } from './components/HappyDialogueModal';
import { ForgeModal } from './components/ForgeModal';
import { ChestRewardModal } from './components/ChestRewardModal';
import { levelSystem, ShopOfferItem } from './game/levelSystem';
import { EquipmentPurchaseModal } from './components/EquipmentPurchaseModal';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const damageCanvasRef = useRef<HTMLCanvasElement>(null);

  // Engine references
  const arenaRef = useRef<ArenaScene | null>(null);
  const engineRef = useRef<CombatEngine | null>(null);
  const animFrameId = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const lastGameUpdateRef = useRef<number>(performance.now());
  const frameAccumulatorRef = useRef(0);
  const overlayVectorRef = useRef<THREE.Vector3 | null>(null);
  const keysHeld = useRef<Record<string, boolean>>({});
  const joystickMoveRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  // Game Mode: 'title' | 'lobby' | 'playing' | 'paused' | 'gameover' | 'victory'
  const [gameMode, setGameMode] = useState<GameMode>('title');
  const gameModeRef = useRef<GameMode>('title');
  gameModeRef.current = gameMode;

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Lobby & Dungeon Modals
  const [isHeroModalOpen, setIsHeroModalOpen] = useState<boolean>(false);
  const [isDungeonModalOpen, setIsDungeonModalOpen] = useState<boolean>(false);
  const [isRelicModalOpen, setIsRelicModalOpen] = useState<boolean>(false);
  const [isStatUpgradeOpen, setIsStatUpgradeOpen] = useState<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isEquipmentShopOpen, setIsEquipmentShopOpen] = useState<boolean>(false);
  const [isHappyDialogueOpen, setIsHappyDialogueOpen] = useState<boolean>(false);
  const [isForgeOpen, setIsForgeOpen] = useState<boolean>(false);
  const [isChestRewardOpen, setIsChestRewardOpen] = useState<boolean>(false);
  const [pendingShopPurchase, setPendingShopPurchase] = useState<{ offer: ShopOfferItem; index: number } | null>(null);
  const [levelTick, setLevelTick] = useState<number>(0);
  const [relicChoices, setRelicChoices] = useState<RelicItem[]>([]);

  // Difficulty & Multi-Room state
  const [difficulty, setDifficulty] = useState<DifficultyMode>('normal');
  const [currentRoom, setCurrentRoom] = useState<DungeonRoomId>('center');
  const [nearbyDungeonInteractable, setNearbyDungeonInteractable] = useState<DungeonInteractableType | null>(null);
  const [statUpgradeCounts, setStatUpgradeCounts] = useState<Record<StatUpgradeType, number>>({
    hp: 0,
    shield: 0,
    attack: 0,
    attackSpeed: 0,
    moveSpeed: 0,
    crit: 0,
  });

  // Reactive state mirrored from combat engine
  const [activeHeroId, setActiveHeroId] = useState<HeroId>('ginzo');
  const [relics, setRelics] = useState<RelicItem[]>([]);
  const [bossInfo, setBossInfo] = useState<{ name: string; hp: number; maxHp: number; action?: string } | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    heroId: 'ginzo',
    maxHp: 100,
    hp: 100,
    maxShield: 45,
    shield: 45,
    attackPower: 16,
    defense: 5,
    attackSpeed: 1.3,
    moveSpeed: 8.2,
    critChance: 0.25,
    critMultiplier: 1.8,
    damageReduction: 0,
    dodgeChance: 0,
    hpRegen: 0,
    lifesteal: 0,
    cooldownReduction: 0,
    coinGain: 0,
    chestLuck: 0,
    gold: 150,
    kills: 0,
    comboCount: 0,
    comboTimer: 0,
    equippedWeaponId: 'training_katana',
    equippedItems: [],
    inventory: [],
  });

  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [dashCooldown, setDashCooldown] = useState<number>(0);
  const [comboStep, setComboStep] = useState<number>(0);
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [currentDungeonMap, setCurrentDungeonMap] = useState<DungeonMapId>('desert');
  const [nearbyInteractable, setNearbyInteractable] = useState<'trainer' | 'gate' | null>(null);
  const [oneHitMode, setOneHitMode] = useState(false);

  // ----------------------------------------------------------------------
  // RENDER COMIC STARBURST DAMAGE NUMBERS & TARGET LOCK BRACKETS [ ]
  // (Directly matching the user's uploaded gameplay screenshot!)
  // ----------------------------------------------------------------------
  const renderOverlayVfx = (arena: ArenaScene, engine: CombatEngine) => {
    const canvas = damageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;
    const _v = overlayVectorRef.current ?? (overlayVectorRef.current = new THREE.Vector3());

    // 1. Target Lock-On Yellow Brackets [ ] on closest targeted enemy
    if (engine.currentMode === 'dungeon' && engine.lockedTarget && engine.lockedTarget.state !== 'dead') {
      const target = engine.lockedTarget;
      _v.set(target.x, 1.1, target.z);
      _v.project(arena.camera);

      if (_v.z < 1.0) {
        const sx = (_v.x * halfW) + halfW;
        const sy = (-(_v.y * halfH)) + halfH;
        const boxSize = 34;

        ctx.save();
        ctx.strokeStyle = '#facc15'; // Vibrant Yellow
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;

        // Top-left corner [
        ctx.beginPath();
        ctx.moveTo(sx - boxSize, sy - boxSize + 10);
        ctx.lineTo(sx - boxSize, sy - boxSize);
        ctx.lineTo(sx - boxSize + 10, sy - boxSize);
        ctx.stroke();

        // Top-right corner ]
        ctx.beginPath();
        ctx.moveTo(sx + boxSize - 10, sy - boxSize);
        ctx.lineTo(sx + boxSize, sy - boxSize);
        ctx.lineTo(sx + boxSize, sy - boxSize + 10);
        ctx.stroke();

        // Bottom-left corner [
        ctx.beginPath();
        ctx.moveTo(sx - boxSize, sy + boxSize - 10);
        ctx.lineTo(sx - boxSize, sy + boxSize);
        ctx.lineTo(sx - boxSize + 10, sy + boxSize);
        ctx.stroke();

        // Bottom-right corner ]
        ctx.beginPath();
        ctx.moveTo(sx + boxSize - 10, sy + boxSize);
        ctx.lineTo(sx + boxSize, sy + boxSize);
        ctx.lineTo(sx + boxSize, sy + boxSize - 10);
        ctx.stroke();

        ctx.restore();
      }
    }

    // 2. Comic Starburst Damage Numbers (Matches red explosion badge '18' in screenshot!)
    if (engine.damageNumbers.length > 0) {
      for (const d of engine.damageNumbers) {
        _v.set(d.x, d.y, d.z);
        _v.project(arena.camera);

        if (_v.z < 1.0) {
          const sx = (_v.x * halfW) + halfW;
          const sy = (-(_v.y * halfH)) + halfH;
          const alpha = Math.max(0, d.life / d.maxLife);

          ctx.save();
          ctx.globalAlpha = alpha;

          // Draw Jagged Red Comic Starburst Background for Crits
          if (d.isCrit) {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.fillStyle = '#dc2626'; // Red comic burst
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const points = 12;
            const outerR = 26;
            const innerR = 14;
            for (let i = 0; i < points * 2; i++) {
              const r = i % 2 === 0 ? outerR : innerR;
              const angle = (i * Math.PI) / points;
              const px = Math.cos(angle) * r;
              const py = Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // Damage Text
          ctx.font = d.isCrit
            ? "900 20px 'Press Start 2P', monospace"
            : "700 13px 'Press Start 2P', monospace";
          ctx.fillStyle = d.isCrit ? '#fef08a' : d.color;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeText(d.text, sx, sy);
          ctx.fillText(d.text, sx, sy);

          ctx.restore();
        }
      }
    }

    // 3. Floating Overhead NPC / Door Speech Bubble (Right over NPC's head)
    let promptTarget: { x: number; y: number; z: number; title: string; action: string; color: string } | null = null;

    if (engine.currentMode === 'lobby' && engine.nearbyInteractable) {
      if (engine.nearbyInteractable === 'trainer') {
        promptTarget = { x: 8, y: 2.5, z: -4, title: 'ครูฝึกฉางอี้', action: '[E] เลือกตัวละคร', color: '#38bdf8' };
      } else if (engine.nearbyInteractable === 'gate') {
        promptTarget = { x: 0, y: 2.6, z: -6.5, title: 'ประตูดันเจี้ยน', action: '[E] เลือกด่าน / ผจญภัย', color: '#10b981' };
      }
    } else if (engine.currentMode === 'dungeon' && engine.nearbyDungeonInteractable) {
      const type = engine.nearbyDungeonInteractable;
      if (type === 'door_north') {
        const lbl = engine.getDoorLabels().north.label;
        promptTarget = { x: 0, y: 2.4, z: arena.bounds.minZ + 0.5, title: lbl, action: '[E] เดินผ่านประตู', color: '#38bdf8' };
      } else if (type === 'door_west') {
        const lbl = engine.getDoorLabels().west.label;
        promptTarget = { x: arena.bounds.minX + 0.5, y: 2.4, z: 0, title: lbl, action: '[E] เดินผ่านประตู', color: '#38bdf8' };
      } else if (type === 'door_east') {
        const lbl = engine.getDoorLabels().east.label;
        promptTarget = { x: arena.bounds.maxX - 0.5, y: 2.4, z: 0, title: lbl, action: '[E] เดินผ่านประตู', color: '#38bdf8' };
      } else if (type === 'door_south') {
        const lbl = engine.getDoorLabels().south.label;
        promptTarget = { x: 0, y: 2.4, z: arena.bounds.maxZ - 0.5, title: lbl, action: '[E] เดินผ่านประตู', color: '#38bdf8' };
      } else if (type === 'portal') {
        promptTarget = { x: 0, y: 4.8, z: -2.8, title: 'ประตูทางออก', action: '[E] ไปด่านถัดไป', color: '#10b981' };
      } else if (type === 'happy_merchant') {
        promptTarget = { x: 0, y: 2.3, z: -5.4, title: 'แฮปปี้ · แม่ค้าจิ๋ว', action: '[E] คุยกับแฮปปี้', color: '#f472b6' };
      } else if (type === 'shop_item') {
        const itemIndex = engine.nearbyShopItemIndex ?? 1;
        const itemX = [-7, 0, 7][itemIndex] ?? 0;
        const offer = levelSystem.run ? levelSystem.getShopOffersForRoom(levelSystem.run.stage.currentRoomIndex)[itemIndex] : null;
        promptTarget = { x: itemX, y: 2.1, z: -0.2, title: offer?.nameTh ?? 'อุปกรณ์เพิ่มสถานะ', action: offer ? `[E] ดูรายละเอียด · ${offer.cost} G` : '[E] ดูรายละเอียดอุปกรณ์', color: '#f9a8d4' };
      } else if (type === 'chest') {
        promptTarget = { x: 0, y: 2.5, z: -1.5, title: 'หีบสมบัติ', action: '[E] เปิดหีบและรับอุปกรณ์', color: '#fbbf24' };
      } else if (type === 'forge') {
        promptTarget = { x: 0, y: 2.5, z: -1.5, title: 'แท่นเสริมสถานะ', action: '[E] เพิ่มค่าสถานะ', color: '#f97316' };
      } else if (type === 'equipment_merchant') {
        promptTarget = { x: 0, y: 2.5, z: -1, title: 'คลังอุปกรณ์ & บัฟ', action: '[E] เลือกอุปกรณ์เพิ่มสถานะ', color: '#10b981' };
      } else if (type === 'stat_device') {
        promptTarget = { x: 0, y: 2.5, z: -1, title: 'แท่นอัปเกรดสถานะ', action: '[E] อัปเกรดพลัง', color: '#a855f7' };
      } else if (type === 'healing_pool') {
        promptTarget = { x: 0, y: 2.0, z: 0, title: 'บ่อน้ำโอสถทิพย์', action: '[E] ฟื้นฟูเลือดและเกราะ', color: '#06b6d4' };
      }
    }

    if (promptTarget) {
      const bob = Math.sin(performance.now() * 0.006) * 0.12;
      _v.set(promptTarget.x, promptTarget.y + bob, promptTarget.z);
      _v.project(arena.camera);

      if (_v.z < 1.0) {
        const sx = (_v.x * halfW) + halfW;
        const sy = (-(_v.y * halfH)) + halfH;

        ctx.save();
        const text1 = promptTarget.title;
        const text2 = promptTarget.action;
        ctx.font = "bold 13px 'Rajdhani', sans-serif";
        const w1 = ctx.measureText(text1).width;
        ctx.font = "bold 10px 'Press Start 2P', monospace";
        const w2 = ctx.measureText(text2).width;
        const bubbleW = Math.max(w1, w2) + 26;
        const bubbleH = 46;

        const bx = sx - bubbleW / 2;
        const by = sy - bubbleH - 12;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(9, 9, 11, 0.94)';
        ctx.strokeStyle = promptTarget.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, bubbleW, bubbleH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sx - 7, by + bubbleH);
        ctx.lineTo(sx, by + bubbleH + 8);
        ctx.lineTo(sx + 7, by + bubbleH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        ctx.fillStyle = promptTarget.color;
        ctx.font = "bold 12px 'Rajdhani', sans-serif";
        ctx.fillText(text1, sx, by + 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 9px 'Press Start 2P', monospace";
        ctx.fillText(text2, sx, by + 34);

        ctx.restore();
      }
    }
  };

  // ----------------------------------------------------------------------
  // INITIALIZATION ONCE ON MOUNT
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!mountRef.current) return;

    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const arena = new ArenaScene(mountRef.current);
    const engine = new CombatEngine(arena);

    arenaRef.current = arena;
    engineRef.current = engine;

    // Sync state
    setActiveHeroId(engine.activeHeroId);
    setPlayerStats({ ...engine.playerStats });
    setSkills([...engine.skills]);
    setCurrentDungeonMap(engine.currentDungeonMap);

    // Engine callbacks
    let hudThrottle = 0;
    engine.onStateChange = () => {
      const now = performance.now();
      if (now - hudThrottle > 40) {
        hudThrottle = now;
        setActiveHeroId(engine.activeHeroId);
        setRelics([...engine.relics]);
        setPlayerStats({ ...engine.playerStats });
        setSkills([...engine.skills]);
        setDashCooldown(engine.dashCooldown);
        setComboStep(engine.comboStep);
        setCurrentWave(engine.currentWave);
        setCurrentDungeonMap(engine.currentDungeonMap);
        setNearbyInteractable(engine.nearbyInteractable);
        setNearbyDungeonInteractable(engine.nearbyDungeonInteractable);
        setCurrentRoom(engine.currentRoom);
        setDifficulty(engine.difficulty);
        setStatUpgradeCounts({ ...engine.statUpgradeCounts });
        setLevelTick((t) => t + 1);

        if (engine.currentBoss && engine.currentBoss.state !== 'dead') {
          const bossName = engine.currentBoss.bossName || 'Boss';
          setBossInfo({
            name: bossName,
            hp: engine.currentBoss.hp,
            maxHp: engine.currentBoss.maxHp,
          action: engine.currentBoss.bossActionName,
          });
        } else {
          setBossInfo(null);
        }
      }
    };

    engine.onGameOver = (won: boolean) => {
      setGameMode(won ? 'victory' : 'gameover');
      gameModeRef.current = won ? 'victory' : 'gameover';
    };

    engine.onOpenModal = (modal) => {
      if (modal === 'gate') setIsDungeonModalOpen(true);
      if (modal === 'trainer') setIsHeroModalOpen(true);
      if (modal === 'stat_device') setIsStatUpgradeOpen(true);
      if (modal === 'equipment_shop') setIsEquipmentShopOpen(true);
      if (modal === 'inventory') setIsInventoryOpen(true);
      if (modal === 'happy_dialogue') setIsHappyDialogueOpen(true);
      if (modal === 'shop_item_detail' && engine.nearbyShopItemIndex !== null && levelSystem.run) {
        const index = engine.nearbyShopItemIndex;
        const offer = levelSystem.getShopOffersForRoom(levelSystem.run.stage.currentRoomIndex)[index];
        if (offer && !offer.purchased) {
          setPendingShopPurchase({ offer, index });
        }
      }
      if (modal === 'forge') setIsForgeOpen(true);
      if (modal === 'chest_reward') setIsChestRewardOpen(true);
      if (modal === 'relic_choice') {
        setRelicChoices([...engine.relicChoices]);
        setIsRelicModalOpen(true);
      }
    };

    // ------------------------------------------------------------------
    // 60FPS GAME LOOP
    // ------------------------------------------------------------------
    lastTimeRef.current = performance.now();
    lastGameUpdateRef.current = lastTimeRef.current;
    frameAccumulatorRef.current = 0;
    const tick = (currentTime: number) => {
      const elapsed = Math.max(0, currentTime - lastTimeRef.current);
      lastTimeRef.current = currentTime;
      frameAccumulatorRef.current += elapsed;
      if (frameAccumulatorRef.current < 1000 / 60 - 0.5) {
        animFrameId.current = requestAnimationFrame(tick);
        return;
      }
      const rawDt = (currentTime - lastGameUpdateRef.current) / 1000;
      lastGameUpdateRef.current = currentTime;
      frameAccumulatorRef.current %= 1000 / 60;
      const dt = Math.min(rawDt, 0.05);

      const currentMode = gameModeRef.current;

      if (currentMode === 'title') {
        // High overhead lounge view for Title Screen
        arena.camera.position.x = Math.sin(currentTime * 0.0004) * 5;
        arena.camera.position.y = 15.5;
        arena.camera.position.z = 14.5;
        arena.camera.lookAt(arena.camera.position.x * 0.5, 0.5, 0);
        arena.renderer.render(arena.scene, arena.camera);
      } else if (currentMode === 'lobby' || currentMode === 'playing') {
        // Continuous input (Keyboard WASD or Mobile Virtual Joystick)
        let mx = 0;
        let mz = 0;
        if (keysHeld.current['KeyW'] || keysHeld.current['ArrowUp']) mz -= 1;
        if (keysHeld.current['KeyS'] || keysHeld.current['ArrowDown']) mz += 1;
        if (keysHeld.current['KeyA'] || keysHeld.current['ArrowLeft']) mx -= 1;
        if (keysHeld.current['KeyD'] || keysHeld.current['ArrowRight']) mx += 1;

        // If no keyboard input, apply mobile virtual joystick
        if (mx === 0 && mz === 0) {
          mx = joystickMoveRef.current.x;
          mz = joystickMoveRef.current.z;
        }

        engine.update(dt, mx, mz);
        arena.update(dt, engine.playerX, engine.playerZ);
        renderOverlayVfx(arena, engine);
      } else {
        arena.renderer.render(arena.scene, arena.camera);
      }

      animFrameId.current = requestAnimationFrame(tick);
    };

    animFrameId.current = requestAnimationFrame(tick);

    // ------------------------------------------------------------------
    // KEYBOARD & MOUSE EVENT LISTENERS
    // ------------------------------------------------------------------
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) {
        keysHeld.current[e.code] = false;
        return;
      }
      keysHeld.current[e.code] = true;

      // Escape / P for Pause
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (isInventoryOpen || isEquipmentShopOpen || isHeroModalOpen || isDungeonModalOpen || isRelicModalOpen || isStatUpgradeOpen || isGuideOpen) {
          setIsInventoryOpen(false);
          setIsEquipmentShopOpen(false);
          setIsHeroModalOpen(false);
          setIsDungeonModalOpen(false);
          setIsRelicModalOpen(false);
          setIsStatUpgradeOpen(false);
          setIsGuideOpen(false);
          return;
        }

        if (gameModeRef.current === 'playing' || gameModeRef.current === 'lobby') {
          setGameMode('paused');
          gameModeRef.current = 'paused';
        } else if (gameModeRef.current === 'paused') {
          const target = engine.currentMode === 'lobby' ? 'lobby' : 'playing';
          setGameMode(target);
          gameModeRef.current = target;
        }
      }

      // Toggle inventory with B or I
      if (e.code === 'KeyB' || e.code === 'KeyI') {
        setIsInventoryOpen((prev) => !prev);
      }

      // E to interact with nearby NPC or Gate
      if (e.code === 'KeyE') {
        engine.triggerInteraction();
      }

      // Combat actions (only when active)
      if (gameModeRef.current === 'playing' || gameModeRef.current === 'lobby') {
        if (e.code === 'Digit1' || e.code === 'KeyQ') engine.handleSkill1();
        if (e.code === 'Digit2' || e.code === 'KeyF' || e.code === 'KeyZ') engine.handleSkill2();
        if (e.code === 'Digit3' || e.code === 'KeyR' || e.code === 'KeyX') engine.handleSkill3();
        if (e.code === 'Space') engine.handleDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      engine.handleMouseMove(mouseX, mouseY, rect.width, rect.height);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameModeRef.current !== 'playing' && gameModeRef.current !== 'lobby') return;
      if (e.target !== arena.renderer.domElement) return;
      if (e.button === 0) {
        engine.handleAttack();
      } else if (e.button === 2) {
        e.preventDefault();
        engine.handleDash();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      arena.handleResize(w, h);
      if (damageCanvasRef.current) {
        damageCanvasRef.current.width = arena.renderer.domElement.width;
        damageCanvasRef.current.height = arena.renderer.domElement.height;
        damageCanvasRef.current.style.imageRendering = 'pixelated';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    handleResize();

    const handleBlur = () => {
      keysHeld.current = {};
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleBlur);
      arena.dispose();
    };
  }, []);

  // ----------------------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------------------
  // Start Game -> Directly into Lobby as requested!
  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.enterLobby();
      setGameMode('lobby');
      gameModeRef.current = 'lobby';
      soundEngine.playRoomClear();
    }
  }, []);

  // Select Relic from Room Clear Modal
  const handleSelectRelic = useCallback((relic: RelicItem) => {
    setIsRelicModalOpen(false);
    if (engineRef.current) {
      engineRef.current.addRelic(relic);
      setRelics([...engineRef.current.relics]);
    }
  }, []);

  // Start the 20-floor randomized test dungeon.
  const handleStartLevelRun = useCallback((diff: DifficultyMode = 'normal') => {
    setIsDungeonModalOpen(false);
    if (engineRef.current) {
      engineRef.current.startLevelRun(undefined, diff);
      setGameMode('playing');
      gameModeRef.current = 'playing';
      setLevelTick((t) => t + 1);
    }
  }, []);

  // Forge stat upgrades (In Stage X-2)
  const handleUpgradeForgeAttack = useCallback((cost: number) => {
    if (engineRef.current && engineRef.current.deductGold(cost)) {
      engineRef.current.playerStats.attackPower += 2;
      if (levelSystem.run) levelSystem.run.stage.forgeUsed = true;
      soundEngine.playBuy();
      setPlayerStats({ ...engineRef.current.playerStats });
      setLevelTick((t) => t + 1);
    }
  }, []);

  const handleUpgradeForgeArmor = useCallback((cost: number) => {
    if (engineRef.current && engineRef.current.deductGold(cost)) {
      engineRef.current.playerStats.maxShield += 15;
      engineRef.current.playerStats.shield += 15;
      engineRef.current.playerStats.defense += 2;
      if (levelSystem.run) levelSystem.run.stage.forgeUsed = true;
      soundEngine.playBuy();
      setPlayerStats({ ...engineRef.current.playerStats });
      setLevelTick((t) => t + 1);
    }
  }, []);

  const handleReforgeRepair = useCallback((cost: number) => {
    if (engineRef.current && engineRef.current.deductGold(cost)) {
      engineRef.current.playerStats.hp = engineRef.current.playerStats.maxHp;
      engineRef.current.playerStats.shield = engineRef.current.playerStats.maxShield;
      if (levelSystem.run) levelSystem.run.stage.forgeUsed = true;
      soundEngine.playPotion();
      setPlayerStats({ ...engineRef.current.playerStats });
      setLevelTick((t) => t + 1);
    }
  }, []);

  // Return to Lobby from Dungeon (ค่าสถานะรีเซ็ตกลับเป็นค่าเริ่มต้นอัตโนมัติ)
  const handleReturnToLobby = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.enterLobby();
      setGameMode('lobby');
      gameModeRef.current = 'lobby';
      soundEngine.playRoomClear();
    }
  }, []);

  // Switch between 4 rooms (North, West, Center, East)
  const handleChangeRoom = useCallback((room: DungeonRoomId) => {
    if (engineRef.current) {
      engineRef.current.changeRoom(room);
      setCurrentRoom(room);
    }
  }, []);

  // Purchase Stat Upgrade at North Room device
  const handleBuyStatUpgrade = useCallback((type: StatUpgradeType): boolean => {
    if (engineRef.current) {
      return engineRef.current.buyStatUpgrade(type);
    }
    return false;
  }, []);

  // Switch Character in Hero Shrine
  const handleSelectHero = useCallback((heroId: HeroId) => {
    if (engineRef.current) {
      engineRef.current.setHero(heroId);
      setActiveHeroId(heroId);
      soundEngine.playCoin();
    }
  }, []);

  // Equip any stat item into one of the ten universal equipment slots
  const handleEquipGearItem = useCallback((item: EquipmentItem, replaceItemId?: string) => {
    if (engineRef.current) {
      engineRef.current.equipItem(item, replaceItemId);
      setPlayerStats({ ...engineRef.current.playerStats });
    }
  }, []);

  // Unequip one equipment instance
  const handleUnequipGearItem = useCallback((itemId: string) => {
    if (engineRef.current) {
      engineRef.current.unequipItem(itemId);
      setPlayerStats({ ...engineRef.current.playerStats });
    }
  }, []);

  // Buy Equipment from Chamber merchant
  const handleBuyEquipment = useCallback((item: EquipmentItem) => {
    if (engineRef.current) {
      const success = engineRef.current.buyEquipment(item);
      if (success) {
        soundEngine.playBuy();
        setPlayerStats({ ...engineRef.current.playerStats });
      }
    }
  }, []);

  const handleConfirmShopPurchase = useCallback(() => {
    const pending = pendingShopPurchase;
    const engine = engineRef.current;
    if (!pending || !engine) return;
    if (engine.buyHappyShopItem(pending.index)) {
      setPlayerStats({ ...engine.playerStats });
      setPendingShopPurchase(null);
    }
  }, [pendingShopPurchase]);

  const handleReplaceEquipment = useCallback((item: EquipmentItem, replaceItemId: string) => {
    const engine = engineRef.current;
    if (!engine || !engine.equipItem(item, replaceItemId)) return;
    setPlayerStats({ ...engine.playerStats });
    setIsChestRewardOpen(false);
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const currentMapConfig = DUNGEON_MAPS.find((m) => m.id === currentDungeonMap);

  const handleRunCommand = useCallback((command: string) => {
    if (command.trim().replace(/\s+/g, '') !== '1คิว' || !engineRef.current) return false;
    engineRef.current.oneHitMode = true;
    setOneHitMode(true);
    return true;
  }, []);

  return (
    <div className="relative w-screen h-[100dvh] min-h-[100svh] overflow-hidden bg-zinc-950 font-rajdhani select-none">
      {/* Low-resolution WebGL scene with nearest-neighbor scaling for pixel-art rendering */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-0 pointer-events-auto cursor-crosshair w-full h-full touch-none"
      />

      {/* 2D Overlay Canvas: Comic Starburst Damage Numbers & Target Brackets [ ] */}
      <canvas
        ref={damageCanvasRef}
        className="absolute inset-0 z-[5] pointer-events-none w-full h-full"
      />

      {/* TITLE SCREEN */}
      {gameMode === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      )}

      {/* LOBBY / PLAYING HUD */}
      {(gameMode === 'lobby' || gameMode === 'playing') && (
        <HUD
          mode={gameMode === 'lobby' ? 'lobby' : 'dungeon'}
          stats={playerStats}
          activeHeroId={activeHeroId}
          skills={skills}
          relics={relics}
          dashCooldown={dashCooldown}
          dashMaxCooldown={1.0}
          comboStep={comboStep}
          currentWave={currentWave}
          maxWaves={currentMapConfig ? currentMapConfig.waves : 20}
          dungeonNameTh={currentMapConfig ? currentMapConfig.nameTh : 'Dungeon'}
          bossInfo={bossInfo}
          nearbyInteractable={nearbyInteractable}
          nearbyDungeonInteractable={nearbyDungeonInteractable}
          currentRoom={currentRoom}
          isLevelRun={engineRef.current?.isLevelRun ?? false}
          stageMap={levelSystem.run ? {
            stageNumber: levelSystem.run.stage.stageNumber,
            rooms: levelSystem.run.stage.roomGraph,
            currentRoomIndex: levelSystem.run.stage.currentRoomIndex,
            visitedRoomIndices: levelSystem.run.stage.visitedRoomIndices,
          } : undefined}
          difficulty={difficulty}
          onChangeRoom={handleChangeRoom}
          onInteractDungeon={() => engineRef.current?.triggerInteraction()}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenHelp={() => setIsGuideOpen(true)}
          onPause={() => {
            setGameMode('paused');
            gameModeRef.current = 'paused';
          }}
          onReturnToLobby={handleReturnToLobby}
          onOpenGate={() => setIsDungeonModalOpen(true)}
          onOpenTrainer={() => setIsHeroModalOpen(true)}
          onOpenStatUpgrade={() => setIsStatUpgradeOpen(true)}
          onOpenInventory={() => setIsInventoryOpen(true)}
          onAttack={() => engineRef.current?.handleAttack()}
          onDash={() => engineRef.current?.handleDash()}
          onSkill1={() => engineRef.current?.handleSkill1()}
          onSkill2={() => engineRef.current?.handleSkill2()}
          onSkill3={() => engineRef.current?.handleSkill3()}
          onInteract={() => engineRef.current?.triggerInteraction()}
          onRunCommand={handleRunCommand}
          oneHitMode={oneHitMode}
          onJoystickMove={(x, z) => {
            joystickMoveRef.current = { x, z };
          }}
          onJoystickAim={(angle) => {
            if (engineRef.current) {
              engineRef.current.playerAimAngle = angle;
              if (Math.cos(angle) > 0.1) engineRef.current.playerFacing = 1;
              else if (Math.cos(angle) < -0.1) engineRef.current.playerFacing = -1;
            }
          }}
        />
      )}

      {/* NORTH ROOM: STAT AMPLIFICATION DEVICE MODAL (อุปกรณ์เพิ่มสถานะ) */}
      <StatUpgradeModal
        isOpen={isStatUpgradeOpen}
        onClose={() => setIsStatUpgradeOpen(false)}
        stats={playerStats}
        gold={playerStats.gold}
        upgradeCounts={statUpgradeCounts}
        onBuyUpgrade={handleBuyStatUpgrade}
      />

      {/* ROGUELIKE RELIC SELECTION MODAL */}
      <RelicRewardModal
        isOpen={isRelicModalOpen}
        relics={relicChoices}
        onSelectRelic={handleSelectRelic}
      />

      {/* LOBBY HERO SELECTION MODAL */}
      <HeroSelectModal
        isOpen={isHeroModalOpen}
        onClose={() => setIsHeroModalOpen(false)}
        gold={playerStats.gold}
        heroes={Object.values(HERO_CONFIGS)}
        activeHeroId={activeHeroId}
        onSelectHero={handleSelectHero}
        onUnlockHero={() => {}}
      />

      {/* LOBBY DUNGEON MAP SELECTION MODAL WITH DIFFICULTY MODES */}
      <DungeonSelectModal
        isOpen={isDungeonModalOpen}
        onClose={() => setIsDungeonModalOpen(false)}
        currentDifficulty={difficulty}
        onSelectDifficulty={(diff) => {
          setDifficulty(diff);
          engineRef.current?.setDifficulty(diff);
        }}
        onStartLevelRun={handleStartLevelRun}
      />

      {/* PAUSE MODAL */}
      <PauseModal
        isOpen={gameMode === 'paused'}
        onResume={() => {
          const target = engineRef.current?.currentMode === 'lobby' ? 'lobby' : 'playing';
          setGameMode(target);
          gameModeRef.current = target;
        }}
        onRestart={handleReturnToLobby}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* CONTROLS GUIDE MODAL */}
      <ControlsGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* GAME OVER MODAL */}
      {gameMode === 'gameover' && (
        <GameOverModal
          stats={playerStats}
          currentWave={currentWave}
          onRestart={handleReturnToLobby}
        />
      )}

      {/* VICTORY MODAL */}
      {gameMode === 'victory' && (
        <VictoryModal
          stats={playerStats}
          relics={relics}
          onRestart={handleReturnToLobby}
        />
      )}

      {/* INVENTORY & GEAR MODAL */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        stats={playerStats}
        equippedItems={playerStats.equippedItems}
        inventory={playerStats.inventory}
        onEquipItem={handleEquipGearItem}
        onUnequipItem={handleUnequipGearItem}
      />

      {/* EQUIPMENT & BUFF SHOP MODAL (DUNGEON CHAMBER) */}
      <EquipmentShopModal
        isOpen={isEquipmentShopOpen}
        onClose={() => setIsEquipmentShopOpen(false)}
        gold={playerStats.gold}
        inventory={playerStats.inventory}
        equippedItems={playerStats.equippedItems}
        onBuyEquipment={handleBuyEquipment}
      />

      <HappyDialogueModal
        isOpen={isHappyDialogueOpen}
        onClose={() => setIsHappyDialogueOpen(false)}
        onChooseFrog={() => {
          setIsHappyDialogueOpen(false);
          engineRef.current?.startHappyMerchantBoss();
        }}
      />

      <EquipmentPurchaseModal
        offer={pendingShopPurchase?.offer ?? null}
        gold={playerStats.gold}
        equippedItems={playerStats.equippedItems}
        onClose={() => setPendingShopPurchase(null)}
        onPurchase={handleConfirmShopPurchase}
      />

      {/* FORGE ROOM MODAL (In Stage X-2) */}
      {levelSystem.run && (
        <ForgeModal
          isOpen={isForgeOpen}
          onClose={() => setIsForgeOpen(false)}
          playerGold={playerStats.gold}
          onUpgradeAttack={handleUpgradeForgeAttack}
          onUpgradeArmor={handleUpgradeForgeArmor}
          onReforgeRepair={handleReforgeRepair}
          forgeUsed={levelSystem.run.stage.forgeUsed}
        />
      )}

      {/* CHEST REWARD MODAL (White, Blue, Gold, Themed Secret Boss) */}
      {levelSystem.run && engineRef.current?.lastOpenedChestReward && (
        <ChestRewardModal
          isOpen={isChestRewardOpen}
          onClose={() => setIsChestRewardOpen(false)}
          rarity={engineRef.current.lastOpenedChestReward.rarity}
          reward={engineRef.current.lastOpenedChestReward.reward}
          consecutiveNonGold={levelSystem.run.consecutiveNonGoldChests}
          equippedItems={playerStats.equippedItems}
          onReplaceEquipment={handleReplaceEquipment}
        />
      )}
    </div>
  );
}
