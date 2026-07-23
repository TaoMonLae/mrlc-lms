import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ScoreEntry,
  VisualTheme
} from './types';
import { soundEngine } from './utils/audio';
import { calculateGhostTarget, getNextGhostDirection } from './utils/ghostAI';
import { countDotsAndEnergizers, getMazeSpawns, isWalkableForPacman, MAZES, TILE_SIZE } from './utils/mazes';
import { ParticleSystem } from './utils/particles';

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

export default function PacmanGame() {
  const navigate = useNavigate();

  // Game Configuration State
  const [theme, setTheme] = useState<VisualTheme>('NEON');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('MEDIUM');
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [enableCRT, setEnableCRT] = useState<boolean>(true);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.3);

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

  // Leaderboard & Stats
  const [scores, setScores] = useState<ScoreEntry[]>([]);
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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (isMobile) {
      setShowTouchControls(true);
    }
  }, []);

  // Load High Score & Stats from LocalStorage
  useEffect(() => {
    try {
      const savedScore = localStorage.getItem('pacman_high_score');
      if (savedScore) setHighScore(parseInt(savedScore, 10));

      const savedScores = localStorage.getItem('pacman_scores');
      if (savedScores) setScores(JSON.parse(savedScores));

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

  // Initialize Maze and Dots for Level
  const initLevel = useCallback(
    (lvl: number, currentMazeIdx: number) => {
      const rawMaze = MAZES[currentMazeIdx % MAZES.length];
      const mazeCopy = rawMaze.map((row) => [...row]);
      const { dots } = countDotsAndEnergizers(mazeCopy);

      setMaze(mazeCopy);
      setDotsRemaining(dots);

      const spawns = getMazeSpawns(mazeCopy);

      // Reset Pac-Man
      pacmanRef.current = {
        x: spawns.pacmanSpawn.x,
        y: spawns.pacmanSpawn.y,
        dir: 'NONE',
        nextDir: 'LEFT',
        speed: 7.5 + (lvl - 1) * 0.3,
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
          x: spawns.ghostSpawns.BLINKY.x,
          y: spawns.ghostSpawns.BLINKY.y,
          dir: 'LEFT',
          nextDir: 'LEFT',
          speed: (6.5 + (lvl - 1) * 0.25) * diffMult,
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
          speed: (6.2 + (lvl - 1) * 0.25) * diffMult,
          color: '#f472b6',
          frightenedColor: '#1e3a8a',
          scatterTarget: { x: 1, y: 0 },
          state: 'HOUSE',
          frightenedTimer: 1.5,
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
          speed: (6.0 + (lvl - 1) * 0.25) * diffMult,
          color: '#22d3ee',
          frightenedColor: '#1e3a8a',
          scatterTarget: { x: mazeCopy[0].length - 2, y: mazeCopy.length - 1 },
          state: 'HOUSE',
          frightenedTimer: 3.5,
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
          speed: (5.8 + (lvl - 1) * 0.25) * diffMult,
          color: '#fb923c',
          frightenedColor: '#1e3a8a',
          scatterTarget: { x: 1, y: mazeCopy.length - 1 },
          state: 'HOUSE',
          frightenedTimer: 6.0,
          houseTimer: 6.0,
          target: { x: 0, y: 0 },
          dotCounter: 0
        }
      ];

      particleSystemRef.current.clear();
      setFloatingTexts([]);
      setFruit(null);
      setPowerUpItem(null);
      setActivePowerUp(null);
      setPowerUpTimeLeft(0);
    },
    [difficulty]
  );

  // Record a completed run to the local leaderboard/high-score history.
  const recordScore = useCallback(() => {
    const entry: ScoreEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: 'You',
      score: scoreRef.current,
      level: levelRef.current,
      mode: gameMode,
      date: new Date().toLocaleDateString()
    };
    setScores((prev) => {
      const updated = [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 10);
      localStorage.setItem('pacman_scores', JSON.stringify(updated));
      return updated;
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

    setFruit({
      type: fruitType,
      points: pointsMap[fruitType],
      x: 13.5,
      y: 17,
      duration: 10, // active for 10 seconds
      active: true,
      color: colorMap[fruitType]
    });
  }, [level]);

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

    setPowerUpItem({
      type: pType,
      x: 13.5,
      y: 17,
      duration: 8,
      active: true,
      color: colorMap[pType],
      icon: iconMap[pType]
    });
  }, []);

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
          // Immediately check if target cell in nextDir is walkable
          const testX = Math.round(pac.x);
          const testY = Math.round(pac.y);
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
            if (pac.nextDir === 'UP' || pac.nextDir === 'DOWN') pac.x = testX;
            if (pac.nextDir === 'LEFT' || pac.nextDir === 'RIGHT') pac.y = testY;
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
        let dx = 0;
        let dy = 0;
        if (pac.dir === 'UP') dy = -moveDistance;
        else if (pac.dir === 'DOWN') dy = moveDistance;
        else if (pac.dir === 'LEFT') dx = -moveDistance;
        else if (pac.dir === 'RIGHT') dx = moveDistance;

        let nextX = pac.x + dx;
        let nextY = pac.y + dy;

        // Wrap side tunnel
        const cols = maze[0].length;
        if (nextX < 0) nextX = cols - 1;
        if (nextX >= cols) nextX = 0;

        // Check tile collision
        const gridX = pac.dir === 'RIGHT' ? Math.ceil(nextX) : Math.floor(nextX);
        const gridY = pac.dir === 'DOWN' ? Math.ceil(nextY) : Math.floor(nextY);

        const checkTile = maze[gridY]?.[gridX];
        if (checkTile !== undefined && isWalkableForPacman(checkTile)) {
          pac.x = nextX;
          pac.y = nextY;

          // Mouth Animation
          pac.mouthAngle += pac.mouthSpeed * dt;
          if (pac.mouthAngle > 0.45 || pac.mouthAngle < 0.05) {
            pac.mouthSpeed = -pac.mouthSpeed;
          }
        } else {
          // Snap to exact center when hitting wall
          pac.x = Math.round(pac.x);
          pac.y = Math.round(pac.y);
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
      if (fruit && fruit.active) {
        const fDistSq = (pac.x - fruit.x) ** 2 + (pac.y - fruit.y) ** 2;
        if (fDistSq < 0.6) {
          setScore((s) => s + fruit.points);
          soundEngine.playEatFruit();
          setFruit(null);

          // Add Floating Text
          const newFt: FloatingText = {
            id: Math.random().toString(),
            x: fruit.x,
            y: fruit.y,
            text: `+${fruit.points}`,
            color: fruit.color,
            opacity: 1,
            life: 0
          };
          setFloatingTexts((prev) => [...prev, newFt]);

          setStats((prev) => ({ ...prev, fruitsEaten: prev.fruitsEaten + 1 }));
        }
      }

      // 4. PAC-MAN EATING POWER-UP ITEM
      if (powerUpItem && powerUpItem.active) {
        const pDistSq = (pac.x - powerUpItem.x) ** 2 + (pac.y - powerUpItem.y) ** 2;
        if (pDistSq < 0.6) {
          pac.powerUp = powerUpItem.type;
          pac.powerUpTimeLeft = 6;
          setActivePowerUp(powerUpItem.type);
          setPowerUpTimeLeft(6);
          soundEngine.playPowerUp();
          setPowerUpItem(null);

          ps.spawnPowerUpSparkles(
            powerUpItem.x * TILE_SIZE + TILE_SIZE / 2,
            powerUpItem.y * TILE_SIZE + TILE_SIZE / 2,
            powerUpItem.color
          );

          setStats((prev) => ({ ...prev, powerUpsCollected: prev.powerUpsCollected + 1 }));
        }
      }

      // 5. UPDATE GHOST AI & MOVEMENT
      const blinkyPos = { x: ghosts[0].x, y: ghosts[0].y };
      const ghostHouseGate = { x: 13.5, y: 11 };

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
            ghost.x = ghostHouseGate.x;
            ghost.y = ghostHouseGate.y;
          } else {
            // Bounce up and down inside house
            ghost.y += Math.sin(Date.now() / 150) * 0.02;
            return;
          }
        }

        // Calculate Target Cell
        ghost.target = calculateGhostTarget(ghost, blinkyPos, pac, maze, ghostHouseGate);

        // Check if Ghost reached House after being eaten
        if (ghost.state === 'EATEN') {
          const gateDistSq = (ghost.x - ghostHouseGate.x) ** 2 + (ghost.y - ghostHouseGate.y) ** 2;
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

        // Move Ghost towards current direction
        let gdx = 0;
        let gdy = 0;
        if (ghost.dir === 'UP') gdy = -gMoveDist;
        else if (ghost.dir === 'DOWN') gdy = gMoveDist;
        else if (ghost.dir === 'LEFT') gdx = -gMoveDist;
        else if (ghost.dir === 'RIGHT') gdx = gMoveDist;

        ghost.x += gdx;
        ghost.y += gdy;

        // Wrap side tunnel for ghosts
        if (ghost.x < 0) ghost.x = maze[0].length - 1;
        if (ghost.x >= maze[0].length) ghost.x = 0;

        // Check if ghost reached intersection center to decide next turn
        const isNearTileCenter =
          Math.abs(ghost.x - Math.round(ghost.x)) < 0.25 && Math.abs(ghost.y - Math.round(ghost.y)) < 0.25;

        if (isNearTileCenter) {
          ghost.x = Math.round(ghost.x);
          ghost.y = Math.round(ghost.y);
          const nextDir = getNextGhostDirection(ghost, maze, ghost.target);
          ghost.dir = nextDir;
        }

        // 6. GHOST vs PAC-MAN COLLISION DETECTION
        const distSq = (pac.x - ghost.x) ** 2 + (pac.y - ghost.y) ** 2;
        if (distSq < 0.6) {
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
                    // Respawn positions
                    const spawns = getMazeSpawns(maze);
                    pac.x = spawns.pacmanSpawn.x;
                    pac.y = spawns.pacmanSpawn.y;
                    pac.dir = 'NONE';
                    pac.nextDir = 'NONE';
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
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1); // cap delta time to prevent physics step jumps
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

  // Clear Leaderboard History
  const handleClearScores = () => {
    setScores([]);
    localStorage.removeItem('pacman_scores');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between font-sans selection:bg-yellow-400 selection:text-slate-950">
      {/* Back to Games bar */}
      <div className="w-full flex items-center justify-start px-3 py-1.5 bg-slate-950 border-b border-slate-900">
        <button
          onClick={() => navigate('/games/pacman')}
          className="px-3 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-bold transition cursor-pointer"
        >
          {'◀ Back to Games'}
        </button>
      </div>

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
      />

      {/* Main Game Arena */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-2 md:p-4 relative my-auto">
        <div className="relative">
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
        scores={scores}
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
        onClearScores={handleClearScores}
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
