import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { optimizeIcons } from '../../scripts/build-production.mjs';

test('production icon optimization bounds resolution, preserves transparency and leaves other assets intact', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lms-icons-'));
  try {
    const original = await sharp({ create: { width: 2048, height: 1024, channels: 4, background: { r: 80, g: 130, b: 90, alpha: 0.5 } } }).png().toBuffer();
    await writeFile(path.join(dir, 'icon@8x.png'), original);
    await writeFile(path.join(dir, 'original.svg'), '<svg></svg>');
    const result = await optimizeIcons(dir);
    const resized = await sharp(path.join(dir, 'icon@8x.png')).metadata();
    assert.equal(resized.width, 1024);
    assert.equal(resized.height, 512);
    assert.equal(resized.hasAlpha, true);
    assert.ok(result.after < result.before);
    assert.equal(await readFile(path.join(dir, 'original.svg'), 'utf8'), '<svg></svg>');
    assert.equal((await sharp(original).metadata()).width, 2048);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('production optimization supports checkouts without optional local icons', async () => {
  assert.deepEqual(await optimizeIcons(path.join(tmpdir(), 'missing-lms-icons-folder')), { count: 0, before: 0, after: 0 });
});
