import assert from 'node:assert/strict';
import test from 'node:test';
import { hasVisibleSignatureStrokes } from '../../src/pages/documents/signaturePixels';

const width = 120;
const height = 40;
const blank = () => new Uint8ClampedArray(width * height * 4);
const mark = (pixels: Uint8ClampedArray, x: number, y: number, rgba = [16, 43, 59, 255]) => {
  pixels.set(rgba, (y * width + x) * 4);
};
const stroke = (rgba?: number[]) => {
  const pixels = blank();
  for (let x = 20; x < 100; x++) {
    const y = 12 + Math.round(Math.sin(x / 8) * 7);
    for (let offset = 0; offset < 3; offset++) mark(pixels, x, y + offset, rgba);
  }
  return pixels;
};

test('signature capture rejects transparent and white blank images', () => {
  assert.equal(hasVisibleSignatureStrokes(blank(), width, height), false);
  assert.equal(hasVisibleSignatureStrokes(new Uint8ClampedArray(width * height * 4).fill(255), width, height), false);
});

test('signature capture accepts visible handwritten strokes on transparent and white backgrounds', () => {
  const pixels = stroke();
  assert.equal(hasVisibleSignatureStrokes(pixels, width, height), true);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) pixels.set([255, 255, 255, 255], i);
  }
  assert.equal(hasVisibleSignatureStrokes(pixels, width, height), true);
});

test('signature capture measures visible alpha-adjusted contrast', () => {
  assert.equal(hasVisibleSignatureStrokes(stroke([0, 0, 0, 0]), width, height), false);
  assert.equal(hasVisibleSignatureStrokes(stroke([0, 0, 0, 10]), width, height), false);
  assert.equal(hasVisibleSignatureStrokes(stroke([250, 250, 250, 255]), width, height), false);
  assert.equal(hasVisibleSignatureStrokes(stroke([0, 0, 120, 220]), width, height), true);
});

test('signature capture rejects a tap, a small dot and a solid image', () => {
  const pixels = blank();
  mark(pixels, 60, 20);
  assert.equal(hasVisibleSignatureStrokes(pixels, width, height), false);
  for (let x = 55; x < 65; x++) for (let y = 15; y < 25; y++) mark(pixels, x, y);
  assert.equal(hasVisibleSignatureStrokes(pixels, width, height), false);
  for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) mark(pixels, x, y);
  assert.equal(hasVisibleSignatureStrokes(pixels, width, height), false);
});

test('signature capture rejects incomplete pixel buffers and invalid dimensions', () => {
  assert.equal(hasVisibleSignatureStrokes(stroke(), width - 1, height), false);
  assert.equal(hasVisibleSignatureStrokes(blank(), 0, height), false);
  assert.equal(hasVisibleSignatureStrokes(blank(), width, 40.5), false);
});
