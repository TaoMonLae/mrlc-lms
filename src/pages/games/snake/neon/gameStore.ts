/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import {
  NEON_SNAKE_SOCKET_PATH,
  type NeonSnakeGameState,
} from "../../../../../shared/neonSnake";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type GameStore = {
  socket: Socket | null;
  gameState: NeonSnakeGameState | null;
  playerId: string | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  joinGame: () => void;
  sendPlayerState: (data: unknown) => void;
  sendCollectOrb: (orbId: string) => void;
};

export const globalNeonSnakeState: { current: NeonSnakeGameState | null } = {
  current: null,
};

export const neonSnakeControls = {
  current: { left: false, right: false, boost: false },
};

export function setNeonSnakeControl(
  control: keyof typeof neonSnakeControls.current,
  active: boolean,
) {
  neonSnakeControls.current[control] = active;
}

let lastUiUpdate = 0;

export const useNeonSnakeStore = create<GameStore>((set, get) => ({
  socket: null,
  gameState: null,
  playerId: null,
  connectionStatus: "disconnected",
  connectionError: null,
  connect: () => {
    if (get().socket) return;

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      set({ connectionStatus: "error", connectionError: "Please sign in to play." });
      return;
    }

    set({ connectionStatus: "connecting", connectionError: null });
    const socket = io({
      path: NEON_SNAKE_SOCKET_PATH,
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      set({ connectionStatus: "connected", connectionError: null });
    });
    socket.on("connect_error", (error) => {
      set({
        connectionStatus: "error",
        connectionError: error.message || "Could not connect to the arena.",
      });
    });
    socket.on("disconnect", () => {
      set({ connectionStatus: "disconnected", playerId: null });
    });
    socket.on("init", (id: string) => {
      set({ playerId: id });
    });
    socket.on("state", (state: NeonSnakeGameState) => {
      globalNeonSnakeState.current = state;
      const now = Date.now();
      if (now - lastUiUpdate > 100) {
        set({ gameState: state });
        lastUiUpdate = now;
      }
    });

    set({ socket });
  },
  disconnect: () => {
    const socket = get().socket;
    socket?.removeAllListeners();
    socket?.disconnect();
    globalNeonSnakeState.current = null;
    neonSnakeControls.current = { left: false, right: false, boost: false };
    set({
      socket: null,
      gameState: null,
      playerId: null,
      connectionStatus: "disconnected",
      connectionError: null,
    });
  },
  joinGame: () => {
    get().socket?.emit("join");
  },
  sendPlayerState: (data) => {
    get().socket?.volatile.emit("update_state", data);
  },
  sendCollectOrb: (orbId) => {
    get().socket?.emit("collect_orb", orbId);
  },
}));
