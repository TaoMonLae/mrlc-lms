/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 3D scene adapted from the user-provided multiplayer-neon-snake game.
 */

import { Grid, Sphere } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  NEON_SNAKE_BASE_SPEED,
  NEON_SNAKE_BOOST_SPEED,
  NEON_SNAKE_INITIAL_LENGTH,
  NEON_SNAKE_TURN_SPEED,
  NEON_SNAKE_WORLD_SIZE,
} from "../../../../../shared/neonSnake";
import {
  globalNeonSnakeState,
  neonSnakeControls,
  setNeonSnakeControl,
  useNeonSnakeStore,
} from "./gameStore";

const locallyCollectedOrbs = new Set<string>();

function Snake({
  playerId,
  color,
  isLocal,
}: {
  playerId: string;
  color: string;
  isLocal: boolean;
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{ x: number; y: number }[]>([]);

  useFrame((_state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const gameState = globalNeonSnakeState.current;
    const player = gameState?.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      headRef.current.visible = false;
      return;
    }

    headRef.current.visible = true;
    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);
    while (currentPositions.current.length < count) {
      const segment = player.segments[currentPositions.current.length] ?? { x: 0, y: 0 };
      currentPositions.current.push({ ...segment });
    }

    for (let index = 0; index < count; index += 1) {
      const target = player.segments[index];
      const current = currentPositions.current[index];
      if (isLocal) {
        current.x = target.x;
        current.y = target.y;
      } else {
        const distance = Math.abs(target.x - current.x) + Math.abs(target.y - current.y);
        if (distance > 10) {
          current.x = target.x;
          current.y = target.y;
        } else {
          current.x += (target.x - current.x) * 15 * delta;
          current.y += (target.y - current.y) * 15 * delta;
        }
      }

      if (index === 0) {
        headRef.current.position.set(current.x, current.y, 0.5);
      } else {
        dummy.position.set(current.x, current.y, 0.5);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(index - 1, dummy.matrix);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
  });

  const addFresnel = (strength: number) => (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `
        #include <emissivemap_fragment>
        float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
        totalEmissiveRadiance += diffuseColor.rgb * (0.4 + fresnel * ${strength.toFixed(1)});
      `,
    );
  };

  return (
    <group>
      <Sphere ref={headRef} castShadow receiveShadow args={[0.8, 16, 16]}>
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
          onBeforeCompile={addFresnel(3)}
        />
      </Sphere>
      <instancedMesh
        ref={bodyRef}
        args={[undefined, undefined, 600]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
          onBeforeCompile={addFresnel(1.5)}
        />
      </instancedMesh>
    </group>
  );
}

function Orbs() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    const gameState = globalNeonSnakeState.current;
    if (!mesh || !gameState) return;

    let index = 0;
    for (const [orbId, orb] of Object.entries(gameState.orbs)) {
      if (locallyCollectedOrbs.has(orbId)) continue;
      dummy.position.set(orb.x, orb.y, 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(orb.color);
      mesh.setColorAt(index, color);
      index += 1;
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 300]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial
        roughness={0.4}
        metalness={0.1}
        toneMapped={false}
        onBeforeCompile={(shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <emissivemap_fragment>",
            `
              #include <emissivemap_fragment>
              totalEmissiveRadiance += diffuseColor.rgb * 2.5;
            `,
          );
        }}
      />
    </instancedMesh>
  );
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectOrb } = useNeonSnakeStore();
  const { camera } = useThree();
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());
  const localPlayer = useRef({
    active: false,
    segments: [] as { x: number; y: number }[],
    score: NEON_SNAKE_INITIAL_LENGTH,
    currentAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
  });

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "a" || event.key === "A" || event.key === "ArrowLeft") {
        event.preventDefault();
        setNeonSnakeControl("left", true);
      }
      if (event.key === "d" || event.key === "D" || event.key === "ArrowRight") {
        event.preventDefault();
        setNeonSnakeControl("right", true);
      }
      if (event.key === " " || event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
        event.preventDefault();
        setNeonSnakeControl("boost", true);
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key === "a" || event.key === "A" || event.key === "ArrowLeft") {
        setNeonSnakeControl("left", false);
      }
      if (event.key === "d" || event.key === "D" || event.key === "ArrowRight") {
        setNeonSnakeControl("right", false);
      }
      if (event.key === " " || event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
        setNeonSnakeControl("boost", false);
      }
    };
    const reset = () => {
      neonSnakeControls.current = { left: false, right: false, boost: false };
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, []);

  useFrame((_frame, delta) => {
    const latestState = globalNeonSnakeState.current;
    if (!latestState || !playerId) return;
    const serverPlayer = latestState.players[playerId];

    if (!serverPlayer || serverPlayer.state !== "alive") {
      localPlayer.current.active = false;
      return;
    }
    if (!localPlayer.current.active && serverPlayer.segments.length > 0) {
      localPlayer.current.active = true;
      localPlayer.current.segments = serverPlayer.segments.map((segment) => ({ ...segment }));
      localPlayer.current.score = serverPlayer.score;
      localPlayer.current.currentAngle = serverPlayer.currentAngle;
    }
    if (!localPlayer.current.active) return;

    if (neonSnakeControls.current.left) {
      localPlayer.current.currentAngle += NEON_SNAKE_TURN_SPEED * delta;
    }
    if (neonSnakeControls.current.right) {
      localPlayer.current.currentAngle -= NEON_SNAKE_TURN_SPEED * delta;
    }

    localPlayer.current.isBoosting =
      neonSnakeControls.current.boost &&
      localPlayer.current.score > NEON_SNAKE_INITIAL_LENGTH;
    const speed = localPlayer.current.isBoosting
      ? NEON_SNAKE_BOOST_SPEED
      : NEON_SNAKE_BASE_SPEED;
    const head = { ...localPlayer.current.segments[0] };
    head.x += Math.cos(localPlayer.current.currentAngle) * speed * delta;
    head.y += Math.sin(localPlayer.current.currentAngle) * speed * delta;

    const boundary = NEON_SNAKE_WORLD_SIZE / 2;
    head.x = Math.max(-boundary, Math.min(boundary, head.x));
    head.y = Math.max(-boundary, Math.min(boundary, head.y));
    localPlayer.current.segments.unshift(head);

    if (localPlayer.current.isBoosting) {
      localPlayer.current.score = Math.max(
        NEON_SNAKE_INITIAL_LENGTH,
        localPlayer.current.score - 2 * delta,
      );
    }
    while (localPlayer.current.segments.length > Math.floor(localPlayer.current.score)) {
      localPlayer.current.segments.pop();
    }

    for (const [orbId, orb] of Object.entries(latestState.orbs)) {
      if (locallyCollectedOrbs.has(orbId)) continue;
      const dx = head.x - orb.x;
      const dy = head.y - orb.y;
      if (dx * dx + dy * dy < 4) {
        localPlayer.current.score += orb.value;
        locallyCollectedOrbs.add(orbId);
        delete latestState.orbs[orbId];
        sendCollectOrb(orbId);
      }
    }
    if (Math.random() < 0.05) {
      for (const orbId of locallyCollectedOrbs) {
        if (!latestState.orbs[orbId]) locallyCollectedOrbs.delete(orbId);
      }
    }

    let collided = false;
    for (const [otherId, other] of Object.entries(latestState.players)) {
      if (otherId === playerId || other.state !== "alive") continue;
      if (
        other.segments.some((segment) => {
          const dx = head.x - segment.x;
          const dy = head.y - segment.y;
          return dx * dx + dy * dy < 2.25;
        })
      ) {
        collided = true;
        break;
      }
    }
    if (collided) {
      localPlayer.current.active = false;
      sendPlayerState({
        ...localPlayer.current,
        state: "dead",
      });
      return;
    }

    latestState.players[playerId] = {
      ...serverPlayer,
      segments: localPlayer.current.segments,
      score: localPlayer.current.score,
      currentAngle: localPlayer.current.currentAngle,
      isBoosting: localPlayer.current.isBoosting,
    };

    const now = Date.now();
    if (now - localPlayer.current.lastSendTime > 50) {
      sendPlayerState({
        segments: localPlayer.current.segments,
        score: localPlayer.current.score,
        currentAngle: localPlayer.current.currentAngle,
        isBoosting: localPlayer.current.isBoosting,
        state: "alive",
      });
      localPlayer.current.lastSendTime = now;
    }

    const targetZ = Math.min(45, Math.max(20, 20 + localPlayer.current.score * 0.2));
    camera.position.x += (head.x - camera.position.x) * 10 * delta;
    camera.position.y += (head.y - camera.position.y) * 10 * delta;
    camera.position.z += (targetZ - camera.position.z) * 4 * delta;
    camera.lookAt(camera.position.x, camera.position.y, 0);

    if (lightRef.current) {
      lightRef.current.position.set(camera.position.x + 10, camera.position.y - 10, 30);
      lightTarget.position.set(camera.position.x, camera.position.y, 0);
    }
  });

  if (!gameState) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-bias={-0.001}
      />
      <primitive object={lightTarget} />
      <mesh receiveShadow position={[0, 0, -0.2]}>
        <planeGeometry args={[NEON_SNAKE_WORLD_SIZE, NEON_SNAKE_WORLD_SIZE]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <Grid
        position={[0, 0, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[NEON_SNAKE_WORLD_SIZE, NEON_SNAKE_WORLD_SIZE]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e3a8a"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#3b82f6"
        fadeDistance={100}
        fadeStrength={1}
      />
      <Orbs />
      {Object.values(gameState.players).map((player) =>
        player.state === "alive" && player.segments.length > 0 ? (
          <Snake
            key={player.id}
            playerId={player.id}
            color={player.color}
            isLocal={player.id === playerId}
          />
        ) : null,
      )}
    </>
  );
}
