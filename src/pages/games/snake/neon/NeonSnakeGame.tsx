/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adapted from the user-provided multiplayer-neon-snake app.
 */

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { GameScene } from "./GameScene";
import { neonSnakeControlForSwipe } from "./gestures";
import { setNeonSnakeControl, useNeonSnakeStore } from "./gameStore";
import { NeonSnakeUI } from "./NeonSnakeUI";

export default function NeonSnakeGame() {
  const connect = useNeonSnakeStore((state) => state.connect);
  const disconnect = useNeonSnakeStore((state) => state.disconnect);
  const arenaRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const gestureTimers = useRef<Partial<Record<"left" | "right" | "boost", number>>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  useEffect(() => {
    connect();
    return () => {
      for (const timer of Object.values(gestureTimers.current)) {
        if (timer) window.clearTimeout(timer);
      }
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    const fullscreenDocument = document as Document & {
      webkitFullscreenElement?: Element | null;
    };
    const fullscreenArena = arenaRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    setFullscreenSupported(
      Boolean(document.fullscreenEnabled || fullscreenArena?.webkitRequestFullscreen),
    );
    const updateFullscreenState = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement || fullscreenDocument.webkitFullscreenElement),
      );
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener("webkitfullscreenchange", updateFullscreenState);
    };
  }, []);

  const fullscreenDocument = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
  };
  const toggleFullscreen = async () => {
    const arena = arenaRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    if (!arena) return;

    setFullscreenError(null);
    try {
      if (document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await fullscreenDocument.webkitExitFullscreen?.();
      } else if (arena.requestFullscreen) {
        await arena.requestFullscreen();
      } else {
        await arena.webkitRequestFullscreen?.();
      }
    } catch {
      setFullscreenError("Full Screen could not start. Check your browser permissions.");
    }
  };

  const pulseControl = (control: "left" | "right" | "boost", duration: number) => {
    const previousTimer = gestureTimers.current[control];
    if (previousTimer) window.clearTimeout(previousTimer);
    setNeonSnakeControl(control, true);
    gestureTimers.current[control] = window.setTimeout(() => {
      setNeonSnakeControl(control, false);
      delete gestureTimers.current[control];
    }, duration);
  };

  return (
    <div
      ref={arenaRef}
      className={`relative w-full touch-none overflow-hidden bg-black ${
        isFullscreen
          ? "h-screen min-h-0 rounded-none border-0"
          : "h-[calc(100dvh-9rem)] min-h-[520px] rounded-2xl border border-cyan-400/20 shadow-[0_0_40px_rgba(6,182,212,.16)]"
      }`}
      onTouchStart={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        const touch = event.touches[0];
        if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const touch = event.changedTouches[0];
        touchStart.current = null;
        if (!start || !touch) return;

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        const control = neonSnakeControlForSwipe(deltaX, deltaY);
        if (control) pulseControl(control, control === "boost" ? 400 : 90);
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 0, 50], fov: 60 }}
        gl={{ antialias: false }}
      >
        <color attach="background" args={["#050505"]} />
        <GameScene />
        <EffectComposer>
          <Bloom luminanceThreshold={1.5} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>
      <NeonSnakeUI
        fullscreenSupported={fullscreenSupported}
        isFullscreen={isFullscreen}
        fullscreenError={fullscreenError}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
