/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adapted from the user-provided multiplayer-neon-snake app.
 */

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { GameScene } from "./GameScene";
import { useNeonSnakeStore } from "./gameStore";
import { NeonSnakeUI } from "./NeonSnakeUI";

export default function NeonSnakeGame() {
  const connect = useNeonSnakeStore((state) => state.connect);
  const disconnect = useNeonSnakeStore((state) => state.disconnect);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return (
    <div className="relative h-[calc(100dvh-9rem)] min-h-[520px] w-full overflow-hidden rounded-2xl border border-cyan-400/20 bg-black shadow-[0_0_40px_rgba(6,182,212,.16)]">
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
      <NeonSnakeUI />
    </div>
  );
}
