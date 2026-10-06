import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Icon-only buttons need an accessible name (aria-label, aria-labelledby or sr-only text).
// scripts/codemods/icon-button-labels.mjs --write can add most labels automatically.
test('every icon-only button has an accessible name', () => {
  const result = spawnSync(process.execPath, ['scripts/codemods/icon-button-labels.mjs', '--check', 'src', 'components'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `Unlabelled icon buttons:\n${result.stdout}${result.stderr}`);
});
