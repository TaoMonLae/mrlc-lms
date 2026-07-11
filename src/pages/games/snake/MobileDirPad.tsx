import * as React from "react";
import { haptic } from "./haptics";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

function DirButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      // onPointerDown fires immediately on touch (no 300ms tap delay), and
      // preventDefault stops the tap from also scrolling/selecting.
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
        haptic("turn");
      }}
      className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-600 bg-gray-800/70 text-3xl font-bold text-white shadow-lg touch-none select-none transition-transform active:scale-90 active:bg-cyan-600/70"
    >
      {label}
    </button>
  );
}

/**
 * Larger, thumb-friendly diamond D-pad for touch play. Secondary to swipe-to-
 * steer on the board, but kept visible for discoverability and precision taps.
 */
export default function MobileDirPad({
  onDirection,
}: {
  onDirection: (dir: Direction) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <p className="text-xs text-gray-400">Swipe the board to steer — or tap:</p>
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
        <div />
        <DirButton label="↑" onPress={() => onDirection("UP")} />
        <div />
        <DirButton label="←" onPress={() => onDirection("LEFT")} />
        <div />
        <DirButton label="→" onPress={() => onDirection("RIGHT")} />
        <div />
        <DirButton label="↓" onPress={() => onDirection("DOWN")} />
        <div />
      </div>
    </div>
  );
}
