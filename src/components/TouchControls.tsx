/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ShoppingBag, Menu, Zap, Hammer } from 'lucide-react';

interface TouchControlsProps {
  onMoveLeftStart: () => void;
  onMoveLeftEnd: () => void;
  onMoveRightStart: () => void;
  onMoveRightEnd: () => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onToggleInventory: () => void;
  onTogglePause: () => void;
  interactionMode: 'mine' | 'place';
  onChangeInteractionMode: (mode: 'mine' | 'place') => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveLeftStart,
  onMoveLeftEnd,
  onMoveRightStart,
  onMoveRightEnd,
  onJumpStart,
  onJumpEnd,
  onToggleInventory,
  onTogglePause,
  interactionMode,
  onChangeInteractionMode,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none flex flex-col justify-between p-4">
      {/* Top Bar Controls */}
      <div className="w-full flex justify-between items-center pointer-events-auto">
        <button
          onClick={onTogglePause}
          id="btn-mobile-pause"
          className="p-3 bg-slate-900/80 border-2 border-slate-950 rounded-xl hover:bg-slate-800 transition active:scale-90 flex items-center gap-1 cursor-pointer text-slate-100 shadow-lg text-sm font-bold"
        >
          <Menu className="w-5 h-5" />
          <span>Pause</span>
        </button>

        <button
          onClick={onToggleInventory}
          id="btn-mobile-inv"
          className="p-3 bg-slate-900/80 border-2 border-slate-950 rounded-xl hover:bg-slate-800 transition active:scale-90 flex items-center gap-1 cursor-pointer text-slate-100 shadow-lg text-sm font-bold"
        >
          <ShoppingBag className="w-5 h-5 text-yellow-400" />
          <span>Inventory</span>
        </button>
      </div>

      {/* Middle/Bottom Layout */}
      <div className="w-full flex justify-between items-end gap-4 mt-auto">
        {/* Left Hand: D-Pad Controls (Movement) */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/30 p-2 rounded-2xl backdrop-blur-xs">
          <button
            onTouchStart={onMoveLeftStart}
            onTouchEnd={onMoveLeftEnd}
            onMouseDown={onMoveLeftStart}
            onMouseUp={onMoveLeftEnd}
            onMouseLeave={onMoveLeftEnd}
            id="btn-dpad-left"
            className="w-14 h-14 bg-slate-900/80 border-2 border-slate-950 rounded-xl hover:bg-slate-800 transition active:scale-95 flex items-center justify-center cursor-pointer text-slate-100 shadow-lg select-none"
          >
            <ArrowLeft className="w-8 h-8 stroke-[3]" />
          </button>

          <button
            onTouchStart={onJumpStart}
            onTouchEnd={onJumpEnd}
            onMouseDown={onJumpStart}
            onMouseUp={onJumpEnd}
            id="btn-dpad-jump"
            className="w-14 h-14 bg-slate-900/80 border-2 border-slate-950 rounded-full hover:bg-slate-800 transition active:scale-95 flex items-center justify-center cursor-pointer text-emerald-400 shadow-lg select-none"
          >
            <ArrowUp className="w-8 h-8 stroke-[3]" />
          </button>

          <button
            onTouchStart={onMoveRightStart}
            onTouchEnd={onMoveRightEnd}
            onMouseDown={onMoveRightStart}
            onMouseUp={onMoveRightEnd}
            onMouseLeave={onMoveRightEnd}
            id="btn-dpad-right"
            className="w-14 h-14 bg-slate-900/80 border-2 border-slate-950 rounded-xl hover:bg-slate-800 transition active:scale-95 flex items-center justify-center cursor-pointer text-slate-100 shadow-lg select-none"
          >
            <ArrowRight className="w-8 h-8 stroke-[3]" />
          </button>
        </div>

        {/* Center: Interactive Mode Switcher */}
        <div className="pointer-events-auto flex gap-1 bg-slate-900/80 border-2 border-slate-950 p-1.5 rounded-xl shadow-lg">
          <button
            onClick={() => onChangeInteractionMode('mine')}
            id="btn-mode-mine"
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
              interactionMode === 'mine'
                ? 'bg-rose-600 text-white border-2 border-rose-400'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>MINE</span>
          </button>
          
          <button
            onClick={() => onChangeInteractionMode('place')}
            id="btn-mode-place"
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
              interactionMode === 'place'
                ? 'bg-emerald-600 text-slate-950 border-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>PLACE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
