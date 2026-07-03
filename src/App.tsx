/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Heart, Moon, Sun, Volume2, VolumeX, RefreshCw, LogOut, Compass, Play, BookOpen, AlertCircle, ShoppingBag } from 'lucide-react';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { TouchControls } from './components/TouchControls';
import { InventoryMenu, ItemIcon, ITEM_LABELS } from './components/InventoryMenu';
import { WorldData, WorldMetadata, GameSettings, PlayerState, FurnaceState } from './types';
import { generateWorld } from './worldGenerator';
import { sounds } from './sound';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: false,
  showCoordinates: true,
  mobileControlLayout: 'joystick',
};

type ScreenType = 'menu' | 'game' | 'dead';

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('menu');
  const [world, setWorld] = useState<WorldData | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // Active sub-overlays inside Game
  const [isPaused, setIsPaused] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'none' | 'inventory' | 'crafting_table' | 'furnace'>('none');

  // Mobile keys trigger states
  const [mobileKeys, setMobileKeys] = useState({
    left: false,
    right: false,
    jump: false,
  });

  // Mobile interaction mode
  const [interactionMode, setInteractionMode] = useState<'mine' | 'place'>('mine');

  // Check and create initial worlds list if empty
  useEffect(() => {
    sounds.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Load world from local storage
  const handleSelectWorld = (worldId: string) => {
    const rawData = localStorage.getItem(`paper_minecraft_world_${worldId}`);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        
        // Recover blocks typed Uint8Array
        const blocksArray = new Uint8Array(parsed.blocks);
        const worldData: WorldData = {
          metadata: parsed.metadata,
          width: parsed.width,
          height: parsed.height,
          blocks: blocksArray,
          player: parsed.player,
          furnaces: parsed.furnaces || {},
          itemEntities: parsed.itemEntities || [],
          mobs: parsed.mobs || [],
        };

        setWorld(worldData);
        setIsPaused(false);
        setActiveMenu('none');
        setScreen('game');
        sounds.playCraft();
      } catch (e) {
        alert('Failed to load world data. Generating a fresh one.');
        handleCreateWorld('My Saved World', Math.random().toString());
      }
    }
  };

  // Create new world and save
  const handleCreateWorld = (name: string, seed: string) => {
    const newWorld = generateWorld(name, seed);
    
    // Save to world metadata list
    const saved = localStorage.getItem('paper_minecraft_worlds');
    let worldsList: WorldMetadata[] = [];
    if (saved) {
      try { worldsList = JSON.parse(saved); } catch (e) {}
    }

    // Filter out duplicates
    worldsList = worldsList.filter((w) => w.id !== newWorld.metadata.id);
    worldsList.unshift(newWorld.metadata);

    localStorage.setItem('paper_minecraft_worlds', JSON.stringify(worldsList));
    saveWorldToDisk(newWorld);

    setWorld(newWorld);
    setIsPaused(false);
    setActiveMenu('none');
    setScreen('game');
  };

  // Save current active world state to disk
  const saveWorldToDisk = (worldState: WorldData) => {
    const meta = { ...worldState.metadata, lastPlayedTime: Date.now() };
    const serialized = {
      metadata: meta,
      width: worldState.width,
      height: worldState.height,
      blocks: Array.from(worldState.blocks), // Convert Uint8Array to normal array
      player: worldState.player,
      furnaces: worldState.furnaces,
      itemEntities: worldState.itemEntities,
      mobs: worldState.mobs,
    };

    localStorage.setItem(`paper_minecraft_world_${meta.id}`, JSON.stringify(serialized));

    // Update world list
    const saved = localStorage.getItem('paper_minecraft_worlds');
    let worldsList: WorldMetadata[] = [];
    if (saved) {
      try { worldsList = JSON.parse(saved); } catch (e) {}
    }
    const idx = worldsList.findIndex((w) => w.id === meta.id);
    if (idx !== -1) {
      worldsList[idx] = meta;
    } else {
      worldsList.unshift(meta);
    }
    localStorage.setItem('paper_minecraft_worlds', JSON.stringify(worldsList));
  };

  // Exit game and auto-save
  const handleExitToMenu = () => {
    if (world) {
      saveWorldToDisk(world);
    }
    sounds.playCraft();
    setScreen('menu');
    setWorld(null);
  };

  // Respawn after dying
  const handleRespawn = () => {
    if (world) {
      // Find starting y height
      const spawnX = Math.floor(world.width / 2);
      
      const updatedPlayer: PlayerState = {
        ...world.player,
        x: spawnX,
        y: 40,
        vx: 0,
        vy: 0,
        health: 20,
        hunger: 20,
      };

      const updatedWorld = {
        ...world,
        player: updatedPlayer,
      };

      setWorld(updatedWorld);
      setScreen('game');
      sounds.playCraft();
    }
  };

  // Sync furnace updates
  const handleFurnaceStateChange = (state: FurnaceState | null) => {
    if (world && state) {
      const activeSlot = world.player.activeSlot;
      // Find matching furnace by player look direction/coords
      // Or simple active furnace. In 2D we locate adjacent furnace coordinate
      const px = Math.floor(world.player.x);
      const py = Math.floor(world.player.y);
      
      // Look for coordinate keys inside furnace dictionary
      let matchKey = Object.keys(world.furnaces)[0]; // fallback
      
      // Let's look for a furnace within 6 blocks of player
      for (const key of Object.keys(world.furnaces)) {
        const [fx, fy] = key.split(',').map(Number);
        const dx = fx - px;
        const dy = fy - py;
        if (Math.sqrt(dx*dx + dy*dy) < 6) {
          matchKey = key;
          break;
        }
      }

      if (matchKey) {
        world.furnaces[matchKey] = state;
        setWorld({ ...world });
      }
    }
  };

  // Fetch furnace state for adjacent opened furnace
  const getActiveFurnaceState = (): FurnaceState | null => {
    if (!world || Object.keys(world.furnaces).length === 0) return null;
    const px = Math.floor(world.player.x);
    const py = Math.floor(world.player.y);
    for (const key of Object.keys(world.furnaces)) {
      const state = world.furnaces[key];
      const [fx, fy] = key.split(',').map(Number);
      const dx = fx - px;
      const dy = fy - py;
      if (Math.sqrt(dx*dx + dy*dy) < 6) {
        return state;
      }
    }
    const firstKey = Object.keys(world.furnaces)[0];
    return firstKey ? world.furnaces[firstKey] : null;
  };

  // Check if player died in GameCanvas callback loop
  useEffect(() => {
    if (world && world.player.health <= 0 && screen === 'game') {
      sounds.playHurt();
      setScreen('dead');
    }
  }, [world, screen]);

  // Handle hotbar slot clicks inside Game HUD
  const handleSelectHotbarSlot = (slotIdx: number) => {
    if (world) {
      sounds.playCraft();
      setWorld({
        ...world,
        player: { ...world.player, activeSlot: slotIdx }
      });
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col relative">
      
      {/* 1. Main Menu */}
      {screen === 'menu' && (
        <MainMenu
          onSelectWorld={handleSelectWorld}
          onCreateWorld={handleCreateWorld}
          settings={settings}
          onChangeSettings={setSettings}
        />
      )}

      {/* 2. Core Minecraft Gameplay */}
      {screen === 'game' && world && (
        <div className="w-full h-full relative flex flex-col justify-between">
          
          {/* Main Interactive Canvas Element */}
          <div className="absolute inset-0 z-0">
            <GameCanvas
              worldData={world}
              onChangeWorldData={setWorld}
              settings={settings}
              onOpenInventory={(mode) => {
                sounds.playCraft();
                setActiveMenu(mode);
              }}
              onOpenPauseMenu={() => {
                sounds.playCraft();
                setIsPaused(true);
              }}
              interactionMode={interactionMode}
              mobileKeys={mobileKeys}
            />
          </div>

          {/* Touch overlays for Android game view */}
          <TouchControls
            onMoveLeftStart={() => setMobileKeys((prev) => ({ ...prev, left: true }))}
            onMoveLeftEnd={() => setMobileKeys((prev) => ({ ...prev, left: false }))}
            onMoveRightStart={() => setMobileKeys((prev) => ({ ...prev, right: true }))}
            onMoveRightEnd={() => setMobileKeys((prev) => ({ ...prev, right: false }))}
            onJumpStart={() => setMobileKeys((prev) => ({ ...prev, jump: true }))}
            onJumpEnd={() => setMobileKeys((prev) => ({ ...prev, jump: false }))}
            onToggleInventory={() => {
              sounds.playCraft();
              setActiveMenu('inventory');
            }}
            onTogglePause={() => {
              sounds.playCraft();
              setIsPaused(true);
            }}
            interactionMode={interactionMode}
            onChangeInteractionMode={setInteractionMode}
          />

          {/* 3. In-Game HUD overlay (Hearts, hunger, item label, time) */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-2">
            
            {/* Health Hearts (10 hearts) */}
            <div className="flex gap-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 shadow-md backdrop-blur-sm">
              {Array.from({ length: 10 }).map((_, idx) => {
                const hVal = (idx + 1) * 2;
                const isFull = world.player.health >= hVal;
                const isHalf = world.player.health === hVal - 1;
                return (
                  <Heart
                    key={idx}
                    className={`w-5 h-5 ${
                      isFull ? 'text-red-500 fill-red-500 stroke-[2]' : isHalf ? 'text-red-400 fill-red-400 opacity-80 animate-pulse' : 'text-slate-600 stroke-[1]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Hunger / Bread / Drumsticks bar */}
            <div className="flex gap-1 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-900 shadow-md backdrop-blur-sm items-center text-xs text-amber-500 font-bold">
              <span>HUNGER:</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const drumVal = (idx + 1) * 2;
                  const isFull = world.player.hunger >= drumVal;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border border-slate-950 ${
                        isFull ? 'bg-amber-700' : 'bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Coordinates HUD overlay (If enabled) */}
            {settings.showCoordinates && (
              <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-900 text-[10px] font-mono text-emerald-400 flex flex-col gap-0.5 backdrop-blur-sm">
                <span>POS X: {world.player.x.toFixed(1)}</span>
                <span>POS Y: {world.player.y.toFixed(1)}</span>
                <span>TIME: {Math.floor((world.player.y > 60) ? (24000 - world.metadata.gameTime) : world.metadata.gameTime)} Ticks</span>
              </div>
            )}
          </div>

          {/* Top Right Sky Time Display (Clock HUD) */}
          <div className="absolute top-4 right-4 z-20 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-900 text-xs flex items-center gap-2 pointer-events-none backdrop-blur-sm font-semibold">
            {world.metadata.gameTime > 18000 || world.metadata.gameTime < 4000 ? (
              <>
                <Moon className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="text-cyan-300">NIGHT</span>
              </>
            ) : (
              <>
                <Sun className="w-5 h-5 text-yellow-400 animate-spin-slow" />
                <span className="text-yellow-400">DAYTIME</span>
              </>
            )}
          </div>

          {/* Active Hotbar overlay (Bottom Center) */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-slate-950/80 p-2 border-4 border-slate-950 rounded-2xl flex flex-col gap-1 items-center shadow-2xl backdrop-blur-md">
            
            {/* Active Item Label */}
            {world.player.inventory[world.player.activeSlot] && (
              <span className="text-xs bg-slate-950 border border-slate-800 text-yellow-400 px-3 py-1 rounded-full font-bold select-none shadow-md">
                {ITEM_LABELS[world.player.inventory[world.player.activeSlot]!.id]}
              </span>
            )}

            {/* Slot Grids */}
            <div className="flex gap-1.5 pointer-events-auto">
              {world.player.inventory.slice(0, 9).map((stack, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectHotbarSlot(idx)}
                  className={`w-12 h-12 rounded-lg bg-slate-800 border-2 cursor-pointer transition active:scale-95 flex items-center justify-center relative shadow-md ${
                    world.player.activeSlot === idx
                      ? 'border-yellow-400 bg-slate-700 ring-2 ring-yellow-400/50'
                      : 'border-slate-950 hover:border-slate-600'
                  }`}
                >
                  {stack && (
                    <>
                      <ItemIcon id={stack.id} />
                      <span className="absolute bottom-1 right-1 text-[10px] bg-slate-950/90 px-1 rounded text-slate-100 font-mono font-bold">
                        {stack.count}
                      </span>
                    </>
                  )}
                  {/* Quick indicator index key */}
                  <span className="absolute top-0.5 left-1 text-[7px] text-slate-500 font-bold">{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Pause Menu Modal Overlay */}
          {isPaused && (
            <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-6">
              <h2 className="text-3xl font-black text-slate-200 select-none font-mono tracking-widest drop-shadow-md">
                GAME PAUSED
              </h2>
              
              <div className="flex flex-col gap-3 w-64">
                <button
                  onClick={() => {
                    sounds.playCraft();
                    setIsPaused(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 rounded-xl py-3 cursor-pointer font-bold transition text-slate-950 flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm"
                >
                  <Play className="w-5 h-5 fill-slate-950 stroke-none" />
                  <span>Resume Game</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playCraft();
                    saveWorldToDisk(world);
                    alert('World progress successfully saved!');
                  }}
                  className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-emerald-500 rounded-xl py-3 cursor-pointer font-bold transition text-slate-100 flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Save World</span>
                </button>

                <button
                  onClick={handleExitToMenu}
                  className="bg-rose-900 hover:bg-rose-800 border-2 border-rose-700 rounded-xl py-3 cursor-pointer font-bold transition text-slate-100 flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Save & Exit</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Inventory and Crafting Table Overlay Modals */}
          {activeMenu !== 'none' && (
            <InventoryMenu
              isOpen={activeMenu !== 'none'}
              onClose={() => {
                sounds.playCraft();
                setActiveMenu('none');
              }}
              player={world.player}
              onChangePlayer={(updatedPlayer) => setWorld({ ...world, player: updatedPlayer })}
              mode={activeMenu}
              furnaceState={getActiveFurnaceState()}
              onChangeFurnace={handleFurnaceStateChange}
            />
          )}

        </div>
      )}

      {/* 6. Death / Game Over Screen Overlay */}
      {screen === 'dead' && (
        <div className="absolute inset-0 z-50 bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-8">
          <div className="flex flex-col gap-2 items-center text-center animate-bounce">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <h1 className="text-4xl md:text-5xl font-black text-red-500 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] font-mono">
              YOU DIED!
            </h1>
          </div>
          
          <div className="flex flex-col gap-3 w-64">
            <button
              onClick={handleRespawn}
              className="bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 rounded-xl py-3 cursor-pointer font-bold transition text-slate-950 flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm"
            >
              <RefreshCw className="w-5 h-5" />
              <span>RESPAWN</span>
            </button>

            <button
              onClick={handleExitToMenu}
              className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-emerald-500 rounded-xl py-3 cursor-pointer font-bold transition text-slate-100 flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm"
            >
              <LogOut className="w-5 h-5" />
              <span>QUIT TO MENU</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
