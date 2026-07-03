/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Trash2, Plus, Volume2, VolumeX, Settings, Compass, Info, Github } from 'lucide-react';
import { WorldMetadata, GameSettings } from '../types';
import { sounds } from '../sound';

interface MainMenuProps {
  onSelectWorld: (worldId: string) => void;
  onCreateWorld: (name: string, seed: string) => void;
  settings: GameSettings;
  onChangeSettings: (settings: GameSettings) => void;
}

const SPLASH_TEXTS = [
  "2D Voxel Sandbox!",
  "Made with React + Canvas!",
  "Saves to localStorage!",
  "Procedural cave systems!",
  "Watch out for Creepers!",
  "Smelt ores in the Furnace!",
  "Craft tools with a Table!",
  "Fully touch-enabled for Android!",
  "100% Client-Side synthesis!",
  "Mine diamonds!",
  "Day and Night cycles!",
];

export const MainMenu: React.FC<MainMenuProps> = ({
  onSelectWorld,
  onCreateWorld,
  settings,
  onChangeSettings,
}) => {
  const [worlds, setWorlds] = useState<WorldMetadata[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorldName, setNewWorldName] = useState('My World');
  const [newWorldSeed, setNewWorldSeed] = useState('');
  const [splash, setSplash] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    // Load worlds from localStorage
    const saved = localStorage.getItem('paper_minecraft_worlds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WorldMetadata[];
        // Sort by last played time
        parsed.sort((a, b) => b.lastPlayedTime - a.lastPlayedTime);
        setWorlds(parsed);
      } catch (e) {
        console.error('Failed to parse worlds', e);
      }
    }

    // Set random splash
    const randomSplash = SPLASH_TEXTS[Math.floor(Math.random() * SPLASH_TEXTS.length)];
    setSplash(randomSplash);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const seed = newWorldSeed.trim() || Math.floor(Math.random() * 9999999).toString();
    const name = newWorldName.trim() || 'New World';
    sounds.playCraft();
    onCreateWorld(name, seed);
  };

  const handleDelete = (worldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this world? This action is irreversible.')) {
      const updated = worlds.filter((w) => w.id !== worldId);
      setWorlds(updated);
      localStorage.setItem('paper_minecraft_worlds', JSON.stringify(updated));
      localStorage.removeItem(`paper_minecraft_world_${worldId}`);
      sounds.playBreak(BlockType_AIR_placeholder_for_sound()); // generic thud
    }
  };

  const BlockType_AIR_placeholder_for_sound = () => {
    // Return air for simple break sound
    return 'dirt' as any;
  };

  const toggleSound = () => {
    const updated = !settings.soundEnabled;
    sounds.setEnabled(updated);
    onChangeSettings({ ...settings, soundEnabled: updated });
    if (updated) {
      setTimeout(() => sounds.playJump(), 100);
    }
  };

  const toggleCoordinates = () => {
    onChangeSettings({ ...settings, showCoordinates: !settings.showCoordinates });
    sounds.playCraft();
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col items-center justify-between p-4 font-sans select-none overflow-y-auto">
      {/* Moving Background Layer */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-sky-400 via-sky-300 to-indigo-900 opacity-20 pointer-events-none" />

      {/* Top Bar with sound and settings */}
      <div className="w-full max-w-2xl flex justify-between items-center z-10 pt-4 px-2">
        <button
          onClick={toggleSound}
          id="btn-toggle-sound"
          className="p-3 bg-slate-800/80 border-2 border-slate-700 hover:border-emerald-500 rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer backdrop-blur-sm shadow-lg text-sm font-semibold"
        >
          {settings.soundEnabled ? (
            <>
              <Volume2 className="w-5 h-5 text-emerald-400" />
              <span>SFX: ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-5 h-5 text-slate-400" />
              <span>SFX: OFF</span>
            </>
          )}
        </button>

        <div className="flex gap-2">
          <button
            onClick={toggleCoordinates}
            id="btn-toggle-coords"
            className="p-3 bg-slate-800/80 border-2 border-slate-700 hover:border-emerald-500 rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer backdrop-blur-sm shadow-lg text-sm font-semibold"
          >
            <Compass className="w-5 h-5 text-sky-400" />
            <span>HUD: {settings.showCoordinates ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playCraft();
              setShowAbout(!showAbout);
            }}
            id="btn-about"
            className="p-3 bg-slate-800/80 border-2 border-slate-700 hover:border-emerald-500 rounded-xl transition duration-200 cursor-pointer backdrop-blur-sm shadow-lg"
          >
            <Info className="w-5 h-5 text-yellow-400" />
          </button>
        </div>
      </div>

      {/* Hero / Title Section */}
      <div className="flex flex-col items-center justify-center text-center my-8 z-10 relative">
        <div className="relative transform hover:scale-105 transition-transform duration-300">
          <h1 className="text-4xl md:text-6xl font-black tracking-wider text-slate-100 bg-slate-850 px-6 py-4 rounded-2xl border-4 border-slate-950 shadow-2xl flex flex-col gap-1 items-center select-none font-mono">
            <span className="text-emerald-400 drop-shadow-[0_4px_0_rgba(16,185,129,0.3)]">PAPER</span>
            <span className="text-stone-300 drop-shadow-[0_4px_0_rgba(100,116,139,0.3)]">MINECRAFT</span>
          </h1>
          
          {/* Splash Text - Slanted and Pulsing */}
          {splash && (
            <div className="absolute -bottom-4 -right-8 md:-right-12 transform rotate-[-15deg] bg-yellow-400 text-slate-950 font-bold px-3 py-1 text-xs md:text-sm rounded border-2 border-slate-950 shadow-lg animate-pulse whitespace-nowrap">
              {splash}
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-2xl bg-slate-800/90 border-4 border-slate-950 rounded-2xl p-6 z-10 shadow-2xl backdrop-blur-md flex flex-col gap-6 mb-8">
        {showAbout ? (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-yellow-400">About Paper Minecraft</h2>
              <button
                onClick={() => {
                  sounds.playCraft();
                  setShowAbout(false);
                }}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                Close
              </button>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Paper Minecraft is a highly optimized 2D survival crafting game inspired by Minecraft. Explore procedurally generated landscapes with rich subterranean cave systems, farm resources, mine precious ores, and survive against nocturnal threats!
            </p>
            <div className="text-sm text-slate-300 flex flex-col gap-2 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
              <h3 className="font-bold text-emerald-400">Controls Guide:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-slate-100">Move:</strong> <kbd className="px-1 bg-slate-700 rounded">A</kbd> / <kbd className="px-1 bg-slate-700 rounded">D</kbd> or <kbd className="px-1 bg-slate-700 rounded">←</kbd> / <kbd className="px-1 bg-slate-700 rounded">→</kbd></li>
                <li><strong className="text-slate-100">Jump / Swim:</strong> <kbd className="px-1 bg-slate-700 rounded">Space</kbd> / <kbd className="px-1 bg-slate-700 rounded">W</kbd></li>
                <li><strong className="text-slate-100">Mine Blocks:</strong> Left-Click & Hold (Desktop) or Tap on Screen (Mobile)</li>
                <li><strong className="text-slate-100">Place Blocks:</strong> Right-Click (Desktop) or Tap with Place mode toggled (Mobile)</li>
                <li><strong className="text-slate-100">Inventory:</strong> <kbd className="px-1 bg-slate-700 rounded">E</kbd> / <kbd className="px-1 bg-slate-700 rounded">I</kbd> or Tap inventory icon</li>
                <li><strong className="text-slate-100">Hotbar Selection:</strong> <kbd className="px-1 bg-slate-700 rounded">1</kbd> to <kbd className="px-1 bg-slate-700 rounded">9</kbd> or Tap hotbar slots</li>
              </ul>
            </div>
          </div>
        ) : showCreateForm ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-emerald-400 border-b border-slate-700 pb-2">Create New World</h2>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">World Name</label>
              <input
                type="text"
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                maxLength={20}
                className="w-full bg-slate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-slate-100 outline-none transition"
                placeholder="World Name"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">Seed (Optional)</label>
              <input
                type="text"
                value={newWorldSeed}
                onChange={(e) => setNewWorldSeed(e.target.value)}
                className="w-full bg-slate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-slate-100 outline-none transition"
                placeholder="Leave blank for random seed"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  sounds.playCraft();
                  setShowCreateForm(false);
                }}
                className="flex-1 bg-slate-700 border-2 border-slate-600 hover:bg-slate-600 hover:border-slate-500 rounded-xl py-3 cursor-pointer font-bold text-center transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 border-2 border-emerald-500 hover:bg-emerald-500 hover:border-emerald-400 rounded-xl py-3 cursor-pointer font-bold text-slate-950 text-center transition flex justify-center items-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>Create World</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h2 className="text-xl font-bold text-slate-300">Select World</h2>
              <button
                onClick={() => {
                  sounds.playCraft();
                  setShowCreateForm(true);
                }}
                id="btn-new-world"
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer border-2 border-emerald-400 text-sm transition shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>New World</span>
              </button>
            </div>

            {worlds.length === 0 ? (
              <div className="text-center py-12 flex flex-col gap-3 items-center text-slate-400">
                <Play className="w-12 h-12 stroke-[1] text-slate-500" />
                <p className="text-sm">No worlds saved. Create a new world to start your adventure!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                {worlds.map((world) => (
                  <div
                    key={world.id}
                    onClick={() => onSelectWorld(world.id)}
                    className="flex justify-between items-center bg-slate-900/60 border-2 border-slate-800 hover:border-emerald-500 rounded-xl p-4 cursor-pointer transition group shadow-md"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-100 group-hover:text-emerald-400 transition text-lg leading-tight">
                        {world.name}
                      </span>
                      <span className="text-xs text-slate-400 mt-1 font-mono">
                        Seed: {world.seed} • Last Played: {new Date(world.lastPlayedTime).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(world.id, e)}
                      id={`btn-delete-${world.id}`}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg cursor-pointer transition"
                      title="Delete World"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer credits */}
      <div className="z-10 text-xs text-slate-500 text-center flex flex-col gap-1">
        <span>Paper Minecraft • Dedicated to Voxel Enthusiasts</span>
        <span>Runs smoothly on both Touch Screens & Desktop Browsers</span>
      </div>
    </div>
  );
};
