import rawLevelsConfig from '../data/levels.json';
import { DifficultyMode, EquipmentItem } from '../types/game';
import { INITIAL_EQUIPMENT } from '../data/gameData';
import { EQUIPMENT_RARITY_META, hasEquipmentBonuses, rollEquipmentVariant } from './equipmentStats';

export type StageRoomType = 'start' | 'combat' | 'elite' | 'shop' | 'chest' | 'altar' | 'boss' | 'exit' | 'forge' | 'secret';
export type RoomDirection = 'north' | 'east' | 'south' | 'west';
export const ROOM_DIRECTIONS: RoomDirection[] = ['north', 'east', 'south', 'west'];

export interface BiomeDetails {
  id: string;
  name: string;
  nameTh: string;
  themeDesc: string;
  mobA: string;
  mobB: string;
  mobElite: string;
  mobANameTh: string;
  mobBNameTh: string;
  mobEliteNameTh: string;
  bossId: string;
  bossName: string;
  bossNameTh: string;
  secretBossId: string;
  secretBossName: string;
  secretBossNameTh: string;
  ambientColor: number;
  accentColor: number;
  bgTileColor: string;
  icon: string;
}

export interface LevelsConfig {
  run: { stagesPerRun: number; roomsPerStage: number; hpMultiplierPerStage: number };
  theme: { id: string; name: string; nameTh: string; descriptionTh: string };
  roomWeights: Array<{ type: 'combat' | 'elite' | 'shop' | 'chest' | 'boss'; weight: number }>;
  shop: { items: number; rerollBaseCost: number; rerollStep: number };
  chests: { white: number; blue: number; gold: number; pityAfter: number; pityBonus: number };
  economy: {
    coinsPerEnemy: { min: number; max: number };
    coinsPerBreakable: { min: number; max: number };
    enemyCountByDifficulty: Record<DifficultyMode, { min: number; max: number }>;
    enemyCountIncreaseEveryStages: number;
  };
}

export const LEVELS_CONFIG = rawLevelsConfig as LevelsConfig;

export const TEST_DUNGEON: BiomeDetails = {
  id: 'test_dungeon',
  name: LEVELS_CONFIG.theme.name,
  nameTh: LEVELS_CONFIG.theme.nameTh,
  themeDesc: LEVELS_CONFIG.theme.descriptionTh,
  mobA: 'crypt_skeleton',
  mobB: 'crypt_ghost',
  mobElite: 'crypt_priest',
  mobANameTh: 'โครงกระดูก',
  mobBNameTh: 'วิญญาณเฝ้าสุสาน',
  mobEliteNameTh: 'นักบวชศพ',
  bossId: 'boss_crypt_warden',
  bossName: 'Dungeon Warden',
  bossNameTh: 'ผู้คุมดันเจี้ยน',
  secretBossId: 'boss_blood_demon',
  secretBossName: 'Blood Demon',
  secretBossNameTh: 'จอมมารเลือด',
  ambientColor: 0x272038,
  accentColor: 0xa855f7,
  bgTileColor: '#272038',
  icon: '🕳️',
};

export const AVAILABLE_BIOMES: BiomeDetails[] = [
  TEST_DUNGEON,
  {
    id: 'desert',
    name: 'Arabian Mirage Palace',
    nameTh: 'พระราชวังอาหรับโบราณ',
    themeDesc: 'พระราชวังอาหรับโบราณกลางพายุทราย กระเบื้องมรกตและอสูรจีนี่สีม่วง',
    mobA: 'desert_assassin',
    mobB: 'desert_genie',
    mobElite: 'desert_assassin',
    mobANameTh: 'นักฆ่าทะเลทราย',
    mobBNameTh: 'จีนี่พรายทราย',
    mobEliteNameTh: 'หัวหน้านักฆ่าทะเลทราย',
    bossId: 'boss_iblis',
    bossName: 'Iblis',
    bossNameTh: 'จอมอสูรอิบลิส',
    secretBossId: 'boss_blood_demon',
    secretBossName: 'Blood Demon',
    secretBossNameTh: 'จอมมารเลือด',
    ambientColor: 0x0d9488,
    accentColor: 0xfbbf24,
    bgTileColor: '#0f766e',
    icon: '🧞‍♂️',
  },
  {
    id: 'japan',
    name: 'Bamboo Courtyard',
    nameTh: 'ลานไผ่ศาลเจ้าญี่ปุ่น',
    themeDesc: 'ศาลเจ้าญี่ปุ่นโบราณล้อมรอบด้วยป่าไผ่ ซามูไรโรนินและพลธนูวิหค',
    mobA: 'japan_ronin',
    mobB: 'japan_archer',
    mobElite: 'japan_ronin',
    mobANameTh: 'ซามูไรพเนจร',
    mobBNameTh: 'พลธนูเงา',
    mobEliteNameTh: 'แม่ทัพซามูไร',
    bossId: 'boss_tengu',
    bossName: 'Tengu',
    bossNameTh: 'เท็งกุจอมอหังการ',
    secretBossId: 'boss_blood_demon',
    secretBossName: 'Blood Demon',
    secretBossNameTh: 'จอมมารเลือด',
    ambientColor: 0xff9a42,
    accentColor: 0xfb7185,
    bgTileColor: '#3c2415',
    icon: '🎋',
  },
  {
    id: 'elfland',
    name: 'Elfland Woods',
    nameTh: 'พงไพรเอลฟ์ลึกลับ',
    themeDesc: 'ป่าโบราณเรืองแสงปกคลุมด้วยเถาวัลย์ วิญญาณพฤกษาและอสูรพืชดุร้าย',
    mobA: 'elf_wisp',
    mobB: 'elf_treant',
    mobElite: 'elf_treant',
    mobANameTh: 'ภูตพฤกษา',
    mobBNameTh: 'อสูรต้นไม้ยักษ์',
    mobEliteNameTh: 'พญาพฤกษาบรรพกาล',
    bossId: 'boss_muno_wonda',
    bossName: 'Muno Wonda',
    bossNameTh: 'มูโน วอนดา',
    secretBossId: 'boss_blood_demon',
    secretBossName: 'Blood Demon',
    secretBossNameTh: 'จอมมารเลือด',
    ambientColor: 0x047857,
    accentColor: 0xa3e635,
    bgTileColor: '#064e3b',
    icon: '🧝‍♂️',
  },
  {
    id: 'stronghold',
    name: 'Cyber Stronghold',
    nameTh: 'ป้อมปราการจักรกล',
    themeDesc: 'ฐานทัพเหล็กกล้าและห้องทดลองไซบอร์ก หุ่นยนต์ยามและโดรนสังหาร',
    mobA: 'stronghold_drone',
    mobB: 'stronghold_cyborg',
    mobElite: 'stronghold_cyborg',
    mobANameTh: 'โดรนตรวจการณ์',
    mobBNameTh: 'ไซบอร์กทะลวงแนว',
    mobEliteNameTh: 'คอมมานเดอร์จักรกล',
    bossId: 'boss_dr_universelove',
    bossName: 'Dr. Universelove',
    bossNameTh: 'ดร. ยูนิเวิร์สเลิฟ',
    secretBossId: 'boss_blood_demon',
    secretBossName: 'Blood Demon',
    secretBossNameTh: 'จอมมารเลือด',
    ambientColor: 0x0284c7,
    accentColor: 0x38bdf8,
    bgTileColor: '#334155',
    icon: '🤖',
  },
  {
    id: 'china',
    name: 'Shaolin Monastery',
    nameTh: 'อารามหลวงเส้าหลิน',
    themeDesc: 'ลานกระเบื้องมังกรแดงและเสาหยกสลัก เพลงหมัดและพลองยาว',
    mobA: 'china_monk',
    mobB: 'china_spearman',
    mobElite: 'china_spearman',
    mobANameTh: 'ศิษย์กังฟู',
    mobBNameTh: 'ทวนทะลวงค่าย',
    mobEliteNameTh: 'ปรมาจารย์พลองทอง',
    bossId: 'boss_chen',
    bossName: 'Master Chen',
    bossNameTh: 'ปรมาจารย์เฉิน',
    secretBossId: 'boss_blood_demon',
    secretBossName: 'Blood Demon',
    secretBossNameTh: 'จอมมารเลือด',
    ambientColor: 0xb91c1c,
    accentColor: 0xfbbf24,
    bgTileColor: '#991b1b',
    icon: '🐉',
  },
  {
    id: 'ice',
    name: 'Frost Glacial Cavern',
    nameTh: 'ถ้ำเหมันต์เยือกแข็ง',
    themeDesc: 'ทะเลสาบน้ำแข็งและผลึกคริสตัลดารา เหล่าอสูรน้ำแข็งโบราณ',
    mobA: 'norse_frostmage',
    mobB: 'norse_berserker',
    mobElite: 'norse_berserker',
    mobANameTh: 'นักเวทน้ำแข็ง',
    mobBNameTh: 'นักรบคลั่งนอร์ส',
    mobEliteNameTh: 'ยักษ์น้ำแข็งทมิฬ',
    bossId: 'boss_kraken',
    bossName: 'Kraken',
    bossNameTh: 'พญาคราเคนเยือกแข็ง',
    secretBossId: 'boss_blood_demon',
    secretBossName: 'Blood Demon',
    secretBossNameTh: 'จอมมารเลือด',
    ambientColor: 0x0284c7,
    accentColor: 0x93c5fd,
    bgTileColor: '#0c4a6e',
    icon: '❄️',
  },
  {
    id: 'forge',
    name: 'Abyssal Forge',
    nameTh: 'เตาหลอมอเวจี',
    themeDesc: 'ธารลาวาและเตาหลอมโบราณ เปลวเพลิงนรกและอสูรหินเพลิง',
    mobA: 'undead_skeleton',
    mobB: 'undead_ghoul',
    mobElite: 'undead_ghoul',
    mobANameTh: 'โครงกระดูกเพลิง',
    mobBNameTh: 'กูลอเวจี',
    mobEliteNameTh: 'จอมทัพไฟบรรลัยกัลป์',
    bossId: 'boss_valentine',
    bossName: 'Valentine',
    bossNameTh: 'วาเลนไทน์',
    secretBossId: 'boss_blood_demon',
    secretBossName: 'Blood Demon',
    secretBossNameTh: 'จอมมารเลือด',
    ambientColor: 0xea580c,
    accentColor: 0xfacc15,
    bgTileColor: '#451a03',
    icon: '🔥',
  },
];

export interface ShopOfferItem {
  id: string;
  type: 'equipment';
  name: string;
  nameTh: string;
  descTh: string;
  cost: number;
  icon: string;
  purchased: boolean;
  itemData: EquipmentItem;
}

export interface StageRoomNode {
  id: number;
  type: StageRoomType;
  depth: number;
  lane: number;
  mapPosition: number;
  connections: Partial<Record<RoomDirection, number>>;
}

export interface StageData {
  stageId: string;
  stageNumber: number;
  rooms: StageRoomType[];
  roomGraph: StageRoomNode[];
  mapRotation: 0 | 90 | 180 | 270;
  currentRoomIndex: number;
  visitedRoomIndices: number[];
  clearedRoomIndices: number[];
  entrySide: RoomDirection | null;
  totalCombatRooms: number;
  combatRoomsCleared: number;
  chestStates: Record<string, { opened: boolean; rarity: 'white' | 'blue' | 'gold' | 'themed' | null }>;
  secretRoomRoomIndex: number;
  hasSecretWallInCurrentRoom: boolean;
  secretWallRevealed: boolean;
  secretRoomVisited: boolean;
  isSecretRoomActive: boolean;
  hasSecretBoss: boolean;
  secretBossDefeated: boolean;
  shopOffers: ShopOfferItem[];
  shopOffersByRoom: Record<number, ShopOfferItem[]>;
  happyProvokedRoomIndices: number[];
  rerollCount: number;
  currentRerollCost: number;
  forgeUsed: boolean;
  coinsTargetMin: number;
  coinsTargetMax: number;
}

export interface RunSession {
  seed: number;
  rng: SeededRNG;
  selectedBiomes: BiomeDetails[];
  currentBiomeIndex: number;
  currentStageIndex: number;
  hpMultiplier: number;
  secretBossEncounteredThisBiome: boolean;
  consecutiveNonGoldChests: number;
  stage: StageData;
}

export class SeededRNG {
  private s: number;

  constructor(seed: number) {
    this.s = Math.abs(seed) || 123456789;
  }

  public next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  public choice<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  public shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export class LevelSystem {
  public run: RunSession | null = null;

  public startNewRun(customSeed?: number): RunSession {
    const seed = customSeed ?? Math.floor(Math.random() * 900000) + 100000;
    const rng = new SeededRNG(seed);
    const shuffledBiomes = rng.shuffle(AVAILABLE_BIOMES);
    this.run = {
      seed,
      rng,
      selectedBiomes: shuffledBiomes,
      currentBiomeIndex: 0,
      currentStageIndex: 0,
      hpMultiplier: 1,
      secretBossEncounteredThisBiome: false,
      consecutiveNonGoldChests: 0,
      stage: this.generateStage(1, rng),
    };
    return this.run;
  }

  private rollRoomType(rng: SeededRNG): StageRoomType {
    const roomChoices = LEVELS_CONFIG.roomWeights.filter((room) => room.type !== 'boss');
    const total = roomChoices.reduce((sum, room) => sum + room.weight, 0);
    let roll = rng.next() * total;
    for (const room of roomChoices) {
      roll -= room.weight;
      if (roll < 0) return room.type;
    }
    return 'combat';
  }

  private generateRoomGraph(rooms: StageRoomType[], rng: SeededRNG): StageRoomNode[] {
    const mapSlots = [0, 1, 2, 3, 4, 5];
    const slotPositions = [
      { x: 150, y: 8 },
      { x: 150, y: 25 },
      { x: 150, y: 42 },
      { x: 150, y: 59 },
      { x: 150, y: 76 },
      { x: 150, y: 93 },
    ];
    const nodes: StageRoomNode[] = rooms.map((type, id) => {
      const mapPosition = mapSlots[id];
      const slot = slotPositions[mapPosition];
      return {
        id,
        type,
        depth: mapPosition === 0 ? 0 : mapPosition === 5 ? 3 : mapPosition <= 2 ? 1 : 2,
        lane: slot.x < 150 ? 0 : slot.x > 150 ? 2 : 1,
        mapPosition,
        connections: {},
      };
    });

    const connect = (a: number, b: number) => {
      nodes[a].connections.south = b;
      nodes[b].connections.north = a;
    };

    // Give every room one guaranteed route from the start to the exit, with a
    // newly shuffled order on each stage. Then add a few optional branches.
    const spine = [0, 1, 2, 3, 4, 5];
    for (let index = 0; index < spine.length - 1; index++) connect(spine[index], spine[index + 1]);

    const existingEdges = new Set<string>();
    nodes.forEach((node) => Object.values(node.connections).forEach((target) => {
      if (target !== undefined) existingEdges.add([node.id, target].sort((a, b) => a - b).join(':'));
    }));
    const optionalEdges: Array<[number, number]> = [];
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        if (!existingEdges.has(`${a}:${b}`)) optionalEdges.push([a, b]);
      }
    }
    const targetExtraEdges = 0;
    let addedEdges = 0;
    for (const [a, b] of rng.shuffle(optionalEdges)) {
      if (addedEdges >= targetExtraEdges) break;
      if (Object.keys(nodes[a].connections).length >= 4 || Object.keys(nodes[b].connections).length >= 4) continue;
      connect(a, b);
      addedEdges++;
    }

    // Rotate every door socket together so the same seed always recreates the
    // same orientation while room layouts still feel different from stage to stage.
    const directionOrder = ROOM_DIRECTIONS;
    const rotationSteps = 0;
    for (const node of nodes) {
      const rotated: StageRoomNode['connections'] = {};
      for (const [direction, target] of Object.entries(node.connections) as [RoomDirection, number][]) {
        const directionIndex = directionOrder.indexOf(direction);
        rotated[directionOrder[(directionIndex + rotationSteps) % directionOrder.length]] = target;
      }
      node.connections = rotated;
    }
    return nodes;
  }

  private generateStage(stageNumber: number, rng: SeededRNG): StageData {
    const rooms: StageRoomType[] = ['start', 'combat', 'combat', 'combat', 'altar', 'boss'];
    for (let index = 1; index <= 3; index++) rooms[index] = this.rollRoomType(rng);
    if (!rooms.slice(1, 5).some((type) => type === 'combat' || type === 'elite')) {
      rooms[rng.range(1, 3)] = 'combat';
    }
    const roomGraph = this.generateRoomGraph(rooms, rng);
    const mapRotation = 0 as StageData['mapRotation'];
    const shopOffersByRoom: Record<number, ShopOfferItem[]> = {};
    rooms.forEach((type, index) => {
      if (type === 'shop') shopOffersByRoom[index] = this.generateShopOffers(rng);
    });
    return {
      stageId: `D-${String(stageNumber).padStart(2, '0')}`,
      stageNumber,
      rooms,
      roomGraph,
      mapRotation,
      currentRoomIndex: 0,
      visitedRoomIndices: [0],
      clearedRoomIndices: [],
      entrySide: null,
      totalCombatRooms: rooms.filter((type) => type === 'combat' || type === 'elite' || type === 'boss').length,
      combatRoomsCleared: 0,
      chestStates: {},
      secretRoomRoomIndex: -1,
      hasSecretWallInCurrentRoom: false,
      secretWallRevealed: false,
      secretRoomVisited: false,
      isSecretRoomActive: false,
      hasSecretBoss: false,
      secretBossDefeated: false,
      shopOffers: [],
      shopOffersByRoom,
      happyProvokedRoomIndices: [],
      rerollCount: 0,
      currentRerollCost: LEVELS_CONFIG.shop.rerollBaseCost,
      forgeUsed: false,
      coinsTargetMin: 0,
      coinsTargetMax: 0,
    };
  }

  public generateShopOffers(rng: SeededRNG): ShopOfferItem[] {
    const eligible = INITIAL_EQUIPMENT.filter(hasEquipmentBonuses);
    const chosen: EquipmentItem[] = [];
    const rarityOrder = ['common', 'rare', 'epic', 'legendary'] as const;
    while (chosen.length < LEVELS_CONFIG.shop.items && chosen.length < eligible.length) {
      const remaining = eligible.filter((item) => !chosen.some((selected) => selected.id === item.id));
      const availableRarities = rarityOrder.filter((rarity) => remaining.some((item) => item.rarity === rarity));
      const totalWeight = availableRarities.reduce((sum, rarity) => sum + EQUIPMENT_RARITY_META[rarity].weight, 0);
      let roll = rng.next() * totalWeight;
      const rarity = availableRarities.find((candidate) => {
        roll -= EQUIPMENT_RARITY_META[candidate].weight;
        return roll < 0;
      }) || availableRarities[availableRarities.length - 1];
      chosen.push(rng.choice(remaining.filter((item) => item.rarity === rarity)));
    }
    return chosen.map((item) => {
      const variantId = `shop_gear_${item.id}_${rng.next().toString(36).slice(2)}`;
      const itemData = { ...rollEquipmentVariant(item, () => rng.next()), id: variantId };
      return {
        id: variantId,
        type: 'equipment' as const,
        name: item.name,
        nameTh: item.nameTh,
        descTh: itemData.descTh,
        cost: item.cost || 50,
        icon: item.icon || '🛡️',
        purchased: false,
        itemData,
      };
    });
  }

  public getShopOffersForRoom(roomIndex: number): ShopOfferItem[] {
    if (!this.run) return [];
    const stage = this.run.stage;
    stage.shopOffersByRoom[roomIndex] ??= this.generateShopOffers(this.run.rng);
    stage.shopOffers = stage.shopOffersByRoom[roomIndex];
    return stage.shopOffers;
  }

  public rerollShop(): { success: boolean; cost: number } {
    if (!this.run) return { success: false, cost: 0 };
    const stage = this.run.stage;
    const cost = stage.currentRerollCost;
    stage.shopOffers = this.generateShopOffers(this.run.rng);
    stage.shopOffersByRoom[stage.currentRoomIndex] = stage.shopOffers;
    stage.rerollCount++;
    stage.currentRerollCost += LEVELS_CONFIG.shop.rerollStep;
    return { success: true, cost };
  }

  public rollChestRarity(isThemedSecretBoss: boolean = false, luck: number = 0): 'white' | 'blue' | 'gold' | 'themed' {
    if (!this.run) return 'white';
    if (isThemedSecretBoss) return 'themed';
    let goldChance = Math.min(0.85, LEVELS_CONFIG.chests.gold + Math.max(0, luck));
    if (this.run.consecutiveNonGoldChests >= LEVELS_CONFIG.chests.pityAfter) {
      const excess = this.run.consecutiveNonGoldChests - LEVELS_CONFIG.chests.pityAfter + 1;
      goldChance += excess * LEVELS_CONFIG.chests.pityBonus;
    }
    goldChance = Math.min(0.95, goldChance);
    const roll = this.run.rng.next();
    if (roll < goldChance) return 'gold';
    const blueChance = Math.min(LEVELS_CONFIG.chests.blue, 1 - goldChance);
    if (roll < goldChance + blueChance) return 'blue';
    return 'white';
  }

  public recordChestOpened(rarity: 'white' | 'blue' | 'gold' | 'themed'): void {
    if (!this.run || rarity === 'themed') return;
    this.run.consecutiveNonGoldChests = rarity === 'gold' ? 0 : this.run.consecutiveNonGoldChests + 1;
  }

  public advanceToNextRoom(direction: RoomDirection): { nextRoomType: StageRoomType; nextRoomIndex: number } | null {
    if (!this.run) return null;
    const stage = this.run.stage;
    const currentNode = stage.roomGraph[stage.currentRoomIndex];
    const nextRoomIndex = currentNode?.connections[direction];
    if (nextRoomIndex === undefined) return null;
    const nextNode = stage.roomGraph[nextRoomIndex];
    const returnDirection = ROOM_DIRECTIONS.find((candidate) => nextNode.connections[candidate] === stage.currentRoomIndex);
    stage.entrySide = returnDirection || null;
    stage.currentRoomIndex = nextRoomIndex;
    if (!stage.visitedRoomIndices.includes(nextRoomIndex)) stage.visitedRoomIndices.push(nextRoomIndex);
    return { nextRoomType: nextNode.type, nextRoomIndex };
  }

  public advanceStage(): { runCompleted: boolean; newBiome: boolean; stageName: string } {
    if (!this.run) return { runCompleted: true, newBiome: false, stageName: '' };
    if (this.run.currentStageIndex >= LEVELS_CONFIG.run.stagesPerRun - 1) {
      return { runCompleted: true, newBiome: false, stageName: 'VICTORY' };
    }
    this.run.currentStageIndex++;
    const stageNumber = this.run.currentStageIndex + 1;
    this.run.hpMultiplier = 1 + (stageNumber - 1) * LEVELS_CONFIG.run.hpMultiplierPerStage;
    this.run.currentBiomeIndex = this.run.currentStageIndex % this.run.selectedBiomes.length;
    this.run.stage = this.generateStage(stageNumber, this.run.rng);
    const biome = this.getCurrentBiome();
    return { runCompleted: false, newBiome: true, stageName: `${biome.nameTh} - ด่าน ${stageNumber}` };
  }

  public getCurrentBiome(): BiomeDetails {
    if (!this.run || !this.run.selectedBiomes || this.run.selectedBiomes.length === 0) return AVAILABLE_BIOMES[0];
    return this.run.selectedBiomes[this.run.currentBiomeIndex] || AVAILABLE_BIOMES[0];
  }

  public getCurrentRoomType(): StageRoomType {
    if (!this.run) return 'start';
    return this.run.stage.rooms[this.run.stage.currentRoomIndex] || 'combat';
  }

  public getEnemyWaveCount(roomType: StageRoomType): number {
    if (roomType === 'elite' || roomType === 'combat') return 1;
    return 1;
  }

  public getEnemyCountPerWave(_stageId?: string, difficulty: DifficultyMode = 'normal'): number {
    const range = LEVELS_CONFIG.economy.enemyCountByDifficulty[difficulty] || LEVELS_CONFIG.economy.enemyCountByDifficulty.normal;
    if (!this.run) return range.min;
    const increase = Math.floor((this.run.stage.stageNumber - 1) / LEVELS_CONFIG.economy.enemyCountIncreaseEveryStages);
    return this.run.rng.range(
      Math.min(range.min + increase, 8),
      Math.min(range.max + increase, 10)
    );
  }

  public getGoldPerMob(_stageId?: string): number {
    return this.run
      ? this.run.rng.range(LEVELS_CONFIG.economy.coinsPerEnemy.min, LEVELS_CONFIG.economy.coinsPerEnemy.max)
      : 0;
  }

  public getGoldPerBreakable(_stageId?: string): number {
    return this.run
      ? this.run.rng.range(LEVELS_CONFIG.economy.coinsPerBreakable.min, LEVELS_CONFIG.economy.coinsPerBreakable.max)
      : 0;
  }

  public markSecretBossEncountered(): void {
    if (this.run) this.run.secretBossEncounteredThisBiome = true;
  }
}

export const levelSystem = new LevelSystem();
