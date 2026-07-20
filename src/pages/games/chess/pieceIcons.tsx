"use client";

import * as React from "react";
import type { Color, PieceSymbol } from "chess.js";

// Original, hand-drawn vector chess pieces (not traced from any existing set).
// Rendered as SVG instead of Unicode glyphs (♔♕♖♗♘♙) because those glyphs sit
// on wildly inconsistent baselines across fonts/platforms — the reason pieces
// used to hug the bottom of the square instead of sitting centered. An SVG
// with a fixed viewBox centers exactly like any other block element.

const SHAPES: Record<PieceSymbol, React.ReactNode> = {
  p: (
    <>
      <circle cx="22.5" cy="13" r="6.5" />
      <path d="M15,36 C15,28 17,24 22.5,24 C28,24 30,28 30,36 Z" />
      <rect x="12" y="36" width="21" height="4" rx="1.5" />
    </>
  ),
  r: (
    <>
      <polygon points="13,16 13,10 17.5,10 17.5,13 21,13 21,10 24.5,10 24.5,13 28,13 28,10 32,10 32,16" strokeLinejoin="round" />
      <polygon points="14,36 15,16 30,16 31,36" strokeLinejoin="round" />
      <rect x="9" y="36" width="27" height="4.5" rx="1.5" />
    </>
  ),
  n: (
    <>
      <path
        d="M9,20 C10,24 12,26 15,26 C15,29 14,32 14,35 L13,36 L33,36 L32,33 C33,28 34,24 31,19 C33,16 33,12 29,9 C31,7 30,5 27,6 L24,11 C22,9 20,8 17,10 C14,12 11,15 9,20 Z"
        strokeLinejoin="round"
      />
      <rect x="10" y="36" width="25" height="4.5" rx="1.5" />
    </>
  ),
  b: (
    <>
      <path d="M15,36 C14,25 17,16 22.5,13 C28,16 31,25 30,36 Z" strokeLinejoin="round" />
      <line x1="18.5" y1="21" x2="26.5" y2="27" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22.5" cy="8" r="2.6" />
      <rect x="12" y="36" width="21" height="4" rx="1.5" />
    </>
  ),
  q: (
    <>
      <path d="M13,36 C13,27 16,21 22.5,21 C29,21 32,27 32,36 Z" strokeLinejoin="round" />
      <rect x="12" y="20" width="21" height="3" rx="1" />
      <circle cx="12.5" cy="18" r="2.4" />
      <circle cx="18" cy="16" r="2.4" />
      <circle cx="22.5" cy="15" r="2.6" />
      <circle cx="27" cy="16" r="2.4" />
      <circle cx="32.5" cy="18" r="2.4" />
      <rect x="9" y="36" width="27" height="4.5" rx="1.5" />
    </>
  ),
  k: (
    <>
      <path d="M13,36 C13,26 16,20 22.5,20 C29,20 32,26 32,36 Z" strokeLinejoin="round" />
      <rect x="13" y="19" width="19" height="3" rx="1" />
      <rect x="21" y="4" width="3" height="10" />
      <rect x="17.5" y="7.5" width="10" height="3" />
      <rect x="9" y="36" width="27" height="4.5" rx="1.5" />
    </>
  ),
};

const COLORS: Record<Color, { fill: string; stroke: string }> = {
  w: { fill: "#f7f5f0", stroke: "#2a2a28" },
  b: { fill: "#2a2a28", stroke: "#f2f0ec" },
};

export function ChessPieceIcon({ type, color, className }: { type: PieceSymbol; color: Color; className?: string }) {
  const { fill, stroke } = COLORS[color];
  return (
    <svg viewBox="0 0 45 45" fill={fill} stroke={stroke} strokeWidth={1.3} className={className} aria-hidden="true">
      {SHAPES[type]}
    </svg>
  );
}

export default ChessPieceIcon;
