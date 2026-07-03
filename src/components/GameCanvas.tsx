/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { WorldData, BlockType, PlayerState, ItemId, ItemStack, ItemEntity, MobEntity, EntityType, Particle, FurnaceState, GameSettings } from '../types';
import { sounds } from '../sound';
import { FUEL_BURN_TIMES, SMELTING_RECIPES } from '../recipes';

interface GameCanvasProps {
  worldData: WorldData;
  onChangeWorldData: (data: WorldData) => void;
  settings: GameSettings;
  onOpenInventory: (mode: 'inventory' | 'crafting_table' | 'furnace') => void;
  onOpenPauseMenu: () => void;
  interactionMode: 'mine' | 'place';
  // Mobile inputs
  mobileKeys: {
    left: boolean;
    right: boolean;
    jump: boolean;
  };
}

const BLOCK_SIZE = 32; // Pixels per block unit
const GRAVITY = 0.22;
const MAX_FALL_SPEED = 8;
const PLAYER_SPEED = 0.12;
const JUMP_FORCE = -4.5;
const REACH_DISTANCE = 6.5; // block reach

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldData,
  onChangeWorldData,
  settings,
  onOpenInventory,
  onOpenPauseMenu,
  interactionMode,
  mobileKeys,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keyboard keys state
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Active mining/breaking target block
  const miningRef = useRef<{ x: number; y: number; progress: number } | null>(null);

  // Mouse / crosshair block coordinates
  const [hoverBlock, setHoverBlock] = useState<{ x: number; y: number } | null>(null);

  // Game loop tick count
  const tickCountRef = useRef(0);

  // Particle systems
  const particlesRef = useRef<Particle[]>([]);

  // Smooth camera positions
  const cameraRef = useRef({ x: worldData.player.x, y: worldData.player.y });

  // Map BlockType enum to their names/properties
  const blockTypes: BlockType[] = Object.values(BlockType);

  // Get index of block type
  const getBlockIndex = (type: BlockType): number => blockTypes.indexOf(type);
  const getBlockFromIndex = (idx: number): BlockType => blockTypes[idx] || BlockType.AIR;

  const getBlock = (x: number, y: number): BlockType => {
    if (x < 0 || x >= worldData.width || y < 0 || y >= worldData.height) {
      return BlockType.BEDROCK; // Solid borders
    }
    return getBlockFromIndex(worldData.blocks[y * worldData.width + x]);
  };

  const setBlock = (x: number, y: number, type: BlockType) => {
    if (x >= 0 && x < worldData.width && y >= 0 && y < worldData.height) {
      const idx = getBlockIndex(type);
      worldData.blocks[y * worldData.width + x] = idx;
    }
  };

  const isSolid = (type: BlockType): boolean => {
    return (
      type !== BlockType.AIR &&
      type !== BlockType.TORCH
    );
  };

  // Add mining particle effects
  const spawnParticles = (x: number, y: number, color: string, count = 6) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x + 0.5,
        y: y + 0.5,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 1) * 3,
        color,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        size: 3 + Math.random() * 4,
      });
    }
  };

  // Check if a tool is active and returns mining multiplier
  const getMiningMultiplier = (toolId: ItemId | undefined, target: BlockType): number => {
    if (!toolId) return 1;

    const isStone = target === BlockType.STONE || target === BlockType.COBBLESTONE || target.endsWith('_ore') || target === BlockType.FURNACE;
    const isWood = target === BlockType.WOOD || target === BlockType.PLANK || target === BlockType.CRAFTING_TABLE;

    if (isStone) {
      if (toolId === ItemId.DIAMOND_PICKAXE) return 12;
      if (toolId === ItemId.IRON_PICKAXE) return 8;
      if (toolId === ItemId.STONE_PICKAXE) return 5;
      if (toolId === ItemId.WOOD_PICKAXE) return 3;
      return 0.3; // Bare hands on stone is extremely slow!
    }

    if (isWood) {
      if (toolId.endsWith('_pickaxe') || toolId.endsWith('_sword')) return 4;
      return 2;
    }

    return 1.5;
  };

  // Helper to determine block color for breaking particles
  const getBlockColor = (type: BlockType): string => {
    switch (type) {
      case BlockType.GRASS: return '#16a34a';
      case BlockType.DIRT: return '#78350f';
      case BlockType.STONE: return '#52525b';
      case BlockType.COBBLESTONE: return '#71717a';
      case BlockType.WOOD: return '#b45309';
      case BlockType.LEAVES: return '#047857';
      case BlockType.PLANK: return '#d97706';
      case BlockType.CRAFTING_TABLE: return '#f59e0b';
      case BlockType.FURNACE: return '#4b5563';
      case BlockType.COAL_ORE: return '#1c1917';
      case BlockType.IRON_ORE: return '#fed7aa';
      case BlockType.GOLD_ORE: return '#fef08a';
      case BlockType.DIAMOND_ORE: return '#99f6e4';
      default: return '#78350f';
    }
  };

  // Add Item Drop to Player's Inventory
  const collectItem = (itemId: ItemId) => {
    const inv = [...worldData.player.inventory];
    
    // 1. Try to merge into existing stacks in hotbar first
    for (let i = 0; i < 9; i++) {
      const stack = inv[i];
      if (stack && stack.id === itemId && stack.count < 64) {
        inv[i] = { id: itemId, count: stack.count + 1 };
        onChangeWorldData({
          ...worldData,
          player: { ...worldData.player, inventory: inv }
        });
        sounds.playCraft(); // click/collect noise
        return;
      }
    }

    // 2. Try to merge into main inventory
    for (let i = 9; i < 36; i++) {
      const stack = inv[i];
      if (stack && stack.id === itemId && stack.count < 64) {
        inv[i] = { id: itemId, count: stack.count + 1 };
        onChangeWorldData({
          ...worldData,
          player: { ...worldData.player, inventory: inv }
        });
        sounds.playCraft();
        return;
      }
    }

    // 3. Find empty hotbar slot
    for (let i = 0; i < 9; i++) {
      if (!inv[i]) {
        inv[i] = { id: itemId, count: 1 };
        onChangeWorldData({
          ...worldData,
          player: { ...worldData.player, inventory: inv }
        });
        sounds.playCraft();
        return;
      }
    }

    // 4. Find empty main inventory slot
    for (let i = 9; i < 36; i++) {
      if (!inv[i]) {
        inv[i] = { id: itemId, count: 1 };
        onChangeWorldData({
          ...worldData,
          player: { ...worldData.player, inventory: inv }
        });
        sounds.playCraft();
        return;
      }
    }
  };

  // Mine / Break block
  const performBreakBlock = (bx: number, by: number) => {
    const block = getBlock(bx, by);
    if (block === BlockType.AIR || block === BlockType.BEDROCK) return;

    sounds.playBreak(block);
    spawnParticles(bx, by, getBlockColor(block), 12);

    // Spawn floating item entity at block center
    let dropId: ItemId | null = block as unknown as ItemId;
    
    // Special conversions
    if (block === BlockType.STONE) {
      dropId = ItemId.COBBLESTONE;
    } else if (block === BlockType.COAL_ORE) {
      dropId = ItemId.COAL;
    } else if (block === BlockType.DIAMOND_ORE) {
      dropId = ItemId.DIAMOND;
    }

    if (dropId) {
      worldData.itemEntities.push({
        id: Math.random().toString(),
        itemId: dropId,
        x: bx + 0.3 + Math.random() * 0.4,
        y: by + 0.1,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.5,
        age: 0,
      });
    }

    // Erase block
    setBlock(bx, by, BlockType.AIR);

    // If it was a furnace, remove its state
    const key = `${bx},${by}`;
    if (worldData.furnaces[key]) {
      delete worldData.furnaces[key];
    }

    onChangeWorldData({ ...worldData });
  };

  // Place block from Hotbar
  const performPlaceBlock = (bx: number, by: number) => {
    const activeSlot = worldData.player.activeSlot;
    const inv = [...worldData.player.inventory];
    const stack = inv[activeSlot];

    if (!stack) return;

    // Verify it is a placeable block
    const placeableBlocks = Object.values(BlockType);
    let targetBlockType = stack.id as unknown as BlockType;

    // Special conversions
    if (stack.id === ItemId.COBBLESTONE) {
      targetBlockType = BlockType.COBBLESTONE;
    }

    if (!placeableBlocks.includes(targetBlockType)) return;

    // Check bounds & if space is air
    if (getBlock(bx, by) !== BlockType.AIR) return;

    // Check player collision (can't place inside player body)
    const playerBox = {
      left: worldData.player.x,
      right: worldData.player.x + worldData.player.width,
      top: worldData.player.y,
      bottom: worldData.player.y + worldData.player.height,
    };
    const blockBox = {
      left: bx,
      right: bx + 1,
      top: by,
      bottom: by + 1,
    };

    const isColliding =
      playerBox.left < blockBox.right &&
      playerBox.right > blockBox.left &&
      playerBox.top < blockBox.bottom &&
      playerBox.bottom > blockBox.top;

    if (isColliding && isSolid(targetBlockType)) return;

    // Place block
    setBlock(bx, by, targetBlockType);
    sounds.playPlace(targetBlockType);

    // Create furnace state if placed furnace
    if (targetBlockType === BlockType.FURNACE) {
      worldData.furnaces[`${bx},${by}`] = {
        fuelSlot: null,
        inputSlot: null,
        outputSlot: null,
        cookProgress: 0,
        fuelBurnTime: 0,
        maxFuelBurnTime: 0,
      };
    }

    // Decrement item stack
    if (stack.count > 1) {
      inv[activeSlot] = { id: stack.id, count: stack.count - 1 };
    } else {
      inv[activeSlot] = null;
    }

    onChangeWorldData({
      ...worldData,
      player: { ...worldData.player, inventory: inv },
    });
  };

  // Handle click on canvas
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !hoverBlock) return;

    const dx = hoverBlock.x - worldData.player.x;
    const dy = hoverBlock.y - worldData.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > REACH_DISTANCE) return;

    // Right-Click or Place mode -> Place block
    const isRightClick = e.button === 2;
    if (isRightClick || interactionMode === 'place') {
      e.preventDefault();

      const clickedBlock = getBlock(hoverBlock.x, hoverBlock.y);
      
      // If clicked on Crafting Table or Furnace, open custom UI!
      if (!isRightClick && clickedBlock === BlockType.CRAFTING_TABLE) {
        onOpenInventory('crafting_table');
        return;
      }
      if (!isRightClick && clickedBlock === BlockType.FURNACE) {
        onOpenInventory('furnace');
        return;
      }

      performPlaceBlock(hoverBlock.x, hoverBlock.y);
    } else {
      // Left-click -> Mine
      const block = getBlock(hoverBlock.x, hoverBlock.y);
      if (block !== BlockType.AIR && block !== BlockType.BEDROCK) {
        miningRef.current = { x: hoverBlock.x, y: hoverBlock.y, progress: 0 };
      }
    }
  };

  // Prevent right-click menu context
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hoverBlock) {
      const clickedBlock = getBlock(hoverBlock.x, hoverBlock.y);
      if (clickedBlock === BlockType.CRAFTING_TABLE) {
        onOpenInventory('crafting_table');
        return;
      }
      if (clickedBlock === BlockType.FURNACE) {
        onOpenInventory('furnace');
        return;
      }
      performPlaceBlock(hoverBlock.x, hoverBlock.y);
    }
  };

  // Setup global event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;

      // Quick hotbar hotkeys (1-9)
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        onChangeWorldData({
          ...worldData,
          player: { ...worldData.player, activeSlot: num - 1 },
        });
        sounds.playCraft();
      }

      // Inventory toggle (E or I)
      if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'i') {
        onOpenInventory('inventory');
      }

      // Pause toggle
      if (e.key === 'Escape') {
        onOpenPauseMenu();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [worldData, onChangeWorldData, onOpenInventory, onOpenPauseMenu]);

  // Main tick physics & rendering loop
  useEffect(() => {
    let animationId: number;

    const gameTick = () => {
      tickCountRef.current++;

      // 1. In-game Time updates
      worldData.metadata.gameTime = (worldData.metadata.gameTime + 1) % 24000;

      // 2. Player input updates
      const p = worldData.player;
      let dx = 0;

      if (keysRef.current['a'] || keysRef.current['arrowleft'] || mobileKeys.left) {
        dx = -PLAYER_SPEED;
        p.facingRight = false;
      }
      if (keysRef.current['d'] || keysRef.current['arrowright'] || mobileKeys.right) {
        dx = PLAYER_SPEED;
        p.facingRight = true;
      }

      p.vx = dx;

      // Jump input
      if ((keysRef.current[' '] || keysRef.current['w'] || keysRef.current['arrowup'] || mobileKeys.jump) && p.isGrounded) {
        p.vy = JUMP_FORCE;
        p.isGrounded = false;
        sounds.playJump();
      }

      // Apply gravity
      if (!p.isGrounded) {
        p.vy = Math.min(MAX_FALL_SPEED, p.vy + GRAVITY);
      }

      // Update positions with collision check
      // Move X
      p.x += p.vx;
      checkBlockCollisions(p, 'x');

      // Move Y
      p.y += p.vy;
      p.isGrounded = false;
      checkBlockCollisions(p, 'y');

      // Boundary check
      p.x = Math.max(0, Math.min(worldData.width - p.width, p.x));
      p.y = Math.max(0, Math.min(worldData.height - p.height, p.y));

      // 3. Mining progress update
      if (miningRef.current) {
        const activeTool = p.inventory[p.activeSlot]?.id;
        const targetType = getBlock(miningRef.current.x, miningRef.current.y);
        
        if (targetType === BlockType.AIR || targetType === BlockType.BEDROCK) {
          miningRef.current = null;
        } else {
          const mult = getMiningMultiplier(activeTool, targetType);
          miningRef.current.progress += 2.5 * mult;

          // Emit small drilling dust particles
          if (tickCountRef.current % 4 === 0) {
            spawnParticles(miningRef.current.x, miningRef.current.y, getBlockColor(targetType), 2);
          }

          if (miningRef.current.progress >= 100) {
            performBreakBlock(miningRef.current.x, miningRef.current.y);
            miningRef.current = null;
          }
        }
      }

      // 4. Update Furnace processing
      Object.keys(worldData.furnaces).forEach((coordKey) => {
        const f = worldData.furnaces[coordKey];
        if (!f) return;
        // Furnace ticks
        let changed = false;

        if (f.fuelBurnTime > 0) {
          f.fuelBurnTime--;
          changed = true;
        }

        // If burn time run out, try to consume fuel if input exists
        if (f.fuelBurnTime <= 0 && f.inputSlot) {
          // Check if smelting recipe exists for input
          const recipe = SMELTING_RECIPES.find((r) => r.input === f.inputSlot?.id);
          if (recipe) {
            // Check if fuel is valid
            if (f.fuelSlot && FUEL_BURN_TIMES[f.fuelSlot.id]) {
              const burnValue = FUEL_BURN_TIMES[f.fuelSlot.id] || 0;
              f.fuelBurnTime = burnValue;
              f.maxFuelBurnTime = burnValue;

              // Decrement fuel stack
              if (f.fuelSlot.count > 1) {
                f.fuelSlot = { id: f.fuelSlot.id, count: f.fuelSlot.count - 1 };
              } else {
                f.fuelSlot = null;
              }
              changed = true;
            }
          }
        }

        // Cook items if active burn
        if (f.fuelBurnTime > 0 && f.inputSlot) {
          const recipe = SMELTING_RECIPES.find((r) => r.input === f.inputSlot?.id);
          if (recipe) {
            // Check if output slot is compatible or empty
            const canOutput =
              !f.outputSlot ||
              (f.outputSlot.id === recipe.result.id && f.outputSlot.count + recipe.result.count <= 64);

            if (canOutput) {
              f.cookProgress += 100 / recipe.cookTime;
              changed = true;

              if (f.cookProgress >= 100) {
                f.cookProgress = 0;
                
                // Decrement input stack
                if (f.inputSlot.count > 1) {
                  f.inputSlot = { id: f.inputSlot.id, count: f.inputSlot.count - 1 };
                } else {
                  f.inputSlot = null;
                }

                // Add to output stack
                if (f.outputSlot) {
                  f.outputSlot = { id: recipe.result.id, count: f.outputSlot.count + recipe.result.count };
                } else {
                  f.outputSlot = { ...recipe.result };
                }
              }
            } else {
              f.cookProgress = 0;
            }
          } else {
            f.cookProgress = 0;
          }
        } else {
          f.cookProgress = Math.max(0, f.cookProgress - 1);
        }

        if (changed) {
          worldData.furnaces[coordKey] = { ...f };
        }
      });

      // 5. Update floating items vacuum physics
      worldData.itemEntities = worldData.itemEntities.filter((item) => {
        item.age++;
        
        // Gravity
        item.vy = Math.min(4, item.vy + 0.15);
        item.x += item.vx;
        item.y += item.vy;

        // Friction and bouncing on blocks
        const bx = Math.floor(item.x);
        const by = Math.floor(item.y);
        const below = getBlock(bx, by + 1);
        if (isSolid(below) && item.y % 1 > 0.8) {
          item.vy = -item.vy * 0.4; // bounce
          item.vx *= 0.7; // friction
          item.y = by + 0.8;
        }

        // Distance to player
        const dx = (p.x + p.width/2) - item.x;
        const dy = (p.y + p.height/2) - item.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 1.8) {
          // Vacuum float towards player
          item.x += (dx / dist) * 0.15;
          item.y += (dy / dist) * 0.15;
          
          if (dist < 0.6) {
            collectItem(item.itemId);
            return false; // delete drop
          }
        }

        // Discard items older than 5 minutes (18000 ticks)
        return item.age < 18000;
      });

      // 6. Update Mobs movement and AI
      worldData.mobs.forEach((mob) => {
        // Apply gravity
        if (!mob.isGrounded) {
          mob.vy = Math.min(MAX_FALL_SPEED, mob.vy + GRAVITY);
        }

        // Zombie / Creeper hostile AI towards player
        const dx = p.x - mob.x;
        const dy = p.y - mob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (mob.type === EntityType.ZOMBIE || mob.type === EntityType.CREEPER) {
          if (dist < 10) {
            // Chase
            mob.vx = Math.sign(dx) * 0.05;
            mob.facingRight = mob.vx > 0;

            // Simple hurdle jump
            const frontX = Math.floor(mob.vx > 0 ? mob.x + mob.width + 0.2 : mob.x - 0.2);
            const frontY = Math.floor(mob.y + mob.height - 0.5);
            if (isSolid(getBlock(frontX, frontY)) && mob.isGrounded) {
              mob.vy = -3.5;
              mob.isGrounded = false;
            }

            // Hurt player if zombie touches
            if (mob.type === EntityType.ZOMBIE && dist < 0.8 && tickCountRef.current % 45 === 0) {
              p.health = Math.max(0, p.health - 2);
              sounds.playHurt();
              p.vy = -1.5; // slight knockback
              p.vx = Math.sign(dx) * 1.5;
            }

            // Creeper explode sequence
            if (mob.type === EntityType.CREEPER && dist < 1.5) {
              mob.vx = 0; // stop to explode
              // Play hiss sounds
              if (tickCountRef.current % 20 === 0) {
                sounds.playPlace(BlockType.GRASS); // hissing thud approximation
              }

              // Explode timer (simulate with a count or explode immediately if close)
              if (Math.random() < 0.03) {
                triggerExplosion(mob.x, mob.y);
                mob.health = 0; // dies
              }
            }
          } else {
            // Wander peacefully
            wanderAI(mob);
          }
        } else {
          // Cow/Chicken Peaceful wander
          wanderAI(mob);
        }

        mob.x += mob.vx;
        checkMobCollisions(mob, 'x');

        mob.y += mob.vy;
        mob.isGrounded = false;
        checkMobCollisions(mob, 'y');
      });

      // Remove dead mobs
      worldData.mobs = worldData.mobs.filter((m) => m.health > 0);

      // Periodically spawn mobs at night or deep underground
      if (tickCountRef.current % 600 === 0 && worldData.mobs.length < 15) {
        spawnRandomMob();
      }

      // 7. Update particles
      particlesRef.current = particlesRef.current.filter((pt) => {
        pt.life++;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.12; // gravity on particles
        return pt.life < pt.maxLife;
      });

      // 8. Draw Frame
      drawGame();

      animationId = requestAnimationFrame(gameTick);
    };

    // Trigger game loop
    animationId = requestAnimationFrame(gameTick);

    return () => cancelAnimationFrame(animationId);
  }, [worldData, mobileKeys, interactionMode]);

  // Handle Creeper explosions
  const triggerExplosion = (ex: number, ey: number) => {
    sounds.playExplosion();

    // Damage blocks in a radius
    const radius = 3;
    const centerBlockX = Math.floor(ex);
    const centerBlockY = Math.floor(ey);

    for (let x = centerBlockX - radius; x <= centerBlockX + radius; x++) {
      for (let y = centerBlockY - radius; y <= centerBlockY + radius; y++) {
        const dx = x - centerBlockX;
        const dy = y - centerBlockY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          const current = getBlock(x, y);
          if (current !== BlockType.BEDROCK && current !== BlockType.AIR) {
            // Chance to break block
            if (Math.random() < 0.8) {
              setBlock(x, y, BlockType.AIR);
              // Spawn dust particles
              spawnParticles(x, y, '#222222', 3);
            }
          }
        }
      }
    }

    // Hurt player if close
    const pdx = worldData.player.x - ex;
    const pdy = worldData.player.y - ey;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
    if (pdist < 4) {
      const damage = Math.floor((4 - pdist) * 5);
      worldData.player.health = Math.max(0, worldData.player.health - damage);
      sounds.playHurt();
      // Huge knockback
      worldData.player.vx = Math.sign(pdx) * 4;
      worldData.player.vy = -3;
    }

    // Spurt beautiful explosion particles
    for (let i = 0; i < 24; i++) {
      particlesRef.current.push({
        x: ex + 0.5,
        y: ey + 0.5,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.7) * 8,
        color: Math.random() > 0.5 ? '#f97316' : '#facc15',
        life: 0,
        maxLife: 30 + Math.random() * 20,
        size: 5 + Math.random() * 8,
      });
    }

    onChangeWorldData({ ...worldData });
  };

  const spawnRandomMob = () => {
    const isNight = worldData.metadata.gameTime > 16000 || worldData.metadata.gameTime < 2000;
    const spawnX = Math.floor(Math.random() * worldData.width);
    
    // Find surface
    let spawnY = 0;
    for (let y = 0; y < worldData.height; y++) {
      if (isSolid(getBlock(spawnX, y))) {
        spawnY = y - 2;
        break;
      }
    }

    if (spawnY > 5) {
      const type = isNight
        ? Math.random() > 0.5 ? EntityType.ZOMBIE : EntityType.CREEPER
        : Math.random() > 0.5 ? EntityType.COW : EntityType.CHICKEN;

      worldData.mobs.push({
        id: Math.random().toString(),
        type,
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        width: type === EntityType.CHICKEN ? 0.6 : 0.9,
        height: type === EntityType.CHICKEN ? 0.8 : 1.2,
        health: type === EntityType.ZOMBIE ? 20 : 10,
        maxHealth: type === EntityType.ZOMBIE ? 20 : 10,
        facingRight: Math.random() > 0.5,
        hurtCooldown: 0,
        isGrounded: false,
        jumpCooldown: 0,
      });
    }
  };

  const wanderAI = (mob: MobEntity) => {
    if (Math.random() < 0.01) {
      // Toggle wander
      if (mob.vx !== 0) {
        mob.vx = 0;
      } else {
        mob.vx = (Math.random() > 0.5 ? 1 : -1) * 0.025;
        mob.facingRight = mob.vx > 0;
      }
    }

    // Try jump over small obstacles
    if (mob.vx !== 0 && mob.isGrounded && Math.random() < 0.05) {
      const frontX = Math.floor(mob.vx > 0 ? mob.x + mob.width + 0.1 : mob.x - 0.1);
      const frontY = Math.floor(mob.y + mob.height - 0.1);
      if (isSolid(getBlock(frontX, frontY))) {
        mob.vy = -3;
        mob.isGrounded = false;
      }
    }
  };

  // Precise block collisions check for player
  const checkBlockCollisions = (entity: any, axis: 'x' | 'y') => {
    const left = Math.floor(entity.x);
    const right = Math.ceil(entity.x + entity.width);
    const top = Math.floor(entity.y);
    const bottom = Math.ceil(entity.y + entity.height);

    for (let x = left; x < right; x++) {
      for (let y = top; y < bottom; y++) {
        const block = getBlock(x, y);
        if (isSolid(block)) {
          // Resolve overlap
          if (axis === 'x') {
            if (entity.vx > 0) {
              entity.x = x - entity.width;
              entity.vx = 0;
            } else if (entity.vx < 0) {
              entity.x = x + 1;
              entity.vx = 0;
            }
          } else {
            if (entity.vy > 0) {
              entity.y = y - entity.height;
              entity.vy = 0;
              entity.isGrounded = true;
            } else if (entity.vy < 0) {
              entity.y = y + 1;
              entity.vy = 0;
            }
          }
        }
      }
    }
  };

  // Precise collisions for mobs
  const checkMobCollisions = (mob: MobEntity, axis: 'x' | 'y') => {
    const left = Math.floor(mob.x);
    const right = Math.ceil(mob.x + mob.width);
    const top = Math.floor(mob.y);
    const bottom = Math.ceil(mob.y + mob.height);

    for (let x = left; x < right; x++) {
      for (let y = top; y < bottom; y++) {
        const block = getBlock(x, y);
        if (isSolid(block)) {
          if (axis === 'x') {
            if (mob.vx > 0) {
              mob.x = x - mob.width;
              mob.vx = -mob.vx; // bounce/turn
            } else if (mob.vx < 0) {
              mob.x = x + 1;
              mob.vx = -mob.vx;
            }
          } else {
            if (mob.vy > 0) {
              mob.y = y - mob.height;
              mob.vy = 0;
              mob.isGrounded = true;
            } else if (mob.vy < 0) {
              mob.y = y + 1;
              mob.vy = 0;
            }
          }
        }
      }
    }
  };

  // Canvas drawing logic
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Smoothly interpolate camera
    const p = worldData.player;
    cameraRef.current.x += (p.x - cameraRef.current.x) * 0.08;
    cameraRef.current.y += (p.y - cameraRef.current.y) * 0.08;

    const camX = cameraRef.current.x;
    const camY = cameraRef.current.y;

    // View offsets to center the camera on the player
    const offsetX = width / 2 - camX * BLOCK_SIZE;
    const offsetY = height / 2 - camY * BLOCK_SIZE;

    // Clear Screen
    ctx.clearRect(0, 0, width, height);

    // 2. Draw Sky Gradient (Morning, Day, Sunset, Night)
    const time = worldData.metadata.gameTime;
    let skyColor1 = '#38bdf8'; // mid-day light blue
    let skyColor2 = '#bae6fd';
    let cloudAlpha = 0.85;

    if (time > 14000 && time <= 16500) {
      // Afternoon sunset transition
      const ratio = (time - 14000) / 2500;
      skyColor1 = lerpColor('#38bdf8', '#f97316', ratio);
      skyColor2 = lerpColor('#bae6fd', '#312e81', ratio);
    } else if (time > 16500 && time <= 18000) {
      // Late sunset to night
      const ratio = (time - 16500) / 1500;
      skyColor1 = lerpColor('#f97316', '#0f172a', ratio);
      skyColor2 = lerpColor('#312e81', '#020617', ratio);
    } else if (time > 18000 || time <= 4000) {
      // Nighttime
      skyColor1 = '#090d16';
      skyColor2 = '#02040a';
      cloudAlpha = 0.15;
    } else if (time > 4000 && time <= 7000) {
      // Dawn/Sunrise
      const ratio = (time - 4000) / 3000;
      skyColor1 = lerpColor('#090d16', '#fdba74', ratio);
      skyColor2 = lerpColor('#02040a', '#bae6fd', ratio);
    } else if (time > 7000 && time <= 14000) {
      // Bright daylight
      skyColor1 = '#38bdf8';
      skyColor2 = '#bae6fd';
    }

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, skyColor1);
    grad.addColorStop(1, skyColor2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Twinkling stars at night
    if (time > 17500 || time < 4500) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = (Math.sin(i * 123.45) * 0.5 + 0.5) * width;
        const sy = (Math.cos(i * 543.21) * 0.5 + 0.5) * height * 0.7; // star band top
        const sparkle = Math.sin(tickCountRef.current * 0.08 + i) * 0.3 + 0.7;
        ctx.globalAlpha = sparkle;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1.0;
    }

    // Floating blocky clouds
    ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha})`;
    for (let i = 0; i < 5; i++) {
      const speed = 0.2 + i * 0.08;
      const cx = (((tickCountRef.current * speed) + i * 250) % (width + 200)) - 100;
      const cy = 40 + i * 24;
      ctx.fillRect(cx, cy, 64, 16);
      ctx.fillRect(cx + 12, cy - 8, 36, 8);
    }

    // 3. Draw Blocks (Sub-grid Frustum Culling)
    const minBlockX = Math.max(0, Math.floor(-offsetX / BLOCK_SIZE));
    const maxBlockX = Math.min(worldData.width - 1, Math.ceil((width - offsetX) / BLOCK_SIZE));
    const minBlockY = Math.max(0, Math.floor(-offsetY / BLOCK_SIZE));
    const maxBlockY = Math.min(worldData.height - 1, Math.ceil((height - offsetY) / BLOCK_SIZE));

    for (let x = minBlockX; x <= maxBlockX; x++) {
      for (let y = minBlockY; y <= maxBlockY; y++) {
        const block = getBlock(x, y);
        if (block !== BlockType.AIR) {
          drawBlock(ctx, x, y, block, offsetX, offsetY);
        }
      }
    }

    // 4. Draw Item Entities (Drops)
    worldData.itemEntities.forEach((item) => {
      const ix = item.x * BLOCK_SIZE + offsetX;
      const iy = item.y * BLOCK_SIZE + offsetY;
      
      // Floating bobbing effect
      const bob = Math.sin(tickCountRef.current * 0.1 + item.age * 0.05) * 3;

      ctx.save();
      ctx.translate(ix, iy + bob);
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      
      // Render simple miniature circle/block for drop
      ctx.fillStyle = getBlockColor(item.itemId as unknown as BlockType) || '#ffffff';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    });

    // 5. Draw Mobs
    worldData.mobs.forEach((mob) => {
      const mx = mob.x * BLOCK_SIZE + offsetX;
      const my = mob.y * BLOCK_SIZE + offsetY;
      const mw = mob.width * BLOCK_SIZE;
      const mh = mob.height * BLOCK_SIZE;

      ctx.save();
      ctx.translate(mx, my);

      // Simple pixel styling
      if (mob.type === EntityType.COW) {
        ctx.fillStyle = '#5c4033'; // brown body
        ctx.fillRect(0, 0, mw, mh);
        ctx.fillStyle = '#ffffff'; // white spots
        ctx.fillRect(4, 4, 10, 10);
        ctx.fillRect(mw - 14, mw - 4, 8, 8);
        ctx.fillStyle = '#222222'; // eyes
        const eyeX = mob.facingRight ? mw - 8 : 4;
        ctx.fillRect(eyeX, 6, 4, 4);
      } else if (mob.type === EntityType.CHICKEN) {
        ctx.fillStyle = '#ffffff'; // body
        ctx.fillRect(0, 0, mw, mh);
        ctx.fillStyle = '#f97316'; // beak
        const beakX = mob.facingRight ? mw : -4;
        ctx.fillRect(beakX, 6, 4, 3);
        ctx.fillStyle = '#ef4444'; // wattle
        ctx.fillRect(beakX, 9, 2, 3);
      } else if (mob.type === EntityType.ZOMBIE) {
        ctx.fillStyle = '#065f46'; // green skin
        ctx.fillRect(0, 0, mw, mh);
        ctx.fillStyle = '#1e3a8a'; // blue shirt
        ctx.fillRect(0, mh * 0.3, mw, mh * 0.4);
        ctx.fillStyle = '#1e293b'; // dark pants
        ctx.fillRect(0, mh * 0.7, mw, mh * 0.3);
        ctx.fillStyle = '#ef4444'; // glowing red eyes in night
        const eyeX1 = mob.facingRight ? mw - 10 : 2;
        const eyeX2 = mob.facingRight ? mw - 4 : 8;
        ctx.fillRect(eyeX1, 6, 3, 2);
        ctx.fillRect(eyeX2, 6, 3, 2);
      } else if (mob.type === EntityType.CREEPER) {
        // Blinking white when about to explode
        const isBlinking = tickCountRef.current % 10 < 5 && Math.abs((p.x + p.width/2) - mob.x) < 1.5;
        ctx.fillStyle = isBlinking ? '#ffffff' : '#16a34a'; // green
        ctx.fillRect(0, 0, mw, mh);
        ctx.fillStyle = '#18181b'; // dark face
        const faceX = mob.facingRight ? mw - 14 : 4;
        ctx.fillRect(faceX, 6, 10, 8);
      }

      ctx.restore();
    });

    // 6. Draw Player Character
    const px = p.x * BLOCK_SIZE + offsetX;
    const py = p.y * BLOCK_SIZE + offsetY;
    const pw = p.width * BLOCK_SIZE;
    const ph = p.height * BLOCK_SIZE;

    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);

    // Draw simple human/steve body
    const walkBob = Math.abs(p.vx) > 0 ? Math.sin(tickCountRef.current * 0.3) * 3 : 0;
    
    // Head (Skin / Hair)
    ctx.fillStyle = '#f87171'; // skin
    ctx.fillRect(-8, -ph / 2, 16, 16);
    ctx.fillStyle = '#78350f'; // brown hair
    ctx.fillRect(-8, -ph / 2, 16, 4);

    // Blue shirt
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-10, -ph / 2 + 16, 20, 22 + walkBob);

    // Purple pants
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(-10, -ph / 2 + 38 + walkBob, 20, 16 - walkBob);

    // Eyes
    ctx.fillStyle = '#000000';
    const faceDirection = p.facingRight ? 4 : -7;
    ctx.fillRect(faceDirection, -ph / 2 + 6, 3, 3);

    // Draw active held item in hand
    const activeItem = p.inventory[p.activeSlot]?.id;
    if (activeItem) {
      ctx.save();
      // Translate to hand position
      const handX = p.facingRight ? 10 : -10;
      ctx.translate(handX, 4);
      
      // Swings/rotates during mining
      const isMining = miningRef.current !== null;
      const swingAngle = isMining ? Math.sin(tickCountRef.current * 0.5) * 0.8 - 0.4 : 0;
      ctx.rotate(p.facingRight ? swingAngle + 0.4 : -swingAngle - 0.4);

      // Render miniature item inside player hand
      ctx.fillStyle = getBlockColor(activeItem as unknown as BlockType) || '#ffffff';
      ctx.fillRect(-3, -12, 6, 15);
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(-3, -12, 6, 15);
      ctx.restore();
    }

    ctx.restore();

    // 7. Draw crosshair hover square on block
    if (hoverBlock) {
      const hx = hoverBlock.x * BLOCK_SIZE + offsetX;
      const hy = hoverBlock.y * BLOCK_SIZE + offsetY;
      const pdx = hoverBlock.x - p.x;
      const pdy = hoverBlock.y - p.y;
      const distance = Math.sqrt(pdx * pdx + pdy * pdy);

      ctx.strokeStyle = distance <= REACH_DISTANCE ? 'rgba(255, 255, 255, 0.7)' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx, hy, BLOCK_SIZE, BLOCK_SIZE);

      // Draw mining cracks overlay if active
      if (miningRef.current && miningRef.current.x === hoverBlock.x && miningRef.current.y === hoverBlock.y) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        const progress = miningRef.current.progress;
        
        // Draw progressive block cracks
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (progress > 20) {
          ctx.moveTo(hx, hy); ctx.lineTo(hx + BLOCK_SIZE, hy + BLOCK_SIZE);
        }
        if (progress > 50) {
          ctx.moveTo(hx + BLOCK_SIZE, hy); ctx.lineTo(hx, hy + BLOCK_SIZE);
        }
        if (progress > 80) {
          ctx.moveTo(hx + BLOCK_SIZE/2, hy); ctx.lineTo(hx + BLOCK_SIZE/2, hy + BLOCK_SIZE);
        }
        ctx.stroke();
      }
    }

    // 8. Draw active particles
    particlesRef.current.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = 1 - pt.life / pt.maxLife;
      ctx.fillRect(pt.x * BLOCK_SIZE + offsetX - pt.size/2, pt.y * BLOCK_SIZE + offsetY - pt.size/2, pt.size, pt.size);
    });
    ctx.globalAlpha = 1.0;
  };

  // Draw customized texture blocks
  const drawBlock = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    type: BlockType,
    offsetX: number,
    offsetY: number
  ) => {
    const x = bx * BLOCK_SIZE + offsetX;
    const y = by * BLOCK_SIZE + offsetY;

    // Draw customized voxel design with Canvas 2D
    if (type === BlockType.GRASS) {
      // Grass top, Dirt bottom
      ctx.fillStyle = '#78350f'; // dirt body
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.fillStyle = '#16a34a'; // grass top
      ctx.fillRect(x, y, BLOCK_SIZE, 10);
      // Grass fringes
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x + 4, y + 10, 4, 4);
      ctx.fillRect(x + 16, y + 10, 5, 4);
      ctx.fillRect(x + 24, y + 10, 4, 4);
    } else if (type === BlockType.DIRT) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      // Speckles
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x + 4, y + 6, 4, 4);
      ctx.fillRect(x + 18, y + 12, 5, 4);
      ctx.fillRect(x + 10, y + 24, 4, 4);
    } else if (type === BlockType.STONE) {
      ctx.fillStyle = '#52525b';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    } else if (type === BlockType.COBBLESTONE) {
      ctx.fillStyle = '#71717a';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(x + 2, y + 2, 12, 12);
      ctx.fillRect(x + 16, y + 2, 14, 12);
      ctx.fillRect(x + 2, y + 16, 14, 14);
      ctx.fillRect(x + 18, y + 16, 12, 14);
    } else if (type === BlockType.WOOD) {
      // Oak Log texture
      ctx.fillStyle = '#b45309'; // outer bark
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.fillStyle = '#fed7aa'; // inside ring
      ctx.fillRect(x + 4, y + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);
    } else if (type === BlockType.LEAVES) {
      ctx.fillStyle = '#047857'; // dark green
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.fillStyle = '#065f46';
      ctx.fillRect(x + 4, y + 4, 8, 8);
      ctx.fillRect(x + 18, y + 16, 10, 10);
    } else if (type === BlockType.PLANK) {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      // Planks seams
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.beginPath();
      ctx.moveTo(x, y + BLOCK_SIZE / 2);
      ctx.lineTo(x + BLOCK_SIZE, y + BLOCK_SIZE / 2);
      ctx.stroke();
    } else if (type === BlockType.CRAFTING_TABLE) {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      // Top grid layout
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4, y + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);
    } else if (type === BlockType.FURNACE) {
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      // Front opening grill
      ctx.fillStyle = '#18181b';
      ctx.fillRect(x + 4, y + 8, BLOCK_SIZE - 8, BLOCK_SIZE - 12);
      
      // Show fiery glow if smelting is active in furnace!
      const key = `${bx},${by}`;
      const f = worldData.furnaces[key];
      if (f && f.fuelBurnTime > 0) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(x + 8, y + 12, BLOCK_SIZE - 16, BLOCK_SIZE - 20);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x + 11, y + 15, BLOCK_SIZE - 22, BLOCK_SIZE - 25);
      }
    } else if (type === BlockType.TORCH) {
      ctx.fillStyle = '#78350f'; // stick
      ctx.fillRect(x + BLOCK_SIZE / 2 - 2, y + 12, 4, 20);
      ctx.fillStyle = '#f97316'; // flame outer
      ctx.fillRect(x + BLOCK_SIZE / 2 - 4, y + 4, 8, 8);
      ctx.fillStyle = '#facc15'; // flame core
      ctx.fillRect(x + BLOCK_SIZE / 2 - 2, y + 6, 4, 4);
    } else if (type === BlockType.BEDROCK) {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    } else if (type.endsWith('_ore')) {
      // Draw stone base
      ctx.fillStyle = '#52525b';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);

      // Draw shiny ore flecks
      let fleckColor = '#000000';
      if (type === BlockType.COAL_ORE) fleckColor = '#18181b';
      else if (type === BlockType.IRON_ORE) fleckColor = '#fdba74';
      else if (type === BlockType.GOLD_ORE) fleckColor = '#facc15';
      else if (type === BlockType.DIAMOND_ORE) fleckColor = '#22d3ee';

      ctx.fillStyle = fleckColor;
      ctx.fillRect(x + 6, y + 6, 6, 4);
      ctx.fillRect(x + 18, y + 14, 8, 6);
      ctx.fillRect(x + 8, y + 22, 5, 5);
      ctx.fillRect(x + 22, y + 6, 4, 4);
    }
  };

  // Canvas Mouse Move -> Trace Hover Coordinates
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const camX = cameraRef.current.x;
    const camY = cameraRef.current.y;

    const offsetX = canvas.width / 2 - camX * BLOCK_SIZE;
    const offsetY = canvas.height / 2 - camY * BLOCK_SIZE;

    const bx = Math.floor((mx - offsetX) / BLOCK_SIZE);
    const by = Math.floor((my - offsetY) / BLOCK_SIZE);

    if (bx >= 0 && bx < worldData.width && by >= 0 && by < worldData.height) {
      setHoverBlock({ x: bx, y: by });
    } else {
      setHoverBlock(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverBlock(null);
    miningRef.current = null;
  };

  // Color interpolator for smooth day/night sky gradients
  const lerpColor = (a: string, b: string, amount: number): string => {
    const ah = parseInt(a.replace(/#/g, ''), 16),
      ar = ah >> 16,
      ag = (ah >> 8) & 0xff,
      ab = ah & 0xff,
      bh = parseInt(b.replace(/#/g, ''), 16),
      br = bh >> 16,
      bg = (bh >> 8) & 0xff,
      bb = bh & 0xff,
      rr = ar + amount * (br - ar),
      rg = ag + amount * (bg - ag),
      rb = ab + amount * (bb - ab);

    return '#' + (((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).slice(1);
  };

  // Listen to Window resize (Responsive sizing of HTML5 canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        drawGame();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    resizeObserver.observe(containerRef.current);
    handleResize();

    return () => resizeObserver.disconnect();
  }, [worldData]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-950">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleCanvasInteraction}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
};
