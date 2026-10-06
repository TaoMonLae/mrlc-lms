// Extracted from server.ts. Route order is preserved: registerElibraryRoutes is called where these routes used to be registered.
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { type UserRole, roleHasPermission } from "./shared/permissions";
import JSZip from "jszip";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";
import { listRarImageEntries, extractRarEntry } from "./lib/portableRar";
import sharp from "sharp";
import { ZipArchive } from "archiver";
import express from "express";
import multer from "multer";
import { cleanEbookTitle, findDuplicateEbookTitle, findDuplicateEbookSeriesVolume, normalizedTitleForColumn } from "./lib/ebookTitles";
import crypto from "crypto";
import type { JwtPayload, COMIC_COMPRESSION_THRESHOLD_BYTES, EBOOK_CHUNK_DIR, EBOOK_COMPRESSION_THRESHOLD_BYTES, EBOOK_COVER_DIR, EBOOK_DIR, MAX_EBOOK_UPLOAD_BYTES, MAX_STANDARD_EBOOK_UPLOAD_BYTES, MAX_STORED_COMIC_BYTES, authMiddleware, createAuditLog, ebookChunkUpload, ebookCoverUpload, ebookUpload, logger, parseBoolean, schemas, validate } from "./server";

export type ElibraryRoutesContext = {
  COMIC_COMPRESSION_THRESHOLD_BYTES: typeof COMIC_COMPRESSION_THRESHOLD_BYTES;
  EBOOK_CHUNK_DIR: typeof EBOOK_CHUNK_DIR;
  EBOOK_COMPRESSION_THRESHOLD_BYTES: typeof EBOOK_COMPRESSION_THRESHOLD_BYTES;
  EBOOK_COVER_DIR: typeof EBOOK_COVER_DIR;
  EBOOK_DIR: typeof EBOOK_DIR;
  MAX_EBOOK_UPLOAD_BYTES: typeof MAX_EBOOK_UPLOAD_BYTES;
  MAX_STANDARD_EBOOK_UPLOAD_BYTES: typeof MAX_STANDARD_EBOOK_UPLOAD_BYTES;
  MAX_STORED_COMIC_BYTES: typeof MAX_STORED_COMIC_BYTES;
  authMiddleware: typeof authMiddleware;
  createAuditLog: typeof createAuditLog;
  ebookChunkUpload: typeof ebookChunkUpload;
  ebookCoverUpload: typeof ebookCoverUpload;
  ebookUpload: typeof ebookUpload;
  getTeacherClassIds: (userId: string) => Promise<string[]>;
  logger: typeof logger;
  parseBoolean: typeof parseBoolean;
  prisma: PrismaClient;
  schemas: typeof schemas;
  validUploadId: (value: string) => boolean;
  validate: typeof validate;
};

export function registerElibraryRoutes(app: Express, ctx: ElibraryRoutesContext) {
  const { COMIC_COMPRESSION_THRESHOLD_BYTES, EBOOK_CHUNK_DIR, EBOOK_COMPRESSION_THRESHOLD_BYTES, EBOOK_COVER_DIR, EBOOK_DIR, MAX_EBOOK_UPLOAD_BYTES, MAX_STANDARD_EBOOK_UPLOAD_BYTES, MAX_STORED_COMIC_BYTES, authMiddleware, createAuditLog, ebookChunkUpload, ebookCoverUpload, ebookUpload, getTeacherClassIds, logger, parseBoolean, prisma, schemas, validUploadId, validate } = ctx;

  // ── E-Library (EPUB/PDF/CBR/CBZ) API ────────────────────────────────────────
  const canManageEbooks = (role: UserRole) => roleHasPermission(role, "manage_ebooks");

  const COMIC_FORMATS = new Set(["CBR", "CBZ"]);
  const COMIC_IMAGE_EXTENSIONS = new Set([
    ".jpg", ".jpeg", ".jpe", ".jfif", ".png", ".webp", ".gif", ".avif",
    ".bmp", ".tif", ".tiff",
  ]);
  const MAX_COMIC_PAGES = 2000;
  const MAX_COMIC_PAGE_BYTES = 25 * 1024 * 1024;
  const comicManifestCache = new Map<string, { mtimeMs: number; pages: string[] }>();
  const MAX_CACHED_CBZ_BYTES = 120 * 1024 * 1024;
  const cbzArchiveCache = new Map<string, { mtimeMs: number; size: number; archive: JSZip }>();
  let cachedCbzBytes = 0;
  let comicArchiveCommandAvailable: boolean | null = null;

  const ebookFormatFromName = (name: string) => {
    const ext = path.extname(name).toLowerCase();
    if (ext === ".epub") return "EPUB";
    if (ext === ".cbr") return "CBR";
    if (ext === ".cbz") return "CBZ";
    return "PDF";
  };

  // Prefer native libarchive when installed; portable WebAssembly RAR and
  // JavaScript ZIP readers below keep CBR/CBZ available on minimal hosts.
  // Arguments are passed directly to spawn (no shell), so archive filenames
  // cannot become commands.
  const runComicArchiveCommand = (args: string[], maxBytes: number): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      if (comicArchiveCommandAvailable === false) {
        reject(new Error("Comic archive support is unavailable: bsdtar was not found on the server"));
        return;
      }
      const child = spawn("bsdtar", args, { stdio: ["ignore", "pipe", "pipe"] });
      const chunks: Buffer[] = [];
      let total = 0;
      let stderr = "";
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        child.kill();
        reject(error);
      };
      child.stdout.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > maxBytes) {
          fail(new Error(`Archive output exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)} MB safety limit`));
          return;
        }
        chunks.push(chunk);
      });
      child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-2000); });
      child.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") comicArchiveCommandAvailable = false;
        fail(new Error(`Comic archive support is unavailable: ${error.message}`));
      });
      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        if (code === 0) {
          comicArchiveCommandAvailable = true;
          resolve(Buffer.concat(chunks));
        }
        else reject(new Error(`Could not read comic archive${stderr ? `: ${stderr.trim().slice(-400)}` : ""}`));
      });
    });

  const clearComicArchiveCache = (filePath: string) => {
    comicManifestCache.delete(filePath);
    const cached = cbzArchiveCache.get(filePath);
    if (cached) {
      cachedCbzBytes -= cached.size;
      cbzArchiveCache.delete(filePath);
    }
  };

  // Portable CBZ fallback for hosts that do not install the Docker runtime
  // packages. Cache at most roughly one maximum-size archive so page requests
  // do not reread the whole ZIP, while keeping server memory bounded.
  const loadCbzWithJsZip = async (filePath: string) => {
    const stat = await fs.promises.stat(filePath);
    const cached = cbzArchiveCache.get(filePath);
    if (cached?.mtimeMs === stat.mtimeMs) {
      cbzArchiveCache.delete(filePath);
      cbzArchiveCache.set(filePath, cached);
      return cached.archive;
    }
    if (cached) {
      cachedCbzBytes -= cached.size;
      cbzArchiveCache.delete(filePath);
    }

    const archive = await JSZip.loadAsync(await fs.promises.readFile(filePath));
    const entries = Object.values(archive.files);
    const expandedBytes = entries.reduce((total, entry) =>
      total + Number((entry as any)?._data?.uncompressedSize || 0), 0);
    if (expandedBytes > 500 * 1024 * 1024) throw new Error("CBZ expands beyond the 500 MB safety limit");

    while (cachedCbzBytes + stat.size > MAX_CACHED_CBZ_BYTES && cbzArchiveCache.size > 0) {
      const oldestPath = cbzArchiveCache.keys().next().value as string | undefined;
      if (!oldestPath) break;
      const oldest = cbzArchiveCache.get(oldestPath);
      if (oldest) cachedCbzBytes -= oldest.size;
      cbzArchiveCache.delete(oldestPath);
    }
    cbzArchiveCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, archive });
    cachedCbzBytes += stat.size;
    return archive;
  };

  const getComicPages = async (filePath: string): Promise<string[]> => {
    const stat = await fs.promises.stat(filePath);
    const cached = comicManifestCache.get(filePath);
    if (cached?.mtimeMs === stat.mtimeMs) return cached.pages;
    let pages: string[];
    try {
      const listing = (await runComicArchiveCommand(["-tf", filePath], 2 * 1024 * 1024)).toString("utf8");
      pages = listing
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter((entry) => entry && !entry.endsWith("/") && COMIC_IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase()));
    } catch (archiveError) {
      const extension = path.extname(filePath).toLowerCase();
      if (extension === ".cbr") {
        try {
          pages = await listRarImageEntries(filePath, {
            imageExtensions: COMIC_IMAGE_EXTENSIONS,
            maxPages: MAX_COMIC_PAGES,
            maxPageBytes: MAX_COMIC_PAGE_BYTES,
            maxExpandedBytes: 500 * 1024 * 1024,
          });
        } catch (fallbackError: any) {
          throw new Error(`Could not read CBR archive: ${fallbackError?.message || "invalid RAR data"}`);
        }
      } else if (extension === ".cbz") {
        try {
          const archive = await loadCbzWithJsZip(filePath);
          pages = Object.values(archive.files)
            .filter((entry) => !entry.dir && COMIC_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
            .map((entry) => entry.name);
        } catch (fallbackError: any) {
          throw new Error(`Could not read CBZ archive: ${fallbackError?.message || "invalid ZIP data"}`);
        }
      } else {
        throw archiveError;
      }
    }
    pages.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    if (pages.length === 0) throw new Error("Comic archive contains no supported image pages");
    if (pages.length > MAX_COMIC_PAGES) throw new Error(`Comic archive has too many pages (maximum ${MAX_COMIC_PAGES})`);
    comicManifestCache.set(filePath, { mtimeMs: stat.mtimeMs, pages });
    return pages;
  };

  const extractComicPage = async (filePath: string, entry: string) => {
    let bytes: Buffer;
    try {
      bytes = await runComicArchiveCommand(["-xOf", filePath, "--", entry], MAX_COMIC_PAGE_BYTES);
    } catch (archiveError) {
      const extension = path.extname(filePath).toLowerCase();
      if (extension === ".cbr") {
        bytes = await extractRarEntry(filePath, entry, MAX_COMIC_PAGE_BYTES);
      } else if (extension === ".cbz") {
        const archive = await loadCbzWithJsZip(filePath);
        const page = archive.file(entry);
        if (!page) throw new Error("Comic page is missing from the archive");
        const declaredSize = Number((page as any)?._data?.uncompressedSize || 0);
        if (declaredSize > MAX_COMIC_PAGE_BYTES) throw new Error("Comic page exceeds the 25 MB safety limit");
        bytes = await page.async("nodebuffer");
        if (bytes.length > MAX_COMIC_PAGE_BYTES) throw new Error("Comic page exceeds the 25 MB safety limit");
      } else {
        throw archiveError;
      }
    }
    const metadata = await sharp(bytes, { limitInputPixels: 80_000_000 }).metadata();
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > 80_000_000) {
      throw new Error("Comic page dimensions exceed the safety limit");
    }
    return bytes;
  };

  const runEbookCompressor = (command: string, args: string[]): Promise<void> =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args);
      let stderr = "";
      child.stderr.on("data", (data) => { stderr = (stderr + data.toString()).slice(-4000); });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${command} exited ${code}: ${stderr.slice(-600)}`));
      });
    });

  const compressPdf = async (inputPath: string, outputPath: string) => {
    await runEbookCompressor("gs", [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.6",
      "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]);
  };

  const optimizeEpubImage = async (name: string, input: Buffer): Promise<Buffer> => {
    const ext = path.extname(name).toLowerCase();
    try {
      const image = sharp(input, { animated: false, limitInputPixels: 80_000_000 })
        .rotate()
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true });
      let optimized: Buffer;
      if (ext === ".jpg" || ext === ".jpeg") optimized = await image.jpeg({ quality: 74, mozjpeg: true }).toBuffer();
      else if (ext === ".png") optimized = await image.png({ compressionLevel: 9, palette: true, quality: 82 }).toBuffer();
      else if (ext === ".webp") optimized = await image.webp({ quality: 76 }).toBuffer();
      else return input;
      return optimized.length < input.length ? optimized : input;
    } catch {
      // A malformed or unsupported image should not make an otherwise valid
      // EPUB unusable; retain that entry and continue compressing the archive.
      return input;
    }
  };

  const compressEpub = async (inputPath: string, outputPath: string) => {
    const source = await fs.promises.readFile(inputPath);
    const inputZip = await JSZip.loadAsync(source, { checkCRC32: true });
    const entries = Object.values(inputZip.files);
    const expandedBytes = entries.reduce((total, entry) =>
      total + Number((entry as any)?._data?.uncompressedSize || 0), 0);
    if (expandedBytes > 500 * 1024 * 1024) {
      throw new Error("EPUB expands beyond the 500 MB safety limit");
    }

    const mimeEntry = inputZip.file("mimetype");
    if (!mimeEntry || (await mimeEntry.async("string")).trim() !== "application/epub+zip") {
      throw new Error("Invalid EPUB: missing application/epub+zip mimetype");
    }

    // EPUB requires `mimetype` to be the first entry and stored without ZIP
    // compression. Add it before rebuilding the remaining archive.
    const outputZip = new JSZip();
    outputZip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
    for (const entry of entries) {
      if (entry.name === "mimetype") continue;
      if (entry.dir) {
        outputZip.folder(entry.name);
        continue;
      }
      let content = await entry.async("nodebuffer");
      if (imageExtensions.has(path.extname(entry.name).toLowerCase())) {
        content = await optimizeEpubImage(entry.name, content);
      }
      outputZip.file(entry.name, content, { compression: "DEFLATE", compressionOptions: { level: 9 } });
    }
    const compressed = await outputZip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
      mimeType: "application/epub+zip",
    });
    await fs.promises.writeFile(outputPath, compressed, { flag: "wx" });
  };

  const optimizeComicImage = async (name: string, input: Buffer): Promise<Buffer> => {
    const ext = path.extname(name).toLowerCase();
    try {
      const image = sharp(input, { animated: false, limitInputPixels: 80_000_000 })
        .rotate()
        .resize({ width: 2400, height: 3600, fit: "inside", withoutEnlargement: true });
      let optimized: Buffer;
      if ([".jpg", ".jpeg", ".jpe", ".jfif"].includes(ext)) {
        optimized = await image.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      } else if (ext === ".png") {
        optimized = await image.png({ compressionLevel: 9, palette: true, quality: 86 }).toBuffer();
      } else if (ext === ".webp") {
        optimized = await image.webp({ quality: 80, effort: 5 }).toBuffer();
      } else if (ext === ".avif") {
        optimized = await image.avif({ quality: 58, effort: 5 }).toBuffer();
      } else {
        return input;
      }
      return optimized.length < input.length ? optimized : input;
    } catch {
      return input;
    }
  };

  const writeZipStream = (archive: JSZip, outputPath: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath, { flags: "wx" });
      const stream = archive.generateNodeStream({
        type: "nodebuffer",
        streamFiles: true,
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        output.destroy();
        reject(error);
      };
      output.on("error", fail);
      stream.on("error", fail);
      output.on("finish", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      stream.pipe(output);
    });

  const compressCbz = async (inputPath: string, outputPath: string) => {
    const source = await fs.promises.readFile(inputPath);
    const inputZip = await JSZip.loadAsync(source, { checkCRC32: true });
    const entries = Object.values(inputZip.files);
    const expandedBytes = entries.reduce((total, entry) =>
      total + Number((entry as any)?._data?.uncompressedSize || 0), 0);
    if (expandedBytes > 750 * 1024 * 1024) {
      throw new Error("CBZ expands beyond the 750 MB safety limit");
    }

    const outputZip = new JSZip();
    let imageCount = 0;
    for (const entry of entries) {
      if (entry.dir) {
        outputZip.folder(entry.name);
        continue;
      }
      let content = await entry.async("nodebuffer");
      if (COMIC_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        imageCount += 1;
        if (imageCount > MAX_COMIC_PAGES) throw new Error(`Comic archive has too many pages (maximum ${MAX_COMIC_PAGES})`);
        content = await optimizeComicImage(entry.name, content);
      }
      outputZip.file(entry.name, content, { compression: "DEFLATE", compressionOptions: { level: 9 } });
    }
    if (imageCount === 0) throw new Error("Comic archive contains no supported image pages");
    await writeZipStream(outputZip, outputPath);
  };

  const writeDirectoryAsCbz = (sourceDirectory: string, outputPath: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath, { flags: "wx" });
      const archive = new ZipArchive({ zlib: { level: 9 } });
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        output.destroy();
        archive.abort();
        reject(error);
      };
      output.on("error", fail);
      output.on("close", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      archive.on("error", fail);
      archive.pipe(output);
      archive.directory(sourceDirectory, false);
      void archive.finalize().catch(fail);
    });

  // RAR creation is not available in the portable runtime. Rebuild a CBR that
  // meets the compression threshold as an optimized CBZ, keeping page order while using
  // a temporary directory so hundreds of megabytes are not held in memory.
  const compressCbrToCbz = async (inputPath: string, outputPath: string) => {
    const pages = await getComicPages(inputPath);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(EBOOK_DIR, ".cbr-compress-"));
    let expandedBytes = 0;
    try {
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const input = await extractComicPage(inputPath, page);
        expandedBytes += input.length;
        if (expandedBytes > 750 * 1024 * 1024) {
          throw new Error("CBR expands beyond the 750 MB compression safety limit");
        }
        const optimized = await optimizeComicImage(page, input);
        const originalExtension = path.extname(page).toLowerCase();
        const extension = COMIC_IMAGE_EXTENSIONS.has(originalExtension) ? originalExtension : ".jpg";
        const pageName = `${String(index + 1).padStart(5, "0")}${extension}`;
        await fs.promises.writeFile(path.join(temporaryDirectory, pageName), optimized, { flag: "wx" });
      }
      await writeDirectoryAsCbz(temporaryDirectory, outputPath);
    } finally {
      await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    }
  };

  const compressOversizedEbook = async (file: Express.Multer.File): Promise<{
    size: number;
    compressed: boolean;
    format?: "CBZ";
  }> => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".cbr") {
      if (file.size < COMIC_COMPRESSION_THRESHOLD_BYTES) return { size: file.size, compressed: false };
      const temporaryPath = `${file.path}.compressing.cbz`;
      const convertedPath = path.join(path.dirname(file.path), `${path.parse(file.filename).name}.cbz`);
      try {
        await compressCbrToCbz(file.path, temporaryPath);
        const compressedSize = (await fs.promises.stat(temporaryPath)).size;
        if (compressedSize > MAX_STORED_COMIC_BYTES) {
          throw new Error(`Optimized CBR is still ${(compressedSize / (1024 * 1024)).toFixed(1)} MB; the stored comic limit is 100 MB`);
        }
        clearComicArchiveCache(file.path);
        await fs.promises.rename(temporaryPath, convertedPath);
        try {
          await fs.promises.unlink(file.path);
        } catch (error) {
          await fs.promises.unlink(convertedPath).catch(() => {});
          throw error;
        }
        file.path = convertedPath;
        file.filename = path.basename(convertedPath);
        return { size: compressedSize, compressed: true, format: "CBZ" };
      } finally {
        await fs.promises.unlink(temporaryPath).catch(() => {});
      }
    }
    if (ext === ".cbz" && file.size < COMIC_COMPRESSION_THRESHOLD_BYTES) return { size: file.size, compressed: false };
    if (ext !== ".cbz" && file.size > MAX_STANDARD_EBOOK_UPLOAD_BYTES) {
      throw new Error(`${ext.slice(1).toUpperCase()} files must be 100 MB or smaller`);
    }
    if (ext !== ".cbz" && file.size <= EBOOK_COMPRESSION_THRESHOLD_BYTES) return { size: file.size, compressed: false };
    const temporaryPath = `${file.path}.compressing${ext}`;
    try {
      if (ext === ".pdf") await compressPdf(file.path, temporaryPath);
      else if (ext === ".epub") await compressEpub(file.path, temporaryPath);
      else await compressCbz(file.path, temporaryPath);

      const compressedSize = (await fs.promises.stat(temporaryPath)).size;
      if (compressedSize === 0) {
        throw new Error("Compression produced an empty file");
      }
      if (ext === ".cbz" && (compressedSize >= file.size || compressedSize > MAX_STORED_COMIC_BYTES)) {
        throw new Error(compressedSize >= file.size
          ? "Compression did not reduce the file size"
          : `Compressed file is still ${(compressedSize / (1024 * 1024)).toFixed(1)} MB`);
      }
      // PDF and EPUB uploads already meet the 100 MB limit. Keep the smaller
      // result even when the 50 MB compression target is unreachable.
      if (compressedSize >= file.size) {
        return { size: file.size, compressed: false };
      }
      clearComicArchiveCache(file.path);
      await fs.promises.rename(temporaryPath, file.path);
      return { size: compressedSize, compressed: true };
    } finally {
      await fs.promises.unlink(temporaryPath).catch(() => {});
    }
  };

  // Wrap multer so upload errors (wrong type / too large) return 400, not 500.
  const uploadEbookFile = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    ebookUpload.single("file")(req, res, (err: any) => {
      if (err) {
        const message =
          err instanceof multer.MulterError
            ? (err.code === "LIMIT_FILE_SIZE" ? "File exceeds the 500 MB upload limit" : err.message)
            : err.message || "Upload failed";
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  };

  // Returns the ebook only if the requesting role may see it, else null.
  const ebookVisibleTo = (role: string, visibility: string) => {
    if (role === "ADMIN" || role === "LIBRARIAN") return true; // managers see all
    if (role === "STUDENT") return ["ALL", "STUDENTS"].includes(visibility);
    if (role === "TEACHER") return ["ALL", "TEACHERS_ONLY"].includes(visibility);
    return visibility === "ALL";
  };

  const contentType = (format: string) => {
    const normalized = (format || "").toUpperCase();
    if (normalized === "EPUB") return "application/epub+zip";
    if (normalized === "CBZ") return "application/vnd.comicbook+zip";
    if (normalized === "CBR") return "application/vnd.comicbook-rar";
    return "application/pdf";
  };

  function streamEbookFile(req: express.Request, res: express.Response, filePath: string, format: string, disposition: string) {
    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;

    res.setHeader("Content-Type", contentType(format));
    res.setHeader("Content-Disposition", disposition);
    res.setHeader("Accept-Ranges", "bytes");

    const pipeStream = (start?: number, end?: number) => {
      const stream = fs.createReadStream(filePath, start === undefined ? undefined : { start, end });
      stream.on("error", (err) => {
        logger.error("Error reading ebook file:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Could not read e-book file" });
          return;
        }
        res.destroy(err);
      });
      stream.pipe(res);
    };

    if (!range) {
      res.setHeader("Content-Length", total);
      pipeStream();
      return;
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.setHeader("Content-Range", `bytes */${total}`);
      res.status(416).end();
      return;
    }

    const suffixLength = !match[1] && match[2] ? Number(match[2]) : null;
    const requestedStart = suffixLength === null ? (match[1] ? Number(match[1]) : 0) : Math.max(total - suffixLength, 0);
    const requestedEnd = suffixLength === null ? (match[2] ? Number(match[2]) : total - 1) : total - 1;
    const start = Math.max(0, requestedStart);
    const end = Math.min(requestedEnd, total - 1);

    if (!Number.isFinite(start) || !Number.isFinite(end) || suffixLength === 0 || start > end || start >= total) {
      res.setHeader("Content-Range", `bytes */${total}`);
      res.status(416).end();
      return;
    }

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    res.setHeader("Content-Length", end - start + 1);
    pipeStream(start, end);
  }

  app.get("/api/ebooks", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      let where: any = {};
      if (jwtUser.role === "STUDENT") where = { visibility: { in: ["ALL", "STUDENTS"] } };
      else if (jwtUser.role === "TEACHER") where = { visibility: { in: ["ALL", "TEACHERS_ONLY"] } };
      else if (jwtUser.role !== "ADMIN" && jwtUser.role !== "LIBRARIAN") where = { visibility: "ALL" };
      const ebooks = await prisma.ebook.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, author: true, description: true, category: true,
          seriesName: true, seriesNumber: true, language: true, coverUrl: true, format: true, fileSize: true,
          visibility: true, downloadAllowed: true, uploadedByName: true, createdAt: true,
        },
      });
      res.json(ebooks);
    } catch (err) {
      logger.error("Error fetching ebooks:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fast preflight for upload/edit forms. Creation and update still repeat
  // this check server-side so API clients cannot bypass duplicate protection.
  app.get("/api/ebooks/title-availability", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageEbooks(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const title = cleanEbookTitle(req.query.title);
    if (!title) { res.status(400).json({ error: "title is required" }); return; }
    try {
      const duplicate = await findDuplicateEbookTitle(prisma, title, String(req.query.excludeId || "") || undefined);
      res.json({ available: !duplicate, duplicate: duplicate ? { id: duplicate.id, title: duplicate.title } : null });
    } catch (err) {
      logger.error("Error checking e-book title availability:", err);
      res.status(500).json({ error: "Could not check title availability" });
    }
  });

  // Teacher/admin reading analytics. Teachers only see students in classes
  // assigned to them; librarians and admins can see all student readers.
  // Registered before /api/ebooks/:id so "analytics" is not treated as an id.
  app.get("/api/ebooks/analytics", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!["ADMIN", "TEACHER", "LIBRARIAN"].includes(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const studentWhere: any = { role: "STUDENT" };
      if (jwtUser.role === "TEACHER") {
        const classIds = await getTeacherClassIds(jwtUser.userId);
        studentWhere.studentProfile = { is: { classId: { in: classIds } } };
      }
      const students = await prisma.user.findMany({
        where: studentWhere,
        select: {
          id: true, firstName: true, lastName: true, email: true,
          studentProfile: { select: { studentCode: true, preferredName: true, class: { select: { id: true, name: true } } } },
        },
      });
      const studentIds = students.map((student) => student.id);
      const progressRows = await (prisma as any).ebookProgress.findMany({
        where: { userId: { in: studentIds } },
        include: { ebook: { select: { id: true, title: true, author: true, format: true, coverUrl: true } } },
        orderBy: { lastOpenedAt: "desc" },
      });
      const byStudent = new Map<string, any[]>();
      for (const row of progressRows) {
        const list = byStudent.get(row.userId) || [];
        list.push(row);
        byStudent.set(row.userId, list);
      }
      const studentRows = students
        .map((student) => {
          const books = byStudent.get(student.id) || [];
          if (books.length === 0) return null;
          const totalReadingSeconds = books.reduce((sum, row) => sum + Number(row.totalReadingSeconds || 0), 0);
          const completedBooks = books.filter((row) => row.completedAt || Number(row.percent || 0) >= 90).length;
          const averagePercent = books.length
            ? Math.round((books.reduce((sum, row) => sum + Number(row.percent || 0), 0) / books.length) * 10) / 10
            : 0;
          return {
            userId: student.id,
            name: student.studentProfile?.preferredName || `${student.firstName} ${student.lastName}`.trim() || student.email,
            email: student.email,
            studentCode: student.studentProfile?.studentCode || null,
            classId: student.studentProfile?.class?.id || null,
            className: student.studentProfile?.class?.name || "Unassigned",
            booksStarted: books.length,
            completedBooks,
            averagePercent,
            totalReadingSeconds,
            lastReadAt: books[0]?.lastOpenedAt || books[0]?.updatedAt || null,
            books: books.map((row) => ({
              ebook: row.ebook,
              percent: Number(row.percent || 0),
              totalReadingSeconds: Number(row.totalReadingSeconds || 0),
              openCount: Number(row.openCount || 0),
              completedAt: row.completedAt,
              firstOpenedAt: row.firstOpenedAt,
              lastOpenedAt: row.lastOpenedAt,
            })),
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.totalReadingSeconds - a.totalReadingSeconds);
      res.json({
        summary: {
          activeStudents: studentRows.length,
          booksStarted: progressRows.length,
          booksCompleted: progressRows.filter((row: any) => row.completedAt || Number(row.percent || 0) >= 90).length,
          totalReadingSeconds: progressRows.reduce((sum: number, row: any) => sum + Number(row.totalReadingSeconds || 0), 0),
        },
        students: studentRows,
      });
    } catch (err) {
      logger.error("Error building e-book reading analytics:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Upload (or auto-extracted-then-uploaded) cover art for a book, ahead of or
  // independent from creating the Ebook record itself — used by the upload
  // form's client-side EPUB-cover / PDF-first-page extraction.
  app.post(
    "/api/ebooks/cover-upload",
    authMiddleware,
    (req, res, next) => {
      const jwtUser = (req as any).user as JwtPayload;
      if (!canManageEbooks(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    },
    (req, res, next) => {
      ebookCoverUpload.single("cover")(req, res, (err: any) => {
        if (err) {
          const message =
            err instanceof multer.MulterError
              ? (err.code === "LIMIT_FILE_SIZE" ? "Cover image exceeds the 5 MB limit" : err.message)
              : err.message || "Upload failed";
          res.status(400).json({ error: message });
          return;
        }
        next();
      });
    },
    (req, res) => {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) { res.status(400).json({ error: "A cover image is required" }); return; }
      res.status(201).json({ url: `/uploads/ebook-covers/${file.filename}` });
    }
  );

  const finishEbookUpload = async (req: express.Request, res: express.Response) => {
      const jwtUser = (req as any).user as JwtPayload;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ error: "An .epub, .pdf, .cbr, or .cbz file is required" });
        return;
      }
      const {
        title, author, description, category, seriesName, seriesNumber,
        language, visibility, downloadAllowed, coverUrl, uploadedByName,
      } = req.body;
      const cleanedTitle = cleanEbookTitle(title);
      const cleanedSeriesName = cleanEbookTitle(seriesName) || null;
      const parsedSeriesNumber = seriesNumber === "" || seriesNumber === null || seriesNumber === undefined
        ? null
        : Number(seriesNumber);
      const submittedCoverPath = typeof coverUrl === "string" && coverUrl.startsWith("/uploads/ebook-covers/")
        ? path.join(EBOOK_COVER_DIR, path.basename(coverUrl))
        : null;
      const deleteSubmittedCover = () => submittedCoverPath
        ? fs.promises.unlink(submittedCoverPath).catch(() => {})
        : Promise.resolve();
      if (!cleanedTitle) {
        fs.promises.unlink(file.path).catch(() => {});
        void deleteSubmittedCover();
        res.status(400).json({ error: "title is required" });
        return;
      }
      if (parsedSeriesNumber !== null && (!Number.isInteger(parsedSeriesNumber) || parsedSeriesNumber < 1)) {
        fs.promises.unlink(file.path).catch(() => {});
        void deleteSubmittedCover();
        res.status(400).json({ error: "Series number must be a positive whole number" });
        return;
      }
      if (Boolean(cleanedSeriesName) !== (parsedSeriesNumber !== null)) {
        fs.promises.unlink(file.path).catch(() => {});
        void deleteSubmittedCover();
        res.status(400).json({ error: "Series name and volume number are required together" });
        return;
      }
      let duplicate: { id: string; title: string } | null;
      try {
        duplicate = await findDuplicateEbookTitle(prisma, cleanedTitle);
      } catch (err) {
        fs.promises.unlink(file.path).catch(() => {});
        void deleteSubmittedCover();
        logger.error("Could not check e-book title uniqueness:", err);
        res.status(500).json({ error: "Could not check whether this title already exists" });
        return;
      }
      if (duplicate) {
        fs.promises.unlink(file.path).catch(() => {});
        void deleteSubmittedCover();
        res.status(409).json({ error: `A book titled "${duplicate.title}" already exists.` });
        return;
      }
      if (cleanedSeriesName && parsedSeriesNumber !== null) {
        let duplicateVolume;
        try {
          duplicateVolume = await findDuplicateEbookSeriesVolume(prisma, cleanedSeriesName, parsedSeriesNumber);
        } catch (err) {
          fs.promises.unlink(file.path).catch(() => {});
          void deleteSubmittedCover();
          logger.error("Could not check e-book series volume uniqueness:", err);
          res.status(500).json({ error: "Could not check whether this series volume already exists" });
          return;
        }
        if (duplicateVolume) {
          fs.promises.unlink(file.path).catch(() => {});
          void deleteSubmittedCover();
          res.status(409).json({
            error: `Volume ${parsedSeriesNumber} already exists in "${duplicateVolume.seriesName}" (${duplicateVolume.title}).`,
          });
          return;
        }
      }
      let format = ebookFormatFromName(file.originalname);
      let generatedCoverPath: string | null = null;
      try {
        let storedFile: Awaited<ReturnType<typeof compressOversizedEbook>>;
        try {
          storedFile = await compressOversizedEbook(file);
          if (storedFile.format) format = storedFile.format;
        } catch (compressionError: any) {
          await fs.promises.unlink(file.path).catch(() => {});
          await deleteSubmittedCover();
          clearComicArchiveCache(file.path);
          logger.warn(`Could not compress oversized ${format}: ${String(compressionError?.message || compressionError)}`);
          res.status(400).json({
            error: COMIC_FORMATS.has(format)
              ? (compressionError?.message || `This ${format} exceeds the comic upload limit.`)
              : `Could not process this ${format} upload. ${compressionError?.message || ""}`.trim(),
          });
          return;
        }
        let resolvedCoverUrl = coverUrl || null;
        if (COMIC_FORMATS.has(format)) {
          try {
            const comicPages = await getComicPages(file.path);
            if (!resolvedCoverUrl) {
              const firstPage = await extractComicPage(file.path, comicPages[0]);
              const coverFileName = `${crypto.randomUUID()}.jpg`;
              generatedCoverPath = path.join(EBOOK_COVER_DIR, coverFileName);
              await sharp(firstPage, { limitInputPixels: 80_000_000 })
                .rotate()
                .resize({ width: 640, height: 960, fit: "inside", withoutEnlargement: true })
                .jpeg({ quality: 82, mozjpeg: true })
                .toFile(generatedCoverPath);
              resolvedCoverUrl = `/uploads/ebook-covers/${coverFileName}`;
            }
          } catch (archiveError: any) {
            await fs.promises.unlink(file.path).catch(() => {});
            if (generatedCoverPath) await fs.promises.unlink(generatedCoverPath).catch(() => {});
            await deleteSubmittedCover();
            clearComicArchiveCache(file.path);
            res.status(400).json({ error: archiveError?.message || "Invalid comic archive" });
            return;
          }
        }
        const ebook = await prisma.ebook.create({
          data: {
            title: cleanedTitle,
            titleLower: normalizedTitleForColumn(cleanedTitle),
            author: author || null,
            description: description || null,
            category: category || null,
            seriesName: cleanedSeriesName,
            seriesNameLower: cleanedSeriesName ? normalizedTitleForColumn(cleanedSeriesName) : null,
            seriesNumber: cleanedSeriesName ? parsedSeriesNumber : null,
            language: language || null,
            coverUrl: resolvedCoverUrl,
            format,
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: storedFile.size,
            visibility: visibility || "ALL",
            downloadAllowed: downloadAllowed === "true" || downloadAllowed === true,
            uploadedById: jwtUser.userId,
            uploadedByName: uploadedByName || jwtUser.email,
          },
        });
        await createAuditLog(
          jwtUser.userId, jwtUser.email, "CREATE", "EBOOK", ebook.id,
          `E-book '${cleanedTitle}' (${format}) uploaded${storedFile.compressed ? " and compressed" : ""}.`,
          req.ip, req.headers["user-agent"] || null, "SUCCESS"
        );
        res.status(201).json(ebook);
      } catch (err: any) {
        fs.promises.unlink(file.path).catch(() => {});
        if (generatedCoverPath) fs.promises.unlink(generatedCoverPath).catch(() => {});
        void deleteSubmittedCover();
        clearComicArchiveCache(file.path);
        logger.error("Error creating ebook:", err);
        // Surface the real cause (admin/teacher-only route). A Prisma error here
        // usually means the DB is out of sync with schema.prisma — run
        // `npx prisma generate && npx prisma db push`, then restart the server.
        const detail = err?.code ? `${err.code}: ${err?.message ?? ""}` : err?.message;
        res.status(500).json({ error: detail || "Internal Server Error" });
      }
    };

  const requireEbookManager = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageEbooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };

  app.post(
    "/api/ebooks",
    authMiddleware,
    requireEbookManager,
    uploadEbookFile,
    finishEbookUpload,
  );

  type EbookChunkManifest = {
    userId: string;
    originalName: string;
    totalChunks: number;
    createdAt: string;
  };
  // A 500 MB comic is transported as twenty-five 20 MB chunks.
  const MAX_EBOOK_CHUNKS = 25;
  const ebookChunkManifestPath = (uploadId: string) => path.join(EBOOK_CHUNK_DIR, `${uploadId}.json`);
  const ebookChunkPartPath = (uploadId: string, index: number) => path.join(EBOOK_CHUNK_DIR, `${uploadId}.${index}.part`);
  const readEbookChunkManifest = async (uploadId: string): Promise<EbookChunkManifest> =>
    JSON.parse(await fs.promises.readFile(ebookChunkManifestPath(uploadId), "utf8"));
  const removeEbookChunkSession = async (uploadId: string, totalChunks: number) => {
    await Promise.all([
      ...Array.from({ length: totalChunks }, (_, index) => fs.promises.unlink(ebookChunkPartPath(uploadId, index)).catch(() => {})),
      fs.promises.unlink(ebookChunkManifestPath(uploadId)).catch(() => {}),
    ]);
  };

  const ebookChunkExpiry = Date.now() - 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(EBOOK_CHUNK_DIR)) {
    const chunkPath = path.join(EBOOK_CHUNK_DIR, name);
    try {
      if (fs.statSync(chunkPath).mtimeMs < ebookChunkExpiry) fs.rmSync(chunkPath, { force: true });
    } catch { /* another cleanup may already have removed it */ }
  }

  const uploadEbookChunk = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    ebookChunkUpload.single("chunk")(req, res, (err: any) => {
      if (!err) return next();
      const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? "E-book upload chunks must be 20 MB or smaller"
        : err.message || "Chunk upload failed";
      res.status(400).json({ error: message });
    });
  };

  app.post("/api/ebooks/chunks", authMiddleware, requireEbookManager, uploadEbookChunk, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const chunk = (req as any).file as Express.Multer.File | undefined;
    const uploadId = String(req.body?.uploadId || "");
    const originalName = path.basename(String(req.body?.originalName || ""));
    const chunkIndex = Number(req.body?.chunkIndex);
    const totalChunks = Number(req.body?.totalChunks);
    const extension = path.extname(originalName).toLowerCase();

    if (!chunk || chunk.size === 0 || !validUploadId(uploadId) ||
        !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) ||
        chunkIndex < 0 || totalChunks < 1 || totalChunks > MAX_EBOOK_CHUNKS || chunkIndex >= totalChunks ||
        ![".pdf", ".epub", ".cbr", ".cbz"].includes(extension)) {
      res.status(400).json({ error: "Invalid e-book upload chunk" });
      return;
    }

    try {
      const manifestPath = ebookChunkManifestPath(uploadId);
      let manifest: EbookChunkManifest;
      if (!fs.existsSync(manifestPath)) {
        if (chunkIndex !== 0) {
          res.status(409).json({ error: "Upload must start with the first chunk" });
          return;
        }
        manifest = { userId: jwtUser.userId, originalName, totalChunks, createdAt: new Date().toISOString() };
        await fs.promises.writeFile(manifestPath, JSON.stringify(manifest), { flag: "wx" });
      } else {
        manifest = await readEbookChunkManifest(uploadId);
      }
      if (manifest.userId !== jwtUser.userId || manifest.originalName !== originalName || manifest.totalChunks !== totalChunks) {
        res.status(403).json({ error: "Upload session does not match this file" });
        return;
      }
      await fs.promises.writeFile(ebookChunkPartPath(uploadId, chunkIndex), chunk.buffer);
      res.json({ received: chunkIndex, totalChunks });
    } catch (err: any) {
      logger.error("E-book chunk upload failed:", err);
      res.status(err?.code === "EEXIST" ? 409 : 500).json({ error: "Could not store e-book upload chunk" });
    }
  });

  app.post("/api/ebooks/chunks/complete", authMiddleware, requireEbookManager, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const uploadId = String(req.body?.uploadId || "");
    if (!validUploadId(uploadId)) {
      res.status(400).json({ error: "Invalid upload session" });
      return;
    }

    let assembledPath = "";
    try {
      const manifest = await readEbookChunkManifest(uploadId);
      if (manifest.userId !== jwtUser.userId) {
        res.status(403).json({ error: "Upload session belongs to another user" });
        return;
      }
      const parts = Array.from({ length: manifest.totalChunks }, (_, index) => ebookChunkPartPath(uploadId, index));
      const stats = await Promise.all(parts.map((part) => fs.promises.stat(part)));
      const totalSize = stats.reduce((sum, stat) => sum + stat.size, 0);
      const extension = path.extname(manifest.originalName).toLowerCase();
      const maximumSize = [".cbr", ".cbz"].includes(extension)
        ? MAX_EBOOK_UPLOAD_BYTES
        : MAX_STANDARD_EBOOK_UPLOAD_BYTES;
      if (totalSize <= 0 || totalSize > maximumSize) {
        await removeEbookChunkSession(uploadId, manifest.totalChunks);
        res.status(400).json({ error: `This format has a ${Math.round(maximumSize / (1024 * 1024))} MB upload limit` });
        return;
      }

      const assembledName = `${crypto.randomUUID()}${extension}`;
      assembledPath = path.join(EBOOK_DIR, assembledName);
      const output = await fs.promises.open(assembledPath, "wx");
      try {
        for (const part of parts) await output.write(await fs.promises.readFile(part));
      } finally {
        await output.close();
      }
      await removeEbookChunkSession(uploadId, manifest.totalChunks);

      (req as any).file = {
        originalname: manifest.originalName,
        filename: assembledName,
        path: assembledPath,
        size: totalSize,
        mimetype: contentType(extension.slice(1)),
      } as Express.Multer.File;
      await finishEbookUpload(req, res);
    } catch (err: any) {
      if (assembledPath) await fs.promises.unlink(assembledPath).catch(() => {});
      logger.error("Could not assemble e-book upload:", err);
      res.status(err?.code === "ENOENT" ? 409 : 500).json({
        error: err?.code === "ENOENT" ? "One or more e-book chunks are missing" : "Could not assemble e-book upload",
      });
    }
  });

  app.delete("/api/ebooks/chunks/:uploadId", authMiddleware, requireEbookManager, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const uploadId = String(req.params.uploadId || "");
    if (!validUploadId(uploadId)) { res.status(400).json({ error: "Invalid upload session" }); return; }
    try {
      const manifest = await readEbookChunkManifest(uploadId);
      if (manifest.userId !== jwtUser.userId) { res.status(403).json({ error: "Forbidden" }); return; }
      await removeEbookChunkSession(uploadId, manifest.totalChunks);
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "ENOENT") { res.json({ success: true }); return; }
      logger.error("Could not discard e-book chunk upload:", err);
      res.status(500).json({ error: "Could not discard upload session" });
    }
  });

  app.get("/api/ebooks/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility)) {
        res.status(404).json({ error: "E-book not found" });
        return;
      }
      const { fileName, ...meta } = ebook;
      res.json(meta);
    } catch (err) {
      logger.error("Error fetching ebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/ebooks/:id", authMiddleware, validate(schemas.ebookUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageEbooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const {
      title, author, description, category, seriesName, seriesNumber,
      language, visibility, downloadAllowed, coverUrl,
    } = req.body;
    let pendingCoverPath: string | null = null;
    try {
      const current = await prisma.ebook.findUnique({ where: { id: req.params.id } });
      if (!current) { res.status(404).json({ error: "E-book not found" }); return; }
      if (coverUrl !== undefined && coverUrl !== current.coverUrl && typeof coverUrl === "string" && coverUrl.startsWith("/uploads/ebook-covers/")) {
        pendingCoverPath = path.join(EBOOK_COVER_DIR, path.basename(coverUrl));
      }
      const discardPendingCover = () => pendingCoverPath
        ? fs.promises.unlink(pendingCoverPath).catch(() => {})
        : Promise.resolve();
      const cleanedTitle = title === undefined ? undefined : cleanEbookTitle(title);
      if (title !== undefined && !cleanedTitle) {
        await discardPendingCover();
        res.status(400).json({ error: "title is required" });
        return;
      }
      if (cleanedTitle) {
        const duplicate = await findDuplicateEbookTitle(prisma, cleanedTitle, req.params.id);
        if (duplicate) {
          await discardPendingCover();
          res.status(409).json({ error: `A book titled "${duplicate.title}" already exists.` });
          return;
        }
      }
      const cleanedSeriesName = seriesName === undefined ? undefined : cleanEbookTitle(seriesName) || null;
      const parsedSeriesNumber = seriesNumber === "" || seriesNumber === null || seriesNumber === undefined
        ? null
        : Number(seriesNumber);
      if (parsedSeriesNumber !== null && (!Number.isInteger(parsedSeriesNumber) || parsedSeriesNumber < 1)) {
        await discardPendingCover();
        res.status(400).json({ error: "Series number must be a positive whole number" });
        return;
      }
      const resolvedSeriesName = cleanedSeriesName === undefined ? current.seriesName : cleanedSeriesName;
      const resolvedSeriesNumber = cleanedSeriesName === null
        ? null
        : seriesNumber === undefined
          ? current.seriesNumber
          : parsedSeriesNumber;
      if (Boolean(resolvedSeriesName) !== (resolvedSeriesNumber !== null)) {
        await discardPendingCover();
        res.status(400).json({ error: "Series name and volume number are required together" });
        return;
      }
      if (resolvedSeriesName && resolvedSeriesNumber !== null) {
        const duplicateVolume = await findDuplicateEbookSeriesVolume(
          prisma, resolvedSeriesName, resolvedSeriesNumber, req.params.id,
        );
        if (duplicateVolume) {
          await discardPendingCover();
          res.status(409).json({
            error: `Volume ${resolvedSeriesNumber} already exists in "${duplicateVolume.seriesName}" (${duplicateVolume.title}).`,
          });
          return;
        }
      }
      const updated = await prisma.ebook.update({
        where: { id: req.params.id },
        data: {
          ...(cleanedTitle && { title: cleanedTitle, titleLower: normalizedTitleForColumn(cleanedTitle) }),
          ...(author !== undefined && { author: author || null }),
          ...(description !== undefined && { description: description || null }),
          ...(category !== undefined && { category: category || null }),
          ...(cleanedSeriesName !== undefined && { seriesName: cleanedSeriesName, seriesNameLower: cleanedSeriesName ? normalizedTitleForColumn(cleanedSeriesName) : null }),
          ...((seriesNumber !== undefined || cleanedSeriesName === null) && {
            seriesNumber: cleanedSeriesName === null ? null : parsedSeriesNumber,
          }),
          ...(language !== undefined && { language: language || null }),
          ...(coverUrl !== undefined && { coverUrl: coverUrl || null }),
          ...(visibility && { visibility }),
          ...(downloadAllowed !== undefined && { downloadAllowed: parseBoolean(downloadAllowed) }),
        },
      });
      pendingCoverPath = null;
      if (coverUrl !== undefined && coverUrl !== current.coverUrl && current.coverUrl?.startsWith("/uploads/ebook-covers/")) {
        fs.promises.unlink(path.join(EBOOK_COVER_DIR, path.basename(current.coverUrl))).catch(() => {});
      }
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "UPDATE", "EBOOK", updated.id,
        `E-book '${updated.title}' updated.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      const { fileName, ...meta } = updated;
      res.json(meta);
    } catch (err: any) {
      if (pendingCoverPath) await fs.promises.unlink(pendingCoverPath).catch(() => {});
      if (err.code === "P2025") { res.status(404).json({ error: "E-book not found" }); return; }
      logger.error("Error updating ebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/ebooks/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageEbooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id } });
      if (!ebook) { res.status(404).json({ error: "E-book not found" }); return; }
      await prisma.ebook.delete({ where: { id: req.params.id } });
      const deletedFilePath = path.join(EBOOK_DIR, ebook.fileName);
      clearComicArchiveCache(deletedFilePath);
      fs.promises.unlink(deletedFilePath).catch(() => {});
      if (ebook.coverUrl?.startsWith("/uploads/ebook-covers/")) {
        const coverFileName = path.basename(ebook.coverUrl);
        fs.promises.unlink(path.join(EBOOK_COVER_DIR, coverFileName)).catch(() => {});
      }
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "DELETE", "EBOOK", ebook.id,
        `E-book '${ebook.title}' deleted.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json({ message: "E-book deleted successfully" });
    } catch (err) {
      logger.error("Error deleting ebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Inline stream for the online reader (no attachment header).
  app.get("/api/ebooks/:id/content", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility)) {
        res.status(404).json({ error: "E-book not found" });
        return;
      }
      const filePath = path.join(EBOOK_DIR, ebook.fileName);
      if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File missing" }); return; }
      streamEbookFile(req, res, filePath, ebook.format, "inline");
    } catch (err) {
      logger.error("Error streaming ebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Comic reader manifest and page image endpoints. The archive's internal
  // filenames stay server-side; readers address pages only by sorted index.
  app.get("/api/ebooks/:id/comic/manifest", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility) || !COMIC_FORMATS.has(ebook.format.toUpperCase())) {
        res.status(404).json({ error: "Comic book not found" });
        return;
      }
      const filePath = path.join(EBOOK_DIR, ebook.fileName);
      if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File missing" }); return; }
      const pages = await getComicPages(filePath);
      res.json({ pageCount: pages.length, format: ebook.format.toUpperCase() });
    } catch (err: any) {
      logger.error("Error reading comic manifest:", err);
      res.status(400).json({ error: err?.message || "Could not read comic archive" });
    }
  });

  app.get("/api/ebooks/:id/comic/pages/:page", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility) || !COMIC_FORMATS.has(ebook.format.toUpperCase())) {
        res.status(404).json({ error: "Comic book not found" });
        return;
      }
      const pageIndex = Number.parseInt(req.params.page, 10);
      const filePath = path.join(EBOOK_DIR, ebook.fileName);
      const pages = await getComicPages(filePath);
      if (!Number.isInteger(pageIndex) || pageIndex < 1 || pageIndex > pages.length) {
        res.status(404).json({ error: "Comic page not found" });
        return;
      }
      const entry = pages[pageIndex - 1];
      let bytes = await extractComicPage(filePath, entry);
      const ext = path.extname(entry).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".jpe": "image/jpeg", ".jfif": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
      };
      let mimeType = mimeTypes[ext];
      // Browsers do not consistently display BMP or TIFF. Convert only those
      // pages on demand while preserving the original archive for downloads.
      if (!mimeType) {
        bytes = await sharp(bytes, { limitInputPixels: 80_000_000 })
          .rotate()
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
        mimeType = "image/jpeg";
      }
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", bytes.length);
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.send(bytes);
    } catch (err: any) {
      logger.error("Error reading comic page:", err);
      res.status(400).json({ error: err?.message || "Could not read comic page" });
    }
  });

  // Download — only when the admin has allowed it for this book.
  app.get("/api/ebooks/:id/download", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility)) {
        res.status(404).json({ error: "E-book not found" });
        return;
      }
      if (!ebook.downloadAllowed && !canManageEbooks(jwtUser.role)) {
        res.status(403).json({ error: "This e-book is read-online only." });
        return;
      }
      const filePath = path.join(EBOOK_DIR, ebook.fileName);
      if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File missing" }); return; }
      const extensionByFormat: Record<string, string> = { EPUB: ".epub", PDF: ".pdf", CBR: ".cbr", CBZ: ".cbz" };
      const ext = extensionByFormat[ebook.format.toUpperCase()] || "";
      const baseName = path.parse(ebook.originalName || ebook.title).name || ebook.title;
      const safeName = `${baseName}${ext}`.replace(/[^\w.\- ]+/g, "_");
      streamEbookFile(req, res, filePath, ebook.format, `attachment; filename="${safeName}"`);
    } catch (err) {
      logger.error("Error downloading ebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── E-Library: reading progress ("resume where you left off") ──────────────
  // List first so the two-segment path can't be shadowed by /api/ebooks/:id.
  app.get("/api/ebooks/my/progress", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const rows = await (prisma as any).ebookProgress.findMany({
        where: { userId: jwtUser.userId },
        orderBy: { updatedAt: "desc" },
        take: 12,
      });
      const ebooks = await prisma.ebook.findMany({
        where: { id: { in: rows.map((r: any) => r.ebookId) } },
        select: { id: true, title: true, author: true, format: true, coverUrl: true, visibility: true },
      });
      const byId = new Map(ebooks.map((e) => [e.id, e]));
      const merged = rows
        .map((r: any) => {
          const ebook = byId.get(r.ebookId);
          if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility)) return null;
          return { ebook, location: r.location, percent: r.percent, updatedAt: r.updatedAt };
        })
        .filter(Boolean);
      res.json(merged);
    } catch (err) {
      logger.error("Error fetching reading progress list:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/ebooks/:id/progress", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const row = await (prisma as any).ebookProgress.findUnique({
        where: { userId_ebookId: { userId: jwtUser.userId, ebookId: req.params.id } },
      });
      res.json(row ? { location: row.location, percent: row.percent, updatedAt: row.updatedAt } : null);
    } catch (err) {
      logger.error("Error fetching reading progress:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Active reading heartbeat. The client only sends these while the reader is
  // focused, visible, and recently interacted with; cap each request so a
  // modified client cannot add arbitrary hours in one call.
  app.post("/api/ebooks/:id/reading-time", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "STUDENT") { res.json({ success: true }); return; }
    const seconds = Math.max(0, Math.min(30, Math.trunc(Number(req.body?.seconds || 0))));
    const opened = req.body?.opened === true;
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id }, select: { id: true, visibility: true } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility)) { res.status(404).json({ error: "E-book not found" }); return; }
      await (prisma as any).ebookProgress.upsert({
        where: { userId_ebookId: { userId: jwtUser.userId, ebookId: req.params.id } },
        create: {
          userId: jwtUser.userId, ebookId: req.params.id, location: "", percent: 0,
          totalReadingSeconds: seconds, openCount: 1, lastOpenedAt: new Date(),
        },
        update: {
          ...(seconds > 0 && { totalReadingSeconds: { increment: seconds } }),
          ...(opened && { openCount: { increment: 1 } }),
          ...((opened || seconds > 0) && { lastOpenedAt: new Date() }),
        },
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error recording e-book reading time:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/ebooks/:id/progress", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const location = (req.body?.location ?? "").toString().slice(0, 2000);
    const percentRaw = req.body?.percent;
    const percent = percentRaw === null || percentRaw === undefined ? null : Math.max(0, Math.min(100, Number(percentRaw)));
    if (!location) { res.status(400).json({ error: "location is required" }); return; }
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id }, select: { id: true, visibility: true } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility)) { res.status(404).json({ error: "E-book not found" }); return; }
      const existing = await (prisma as any).ebookProgress.findUnique({
        where: { userId_ebookId: { userId: jwtUser.userId, ebookId: req.params.id } },
      });
      const furthestPercent = Number.isFinite(percent)
        ? Math.max(Number(existing?.percent || 0), Number(percent))
        : existing?.percent ?? null;
      const completedAt = Number(furthestPercent || 0) >= 90 ? (existing?.completedAt || new Date()) : null;
      const row = await (prisma as any).ebookProgress.upsert({
        where: { userId_ebookId: { userId: jwtUser.userId, ebookId: req.params.id } },
        update: { location, percent: furthestPercent, completedAt },
        create: {
          userId: jwtUser.userId, ebookId: req.params.id, location,
          percent: Number.isFinite(percent) ? percent : 0,
          completedAt: Number(percent || 0) >= 90 ? new Date() : null,
        },
      });
      res.json({ location: row.location, percent: row.percent, updatedAt: row.updatedAt });
    } catch (err) {
      logger.error("Error saving reading progress:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── E-Library: highlights / saved passages ──────────────────────────────────
  app.get("/api/ebooks/:id/highlights", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id }, select: { id: true, visibility: true } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility)) { res.status(404).json({ error: "E-book not found" }); return; }
      const highlights = await (prisma as any).ebookHighlight.findMany({
        where: { ebookId: req.params.id, userId: jwtUser.userId },
        orderBy: { createdAt: "asc" },
      });
      res.json(highlights);
    } catch (err) {
      logger.error("Error fetching highlights:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/ebooks/:id/highlights", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const text = (req.body?.text ?? "").toString().trim().slice(0, 2000);
    const cfi = req.body?.cfi ? String(req.body.cfi).slice(0, 500) : null;
    const page = req.body?.page != null ? Math.max(1, Math.trunc(Number(req.body.page))) : null;
    const color = ["yellow", "green", "blue", "pink"].includes(req.body?.color) ? req.body.color : "yellow";
    if (!text) { res.status(400).json({ error: "text is required" }); return; }
    if (!cfi && !page) { res.status(400).json({ error: "cfi or page is required" }); return; }
    try {
      const ebook = await prisma.ebook.findUnique({ where: { id: req.params.id }, select: { id: true, visibility: true } });
      if (!ebook || !ebookVisibleTo(jwtUser.role, ebook.visibility)) { res.status(404).json({ error: "E-book not found" }); return; }
      const highlight = await (prisma as any).ebookHighlight.create({
        data: {
          ebookId: req.params.id, userId: jwtUser.userId, userName: jwtUser.email,
          cfi, page, text, color,
        },
      });
      res.status(201).json(highlight);
    } catch (err) {
      logger.error("Error creating highlight:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/ebooks/highlights/:highlightId", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const highlight = await (prisma as any).ebookHighlight.findUnique({ where: { id: req.params.highlightId } });
      if (!highlight) { res.status(404).json({ error: "Highlight not found" }); return; }
      if (highlight.userId !== jwtUser.userId && jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
      await (prisma as any).ebookHighlight.delete({ where: { id: req.params.highlightId } });
      res.json({ message: "Highlight deleted" });
    } catch (err) {
      logger.error("Error deleting highlight:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
