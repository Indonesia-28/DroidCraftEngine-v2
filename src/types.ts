/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum BlockType {
  AIR = 'air',
  GRASS = 'grass',
  DIRT = 'dirt',
  STONE = 'stone',
  COBBLESTONE = 'cobblestone',
  WOOD = 'wood',
  LEAVES = 'leaves',
  COAL_ORE = 'coal_ore',
  IRON_ORE = 'iron_ore',
  GOLD_ORE = 'gold_ore',
  DIAMOND_ORE = 'diamond_ore',
  BEDROCK = 'bedrock',
  CRAFTING_TABLE = 'crafting_table',
  FURNACE = 'furnace',
  TORCH = 'torch',
  PLANK = 'plank', // Wood planks
}

export enum ItemId {
  // Blocks that can be items
  GRASS = 'grass',
  DIRT = 'dirt',
  STONE = 'stone',
  COBBLESTONE = 'cobblestone',
  WOOD = 'wood',
  LEAVES = 'leaves',
  COAL_ORE = 'coal_ore',
  IRON_ORE = 'iron_ore',
  GOLD_ORE = 'gold_ore',
  DIAMOND_ORE = 'diamond_ore',
  CRAFTING_TABLE = 'crafting_table',
  FURNACE = 'furnace',
  TORCH = 'torch',
  PLANK = 'plank',

  // Materials
  STICK = 'stick',
  COAL = 'coal',
  RAW_IRON = 'raw_iron',
  IRON_INGOT = 'iron_ingot',
  RAW_GOLD = 'raw_gold',
  GOLD_INGOT = 'gold_ingot',
  DIAMOND = 'diamond',

  // Tools
  WOOD_PICKAXE = 'wood_pickaxe',
  STONE_PICKAXE = 'stone_pickaxe',
  IRON_PICKAXE = 'iron_pickaxe',
  DIAMOND_PICKAXE = 'diamond_pickaxe',

  WOOD_SWORD = 'wood_sword',
  STONE_SWORD = 'stone_sword',
  IRON_SWORD = 'iron_sword',
  DIAMOND_SWORD = 'diamond_sword',

  // Food
  APPLE = 'apple',
  RAW_BEEF = 'raw_beef',
  COOKED_BEEF = 'cooked_beef',
}

export interface ItemStack {
  id: ItemId;
  count: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  oxygen: number;
  maxOxygen: number;
  isGrounded: boolean;
  facingRight: boolean;
  activeSlot: number; // 0-8 for hotbar
  inventory: (ItemStack | null)[]; // size 36 (9 hotbar + 27 main inventory)
  armor: (ItemStack | null)[]; // size 4 (helmet, chestplate, leggings, boots)
}

export interface WorldMetadata {
  id: string;
  name: string;
  seed: string;
  createdTime: number;
  lastPlayedTime: number;
  gameTime: number; // in-game ticks or seconds for day/night cycle
}

export interface ItemEntity {
  id: string;
  itemId: ItemId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

export enum EntityType {
  CREEPER = 'creeper',
  ZOMBIE = 'zombie',
  COW = 'cow',
  CHICKEN = 'chicken',
}

export interface MobEntity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  facingRight: boolean;
  hurtCooldown: number;
  isGrounded: boolean;
  jumpCooldown: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  showCoordinates: boolean;
  mobileControlLayout: 'joystick' | 'buttons';
}

export interface CraftingRecipe {
  // Pattern size can be 2x2 or 3x3
  // Represented as flat array of size 4 or 9
  pattern: (ItemId | null)[];
  width: number;
  height: number;
  result: ItemStack;
}

export interface FurnaceState {
  fuelSlot: ItemStack | null;
  inputSlot: ItemStack | null;
  outputSlot: ItemStack | null;
  cookProgress: number; // 0 to 100
  fuelBurnTime: number; // remaining burn time
  maxFuelBurnTime: number;
}

export interface WorldData {
  metadata: WorldMetadata;
  // World width is typically 500-1000 blocks, height is 128 blocks
  // To avoid storing a massive empty array, we can use a run-length encoding
  // or a sparse dictionary or simple 1D array. Since width=500 and height=128
  // is 64,000 blocks, a flat Uint8Array or standard number array is very small (~64KB)
  // and loads instantly!
  width: number;
  height: number;
  blocks: Uint8Array; // indices corresponding to BlockType values
  backBlocks?: Uint8Array; // Background blocks (mined background wall)
  player: PlayerState;
  furnaces: { [coordKey: string]: FurnaceState }; // "x,y" -> furnace state
  itemEntities: ItemEntity[];
  mobs: MobEntity[];
}
