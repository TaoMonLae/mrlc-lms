/** Basic image-quality check, not an assertion of who wrote the signature. */
export function hasVisibleSignatureStrokes(data: Uint8ClampedArray, width: number, height: number): boolean {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0
    || data.length !== width * height * 4) return false;
  let count = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let index = 0; index < data.length; index += 4) {
    const contrast = (255 - Math.min(data[index], data[index + 1], data[index + 2])) * data[index + 3] / 255;
    if (contrast <= 20) continue;
    count += 1;
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return count >= 80 && count < width * height * 0.98
    && right - left >= 24 && bottom - top >= 8;
}
