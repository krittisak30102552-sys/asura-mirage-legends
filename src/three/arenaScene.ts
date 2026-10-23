/**
 * 3D Environment Scene for Mirage Legends
 * Supports:
 * - LOBBY: High overhead isometric lounge angle (as before, seeing whole tavern/lounge)
 * - DUNGEON: Authentic 2.5D brawler angle, zoomed out slightly for enhanced battlefield visibility
 * - 3D Hovering NPC & Gate interaction badges
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DungeonMapId, DungeonRoomId, DungeonRoomType } from '../types/game';
import { generateHappyTexture, generateHitFlashTexture, generateShockwaveRingTexture, generateSparkTexture } from '../graphics/pixelSprites';
import { generateChestTexture, generateDistortedWallTexture } from '../graphics/biomeSprites';
import type { ShopOfferItem } from '../game/levelSystem';
import { drawItemIconCanvas } from '../graphics/itemIconCanvas';

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CombatParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  drag: number;
  life: number;
  maxLife: number;
  initialScale: number;
  shrink: boolean;
  spin: number;
}

export interface RoomDoorLabel {
  label: string;
  color: number;
  enabled?: boolean;
}

export type RoomDoorLabels = Partial<Record<'north' | 'east' | 'south' | 'west', RoomDoorLabel>>;

type GraphicsQuality = 'low' | 'balanced' | 'high';

export class ArenaScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public bounds: ArenaBounds = { minX: -14, maxX: 14, minZ: -7.5, maxZ: 6.5 };

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.HemisphereLight;
  private pointLights: THREE.PointLight[] = [];

  // Groups
  public actorsGroup: THREE.Group = new THREE.Group();
  public vfxGroup: THREE.Group = new THREE.Group();
  public breakablesGroup: THREE.Group = new THREE.Group();
  public telegraphGroup: THREE.Group = new THREE.Group();
  public staticDecorGroup: THREE.Group = new THREE.Group();
  public floorMesh: THREE.Mesh | null = null;
  public portalMesh: THREE.Group | null = null;
  public isPortalActive: boolean = false;
  private happyVendorGroup: THREE.Group | null = null;
  private happyShopItemGroups: Array<THREE.Group | null> = [];
  private bossAltarGroup: THREE.Group | null = null;

  // Ambient particles
  private petalParticles!: THREE.Points;
  private petalPositions!: Float32Array;

  // Active Combat Particles & Dynamic VFX
  public activeParticles: CombatParticle[] = [];
  private sparkTex: THREE.CanvasTexture | null = null;
  private hitFlashTex: THREE.CanvasTexture | null = null;
  private shockwaveRingTex: THREE.CanvasTexture | null = null;

  // Camera Shake & Following
  public cameraShake: number = 0;
  private targetCamX: number = 0;
  private targetCamZ: number = 0;
  private graphicsQuality: GraphicsQuality = 'balanced';
  private vfxFrameTasks = new Set<(now: number) => void>();
  private readonly vfxTaskScratch: Array<(now: number) => void> = [];
  private readonly particleQuadGeometry = new THREE.PlaneGeometry(1, 1);
  private disposed = false;

  // Current Scene Theme
  public currentTheme: 'lobby' | DungeonMapId = 'lobby';

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x061118);
    this.scene.fog = new THREE.FogExp2(0x061118, 0.016);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Default to Lobby overhead isometric camera
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);
    this.camera.position.set(0, 18, 18.5);
    this.camera.lookAt(0, 0.5, 0);

    const deviceMemory = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
      : 8;
    const logicalCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
    const touchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
    const isSmallScreen = width < 768 || (touchPoints > 0 && width < 900);
    const isLowPowerDevice = isSmallScreen || deviceMemory <= 4 || logicalCores <= 4;
    const isBalancedDevice = isLowPowerDevice || deviceMemory <= 8 || logicalCores <= 8 || window.devicePixelRatio > 1.75;
    this.graphicsQuality = isLowPowerDevice ? 'low' : isBalancedDevice ? 'balanced' : 'high';

    this.renderer = new THREE.WebGLRenderer({
      // Keep the 3D scene crisp while letting the sprite textures carry the pixel-art style.
      antialias: !isSmallScreen,
      powerPreference: 'high-performance',
    });
    const renderScale = this.graphicsQuality === 'high'
      ? Math.min(window.devicePixelRatio || 1, 1.5)
      : this.graphicsQuality === 'balanced'
        ? Math.min(window.devicePixelRatio || 1, 1.15)
        : 1;
    this.renderer.setPixelRatio(renderScale);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(this.renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.setupLighting();
    this.buildAmbientParticles();

    this.scene.add(this.staticDecorGroup);
    this.scene.add(this.actorsGroup);
    this.scene.add(this.vfxGroup);
    this.scene.add(this.breakablesGroup);
    this.scene.add(this.telegraphGroup);

    this.loadTheme('lobby');
  }

  private setupLighting() {
    this.keyLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
    this.keyLight.position.set(8, 18, 12);
    this.keyLight.castShadow = this.renderer.shadowMap.enabled;
    const shadowResolution = this.graphicsQuality === 'high' ? 1024 : 512;
    this.keyLight.shadow.mapSize.width = shadowResolution;
    this.keyLight.shadow.mapSize.height = shadowResolution;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 45;
    this.keyLight.shadow.camera.left = -20;
    this.keyLight.shadow.camera.right = 20;
    this.keyLight.shadow.camera.top = 20;
    this.keyLight.shadow.camera.bottom = -20;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.ambientLight = new THREE.HemisphereLight(0x38bdf8, 0x064e3b, 1.4);
    this.scene.add(this.ambientLight);
  }

  // ----------------------------------------------------------------------
  // PROCEDURAL TILE FLOORS
  // ----------------------------------------------------------------------
  private createPixelWoodFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    // Draw on a 256px grid, then keep the extra resolution for clean close views.
    ctx.scale(2, 2);

    ctx.fillStyle = '#211612';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const plankWidth = 128;
    const plankHeight = 32;
    const plankColors = ['#68402b', '#754a31', '#5e3828', '#805236'];
    for (let row = 0; row < canvas.height / plankHeight; row++) {
      const offset = row % 2 === 0 ? 0 : -64;
      for (let col = -1; col < 3; col++) {
        const x = col * plankWidth + offset;
        const y = row * plankHeight;
        const shadeIndex = (row * 3 + col * 5 + 40) % plankColors.length;
        ctx.fillStyle = '#2a1b16';
        ctx.fillRect(x, y, plankWidth, plankHeight);
        ctx.fillStyle = plankColors[shadeIndex];
        ctx.fillRect(x + 2, y + 2, plankWidth - 4, plankHeight - 4);
        ctx.fillStyle = 'rgba(244, 181, 119, 0.16)';
        ctx.fillRect(x + 5, y + 4, plankWidth - 10, 2);
        ctx.fillStyle = 'rgba(27, 14, 11, 0.42)';
        ctx.fillRect(x + 5, y + plankHeight - 5, plankWidth - 10, 2);
        ctx.fillStyle = 'rgba(37, 20, 14, 0.42)';
        ctx.fillRect(x + 23, y + 9, 36, 2);
        ctx.fillRect(x + 75, y + 20, 41, 2);
        ctx.fillStyle = '#39251b';
        ctx.fillRect(x + 63, y + 3, 3, 4);

        // Fine grain and small knots give each plank texture without muddying the floor.
        ctx.fillStyle = 'rgba(214, 153, 99, 0.18)';
        ctx.fillRect(x + 12, y + 11, 30 + ((row + col + 4) % 3) * 7, 1);
        ctx.fillRect(x + 48, y + 24, 19 + ((row * 2 + col + 8) % 4) * 6, 1);
        ctx.fillStyle = 'rgba(29, 15, 11, 0.2)';
        ctx.fillRect(x + 8, y + 17, 24 + ((row + col + 6) % 3) * 8, 1);
        ctx.fillRect(x + 82, y + 8, 18 + ((row * 3 + col + 12) % 3) * 7, 1);
        if ((row + col * 3) % 4 === 0) {
          ctx.fillStyle = 'rgba(41, 22, 16, 0.36)';
          ctx.fillRect(x + 96, y + 14, 5, 2);
          ctx.fillStyle = 'rgba(223, 164, 113, 0.16)';
          ctx.fillRect(x + 97, y + 15, 3, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 15);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapNearestFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  private createBambooStoneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1c192b';
    ctx.fillRect(0, 0, 512, 512);
    const tileSize = 64;
    for (let y = 0; y < 512; y += tileSize) {
      for (let x = 0; x < 512; x += tileSize) {
        const shade = Math.floor(25 + Math.random() * 18);
        ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 8})`;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 10);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createDungeonFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#17191e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tile = 64;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = col * tile;
        const y = row * tile;
        const shade = 36 + ((row * 11 + col * 7) % 13);
        const color = `rgb(${shade + 2}, ${shade}, ${shade + 3})`;
        ctx.fillStyle = '#0c0d11';
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
        ctx.fillStyle = color;
        ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
        ctx.fillStyle = 'rgba(178, 154, 125, 0.10)';
        ctx.fillRect(x + 4, y + 4, tile - 8, 3);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
        ctx.fillRect(x + 4, y + tile - 7, tile - 8, 3);

        // Small chipped corners and broken grout make the slabs read as old stone.
        ctx.fillStyle = '#17191e';
        if ((row + col) % 3 === 0) ctx.fillRect(x + 49, y + 4, 8, 4);
        if ((row * 2 + col) % 4 === 0) ctx.fillRect(x + 5, y + 50, 4, 8);
        if ((row + col * 3) % 7 === 0) {
          ctx.strokeStyle = 'rgba(8, 9, 12, 0.72)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 18, y + 16);
          ctx.lineTo(x + 26, y + 24);
          ctx.lineTo(x + 22, y + 33);
          ctx.lineTo(x + 32, y + 39);
          ctx.stroke();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.25, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    return texture;
  }

  private createDungeonWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#201d20';
    ctx.fillRect(0, 0, 256, 256);
    const brickH = 32;
    for (let row = 0; row < 8; row++) {
      const offset = row % 2 ? -32 : 0;
      for (let col = -1; col < 4; col++) {
        const x = col * 64 + offset;
        const y = row * brickH;
        const shade = 42 + ((row * 9 + col * 5 + 50) % 14);
        ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade + 1})`;
        ctx.fillRect(x + 2, y + 2, 60, 28);
        ctx.fillStyle = 'rgba(207, 171, 127, 0.08)';
        ctx.fillRect(x + 4, y + 4, 55, 3);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(x + 3, y + 27, 58, 3);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1.4);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    return texture;
  }

  // ----------------------------------------------------------------------
  // THEME SWITCHER
  // Current Scene Room
  public currentRoom: DungeonRoomId | DungeonRoomType | string = 'center';

  public loadTheme(
    theme: 'lobby' | DungeonMapId | string,
    room: DungeonRoomId | DungeonRoomType | string = 'center',
    doorLabels?: RoomDoorLabels
  ) {
    this.currentTheme = theme as any;
    this.currentRoom = room;
    this.staticDecorGroup.clear();
    this.portalMesh = null;
    this.isPortalActive = false;
    this.bossAltarGroup = null;
    this.pointLights.forEach((l) => this.scene.remove(l));
    this.pointLights = [];

    if (this.floorMesh) {
      this.scene.remove(this.floorMesh);
      this.floorMesh.geometry.dispose();
      (this.floorMesh.material as THREE.Material).dispose();
      this.floorMesh = null;
    }

    if (theme === 'lobby') {
      this.bounds = { minX: -14, maxX: 14, minZ: -7.5, maxZ: 6.5 };
      this.buildLobbyScene();
    } else {
      this.buildBiomeRoomScene(room, theme as any, doorLabels);
    }
  }

  public loadRoom(
    room: DungeonRoomId | DungeonRoomType | string,
    theme?: DungeonMapId | string,
    doorLabels?: RoomDoorLabels
  ) {
    const targetTheme = (theme || (this.currentTheme === 'lobby' ? 'desert' : this.currentTheme)) as any;
    this.loadTheme(targetTheme, room, doorLabels);
  }

  // ----------------------------------------------------------------------
  // LOBBY: restore the lounge scenery while keeping the shop removed.
  // ----------------------------------------------------------------------
  private buildLobbyScene() {
    this.scene.background = new THREE.Color(0x160d0b);
    this.scene.fog = new THREE.FogExp2(0x160d0b, 0.008);
    this.keyLight.color.setHex(0xffd3a3);
    this.keyLight.intensity = 2.0;
    this.ambientLight.color.setHex(0xffc68a);
    this.ambientLight.groundColor.setHex(0x34201c);
    this.ambientLight.intensity = 1.05;

    // Extend the timber floor past the walkable area so the camera never shows a hard map edge.
    const floorGeo = new THREE.PlaneGeometry(80, 60);
    const floorTex = this.createPixelWoodFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.96,
      metalness: 0,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    this.buildPalaceBackWall();
    this.buildPixelLobbyTable(6, 1);
    this.buildTrainerStation(8, -4);

    this.createInteractionPad(8, -4, 0x38bdf8, 1.8);
    this.createInteractionPad(0, -6.8, 0x10b981, 2.5);
    this.createFloatingBadge('📜 [E] MASTER CHANYI', '#38bdf8', 8, 3.2, -4);
    this.createFloatingBadge('🌀 [E] DUNGEON GATE', '#10b981', 0, 5.8, -7.2);

    this.createPalaceLantern(-4, 3, 0xff9a46);
    this.createPalaceLantern(4, 3, 0xffc45e);
    this.createPalaceLantern(-8, -5, 0xffc45e);
    this.createPalaceLantern(8, -5, 0xffc45e);
    this.createGoldOnionVase(-7, 5);
    this.createGoldOnionVase(7, 5);

    this.buildDungeonPortalGate(0, -7.2);
    this.setPortalActive(true);
    this.createTrainingDummy(5.5, -1.5, 9001);
    this.createTrainingDummy(5.5, -3.5, 9002);
    this.createFloatingBadge('🎯 [DUMMY] ซ้อมสกิลและพลังโจมตี', '#fbbf24', 5.5, 2.8, -2.5);
    this.createBreakableUrn(-4, -2, 9003);
    this.createBreakableUrn(-4, 1.5, 9004);
  }

  // ----------------------------------------------------------------------
  // PROCEDURAL MULTI-ROOM BIOME BUILDER
  // Supports:
  // - 'center': Main Combat Wave Arena (20 Waves) with 3 Doorways (North, West, East)
  // - 'north': Chamber of Stat Amplification (อุปกรณ์เพิ่มสถานะ)
  // - 'west': Chamber of Equipment and Stat Upgrades
  // - 'east': Chamber of Healing Sanctuary & Ancient Treasure (บ่อน้ำโอสถ)
  // ----------------------------------------------------------------------
  private buildBiomeRoomScene(
    room: DungeonRoomId | DungeonRoomType | string,
    biomeId: DungeonMapId | string,
    doorLabels?: RoomDoorLabels
  ) {
    let bgColor = 0x061c24;
    let fogDensity = 0.016;
    let floorTex = this.createDungeonFloorTexture();
    let floorColor = 0xb4aaa0;
    let roughness = 0.94;
    let metalness = 0.02;
    let lanternGlow1 = 0xff9d47;
    let lanternGlow2 = 0xffbf62;

    // 6 Biomes from levels.json
    if (biomeId === 'test_dungeon') {
      bgColor = 0x090709;
      fogDensity = 0.021;
      floorColor = 0xb7aaa0;
      lanternGlow1 = 0xff9d47;
      lanternGlow2 = 0xffc36b;
    } else if (biomeId === 'bamboo') {
      bgColor = 0x032b1f;
      fogDensity = 0.018;
      floorColor = 0x98a38c;
      roughness = 0.6;
      lanternGlow1 = 0xff9a42;
      lanternGlow2 = 0xffc46c;
    } else if (biomeId === 'crypt') {
      bgColor = 0x120a26;
      fogDensity = 0.022;
      floorColor = 0xb8aaa4;
      roughness = 0.7;
      lanternGlow1 = 0xffa04b;
      lanternGlow2 = 0xff684d;
    } else if (biomeId === 'ice') {
      bgColor = 0x031d36;
      fogDensity = 0.018;
      floorColor = 0x9eafba;
      roughness = 0.2;
      metalness = 0.7;
      lanternGlow1 = 0xffb25e;
      lanternGlow2 = 0xffd488;
    } else if (biomeId === 'forge') {
      bgColor = 0x240707;
      fogDensity = 0.02;
      floorColor = 0xb0a098;
      roughness = 0.8;
      metalness = 0.5;
      lanternGlow1 = 0xff5f39;
      lanternGlow2 = 0xff9b48;
    } else if (biomeId === 'sky') {
      bgColor = 0x0f172a;
      fogDensity = 0.015;
      floorColor = 0xa39ba4;
      roughness = 0.3;
      metalness = 0.4;
      lanternGlow1 = 0xffc36c;
      lanternGlow2 = 0xffa34d;
    } else if (biomeId === 'undead') {
      bgColor = 0x150b29;
      fogDensity = 0.02;
      floorColor = 0xb8aaa4;
      lanternGlow1 = 0xff684d;
      lanternGlow2 = 0xffa04b;
    } else if (biomeId === 'japan') {
      bgColor = 0x0c0817;
      fogDensity = 0.018;
      lanternGlow1 = 0xff9a42;
      lanternGlow2 = 0xff6b48;
    } else if (biomeId === 'elfland') {
      bgColor = 0x022c22;
      fogDensity = 0.016;
      floorColor = 0x98a38c;
      roughness = 0.8;
      lanternGlow1 = 0x10b981;
      lanternGlow2 = 0xa3e635;
    } else if (biomeId === 'stronghold') {
      bgColor = 0x0f172a;
      fogDensity = 0.015;
      floorColor = 0x9eafba;
      roughness = 0.3;
      metalness = 0.7;
      lanternGlow1 = 0x38bdf8;
      lanternGlow2 = 0x0284c7;
    } else if (biomeId === 'desert') {
      bgColor = 0x061c24;
      fogDensity = 0.014;
      floorColor = 0xb09a83;
      lanternGlow1 = 0x38bdf8;
      lanternGlow2 = 0xfbbf24;
    } else {
      bgColor = 0x061c24;
      fogDensity = 0.016;
      floorColor = 0x0f766e;
      lanternGlow1 = 0x38bdf8;
      lanternGlow2 = 0xf59e0b;
    }

    const isBossArena = room === 'boss_arena';
    if (isBossArena) {
      floorColor = 0x382035;
      roughness = 0.72;
      metalness = 0.24;
      lanternGlow1 = 0xe879f9;
      lanternGlow2 = 0x22d3ee;
    }
    this.scene.background = new THREE.Color(isBossArena ? 0x09020e : 0x050507);
    this.scene.fog = new THREE.FogExp2(isBossArena ? 0x18051e : 0x09090b, Math.max(fogDensity, isBossArena ? 0.026 : 0.018));
    this.keyLight.color.setHex(isBossArena ? 0xc4b5fd : 0xffd6ab);
    this.keyLight.intensity = isBossArena ? 1.25 : 1.75;
    this.ambientLight.color.setHex(isBossArena ? 0xc026d3 : 0x81727a);
    this.ambientLight.groundColor.setHex(isBossArena ? 0x12071b : 0x181014);
    this.ambientLight.intensity = isBossArena ? 0.72 : 0.82;

    // Standardized spacious arena bounds for all dungeon rooms
    // Push the physical arena edge beyond the camera framing so the fight reads as open-ended.
    this.bounds = { minX: -16, maxX: 16, minZ: -12, maxZ: 12 };

    const voidFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 140),
      new THREE.MeshBasicMaterial({ color: 0x050507 })
    );
    voidFloor.rotation.x = -Math.PI / 2;
    voidFloor.position.y = -0.16;
    this.staticDecorGroup.add(voidFloor);

    const floorGeo = new THREE.PlaneGeometry(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: floorColor,
      roughness,
      metalness,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    this.buildRoomBoundaryWalls(doorLabels);
    this.createDungeonWallTorch(-7.2, this.bounds.minZ + 0.35, 0, lanternGlow1);
    this.createDungeonWallTorch(7.2, this.bounds.minZ + 0.35, 0, lanternGlow2);
    this.createDungeonWallTorch(this.bounds.minX + 0.35, -4.5, Math.PI / 2, lanternGlow1);
    this.createDungeonWallTorch(this.bounds.maxX - 0.35, 4.5, -Math.PI / 2, lanternGlow2);
    this.createDungeonCrate(-10.6, -7.2, 0);
    this.createDungeonBarrel(10.4, -7.4);
    this.createDungeonCrate(-11.4, 6.4, 1);
    this.createDungeonBarrel(11.1, 6.5);

    // Room-specific center piece
    if (room === 'equipment_shop' || room === 'west') {
      // Equipment and stat upgrade shop
      this.createEquipmentMerchantPedestal(0, -1.5);
    } else if (room === 'equipment_shop' || room === 'north') {
      // Chamber of Equipment & Buffs
      this.createEquipmentMerchantPedestal(0, -1.5);
    } else if (room === 'healing_pool' || room === 'east') {
      // Chamber of Healing Sanctuary
      this.createHealingPoolSanctuary(0, -1.5);
      this.createBreakableUrn(-5, 0, 8001);
      this.createBreakableUrn(5, 0, 8002);
      this.createBreakableUrn(-5, 3, 8003);
      this.createBreakableUrn(5, 3, 8004);
    } else if (room === 'start') {
      // Start Room: calm preparation hall with breakables
      this.createBreakableUrn(-5, 0, 7001);
      this.createBreakableUrn(5, 0, 7002);
      this.createFloatingBadge('🚪 ห้องจุดเริ่มต้น (START ROOM)', '#38bdf8', 0, 4.4, -7.5);
    } else if (room === 'chest') {
      // The combat engine places the correctly rolled chest after the room loads.
    } else if (room === 'forge') {
      // Forge Room with Anvil
      this.createForgeAnvilProp(0, -1.5);
    } else if (room === 'elite') {
      // Elite Room
      this.createFloatingBadge('💀 ห้องศัตรูระดับสูง (ELITE COMBAT)', '#ef4444', 0, 4.4, -7.5);
    } else if (room === 'altar') {
      this.createBossArenaAltar(0, -1.2);
      this.createFloatingBadge('🗿 [E] อัญเชิญบอส', '#67e8f9', 0, 4.4, -1.2);
    } else if (room === 'boss_arena') {
      this.createBossArenaAltar(0, -1.2);
      this.createFloatingBadge('⚔️ มิติแห่งผู้พิทักษ์ (BOSS REALM)', '#e879f9', 0, 4.4, -7.5);
      this.createFloatingBadge('การต่อสู้ครั้งสุดท้ายเริ่มต้นขึ้น', '#67e8f9', 0, 2.5, -1.4);
    } else if (room === 'boss') {
      this.createBossArenaAltar(0, -1.2);
      this.buildDungeonPortalGate(0, 7.5);
      this.createFloatingBadge('👑 ศึกประจัญบอสใหญ่ (BOSS ARENA)', '#a855f7', 0, 4.4, -7.5);
      this.createFloatingBadge('🌀 [E] ประตูสู่ด่านถัดไป', '#38d9e8', 0, 5.7, 7.4);
    } else if (room === 'exit') {
      // Exit Room
      this.buildDungeonPortalGate(0, -2.8);
      this.createFloatingBadge('🌀 [E] ประตูไปด่านถัดไป', '#10b981', 0, 4.4, -2.8);
    } else if (room === 'secret') {
      // Secret Room
      this.createFloatingBadge('🔮 ห้องลับมิติบิดเบี้ยว (SECRET SANCTUARY)', '#c084fc', 0, 4.4, -7.5);
      this.createChestProp(0, -1.5, 'themed');
    } else {
      // Standard Combat Room
    }

    const addConnectedDoor = (
      direction: 'north' | 'east' | 'south' | 'west',
      x: number,
      z: number,
      rotation: number,
      fallbackColor: number
    ) => {
      const door = doorLabels?.[direction];
      if (!door || door.enabled === false) return;
      this.createDoorArchway(x, z, rotation, door.color ?? fallbackColor, door.label ?? '🚪 ทางเดิน', true);
    };

    addConnectedDoor('north', 0, this.bounds.minZ, 0, 0xa855f7);
    addConnectedDoor('west', this.bounds.minX, 0, Math.PI / 2, 0xf59e0b);
    addConnectedDoor('east', this.bounds.maxX, 0, -Math.PI / 2, 0x10b981);
    addConnectedDoor('south', 0, this.bounds.maxZ, Math.PI, 0x38bdf8);
  }

  private createBossArenaAltar(x: number, z: number) {
    const altar = new THREE.Group();
    altar.position.set(x, 0, z);

    const darkStone = new THREE.MeshStandardMaterial({ color: 0x262d39, roughness: 0.88, metalness: 0.18 });
    const edgeStone = new THREE.MeshStandardMaterial({ color: 0x414957, roughness: 0.8, metalness: 0.24 });
    const redRune = new THREE.MeshBasicMaterial({ color: 0x9e202d, transparent: true, opacity: 0.9 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.55, 4.8), darkStone);
    base.position.y = 0.28;
    base.castShadow = true;
    base.receiveShadow = true;
    altar.add(base);

    const top = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.22, 4.25), edgeStone);
    top.position.y = 0.66;
    top.castShadow = true;
    top.receiveShadow = true;
    altar.add(top);

    const innerPlate = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.06, 3.35), darkStone);
    innerPlate.position.y = 0.8;
    altar.add(innerPlate);

    const sealCanvas = document.createElement('canvas');
    sealCanvas.width = 128;
    sealCanvas.height = 128;
    const ctx = sealCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = '#9c2431';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(64, 67, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#d13a42';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 100); ctx.lineTo(64, 83); ctx.lineTo(49, 72);
    ctx.lineTo(79, 72); ctx.lineTo(56, 60); ctx.lineTo(73, 49);
    ctx.lineTo(64, 34); ctx.lineTo(64, 28);
    ctx.stroke();
    ctx.fillStyle = '#f2eee5';
    ctx.fillRect(49, 43, 30, 29);
    ctx.fillRect(44, 49, 5, 16);
    ctx.fillRect(79, 49, 5, 16);
    ctx.fillRect(53, 72, 22, 8);
    ctx.fillRect(42, 35, 8, 8);
    ctx.fillRect(35, 27, 7, 8);
    ctx.fillRect(78, 35, 8, 8);
    ctx.fillRect(86, 27, 7, 8);
    ctx.fillStyle = '#171820';
    ctx.fillRect(54, 52, 7, 9);
    ctx.fillRect(68, 52, 7, 9);
    ctx.fillRect(61, 66, 7, 5);
    ctx.fillStyle = '#f2eee5';
    ctx.fillRect(55, 74, 4, 7);
    ctx.fillRect(63, 74, 4, 7);
    ctx.fillRect(71, 74, 4, 7);

    const sealTexture = new THREE.CanvasTexture(sealCanvas);
    sealTexture.colorSpace = THREE.SRGBColorSpace;
    sealTexture.magFilter = THREE.NearestFilter;
    sealTexture.minFilter = THREE.NearestFilter;
    const seal = new THREE.Mesh(
      new THREE.PlaneGeometry(3.35, 3.35),
      new THREE.MeshBasicMaterial({ map: sealTexture, transparent: true, depthWrite: false })
    );
    seal.rotation.x = -Math.PI / 2;
    seal.position.y = 0.84;
    altar.add(seal);

    const rings: THREE.Mesh[] = [];
    for (let index = 0; index < 2; index++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(index === 0 ? 2.05 : 1.55, 0.045, 6, 40),
        new THREE.MeshBasicMaterial({ color: index === 0 ? 0x64dce2 : 0xb43542, transparent: true, opacity: 0.65 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.88 + index * 0.015;
      altar.add(ring);
      rings.push(ring);
    }

    const beamGroup = new THREE.Group();
    const outerBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.88, 10.5, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x36d6dc, transparent: true, opacity: 0.17, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    outerBeam.position.y = 5.6;
    beamGroup.add(outerBeam);
    const innerBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.42, 10.2, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xa5fff1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    innerBeam.position.y = 5.55;
    beamGroup.add(innerBeam);
    altar.add(beamGroup);

    const shards: THREE.Mesh[] = [];
    for (let index = 0; index < 4; index++) {
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.26, 0),
        new THREE.MeshStandardMaterial({ color: 0x84e9e6, emissive: 0x138f9a, emissiveIntensity: 1.2, roughness: 0.25, metalness: 0.55 })
      );
      const angle = (index / 4) * Math.PI * 2;
      shard.position.set(Math.cos(angle) * 2.35, 1.25 + (index % 2) * 0.25, Math.sin(angle) * 1.95);
      shard.userData.baseY = shard.position.y;
      shard.userData.phase = index * 1.7;
      altar.add(shard);
      shards.push(shard);
    }

    const light = new THREE.PointLight(0x67e8eb, 2.4, 12, 1.6);
    light.position.set(0, 4.8, 0);
    altar.add(light);
    this.pointLights.push(light);
    altar.userData.rings = rings;
    altar.userData.shards = shards;
    altar.userData.beams = [outerBeam, innerBeam];
    altar.userData.light = light;
    this.bossAltarGroup = altar;
    this.staticDecorGroup.add(altar);
  }

  private buildRoomBoundaryWalls(doorLabels?: RoomDoorLabels) {
    const wallTexture = this.createDungeonWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture, color: 0xffffff, roughness: 0.94, metalness: 0.02 });
    const footMat = new THREE.MeshStandardMaterial({ color: 0x302723, roughness: 0.96 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x514239, roughness: 0.88 });
    const wallHeight = 4.1;
    const halfOpening = 2.3;
    const addSegment = (horizontal: boolean, fixed: number, start: number, end: number) => {
      if (end <= start) return;
      const length = end - start;
      const geometry = horizontal
        ? new THREE.BoxGeometry(length, wallHeight, 0.9)
        : new THREE.BoxGeometry(0.9, wallHeight, length);
      const mesh = new THREE.Mesh(geometry, wallMat);
      const along = (start + end) / 2;
      mesh.position.set(horizontal ? along : fixed, wallHeight / 2, horizontal ? fixed : along);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.staticDecorGroup.add(mesh);

      const foot = new THREE.Mesh(
        horizontal ? new THREE.BoxGeometry(length, 0.52, 1.04) : new THREE.BoxGeometry(1.04, 0.52, length),
        footMat
      );
      foot.position.set(horizontal ? along : fixed, 0.32, horizontal ? fixed : along);
      foot.castShadow = true;
      foot.receiveShadow = true;
      this.staticDecorGroup.add(foot);

      const cap = new THREE.Mesh(
        horizontal ? new THREE.BoxGeometry(length + 0.12, 0.28, 1.1) : new THREE.BoxGeometry(1.1, 0.28, length + 0.12),
        capMat
      );
      cap.position.set(horizontal ? along : fixed, wallHeight + 0.08, horizontal ? fixed : along);
      cap.castShadow = true;
      cap.receiveShadow = true;
      this.staticDecorGroup.add(cap);
    };
    const addSide = (direction: 'north' | 'east' | 'south' | 'west', horizontal: boolean, fixed: number, min: number, max: number) => {
      const opening = doorLabels?.[direction]?.enabled ?? false;
      if (!opening) {
        addSegment(horizontal, fixed, min, max);
        return;
      }
      addSegment(horizontal, fixed, min, -halfOpening);
      addSegment(horizontal, fixed, halfOpening, max);
    };

    addSide('north', true, this.bounds.minZ, this.bounds.minX, this.bounds.maxX);
    addSide('south', true, this.bounds.maxZ, this.bounds.minX, this.bounds.maxX);
    addSide('west', false, this.bounds.minX, this.bounds.minZ, this.bounds.maxZ);
    addSide('east', false, this.bounds.maxX, this.bounds.minZ, this.bounds.maxZ);
  }

  private createDungeonWallTorch(x: number, z: number, rotationY: number, color: number) {
    const torch = new THREE.Group();
    torch.position.set(x, 0, z);
    torch.rotation.y = rotationY;
    const iron = new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.72, metalness: 0.48 });
    const outerFlame = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.96 });
    const innerFlame = new THREE.MeshBasicMaterial({ color: 0xffe09a, transparent: true, opacity: 0.94 });

    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.12), iron);
    backPlate.position.set(0, 2.52, 0.1);
    torch.add(backPlate);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.65), iron);
    arm.position.set(0, 2.45, -0.22);
    torch.add(arm);
    const cup = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 5), iron);
    cup.rotation.x = Math.PI;
    cup.position.set(0, 2.43, -0.48);
    torch.add(cup);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 5), outerFlame);
    flame.position.set(0, 2.88, -0.48);
    torch.add(flame);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 4), innerFlame);
    core.position.set(0, 2.82, -0.5);
    torch.add(core);
    const light = new THREE.PointLight(color, 3.2, 13, 1.7);
    light.position.set(0, 2.9, -0.8);
    light.userData.baseIntensity = 3.2;
    torch.add(light);
    this.pointLights.push(light);
    this.staticDecorGroup.add(torch);
  }

  private createDungeonCrate(x: number, z: number, variant: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const shades = [0x74452f, 0x81513a, 0x5d392b];
    const wood = new THREE.MeshStandardMaterial({ color: shades[variant % shades.length], roughness: 0.9 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x37251f, roughness: 0.82, metalness: 0.08 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.45, 1.55), wood);
    body.position.y = 0.76;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    for (const side of [-1, 1]) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.48, 1.62), edge);
      plank.position.set(side * 0.82, 0.76, 0);
      group.add(plank);
    }
    const crossA = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.16), edge);
    crossA.position.y = 0.76;
    crossA.rotation.z = 0.55;
    group.add(crossA);
    const crossB = crossA.clone();
    crossB.rotation.z = -0.55;
    group.add(crossB);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.16, 1.62), edge);
    lid.position.y = 1.5;
    lid.castShadow = true;
    group.add(lid);
    this.staticDecorGroup.add(group);
  }

  private createDungeonBarrel(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const wood = new THREE.MeshStandardMaterial({ color: 0x754530, roughness: 0.91 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x342d2b, roughness: 0.6, metalness: 0.48 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.67, 1.75, 10), wood);
    barrel.position.y = 0.88;
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    group.add(barrel);
    for (const y of [0.36, 1.35]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.07, 5, 10), iron);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y;
      group.add(hoop);
    }
    this.staticDecorGroup.add(group);
  }

  // ----------------------------------------------------------------------
  // ROOM DECORATORS: DOOR ARCHWAY, STAT DEVICE, GACHA PEDESTAL, HEALING POOL
  // ----------------------------------------------------------------------
  private createDoorArchway(x: number, z: number, rotationY: number, colorHex: number, label: string, enabled: boolean) {
    const archGroup = new THREE.Group();
    archGroup.position.set(x, 0, z);
    archGroup.rotation.y = rotationY;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.7,
    });
    const energyMat = new THREE.MeshBasicMaterial({
      color: enabled ? colorHex : 0x27272a,
      transparent: true,
      opacity: enabled ? 0.75 : 0.98,
      side: THREE.DoubleSide,
    });

    // Left pillar
    const leftP = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.8, 0.5), frameMat);
    leftP.position.set(-1.8, 1.9, 0);
    archGroup.add(leftP);

    // Right pillar
    const rightP = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.8, 0.5), frameMat);
    rightP.position.set(1.8, 1.9, 0);
    archGroup.add(rightP);

    // Top beam
    const topB = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 0.6), frameMat);
    topB.position.set(0, 3.8, 0);
    archGroup.add(topB);

    // Glowing doorway portal sheet
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.4), energyMat);
    portal.position.set(0, 1.8, 0);
    archGroup.add(portal);

    if (!enabled) {
      const stoneDoor = new THREE.Mesh(
        new THREE.BoxGeometry(3.15, 3.4, 0.36),
        new THREE.MeshStandardMaterial({ color: 0x37343f, roughness: 0.92, metalness: 0.04 })
      );
      stoneDoor.position.set(0, 1.8, 0.18);
      archGroup.add(stoneDoor);
    }

    // Floor glow pad
    if (enabled) this.createInteractionPad(x, z, colorHex, 2.0);

    // 3D Floating Badge
    this.createFloatingBadge(label, `#${colorHex.toString(16).padStart(6, '0')}`, x, 4.4, z);

    this.staticDecorGroup.add(archGroup);
  }

  // ----------------------------------------------------------------------
  // DISTORTED SECRET WALL
  // Shimmering dimensional ripple on side wall leading to secret room
  // ----------------------------------------------------------------------
  public createDistortedSecretWall(x: number, z: number, onWall: 'west' | 'east' = 'west') {
    const wallGroup = new THREE.Group();
    wallGroup.position.set(x, 0, z);
    wallGroup.rotation.y = onWall === 'west' ? Math.PI / 2 : -Math.PI / 2;

    const wallMat = new THREE.MeshBasicMaterial({
      map: generateDistortedWallTexture(),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const wallGeo = new THREE.PlaneGeometry(3.6, 4.0);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(0, 2.0, 0);
    wallGroup.add(wallMesh);

    // Glowing dimensional ring
    const ringGeo = new THREE.RingGeometry(1.2, 1.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 2.0, 0.05);
    wallGroup.add(ring);

    const light = new THREE.PointLight(0xa855f7, 2.8, 9);
    light.position.set(0, 2.0, 0.5);
    wallGroup.add(light);
    this.pointLights.push(light);

    this.createInteractionPad(x, z, 0xa855f7, 2.2);
    this.createFloatingBadge('🌀 [E] ผนังมิติบิดเบี้ยว (ห้องลับ)', '#c084fc', x, 4.4, z);

    this.staticDecorGroup.add(wallGroup);
  }

  // ----------------------------------------------------------------------
  // TREASURE CHEST PROP
  // ----------------------------------------------------------------------
  public createChestProp(x: number, z: number, rarity: 'white' | 'blue' | 'gold' | 'themed' = 'gold') {
    const group = new THREE.Group();
    group.userData.isChestProp = true;
    group.position.set(x, 0, z);

    const tex = generateChestTexture(rarity);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(2.0, 2.0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -0.58;
    mesh.position.y = 1.0;
    group.add(mesh);

    const colorHex =
      rarity === 'gold'
        ? 0xfbbf24
        : rarity === 'themed'
        ? 0xc084fc
        : rarity === 'blue'
        ? 0x38bdf8
        : 0xe2e8f0;
    const interactionPad = this.createInteractionPad(x, z, colorHex, 2.2);
    interactionPad.userData.isChestProp = true;
    const label =
      rarity === 'gold'
        ? '👑 [E] หีบทองคำ (GOLD CHEST)'
        : rarity === 'themed'
        ? '🔮 [E] หีบลับประจำบอส (THEMED CHEST)'
        : rarity === 'blue'
        ? '💎 [E] หีบหายาก (BLUE CHEST)'
        : '📦 [E] หีบทั่วไป (WHITE CHEST)';
    const badge = this.createFloatingBadge(label, `#${colorHex.toString(16).padStart(6, '0')}`, x, 2.6, z);
    badge.userData.isChestProp = true;

    this.staticDecorGroup.add(group);
  }

  public hideChestProps() {
    this.staticDecorGroup.children.forEach((child) => {
      if (child.userData.isChestProp) child.visible = false;
    });
  }

  // ----------------------------------------------------------------------
  // FORGE ANVIL PROP (IN X-2)
  // ----------------------------------------------------------------------
  public createForgeAnvilProp(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8, metalness: 0.6 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.3, metalness: 0.9 });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    // Stone base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 0.6, 12), stoneMat);
    base.position.y = 0.3;
    group.add(base);

    // Blacksmith Anvil
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.9), ironMat);
    anvil.position.y = 1.0;
    group.add(anvil);

    // Glowing coals
    const coals = new THREE.Mesh(new THREE.CircleGeometry(0.8, 12), fireMat);
    coals.rotation.x = -Math.PI / 2;
    coals.position.set(0, 0.62, 1.2);
    group.add(coals);

    const light = new THREE.PointLight(0xf97316, 2.5, 8);
    light.position.set(0, 1.2, 1.2);
    group.add(light);
    this.pointLights.push(light);

    this.createInteractionPad(x, z, 0xf97316, 2.2);
    this.createFloatingBadge('⚒️ [E] เตาหลอมตีเหล็ก (FORGE ANVIL)', '#f97316', x, 2.8, z);

    this.staticDecorGroup.add(group);
  }

  // ----------------------------------------------------------------------
  // BOSS ATTACK TELEGRAPHS
  // ----------------------------------------------------------------------
  public showSmashTelegraph(x: number, z: number, radius: number = 3.2, duration: number = 0.6, color: number = 0xef4444) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    this.telegraphGroup.add(group);
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const outerGeo = new THREE.RingGeometry(radius * 0.82, radius, 32);
    const innerGeo = new THREE.RingGeometry(radius * 0.35, radius * 0.39, 24);
    const outerMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    const inner = new THREE.Mesh(innerGeo, innerMat);
    outer.rotation.x = inner.rotation.x = -Math.PI / 2;
    outer.position.y = 0.06; inner.position.y = 0.07;
    group.add(outer, inner);
    geometries.push(outerGeo, innerGeo); materials.push(outerMat, innerMat);

    const crackCoords: number[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, r1 = radius * 0.16;
      const r2 = radius * (0.46 + (i % 2) * 0.06), r3 = radius * (0.78 - (i % 3) * 0.035);
      const side = i % 2 === 0 ? 1 : -1;
      const points = [
        [Math.cos(a) * r1, 0.075, Math.sin(a) * r1],
        [Math.cos(a) * r2 + Math.cos(a + Math.PI / 2) * 0.15 * side, 0.075, Math.sin(a) * r2 + Math.sin(a + Math.PI / 2) * 0.15 * side],
        [Math.cos(a) * r3, 0.075, Math.sin(a) * r3],
      ];
      for (let p = 0; p < points.length - 1; p++) crackCoords.push(...points[p], ...points[p + 1]);
    }
    const crackGeo = new THREE.BufferGeometry();
    crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crackCoords, 3));
    const crackMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    group.add(new THREE.LineSegments(crackGeo, crackMat)); geometries.push(crackGeo); materials.push(crackMat);

    const shardGeo = new THREE.ConeGeometry(0.22, 1.12, 5);
    const shardMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false });
    geometries.push(shardGeo); materials.push(shardMat);
    const spikes: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(shardGeo, shardMat);
      spike.position.set(Math.cos(a) * radius * 0.68, 0.24, Math.sin(a) * radius * 0.68);
      spike.rotation.z = i % 2 ? 0.14 : -0.14;
      spike.scale.set(0.35, 0.12, 0.35);
      group.add(spike); spikes.push(spike);
    }
    const startedAt = performance.now();
    const animate = (now: number) => {
      const p = Math.min(1, (now - startedAt) / Math.max(1, duration * 1000));
      outerMat.opacity = 0.8 * (0.65 + Math.sin(p * Math.PI * 10) * 0.22) * (1 - p * 0.3);
      innerMat.opacity = 0.72 * (1 - p * 0.55); crackMat.opacity = 0.86 * (1 - p * 0.65);
      outer.rotation.z += 0.025; inner.rotation.z -= 0.04;
      spikes.forEach((spike) => { spike.scale.y = 0.12 + Math.sin(p * Math.PI) * 0.85; shardMat.opacity = 0.92 * (1 - p); });
      if (p < 1 && group.parent && !this.disposed) this.scheduleVfxFrame(animate);
      else { group.removeFromParent(); new Set(geometries).forEach(g => g.dispose()); new Set(materials).forEach(m => m.dispose()); }
    };
    this.scheduleVfxFrame(animate);
  }

  public showEnemySkillTelegraph(x: number, z: number, radius: number, duration: number, color: number) {
    this.showSmashTelegraph(x, z, radius, duration, color);
  }

  public showEnemyVolleyTelegraph(fromX: number, fromZ: number, targetX: number, targetZ: number, duration: number, color: number) {
    const group = new THREE.Group();
    this.telegraphGroup.add(group);

    const distance = Math.max(0.6, Math.hypot(targetX - fromX, targetZ - fromZ));
    const baseAngle = Math.atan2(targetZ - fromZ, targetX - fromX);
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const lanes: Array<{ lineMaterial: THREE.LineBasicMaterial; ring: THREE.Mesh; ringMaterial: THREE.MeshBasicMaterial }> = [];

    for (const offset of [-0.2, 0, 0.2]) {
      const angle = baseAngle + offset;
      const startX = fromX + Math.cos(angle) * 0.7;
      const startZ = fromZ + Math.sin(angle) * 0.7;
      const endX = fromX + Math.cos(angle) * distance;
      const endZ = fromZ + Math.sin(angle) * distance;
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startX, 0.075, startZ),
        new THREE.Vector3(endX, 0.075, endZ),
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      group.add(line);
      geometries.push(lineGeometry);
      materials.push(lineMaterial);

      const ringGeometry = new THREE.RingGeometry(0.36, 0.5, 28);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(endX, 0.08, endZ);
      group.add(ring);
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      lanes.push({ lineMaterial, ring, ringMaterial });
    }

    const startedAt = performance.now();
    const dispose = () => {
      group.removeFromParent();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    };
    const animate = (now: number) => {
      const progress = (now - startedAt) / (duration * 1000);
      if (progress >= 1 || !group.parent) {
        dispose();
        return;
      }
      const pulse = 0.48 + Math.sin(progress * Math.PI * 8) * 0.22;
      lanes.forEach(({ lineMaterial, ring, ringMaterial }, index) => {
        lineMaterial.opacity = pulse + (index === 1 ? 0.16 : 0);
        ringMaterial.opacity = 0.55 + Math.sin(progress * Math.PI * 10 + index) * 0.28;
        ring.scale.setScalar(0.7 + progress * 0.35);
        ring.rotation.z += index % 2 === 0 ? 0.035 : -0.035;
      });
      this.scheduleVfxFrame(animate);
    };
    this.scheduleVfxFrame(animate);
  }

  public spawnEnemyImpactShapeVFX(x: number, z: number, color: number, kind: 'bolt' | 'slam' | 'volley') {
    const group = new THREE.Group(); group.position.set(x, 0, z); this.vfxGroup.add(group);
    const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], animated: THREE.Mesh[] = [];
    const ringGeo = new THREE.RingGeometry(0.72, 1, 28);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; group.add(ring);
    geos.push(ringGeo); mats.push(ringMat);
    const coreGeo = kind === 'slam' ? new THREE.DodecahedronGeometry(0.48, 0) : new THREE.IcosahedronGeometry(0.38, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98, blending: THREE.AdditiveBlending, depthWrite: false });
    const core = new THREE.Mesh(coreGeo, coreMat); core.position.y = kind === 'slam' ? 0.48 : 0.8; group.add(core);
    geos.push(coreGeo); mats.push(coreMat); animated.push(core);
    if (kind === 'slam') {
      const spikeGeo = new THREE.ConeGeometry(0.22, 1.35, 5);
      const spikeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false });
      geos.push(spikeGeo); mats.push(spikeMat);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(Math.cos(a) * 1.7, 0.42, Math.sin(a) * 1.7);
        spike.rotation.z = Math.cos(a) * 0.22; spike.scale.set(0.45, 0.08, 0.45);
        group.add(spike); animated.push(spike);
      }
    } else {
      const shardGeo = new THREE.ConeGeometry(kind === 'volley' ? 0.12 : 0.18, kind === 'volley' ? 1.0 : 1.55, 5);
      const shardMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false });
      geos.push(shardGeo); mats.push(shardMat);
      const count = kind === 'volley' ? 3 : 4;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const shard = new THREE.Mesh(shardGeo, shardMat);
        shard.position.set(Math.cos(a) * 0.55, 0.45 + (i % 2) * 0.25, Math.sin(a) * 0.55);
        shard.rotation.z = Math.cos(a) * 0.3; shard.rotation.x = Math.sin(a) * 0.3;
        group.add(shard); animated.push(shard);
      }
    }
    const started = performance.now();
    const animate = (now: number) => {
      const p = Math.min(1, (now - started) / 480);
      ring.scale.setScalar(0.35 + p * (kind === 'slam' ? 3 : 1.8)); ringMat.opacity = 0.92 * (1 - p);
      core.rotation.x += 0.09; core.rotation.y += 0.12; core.scale.setScalar(0.65 + Math.sin(p * Math.PI) * 0.6); coreMat.opacity = 0.98 * (1 - p);
      animated.slice(1).forEach((mesh, i) => { mesh.scale.y = (0.08 + Math.sin(p * Math.PI) * 0.95) * (kind === 'slam' ? 1 : 0.65); (mesh.material as THREE.MeshBasicMaterial).opacity = 0.92 * (1 - p); mesh.rotation.y += i % 2 ? 0.08 : -0.08; });
      if (p < 1 && group.parent && !this.disposed) this.scheduleVfxFrame(animate);
      else { group.removeFromParent(); new Set(geos).forEach(g => g.dispose()); new Set(mats).forEach(m => m.dispose()); }
    };
    this.scheduleVfxFrame(animate);
  }

  public spawnEnemySkillBurst(x: number, z: number, color: number, kind: 'bolt' | 'slam' | 'volley' = 'slam') {
    const slam = kind === 'slam';
    this.spawnEnemyImpactShapeVFX(x, z, color, kind);
    this.spawnSkillRing(x, z, color, slam ? 3.25 : kind === 'volley' ? 1.25 : 1.75, slam ? 0.62 : 0.4);
    this.spawnSkillBurst(x, slam ? 0.68 : 0.9, z, color, slam ? 18 : 8, slam ? 5.8 : 4.4, slam ? 0.62 : 0.4);
    const sparkTex = this.getSparkTexture();
    const count = this.scaleParticleCount(slam ? 10 : 4);
    for (let i = 0; i < count && this.activeParticles.length < this.maxActiveCombatParticles; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: sparkTex, color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const mesh = this.createParticleMesh(0.34, 0.34, mat);
      mesh.rotation.x = -Math.PI / 3; mesh.position.set(x, 0.35 + Math.random() * 0.6, z);
      const a = (Math.PI * 2 * i) / Math.max(1, count);
      const speed = slam ? 2.8 + Math.random() * 2.8 : 1.8 + Math.random() * 2.2;
      this.addCombatParticle({ mesh, vx: Math.cos(a) * speed, vy: 2.4 + Math.random() * 1.8, vz: Math.sin(a) * speed, gravity: -4.5, drag: 1.1, life: slam ? 0.56 + Math.random() * 0.2 : 0.48 + Math.random() * 0.18, maxLife: slam ? 0.76 : 0.66, initialScale: slam ? 1.4 : 1.15, shrink: true, spin: (Math.random() - 0.5) * 12 });
    }
  }

  public createHappyVendor(offers: readonly ShopOfferItem[]) {
    this.removeHappyVendor();
    const vendor = new THREE.Group();
    vendor.name = 'happy-vendor';
    this.happyShopItemGroups = [null, null, null];

    const happyTexture = generateHappyTexture();
    const happy = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.55),
      new THREE.MeshBasicMaterial({ map: happyTexture, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide })
    );
    happy.position.set(0, 0.78, -5.4);
    happy.rotation.x = -0.58;
    vendor.add(happy);

    const aura = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.set(0, 0.035, -5.4);
    vendor.add(aura);
    const happyLabel = this.createVendorSign('💗 แฮปปี้ · แม่ค้าจิ๋ว', '#f9a8d4', 0, 2.25, -5.4, 3.5);
    vendor.add(happyLabel);

    const standXs = [-7, 0, 7];
    offers.forEach((offer, index) => {
      if (index >= standXs.length || offer.purchased) return;
      const itemGroup = this.createHappyOfferStand(offer, index, standXs[index], -0.2);
      vendor.add(itemGroup);
      this.happyShopItemGroups[index] = itemGroup;
    });

    this.staticDecorGroup.add(vendor);
    this.happyVendorGroup = vendor;
  }

  public removeHappyShopItem(index: number) {
    const itemGroup = this.happyShopItemGroups[index];
    if (!itemGroup) return;
    this.disposeAndDetachGroup(itemGroup);
    this.happyShopItemGroups[index] = null;
  }

  public removeHappyVendor() {
    if (this.happyVendorGroup) this.disposeAndDetachGroup(this.happyVendorGroup);
    this.happyVendorGroup = null;
    this.happyShopItemGroups = [];
  }

  private createHappyOfferStand(offer: ShopOfferItem, index: number, x: number, z: number) {
    const group = new THREE.Group();
    group.name = `happy-item-${index}`;
    group.position.set(x, 0, z);
    const rarityColors: Record<string, number> = { common: 0xd4d4d8, rare: 0x38bdf8, epic: 0xc084fc, legendary: 0xfbbf24 };
    const color = rarityColors[offer.itemData.rarity] ?? 0xf9a8d4;
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.15, 0.48, 8),
      new THREE.MeshStandardMaterial({ color: 0x352339, roughness: 0.42, metalness: 0.45 })
    );
    stone.position.y = 0.24;
    group.add(stone);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 0.92, 0.12, 8),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.25 })
    );
    rim.position.y = 0.54;
    group.add(rim);
    const itemCanvas = document.createElement('canvas');
    itemCanvas.width = 192;
    itemCanvas.height = 192;
    const iconCtx = itemCanvas.getContext('2d')!;
    drawItemIconCanvas(iconCtx, offer.itemData.id, offer.itemData.rarity, 96, 96, 86, color);
    const iconTexture = new THREE.CanvasTexture(itemCanvas);
    iconTexture.colorSpace = THREE.SRGBColorSpace;
    const icon = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.0),
      new THREE.MeshBasicMaterial({ map: iconTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    icon.position.y = 1.22;
    icon.rotation.x = -0.58;
    group.add(icon);

    const rarityNames: Record<string, string> = { common: 'ธรรมดา', rare: 'หายาก', epic: 'มหากาพย์', legendary: 'ตำนาน' };
    group.add(this.createVendorSign(`${offer.nameTh}  ·  ${rarityNames[offer.itemData.rarity] ?? 'พิเศษ'}  ·  ${offer.cost} G  [E]`, `#${color.toString(16).padStart(6, '0')}`, 0, 2.1, 0, 4.7));
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.35, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    group.add(ring);
    return group;
  }

  private createVendorSign(text: string, color: string, x: number, y: number, z: number, width: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 112;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(19, 10, 25, 0.94)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(8, 8, 752, 96, 20);
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 32px "Kanit", "Rajdhani", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 384, 57, 720);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 0.72),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    sign.position.set(x, y, z);
    sign.rotation.x = -0.58;
    return sign;
  }

  private disposeAndDetachGroup(group: THREE.Group) {
    group.parent?.remove(group);
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        const map = (material as THREE.MeshBasicMaterial).map;
        map?.dispose();
        material.dispose();
      });
    });
  }

  public showDashTelegraph(fromX: number, fromZ: number, toX: number, toZ: number, duration: number = 0.5, color: number = 0xf97316) {
    const dx = toX - fromX, dz = toZ - fromZ, dist = Math.max(0.01, Math.hypot(dx, dz));
    const dirX = dx / dist, dirZ = dz / dist, normalX = -dirZ, normalZ = dirX;
    const group = new THREE.Group();
    this.telegraphGroup.add(group);
    const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
    const beamGeo = new THREE.BoxGeometry(dist, 0.045, 1.15);
    const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set((fromX + toX) / 2, 0.055, (fromZ + toZ) / 2);
    beam.rotation.y = -Math.atan2(dz, dx);
    group.add(beam); geometries.push(beamGeo); materials.push(beamMat);

    const coords: number[] = [];
    for (const t of [0.28, 0.5, 0.72, 0.9]) {
      const px = fromX + dx * t, pz = fromZ + dz * t;
      const bx = px - dirX * Math.min(0.7, dist * 0.08), bz = pz - dirZ * Math.min(0.7, dist * 0.08);
      const wing = Math.min(0.5, dist * 0.06);
      coords.push(bx + normalX * wing, 0.09, bz + normalZ * wing, px, 0.09, pz);
      coords.push(px, 0.09, pz, bx - normalX * wing, 0.09, bz - normalZ * wing);
    }
    const arrowGeo = new THREE.BufferGeometry();
    arrowGeo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    const arrowMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    group.add(new THREE.LineSegments(arrowGeo, arrowMat)); geometries.push(arrowGeo); materials.push(arrowMat);

    const ringGeo = new THREE.RingGeometry(0.42, 0.66, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.set(toX, 0.07, toZ);
    group.add(ring); geometries.push(ringGeo); materials.push(ringMat);

    const shardGeo = new THREE.ConeGeometry(0.24, 0.9, 5);
    const shardMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false });
    const shard = new THREE.Mesh(shardGeo, shardMat); shard.position.set(toX, 0.5, toZ);
    group.add(shard); geometries.push(shardGeo); materials.push(shardMat);
    const startedAt = performance.now();
    const animate = (now: number) => {
      const p = Math.min(1, (now - startedAt) / Math.max(1, duration * 1000));
      beamMat.opacity = (0.34 + Math.sin(p * Math.PI * 12) * 0.2) * (1 - p * 0.3);
      arrowMat.opacity = 0.65 + Math.sin(p * Math.PI * 10) * 0.3;
      ringMat.opacity = 0.85 * (1 - p * 0.25); ring.rotation.z += 0.06;
      shard.scale.y = 0.35 + Math.sin(p * Math.PI) * 0.8; shardMat.opacity = 0.94 * (1 - p);
      if (p < 1 && group.parent && !this.disposed) this.scheduleVfxFrame(animate);
      else { group.removeFromParent(); new Set(geometries).forEach(g => g.dispose()); new Set(materials).forEach(m => m.dispose()); }
    };
    this.scheduleVfxFrame(animate);
  }

  public showEnemyMeleeTelegraph(x: number, z: number, angle: number, duration: number, color: number) {
    const group = new THREE.Group();
    group.position.set(x, 0.065, z); group.rotation.y = -angle; this.telegraphGroup.add(group);
    const shape = new THREE.Shape();
    shape.moveTo(0.35, -0.62); shape.quadraticCurveTo(1.15, -0.72, 2.15, -0.1);
    shape.quadraticCurveTo(1.25, 0.02, 0.35, 0.62); shape.closePath();
    const geo = new THREE.ShapeGeometry(shape, 14);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; group.add(mesh);
    const startedAt = performance.now();
    const animate = (now: number) => {
      const p = Math.min(1, (now - startedAt) / Math.max(1, duration * 1000));
      mesh.scale.set(0.8 + p * 0.25, 1, 0.8 + p * 0.25);
      mat.opacity = (0.45 + Math.sin(p * Math.PI * 8) * 0.2) * (1 - p * 0.3);
      if (p < 1 && group.parent && !this.disposed) this.scheduleVfxFrame(animate);
      else { group.removeFromParent(); geo.dispose(); mat.dispose(); }
    };
    this.scheduleVfxFrame(animate);
  }

  public spawnEnemyMeleeSlashVFX(x: number, z: number, angle: number, color: number) {
    const group = new THREE.Group(); group.position.set(x, 1.0, z); group.rotation.y = -angle; this.vfxGroup.add(group);
    const outerShape = new THREE.Shape();
    outerShape.moveTo(-0.2, -0.8); outerShape.quadraticCurveTo(1.0, 0.3, 2.25, 0.45); outerShape.quadraticCurveTo(1.25, -0.55, -0.2, -0.8); outerShape.closePath();
    const innerShape = new THREE.Shape();
    innerShape.moveTo(0.0, -0.58); innerShape.quadraticCurveTo(1.0, 0.25, 2.05, 0.38); innerShape.quadraticCurveTo(1.0, -0.35, 0.0, -0.58); innerShape.closePath();
    const og = new THREE.ShapeGeometry(outerShape, 12), ig = new THREE.ShapeGeometry(innerShape, 12);
    const om = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const im = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const outer = new THREE.Mesh(og, om), inner = new THREE.Mesh(ig, im);
    outer.position.z = 0.02; inner.position.z = 0.035; group.add(outer, inner);
    this.spawnSkillBurst(x + Math.cos(angle) * 1.25, 1.15, z + Math.sin(angle) * 1.25, color, 4, 2.3, 0.22);
    let elapsed = 0;
    const animate = () => {
      elapsed += 1 / 60; const p = Math.min(1, elapsed / 0.24);
      group.scale.setScalar(0.78 + p * 0.36); group.rotation.z += 0.04;
      om.opacity = 0.82 * (1 - p); im.opacity = 0.9 * (1 - p);
      if (p < 1 && group.parent && !this.disposed) this.scheduleVfxFrame(animate);
      else { group.removeFromParent(); og.dispose(); ig.dispose(); om.dispose(); im.dispose(); }
    };
    this.scheduleVfxFrame(animate);
  }

  private createStatDevicePedestal(x: number, z: number) {
    const deviceGroup = new THREE.Group();
    deviceGroup.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.4, metalness: 0.5 });
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });

    // Tiered altar base
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.4, 8), stoneMat);
    base1.position.y = 0.2;
    deviceGroup.add(base1);

    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.5, 8), stoneMat);
    base2.position.y = 0.65;
    deviceGroup.add(base2);

    // 4 Floating runic obelisks around altar
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const ob = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.35), runeMat);
      ob.position.set(Math.cos(ang) * 1.5, 1.4, Math.sin(ang) * 1.5);
      deviceGroup.add(ob);
    }

    // Glowing core crystal
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), crystalMat);
    crystal.position.y = 1.6;
    crystal.rotation.y = 0.78;
    deviceGroup.add(crystal);

    // Point Light
    const light = new THREE.PointLight(0xa855f7, 2.5, 10);
    light.position.y = 1.8;
    deviceGroup.add(light);
    this.pointLights.push(light);

    this.createInteractionPad(x, z, 0xa855f7, 2.4);
    this.createFloatingBadge('🔮 [E] อุปกรณ์เพิ่มสถานะ (STAT DEVICE)', '#c084fc', x, 3.2, z);

    this.staticDecorGroup.add(deviceGroup);
  }

  public createEquipmentMerchantPedestal(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.4, metalness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });

    // Tiered pedestal
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.5, 8), stoneMat);
    base.position.y = 0.25;
    group.add(base);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.6), goldMat);
    pillar.position.y = 0.8;
    group.add(pillar);

    // Glowing relic crystal
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), crystalMat);
    crystal.position.y = 1.7;
    group.add(crystal);

    const light = new THREE.PointLight(0x10b981, 2.5, 10);
    light.position.y = 2.0;
    group.add(light);
    this.pointLights.push(light);

    this.createInteractionPad(x, z, 0x10b981, 2.6);
    this.createFloatingBadge('🛡️ [E] คลังอุปกรณ์ & บัฟ (GEAR SHRINE)', '#34d399', x, 3.2, z);

    this.staticDecorGroup.add(group);
  }

  private createHealingPoolSanctuary(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.9,
    });

    // Basin
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.8, 0.7, 16), marbleMat);
    basin.position.y = 0.35;
    group.add(basin);

    // Sacred water surface
    const water = new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.72;
    group.add(water);

    const light = new THREE.PointLight(0x10b981, 2.5, 10);
    light.position.y = 1.4;
    group.add(light);
    this.pointLights.push(light);

    this.createInteractionPad(x, z, 0x10b981, 2.6);
    this.createFloatingBadge('💖 [E] บ่อน้ำโอสถศักดิ์สิทธิ์ (HEAL 100%)', '#34d399', x, 3.0, z);

    this.staticDecorGroup.add(group);
  }

  // ----------------------------------------------------------------------
  // 3D FLOATING BADGE HELPER
  // ----------------------------------------------------------------------
  private createFloatingBadge(text: string, color: string, x: number, y: number, z: number): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    // Dark pill container
    ctx.fillStyle = 'rgba(9, 9, 11, 0.92)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 80, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 24px "Kanit", "Rajdhani", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(3.6, 0.68);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = -0.58;
    this.staticDecorGroup.add(mesh);
    return mesh;
  }

  private createInteractionPad(x: number, z: number, colorHex: number, radius: number = 2.0): THREE.Group {
    const padGroup = new THREE.Group();
    padGroup.position.set(x, 0.02, z);

    const ringGeo = new THREE.RingGeometry(radius * 0.7, radius, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    padGroup.add(ring);

    const coreGeo = new THREE.CircleGeometry(radius * 0.45, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = -Math.PI / 2;
    padGroup.add(core);

    this.staticDecorGroup.add(padGroup);
    return padGroup;
  }

  // ----------------------------------------------------------------------
  // PROCEDURAL MODELS
  // ----------------------------------------------------------------------
  private buildPalaceBackWall(width = 40, z = -8.0) {
    const wallGroup = new THREE.Group();
    wallGroup.position.set(0, 0, z);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a1b18,
      roughness: 0.95,
      metalness: 0,
    });
    const goldTrim = new THREE.MeshStandardMaterial({
      color: 0x88452b,
      roughness: 0.9,
      metalness: 0.05,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x493024,
      roughness: 0.95,
      metalness: 0,
    });

    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 8, 1.0), wallMat);
    wallMesh.position.y = 4.0;
    wallMesh.receiveShadow = true;
    wallGroup.add(wallMesh);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(width, 0.6, 1.2), goldTrim);
    plinth.position.y = 0.3;
    wallGroup.add(plinth);

    const frieze = new THREE.Mesh(new THREE.BoxGeometry(width, 0.4, 1.15), goldTrim);
    frieze.position.y = 4.2;
    wallGroup.add(frieze);

    for (let px = -width / 2 + 3; px <= width / 2 - 3; px += 4.5) {
      if (Math.abs(px) < 3.5) continue;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.0, 0.1), panelMat);
      panel.position.set(px, 2.3, 0.55);
      wallGroup.add(panel);

      const archTrim = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 0.15), goldTrim);
      archTrim.position.set(px, 3.8, 0.58);
      wallGroup.add(archTrim);
    }

    this.staticDecorGroup.add(wallGroup);
  }

  private createGoldenStatuePedestal(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const redCloth = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 1.8), stoneMat);
    base.position.y = 0.35;
    base.castShadow = true;
    group.add(base);

    const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.0), redCloth);
    cloth.position.y = 0.8;
    cloth.castShadow = true;
    group.add(cloth);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), goldMat);
    body.position.set(0, 1.45, 0);
    body.scale.set(1.1, 1.2, 1.0);
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), goldMat);
    head.position.set(0, 2.05, 0.2);
    head.castShadow = true;
    group.add(head);

    this.staticDecorGroup.add(group);
  }

  private createRoyalDivan(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const redVelvet = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
    const goldWood = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.7 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 1.6), goldWood);
    base.position.y = 0.15;
    base.castShadow = true;
    group.add(base);

    const cushion = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.4), redVelvet);
    cushion.position.y = 0.55;
    cushion.castShadow = true;
    group.add(cushion);

    const bolster = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 10), redVelvet);
    bolster.rotation.x = Math.PI / 2;
    bolster.position.set(1.4, 0.85, 0);
    bolster.castShadow = true;
    group.add(bolster);

    this.staticDecorGroup.add(group);
  }

  private createExoticPalacePlant(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const vaseMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.2 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.6, side: THREE.DoubleSide });

    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 1.2, 10), vaseMat);
    vase.position.y = 0.6;
    vase.castShadow = true;
    group.add(vase);

    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.4), leafMat);
      const angle = (i / 7) * Math.PI - Math.PI / 2;
      leaf.position.set(Math.sin(angle) * 0.4, 1.6 + Math.cos(angle) * 0.3, Math.cos(angle) * 0.2);
      leaf.rotation.z = -angle * 0.8;
      leaf.rotation.x = 0.2;
      group.add(leaf);
    }

    this.staticDecorGroup.add(group);
  }

  private buildPixelLobbyTable(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const darkWood = new THREE.MeshStandardMaterial({ color: 0x332018, roughness: 0.96 });
    const warmWood = new THREE.MeshStandardMaterial({ color: 0x70462d, roughness: 0.96 });
    const fadedCloth = new THREE.MeshStandardMaterial({ color: 0x8d3029, roughness: 0.98 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 2.4), darkWood);
    top.position.y = 1.14;
    group.add(top);
    const tabletop = new THREE.Mesh(new THREE.BoxGeometry(3.14, 0.13, 2.14), warmWood);
    tabletop.position.y = 1.31;
    group.add(tabletop);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.06, 1.45), fadedCloth);
    cloth.position.set(0, 1.405, 0);
    group.add(cloth);

    for (const px of [-1.42, 1.42]) {
      for (const pz of [-0.94, 0.94]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.08, 0.24), darkWood);
        leg.position.set(px, 0.54, pz);
        group.add(leg);
      }
    }
    const apron = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.36, 0.2), warmWood);
    apron.position.set(0, 0.86, 0.94);
    group.add(apron);

    this.staticDecorGroup.add(group);
  }

  private createPalaceLantern(x: number, z: number, glowHex: number = 0x38bdf8) {
    const lantern = new THREE.Group();
    lantern.position.set(x, 0, z);

    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.75 });
    const glassMat = new THREE.MeshBasicMaterial({ color: glowHex, transparent: true, opacity: 0.95 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.3, 6), brassMat);
    base.position.y = 0.15;
    base.castShadow = true;
    lantern.add(base);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 6), glassMat);
    glass.position.y = 0.85;
    glass.castShadow = true;
    lantern.add(glass);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 6), brassMat);
    cap.position.y = 1.6;
    cap.castShadow = true;
    lantern.add(cap);

    const light = new THREE.PointLight(glowHex, 1.8, 8);
    light.position.y = 0.9;
    lantern.add(light);
    this.pointLights.push(light);

    this.staticDecorGroup.add(lantern);
  }

  private createForegroundJar(x: number, z: number) {
    const jar = new THREE.Group();
    jar.position.set(x, 0, z);

    const clayMat = new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.7, metalness: 0.2 });
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), clayMat);
    belly.position.y = 0.55;
    belly.scale.set(1, 1.2, 1);
    belly.castShadow = true;
    jar.add(belly);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.25, 8), clayMat);
    rim.position.y = 1.15;
    jar.add(rim);

    this.staticDecorGroup.add(jar);
  }

  private createGoldOnionVase(x: number, z: number) {
    const urn = new THREE.Group();
    urn.position.set(x, 0, z);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), goldMat);
    belly.position.y = 0.65;
    belly.scale.set(1, 1.2, 1);
    belly.castShadow = true;
    urn.add(belly);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), goldMat);
    finial.position.y = 1.35;
    urn.add(finial);

    this.staticDecorGroup.add(urn);
  }

  private buildOrnateCarpet(x: number, z: number, width: number, length: number) {
    const carpetGeo = new THREE.PlaneGeometry(width, length);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.9,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(x, 0.02, z);
    this.staticDecorGroup.add(carpet);
  }

  private buildBlacksmithStation(x: number, z: number) {
    const station = new THREE.Group();
    station.position.set(x, 0, z);
    const darkIron = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    const anvilBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.7, 8), woodMat);
    anvilBase.position.y = 0.35;
    station.add(anvilBase);

    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 0.5), darkIron);
    anvilTop.position.y = 0.8;
    station.add(anvilTop);

    this.staticDecorGroup.add(station);
  }

  private buildTrainerStation(x: number, z: number) {
    const station = new THREE.Group();
    station.position.set(x, 0, z);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7, side: THREE.DoubleSide });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.0, 8), woodMat);
    pole.position.y = 1.0;
    station.add(pole);

    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.8), bannerMat);
    banner.position.set(0.8, 1.2, -0.4);
    station.add(banner);

    this.staticDecorGroup.add(station);
  }

  private buildDungeonPortalGate(x: number, z: number) {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(x, 0, z);

    const vermilionMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5, metalness: 0.3 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });

    [-3.2, 3.2].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 5.0, 10), vermilionMat);
      pillar.position.set(px, 2.5, 0);
      gateGroup.add(pillar);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 10), goldMat);
      cap.position.set(px, 5.1, 0);
      gateGroup.add(cap);
    });

    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.5, 0.6), vermilionMat);
    crossbeam.position.set(0, 5.2, 0);
    gateGroup.add(crossbeam);

    // Dynamic Swirling Energy Vortex Texture
    const portalCanvas = document.createElement('canvas');
    portalCanvas.width = 256;
    portalCanvas.height = 256;
    const pctx = portalCanvas.getContext('2d')!;
    const grad = pctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#38bdf8');
    grad.addColorStop(0.6, '#0284c7');
    grad.addColorStop(0.85, '#0d9488');
    grad.addColorStop(1, 'rgba(4, 47, 46, 0)');
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, 256, 256);

    const portalTex = new THREE.CanvasTexture(portalCanvas);
    portalTex.colorSpace = THREE.SRGBColorSpace;

    const portalGeo = new THREE.PlaneGeometry(5.2, 4.8);
    const portalMat = new THREE.MeshBasicMaterial({
      map: portalTex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(0, 2.6, 0.05);
    gateGroup.add(portal);

    // Glowing base rim
    const rimGeo = new THREE.RingGeometry(1.6, 2.4, 24);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(0, 0.03, 0.6);
    gateGroup.add(rim);

    this.portalMesh = gateGroup;
    this.staticDecorGroup.add(gateGroup);
  }

  private createBambooCluster(x: number, z: number) {
    const bambooGroup = new THREE.Group();
    bambooGroup.position.set(x, 0, z);
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const ox = (Math.random() - 0.5) * 1.0;
      const oz = (Math.random() - 0.5) * 1.0;
      const height = 5 + Math.random() * 2.5;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, height, 8), greenMat);
      stalk.position.set(ox, height / 2, oz);
      bambooGroup.add(stalk);
    }
    this.staticDecorGroup.add(bambooGroup);
  }

  public createBreakableUrn(x: number, z: number, id: number): THREE.Group {
    const urn = new THREE.Group();
    urn.position.set(x, 0, z);
    (urn as any).gameId = id;

    const clayMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7, metalness: 0.1 });
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), clayMat);
    belly.position.y = 0.6;
    belly.scale.set(1, 1.2, 1);
    belly.castShadow = true;
    urn.add(belly);

    this.breakablesGroup.add(urn);
    return urn;
  }

  public createTrainingDummy(x: number, z: number, id: number): THREE.Group {
    const dummy = new THREE.Group();
    dummy.position.set(x, 0, z);
    (dummy as any).gameId = id;
    (dummy as any).isDummy = true;

    // Wooden Stand Base
    const standMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.25, 8), standMat);
    base.position.y = 0.12;
    base.castShadow = true;
    dummy.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), standMat);
    pole.position.y = 1.1;
    pole.castShadow = true;
    dummy.add(pole);

    // Straw Target Torso
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 8), strawMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    dummy.add(torso);

    // Target Red Bullseye on Chest
    const targetMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const target = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.28, 8), targetMat);
    target.position.set(0, 1.35, 0.43);
    dummy.add(target);

    // Cross Arms for Blocking/Training
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.18), standMat);
    arm.position.y = 1.45;
    arm.castShadow = true;
    dummy.add(arm);

    this.breakablesGroup.add(dummy);
    return dummy;
  }

  // ----------------------------------------------------------------------
  // SPECTACULAR 3D SKILL VISUAL EFFECTS
  // ----------------------------------------------------------------------

  public spawnSkillBurst(x: number, y: number, z: number, color: number, count: number, speed: number, life: number) {
    const sparkTex = this.getSparkTexture();
    const particleCount = this.scaleParticleCount(count);
    for (let i = 0; i < particleCount && this.activeParticles.length < this.maxActiveCombatParticles; i++) {
      const size = 0.24 + Math.random() * 0.28;
      const mat = new THREE.MeshBasicMaterial({
        map: sparkTex,
        color: i % 4 === 0 ? 0xffffff : color,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = this.createParticleMesh(size, size, mat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.45, y + (Math.random() - 0.5) * 0.35, z + (Math.random() - 0.5) * 0.45);
      mesh.rotation.x = -Math.PI / 3;
      const angle = Math.random() * Math.PI * 2;
      const particleLife = life * (0.72 + Math.random() * 0.56);
      this.addCombatParticle({
        mesh,
        vx: Math.cos(angle) * speed * (0.55 + Math.random() * 0.65),
        vy: 1.8 + Math.random() * speed * 0.55,
        vz: Math.sin(angle) * speed * (0.55 + Math.random() * 0.65),
        gravity: 7.5,
        drag: 1.8,
        life: particleLife,
        maxLife: particleLife,
        initialScale: 0.8 + Math.random() * 0.9,
        shrink: true,
        spin: (Math.random() - 0.5) * 14,
      });
    }
  }

  private spawnSkillRing(x: number, z: number, color: number, radius: number, duration: number = 0.55) {
    const seal = new THREE.Group();
    seal.position.set(x, 0.065, z);
    seal.rotation.x = -Math.PI / 2;
    seal.scale.setScalar(0.18);
    this.vfxGroup.add(seal);

    const ringSegments = this.graphicsQuality === 'high' ? 64 : 32;
    const ringGeo = new THREE.RingGeometry(0.72, 1, ringSegments);
    const innerGeo = new THREE.RingGeometry(0.79, 0.83, ringSegments);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const outer = new THREE.Mesh(ringGeo, ringMat);
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.scale.setScalar(0.72);
    seal.add(outer, inner);

    const tickPoints: number[] = [];
    const tickCount = this.graphicsQuality === 'low' ? 16 : 32;
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      const innerRadius = i % 4 === 0 ? 0.72 : 0.83;
      const outerRadius = i % 4 === 0 ? 1.04 : 0.94;
      tickPoints.push(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius, 0.02);
      tickPoints.push(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius, 0.02);
    }
    const tickGeo = new THREE.BufferGeometry();
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPoints, 3));
    const tickMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, depthWrite: false });
    seal.add(new THREE.LineSegments(tickGeo, tickMat));

    const runeGeo = new THREE.OctahedronGeometry(0.105, 0);
    const runeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const runes: THREE.Mesh[] = [];
    const runeCount = this.graphicsQuality === 'low' ? 4 : this.graphicsQuality === 'balanced' ? 6 : 8;
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2;
      const rune = new THREE.Mesh(runeGeo, runeMat.clone());
      rune.position.set(Math.cos(angle) * 0.68, Math.sin(angle) * 0.68, 0.035);
      rune.rotation.set(Math.PI / 4, angle, Math.PI / 4);
      seal.add(rune);
      runes.push(rune);
    }

    let elapsed = 0;
    const animate = () => {
      elapsed += 1 / 60;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - progress) * (1 - progress);
      seal.scale.setScalar(0.18 + (radius - 0.18) * eased);
      seal.rotation.z += 0.018;
      const fade = 1 - progress;
      ringMat.opacity = 0.9 * fade;
      innerMat.opacity = 0.8 * fade;
      tickMat.opacity = 0.86 * fade;
      runes.forEach((rune, index) => {
        rune.rotation.y += index % 2 === 0 ? 0.055 : -0.055;
        (rune.material as THREE.MeshBasicMaterial).opacity = 0.95 * fade;
      });
      if (progress < 1) this.scheduleVfxFrame(animate);
      else {
        this.vfxGroup.remove(seal);
        ringGeo.dispose();
        innerGeo.dispose();
        tickGeo.dispose();
        runeGeo.dispose();
        ringMat.dispose();
        innerMat.dispose();
        tickMat.dispose();
        runes.forEach((rune) => (rune.material as THREE.Material).dispose());
      }
    };
    this.scheduleVfxFrame(animate);
  }

  public spawnEnemyArrowProjectileVFX(x: number, z: number, angle: number, distance: number, color: number, projectileScale: number = 0.72) {
    const group = new THREE.Group();
    group.position.set(x, 1.08, z);
    group.rotation.y = -angle;
    group.scale.setScalar(projectileScale);
    this.vfxGroup.add(group);

    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: color,
      emissiveIntensity: 2.4,
      metalness: 0.68,
      roughness: 0.22,
      transparent: true,
      opacity: 0.98,
    });
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: 3.1,
      metalness: 0.52,
      roughness: 0.16,
      transparent: true,
      opacity: 0.98,
    });
    const featherMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const featherMaterials: THREE.Material[] = [];
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.28, 8), shaftMaterial);
    shaft.rotation.z = -Math.PI / 2;
    group.add(shaft);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 8), crystalMaterial);
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = 0.77;
    group.add(tip);

    const feathers: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const material = featherMaterial.clone();
      featherMaterials.push(material);
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.28, 5), material);
      feather.rotation.z = Math.PI / 2;
      feather.position.set(-0.57, 0.02, side * 0.09);
      group.add(feather);
      feathers.push(feather);
    }
    featherMaterial.dispose();

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.025, 6, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = -0.12;
    group.add(ring);

    const fadeMaterials: THREE.Material[] = [shaftMaterial, crystalMaterial, ...featherMaterials, ring.material as THREE.Material];
    let progress = 0;
    let frame = 0;
    const animate = () => {
      progress += 1 / 22;
      frame++;
      const travel = Math.min(1, progress);
      group.position.x = x + Math.cos(angle) * distance * travel;
      group.position.z = z + Math.sin(angle) * distance * travel;
      ring.rotation.x += 0.18;
      feathers.forEach((feather, index) => {
        feather.rotation.x += index === 0 ? 0.1 : -0.1;
      });
      const fade = Math.max(0, 1 - Math.max(0, progress - 0.78) / 0.22);
      fadeMaterials.forEach((material) => { material.opacity = fade; });
      if (frame % 4 === 0 && progress < 0.88) {
        this.spawnSkillBurst(group.position.x, group.position.y, group.position.z, color, 2, 1.1, 0.22);
      }
      if (progress < 1) this.scheduleVfxFrame(animate);
      else {
        this.vfxGroup.remove(group);
        group.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        });
      }
    };
    this.scheduleVfxFrame(animate);
  }

  public spawnSkillProjectileVFX(x: number, z: number, angle: number, distance: number, color: number, style: 'blade' | 'orb' | 'dragon', projectileScale: number = 1) {
    const group = new THREE.Group();
    const orbLike = style === 'orb' || style === 'dragon';
    group.position.set(x, orbLike ? 1.15 : 1.0, z);
    group.rotation.y = -angle;
    group.scale.setScalar(projectileScale);
    this.vfxGroup.add(group);

    const meshes: THREE.Mesh[] = [];
    const addMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, px = 0, py = 0, pz = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(px, py, pz);
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: color, emissiveIntensity: 2.8, metalness: 0.7, roughness: 0.18, transparent: true, opacity: 0.98 });
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false });
    const detailFadeMaterials: THREE.Material[] = [];

    let glow: THREE.Mesh;
    let core: THREE.Mesh;
    const animatedRings: THREE.Object3D[] = [];
    if (style === 'orb') {
      glow = addMesh(new THREE.SphereGeometry(0.9, 20, 16), glowMat);
      core = addMesh(new THREE.IcosahedronGeometry(0.48, 1), coreMat);
      const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
      for (let i = 0; i < 3; i++) {
        const ring = addMesh(new THREE.TorusGeometry(0.75 + i * 0.12, 0.045, 7, 36), ringMaterial.clone());
        ring.rotation.set(Math.PI * (0.35 + i * 0.2), Math.PI * (0.2 + i * 0.22), i * 0.7);
        animatedRings.push(ring);
      }
      for (let i = 0; i < 4; i++) {
        const shard = addMesh(new THREE.TetrahedronGeometry(0.2, 0), coreMat.clone(), Math.cos(i * Math.PI / 2) * 0.85, Math.sin(i * Math.PI / 2) * 0.55, 0);
        shard.rotation.z = i * 0.8;
        animatedRings.push(shard);
      }
    } else if (style === 'dragon') {
      glow = addMesh(new THREE.SphereGeometry(0.98, 24, 18), glowMat);
      core = addMesh(new THREE.IcosahedronGeometry(0.47, 1), coreMat);
      const coilPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= 36; i++) {
        const t = i / 36;
        const turn = t * Math.PI * 4;
        coilPoints.push(new THREE.Vector3(-0.95 + t * 1.9, Math.cos(turn) * 0.43, Math.sin(turn) * 0.43));
      }
      const coilGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPoints), 72, 0.085, 8, false);
      const coilMat = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, emissive: 0x22d3ee, emissiveIntensity: 3.1, metalness: 0.58, roughness: 0.18, transparent: true, opacity: 0.96 });
      detailFadeMaterials.push(coilMat);
      addMesh(coilGeo, coilMat);

      const head = new THREE.Group();
      head.position.set(0.82, 0.03, 0);
      group.add(head);
      const headGeo = new THREE.IcosahedronGeometry(0.27, 1);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfbbf24, emissiveIntensity: 2.5, metalness: 0.56, roughness: 0.2, transparent: true, opacity: 0.98 });
      detailFadeMaterials.push(headMat);
      const headMesh = new THREE.Mesh(headGeo, headMat);
      head.add(headMesh);
      const dragonParts: THREE.Mesh[] = [headMesh];
      const muzzleGeo = new THREE.ConeGeometry(0.12, 0.38, 7);
      const muzzleMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 2.1, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.98 });
      detailFadeMaterials.push(muzzleMat);
      const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
      muzzle.rotation.z = -Math.PI / 2;
      muzzle.position.x = 0.27;
      head.add(muzzle);
      dragonParts.push(muzzle);
      const hornGeo = new THREE.ConeGeometry(0.075, 0.3, 6);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 1.8, transparent: true, opacity: 0.98 });
      detailFadeMaterials.push(hornMat);
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(hornGeo, hornMat);
        horn.position.set(-0.08, 0.2, side * 0.16);
        horn.rotation.x = side * 0.65;
        horn.rotation.z = -0.35;
        head.add(horn);
        dragonParts.push(horn);
      }
      const eyeGeo = new THREE.SphereGeometry(0.035, 8, 6);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
      detailFadeMaterials.push(eyeMat);
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0.12, 0.07, side * 0.19);
        head.add(eye);
        dragonParts.push(eye);
      }
      meshes.push(...dragonParts);
      animatedRings.push(head);
    } else {
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(-1.8, -0.35);
      bladeShape.quadraticCurveTo(-0.1, 0.65, 1.95, 0.32);
      bladeShape.quadraticCurveTo(0.25, -0.55, -1.8, -0.35);
      const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.18, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.08, bevelThickness: 0.08 });
      bladeGeo.translate(0, 0, -0.09);
      glow = addMesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.32, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.13, bevelThickness: 0.1 }), glowMat, -0.15);
      core = addMesh(bladeGeo, coreMat, -0.15);
      const halo = addMesh(new THREE.TorusGeometry(0.68, 0.035, 7, 30, Math.PI * 1.35), rimMat, -0.35, 0, -0.24);
      halo.rotation.z = -0.65;
      animatedRings.push(halo);
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 3, metalness: 0.75, roughness: 0.14 });
      for (const sign of [-1, 1]) {
        const tip = addMesh(new THREE.ConeGeometry(0.16, 0.6, 6), tipMat.clone(), sign * 1.55, sign * 0.14, 0);
        tip.rotation.z = sign > 0 ? Math.PI / 2 - 0.22 : -Math.PI / 2 + 0.3;
      }
    }

    let progress = 0;
    let frame = 0;
    const animate = () => {
      progress += 1 / 24;
      frame++;
      const travel = Math.min(1, progress);
      group.position.x = x + Math.cos(angle) * distance * travel;
      group.position.z = z + Math.sin(angle) * distance * travel;
      const pulse = 1 + Math.sin(progress * Math.PI * 10) * 0.08;
      glow.scale.set(pulse, pulse, pulse);
      core.rotation.x += 0.08;
      core.rotation.z += style === 'orb' ? 0.11 : 0.03;
      animatedRings.forEach((ring, i) => {
        ring.rotation.x += 0.06 * (i % 2 ? -1 : 1);
        ring.rotation.y += 0.08 * (i % 2 ? 1 : -1);
      });
      const fade = Math.max(0, 1 - Math.max(0, progress - 0.82) / 0.18);
      glowMat.opacity = (style === 'orb' ? 0.58 : 0.48) * fade;
      coreMat.opacity = 0.98 * fade;
      rimMat.opacity = 0.92 * fade;
      detailFadeMaterials.forEach((material) => {
        (material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial).opacity = 0.98 * fade;
      });
      if (frame % 6 === 0 && progress < 0.82) {
        this.spawnSkillBurst(group.position.x, group.position.y, group.position.z, color, style === 'dragon' ? 5 : 3, style === 'dragon' ? 1.7 : style === 'orb' ? 1.3 : 0.95, 0.32);
      }
      if (progress < 1) this.scheduleVfxFrame(animate);
      else {
        this.vfxGroup.remove(group);
        meshes.forEach((mesh) => {
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        });
      }
    };
    this.scheduleVfxFrame(animate);
  }

  public spawnMartialFlurryVFX(x: number, z: number, angle: number) {
    this.spawnSkillRing(x, z, 0x38bdf8, 3.8, 0.42);
    this.spawnSkillBurst(x + Math.cos(angle) * 1.5, 1.15, z + Math.sin(angle) * 1.5, 0x67e8f9, 18, 4.8, 0.48);
    const group = new THREE.Group();
    group.position.set(x, 1.05, z);
    group.rotation.y = -angle;
    this.vfxGroup.add(group);
    const fistMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0891b2, emissiveIntensity: 2.2, metalness: 0.35, roughness: 0.22, transparent: true, opacity: 0.92 });
    const fistGeos = [new THREE.DodecahedronGeometry(0.42, 0), new THREE.IcosahedronGeometry(0.32, 1)];
    const fists: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const fist = new THREE.Mesh(fistGeos[i % 2], fistMat.clone());
      fist.position.set(0.1 + i * 0.55, (i % 2 ? 0.48 : -0.1), i % 2 ? -0.55 : 0.55);
      fist.rotation.set(i * 0.7, i * 1.1, i * 0.8);
      group.add(fist);
      fists.push(fist);
    }
    const ringGeo = new THREE.TorusGeometry(1.1, 0.055, 7, 28);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.x = 0.5;
    group.add(ring);
    let t = 0;
    const animate = () => {
      t += 0.045;
      group.position.x = x + Math.cos(angle) * t * 4.5;
      group.position.z = z + Math.sin(angle) * t * 4.5;
      fists.forEach((fist, i) => {
        fist.rotation.x += 0.16;
        fist.rotation.y += 0.13;
        fist.position.y = (i % 2 ? 0.48 : -0.1) + Math.sin(t * 18 + i) * 0.1;
        (fist.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.92 * (1 - t));
      });
      ring.rotation.z += 0.18;
      ring.scale.setScalar(1 + t * 0.65);
      ringMat.opacity = Math.max(0, 0.8 * (1 - t));
      if (t < 0.95) this.scheduleVfxFrame(animate);
      else {
        this.vfxGroup.remove(group);
        fistGeos.forEach((geo) => geo.dispose());
        fists.forEach((fist) => (fist.material as THREE.Material).dispose());
        ringGeo.dispose();
        ringMat.dispose();
      }
    };
    this.scheduleVfxFrame(animate);
  }

  // 1. Frost Nova (Katherine Skill 1): magic circle, ice shards, and a radial burst
  public spawnFrostNovaVFX(x: number, z: number) {
    this.spawnSkillRing(x, z, 0x7dd3fc, 5.2, 0.65);
    this.spawnSkillBurst(x, 0.7, z, 0x67e8f9, 26, 5.8, 0.72);
    const vfxGroup = new THREE.Group();
    vfxGroup.position.set(x, 0, z);
    this.vfxGroup.add(vfxGroup);

    // Glowing Frost Circle on Floor
    const circleGeo = new THREE.RingGeometry(0.2, 4.2, 32);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.04;
    vfxGroup.add(circle);

    const crystalGeo = new THREE.OctahedronGeometry(0.88, 0);
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 2.2, metalness: 0.82, roughness: 0.12, transparent: true, opacity: 0.96 });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(0, 1.75, 0);
    vfxGroup.add(crystal);
    const haloGeo = new THREE.TorusGeometry(1.25, 0.055, 8, 40);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 1.75;
    halo.rotation.x = Math.PI / 2;
    vfxGroup.add(halo);

    // 6 Giant Crystalline Ice Spikes bursting up
    const spikeGeo = new THREE.ConeGeometry(0.45, 2.6, 6);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.95,
    });

    const spikes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 2.2 + Math.random() * 0.8;
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(Math.cos(angle) * dist, 0.2, Math.sin(angle) * dist);
      spike.rotation.x = (Math.random() - 0.5) * 0.3;
      spike.rotation.z = (Math.random() - 0.5) * 0.3;
      spike.scale.set(0.1, 0.1, 0.1);
      vfxGroup.add(spike);
      spikes.push(spike);
    }

    let progress = 0;
    const animate = () => {
      progress += 0.04;
      if (progress < 0.3) {
        // Erupting
        const s = progress / 0.3;
        spikes.forEach((sp) => sp.scale.set(s, s * 1.2, s));
        crystal.scale.setScalar(s);
        circleMat.opacity = 0.9;
      } else if (progress < 1.0) {
        // Lingering and shattering
        const fade = (1 - progress) / 0.7;
        circleMat.opacity = fade * 0.8;
        spikes.forEach((sp) => {
          (sp.material as THREE.MeshStandardMaterial).opacity = fade;
          sp.position.y += 0.01;
        });
        crystal.rotation.y += 0.12;
        crystal.rotation.z += 0.06;
        halo.rotation.z += 0.08;
        crystalMat.opacity = fade * 0.96;
        haloMat.opacity = fade * 0.88;
      } else {
        this.vfxGroup.remove(vfxGroup);
        circleGeo.dispose();
        circleMat.dispose();
        spikeGeo.dispose();
        spikeMat.dispose();
        crystalGeo.dispose();
        crystalMat.dispose();
        haloGeo.dispose();
        haloMat.dispose();
        return;
      }
      this.scheduleVfxFrame(animate);
    };
    this.scheduleVfxFrame(animate);
  }

  // 2. Thunderbolt Surge (Katherine Skill 2): Electric lightning bolt with plasma glow
  public spawnThunderBoltVFX(startX: number, startZ: number, endX: number, endZ: number) {
    this.spawnSkillRing(endX, endZ, 0x60a5fa, 2.3, 0.35);
    this.spawnSkillBurst(endX, 0.85, endZ, 0x93c5fd, 20, 6.5, 0.46);
    const points: THREE.Vector3[] = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lx = THREE.MathUtils.lerp(startX, endX, t) + (i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 1.4);
      const lz = THREE.MathUtils.lerp(startZ, endZ, t) + (i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 1.4);
      const ly = 1.3 + (i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 0.8);
      points.push(new THREE.Vector3(lx, ly, lz));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 20, 0.12, 6, false);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const bolt = new THREE.Mesh(geo, mat);
    this.vfxGroup.add(bolt);

    const forkPoints = [
      points[3].clone(),
      points[4].clone().add(new THREE.Vector3(-0.9, 0.35, 0.5)),
      points[5].clone().add(new THREE.Vector3(-1.4, 0.15, -0.7)),
    ];
    const forkGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(forkPoints), 10, 0.055, 5, false);
    const forkMat = new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const fork = new THREE.Mesh(forkGeo, forkMat);
    this.vfxGroup.add(fork);

    let life = 0.22;
    const fade = () => {
      life -= 0.035;
      if (life > 0) {
        mat.opacity = life / 0.22;
        forkMat.opacity = life / 0.22 * 0.9;
        this.scheduleVfxFrame(fade);
      } else {
        this.vfxGroup.remove(bolt);
        this.vfxGroup.remove(fork);
        geo.dispose();
        mat.dispose();
        forkGeo.dispose();
        forkMat.dispose();
      }
    };
    this.scheduleVfxFrame(fade);
  }

  // 3. Meteor Calamity (Katherine Skill 3): Giant blazing meteorite plunging and exploding
  public spawnMeteorVFX(targetX: number, targetZ: number, onImpact: () => void) {
    this.spawnSkillRing(targetX, targetZ, 0xfb923c, 5.8, 0.9);
    this.spawnSkillBurst(targetX, 0.75, targetZ, 0xf97316, 20, 5.4, 0.7);
    const startY = 18;
    const startX = targetX + 7;
    const startZ = targetZ - 10;

    const meteor = new THREE.Group();
    const meteorGeo = new THREE.IcosahedronGeometry(1.1, 1);
    const meteorMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      emissive: 0xf97316,
      emissiveIntensity: 2.4,
      roughness: 0.38,
      metalness: 0.18,
    });
    const meteorCore = new THREE.Mesh(meteorGeo, meteorMat);
    meteor.add(meteorCore);
    const auraGeo = new THREE.SphereGeometry(1.52, 16, 12);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    meteor.add(new THREE.Mesh(auraGeo, auraMat));
    const debrisGeos: THREE.BufferGeometry[] = [];
    const debrisMats: THREE.Material[] = [];
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.TetrahedronGeometry(0.26 + Math.random() * 0.3, 0);
      const mat = new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf97316 : 0x7c2d12, emissive: 0xea580c, emissiveIntensity: 1.8, roughness: 0.45 });
      const shard = new THREE.Mesh(geo, mat);
      const angle = (i / 7) * Math.PI * 2;
      shard.position.set(Math.cos(angle) * 1.12, Math.sin(angle * 1.7) * 0.8, Math.sin(angle) * 1.12);
      shard.rotation.set(angle, angle * 0.7, -angle);
      meteor.add(shard);
      debrisGeos.push(geo);
      debrisMats.push(mat);
    }
    for (let i = 0; i < 2; i++) {
      const ringGeo = new THREE.TorusGeometry(1.25 + i * 0.22, 0.055, 7, 28);
      const ringMat = new THREE.MeshBasicMaterial({ color: i ? 0xfacc15 : 0xffedd5, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(0.8 + i * 0.7, 0.4, i * 0.9);
      meteor.add(ring);
      debrisGeos.push(ringGeo);
      debrisMats.push(ringMat);
    }
    meteor.position.set(startX, startY, startZ);
    this.vfxGroup.add(meteor);

    // Trail particles
    let t = 0;
    const speed = 0.055;
    const step = () => {
      t += speed;
      if (t < 1.0) {
        meteor.position.x = THREE.MathUtils.lerp(startX, targetX, t);
        meteor.position.y = THREE.MathUtils.lerp(startY, 0.5, t);
        meteor.position.z = THREE.MathUtils.lerp(startZ, targetZ, t);
        meteor.rotation.x += 0.06;
        meteor.rotation.y += 0.09;
        if (Math.round(t * 20) % 4 === 0) this.spawnSkillBurst(meteor.position.x, meteor.position.y, meteor.position.z, 0xf97316, 4, 2.2, 0.36);
        this.scheduleVfxFrame(step);
      } else {
        // IMPACT!
        this.vfxGroup.remove(meteor);
        meteorGeo.dispose();
        meteorMat.dispose();
        auraGeo.dispose();
        auraMat.dispose();
        debrisGeos.forEach((geo) => geo.dispose());
        debrisMats.forEach((mat) => mat.dispose());
        this.spawnSkillBurst(targetX, 0.8, targetZ, 0xfb923c, 32, 9.2, 0.8);
        onImpact();

        // Expanding Magma Shockwave Ring
        const ringGeo = new THREE.RingGeometry(0.4, 5.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xf97316,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(targetX, 0.05, targetZ);
        ring.rotation.x = -Math.PI / 2;
        this.vfxGroup.add(ring);

        let rLife = 0.45;
        const fadeRing = () => {
          rLife -= 0.03;
          if (rLife > 0) {
            ring.scale.multiplyScalar(1.06);
            ringMat.opacity = rLife / 0.45;
            this.scheduleVfxFrame(fadeRing);
          } else {
            this.vfxGroup.remove(ring);
            ringGeo.dispose();
            ringMat.dispose();
          }
        };
        this.scheduleVfxFrame(fadeRing);
      }
    };
    this.scheduleVfxFrame(step);
  }

  // 4. Sakura Storm (Ginzo Skill 3): 8 criss-crossing razor slashes & cherry blossom explosion
  public spawnSakuraStormVFX(x: number, z: number) {
    this.spawnSkillRing(x, z, 0xf472b6, 6.2, 0.8);
    this.spawnSkillBurst(x, 1.0, z, 0xf9a8d4, 30, 5.2, 0.9);
    const slashesCount = 8;
    for (let i = 0; i < slashesCount; i++) {
      setTimeout(() => {
        const angle = (i / slashesCount) * Math.PI + (Math.random() - 0.5) * 0.4;
        const offX = (Math.random() - 0.5) * 2.5;
        const offZ = (Math.random() - 0.5) * 2.5;
        this.spawnDimensionalSlashVFX(x + offX, z + offZ, angle);
        this.spawnSkillBurst(x + offX, 1.4, z + offZ, 0xf9a8d4, 6, 3.4, 0.55);
        this.addCameraShake(0.18);
      }, i * 75);
    }
  }

  // 5. Dimensional Slash (Ginzo Skill 1): Hypersonic dimensional rift
  public spawnDimensionalSlashVFX(x: number, z: number, angle: number) {
    const slashGroup = new THREE.Group();
    slashGroup.position.set(x, 1.2, z);
    slashGroup.rotation.y = -angle;
    this.vfxGroup.add(slashGroup);
    const crescent = new THREE.Shape();
    crescent.moveTo(-2.8, -0.34);
    crescent.quadraticCurveTo(-0.25, 0.78, 2.8, 0.28);
    crescent.quadraticCurveTo(0.35, -0.72, -2.8, -0.34);
    crescent.closePath();
    const glowGeo = new THREE.ExtrudeGeometry(crescent, { depth: 0.22, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.14, bevelThickness: 0.1 });
    glowGeo.translate(0, 0, -0.11);
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xbe185d, emissiveIntensity: 1.6, transparent: true, opacity: 0.7, metalness: 0.55, roughness: 0.2, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    slashGroup.add(glow);
    const inner = new THREE.Shape();
    inner.moveTo(-2.55, -0.22);
    inner.quadraticCurveTo(-0.1, 0.53, 2.5, 0.19);
    inner.quadraticCurveTo(0.25, -0.38, -2.55, -0.22);
    inner.closePath();
    const coreGeo = new THREE.ExtrudeGeometry(inner, { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 });
    coreGeo.translate(0, 0, -0.04);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xfff7fb, emissive: 0xf9a8d4, emissiveIntensity: 2.3, transparent: true, opacity: 0.95, metalness: 0.65, roughness: 0.14, side: THREE.DoubleSide });
    const rift = new THREE.Mesh(coreGeo, coreMat);
    rift.position.z = 0.17;
    slashGroup.add(rift);
    const trailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.7, -0.28, 0.28), new THREE.Vector3(-1.35, 0.18, 0.3),
      new THREE.Vector3(0.25, 0.56, 0.3), new THREE.Vector3(2.65, 0.2, 0.28),
    ]);
    const trailGeo = new THREE.TubeGeometry(trailCurve, 24, 0.045, 6, false);
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    slashGroup.add(new THREE.Mesh(trailGeo, trailMat));
    this.spawnSkillBurst(x, 1.0, z, 0xf472b6, 9, 3.2, 0.38);

    let life = 0.22;
    const fade = () => {
      life -= 0.03;
      if (life > 0) {
        slashGroup.scale.x *= 1.045;
        slashGroup.rotation.z += 0.025;
        coreMat.opacity = life / 0.22 * 0.95;
        glowMat.opacity = life / 0.22 * 0.7;
        trailMat.opacity = life / 0.22;
        if (life < 0.12) {
          coreMat.emissive.setHex(0xffffff);
          glowMat.emissive.setHex(0x7c3aed);
        }
        this.scheduleVfxFrame(fade);
      } else {
        this.vfxGroup.remove(slashGroup);
        [glowGeo, coreGeo, trailGeo].forEach((geo) => geo.dispose());
        [glowMat, coreMat, trailMat].forEach((mat) => mat.dispose());
      }
    };
    this.scheduleVfxFrame(fade);
  }

  // 6. Dragon Ascension (Quan Skill 3): Spiraling celestial golden vortex
  public spawnDragonAscensionVFX(x: number, z: number) {
    this.spawnSkillRing(x, z, 0xfbbf24, 5.4, 0.72);
    this.spawnSkillBurst(x, 1.0, z, 0xfbbf24, 28, 6.2, 0.82);
    const group = new THREE.Group();
    group.position.set(x, 0.1, z);
    this.vfxGroup.add(group);

    const helixPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const angle = t * Math.PI * 4.5;
      const radius = 1.15 - t * 0.35;
      helixPoints.push(new THREE.Vector3(Math.cos(angle) * radius, 0.25 + t * 4.2, Math.sin(angle) * radius));
    }
    const helixGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPoints), 80, 0.13, 8, false);
    const helixMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 2.6, metalness: 0.68, roughness: 0.18, transparent: true, opacity: 0.95 });
    const helix = new THREE.Mesh(helixGeo, helixMat);
    group.add(helix);
    const dragonHeadGeo = new THREE.IcosahedronGeometry(0.38, 1);
    const dragonHeadMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfbbf24, emissiveIntensity: 2.8, metalness: 0.65, roughness: 0.2 });
    const dragonHead = new THREE.Mesh(dragonHeadGeo, dragonHeadMat);
    dragonHead.position.set(0, 4.45, -0.2);
    group.add(dragonHead);
    const hornGeo = new THREE.ConeGeometry(0.12, 0.48, 6);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfbbf24, emissiveIntensity: 1.8 });
    const horns = [-1, 1].map((side) => {
      const horn = new THREE.Mesh(hornGeo, hornMat.clone());
      horn.position.set(side * 0.28, 4.72, -0.22);
      horn.rotation.z = side * 0.5;
      group.add(horn);
      return horn;
    });

    const ringCount = 4;
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < ringCount; i++) {
      const rGeo = new THREE.RingGeometry(1.2 + i * 0.7, 1.6 + i * 0.7, 32);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.y = 0.2 + i * 0.8;
      rMesh.rotation.x = -Math.PI / 2;
      group.add(rMesh);
      rings.push(rMesh);
    }

    let t = 0;
    const spin = () => {
      t += 0.04;
      group.rotation.y += 0.075;
      dragonHead.rotation.z = Math.sin(t * 9) * 0.12;
      helixMat.opacity = Math.max(0, 0.95 * (1 - t / 0.8));
      rings.forEach((r, idx) => {
        r.rotation.z += 0.15 * (idx % 2 === 0 ? 1 : -1);
        r.position.y += 0.06;
        (r.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t / 0.8);
      });
      if (t < 0.8) {
        this.scheduleVfxFrame(spin);
      } else {
        this.vfxGroup.remove(group);
        helixGeo.dispose();
        helixMat.dispose();
        dragonHeadGeo.dispose();
        dragonHeadMat.dispose();
        hornGeo.dispose();
        hornMat.dispose();
        horns.forEach((horn) => (horn.material as THREE.Material).dispose());
        rings.forEach((r) => {
          r.geometry.dispose();
          (r.material as THREE.Material).dispose();
        });
      }
    };
    this.scheduleVfxFrame(spin);
  }

  // Ground Shockwave (Greatsword combo finisher)
  public spawnGroundShockwaveVFX(x: number, z: number, radius: number = 3.2) {
    const geo = new THREE.RingGeometry(0.2, radius, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.05, z);
    this.vfxGroup.add(mesh);

    let t = 0;
    const expand = () => {
      t += 0.05;
      mesh.scale.set(1 + t * 0.8, 1 + t * 0.8, 1);
      mat.opacity = Math.max(0, 0.9 - t);
      if (t < 0.9) {
        this.scheduleVfxFrame(expand);
      } else {
        this.vfxGroup.remove(mesh);
        geo.dispose();
        mat.dispose();
      }
    };
    this.scheduleVfxFrame(expand);
  }

  // Whirlwind Spin VFX (Daggers / spinning attacks)
  public spawnWhirlwindVFX(x: number, z: number, radius: number = 2.8) {
    const group = new THREE.Group();
    group.position.set(x, 0.2, z);
    this.vfxGroup.add(group);

    const ringCount = 3;
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < ringCount; i++) {
      const geo = new THREE.RingGeometry(radius * 0.6, radius, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = i * 0.3;
      group.add(mesh);
      rings.push(mesh);
    }

    let t = 0;
    const spin = () => {
      t += 0.05;
      rings.forEach((r, idx) => {
        r.rotation.z += 0.2 * (idx % 2 === 0 ? 1 : -1);
        r.scale.set(1 + t * 0.4, 1 + t * 0.4, 1);
        (r.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - t);
      });
      if (t < 0.7) {
        this.scheduleVfxFrame(spin);
      } else {
        this.vfxGroup.remove(group);
        rings.forEach((r) => {
          r.geometry.dispose();
          (r.material as THREE.Material).dispose();
        });
      }
    };
    this.scheduleVfxFrame(spin);
  }

  /**
   * Ground telegraph warning indicator before major active skills impact.
   * Renders an expanding/pulsing glowing decal on the floor so combat is readable.
   */
  public spawnGroundTelegraph(
    x: number, z: number, radius: number, duration: number = 0.45, color: number = 0xf59e0b,
    shape: 'circle' | 'line' | 'cone' = 'circle', angle: number = 0, length: number = 7
  ) {
    const group = new THREE.Group(); group.position.set(x, 0.045, z);
    if (shape === 'cone') group.rotation.y = -angle;
    this.vfxGroup.add(group);
    const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], animated: THREE.Mesh[] = [];
    if (shape === 'line') {
      const geo = new THREE.BoxGeometry(length, 0.035, Math.max(0.35, radius * 0.5));
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false });
      const line = new THREE.Mesh(geo, mat); line.position.set(Math.cos(angle) * length / 2, 0.02, Math.sin(angle) * length / 2); line.rotation.y = -angle; group.add(line);
      geos.push(geo); mats.push(mat);
      const arrowGeo = new THREE.ConeGeometry(0.22, 0.8, 4);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat); arrow.position.set(Math.cos(angle) * length, 0.45, Math.sin(angle) * length); arrow.rotation.z = -Math.PI / 2; arrow.rotation.y = -angle; group.add(arrow);
      geos.push(arrowGeo); mats.push(arrowMat); animated.push(arrow);
    } else if (shape === 'cone') {
      const wedge = new THREE.Shape(); wedge.moveTo(0.45, -0.1); wedge.lineTo(length, -radius * 0.7);
      wedge.quadraticCurveTo(length * 0.78, 0, length, radius * 0.7); wedge.lineTo(0.45, 0.1); wedge.closePath();
      const wedgeGeo = new THREE.ShapeGeometry(wedge, 18);
      const wedgeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const wedgeMesh = new THREE.Mesh(wedgeGeo, wedgeMat); wedgeMesh.rotation.x = -Math.PI / 2; group.add(wedgeMesh); geos.push(wedgeGeo); mats.push(wedgeMat);
      const coords: number[] = [];
      for (const side of [-1, 1]) coords.push(0.45, 0.07, side * 0.1, length, 0.07, side * radius * 0.7);
      const edgeGeo = new THREE.BufferGeometry(); edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.84, blending: THREE.AdditiveBlending, depthWrite: false });
      group.add(new THREE.LineSegments(edgeGeo, edgeMat)); geos.push(edgeGeo); mats.push(edgeMat);
    } else {
      const outerGeo = new THREE.RingGeometry(radius * 0.88, radius, 32), innerGeo = new THREE.CircleGeometry(radius * 0.82, 24);
      const outerMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const innerMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const outer = new THREE.Mesh(outerGeo, outerMat), inner = new THREE.Mesh(innerGeo, innerMat);
      outer.rotation.x = inner.rotation.x = -Math.PI / 2; group.add(outer, inner);
      geos.push(outerGeo, innerGeo); mats.push(outerMat, innerMat);
      const points: number[] = [];
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, r1 = radius * (i % 3 === 0 ? 0.68 : 0.77), r2 = radius * (i % 3 === 0 ? 0.92 : 0.87);
        points.push(Math.cos(a) * r1, 0.075, Math.sin(a) * r1, Math.cos(a) * r2, 0.075, Math.sin(a) * r2);
      }
      const markGeo = new THREE.BufferGeometry(); markGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      const markMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.84, blending: THREE.AdditiveBlending, depthWrite: false });
      group.add(new THREE.LineSegments(markGeo, markMat)); geos.push(markGeo); mats.push(markMat);
      const spikeGeo = new THREE.ConeGeometry(0.16, 0.52, 4);
      const spikeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
      geos.push(spikeGeo); mats.push(spikeMat);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(Math.cos(a) * radius * 0.69, 0.26, Math.sin(a) * radius * 0.69); spike.rotation.z = Math.cos(a) * 0.18;
        spike.scale.set(0.45, 0.2, 0.45); group.add(spike); animated.push(spike);
      }
      animated.push(outer, inner);
    }
    const started = performance.now(), opacities = mats.map(m => (m as THREE.Material & { opacity?: number }).opacity ?? 1);
    const animate = (now: number) => {
      const p = Math.min(1, (now - started) / Math.max(1, duration * 1000)), pulse = 0.88 + Math.sin((now - started) * 0.025) * 0.12;
      group.scale.set(pulse, 1, pulse);
      mats.forEach((mat, i) => { (mat as THREE.Material & { opacity?: number }).opacity = opacities[i] * (1 - p * 0.5); });
      animated.forEach((mesh) => { if (mesh.geometry instanceof THREE.ConeGeometry) { mesh.scale.y = 0.2 + Math.sin(p * Math.PI) * 0.7; (mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - p); } });
      if (p < 1 && !this.disposed) this.scheduleVfxFrame(animate);
      else { group.removeFromParent(); new Set(geos).forEach(g => g.dispose()); new Set(mats).forEach(m => m.dispose()); }
    };
    this.scheduleVfxFrame(animate);
  }

  /**
   * Ginzo Skill 3: Zero-Frame Severance (ดาบตัดมิติศูนย์เฟรม)
   * High-speed dimensional cut piercing between two points with silver-pink seam and vacuum rift
   */
  public spawnZeroFrameSeveranceVFX(startX: number, startZ: number, endX: number, endZ: number) {
    const group = new THREE.Group();
    group.position.set((startX + endX) / 2, 1.1, (startZ + endZ) / 2);
    const angle = Math.atan2(endZ - startZ, endX - startX);
    group.rotation.y = -angle;
    this.vfxGroup.add(group);

    const dist = Math.hypot(endX - startX, endZ - startZ);
    const slashGeo = new THREE.PlaneGeometry(dist, 1.2);
    const slashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const slash = new THREE.Mesh(slashGeo, slashMat);
    group.add(slash);

    const riftGeo = new THREE.PlaneGeometry(dist * 1.05, 0.22);
    const riftMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rift = new THREE.Mesh(riftGeo, riftMat);
    rift.position.y = 0.02;
    group.add(rift);

    // Cross slivers along the line
    const sliverGeo = new THREE.ConeGeometry(0.18, 1.4, 4);
    const sliverMat = new THREE.MeshBasicMaterial({
      color: 0xfbcfe8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const slivers: THREE.Mesh[] = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const s = new THREE.Mesh(sliverGeo, sliverMat);
      s.position.set(-dist / 2 + (i + 0.5) * (dist / count), 0, (Math.random() - 0.5) * 0.4);
      s.rotation.z = Math.PI / 4 * (i % 2 === 0 ? 1 : -1);
      group.add(s);
      slivers.push(s);
    }

    this.spawnSkillBurst(startX, 1.0, startZ, 0xffffff, 14, 5.2, 0.45);
    this.spawnSkillBurst(endX, 1.0, endZ, 0xf43f5e, 26, 7.8, 0.65);
    this.spawnSkillRing(endX, endZ, 0xf472b6, 4.6, 0.55);

    let life = 0.28;
    const fade = () => {
      life -= 0.035;
      if (life > 0 && !this.disposed) {
        slashMat.opacity = life / 0.28;
        riftMat.opacity = life / 0.28 * 0.95;
        sliverMat.opacity = life / 0.28 * 0.85;
        slash.scale.y = 1 + (1 - life / 0.28) * 2.5;
        this.scheduleVfxFrame(fade);
      } else {
        this.vfxGroup.remove(group);
        slashGeo.dispose();
        slashMat.dispose();
        riftGeo.dispose();
        riftMat.dispose();
        sliverGeo.dispose();
        sliverMat.dispose();
      }
    };
    this.scheduleVfxFrame(fade);
  }

  /**
   * Quan Skill 1: Heaven Drum Palm (ฝ่ามือกลองสวรรค์)
   * Concentrated cyan and gold sonic shockwave rings bursting forward
   */
  public spawnHeavenDrumPalmVFX(x: number, z: number, angle: number) {
    this.spawnSkillRing(x, z, 0x38bdf8, 3.8, 0.45);
    const group = new THREE.Group();
    group.position.set(x, 1.1, z);
    group.rotation.y = -angle;
    this.vfxGroup.add(group);

    const ringCount = 3;
    const rings: THREE.Mesh[] = [];
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];

    for (let i = 0; i < ringCount; i++) {
      const geo = new THREE.TorusGeometry(0.7 + i * 0.45, 0.08, 8, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xfacc15 : 0x38bdf8,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.x = 0.4 + i * 0.8;
      group.add(ring);
      rings.push(ring);
      geos.push(geo);
      mats.push(mat);
    }

    this.spawnSkillBurst(x + Math.cos(angle) * 2.2, 1.1, z + Math.sin(angle) * 2.2, 0x38bdf8, 18, 6.2, 0.42);

    let progress = 0;
    const animate = () => {
      progress += 0.055;
      group.position.x = x + Math.cos(angle) * progress * 5.2;
      group.position.z = z + Math.sin(angle) * progress * 5.2;
      rings.forEach((r, idx) => {
        r.scale.multiplyScalar(1.06);
        (r.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 * (1 - progress));
      });
      if (progress < 1.0 && !this.disposed) {
        this.scheduleVfxFrame(animate);
      } else {
        this.vfxGroup.remove(group);
        geos.forEach((g) => g.dispose());
        mats.forEach((m) => m.dispose());
      }
    };
    this.scheduleVfxFrame(animate);
  }

  /**
   * Quan Skill 2: Jade Dragon Spiral (มังกรหยกหมุนวน)
   * Orbiting jade dragon energy helix circling around Quan with vacuum spiral rings
   */
  public spawnJadeDragonSpiralVFX(x: number, z: number, radius: number = 4.8) {
    this.spawnSkillRing(x, z, 0x34d399, radius, 0.65);
    const group = new THREE.Group();
    group.position.set(x, 0.35, z);
    this.vfxGroup.add(group);

    const coilPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const turn = t * Math.PI * 4;
      const r = radius * 0.55 * (1 - t * 0.25);
      coilPoints.push(new THREE.Vector3(Math.cos(turn) * r, 0.3 + t * 2.2, Math.sin(turn) * r));
    }
    const coilGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPoints), 64, 0.12, 8, false);
    const coilMat = new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x10b981,
      emissiveIntensity: 2.8,
      metalness: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.95,
    });
    const coil = new THREE.Mesh(coilGeo, coilMat);
    group.add(coil);

    const ringGeo = new THREE.RingGeometry(radius * 0.4, radius, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    let t = 0;
    const spin = () => {
      t += 0.045;
      group.rotation.y += 0.16;
      coilMat.opacity = Math.max(0, 0.95 * (1 - t));
      ringMat.opacity = Math.max(0, 0.65 * (1 - t));
      ring.scale.setScalar(1 + t * 0.3);
      if (t < 1.0 && !this.disposed) {
        this.scheduleVfxFrame(spin);
      } else {
        this.vfxGroup.remove(group);
        coilGeo.dispose();
        coilMat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
      }
    };
    this.scheduleVfxFrame(spin);
  }

  /**
   * Hero-Specific 3D Hybrid Combo VFX
   * Renders the distinctive Three.js 3D layers matching user prompt specifications
   */
  public spawnHeroComboVFX(heroId: 'ginzo' | 'quan' | 'katherine', step: number, x: number, z: number, angle: number) {
    if (heroId === 'ginzo') {
      if (step === 1) {
        // Combo 1: Silver Moon — silver crescent slash & pink sparks
        this.spawnSkillBurst(x, 1.1, z, 0xf1f5f9, 7, 3.4, 0.26);
        this.spawnSkillBurst(x, 1.1, z, 0xf472b6, 4, 2.2, 0.22);
      } else if (step === 2) {
        // Combo 2: Rose Cross Rift — dual intersecting cross rift
        this.spawnSkillBurst(x, 1.1, z, 0xf43f5e, 10, 3.8, 0.3);
        this.spawnGroundShockwaveVFX(x, z, 2.2);
      } else {
        // Combo 3: Abyssal Crescent — deep dimensional rift, ground shockwave, sakura storm petals
        this.spawnDimensionalSlashVFX(x, z, angle);
        this.spawnGroundShockwaveVFX(x, z, 3.6);
        this.spawnSkillBurst(x, 1.2, z, 0xf9a8d4, 18, 4.6, 0.48);
        this.addCameraShake(0.32);
      }
    } else if (heroId === 'quan') {
      if (step === 1) {
        // Combo 1: Jade Pulse — cyan/gold punch burst
        this.spawnSkillBurst(x, 1.0, z, 0x38bdf8, 8, 3.2, 0.28);
        this.spawnSkillBurst(x, 1.0, z, 0xfacc15, 6, 2.8, 0.25);
      } else if (step === 2) {
        // Combo 2: Azure Dragon Orbit — surrounding dragon swirl ring
        this.spawnWhirlwindVFX(x, z, 2.6);
        this.spawnSkillBurst(x, 1.0, z, 0x22d3ee, 12, 3.6, 0.32);
      } else {
        // Combo 3: Sky-Rising Dragon — golden ascension dragon silhouette & shockwave
        this.spawnDragonAscensionVFX(x, z);
        this.spawnGroundShockwaveVFX(x, z, 4.2);
        this.addCameraShake(0.38);
      }
    } else if (heroId === 'katherine') {
      if (step === 1) {
        // Combo 1: Frost Shard — crystalline ice projectile trail
        this.spawnSkillBurst(x, 1.2, z, 0x7dd3fc, 9, 3.8, 0.32);
        this.spawnSkillBurst(x, 1.2, z, 0xffffff, 6, 2.5, 0.24);
      } else if (step === 2) {
        // Combo 2: Storm Relay — branching electric storm discharge
        this.spawnThunderBoltVFX(x - Math.cos(angle) * 0.8, z - Math.sin(angle) * 0.8, x + Math.cos(angle) * 3.2, z + Math.sin(angle) * 3.2);
        this.spawnSkillBurst(x, 1.2, z, 0xa78bfa, 12, 4.5, 0.35);
      } else {
        // Combo 3: Astral Convergence — crystal flare & violet thunder burst
        this.spawnFrostNovaVFX(x, z);
        this.spawnSkillRing(x, z, 0xa855f7, 4.8, 0.55);
        this.spawnSkillBurst(x, 1.3, z, 0xc084fc, 22, 5.8, 0.55);
        this.addCameraShake(0.36);
      }
    }
  }

  private buildAmbientParticles() {
    const count = this.graphicsQuality === 'low' ? 16 : this.graphicsQuality === 'balanced' ? 40 : 80;
    const geo = new THREE.BufferGeometry();
    this.petalPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.petalPositions[i * 3 + 0] = (Math.random() - 0.5) * 32;
      this.petalPositions[i * 3 + 1] = 0.5 + Math.random() * 6;
      this.petalPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.petalPositions, 3));

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const pCtx = pCanvas.getContext('2d')!;
    pCtx.fillStyle = '#38bdf8';
    pCtx.beginPath();
    pCtx.arc(8, 8, 6, 0, Math.PI * 2);
    pCtx.fill();

    const pTex = new THREE.CanvasTexture(pCanvas);
    const pMat = new THREE.PointsMaterial({
      size: 0.3,
      map: pTex,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.petalParticles = new THREE.Points(geo, pMat);
    this.scene.add(this.petalParticles);
  }

  private scheduleVfxFrame(task: (now: number) => void) {
    if (this.disposed) return;
    this.vfxFrameTasks.add(task);
  }

  private flushVfxFrameTasks = (now: number) => {
    const tasks = this.vfxTaskScratch;
    tasks.length = 0;
    for (const task of this.vfxFrameTasks) tasks.push(task);
    this.vfxFrameTasks.clear();
    for (const task of tasks) {
      try { task(now); } catch (error) { console.error('[ArenaScene] VFX animation failed', error); }
    }
    tasks.length = 0;
  };;

  private get maxActiveCombatParticles() {
    return this.graphicsQuality === 'low' ? 44 : this.graphicsQuality === 'balanced' ? 96 : 160;
  }

  private scaleParticleCount(count: number) {
    if (count <= 4 || this.graphicsQuality === 'high') return count;
    const multiplier = this.graphicsQuality === 'low' ? 0.35 : 0.65;
    return Math.max(2, Math.round(count * multiplier));
  }

  private createParticleMesh(width: number, height: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(this.particleQuadGeometry, material);
    mesh.userData.particleBaseWidth = width;
    mesh.userData.particleBaseHeight = height;
    return mesh;
  }

  private disposeParticleMesh(mesh: THREE.Mesh) {
    if (mesh.geometry !== this.particleQuadGeometry) mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => material.dispose());
  }

  private addCombatParticle(particle: CombatParticle) {
    if (this.disposed || this.activeParticles.length >= this.maxActiveCombatParticles) {
      this.disposeParticleMesh(particle.mesh);
      return;
    }
    this.vfxGroup.add(particle.mesh);
    this.activeParticles.push(particle);
  }

  private removeCombatParticle(index: number) {
    const [particle] = this.activeParticles.splice(index, 1);
    if (!particle) return;
    this.vfxGroup.remove(particle.mesh);
    this.disposeParticleMesh(particle.mesh);
  }

  public clearTransientVFX() {
    this.vfxFrameTasks.clear();
    this.vfxTaskScratch.length = 0;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const collect = (root: THREE.Object3D) => {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
        const renderable = object as THREE.Mesh | THREE.Line | THREE.Points;
        if (renderable.geometry !== this.particleQuadGeometry) geometries.add(renderable.geometry as THREE.BufferGeometry);
        const material = renderable.material as THREE.Material | THREE.Material[];
        (Array.isArray(material) ? material : [material]).forEach((entry) => materials.add(entry));
      });
    };
    collect(this.vfxGroup);
    collect(this.telegraphGroup);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.vfxGroup.clear();
    this.telegraphGroup.clear();
    this.activeParticles.length = 0;
  }

  public setPortalActive(active: boolean) {
    this.isPortalActive = active;
    if (this.portalMesh) {
      const portalPlane = this.portalMesh.children.find((c) => c instanceof THREE.Mesh && (c.material as any).opacity !== undefined);
      if (portalPlane) {
        (portalPlane as THREE.Mesh).visible = active;
      }
    }
  }

  public addCameraShake(intensity: number = 0.3) {
    this.cameraShake = Math.min(this.cameraShake + intensity, 0.8);
  }

  // ----------------------------------------------------------------------
  // UNIFORM HIGH-OVERHEAD CAMERA CONTROLLER (LOBBY & DUNGEON SHARE THE SAME ANGLE!)
  // Directly fulfills user request: "อยากให้ตอนเข้าด่านมุมมองเหมือน lobby"
  // ----------------------------------------------------------------------
  // ----------------------------------------------------------------------
  // DYNAMIC COMBAT VFX & PARTICLES
  // ----------------------------------------------------------------------
  public getSparkTexture(): THREE.CanvasTexture {
    if (!this.sparkTex) this.sparkTex = generateSparkTexture();
    return this.sparkTex;
  }

  public getHitFlashTexture(): THREE.CanvasTexture {
    if (!this.hitFlashTex) this.hitFlashTex = generateHitFlashTexture();
    return this.hitFlashTex;
  }

  public getShockwaveRingTexture(): THREE.CanvasTexture {
    if (!this.shockwaveRingTex) this.shockwaveRingTex = generateShockwaveRingTexture();
    return this.shockwaveRingTex;
  }

  /**
   * Pixel-crisp impact bursts, flying sparks, and a short ground ring on heavy hits.
   */
  public spawnHitImpactVFX(
    x: number,
    y: number,
    z: number,
    isCrit: boolean = false,
    isHeavy: boolean = false,
    themeColor?: number
  ) {
    const flashTex = this.getHitFlashTexture();
    const sparkTex = this.getSparkTexture();

    // 1. Radiant 4-Point Starburst Flash at Impact Point
    const starGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const starMat = new THREE.MeshBasicMaterial({
      map: flashTex,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.position.set(x, y + 0.1, z);
    starMesh.rotation.x = -Math.PI / 4;
    starMesh.rotation.z = Math.random() * Math.PI;
    const starScale = isCrit ? 1.55 : isHeavy ? 1.12 : 0.78;
    starMesh.scale.set(starScale, starScale, 1);
    this.vfxGroup.add(starMesh);

    let flashLife = 0.14;
    const fadeStar = () => {
      flashLife -= 0.025;
      if (flashLife > 0) {
        starMesh.scale.multiplyScalar(0.92);
        starMat.opacity = flashLife / 0.14;
        this.scheduleVfxFrame(fadeStar);
      } else {
        this.vfxGroup.remove(starMesh);
        starGeo.dispose();
        starMat.dispose();
      }
    };
    this.scheduleVfxFrame(fadeStar);

    // 2. Kinetic Glowing Spark Particles (Burst outward)
    const count = this.scaleParticleCount(isCrit ? 14 : isHeavy ? 9 : 5);
    const baseColors = isCrit
      ? [0xfef08a, 0xfacc15, 0xfbbf24, 0xef4444]
      : themeColor
      ? [themeColor, 0xffffff, 0xffd166]
      : [0xfef08a, 0xfbbf24, 0xffffff];

    for (let i = 0; i < count && this.activeParticles.length < this.maxActiveCombatParticles; i++) {
      const col = baseColors[Math.floor(Math.random() * baseColors.length)];
      const pMat = new THREE.MeshBasicMaterial({
        map: sparkTex,
        color: col,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const pMesh = this.createParticleMesh(0.24, 0.38, pMat);
      pMesh.position.set(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, z + (Math.random() - 0.5) * 0.2);
      pMesh.rotation.set(-Math.PI / 3, 0, Math.random() * Math.PI);

      const angle = Math.random() * Math.PI * 2;
      const speed = (isCrit ? 6.5 : 4.5) + Math.random() * 4.0;
      const p: CombatParticle = {
        mesh: pMesh,
        vx: Math.cos(angle) * speed,
        vy: 3.5 + Math.random() * 5.0,
        vz: Math.sin(angle) * speed,
        gravity: 14.0,
        drag: 3.5,
        life: 0.28 + Math.random() * 0.2,
        maxLife: 0.45,
        initialScale: (isCrit ? 1.15 : isHeavy ? 0.85 : 0.6) + Math.random() * 0.28,
        shrink: true,
        spin: (Math.random() - 0.5) * 12,
      };
      this.addCombatParticle(p);
    }

    // 3. Ground Shockwave Ring on Crits or Heavy Finisher
    if (isCrit || isHeavy) {
      const ringGeo = new THREE.PlaneGeometry(3.2, 3.2);
      const ringMat = new THREE.MeshBasicMaterial({
        map: this.getShockwaveRingTexture(),
        color: isCrit ? 0xfacc15 : 0xf9a8d4,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x, 0.04, z);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.scale.set(0.3, 0.3, 1);
      this.vfxGroup.add(ringMesh);

      let ringLife = 0.24;
      const maxRingLife = 0.24;
      const expandRing = () => {
        ringLife -= 0.025;
        if (ringLife > 0) {
          const prog = 1 - ringLife / maxRingLife;
          const sc = 0.3 + prog * (isCrit ? 3.0 : 2.4);
          ringMesh.scale.set(sc, sc, 1);
          ringMat.opacity = Math.max(0, (ringLife / maxRingLife) * 0.95);
          this.scheduleVfxFrame(expandRing);
        } else {
          this.vfxGroup.remove(ringMesh);
          ringGeo.dispose();
          ringMat.dispose();
        }
      };
      this.scheduleVfxFrame(expandRing);
    }
  }

  /**
   * Projectile explosive detonation burst
   */
  public spawnProjectileExplosionVFX(x: number, y: number, z: number, colorHex: number | string = 0xfacc15) {
    const sparkTex = this.getSparkTexture();
    const numParticles = this.scaleParticleCount(14);
    const colVal = typeof colorHex === 'string' ? new THREE.Color(colorHex).getHex() : colorHex;

    for (let i = 0; i < numParticles && this.activeParticles.length < this.maxActiveCombatParticles; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: sparkTex,
        color: colVal,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = this.createParticleMesh(0.38, 0.38, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.x = -Math.PI / 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = 4.0 + Math.random() * 5.0;

      const p: CombatParticle = {
        mesh,
        vx: Math.cos(theta) * Math.cos(phi) * speed,
        vy: Math.sin(phi) * speed + 2.0,
        vz: Math.sin(theta) * Math.cos(phi) * speed,
        gravity: 9.0,
        drag: 3.2,
        life: 0.32 + Math.random() * 0.16,
        maxLife: 0.48,
        initialScale: 1.1 + Math.random() * 0.5,
        shrink: true,
        spin: (Math.random() - 0.5) * 8,
      };
      this.addCombatParticle(p);
    }
  }

  /**
   * Dark soul disintegrating fire embers floating upwards when enemy is defeated
   */
  public spawnEnemyDeathVFX(x: number, y: number, z: number) {
    const sparkTex = this.getSparkTexture();
    const count = this.scaleParticleCount(20);
    const colors = [0xa855f7, 0xec4899, 0xef4444, 0x3b82f6];

    for (let i = 0; i < count && this.activeParticles.length < this.maxActiveCombatParticles; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshBasicMaterial({
        map: sparkTex,
        color: col,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = this.createParticleMesh(0.42, 0.42, mat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.8, y + Math.random() * 0.5, z + (Math.random() - 0.5) * 0.8);
      mesh.rotation.x = -Math.PI / 3;

      const ang = Math.random() * Math.PI * 2;
      const spd = 1.0 + Math.random() * 2.5;

      const p: CombatParticle = {
        mesh,
        vx: Math.cos(ang) * spd,
        vy: 3.2 + Math.random() * 3.5, // Ascending soul embers
        vz: Math.sin(ang) * spd,
        gravity: -2.2, // Floats upward
        drag: 1.6,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        initialScale: 1.2 + Math.random() * 0.6,
        shrink: true,
        spin: (Math.random() - 0.5) * 10,
      };
      this.addCombatParticle(p);
    }

    // Expanding soul glyph ring
    const ringGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const ringMat = new THREE.MeshBasicMaterial({
      map: this.getShockwaveRingTexture(),
      color: 0xa855f7,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(x, 0.03, z);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.scale.set(0.4, 0.4, 1);
    this.vfxGroup.add(ringMesh);

    let life = 0.38;
    const fade = () => {
      life -= 0.03;
      if (life > 0) {
        const sc = 0.4 + (1 - life / 0.38) * 2.2;
        ringMesh.scale.set(sc, sc, 1);
        ringMat.opacity = (life / 0.38) * 0.85;
        this.scheduleVfxFrame(fade);
      } else {
        this.vfxGroup.remove(ringMesh);
        ringGeo.dispose();
        ringMat.dispose();
      }
    };
    this.scheduleVfxFrame(fade);
  }

  public spawnHappyCoinBurst(x: number, z: number) {
    const coinCount = this.graphicsQuality === 'low' ? 5 : this.graphicsQuality === 'balanced' ? 7 : 10;
    for (let i = 0; i < coinCount && this.activeParticles.length < this.maxActiveCombatParticles; i++) {
      const gold = i % 3 !== 0;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(gold ? 0.16 : 0.2, 8, 6),
        new THREE.MeshStandardMaterial({ color: gold ? 0xfbbf24 : 0xf472b6, emissive: gold ? 0xf59e0b : 0xec4899, emissiveIntensity: 0.45 })
      );
      mesh.position.set(x, 0.3, z);
      const angle = (Math.PI * 2 * i) / coinCount;
      const speed = 1.4 + Math.random() * 1.2;
      this.addCombatParticle({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 3.2 + Math.random() * 1.8,
        vz: Math.sin(angle) * speed,
        gravity: -6.5,
        drag: 0.5,
        life: 0.85 + Math.random() * 0.25,
        maxLife: 1.1,
        initialScale: 1,
        shrink: true,
        spin: (Math.random() - 0.5) * 12,
      });
    }
  }

  /**
   * Ambient status effect particles (Burn flames, freeze vapor, poison bubbles)
   */
  public spawnStatusSparks(x: number, y: number, z: number, type: 'burn' | 'freeze' | 'poison') {
    if (this.activeParticles.length >= this.maxActiveCombatParticles) return;
    const sparkTex = this.getSparkTexture();
    const col = type === 'burn' ? 0xf97316 : type === 'freeze' ? 0x38bdf8 : 0x22c55e;
    const mat = new THREE.MeshBasicMaterial({
      map: sparkTex,
      color: col,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = this.createParticleMesh(0.26, 0.26, mat);
    mesh.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.3 + Math.random() * 0.8, z + (Math.random() - 0.5) * 0.6);
    mesh.rotation.x = -Math.PI / 3;

    const p: CombatParticle = {
      mesh,
      vx: (Math.random() - 0.5) * 1.2,
      vy: type === 'burn' ? 2.5 : type === 'freeze' ? 0.6 : 1.8,
      vz: (Math.random() - 0.5) * 1.2,
      gravity: type === 'burn' ? -1.5 : 0.8,
      drag: 2.0,
      life: 0.38,
      maxLife: 0.38,
      initialScale: 0.8,
      shrink: true,
      spin: (Math.random() - 0.5) * 6,
    };
    this.addCombatParticle(p);
  }

  public update(dt: number, heroX: number, heroZ: number) {
    this.flushVfxFrameTasks(performance.now());
    const isLobby = this.currentTheme === 'lobby';

    // Keep the lobby framed from above so its walkable room reads like a pixel RPG hub.
    const targetFov = isLobby ? 42 : 48;
    if (this.camera.fov !== targetFov) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    if (isLobby) {
      // 1. LOBBY: Grand overhead lounge view
      this.targetCamX = THREE.MathUtils.clamp(heroX * 0.45, -5, 5);
      this.targetCamZ = THREE.MathUtils.clamp(heroZ * 0.35 + 10.5, 7, 13);

      const camLerp = 1 - Math.exp(-6 * dt);
      this.camera.position.x += (this.targetCamX - this.camera.position.x) * camLerp;
      this.camera.position.y += (21 - this.camera.position.y) * camLerp;
      this.camera.position.z += (this.targetCamZ - this.camera.position.z) * camLerp;

      this.camera.lookAt(this.camera.position.x * 0.6, 0.5, heroZ * 0.25);

    } else {
      // 2. DUNGEON: keep the hero centered while the camera scrolls through the arena.
      this.targetCamX = heroX;
      this.targetCamZ = heroZ + 18.5;

      const camLerp = 1 - Math.exp(-8.5 * dt);
      this.camera.position.x += (this.targetCamX - this.camera.position.x) * camLerp;
      this.camera.position.y += (18 - this.camera.position.y) * camLerp;
      this.camera.position.z += (this.targetCamZ - this.camera.position.z) * camLerp;

      // Camera Shake Decay
      if (this.cameraShake > 0.001) {
        const shakeX = (Math.random() - 0.5) * this.cameraShake * 1.2;
        const shakeY = (Math.random() - 0.5) * this.cameraShake * 1.2;
        this.camera.position.x += shakeX;
        this.camera.position.y = (isLobby ? 21 : 18) + shakeY;
        this.cameraShake *= Math.exp(-10 * dt);
      } else {
        this.camera.position.y = isLobby ? 21 : 18;
        this.cameraShake = 0;
      }

      this.camera.lookAt(heroX, 0.5, heroZ);
    }

    // Lantern Flickering
    const time = performance.now() * 0.005;
    if (this.bossAltarGroup) {
      const altarData = this.bossAltarGroup.userData;
      const pulse = 0.5 + (Math.sin(time * 1.2) + 1) * 0.25;
      (altarData.rings as THREE.Mesh[]).forEach((ring, index) => {
        ring.rotation.z += dt * (index === 0 ? 0.12 : -0.16);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.38 + pulse * 0.36;
      });
      (altarData.shards as THREE.Mesh[]).forEach((shard) => {
        shard.position.y = shard.userData.baseY + Math.sin(time * 1.5 + shard.userData.phase) * 0.12;
        shard.rotation.y += dt * 0.8;
      });
      (altarData.beams as THREE.Mesh[]).forEach((beam, index) => {
        (beam.material as THREE.MeshBasicMaterial).opacity = (index === 0 ? 0.12 : 0.17) + pulse * 0.1;
      });
      (altarData.light as THREE.PointLight).intensity = 1.8 + pulse * 1.4;
    }
    this.pointLights.forEach((light, i) => {
      const baseIntensity = light.userData.baseIntensity ?? 1.8;
      light.intensity = baseIntensity * (0.88 + Math.sin(time + i * 2.1) * 0.12);
    });

    // Ambient Sparkles
    const pos = this.petalPositions;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 0] += Math.sin(time + i) * 0.25 * dt;
      pos[i * 3 + 1] -= 0.5 * dt;
      pos[i * 3 + 2] += Math.cos(time + i) * 0.25 * dt;
      if (pos[i * 3 + 1] < 0.2) {
        pos[i * 3 + 1] = 6 + Math.random() * 2;
        pos[i * 3 + 0] = (Math.random() - 0.5) * 32;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }
    this.petalParticles.geometry.attributes.position.needsUpdate = true;

    // Portal Rotation
    if (this.portalMesh) {
      const pPlane = this.portalMesh.children[this.portalMesh.children.length - 1];
      if (pPlane) pPlane.rotation.z += 1.5 * dt;
    }

    // Update Active Combat Particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.removeCombatParticle(i);
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= p.gravity * dt;
      p.vx *= Math.exp(-p.drag * dt);
      p.vz *= Math.exp(-p.drag * dt);

      if (p.mesh.position.y < 0.06) {
        p.mesh.position.y = 0.06;
        p.vy = -p.vy * 0.3;
      }

      p.mesh.rotation.z += p.spin * dt;
      const progress = p.life / p.maxLife;
      if (p.shrink) {
        const s = p.initialScale * Math.max(0.01, progress);
        const baseWidth = p.mesh.userData.particleBaseWidth ?? 1;
        const baseHeight = p.mesh.userData.particleBaseHeight ?? 1;
        p.mesh.scale.set(s * baseWidth, s * baseHeight, 1);
      }
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1.0, progress * 1.5);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public handleResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public dispose() {
    this.disposed = true;
    this.clearTransientVFX();
    this.particleQuadGeometry.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
