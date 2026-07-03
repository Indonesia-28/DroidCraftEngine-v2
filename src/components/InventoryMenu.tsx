/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowDown, Flame, Hammer, ShoppingBag, Plus, Minus } from 'lucide-react';
import { ItemId, ItemStack, PlayerState, FurnaceState } from '../types';
import { matchRecipe, SMELTING_RECIPES, FUEL_BURN_TIMES, FOOD_RESTORE } from '../recipes';
import { sounds } from '../sound';

interface InventoryMenuProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerState;
  onChangePlayer: (player: PlayerState) => void;
  mode: 'inventory' | 'crafting_table' | 'furnace';
  furnaceState: FurnaceState | null;
  onChangeFurnace: (state: FurnaceState | null) => void;
}

// Map ItemId to nice text labels
export const ITEM_LABELS: { [key in ItemId]: string } = {
  [ItemId.GRASS]: 'Grass Block',
  [ItemId.DIRT]: 'Dirt Block',
  [ItemId.STONE]: 'Stone',
  [ItemId.COBBLESTONE]: 'Cobblestone',
  [ItemId.WOOD]: 'Oak Log',
  [ItemId.LEAVES]: 'Oak Leaves',
  [ItemId.COAL_ORE]: 'Coal Ore',
  [ItemId.IRON_ORE]: 'Iron Ore',
  [ItemId.GOLD_ORE]: 'Gold Ore',
  [ItemId.DIAMOND_ORE]: 'Diamond Ore',
  [ItemId.CRAFTING_TABLE]: 'Crafting Table',
  [ItemId.FURNACE]: 'Furnace',
  [ItemId.TORCH]: 'Torch',
  [ItemId.PLANK]: 'Oak Planks',
  [ItemId.STICK]: 'Stick',
  [ItemId.COAL]: 'Coal',
  [ItemId.RAW_IRON]: 'Raw Iron',
  [ItemId.IRON_INGOT]: 'Iron Ingot',
  [ItemId.RAW_GOLD]: 'Raw Gold',
  [ItemId.GOLD_INGOT]: 'Gold Ingot',
  [ItemId.DIAMOND]: 'Diamond',
  [ItemId.WOOD_PICKAXE]: 'Wooden Pickaxe',
  [ItemId.STONE_PICKAXE]: 'Stone Pickaxe',
  [ItemId.IRON_PICKAXE]: 'Iron Pickaxe',
  [ItemId.DIAMOND_PICKAXE]: 'Diamond Pickaxe',
  [ItemId.WOOD_SWORD]: 'Wooden Sword',
  [ItemId.STONE_SWORD]: 'Stone Sword',
  [ItemId.IRON_SWORD]: 'Iron Sword',
  [ItemId.DIAMOND_SWORD]: 'Diamond Sword',
  [ItemId.APPLE]: 'Apple',
  [ItemId.RAW_BEEF]: 'Raw Beef',
  [ItemId.COOKED_BEEF]: 'Steak',
};

// ItemIcon rendering helper
export const ItemIcon: React.FC<{ id: ItemId; size?: string }> = ({ id, size = 'w-10 h-10' }) => {
  // Return tailored pixelated visual representations for each item
  const baseClasses = `${size} flex items-center justify-center relative select-none rounded`;

  if (id === ItemId.GRASS) {
    return (
      <div className={`${baseClasses} flex-col overflow-hidden border border-slate-950 bg-amber-900`}>
        <div className="w-full h-1/3 bg-emerald-600 border-b border-emerald-700" />
        <div className="w-full h-2/3 bg-amber-950" />
      </div>
    );
  }
  if (id === ItemId.DIRT) {
    return <div className={`${baseClasses} border border-slate-950 bg-amber-950`} />;
  }
  if (id === ItemId.STONE) {
    return <div className={`${baseClasses} border border-slate-950 bg-neutral-600 shadow-inner`} />;
  }
  if (id === ItemId.COBBLESTONE) {
    return (
      <div className={`${baseClasses} border border-slate-950 bg-neutral-500 flex flex-wrap p-0.5`}>
        <div className="w-2.5 h-2.5 bg-neutral-600 m-0.5 rounded-xs" />
        <div className="w-2.5 h-2.5 bg-neutral-400 m-0.5 rounded-xs" />
        <div className="w-2.5 h-2.5 bg-neutral-400 m-0.5 rounded-xs" />
        <div className="w-2.5 h-2.5 bg-neutral-600 m-0.5 rounded-xs" />
      </div>
    );
  }
  if (id === ItemId.WOOD) {
    return (
      <div className={`${baseClasses} border border-slate-950 bg-amber-800 flex items-center justify-center`}>
        <div className="w-3/4 h-3/4 rounded-full bg-amber-200 border-2 border-amber-900" />
      </div>
    );
  }
  if (id === ItemId.LEAVES) {
    return <div className={`${baseClasses} border border-emerald-950 bg-emerald-800/80`} />;
  }
  if (id === ItemId.PLANK) {
    return (
      <div className={`${baseClasses} border border-slate-950 bg-amber-700 flex flex-col justify-between p-1`}>
        <div className="w-full h-1 bg-amber-600" />
        <div className="w-full h-1 bg-amber-600" />
      </div>
    );
  }
  if (id === ItemId.STICK) {
    return (
      <div className={`${baseClasses}`}>
        <div className="w-1.5 h-8 bg-amber-800 rotate-[45deg] rounded" />
      </div>
    );
  }
  if (id === ItemId.COAL || id === ItemId.COAL_ORE) {
    return (
      <div className={`${baseClasses} flex items-center justify-center`}>
        <div className="w-6 h-6 bg-stone-900 border border-slate-950 rounded-lg transform rotate-12 flex items-center justify-center">
          <div className="w-2 h-2 bg-stone-800 rounded" />
        </div>
      </div>
    );
  }
  if (id === ItemId.RAW_IRON || id === ItemId.IRON_ORE) {
    return (
      <div className={`${baseClasses}`}>
        <div className="w-6 h-6 bg-orange-200 border border-orange-400 rounded-md transform rotate-[-15deg]" />
      </div>
    );
  }
  if (id === ItemId.IRON_INGOT) {
    return (
      <div className={`${baseClasses}`}>
        <div className="w-7 h-4 bg-slate-300 border border-slate-500 rounded transform rotate-[25deg] shadow-md" />
      </div>
    );
  }
  if (id === ItemId.RAW_GOLD || id === ItemId.GOLD_ORE) {
    return (
      <div className={`${baseClasses}`}>
        <div className="w-6 h-6 bg-yellow-300 border border-yellow-500 rounded-md transform rotate-12" />
      </div>
    );
  }
  if (id === ItemId.GOLD_INGOT) {
    return (
      <div className={`${baseClasses}`}>
        <div className="w-7 h-4 bg-yellow-400 border border-yellow-600 rounded transform rotate-[25deg] shadow-md" />
      </div>
    );
  }
  if (id === ItemId.DIAMOND || id === ItemId.DIAMOND_ORE) {
    return (
      <div className={`${baseClasses} animate-pulse`}>
        <div className="w-5 h-6 bg-cyan-300 border border-cyan-500 rounded-full transform rotate-45 flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
      </div>
    );
  }
  if (id === ItemId.CRAFTING_TABLE) {
    return (
      <div className={`${baseClasses} border-2 border-amber-950 bg-amber-800 flex flex-col justify-between p-0.5`}>
        <div className="w-full h-1/2 bg-amber-700 rounded-xs flex" />
        <div className="w-full h-1/2 bg-amber-900 rounded-xs mt-0.5" />
      </div>
    );
  }
  if (id === ItemId.FURNACE) {
    return (
      <div className={`${baseClasses} border border-slate-950 bg-stone-700 flex flex-col justify-end p-1`}>
        <div className="w-full h-4 bg-stone-900 border border-stone-800 rounded flex items-center justify-center text-[8px] text-orange-500 font-bold">
          ☼
        </div>
      </div>
    );
  }
  if (id === ItemId.TORCH) {
    return (
      <div className={`${baseClasses}`}>
        <div className="w-1.5 h-6 bg-amber-800 rotate-[15deg] origin-bottom relative">
          <div className="absolute -top-2 left-[-2px] w-2.5 h-2.5 bg-orange-500 animate-ping rounded-full" />
          <div className="absolute -top-1.5 left-[-1px] w-2 h-2 bg-yellow-400 rounded-full" />
        </div>
      </div>
    );
  }
  if (id.endsWith('_pickaxe')) {
    const isDiamond = id.startsWith('diamond');
    const isIron = id.startsWith('iron');
    const isStone = id.startsWith('stone');
    const headColor = isDiamond ? 'bg-cyan-400 border-cyan-300' : isIron ? 'bg-slate-200 border-slate-400' : isStone ? 'bg-neutral-500 border-neutral-600' : 'bg-amber-700 border-amber-800';
    return (
      <div className={`${baseClasses}`}>
        <div className="w-1 h-8 bg-amber-900 rotate-[45deg] relative">
          <div className={`absolute top-0 left-[-6px] w-4 h-1.5 ${headColor} border rounded-full transform rotate-[-45deg]`} />
        </div>
      </div>
    );
  }
  if (id.endsWith('_sword')) {
    const isDiamond = id.startsWith('diamond');
    const isIron = id.startsWith('iron');
    const isStone = id.startsWith('stone');
    const bladeColor = isDiamond ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.5)]' : isIron ? 'bg-slate-200 border-slate-400' : isStone ? 'bg-neutral-500 border-neutral-600' : 'bg-amber-700 border-amber-800';
    return (
      <div className={`${baseClasses}`}>
        <div className="w-1 h-8 bg-amber-900 rotate-[45deg] relative origin-center">
          <div className={`absolute bottom-2 left-[-3px] w-3 h-6 ${bladeColor} border rounded-sm`} />
          <div className="absolute bottom-1 left-[-4px] w-5 h-1 bg-amber-950" />
        </div>
      </div>
    );
  }
  if (id === ItemId.APPLE) {
    return (
      <div className={`${baseClasses}`}>
        <div className="w-6 h-6 bg-red-600 border border-red-800 rounded-full flex items-center justify-center shadow-inner">
          <div className="w-1 h-2 bg-emerald-700 absolute -top-1 rounded" />
        </div>
      </div>
    );
  }
  if (id === ItemId.RAW_BEEF) {
    return <div className={`${baseClasses} border border-red-900 bg-red-500 rounded-md transform rotate-[-12deg]`} />;
  }
  if (id === ItemId.COOKED_BEEF) {
    return <div className={`${baseClasses} border border-amber-950 bg-amber-900 rounded-md shadow-md`} />;
  }

  return <div className={`${baseClasses} bg-slate-700`} />;
};

export const InventoryMenu: React.FC<InventoryMenuProps> = ({
  isOpen,
  onClose,
  player,
  onChangePlayer,
  mode,
  furnaceState,
  onChangeFurnace,
}) => {
  // Cursor item stack (the item being held and moved around)
  const [cursorStack, setCursorStack] = useState<ItemStack | null>(null);

  // Local crafting grid state
  // Inventory mode: 2x2 grid (size 4). Crafting Table mode: 3x3 grid (size 9).
  const craftingGridSize = mode === 'crafting_table' ? 9 : 4;
  const craftingGridWidth = mode === 'crafting_table' ? 3 : 2;
  const [craftingGrid, setCraftingGrid] = useState<(ItemId | null)[]>(new Array(craftingGridSize).fill(null));
  const [craftingOutput, setCraftingOutput] = useState<ItemStack | null>(null);

  // Update crafting output whenever grid changes
  useEffect(() => {
    const result = matchRecipe(craftingGrid, craftingGridWidth);
    setCraftingOutput(result);
  }, [craftingGrid, mode]);

  if (!isOpen) return null;

  // Sound triggers
  const playSlotClick = () => sounds.playCraft();

  // Handle Slot Interaction (Swapping, placing, picking up)
  const handleSlotClick = (slotIdx: number, type: 'inventory' | 'craft' | 'craft_output' | 'furnace_input' | 'furnace_fuel' | 'furnace_output') => {
    playSlotClick();

    if (type === 'inventory') {
      const inv = [...player.inventory];
      const clicked = inv[slotIdx];

      if (!cursorStack && clicked) {
        // Pick up slot
        setCursorStack(clicked);
        inv[slotIdx] = null;
      } else if (cursorStack && !clicked) {
        // Place cursor stack in empty slot
        inv[slotIdx] = cursorStack;
        setCursorStack(null);
      } else if (cursorStack && clicked) {
        if (cursorStack.id === clicked.id) {
          // Merge stacks
          const mergedCount = clicked.count + cursorStack.count;
          if (mergedCount <= 64) {
            inv[slotIdx] = { id: clicked.id, count: mergedCount };
            setCursorStack(null);
          } else {
            inv[slotIdx] = { id: clicked.id, count: 64 };
            setCursorStack({ id: clicked.id, count: mergedCount - 64 });
          }
        } else {
          // Swap stacks
          inv[slotIdx] = cursorStack;
          setCursorStack(clicked);
        }
      }
      onChangePlayer({ ...player, inventory: inv });
    }

    if (type === 'craft') {
      const grid = [...craftingGrid];
      const clicked = grid[slotIdx];

      if (!cursorStack && clicked) {
        setCursorStack({ id: clicked, count: 1 });
        grid[slotIdx] = null;
      } else if (cursorStack && !clicked) {
        grid[slotIdx] = cursorStack.id;
        if (cursorStack.count > 1) {
          setCursorStack({ id: cursorStack.id, count: cursorStack.count - 1 });
        } else {
          setCursorStack(null);
        }
      } else if (cursorStack && clicked) {
        // Swap or place
        grid[slotIdx] = cursorStack.id;
        setCursorStack({ id: clicked, count: 1 });
      }
      setCraftingGrid(grid);
    }

    if (type === 'craft_output') {
      if (craftingOutput) {
        if (!cursorStack) {
          // Pick up result
          sounds.playCraft();
          setCursorStack(craftingOutput);

          // Consume 1 from each slot in crafting grid
          const grid = craftingGrid.map((item) => {
            if (item) return item; // In 2D minecraft we assume grid items are depleted by 1 (which are infinite in grid cell placeholders or we decrement from inventory if dragged). In normal simple craft, placing a block sets the ID. Let's make it so consuming recipes clears the grid block ID!
            return null;
          });
          // Decrement formula: since we set flat ID strings, we clear the pattern cells on craft!
          setCraftingGrid(new Array(craftingGridSize).fill(null));
        } else if (cursorStack.id === craftingOutput.id && cursorStack.count + craftingOutput.count <= 64) {
          sounds.playCraft();
          setCursorStack({ id: cursorStack.id, count: cursorStack.count + craftingOutput.count });
          setCraftingGrid(new Array(craftingGridSize).fill(null));
        }
      }
    }

    // Furnace slots
    if (mode === 'furnace' && furnaceState && onChangeFurnace) {
      if (type === 'furnace_input') {
        const currentInput = furnaceState.inputSlot;
        if (!cursorStack && currentInput) {
          setCursorStack(currentInput);
          onChangeFurnace({ ...furnaceState, inputSlot: null });
        } else if (cursorStack && !currentInput) {
          onChangeFurnace({ ...furnaceState, inputSlot: cursorStack });
          setCursorStack(null);
        } else if (cursorStack && currentInput) {
          if (cursorStack.id === currentInput.id) {
            const sum = currentInput.count + cursorStack.count;
            if (sum <= 64) {
              onChangeFurnace({ ...furnaceState, inputSlot: { id: currentInput.id, count: sum } });
              setCursorStack(null);
            } else {
              onChangeFurnace({ ...furnaceState, inputSlot: { id: currentInput.id, count: 64 } });
              setCursorStack({ id: currentInput.id, count: sum - 64 });
            }
          } else {
            onChangeFurnace({ ...furnaceState, inputSlot: cursorStack });
            setCursorStack(currentInput);
          }
        }
      }

      if (type === 'furnace_fuel') {
        const currentFuel = furnaceState.fuelSlot;
        if (!cursorStack && currentFuel) {
          setCursorStack(currentFuel);
          onChangeFurnace({ ...furnaceState, fuelSlot: null });
        } else if (cursorStack && !currentFuel && FUEL_BURN_TIMES[cursorStack.id]) {
          onChangeFurnace({ ...furnaceState, fuelSlot: cursorStack });
          setCursorStack(null);
        } else if (cursorStack && currentFuel && FUEL_BURN_TIMES[cursorStack.id]) {
          if (cursorStack.id === currentFuel.id) {
            const sum = currentFuel.count + cursorStack.count;
            if (sum <= 64) {
              onChangeFurnace({ ...furnaceState, fuelSlot: { id: currentFuel.id, count: sum } });
              setCursorStack(null);
            } else {
              onChangeFurnace({ ...furnaceState, fuelSlot: { id: currentFuel.id, count: 64 } });
              setCursorStack({ id: currentFuel.id, count: sum - 64 });
            }
          } else {
            onChangeFurnace({ ...furnaceState, fuelSlot: cursorStack });
            setCursorStack(currentFuel);
          }
        }
      }

      if (type === 'furnace_output') {
        const currentOutput = furnaceState.outputSlot;
        if (currentOutput) {
          if (!cursorStack) {
            setCursorStack(currentOutput);
            onChangeFurnace({ ...furnaceState, outputSlot: null });
          } else if (cursorStack.id === currentOutput.id && cursorStack.count + currentOutput.count <= 64) {
            setCursorStack({ id: cursorStack.id, count: cursorStack.count + currentOutput.count });
            onChangeFurnace({ ...furnaceState, outputSlot: null });
          }
        }
      }
    }
  };

  // Quick Action: Eat food directly from Inventory!
  const handleEatFood = (itemId: ItemId, slotIdx: number) => {
    const restore = FOOD_RESTORE[itemId];
    if (restore && player.hunger < player.maxHunger) {
      sounds.playEat();
      const newHunger = Math.min(player.maxHunger, player.hunger + restore.hunger);
      const newHealth = Math.min(player.maxHealth, player.health + restore.health);
      
      const inv = [...player.inventory];
      const stack = inv[slotIdx];
      if (stack) {
        if (stack.count > 1) {
          inv[slotIdx] = { id: itemId, count: stack.count - 1 };
        } else {
          inv[slotIdx] = null;
        }
        onChangePlayer({
          ...player,
          hunger: newHunger,
          health: newHealth,
          inventory: inv,
        });
      }
    }
  };

  // Clear Crafting Grid on click
  const handleClearCrafting = () => {
    setCraftingGrid(new Array(craftingGridSize).fill(null));
    sounds.playBreak('dirt' as any);
  };

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Floating Cursor Stack */}
      {cursorStack && (
        <div className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] scale-110">
          <ItemIcon id={cursorStack.id} size="w-12 h-12" />
          <span className="bg-slate-950 border border-slate-700 text-yellow-400 text-xs px-1.5 py-0.5 rounded font-mono font-bold">
            {cursorStack.count}
          </span>
        </div>
      )}

      {/* Main Panel Container */}
      <div className="w-full max-w-2xl bg-slate-900 border-4 border-slate-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Title Bar */}
        <div className="bg-slate-950 px-4 py-3 border-b-2 border-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-wider text-slate-200">
              {mode === 'inventory' ? 'SURVIVAL INVENTORY' : mode === 'crafting_table' ? 'CRAFTING TABLE' : 'FURNACE SMELTER'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-400 hover:text-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Panels */}
        <div className="p-4 md:p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          
          {/* TOP HALF: Crafting or Smelting Interface */}
          {mode !== 'inventory' && (
            <div className="bg-slate-950/40 border-2 border-slate-950 p-4 rounded-xl flex flex-col md:flex-row items-center justify-around gap-6">
              
              {/* Left Column: Input Fields */}
              {mode === 'crafting_table' && (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Hammer className="w-4 h-4 text-amber-500" />
                    <span>3x3 Crafting</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 shadow-inner">
                    {craftingGrid.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSlotClick(idx, 'craft')}
                        className="w-12 h-12 bg-slate-800 border-2 border-slate-950 rounded-lg hover:border-amber-500 active:scale-95 cursor-pointer transition flex items-center justify-center relative shadow-sm"
                      >
                        {item && <ItemIcon id={item} />}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleClearCrafting}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2.5 py-1 rounded-md border border-slate-700 cursor-pointer"
                  >
                    Clear Grid
                  </button>
                </div>
              )}

              {mode === 'furnace' && furnaceState && (
                <div className="flex items-center gap-6">
                  {/* Furnace left side: inputs and fuel */}
                  <div className="flex flex-col gap-3 items-center">
                    <span className="text-xs font-bold text-slate-400">INPUT</span>
                    <div
                      onClick={() => handleSlotClick(0, 'furnace_input')}
                      className="w-14 h-14 bg-slate-800 border-2 border-slate-950 rounded-lg hover:border-orange-500 active:scale-95 cursor-pointer transition flex flex-col items-center justify-center relative shadow-md"
                    >
                      {furnaceState.inputSlot ? (
                        <>
                          <ItemIcon id={furnaceState.inputSlot.id} />
                          <span className="absolute bottom-1 right-1 text-[10px] bg-slate-950/80 px-1 rounded text-slate-200 font-mono">
                            {furnaceState.inputSlot.count}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500">Ore</span>
                      )}
                    </div>

                    {/* Smelting Flames */}
                    <div className="flex flex-col items-center text-orange-500 py-1">
                      <Flame
                        className={`w-6 h-6 ${
                          furnaceState.fuelBurnTime > 0 ? 'animate-bounce text-orange-500' : 'text-slate-700'
                        }`}
                      />
                      {furnaceState.fuelBurnTime > 0 && (
                        <span className="text-[8px] font-mono text-orange-400">
                          {Math.round((furnaceState.fuelBurnTime / furnaceState.maxFuelBurnTime) * 100)}%
                        </span>
                      )}
                    </div>

                    <div
                      onClick={() => handleSlotClick(0, 'furnace_fuel')}
                      className="w-14 h-14 bg-slate-800 border-2 border-slate-950 rounded-lg hover:border-orange-500 active:scale-95 cursor-pointer transition flex flex-col items-center justify-center relative shadow-md"
                    >
                      {furnaceState.fuelSlot ? (
                        <>
                          <ItemIcon id={furnaceState.fuelSlot.id} />
                          <span className="absolute bottom-1 right-1 text-[10px] bg-slate-950/80 px-1 rounded text-slate-200 font-mono">
                            {furnaceState.fuelSlot.count}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500">Fuel</span>
                      )}
                    </div>
                  </div>

                  {/* Cooking Progress */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-slate-400">COOKING</span>
                    <div className="w-16 h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden shadow-inner relative">
                      <div
                        className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 transition-all duration-100"
                        style={{ width: `${furnaceState.cookProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Arrow separator */}
              <div className="hidden md:flex flex-col items-center text-slate-600">
                <ArrowDown className="w-8 h-8 rotate-[-90deg] stroke-[3]" />
              </div>

              {/* Right Column: Output Result */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">OUTPUT</span>
                
                {mode === 'crafting_table' && (
                  <div
                    onClick={() => handleSlotClick(0, 'craft_output')}
                    className="w-16 h-16 bg-slate-900 border-2 border-emerald-500 rounded-xl hover:bg-slate-850 active:scale-95 cursor-pointer transition flex flex-col items-center justify-center relative shadow-lg"
                  >
                    {craftingOutput ? (
                      <>
                        <ItemIcon id={craftingOutput.id} size="w-12 h-12" />
                        <span className="absolute bottom-1.5 right-1.5 text-xs bg-slate-950/90 px-1.5 py-0.5 rounded text-yellow-400 font-mono font-bold">
                          {craftingOutput.count}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold">Empty</span>
                    )}
                  </div>
                )}

                {mode === 'furnace' && furnaceState && (
                  <div
                    onClick={() => handleSlotClick(0, 'furnace_output')}
                    className="w-16 h-16 bg-slate-900 border-2 border-orange-500 rounded-xl hover:bg-slate-850 active:scale-95 cursor-pointer transition flex flex-col items-center justify-center relative shadow-lg"
                  >
                    {furnaceState.outputSlot ? (
                      <>
                        <ItemIcon id={furnaceState.outputSlot.id} size="w-12 h-12" />
                        <span className="absolute bottom-1.5 right-1.5 text-xs bg-slate-950/90 px-1.5 py-0.5 rounded text-yellow-400 font-mono font-bold">
                          {furnaceState.outputSlot.count}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold">Empty</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 2x2 Basic Crafting Inside Inventory */}
          {mode === 'inventory' && (
            <div className="bg-slate-950/30 border-2 border-slate-950 p-4 rounded-xl flex items-center justify-around gap-4">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-400">2x2 Crafting</span>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-inner">
                  {craftingGrid.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSlotClick(idx, 'craft')}
                      className="w-11 h-11 bg-slate-800 border-2 border-slate-950 rounded-lg hover:border-amber-500 active:scale-95 cursor-pointer transition flex items-center justify-center relative shadow-sm"
                    >
                      {item && <ItemIcon id={item} />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-slate-600">
                <ArrowDown className="w-6 h-6 rotate-[-90deg] stroke-[3]" />
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-400">RESULT</span>
                <div
                  onClick={() => handleSlotClick(0, 'craft_output')}
                  className="w-14 h-14 bg-slate-900 border-2 border-emerald-500 rounded-xl hover:bg-slate-850 active:scale-95 cursor-pointer transition flex flex-col items-center justify-center relative shadow-md"
                >
                  {craftingOutput ? (
                    <>
                      <ItemIcon id={craftingOutput.id} size="w-10 h-10" />
                      <span className="absolute bottom-1 right-1 text-xs bg-slate-950/90 px-1 rounded text-yellow-400 font-mono font-bold">
                        {craftingOutput.count}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-bold">Empty</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM HALF: The main Inventory list */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Main Inventory (27 slots)</span>
            <div className="grid grid-cols-9 gap-1.5 bg-slate-950 p-3 rounded-xl border border-slate-950 shadow-inner">
              {player.inventory.slice(9, 36).map((stack, idx) => {
                const adjustedIdx = idx + 9; // skip hotbar indices (0-8)
                const isFood = stack && FOOD_RESTORE[stack.id];
                return (
                  <div
                    key={adjustedIdx}
                    onClick={() => handleSlotClick(adjustedIdx, 'inventory')}
                    className="w-12 h-12 bg-slate-800 border-2 border-slate-950 rounded-lg hover:border-emerald-500 active:scale-95 cursor-pointer transition flex flex-col items-center justify-center relative group shadow-sm"
                  >
                    {stack ? (
                      <>
                        <ItemIcon id={stack.id} />
                        <span className="absolute bottom-1 right-1 text-[10px] bg-slate-950/90 px-1 rounded text-slate-200 font-mono font-bold">
                          {stack.count}
                        </span>
                        
                        {/* Eat prompt overlay on hover */}
                        {isFood && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEatFood(stack.id, adjustedIdx);
                            }}
                            className="absolute inset-0 bg-emerald-600/90 rounded-md text-[10px] font-black text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            EAT
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[8px] text-slate-700 font-mono">{adjustedIdx}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* HOTBAR SLOTS (9 slots at the bottom) */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hotbar (9 slots)</span>
            <div className="grid grid-cols-9 gap-1.5 bg-slate-950 p-3 rounded-xl border-2 border-slate-950 shadow-inner">
              {player.inventory.slice(0, 9).map((stack, idx) => {
                const isFood = stack && FOOD_RESTORE[stack.id];
                return (
                  <div
                    key={idx}
                    onClick={() => handleSlotClick(idx, 'inventory')}
                    className={`w-12 h-12 bg-slate-800 border-2 rounded-lg hover:border-yellow-500 active:scale-95 cursor-pointer transition flex flex-col items-center justify-center relative group shadow-md ${
                      player.activeSlot === idx ? 'border-yellow-400 bg-slate-700 ring-2 ring-yellow-400/50' : 'border-slate-950'
                    }`}
                  >
                    {stack ? (
                      <>
                        <ItemIcon id={stack.id} />
                        <span className="absolute bottom-1 right-1 text-[10px] bg-slate-950/90 px-1 rounded text-slate-200 font-mono font-bold">
                          {stack.count}
                        </span>

                        {isFood && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEatFood(stack.id, idx);
                            }}
                            className="absolute inset-0 bg-emerald-600/90 rounded-md text-[10px] font-black text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            EAT
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[8px] text-slate-700 font-mono">{idx + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Info/Warning Footer */}
        <div className="bg-slate-950 px-4 py-3 border-t-2 border-slate-900 text-slate-400 text-[11px] flex justify-between items-center font-mono">
          <span>Click slots to swap items. Food has a quick-action "EAT" button on hover!</span>
          {cursorStack && (
            <span className="text-yellow-400 font-bold">Holding: {ITEM_LABELS[cursorStack.id]} ({cursorStack.count})</span>
          )}
        </div>

      </div>
    </div>
  );
};
