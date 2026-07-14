import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';

export type BackupKind = 'database' | 'files' | 'json' | 'csv';

export interface BackupArtifact {
  name: string;
  size: number;
  createdAt: string;
  kind: BackupKind;
  offsite: boolean;
}

export interface ZipSource {
  sourcePath?: string;
  archivePath: string;
  content?: string | Buffer;
}

export function backupKindFromName(name: string): BackupKind | null {
  // Keep custom/manual pg_dump archives created by earlier releases visible.
  if (/\.dump$/i.test(name)) return 'database';
  if (/^mrlc-files-.*\.zip$/i.test(name)) return 'files';
  if (/^mrlc-data-.*\.json$/i.test(name)) return 'json';
  if (/^mrlc-data-csv-.*\.zip$/i.test(name)) return 'csv';
  return null;
}

export function isSafeBackupName(name: string): boolean {
  return Boolean(name && path.basename(name) === name && !name.includes('..') && backupKindFromName(name));
}

export function listBackupArtifacts(backupDir: string, offsiteDir?: string | null): BackupArtifact[] {
  try {
    if (!fs.existsSync(backupDir)) return [];
    return fs.readdirSync(backupDir)
      .map((name) => ({ name, kind: backupKindFromName(name) }))
      .filter((item): item is { name: string; kind: BackupKind } => Boolean(item.kind))
      .map(({ name, kind }) => {
        const stat = fs.statSync(path.join(backupDir, name));
        return {
          name,
          kind,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
          offsite: Boolean(offsiteDir && fs.existsSync(path.join(offsiteDir, name))),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function pruneBackupArtifacts(backupDir: string, retention: number, offsiteDir?: string | null) {
  const artifacts = listBackupArtifacts(backupDir, offsiteDir);
  for (const kind of ['database', 'files', 'json', 'csv'] as const) {
    for (const artifact of artifacts.filter((item) => item.kind === kind).slice(retention)) {
      await fs.promises.unlink(path.join(backupDir, artifact.name)).catch(() => {});
      if (offsiteDir) await fs.promises.unlink(path.join(offsiteDir, artifact.name)).catch(() => {});
    }
  }
}

export async function copyArtifactOffsite(filePath: string, offsiteDir?: string | null): Promise<boolean> {
  if (!offsiteDir) return false;
  await fs.promises.mkdir(offsiteDir, { recursive: true });
  const target = path.join(offsiteDir, path.basename(filePath));
  const temporary = `${target}.copying`;
  await fs.promises.copyFile(filePath, temporary);
  await fs.promises.rename(temporary, target);
  return true;
}

export function createZipArtifact(outputPath: string, sources: ZipSource[]): Promise<number> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const output = fs.createWriteStream(outputPath, { flags: 'wx' });
    const archive = new ZipArchive({ zlib: { level: 9 } });
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      output.destroy();
      fs.promises.unlink(outputPath).catch(() => {});
      reject(error);
    };
    output.on('close', () => {
      if (settled) return;
      settled = true;
      resolve(archive.pointer());
    });
    output.on('error', fail);
    archive.on('warning', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') fail(error);
    });
    archive.on('error', fail);
    archive.pipe(output);
    for (const source of sources) {
      if (source.sourcePath) {
        const stat = fs.statSync(source.sourcePath);
        if (stat.isDirectory()) archive.directory(source.sourcePath, source.archivePath);
        else archive.file(source.sourcePath, { name: source.archivePath });
      } else if (source.content !== undefined) {
        archive.append(source.content, { name: source.archivePath });
      }
    }
    void archive.finalize();
  });
}

// ZIP end-of-central-directory validation catches truncated/partial archives
// without loading a potentially multi-gigabyte upload backup into memory.
export async function verifyZipStructure(filePath: string): Promise<{ valid: boolean; detail: string }> {
  const stat = await fs.promises.stat(filePath);
  if (stat.size < 22) return { valid: false, detail: 'ZIP file is too small' };
  const tailSize = Math.min(stat.size, 65_557);
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const tail = Buffer.alloc(tailSize);
    await handle.read(tail, 0, tailSize, stat.size - tailSize);
    for (let index = tail.length - 22; index >= 0; index -= 1) {
      if (tail.readUInt32LE(index) === 0x06054b50) {
        return { valid: true, detail: 'ZIP central directory is present' };
      }
    }
    return { valid: false, detail: 'ZIP central directory is missing or truncated' };
  } finally {
    await handle.close();
  }
}
