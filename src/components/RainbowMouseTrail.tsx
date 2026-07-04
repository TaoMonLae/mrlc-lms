import { useEffect } from "react";

// Playful, purely decorative cursor trail — colorful rotating-hue blobs that
// spawn on mouse movement and fade out on their own.
// Ported from https://gist.github.com/CodeMyUI/1ca6949ffb3f04b0852904c195e31594
// (DOM-element approach) into a self-contained React component: injects its
// own <style> once, listens for mousemove while mounted, and cleans up after
// itself (style tag stays, since it's shared/idempotent; trail nodes and the
// listener are removed on unmount).
const STYLE_ID = "rainbow-mouse-trail-styles";
const MAX_TRAIL_NODES = 40;
const SPAWN_THROTTLE_MS = 30;
const NODE_LIFETIME_MS = 700;

function ensureStylesInjected() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .rainbow-trail-node {
      position: fixed;
      width: 46px;
      height: 46px;
      z-index: 9999;
      pointer-events: none;
      transform: scale(0);
      opacity: 0;
      animation: rainbow-trail-pop 0.6s linear forwards;
    }
    .rainbow-trail-node__blob {
      width: 100%;
      height: 100%;
      border-radius: 10px;
      background: linear-gradient(50deg, #ff0c0c, #21d400, #2380ff, #db0768);
      filter: hue-rotate(0deg);
      animation: rainbow-trail-hue 2.5s linear infinite;
    }
    @keyframes rainbow-trail-hue {
      50% { filter: hue-rotate(1000deg); }
      100% { filter: hue-rotate(2000deg); transform: rotate(360deg); }
    }
    @keyframes rainbow-trail-pop {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(0.5); opacity: 0.9; }
      100% { transform: scale(0.25); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .rainbow-trail-node { display: none; }
    }
  `;
  document.head.appendChild(style);
}

export default function RainbowMouseTrail() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    ensureStylesInjected();

    let lastSpawn = 0;

    function handleMouseMove(e: MouseEvent) {
      const now = performance.now();
      if (now - lastSpawn < SPAWN_THROTTLE_MS) return;
      lastSpawn = now;

      const node = document.createElement("div");
      node.className = "rainbow-trail-node";
      node.style.left = `${e.clientX - 23}px`;
      node.style.top = `${e.clientY - 23}px`;
      const blob = document.createElement("div");
      blob.className = "rainbow-trail-node__blob";
      node.appendChild(blob);
      document.body.appendChild(node);

      const nodes = document.getElementsByClassName("rainbow-trail-node");
      if (nodes.length > MAX_TRAIL_NODES) nodes[0].remove();

      window.setTimeout(() => node.remove(), NODE_LIFETIME_MS);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.querySelectorAll(".rainbow-trail-node").forEach((el) => el.remove());
    };
  }, []);

  return null;
}
