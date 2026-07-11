"use client";

import * as React from "react";
import { createContext, useContext, useReducer, useCallback, useEffect } from "react";

export interface Position {
  x: number;
  y: number;
}

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface SnakeState {
  snake: Position[];
  food: Position;
  direction: Direction;
  // Queue of pending turns, applied one per tick. Using a queue (instead of a
  // single "next direction" slot) preserves rapid perpendicular inputs that
  // would otherwise overwrite each other, and makes 180-degree reversals
  // impossible to sneak in via two quick presses within one tick.
  directionQueue: Direction[];
  score: number;
  highScore: number;
  gameStatus: "IDLE" | "PLAYING" | "PAUSED" | "GAME_OVER";
  speed: number;
  gridSize: number;
  gameDuration: number;
}

export type SnakeAction =
  | { type: "START_GAME" }
  | { type: "PAUSE_GAME" }
  | { type: "RESUME_GAME" }
  | { type: "GAME_OVER" }
  | { type: "SET_DIRECTION"; payload: "UP" | "DOWN" | "LEFT" | "RIGHT" }
  | { type: "MOVE_SNAKE" }
  | { type: "PLACE_FOOD" }
  | { type: "SET_SPEED"; payload: number }
  | { type: "SET_GRID_SIZE"; payload: number }
  | { type: "RESET_GAME" };

const initialState: SnakeState = {
  snake: [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ],
  food: { x: 15, y: 10 }, // Ensure this doesn't overlap with snake initially
  direction: "RIGHT",
  directionQueue: [],
  score: 0,
  // High score is hydrated from localStorage by the provider (per game mode),
  // not read at module load — that would throw during SSR and couples the
  // reducer to a single storage key shared across modes.
  highScore: 0,
  gameStatus: "IDLE",
  speed: 150,
  gridSize: 20,
  gameDuration: 0,
};

function snakeReducer(state: SnakeState, action: SnakeAction): SnakeState {
  switch (action.type) {
    case "START_GAME":
      return {
        ...state,
        gameStatus: "PLAYING",
        gameDuration: 0,
      };

    case "PAUSE_GAME":
      return {
        ...state,
        gameStatus: "PAUSED",
      };

    case "RESUME_GAME":
      return {
        ...state,
        gameStatus: "PLAYING",
      };

    case "GAME_OVER":
      // Persistence is handled by the provider effect (mode-specific key).
      return {
        ...state,
        gameStatus: "GAME_OVER",
        highScore: Math.max(state.score, state.highScore),
      };

    case "SET_DIRECTION": {
      const opposites: Record<Direction, Direction> = {
        UP: "DOWN",
        DOWN: "UP",
        LEFT: "RIGHT",
        RIGHT: "LEFT",
      };

      // Validate each new turn against the LAST turn already queued (or the
      // committed direction if the queue is empty). This lets a genuine sequence
      // of perpendicular turns be buffered (e.g. RIGHT -> UP -> LEFT to weave),
      // while still rejecting any 180-degree reversal at every step.
      const lastDirection =
        state.directionQueue.length > 0
          ? state.directionQueue[state.directionQueue.length - 1]
          : state.direction;

      // Ignore reversals and no-op repeats of the last intended direction.
      if (action.payload === lastDirection || opposites[lastDirection] === action.payload) {
        return state;
      }

      // Cap the queue so stale turns can't pile up and make the snake feel
      // like it's steering itself after a burst of key presses.
      if (state.directionQueue.length >= 2) {
        return state;
      }

      return {
        ...state,
        directionQueue: [...state.directionQueue, action.payload],
      };
    }

    case "MOVE_SNAKE": {
      // Apply the next queued turn (if any) for this tick, leaving the rest of
      // the queue for subsequent ticks.
      const moveDirection = state.directionQueue.length > 0 ? state.directionQueue[0] : state.direction;
      const remainingQueue = state.directionQueue.slice(1);

      const head = state.snake[0];
      const newHead = {
        x: head.x + (moveDirection === "RIGHT" ? 1 : moveDirection === "LEFT" ? -1 : 0),
        y: head.y + (moveDirection === "DOWN" ? 1 : moveDirection === "UP" ? -1 : 0),
      };

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= state.gridSize ||
        newHead.y < 0 ||
        newHead.y >= state.gridSize
      ) {
        return {
          ...state,
          gameStatus: "GAME_OVER",
          highScore: Math.max(state.score, state.highScore),
        };
      }

      // Determine whether food will be eaten this tick — if so the tail stays,
      // otherwise the tail vacates its cell and is a legal move-into target.
      const willEat = newHead.x === state.food.x && newHead.y === state.food.y;

      // Check self collision. Exclude the tail segment when it's about to move
      // away this tick; moving into the current tail cell is legal in real Snake
      // and must not trigger a false game over.
      const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);
      if (bodyToCheck.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        return {
          ...state,
          gameStatus: "GAME_OVER",
          highScore: Math.max(state.score, state.highScore),
        };
      }

      const newSnake = [newHead, ...state.snake];

      // Check food collision
      if (willEat) {
        // Generate new food position (not on snake body)
        let newFood;
        let validPosition = false;
        while (!validPosition) {
          newFood = {
            x: Math.floor(Math.random() * state.gridSize),
            y: Math.floor(Math.random() * state.gridSize),
          };
          validPosition = !newSnake.some(
            (segment) => segment.x === newFood.x && segment.y === newFood.y
          );
        }

        return {
          ...state,
          snake: newSnake,
          score: state.score + 10,
          food: newFood,
          direction: moveDirection,
          directionQueue: remainingQueue,
        };
      }

      // Remove tail if no food eaten
      newSnake.pop();

      return {
        ...state,
        snake: newSnake,
        direction: moveDirection,
        directionQueue: remainingQueue,
      };
    }

    case "PLACE_FOOD":
      return {
        ...state,
        food: {
          x: Math.floor(Math.random() * state.gridSize),
          y: Math.floor(Math.random() * state.gridSize),
        },
      };

    case "SET_SPEED":
      return {
        ...state,
        speed: action.payload,
      };

    case "SET_GRID_SIZE":
      return {
        ...state,
        gridSize: action.payload,
      };

    case "RESET_GAME":
      return {
        ...initialState,
        highScore: state.highScore,
        gridSize: state.gridSize,
        speed: state.speed, // Preserve the current speed setting
        food: {
          x: Math.floor(Math.random() * state.gridSize),
          y: Math.floor(Math.random() * state.gridSize),
        },
      };

    default:
      return state;
  }
}

interface SnakeContextType {
  state: SnakeState;
  dispatch: React.Dispatch<SnakeAction>;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  changeDirection: (direction: "UP" | "DOWN" | "LEFT" | "RIGHT") => void;
  setSpeed: (speed: number) => void;
  setGridSize: (size: number) => void;
}

const SnakeContext = createContext<SnakeContextType | undefined>(undefined);

export function SnakeProvider({
  children,
  storageKey = "snakeHighScore",
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  const [state, dispatch] = useReducer(snakeReducer, initialState, (init) => ({
    ...init,
    highScore:
      typeof window !== "undefined"
        ? parseInt(window.localStorage.getItem(storageKey) || "0", 10) || 0
        : 0,
  }));

  // Persist the high score to a mode-specific key whenever the game ends, so
  // classic and vocabulary runs don't overwrite each other's best score.
  useEffect(() => {
    if (state.gameStatus === "GAME_OVER" && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, String(state.highScore));
    }
  }, [state.gameStatus, state.highScore, storageKey]);

  const startGame = useCallback(() => dispatch({ type: "START_GAME" }), []);
  const pauseGame = useCallback(() => dispatch({ type: "PAUSE_GAME" }), []);
  const resumeGame = useCallback(() => dispatch({ type: "RESUME_GAME" }), []);
  const resetGame = useCallback(() => dispatch({ type: "RESET_GAME" }), []);
  const changeDirection = useCallback(
    (direction: "UP" | "DOWN" | "LEFT" | "RIGHT") =>
      dispatch({ type: "SET_DIRECTION", payload: direction }),
    []
  );
  const setSpeed = useCallback(
    (speed: number) => dispatch({ type: "SET_SPEED", payload: speed }),
    []
  );
  const setGridSize = useCallback(
    (size: number) => dispatch({ type: "SET_GRID_SIZE", payload: size }),
    []
  );

  const value = {
    state,
    dispatch,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    changeDirection,
    setSpeed,
    setGridSize,
  };

  return <SnakeContext.Provider value={value}>{children}</SnakeContext.Provider>;
}

export function useSnake() {
  const context = useContext(SnakeContext);
  if (!context) {
    throw new Error("useSnake must be used within a SnakeProvider");
  }
  return context;
}
