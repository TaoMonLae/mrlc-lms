import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractRarEntry, listRarImageEntries } from '../../lib/portableRar';

// MIT-licensed 288-byte WithComment.rar fixture from node-unrar-js:
// https://github.com/YuJianrong/node-unrar.js/blob/master/testFiles/WithComment.rar
const RAR_FIXTURE = 'UmFyIRoHAM+QcwAADQAAAAAAAABE/XoAgCMAgAAAAHoAAAACz49u6RBWg0odMwMAAQAAAENNVAmRgUj+DP8lkhMHmASQ/weSuB6qBLpR5hAVgRbmhpQWpwFwlqcBRG9wBoQb3AUVFEaPLh/UcHHZN9gfx3H2G+QkNBsch2H4MKM+zftKitd/U8v3gxvoX2/UcRvxeGKIAjgjoh5Na88O461qTz+RPsmM0mwzF0ymRT9FY9y5doe1zHl0IJAuAAAAAAAAAAAAAgAAAAA1VYNKHTAJACAAAAAxRmlsZS50eHQAsCZjiozxdCCSNAAAAAAAAAAAAAIAAAAAOlWDSh0wDwAgAAAAMj8/LnR4dABOGzIth2UCALAgORXEPXsAQAcA';

test('portable RAR fallback lists and extracts entries without bsdtar', async (t) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mrlc-rar-test-'));
  t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
  const archivePath = path.join(root, 'fixture.cbr');
  await fs.promises.writeFile(archivePath, Buffer.from(RAR_FIXTURE, 'base64'));
  const limits = {
    imageExtensions: new Set(['.txt']),
    maxPages: 10,
    maxPageBytes: 1024,
    maxExpandedBytes: 10 * 1024,
  };
  const entries = await listRarImageEntries(archivePath, limits);
  assert.deepEqual(entries, ['1File.txt', '2中文.txt']);
  assert.ok(Buffer.isBuffer(await extractRarEntry(archivePath, entries[0], 1024)));
});

test('portable RAR fallback enforces the page-count safety limit', async (t) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mrlc-rar-limit-test-'));
  t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
  const archivePath = path.join(root, 'fixture.cbr');
  await fs.promises.writeFile(archivePath, Buffer.from(RAR_FIXTURE, 'base64'));
  await assert.rejects(() => listRarImageEntries(archivePath, {
    imageExtensions: new Set(['.txt']),
    maxPages: 1,
    maxPageBytes: 1024,
    maxExpandedBytes: 10 * 1024,
  }), /too many pages/);
});
