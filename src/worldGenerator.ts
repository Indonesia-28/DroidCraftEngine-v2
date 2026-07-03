/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockType, PlayerState, ItemId, ItemStack, WorldData, WorldMetadata, MobEntity, EntityType } from './types';

// Simple deterministic pseudo-random number generator based on a string seed
export class SeededRandom {
  private seed: number;

  constructor(seedStr: string) {
    this.seed = this.hashString(seedStr);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash) || 123456789;
  }

  // Returns a float between 0 and 1
  public next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  // Returns integer between min (inclusive) and max (exclusive)
  public range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

// 1D Perlin-like noise using layered sine waves
function getTerrainHeight(x: number, rand: SeededRandom, baseHeight = 65, maxDelta = 20): number {
  // Use layered sine waves to approximate Perlin noise
  const wave1 = Math.sin(x * 0.015) * maxDelta;
  const wave2 = Math.sin(x * 0.05) * (maxDelta * 0.4);
  const wave3 = Math.sin(x * 0.1) * (maxDelta * 0.15);
  
  const height = baseHeight + wave1 + wave2 + wave3;
  return Math.max(15, Math.min(110, Math.floor(height)));
}

// 2D Cave noise using layered sines
function isCave(x: number, y: number): boolean {
  // Avoid caves near the surface (above y = 60)
  if (y < 65) return false;

  const n1 = Math.sin(x * 0.08) * Math.cos(y * 0.08);
  const n2 = Math.sin(x * 0.03 + 2.0) * Math.cos(y * 0.04 + 1.0);
  const n3 = Math.sin(x * 0.15) * Math.sin(y * 0.15);

  const finalNoise = (n1 + n2 * 0.6 + n3 * 0.3) / 1.9;
  
  // A threshold of > 0.45 makes natural winding cave tunnels!
  return finalNoise > 0.38;
}

export function generateWorld(name: string, seed: string): WorldData {
  const rand = new SeededRandom(seed);
  const width = 450;
  const height = 128;
  const blocks = new Uint8Array(width * height);

  // Initialize all with air
  blocks.fill(0); // Index for BlockType.AIR

  const blockTypeToIdMap: BlockType[] = Object.values(BlockType);

  function setBlock(x: number, y: number, type: BlockType) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      blocks[y * width + x] = blockTypeToIdMap.indexOf(type);
    }
  }

  function getBlock(x: number, y: number): BlockType {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = blocks[y * width + x];
      return blockTypeToIdMap[idx] || BlockType.AIR;
    }
    return BlockType.AIR;
  }

  // 1. Generate core terrain layers
  const heights: number[] = [];
  for (let x = 0; x < width; x++) {
    const groundY = getTerrainHeight(x, rand, 65, 18);
    heights.push(groundY);

    for (let y = 0; y < height; y++) {
      if (y === height - 1) {
        setBlock(x, y, BlockType.BEDROCK);
      } else if (y > groundY) {
        const depth = y - groundY;
        if (depth === 1) {
          setBlock(x, y, BlockType.GRASS);
        } else if (depth < 5) {
          setBlock(x, y, BlockType.DIRT);
        } else {
          // Stone layer
          setBlock(x, y, BlockType.STONE);
        }
      } else {
        setBlock(x, y, BlockType.AIR);
      }
    }
  }

  // 2. Generate Caves & Ores in Stone
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height - 1; y++) {
      const current = getBlock(x, y);
      if (current === BlockType.STONE) {
        // Cave carving
        if (isCave(x, y)) {
          setBlock(x, y, BlockType.AIR);
          continue;
        }

        // Ore veins
        const r = rand.next();
        if (y > 115 && r < 0.01) {
          // Diamond Ore
          generateOreVein(x, y, BlockType.DIAMOND_ORE, rand, setBlock, getBlock);
        } else if (y > 95 && r < 0.015) {
          // Gold Ore
          generateOreVein(x, y, BlockType.GOLD_ORE, rand, setBlock, getBlock);
        } else if (y > 80 && r < 0.025) {
          // Iron Ore
          generateOreVein(x, y, BlockType.IRON_ORE, rand, setBlock, getBlock);
        } else if (y > 68 && r < 0.04) {
          // Coal Ore
          generateOreVein(x, y, BlockType.COAL_ORE, rand, setBlock, getBlock);
        }
      }
    }
  }

  // 3. Generate Trees
  // We place trees on flat surface Grass blocks, spacing them out
  let nextTreeX = rand.range(5, 12);
  while (nextTreeX < width - 10) {
    const groundY = heights[nextTreeX];
    const surfaceBlock = getBlock(nextTreeX, groundY + 1);

    if (surfaceBlock === BlockType.GRASS) {
      // Plant Oak tree
      const treeHeight = rand.range(4, 7);
      
      // Trunk
      for (let ty = 0; ty < treeHeight; ty++) {
        setBlock(nextTreeX, groundY - ty, BlockType.WOOD);
      }

      // Foliage/Leaves
      const leafCenterY = groundY - treeHeight + 1;
      for (let ly = leafCenterY - 2; ly <= leafCenterY + 1; ly++) {
        const radius = ly <= leafCenterY ? 2 : 1;
        for (let lx = nextTreeX - radius; lx <= nextTreeX + radius; lx++) {
          if (getBlock(lx, ly) === BlockType.AIR) {
            setBlock(lx, ly, BlockType.LEAVES);
          }
        }
      }

      // Turn grass block underneath to dirt because no sunlight
      setBlock(nextTreeX, groundY + 1, BlockType.DIRT);

      nextTreeX += rand.range(12, 22); // space out trees
    } else {
      nextTreeX++;
    }
  }

  // 4. Initialize Player Position
  // Spawn in the middle of the map, on top of the surface
  const spawnX = Math.floor(width / 2);
  const spawnY = heights[spawnX] - 3; // a bit above ground to fall safely

  const initialInventory: (ItemStack | null)[] = new Array(36).fill(null);
  
  // Give starter items for survival
  initialInventory[0] = { id: ItemId.WOOD_PICKAXE, count: 1 };
  initialInventory[1] = { id: ItemId.APPLE, count: 8 };
  initialInventory[2] = { id: ItemId.TORCH, count: 16 };

  const player: PlayerState = {
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    width: 0.6, // in block units
    height: 1.8,
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
    oxygen: 10,
    maxOxygen: 10,
    isGrounded: false,
    facingRight: true,
    activeSlot: 0,
    inventory: initialInventory,
    armor: new Array(4).fill(null),
  };

  const metadata: WorldMetadata = {
    id: rand.range(100000, 999999).toString(),
    name,
    seed,
    createdTime: Date.now(),
    lastPlayedTime: Date.now(),
    gameTime: 1200, // Start during mid-morning (24000 ticks per day)
  };

  // 5. Spawn starting mobs
  const mobs: MobEntity[] = [];
  for (let i = 0; i < 8; i++) {
    const mobX = rand.range(20, width - 20);
    const mobY = heights[mobX] - 2;
    mobs.push({
      id: Math.random().toString(),
      type: rand.next() > 0.5 ? EntityType.COW : EntityType.CHICKEN,
      x: mobX,
      y: mobY,
      vx: 0,
      vy: 0,
      width: 0.9,
      height: 1.2,
      health: 10,
      maxHealth: 10,
      facingRight: rand.next() > 0.5,
      hurtCooldown: 0,
      isGrounded: false,
      jumpCooldown: 0,
    });
  }

  return {
    metadata,
    width,
    height,
    blocks,
    player,
    furnaces: {},
    itemEntities: [],
    mobs,
  };
}

// Generates a small organic ore vein
function generateOreVein(
  startX: number,
  startY: number,
  oreType: BlockType,
  rand: SeededRandom,
  setBlock: (x: number, y: number, b: BlockType) => void,
  getBlock: (x: number, y: number) => BlockType
) {
  const size = rand.range(3, 8);
  let currX = startX;
  let currY = startY;

  for (let i = 0; i < size; i++) {
    if (getBlock(currX, currY) === BlockType.STONE) {
      setBlock(currX, currY, oreType);
    }
    // Drunkard walk for natural veins
    currX += rand.range(-1, 2);
    currY += rand.range(-1, 2);
  }
}
