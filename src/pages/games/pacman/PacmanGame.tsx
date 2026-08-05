import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import confetti from 'canvas-confetti';
import {
  AIDifficulty,
  Direction,
  FloatingText,
  FruitItem,
  GameMode,
  GameStats,
  GameStatus,
  GhostEntity,
  PacManState,
  PowerUpItem,
  PowerUpType,
  VisualTheme
} from './types';
import { apiSend } from '../../../lib/api';
import { soundEngine } from './utils/audio';
import { calculateGhostTarget, getNextGhostDirection } from './utils/ghostAI';
import {
  canGhostAdvance,
  getGhostExitPosition,
  getGhostStepPosition,
  getPacmanStepPosition,
  isWithinPickupRadius
} from './utils/gamePhysics';
import { countDotsAndEnergizers, getMazeSpawns, isWalkableForPacman, MAZES, TILE_SIZE } from './utils/mazes';
import { ParticleSystem } from './utils/particles';
import { pacmanDirectionForSwipe } from './utils/touchControls';

import { ArcadeCanvas } from './components/ArcadeCanvas';
import { ControlsOverlay } from './components/ControlsOverlay';
import { HeaderBar } from './components/HeaderBar';
import { HowToPlayModal } from './components/HowToPlayModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { SettingsModal } from './components/SettingsModal';

const DEFAULT_STATS: GameStats = {
  dotsEaten: 0,
  ghostsEaten: 0,
  powerUpsCollected: 0,
  fruitsEaten: 0,
  gamesPlayed: 0,
  highestCombo: 0
};

const MAX_PACMAN_SPEED = 9.5;
const MAX_GHOST_SPEED = 10.5;
const GHOST_HOUSE_DELAYS = {
  PINKY: 1.5,
  INKY: 3.5,
  CLYDE: 6
} as const;

function resetRoundPositions(
  pacman: PacManState,
  ghosts: GhostEntity[],
  currentMaze: number[][]
) {
  const spawns = getMazeSpawns(currentMaze);
  const ghostExit = getGhostExitPosition(currentMaze);

  pacman.x = spawns.pacmanSpawn.x;
  pacman.y = spawns.pacmanSpawn.y;
  pacman.dir = 'NONE';
  pacman.nextDir = 'LEFT';
  pacman.powerUp = null;
  pacman.powerUpTimeLeft = 0;
  pacman.isShieldActive = false;

  ghosts.forEach((ghost) => {
    const spawn = ghost.name === 'BLINKY'
      ? ghostExit
      : spawns.ghostSpawns[ghost.name];
    ghost.x = spawn.x;
    ghost.y = spawn.y;
    ghost.dir = ghost.name === 'BLINKY' ? 'LEFT' : 'UP';
    ghost.nextDir = ghost.dir;
    ghost.state = ghost.name === 'BLINKY' ? 'CHASE' : 'HOUSE';
    ghost.frightenedTimer = 0;
    ghost.houseTimer = ghost.name === 'BLINKY' ? 0 : GHOST_HOUSE_DELAYS[ghost.name];
  });
}

export default function PacmanGame() {
  const navigate = useNavigate();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Game Configuration State
  const [theme, setTheme] = useState<VisualTheme>('NEON');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('MEDIUM');
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [enableCRT, setEnableCRT] = useState<boolean>(true);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);

  // Game Engine State
  const [status, setStatus] = useState<GameStatus>('READY');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  // Personal stats (kept locally — the STATS tab is per-device). The HIGH
  // SCORES tab itself is server-backed now (see LeaderboardModal), so there's
  // no local `scores` list to maintain here anymore.
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);

  // Entities & Maze
  const [mazeIndex, setMazeIndex] = useState<number>(0);
  const [maze, setMaze] = useState<number[][]>(() => MAZES[0].map((row) => [...row]));
  const [dotsRemaining, setDotsRemaining] = useState<number>(0);

  // Power-Up & Bonus Fruit State
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState<number>(0);
  const [fruit, setFruit] = useState<FruitItem | null>(null);
  const [powerUpItem, setPowerUpItem] = useState<PowerUpItem | null>(null);
  const fruitRef = useRef<FruitItem | null>(null);
  const powerUpItemRef = useRef<PowerUpItem | null>(null);

  // Particle System & Floating Text
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Cheap counter bumped every animation frame purely to tell ArcadeCanvas
  // when to redraw. Pac-Man/ghost motion lives in refs (not React state) for
  // performance, so something still needs to signal "a new frame happened"
  // without allocating a new array/object each time the way the old
  // floating-texts-churn trick did.
  const [frameTick, setFrameTick] = useState(0);

  // Pac-Man Mutable Ref State for fast 60fps loop
  const pacmanRef = useRef<PacManState>({
    x: 13.5,
    y: 23,
    dir: 'NONE',
    nextDir: 'NONE',
    speed: 7.5,
    mouthAngle: 0.2,
    mouthSpeed: 1.5,
    powerUp: null,
    powerUpTimeLeft: 0,
    isShieldActive: false
  });

  // Ghost Entities Mutable Ref State
  const ghostsRef = useRef<GhostEntity[]>([
    {
      name: 'BLINKY',
      x: 13.5,
      y: 11,
      dir: 'LEFT',
      nextDir: 'LEFT',
      speed: 6.5,
      color: '#ef4444',
      frightenedColor: '#1e3a8a',
      scatterTarget: { x: 26, y: 0 },
      state: 'CHASE',
      frightenedTimer: 0,
      houseTimer: 0,
      target: { x: 0, y: 0 },
      dotCounter: 0
    },
    {
      name: 'PINKY',
      x: 12.5,
      y: 14,
      dir: 'UP',
      nextDir: 'UP',
      speed: 6.2,
      color: '#f472b6',
      frightenedColor: '#1e3a8a',
      scatterTarget: { x: 1, y: 0 },
      state: 'HOUSE',
      frightenedTimer: 0,
      houseTimer: 1.5,
      target: { x: 0, y: 0 },
      dotCounter: 0
    },
    {
      name: 'INKY',
      x: 13.5,
      y: 14,
      dir: 'UP',
      nextDir: 'UP',
      speed: 6.0,
      color: '#22d3ee',
      frightenedColor: '#1e3a8a',
      scatterTarget: { x: 26, y: 30 },
      state: 'HOUSE',
      frightenedTimer: 0,
      houseTimer: 4.0,
      target: { x: 0, y: 0 },
      dotCounter: 0
    },
    {
      name: 'CLYDE',
      x: 14.5,
      y: 14,
      dir: 'UP',
      nextDir: 'UP',
      speed: 5.8,
      color: '#fb923c',
      frightenedColor: '#1e3a8a',
      scatterTarget: { x: 1, y: 30 },
      state: 'HOUSE',
      frightenedTimer: 0,
      houseTimer: 7.0,
      target: { x: 0, y: 0 },
      dotCounter: 0
    }
  ]);

  // Combo multiplier for ghost eating
  const ghostComboRef = useRef<number>(1);
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);

  // Mirror score/level into refs so the game-over handler (fired from a
  // setTimeout captured by the updateGame callback) always reads the latest
  // values instead of a stale closure.
  const scoreRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  // Detect Mobile device to auto-enable touch controls
  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const updateTouchControls = () => {
      if (coarsePointer.matches || navigator.maxTouchPoints > 0) {
        setShowTouchControls(true);
      }
    };
    updateTouchControls();
    coarsePointer.addEventListener?.('change', updateTouchControls);
    return () => {
      coarsePointer.removeEventListener?.('change', updateTouchControls);
    };
  }, []);

  // Load High Score & Stats from LocalStorage
  useEffect(() => {
    try {
      const savedScore = localStorage.getItem('pacman_high_score');
      if (savedScore) setHighScore(parseInt(savedScore, 10));

      const savedStats = localStorage.getItem('pacman_stats');
      if (savedStats) setStats(JSON.parse(savedStats));
    } catch {
      // ignore storage errors
    }
  }, []);

  // Sync Audio Engine Volume/Mute
  useEffect(() => {
    soundEngine.setMuted(isMuted);
    soundEngine.setVolume(volume);
  }, [isMuted, volume]);

  useEffect(() => {
    const fullscreenDocument = document as Document & {
      webkitFullscreenElement?: Element | null;
    };
    const fullscreenContainer = gameContainerRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    setFullscreenSupported(
      Boolean(document.fullscreenEnabled || fullscreenContainer?.webkitRequestFullscreen)
    );

    const updateFullscreenState = () => {
      const activeElement =
        document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement;
      setIsFullscreen(activeElement === gameContainerRef.current);
    };

    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenState);
    };
  }, []);

  const toggleFullscreen = async () => {
    const fullscreenDocument = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    const container = gameContainerRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    if (!container) return;

    setFullscreenError(null);
    try {
      if (document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await fullscreenDocument.webkitExitFullscreen?.();
      } else if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else {
        await container.webkitRequestFullscreen?.();
      }
    } catch {
      setFullscreenError('Full Screen could not start. Check your browser permissions.');
    }
  };

  // Initialize Maze and Dots for Level
  const initLevel = useCallback(
    (lvl: number, currentMazeIdx: number) => {
      const rawMaze = MAZES[currentMazeIdx % MAZES.length];
      const mazeCopy = rawMaze.map((row) => [...row]);
      const { dots, energizers } = countDotsAndEnergizers(mazeCopy);

      setMaze(mazeCopy);
      setDotsRemaining(dots + energizers);

      const spawns = getMazeSpawns(mazeCopy);
      const ghostExit = getGhostExitPosition(mazeCopy);

      // Reset Pac-Man
      pacmanRef.current = {
        x: spawns.pacmanSpawn.x,
        y: spawns.pacmanSpawn.y,
        dir: 'NONE',
        nextDir: 'LEFT',
        speed: Math.min(MAX_PACMAN_SPEED, 7.5 + (lvl - 1) * 0.3),
        mouthAngle: 0.2,
        mouthSpeed: 1.5,
        powerUp: null,
        powerUpTimeLeft: 0,
        isShieldActive: false
      };

      // Reset Ghosts with speed multiplier based on difficulty & level
      const diffMult =
        difficulty === 'EASY' ? 0.8 : difficulty === 'HARD' ? 1.15 : difficulty === 'NIGHTMARE' ? 1.3 : 1.0;

      ghostsRef.current = [
        {
          name: 'BLINKY',
          x: ghostExit.x,
          y: ghostExit.y,
          dir: 'LEFT',
          nextDir: 'LEFT',
          speed: Math.min(MAX_GHOST_SPEED, (6.5 + (lvl - 1) * 0.25) * diffMult),
          color: '#ef4444',
          frightenedColor: '#1e3a8a',
          scatterTarget: { x: mazeCopy[0].length - 2, y: 0 },
          state: 'CHASE',
          frightenedTimer: 0,
          houseTimer: 0,
          target: { x: 0, y: 0 },
          dotCounter: 0
        },
        {
          name: 'PINKY',
          x: spawns.ghostSpawns.PINKY.x,
          y: spawns.ghostSpawns.PINKY.y,
          dir: 'UP',
          nextDir: 'UP',
          speed: Math.min(MAX_GHOST_SPEED, (6.2 + (lvl - 1) * 0.25) * diffMult),
          color: '#f472b6',
          frightenedColor: '#1e3a8a',
          scatterTarget: { x: 1, y: 0 },
          state: 'HOUSE',
          frightenedTimer: 0,
          houseTimer: 1.5,
          target: { x: 0, y: 0 },
          dotCounter: 0
        },
        {
          name: 'INKY',
          x: spawns.ghostSpawns.INKY.x,
          y: spawns.ghostSpawns.INKY.y,
          dir: 'UP',
          nextDir: 'UP',
          speed: Math.min(MAX_GHOST_SPEED, (6.0 + (lvl - 1) * 0.25) * diffMult),
          color: '#22d3ee',
          frightenedColor: '#1e3a8a',
          scatterTarget: { x: mazeCopy[0].length - 2, y: mazeCopy.length - 1 },
          state: 'HOUSE',
          frightenedTimer: 0,
          houseTimer: 3.5,
          target: { x: 0, y: 0 },
          dotCounter: 0
        },
        {
          name: 'CLYDE',
          x: spawns.ghostSpawns.CLYDE.x,
          y: spawns.ghostSpawns.CLYDE.y,
          dir: 'UP',
          nextDir: 'UP',
          speed: Math.min(MAX_GHOST_SPEED, (5.8 + (lvl - 1) * 0.25) * diffMult),
          color: '#fb923c',
          frightenedColor: '#1e3a8a',
          scatterTarget: { x: 1, y: mazeCopy.length - 1 },
          state: 'HOUSE',
          frightenedTimer: 0,
          houseTimer: 6.0,
          target: { x: 0, y: 0 },
          dotCounter: 0
        }
      ];

      // Reset the ghost-eating combo multiplier — without this, a combo
      // built up right before clearing a level (e.g. eating several ghosts
      // off one energizer) would silently carry into the next level and
      // inflate the very first ghost's point value there.
      ghostComboRef.current = 1;

      particleSystemRef.current.clear();
      setFloatingTexts([]);
      fruitRef.current = null;
      powerUpItemRef.current = null;
      setFruit(null);
      setPowerUpItem(null);
      setActivePowerUp(null);
      setPowerUpTimeLeft(0);
    },
    [difficulty]
  );

  // Record a completed run to the school-wide server leaderboard. This is
  // best-effort — a failed submit (flaky network, expired session) shouldn't
  // interrupt the game-over flow, so errors are swallowed here, the same
  // treatment Snake/Checkers give their score-save calls (see
  // authInterceptor's "optional auth" allowlist for the matching 401 case).
  const recordScore = useCallback(() => {
    apiSend('/api/games/pacman/scores', 'POST', {
      score: scoreRef.current,
      level: levelRef.current,
      gameMode
    }).catch(() => {
      // Swallowed intentionally — see comment above.
    });
  }, [gameMode]);

  // Start new game
  const handleStartGame = () => {
    setScore(0);
    setLevel(1);
    setLives(3);
    setIsNewHighScore(false);
    setMazeIndex(0);
    initLevel(1, 0);
    setStatus('PLAYING');
    soundEngine.playGameStart();

    // Increment games played stat
    setStats((prev) => {
      const updated = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
      localStorage.setItem('pacman_stats', JSON.stringify(updated));
      return updated;
    });
  };

  // Restart current game
  const handleRestartGame = () => {
    handleStartGame();
  };

  // Move to Next Level
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    const nextMazeIdx = (mazeIndex + 1) % MAZES.length;
    setLevel(nextLvl);
    setMazeIndex(nextMazeIdx);
    initLevel(nextLvl, nextMazeIdx);
    setStatus('PLAYING');
    soundEngine.playGameStart();
  };

  // Spawn Bonus Fruit dynamically
  const spawnFruit = useCallback(() => {
    const fruitsList: FruitItem['type'][] = [
      'CHERRY',
      'STRAWBERRY',
      'PEACH',
      'APPLE',
      'MELON',
      'GALAXIAN',
      'BELL',
      'KEY'
    ];
    const fruitType = fruitsList[Math.min(level - 1, fruitsList.length - 1)];
    const pointsMap: Record<FruitItem['type'], number> = {
      CHERRY: 100,
      STRAWBERRY: 300,
      PEACH: 500,
      APPLE: 700,
      MELON: 1000,
      GALAXIAN: 2000,
      BELL: 3000,
      KEY: 5000
    };
    const colorMap: Record<FruitItem['type'], string> = {
      CHERRY: '#ef4444',
      STRAWBERRY: '#f43f5e',
      PEACH: '#fb923c',
      APPLE: '#22c55e',
      MELON: '#a3e635',
      GALAXIAN: '#38bdf8',
      BELL: '#facc15',
      KEY: '#c084fc'
    };

    const { fruitSpawn } = getMazeSpawns(maze);
    const nextFruit: FruitItem = {
      type: fruitType,
      points: pointsMap[fruitType],
      x: fruitSpawn.x,
      y: fruitSpawn.y,
      duration: 10, // active for 10 seconds
      active: true,
      color: colorMap[fruitType]
    };
    fruitRef.current = nextFruit;
    setFruit(nextFruit);
  }, [level, maze]);

  // Spawn Power-Up Item dynamically
  const spawnPowerUpItem = useCallback(() => {
    const types: PowerUpType[] = ['SPEED', 'FREEZE', 'MAGNET', 'SHIELD'];
    const pType = types[Math.floor(Math.random() * types.length)];
    const iconMap: Record<PowerUpType, string> = {
      SPEED: '⚡',
      FREEZE: '❄️',
      MAGNET: '🧲',
      SHIELD: '🛡️',
      BOMB: '💥'
    };
    const colorMap: Record<PowerUpType, string> = {
      SPEED: '#facc15',
      FREEZE: '#38bdf8',
      MAGNET: '#f97316',
      SHIELD: '#a855f7',
      BOMB: '#ef4444'
    };

    const { powerUpSpawns, fruitSpawn } = getMazeSpawns(maze);
    const spawn =
      powerUpSpawns[Math.floor(Math.random() * powerUpSpawns.length)] ?? fruitSpawn;
    const nextPowerUp: PowerUpItem = {
      type: pType,
      x: spawn.x,
      y: spawn.y,
      duration: 8,
      active: true,
      color: colorMap[pType],
      icon: iconMap[pType]
    };
    powerUpItemRef.current = nextPowerUp;
    setPowerUpItem(nextPowerUp);
  }, [maze]);

  // Keyboard Movement Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'PLAYING' && status !== 'PAUSED') return;

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setStatus((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
        return;
      }

      if (e.key === ' ' && status === 'PLAYING') {
        // Trigger Super Power Boost / Magnet Pulse
        if (!pacmanRef.current.powerUp) {
          pacmanRef.current.powerUp = 'SPEED';
          pacmanRef.current.powerUpTimeLeft = 5;
          setActivePowerUp('SPEED');
          setPowerUpTimeLeft(5);
          soundEngine.playPowerUp();
        }
        return;
      }

      let newDir: Direction | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') newDir = 'UP';
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') newDir = 'DOWN';
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') newDir = 'LEFT';
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') newDir = 'RIGHT';

      if (newDir) {
        e.preventDefault();
        pacmanRef.current.nextDir = newDir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  // Main 60FPS Game Loop
  const updateGame = useCallback(
    (dt: number) => {
      if (status !== 'PLAYING') return;

      const pac = pacmanRef.current;
      const ghosts = ghostsRef.current;
      const ps = particleSystemRef.current;

      // Update Particle System
      ps.update(dt);

      // Guards LEVEL_CLEAR from firing more than once if several dots are
      // consumed in the same frame (e.g. a burst collected at once via the
      // Magnet power-up) — dotsRemaining would otherwise dip below zero
      // multiple times and re-trigger the level-clear transition each time.
      let levelClearTriggered = false;

      // Shared dot/energizer pickup handler used both for the tile Pac-Man
      // is standing on and for the Magnet power-up's nearby auto-collect.
      const collectDot = (rx: number, ry: number, tileValue: number) => {
        maze[ry][rx] = 0;
        const px = rx * TILE_SIZE + TILE_SIZE / 2;
        const py = ry * TILE_SIZE + TILE_SIZE / 2;

        if (tileValue === 2) {
          ps.spawnDotParticles(px, py);
          setDotsRemaining((prev) => {
            const rem = prev - 1;
            if (rem === 100 || rem === 50) spawnFruit();
            if (rem === 120 || rem === 30) spawnPowerUpItem();
            if (rem <= 0 && !levelClearTriggered) {
              levelClearTriggered = true;
              setStatus('LEVEL_CLEAR');
              soundEngine.playLevelClear();
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            return rem;
          });
          setScore((s) => s + 10);
          soundEngine.playWaka();
          setStats((prev) => ({ ...prev, dotsEaten: prev.dotsEaten + 1 }));
        } else {
          ps.spawnPowerUpSparkles(px, py, '#a855f7');
          setDotsRemaining((prev) => {
            const rem = prev - 1;
            if (rem <= 0 && !levelClearTriggered) {
              levelClearTriggered = true;
              setStatus('LEVEL_CLEAR');
              soundEngine.playLevelClear();
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            return rem;
          });
          setScore((s) => s + 50);
          ghostComboRef.current = 1; // Reset ghost combo multiplier
          soundEngine.playEnergizer();
          ghosts.forEach((g) => {
            if (g.state !== 'EATEN') {
              g.state = 'FRIGHTENED';
              g.frightenedTimer = 8; // 8 seconds frightened
            }
          });
        }
      };

      // Update Power-Up Time Left
      if (pac.powerUpTimeLeft > 0) {
        pac.powerUpTimeLeft -= dt;
        setPowerUpTimeLeft(pac.powerUpTimeLeft);
        if (pac.powerUpTimeLeft <= 0) {
          pac.powerUp = null;
          setActivePowerUp(null);
        }
      }

      // 1. UPDATE PAC-MAN MOVEMENT
      const currentSpeed = pac.speed * (pac.powerUp === 'SPEED' ? 1.5 : 1.0);
      const moveDistance = currentSpeed * dt;

      // Handle Direction Change Requests
      if (pac.nextDir !== 'NONE') {
        const isOpposite =
          (pac.dir === 'LEFT' && pac.nextDir === 'RIGHT') ||
          (pac.dir === 'RIGHT' && pac.nextDir === 'LEFT') ||
          (pac.dir === 'UP' && pac.nextDir === 'DOWN') ||
          (pac.dir === 'DOWN' && pac.nextDir === 'UP');

        if (pac.dir === 'NONE' || isOpposite) {
          // Immediately check if target cell in nextDir is walkable.
          // Half-tile-wide spawn/gate corridors mean pac.x (or pac.y) can
          // sit exactly on a column boundary (e.g. 13.5) before Pac-Man's
          // first move — Math.round alone commits to one specific
          // neighboring column, and if that particular one doesn't have a
          // clear path (even though the other one does) the very first
          // keypress would be silently rejected. Try every neighboring
          // column/row implied by the current fractional position before
          // giving up.
          const cols = maze[0].length;
          const candidateXs = Array.from(
            new Set([Math.round(pac.x), Math.floor(pac.x), Math.ceil(pac.x)])
          );
          const candidateYs = Array.from(
            new Set([Math.round(pac.y), Math.floor(pac.y), Math.ceil(pac.y)])
          );

          findTarget: for (const testX of candidateXs) {
            for (const testY of candidateYs) {
              let targetX = testX;
              let targetY = testY;
              if (pac.nextDir === 'UP') targetY -= 1;
              else if (pac.nextDir === 'DOWN') targetY += 1;
              else if (pac.nextDir === 'LEFT') targetX -= 1;
              else if (pac.nextDir === 'RIGHT') targetX += 1;

              if (targetX < 0) targetX = cols - 1;
              if (targetX >= cols) targetX = 0;

              const targetTile = maze[targetY]?.[targetX];
              if (targetTile !== undefined && isWalkableForPacman(targetTile)) {
                pac.dir = pac.nextDir;
                if (pac.nextDir === 'UP' || pac.nextDir === 'DOWN') pac.x = testX;
                if (pac.nextDir === 'LEFT' || pac.nextDir === 'RIGHT') pac.y = testY;
                break findTarget;
              }
            }
          }
        } else if (pac.nextDir !== pac.dir) {
          // Check perpendicular turn alignment at intersections
          const testX = Math.round(pac.x);
          const testY = Math.round(pac.y);

          const isAligned = Math.abs(pac.x - testX) < 0.45 && Math.abs(pac.y - testY) < 0.45;

          if (isAligned) {
            let targetX = testX;
            let targetY = testY;
            if (pac.nextDir === 'UP') targetY -= 1;
            else if (pac.nextDir === 'DOWN') targetY += 1;
            else if (pac.nextDir === 'LEFT') targetX -= 1;
            else if (pac.nextDir === 'RIGHT') targetX += 1;

            const cols = maze[0].length;
            if (targetX < 0) targetX = cols - 1;
            if (targetX >= cols) targetX = 0;

            const targetTile = maze[targetY]?.[targetX];
            if (targetTile !== undefined && isWalkableForPacman(targetTile)) {
              pac.dir = pac.nextDir;
              pac.x = testX;
              pac.y = testY;
            }
          }
        }
      }

      // Move Pac-Man in current direction
      if (pac.dir !== 'NONE') {
        const movement = getPacmanStepPosition(maze, pac, pac.dir, moveDistance);
        const moved = movement.position.x !== pac.x || movement.position.y !== pac.y;
        pac.x = movement.position.x;
        pac.y = movement.position.y;

        if (moved) {

          // Mouth Animation
          pac.mouthAngle += pac.mouthSpeed * dt;
          if (pac.mouthAngle > 0.45 || pac.mouthAngle < 0.05) {
            pac.mouthSpeed = -pac.mouthSpeed;
          }
        }

        if (movement.blocked) {
          // Snap to exact center when hitting wall
          pac.x = Math.round(pac.x);
          pac.y = Math.round(pac.y);

          // Defensive guard: the tile we just snapped onto should always be
          // walkable (it's the tile Pac-Man was already standing in), but if
          // it somehow isn't — e.g. accumulated floating-point drift over a
          // long session, or a maze edit — nudge him onto the nearest open
          // tile instead of leaving him permanently embedded in a wall with
          // no valid tile to move out of.
          const landedTile = maze[pac.y]?.[pac.x];
          if (landedTile === undefined || !isWalkableForPacman(landedTile)) {
            const neighborOffsets = [
              { dx: 0, dy: 0 },
              { dx: 1, dy: 0 },
              { dx: -1, dy: 0 },
              { dx: 0, dy: 1 },
              { dx: 0, dy: -1 }
            ];
            for (const offset of neighborOffsets) {
              const nx = pac.x + offset.dx;
              const ny = pac.y + offset.dy;
              const tile = maze[ny]?.[nx];
              if (tile !== undefined && isWalkableForPacman(tile)) {
                pac.x = nx;
                pac.y = ny;
                break;
              }
            }
          }

          pac.dir = 'NONE';
        }
      }

      // 2. PAC-MAN EATING TILES (DOTS / ENERGIZERS)
      const pacTileX = Math.round(pac.x);
      const pacTileY = Math.round(pac.y);
      const currentTile = maze[pacTileY]?.[pacTileX];

      if (currentTile === 2 || currentTile === 3) {
        collectDot(pacTileX, pacTileY, currentTile);
      }

      // MAGNET power-up: automatically vacuum up nearby dots/energizers
      // instead of requiring Pac-Man to walk directly over each one.
      if (pac.powerUp === 'MAGNET') {
        const magnetRadius = 2.5;
        const cols = maze[0].length;
        const minX = Math.max(0, Math.floor(pac.x - magnetRadius));
        const maxX = Math.min(cols - 1, Math.ceil(pac.x + magnetRadius));
        const minY = Math.max(0, Math.floor(pac.y - magnetRadius));
        const maxY = Math.min(maze.length - 1, Math.ceil(pac.y + magnetRadius));

        for (let ry = minY; ry <= maxY; ry++) {
          for (let rx = minX; rx <= maxX; rx++) {
            const t = maze[ry][rx];
            if (t !== 2 && t !== 3) continue;
            const dSq = (rx - pac.x) ** 2 + (ry - pac.y) ** 2;
            if (dSq > magnetRadius * magnetRadius) continue;
            collectDot(rx, ry, t);
          }
        }
      }

      // 3. PAC-MAN EATING BONUS FRUIT
      const activeFruit = fruitRef.current;
      if (activeFruit?.active) {
        if (isWithinPickupRadius(pac, activeFruit)) {
          setScore((s) => s + activeFruit.points);
          soundEngine.playEatFruit();
          fruitRef.current = null;
          setFruit(null);

          // Add Floating Text
          const newFt: FloatingText = {
            id: Math.random().toString(),
            x: activeFruit.x,
            y: activeFruit.y,
            text: `+${activeFruit.points}`,
            color: activeFruit.color,
            opacity: 1,
            life: 0
          };
          setFloatingTexts((prev) => [...prev, newFt]);

          setStats((prev) => ({ ...prev, fruitsEaten: prev.fruitsEaten + 1 }));
        }
      }

      // 4. PAC-MAN EATING POWER-UP ITEM
      const activePowerUpItem = powerUpItemRef.current;
      if (activePowerUpItem?.active) {
        if (isWithinPickupRadius(pac, activePowerUpItem)) {
          pac.powerUp = activePowerUpItem.type;
          pac.powerUpTimeLeft = 6;
          setActivePowerUp(activePowerUpItem.type);
          setPowerUpTimeLeft(6);
          soundEngine.playPowerUp();
          powerUpItemRef.current = null;
          setPowerUpItem(null);

          ps.spawnPowerUpSparkles(
            activePowerUpItem.x * TILE_SIZE + TILE_SIZE / 2,
            activePowerUpItem.y * TILE_SIZE + TILE_SIZE / 2,
            activePowerUpItem.color
          );

          setStats((prev) => ({ ...prev, powerUpsCollected: prev.powerUpsCollected + 1 }));
        }
      }

      // 5. UPDATE GHOST AI & MOVEMENT
      const blinkyPos = { x: ghosts[0].x, y: ghosts[0].y };
      const ghostExit = getGhostExitPosition(maze);

      // Guards against multiple ghosts overlapping Pac-Man in the same frame
      // from triggering the death sequence (and decrementing lives) more
      // than once — `status` is only re-checked at the top of updateGame,
      // so without this flag every ghost within collision range this tick
      // would independently run the "Pac-Man dies" branch below.
      let pacmanDiedThisFrame = false;

      ghosts.forEach((ghost) => {
        // Frightened Timer Countdown
        if (ghost.state === 'FRIGHTENED') {
          ghost.frightenedTimer -= dt;
          if (ghost.frightenedTimer <= 0) {
            ghost.state = 'CHASE';
          }
        }

        // Ghost House Exit Delay
        if (ghost.state === 'HOUSE') {
          ghost.houseTimer -= dt;
          if (ghost.houseTimer <= 0) {
            ghost.state = 'CHASE';
            ghost.x = ghostExit.x;
            ghost.y = ghostExit.y;
          }
          if (ghost.state === 'HOUSE') return;
        }

        // Calculate Target Cell
        ghost.target = calculateGhostTarget(ghost, blinkyPos, pac, maze, ghostExit);

        // Check if Ghost reached House after being eaten
        if (ghost.state === 'EATEN') {
          const gateDistSq = (ghost.x - ghostExit.x) ** 2 + (ghost.y - ghostExit.y) ** 2;
          if (gateDistSq < 0.5) {
            ghost.state = 'CHASE';
          }
        }

        // Ghost Movement Speed (Freeze power-up freezes ghosts)
        if (pac.powerUp === 'FREEZE' && ghost.state !== 'EATEN') {
          return; // Ghost frozen in ice!
        }

        const ghostSpeed =
          ghost.state === 'EATEN' ? 12.0 : ghost.state === 'FRIGHTENED' ? ghost.speed * 0.6 : ghost.speed;

        const gMoveDist = ghostSpeed * dt;

        // Pick a valid direction only when exactly on a tile center. The old
        // 0.25-tile threshold repeatedly snapped a ghost back to the center
        // during its first few movement frames, which made it appear frozen.
        const isAtTileCenter =
          Math.abs(ghost.x - Math.round(ghost.x)) < 0.001 &&
          Math.abs(ghost.y - Math.round(ghost.y)) < 0.001;

        if (isAtTileCenter) {
          ghost.x = Math.round(ghost.x);
          ghost.y = Math.round(ghost.y);
          const nextDir = getNextGhostDirection(ghost, maze, ghost.target);
          ghost.dir = nextDir;
        }

        const moveGhost = () => {
          const nextPosition = getGhostStepPosition(
            ghost,
            ghost.dir,
            gMoveDist,
            maze[0].length
          );

          if (!canGhostAdvance(maze, nextPosition, ghost.dir, ghost.state)) {
            return false;
          }

          ghost.x = nextPosition.x;
          ghost.y = nextPosition.y;
          return true;
        };

        // Recalculate if a malformed spawn or maze revision ever points a
        // ghost at a wall.
        if (!moveGhost()) {
          ghost.x = Math.round(ghost.x);
          ghost.y = Math.round(ghost.y);
          ghost.dir = getNextGhostDirection(ghost, maze, ghost.target);
          if (!moveGhost()) {
            // Last-resort recovery: the AI's chosen direction still can't
            // advance (e.g. it disagreed with canGhostAdvance about the tile
            // ahead). Brute-force every direction, reversal included, so a
            // ghost can never end up permanently frozen for the rest of the
            // level — worst case it briefly backtracks instead of vanishing
            // in place.
            const allDirections: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
            for (const dir of allDirections) {
              ghost.dir = dir;
              if (moveGhost()) break;
            }
          }
        }

        // 6. GHOST vs PAC-MAN COLLISION DETECTION
        if (isWithinPickupRadius(pac, ghost, 0.8)) {
          if (ghost.state === 'FRIGHTENED') {
            // EAT GHOST!
            ghost.state = 'EATEN';
            const pts = 200 * ghostComboRef.current;
            ghostComboRef.current *= 2;

            setScore((s) => s + pts);
            soundEngine.playEatGhost();

            ps.spawnGhostExplosion(
              ghost.x * TILE_SIZE + TILE_SIZE / 2,
              ghost.y * TILE_SIZE + TILE_SIZE / 2,
              ghost.color
            );

            // Floating Score Text
            const newFt: FloatingText = {
              id: Math.random().toString(),
              x: ghost.x,
              y: ghost.y,
              text: `+${pts}`,
              color: '#38bdf8',
              opacity: 1,
              life: 0
            };
            setFloatingTexts((prev) => [...prev, newFt]);

            setStats((prev) => {
              const updated = {
                ...prev,
                ghostsEaten: prev.ghostsEaten + 1,
                highestCombo: Math.max(prev.highestCombo, ghostComboRef.current)
              };
              localStorage.setItem('pacman_stats', JSON.stringify(updated));
              return updated;
            });
          } else if (ghost.state === 'CHASE' || ghost.state === 'SCATTER') {
            // PAC-MAN HIT BY GHOST!
            if (pac.isShieldActive || pac.powerUp === 'SHIELD') {
              // Shield breaks, ghost vaporized!
              pac.powerUp = null;
              pac.powerUpTimeLeft = 0;
              setActivePowerUp(null);
              setPowerUpTimeLeft(0);
              ghost.state = 'EATEN';
              ps.spawnGhostExplosion(
                ghost.x * TILE_SIZE + TILE_SIZE / 2,
                ghost.y * TILE_SIZE + TILE_SIZE / 2,
                '#a855f7'
              );
            } else if (!pacmanDiedThisFrame) {
              // PAC-MAN DIES
              pacmanDiedThisFrame = true;
              setStatus('DYING');
              soundEngine.playDeath();
              ps.spawnDeathBurst(pac.x * TILE_SIZE + TILE_SIZE / 2, pac.y * TILE_SIZE + TILE_SIZE / 2);

              setTimeout(() => {
                setLives((prevLives) => {
                  const remaining = prevLives - 1;
                  if (remaining <= 0) {
                    setStatus('GAME_OVER');
                    recordScore();
                  } else {
                    // Reset the full round so Pac-Man cannot respawn on top of
                    // the ghost that just hit him.
                    resetRoundPositions(pac, ghosts, maze);
                    setActivePowerUp(null);
                    setPowerUpTimeLeft(0);
                    setStatus('PLAYING');
                  }
                  return remaining;
                });
              }, 1000);
            }
          }
        }
      });

      // 7. Update Floating Texts (bail out without a state update when
      // there's nothing to animate — this used to run unconditionally
      // every frame, allocating a new array 60 times a second even when
      // idle, which was a meaningful chunk of the "laggy" feel).
      setFloatingTexts((prev) => {
        if (prev.length === 0) return prev;
        return prev
          .map((ft) => ({
            ...ft,
            y: ft.y - dt * 1.2,
            life: ft.life + dt,
            opacity: Math.max(0, 1 - ft.life / 0.8)
          }))
          .filter((ft) => ft.life < 0.8);
      });
    },
    [status, maze, spawnFruit, spawnPowerUpItem, recordScore]
  );

  // Track high score across every scoring event (dots, energizers, fruit,
  // ghosts) rather than only when eating dots, so a bonus that pushes the
  // score past the previous best is always recognized and persisted.
  useEffect(() => {
    setHighScore((prev) => {
      if (score > prev) {
        setIsNewHighScore(true);
        localStorage.setItem('pacman_high_score', score.toString());
        return score;
      }
      return prev;
    });
  }, [score]);

  // Animation Frame Loop Loop
  useEffect(() => {
    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      // Keep a slow browser frame from crossing an entire junction before a
      // buffered turn can be applied, especially at higher-level speeds.
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      updateGame(dt);
      setFrameTick((t) => (t + 1) % 1_000_000);
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateGame]);

  // Touch Direction Handler
  const handleDirectionChange = (dir: Direction) => {
    pacmanRef.current.nextDir = dir;
  };

  // Trigger Power Boost manually
  const handleTriggerPower = () => {
    if (!pacmanRef.current.powerUp) {
      pacmanRef.current.powerUp = 'SPEED';
      pacmanRef.current.powerUpTimeLeft = 5;
      setActivePowerUp('SPEED');
      setPowerUpTimeLeft(5);
      soundEngine.playPowerUp();
    }
  };

  return (
    <div
      ref={gameContainerRef}
      className={`bg-slate-950 text-white flex flex-col items-center justify-between overflow-x-hidden font-sans selection:bg-yellow-400 selection:text-slate-950 ${
        isFullscreen ? 'h-screen min-h-0 overflow-y-auto' : 'min-h-screen'
      }`}
    >
      {/* Back to Games bar */}
      {!isFullscreen && (
        <div className="w-full flex items-center justify-start px-3 py-1.5 bg-slate-950 border-b border-slate-900">
          <button
            onClick={() => navigate('/games/pacman')}
            className="px-3 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            {'◀ Back to Games'}
          </button>
        </div>
      )}

      {/* Top Arcade Scoreboard Header */}
      <HeaderBar
        score={score}
        highScore={highScore}
        level={level}
        lives={lives}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        theme={theme}
        onSelectTheme={setTheme}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
        gameMode={gameMode}
        activePowerUp={activePowerUp}
        powerUpTimeLeft={powerUpTimeLeft}
        fullscreenSupported={fullscreenSupported}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {fullscreenError && (
        <p className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl border border-rose-300/20 bg-rose-950/95 px-4 py-2 text-center text-xs font-semibold text-rose-100 shadow-lg">
          {fullscreenError}
        </p>
      )}

      {/* Main Game Arena */}
      <main className="relative my-auto flex w-full flex-1 flex-col items-center justify-center p-1 sm:p-2 md:p-4">
        <div
          className="relative flex w-full flex-col items-center"
          style={{ maxWidth: `${maze[0].length * TILE_SIZE}px` }}
          onTouchStart={(event) => {
            if (status !== 'PLAYING' || (event.target as HTMLElement).closest('button')) return;
            const touch = event.touches[0];
            if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            const start = touchStartRef.current;
            const touch = event.changedTouches[0];
            touchStartRef.current = null;
            if (status !== 'PLAYING' || !start || !touch) return;
            const direction = pacmanDirectionForSwipe(
              touch.clientX - start.x,
              touch.clientY - start.y
            );
            if (direction) handleDirectionChange(direction);
          }}
        >
          <ArcadeCanvas
            maze={maze}
            pacman={pacmanRef.current}
            ghosts={ghostsRef.current}
            floatingTexts={floatingTexts}
            fruit={fruit}
            powerUpItem={powerUpItem}
            frameTick={frameTick}
            particleSystem={particleSystemRef.current}
            theme={theme}
            enableCRT={enableCRT}
            tileSize={TILE_SIZE}
          />

          {/* Interactive State Overlay */}
          <ControlsOverlay
            status={status}
            score={score}
            level={level}
            isNewHighScore={isNewHighScore}
            onDirectionChange={handleDirectionChange}
            onTriggerPower={handleTriggerPower}
            onStartGame={handleStartGame}
            onResumeGame={() => setStatus('PLAYING')}
            onPauseGame={() => setStatus('PAUSED')}
            onRestartGame={handleRestartGame}
            onNextLevel={handleNextLevel}
            showTouchControls={showTouchControls}
          />
        </div>
      </main>

      {/* Modals */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        gameMode={gameMode}
        stats={stats}
        achievements={[
          {
            id: 'ach_1',
            title: 'Ghost Buster',
            description: 'Eat 20 ghosts in total',
            icon: '👻',
            unlocked: stats.ghostsEaten >= 20,
            progress: stats.ghostsEaten,
            maxProgress: 20
          },
          {
            id: 'ach_2',
            title: 'Dot Collector',
            description: 'Eat 500 dots',
            icon: '🟡',
            unlocked: stats.dotsEaten >= 500,
            progress: stats.dotsEaten,
            maxProgress: 500
          },
          {
            id: 'ach_3',
            title: 'Fruit Ninja',
            description: 'Eat 5 bonus fruits',
            icon: '🍒',
            unlocked: stats.fruitsEaten >= 5,
            progress: stats.fruitsEaten,
            maxProgress: 5
          },
          {
            id: 'ach_4',
            title: 'Power Surge',
            description: 'Collect 10 special power-ups',
            icon: '⚡',
            unlocked: stats.powerUpsCollected >= 10,
            progress: stats.powerUpsCollected,
            maxProgress: 10
          }
        ]}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onSelectTheme={setTheme}
        difficulty={difficulty}
        onSelectDifficulty={setDifficulty}
        gameMode={gameMode}
        onSelectGameMode={setGameMode}
        enableCRT={enableCRT}
        onToggleCRT={() => setEnableCRT((prev) => !prev)}
        showTouchControls={showTouchControls}
        onToggleTouchControls={() => setShowTouchControls((prev) => !prev)}
        volume={volume}
        onChangeVolume={setVolume}
      />

      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
    </div>
  );
}
