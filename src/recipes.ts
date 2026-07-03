/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ItemId, CraftingRecipe, ItemStack } from './types';

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Wood Log -> 4 Wood Planks (can be placed anywhere in 2x2 or 3x3)
  {
    pattern: [ItemId.WOOD],
    width: 1,
    height: 1,
    result: { id: ItemId.PLANK, count: 4 },
  },
  // Sticks (2 Planks stacked vertically)
  {
    pattern: [
      ItemId.PLANK,
      ItemId.PLANK,
    ],
    width: 1,
    height: 2,
    result: { id: ItemId.STICK, count: 4 },
  },
  // Crafting Table (2x2 Planks)
  {
    pattern: [
      ItemId.PLANK, ItemId.PLANK,
      ItemId.PLANK, ItemId.PLANK,
    ],
    width: 2,
    height: 2,
    result: { id: ItemId.CRAFTING_TABLE, count: 1 },
  },
  // Torch (Coal on top of Stick)
  {
    pattern: [
      ItemId.COAL,
      ItemId.STICK,
    ],
    width: 1,
    height: 2,
    result: { id: ItemId.TORCH, count: 4 },
  },
  // Furnace (8 Cobblestone around a 3x3 grid)
  {
    pattern: [
      ItemId.COBBLESTONE, ItemId.COBBLESTONE, ItemId.COBBLESTONE,
      ItemId.COBBLESTONE, null,               ItemId.COBBLESTONE,
      ItemId.COBBLESTONE, ItemId.COBBLESTONE, ItemId.COBBLESTONE,
    ],
    width: 3,
    height: 3,
    result: { id: ItemId.FURNACE, count: 1 },
  },
  // Wooden Pickaxe (3 Planks on top, 2 Sticks vertically)
  {
    pattern: [
      ItemId.PLANK, ItemId.PLANK, ItemId.PLANK,
      null,         ItemId.STICK, null,
      null,         ItemId.STICK, null,
    ],
    width: 3,
    height: 3,
    result: { id: ItemId.WOOD_PICKAXE, count: 1 },
  },
  // Stone Pickaxe (3 Cobblestone on top, 2 Sticks vertically)
  {
    pattern: [
      ItemId.COBBLESTONE, ItemId.COBBLESTONE, ItemId.COBBLESTONE,
      null,               ItemId.STICK,       null,
      null,               ItemId.STICK,       null,
    ],
    width: 3,
    height: 3,
    result: { id: ItemId.STONE_PICKAXE, count: 1 },
  },
  // Iron Pickaxe (3 Iron Ingots on top, 2 Sticks vertically)
  {
    pattern: [
      ItemId.IRON_INGOT, ItemId.IRON_INGOT, ItemId.IRON_INGOT,
      null,              ItemId.STICK,      null,
      null,              ItemId.STICK,      null,
    ],
    width: 3,
    height: 3,
    result: { id: ItemId.IRON_PICKAXE, count: 1 },
  },
  // Diamond Pickaxe (3 Diamonds on top, 2 Sticks vertically)
  {
    pattern: [
      ItemId.DIAMOND, ItemId.DIAMOND, ItemId.DIAMOND,
      null,           ItemId.STICK,   null,
      null,           ItemId.STICK,   null,
    ],
    width: 3,
    height: 3,
    result: { id: ItemId.DIAMOND_PICKAXE, count: 1 },
  },
  // Wooden Sword (2 Planks vertically, 1 Stick on bottom)
  {
    pattern: [
      ItemId.PLANK,
      ItemId.PLANK,
      ItemId.STICK,
    ],
    width: 1,
    height: 3,
    result: { id: ItemId.WOOD_SWORD, count: 1 },
  },
  // Stone Sword (2 Cobble vertically, 1 Stick on bottom)
  {
    pattern: [
      ItemId.COBBLESTONE,
      ItemId.COBBLESTONE,
      ItemId.STICK,
    ],
    width: 1,
    height: 3,
    result: { id: ItemId.STONE_SWORD, count: 1 },
  },
  // Iron Sword (2 Iron Ingots vertically, 1 Stick on bottom)
  {
    pattern: [
      ItemId.IRON_INGOT,
      ItemId.IRON_INGOT,
      ItemId.STICK,
    ],
    width: 1,
    height: 3,
    result: { id: ItemId.IRON_SWORD, count: 1 },
  },
  // Diamond Sword (2 Diamonds vertically, 1 Stick on bottom)
  {
    pattern: [
      ItemId.DIAMOND,
      ItemId.DIAMOND,
      ItemId.STICK,
    ],
    width: 1,
    height: 3,
    result: { id: ItemId.DIAMOND_SWORD, count: 1 },
  },
];

export interface SmeltingRecipe {
  input: ItemId;
  result: ItemStack;
  cookTime: number; // in game ticks (e.g. 200 ticks = 10s)
}

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: ItemId.RAW_IRON, result: { id: ItemId.IRON_INGOT, count: 1 }, cookTime: 200 },
  { input: ItemId.RAW_GOLD, result: { id: ItemId.GOLD_INGOT, count: 1 }, cookTime: 200 },
  { input: ItemId.RAW_BEEF, result: { id: ItemId.COOKED_BEEF, count: 1 }, cookTime: 150 },
  { input: ItemId.WOOD, result: { id: ItemId.COAL, count: 1 }, cookTime: 100 }, // charcoal
];

export const FUEL_BURN_TIMES: { [itemId in ItemId]?: number } = {
  [ItemId.COAL]: 1600, // smelts 8 items (8 * 200 = 1600 ticks)
  [ItemId.WOOD]: 300,
  [ItemId.PLANK]: 150,
  [ItemId.STICK]: 50,
  [ItemId.CRAFTING_TABLE]: 300,
};

// Helper to check if item is food and how much hunger it restores
export const FOOD_RESTORE: { [itemId in ItemId]?: { hunger: number; health: number } } = {
  [ItemId.APPLE]: { hunger: 4, health: 1 },
  [ItemId.RAW_BEEF]: { hunger: 3, health: 0 },
  [ItemId.COOKED_BEEF]: { hunger: 8, health: 2 },
};

// Match bounding box algorithm
export function matchRecipe(grid: (ItemId | null)[], gridWidth: number): ItemStack | null {
  // 1. Find bounding box of non-null elements
  let minCol = gridWidth;
  let maxCol = -1;
  let minRow = Math.floor(grid.length / gridWidth);
  let maxRow = -1;

  for (let r = 0; r < Math.floor(grid.length / gridWidth); r++) {
    for (let c = 0; c < gridWidth; c++) {
      const idx = r * gridWidth + c;
      if (grid[idx] !== null) {
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
      }
    }
  }

  // If grid is entirely empty, return null
  if (maxCol === -1 || maxRow === -1) return null;

  const inputW = maxCol - minCol + 1;
  const inputH = maxRow - minRow + 1;

  // Extract non-empty subgrid
  const subgrid: (ItemId | null)[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      subgrid.push(grid[r * gridWidth + c]);
    }
  }

  // 2. Search for a matching recipe
  for (const recipe of CRAFTING_RECIPES) {
    if (recipe.width !== inputW || recipe.height !== inputH) continue;

    let isMatch = true;
    for (let i = 0; i < subgrid.length; i++) {
      if (subgrid[i] !== recipe.pattern[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return recipe.result;
    }
  }

  return null;
}
