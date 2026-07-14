import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkWritableDirectory, probeCommand, summarizeHealth } from '../../lib/systemHealth';

test('health summary prioritizes errors and warnings', () => {
  assert.equal(summarizeHealth([{ id: 'a', label: 'A', status: 'ok', detail: '', required: true }]), 'ok');
  assert.equal(summarizeHealth([{ id: 'a', label: 'A', status: 'warning', detail: '', required: false }]), 'warning');
  assert.equal(summarizeHealth([
    { id: 'a', label: 'A', status: 'warning', detail: '', required: false },
    { id: 'b', label: 'B', status: 'error', detail: '', required: true },
  ]), 'error');
});

test('writable directory check performs a real write probe', async (t) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mrlc-health-test-'));
  t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
  const result = await checkWritableDirectory('storage', 'Storage', path.join(root, 'nested'));
  assert.equal(result.status, 'ok');
});

test('command probe records an available executable', async () => {
  const result = await probeCommand('node', 'Node.js', process.execPath, ['--version'], true);
  assert.equal(result.status, 'ok');
  assert.match(result.detail, /^v\d+/);
});
