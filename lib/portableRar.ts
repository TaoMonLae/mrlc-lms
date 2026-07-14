import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { createExtractorFromFile, type FileHeader } from 'node-unrar-js';

export interface PortableRarLimits {
  imageExtensions: ReadonlySet<string>;
  maxPages: number;
  maxPageBytes: number;
  maxExpandedBytes: number;
}

// node-unrar-js uses one WebAssembly module and swaps its active extractor.
// Serialize access so simultaneous reader requests cannot attach the module to
// the wrong archive while an extraction is in progress.
let rarQueue: Promise<void> = Promise.resolve();

async function withRarLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = rarQueue;
  let release!: () => void;
  rarQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

function readableError(error: unknown): string {
  const message = String((error as Error)?.message || error || 'invalid RAR data');
  if (/password/i.test(message)) return 'Password-protected CBR archives are not supported';
  return message.replace(/^UnrarError:\s*/i, '');
}

export async function listRarImageEntries(filePath: string, limits: PortableRarLimits): Promise<string[]> {
  return withRarLock(async () => {
    try {
      const extractor = await createExtractorFromFile({ filepath: filePath });
      const listing = extractor.getFileList();
      if (listing.arcHeader.flags.headerEncrypted) {
        throw new Error('Password-protected CBR archives are not supported');
      }
      if (listing.arcHeader.flags.volume) {
        throw new Error('Multi-volume CBR archives are not supported');
      }

      // The iterator must be exhausted so the library releases the native
      // archive object retained by its WebAssembly bridge.
      const headers = [...listing.fileHeaders] as FileHeader[];
      const expandedBytes = headers.reduce((total, header) => total + Math.max(0, Number(header.unpSize) || 0), 0);
      if (expandedBytes > limits.maxExpandedBytes) {
        throw new Error(`CBR expands beyond the ${Math.round(limits.maxExpandedBytes / (1024 * 1024))} MB safety limit`);
      }

      const imageHeaders = headers.filter((header) =>
        !header.flags.directory && limits.imageExtensions.has(path.extname(header.name).toLowerCase()));
      if (imageHeaders.some((header) => header.flags.encrypted)) {
        throw new Error('Password-protected CBR pages are not supported');
      }
      if (imageHeaders.length === 0) throw new Error('Comic archive contains no supported image pages');
      if (imageHeaders.length > limits.maxPages) {
        throw new Error(`Comic archive has too many pages (maximum ${limits.maxPages})`);
      }
      const oversizedPage = imageHeaders.find((header) => Number(header.unpSize) > limits.maxPageBytes);
      if (oversizedPage) {
        throw new Error(`Comic page exceeds the ${Math.round(limits.maxPageBytes / (1024 * 1024))} MB safety limit`);
      }
      return imageHeaders.map((header) => header.name);
    } catch (error) {
      throw new Error(readableError(error));
    }
  });
}

export async function extractRarEntry(filePath: string, entryName: string, maxBytes: number): Promise<Buffer> {
  return withRarLock(async () => {
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mrlc-cbr-'));
    const outputName = `${crypto.randomUUID()}.page`;
    const outputPath = path.join(temporaryDirectory, outputName);
    try {
      const extractor = await createExtractorFromFile({
        filepath: filePath,
        targetPath: temporaryDirectory,
        // Never trust an archive entry as a filesystem destination.
        filenameTransform: () => outputName,
      });
      const result = extractor.extract({ files: [entryName] });
      const files = [...result.files];
      if (!files.some((file) => file.fileHeader.name === entryName) || !fs.existsSync(outputPath)) {
        throw new Error('Comic page is missing from the archive');
      }
      const stat = await fs.promises.stat(outputPath);
      if (stat.size > maxBytes) {
        throw new Error(`Comic page exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB safety limit`);
      }
      return await fs.promises.readFile(outputPath);
    } catch (error) {
      throw new Error(readableError(error));
    } finally {
      await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
}
