export type SquareCrop = { x: number; y: number; size: number };

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/** Calculate a square source crop from zoom and -100…100 framing controls. */
export function calculateSquareCrop(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  positionX: number,
  positionY: number,
): SquareCrop {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  const safeZoom = clamp(zoom, 1, 3);
  const size = Math.min(safeWidth, safeHeight) / safeZoom;
  const x = (safeWidth - size) * ((clamp(positionX, -100, 100) + 100) / 200);
  const y = (safeHeight - size) * ((clamp(positionY, -100, 100) + 100) / 200);
  return { x, y, size };
}
