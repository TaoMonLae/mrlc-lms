import React, { useEffect, useRef } from 'react';
import { Direction, FloatingText, FruitItem, GhostEntity, PacManState, PowerUpItem, VisualTheme } from '../types';
import { ParticleSystem } from '../utils/particles';

interface ArcadeCanvasProps {
  maze: number[][];
  pacman: PacManState;
  ghosts: GhostEntity[];
  floatingTexts: FloatingText[];
  fruit: FruitItem | null;
  powerUpItem: PowerUpItem | null;
  particleSystem: ParticleSystem;
  theme: VisualTheme;
  enableCRT: boolean;
  tileSize: number;
}

export const ArcadeCanvas: React.FC<ArcadeCanvasProps> = ({
  maze,
  pacman,
  ghosts,
  floatingTexts,
  fruit,
  powerUpItem,
  particleSystem,
  theme,
  enableCRT,
  tileSize
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = maze.length;
    const cols = maze[0].length;

    const width = cols * tileSize;
    const height = rows * tileSize;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Clear background based on theme
    if (theme === 'NEON') {
      ctx.fillStyle = '#030712'; // deep dark navy
    } else if (theme === 'SYNTHWAVE') {
      ctx.fillStyle = '#0f051d'; // deep purple
    } else if (theme === 'VECTOR') {
      ctx.fillStyle = '#000800'; // dark green
    } else {
      ctx.fillStyle = '#000000'; // classic black
    }
    ctx.fillRect(0, 0, width, height);

    // Optional subtle grid lines for Synthwave/Neon
    if (theme === 'SYNTHWAVE' || theme === 'NEON') {
      ctx.strokeStyle = theme === 'SYNTHWAVE' ? 'rgba(219, 39, 119, 0.08)' : 'rgba(6, 182, 212, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // 2. Render Maze Walls, Dots, and Energizers
    const now = Date.now();
    const energizerPulse = (Math.sin(now / 150) + 1) / 2; // 0 to 1

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = maze[r][c];
        const x = c * tileSize;
        const y = r * tileSize;
        const cx = x + tileSize / 2;
        const cy = y + tileSize / 2;

        if (tile === 1) {
          // WALL
          ctx.save();
          if (theme === 'NEON') {
            ctx.fillStyle = '#082f49';
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 6;
            ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
          } else if (theme === 'SYNTHWAVE') {
            ctx.fillStyle = '#4c1d95';
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 8;
            ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
          } else if (theme === 'VECTOR') {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 4;
            ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          } else {
            // CLASSIC
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
          }
          ctx.restore();
        } else if (tile === 4) {
          // GHOST HOUSE GATE
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(x, y + tileSize / 2 - 2, tileSize, 4);
        } else if (tile === 2) {
          // SMALL DOT
          ctx.fillStyle = theme === 'SYNTHWAVE' ? '#fde047' : theme === 'NEON' ? '#67e8f9' : '#ffb8ae';
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 3) {
          // POWER PELLET (ENERGIZER)
          const radius = 5 + energizerPulse * 2.5;
          ctx.save();
          ctx.fillStyle = theme === 'SYNTHWAVE' ? '#f43f5e' : theme === 'NEON' ? '#a855f7' : '#ffffff';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // 3. Render Bonus Fruit if active
    if (fruit && fruit.active) {
      const fx = fruit.x * tileSize + tileSize / 2;
      const fy = fruit.y * tileSize + tileSize / 2;
      ctx.save();
      ctx.shadowColor = fruit.color;
      ctx.shadowBlur = 10;

      // Draw fruit icon shape
      ctx.fillStyle = fruit.color;
      ctx.beginPath();
      ctx.arc(fx, fy + 1, 6, 0, Math.PI * 2);
      ctx.fill();

      // Stem / Leaf
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 5);
      ctx.lineTo(fx + 3, fy - 9);
      ctx.stroke();

      ctx.restore();
    }

    // 4. Render Special Power-Up Item if active
    if (powerUpItem && powerUpItem.active) {
      const px = powerUpItem.x * tileSize + tileSize / 2;
      const py = powerUpItem.y * tileSize + tileSize / 2;
      const pulse = Math.sin(now / 100) * 2;

      ctx.save();
      ctx.shadowColor = powerUpItem.color;
      ctx.shadowBlur = 12;

      // Outer glowing ring
      ctx.strokeStyle = powerUpItem.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 9 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Icon symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(powerUpItem.icon, px, py);

      ctx.restore();
    }

    // 5. Render Pac-Man
    const pacX = pacman.x * tileSize + tileSize / 2;
    const pacY = pacman.y * tileSize + tileSize / 2;
    const pacRadius = tileSize * 0.45;

    ctx.save();
    // Power-up shield / aura effect
    if (pacman.powerUp) {
      const auraColor =
        pacman.powerUp === 'SPEED' ? '#eab308' :
        pacman.powerUp === 'FREEZE' ? '#06b6d4' :
        pacman.powerUp === 'MAGNET' ? '#f97316' : '#a855f7';

      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pacX, pacY, pacRadius + 4 + Math.sin(now / 80) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Calculate mouth opening rotation
    let baseAngle = 0;
    if (pacman.dir === 'LEFT') baseAngle = Math.PI;
    else if (pacman.dir === 'UP') baseAngle = -Math.PI / 2;
    else if (pacman.dir === 'DOWN') baseAngle = Math.PI / 2;

    const mouthOpen = pacman.mouthAngle; // 0 to 0.4 radians
    const startAngle = baseAngle + mouthOpen;
    const endAngle = baseAngle + Math.PI * 2 - mouthOpen;

    ctx.fillStyle = '#facc15'; // Vibrant Yellow
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = theme === 'NEON' || theme === 'SYNTHWAVE' ? 10 : 0;

    ctx.beginPath();
    ctx.moveTo(pacX, pacY);
    ctx.arc(pacX, pacY, pacRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Eye dot
    let eyeX = pacX;
    let eyeY = pacY - pacRadius * 0.5;
    if (pacman.dir === 'RIGHT') { eyeX = pacX + 1; eyeY = pacY - pacRadius * 0.55; }
    else if (pacman.dir === 'LEFT') { eyeX = pacX - 1; eyeY = pacY - pacRadius * 0.55; }
    else if (pacman.dir === 'UP') { eyeX = pacX + pacRadius * 0.4; eyeY = pacY - 1; }
    else if (pacman.dir === 'DOWN') { eyeX = pacX + pacRadius * 0.4; eyeY = pacY + 1; }

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 6. Render Ghosts
    ghosts.forEach((ghost) => {
      const gx = ghost.x * tileSize + tileSize / 2;
      const gy = ghost.y * tileSize + tileSize / 2;
      const gRadius = tileSize * 0.45;

      ctx.save();

      if (ghost.state === 'EATEN') {
        // EATEN MODE: Only render eyes returning
        drawGhostEyes(ctx, gx, gy, ghost.dir);
      } else if (ghost.state === 'FRIGHTENED') {
        // FRIGHTENED MODE: Flashing blue/white
        const isFlashing = ghost.frightenedTimer <= 2 && Math.floor(now / 150) % 2 === 0;
        const ghostColor = isFlashing ? '#ffffff' : '#1e3a8a';
        const mouthColor = isFlashing ? '#ef4444' : '#f43f5e';

        ctx.fillStyle = ghostColor;
        ctx.shadowColor = ghostColor;
        ctx.shadowBlur = 8;

        drawGhostBody(ctx, gx, gy, gRadius, now);

        // Frightened face: 2 small eyes & wavy mouth
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 2, 2, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Wavy mouth
        ctx.strokeStyle = mouthColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gx - 6, gy + 4);
        ctx.lineTo(gx - 3, gy + 2);
        ctx.lineTo(gx, gy + 4);
        ctx.lineTo(gx + 3, gy + 2);
        ctx.lineTo(gx + 6, gy + 4);
        ctx.stroke();
      } else {
        // NORMAL CHASE/SCATTER/HOUSE MODE
        ctx.fillStyle = ghost.color;
        ctx.shadowColor = ghost.color;
        ctx.shadowBlur = theme === 'NEON' || theme === 'SYNTHWAVE' ? 10 : 2;

        drawGhostBody(ctx, gx, gy, gRadius, now);
        drawGhostEyes(ctx, gx, gy, ghost.dir);
      }

      ctx.restore();
    });

    // 7. Render Particles
    particleSystem.draw(ctx);

    // 8. Render Floating Score Texts
    floatingTexts.forEach((ft) => {
      const tx = ft.x * tileSize + tileSize / 2;
      const ty = ft.y * tileSize + tileSize / 2;
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.opacity);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, tx, ty);
      ctx.restore();
    });

    ctx.restore(); // Restore high DPI scale
  }, [maze, pacman, ghosts, floatingTexts, fruit, powerUpItem, particleSystem, theme, tileSize]);

  return (
    <div className="relative inline-block border-2 border-slate-800 rounded-lg overflow-hidden shadow-2xl bg-black">
      <canvas ref={canvasRef} className="block" />

      {/* CRT Screen Scanlines & Curvature Overlay effect */}
      {enableCRT && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] opacity-70" />
      )}
    </div>
  );
};

/**
 * Helper to render ghost dome & waving bottom skirt
 */
function drawGhostBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number
) {
  const topY = y - radius;
  const bottomY = y + radius;
  const waveOffset = Math.sin(time / 100) * 1.5;

  ctx.beginPath();
  // Dome top arc
  ctx.arc(x, y - 1, radius, Math.PI, 0, false);
  // Right side wall down
  ctx.lineTo(x + radius, bottomY);

  // Wavy bottom skirts (3 wave bumps)
  const width = radius * 2;
  const bumpWidth = width / 3;

  ctx.lineTo(x + radius - bumpWidth * 0.5, bottomY - 3 + waveOffset);
  ctx.lineTo(x + radius - bumpWidth, bottomY);
  ctx.lineTo(x + radius - bumpWidth * 1.5, bottomY - 3 - waveOffset);
  ctx.lineTo(x - radius + bumpWidth, bottomY);
  ctx.lineTo(x - radius + bumpWidth * 0.5, bottomY - 3 + waveOffset);
  ctx.lineTo(x - radius, bottomY);

  // Left wall up
  ctx.lineTo(x - radius, y - 1);
  ctx.closePath();
  ctx.fill();
}

/**
 * Helper to render ghost directional eyes & pupils
 */
function drawGhostEyes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Direction
) {
  let eyeDx = 0;
  let eyeDy = 0;

  if (dir === 'LEFT') eyeDx = -2.5;
  else if (dir === 'RIGHT') eyeDx = 2.5;
  else if (dir === 'UP') eyeDy = -2.5;
  else if (dir === 'DOWN') eyeDy = 2.5;

  // Eye Sclera (White background)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - 4.5 + eyeDx * 0.5, y - 2 + eyeDy * 0.5, 3.5, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 4.5 + eyeDx * 0.5, y - 2 + eyeDy * 0.5, 3.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils (Blue dots pointing direction)
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.arc(x - 4.5 + eyeDx, y - 2 + eyeDy, 2, 0, Math.PI * 2);
  ctx.arc(x + 4.5 + eyeDx, y - 2 + eyeDy, 2, 0, Math.PI * 2);
  ctx.fill();
}
