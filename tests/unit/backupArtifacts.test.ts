import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  backupKindFromName,
  copyArtifactOffsite,
  createZipArtifact,
  isSafeBackupName,
  listBackupArtifacts,
  pruneBackupArtifacts,
  verifyZipStructure,
} from '../../lib/backupArtifacts';

test('backup names are classified and path traversal is rejected', () => {
  assert.equal(backupKindFromName('mrlc-2026.dump'), 'database');
  assert.equal(backupKindFromName('manual-2025.dump'), 'database');
  assert.equal(backupKindFromName('mrlc-files-2026.zip'), 'files');
  assert.equal(backupKindFromName('mrlc-data-2026.json'), 'json');
  assert.equal(backupKindFromName('mrlc-data-csv-2026.zip'), 'csv');
  assert.equal(isSafeBackupName('../mrlc-2026.dump'), false);
  assert.equal(isSafeBackupName('unrelated.zip'), false);
});

test('ZIP artifacts are created, indexed, verified, and copied off-site', async (t) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mrlc-backup-test-'));
  t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
  const local = path.join(root, 'local');
  const offsite = path.join(root, 'offsite');
  const output = path.join(local, 'mrlc-files-2026.zip');
  await createZipArtifact(output, [{ archivePath: 'manifest.json', content: '{"ok":true}' }]);
  assert.deepEqual(await verifyZipStructure(output), { valid: true, detail: 'ZIP central directory is present' });
  assert.equal(await copyArtifactOffsite(output, offsite), true);
  const artifacts = listBackupArtifacts(local, offsite);
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].kind, 'files');
  assert.equal(artifacts[0].offsite, true);
});

test('retention is applied independently to each backup kind', async (t) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mrlc-prune-test-'));
  t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
  await fs.promises.mkdir(root, { recursive: true });
  for (const name of ['mrlc-a.dump', 'mrlc-b.dump', 'mrlc-data-a.json', 'mrlc-data-b.json']) {
    await fs.promises.writeFile(path.join(root, name), name);
  }
  const old = new Date('2025-01-01T00:00:00Z');
  await fs.promises.utimes(path.join(root, 'mrlc-a.dump'), old, old);
  await fs.promises.utimes(path.join(root, 'mrlc-data-a.json'), old, old);
  await pruneBackupArtifacts(root, 1);
  assert.deepEqual(listBackupArtifacts(root).map((item) => item.name).sort(), ['mrlc-b.dump', 'mrlc-data-b.json']);
});
