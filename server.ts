import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { constants as zlibConstants } from "zlib";
import multer from "multer";
import { z } from "zod";
import helmet from "helmet";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import winston from "winston";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "@prisma/client";
import dotenv from "dotenv";
import { spawn } from "child_process";
import { ZipArchive } from "archiver";
import JSZip from "jszip";
import sharp from "sharp";
import { registerExamPhase2Routes } from "./examPhase2";
import { composeQuestionSet, registerExamBankRoutes } from "./examBank";
import { registerNewsRoutes } from "./news";
import { registerPayrollPdfRoutes } from "./payrollPdf";
import { registerFeesPdfRoutes } from "./feesPdf";
import { registerFlashcardRoutes } from "./flashcards";
import { registerConductRoutes } from "./conduct";
import { registerConductPdfRoutes } from "./conductPdf";
import { loadPdfLogo } from "./pdfBranding";
import { renderStudentCardPdf } from "./studentCardPdf";
import {
  PERSONNEL_CARD_RASTER_HEIGHT_PX,
  PERSONNEL_CARD_RASTER_WIDTH_PX,
  renderPersonnelCardPdf,
} from "./personnelCardPdf";
import { registerDictionaryRoutes } from "./dictionary";
import { registerGutenbergRoutes } from "./gutenberg";
import { registerSnakeGameRoutes } from "./snakeGame";
import { registerNeonSnakeServer } from "./neonSnakeServer";
import { registerAiAssistantRoutes } from "./aiAssistant";
import { registerCheckersGameRoutes } from "./checkersGame";
import { registerChessGameRoutes } from "./chessGame";
import { registerPacmanGameRoutes } from "./pacmanGame";
import { registerLanguageQuestRoutes } from "./languageQuest";
import { registerDailyQuestRoutes } from "./dailyQuest";
import { registerWordTrailRoutes } from "./wordTrail";
import { evaluateStudentGameAccess, registerGameControlRoutes } from "./gameControls";
import cookieParser from "cookie-parser";
import { BADGE_CATALOG, getBadgeLevel } from "./lib/badges";
import { roleHasPermission, type Permission, type UserRole } from "./shared/permissions";
import { isExternalLearnerApiRequestAllowed } from "./shared/externalLearnerAccess";
import { isLanguageQuestAvatarId } from "./shared/languageQuestAvatars";
import { canCurateSocialContent, canViewSocialAudience, normaliseSocialRetentionDays } from "./shared/socialPolicy";
import {
  normalizeVideoDuration,
  resolveVideoProgressUpdate,
  videoWatchPercent,
} from "./shared/videoProgress";
import {
  HOMEWORK_FILE_MAX_BYTES,
  HOMEWORK_MEDIA_URL,
  homeworkMediaOwnerId,
  isAllowedHomeworkFile,
  parseHomeworkMediaUrl,
  parseHomeworkSubmissionAttachments,
} from "./shared/homeworkAttachments";
import {
  copyArtifactOffsite,
  createZipArtifact,
  isSafeBackupName,
  listBackupArtifacts,
  pruneBackupArtifacts,
  verifyZipStructure,
  type BackupArtifact,
  type ZipSource,
} from "./lib/backupArtifacts";
import { checkWritableDirectory, probeCommand, summarizeHealth, type HealthCheckResult } from "./lib/systemHealth";
import { extractRarEntry, listRarImageEntries } from "./lib/portableRar";
import { cleanEbookTitle, findDuplicateEbookSeriesVolume, findDuplicateEbookTitle, normalizedTitleForColumn } from "./lib/ebookTitles";
import { feeMonthRange, feeYearRange, normalizeFeeMonth } from "./shared/feePeriods";
import { buildMonthlyFinanceRows } from "./shared/monthlyFinance";
import {
  getExpenseGrossAmount,
  ReportRangeError,
  resolveUtcReportRange,
  sumExpenseGrossAmounts,
  sumOutstandingFeeBalance,
} from "./shared/financialReports";
import { inferStudentCardExpiry, personnelCardStatus } from "./shared/studentCardValidity";
import {
  GRADE_CATEGORIES,
  isGradeCategory,
  normalizeGradeItemTitle,
  parseCategoryWeight,
  parseGradeItemDate,
  parseGradeItemMaxMarks,
} from "./shared/gradebook";

dotenv.config();

// ─── E-Library file storage ────────────────────────────────────────────────────
// Uploaded EPUB/PDF/comic archive files live on disk (a Docker volume in production), NOT in
// the database. Override the location with the EBOOK_DIR env var.
const EBOOK_DIR = process.env.EBOOK_DIR || path.join(process.cwd(), "data", "ebooks");
fs.mkdirSync(EBOOK_DIR, { recursive: true });
const EBOOK_CHUNK_DIR = path.join(EBOOK_DIR, ".chunks");
fs.mkdirSync(EBOOK_CHUNK_DIR, { recursive: true });
const MAX_STORED_EBOOK_BYTES = 50 * 1024 * 1024;
const MAX_STANDARD_EBOOK_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_EBOOK_UPLOAD_BYTES = 500 * 1024 * 1024;
const COMIC_COMPRESSION_THRESHOLD_BYTES = 50 * 1024 * 1024;
const MAX_STORED_COMIC_BYTES = 100 * 1024 * 1024;
// Ebook cover thumbnails (auto-extracted client-side from the EPUB's embedded
// cover or a rendered PDF first page, or picked manually) — served statically,
// unlike the book files themselves which stream through an auth-checked route.
const EBOOK_COVER_DIR = process.env.EBOOK_COVER_DIR || path.join(process.cwd(), "data", "ebook-covers");
fs.mkdirSync(EBOOK_COVER_DIR, { recursive: true });
const BRANDING_ASSET_DIR = process.env.BRANDING_ASSET_DIR || path.join(process.cwd(), "data", "branding");
fs.mkdirSync(BRANDING_ASSET_DIR, { recursive: true });
const PROFILE_PHOTO_DIR = process.env.PROFILE_PHOTO_DIR || path.join(process.cwd(), "data", "profile-photos");
fs.mkdirSync(PROFILE_PHOTO_DIR, { recursive: true });
const LIBRARY_FILE_DIR = process.env.LIBRARY_FILE_DIR || path.join(process.cwd(), "data", "library");
fs.mkdirSync(LIBRARY_FILE_DIR, { recursive: true });
const VIDEO_FILES_DIR = process.env.VIDEO_FILES_DIR || path.join(process.cwd(), "data", "videos");
fs.mkdirSync(VIDEO_FILES_DIR, { recursive: true });
const VIDEO_CHUNK_DIR = path.join(VIDEO_FILES_DIR, ".chunks");
fs.mkdirSync(VIDEO_CHUNK_DIR, { recursive: true });
const ADMISSION_FILE_DIR = process.env.ADMISSION_FILE_DIR || path.join(process.cwd(), "data", "admissions");
fs.mkdirSync(ADMISSION_FILE_DIR, { recursive: true });
const STUDENT_DOC_DIR = process.env.STUDENT_DOC_DIR || path.join(process.cwd(), "data", "student-docs");
fs.mkdirSync(STUDENT_DOC_DIR, { recursive: true });
const EXAM_MEDIA_DIR = process.env.EXAM_MEDIA_DIR || path.join(process.cwd(), "data", "exam-media");
fs.mkdirSync(EXAM_MEDIA_DIR, { recursive: true });
const CHAT_MEDIA_DIR = process.env.CHAT_MEDIA_DIR || path.join(process.cwd(), "data", "chat-media");
fs.mkdirSync(CHAT_MEDIA_DIR, { recursive: true });
const HOMEWORK_MEDIA_DIR = process.env.HOMEWORK_MEDIA_DIR || path.join(process.cwd(), "data", "homework-media");
fs.mkdirSync(HOMEWORK_MEDIA_DIR, { recursive: true });
// Admin-uploaded sticker packs live here (served at /uploads/stickers); built-in
// packs ship in public/stickers (served at /stickers).
const STICKER_UPLOAD_DIR = process.env.STICKER_UPLOAD_DIR || path.join(process.cwd(), "data", "stickers");
fs.mkdirSync(STICKER_UPLOAD_DIR, { recursive: true });
const SOCIAL_DIR = process.env.SOCIAL_DIR || path.join(process.cwd(), "data", "social");
fs.mkdirSync(SOCIAL_DIR, { recursive: true });
const EPHEMERAL_TTL_MS = 24 * 60 * 60 * 1000; // social posts + ephemeral chat photos live 24h
const sanitizePack = (s: string) => {
  const cleaned = String(s || "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 60);
  if (!cleaned) return null;
  // Additional safety check: ensure no path traversal patterns
  if (cleaned.includes('..') || cleaned.includes('/') || cleaned.includes('\\')) {
    return null;
  }
  return cleaned;
};

const sanitizeFile = (s: string) => {
  const cleaned = String(s || "").replace(/[^a-zA-Z0-9._-]/g, "").trim().slice(0, 100);
  if (!cleaned) return null;
  // Additional safety check: ensure no path traversal patterns
  if (cleaned.includes('..') || cleaned.includes('/') || cleaned.includes('\\')) {
    return null;
  }
  // Ensure the filename has an extension
  if (!cleaned.includes('.')) return null;
  return cleaned;
};

const ebookUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, EBOOK_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  // Documents use lower per-format limits below. Comic archives may arrive at
  // up to 500 MB so oversized CBR/CBZ files can be optimized after transport.
  limits: { fileSize: MAX_EBOOK_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".pdf", ".epub", ".cbr", ".cbz"].includes(ext)) cb(null, true);
    else cb(new Error("Only .pdf, .epub, .cbr, and .cbz files are allowed"));
  },
});

const ebookChunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 21 * 1024 * 1024 },
});

const ebookCoverUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, EBOOK_COVER_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([".png", ".jpg", ".jpeg", ".webp"]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith("image/") && allowed.has(ext)) cb(null, true);
    else cb(new Error("Only PNG, JPG, and WEBP image files are allowed"));
  },
});

const brandingAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, BRANDING_ASSET_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = new Map([
      [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
      [".webp", "image/webp"], [".gif", "image/gif"],
    ]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.get(ext) === file.mimetype) cb(null, true);
    else cb(new Error("Only PNG, JPG, WEBP, and GIF image files are allowed"));
  },
});

const imageUploadFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = new Map([
    [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
    [".webp", "image/webp"], [".gif", "image/gif"],
  ]);
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.get(ext) === file.mimetype) cb(null, true);
  else cb(new Error("Only PNG, JPG, WEBP, and GIF image files are allowed"));
};

const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PROFILE_PHOTO_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageUploadFilter,
});

const examMediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, EXAM_MEDIA_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Map([
      [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
      [".webp", "image/webp"], [".gif", "image/gif"],
    ]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.get(ext) === file.mimetype) cb(null, true);
    else cb(new Error("Only PNG, JPG, WEBP, and GIF image files are allowed"));
  },
});

const homeworkMediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, HOMEWORK_MEDIA_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const userId = String((req as any).user?.userId ?? "");
      const ownerPrefix = /^[0-9a-f-]{36}$/i.test(userId) ? `${userId}-` : "";
      cb(null, `${ownerPrefix}${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: HOMEWORK_FILE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (isAllowedHomeworkFile(file.originalname, file.mimetype)) cb(null, true);
    else cb(new Error("Upload an image, PDF, Word, PowerPoint, Excel, text or OpenDocument file"));
  },
});

const chatMediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CHAT_MEDIA_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageUploadFilter,
});

const stickerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      // Use pack name stored on request by route handler
      const pack = (req as any).stickerPack || "Custom";
      const dir = path.join(STICKER_UPLOAD_DIR, pack);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 50 },
  fileFilter: imageUploadFilter,
});

const socialUpload = multer({
  // Keep untrusted social images in memory until Sharp has decoded and
  // normalised them. This avoids persisting SVG/script payloads, strips image
  // metadata, caps dimensions, and prevents orphan files when validation fails.
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (allowed.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, and WEBP image files are allowed"));
  },
});

const libraryFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LIBRARY_FILE_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".txt"]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.has(ext)) cb(null, true);
    else cb(new Error("Only PDF, Office documents, images, and text files are allowed"));
  },
});

const admissionFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ADMISSION_FILE_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp", ".txt"]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.has(ext)) cb(null, true);
    else cb(new Error("Only PDF, Word, image, and text files are allowed"));
  },
});

const studentDocUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, STUDENT_DOC_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".txt"]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.has(ext)) cb(null, true);
    else cb(new Error("Only PDF, Word, image, and text files are allowed"));
  },
});

const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv", ".mts", ".m2ts", ".ts", ".m4v", ".mpg", ".mpeg", ".3gp"]);

const videoFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEO_FILES_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB for video files (uploads over 250MB are auto-compressed, see finishStoredVideoUpload)
  fileFilter: (_req, file, cb) => {
    // .mts/.m2ts (AVCHD) and the other non-web formats are accepted, then
    // transcoded to browser-playable MP4 on upload (see /api/videos/files).
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_VIDEO_EXTENSIONS.has(ext)) cb(null, true);
    else cb(new Error("Unsupported video format. Allowed: MP4, WebM, MOV, AVI, MKV, FLV, WMV, MTS, M2TS, TS, M4V, MPG, 3GP"));
  },
});

// Cloudflare limits a single proxied request to 100 MB on Free/Pro plans. The
// browser sends large videos as 20 MiB pieces, so each request stays well below
// that ceiling. Only one piece is held in memory at a time.
const videoChunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 21 * 1024 * 1024 },
});

// Subtitle/caption files live alongside videos and are served from the same dir.
const captionFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEO_FILES_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".vtt";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB is plenty for subtitles
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".vtt" || ext === ".srt") cb(null, true);
    else cb(new Error("Only .vtt or .srt subtitle files are allowed"));
  },
});

// Custom video thumbnails are decoded and normalised with Sharp before they
// are persisted. Keeping the upload in memory until decoding succeeds avoids
// storing disguised/non-image payloads in the media directory.
const videoThumbnailUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (allowed.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, and WEBP thumbnail images are allowed"));
  },
});

// ─── Database backups ──────────────────────────────────────────────────────────
// Real pg_dump backups written to disk (a Docker volume in production). Override
// the location with BACKUP_DIR and how many to keep with BACKUP_RETENTION.
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "data", "backups");
const BACKUP_RETENTION = Math.max(1, Number(process.env.BACKUP_RETENTION || 14));
const OFFSITE_BACKUP_DIR = process.env.OFFSITE_BACKUP_DIR?.trim() || null;
const FLASHCARD_IMAGE_DIR = process.env.FLASHCARD_IMAGE_DIR || path.join(process.cwd(), "data", "flashcards");
const BACKUP_UPLOAD_SOURCES = [
  ["ebooks", EBOOK_DIR],
  ["ebook-covers", EBOOK_COVER_DIR],
  ["branding", BRANDING_ASSET_DIR],
  ["profile-photos", PROFILE_PHOTO_DIR],
  ["library", LIBRARY_FILE_DIR],
  ["videos", VIDEO_FILES_DIR],
  ["admissions", ADMISSION_FILE_DIR],
  ["student-docs", STUDENT_DOC_DIR],
  ["exam-media", EXAM_MEDIA_DIR],
  ["chat-media", CHAT_MEDIA_DIR],
  ["homework-media", HOMEWORK_MEDIA_DIR],
  ["stickers", STICKER_UPLOAD_DIR],
  ["social", SOCIAL_DIR],
  ["flashcards", FLASHCARD_IMAGE_DIR],
] as const;

function listBackups(): BackupArtifact[] {
  return listBackupArtifacts(BACKUP_DIR, OFFSITE_BACKUP_DIR);
}

const backupStamp = () => new Date().toISOString().replace(/[:.]/g, "-");

async function finalizeBackup(filePath: string): Promise<BackupArtifact> {
  const offsite = await copyArtifactOffsite(filePath, OFFSITE_BACKUP_DIR);
  await pruneBackupArtifacts(BACKUP_DIR, BACKUP_RETENTION, OFFSITE_BACKUP_DIR);
  const stat = await fs.promises.stat(filePath);
  const artifact = listBackups().find((item) => item.name === path.basename(filePath));
  if (!artifact) throw new Error("Backup was created but could not be indexed");
  return { ...artifact, size: stat.size, offsite };
}

// Runs pg_dump in custom format (restore with pg_restore). Resolves with the file.
function runBackup(): Promise<BackupArtifact> {
  return new Promise((resolve, reject) => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return reject(new Error("DATABASE_URL is not set"));
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = backupStamp();
    const name = `mrlc-${stamp}.dump`;
    const filePath = path.join(BACKUP_DIR, name);

    const dump = spawn("pg_dump", ["-Fc", "--no-owner", "--no-privileges", "-f", filePath, dbUrl]);
    let stderr = "";
    dump.stderr.on("data", (d) => (stderr += d.toString()));
    dump.on("error", (err) =>
      reject(new Error(`pg_dump could not start (is postgresql-client installed?): ${err.message}`)),
    );
    dump.on("close", async (code) => {
      if (code !== 0) {
        fs.promises.unlink(filePath).catch(() => {});
        return reject(new Error(`pg_dump failed (exit ${code}): ${stderr.trim()}`));
      }
      try {
        resolve(await finalizeBackup(filePath));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function runFileBackup(): Promise<BackupArtifact> {
  await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
  const filePath = path.join(BACKUP_DIR, `mrlc-files-${backupStamp()}.zip`);
  const availableSources: ZipSource[] = BACKUP_UPLOAD_SOURCES
    .filter(([, sourcePath]) => fs.existsSync(sourcePath))
    .map(([label, sourcePath]) => ({ sourcePath, archivePath: label }));
  availableSources.unshift({
    archivePath: "backup-manifest.json",
    content: JSON.stringify({
      createdAt: new Date().toISOString(),
      type: "uploaded-files",
      directories: availableSources.map((source) => source.archivePath),
    }, null, 2),
  });
  await createZipArtifact(filePath, availableSources);
  return finalizeBackup(filePath);
}

// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

/**
 * Winston's simple formatter does not render Error properties passed as a
 * second argument. Keep Prisma's code and metadata in the message so PM2 logs
 * show the table or column that needs attention during a deployment.
 */
function logExamDatabaseError(operation: string, err: any) {
  logger.error(`${operation}: ${err?.message || "Unknown database error"}`, {
    prismaCode: err?.code,
    prismaMeta: err?.meta,
    stack: err?.stack,
  });
}

// ─── Prisma ───────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Transactional email outbox ─────────────────────────────────────────────
// Password-reset and notification emails are persisted before delivery. This
// makes transient SMTP outages retryable instead of silently losing messages.
const APP_URL = (process.env.APP_URL || "http://localhost:8000").replace(/\/$/, "");
const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Math.max(1, Number(process.env.SMTP_PORT || 587));
const SMTP_FROM = process.env.SMTP_FROM?.trim() || "MRLC LMS <no-reply@mrlc.local>";
const smtpTransport = SMTP_HOST ? nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || SMTP_PORT === 465,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
}) : null;

function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}

async function queueEmail(input: {
  userId?: string | null;
  toEmail: string;
  subject: string;
  textBody: string;
  htmlBody?: string | null;
  dedupeKey?: string | null;
}) {
  const create = {
    userId: input.userId || null,
    toEmail: input.toEmail.trim().toLowerCase(),
    subject: input.subject,
    textBody: input.textBody,
    htmlBody: input.htmlBody || null,
    dedupeKey: input.dedupeKey || null,
  };
  if (input.dedupeKey) {
    return prisma.emailOutbox.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create,
    });
  }
  return prisma.emailOutbox.create({ data: create });
}

let emailBatchRunning = false;
async function processEmailOutbox() {
  if (!smtpTransport || emailBatchRunning) return;
  emailBatchRunning = true;
  try {
    const messages = await prisma.emailOutbox.findMany({
      where: { status: "QUEUED", nextAttemptAt: { lte: new Date() }, attempts: { lt: 5 } },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    for (const message of messages) {
      const claimed = await prisma.emailOutbox.updateMany({
        where: { id: message.id, status: "QUEUED" },
        data: { status: "SENDING" },
      });
      if (!claimed.count) continue;
      try {
        await smtpTransport.sendMail({
          from: SMTP_FROM,
          to: message.toEmail,
          subject: message.subject,
          text: message.textBody || undefined,
          html: message.htmlBody || undefined,
        });
        await prisma.emailOutbox.update({
          where: { id: message.id },
          data: {
            status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null,
            // Reset links and other potentially sensitive content should not
            // remain in the database after successful delivery.
            textBody: null, htmlBody: null,
          },
        });
        if (message.dedupeKey?.startsWith("notification:")) {
          const notificationId = message.dedupeKey.slice("notification:".length);
          await prisma.notificationDelivery.updateMany({
            where: { notificationId, channel: "EMAIL" },
            data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
          });
        }
      } catch (error: any) {
        const attempts = message.attempts + 1;
        const lastError = String(error?.message || "Email delivery failed").slice(0, 500);
        await prisma.emailOutbox.update({
          where: { id: message.id },
          data: {
            status: attempts >= 5 ? "FAILED" : "QUEUED",
            attempts,
            lastError,
            nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
          },
        });
        if (message.dedupeKey?.startsWith("notification:")) {
          const notificationId = message.dedupeKey.slice("notification:".length);
          await prisma.notificationDelivery.updateMany({
            where: { notificationId, channel: "EMAIL" },
            data: { status: attempts >= 5 ? "FAILED" : "QUEUED", attempts: { increment: 1 }, lastError },
          });
        }
      }
    }
  } catch (error) {
    logger.error("Email outbox worker failed:", error);
  } finally {
    emailBatchRunning = false;
  }
}

async function createAuditLog(
  userId: string | null,
  userName: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  ipAddress: string | null,
  userAgent: string | null,
  severity: string = "INFO"
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action,
        entityType,
        entityId,
        description,
        ipAddress,
        userAgent,
        severity,
      }
    });
  } catch (err) {
    logger.error("Failed to create audit log:", err);
  }
}

// Recomputes a Budget's spentAmount/remainingAmount/status from its linked expenses'
// actual APPROVED/PAID/PARTIAL totals. Budget.spentAmount previously only ever
// changed via a manual admin PUT to /api/budgets/:id, so it silently drifted from
// the real, live expense totals shown in the financial reports as soon as any
// expense tied to the budget was approved or paid. Call this after any change to
// an expense's status or budgetId that could affect a budget's spend.
async function syncBudgetSpending(budgetId: string | null | undefined) {
  if (!budgetId) return;
  try {
    const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
    if (!budget) return;

    const counted = await prisma.expense.findMany({
      where: { budgetId, status: { in: ["APPROVED", "PAID", "PARTIAL"] } },
      select: { amount: true, taxAmount: true },
    });
    const spentAmount = counted.reduce((sum, expense) => sum + getExpenseGrossAmount(expense), 0);
    const remainingAmount = budget.allocatedAmount - spentAmount;

    let status = budget.status;
    if (status !== "ARCHIVED") {
      if (spentAmount > budget.allocatedAmount) status = "EXCEEDED";
      else if (spentAmount >= budget.allocatedAmount) status = "EXHAUSTED";
      else status = "ACTIVE";
    }

    await prisma.budget.update({
      where: { id: budgetId },
      data: { spentAmount, remainingAmount, status },
    });
  } catch (err) {
    logger.error("Failed to sync budget spending:", err);
  }
}

async function syncExpensePaymentStatus(expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { payments: true },
  });
  if (!expense) return null;

  const totalAmount = getExpenseGrossAmount(expense);
  const totalPaid = expense.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const latestPaymentDate = expense.payments.reduce<Date | null>((latest, payment) => {
    if (!latest || payment.paymentDate > latest) return payment.paymentDate;
    return latest;
  }, null);

  const status = totalPaid <= 0
    ? "APPROVED"
    : totalPaid >= totalAmount
      ? "PAID"
      : "PARTIAL";

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      status,
      paidDate: status === "PAID" ? latestPaymentDate : null,
    },
  });
}

function generatePaymentNumber(paymentDate = new Date()): string {
  const year = paymentDate.getUTCFullYear();
  const uniquePart = `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`.toUpperCase();
  return `PAY-${year}-${uniquePart}`;
}

// ─── JWT helpers ─────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  logger.error("FATAL: SESSION_SECRET must be set and at least 16 characters long.");
  process.exit(1);
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
  sessionId?: string;
  externalLearner?: boolean;
}

function signToken(payload: JwtPayload, rememberMe = false): string {
  // "Remember me" issues a longer-lived token so the session survives
  // browser restarts; the default stays short for shared computers.
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: rememberMe ? "30d" : "8h" });
}

function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}

async function verifyTokenSession(token: string): Promise<JwtPayload> {
  const payload = verifyToken(token);
  if (payload.externalLearner) throw new Error("Learning-only account");
  if (!payload.sessionId) throw new Error("Missing sessionId");

  const session = await prisma.authSession.findUnique({ where: { id: payload.sessionId } });
  if (!session || session.userId !== payload.userId || session.revokedAt || session.expiresAt <= new Date()) {
    throw new Error("Session revoked");
  }
  if (Date.now() - (session.lastSeenAt?.getTime() || 0) > 5 * 60 * 1000) {
    prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }

  return payload;
}

function hashSecurityToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const mfaEncryptionKey = crypto.createHash("sha256").update(`${JWT_SECRET}:mfa-secret`).digest();
function encryptMfaSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", mfaEncryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

function decryptMfaSecret(encrypted: string): string {
  const [ivValue, tagValue, ciphertextValue] = encrypted.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Invalid encrypted MFA secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", mfaEncryptionKey, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function createTotp(secret: string, email: string) {
  return new OTPAuth.TOTP({
    issuer: "MRLC LMS",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: 10 }, () => {
    const value = crypto.randomBytes(8).toString("hex").toUpperCase();
    return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`;
  });
  return { codes, hashes: codes.map((code) => hashSecurityToken(code.replaceAll("-", ""))) };
}

async function verifyAndConsumeMfaCode(input: {
  userId: string;
  email: string;
  encryptedSecret: string;
  recoveryCodeHashes: string[];
  code: string;
}): Promise<boolean> {
  const trimmed = input.code.trim();
  if (/^\d{6}$/.test(trimmed)) {
    const secret = decryptMfaSecret(input.encryptedSecret);
    return createTotp(secret, input.email).validate({ token: trimmed, window: 1 }) !== null;
  }

  const canonical = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const candidate = Buffer.from(hashSecurityToken(canonical), "hex");
  const index = input.recoveryCodeHashes.findIndex((stored) => {
    const expected = Buffer.from(stored, "hex");
    return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
  });
  if (index < 0) return false;
  await prisma.user.update({
    where: { id: input.userId },
    data: { mfaRecoveryCodeHashes: input.recoveryCodeHashes.filter((_, current) => current !== index) },
  });
  return true;
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
/**
 * Verifies the JWT from the Authorization header (Bearer <token>).
 * Sets req.user on success; returns 401 on failure.
 * NEVER trusts client-supplied role headers.
 */
async function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    const payload = verifyToken(token);
    if (payload.sessionId) {
      const session = await prisma.authSession.findUnique({ where: { id: payload.sessionId } });
      if (!session || session.userId !== payload.userId || session.revokedAt || session.expiresAt <= new Date()) {
        res.status(401).json({ error: "Unauthorized: Session expired or revoked" });
        return;
      }
      if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
        prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
      }
    }
    if (payload.externalLearner) {
      if (!isExternalLearnerApiRequestAllowed(req.method, req.originalUrl)) {
        res.status(403).json({ error: "This learner account can only access Learning Quest" });
        return;
      }
    }
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

function requirePermission(permission: Permission) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || !roleHasPermission(user.role, permission)) {
      res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      return;
    }
    next();
  };
}

// ─── Request body validation (zod) ────────────────────────────────────────────
// Validates and sanitizes req.body against a schema before the handler runs.
// On failure returns 400 with the first offending field, so bad input never
// reaches Prisma. Unknown keys are stripped.
function validate(schema: z.ZodType) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue?.path?.join(".") || "body";
      res.status(400).json({ error: `${where}: ${issue?.message || "invalid"}` });
      return;
    }
    req.body = result.data;
    next();
  };
}

// Reusable field primitives
const str = z.string().trim();
const reqStr = str.min(1, "is required");
const optStr = str.optional();
const nullableStr = str.nullable().optional(); // accepts string | null | undefined
const email = z.string().trim().email("must be a valid email");
const num = z.union([z.string(), z.number()]); // handlers coerce with Number()
// Required numeric fields (amounts, goals, installment counts, etc.) must be positive —
// without this, negative/zero values (e.g. a negative expense amount or donation) pass
// validation and corrupt financial totals downstream.
const reqNum = num.refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, { message: "must be a positive number" });
const optNum = num.optional().nullable();
const nonNegativeNum = num.refine(
  (v) => Number.isFinite(Number(v)) && Number(v) >= 0,
  { message: "must be a non-negative number" }
);
const optNonNegativeNum = nonNegativeNum.optional().nullable();
const positiveIntNum = num.refine(
  (v) => Number.isInteger(Number(v)) && Number(v) > 0,
  { message: "must be a positive whole number" }
);
const validDateStr = reqStr.refine((v) => !Number.isNaN(Date.parse(v)), { message: "must be a valid date" });
// Optional foreign-key ID fields (vendorId, budgetId, campaignId, etc.). Frontend
// "None" <SelectItem value=""> options submit an empty string rather than
// omitting the field, and while an empty string passes plain z.string()
// validation, it then hits the database as a real (non-null) foreign key value
// -- Postgres rejects it as a FK violation since no row has id: ''. Coercing ''
// (and null) to undefined here means Prisma just leaves the column unset/null,
// which is what "no vendor/budget/campaign selected" actually means.
const optionalId = z.string().trim().optional().nullable().transform((v) => (v ? v : undefined));
// Same problem for optional enum fields (paymentMethod, category, etc.) backed
// by a "None" select option -- z.enum() rejects '' outright, which was making
// every submission that left one of these unset fail validation with a 400
// before it ever reached the database.
const optEnumOrEmpty = <T extends [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal(""), z.null()]).optional().transform((v) => (v ? v : undefined));
const userRole = z.enum(["ADMIN", "TEACHER", "STUDENT", "STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"]);
const admissionStatus = z.enum([
  "SUBMITTED",
  "DOCUMENTS_PENDING",
  "INTERVIEW_SCHEDULED",
  "UNDER_REVIEW",
  "APPROVED",
  "WAITLISTED",
  "REJECTED",
  "ENROLLED",
  "WITHDRAWN",
]);
const checklistStatus = z.enum(["PENDING", "RECEIVED", "VERIFIED", "REJECTED", "NOT_REQUIRED"]);

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return Boolean(value);
}

function lockdownBrowserPolicy(profile?: Record<string, any> | null) {
  return {
    enabled: profile?.lockdownBrowserEnabled ?? true,
    requireFullscreen: profile?.lockdownRequireFullscreen ?? true,
    blockClipboard: profile?.lockdownBlockClipboard ?? true,
    blockContextMenu: profile?.lockdownBlockContextMenu ?? true,
    blockShortcuts: profile?.lockdownBlockShortcuts ?? true,
    autoSubmitOnViolation: profile?.lockdownAutoSubmitOnViolation ?? true,
    maxWarnings: Math.max(1, Number(profile?.lockdownMaxWarnings ?? 3)),
    instructions: profile?.lockdownInstructions || "",
  };
}

// Username: letters, numbers, dots, underscores, hyphens only (no @ so it can
// never collide in shape with an email address at the lookup layer).
const username = z.string().trim().min(3, "must be at least 3 characters").regex(/^[a-zA-Z0-9._-]+$/, "can only contain letters, numbers, dots, underscores, and hyphens");

const schemas = {
  // "identifier" accepts either an email address or a username so a single
  // login field can look up either kind of account.
  login: z.object({
    identifier: reqStr,
    password: z.string().min(1, "is required"),
    rememberMe: z.boolean().optional(),
    mfaCode: z.string().trim().min(6).max(32).optional(),
  }),
  publicLearnerSignup: z.object({
    firstName: z.string().trim().min(1, "is required").max(80, "is too long"),
    lastName: z.string().trim().min(1, "is required").max(80, "is too long"),
    email,
    password: z.string().min(8, "must be at least 8 characters").max(128, "is too long"),
    avatarId: z.string().refine(isLanguageQuestAvatarId, "must be an available learner avatar").optional(),
  }),
  forgotPassword: z.object({ identifier: reqStr }),
  resetPassword: z.object({
    token: z.string().min(32, "is invalid").max(256, "is invalid"),
    newPassword: z.string().min(8, "must be at least 8 characters").max(128, "is too long"),
  }),
  mfaPassword: z.object({ password: z.string().min(1, "is required") }),
  mfaCode: z.object({ code: z.string().trim().min(6).max(32) }),
  mfaDisable: z.object({ password: z.string().min(1), code: z.string().trim().min(6).max(32) }),
  verifyPassword: z.object({ password: z.string().min(1, "is required") }),
  changePassword: z.object({
    currentPassword: z.string().min(1, "is required"),
    newPassword: z.string().min(8, "must be at least 8 characters"),
  }),
  student: z.object({
    firstName: reqStr, lastName: reqStr,
    email: z.union([email, z.literal("")]).optional(),
    studentCode: optStr, preferredName: nullableStr, dateOfBirth: optStr,
    enrollmentDate: optStr,
    guardianName: optStr, guardianRelationship: nullableStr, guardianPhone: optStr,
    guardianEmail: nullableStr,
    contactNumber: optStr, country: optStr,
    identityType: optStr, identityNumber: optStr, legalDocumentationStatus: nullableStr,
    address: optStr,
    emergencyContact: optStr, emergencyContactName: nullableStr,
    emergencyContactPhone: nullableStr, emergencyContactRelationship: nullableStr,
    previousSchool: nullableStr, previousEducationLevel: nullableStr, educationLevel: nullableStr,
    medicalInformation: nullableStr, allergies: nullableStr, notes: optStr,
    classId: optStr, gender: optStr, status: optStr,
  }),
  userCreate: z.object({
    firstName: reqStr, lastName: reqStr, email,
    username: z.union([username, z.literal("")]).optional(),
    password: z.string().min(6, "must be at least 6 characters"),
    role: userRole,
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
    teacherId: nullableStr, studentId: nullableStr,
  }),
  userUpdate: z.object({
    firstName: optStr, lastName: optStr,
    email: z.union([email, z.literal("")]).optional(),
    username: z.union([username, z.literal("")]).optional(),
    role: userRole.optional(),
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
    teacherId: nullableStr, studentId: nullableStr,
  }),
  attendance: z.object({
    classId: reqStr,
    date: reqStr,
    timetableEntryId: optStr.optional(),  // For session-based attendance
    subjectId: optStr.optional(),         // Auto-populated from timetableEntry if provided
    records: z.array(z.object({
      studentId: reqStr,
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
      remarks: optStr.nullable(),
    })).min(1, "at least one record is required"),
  }),
  caseCreate: z.object({
    studentId: reqStr, title: reqStr, description: reqStr,
    priority: optStr, category: optStr,
  }),
  caseNote: z.object({ content: reqStr }),
  fee: z.object({
    studentId: reqStr,
    // Gross amount being charged, before any discount.
    totalAmount: num,
    // Optional discount taken off totalAmount (e.g. sibling/scholarship).
    discountAmount: optNum,
    // How much of the (post-discount) amount is being paid right now.
    // Omit to record it as fully paid (preserves the old one-step
    // behavior); a smaller value records a partial payment and leaves the
    // rest as an outstanding balance to be topped up later.
    amountPaid: optNum,
    paymentType: optStr, paymentMethod: optStr, paymentDate: optStr,
    billingMonth: optStr, dueDate: optStr,
    receiptNumber: optStr, notes: optStr,
  }),
  feePaymentTopUp: z.object({
    amount: reqNum,
    paymentDate: optStr, paymentMethod: optStr, notes: optStr,
  }),
  feePaymentVoid: z.object({
    reason: reqStr,
  }),
  feeStructureCreate: z.object({
    name: reqStr,
    description: nullableStr,
    academicYear: num,
    term: nullableStr,
    currency: z.string().length(3).optional().default("MYR"),
    effectiveFromDate: reqStr,
    effectiveToDate: nullableStr,
    applyToClasses: z.boolean().optional().default(false),
    applyToBoarders: z.boolean().optional().default(false),
    applyToDayStudents: z.boolean().optional().default(false),
    notes: nullableStr,
    tags: z.array(z.string()).optional().default([]),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional().default("DRAFT"),
  }),
  feeStructureUpdate: z.object({
    name: optStr,
    description: nullableStr,
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
    effectiveFromDate: optStr,
    effectiveToDate: nullableStr,
    notes: nullableStr,
    tags: z.array(z.string()).optional(),
  }),
  feeItemCreate: z.object({
    name: reqStr,
    description: nullableStr,
    amount: reqNum,
    currency: z.string().length(3).optional().default("MYR"),
    frequency: z.enum(["ONE_TIME", "MONTHLY", "TERMLY", "YEARLY"]).optional().default("ONE_TIME"),
    applicableTo: z.enum(["ALL", "BOARDING_STUDENTS", "DAY_STUDENTS"]).optional().default("ALL"),
    classIds: z.array(z.string()).optional().default([]),
    dueDate: nullableStr,
    dueDaysAfterStart: optNum,
    budgetId: nullableStr,
    order: optNum,
    isActive: z.boolean().optional().default(true),
  }),
  feeItemUpdate: z.object({
    name: optStr,
    description: nullableStr,
    amount: optNum,
    frequency: z.enum(["ONE_TIME", "MONTHLY", "TERMLY", "YEARLY"]).optional(),
    applicableTo: z.enum(["ALL", "BOARDING_STUDENTS", "DAY_STUDENTS"]).optional(),
    classIds: z.array(z.string()).optional(),
    dueDate: nullableStr,
    order: optNum,
    isActive: z.boolean().optional(),
  }),
  feeDiscountCreate: z.object({
    name: reqStr,
    description: nullableStr,
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "SIBLING_DISCOUNT", "SCHOLARSHIP", "EARLY_PAYMENT"]),
    value: reqNum,
    applyToAllStructures: z.boolean().optional().default(false),
    feeStructureIds: z.array(z.string()).optional().default([]),
    classIds: z.array(z.string()).optional().default([]),
    minSiblings: optNum,
    requireBoarding: z.boolean().optional().default(false),
    minGpa: optNum,
    validFrom: reqStr,
    validTo: nullableStr,
    isActive: z.boolean().optional().default(true),
  }),
  feePaymentPlanCreate: z.object({
    name: reqStr,
    description: nullableStr,
    feeStructureId: reqStr,
    studentId: reqStr,
    totalAmount: reqNum,
    currency: z.string().length(3).optional().default("MYR"),
    numberOfInstallments: reqNum,
    installmentFrequency: z.string().optional().default("MONTHLY"),
    firstInstallmentDue: reqStr,
    notes: nullableStr,
  }),
  donorCreate: z.object({
    name: reqStr,
    email: nullableStr,
    phone: nullableStr,
    organization: nullableStr,
    donorType: z.enum(["INDIVIDUAL", "ORGANIZATION", "ALUMNUS", "PARENT", "GRANT_AGENCY"]).optional().default("INDIVIDUAL"),
    category: nullableStr,
    address: nullableStr,
    city: nullableStr,
    state: nullableStr,
    postalCode: nullableStr,
    country: z.string().optional().default("Malaysia"),
    preferredContact: z.string().optional().default("EMAIL"),
    doNotContact: z.boolean().optional().default(false),
    taxId: nullableStr,
    receiptPreference: z.string().optional().default("EMAIL"),
    notes: nullableStr,
    tags: z.array(z.string()).optional().default([]),
  }),
  donationCreate: z.object({
    donorId: reqStr,
    amount: reqNum,
    currency: z.string().length(3).optional().default("MYR"),
    donationType: z.enum(["ONE_TIME", "RECURRING_MONTHLY", "RECURRING_QUARTERLY", "RECURRING_YEARLY", "IN_KIND"]).optional().default("ONE_TIME"),
    purpose: nullableStr,
    designation: nullableStr,
    campaignId: optionalId,
    paymentMethod: nullableStr,
    paymentReference: nullableStr,
    donationDate: reqStr,
    isTaxDeductible: z.boolean().optional().default(true),
    taxReceiptAmount: optNum,
    notes: nullableStr,
  }),
  donationUpdate: z.object({
    donorId: optionalId,
    amount: optNum,
    currency: z.string().length(3).optional(),
    donationType: z.enum(["ONE_TIME", "RECURRING_MONTHLY", "RECURRING_QUARTERLY", "RECURRING_YEARLY", "IN_KIND"]).optional(),
    status: z.enum(["PENDING", "RECEIVED", "PROCESSED", "CANCELLED", "REFUNDED"]).optional(),
    purpose: nullableStr,
    designation: nullableStr,
    campaignId: optionalId,
    paymentMethod: nullableStr,
    paymentReference: nullableStr,
    donationDate: optStr,
    receivedDate: optStr,
    processedDate: optStr,
    isTaxDeductible: z.boolean().optional(),
    notes: nullableStr,
  }),
  campaignCreate: z.object({
    name: reqStr,
    description: nullableStr,
    goalAmount: reqNum,
    currency: z.string().length(3).optional().default("MYR"),
    startDate: reqStr,
    endDate: reqStr,
    targetAudience: nullableStr,
    coverImage: nullableStr,
    notes: nullableStr,
    tags: z.array(z.string()).optional().default([]),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional().default("DRAFT"),
  }),
  campaignUpdate: z.object({
    name: optStr,
    description: nullableStr,
    goalAmount: optNum,
    endDate: optStr,
    targetAudience: nullableStr,
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
    raisedAmount: optNum,
    notes: nullableStr,
    tags: z.array(z.string()).optional(),
  }),
  department: z.object({
    name: reqStr, code: nullableStr, description: nullableStr,
  }),
  designation: z.object({
    title: reqStr, departmentId: nullableStr,
  }),
  employee: z.object({
    firstName: reqStr, lastName: reqStr,
    email: z.union([email, z.literal("")]).optional(),
    phone: optStr, status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).optional(),
    departmentId: nullableStr, designationId: nullableStr,
    baseSalary: optNonNegativeNum, currency: z.string().trim().length(3).optional(), hireDate: validDateStr.optional(),
  }),
  employeeUpdate: z.object({
    firstName: optStr, lastName: optStr,
    email: z.union([email, z.literal("")]).optional(),
    phone: nullableStr, status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).optional(),
    departmentId: nullableStr, designationId: nullableStr,
    baseSalary: optNonNegativeNum, currency: z.string().trim().length(3).optional(), hireDate: validDateStr.optional(),
    terminationDate: z.union([validDateStr, z.literal(""), z.null()]).optional(),
  }),
  payrollRun: z.object({
    periodYear: positiveIntNum, periodMonth: positiveIntNum, notes: optStr,
  }),
  payrollStatus: z.object({
    status: z.enum(["DRAFT", "APPROVED", "PAID"]),
  }),
  payrollRunUpdate: z.object({
    periodYear: positiveIntNum.optional(), periodMonth: positiveIntNum.optional(), notes: nullableStr,
  }),
  payslipUpdate: z.object({
    baseSalary: optNonNegativeNum, allowances: optNonNegativeNum, deductions: optNonNegativeNum, notes: nullableStr,
  }),
  leaveType: z.object({
    name: reqStr, daysPerYear: optNonNegativeNum, paid: z.boolean().optional(),
  }),
  leaveRequest: z.object({
    employeeId: reqStr, leaveTypeId: reqStr,
    startDate: validDateStr, endDate: validDateStr, reason: optStr,
  }),
  leaveDecision: z.object({
    status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
    reviewNote: optStr,
  }),
  exam: z.object({
    title: z.string().trim().min(1, "title is required").max(200), classId: reqStr, subjectId: reqStr,
    examType: z.enum(["QUIZ", "MIDTERM", "FINAL", "MOCK"]).optional(),
    duration: z.coerce.number().int().min(1).nullable().optional(),
    totalMarks: z.coerce.number().min(0).nullable().optional(),
    status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "CLOSED", "ARCHIVED", "PUBLISHED"]).optional(),
    settings: z.any().optional(),
    questions: z.array(z.object({
      questionText: optStr,
      type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY", "MCQ", "WRITTEN", "GED_RLA_PASSAGE", "GED_MATH", "GED_SCIENCE", "GED_SOCIAL_STUDIES", "DRAG_DROP", "DROPDOWN", "HOTSPOT", "EXTENDED"]).optional(),
      points: z.coerce.number().min(1).optional(),
      choices: z.any().optional(), correctAnswer: z.any().optional(),
      correctAnswers: z.any().optional(),
      partialCredit: z.boolean().optional(),
      passageText: optStr.optional().nullable(),
      explanation: optStr.optional().nullable(),
      imageUrl: nullableStr,
    })).optional(),
  }),
  examSubmit: z.object({
    answers: z.record(z.string(), z.string()).optional(),
    integrityEvents: z.array(z.object({
      type: reqStr,
      message: optStr,
      at: reqStr,
    })).optional(),
    securityWarnings: z.number().int().min(0).optional(),
    autoSubmitted: z.boolean().optional(),
  }),
  examGrade: z.object({
    answers: z.array(z.object({
      answerId: reqStr,
      pointsAwarded: z.union([z.string(), z.number()]).nullable(),
      isCorrect: z.boolean().nullable().optional(),
    })).min(1, "at least one answer grade is required"),
  }),
  classCreate: z.object({
    name: reqStr, level: reqStr, academicYear: reqStr,
    description: optStr, room: optStr, capacity: optNum, status: optStr,
  }),
  teacherCreate: z.object({
    firstName: reqStr, lastName: reqStr, email,
    phone: optStr, gender: optStr, address: optStr,
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "VOLUNTEER"]).optional(), joinedDate: optStr,
    subjects: z.union([z.array(z.string()), optStr]).optional(), notes: optStr,
    baseSalary: optNum,
  }),
  library: z.object({
    title: reqStr, type: reqStr,
    description: nullableStr, visibility: nullableStr, classId: nullableStr,
    subjectId: nullableStr, externalUrl: nullableStr,
  }),
  video: z.object({
    title: reqStr, videoUrl: reqStr,
    description: nullableStr, thumbnailUrl: nullableStr, captionsUrl: nullableStr, duration: optNum,
    classId: nullableStr, subjectId: nullableStr, visibility: nullableStr,
    status: nullableStr, uploadedByName: nullableStr,
    isRequired: z.union([z.boolean(), z.string()]).optional(), dueDate: nullableStr,
  }),
  bookLoan: z.object({
    borrowerName: reqStr, dueDate: reqStr,
    borrowerType: optStr, studentId: optStr, notes: optStr,
  }),

  // ── Update / additional schemas (fields optional for partial PUTs) ──
  studentUpdate: z.object({
    firstName: optStr, lastName: optStr,
    email: z.union([email, z.literal("")]).optional(),
    studentCode: optStr, preferredName: nullableStr, dateOfBirth: optStr,
    enrollmentDate: optStr,
    guardianName: optStr, guardianRelationship: nullableStr, guardianPhone: optStr,
    guardianEmail: nullableStr,
    contactNumber: optStr, country: optStr,
    identityType: optStr, identityNumber: optStr, legalDocumentationStatus: nullableStr,
    address: optStr,
    emergencyContact: optStr, emergencyContactName: nullableStr,
    emergencyContactPhone: nullableStr, emergencyContactRelationship: nullableStr,
    previousSchool: nullableStr, previousEducationLevel: nullableStr, educationLevel: nullableStr,
    medicalInformation: nullableStr, allergies: nullableStr, notes: optStr,
    classId: optStr, gender: optStr, status: optStr,
  }),
  subjectCreate: z.object({
    name: reqStr, code: reqStr, level: optStr, description: optStr, status: optStr,
  }),
  subjectUpdate: z.object({
    name: optStr, code: optStr, level: optStr, description: optStr, status: optStr,
  }),
  libraryUpdate: z.object({
    title: optStr, type: optStr, description: nullableStr, visibility: nullableStr,
    classId: nullableStr, subjectId: nullableStr, externalUrl: nullableStr,
  }),
  videoUpdate: z.object({
    title: optStr, description: nullableStr, videoUrl: optStr, thumbnailUrl: nullableStr, captionsUrl: nullableStr,
    duration: optNum, classId: nullableStr, subjectId: nullableStr, visibility: nullableStr, status: nullableStr,
    isRequired: z.union([z.boolean(), z.string()]).optional(), dueDate: nullableStr,
  }),
  bookCreate: z.object({
    title: reqStr, author: optStr, isbn: optStr, publisher: optStr,
    publishedYear: optNum, category: optStr, language: optStr, edition: optStr,
    shelfLocation: optStr, description: optStr, coverUrl: optStr, totalCopies: optNum,
  }),
  bookUpdate: z.object({
    title: optStr, author: optStr, isbn: optStr, publisher: optStr,
    publishedYear: optNum, category: optStr, language: optStr, edition: optStr,
    shelfLocation: optStr, description: optStr, coverUrl: optStr, totalCopies: optNum,
  }),
  ebookUpdate: z.object({
    title: optStr, author: optStr, description: optStr, category: optStr,
    seriesName: optStr, seriesNumber: z.union([z.number().int().positive(), z.string()]).optional().nullable(),
    language: optStr, coverUrl: optStr,
    visibility: z.enum(["ALL", "STUDENTS", "TEACHERS_ONLY"]).optional(),
    downloadAllowed: z.union([z.boolean(), z.string()]).optional(),
  }),
  admissionApplication: z.object({
    applicantName: reqStr,
    preferredName: optStr,
    email: z.union([email, z.literal("")]).optional(),
    dateOfBirth: optStr,
    gender: optStr,
    address: optStr,
    targetClassId: nullableStr,
    previousSchool: optStr,
    previousEducationLevel: optStr,
    previousEducationNotes: optStr,
    guardianName: optStr,
    guardianRelationship: optStr,
    guardianPhone: optStr,
    guardianEmail: z.union([email, z.literal("")]).optional(),
    emergencyContactName: optStr,
    emergencyContactPhone: optStr,
    emergencyContactRelationship: optStr,
    contactNumber: optStr,
    country: optStr,
    targetLevel: optStr,
    identityType: optStr,
    identityNumber: optStr,
    legalDocumentationStatus: optStr,
    boardingType: optStr,
    medicalInformation: optStr,
    allergies: optStr,
    medicationNotes: optStr,
    interviewAt: optStr,
    interviewMode: optStr,
    interviewLocation: optStr,
    interviewNotes: optStr,
    status: admissionStatus.optional(),
    priority: optStr,
    notes: optStr,
  }),
  admissionStatusUpdate: z.object({
    status: admissionStatus,
    notes: optStr,
  }),
  admissionInterview: z.object({
    interviewAt: reqStr,
    interviewMode: optStr,
    interviewLocation: optStr,
    interviewNotes: optStr,
  }),
  admissionDecision: z.object({
    status: z.enum(["APPROVED", "WAITLISTED", "REJECTED"]),
    decisionNotes: optStr,
  }),
  admissionDocument: z.object({
    title: reqStr,
    documentType: optStr,
    checklistStatus: checklistStatus.optional(),
    notes: optStr,
  }),
  admissionConvert: z.object({
    classId: nullableStr,
    enrollmentDate: optStr,
    studentCode: optStr,
    password: z.string().min(8, "must be at least 8 characters").optional(),
  }),
  calendarEvent: z.object({
    title: reqStr,
    eventType: optStr,
    startDate: reqStr,
    endDate: optStr,
    audience: optStr,
    location: optStr,
    notes: optStr,
  }),
  assignment: z.object({
    title: reqStr,
    description: optStr,
    classId: nullableStr,
    subjectId: nullableStr,
    dueDate: optStr,
    status: optStr,
  }),
  certificateRecord: z.object({
    studentId: nullableStr,
    studentName: reqStr,
    certificateType: reqStr,
    issueDate: optStr,
    status: optStr,
    referenceNo: optStr,
    notes: optStr,
  }),
  communicationLog: z.object({
    title: reqStr,
    channel: optStr,
    audience: optStr,
    contactName: optStr,
    contactInfo: optStr,
    message: reqStr,
    followUpDate: optStr,
    status: optStr,
  }),
  inventoryItem: z.object({
    name: reqStr,
    category: optStr,
    quantity: optNum,
    condition: optStr,
    location: optStr,
    assignedTo: optStr,
    notes: optStr,
  }),
  settingsUpdate: z.object({
    name: optStr, address: optStr, email: optStr, phone: optStr,
    shortName: optStr, website: optStr, academicYear: optStr, principalName: optStr, description: optStr,
    logoUrl: nullableStr, signatureUrl: nullableStr, loginHeroUrl: nullableStr, primaryColor: optStr, accentColor: optStr,
    darkModeDefault: z.union([z.boolean(), z.string()]).optional(),
    reportHeaderStyle: optStr,
    timezone: optStr,
    dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
    timeFormat: z.enum(["12", "24"]).optional(),
    clockShowSeconds: z.union([z.boolean(), z.string()]).optional(),
    currency: optStr, defaultLanguage: optStr,
    fileUploadLimitMb: optNum,
    backupEnabled: z.union([z.boolean(), z.string()]).optional(),
    lockdownBrowserEnabled: z.union([z.boolean(), z.string()]).optional(),
    lockdownRequireFullscreen: z.union([z.boolean(), z.string()]).optional(),
    lockdownBlockClipboard: z.union([z.boolean(), z.string()]).optional(),
    lockdownBlockContextMenu: z.union([z.boolean(), z.string()]).optional(),
    lockdownBlockShortcuts: z.union([z.boolean(), z.string()]).optional(),
    lockdownAutoSubmitOnViolation: z.union([z.boolean(), z.string()]).optional(),
    lockdownMaxWarnings: optNum,
    lockdownInstructions: nullableStr,
    cursorEffect: optStr,
  }),
  // The TimetableForm frontend (src/components/timetable/TimetableForm.tsx,
  // handleEnrichedSubmit) deliberately sends `null` -- not just omits the
  // field -- for every value that doesn't apply to the chosen scheduleType/
  // recurrence (e.g. eventDate is null for recurring slots, effectiveFrom/
  // effectiveUntil are null for one-time slots, className/subjectName/
  // substituteTeacherName are null for non-class schedule types like
  // "School holiday"). Every field the form can send as null must accept
  // null here (nullableStr), not just optStr (undefined-only) -- otherwise
  // Zod rejects the request with "expected string, received null" before it
  // ever reaches the route handler, even though the handler itself already
  // normalizes null values correctly downstream.
  timetable: z.object({
    classId: nullableStr,
    className: nullableStr,
    subjectId: nullableStr,
    subjectName: nullableStr,
    subjectColor: optStr,
    teacherId: nullableStr,
    teacherName: nullableStr,
    substituteTeacherId: nullableStr,
    substituteTeacherName: nullableStr,
    academicYear: optStr,
    term: optStr,
    dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "must be HH:mm"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "must be HH:mm"),
    room: nullableStr,
    scheduleType: z.enum(["CLASS", "HOLIDAY", "SPECIAL_EVENT", "EXAM", "MEETING"]).optional(),
    recurrence: z.enum(["ONCE", "WEEKLY", "BIWEEKLY"]).optional(),
    effectiveFrom: nullableStr,
    effectiveUntil: nullableStr,
    eventDate: nullableStr,
    notes: optStr,
  }),
  timetableUpdate: z.object({
    classId: nullableStr,
    className: nullableStr,
    subjectId: nullableStr,
    subjectName: nullableStr,
    subjectColor: optStr,
    teacherId: nullableStr,
    teacherName: nullableStr,
    substituteTeacherId: nullableStr,
    substituteTeacherName: nullableStr,
    academicYear: optStr,
    term: optStr,
    dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]).optional(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "must be HH:mm").optional(),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "must be HH:mm").optional(),
    room: nullableStr,
    scheduleType: z.enum(["CLASS", "HOLIDAY", "SPECIAL_EVENT", "EXAM", "MEETING"]).optional(),
    recurrence: z.enum(["ONCE", "WEEKLY", "BIWEEKLY"]).optional(),
    effectiveFrom: nullableStr,
    effectiveUntil: nullableStr,
    eventDate: nullableStr,
    status: z.enum(["ACTIVE", "CANCELLED", "SUBSTITUTED"]).optional(),
    cancellationReason: nullableStr,
    notes: optStr,
  }),
  timetableSubstitution: z.object({
    substituteTeacherId: reqStr,
    substituteTeacherName: optStr,
    notes: optStr,
  }),
  timetableCancellation: z.object({
    reason: optStr,
  }),

  // ── Expense Management Schemas ───────────────────────────────────────────────
  expenseCreate: z.object({
    title: reqStr,
    description: nullableStr,
    category: z.enum(["OPERATIONAL", "ACADEMIC", "STAFF_COSTS", "FOOD_CATERING", "TRANSPORTATION", "FACILITY", "TECHNOLOGY", "EVENT", "ADMINISTRATIVE", "OTHER"]),
    amount: reqNum,
    currency: z.string().length(3).optional().default("MYR"),
    taxAmount: optNonNegativeNum,
    expenseDate: validDateStr,
    dueDate: validDateStr.optional(),
    vendorId: optionalId,
    vendorInvoiceNo: nullableStr,
    paymentMethod: optEnumOrEmpty(["CASH", "BANK_TRANSFER", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "ONLINE_PAYMENT", "WIRE_TRANSFER", "OTHER"]),
    budgetId: optionalId,
    academicYear: nullableStr,
    term: nullableStr,
    notes: nullableStr,
    tags: z.array(z.string()).optional().default([]),
    attachmentUrls: z.array(z.string()).optional().default([]),
    departmentId: nullableStr,
    relatedClassId: nullableStr,
    relatedSubjectId: nullableStr,
  }).refine((v) => !v.dueDate || new Date(v.dueDate) >= new Date(v.expenseDate), {
    message: "must be on or after expenseDate", path: ["dueDate"],
  }),
  expenseUpdate: z.object({
    title: optStr,
    description: nullableStr,
    category: z.enum(["OPERATIONAL", "ACADEMIC", "STAFF_COSTS", "FOOD_CATERING", "TRANSPORTATION", "FACILITY", "TECHNOLOGY", "EVENT", "ADMINISTRATIVE", "OTHER"]).optional(),
    amount: reqNum.optional().nullable(),
    currency: z.string().length(3).optional(),
    taxAmount: optNonNegativeNum,
    expenseDate: validDateStr.optional(),
    dueDate: z.union([validDateStr, z.literal(""), z.null()]).optional(),
    vendorId: optionalId,
    vendorInvoiceNo: nullableStr,
    paymentMethod: optEnumOrEmpty(["CASH", "BANK_TRANSFER", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "ONLINE_PAYMENT", "WIRE_TRANSFER", "OTHER"]),
    budgetId: optionalId,
    notes: nullableStr,
    tags: z.array(z.string()).optional(),
    attachmentUrls: z.array(z.string()).optional(),
  }),
  expenseSubmit: z.object({}),
  expenseApprove: z.object({
    notes: nullableStr,
  }),
  expenseReject: z.object({
    reason: reqStr,
  }),
  expensePay: z.object({
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "ONLINE_PAYMENT", "WIRE_TRANSFER", "OTHER"]),
    paymentReference: nullableStr,
    bankAccount: nullableStr,
    paymentDate: validDateStr.optional(),
    receiptUrl: nullableStr,
    notes: nullableStr,
  }),
  billPaymentCreate: z.object({
    expenseId: reqStr,
    amount: reqNum,
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "ONLINE_PAYMENT", "WIRE_TRANSFER", "OTHER"]),
    paymentReference: nullableStr,
    bankAccount: nullableStr,
    paymentDate: validDateStr.optional(),
    receiptUrl: nullableStr,
    notes: nullableStr,
  }),
  billPaymentUpdate: z.object({
    amount: reqNum.optional(),
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "ONLINE_PAYMENT", "WIRE_TRANSFER", "OTHER"]).optional(),
    paymentReference: nullableStr,
    bankAccount: nullableStr,
    paymentDate: validDateStr.optional(),
    receiptUrl: nullableStr,
    notes: nullableStr,
    approved: z.boolean().optional(),
  }),
  vendorCreate: z.object({
    name: reqStr,
    description: nullableStr,
    contactPerson: nullableStr,
    email: nullableStr,
    phone: nullableStr,
    website: nullableStr,
    address: nullableStr,
    city: nullableStr,
    state: nullableStr,
    postalCode: nullableStr,
    country: z.string().optional().default("Malaysia"),
    taxId: nullableStr,
    bankName: nullableStr,
    bankAccount: nullableStr,
    paymentTerms: nullableStr,
    category: nullableStr,
    tags: z.array(z.string()).optional().default([]),
    notes: nullableStr,
  }),
  vendorUpdate: z.object({
    name: optStr,
    description: nullableStr,
    contactPerson: nullableStr,
    email: nullableStr,
    phone: nullableStr,
    website: nullableStr,
    address: nullableStr,
    city: nullableStr,
    state: nullableStr,
    postalCode: nullableStr,
    country: z.string().optional(),
    taxId: nullableStr,
    bankName: nullableStr,
    bankAccount: nullableStr,
    paymentTerms: nullableStr,
    category: nullableStr,
    isActive: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    notes: nullableStr,
  }),
  recurringExpenseCreate: z.object({
    title: reqStr,
    description: nullableStr,
    category: z.enum(["OPERATIONAL", "ACADEMIC", "STAFF_COSTS", "FOOD_CATERING", "TRANSPORTATION", "FACILITY", "TECHNOLOGY", "EVENT", "ADMINISTRATIVE", "OTHER"]),
    amount: reqNum,
    currency: z.string().length(3).optional().default("MYR"),
    taxAmount: optNonNegativeNum,
    vendorId: optionalId,
    frequency: z.enum(["DAILY", "WEEKLY", "BI_WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUALLY", "ANNUALLY"]),
    startDate: reqStr,
    endDate: optStr,
    dayOfMonth: z.number().int().min(-1).max(31).nullable().optional(),
    occurrenceCount: z.number().int().positive().nullable().optional(),
    paymentMethod: optEnumOrEmpty(["CASH", "BANK_TRANSFER", "CHECK"]),
    budgetId: optionalId,
    notes: nullableStr,
    tags: z.array(z.string()).optional().default([]),
  }),
  budgetCreate: z.object({
    name: reqStr,
    code: nullableStr,
    description: nullableStr,
    fiscalYear: z.number().int().positive(),
    startDate: validDateStr,
    endDate: validDateStr,
    allocatedAmount: reqNum,
    currency: z.string().length(3).optional().default("MYR"),
    category: optEnumOrEmpty(["OPERATIONAL", "ACADEMIC", "STAFF_COSTS", "FOOD_CATERING", "TRANSPORTATION", "FACILITY", "TECHNOLOGY", "EVENT", "ADMINISTRATIVE", "OTHER"]),
    departmentId: optionalId,
    alertThreshold: z.number().min(0).max(1).optional().default(0.8),
    strictLimit: z.boolean().optional().default(false),
    notes: nullableStr,
    tags: z.array(z.string()).optional().default([]),
  }).refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: "must be on or after startDate", path: ["endDate"],
  }),
  budgetUpdate: z.object({
    name: optStr,
    code: nullableStr,
    description: nullableStr,
    fiscalYear: z.number().int().positive().optional(),
    startDate: validDateStr.optional(),
    endDate: validDateStr.optional(),
    allocatedAmount: reqNum.optional(),
    currency: z.string().length(3).optional(),
    category: optEnumOrEmpty(["OPERATIONAL", "ACADEMIC", "STAFF_COSTS", "FOOD_CATERING", "TRANSPORTATION", "FACILITY", "TECHNOLOGY", "EVENT", "ADMINISTRATIVE", "OTHER"]),
    departmentId: optionalId,
    status: z.enum(["ACTIVE", "EXHAUSTED", "EXCEEDED", "ARCHIVED"]).optional(),
    alertThreshold: z.number().min(0).max(1).optional(),
    strictLimit: z.boolean().optional(),
    notes: nullableStr,
    tags: z.array(z.string()).optional(),
  }),

  // ── Student Duty System Schemas ─────────────────────────────────────────────
  dutyDefinitionCreate: z.object({
    name: reqStr,
    type: z.enum(["COOKING", "RESOURCE_BUYING", "CLEANING", "DISH_WASHING", "GARDENING", "MAINTENANCE", "SECURITY", "EVENT_SETUP", "OTHER"]),
    description: nullableStr,
    durationMinutes: optNum,
    requiredStudents: z.number().int().positive().optional().default(1),
    pointsAwarded: z.number().int().min(0).optional().default(1),
    isActive: z.boolean().optional().default(true),
    notes: nullableStr,
  }),
  dutyDefinitionUpdate: z.object({
    name: optStr,
    type: z.enum(["COOKING", "RESOURCE_BUYING", "CLEANING", "DISH_WASHING", "GARDENING", "MAINTENANCE", "SECURITY", "EVENT_SETUP", "OTHER"]).optional(),
    description: nullableStr,
    durationMinutes: optNum,
    requiredStudents: z.number().int().positive().optional(),
    pointsAwarded: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    notes: nullableStr,
  }),
  dutyRosterCreate: z.object({
    name: reqStr,
    periodType: z.enum(["WEEKLY", "MONTHLY", "TERMLY"]).optional().default("WEEKLY"),
    startDate: reqStr,
    endDate: reqStr,
    maxWeeklyDuties: z.number().int().positive().optional().default(5),
    notes: nullableStr,
  }),
  dutyRosterUpdate: z.object({
    name: optStr,
    periodType: z.enum(["WEEKLY", "MONTHLY", "TERMLY"]).optional(),
    startDate: optStr,
    endDate: optStr,
    status: z.enum(["DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
    maxWeeklyDuties: z.number().int().positive().optional(),
    notes: nullableStr,
  }),
  dutyAssignmentCreate: z.object({
    rosterId: reqStr,
    dutyDefinitionId: reqStr,
    studentId: reqStr,
    scheduledDate: reqStr,
    notes: nullableStr,
  }),
  dutyAssignmentUpdate: z.object({
    status: z.enum(["ASSIGNED", "IN_PROGRESS", "COMPLETED", "SKIPPED", "EXCUSED", "FAILED"]).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    scheduledDate: optStr,
    notes: nullableStr,
  }),
  dutyAutoAssign: z.object({
    studentIds: z.array(z.string()).min(1, "select at least one student"),
    dutyDefinitionIds: z.array(z.string()).min(1, "select at least one duty"),
  }),
};

// ─── Server bootstrap ─────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
  const isProduction = process.env.NODE_ENV === "production";

  // Trust the first proxy hop (Cloud Run / reverse proxy) so that req.ip and
  // express-rate-limit see the real client IP instead of the proxy's address.
  // Without this, all traffic shares one IP and rate limiting blocks everyone.
  app.set("trust proxy", 1);

  // Compress HTML, API responses, and frontend assets at the application edge.
  // A moderate Brotli quality keeps response sizes low without making Node spend
  // excessive CPU on content that Cloudflare may cache after the first request.
  app.use(
    compression({
      threshold: 1024,
      brotli: {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
        },
      },
      filter: (req, res) => {
        const contentType = res.getHeader("Content-Type");
        const isEventStream =
          req.headers.accept?.includes("text/event-stream") ||
          (typeof contentType === "string" && contentType.includes("text/event-stream"));

        return !isEventStream && compression.filter(req, res);
      },
    })
  );

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(
    helmet({
      // In production use a CSP tuned for what the app actually loads:
      // Google Fonts, data/https images & logos, YouTube/Vimeo embeds, inline
      // styles (React style props), and blob: for the PDF/EPUB reader.
      // `upgrade-insecure-requests` is disabled so plain-HTTP LAN deployments work.
      contentSecurityPolicy: isProduction
        ? {
            useDefaults: true,
            directives: {
              "default-src": ["'self'"],
              "script-src": ["'self'", "https://static.cloudflareinsights.com"],
              "style-src": ["'self'", "'unsafe-inline'", "blob:", "https://fonts.googleapis.com"],
              "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
              "img-src": ["'self'", "data:", "https:", "blob:"],
              "media-src": ["'self'", "https:", "blob:"],
              "connect-src": ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
              "worker-src": ["'self'", "blob:"],
              "frame-src": [
                "'self'",
                "blob:",
                "https://www.youtube.com",
                "https://www.youtube-nocookie.com",
                "https://player.vimeo.com",
                "https://the-mon-language.web.app",
              ],
              "object-src": ["'self'", "blob:", "data:"],
              "upgrade-insecure-requests": null,
            },
          }
        : false, // relax in dev so Vite HMR works
      crossOriginEmbedderPolicy: false,
      // Allow the SPA to embed cross-origin media (YouTube/Vimeo) without COEP blocking.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // Keep xFrameOptions on (default is SAMEORIGIN) — blocks clickjacking
    })
  );

  // ── CORS ────────────────────────────────────────────────────────────────────
  // Restrict to the configured APP_URL; never allow all origins
  app.use(
    cors({
      origin: process.env.APP_URL || "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  const setPassiveUploadHeaders = (res: express.Response) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
  };
  app.use("/uploads/branding", express.static(BRANDING_ASSET_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
    setHeaders: setPassiveUploadHeaders,
  }));
  app.use("/uploads/profile-photos", express.static(PROFILE_PHOTO_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
    setHeaders: setPassiveUploadHeaders,
  }));
  app.use("/uploads/homework-media", express.static(HOMEWORK_MEDIA_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  app.use("/uploads/exam-media", express.static(EXAM_MEDIA_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
    setHeaders: setPassiveUploadHeaders,
  }));
  app.use("/uploads/chat-media", express.static(CHAT_MEDIA_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  app.use("/uploads/stickers", express.static(STICKER_UPLOAD_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
    setHeaders: setPassiveUploadHeaders,
  }));
  // Social photos may contain minors and class-only activity. Authenticate the
  // native <img> request with a narrowly-scoped httpOnly cookie and enforce the
  // same audience rules as the JSON feed before serving the file.
  app.use("/uploads/social", async (req, res, next) => {
    let jwtUser: JwtPayload;
    try {
      jwtUser = await verifyTokenSession(String(req.cookies?.social_media_token || ""));
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const filename = req.path.replace(/^\/+/, "");
    if (!filename || filename !== path.basename(filename)) {
      res.status(400).json({ error: "Invalid social image" });
      return;
    }

    try {
      const url = `/uploads/social/${filename}`;
      // Match either the denormalised cover (imageUrl) or any attached asset.
      // Both point back to the same SocialPost, whose audience/expiry governs
      // access; assets cascade-delete with the post so a stale URL just 404s.
      const post = await (prisma as any).socialPost.findFirst({
        where: { OR: [{ imageUrl: url }, { media: { some: { url } } }] },
        select: { audience: true, classId: true, publishStatus: true, expiresAt: true },
      });
      if (!post || post.publishStatus !== "PUBLISHED" || (post.expiresAt && new Date(post.expiresAt) <= new Date())) {
        res.status(404).json({ error: "Social image not found" });
        return;
      }

      let viewerClassIds: string[] = [];
      if (post.audience === "CLASS" && post.classId) {
        if (jwtUser.role === "TEACHER") {
          const teacher = await prisma.teacher.findUnique({ where: { userId: jwtUser.userId }, include: { classes: true } });
          viewerClassIds = teacher?.classes.map((row) => row.classId) ?? [];
        } else if (jwtUser.role === "STUDENT") {
          const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId }, select: { classId: true } });
          viewerClassIds = student?.classId ? [student.classId] : [];
        }
      }
      const allowed = canViewSocialAudience({
        role: jwtUser.role,
        audience: post.audience,
        postClassId: post.classId,
        viewerClassIds,
      });
      if (!allowed) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    } catch (err) {
      logger.error("Error authorizing social image:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }, express.static(SOCIAL_DIR, {
    maxAge: isProduction ? "1h" : 0,
    immutable: false,
  }));
  // Uploaded library files (PDFs/docs/images) are not public static content.
  // Authenticate via the scoped httpOnly library_media_token cookie (native
  // <a>/<img> requests can't send a Bearer header), then enforce the resource's
  // visibility — students must never read TEACHERS_ONLY uploads, even if they
  // guess the UUID filename.
  app.use("/uploads/library", async (req, res, next) => {
    let jwtUser: JwtPayload;
    try {
      jwtUser = await verifyTokenSession(String(req.cookies?.library_media_token || ""));
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const filename = req.path.replace(/^\/+/, "");
    if (!filename || filename !== path.basename(filename)) {
      res.status(400).json({ error: "Invalid library file" });
      return;
    }

    try {
      const mediaUrl = `/uploads/library/${filename}`;
      const resource = await prisma.libraryResource.findFirst({
        where: { externalUrl: mediaUrl },
        select: { visibility: true },
      });
      if (!resource) {
        res.status(404).json({ error: "Library file not found" });
        return;
      }
      const allowed = jwtUser.role === "ADMIN" ||
        (jwtUser.role === "TEACHER" && ["ALL", "TEACHERS_ONLY"].includes(resource.visibility)) ||
        (jwtUser.role === "STUDENT" && ["ALL", "STUDENTS"].includes(resource.visibility));
      if (!allowed) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    } catch (err) {
      logger.error("Error authorizing library media:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }, express.static(LIBRARY_FILE_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  // Uploaded lesson media is not public static content. Native <video> and
  // <track> requests cannot attach an Authorization header, so they authenticate
  // with a narrowly-scoped httpOnly cookie set at login (and refreshed by the
  // video detail page for sessions that pre-date this behavior).
  app.use("/uploads/videos", async (req, res, next) => {
    let jwtUser: JwtPayload;
    try {
      jwtUser = await verifyTokenSession(String(req.cookies?.video_media_token || ""));
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const filename = req.path.replace(/^\/+/, "");
    if (!filename || filename !== path.basename(filename)) {
      res.status(400).json({ error: "Invalid video file" });
      return;
    }

    try {
      const mediaUrl = `/uploads/videos/${filename}`;
      const lesson = await prisma.videoLesson.findFirst({
        where: { OR: [{ videoUrl: mediaUrl }, { captionsUrl: mediaUrl }, { thumbnailUrl: mediaUrl }] },
        select: { visibility: true, status: true, classId: true },
      });
      if (!lesson) {
        res.status(404).json({ error: "Video file not found" });
        return;
      }

      let allowed = jwtUser.role === "ADMIN" ||
        jwtUser.role === "TEACHER" ||
        (jwtUser.role === "STUDENT" &&
          lesson.status === "PUBLISHED" &&
          ["ALL", "STUDENTS"].includes(lesson.visibility));
      if (allowed && jwtUser.role === "STUDENT" && lesson.classId) {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId }, select: { classId: true } });
        allowed = student?.classId === lesson.classId;
      }
      if (!allowed) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    } catch (err) {
      logger.error("Error authorizing video media:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }, express.static(VIDEO_FILES_DIR, {
    maxAge: 0,
    immutable: false,
    setHeaders: (res, filePath) => {
      res.setHeader("Cache-Control", "private, no-cache");
      // Browsers require text/vtt for <track> subtitles to load.
      if (filePath.endsWith(".vtt")) res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    },
  }));
  app.use("/uploads/admissions", express.static(ADMISSION_FILE_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  app.use("/uploads/student-docs", express.static(STUDENT_DOC_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  app.use("/uploads/ebook-covers", express.static(EBOOK_COVER_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));

  // ── Rate limiting ───────────────────────────────────────────────────────────
  // Whole schools usually share ONE public (NAT'd) IP, so an IP-keyed limit is
  // really a per-school limit that throttles everyone together. Key by the
  // authenticated user instead (decoded from the bearer token) so each person
  // gets their own budget; fall back to IP only for unauthenticated requests.
  const perUserOrIpKey = (req: express.Request): string => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      try { return "u:" + verifyToken(auth.slice(7)).userId; } catch { /* not a valid token */ }
    }
    return "ip:" + ipKeyGenerator(req.ip || "");
  };

  // Generous per-user cap. Health checks and e-book streaming are skipped so
  // monitoring and reading are never throttled.
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 4000, // per user (or per IP when unauthenticated)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    keyGenerator: perUserOrIpKey,
    // Skip endpoints that are hit on timers or on every page load. The chat
    // provider polls conversations/presence/heartbeat every 8–20s in EVERY
    // open tab (~220 req/15min/tab), which alone could exhaust the budget and
    // then 429 unrelated pages — including /api/auth/me, which logged users
    // out. These polling endpoints are cheap authenticated reads; chat writes
    // still have their own dedicated limiters.
    skip: (req) =>
      req.originalUrl === "/api/health" ||
      req.originalUrl === "/api/auth/me" ||
      req.originalUrl === "/api/settings" ||
      req.originalUrl.startsWith("/api/public/branding") ||
      req.originalUrl === "/api/chat/heartbeat" ||
      req.originalUrl === "/api/chat/presence" ||
      req.originalUrl === "/api/chat/stream" ||
      (req.method === "GET" && req.originalUrl.startsWith("/api/chat/conversations")) ||
      /^\/api\/ebooks\/[^/]+\/(content|download)/.test(req.originalUrl),
  });
  app.use("/api/", apiLimiter);

  // Brute-force protection for login. Keyed by the target account (email) plus
  // IP — NOT IP alone — so that many different people logging in from the same
  // shared school network each get their own attempt budget, while repeated
  // attempts against a single account are still limited.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again after 15 minutes." },
    keyGenerator: (req) => {
      const acct = String(req.body?.identifier || req.body?.email || "").trim().toLowerCase();
      return (acct ? "acct:" + acct + "|" : "") + "ip:" + ipKeyGenerator(req.ip || "");
    },
  });
  const publicSignupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many signup attempts. Please wait before trying again." },
    keyGenerator: (req) => {
      const account = String(req.body?.email || "").trim().toLowerCase();
      return `${account ? `acct:${account}|` : ""}ip:${ipKeyGenerator(req.ip || "")}`;
    },
  });
  const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many password reset requests. Please wait 15 minutes and try again." },
    keyGenerator: (req) => {
      const account = String(req.body?.identifier || "").trim().toLowerCase();
      return `${account ? `acct:${account}|` : ""}ip:${ipKeyGenerator(req.ip || "")}`;
    },
  });

  // Rate limiters for chat endpoints to prevent spam and DoS
  const chatMessageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many messages. Please wait before sending more." },
    keyGenerator: (req) => {
      const jwtUser = (req as any).user as JwtPayload;
      return jwtUser?.userId || ipKeyGenerator(req.ip || "");
    },
  });

  const chatUploadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 uploads per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many uploads. Please wait before uploading more files." },
    keyGenerator: (req) => {
      const jwtUser = (req as any).user as JwtPayload;
      return jwtUser?.userId || ipKeyGenerator(req.ip || "");
    },
  });

  // ── Auth routes ─────────────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", passwordResetLimiter, validate(schemas.forgotPassword), async (req, res) => {
    const startedAt = Date.now();
    const identifier = String(req.body.identifier || "").trim();
    const genericResponse = { message: "If that account exists, a password reset link has been sent." };
    try {
      const user = await prisma.user.findFirst({
        where: {
          isActive: true,
          OR: [
            { email: { equals: identifier, mode: "insensitive" } },
            { username: { equals: identifier, mode: "insensitive" } },
          ],
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (user) {
        const rawToken = crypto.randomBytes(32).toString("base64url");
        const resetToken = await prisma.$transaction(async (tx) => {
          await tx.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() },
          });
          return tx.passwordResetToken.create({
            data: {
              userId: user.id,
              tokenHash: hashSecurityToken(rawToken),
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
              requestedIp: req.ip || null,
            },
          });
        });
        const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const displayName = user.firstName || user.lastName || "there";
        await queueEmail({
          userId: user.id,
          toEmail: user.email,
          subject: "Reset your MRLC LMS password",
          dedupeKey: `password-reset:${resetToken.id}`,
          textBody: `Hello ${displayName},\n\nUse this link to reset your MRLC LMS password. It expires in 30 minutes:\n${resetUrl}\n\nIf you did not request this, you can ignore this message.`,
          htmlBody: `<p>Hello ${escapeEmailHtml(displayName)},</p><p>Use the button below to reset your MRLC LMS password. This link expires in 30 minutes.</p><p><a href="${escapeEmailHtml(resetUrl)}" style="display:inline-block;padding:12px 18px;background:#4338ca;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>If you did not request this, you can ignore this message.</p>`,
        });
        void processEmailOutbox();
        void createAuditLog(user.id, user.email, "REQUEST", "PASSWORD_RESET", resetToken.id,
          "Password reset requested.", req.ip || null, req.headers["user-agent"] || null, "WARNING");
      }
    } catch (error) {
      // Never reveal whether a matching account exists. Operational failures
      // remain visible in server logs and the outbox health check.
      logger.error("Password reset request failed:", error);
    }
    const remainingDelay = 300 - (Date.now() - startedAt);
    if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
    res.status(202).json(genericResponse);
  });

  app.post("/api/auth/reset-password", passwordResetLimiter, validate(schemas.resetPassword), async (req, res) => {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    try {
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashSecurityToken(token) },
        include: { user: { select: { id: true, email: true, isActive: true } } },
      });
      if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date() || !resetToken.user.isActive) {
        res.status(400).json({ error: "This password reset link is invalid or has expired." });
        return;
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash, mustChangePassword: false },
        }),
        prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
        prisma.authSession.updateMany({ where: { userId: resetToken.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      ]);
      await createAuditLog(resetToken.userId, resetToken.user.email, "UPDATE", "PASSWORD", resetToken.userId,
        "Password reset completed; all existing sessions were revoked.", req.ip || null, req.headers["user-agent"] || null, "WARNING");
      res.json({ success: true });
    } catch (error) {
      logger.error("Password reset failed:", error);
      res.status(500).json({ error: "Password reset could not be completed." });
    }
  });

  /**
   * POST /api/auth/public-learner-signup
   * Creates a learning-only account for the public Learning Quest experience.
   * These users intentionally have no Student profile and are API-restricted
   * by authMiddleware even though progress uses the STUDENT role.
   */
  app.post(
    "/api/auth/public-learner-signup",
    publicSignupLimiter,
    validate(schemas.publicLearnerSignup),
    async (req, res) => {
      const firstName = String(req.body.firstName).trim();
      const lastName = String(req.body.lastName).trim();
      const learnerEmail = String(req.body.email).trim().toLowerCase();
      const password = String(req.body.password);
      const avatarId = isLanguageQuestAvatarId(req.body.avatarId) ? req.body.avatarId : "owl";
      try {
        const existing = await prisma.user.findFirst({
          where: { email: { equals: learnerEmail, mode: "insensitive" } },
          select: { id: true },
        });
        if (existing) {
          res.status(409).json({ error: "An account already exists for this email. Try signing in instead." });
          return;
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const learner = await prisma.user.create({
          data: {
            email: learnerEmail,
            firstName,
            lastName,
            passwordHash,
            role: "STUDENT",
            isActive: true,
            isExternalLearner: true,
            languageQuestAvatar: avatarId,
            mustChangePassword: false,
          } as any,
          select: { id: true, email: true },
        });
        await createAuditLog(
          learner.id,
          learner.email,
          "CREATE",
          "PUBLIC_LEARNER_ACCOUNT",
          learner.id,
          "Created a self-service Learning Quest learner account",
          req.ip || null,
          req.headers["user-agent"] || null,
        );
        res.status(201).json({ success: true });
      } catch (error: any) {
        if (error?.code === "P2002") {
          res.status(409).json({ error: "An account already exists for this email. Try signing in instead." });
          return;
        }
        logger.error("Public learner signup failed:", error);
        res.status(500).json({ error: "We could not create your learner account. Please try again." });
      }
    },
  );

  /**
   * POST /api/auth/login
   * Body: { identifier: string, password: string }
   * "identifier" may be either the account's email address or its username.
   * Returns: { token: string, user: { id, email, role } }
   */
  app.post("/api/auth/login", authLimiter, validate(schemas.login), async (req, res) => {
    const { identifier, password, rememberMe, mfaCode } = req.body as {
      identifier?: string;
      password?: string;
      rememberMe?: boolean;
      mfaCode?: string;
    };

    if (!identifier || !password) {
      res.status(400).json({ error: "Email/username and password are required" });
      return;
    }

    try {
      // Cast to `any` here: the Prisma client in this environment was
      // generated before the `username` column was added to the schema (no
      // network access to fetch the schema-engine binary in this sandbox to
      // regenerate it) and its TS types don't know about the field yet,
      // though the column itself exists per the migration. Running
      // `prisma generate` in a normal dev environment removes the need for
      // this cast.
      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { username: identifier } as any] },
      });

      if (!user || !user.passwordHash) {
        // Use constant-time comparison even for missing users to avoid timing attacks
        await bcrypt.compare(password, "$2b$10$invalidhashpadding000000000000000000000000000000000000");
        res.status(401).json({ error: "Invalid email/username or password" });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: "Account is disabled. Contact your administrator." });
        return;
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        logger.warn(`Failed login attempt for identifier: ${identifier}`);
        res.status(401).json({ error: "Invalid email/username or password" });
        return;
      }

      if (user.mfaEnabled) {
        if (!user.mfaSecretEncrypted) {
          logger.error(`MFA is enabled without a secret for user ${user.id}`);
          res.status(503).json({ error: "MFA configuration is unavailable. Contact an administrator." });
          return;
        }
        if (!mfaCode) {
          res.json({ mfaRequired: true });
          return;
        }
        const mfaValid = await verifyAndConsumeMfaCode({
          userId: user.id,
          email: user.email,
          encryptedSecret: user.mfaSecretEncrypted,
          recoveryCodeHashes: user.mfaRecoveryCodeHashes,
          code: mfaCode,
        });
        if (!mfaValid) {
          res.status(401).json({ error: "Invalid authentication or recovery code", mfaRequired: true });
          return;
        }
      }

      const payload: JwtPayload = {
        userId: user.id,
        role: user.role,
        email: user.email,
        externalLearner: Boolean((user as any).isExternalLearner),
        sessionId: (await prisma.authSession.create({ data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000)),
          ipAddress: req.ip || null,
          userAgent: req.headers["user-agent"] || null,
        } })).id,
      };
      const token = signToken(payload, Boolean(rememberMe));

      res.cookie("video_media_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
        path: "/uploads/videos",
      });
      res.cookie("social_media_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
        path: "/uploads/social",
      });
      // Scoped media token for library file downloads (PDFs/docs/images).
      // The /uploads/library route verifies it and checks the resource's
      // visibility, so TEACHERS_ONLY uploads can't be read by students (and
      // nothing under /uploads/library is world-readable by URL guessing).
      res.cookie("library_media_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
        path: "/uploads/library",
      });

      // Record the login time (fire-and-forget so a slow write can't block sign-in).
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
        .catch((e) => logger.warn(`Could not update lastLoginAt for ${user.email}: ${e?.message}`));

      logger.info(`User ${user.email} (${user.role}) logged in successfully`);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: (user as any).username || null,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePhotoUrl: (user as any).profilePhotoUrl || null,
          languageQuestAvatar: (user as any).languageQuestAvatar || "owl",
          role: user.role,
          isActive: user.isActive,
          isExternalLearner: Boolean((user as any).isExternalLearner),
          mustChangePassword: user.mustChangePassword,
          cursorEffect: (user as any).cursorEffect || null,
          mfaEnabled: user.mfaEnabled,
          mfaRecommended: ["ADMIN", "ACCOUNTANT"].includes(user.role) && !user.mfaEnabled,
        },
      });
    } catch (err) {
      logger.error("Login error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.sessionId) await prisma.authSession.updateMany({ where: { id: jwtUser.sessionId, userId: jwtUser.userId }, data: { revokedAt: new Date() } });
    res.clearCookie("library_media_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/uploads/library",
    });
    res.clearCookie("video_media_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/uploads/videos",
    });
    res.clearCookie("social_media_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/uploads/social",
    });
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/api/chat/stream",
    });
    res.json({ success: true });
  });

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user's profile.
   */
  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      // See the cast note on the login route above re: stale Prisma types.
      const user = await prisma.user.findUnique({
        where: { id: jwtUser.userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          languageQuestAvatar: true,
          role: true,
          isActive: true,
          isExternalLearner: true,
          mustChangePassword: true,
          cursorEffect: true,
          mfaEnabled: true,
          lastLoginAt: true,
        },
      } as any);
      if (!user || !user.isActive) {
        res.status(401).json({ error: "User not found or disabled" });
        return;
      }

      // This endpoint is hit on every page load, so explicit logins are not
      // the only sessions that matter. Stamp lastLoginAt here too — but only
      // once per day, so "Last login" reflects the most recent day of active
      // use rather than constantly showing "now".
      const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0;
      if (Date.now() - lastLogin > 24 * 60 * 60 * 1000) {
        prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch((e) => logger.warn(`Could not update lastLoginAt for ${user.email}: ${e?.message}`));
      }

      const { lastLoginAt: _omit, ...userPayload } = user as any;
      res.json({ user: userPayload });
    } catch (err) {
      logger.error("Error fetching user profile:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/auth/mfa", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { mfaEnabled: true, mfaEnrolledAt: true, mfaRecoveryCodeHashes: true, role: true },
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      enabled: user.mfaEnabled,
      enrolledAt: user.mfaEnrolledAt,
      recoveryCodesRemaining: user.mfaRecoveryCodeHashes.length,
      recommendedForRole: ["ADMIN", "ACCOUNTANT"].includes(user.role),
    });
  });

  app.post("/api/auth/mfa/setup", authMiddleware, validate(schemas.mfaPassword), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { id: true, email: true, passwordHash: true, mfaEnabled: true },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      res.status(401).json({ error: "Current password is incorrect" }); return;
    }
    if (user.mfaEnabled) { res.status(409).json({ error: "MFA is already enabled" }); return; }
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    const totp = createTotp(secret, user.email);
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecretEncrypted: encryptMfaSecret(secret), mfaRecoveryCodeHashes: [] },
    });
    res.json({
      manualKey: secret,
      otpAuthUrl: totp.toString(),
      qrCodeDataUrl: await QRCode.toDataURL(totp.toString(), { width: 240, margin: 1, errorCorrectionLevel: "M" }),
    });
  });

  app.post("/api/auth/mfa/enable", authMiddleware, validate(schemas.mfaCode), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecretEncrypted: true },
    });
    if (!user?.mfaSecretEncrypted) { res.status(400).json({ error: "Start MFA setup first" }); return; }
    if (user.mfaEnabled) { res.status(409).json({ error: "MFA is already enabled" }); return; }
    const secret = decryptMfaSecret(user.mfaSecretEncrypted);
    if (createTotp(secret, user.email).validate({ token: req.body.code, window: 1 }) === null) {
      res.status(400).json({ error: "The authentication code is invalid or expired" }); return;
    }
    const recovery = generateRecoveryCodes();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: true, mfaEnrolledAt: new Date(), mfaRecoveryCodeHashes: recovery.hashes },
      }),
      prisma.authSession.updateMany({
        where: { userId: user.id, revokedAt: null, ...(jwtUser.sessionId ? { id: { not: jwtUser.sessionId } } : {}) },
        data: { revokedAt: new Date() },
      }),
    ]);
    await createAuditLog(user.id, user.email, "ENABLE", "MFA", user.id,
      "Multi-factor authentication enabled; other sessions revoked.", req.ip || null, req.headers["user-agent"] || null, "WARNING");
    res.json({ success: true, recoveryCodes: recovery.codes });
  });

  app.post("/api/auth/mfa/recovery-codes", authMiddleware, validate(schemas.mfaDisable), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { id: true, email: true, passwordHash: true, mfaEnabled: true, mfaSecretEncrypted: true, mfaRecoveryCodeHashes: true },
    });
    if (!user?.mfaEnabled || !user.mfaSecretEncrypted || !user.passwordHash) {
      res.status(400).json({ error: "MFA is not enabled" }); return;
    }
    if (!(await bcrypt.compare(req.body.password, user.passwordHash))) {
      res.status(401).json({ error: "Current password is incorrect" }); return;
    }
    if (!(await verifyAndConsumeMfaCode({
      userId: user.id, email: user.email, encryptedSecret: user.mfaSecretEncrypted,
      recoveryCodeHashes: user.mfaRecoveryCodeHashes, code: req.body.code,
    }))) { res.status(400).json({ error: "Invalid authentication or recovery code" }); return; }
    const recovery = generateRecoveryCodes();
    await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryCodeHashes: recovery.hashes } });
    res.json({ recoveryCodes: recovery.codes });
  });

  app.post("/api/auth/mfa/disable", authMiddleware, validate(schemas.mfaDisable), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { id: true, email: true, passwordHash: true, mfaEnabled: true, mfaSecretEncrypted: true, mfaRecoveryCodeHashes: true },
    });
    if (!user?.mfaEnabled || !user.mfaSecretEncrypted || !user.passwordHash) {
      res.status(400).json({ error: "MFA is not enabled" }); return;
    }
    if (!(await bcrypt.compare(req.body.password, user.passwordHash))) {
      res.status(401).json({ error: "Current password is incorrect" }); return;
    }
    if (!(await verifyAndConsumeMfaCode({
      userId: user.id, email: user.email, encryptedSecret: user.mfaSecretEncrypted,
      recoveryCodeHashes: user.mfaRecoveryCodeHashes, code: req.body.code,
    }))) { res.status(400).json({ error: "Invalid authentication or recovery code" }); return; }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: false, mfaSecretEncrypted: null, mfaRecoveryCodeHashes: [], mfaEnrolledAt: null },
      }),
      prisma.authSession.updateMany({
        where: { userId: user.id, revokedAt: null, ...(jwtUser.sessionId ? { id: { not: jwtUser.sessionId } } : {}) },
        data: { revokedAt: new Date() },
      }),
    ]);
    await createAuditLog(user.id, user.email, "DISABLE", "MFA", user.id,
      "Multi-factor authentication disabled; other sessions revoked.", req.ip || null, req.headers["user-agent"] || null, "WARNING");
    res.json({ success: true });
  });

  app.get("/api/auth/sessions", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const sessions = await prisma.authSession.findMany({
      where: { userId: jwtUser.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, ipAddress: true, userAgent: true, lastSeenAt: true, expiresAt: true, createdAt: true },
      orderBy: { lastSeenAt: "desc" },
    });
    res.json(sessions.map((session) => ({ ...session, current: session.id === jwtUser.sessionId })));
  });
  app.delete("/api/auth/sessions/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    await prisma.authSession.updateMany({ where: { id: req.params.id, userId: jwtUser.userId }, data: { revokedAt: new Date() } });
    res.json({ success: true, current: req.params.id === jwtUser.sessionId });
  });
  app.post("/api/auth/sessions/revoke-others", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    await prisma.authSession.updateMany({
      where: { userId: jwtUser.userId, revokedAt: null, ...(jwtUser.sessionId ? { id: { not: jwtUser.sessionId } } : {}) },
      data: { revokedAt: new Date() },
    });
    res.json({ success: true });
  });

  // Any authenticated user may set their own personal cursor-effect
  // preference (distinct from the school-wide default in Settings > System,
  // which stays admin-only). null/omitted clears the override and falls
  // back to that default.
  const CURSOR_EFFECTS = ["NONE", "RAINBOW_TRAIL", "SPLASH_CURSOR", "RIBBONS", "GHOST_CURSOR", "CLICK_SPARK", "TARGET_CURSOR"];
  app.put("/api/me/cursor-effect", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { cursorEffect } = req.body || {};
    if (cursorEffect !== null && cursorEffect !== undefined && !CURSOR_EFFECTS.includes(cursorEffect)) {
      res.status(400).json({ error: "Invalid cursor effect" });
      return;
    }
    try {
      const updated = await prisma.user.update({
        where: { id: jwtUser.userId },
        data: { cursorEffect: cursorEffect || null },
        select: { id: true, cursorEffect: true },
      } as any);
      res.json(updated);
    } catch (err) {
      logger.error("Error updating cursor effect preference:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const uploadProfilePhoto = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    profilePhotoUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Profile picture must be 5 MB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  app.post("/api/profile-photo", authMiddleware, uploadProfilePhoto, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const file = (req as any).file as Express.Multer.File | undefined;
    const targetType = String(req.body?.targetType || "user");
    const requestedTargetId = req.body?.targetId ? String(req.body.targetId) : null;

    if (!file) {
      res.status(400).json({ error: "Profile picture file is required" });
      return;
    }

    const photoUrl = `/uploads/profile-photos/${file.filename}`;
    const deleteUploaded = () => fs.promises.unlink(file.path).catch(() => {});

    try {
      if (targetType === "student") {
        const student = requestedTargetId
          ? await prisma.student.findUnique({ where: { id: requestedTargetId } })
          : await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!student) {
          await deleteUploaded();
          res.status(404).json({ error: "Student profile not found" });
          return;
        }
        if (jwtUser.role !== "ADMIN" && student.userId !== jwtUser.userId) {
          await deleteUploaded();
          res.status(403).json({ error: "You can only update your own profile picture" });
          return;
        }
        await prisma.$transaction(async (tx) => {
          await tx.student.update({ where: { id: student.id }, data: { profilePhotoUrl: photoUrl } });
          if (student.userId) {
            await tx.user.update({ where: { id: student.userId }, data: { profilePhotoUrl: photoUrl } });
          }
        });
        res.json({ url: photoUrl, targetType: "student", targetId: student.id });
        return;
      }

      if (targetType === "teacher") {
        const teacher = requestedTargetId
          ? await prisma.teacher.findUnique({ where: { id: requestedTargetId } })
          : await prisma.teacher.findUnique({ where: { userId: jwtUser.userId } });
        if (!teacher) {
          await deleteUploaded();
          res.status(404).json({ error: "Teacher profile not found" });
          return;
        }
        if (jwtUser.role !== "ADMIN" && teacher.userId !== jwtUser.userId) {
          await deleteUploaded();
          res.status(403).json({ error: "You can only update your own profile picture" });
          return;
        }
        await prisma.$transaction(async (tx) => {
          await tx.teacher.update({ where: { id: teacher.id }, data: { profilePhotoUrl: photoUrl } });
          if (teacher.userId) {
            await tx.user.update({ where: { id: teacher.userId }, data: { profilePhotoUrl: photoUrl } });
          }
        });
        res.json({ url: photoUrl, targetType: "teacher", targetId: teacher.id });
        return;
      }

      const targetUserId = jwtUser.role === "ADMIN" && requestedTargetId ? requestedTargetId : jwtUser.userId;
      if (jwtUser.role !== "ADMIN" && requestedTargetId && requestedTargetId !== jwtUser.userId) {
        await deleteUploaded();
        res.status(403).json({ error: "You can only update your own profile picture" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { studentProfile: true, teacherProfile: true },
      });
      if (!user) {
        await deleteUploaded();
        res.status(404).json({ error: "User not found" });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { profilePhotoUrl: photoUrl } });
        if (user.studentProfile) {
          await tx.student.update({ where: { id: user.studentProfile.id }, data: { profilePhotoUrl: photoUrl } });
        }
        if (user.teacherProfile) {
          await tx.teacher.update({ where: { id: user.teacherProfile.id }, data: { profilePhotoUrl: photoUrl } });
        }
      });
      res.json({ url: photoUrl, targetType: "user", targetId: user.id });
    } catch (err) {
      await deleteUploaded();
      logger.error("Error uploading profile photo:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Remove a profile picture (own photo, or any if ADMIN).
  app.delete("/api/profile-photo", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const targetType = String(req.query?.targetType || req.body?.targetType || "user");
    const requestedTargetId = (req.query?.targetId || req.body?.targetId)
      ? String(req.query?.targetId || req.body?.targetId) : null;
    try {
      if (targetType === "student" || targetType === "teacher") {
        const model: any = targetType === "student" ? prisma.student : prisma.teacher;
        const row = requestedTargetId
          ? await model.findUnique({ where: { id: requestedTargetId } })
          : await model.findUnique({ where: { userId: jwtUser.userId } });
        if (!row) { res.status(404).json({ error: "Profile not found" }); return; }
        if (jwtUser.role !== "ADMIN" && row.userId !== jwtUser.userId) {
          res.status(403).json({ error: "You can only remove your own profile picture" });
          return;
        }
        await prisma.$transaction(async (tx) => {
          const txModel: any = targetType === "student" ? tx.student : tx.teacher;
          await txModel.update({ where: { id: row.id }, data: { profilePhotoUrl: null } });
          if (row.userId) await tx.user.update({ where: { id: row.userId }, data: { profilePhotoUrl: null } });
        });
        res.json({ success: true });
        return;
      }

      const targetUserId = jwtUser.role === "ADMIN" && requestedTargetId ? requestedTargetId : jwtUser.userId;
      if (jwtUser.role !== "ADMIN" && requestedTargetId && requestedTargetId !== jwtUser.userId) {
        res.status(403).json({ error: "You can only remove your own profile picture" });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { studentProfile: true, teacherProfile: true },
      });
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { profilePhotoUrl: null } });
        if (user.studentProfile) await tx.student.update({ where: { id: user.studentProfile.id }, data: { profilePhotoUrl: null } });
        if (user.teacherProfile) await tx.teacher.update({ where: { id: user.teacherProfile.id }, data: { profilePhotoUrl: null } });
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error removing profile photo:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  /**
   * POST /api/auth/change-password
   * Lets the signed-in user set a new password (also clears the
   * "must change password on first login" flag).
   */
  app.post("/api/auth/change-password", authMiddleware, validate(schemas.changePassword), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    try {
      const user = await prisma.user.findUnique({ where: { id: jwtUser.userId } });
      if (!user || !user.passwordHash || !user.isActive) {
        res.status(401).json({ error: "User not found or disabled" });
        return;
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
      if (await bcrypt.compare(newPassword, user.passwordHash)) {
        res.status(400).json({ error: "New password must be different from the current one" });
        return;
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await createAuditLog(
        user.id, user.email, "PASSWORD_RESET", "USER", user.id,
        "Password changed by user.",
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      logger.error("Change password error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  /**
   * POST /api/auth/verify-password
   * Re-confirms the currently authenticated user's password before
   * destructive operations (e.g. database restore).
   */
  app.post("/api/auth/verify-password", authMiddleware, validate(schemas.verifyPassword), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { password } = req.body as { password?: string };

    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: jwtUser.userId } });
      if (!user || !user.passwordHash || !user.isActive) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        logger.warn(`Password re-verification failed for user ${user.email}`);
        res.status(401).json({ error: "Incorrect password" });
        return;
      }
      res.json({ verified: true });
    } catch (err) {
      logger.error("Error verifying password:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Audit logs API ─────────────────────────────────────────────────────────
  app.get("/api/audit-logs", authMiddleware, requirePermission("view_audit_logs"), async (req, res) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" }
      });
      res.json(logs);
    } catch (err) {
      logger.error("Error fetching audit logs:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // A teacher may only see students in classes assigned to their teacher
  // profile. Keep this helper near the first route that needs it so People
  // endpoints cannot accidentally fall back to an all-students query.
  async function getTeacherClassIds(userId: string): Promise<string[]> {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { classes: true },
    });
    return teacher?.classes.map((assignment) => assignment.classId) || [];
  }

  // ── Students API ────────────────────────────────────────────────────────────
  app.get("/api/students", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    // STAFF and ACCOUNTANT both hold view_students in permissions.ts (STAFF
    // needs the roster for duty assignments; ACCOUNTANT needs it to record
    // fee payments against a student), but this route's hardcoded allow-list
    // had drifted out of sync with that permission model -- STAFF was
    // patched in previously, and ACCOUNTANT was still missing entirely.
    if (!["ADMIN", "TEACHER", "STAFF", "ACCOUNTANT"].includes(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const classIds = jwtUser.role === "TEACHER"
        ? await getTeacherClassIds(jwtUser.userId)
        : null;
      const students = await prisma.student.findMany({
        where: classIds ? { classId: { in: classIds } } : undefined,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePhotoUrl: true,
              isActive: true,
            }
          },
          class: true,
        }
      });
      res.json(students);
    } catch (err) {
      logger.error("Error fetching students:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/students", authMiddleware, requirePermission("manage_students"), validate(schemas.student), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const {
      firstName, lastName, email, studentCode, preferredName, dateOfBirth, enrollmentDate,
      guardianName, guardianRelationship, guardianPhone, guardianEmail,
      contactNumber, country, identityType, identityNumber, legalDocumentationStatus,
      address, emergencyContact, emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
      previousSchool, previousEducationLevel, educationLevel, medicalInformation, allergies,
      notes, classId, gender, status,
    } = req.body;
    if (!firstName || !lastName || !email) {
      res.status(400).json({ error: "First name, last name, and email are required" });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Auto-generate studentCode if not provided
        const finalStudentCode = studentCode || await nextStudentCode(tx);

        const user = await tx.user.create({
          data: {
            firstName,
            lastName,
            email,
            role: "STUDENT",
            passwordHash: await bcrypt.hash("Student123!", 10),
          }
        });
        const student = await tx.student.create({
          data: {
            userId: user.id,
            studentCode: finalStudentCode,
            preferredName: preferredName || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            ...(enrollmentDate ? { enrollmentDate: new Date(enrollmentDate) } : {}),
            guardianName,
            guardianRelationship: guardianRelationship || null,
            guardianPhone,
            guardianEmail: guardianEmail || null,
            contactNumber,
            country,
            identityType,
            identityNumber,
            legalDocumentationStatus: legalDocumentationStatus || null,
            address,
            emergencyContact,
            emergencyContactName: emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || null,
            emergencyContactRelationship: emergencyContactRelationship || null,
            previousSchool: previousSchool || null,
            previousEducationLevel: previousEducationLevel || null,
            educationLevel: educationLevel || null,
            medicalInformation: medicalInformation || null,
            allergies: allergies || null,
            notes,
            classId: classId || null,
            gender,
            status: status || "ACTIVE",
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true, isActive: true, profilePhotoUrl: true } },
            class: true,
          }
        });
        return student;
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "STUDENT",
        result.id,
        `Student '${firstName} ${lastName}' created.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.status(201).json(result);
    } catch (err: any) {
      logger.error("Error creating student:", err);
      if (err.code === "P2002") {
        const target = String(err.meta?.target || "");
        res.status(400).json({
          error: target.includes("studentCode")
            ? "That student code is already in use"
            : "A user account with that email already exists",
        });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // Bulk import from a parsed CSV. Each row is validated and created independently
  // so one bad row never aborts the whole batch — the response reports per-row
  // outcomes. `className` is matched (case-insensitively) to an existing class.
  app.post("/api/students/import", authMiddleware, requirePermission("manage_students"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) { res.status(400).json({ error: "No rows to import" }); return; }
    if (rows.length > 1000) { res.status(400).json({ error: "Too many rows (max 1000 per import)" }); return; }

    const classes = await prisma.class.findMany({ select: { id: true, name: true } });
    const classByName = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c.id]));

    const s = (v: any) => (v == null ? "" : String(v).trim());
    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];
    const seenCodes = new Set<string>();
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const rowNo = i + 2; // account for the header line
      const firstName = s(r.firstName);
      const lastName = s(r.lastName);
      const email = s(r.email).toLowerCase();
      const studentCode = s(r.studentCode || r.studentId);

      if (!firstName || !lastName || !email || !studentCode) {
        errors.push({ row: rowNo, message: "firstName, lastName, email and studentCode are all required" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNo, message: `Invalid email "${email}"` });
        continue;
      }
      if (seenCodes.has(studentCode) || seenEmails.has(email)) {
        errors.push({ row: rowNo, message: "Duplicate email or studentCode within the file" });
        continue;
      }

      const classNameRaw = s(r.className);
      let classId: string | null = null;
      if (classNameRaw) {
        classId = classByName.get(classNameRaw.toLowerCase()) || null;
        if (!classId) { errors.push({ row: rowNo, message: `Unknown class "${classNameRaw}"` }); continue; }
      }

      const gender = s(r.gender).toUpperCase() || null;
      const status = s(r.status).toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
      const dob = s(r.dateOfBirth);
      const dateOfBirth = dob && !isNaN(Date.parse(dob)) ? new Date(dob) : null;

      // Optional per-row password. When supplied it's used as-is (min 6 chars) and
      // the student is NOT forced to change it; otherwise a default is set and they
      // must change it at first login.
      const password = s(r.password);
      if (password && password.length < 6) {
        errors.push({ row: rowNo, message: "password must be at least 6 characters" });
        continue;
      }
      const passwordHash = await bcrypt.hash(password || "Student123!", 10);
      const mustChangePassword = !password;

      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { firstName, lastName, email, role: "STUDENT", mustChangePassword, passwordHash },
          });
          await tx.student.create({
            data: {
              userId: user.id, studentCode, gender, status, dateOfBirth, classId,
              guardianName: s(r.guardianName) || null,
              guardianPhone: s(r.guardianPhone) || null,
              address: s(r.address) || null,
              notes: s(r.notes) || null,
            },
          });
        });
        seenCodes.add(studentCode); seenEmails.add(email);
        created.push(studentCode);
      } catch (err: any) {
        errors.push({ row: rowNo, message: err?.code === "P2002" ? "Email or studentCode already exists" : "Could not create student" });
      }
    }

    await createAuditLog(
      jwtUser.userId, jwtUser.email, "IMPORT", "STUDENT", null,
      `Bulk student import: ${created.length} created, ${errors.length} skipped.`,
      req.ip, req.headers["user-agent"] || null, errors.length ? "WARNING" : "SUCCESS",
    );
    res.json({ createdCount: created.length, failedCount: errors.length, errors });
  });

  app.get("/api/students/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              profilePhotoUrl: true, isActive: true,
            },
          },
          class: true,
        }
      });
      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
      if (jwtUser.role === "TEACHER") {
        const classIds = await getTeacherClassIds(jwtUser.userId);
        if (!student.classId || !classIds.includes(student.classId)) {
          res.status(403).json({ error: "You can only view students in your assigned classes" });
          return;
        }
      }
      res.json(student);
    } catch (err) {
      logger.error("Error fetching student:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/students/:id/profile-data", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              profilePhotoUrl: true, isActive: true,
            },
          },
          class: true,
        },
      });
      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
      if (jwtUser.role === "TEACHER") {
        const classIds = await getTeacherClassIds(jwtUser.userId);
        if (!student.classId || !classIds.includes(student.classId)) {
          res.status(403).json({ error: "You can only view students in your assigned classes" });
          return;
        }
      }

      const profile = await prisma.schoolProfile.findFirst();
      const currency = profile?.currency || "MYR";
      const [attempts, fees, classExams] = await Promise.all([
        prisma.examAttempt.findMany({
          where: { studentId: id, isCompleted: true },
          include: { exam: { include: { subject: true } } },
          orderBy: { completedAt: "desc" },
        }),
        jwtUser.role === "ADMIN"
          ? prisma.feePayment.findMany({
              where: { studentId: id },
              include: {
                student: {
                  include: {
                    user: { select: { firstName: true, lastName: true, email: true } },
                    class: true,
                  },
                },
              },
              orderBy: [{ paidDate: "desc" }, { createdAt: "desc" }],
            })
          : Promise.resolve([]),
        student.classId
          ? prisma.exam.findMany({
              where: { classId: student.classId },
              include: {
                subject: true,
                questions: true,
                attempts: { where: { studentId: id } },
              },
              orderBy: { date: "asc" },
            })
          : Promise.resolve([]),
      ]);

      const examResults = attempts
        .filter((attempt) => attempt.score != null)
        .map((attempt) => {
          const total = attempt.exam.totalMarks || 100;
          const percentage = round1(((attempt.score || 0) / total) * 100);
          return {
            id: attempt.id,
            examId: attempt.examId,
            title: attempt.exam.title,
            subject: attempt.exam.subject?.name || "General",
            score: attempt.score,
            total,
            percentage,
            grade: letterGrade(percentage),
            date: (attempt.completedAt || attempt.createdAt).toISOString().slice(0, 10),
          };
        });

      const availableExams = classExams
        .filter((exam) => !exam.attempts.some((attempt) => attempt.isCompleted))
        .map((exam) => ({
          id: exam.id,
          title: exam.title,
          subject: exam.subject?.name || "General",
          date: exam.date.toISOString().slice(0, 10),
          type: exam.type,
          durationMinutes: exam.durationMinutes,
          totalMarks: exam.totalMarks || 0,
          questions: exam.questions.length,
        }));

      const totalExpected = fees.reduce((sum, fee) => sum + fee.amount, 0);
      const totalPaid = fees
        .filter((fee) => fee.status === "PAID")
        .reduce((sum, fee) => sum + fee.amount, 0);
      const feeRows = fees.map((fee) => feeReceiptPayload(fee, currency));

      res.json({
        exams: {
          average: examResults.length
            ? round1(examResults.reduce((sum, result) => sum + result.percentage, 0) / examResults.length)
            : null,
          results: examResults,
          available: availableExams,
        },
        fees: jwtUser.role === "ADMIN"
          ? {
              currency,
              totalExpected,
              totalPaid,
              balance: Math.max(0, totalExpected - totalPaid),
              paymentCount: fees.length,
              rows: feeRows,
            }
          : null,
      });
    } catch (err) {
      logger.error("Error fetching student profile data:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/students/:id", authMiddleware, requirePermission("manage_students"), validate(schemas.studentUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const {
      firstName, lastName, email, studentCode, preferredName, dateOfBirth, enrollmentDate,
      guardianName, guardianRelationship, guardianPhone, guardianEmail,
      contactNumber, country, identityType, identityNumber, legalDocumentationStatus,
      address, emergencyContact, emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
      previousSchool, previousEducationLevel, educationLevel, medicalInformation, allergies,
      notes, classId, gender, status,
    } = req.body;
    try {
      const existingStudent = await prisma.student.findUnique({ where: { id }, include: { user: true } });
      if (!existingStudent) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
      // Quick actions (e.g. "Mark as Dropped" from the students list) only send
      // { status }, so fall back to the student's current name for the audit
      // log instead of logging "undefined undefined".
      const auditName = (firstName || lastName)
        ? `${firstName ?? ""} ${lastName ?? ""}`.trim()
        : fullName(existingStudent.user) || existingStudent.studentCode;
      const updated = await prisma.$transaction(async (tx) => {
        if (existingStudent.userId) {
          await tx.user.update({
            where: { id: existingStudent.userId },
            data: {
              firstName,
              lastName,
              email,
            }
          });
        }
        return await tx.student.update({
          where: { id },
          data: {
            studentCode,
            preferredName: preferredName ?? null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            ...(enrollmentDate ? { enrollmentDate: new Date(enrollmentDate) } : {}),
            guardianName,
            guardianRelationship: guardianRelationship ?? null,
            guardianPhone,
            guardianEmail: guardianEmail ?? null,
            contactNumber,
            country,
            identityType,
            identityNumber,
            legalDocumentationStatus: legalDocumentationStatus ?? null,
            address,
            emergencyContact,
            emergencyContactName: emergencyContactName ?? null,
            emergencyContactPhone: emergencyContactPhone ?? null,
            emergencyContactRelationship: emergencyContactRelationship ?? null,
            previousSchool: previousSchool ?? null,
            previousEducationLevel: previousEducationLevel ?? null,
            educationLevel: educationLevel ?? null,
            medicalInformation: medicalInformation ?? null,
            allergies: allergies ?? null,
            notes,
            classId: classId || null,
            gender,
            status,
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true, isActive: true, profilePhotoUrl: true } },
            class: true,
          }
        });
      });

      const statusChanged = status !== undefined && status !== existingStudent.status;
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        statusChanged ? "STATUS_CHANGE" : "UPDATE",
        "STUDENT",
        id,
        statusChanged
          ? `Student '${auditName}' status changed to ${status}.`
          : `Student '${auditName}' updated.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json(updated);
    } catch (err) {
      logger.error("Error updating student:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/students/:id", authMiddleware, requirePermission("manage_students"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
      const label = `${fullName(student.user) || "Unnamed"} (${student.studentCode})`;
      await prisma.$transaction(async (tx) => {
        // Only a couple of the Student model's relations actually cascade at
        // the DB level (HomeworkSubmission, StudentBadge) — everything else
        // below defaults to Postgres's RESTRICT, so deleting the Student row
        // directly failed with a foreign-key violation (surfaced to the user
        // as a generic 500 "Server error") for any student who had even one
        // attendance record, exam attempt, fee payment, or case file, which
        // in practice is almost every real student. Explicitly clear out all
        // of this student's own records first; each of these has its own
        // children cascading further (exam attempt answers, case notes, fee
        // installments, etc.) per schema.prisma.
        await tx.attendance.deleteMany({ where: { studentId: id } });
        await tx.examAssignment.deleteMany({ where: { studentId: id } });
        await tx.examAccommodation.deleteMany({ where: { studentId: id } });
        await tx.examAttempt.deleteMany({ where: { studentId: id } });
        await tx.feePayment.deleteMany({ where: { studentId: id } });
        await tx.feeAssignment.deleteMany({ where: { studentId: id } });
        await tx.feePaymentPlan.deleteMany({ where: { studentId: id } });
        await tx.caseRecord.deleteMany({ where: { studentId: id } });
        await tx.grade.deleteMany({ where: { studentId: id } });
        await tx.gedReadiness.deleteMany({ where: { studentId: id } });
        await tx.generatedDocument.deleteMany({ where: { studentId: id } });
        await tx.dutyAssignment.deleteMany({ where: { studentId: id } });
        await tx.studentDocument.deleteMany({ where: { studentId: id } });

        await tx.student.delete({ where: { id } });

        if (student.userId) {
          const userId = student.userId;
          // Same problem on the linked login account: any chat/messaging/
          // social activity references the user without cascading. Clear the
          // account's own footprint before deleting it. Conversations this
          // account *created* are removed entirely (cascading their messages
          // for all participants) since there's no other owner to hand them
          // to — an accepted consequence of a permanent account deletion.
          await tx.chatMessageReport.deleteMany({ where: { reportedById: userId } });
          await tx.chatMessage.deleteMany({ where: { senderId: userId } });
          await tx.conversationParticipant.deleteMany({ where: { userId } });
          await tx.conversation.deleteMany({ where: { createdById: userId } });
          await tx.messageRecipient.deleteMany({ where: { recipientId: userId } });
          await tx.message.deleteMany({ where: { senderId: userId } });
          await (tx as any).ebookProgress.deleteMany({ where: { userId } });
          await (tx as any).ebookHighlight.deleteMany({ where: { userId } });
          await tx.user.delete({ where: { id: userId } });
        }
      });

      // Permanent, irreversible — wipes this student's attendance, grades,
      // exam attempts, fee payments, case records, and login account.
      // Flagged WARNING severity (vs. the usual SUCCESS) so it stands out in
      // the audit log given the blast radius.
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "STUDENT",
        id,
        `Student ${label} permanently deleted, including all attendance/grades/exam/fee/case records.`,
        req.ip,
        req.headers["user-agent"] || null,
        "WARNING"
      );

      res.json({ message: "Student deleted successfully" });
    } catch (err: any) {
      logger.error("Error deleting student:", err);
      if (err.code === "P2003" || err.code === "P2014") {
        res.status(400).json({ error: "This student has related records that couldn't be removed automatically. Please contact support." });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Users API ───────────────────────────────────────────────────────────────
  app.get("/api/users", authMiddleware, requirePermission("view_users"), async (req, res) => {
    try {
      // See the cast note near the login route re: stale Prisma types
      // (username was added to the schema after this client was generated).
      const users = await prisma.user.findMany({
        select: {
          id: true, firstName: true, lastName: true, email: true, username: true, role: true, isActive: true, createdAt: true, lastLoginAt: true,
          studentProfile: { select: { id: true } },
          teacherProfile: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      } as any);
      res.json(users);
    } catch (err) {
      logger.error("Error fetching users:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/users", authMiddleware, requirePermission("manage_users"), validate(schemas.userCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { firstName, lastName, email, username, password, role, status, teacherId, studentId } = req.body;
    if (!firstName || !email || !password || !role) {
      res.status(400).json({ error: "firstName, email, password, and role are required" });
      return;
    }
    if ((teacherId && role !== "TEACHER") || (studentId && role !== "STUDENT") || (teacherId && studentId)) {
      res.status(400).json({ error: "A profile can only be linked to an account with the matching Teacher or Student role" });
      return;
    }
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.$transaction(async (tx) => {
        // See the cast note near the login route re: stale Prisma types.
        const created = await tx.user.create({
          data: { firstName, lastName: lastName || "", email, username: username || null, passwordHash, role, isActive: status !== "DISABLED" },
          select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true, isActive: true },
        } as any);
        // Optionally link an existing teacher/student profile to the new account.
        if (teacherId) {
          const profile = await tx.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
          if (!profile) throw Object.assign(new Error("Teacher profile not found"), { http: 404 });
          if (profile.userId) throw Object.assign(new Error("That teacher profile is already linked to another account"), { http: 400 });
          await tx.teacher.update({ where: { id: teacherId }, data: { userId: created.id } });
        }
        if (studentId) {
          const profile = await tx.student.findUnique({ where: { id: studentId }, select: { userId: true } });
          if (!profile) throw Object.assign(new Error("Student profile not found"), { http: 404 });
          if (profile.userId) throw Object.assign(new Error("That student profile is already linked to another account"), { http: 400 });
          await tx.student.update({ where: { id: studentId }, data: { userId: created.id } });
        }
        return created;
      });

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "USER", user.id,
        `User '${firstName} ${lastName}' (${role}) created.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );

      res.status(201).json(user);
    } catch (err: any) {
      logger.error("Error creating user:", err);
      if (err.http) { res.status(err.http).json({ error: err.message }); return; }
      if (err.code === "P2002") {
        const target = String(err.meta?.target || "");
        res.status(400).json({ error: target.includes("username") ? "Username already exists" : "Email already exists" });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // ── Teachers API ────────────────────────────────────────────────────────────
  app.get("/api/teachers", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    // permissions.ts grants 'view_teachers' to ADMIN, TEACHER, STAFF, and
    // LIBRARIAN, but this route only ever let ADMIN through -- so TEACHER
    // users hit a 403 (silently swallowed as an empty list by the fetch
    // callers) any time they needed the teacher list, e.g. the Teacher /
    // Substitute Teacher dropdowns on the New Schedule Item form, which
    // TEACHER is explicitly allowed to open.
    if (!["ADMIN", "TEACHER", "STAFF", "LIBRARIAN"].includes(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const teachers = await prisma.teacher.findMany({
        // Only ADMIN gets salary/currency/notes -- everyone else granted
        // 'view_teachers' just needs enough to identify/pick a teacher
        // (name, code, subject specialization), not their pay details.
        select: {
          id: true,
          userId: jwtUser.role === "ADMIN",
          teacherCode: true,
          specialization: true,
          employmentType: true,
          profilePhotoUrl: true,
          gender: jwtUser.role === "ADMIN",
          phone: jwtUser.role === "ADMIN",
          address: jwtUser.role === "ADMIN",
          notes: jwtUser.role === "ADMIN",
          baseSalary: jwtUser.role === "ADMIN",
          currency: jwtUser.role === "ADMIN",
          hireDate: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePhotoUrl: true,
              isActive: true,
            }
          }
        }
      });
      res.json(teachers);
    } catch (err) {
      logger.error("Error fetching teachers:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // The signed-in teacher's own record (used by "My Profile").
  app.get("/api/teacher/me", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "TEACHER" && jwtUser.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: jwtUser.userId },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              username: true, role: true, isActive: true, profilePhotoUrl: true,
            },
          },
        },
      });
      if (!teacher) { res.status(404).json({ error: "No teacher profile linked to this account" }); return; }
      res.json(teacher);
    } catch (err) {
      logger.error("Error fetching own teacher profile:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Update a teacher. ADMIN may edit everything; a TEACHER may edit only their
  // own record, limited to personal fields (never email, employment, salary,
  // status or dates).
  app.put("/api/teachers/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const b = req.body || {};
    try {
      const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
      if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

      const isSelf = teacher.userId === jwtUser.userId;
      if (jwtUser.role === "TEACHER" && !isSelf) {
        res.status(403).json({ error: "You can only edit your own profile" });
        return;
      }
      const isAdminEdit = jwtUser.role === "ADMIN";

      const s = (v: any) => (v == null ? null : String(v).trim() || null);
      const subjectsList = Array.isArray(b.subjects)
        ? b.subjects.map((x: string) => String(x).trim()).filter(Boolean)
        : String(b.subjects ?? "").split(",").map((x: string) => x.trim()).filter(Boolean);

      // Fields any teacher may change on their own profile.
      const teacherData: any = {
        ...(b.phone !== undefined ? { phone: s(b.phone) } : {}),
        ...(b.gender !== undefined ? { gender: s(b.gender) } : {}),
        ...(b.address !== undefined ? { address: s(b.address) } : {}),
        ...(b.subjects !== undefined ? { specialization: subjectsList.join(", ") || null } : {}),
        ...(b.notes !== undefined ? { notes: s(b.notes) } : {}),
      };
      // Admin-only fields.
      if (isAdminEdit) {
        if (b.employmentType !== undefined) teacherData.employmentType = ["FULL_TIME", "PART_TIME", "VOLUNTEER"].includes(b.employmentType) ? b.employmentType : "FULL_TIME";
        if (b.joinedDate) {
          const d = new Date(b.joinedDate);
          if (!isNaN(d.getTime())) teacherData.hireDate = d;
        }
        if (b.baseSalary !== undefined && !isNaN(Number(b.baseSalary))) teacherData.baseSalary = Number(b.baseSalary);
      }

      const userData: any = {
        ...(b.firstName ? { firstName: String(b.firstName).trim() } : {}),
        ...(b.lastName ? { lastName: String(b.lastName).trim() } : {}),
      };
      if (isAdminEdit && b.email) userData.email = String(b.email).trim().toLowerCase();
      if (isAdminEdit && b.status !== undefined) userData.isActive = b.status !== "INACTIVE";

      const updated = await prisma.$transaction(async (tx) => {
        const t = await tx.teacher.update({ where: { id }, data: teacherData });
        if (teacher.userId && Object.keys(userData).length) {
          await tx.user.update({ where: { id: teacher.userId }, data: userData });
        }
        return tx.teacher.findUnique({
          where: { id: t.id },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true, isActive: true, profilePhotoUrl: true } },
          },
        });
      });

      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "TEACHER", id,
        `Teacher profile updated${isSelf && !isAdminEdit ? " (self-service)" : ""}.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(updated);
    } catch (err: any) {
      if (err?.code === "P2002") { res.status(400).json({ error: "Email already exists" }); return; }
      logger.error("Error updating teacher:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Activate / deactivate a teacher (toggles the linked user account).
  app.put("/api/teachers/:id/status", authMiddleware, requirePermission("manage_teachers"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const status = req.body?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
      if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }
      if (!teacher.userId) { res.status(400).json({ error: "This teacher has no linked user account" }); return; }
      await prisma.user.update({ where: { id: teacher.userId }, data: { isActive: status === "ACTIVE" } });
      const name = `${teacher.user?.firstName ?? ""} ${teacher.user?.lastName ?? ""}`.trim() || teacher.teacherCode;
      await createAuditLog(jwtUser.userId, jwtUser.email, "STATUS_CHANGE", "TEACHER", id,
        `Teacher '${name}' set to ${status}.`, req.ip, req.headers["user-agent"] || null, status === "ACTIVE" ? "SUCCESS" : "WARNING");
      res.json({ success: true, status });
    } catch (err) {
      logger.error("Error updating teacher status:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/teachers/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              username: true, role: true, isActive: true, profilePhotoUrl: true,
            },
          },
          classes: { include: { class: true } },
          subjects: { include: { subject: true } },
        },
      });
      if (!teacher) {
        res.status(404).json({ error: "Teacher not found" });
        return;
      }
      if (jwtUser.role === "TEACHER" && teacher.userId !== jwtUser.userId) {
        res.status(403).json({ error: "You can only view your own teacher profile" });
        return;
      }
      res.json(teacher);
    } catch (err) {
      logger.error("Error fetching teacher:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/teachers/:id", authMiddleware, requirePermission("manage_teachers"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
      if (!teacher) {
        res.status(404).json({ error: "Teacher not found" });
        return;
      }
      const label = `${fullName(teacher.user) || "Unnamed"} (${teacher.teacherCode})`;

      await prisma.$transaction(async (tx) => {
        // As with student deletion: only a couple of Teacher's relations
        // cascade at the DB level, so the Teacher row can't just be deleted
        // directly once it has any class/subject assignments, homework, or
        // lesson plans (i.e. almost any real teacher). Clear those out
        // first; each cascades its own children (homework submissions,
        // lesson plan progress) per schema.prisma.
        await tx.classTeacher.deleteMany({ where: { teacherId: id } });
        await tx.subjectTeacher.deleteMany({ where: { teacherId: id } });
        await tx.homework.deleteMany({ where: { teacherId: id } });
        await tx.lessonPlan.deleteMany({ where: { teacherId: id } });
        // Payslips are financial history — unlink rather than delete them.
        await tx.payslip.updateMany({ where: { teacherId: id }, data: { teacherId: null } });

        await tx.teacher.delete({ where: { id } });

        if (teacher.userId) {
          const userId = teacher.userId;
          // Same as student deletion: clear the linked login account's own
          // chat/messaging/social footprint before deleting it.
          await tx.chatMessageReport.deleteMany({ where: { reportedById: userId } });
          await tx.chatMessage.deleteMany({ where: { senderId: userId } });
          await tx.conversationParticipant.deleteMany({ where: { userId } });
          await tx.conversation.deleteMany({ where: { createdById: userId } });
          await tx.messageRecipient.deleteMany({ where: { recipientId: userId } });
          await tx.message.deleteMany({ where: { senderId: userId } });
          await (tx as any).ebookProgress.deleteMany({ where: { userId } });
          await (tx as any).ebookHighlight.deleteMany({ where: { userId } });
          await tx.user.delete({ where: { id: userId } });
        }
      });

      // Permanent, irreversible — wipes this teacher's class/subject
      // assignments, homework, and lesson plans, and unlinks their payslip
      // history. Flagged WARNING severity given the blast radius.
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "TEACHER",
        id,
        `Teacher ${label} permanently deleted, including class/subject assignments, homework, and lesson plans.`,
        req.ip,
        req.headers["user-agent"] || null,
        "WARNING"
      );

      res.json({ message: "Teacher deleted successfully" });
    } catch (err: any) {
      logger.error("Error deleting teacher:", err);
      if (err.code === "P2003" || err.code === "P2014") {
        res.status(400).json({ error: "This teacher has related records that couldn't be removed automatically. Please contact support." });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher class scoping (used by classes, exams, gradebook, reports) ───────
  const teacherClassIds = async (req: express.Request): Promise<string[]> => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role === "ADMIN") {
      const all = await prisma.class.findMany({ select: { id: true } });
      return all.map((c) => c.id);
    }
    return getTeacherClassIds(jwtUser.userId);
  };
  const canAccessTeacherClass = async (req: express.Request, classId: string): Promise<boolean> => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role === "ADMIN") return true;
    const ids = await teacherClassIds(req);
    return ids.includes(classId);
  };

  // ── Classes & Subjects API ──────────────────────────────────────────────────
  app.get("/api/classes", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const showArchived = req.query.archived === "1" || req.query.archived === "true";
      const where: { status?: string | { not: string }; id?: { in: string[] } } =
        showArchived ? { status: "ARCHIVED" } : { status: { not: "ARCHIVED" } };
      if (jwtUser.role === "TEACHER") {
        const ids = await getTeacherClassIds(jwtUser.userId);
        where.id = { in: ids };
      }
      const classes = await prisma.class.findMany({
        where,
        include: { students: true }
      });
      res.json(classes);
    } catch (err) {
      logger.error("Error fetching classes:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/classes/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      if (jwtUser.role === "TEACHER" && !(await canAccessTeacherClass(req, id))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const klass = await prisma.class.findUnique({
        where: { id },
        include: {
          students: { include: { user: true } },
          teachers: { include: { teacher: { include: { user: true } } } },
          exams: { include: { subject: true } },
        },
      });
      if (!klass) {
        res.status(404).json({ error: "Class not found" });
        return;
      }
      // Attach directly-assigned subjects (degrades to [] before migration).
      const subjectLinks = await (prisma as any).classSubject
        .findMany({ where: { classId: id }, include: { subject: true } })
        .catch(() => []);
      res.json({ ...klass, subjects: subjectLinks });
    } catch (err) {
      logger.error("Error fetching class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Assign a teacher to a class.
  app.post("/api/classes/:id/teachers", authMiddleware, requirePermission("manage_classes"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const { teacherId } = req.body || {};
    if (!teacherId) { res.status(400).json({ error: "teacherId is required" }); return; }
    try {
      const [klass, teacher] = await Promise.all([
        prisma.class.findUnique({ where: { id } }),
        prisma.teacher.findUnique({ where: { id: teacherId }, include: { user: true } }),
      ]);
      if (!klass) { res.status(404).json({ error: "Class not found" }); return; }
      if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }
      await prisma.classTeacher.upsert({
        where: { classId_teacherId: { classId: id, teacherId } },
        update: {},
        create: { classId: id, teacherId },
      });
      const teacherName = `${teacher.user?.firstName ?? ""} ${teacher.user?.lastName ?? ""}`.trim() || teacher.teacherCode;
      await createAuditLog(jwtUser.userId, jwtUser.email, "ASSIGN", "CLASS_TEACHER", id,
        `Teacher '${teacherName}' assigned to class '${klass.name}'.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json({ success: true });
    } catch (err) {
      logger.error("Error assigning teacher to class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Remove a teacher from a class.
  app.delete("/api/classes/:id/teachers/:teacherId", authMiddleware, requirePermission("manage_classes"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id, teacherId } = req.params;
    try {
      await prisma.classTeacher.delete({ where: { classId_teacherId: { classId: id, teacherId } } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UNASSIGN", "CLASS_TEACHER", id,
        `Teacher ${teacherId} removed from class ${id}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Assignment not found" }); return; }
      logger.error("Error removing teacher from class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Assign a subject to a class.
  app.post("/api/classes/:id/subjects", authMiddleware, requirePermission("manage_classes"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const { subjectId } = req.body || {};
    if (!subjectId) { res.status(400).json({ error: "subjectId is required" }); return; }
    try {
      const [klass, subject] = await Promise.all([
        prisma.class.findUnique({ where: { id } }),
        prisma.subject.findUnique({ where: { id: subjectId } }),
      ]);
      if (!klass) { res.status(404).json({ error: "Class not found" }); return; }
      if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
      await (prisma as any).classSubject.upsert({
        where: { classId_subjectId: { classId: id, subjectId } },
        update: {},
        create: { classId: id, subjectId },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "ASSIGN", "CLASS_SUBJECT", id,
        `Subject '${subject.name}' assigned to class '${klass.name}'.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error assigning subject to class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Remove a subject from a class.
  app.delete("/api/classes/:id/subjects/:subjectId", authMiddleware, requirePermission("manage_classes"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id, subjectId } = req.params;
    try {
      await (prisma as any).classSubject.delete({ where: { classId_subjectId: { classId: id, subjectId } } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UNASSIGN", "CLASS_SUBJECT", id,
        `Subject ${subjectId} removed from class ${id}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Assignment not found" }); return; }
      logger.error("Error removing subject from class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Assign students to a class (moves them from their current class, if any).
  app.post("/api/classes/:id/students", authMiddleware, requirePermission("manage_classes"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const studentIds: string[] = Array.isArray(req.body?.studentIds)
      ? req.body.studentIds
      : (req.body?.studentId ? [req.body.studentId] : []);
    if (!studentIds.length) { res.status(400).json({ error: "studentIds is required" }); return; }
    try {
      const klass = await prisma.class.findUnique({ where: { id }, include: { _count: { select: { students: true } } } });
      if (!klass) { res.status(404).json({ error: "Class not found" }); return; }
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, classId: true },
      });
      if (students.length !== studentIds.length) {
        res.status(404).json({ error: "One or more students were not found" });
        return;
      }
      const newAssignments = students.filter((s) => s.classId !== id);
      if (klass.capacity != null) {
        const newTotal = klass._count.students + newAssignments.length;
        if (newTotal > klass.capacity) {
          res.status(400).json({ error: `Class capacity is ${klass.capacity}; this would make ${newTotal} students.` });
          return;
        }
      }
      await prisma.student.updateMany({ where: { id: { in: studentIds } }, data: { classId: id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "ASSIGN", "CLASS_STUDENT", id,
        `${studentIds.length} student(s) assigned to class '${klass.name}'.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json({ success: true, count: studentIds.length });
    } catch (err) {
      logger.error("Error assigning students to class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Remove a student from a class (leaves the student unassigned).
  app.delete("/api/classes/:id/students/:studentId", authMiddleware, requirePermission("manage_classes"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id, studentId } = req.params;
    try {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.classId !== id) { res.status(404).json({ error: "Student is not in this class" }); return; }
      await prisma.student.update({ where: { id: studentId }, data: { classId: null } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UNASSIGN", "CLASS_STUDENT", id,
        `Student ${student.studentCode || studentId} removed from class ${id}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json({ success: true });
    } catch (err) {
      logger.error("Error removing student from class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fix teachers with NULL userId by matching email to user accounts
  app.post("/api/admin/fix-teacher-userids", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    try {
      const teachersWithoutUser = await prisma.teacher.findMany({
        where: { userId: null },
        include: { user: true },
      });

      if (teachersWithoutUser.length === 0) {
        return res.json({ message: "All teachers have userIds set", fixed: 0 });
      }

      let fixed = 0;
      const results = [];

      for (const teacher of teachersWithoutUser) {
        // Try to find a user by matching the teacherCode to a pattern, or by email if user exists
        let user = await prisma.user.findFirst({
          where: {
            role: "TEACHER",
            OR: [
              { email: { contains: teacher.teacherCode.toLowerCase() } },
              { firstName: { equals: teacher.teacherCode, mode: "insensitive" } },
            ],
          },
        });

        if (user) {
          await prisma.teacher.update({
            where: { id: teacher.id },
            data: { userId: user.id },
          });
          fixed++;
          results.push({ teacherId: teacher.id, teacherCode: teacher.teacherCode, linkedToUser: user.email });
          logger.info(`Fixed teacher ${teacher.teacherCode}: linked to user ${user.email}`);
        } else {
          results.push({ teacherId: teacher.id, teacherCode: teacher.teacherCode, error: "No matching user found" });
        }
      }

      res.json({
        message: `Fixed ${fixed} out of ${teachersWithoutUser.length} teachers`,
        fixed,
        total: teachersWithoutUser.length,
        results,
      });
    } catch (err) {
      logger.error("Error fixing teacher userIds:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/subjects", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const showArchived = req.query.archived === "1" || req.query.archived === "true";
      const subjects = await prisma.subject.findMany({
        where: showArchived ? { status: "ARCHIVED" } : { status: { not: "ARCHIVED" } },
        include: { _count: { select: { teachers: true, exams: true } } },
        orderBy: { name: "asc" },
      });
      res.json(subjects);
    } catch (err) {
      logger.error("Error fetching subjects:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/subjects", authMiddleware, validate(schemas.subjectCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { name, code, level, description, status } = req.body;
    try {
      const subject = await prisma.subject.create({
        data: {
          name,
          code,
          level: level || "GED",
          description: description || null,
          status: status || "ACTIVE",
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "SUBJECT", subject.id,
        `Subject '${name}' created.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.status(201).json(subject);
    } catch (err: any) {
      logger.error("Error creating subject:", err);
      if (err.code === "P2002") {
        res.status(400).json({ error: "Subject code already exists" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/subjects/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const subject = await prisma.subject.findUnique({
        where: { id },
        include: {
          teachers: { include: { teacher: { include: { user: true } } } },
          classes: { include: { class: true } },
          exams: { include: { class: true } },
        },
      });
      if (!subject) {
        res.status(404).json({ error: "Subject not found" });
        return;
      }
      res.json(subject);
    } catch (err) {
      logger.error("Error fetching subject:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/subjects/:id", authMiddleware, validate(schemas.subjectUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { name, code, level, description, status } = req.body;
    try {
      const subject = await prisma.subject.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(code !== undefined ? { code } : {}),
          ...(level !== undefined ? { level: level || "GED" } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(status !== undefined ? { status: status || "ACTIVE" } : {}),
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "UPDATE", "SUBJECT", id,
        `Subject '${subject.name}' updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json(subject);
    } catch (err: any) {
      logger.error("Error updating subject:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Subject not found" });
        return;
      }
      if (err.code === "P2002") {
        res.status(400).json({ error: "Subject code already exists" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Assign a teacher to a subject (populates the SubjectTeacher join table).
  app.post("/api/subjects/:id/teachers", authMiddleware, requirePermission("manage_subjects"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const { teacherId } = req.body || {};
    if (!teacherId) { res.status(400).json({ error: "teacherId is required" }); return; }
    try {
      const [subject, teacher] = await Promise.all([
        prisma.subject.findUnique({ where: { id } }),
        prisma.teacher.findUnique({ where: { id: teacherId }, include: { user: true } }),
      ]);
      if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
      if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }
      await prisma.subjectTeacher.upsert({
        where: { subjectId_teacherId: { subjectId: id, teacherId } },
        update: {},
        create: { subjectId: id, teacherId },
      });
      const teacherName = `${teacher.user?.firstName ?? ""} ${teacher.user?.lastName ?? ""}`.trim() || teacher.teacherCode;
      await createAuditLog(jwtUser.userId, jwtUser.email, "ASSIGN", "SUBJECT_TEACHER", id,
        `Teacher '${teacherName}' assigned to subject '${subject.name}'.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json({ success: true });
    } catch (err) {
      logger.error("Error assigning teacher to subject:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Remove a teacher from a subject.
  app.delete("/api/subjects/:id/teachers/:teacherId", authMiddleware, requirePermission("manage_subjects"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id, teacherId } = req.params;
    try {
      await prisma.subjectTeacher.delete({ where: { subjectId_teacherId: { subjectId: id, teacherId } } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UNASSIGN", "SUBJECT_TEACHER", id,
        `Teacher ${teacherId} removed from subject ${id}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Assignment not found" }); return; }
      logger.error("Error removing teacher from subject:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Attendance API ──────────────────────────────────────────────────────────
  app.get("/api/attendance", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    // Only teachers can fetch attendance for recording
    if (jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden: Only teachers can access attendance data" });
      return;
    }
    const { classId, date, timetableEntryId } = req.query as { classId?: string; date?: string; timetableEntryId?: string };

    // Support both class-based and session-based attendance
    if ((!classId && !timetableEntryId) || !date) {
      res.status(400).json({ error: "date and either classId or timetableEntryId are required" });
      return;
    }

    try {
      const parsedDate = new Date(date);
      const startOfDay = new Date(parsedDate.setUTCHours(0, 0, 0, 0));

      // Session-based attendance
      if (timetableEntryId) {
        // Validate teacher is assigned to this session
        const timetableEntry = await prisma.timetableEntry.findUnique({
          where: { id: timetableEntryId },
          select: { id: true, teacherId: true, substituteTeacherId: true, classId: true, subjectId: true, status: true }
        });

        if (!timetableEntry) {
          res.status(404).json({ error: "Timetable entry not found" });
          return;
        }

        // Check if session is cancelled
        if (timetableEntry.status === "CANCELLED") {
          res.status(400).json({ error: "Cannot record attendance for cancelled sessions" });
          return;
        }

        // Validate teacher is assigned to this session (either as main teacher or substitute)
        const teacherUserId = await prisma.teacher.findUnique({
          where: { userId: jwtUser.userId },
          select: { id: true }
        });

        if (!teacherUserId) {
          res.status(403).json({ error: "Forbidden: Teacher record not found" });
          return;
        }

        const isTeacherAssigned = timetableEntry.teacherId === teacherUserId.id ||
                                   timetableEntry.substituteTeacherId === teacherUserId.id;

        if (!isTeacherAssigned) {
          res.status(403).json({ error: "Forbidden: You can only view attendance for sessions you teach" });
          return;
        }

        const attendances = await prisma.attendance.findMany({
          where: {
            timetableEntryId,
            date: startOfDay,
          },
          include: {
            student: {
              include: { user: true }
            }
          }
        });
        res.json({ type: "session", timetableEntry, attendances });
        return;
      }

      // Class-based attendance (existing behavior)
      if (classId) {
        // Validate teacher is assigned to this class
        const teacherClassIds = await getTeacherClassIds(jwtUser.userId);
        if (!teacherClassIds.includes(classId)) {
          res.status(403).json({ error: "Forbidden: You can only view attendance for your assigned classes" });
          return;
        }

        const attendances = await prisma.attendance.findMany({
          where: {
            classId,
            date: startOfDay,
            timetableEntryId: null,  // Only class-based records
          },
          include: {
            student: {
              include: { user: true }
            }
          }
        });
        res.json({ type: "class", attendances });
      }
    } catch (err) {
      logger.error("Error fetching attendance:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/attendance", authMiddleware, validate(schemas.attendance), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    // Only teachers can record attendance - admins should not take attendance
    if (jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden: Only teachers can record attendance" });
      return;
    }
    const { classId, date, records, timetableEntryId, subjectId } = req.body as {
      classId: string;
      date: string;
      timetableEntryId?: string;
      subjectId?: string;
      records: Array<{ studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks?: string }>;
    };

    if (!classId || !date || !records || !Array.isArray(records)) {
      res.status(400).json({ error: "classId, date, and records array are required" });
      return;
    }

    // Validate date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedDate = new Date(date);
    const attendanceDate = new Date(parsedDate);
    attendanceDate.setHours(0, 0, 0, 0);

    if (attendanceDate > today) {
      res.status(400).json({ error: "Cannot mark attendance for future dates" });
      return;
    }

    // Normalize to UTC midnight of the submitted calendar date (must match the
    // GET /api/attendance query key; mutating the locally-truncated date here
    // shifted records to the previous UTC day for timezones east of UTC).
    const startOfDay = new Date(new Date(date).setUTCHours(0, 0, 0, 0));

    // ── Session-based attendance ───────────────────────────────────────────────
    if (timetableEntryId) {
      // Validate teacher is assigned to this session
      const timetableEntry = await prisma.timetableEntry.findUnique({
        where: { id: timetableEntryId },
        select: {
          id: true,
          teacherId: true,
          substituteTeacherId: true,
          classId: true,
          subjectId: true,
          status: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true
        }
      });

      if (!timetableEntry) {
        res.status(404).json({ error: "Timetable entry not found" });
        return;
      }

      // Check if session is cancelled
      if (timetableEntry.status === "CANCELLED") {
        res.status(400).json({ error: "Cannot record attendance for cancelled sessions" });
        return;
      }

      // Verify classId matches
      if (timetableEntry.classId !== classId) {
        res.status(400).json({ error: "classId does not match the timetable entry" });
        return;
      }

      // Validate teacher is assigned to this session
      const teacherRecord = await prisma.teacher.findUnique({
        where: { userId: jwtUser.userId },
        select: { id: true }
      });

      if (!teacherRecord) {
        res.status(403).json({ error: "Forbidden: Teacher record not found" });
        return;
      }

      const isTeacherAssigned = timetableEntry.teacherId === teacherRecord.id ||
                                 timetableEntry.substituteTeacherId === teacherRecord.id;

      if (!isTeacherAssigned) {
        res.status(403).json({ error: "Forbidden: You can only record attendance for sessions you teach" });
        return;
      }

      // Validate all students are enrolled in this class
      const classStudents = await prisma.student.findMany({
        where: { classId },
        select: { id: true }
      });
      const classStudentIds = new Set(classStudents.map((s) => s.id));
      const invalidStudents = records.filter((rec) => !classStudentIds.has(rec.studentId));
      if (invalidStudents.length > 0) {
        res.status(400).json({
          error: "Invalid students",
          details: `${invalidStudents.map((r) => r.studentId).join(", ")} are not enrolled in this class`
        });
        return;
      }

      try {
        // For session-based attendance, we need to handle upsert differently
        // since we can't use the class-based unique constraint
        // Use Promise.all since operations are independent
        const results = await Promise.all(
          records.map(async (rec) => {
            // First, try to find existing attendance for this student+session+date
            const existing = await prisma.attendance.findFirst({
              where: {
                studentId: rec.studentId,
                timetableEntryId,
                date: startOfDay
              }
            });

            if (existing) {
              // Update existing
              return await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                  status: rec.status,
                  remarks: rec.remarks ? rec.remarks.substring(0, 500) : null,
                  recordedById: jwtUser.userId,
                }
              });
            } else {
              // Create new
              return await prisma.attendance.create({
                data: {
                  studentId: rec.studentId,
                  classId,
                  date: startOfDay,
                  status: rec.status,
                  remarks: rec.remarks ? rec.remarks.substring(0, 500) : null,
                  recordedById: jwtUser.userId,
                  timetableEntryId,
                  subjectId: timetableEntry.subjectId, // Use subjectId from timetable entry
                }
              });
            }
          })
        );

        await createAuditLog(
          jwtUser.userId,
          jwtUser.email,
          "STATUS_CHANGE",
          "SESSION_ATTENDANCE",
          timetableEntryId,
          `Session attendance recorded for timetable entry ${timetableEntryId} on ${date}.`,
          req.ip,
          req.headers["user-agent"] || null,
          "SUCCESS"
        );

        // Check badges for all students with recorded attendance
        for (const rec of records) {
          checkAndAwardBadges(rec.studentId, 'ATTENDANCE').catch(err =>
            logger.error(`Error checking badges for student ${rec.studentId}:`, err)
          );
        }

        res.json({ success: true, count: results.length, type: "session", timetableEntryId });
        return;
      } catch (err) {
        logger.error("Error saving session attendance:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
    }

    // ── Class-based attendance (existing behavior) ───────────────────────────────
    // Validate teacher is assigned to this class
    const teacherClassIds = await getTeacherClassIds(jwtUser.userId);
    if (!teacherClassIds.includes(classId)) {
      res.status(403).json({ error: "Forbidden: You can only record attendance for your assigned classes" });
      return;
    }

    // Validate all students are enrolled in this class
    const classStudents = await prisma.student.findMany({
      where: { classId },
      select: { id: true }
    });
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    const invalidStudents = records.filter((rec) => !classStudentIds.has(rec.studentId));
    if (invalidStudents.length > 0) {
      res.status(400).json({
        error: "Invalid students",
        details: `${invalidStudents.map((r) => r.studentId).join(", ")} are not enrolled in this class`
      });
      return;
    }

    try {
      const results = await prisma.$transaction(
        records.map((rec) =>
          prisma.attendance.upsert({
            where: {
              studentId_classId_date: {
                studentId: rec.studentId,
                classId,
                date: startOfDay,
              }
            },
            update: {
              status: rec.status,
              remarks: rec.remarks ? rec.remarks.substring(0, 500) : null,
              recordedById: jwtUser.userId,
            },
            create: {
              studentId: rec.studentId,
              classId,
              date: startOfDay,
              status: rec.status,
              remarks: rec.remarks ? rec.remarks.substring(0, 500) : null,
              recordedById: jwtUser.userId,
            }
          })
        )
      );

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "STATUS_CHANGE",
        "ATTENDANCE",
        classId,
        `Attendance recorded for class ${classId} on ${date}.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      // Check badges for all students with recorded attendance
      for (const rec of records) {
        checkAndAwardBadges(rec.studentId, 'ATTENDANCE').catch(err =>
          logger.error(`Error checking badges for student ${rec.studentId}:`, err)
        );
      }

      res.json({ success: true, count: results.length, type: "class" });
    } catch (err) {
      logger.error("Error saving attendance:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Bulk session attendance: Mark attendance for multiple sessions at once
  app.post("/api/attendance/bulk", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden: Only teachers can record attendance" });
      return;
    }

    const { date, sessionRecords } = req.body as {
      date: string;
      sessionRecords: Array<{
        timetableEntryId: string;
        records: Array<{ studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks?: string }>;
      }>;
    };

    if (!date || !sessionRecords || !Array.isArray(sessionRecords)) {
      res.status(400).json({ error: "date and sessionRecords array are required" });
      return;
    }

    if (sessionRecords.length === 0) {
      res.status(400).json({ error: "At least one session record is required" });
      return;
    }

    // Validate date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    if (attendanceDate > today) {
      res.status(400).json({ error: "Cannot mark attendance for future dates" });
      return;
    }

    // Normalize to UTC midnight of the submitted calendar date (see note in
    // POST /api/attendance — keeps the storage key consistent with reads).
    const startOfDay = new Date(new Date(date).setUTCHours(0, 0, 0, 0));

    // Get teacher record
    const teacherRecord = await prisma.teacher.findUnique({
      where: { userId: jwtUser.userId },
      select: { id: true }
    });

    if (!teacherRecord) {
      res.status(403).json({ error: "Forbidden: Teacher record not found" });
      return;
    }

    try {
      // Validate all sessions and get their details
      const sessionIds = sessionRecords.map(s => s.timetableEntryId);
      const timetableEntries = await prisma.timetableEntry.findMany({
        where: { id: { in: sessionIds } },
        select: {
          id: true,
          teacherId: true,
          substituteTeacherId: true,
          classId: true,
          subjectId: true,
          subjectName: true,
          status: true
        }
      });

      // Check for missing or cancelled sessions
      const missingIds = sessionIds.filter(id => !timetableEntries.find(e => e.id === id));
      if (missingIds.length > 0) {
        res.status(404).json({ error: "Sessions not found", details: missingIds });
        return;
      }

      const cancelledSessions = timetableEntries.filter(e => e.status === "CANCELLED");
      if (cancelledSessions.length > 0) {
        res.status(400).json({ error: "Cannot record attendance for cancelled sessions", details: cancelledSessions.map(e => e.id) });
        return;
      }

      // Validate teacher is assigned to all sessions
      const unauthorizedSessions = timetableEntries.filter(e =>
        e.teacherId !== teacherRecord.id && e.substituteTeacherId !== teacherRecord.id
      );

      if (unauthorizedSessions.length > 0) {
        res.status(403).json({
          error: "Forbidden: You can only record attendance for sessions you teach",
          details: unauthorizedSessions.map(e => e.id)
        });
        return;
      }

      // Process each session
      const results: Array<{ sessionId: string; subjectName: string; count: number; success: boolean; error?: string }> = [];

      for (const sessionRecord of sessionRecords) {
        const session = timetableEntries.find(e => e.id === sessionRecord.timetableEntryId);
        if (!session) {
          results.push({ sessionId: sessionRecord.timetableEntryId, subjectName: "Unknown", count: 0, success: false, error: "Session not found" });
          continue;
        }

        try {
          // Validate all students are enrolled in this class
          const classStudents = await prisma.student.findMany({
            where: { classId: session.classId },
            select: { id: true }
          });
          const classStudentIds = new Set(classStudents.map((s) => s.id));
          const invalidStudents = sessionRecord.records.filter((rec) => !classStudentIds.has(rec.studentId));

          if (invalidStudents.length > 0) {
            results.push({
              sessionId: session.id,
              subjectName: session.subjectName || "Unknown",
              count: 0,
              success: false,
              error: `Invalid students: ${invalidStudents.map(r => r.studentId).join(", ")}`
            });
            continue;
          }

          // Create/update attendance records
          const sessionResults = await Promise.all(
            sessionRecord.records.map(async (rec) => {
              const existing = await prisma.attendance.findFirst({
                where: {
                  studentId: rec.studentId,
                  timetableEntryId: session.id,
                  date: startOfDay
                }
              });

              if (existing) {
                return await prisma.attendance.update({
                  where: { id: existing.id },
                  data: {
                    status: rec.status,
                    remarks: rec.remarks ? rec.remarks.substring(0, 500) : null,
                    recordedById: jwtUser.userId,
                  }
                });
              } else {
                return await prisma.attendance.create({
                  data: {
                    studentId: rec.studentId,
                    classId: session.classId,
                    date: startOfDay,
                    status: rec.status,
                    remarks: rec.remarks ? rec.remarks.substring(0, 500) : null,
                    recordedById: jwtUser.userId,
                    timetableEntryId: session.id,
                    subjectId: session.subjectId,
                  }
                });
              }
            })
          );

          results.push({
            sessionId: session.id,
            subjectName: session.subjectName || "Unknown",
            count: sessionResults.length,
            success: true
          });

          await createAuditLog(
            jwtUser.userId,
            jwtUser.email,
            "BULK_ATTENDANCE",
            "SESSION_ATTENDANCE",
            session.id,
            `Bulk attendance recorded for session ${session.id} (${session.subjectName}) on ${date}.`,
            req.ip,
            req.headers["user-agent"] || null,
            "SUCCESS"
          );

        } catch (err: any) {
          results.push({
            sessionId: session.id,
            subjectName: session.subjectName || "Unknown",
            count: 0,
            success: false,
            error: err.message || "Unknown error"
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.reduce((sum, r) => sum + r.count, 0);

      res.json({
        success: true,
        sessionsProcessed: results.length,
        sessionsSuccessful: successCount,
        totalRecords: totalCount,
        results
      });

    } catch (err: any) {
      logger.error("Error saving bulk attendance:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Student Success, interventions, and notifications ─────────────────────
  const ensureNotification = async (input: {
    userId: string; type: string; title: string; message: string; href?: string | null; sourceId: string;
  }) => {
    const preference = await prisma.notificationPreference.upsert({
      where: { userId: input.userId }, update: {}, create: { userId: input.userId },
      include: { user: { select: { email: true } } },
    });
    const typeEnabled = input.type === "HOMEWORK_DUE"
      ? preference.homeworkReminders
      : input.type.startsWith("HOMEWORK_")
        ? preference.resultNotifications
      : input.type === "EXAM_RESULT"
        ? preference.resultNotifications
        : input.type.startsWith("INTERVENTION_")
          ? preference.interventionReminders
          : true;
    if (!typeEnabled) return null;
    if (!preference.inAppEnabled && !preference.emailEnabled) return null;
    const notification = await prisma.notification.upsert({
      where: { userId_sourceId: { userId: input.userId, sourceId: input.sourceId } },
      update: { title: input.title, message: input.message, href: input.href ?? null },
      create: {
        ...input,
        href: input.href ?? null,
        deliveries: {
          create: [
            ...(preference.inAppEnabled ? [{ channel: "IN_APP", status: "SENT", attempts: 1, sentAt: new Date() }] : []),
            ...(preference.emailEnabled ? [{ channel: "EMAIL", status: "QUEUED" }] : []),
          ],
        },
      },
    });
    if (preference.emailEnabled) {
      const href = input.href ? `${APP_URL}${input.href.startsWith("/") ? input.href : `/${input.href}`}` : APP_URL;
      await queueEmail({
        userId: input.userId,
        toEmail: preference.user.email,
        subject: input.title,
        dedupeKey: `notification:${notification.id}`,
        textBody: `${input.message}\n\nOpen MRLC LMS: ${href}`,
        htmlBody: `<p>${escapeEmailHtml(input.message)}</p><p><a href="${escapeEmailHtml(href)}">Open MRLC LMS</a></p>`,
      });
      void processEmailOutbox();
    }
    return notification;
  };

  const syncStudentNotifications = async (userId: string) => {
    const student = await prisma.student.findUnique({ where: { userId }, select: { id: true, classId: true } });
    if (!student) return;
    const preference = await prisma.notificationPreference.upsert({
      where: { userId }, update: {}, create: { userId },
    });
    const now = new Date();
    if (preference.homeworkReminders && student.classId) {
      const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const due = await prisma.homework.findMany({
        where: {
          classId: student.classId, status: "OPEN", dueDate: { gte: now, lte: deadline },
          submissions: { none: { studentId: student.id } },
        },
        include: { subject: { select: { name: true } } },
        take: 20,
      });
      await Promise.all(due.map((homework) => ensureNotification({
        userId, type: "HOMEWORK_DUE", title: "Homework due soon",
        message: `${homework.title}${homework.subject?.name ? ` · ${homework.subject.name}` : ""} is due ${homework.dueDate.toLocaleDateString()}.`,
        href: "/student/homework", sourceId: `homework-due:${homework.id}`,
      })));
    }
    if (preference.resultNotifications) {
      const [submissions, attempts] = await Promise.all([
        prisma.homeworkSubmission.findMany({
          where: { studentId: student.id, status: { in: ["MARKED", "REDO"] }, markedAt: { not: null } },
          include: { homework: { select: { title: true } } }, orderBy: { markedAt: "desc" }, take: 20,
        }),
        prisma.examAttempt.findMany({
          where: { studentId: student.id, releasedAt: { not: null } },
          include: { exam: { select: { title: true } } }, orderBy: { releasedAt: "desc" }, take: 20,
        }),
      ]);
      await Promise.all([
        ...submissions.map((submission) => ensureNotification({
          userId, type: submission.status === "REDO" ? "HOMEWORK_REDO" : "HOMEWORK_MARKED",
          title: submission.status === "REDO" ? "Homework needs changes" : "Homework marked",
          message: submission.status === "REDO"
            ? `${submission.homework.title} was returned with feedback. Please update and resubmit it.`
            : `${submission.homework.title} has been marked${submission.score == null ? "." : `: ${submission.score} points.`}`,
          href: "/student/homework", sourceId: `homework-result:${submission.id}:${submission.updatedAt.getTime()}`,
        })),
        ...attempts.map((attempt) => ensureNotification({
          userId, type: "EXAM_RESULT", title: "Exam result released",
          message: `${attempt.exam.title} is ready to view${attempt.score == null ? "." : `: ${attempt.score} points.`}`,
          href: `/exam2/attempts/${attempt.id}/result`, sourceId: `exam-result:${attempt.id}:${attempt.releasedAt?.getTime()}`,
        })),
      ]);
    }
  };

  const syncInterventionNotifications = async (userId: string) => {
    const preference = await prisma.notificationPreference.upsert({
      where: { userId }, update: {}, create: { userId },
    });
    if (!preference.interventionReminders) return;
    const now = new Date();
    const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const plans = await prisma.interventionPlan.findMany({
      where: {
        assignedToId: userId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lte: deadline },
      },
      include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
      take: 30,
      orderBy: { dueDate: "asc" },
    });
    await Promise.all(plans.map((plan) => {
      const studentName = `${plan.student.user?.firstName || ""} ${plan.student.user?.lastName || ""}`.trim() || plan.student.studentCode;
      const overdue = Boolean(plan.dueDate && plan.dueDate < now);
      return ensureNotification({
        userId,
        type: "INTERVENTION_DUE",
        title: overdue ? "Intervention action overdue" : "Intervention review due soon",
        message: `${plan.title} for ${studentName} ${overdue ? "is overdue" : "is due within 48 hours"}.`,
        href: "/student-success",
        sourceId: `intervention-due:${plan.id}:${overdue ? "overdue" : "due"}`,
      });
    }));
  };

  app.get("/api/student-success", authMiddleware, requirePermission("view_interventions"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const classIds = jwtUser.role === "TEACHER" ? await getTeacherClassIds(jwtUser.userId) : null;
      const students = await prisma.student.findMany({
        where: { status: "ACTIVE", ...(classIds ? { classId: { in: classIds } } : {}) },
        include: {
          user: { select: { firstName: true, lastName: true, profilePhotoUrl: true } },
          class: { select: { name: true } },
          attendances: { where: { date: { gte: since } }, select: { status: true } },
          homeworkSubmissions: { where: { homework: { dueDate: { gte: since } } }, select: { homeworkId: true } },
          examAttempts: {
            where: { completedAt: { gte: since }, score: { not: null }, exam: { totalMarks: { gt: 0 } } },
            select: { score: true, exam: { select: { totalMarks: true } } },
          },
          gedReadiness: { select: { status: true } },
          interventions: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, select: { id: true } },
          caseRecords: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, select: { id: true } },
        },
        orderBy: { studentCode: "asc" },
      });
      const eligibleClassIds = [...new Set(students.map((student) => student.classId).filter(Boolean))] as string[];
      const homeworks = eligibleClassIds.length ? await prisma.homework.findMany({
        where: { classId: { in: eligibleClassIds }, dueDate: { gte: since, lt: new Date() } },
        select: { id: true, classId: true },
      }) : [];
      const result = students.map((student) => {
        const reasons: { code: string; label: string; severity: "HIGH" | "MEDIUM" }[] = [];
        const countableAttendance = student.attendances.filter((row) => row.status !== "EXCUSED");
        const attendanceTotal = countableAttendance.length;
        const attended = student.attendances.filter((row) => row.status === "PRESENT" || row.status === "LATE").length;
        const attendanceRate = attendanceTotal ? Math.round((attended / attendanceTotal) * 100) : null;
        const submitted = new Set(student.homeworkSubmissions.map((row) => row.homeworkId));
        const missingHomework = homeworks.filter((row) => row.classId === student.classId && !submitted.has(row.id)).length;
        const examAverage = student.examAttempts.length
          ? Math.round(student.examAttempts.reduce((sum, row) => {
              return sum + (Number(row.score || 0) / Number(row.exam.totalMarks)) * 100;
            }, 0) / student.examAttempts.length)
          : null;
        const developingGed = student.gedReadiness.filter((row) => row.status === "NOT_READY" || row.status === "DEVELOPING").length;
        if (attendanceRate != null && attendanceTotal >= 3 && attendanceRate < 80) reasons.push({ code: "ATTENDANCE", label: `Attendance is ${attendanceRate}%`, severity: attendanceRate < 65 ? "HIGH" : "MEDIUM" });
        if (missingHomework >= 2) reasons.push({ code: "HOMEWORK", label: `${missingHomework} overdue homework items`, severity: missingHomework >= 4 ? "HIGH" : "MEDIUM" });
        if (examAverage != null && student.examAttempts.length >= 2 && examAverage < 60) reasons.push({ code: "EXAMS", label: `Recent exam average is ${examAverage}`, severity: examAverage < 45 ? "HIGH" : "MEDIUM" });
        if (developingGed >= 2) reasons.push({ code: "GED", label: `${developingGed} GED areas need support`, severity: developingGed >= 4 ? "HIGH" : "MEDIUM" });
        const score = Math.min(100, reasons.reduce((sum, reason) => sum + (reason.severity === "HIGH" ? 30 : 18), 0));
        return {
          id: student.id, studentCode: student.studentCode,
          name: `${student.user?.firstName || ""} ${student.user?.lastName || ""}`.trim() || student.preferredName || student.studentCode,
          profilePhotoUrl: student.user?.profilePhotoUrl || student.profilePhotoUrl, className: student.class?.name || "Unassigned",
          risk: score >= 50 ? "HIGH" : score >= 18 ? "MEDIUM" : "LOW", score, reasons,
          metrics: { attendanceRate, missingHomework, examAverage, developingGed },
          activeInterventions: student.interventions.length, openCases: student.caseRecords.length,
        };
      }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      res.json({ students: result, thresholds: { attendance: 80, missingHomework: 2, examAverage: 60, gedAreas: 2 } });
    } catch (err) {
      logger.error("Error calculating student success risks:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/interventions", authMiddleware, requirePermission("view_interventions"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const classIds = jwtUser.role === "TEACHER" ? await getTeacherClassIds(jwtUser.userId) : null;
      const rows = await prisma.interventionPlan.findMany({
        where: {
          ...(classIds ? { student: { classId: { in: classIds } } } : {}),
          ...(typeof req.query.studentId === "string" ? { studentId: req.query.studentId } : {}),
        },
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        }, orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      });
      res.json(rows);
    } catch (err) {
      logger.error("Error fetching interventions:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/interventions/assignees", authMiddleware, requirePermission("view_interventions"), async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["ADMIN", "TEACHER", "CASE_WORKER"] } },
      select: { id: true, firstName: true, lastName: true, role: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    res.json(users);
  });

  app.post("/api/interventions", authMiddleware, requirePermission("manage_interventions"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { studentId, title, reason, priority, assignedToId, dueDate, notes } = req.body || {};
    if (!studentId || !String(title || "").trim() || !String(reason || "").trim()) {
      res.status(400).json({ error: "Student, title, and reason are required" }); return;
    }
    if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority || "MEDIUM")) { res.status(400).json({ error: "Invalid priority" }); return; }
    try {
      if (jwtUser.role === "TEACHER") {
        const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } });
        const classIds = await getTeacherClassIds(jwtUser.userId);
        if (!student?.classId || !classIds.includes(student.classId)) { res.status(403).json({ error: "Forbidden: student is not in your class" }); return; }
      }
      const row = await prisma.interventionPlan.create({ data: {
        studentId, title: String(title).trim(), reason: String(reason).trim(), priority: priority || "MEDIUM",
        assignedToId: assignedToId || null, dueDate: dueDate ? new Date(dueDate) : null,
        notes: String(notes || "").trim() || null, createdById: jwtUser.userId,
      }});
      if (assignedToId && assignedToId !== jwtUser.userId) await ensureNotification({
        userId: assignedToId, type: "INTERVENTION_ASSIGNED", title: "Intervention assigned",
        message: `${row.title} has been assigned to you.`, href: "/student-success", sourceId: `intervention-assigned:${row.id}`,
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "INTERVENTION", row.id,
        `Intervention '${row.title}' created for student ${studentId}.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.status(201).json(row);
    } catch (err) {
      logger.error("Error creating intervention:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/interventions/:id", authMiddleware, requirePermission("manage_interventions"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const allowedStatuses = ["OPEN", "IN_PROGRESS", "MONITORING", "COMPLETED", "CANCELLED"];
    const data: any = {};
    for (const key of ["title", "reason", "notes", "outcome", "assignedToId", "dueDate"] as const) {
      if (req.body?.[key] !== undefined) data[key] = req.body[key] || null;
    }
    if (req.body?.priority !== undefined) {
      if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(req.body.priority)) { res.status(400).json({ error: "Invalid priority" }); return; }
      data.priority = req.body.priority;
    }
    if (req.body?.status !== undefined) {
      if (!allowedStatuses.includes(req.body.status)) { res.status(400).json({ error: "Invalid status" }); return; }
      data.status = req.body.status; data.completedAt = req.body.status === "COMPLETED" ? new Date() : null;
    }
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    try {
      const existing = await prisma.interventionPlan.findUnique({ where: { id: req.params.id }, include: { student: { select: { classId: true } } } });
      if (!existing) { res.status(404).json({ error: "Intervention not found" }); return; }
      if (jwtUser.role === "TEACHER") {
        const classIds = await getTeacherClassIds(jwtUser.userId);
        if (!existing.student.classId || !classIds.includes(existing.student.classId)) { res.status(403).json({ error: "Forbidden" }); return; }
      }
      const row = await prisma.interventionPlan.update({ where: { id: req.params.id }, data });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "INTERVENTION", row.id,
        `Intervention '${row.title}' updated to ${row.status}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(row);
    } catch (err) {
      logger.error("Error updating intervention:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/notifications", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      await Promise.all([
        jwtUser.role === "STUDENT" ? syncStudentNotifications(jwtUser.userId) : Promise.resolve(),
        syncInterventionNotifications(jwtUser.userId),
      ]);
      const preference = await prisma.notificationPreference.upsert({ where: { userId: jwtUser.userId }, update: {}, create: { userId: jwtUser.userId } });
      const rows = preference.inAppEnabled ? await prisma.notification.findMany({
        where: { userId: jwtUser.userId }, orderBy: { createdAt: "desc" }, take: 50,
      }) : [];
      res.json({ notifications: rows, unreadCount: rows.filter((row) => !row.readAt).length, preferences: preference });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json({ notifications: [], unreadCount: 0, migrationRequired: true }); return; }
      logger.error("Error fetching notifications:", err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: jwtUser.userId }, data: { readAt: new Date() } });
    res.json({ success: true });
  });
  app.post("/api/notifications/read-all", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    await prisma.notification.updateMany({ where: { userId: jwtUser.userId, readAt: null }, data: { readAt: new Date() } });
    res.json({ success: true });
  });
  app.put("/api/notifications/preferences", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const fields = ["inAppEnabled", "homeworkReminders", "resultNotifications", "interventionReminders", "emailEnabled"] as const;
    const data: Record<string, boolean> = {};
    for (const field of fields) if (typeof req.body?.[field] === "boolean") data[field] = req.body[field];
    const preference = await prisma.notificationPreference.upsert({
      where: { userId: jwtUser.userId }, update: data, create: { userId: jwtUser.userId, ...data },
    });
    res.json(preference);
  });

  // ── Cases (Support/Safeguarding) API ──────────────────────────────────────
  app.get("/api/cases", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "CASE_WORKER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { studentId } = req.query as { studentId?: string };
    try {
      const cases = await prisma.caseRecord.findMany({
        where: studentId ? { studentId } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            include: { user: true }
          },
          notes: {
            include: {
              createdBy: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      });
      res.json(cases);
    } catch (err) {
      logger.error("Error fetching cases:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/cases", authMiddleware, validate(schemas.caseCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "CASE_WORKER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { studentId, title, description, priority, category } = req.body;
    if (!studentId || !title || !description) {
      res.status(400).json({ error: "studentId, title, and description are required" });
      return;
    }
    try {
      const newCase = await prisma.caseRecord.create({
        data: {
          studentId,
          title,
          description,
          priority: priority || "MEDIUM",
          category: category || null,
        },
        include: {
          student: {
            include: { user: true }
          }
        }
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "CASE",
        newCase.id,
        `Safeguarding case '${title}' opened.`,
        req.ip,
        req.headers["user-agent"] || null,
        "WARNING"
      );

      res.status(201).json(newCase);
    } catch (err) {
      logger.error("Error creating case:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Library API ─────────────────────────────────────────────────────────────
  const uploadLibraryFile = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    libraryFileUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Library files must be 50 MB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  const uploadVideoFile = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    videoFileUpload.single("video")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Video files must be 2 GB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  const uploadVideoChunk = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    videoChunkUpload.single("chunk")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Video upload chunks must be 20 MB or smaller"
          : err.message || "Chunk upload failed";
      res.status(400).json({ error: message });
    });
  };

  const uploadCaptionFile = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    captionFileUpload.single("captions")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Subtitle files must be 2 MB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  const uploadVideoThumbnail = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    videoThumbnailUpload.single("thumbnail")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Thumbnail images must be 5 MB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  const uploadAdmissionFile = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    admissionFileUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Admission documents must be 25 MB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  // ── Admissions & Enrollment API ────────────────────────────────────────────
  const canManageAdmissions = (role: string) => role === "ADMIN" || role === "STAFF";
  const admissionDb = prisma as any;
  const requiredAdmissionDocuments = [
    { title: "Identity / UNHCR / PPN / CCN", documentType: "IDENTITY" },
    { title: "Previous education record", documentType: "SCHOOL_RECORD" },
    { title: "Guardian document", documentType: "GUARDIAN_DOC" },
    { title: "Medical information", documentType: "MEDICAL" },
    { title: "Student photo", documentType: "PHOTO" },
  ];

  const parseAdmissionDate = (value: unknown): Date | null => {
    if (!value || typeof value !== "string") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const splitApplicantName = (name: string) => {
    const parts = name.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
    if (parts.length <= 1) return { firstName: parts[0] || "Student", lastName: "" };
    return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) || "" };
  };

  const nextAdmissionNo = async (tx: any) => {
    const year = new Date().getFullYear();
    const count = await tx.admissionApplication.count({
      where: { applicationNo: { startsWith: `APP-${year}-` } },
    });
    return `APP-${year}-${String(count + 1).padStart(4, "0")}`;
  };

  const nextStudentCode = async (tx: any) => {
    const year = new Date().getFullYear();
    const count = await tx.student.count({
      where: { studentCode: { startsWith: `ST-${year}-` } },
    });
    return `ST-${year}-${String(count + 1).padStart(3, "0")}`;
  };

  const addAdmissionTimeline = async (
    tx: any,
    applicationId: string,
    eventType: string,
    title: string,
    description: string | null,
    fromStatus: string | null,
    toStatus: string | null,
    jwtUser: JwtPayload,
  ) => tx.admissionTimelineEvent.create({
    data: {
      applicationId,
      eventType,
      title,
      description,
      fromStatus,
      toStatus,
      createdById: jwtUser.userId,
      createdByName: jwtUser.email,
    },
  });

  const admissionInclude = {
    documents: { orderBy: { createdAt: "asc" } },
    timeline: { orderBy: { createdAt: "asc" } },
  };

  app.get("/api/admissions", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { status, q, targetLevel, boardingType, legalDocumentationStatus } = req.query as Record<string, string | undefined>;
    try {
      const applications = await admissionDb.admissionApplication.findMany({
        where: {
          ...(status && status !== "all" ? { status } : {}),
          ...(targetLevel && targetLevel !== "all" ? { targetLevel } : {}),
          ...(boardingType && boardingType !== "all" ? { boardingType } : {}),
          ...(legalDocumentationStatus && legalDocumentationStatus !== "all" ? { legalDocumentationStatus } : {}),
          ...(q
            ? {
                OR: [
                  { applicantName: { contains: q, mode: "insensitive" } },
                  { applicationNo: { contains: q, mode: "insensitive" } },
                  { guardianName: { contains: q, mode: "insensitive" } },
                  { identityNumber: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { documents: true },
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      });
      res.json(applications);
    } catch (err) {
      logger.error("Error fetching admissions:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admissions", authMiddleware, validate(schemas.admissionApplication), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const application = await prisma.$transaction(async (tx) => {
        const applicationNo = await nextAdmissionNo(tx);
        const created = await (tx as any).admissionApplication.create({
          data: {
            applicationNo,
            applicantName: req.body.applicantName,
            preferredName: req.body.preferredName || null,
            email: req.body.email || null,
            dateOfBirth: parseAdmissionDate(req.body.dateOfBirth),
            gender: req.body.gender || null,
            country: req.body.country || null,
            address: req.body.address || null,
            contactNumber: req.body.contactNumber || null,
            targetLevel: req.body.targetLevel || null,
            targetClassId: req.body.targetClassId || null,
            previousSchool: req.body.previousSchool || null,
            previousEducationLevel: req.body.previousEducationLevel || null,
            previousEducationNotes: req.body.previousEducationNotes || null,
            guardianName: req.body.guardianName || null,
            guardianRelationship: req.body.guardianRelationship || null,
            guardianPhone: req.body.guardianPhone || null,
            guardianEmail: req.body.guardianEmail || null,
            emergencyContactName: req.body.emergencyContactName || null,
            emergencyContactPhone: req.body.emergencyContactPhone || null,
            emergencyContactRelationship: req.body.emergencyContactRelationship || null,
            identityType: req.body.identityType || null,
            identityNumber: req.body.identityNumber || null,
            legalDocumentationStatus: req.body.legalDocumentationStatus || "PENDING",
            boardingType: req.body.boardingType || "DAY",
            medicalInformation: req.body.medicalInformation || null,
            allergies: req.body.allergies || null,
            medicationNotes: req.body.medicationNotes || null,
            interviewAt: parseAdmissionDate(req.body.interviewAt),
            interviewMode: req.body.interviewMode || null,
            interviewLocation: req.body.interviewLocation || null,
            interviewNotes: req.body.interviewNotes || null,
            status: req.body.status || "SUBMITTED",
            priority: req.body.priority || "NORMAL",
            notes: req.body.notes || null,
            createdById: jwtUser.userId,
            createdByName: jwtUser.email,
          },
        });
        await (tx as any).admissionDocument.createMany({
          data: requiredAdmissionDocuments.map((doc) => ({
            applicationId: created.id,
            ...doc,
            checklistStatus: "PENDING",
          })),
        });
        await addAdmissionTimeline(tx, created.id, "CREATED", "Application submitted", `Application ${applicationNo} created.`, null, created.status, jwtUser);
        return (tx as any).admissionApplication.findUnique({ where: { id: created.id }, include: admissionInclude });
      });

      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "ADMISSION", application.id, `Admission application ${application.applicationNo} created.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(application);
    } catch (err: any) {
      logger.error("Error creating admission application:", err);
      if (err.code === "P2002") {
        res.status(409).json({ error: "Admission application number already exists" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/admissions/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const application = await admissionDb.admissionApplication.findUnique({
        where: { id: req.params.id },
        include: admissionInclude,
      });
      if (!application) {
        res.status(404).json({ error: "Admission application not found" });
        return;
      }
      res.json(application);
    } catch (err) {
      logger.error("Error fetching admission application:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/admissions/:id", authMiddleware, validate(schemas.admissionApplication), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const updated = await admissionDb.admissionApplication.update({
        where: { id: req.params.id },
        data: {
          applicantName: req.body.applicantName,
          preferredName: req.body.preferredName || null,
          email: req.body.email || null,
          dateOfBirth: parseAdmissionDate(req.body.dateOfBirth),
          gender: req.body.gender || null,
          country: req.body.country || null,
          address: req.body.address || null,
          contactNumber: req.body.contactNumber || null,
          targetLevel: req.body.targetLevel || null,
          targetClassId: req.body.targetClassId || null,
          previousSchool: req.body.previousSchool || null,
          previousEducationLevel: req.body.previousEducationLevel || null,
          previousEducationNotes: req.body.previousEducationNotes || null,
          guardianName: req.body.guardianName || null,
          guardianRelationship: req.body.guardianRelationship || null,
          guardianPhone: req.body.guardianPhone || null,
          guardianEmail: req.body.guardianEmail || null,
          emergencyContactName: req.body.emergencyContactName || null,
          emergencyContactPhone: req.body.emergencyContactPhone || null,
          emergencyContactRelationship: req.body.emergencyContactRelationship || null,
          identityType: req.body.identityType || null,
          identityNumber: req.body.identityNumber || null,
          legalDocumentationStatus: req.body.legalDocumentationStatus || "PENDING",
          boardingType: req.body.boardingType || "DAY",
          medicalInformation: req.body.medicalInformation || null,
          allergies: req.body.allergies || null,
          medicationNotes: req.body.medicationNotes || null,
          priority: req.body.priority || "NORMAL",
          notes: req.body.notes || null,
        },
        include: admissionInclude,
      });
      await admissionDb.admissionTimelineEvent.create({
        data: {
          applicationId: req.params.id,
          eventType: "UPDATED",
          title: "Application updated",
          description: "Application profile information was updated.",
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "ADMISSION", updated.id, `Admission application ${updated.applicationNo || updated.id} updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(updated);
    } catch (err: any) {
      logger.error("Error updating admission application:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Admission application not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admissions/:id/status", authMiddleware, validate(schemas.admissionStatusUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        const current = await (tx as any).admissionApplication.findUnique({ where: { id: req.params.id } });
        if (!current) throw Object.assign(new Error("Admission application not found"), { http: 404 });
        const updated = await (tx as any).admissionApplication.update({
          where: { id: req.params.id },
          data: { status: req.body.status },
          include: admissionInclude,
        });
        await addAdmissionTimeline(tx, req.params.id, "STATUS", "Status changed", req.body.notes || null, current.status, req.body.status, jwtUser);
        return updated;
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "STATUS", "ADMISSION", result.id, `Admission status changed to ${result.status}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(result);
    } catch (err: any) {
      if (err.http === 404) {
        res.status(404).json({ error: err.message });
        return;
      }
      logger.error("Error updating admission status:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admissions/:id/interview", authMiddleware, validate(schemas.admissionInterview), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const interviewAt = parseAdmissionDate(req.body.interviewAt);
    if (!interviewAt) {
      res.status(400).json({ error: "interviewAt: invalid date" });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        const current = await (tx as any).admissionApplication.findUnique({ where: { id: req.params.id } });
        if (!current) throw Object.assign(new Error("Admission application not found"), { http: 404 });
        const updated = await (tx as any).admissionApplication.update({
          where: { id: req.params.id },
          data: {
            interviewAt,
            interviewMode: req.body.interviewMode || null,
            interviewLocation: req.body.interviewLocation || null,
            interviewNotes: req.body.interviewNotes || null,
            status: "INTERVIEW_SCHEDULED",
          },
          include: admissionInclude,
        });
        await addAdmissionTimeline(tx, req.params.id, "INTERVIEW", "Interview scheduled", req.body.interviewNotes || null, current.status, "INTERVIEW_SCHEDULED", jwtUser);
        return updated;
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "SCHEDULE", "ADMISSION", result.id, `Interview scheduled for ${result.applicationNo || result.id}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(result);
    } catch (err: any) {
      if (err.http === 404) {
        res.status(404).json({ error: err.message });
        return;
      }
      logger.error("Error scheduling admission interview:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admissions/:id/decision", authMiddleware, validate(schemas.admissionDecision), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        const current = await (tx as any).admissionApplication.findUnique({ where: { id: req.params.id } });
        if (!current) throw Object.assign(new Error("Admission application not found"), { http: 404 });
        const updated = await (tx as any).admissionApplication.update({
          where: { id: req.params.id },
          data: {
            status: req.body.status,
            decisionAt: new Date(),
            decisionById: jwtUser.userId,
            decisionByName: jwtUser.email,
            decisionNotes: req.body.decisionNotes || null,
          },
          include: admissionInclude,
        });
        await addAdmissionTimeline(tx, req.params.id, "DECISION", `Decision: ${req.body.status}`, req.body.decisionNotes || null, current.status, req.body.status, jwtUser);
        return updated;
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DECISION", "ADMISSION", result.id, `Admission decision set to ${result.status}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(result);
    } catch (err: any) {
      if (err.http === 404) {
        res.status(404).json({ error: err.message });
        return;
      }
      logger.error("Error recording admission decision:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admissions/:id/documents", authMiddleware, uploadAdmissionFile, validate(schemas.admissionDocument), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    try {
      const document = await admissionDb.admissionDocument.create({
        data: {
          applicationId: req.params.id,
          title: req.body.title,
          documentType: req.body.documentType || "OTHER",
          checklistStatus: req.body.checklistStatus || (file ? "RECEIVED" : "PENDING"),
          fileUrl: file ? `/uploads/admissions/${file.filename}` : null,
          fileName: file?.originalname || null,
          fileSize: file?.size || 0,
          mimeType: file?.mimetype || "application/octet-stream",
          notes: req.body.notes || null,
          uploadedById: jwtUser.userId,
          uploadedByName: jwtUser.email,
        },
      });
      await admissionDb.admissionTimelineEvent.create({
        data: {
          applicationId: req.params.id,
          eventType: "DOCUMENT",
          title: file ? "Document uploaded" : "Checklist item added",
          description: document.title,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "ADMISSION_DOCUMENT", document.id, `Admission document '${document.title}' added.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(document);
    } catch (err: any) {
      logger.error("Error creating admission document:", err);
      if (err.code === "P2003") {
        res.status(404).json({ error: "Admission application not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/admissions/:id/documents/:documentId", authMiddleware, validate(schemas.admissionDocument), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAdmissions(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const document = await admissionDb.admissionDocument.update({
        where: { id: req.params.documentId },
        data: {
          title: req.body.title,
          documentType: req.body.documentType || "OTHER",
          checklistStatus: req.body.checklistStatus || "PENDING",
          notes: req.body.notes || null,
          ...(req.body.checklistStatus === "VERIFIED"
            ? { verifiedAt: new Date(), verifiedById: jwtUser.userId, verifiedByName: jwtUser.email }
            : {}),
        },
      });
      await admissionDb.admissionTimelineEvent.create({
        data: {
          applicationId: req.params.id,
          eventType: "DOCUMENT",
          title: "Document checklist updated",
          description: `${document.title}: ${document.checklistStatus}`,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "ADMISSION_DOCUMENT", document.id, `Admission document '${document.title}' updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(document);
    } catch (err: any) {
      logger.error("Error updating admission document:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Admission document not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admissions/:id/convert", authMiddleware, requirePermission("manage_admissions"), validate(schemas.admissionConvert), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const application = await (tx as any).admissionApplication.findUnique({
          where: { id: req.params.id },
          include: { documents: true },
        });
        if (!application) throw Object.assign(new Error("Admission application not found"), { http: 404 });
        if (application.status !== "APPROVED") throw Object.assign(new Error("Only approved applications can be enrolled"), { http: 400 });
        if (application.convertedStudentId) throw Object.assign(new Error("Application is already enrolled"), { http: 400 });

        const studentCode = req.body.studentCode || await nextStudentCode(tx);
        const { firstName, lastName } = splitApplicantName(application.applicantName);
        const emailAddress = application.email || `${studentCode.toLowerCase().replace(/[^a-z0-9]/g, "")}@mrlc-student.edu`;
        const password = req.body.password || "Student123!";
        const user = await tx.user.create({
          data: {
            firstName,
            lastName,
            email: emailAddress,
            passwordHash: await bcrypt.hash(password, 10),
            role: "STUDENT",
            mustChangePassword: !req.body.password,
          },
        });
        const student = await tx.student.create({
          data: {
            userId: user.id,
            studentCode,
            dateOfBirth: application.dateOfBirth,
            guardianName: application.guardianName,
            guardianPhone: application.guardianPhone || application.contactNumber,
            contactNumber: application.contactNumber,
            country: application.country,
            identityType: application.identityType,
            identityNumber: application.identityNumber,
            address: application.address,
            emergencyContact: [application.emergencyContactName, application.emergencyContactPhone, application.emergencyContactRelationship].filter(Boolean).join(" | ") || null,
            notes: [
              application.notes ? `Admission notes: ${application.notes}` : null,
              application.previousEducationLevel ? `Previous education: ${application.previousEducationLevel}` : null,
              application.previousSchool ? `Previous school: ${application.previousSchool}` : null,
              application.boardingType ? `Boarding/day: ${application.boardingType}` : null,
              application.legalDocumentationStatus ? `Legal documentation: ${application.legalDocumentationStatus}` : null,
              application.medicalInformation ? `Medical: ${application.medicalInformation}` : null,
              application.allergies ? `Allergies: ${application.allergies}` : null,
              application.medicationNotes ? `Medication: ${application.medicationNotes}` : null,
            ].filter(Boolean).join("\n"),
            classId: req.body.classId || application.targetClassId || null,
            gender: application.gender,
            status: "ACTIVE",
            enrollmentDate: req.body.enrollmentDate ? new Date(req.body.enrollmentDate) : new Date(),
          },
          include: { user: true, class: true },
        });

        for (const document of application.documents.filter((doc: any) => doc.fileUrl)) {
          await tx.studentDocument.create({
            data: {
              studentId: student.id,
              title: document.title,
              documentType: document.documentType,
              fileUrl: document.fileUrl,
              fileName: document.fileName || document.title,
              fileSize: document.fileSize || 0,
              mimeType: document.mimeType || "application/octet-stream",
              uploadedById: document.uploadedById,
              uploadedByName: document.uploadedByName,
              status: "ACTIVE",
            },
          });
        }

        const updatedApplication = await (tx as any).admissionApplication.update({
          where: { id: application.id },
          data: {
            status: "ENROLLED",
            convertedStudentId: student.id,
            convertedUserId: user.id,
            convertedAt: new Date(),
          },
          include: admissionInclude,
        });
        await addAdmissionTimeline(tx, application.id, "ENROLLED", "Converted to student", `Created student ${student.studentCode}.`, application.status, "ENROLLED", jwtUser);
        return { application: updatedApplication, student };
      });

      await createAuditLog(jwtUser.userId, jwtUser.email, "CONVERT", "ADMISSION", result.application.id, `Admission ${result.application.applicationNo} converted to student ${result.student.studentCode}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(result);
    } catch (err: any) {
      logger.error("Error converting admission application:", err);
      if (err.http) {
        res.status(err.http).json({ error: err.message });
        return;
      }
      if (err.code === "P2002") {
        res.status(409).json({ error: "Student code or email already exists" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/library", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    // Cursor pagination: clients that pass ?cursor= (or ?paginated=1 for the
    // first page) get { items, nextCursor }; clients that don't get a legacy
    // capped array so existing pages keep working without changes. Without
    // pagination this returned every row, which scaled badly and sorted an
    // unindexed column.
    const LIBRARY_PAGE_SIZE = 50;
    const wantsEnvelope = req.query.cursor != null || req.query.paginated === "1";
    const cursor = typeof req.query.cursor === "string" && req.query.cursor ? req.query.cursor : null;
    try {
      let resources;
      if (jwtUser.role === "STUDENT") {
        resources = await prisma.libraryResource.findMany({
          where: { visibility: { in: ["ALL", "STUDENTS"] } },
          orderBy: { createdAt: "desc" },
          take: LIBRARY_PAGE_SIZE + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
      } else if (jwtUser.role === "TEACHER") {
        resources = await prisma.libraryResource.findMany({
          where: { visibility: { in: ["ALL", "TEACHERS_ONLY"] } },
          orderBy: { createdAt: "desc" },
          take: LIBRARY_PAGE_SIZE + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
      } else {
        resources = await prisma.libraryResource.findMany({
          orderBy: { createdAt: "desc" },
          take: LIBRARY_PAGE_SIZE + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
      }
      const hasMore = resources.length > LIBRARY_PAGE_SIZE;
      const page = hasMore ? resources.slice(0, LIBRARY_PAGE_SIZE) : resources;
      const nextCursor = hasMore ? page[page.length - 1].id : null;
      // Legacy clients get the bare array; paginated clients (cursor or
      // paginated=1) get the envelope. nextCursor is null when there's no
      // more to load.
      if (wantsEnvelope) res.json({ items: page, nextCursor });
      else res.json(page);
    } catch (err) {
      logger.error("Error fetching library resources:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/library/files", authMiddleware, uploadLibraryFile, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "File is required" });
      return;
    }
    res.json({
      url: `/uploads/library/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });
  });

  app.post("/api/library", authMiddleware, validate(schemas.library), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { title, description, type, visibility, classId, subjectId, externalUrl } = req.body;
    if (!title || !type) {
      res.status(400).json({ error: "Title and Type are required" });
      return;
    }
    try {
      const resource = await prisma.libraryResource.create({
        data: {
          title,
          description,
          type,
          visibility: visibility || "ALL",
          classId: classId || null,
          subjectId: subjectId || null,
          externalUrl: externalUrl || null,
          uploadedById: jwtUser.userId,
          uploadedByName: jwtUser.email,
          totalCopies: 1,
          availableCopies: 1,
          // These are NOT NULL text[] columns without a DB default; Prisma 7
          // sends NULL when omitted, which violates the constraint. Pass empty
          // arrays explicitly so uploads succeed on the current schema.
          tags: [],
          subjectAreas: [],
          gradeLevels: [],
        }
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "LIBRARY",
        resource.id,
        `Library resource '${title}' created.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.status(201).json(resource);
    } catch (err: any) {
      logger.error("Error creating library resource:", err);
      // Surface the real cause (admin/teacher-only route). A Prisma error here
      // usually means the DB is out of sync with schema.prisma — run
      // `npx prisma generate && npx prisma db push`, then restart the server.
      const detail = err?.code ? `${err.code}: ${err?.message ?? ""}` : err?.message;
      res.status(500).json({ error: detail || "Internal Server Error" });
    }
  });

  app.get("/api/library/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const resource = await prisma.libraryResource.findUnique({ where: { id } });
      if (!resource) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      // Enforce the same visibility rules as the list endpoint so a student
      // cannot fetch a TEACHERS_ONLY resource (or vice versa) by guessing its id.
      const visibility = resource.visibility || "ALL";
      if (jwtUser.role === "STUDENT" && !["ALL", "STUDENTS"].includes(visibility)) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      if (jwtUser.role === "TEACHER" && !["ALL", "TEACHERS_ONLY"].includes(visibility)) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      res.json(resource);
    } catch (err) {
      logger.error("Error fetching library resource:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/library/:id", authMiddleware, validate(schemas.libraryUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { title, description, type, visibility, classId, subjectId, externalUrl } = req.body;
    try {
      const existing = await prisma.libraryResource.findUnique({ where: { id } });
      if (!existing) { res.status(404).json({ error: "Resource not found" }); return; }
      if (jwtUser.role === "TEACHER" && existing.uploadedById !== jwtUser.userId) {
        res.status(403).json({ error: "You can only edit resources you uploaded" }); return;
      }
      const updated = await prisma.libraryResource.update({
        where: { id },
        data: {
          title,
          description,
          type,
          visibility,
          classId: classId || null,
          subjectId: subjectId || null,
          externalUrl: externalUrl || null,
        }
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "LIBRARY",
        id,
        `Library resource '${title}' updated.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json(updated);
    } catch (err) {
      logger.error("Error updating library resource:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Replace the attached file of an existing resource (PDF/image/etc.). Uploads
  // the new file, swaps externalUrl + size + mime, and unlinks the old file on
  // disk. Previously there was no way to swap a file after creation — only
  // metadata could be edited.
  app.put("/api/library/:id/file", authMiddleware, uploadLibraryFile, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "File is required" }); return; }
    try {
      const existing = await prisma.libraryResource.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Resource not found" }); return; }
      if (jwtUser.role === "TEACHER" && existing.uploadedById !== jwtUser.userId) {
        res.status(403).json({ error: "You can only edit resources you uploaded" });
        return;
      }
      const updated = await prisma.libraryResource.update({
        where: { id: req.params.id },
        data: {
          externalUrl: `/uploads/library/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          // A file replace doesn't bump downloadCount; reset lastDownloaded so
          // stale analytics on the old file don't linger as if still accurate.
          lastDownloaded: null,
        },
      });
      // Best-effort removal of the superseded file (cover or prior upload).
      if (existing.externalUrl?.startsWith("/uploads/library/")) {
        const oldName = path.basename(existing.externalUrl);
        if (oldName && oldName === path.basename(oldName) && oldName !== file.filename) {
          fs.promises.unlink(path.join(LIBRARY_FILE_DIR, oldName)).catch(() => {});
        }
      }
      res.json({
        url: updated.externalUrl,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      });
    } catch (err) {
      // Roll back the new upload if the DB update failed, so we don't orphan it.
      fs.promises.unlink(path.join(LIBRARY_FILE_DIR, file.filename)).catch(() => {});
      logger.error("Error replacing library file:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/library/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const existing = await prisma.libraryResource.findUnique({ where: { id } });
      if (!existing) { res.status(404).json({ error: "Resource not found" }); return; }
      if (jwtUser.role === "TEACHER" && existing.uploadedById !== jwtUser.userId) {
        res.status(403).json({ error: "You can only delete resources you uploaded" }); return;
      }
      await prisma.libraryResource.delete({ where: { id } });
      if (existing.externalUrl?.startsWith("/uploads/library/")) {
        const filename = existing.externalUrl.slice("/uploads/library/".length);
        if (filename && filename === path.basename(filename)) await fs.promises.unlink(path.join(LIBRARY_FILE_DIR, filename)).catch(() => {});
      }

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "LIBRARY",
        id,
        `Library resource '${existing.title}' deleted.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json({ message: "Resource deleted successfully" });
    } catch (err) {
      logger.error("Error deleting library resource:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Video Lessons API ────────────────────────────────────────────────────────
  // Video file upload endpoint
  // Browsers can only play MP4 (H.264/AAC) and WebM. Anything else — .mts/.m2ts
  // (AVCHD camera files), .avi, .mkv, .wmv, .flv, .mov, etc. — is transcoded to
  // MP4 with ffmpeg so students can play it directly on the site.
  const WEB_NATIVE_VIDEO = new Set([".mp4", ".webm"]);
  const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2GB hard ceiling
  const MAX_VIDEO_CHUNKS = 110; // 2GB / 20MB chunks, with headroom
  // Videos over this size are automatically re-encoded at a smaller size in
  // the background, regardless of the 2GB ceiling above — this keeps storage
  // in check even though we now accept much bigger raw uploads.
  const AUTO_COMPRESS_VIDEO_BYTES = 250 * 1024 * 1024;
  const cancelledTranscodes = new Set<string>();
  const transcodeInputs = new Map<string, string>();

  // Remove abandoned chunk sessions after 24 hours.
  const chunkExpiry = Date.now() - 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(VIDEO_CHUNK_DIR)) {
    const chunkPath = path.join(VIDEO_CHUNK_DIR, name);
    try {
      if (fs.statSync(chunkPath).mtimeMs < chunkExpiry) fs.rmSync(chunkPath, { force: true });
    } catch { /* another cleanup may already have removed it */ }
  }

  // A conversion interrupted by a process/container restart cannot resume.
  // Sidecar job files let startup remove the raw source and expose a failed
  // state instead of leaving the lesson stuck on "Converting" forever.
  for (const jobName of fs.readdirSync(VIDEO_FILES_DIR).filter((name) => name.endsWith(".job"))) {
    const outputName = jobName.slice(0, -4);
    const outputPath = path.join(VIDEO_FILES_DIR, outputName);
    try {
      const sourceName = fs.readFileSync(path.join(VIDEO_FILES_DIR, jobName), "utf8").trim();
      if (sourceName && sourceName === path.basename(sourceName)) {
        fs.rmSync(path.join(VIDEO_FILES_DIR, sourceName), { force: true });
      }
      fs.rmSync(`${outputPath}.tmp.mp4`, { force: true });
      fs.writeFileSync(`${outputPath}.failed`, "Video conversion was interrupted; please re-upload the file.");
      fs.rmSync(path.join(VIDEO_FILES_DIR, jobName), { force: true });
    } catch (err) {
      logger.warn(`Could not recover interrupted video conversion ${jobName}: ${String(err)}`);
    }
  }
  // crf 23 is a quality-preserving "make it playable everywhere" setting used
  // for pure format conversion. crf 28 trades noticeably more quality for a
  // meaningfully smaller file, used when a video needs to shrink rather than
  // just change container/codec.
  const transcodeVideo = (inputPath: string, outputPath: string, crf: number): Promise<void> =>
    new Promise((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y",
        "-i", inputPath,
        "-map", "0:v:0",
        "-map", "0:a:0?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", String(crf),
        // H.264/yuv420p requires even dimensions. Phone and screen-recording
        // sources can be odd-sized, which otherwise makes ffmpeg fail.
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-pix_fmt", "yuv420p", // browser-decodable chroma
        "-c:a", "aac",
        "-b:a", "128k",
        "-sn",
        "-dn",
        "-movflags", "+faststart", // progressive streaming (moov atom first)
        outputPath,
      ]);
      let stderrTail = "";
      ff.stderr.on("data", (d) => {
        stderrTail = (stderrTail + d.toString()).slice(-4000);
      });
      ff.on("error", reject);
      ff.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderrTail.slice(-400)}`))
      );
    });
  const transcodeToMp4 = (inputPath: string, outputPath: string): Promise<void> =>
    transcodeVideo(inputPath, outputPath, 23);
  const compressToMp4 = (inputPath: string, outputPath: string): Promise<void> =>
    transcodeVideo(inputPath, outputPath, 28);

  // ffmpeg can occasionally exit successfully after producing an empty or
  // zero-duration container (for example from a truncated camera recording).
  // Never publish that file as ready: browsers show it as 0:00 / --:--.
  const validateConvertedVideo = (filePath: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const probe = spawn("ffprobe", [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height:format=duration",
        "-of", "json",
        filePath,
      ]);
      let stdout = "";
      let stderr = "";
      probe.stdout.on("data", (data) => { stdout = (stdout + data.toString()).slice(-10000); });
      probe.stderr.on("data", (data) => { stderr = (stderr + data.toString()).slice(-2000); });
      probe.on("error", reject);
      probe.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe exited ${code}: ${stderr.slice(-400)}`));
          return;
        }
        try {
          const result = JSON.parse(stdout);
          const stream = result?.streams?.[0];
          const duration = Number(result?.format?.duration);
          const width = Number(stream?.width);
          const height = Number(stream?.height);
          if (stream?.codec_name !== "h264" || !Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1 || !Number.isFinite(duration) || duration <= 0) {
            throw new Error("Converted file has no playable H.264 video or duration");
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

  const finishStoredVideoUpload = async (file: Express.Multer.File, res: express.Response) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const needsFormatConversion = !WEB_NATIVE_VIDEO.has(ext);
    const needsCompression = file.size > AUTO_COMPRESS_VIDEO_BYTES;

    if (!needsFormatConversion && !needsCompression) {
      res.json({
        url: `/uploads/videos/${file.filename}`,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      });
      return;
    }

    // Needs background processing — either the format isn't browser-playable,
    // it's over the auto-compress threshold, or both. ffmpeg writes to a
    // temporary path and atomically renames it only when playback is ready.
    const outName = `${crypto.randomUUID()}.mp4`;
    const outPath = path.join(VIDEO_FILES_DIR, outName);
    const tmpPath = `${outPath}.tmp.mp4`;
    const jobPath = `${outPath}.job`;
    transcodeInputs.set(outName, file.path);

    try {
      await fs.promises.writeFile(jobPath, file.filename, "utf8");
    } catch (err) {
      transcodeInputs.delete(outName);
      await fs.promises.unlink(file.path).catch(() => {});
      logger.error("Could not create video transcode job:", err);
      res.status(500).json({ error: "Could not start video conversion" });
      return;
    }

    res.json({
      url: `/uploads/videos/${outName}`,
      originalName: file.originalname,
      size: file.size,
      mimeType: "video/mp4",
      converted: needsFormatConversion,
      compressed: needsCompression,
      processing: true,
      originalFormat: ext.replace(".", "").toUpperCase(),
    });

    const encode = needsCompression ? compressToMp4 : transcodeToMp4;
    encode(file.path, tmpPath)
      .then(async () => {
        await validateConvertedVideo(tmpPath);
        await fs.promises.rename(tmpPath, outPath);
        await fs.promises.unlink(file.path).catch(() => {});
        if (cancelledTranscodes.has(outName)) {
          await fs.promises.unlink(outPath).catch(() => {});
        }
      })
      .catch(async (err: any) => {
        logger.error("Video transcode failed:", err);
        await fs.promises.unlink(tmpPath).catch(() => {});
        await fs.promises.unlink(file.path).catch(() => {});
        if (!cancelledTranscodes.has(outName)) {
          await fs.promises.writeFile(`${outPath}.failed`, String(err?.message ?? "failed")).catch(() => {});
        }
      })
      .finally(() => {
        transcodeInputs.delete(outName);
        cancelledTranscodes.delete(outName);
        fs.promises.unlink(jobPath).catch(() => {});
      });
  };

  app.post(
    "/api/videos/files",
    authMiddleware,
    requirePermission("manage_videos"),
    uploadVideoFile,
    async (req, res) => {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ error: "Video file is required" });
        return;
      }
      await finishStoredVideoUpload(file, res);
    }
  );

  type VideoChunkManifest = {
    userId: string;
    originalName: string;
    totalChunks: number;
    createdAt: string;
  };
  const validUploadId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const chunkManifestPath = (uploadId: string) => path.join(VIDEO_CHUNK_DIR, `${uploadId}.json`);
  const chunkPartPath = (uploadId: string, index: number) => path.join(VIDEO_CHUNK_DIR, `${uploadId}.${index}.part`);
  const readChunkManifest = async (uploadId: string): Promise<VideoChunkManifest> =>
    JSON.parse(await fs.promises.readFile(chunkManifestPath(uploadId), "utf8"));
  const removeChunkSession = async (uploadId: string, totalChunks: number) => {
    await Promise.all([
      ...Array.from({ length: totalChunks }, (_, index) => fs.promises.unlink(chunkPartPath(uploadId, index)).catch(() => {})),
      fs.promises.unlink(chunkManifestPath(uploadId)).catch(() => {}),
    ]);
  };

  app.post(
    "/api/videos/files/chunks",
    authMiddleware,
    requirePermission("manage_videos"),
    uploadVideoChunk,
    async (req, res) => {
      const jwtUser = (req as any).user as JwtPayload;
      const chunk = (req as any).file as Express.Multer.File | undefined;
      const uploadId = String(req.body?.uploadId || "");
      const originalName = path.basename(String(req.body?.originalName || ""));
      const chunkIndex = Number(req.body?.chunkIndex);
      const totalChunks = Number(req.body?.totalChunks);
      const ext = path.extname(originalName).toLowerCase();

      if (!chunk || chunk.size === 0 || !validUploadId(uploadId) ||
          !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) ||
          chunkIndex < 0 || totalChunks < 1 || totalChunks > MAX_VIDEO_CHUNKS || chunkIndex >= totalChunks ||
          !originalName || !ALLOWED_VIDEO_EXTENSIONS.has(ext)) {
        res.status(400).json({ error: "Invalid video upload chunk" });
        return;
      }

      try {
        const manifestPath = chunkManifestPath(uploadId);
        let manifest: VideoChunkManifest;
        if (!fs.existsSync(manifestPath)) {
          if (chunkIndex !== 0) {
            res.status(409).json({ error: "Upload must start with the first chunk" });
            return;
          }
          manifest = { userId: jwtUser.userId, originalName, totalChunks, createdAt: new Date().toISOString() };
          await fs.promises.writeFile(manifestPath, JSON.stringify(manifest), { flag: "wx" });
        } else {
          manifest = await readChunkManifest(uploadId);
        }

        if (manifest.userId !== jwtUser.userId || manifest.originalName !== originalName || manifest.totalChunks !== totalChunks) {
          res.status(403).json({ error: "Upload session does not match this file" });
          return;
        }
        await fs.promises.writeFile(chunkPartPath(uploadId, chunkIndex), chunk.buffer);
        res.json({ received: chunkIndex, totalChunks });
      } catch (err: any) {
        logger.error("Video chunk upload failed:", err);
        res.status(err?.code === "EEXIST" ? 409 : 500).json({ error: "Could not store video upload chunk" });
      }
    }
  );

  app.post("/api/videos/files/chunks/complete", authMiddleware, requirePermission("manage_videos"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const uploadId = String(req.body?.uploadId || "");
    if (!validUploadId(uploadId)) {
      res.status(400).json({ error: "Invalid upload session" });
      return;
    }

    let assembledPath = "";
    try {
      const manifest = await readChunkManifest(uploadId);
      if (manifest.userId !== jwtUser.userId) {
        res.status(403).json({ error: "Upload session belongs to another user" });
        return;
      }

      const parts = Array.from({ length: manifest.totalChunks }, (_, index) => chunkPartPath(uploadId, index));
      const stats = await Promise.all(parts.map((part) => fs.promises.stat(part)));
      const totalSize = stats.reduce((sum, stat) => sum + stat.size, 0);
      if (totalSize <= 0 || totalSize > MAX_VIDEO_BYTES) {
        await removeChunkSession(uploadId, manifest.totalChunks);
        res.status(400).json({ error: "Video files must be 2 GB or smaller" });
        return;
      }

      const ext = path.extname(manifest.originalName).toLowerCase();
      const assembledName = `${crypto.randomUUID()}${ext}`;
      assembledPath = path.join(VIDEO_FILES_DIR, assembledName);
      const output = await fs.promises.open(assembledPath, "wx");
      try {
        for (const part of parts) await output.write(await fs.promises.readFile(part));
      } finally {
        await output.close();
      }
      await removeChunkSession(uploadId, manifest.totalChunks);

      const assembledFile = {
        originalname: manifest.originalName,
        filename: assembledName,
        path: assembledPath,
        size: totalSize,
        mimetype: `video/${ext.slice(1)}`,
      } as Express.Multer.File;
      await finishStoredVideoUpload(assembledFile, res);
    } catch (err: any) {
      if (assembledPath) await fs.promises.unlink(assembledPath).catch(() => {});
      logger.error("Could not assemble video upload:", err);
      res.status(err?.code === "ENOENT" ? 409 : 500).json({
        error: err?.code === "ENOENT" ? "One or more video chunks are missing" : "Could not assemble video upload",
      });
    }
  });

  app.delete("/api/videos/files/chunks/:uploadId", authMiddleware, requirePermission("manage_videos"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const uploadId = String(req.params.uploadId || "");
    if (!validUploadId(uploadId)) { res.status(400).json({ error: "Invalid upload session" }); return; }
    try {
      const manifest = await readChunkManifest(uploadId);
      if (manifest.userId !== jwtUser.userId) { res.status(403).json({ error: "Forbidden" }); return; }
      await removeChunkSession(uploadId, manifest.totalChunks);
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "ENOENT") { res.json({ success: true }); return; }
      logger.error("Could not discard chunk upload:", err);
      res.status(500).json({ error: "Could not discard upload session" });
    }
  });

  // Discard an upload that has not been attached to a saved lesson. This is
  // called by Remove and Cancel in the form and deliberately refuses to delete
  // media already referenced by a lesson.
  app.delete("/api/videos/files", authMiddleware, requirePermission("manage_videos"), async (req, res) => {
    const url = String(req.query.url || "");
    const prefix = "/uploads/videos/";
    const filename = url.startsWith(prefix) ? url.slice(prefix.length) : "";
    if (!filename || filename !== path.basename(filename)) {
      res.status(400).json({ error: "Invalid video file URL" });
      return;
    }

    try {
      const linked = await prisma.videoLesson.findFirst({
        where: { OR: [{ videoUrl: url }, { captionsUrl: url }, { thumbnailUrl: url }] },
        select: { id: true },
      });
      if (linked) {
        res.status(409).json({ error: "Video file is already attached to a lesson" });
        return;
      }

      cancelledTranscodes.add(filename);
      const target = path.join(VIDEO_FILES_DIR, filename);
      await Promise.all([
        fs.promises.unlink(target).catch(() => {}),
        fs.promises.unlink(`${target}.tmp.mp4`).catch(() => {}),
        fs.promises.unlink(`${target}.failed`).catch(() => {}),
      ]);
      // The source file is removed by the transcode promise. Keeping it open
      // until ffmpeg exits avoids platform-specific failures during cancellation.
      if (!transcodeInputs.has(filename)) {
        cancelledTranscodes.delete(filename);
        await fs.promises.unlink(`${target}.job`).catch(() => {});
      }
      res.json({ success: true });
    } catch (err) {
      logger.error("Error discarding video upload:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Transcode status for an uploaded video file (filesystem is the source of
  // truth: the final .mp4 only exists once conversion finished; a .failed
  // marker means it errored). Used by the player to show "Converting…".
  app.get("/api/videos/transcode-status", authMiddleware, async (req, res) => {
    const file = String(req.query.file || "");
    // Only a bare filename within the video dir — no path traversal.
    if (!file || file.includes("/") || file.includes("\\") || file.includes("..")) {
      res.status(400).json({ error: "Invalid file" });
      return;
    }
    const target = path.join(VIDEO_FILES_DIR, file);
    const ready = fs.existsSync(target);
    const failed = !ready && fs.existsSync(`${target}.failed`);
    res.json({ ready, failed, processing: !ready && !failed });
  });

  // Caption/subtitle (.vtt/.srt) upload — stored alongside videos.
  app.post("/api/videos/captions", authMiddleware, requirePermission("manage_videos"), uploadCaptionFile, async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "Subtitle file is required" }); return; }
    if (path.extname(file.filename).toLowerCase() === ".srt") {
      try {
        const srt = await fs.promises.readFile(file.path, "utf8");
        const vttName = `${path.basename(file.filename, ".srt")}.vtt`;
        const vttPath = path.join(VIDEO_FILES_DIR, vttName);
        const vtt = `WEBVTT\n\n${srt.replace(/^\uFEFF/, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
        await fs.promises.writeFile(vttPath, vtt, "utf8");
        await fs.promises.unlink(file.path).catch(() => {});
        res.json({ url: `/uploads/videos/${vttName}`, originalName: file.originalname });
        return;
      } catch (err) {
        await fs.promises.unlink(file.path).catch(() => {});
        logger.error("Subtitle conversion failed:", err);
        res.status(400).json({ error: "Could not convert the SRT subtitle file" });
        return;
      }
    }
    res.json({ url: `/uploads/videos/${file.filename}`, originalName: file.originalname });
  });

  // Teacher/admin thumbnail upload. The resulting private media URL can be
  // saved directly in VideoLesson.thumbnailUrl and is authorised by the same
  // scoped cookie and lesson visibility rules as the video itself.
  app.post("/api/videos/thumbnails", authMiddleware, requirePermission("manage_videos"), uploadVideoThumbnail, async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "Thumbnail image is required" }); return; }

    const filename = `${crypto.randomUUID()}.webp`;
    const outputPath = path.join(VIDEO_FILES_DIR, filename);
    try {
      await sharp(file.buffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 1280, height: 720, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toFile(outputPath);
      res.json({ url: `/uploads/videos/${filename}`, originalName: file.originalname });
    } catch (err) {
      await fs.promises.unlink(outputPath).catch(() => {});
      logger.warn("Video thumbnail upload rejected:", err);
      res.status(400).json({ error: "The uploaded file is not a valid thumbnail image" });
    }
  });

  app.post("/api/videos/media-session", authMiddleware, (req, res) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) { res.status(400).json({ error: "Token required" }); return; }
    res.cookie("video_media_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/uploads/videos",
    });
    res.json({ success: true });
  });

  // Refresh the scoped library media cookie for sessions that pre-date the
  // auth gate (or whose 8h cookie expired). Mirrors the videos session route.
  app.post("/api/library/media-session", authMiddleware, (req, res) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) { res.status(400).json({ error: "Token required" }); return; }
    res.cookie("library_media_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/uploads/library",
    });
    res.json({ success: true });
  });

  app.get("/api/videos", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      let where: any = {};
      if (jwtUser.role === "STUDENT") {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId }, select: { classId: true } });
        where = {
          visibility: { in: ["ALL", "STUDENTS"] },
          status: "PUBLISHED",
          OR: [
            { classId: null },
            ...(student?.classId ? [{ classId: student.classId }] : []),
          ],
        };
      } else if (jwtUser.role === "TEACHER") {
        where = { visibility: { in: ["ALL", "STUDENTS", "TEACHERS_ONLY"] } };
      }
      const videos = await prisma.videoLesson.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      res.json(videos);
    } catch (err) {
      logger.error("Error fetching video lessons:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/videos", authMiddleware, validate(schemas.video), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { title, description, videoUrl, thumbnailUrl, captionsUrl, duration, classId, subjectId, visibility, status, uploadedByName, isRequired, dueDate } = req.body;
    if (!title || !videoUrl) {
      res.status(400).json({ error: "title and videoUrl are required" });
      return;
    }
    if (jwtUser.role === "TEACHER" && classId && !(await canAccessTeacherClass(req, classId))) {
      res.status(403).json({ error: "You can only assign videos to your assigned classes" });
      return;
    }
    try {
      const video = await prisma.videoLesson.create({
        data: {
          title,
          description: description || null,
          videoUrl,
          thumbnailUrl: thumbnailUrl || null,
          captionsUrl: captionsUrl || null,
          duration: duration != null ? Number(duration) : null,
          classId: classId || null,
          subjectId: subjectId || null,
          visibility: visibility || "ALL",
          status: status || "PUBLISHED",
          isRequired: parseBoolean(isRequired),
          dueDate: dueDate ? new Date(dueDate) : null,
          uploadedById: jwtUser.userId,
          uploadedByName: uploadedByName || jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "VIDEO",
        video.id,
        `Video lesson '${title}' created.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.status(201).json(video);
    } catch (err) {
      logger.error("Error creating video lesson:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/videos/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const video = await prisma.videoLesson.findUnique({ where: { id } });
      if (!video) {
        res.status(404).json({ error: "Video lesson not found" });
        return;
      }
      // Same visibility enforcement as the list endpoint.
      if (jwtUser.role === "STUDENT" && (!["ALL", "STUDENTS"].includes(video.visibility) || video.status !== "PUBLISHED")) {
        res.status(404).json({ error: "Video lesson not found" });
        return;
      }
      if (jwtUser.role === "STUDENT" && video.classId) {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId }, select: { classId: true } });
        if (student?.classId !== video.classId) {
          res.status(404).json({ error: "Video lesson not found" });
          return;
        }
      }
      if (jwtUser.role === "TEACHER" && !["ALL", "STUDENTS", "TEACHERS_ONLY"].includes(video.visibility)) {
        res.status(404).json({ error: "Video lesson not found" });
        return;
      }
      res.json(video);
    } catch (err) {
      logger.error("Error fetching video lesson:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/videos/:id", authMiddleware, validate(schemas.videoUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { title, description, videoUrl, thumbnailUrl, captionsUrl, duration, classId, subjectId, visibility, status, isRequired, dueDate } = req.body;
    try {
      // First, get the current video to check if videoUrl is changing
      const currentVideo = await prisma.videoLesson.findUnique({ where: { id } });
      if (!currentVideo) {
        res.status(404).json({ error: "Video lesson not found" });
        return;
      }

      if (jwtUser.role === "TEACHER" && currentVideo.uploadedById !== jwtUser.userId) {
        res.status(403).json({ error: "You can only edit video lessons you uploaded" });
        return;
      }
      if (jwtUser.role === "TEACHER" && classId !== undefined && classId && !(await canAccessTeacherClass(req, classId))) {
        res.status(403).json({ error: "You can only assign videos to your assigned classes" });
        return;
      }

      const updated = await prisma.videoLesson.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description: description || null }),
          ...(videoUrl && { videoUrl }),
          ...(thumbnailUrl !== undefined && { thumbnailUrl: thumbnailUrl || null }),
          ...(captionsUrl !== undefined && { captionsUrl: captionsUrl || null }),
          ...(duration !== undefined && { duration: duration != null ? Number(duration) : null }),
          ...(classId !== undefined && { classId: classId || null }),
          ...(subjectId !== undefined && { subjectId: subjectId || null }),
          ...(visibility && { visibility }),
          ...(status && { status }),
          ...(isRequired !== undefined && { isRequired: parseBoolean(isRequired) }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        },
      });

      // Delete the superseded file only after the database update commits. If
      // the update fails, the existing lesson remains fully playable.
      if (videoUrl && videoUrl !== currentVideo.videoUrl && currentVideo.videoUrl.startsWith("/uploads/videos/")) {
        const filename = currentVideo.videoUrl.replace("/uploads/videos/", "");
        if (filename === path.basename(filename)) {
          cancelledTranscodes.add(filename);
          const filePath = path.join(VIDEO_FILES_DIR, filename);
          await Promise.all([
            fs.promises.unlink(filePath).catch(() => {}),
            fs.promises.unlink(`${filePath}.failed`).catch(() => {}),
            fs.promises.unlink(`${filePath}.tmp.mp4`).catch(() => {}),
          ]);
          if (!transcodeInputs.has(filename)) {
            cancelledTranscodes.delete(filename);
            await fs.promises.unlink(`${filePath}.job`).catch(() => {});
          }
        }
      }

      if (captionsUrl !== undefined && captionsUrl !== currentVideo.captionsUrl && currentVideo.captionsUrl?.startsWith("/uploads/videos/")) {
        const captionName = currentVideo.captionsUrl.replace("/uploads/videos/", "");
        if (captionName === path.basename(captionName)) {
          await fs.promises.unlink(path.join(VIDEO_FILES_DIR, captionName)).catch(() => {});
        }
      }

      if (thumbnailUrl !== undefined && thumbnailUrl !== currentVideo.thumbnailUrl && currentVideo.thumbnailUrl?.startsWith("/uploads/videos/")) {
        const thumbnailName = currentVideo.thumbnailUrl.replace("/uploads/videos/", "");
        if (thumbnailName === path.basename(thumbnailName)) {
          await fs.promises.unlink(path.join(VIDEO_FILES_DIR, thumbnailName)).catch(() => {});
        }
      }

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "VIDEO",
        id,
        `Video lesson '${updated.title}' updated.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json(updated);
    } catch (err: any) {
      logger.error("Error updating video lesson:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Video lesson not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/videos/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      // First, get the video to check if it has an uploaded file
      const video = await prisma.videoLesson.findUnique({ where: { id } });
      if (!video) {
        res.status(404).json({ error: "Video lesson not found" });
        return;
      }

      if (jwtUser.role === "TEACHER" && video.uploadedById !== jwtUser.userId) {
        res.status(403).json({ error: "You can only delete video lessons you uploaded" });
        return;
      }

      // Commit the database deletion first. A database failure must not leave a
      // surviving lesson record that points at a file we already destroyed.
      await prisma.videoLesson.delete({ where: { id } });

      // Delete the video file from disk if it's an uploaded file
      if (video.videoUrl.startsWith("/uploads/videos/")) {
        const filename = video.videoUrl.replace("/uploads/videos/", "");
        const filePath = path.join(VIDEO_FILES_DIR, filename);
        if (filename === path.basename(filename)) {
          cancelledTranscodes.add(filename);
          await Promise.all([
            fs.promises.unlink(filePath).catch(() => {}),
            fs.promises.unlink(`${filePath}.failed`).catch(() => {}),
            fs.promises.unlink(`${filePath}.tmp.mp4`).catch(() => {}),
          ]);
          if (!transcodeInputs.has(filename)) {
            cancelledTranscodes.delete(filename);
            await fs.promises.unlink(`${filePath}.job`).catch(() => {});
          }
        }
      }

      if (video.captionsUrl?.startsWith("/uploads/videos/")) {
        const captionName = video.captionsUrl.replace("/uploads/videos/", "");
        if (captionName === path.basename(captionName)) {
          await fs.promises.unlink(path.join(VIDEO_FILES_DIR, captionName)).catch(() => {});
        }
      }

      if (video.thumbnailUrl?.startsWith("/uploads/videos/")) {
        const thumbnailName = video.thumbnailUrl.replace("/uploads/videos/", "");
        if (thumbnailName === path.basename(thumbnailName)) {
          await fs.promises.unlink(path.join(VIDEO_FILES_DIR, thumbnailName)).catch(() => {});
        }
      }

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "VIDEO",
        id,
        `Video lesson ID ${id} deleted.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json({ message: "Video lesson deleted successfully" });
    } catch (err: any) {
      logger.error("Error deleting video lesson:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Video lesson not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Video Progress API ────────────────────────────────────────────────────────
  // Get progress for all videos (for the current user)
  app.get("/api/videos/progress", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const progress = await prisma.videoProgress.findMany({
        where: { userId: jwtUser.userId },
        include: { video: { select: { id: true, title: true, thumbnailUrl: true, duration: true } } },
        orderBy: { lastWatchedAt: "desc" },
      });
      res.json(progress);
    } catch (err) {
      logger.error("Error fetching video progress:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Get progress for a specific video
  app.get("/api/videos/:id/progress", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const progress = await prisma.videoProgress.findUnique({
        where: { userId_videoId: { userId: jwtUser.userId, videoId: id } },
      });
      res.json(progress || { currentPosition: 0, isCompleted: false });
    } catch (err) {
      logger.error("Error fetching video progress:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Save/update progress for a video
  app.post("/api/videos/:id/progress", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const { currentPosition, isCompleted, duration } = req.body;

    if (
      typeof currentPosition !== "number"
      || !Number.isFinite(currentPosition)
      || currentPosition < 0
    ) {
      res.status(400).json({ error: "currentPosition must be a non-negative number" });
      return;
    }
    if (typeof isCompleted !== "boolean") {
      res.status(400).json({ error: "isCompleted must be a boolean" });
      return;
    }
    if (duration !== undefined && normalizeVideoDuration(duration) === null) {
      res.status(400).json({ error: "duration must be a positive number" });
      return;
    }

    try {
      const [video, existingProgress] = await Promise.all([
        prisma.videoLesson.findUnique({ where: { id } }),
        prisma.videoProgress.findUnique({
          where: { userId_videoId: { userId: jwtUser.userId, videoId: id } },
        }),
      ]);
      if (!video) {
        res.status(404).json({ error: "Video not found" });
        return;
      }

      const nextProgress = resolveVideoProgressUpdate({
        currentPosition,
        reportedDuration: duration,
        storedDuration: video.duration,
        isCompleted,
        previousPosition: existingProgress?.currentPosition,
        wasCompleted: existingProgress?.isCompleted,
      });
      if (nextProgress.duration && nextProgress.duration !== video.duration) {
        await prisma.videoLesson.update({
          where: { id },
          data: { duration: nextProgress.duration },
        });
      }

      const now = new Date();
      await prisma.videoProgress.upsert({
        where: { userId_videoId: { userId: jwtUser.userId, videoId: id } },
        create: {
          userId: jwtUser.userId,
          videoId: id,
          currentPosition: nextProgress.currentPosition,
          isCompleted: nextProgress.isCompleted,
          lastWatchedAt: now,
        },
        update: {
          lastWatchedAt: now,
        },
      });
      await prisma.videoProgress.updateMany({
        where: {
          userId: jwtUser.userId,
          videoId: id,
          currentPosition: { lt: nextProgress.currentPosition },
        },
        data: {
          currentPosition: nextProgress.currentPosition,
          lastWatchedAt: now,
        },
      });
      if (nextProgress.isCompleted) {
        await prisma.videoProgress.updateMany({
          where: {
            userId: jwtUser.userId,
            videoId: id,
            isCompleted: false,
          },
          data: {
            isCompleted: true,
            lastWatchedAt: now,
          },
        });
      }
      const progress = await prisma.videoProgress.findUnique({
        where: { userId_videoId: { userId: jwtUser.userId, videoId: id } },
      });

      res.json(progress);
    } catch (err) {
      logger.error("Error saving video progress:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Watch analytics for a video (teachers/admins): completion across the intended
  // audience. If the video is tied to a class, the roster is that class's students;
  // otherwise it's all active students.
  app.get("/api/videos/:id/analytics", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const video = await prisma.videoLesson.findUnique({ where: { id } });
      if (!video) { res.status(404).json({ error: "Video lesson not found" }); return; }

      const students = await prisma.student.findMany({
        where: { status: "ACTIVE", userId: { not: null }, ...(video.classId ? { classId: video.classId } : {}) },
        select: { id: true, userId: true, studentCode: true, user: { select: { firstName: true, lastName: true } } },
      });

      const progress = await prisma.videoProgress.findMany({ where: { videoId: id } });
      const byUser = new Map(progress.map((p) => [p.userId, p]));

      const now = Date.now();
      const overdue = video.dueDate ? now > new Date(video.dueDate).getTime() : false;

      const roster = students.map((s) => {
        const p = s.userId ? byUser.get(s.userId) : undefined;
        const pct = p
          ? videoWatchPercent(p.currentPosition, video.duration, p.isCompleted)
          : 0;
        const status = p?.isCompleted ? "completed" : p ? "in_progress" : "not_started";
        return {
          studentId: s.id,
          name: `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim() || s.studentCode,
          status,
          percent: p?.isCompleted ? 100 : pct,
          lastWatchedAt: p?.lastWatchedAt ?? null,
        };
      });

      const completed = roster.filter((r) => r.status === "completed").length;
      const inProgress = roster.filter((r) => r.status === "in_progress").length;
      const notStarted = roster.filter((r) => r.status === "not_started").length;

      res.json({
        total: roster.length,
        completed,
        inProgress,
        notStarted,
        dueDate: video.dueDate,
        overdue,
        isRequired: video.isRequired,
        scope: video.classId ? "class" : "all",
        roster: roster.sort((a, b) => a.name.localeCompare(b.name)),
      });
    } catch (err) {
      logger.error("Error fetching video analytics:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Announcements API ────────────────────────────────────────────────────────
  const canManageAnnouncements = (role: string) => role === "ADMIN" || role === "TEACHER";

  app.get("/api/announcements", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      // Audience filtering: students see ALL/STUDENTS (+ their class); teachers see
      // ALL/TEACHERS/CLASS; admins see everything. Archived items are hidden from
      // non-managers.
      const where: any = {};
      if (jwtUser.role === "STUDENT") {
        where.status = "ACTIVE";
        where.audience = { in: ["ALL", "STUDENTS", "CLASS"] };
      } else if (jwtUser.role === "TEACHER") {
        where.audience = { in: ["ALL", "TEACHERS", "STUDENTS", "CLASS"] };
      }
      const announcements = await prisma.announcement.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      });
      res.json(announcements);
    } catch (err: any) {
      // If the migration hasn't been applied yet the table won't exist; degrade
      // gracefully to an empty list rather than breaking the page.
      if (err?.code === "P2021" || err?.code === "P2022") {
        logger.warn("Announcement table/columns missing — run `prisma migrate deploy`. Returning empty list.");
        res.json([]);
        return;
      }
      logger.error("Error fetching announcements:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/announcements/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
      const announcement = await prisma.announcement.findUnique({ where: { id } });
      if (!announcement) {
        res.status(404).json({ error: "Announcement not found" });
        return;
      }
      res.json(announcement);
    } catch (err) {
      logger.error("Error fetching announcement:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/announcements", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAnnouncements(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { title, body, audience, classId, className, pinned, expiresAt, status } = req.body;
    if (!title || !body) {
      res.status(400).json({ error: "title and body are required" });
      return;
    }
    try {
      const announcement = await prisma.announcement.create({
        data: {
          title,
          body,
          audience: audience || "ALL",
          classId: classId || null,
          className: className || null,
          pinned: Boolean(pinned),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          status: status || "ACTIVE",
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "ANNOUNCEMENT", announcement.id,
        `Announcement '${title}' created.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.status(201).json(announcement);
    } catch (err) {
      logger.error("Error creating announcement:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/announcements/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAnnouncements(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { title, body, audience, classId, className, pinned, expiresAt, status } = req.body;
    try {
      const announcement = await prisma.announcement.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(body !== undefined ? { body } : {}),
          ...(audience !== undefined ? { audience } : {}),
          ...(classId !== undefined ? { classId: classId || null } : {}),
          ...(className !== undefined ? { className: className || null } : {}),
          ...(pinned !== undefined ? { pinned: Boolean(pinned) } : {}),
          ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
          ...(status !== undefined ? { status } : {}),
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "UPDATE", "ANNOUNCEMENT", id,
        `Announcement '${announcement.title}' updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json(announcement);
    } catch (err: any) {
      logger.error("Error updating announcement:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Announcement not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/announcements/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageAnnouncements(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      await prisma.announcement.delete({ where: { id } });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "DELETE", "ANNOUNCEMENT", id,
        `Announcement ID ${id} deleted.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json({ message: "Announcement deleted successfully" });
    } catch (err: any) {
      logger.error("Error deleting announcement:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Announcement not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Timetable API ────────────────────────────────────────────────────────────
  const canManageTimetable = (role: string) => role === "ADMIN" || role === "TEACHER";
  const timetableDb = prisma as any;
  const timeToMinutes = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  };
  const rangesOverlap = (startA: string, endA: string, startB: string, endB: string) =>
    timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
  const parseScheduleDate = (value: unknown): Date | null => {
    if (!value || typeof value !== "string") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const findTimetableConflicts = async (entry: any, ignoreId?: string) => {
    if (entry.scheduleType && entry.scheduleType !== "CLASS" && entry.scheduleType !== "EXAM" && entry.scheduleType !== "MEETING") {
      return [];
    }
    const sameDay = await timetableDb.timetableEntry.findMany({
      where: {
        dayOfWeek: entry.dayOfWeek,
        status: { not: "CANCELLED" },
        ...(entry.academicYear ? { academicYear: entry.academicYear } : {}),
        ...(entry.term ? { term: entry.term } : {}),
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
    });
    return sameDay
      .filter((candidate: any) => rangesOverlap(entry.startTime, entry.endTime, candidate.startTime, candidate.endTime))
      .flatMap((candidate: any) => {
        const conflicts: string[] = [];
        if (entry.teacherId && candidate.teacherId === entry.teacherId) conflicts.push(`Teacher conflict with ${candidate.className || candidate.classId}`);
        if (entry.substituteTeacherId && candidate.teacherId === entry.substituteTeacherId) conflicts.push(`Substitute teacher conflict with ${candidate.className || candidate.classId}`);
        if (entry.classId && candidate.classId === entry.classId) conflicts.push(`Class conflict with ${candidate.subjectName || candidate.subjectId}`);
        if (entry.room && candidate.room && candidate.room.toLowerCase() === entry.room.toLowerCase()) conflicts.push(`Room conflict with ${candidate.className || candidate.classId}`);
        return conflicts.map((message) => ({ entryId: candidate.id, message }));
      });
  };
  const currentAcademicYear = () => {
    const now = new Date();
    const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start}-${start + 1}`;
  };

  app.get("/api/timetable", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId, teacherId, academicYear, term, status, scheduleType } = req.query as Record<string, string | undefined>;
    try {
      const where: any = {
        ...(classId ? { classId } : {}),
        ...(teacherId ? { OR: [{ teacherId }, { substituteTeacherId: teacherId }] } : {}),
        ...(academicYear ? { academicYear } : {}),
        ...(term ? { term } : {}),
        ...(status && status !== "all" ? { status } : {}),
        ...(scheduleType && scheduleType !== "all" ? { scheduleType } : {}),
      };

      if (jwtUser.role === "TEACHER") {
        const teacher = await prisma.teacher.findUnique({ where: { userId: jwtUser.userId } });
        if (!teacher) {
          res.json([]);
          return;
        }
        where.OR = [{ teacherId: teacher.id }, { substituteTeacherId: teacher.id }];
      }
      if (jwtUser.role === "STUDENT") {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!student?.classId) {
          res.json([]);
          return;
        }
        where.OR = [{ classId: student.classId }, { scheduleType: { in: ["HOLIDAY", "SPECIAL_EVENT"] } }];
      }

      const entries = await timetableDb.timetableEntry.findMany({
        where,
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
      res.json(entries);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") {
        logger.warn("TimetableEntry table/columns missing — run `prisma migrate deploy`. Returning empty list.");
        res.json([]);
        return;
      }
      logger.error("Error fetching timetable:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/timetable/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
      const entry = await timetableDb.timetableEntry.findUnique({ where: { id } });
      if (!entry) {
        res.status(404).json({ error: "Timetable entry not found" });
        return;
      }
      res.json(entry);
    } catch (err) {
      logger.error("Error fetching timetable entry:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/timetable", authMiddleware, validate(schemas.timetable), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageTimetable(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const scheduleType = req.body.scheduleType || "CLASS";
    if (["CLASS", "EXAM"].includes(scheduleType) && (!req.body.classId || !req.body.subjectId)) {
      res.status(400).json({ error: "classId and subjectId are required for class and exam schedules" });
      return;
    }
    if (timeToMinutes(req.body.startTime) >= timeToMinutes(req.body.endTime)) {
      res.status(400).json({ error: "endTime must be after startTime" });
      return;
    }
    if (req.body.substituteTeacherId && req.body.substituteTeacherId === req.body.teacherId) {
      res.status(400).json({ error: "Substitute teacher must be different from the main teacher" });
      return;
    }
    try {
      const candidate = {
        ...req.body,
        academicYear: req.body.academicYear || currentAcademicYear(),
        term: req.body.term || "Term 1",
        scheduleType,
        recurrence: req.body.recurrence || "WEEKLY",
      };
      const conflicts = await findTimetableConflicts(candidate);
      if (conflicts.length > 0) {
        res.status(409).json({ error: "Schedule conflict detected", conflicts });
        return;
      }
      const entry = await timetableDb.timetableEntry.create({
        data: {
          classId: candidate.classId || null,
          className: candidate.className || null,
          subjectId: candidate.subjectId || null,
          subjectName: candidate.subjectName || null,
          subjectColor: candidate.subjectColor || "bg-blue-500",
          teacherId: candidate.teacherId || null,
          teacherName: candidate.teacherName || null,
          substituteTeacherId: candidate.substituteTeacherId || null,
          substituteTeacherName: candidate.substituteTeacherName || null,
          academicYear: candidate.academicYear,
          term: candidate.term,
          dayOfWeek: candidate.dayOfWeek,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          room: candidate.room || null,
          scheduleType: candidate.scheduleType,
          recurrence: candidate.recurrence,
          effectiveFrom: parseScheduleDate(candidate.effectiveFrom),
          effectiveUntil: parseScheduleDate(candidate.effectiveUntil),
          eventDate: parseScheduleDate(candidate.eventDate),
          notes: candidate.notes || null,
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "TIMETABLE", entry.id,
        `Timetable slot created for ${entry.className || entry.classId} on ${entry.dayOfWeek}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.status(201).json(entry);
    } catch (err) {
      logger.error("Error creating timetable entry:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/timetable/:id", authMiddleware, validate(schemas.timetableUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageTimetable(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const current = await timetableDb.timetableEntry.findUnique({ where: { id } });
      if (!current) {
        res.status(404).json({ error: "Timetable entry not found" });
        return;
      }
      const candidate = { ...current, ...req.body };
      if (["CLASS", "EXAM"].includes(candidate.scheduleType) && (!candidate.classId || !candidate.subjectId)) {
        res.status(400).json({ error: "classId and subjectId are required for class and exam schedules" });
        return;
      }
      if (candidate.substituteTeacherId && candidate.substituteTeacherId === candidate.teacherId) {
        res.status(400).json({ error: "Substitute teacher must be different from the main teacher" });
        return;
      }
      if (timeToMinutes(candidate.startTime) >= timeToMinutes(candidate.endTime)) {
        res.status(400).json({ error: "endTime must be after startTime" });
        return;
      }
      const conflicts = await findTimetableConflicts(candidate, id);
      if (conflicts.length > 0) {
        res.status(409).json({ error: "Schedule conflict detected", conflicts });
        return;
      }
      const entry = await timetableDb.timetableEntry.update({
        where: { id },
        data: {
          ...(req.body.classId !== undefined ? { classId: req.body.classId } : {}),
          ...(req.body.className !== undefined ? { className: req.body.className || null } : {}),
          ...(req.body.subjectId !== undefined ? { subjectId: req.body.subjectId } : {}),
          ...(req.body.subjectName !== undefined ? { subjectName: req.body.subjectName || null } : {}),
          ...(req.body.subjectColor !== undefined ? { subjectColor: req.body.subjectColor || "bg-blue-500" } : {}),
          ...(req.body.teacherId !== undefined ? { teacherId: req.body.teacherId || null } : {}),
          ...(req.body.teacherName !== undefined ? { teacherName: req.body.teacherName || null } : {}),
          ...(req.body.substituteTeacherId !== undefined ? { substituteTeacherId: req.body.substituteTeacherId || null } : {}),
          ...(req.body.substituteTeacherName !== undefined ? { substituteTeacherName: req.body.substituteTeacherName || null } : {}),
          ...(req.body.academicYear !== undefined ? { academicYear: req.body.academicYear || null } : {}),
          ...(req.body.term !== undefined ? { term: req.body.term || null } : {}),
          ...(req.body.dayOfWeek !== undefined ? { dayOfWeek: req.body.dayOfWeek } : {}),
          ...(req.body.startTime !== undefined ? { startTime: req.body.startTime } : {}),
          ...(req.body.endTime !== undefined ? { endTime: req.body.endTime } : {}),
          ...(req.body.room !== undefined ? { room: req.body.room || null } : {}),
          ...(req.body.scheduleType !== undefined ? { scheduleType: req.body.scheduleType } : {}),
          ...(req.body.recurrence !== undefined ? { recurrence: req.body.recurrence } : {}),
          ...(req.body.effectiveFrom !== undefined ? { effectiveFrom: parseScheduleDate(req.body.effectiveFrom) } : {}),
          ...(req.body.effectiveUntil !== undefined ? { effectiveUntil: parseScheduleDate(req.body.effectiveUntil) } : {}),
          ...(req.body.eventDate !== undefined ? { eventDate: parseScheduleDate(req.body.eventDate) } : {}),
          ...(req.body.status !== undefined ? { status: req.body.status } : {}),
          ...(req.body.cancellationReason !== undefined ? { cancellationReason: req.body.cancellationReason || null } : {}),
          ...(req.body.notes !== undefined ? { notes: req.body.notes || null } : {}),
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "UPDATE", "TIMETABLE", id,
        `Timetable slot ${id} updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json(entry);
    } catch (err: any) {
      logger.error("Error updating timetable entry:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Timetable entry not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/timetable/:id/substitution", authMiddleware, validate(schemas.timetableSubstitution), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageTimetable(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const current = await timetableDb.timetableEntry.findUnique({ where: { id } });
      if (!current) {
        res.status(404).json({ error: "Timetable entry not found" });
        return;
      }
      const candidate = { ...current, substituteTeacherId: req.body.substituteTeacherId };
      const conflicts = await findTimetableConflicts(candidate, id);
      if (conflicts.length > 0) {
        res.status(409).json({ error: "Schedule conflict detected", conflicts });
        return;
      }
      const entry = await timetableDb.timetableEntry.update({
        where: { id },
        data: {
          substituteTeacherId: req.body.substituteTeacherId,
          substituteTeacherName: req.body.substituteTeacherName || null,
          status: "SUBSTITUTED",
          notes: req.body.notes || current.notes,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "SUBSTITUTE", "TIMETABLE", id, `Substitution assigned for timetable slot ${id}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(entry);
    } catch (err) {
      logger.error("Error assigning substitution:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/timetable/:id/cancel", authMiddleware, validate(schemas.timetableCancellation), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageTimetable(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const entry = await timetableDb.timetableEntry.update({
        where: { id },
        data: { status: "CANCELLED", cancellationReason: req.body.reason || null },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CANCEL", "TIMETABLE", id, `Timetable slot ${id} cancelled.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.json(entry);
    } catch (err: any) {
      logger.error("Error cancelling timetable entry:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Timetable entry not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/timetable/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageTimetable(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      await timetableDb.timetableEntry.delete({ where: { id } });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "DELETE", "TIMETABLE", id,
        `Timetable slot ${id} deleted.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json({ message: "Timetable entry deleted successfully" });
    } catch (err: any) {
      logger.error("Error deleting timetable entry:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Timetable entry not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Student Documents API ────────────────────────────────────────────────────
  // PII — only ADMIN and TEACHER may read; only ADMIN (or manage permission) may write.
  const canManageDocuments = (role: string) => role === "ADMIN" || role === "TEACHER";

  app.get("/api/students/:studentId/documents", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { studentId } = req.params;
    try {
      const documents = await prisma.studentDocument.findMany({
        where: { studentId, status: { not: "ARCHIVED" } },
        orderBy: { createdAt: "desc" },
      });
      res.json(documents);
    } catch (err) {
      logger.error("Error fetching student documents:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Multipart upload: stores the file and creates the StudentDocument in one call.
  const uploadStudentDoc = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    studentDocUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Document must be 25 MB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  app.post("/api/students/:studentId/documents/upload", authMiddleware, uploadStudentDoc, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageDocuments(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { studentId } = req.params;
    const file = (req as any).file as Express.Multer.File | undefined;
    const { title, documentType, expiryDate } = req.body || {};
    if (!file) { res.status(400).json({ error: "A file is required" }); return; }
    if (!title) { res.status(400).json({ error: "title is required" }); return; }
    try {
      const document = await prisma.studentDocument.create({
        data: {
          studentId,
          title,
          documentType: documentType || "OTHER",
          fileUrl: `/uploads/student-docs/${file.filename}`,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype || "application/octet-stream",
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          uploadedById: jwtUser.userId,
          uploadedByName: jwtUser.email,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "STUDENT_DOCUMENT", document.id,
        `Document '${title}' uploaded for student ${studentId}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(document);
    } catch (err) {
      logger.error("Error uploading student document:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/students/:studentId/documents", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageDocuments(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { studentId } = req.params;
    const { title, documentType, fileUrl, fileName, fileSize, mimeType, expiryDate } = req.body;
    if (!title || !fileUrl || !fileName) {
      res.status(400).json({ error: "title, fileUrl and fileName are required" });
      return;
    }
    try {
      const document = await prisma.studentDocument.create({
        data: {
          studentId,
          title,
          documentType: documentType || "OTHER",
          fileUrl,
          fileName,
          fileSize: fileSize != null ? Number(fileSize) : 0,
          mimeType: mimeType || "application/octet-stream",
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          uploadedById: jwtUser.userId,
          uploadedByName: jwtUser.email,
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "STUDENT_DOCUMENT", document.id,
        `Document '${title}' uploaded for student ${studentId}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.status(201).json(document);
    } catch (err) {
      logger.error("Error creating student document:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/students/:studentId/documents/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageDocuments(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { title, documentType, expiryDate, status } = req.body;
    try {
      const document = await prisma.studentDocument.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(documentType !== undefined ? { documentType } : {}),
          ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
          ...(status !== undefined ? { status } : {}),
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "UPDATE", "STUDENT_DOCUMENT", id,
        `Document '${document.title}' updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json(document);
    } catch (err: any) {
      logger.error("Error updating student document:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/students/:studentId/documents/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageDocuments(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      await prisma.studentDocument.delete({ where: { id } });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "DELETE", "STUDENT_DOCUMENT", id,
        `Document ID ${id} deleted.`, req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.json({ message: "Document deleted successfully" });
    } catch (err: any) {
      logger.error("Error deleting student document:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Physical Library: Book Catalog API ───────────────────────────────────────
  // Mutations are limited to ADMIN and LIBRARIAN; browsing the catalog is open
  // to any authenticated user.
  const canManageBooks = (role: string) => role === "ADMIN" || role === "LIBRARIAN";

  app.get("/api/books", authMiddleware, async (req, res) => {
    const { search } = req.query as { search?: string };
    try {
      const where = search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { author: { contains: search, mode: "insensitive" as const } },
              { isbn: { contains: search, mode: "insensitive" as const } },
              { category: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};
      const books = await prisma.book.findMany({
        where,
        orderBy: { title: "asc" },
      });
      res.json(books);
    } catch (err) {
      logger.error("Error fetching books:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/books", authMiddleware, validate(schemas.bookCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageBooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const {
      title, author, isbn, publisher, publishedYear, category,
      language, edition, shelfLocation, description, coverUrl, totalCopies,
    } = req.body;
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const copies = totalCopies != null ? Math.max(1, parseInt(String(totalCopies), 10) || 1) : 1;
    try {
      const book = await prisma.book.create({
        data: {
          title,
          author: author || null,
          isbn: isbn || null,
          publisher: publisher || null,
          publishedYear: publishedYear != null && publishedYear !== "" ? Number(publishedYear) : null,
          category: category || null,
          language: language || null,
          edition: edition || null,
          shelfLocation: shelfLocation || null,
          description: description || null,
          coverUrl: coverUrl || null,
          totalCopies: copies,
          availableCopies: copies,
        },
      });

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "BOOK", book.id,
        `Book '${title}' added to catalog (${copies} copies).`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );

      res.status(201).json(book);
    } catch (err) {
      logger.error("Error creating book:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/books/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
      const book = await prisma.book.findUnique({
        where: { id },
        include: { loans: { orderBy: { borrowedDate: "desc" } } },
      });
      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }
      res.json(book);
    } catch (err) {
      logger.error("Error fetching book:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/books/:id", authMiddleware, validate(schemas.bookUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageBooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const {
      title, author, isbn, publisher, publishedYear, category,
      language, edition, shelfLocation, description, coverUrl, totalCopies,
    } = req.body;
    try {
      const existing = await prisma.book.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Book not found" });
        return;
      }

      // If the total number of copies changes, shift availableCopies by the same
      // delta so currently-borrowed counts stay consistent (never below 0).
      let availableCopies = existing.availableCopies;
      if (totalCopies != null && totalCopies !== "") {
        const newTotal = Math.max(1, parseInt(String(totalCopies), 10) || existing.totalCopies);
        const delta = newTotal - existing.totalCopies;
        availableCopies = Math.max(0, Math.min(newTotal, existing.availableCopies + delta));
      }

      const book = await prisma.book.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(author !== undefined && { author: author || null }),
          ...(isbn !== undefined && { isbn: isbn || null }),
          ...(publisher !== undefined && { publisher: publisher || null }),
          ...(publishedYear !== undefined && { publishedYear: publishedYear !== "" && publishedYear != null ? Number(publishedYear) : null }),
          ...(category !== undefined && { category: category || null }),
          ...(language !== undefined && { language: language || null }),
          ...(edition !== undefined && { edition: edition || null }),
          ...(shelfLocation !== undefined && { shelfLocation: shelfLocation || null }),
          ...(description !== undefined && { description: description || null }),
          ...(coverUrl !== undefined && { coverUrl: coverUrl || null }),
          ...(totalCopies != null && totalCopies !== "" && {
            totalCopies: Math.max(1, parseInt(String(totalCopies), 10) || existing.totalCopies),
            availableCopies,
          }),
        },
      });

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "UPDATE", "BOOK", id,
        `Book '${book.title}' updated.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );

      res.json(book);
    } catch (err) {
      logger.error("Error updating book:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/books/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageBooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      await prisma.book.delete({ where: { id } });

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "DELETE", "BOOK", id,
        `Book ID ${id} removed from catalog.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );

      res.json({ message: "Book deleted successfully" });
    } catch (err: any) {
      logger.error("Error deleting book:", err);
      if (err.code === "P2025") {
        res.status(404).json({ error: "Book not found" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Issue (check out) a copy of a book to a borrower.
  app.post("/api/books/:id/loans", authMiddleware, validate(schemas.bookLoan), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageBooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { borrowerName, borrowerType, studentId, dueDate, notes } = req.body;
    if (!borrowerName || !dueDate) {
      res.status(400).json({ error: "borrowerName and dueDate are required" });
      return;
    }
    try {
      const loan = await prisma.$transaction(async (tx) => {
        const book = await tx.book.findUnique({ where: { id } });
        if (!book) throw Object.assign(new Error("Book not found"), { http: 404 });
        if (book.availableCopies < 1) throw Object.assign(new Error("No copies available to borrow"), { http: 400 });

        const created = await tx.bookLoan.create({
          data: {
            bookId: id,
            borrowerName,
            borrowerType: borrowerType || null,
            studentId: studentId || null,
            dueDate: new Date(dueDate),
            status: "BORROWED",
            recordedById: jwtUser.userId,
            recordedByName: jwtUser.email,
            notes: notes || null,
          },
        });
        await tx.book.update({
          where: { id },
          data: { availableCopies: { decrement: 1 } },
        });
        return created;
      });

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CHECKOUT", "BOOK", id,
        `Book checked out to '${borrowerName}'.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );

      res.status(201).json(loan);
    } catch (err: any) {
      if (err.http === 404) { res.status(404).json({ error: err.message }); return; }
      if (err.http === 400) { res.status(400).json({ error: err.message }); return; }
      logger.error("Error issuing book loan:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Return a borrowed copy.
  app.post("/api/book-loans/:loanId/return", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageBooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { loanId } = req.params;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const loan = await tx.bookLoan.findUnique({ where: { id: loanId } });
        if (!loan) throw Object.assign(new Error("Loan not found"), { http: 404 });
        if (loan.status === "RETURNED") throw Object.assign(new Error("This loan has already been returned"), { http: 400 });

        const updated = await tx.bookLoan.update({
          where: { id: loanId },
          data: { status: "RETURNED", returnedDate: new Date() },
        });
        const book = await tx.book.findUnique({ where: { id: loan.bookId } });
        if (book) {
          await tx.book.update({
            where: { id: loan.bookId },
            // Cap availableCopies at totalCopies to guard against double-returns.
            data: { availableCopies: Math.min(book.totalCopies, book.availableCopies + 1) },
          });
        }
        return updated;
      });

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "RETURN", "BOOK", result.bookId,
        `Book returned by '${result.borrowerName}'.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );

      res.json(result);
    } catch (err: any) {
      if (err.http === 404) { res.status(404).json({ error: err.message }); return; }
      if (err.http === 400) { res.status(400).json({ error: err.message }); return; }
      logger.error("Error returning book loan:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // List loans across the catalog (optionally filtered by status).
  app.get("/api/book-loans", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageBooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { status } = req.query as { status?: string };
    try {
      const loans = await prisma.bookLoan.findMany({
        where: status ? { status: status as any } : {},
        include: { book: { select: { id: true, title: true, author: true } } },
        orderBy: { borrowedDate: "desc" },
      });
      res.json(loans);
    } catch (err) {
      logger.error("Error fetching book loans:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── School Operations API ───────────────────────────────────────────────────
  const toOptionalDate = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  app.get("/api/operations/overview", authMiddleware, async (_req, res) => {
    // Admissions applications, communication logs, etc. contain PII — staff only.
    const jwtUser = (_req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "STAFF") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const db = prisma as any;
      const [admissions, calendarEvents, assignments, certificates, communications, inventory] = await Promise.all([
        db.admissionApplication.findMany({ orderBy: { submittedAt: "desc" }, take: 12 }),
        db.academicCalendarEvent.findMany({ orderBy: { startDate: "asc" }, take: 12 }),
        db.assignment.findMany({ orderBy: { dueDate: "asc" }, take: 12 }),
        db.certificateRecord.findMany({ orderBy: { issueDate: "desc" }, take: 12 }),
        db.communicationLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
        db.inventoryItem.findMany({ orderBy: { updatedAt: "desc" }, take: 12 }),
      ]);
      res.json({
        admissions,
        calendarEvents,
        assignments,
        certificates,
        communications,
        inventory,
        counts: {
          admissions: admissions.length,
          calendarEvents: calendarEvents.length,
          assignments: assignments.length,
          certificates: certificates.length,
          communications: communications.length,
          inventory: inventory.length,
        },
      });
    } catch (err) {
      logger.error("Error fetching school operations overview:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/operations/admissions", authMiddleware, requirePermission("manage_all"), validate(schemas.admissionApplication), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const record = await (prisma as any).admissionApplication.create({
        data: {
          applicantName: req.body.applicantName,
          guardianName: req.body.guardianName || null,
          contactNumber: req.body.contactNumber || null,
          country: req.body.country || null,
          targetLevel: req.body.targetLevel || null,
          status: req.body.status || "NEW",
          notes: req.body.notes || null,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "AdmissionApplication", record.id, `Created admission application for ${record.applicantName}`, req.ip, req.get("user-agent") || null);
      res.status(201).json(record);
    } catch (err) {
      logger.error("Error creating admission application:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/operations/calendar-events", authMiddleware, requirePermission("manage_all"), validate(schemas.calendarEvent), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const startDate = toOptionalDate(req.body.startDate);
    if (!startDate) {
      res.status(400).json({ error: "startDate: invalid date" });
      return;
    }
    try {
      const record = await (prisma as any).academicCalendarEvent.create({
        data: {
          title: req.body.title,
          eventType: req.body.eventType || "SCHOOL",
          startDate,
          endDate: toOptionalDate(req.body.endDate),
          audience: req.body.audience || "ALL",
          location: req.body.location || null,
          notes: req.body.notes || null,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "AcademicCalendarEvent", record.id, `Created calendar event ${record.title}`, req.ip, req.get("user-agent") || null);
      res.status(201).json(record);
    } catch (err) {
      logger.error("Error creating calendar event:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/operations/assignments", authMiddleware, requirePermission("manage_all"), validate(schemas.assignment), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const record = await (prisma as any).assignment.create({
        data: {
          title: req.body.title,
          description: req.body.description || null,
          classId: req.body.classId || null,
          subjectId: req.body.subjectId || null,
          dueDate: toOptionalDate(req.body.dueDate),
          status: req.body.status || "OPEN",
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "Assignment", record.id, `Created assignment ${record.title}`, req.ip, req.get("user-agent") || null);
      res.status(201).json(record);
    } catch (err) {
      logger.error("Error creating assignment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/operations/certificates", authMiddleware, requirePermission("manage_all"), validate(schemas.certificateRecord), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const record = await (prisma as any).certificateRecord.create({
        data: {
          studentId: req.body.studentId || null,
          studentName: req.body.studentName,
          certificateType: req.body.certificateType,
          issueDate: toOptionalDate(req.body.issueDate) || new Date(),
          status: req.body.status || "ISSUED",
          referenceNo: req.body.referenceNo || null,
          notes: req.body.notes || null,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "CertificateRecord", record.id, `Created certificate for ${record.studentName}`, req.ip, req.get("user-agent") || null);
      res.status(201).json(record);
    } catch (err: any) {
      logger.error("Error creating certificate record:", err);
      if (err.code === "P2002") {
        res.status(409).json({ error: "referenceNo: already exists" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/operations/communications", authMiddleware, requirePermission("manage_all"), validate(schemas.communicationLog), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const record = await (prisma as any).communicationLog.create({
        data: {
          title: req.body.title,
          channel: req.body.channel || "PHONE",
          audience: req.body.audience || "GUARDIAN",
          contactName: req.body.contactName || null,
          contactInfo: req.body.contactInfo || null,
          message: req.body.message,
          followUpDate: toOptionalDate(req.body.followUpDate),
          status: req.body.status || "LOGGED",
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "CommunicationLog", record.id, `Logged communication ${record.title}`, req.ip, req.get("user-agent") || null);
      res.status(201).json(record);
    } catch (err) {
      logger.error("Error creating communication log:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/operations/inventory", authMiddleware, requirePermission("manage_all"), validate(schemas.inventoryItem), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const record = await (prisma as any).inventoryItem.create({
        data: {
          name: req.body.name,
          category: req.body.category || "GENERAL",
          quantity: Math.max(0, Number(req.body.quantity ?? 1)),
          condition: req.body.condition || "GOOD",
          location: req.body.location || null,
          assignedTo: req.body.assignedTo || null,
          notes: req.body.notes || null,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "InventoryItem", record.id, `Created inventory item ${record.name}`, req.ip, req.get("user-agent") || null);
      res.status(201).json(record);
    } catch (err) {
      logger.error("Error creating inventory item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Update / delete a communication log (so NEEDS_FOLLOW_UP can be resolved).
  app.put("/api/operations/communications/:id", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const b = req.body || {};
    try {
      const data: any = {};
      if (b.title !== undefined) data.title = b.title;
      if (b.channel !== undefined) data.channel = b.channel;
      if (b.audience !== undefined) data.audience = b.audience;
      if (b.contactName !== undefined) data.contactName = b.contactName || null;
      if (b.contactInfo !== undefined) data.contactInfo = b.contactInfo || null;
      if (b.message !== undefined) data.message = b.message;
      if (b.followUpDate !== undefined) data.followUpDate = toOptionalDate(b.followUpDate);
      if (b.status !== undefined) data.status = b.status;
      const record = await (prisma as any).communicationLog.update({ where: { id: req.params.id }, data });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "CommunicationLog", record.id, `Updated communication ${record.title}`, req.ip, req.get("user-agent") || null);
      res.json(record);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Record not found" }); return; }
      logger.error("Error updating communication log:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/operations/communications/:id", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      await (prisma as any).communicationLog.delete({ where: { id: req.params.id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "CommunicationLog", req.params.id, `Deleted communication log`, req.ip, req.get("user-agent") || null, "WARNING");
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Record not found" }); return; }
      logger.error("Error deleting communication log:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Update / delete an inventory item (condition, quantity, location changes).
  app.put("/api/operations/inventory/:id", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const b = req.body || {};
    try {
      const data: any = {};
      if (b.name !== undefined) data.name = b.name;
      if (b.category !== undefined) data.category = b.category || "GENERAL";
      if (b.quantity !== undefined) data.quantity = Math.max(0, Number(b.quantity) || 0);
      if (b.condition !== undefined) data.condition = b.condition;
      if (b.location !== undefined) data.location = b.location || null;
      if (b.assignedTo !== undefined) data.assignedTo = b.assignedTo || null;
      if (b.notes !== undefined) data.notes = b.notes || null;
      const record = await (prisma as any).inventoryItem.update({ where: { id: req.params.id }, data });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "InventoryItem", record.id, `Updated inventory item ${record.name}`, req.ip, req.get("user-agent") || null);
      res.json(record);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Record not found" }); return; }
      logger.error("Error updating inventory item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/operations/inventory/:id", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      await (prisma as any).inventoryItem.delete({ where: { id: req.params.id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "InventoryItem", req.params.id, `Deleted inventory item`, req.ip, req.get("user-agent") || null, "WARNING");
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Record not found" }); return; }
      logger.error("Error deleting inventory item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Fees API ────────────────────────────────────────────────────────────────
  const feeReceiptPayload = (fee: any, fallbackCurrency = "MYR") => {
    const studentUser = fee.student?.user;
    const studentName = `${studentUser?.firstName ?? ""} ${studentUser?.lastName ?? ""}`.trim() || "Unknown";
    const paidDate = fee.paidDate ?? fee.createdAt;
    const paidAmount = fee.status === "WAIVED"
      ? 0
      : (fee.paidAmount ?? (fee.status === "PAID" ? fee.amount : 0));
    const balance = fee.status === "WAIVED" ? 0 : Math.max(0, (fee.amount ?? 0) - paidAmount);

    return {
      ...fee,
      currency: fee.currency || fallbackCurrency,
      // Some rows predate discountAmount/paidAmount (or are the synthetic
      // "still owed" rows built from a FeeAssignment) -- default sensibly
      // so every consumer can rely on these fields always being numbers.
      discountAmount: fee.discountAmount ?? 0,
      paidAmount,
      balance,
      paymentDate: paidDate,
      paymentType: fee.description || "Fee Payment",
      studentName,
      studentIdNumber: fee.student?.studentCode ?? "—",
      class: fee.student?.class?.name ?? fee.student?.classId ?? "—",
      recordedBy: "Finance Office",
    };
  };

  // Builds one row per student combining BOTH ways a fee can be tracked in
  // this app: (a) structured FeeAssignment obligations (created via Fee
  // Structures > Assign Fees, which stay PENDING/OVERDUE with a real
  // outstandingAmount until someone pays them), and (b) ad-hoc FeePayment
  // records with no assignmentId (created via the simple "Record Payment"
  // form, which always writes status "PAID" immediately since it has no
  // separate invoice step).
  //
  // Previously this endpoint (and /api/reports/fees) only ever looked at
  // FeePayment. Since NEITHER of the two code paths that create a
  // FeePayment ever writes anything other than status "PAID", a student
  // who had been assigned a fee but hadn't paid it yet had zero rows to
  // show under any status -- "Unpaid"/"Partial" were structurally
  // impossible to see, not just empty by coincidence.
  type FeeOverviewPeriod = { month?: string; year?: number };

  const buildStudentFeeOverview = async (period: FeeOverviewPeriod = {}) => {
    const monthRange = period.month ? feeMonthRange(period.month) : null;
    const yearRange = period.year != null ? feeYearRange(period.year) : null;
    const range = monthRange || yearRange;
    const dueDateFilter = range ? { gte: range.start, lt: range.endExclusive } : undefined;

    const assignmentWhere: any = { status: { not: "WAIVED" } };
    if (dueDateFilter) assignmentWhere.dueDate = dueDateFilter;

    const orphanPaymentWhere: any = { assignmentId: null };
    if (period.month && dueDateFilter) {
      // billingMonth is authoritative for new rows. The dueDate fallback
      // keeps this endpoint safe during a rolling deploy and for any legacy
      // row that predates the backfill migration.
      orphanPaymentWhere.OR = [
        { billingMonth: period.month },
        { billingMonth: null, dueDate: dueDateFilter },
      ];
    } else if (period.year != null && dueDateFilter) {
      orphanPaymentWhere.OR = [
        { billingMonth: { gte: `${period.year}-01`, lte: `${period.year}-12` } },
        { billingMonth: null, dueDate: dueDateFilter },
      ];
    }

    const [assignments, orphanPayments] = await Promise.all([
      prisma.feeAssignment.findMany({ where: assignmentWhere, include: { student: { include: { user: true, class: true } }, feeItem: true } }),
      // assignmentId is unique+optional: null means this payment wasn't
      // recorded against a structured assignment (the ad-hoc flow).
      // Cast: discountAmount/paidAmount are new columns (see the
      // add_fee_payment_discount_and_partial migration) not yet reflected
      // in this environment's generated Prisma client typings; the real
      // runtime client is regenerated from schema.prisma before deploy.
      prisma.feePayment.findMany({ where: orphanPaymentWhere, include: { student: { include: { user: true, class: true } } } }) as Promise<any[]>,
    ]);

    const byStudent = new Map<string, {
      student: any; expected: number; paid: number; lastPaymentDate: Date | null;
    }>();
    const ensure = (student: any) => {
      if (!byStudent.has(student.id)) byStudent.set(student.id, { student, expected: 0, paid: 0, lastPaymentDate: null });
      return byStudent.get(student.id)!;
    };
    for (const a of assignments) {
      if (!a.student) continue;
      const row = ensure(a.student);
      row.expected += a.totalAmount;
      row.paid += a.paidAmount;
      if (a.paidDate && (!row.lastPaymentDate || a.paidDate > row.lastPaymentDate)) row.lastPaymentDate = a.paidDate;
    }
    for (const p of orphanPayments) {
      if (!p.student) continue;
      if (p.status === "WAIVED") continue;
      const row = ensure(p.student);
      // p.amount is the net amount owed for this manually-recorded charge
      // (after any discount); p.paidAmount is how much of that has
      // actually been paid so far -- these can now differ for a charge
      // recorded as a partial payment, so don't assume amount === paid.
      row.expected += p.amount;
      row.paid += p.paidAmount ?? (p.status === "PAID" ? p.amount : 0);
      const d = p.paidDate || p.createdAt;
      if (d && (!row.lastPaymentDate || d > row.lastPaymentDate)) row.lastPaymentDate = d;
    }

    return Array.from(byStudent.values()).map(({ student, expected, paid, lastPaymentDate }) => {
      const balance = Math.max(0, expected - paid);
      const status = expected > 0 && balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
      return { student, expected, paid, balance, status, lastPaymentDate };
    });
  };

  // Real, itemized transaction/receipt history for one student -- each row
  // keeps its own FeePayment id so "View Receipt" links (which fetch
  // GET /api/fees/:id) keep working. Used both for a student viewing their
  // own fees and for staff viewing a specific student's fee profile.
  const buildStudentTransactionRows = async (studentId: string, fallbackCurrency: string) => {
    const [fees, openAssignments] = await Promise.all([
      prisma.feePayment.findMany({
        where: { studentId },
        include: { student: { include: { user: true, class: true } } }
      }),
      prisma.feeAssignment.findMany({
        where: { studentId, status: { not: "PAID" } },
        include: { feeItem: true },
      }),
    ]);
    const rows = fees.map((fee: any) => feeReceiptPayload(fee, fallbackCurrency));
    // amount here is the total owed (not just what's left), so it lines up
    // with the same amount/discountAmount/paidAmount/balance shape as real
    // FeePayment rows above -- these came from Fee Structures > Assign
    // Fees, a separate, optional bulk-billing path from the manual charges
    // created below, but should still read consistently on a statement.
    const synthetic = openAssignments.map((a: any) => ({
      id: `assignment-${a.id}`,
      studentId,
      amount: a.totalAmount,
      discountAmount: a.discountAmount ?? 0,
      paidAmount: a.paidAmount ?? 0,
      balance: a.outstandingAmount,
      currency: fallbackCurrency,
      status: a.status,
      description: a.feeItem?.name ? `${a.feeItem.name} (Assigned)` : "Assigned Fee",
      paymentMethod: null,
      paidDate: null,
      dueDate: a.dueDate,
      billingMonth: a.dueDate.toISOString().slice(0, 7),
      createdAt: a.dueDate,
      receiptNumber: null,
    }));
    return [...rows, ...synthetic];
  };

  app.get("/api/fees", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const profile = await prisma.schoolProfile.findFirst();
      const fallbackCurrency = profile?.currency || "MYR";
      if (jwtUser.role === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { userId: jwtUser.userId }
        });
        if (!student) {
          res.status(404).json({ error: "Student profile not found" });
          return;
        }
        res.json(await buildStudentTransactionRows(student.id, fallbackCurrency));
      } else if (["ADMIN", "ACCOUNTANT", "STAFF"].includes(jwtUser.role)) {
        // A studentId query means a caller (e.g. the Fee Profile page) wants
        // that one student's real, itemized transaction/receipt history --
        // NOT the dashboard overview below, whose rows are aggregated per
        // student and therefore have no real FeePayment id to link a receipt
        // to.
        const { studentId } = req.query as { studentId?: string };
        if (studentId) {
          res.json(await buildStudentTransactionRows(studentId, fallbackCurrency));
          return;
        }
        const requestedMonth = req.query.month;
        const requestedYear = req.query.year;
        const month = requestedMonth == null ? undefined : normalizeFeeMonth(requestedMonth);
        if (requestedMonth != null && !month) {
          res.status(400).json({ error: "month must use YYYY-MM format" });
          return;
        }
        const yearRange = requestedYear == null ? null : feeYearRange(requestedYear);
        if (requestedYear != null && !yearRange) {
          res.status(400).json({ error: "year must be a whole number between 2000 and 2100" });
          return;
        }
        if (month && requestedYear != null) {
          res.status(400).json({ error: "Use either month or year, not both" });
          return;
        }
        const overview = await buildStudentFeeOverview({
          ...(month ? { month } : {}),
          ...(requestedYear != null ? { year: Number(requestedYear) } : {}),
        });
        res.json(overview.map(({ student, expected, paid, balance, status, lastPaymentDate }) => ({
          id: student.id,
          studentId: student.id,
          student,
          amount: expected,
          totalPaid: paid,
          balance,
          status,
          currency: fallbackCurrency,
          paidDate: lastPaymentDate,
        })));
      } else {
        res.status(403).json({ error: "Forbidden" });
      }
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error("Error fetching fees:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/fees/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const fee = await prisma.feePayment.findUnique({
        where: { id },
        include: { student: { include: { user: true, class: true } } }
      });
      const profile = await prisma.schoolProfile.findFirst();
      if (!fee) {
        res.status(404).json({ error: "Fee receipt not found" });
        return;
      }
      if (jwtUser.role === "STUDENT") {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!student || fee.studentId !== student.id) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      } else if (!["ADMIN", "ACCOUNTANT", "STAFF"].includes(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.json(feeReceiptPayload(fee, profile?.currency || "MYR"));
    } catch (err) {
      logger.error("Error fetching fee receipt:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Manual fee charge, recorded directly against a student -- the primary
  // way staff bill and collect fees day-to-day (Fee Structures is a
  // separate, optional bulk-billing tool for structured invoicing). Supports
  // an optional discount and an optional partial payment: if amountPaid is
  // less than the post-discount amount, the charge is saved as PARTIAL with
  // a real balance, instead of the old behavior of always writing PAID.
  app.post("/api/fees", authMiddleware, validate(schemas.fee), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "ACCOUNTANT") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { studentId, totalAmount, discountAmount, amountPaid, paymentType, paymentMethod, paymentDate, dueDate, billingMonth, receiptNumber, notes } = req.body;
    const gross = Number(totalAmount);
    if (!studentId || !totalAmount) {
      res.status(400).json({ error: "studentId and totalAmount are required" });
      return;
    }
    if (gross <= 0) {
      res.status(400).json({ error: "totalAmount must be greater than 0" });
      return;
    }
    const discount = discountAmount != null ? Math.max(0, Number(discountAmount)) : 0;
    if (discount > gross) {
      res.status(400).json({ error: "discountAmount cannot exceed totalAmount" });
      return;
    }
    const netAmount = Math.max(0, gross - discount);
    // Omitting amountPaid preserves the historical one-step "record a
    // completed payment" behavior; providing a smaller number records a
    // partial payment instead.
    const paidNow = amountPaid == null ? netAmount : Math.min(Math.max(0, Number(amountPaid)), netAmount);
    // PARTIAL, discountAmount and paidAmount are new (see the
    // add_fee_payment_discount_and_partial migration) and not yet reflected
    // in this environment's generated Prisma client typings -- cast so this
    // still compiles here; the real client is regenerated before deploy.
    const status: any = paidNow <= 0 ? "PENDING" : paidNow >= netAmount ? "PAID" : "PARTIAL";
    const canonicalBillingMonth = billingMonth == null
      ? normalizeFeeMonth(String(dueDate || paymentDate || new Date().toISOString()).slice(0, 7))
      : normalizeFeeMonth(billingMonth);
    if (!canonicalBillingMonth) {
      res.status(400).json({ error: "billingMonth must use YYYY-MM format" });
      return;
    }
    try {
      const profile = await prisma.schoolProfile.findFirst();
      const fee = await prisma.feePayment.create({
        data: {
          studentId,
          amount: netAmount,
          discountAmount: discount,
          paidAmount: paidNow,
          currency: profile?.currency || "MYR",
          billingMonth: canonicalBillingMonth,
          description: paymentType || "Tuition Fee",
          paymentMethod: paymentMethod || "CASH",
          paidDate: paidNow > 0 ? (paymentDate ? new Date(paymentDate) : new Date()) : null,
          dueDate: dueDate ? new Date(dueDate) : (paymentDate ? new Date(paymentDate) : new Date()),
          status,
          receiptNumber: receiptNumber || `RCP-${Date.now()}`,
          notes,
          ...(paidNow > 0 && {
            collections: {
              create: {
                amount: paidNow,
                currency: profile?.currency || "MYR",
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                paymentMethod: paymentMethod || "CASH",
                reference: receiptNumber || null,
                notes: notes || null,
              },
            },
          }),
        } as any,
        include: { student: { include: { user: true, class: true } } }
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "PAYMENT",
        fee.id,
        `Recorded fee charge of ${netAmount} (paid ${paidNow}) for student ID ${studentId}.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.status(201).json(feeReceiptPayload(fee, profile?.currency || "MYR"));
    } catch (err) {
      logger.error("Error creating fee payment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Top up a partially-paid (or unpaid) manual charge with another payment,
  // until it reaches PAID. This is how staff collect the remaining balance
  // on a charge that was recorded as PARTIAL.
  app.post("/api/fees/:id/pay", authMiddleware, validate(schemas.feePaymentTopUp), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "ACCOUNTANT") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      // Cast: discountAmount/paidAmount/PARTIAL are new (see the
      // add_fee_payment_discount_and_partial migration) and not yet
      // reflected in this environment's generated Prisma client typings.
      const fee: any = await prisma.feePayment.findUnique({ where: { id: req.params.id } });
      if (!fee) {
        res.status(404).json({ error: "Fee record not found" });
        return;
      }
      if (fee.status === "PAID") {
        res.status(400).json({ error: "This fee is already fully paid" });
        return;
      }
      if (fee.status === "WAIVED") {
        res.status(400).json({ error: "This fee has been waived" });
        return;
      }
      const balance = Math.max(0, fee.amount - fee.paidAmount);
      const amountNow = Number(req.body.amount);
      if (!amountNow || amountNow <= 0) {
        res.status(400).json({ error: "amount must be greater than 0" });
        return;
      }
      const applied = Math.min(amountNow, balance);
      const newPaid = fee.paidAmount + applied;
      const newStatus: any = newPaid >= fee.amount ? "PAID" : "PARTIAL";
      const paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
      const noteLine = `${paymentDate.toISOString().slice(0, 10)}: +${applied} payment recorded${req.body.notes ? ` (${req.body.notes})` : ""}`;

      const updated: any = await prisma.$transaction(async (tx) => {
        await tx.feeCollection.create({
          data: {
            feePaymentId: fee.id,
            amount: applied,
            currency: fee.currency || "MYR",
            paymentDate,
            paymentMethod: req.body.paymentMethod || fee.paymentMethod,
            notes: req.body.notes || null,
          },
        });
        return tx.feePayment.update({
          where: { id: fee.id },
          data: {
            paidAmount: newPaid,
            status: newStatus,
            paidDate: paymentDate,
            paymentMethod: req.body.paymentMethod || fee.paymentMethod,
            notes: fee.notes ? `${fee.notes}\n${noteLine}` : noteLine,
          } as any,
          include: { student: { include: { user: true, class: true } } },
        });
      });

      const profile = await prisma.schoolProfile.findFirst();
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "PAY",
        "PAYMENT",
        fee.id,
        `Recorded additional payment of ${applied} toward fee ${fee.id} (new balance ${Math.max(0, updated.amount - updated.paidAmount)}).`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json(feeReceiptPayload(updated, profile?.currency || "MYR"));
    } catch (err) {
      logger.error("Error recording fee top-up payment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/fees/:id/void", authMiddleware, validate(schemas.feePaymentVoid), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "ACCOUNTANT") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const fee: any = await prisma.feePayment.findUnique({ where: { id: req.params.id } });
      if (!fee) {
        res.status(404).json({ error: "Fee record not found" });
        return;
      }
      if (fee.status === "WAIVED") {
        res.status(400).json({ error: "This payment is already voided" });
        return;
      }

      const voidedAt = new Date();
      const voidNote = `${voidedAt.toISOString().slice(0, 10)}: Payment voided by ${jwtUser.email}. Reason: ${req.body.reason}`;
      // Keep the collection rows as an immutable audit trail. Financial
      // reports exclude collections whose parent charge is WAIVED.
      const updated: any = await prisma.feePayment.update({
        where: { id: fee.id },
        data: {
          status: "WAIVED" as any,
          paidAmount: 0,
          paidDate: null,
          notes: fee.notes ? `${fee.notes}\n${voidNote}` : voidNote,
        } as any,
        include: { student: { include: { user: true, class: true } } },
      });

      const profile = await prisma.schoolProfile.findFirst();
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "VOID",
        "PAYMENT",
        fee.id,
        `Voided fee payment ${fee.id}. Reason: ${req.body.reason}`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json(feeReceiptPayload(updated, profile?.currency || "MYR"));
    } catch (err) {
      logger.error("Error voiding fee payment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // PUBLIC payment verification -- reveals only receipt-level information.
  app.get("/api/verify/payment/:id", async (req, res) => {
    try {
      const fee: any = await prisma.feePayment.findUnique({
        where: { id: req.params.id },
        include: { student: { include: { user: true, class: true } } },
      });
      if (!fee) {
        res.status(404).json({ valid: false, error: "Payment receipt not found" });
        return;
      }
      const profile = await prisma.schoolProfile.findFirst();
      const receipt = feeReceiptPayload(fee, profile?.currency || "MYR");
      res.json({
        valid: fee.status !== "WAIVED",
        status: fee.status === "WAIVED" ? "VOIDED" : fee.status,
        receiptNumber: fee.receiptNumber,
        paymentType: fee.description || "Fee Payment",
        studentName: receipt.studentName,
        studentIdNumber: receipt.studentIdNumber,
        className: receipt.class,
        amountPaid: receipt.paidAmount,
        currency: receipt.currency,
        paymentMethod: fee.paymentMethod || null,
        paymentDate: receipt.paymentDate,
        school: { name: profile?.name || "School", logoUrl: profile?.logoUrl || null },
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") {
        res.status(404).json({ valid: false, error: "Payment verification unavailable" });
        return;
      }
      logger.error("Error verifying payment receipt:", err);
      res.status(500).json({ valid: false, error: "Internal Server Error" });
    }
  });

  // ── Fee Structure Management API ─────────────────────────────────────────────────────
  // Permission helpers
  const feeStructureCanManage = (role: string) => role === "ADMIN" || role === "ACCOUNTANT";
  const feeStructureCanView = (role: string) => ["ADMIN", "ACCOUNTANT", "STAFF"].includes(role);

  // ---- Fee Structures ----
  app.get("/api/fee-structures", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const { status, academicYear, sortBy = "createdAt", sortOrder = "desc" } = req.query;
      const where: any = {};
      if (status) where.status = { in: (status as string).split(',') };
      if (academicYear) where.academicYear = parseInt(academicYear as string);

      const structures = await prisma.feeStructure.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: {
          items: { where: { isActive: true }, orderBy: { order: 'asc' } },
          _count: { select: { assignments: true } },
        },
      });

      res.json(structures);
    } catch (err) {
      logger.error("Error fetching fee structures:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/fee-structures/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const structure = await prisma.feeStructure.findUnique({
        where: { id: req.params.id },
        include: {
          items: { include: { budget: true }, orderBy: { order: 'asc' } },
          assignments: { include: { student: true, feeItem: true } },
          discounts: true,
          paymentPlans: { include: { student: true } },
        },
      });

      if (!structure) {
        res.status(404).json({ error: "Fee structure not found" });
        return;
      }

      res.json(structure);
    } catch (err) {
      logger.error("Error fetching fee structure:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/fee-structures", authMiddleware, validate(schemas.feeStructureCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const structure = await prisma.feeStructure.create({
        data: {
          ...req.body,
          effectiveFromDate: new Date(req.body.effectiveFromDate),
          effectiveToDate: req.body.effectiveToDate ? new Date(req.body.effectiveToDate) : null,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
        include: { items: true },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "FEE_STRUCTURE",
        structure.id,
        `Created fee structure: ${structure.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(structure);
    } catch (err) {
      logger.error("Error creating fee structure:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/fee-structures/:id", authMiddleware, validate(schemas.feeStructureUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const structure = await prisma.feeStructure.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          effectiveFromDate: req.body.effectiveFromDate ? new Date(req.body.effectiveFromDate) : undefined,
          effectiveToDate: req.body.effectiveToDate ? new Date(req.body.effectiveToDate) : undefined,
        },
        include: { items: true },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "FEE_STRUCTURE",
        structure.id,
        `Updated fee structure: ${structure.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(structure);
    } catch (err) {
      logger.error("Error updating fee structure:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/fee-structures/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const structure = await prisma.feeStructure.findUnique({
        where: { id: req.params.id },
        include: {
          _count: {
            select: {
              assignments: true,
              paymentPlans: true,
            },
          },
        },
      });
      if (!structure) {
        res.status(404).json({ error: "Fee structure not found" });
        return;
      }
      if (structure.status === "ACTIVE") {
        res.status(400).json({ error: "Cannot delete ACTIVE fee structure. Archive it first." });
        return;
      }
      const deleted = await prisma.$transaction(async (tx) => {
        const assignments = await tx.feeAssignment.findMany({
          where: { feeStructureId: structure.id },
          select: { id: true },
        });
        const assignmentIds = assignments.map((assignment) => assignment.id);
        const plans = await tx.feePaymentPlan.findMany({
          where: { feeStructureId: structure.id },
          select: {
            id: true,
            installments: { select: { id: true } },
          },
        });
        const installmentIds = plans.flatMap((plan) => plan.installments.map((installment) => installment.id));

        // Preserve real receipts as standalone payment records before removing
        // the generated fee assignment/payment-plan records.
        if (assignmentIds.length > 0) {
          await tx.feePayment.updateMany({
            where: { assignmentId: { in: assignmentIds } },
            data: { assignmentId: null },
          });
          await tx.feeAssignment.updateMany({
            where: { id: { in: assignmentIds } },
            data: { feePaymentId: null },
          });
          await tx.feeAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
        }

        if (installmentIds.length > 0) {
          await tx.feePayment.updateMany({
            where: { installmentId: { in: installmentIds } },
            data: { installmentId: null },
          });
          await tx.feeInstallment.updateMany({
            where: { id: { in: installmentIds } },
            data: { feePaymentId: null },
          });
        }
        if (plans.length > 0) {
          await tx.feePaymentPlan.deleteMany({ where: { id: { in: plans.map((plan) => plan.id) } } });
        }

        await tx.feeStructure.delete({ where: { id: req.params.id } });
        return {
          assignments: assignmentIds.length,
          paymentPlans: plans.length,
        };
      });
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "FEE_STRUCTURE",
        structure.id,
        `Deleted fee structure: ${structure.name} (${deleted.assignments} assignments and ${deleted.paymentPlans} payment plans removed).`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ message: "Fee structure deleted", deleted });
    } catch (err: any) {
      logger.error("Error deleting fee structure:", err);
      if (err?.code === "P2003") {
        res.status(409).json({ error: "This fee structure is still linked to billing records and could not be deleted safely." });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Fee Items ----
  app.post("/api/fee-structures/:id/items", authMiddleware, validate(schemas.feeItemCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const item = await prisma.feeItem.create({
        data: {
          ...req.body,
          feeStructureId: req.params.id,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      res.status(201).json(item);
    } catch (err) {
      logger.error("Error creating fee item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/fee-items/:id", authMiddleware, validate(schemas.feeItemUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const item = await prisma.feeItem.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        },
      });

      res.json(item);
    } catch (err) {
      logger.error("Error updating fee item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/fee-items/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      await prisma.feeItem.delete({ where: { id: req.params.id } });
      res.json({ message: "Fee item deleted" });
    } catch (err) {
      logger.error("Error deleting fee item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Fee Assignments ----
  app.post("/api/fee-structures/:id/assign", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const structure = await prisma.feeStructure.findUnique({
        where: { id: req.params.id },
        include: { items: { where: { isActive: true } } },
      });

      if (!structure) {
        res.status(404).json({ error: "Fee structure not found" });
        return;
      }

      // Get applicable students
      const students = await prisma.student.findMany({
        where: {
          status: "ACTIVE",
          ...(structure.applyToBoarders && { educationLevel: { contains: "BOARDING" } }),
        },
        include: { class: true },
      });

      // Existing (student, item) assignments — so re-running "Assign Fees"
      // (e.g. after adding new students) doesn't create DUPLICATE charges that
      // would double a student's amount due in the fees overview.
      const itemIds = structure.items.map((i) => i.id);
      const existing = await prisma.feeAssignment.findMany({
        where: { feeItemId: { in: itemIds } },
        select: { studentId: true, feeItemId: true },
      });
      const alreadyAssigned = new Set(existing.map((e) => `${e.studentId}:${e.feeItemId}`));

      // Create assignments
      const assignments = [];
      let skipped = 0;
      for (const student of students) {
        for (const item of structure.items) {
          // Check if student meets criteria
          if (item.classIds.length > 0 && !item.classIds.includes(student.classId || "")) continue;
          if (item.applicableTo === "BOARDING_STUDENTS" && !student.educationLevel?.includes("BOARDING")) continue;
          if (item.applicableTo === "DAY_STUDENTS" && student.educationLevel?.includes("BOARDING")) continue;

          // Skip if this student already has this fee item assigned.
          if (alreadyAssigned.has(`${student.id}:${item.id}`)) { skipped++; continue; }
          alreadyAssigned.add(`${student.id}:${item.id}`);

          const dueDate = item.dueDate || new Date(structure.effectiveFromDate);

          const assignment = await prisma.feeAssignment.create({
            data: {
              studentId: student.id,
              feeItemId: item.id,
              feeStructureId: structure.id,
              baseAmount: item.amount,
              totalAmount: item.amount,
              outstandingAmount: item.amount,
              dueDate,
              status: "PENDING",
            },
          });

          assignments.push(assignment);
        }
      }

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "ASSIGN",
        "FEE_STRUCTURE",
        structure.id,
        `Assigned fees: ${assignments.length} created, ${skipped} skipped (already assigned)`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({
        message: `Created ${assignments.length} fee assignments${skipped ? `, skipped ${skipped} already assigned` : ""}`,
        count: assignments.length,
        skipped,
      });
    } catch (err) {
      logger.error("Error assigning fees:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/fee-assignments", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const { studentId, status, feeStructureId } = req.query;
      const where: any = {};
      if (studentId) where.studentId = studentId;
      if (status) where.status = { in: (status as string).split(',') };
      if (feeStructureId) where.feeStructureId = feeStructureId;

      const assignments = await prisma.feeAssignment.findMany({
        where,
        include: { student: true, feeItem: true, feeStructure: true },
        orderBy: { dueDate: 'asc' },
      });

      res.json(assignments);
    } catch (err) {
      logger.error("Error fetching fee assignments:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/fee-assignments/:id/pay", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const assignment = await prisma.feeAssignment.findUnique({
        where: { id: req.params.id },
        include: { student: true, feeItem: true },
      });

      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }
      if (assignment.status === "PAID") {
        res.status(400).json({ error: "Assignment already paid" });
        return;
      }

      // Create FeePayment. Link it to the assignment (assignmentId) so the fees
      // overview — which sums assignments plus ONLY orphan (assignmentId: null)
      // payments — doesn't double-count this payment as a separate charge.
      // Also set paidAmount so the record is internally consistent, and use the
      // school's configured currency instead of a hard-coded "MYR".
      const feeProfile = await prisma.schoolProfile.findFirst();
      const payment = await prisma.feePayment.create({
        data: {
          studentId: assignment.studentId,
          assignmentId: assignment.id,
          amount: assignment.outstandingAmount,
          paidAmount: assignment.outstandingAmount,
          currency: feeProfile?.currency || "MYR",
          billingMonth: assignment.dueDate.toISOString().slice(0, 7),
          dueDate: assignment.dueDate,
          paidDate: new Date(),
          status: "PAID",
          description: assignment.feeItem?.name || "Fee payment",
          paymentMethod: req.body.paymentMethod || "OTHER",
          notes: req.body.notes,
          collections: {
            create: {
              amount: assignment.outstandingAmount,
              currency: feeProfile?.currency || "MYR",
              paymentDate: new Date(),
              paymentMethod: req.body.paymentMethod || "OTHER",
              notes: req.body.notes || null,
            },
          },
        } as any,
      });

      // Update assignment
      await prisma.feeAssignment.update({
        where: { id: req.params.id },
        data: {
          feePaymentId: payment.id,
          paidAmount: assignment.outstandingAmount,
          outstandingAmount: 0,
          status: "PAID",
          paidDate: new Date(),
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "PAY",
        "FEE_ASSIGNMENT",
        assignment.id,
        `Recorded payment for ${assignment.student?.preferredName}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ message: "Payment recorded", payment });
    } catch (err) {
      logger.error("Error recording payment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Fee Discounts ----
  app.get("/api/fee-discounts", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const discounts = await prisma.feeDiscount.findMany({
        where: { isActive: true },
        include: { feeStructure: true },
        orderBy: { validFrom: 'desc' },
      });

      res.json(discounts);
    } catch (err) {
      logger.error("Error fetching fee discounts:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/fee-discounts", authMiddleware, validate(schemas.feeDiscountCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const discount = await prisma.feeDiscount.create({
        data: {
          ...req.body,
          validFrom: new Date(req.body.validFrom),
          validTo: req.body.validTo ? new Date(req.body.validTo) : null,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      res.status(201).json(discount);
    } catch (err) {
      logger.error("Error creating fee discount:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Payment Plans ----
  app.post("/api/payment-plans", authMiddleware, validate(schemas.feePaymentPlanCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const plan = await prisma.feePaymentPlan.create({
        data: {
          ...req.body,
          firstInstallmentDue: new Date(req.body.firstInstallmentDue),
          agreedById: jwtUser.userId,
          agreedByName: jwtUser.email,
          agreedAt: new Date(),
        },
      });

      // Create installments
      const installments = [];
      const installmentAmount = plan.totalAmount / plan.numberOfInstallments;
      for (let i = 0; i < plan.numberOfInstallments; i++) {
        const dueDate = new Date(plan.firstInstallmentDue);
        dueDate.setMonth(dueDate.getMonth() + i);

        const installment = await prisma.feeInstallment.create({
          data: {
            paymentPlanId: plan.id,
            installmentNumber: i + 1,
            amount: installmentAmount,
            dueDate,
            status: "DUE",
          },
        });

        installments.push(installment);
      }

      res.status(201).json({ plan, installments });
    } catch (err) {
      logger.error("Error creating payment plan:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/payment-plans", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!feeStructureCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const { studentId, status } = req.query;
      const where: any = {};
      if (studentId) where.studentId = studentId;
      if (status) where.status = status;

      const plans = await prisma.feePaymentPlan.findMany({
        where,
        include: { student: true, installments: true, feeStructure: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json(plans);
    } catch (err) {
      logger.error("Error fetching payment plans:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Donation Tracking API ─────────────────────────────────────────────────────
  // Permission helpers
  const donationCanManage = (role: string) => role === "ADMIN" || role === "ACCOUNTANT";
  const donationCanView = (role: string) => ["ADMIN", "ACCOUNTANT", "STAFF"].includes(role);

  // ---- Donors ----
  // (Full CRUD — including statistics, PUT, and soft-delete — lives further
  // down under "Donor Management". An earlier, incomplete GET/POST/GET:id-only
  // trio used to be registered here too; since Express dispatches to whichever
  // route matches first, that duplicate was silently shadowing the more
  // complete implementation below. Removed rather than merged, since the
  // later block is a strict superset.)

  // ---- Donations ----
  app.get("/api/donations", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const { status, donorId, campaignId, sortBy = "donationDate", sortOrder = "desc" } = req.query;
      const where: any = {};
      if (status) where.status = { in: (status as string).split(',') };
      if (donorId) where.donorId = donorId;
      if (campaignId) where.campaignId = campaignId;

      const donations = await prisma.donation.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: { donor: true, campaign: true },
      });

      res.json(donations);
    } catch (err) {
      logger.error("Error fetching donations:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/donations/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const donation = await prisma.donation.findUnique({
        where: { id: req.params.id },
        include: { donor: true, campaign: true, receipt: true },
      });

      if (!donation) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      res.json(donation);
    } catch (err) {
      logger.error("Error fetching donation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/donations", authMiddleware, validate(schemas.donationCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      // Auto-generate donation number
      const year = new Date().getFullYear();
      const count = await prisma.donation.count({ where: { donationNumber: { startsWith: `DON-${year}-` } } });
      const donationNumber = `DON-${year}-${String(count + 1).padStart(4, '0')}`;

      const donation = await prisma.donation.create({
        data: {
          ...req.body,
          donationNumber,
          donationDate: new Date(req.body.donationDate),
          taxReceiptAmount: req.body.isTaxDeductible ? req.body.amount : undefined,
        },
      });

      // Update campaign raised amount if linked
      if (donation.campaignId) {
        await prisma.donationCampaign.update({
          where: { id: donation.campaignId },
          data: { raisedAmount: { increment: donation.amount }, donorCount: { increment: 1 } },
        });
      }

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "DONATION",
        donation.id,
        `Created donation: ${donationNumber}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(donation);
    } catch (err) {
      logger.error("Error creating donation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/donations/:id", authMiddleware, validate(schemas.donationUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const existing = await prisma.donation.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      const nextAmount = req.body.amount !== undefined ? Number(req.body.amount) : existing.amount;
      const nextCampaignId = req.body.campaignId !== undefined ? (req.body.campaignId || null) : existing.campaignId;

      const donation = await prisma.$transaction(async (tx) => {
        // Keep each campaign's cached raisedAmount/donorCount in sync if the
        // amount was corrected or the donation was reassigned to a different
        // campaign (or removed from one).
        if (existing.campaignId !== nextCampaignId || existing.amount !== nextAmount) {
          if (existing.campaignId) {
            await tx.donationCampaign.update({
              where: { id: existing.campaignId },
              data: {
                raisedAmount: { decrement: existing.amount },
                donorCount: { decrement: 1 },
              },
            });
          }
          if (nextCampaignId) {
            await tx.donationCampaign.update({
              where: { id: nextCampaignId },
              data: {
                raisedAmount: { increment: nextAmount },
                donorCount: { increment: 1 },
              },
            });
          }
        }

        return tx.donation.update({
          where: { id: req.params.id },
          data: {
            ...req.body,
            amount: nextAmount,
            campaignId: nextCampaignId,
            donationDate: req.body.donationDate ? new Date(req.body.donationDate) : undefined,
            receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : undefined,
            processedDate: req.body.processedDate ? new Date(req.body.processedDate) : undefined,
          },
        });
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "DONATION",
        donation.id,
        `Updated donation: ${donation.donationNumber}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(donation);
    } catch (err) {
      logger.error("Error updating donation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/donations/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const donation = await prisma.donation.findUnique({
        where: { id: req.params.id },
        include: { receipt: true },
      });

      if (!donation) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      // A donation with an issued tax receipt shouldn't be silently deleted --
      // that receipt may already be in the donor's hands / filed with tax
      // authorities. Delete the receipt first (or cancel/refund instead).
      if (donation.receipt) {
        res.status(400).json({ error: "Cannot delete a donation that already has a tax receipt issued. Delete the receipt first, or mark the donation as CANCELLED/REFUNDED instead." });
        return;
      }

      await prisma.$transaction(async (tx) => {
        // Keep the linked campaign's cached totals in sync (mirrors the
        // increment done when the donation was created).
        if (donation.campaignId) {
          await tx.donationCampaign.update({
            where: { id: donation.campaignId },
            data: {
              raisedAmount: { decrement: donation.amount },
              donorCount: { decrement: 1 },
            },
          });
        }

        await tx.donation.delete({ where: { id: req.params.id } });
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "DONATION",
        donation.id,
        `Deleted donation: ${donation.donationNumber}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting donation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Donation Acknowledgment & Tax Receipts ----
  app.post("/api/donations/:id/acknowledge", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const donation = await prisma.donation.findUnique({
        where: { id: req.params.id },
        include: { donor: true },
      });

      if (!donation) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      if (donation.status !== 'RECEIVED' && donation.status !== 'PROCESSED') {
        res.status(400).json({ error: "Donation must be received before acknowledgment" });
        return;
      }

      // Update donation acknowledgment status
      const updatedDonation = await prisma.donation.update({
        where: { id: req.params.id },
        data: {
          acknowledgmentSent: true,
        },
      });

      // In a real implementation, you would send an email/letter here
      // For now, we'll just log it
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "ACKNOWLEDGE",
        "DONATION",
        donation.id,
        `Acknowledgment sent for donation: ${donation.donationNumber} to ${donation.donor.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({
        success: true,
        donation: updatedDonation,
        message: "Acknowledgment sent successfully",
        donor: {
          name: donation.donor.name,
          email: donation.donor.email,
          preferredContact: donation.donor.preferredContact,
        },
      });
    } catch (error) {
      logger.error("Error sending acknowledgment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/donations/:id/tax-receipt", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const donation = await prisma.donation.findUnique({
        where: { id: req.params.id },
        include: { donor: true },
      });

      if (!donation) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      if (!donation.isTaxDeductible) {
        res.status(400).json({ error: "This donation is not tax-deductible" });
        return;
      }

      if (donation.status !== 'PROCESSED') {
        res.status(400).json({ error: "Donation must be processed before issuing tax receipt" });
        return;
      }

      // Generate tax receipt number
      const year = new Date().getFullYear();
      const receiptCount = await prisma.donationReceipt.count({
        where: {
          receiptDate: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const receiptNumber = `TAX-${year}-${String(receiptCount + 1).padStart(4, '0')}`;

      // Create tax receipt
      const taxReceipt = await prisma.donationReceipt.create({
        data: {
          donationId: donation.id,
          receiptNumber,
          recipientName: donation.donor.name,
          recipientAddress: donation.donor.address,
          recipientEmail: donation.donor.email,
          amount: donation.amount,
          currency: donation.currency,
          isTaxDeductible: true,
          taxDeductibleAmount: donation.taxReceiptAmount || donation.amount,
          taxId: donation.donor.taxId,
        },
      });

      // Update donation to indicate tax receipt issued
      await prisma.donation.update({
        where: { id: req.params.id },
        data: { receiptNumber: taxReceipt.receiptNumber },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "ISSUE_TAX_RECEIPT",
        "DONATION",
        donation.id,
        `Tax receipt issued: ${taxReceipt.receiptNumber} for donation ${donation.donationNumber}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json({
        success: true,
        taxReceipt,
        donation: {
          id: donation.id,
          donationNumber: donation.donationNumber,
          amount: donation.amount,
          donor: donation.donor.name,
        },
        message: "Tax receipt issued successfully",
      });
    } catch (error) {
      logger.error("Error issuing tax receipt:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/donations/:id/tax-receipt", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const donation = await prisma.donation.findUnique({
        where: { id: req.params.id },
        include: {
          donor: true,
          receipt: true,
        },
      });

      if (!donation) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      if (!donation.receipt) {
        res.status(404).json({ error: "No tax receipt issued for this donation" });
        return;
      }

      res.json(donation.receipt);
    } catch (error) {
      logger.error("Error fetching tax receipt:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Campaigns ----
  app.get("/api/campaigns", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const { status, sortBy = "startDate", sortOrder = "desc" } = req.query;
      const where: any = {};
      if (status) where.status = { in: (status as string).split(',') };

      const campaigns = await prisma.donationCampaign.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: { _count: { select: { donations: true } }, donations: { take: 5, orderBy: { donationDate: 'desc' } } },
      });

      res.json(campaigns);
    } catch (err) {
      logger.error("Error fetching campaigns:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/campaigns", authMiddleware, validate(schemas.campaignCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const campaign = await prisma.donationCampaign.create({
        data: {
          ...req.body,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "CAMPAIGN",
        campaign.id,
        `Created campaign: ${campaign.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(campaign);
    } catch (err) {
      logger.error("Error creating campaign:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/campaigns/:id", authMiddleware, validate(schemas.campaignUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const campaign = await prisma.donationCampaign.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "CAMPAIGN",
        campaign.id,
        `Updated campaign: ${campaign.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(campaign);
    } catch (err) {
      logger.error("Error updating campaign:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Donor Management ----
  app.get("/api/donors", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { search, donorType, category, isActive } = req.query;
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { donorCode: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { organization: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (donorType) where.donorType = donorType;
      if (category) where.category = category;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const donors = await prisma.donor.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { donations: true } },
        },
      });
      res.json(donors);
    } catch (error) {
      logger.error("Error fetching donors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/donors/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const donor = await prisma.donor.findUnique({
        where: { id: req.params.id },
        include: {
          donations: {
            orderBy: { donationDate: 'desc' },
            take: 20,
            include: {
              campaign: {
                select: { name: true },
              },
            },
          },
        },
      });

      if (!donor) {
        res.status(404).json({ error: "Donor not found" });
        return;
      }

      // Calculate donor statistics
      const totalDonated = donor.donations.reduce((sum, d) => sum + d.amount, 0);
      const donationCount = donor.donations.length;
      const lastDonation = donor.donations[0];

      res.json({
        ...donor,
        statistics: {
          totalDonated,
          donationCount,
          lastDonationDate: lastDonation?.donationDate || null,
          averageDonation: donationCount > 0 ? totalDonated / donationCount : 0,
        },
      });
    } catch (error) {
      logger.error("Error fetching donor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/donors", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { name, email, phone, donorType, organization, ...rest } = req.body;

      // Generate donor code
      const year = new Date().getFullYear();
      const donorCount = await prisma.donor.count();
      const donorCode = `DONOR-${year}-${String(donorCount + 1).padStart(4, '0')}`;

      const donor = await prisma.donor.create({
        data: {
          name,
          email,
          phone,
          donorCode,
          donorType: donorType || 'INDIVIDUAL',
          organization,
          ...rest,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "DONOR",
        donor.id,
        `Created donor: ${donor.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(donor);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: "Donor with this code already exists" });
      } else {
        logger.error("Error creating donor:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.put("/api/donors/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { name, email, phone, donorType, organization, address, city, state, postalCode, country, notes, tags, isActive } = req.body;

      const donor = await prisma.donor.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(donorType !== undefined && { donorType }),
          ...(organization !== undefined && { organization }),
          ...(address !== undefined && { address }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(postalCode !== undefined && { postalCode }),
          ...(country !== undefined && { country }),
          ...(notes !== undefined && { notes }),
          ...(tags !== undefined && { tags }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "DONOR",
        donor.id,
        `Updated donor: ${donor.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(donor);
    } catch (error) {
      logger.error("Error updating donor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/donors/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!donationCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const donor = await prisma.donor.findUnique({
        where: { id: req.params.id },
      });

      if (!donor) {
        res.status(404).json({ error: "Donor not found" });
        return;
      }

      // Soft delete by setting isActive to false
      await prisma.donor.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "DONOR",
        donor.id,
        `Deleted donor: ${donor.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(204).send();
    } catch (error) {
      logger.error("Error deleting donor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Expense Management API ─────────────────────────────────────────────────────
  // Permission helpers
  const expenseCanManage = (role: string) => role === "ADMIN" || role === "ACCOUNTANT";
  const expenseCanView = (role: string) => ["ADMIN", "ACCOUNTANT", "STAFF"].includes(role);
  const expenseCanApprove = (role: string) => role === "ADMIN" || role === "ACCOUNTANT";

  // ---- Expenses ----
  app.get("/api/expenses", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const {
        page = "1",
        limit = "25",
        status,
        category,
        vendorId,
        budgetId,
        startDate,
        endDate,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNumber = Math.max(1, Number.parseInt(String(page), 10) || 1);
      const take = Math.min(100, Math.max(1, Number.parseInt(String(limit), 10) || 25));
      const skip = (pageNumber - 1) * take;
      const allowedSortFields = new Set(["createdAt", "updatedAt", "expenseDate", "dueDate", "title", "amount", "totalAmount", "status"]);
      const safeSortBy = allowedSortFields.has(String(sortBy)) ? String(sortBy) : "createdAt";
      const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

      const where: any = {};
      if (status) where.status = { in: (status as string).split(',') };
      if (category) where.category = { in: (category as string).split(',') };
      if (vendorId) where.vendorId = vendorId;
      if (budgetId) where.budgetId = budgetId;
      if (startDate) {
        const parsed = new Date(String(startDate));
        if (Number.isNaN(parsed.getTime())) { res.status(400).json({ error: "Invalid startDate" }); return; }
        where.expenseDate = { ...where.expenseDate, gte: parsed };
      }
      if (endDate) {
        const parsed = new Date(String(endDate));
        if (Number.isNaN(parsed.getTime())) { res.status(400).json({ error: "Invalid endDate" }); return; }
        parsed.setUTCHours(23, 59, 59, 999);
        where.expenseDate = { ...where.expenseDate, lte: parsed };
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { vendorInvoiceNo: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          skip,
          take,
          orderBy: { [safeSortBy]: safeSortOrder },
          include: {
            vendor: true,
            budget: true,
            payments: true,
          },
        }),
        prisma.expense.count({ where }),
      ]);

      // Calculate totals from gross invoice amounts and actual bill-payment
      // rows. The previous status-only summary omitted tax, treated a partial
      // payment as wholly unpaid, and counted rejected/cancelled expenses.
      const summaryExpenses = await prisma.expense.findMany({
        where,
        select: {
          amount: true,
          taxAmount: true,
          status: true,
          payments: { select: { amount: true } },
        },
      });
      const trackableExpenses = summaryExpenses.filter((expense) => !['REJECTED', 'CANCELLED'].includes(expense.status));
      const summaryData = {
        totalAmount: trackableExpenses.reduce((sum, expense) => sum + getExpenseGrossAmount(expense), 0),
        paidAmount: trackableExpenses.reduce(
          (sum, expense) => sum + expense.payments.reduce((paid, payment) => paid + payment.amount, 0),
          0,
        ),
        pendingAmount: trackableExpenses.reduce((sum, expense) => {
          const paid = expense.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0);
          return sum + Math.max(0, getExpenseGrossAmount(expense) - paid);
        }, 0),
      };

      res.json({
        data: expenses,
        pagination: {
          total,
          page: pageNumber,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
        summary: summaryData,
      });
    } catch (error) {
      logger.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/expenses/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const expense = await prisma.expense.findUnique({
        where: { id: req.params.id },
        include: {
          vendor: true,
          budget: true,
          payments: true,
        },
      });
      if (!expense) {
        res.status(404).json({ error: "Expense not found" });
        return;
      }
      res.json(expense);
    } catch (error) {
      logger.error("Error fetching expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/expenses", authMiddleware, validate(schemas.expenseCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const {
        amount,
        taxAmount = 0,
        ...rest
      } = req.body;

      const totalAmount = Number(amount) + Number(taxAmount);

      const expense = await prisma.expense.create({
        data: {
          ...rest,
          amount: Number(amount),
          taxAmount: Number(taxAmount),
          totalAmount,
          expenseDate: new Date(rest.expenseDate),
          dueDate: rest.dueDate ? new Date(rest.dueDate) : null,
        },
        include: {
          vendor: true,
          budget: true,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "EXPENSE",
        expense.id,
        `Created expense: ${expense.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(expense);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: "Vendor invoice number already exists" });
      } else {
        logger.error("Error creating expense:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.put("/api/expenses/:id", authMiddleware, validate(schemas.expenseUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
      if (!expense) {
        res.status(404).json({ error: "Expense not found" });
        return;
      }

      // Only allow editing DRAFT expenses
      if (expense.status !== "DRAFT") {
        res.status(400).json({ error: "Can only edit DRAFT expenses" });
        return;
      }

      const { amount, taxAmount, ...rest } = req.body;
      const nextAmount = amount !== undefined && amount !== null ? Number(amount) : expense.amount;
      const nextTaxAmount = taxAmount !== undefined ? Number(taxAmount ?? 0) : (expense.taxAmount ?? 0);
      const nextExpenseDate = rest.expenseDate ? new Date(rest.expenseDate) : expense.expenseDate;
      const nextDueDate = rest.dueDate !== undefined
        ? (rest.dueDate ? new Date(rest.dueDate) : null)
        : expense.dueDate;
      if (nextDueDate && nextDueDate < nextExpenseDate) {
        res.status(400).json({ error: "dueDate must be on or after expenseDate" });
        return;
      }

      const updated = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(taxAmount !== undefined && { taxAmount: Number(taxAmount ?? 0) }),
          totalAmount: nextAmount + nextTaxAmount,
          expenseDate: rest.expenseDate ? new Date(rest.expenseDate) : undefined,
          dueDate: rest.dueDate !== undefined ? nextDueDate : undefined,
        },
        include: { vendor: true, budget: true },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "EXPENSE",
        expense.id,
        `Updated expense: ${expense.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(updated);
    } catch (error) {
      logger.error("Error updating expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/expenses/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
      if (!expense) {
        res.status(404).json({ error: "Expense not found" });
        return;
      }

      // Only allow deleting DRAFT expenses
      if (expense.status !== "DRAFT") {
        res.status(400).json({ error: "Can only delete DRAFT expenses" });
        return;
      }

      await prisma.expense.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "EXPENSE",
        expense.id,
        `Deleted expense: ${expense.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Submit expense for approval
  app.post("/api/expenses/:id/submit", authMiddleware, validate(schemas.expenseSubmit), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Expense not found" }); return; }
      if (existing.status !== "DRAFT") {
        res.status(400).json({ error: "Only DRAFT expenses can be submitted" });
        return;
      }
      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          status: "PENDING_APPROVAL",
          submittedAt: new Date(),
          submittedById: jwtUser.userId,
          submittedByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "EXPENSE_SUBMITTED",
        "EXPENSE",
        expense.id,
        `Submitted expense for approval: ${expense.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(expense);
    } catch (error) {
      logger.error("Error submitting expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve expense
  app.post("/api/expenses/:id/approve", authMiddleware, validate(schemas.expenseApprove), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanApprove(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { notes } = req.body;
      const existing = await prisma.expense.findUnique({
        where: { id: req.params.id },
        include: { budget: true },
      });
      if (!existing) { res.status(404).json({ error: "Expense not found" }); return; }
      if (existing.status !== "PENDING_APPROVAL") {
        res.status(400).json({ error: "Only PENDING_APPROVAL expenses can be approved" });
        return;
      }
      if (existing.budget?.status === "ARCHIVED") {
        res.status(409).json({ error: "Cannot approve an expense against an archived budget" });
        return;
      }
      if (existing.budget?.strictLimit) {
        const committed = await prisma.expense.findMany({
          where: {
            budgetId: existing.budgetId!,
            id: { not: existing.id },
            status: { in: ["APPROVED", "PARTIAL", "PAID"] },
          },
          select: { amount: true, taxAmount: true },
        });
        const committedTotal = committed.reduce((sum, row) => sum + getExpenseGrossAmount(row), 0);
        const requestedTotal = getExpenseGrossAmount(existing);
        if (committedTotal + requestedTotal > existing.budget.allocatedAmount) {
          const remaining = Math.max(0, existing.budget.allocatedAmount - committedTotal);
          res.status(409).json({ error: `This strict budget has only ${remaining.toFixed(2)} remaining` });
          return;
        }
      }
      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: jwtUser.userId,
          approvedByName: jwtUser.email,
          notes: notes || undefined,
        },
      });

      await syncBudgetSpending(expense.budgetId);

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "EXPENSE_APPROVED",
        "EXPENSE",
        expense.id,
        `Approved expense: ${expense.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(expense);
    } catch (error) {
      logger.error("Error approving expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reject expense
  app.post("/api/expenses/:id/reject", authMiddleware, validate(schemas.expenseReject), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanApprove(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { reason } = req.body;
      const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Expense not found" }); return; }
      if (existing.status !== "PENDING_APPROVAL") {
        res.status(400).json({ error: "Only PENDING_APPROVAL expenses can be rejected" });
        return;
      }
      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          status: "REJECTED",
          approvedAt: new Date(),
          approvedById: jwtUser.userId,
          approvedByName: jwtUser.email,
          rejectionReason: reason,
        },
      });

      await syncBudgetSpending(expense.budgetId);

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "EXPENSE_REJECTED",
        "EXPENSE",
        expense.id,
        `Rejected expense: ${expense.title}. Reason: ${reason}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(expense);
    } catch (error) {
      logger.error("Error rejecting expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark expense as paid
  app.post("/api/expenses/:id/pay", authMiddleware, validate(schemas.expensePay), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const expense = await prisma.expense.findUnique({
        where: { id: req.params.id },
      });

      if (!expense) {
        res.status(404).json({ error: "Expense not found" });
        return;
      }

      if (expense.status !== "APPROVED") {
        res.status(400).json({ error: "Expense must be approved before payment" });
        return;
      }

      const {
        paymentMethod,
        paymentReference,
        bankAccount,
        paymentDate = new Date().toISOString(),
        receiptUrl,
        notes,
      } = req.body;

      const parsedPaymentDate = new Date(paymentDate);
      const paymentNumber = generatePaymentNumber(parsedPaymentDate);

      const [payment] = await prisma.$transaction([
        prisma.billPayment.create({
          data: {
            expenseId: expense.id,
            paymentNumber,
            amount: getExpenseGrossAmount(expense),
            currency: expense.currency,
            paymentMethod,
            paymentDate: parsedPaymentDate,
            referenceNumber: paymentReference,
            bankAccount,
            receiptUrl,
            notes,
            approvedById: jwtUser.userId,
            approvedByName: jwtUser.email,
            approvedAt: new Date(),
          },
        }),
        prisma.expense.update({
          where: { id: req.params.id },
          data: {
            status: "PAID",
            paidDate: parsedPaymentDate,
            paymentReference,
          },
        }),
      ]);

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "EXPENSE_PAID",
        "EXPENSE",
        expense.id,
        `Recorded payment for expense: ${expense.title}. Amount: ${getExpenseGrossAmount(expense)}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({
        expense: await prisma.expense.findUnique({
          where: { id: req.params.id },
          include: { vendor: true, budget: true, payments: true },
        }),
        payment,
      });
    } catch (error) {
      logger.error("Error processing payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Bill Payments ----
  app.get("/api/bill-payments", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { expenseId, paymentMethod, startDate, endDate } = req.query;
      const where: any = {};

      if (expenseId) where.expenseId = expenseId;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        where.paymentDate = {};
        if (startDate) where.paymentDate.gte = new Date(startDate as string);
        if (endDate) where.paymentDate.lte = new Date(endDate as string);
      }

      const payments = await prisma.billPayment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        include: {
          expense: {
            select: {
              id: true,
              title: true,
              category: true,
              vendorId: true,
            },
          },
        },
      });
      res.json(payments);
    } catch (error) {
      logger.error("Error fetching bill payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/bill-payments/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const payment = await prisma.billPayment.findUnique({
        where: { id: req.params.id },
        include: {
          expense: {
            include: {
              vendor: true,
            },
          },
        },
      });

      if (!payment) {
        res.status(404).json({ error: "Bill payment not found" });
        return;
      }

      res.json(payment);
    } catch (error) {
      logger.error("Error fetching bill payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/expenses/:id/payments", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const payments = await prisma.billPayment.findMany({
        where: { expenseId: req.params.id },
        orderBy: { paymentDate: 'desc' },
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      res.json({
        payments,
        summary: {
          totalPayments: payments.length,
          totalPaid,
          currency: payments[0]?.currency || 'MYR',
        },
      });
    } catch (error) {
      logger.error("Error fetching expense payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bill-payments", authMiddleware, validate(schemas.billPaymentCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { expenseId, amount, paymentMethod, paymentReference, bankAccount, paymentDate, receiptUrl, notes } = req.body;

      // Validate expense exists
      const expense = await prisma.expense.findUnique({
        where: { id: expenseId },
      });

      if (!expense) {
        res.status(404).json({ error: "Expense not found" });
        return;
      }

      if (!["APPROVED", "PARTIAL"].includes(expense.status)) {
        res.status(400).json({ error: "Expense must be approved before payment" });
        return;
      }

      const parsedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
      const paymentNumber = generatePaymentNumber(parsedPaymentDate);

      const existingPayments = await prisma.billPayment.findMany({ where: { expenseId } });
      const totalPaidBefore = existingPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalAmount = getExpenseGrossAmount(expense);
      const outstandingAmount = Math.max(0, totalAmount - totalPaidBefore);
      const paymentAmount = Number(amount);

      if (!paymentAmount || paymentAmount <= 0) {
        res.status(400).json({ error: "amount must be greater than 0" });
        return;
      }
      if (outstandingAmount <= 0) {
        res.status(400).json({ error: "Expense is already fully paid" });
        return;
      }
      if (paymentAmount > outstandingAmount) {
        res.status(400).json({ error: `Payment exceeds outstanding amount of ${outstandingAmount}` });
        return;
      }

      const payment = await prisma.billPayment.create({
        data: {
          expenseId,
          paymentNumber,
          amount: paymentAmount,
          currency: expense.currency,
          paymentMethod,
          referenceNumber: paymentReference,
          bankAccount,
          paymentDate: parsedPaymentDate,
          receiptUrl,
          notes,
        },
      });

      await syncExpensePaymentStatus(expenseId);

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "BILL_PAYMENT",
        payment.id,
        `Created bill payment: ${payment.paymentNumber} for expense ${expense.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(payment);
    } catch (error: any) {
      logger.error("Error creating bill payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/bill-payments/:id", authMiddleware, validate(schemas.billPaymentUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { amount, paymentMethod, paymentReference, bankAccount, paymentDate, receiptUrl, notes, approved } = req.body;

      const existing = await prisma.billPayment.findUnique({
        where: { id: req.params.id },
        include: { expense: { include: { payments: true } } },
      });
      if (!existing) { res.status(404).json({ error: "Bill payment not found" }); return; }

      const nextAmount = amount !== undefined ? Number(amount) : existing.amount;
      const paidByOthers = existing.expense.payments
        .filter((row) => row.id !== existing.id)
        .reduce((sum, row) => sum + row.amount, 0);
      const expenseTotal = getExpenseGrossAmount(existing.expense);
      if (paidByOthers + nextAmount > expenseTotal) {
        res.status(400).json({ error: `Payment exceeds the remaining amount of ${Math.max(0, expenseTotal - paidByOthers)}` });
        return;
      }

      const payment = await prisma.billPayment.update({
        where: { id: existing.id },
        data: {
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(paymentMethod !== undefined && { paymentMethod }),
          ...(paymentReference !== undefined && { referenceNumber: paymentReference }),
          ...(bankAccount !== undefined && { bankAccount }),
          ...(paymentDate !== undefined && { paymentDate: new Date(paymentDate) }),
          ...(receiptUrl !== undefined && { receiptUrl }),
          ...(notes !== undefined && { notes }),
          ...(approved !== undefined && {
            approvedById: jwtUser.userId,
            approvedByName: jwtUser.email,
            approvedAt: approved ? new Date() : null,
          }),
        },
      });
      await syncExpensePaymentStatus(payment.expenseId);

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "BILL_PAYMENT",
        payment.id,
        `Updated bill payment: ${payment.paymentNumber}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(payment);
    } catch (error) {
      logger.error("Error updating bill payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/bill-payments/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const payment = await prisma.billPayment.findUnique({
        where: { id: req.params.id },
      });

      if (!payment) {
        res.status(404).json({ error: "Bill payment not found" });
        return;
      }

      await prisma.billPayment.delete({
        where: { id: req.params.id },
      });

      await syncExpensePaymentStatus(payment.expenseId);

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "BILL_PAYMENT",
        payment.id,
        `Deleted bill payment: ${payment.paymentNumber}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(204).send();
    } catch (error) {
      logger.error("Error deleting bill payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Vendors ----
  app.get("/api/vendors", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { search, category, isActive } = req.query;
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (category) where.category = category;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const vendors = await prisma.vendor.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { expenses: true } },
        },
      });
      res.json(vendors);
    } catch (error) {
      logger.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/vendors", authMiddleware, validate(schemas.vendorCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { name, ...rest } = req.body;

      // Generate vendor code
      const year = new Date().getFullYear();
      const vendorCount = await prisma.vendor.count();
      const code = `VENDOR-${year}-${String(vendorCount + 1).padStart(4, '0')}`;

      const vendor = await prisma.vendor.create({
        data: {
          name,
          code,
          ...rest,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "VENDOR",
        vendor.id,
        `Created vendor: ${vendor.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(vendor);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: "Vendor with this code already exists" });
      } else {
        logger.error("Error creating vendor:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/vendors/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: req.params.id },
        include: {
          expenses: {
            orderBy: { expenseDate: 'desc' },
            take: 10,
          },
        },
      });
      if (!vendor) {
        res.status(404).json({ error: "Vendor not found" });
        return;
      }
      res.json(vendor);
    } catch (error) {
      logger.error("Error fetching vendor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/vendors/:id", authMiddleware, validate(schemas.vendorUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const vendor = await prisma.vendor.update({
        where: { id: req.params.id },
        data: req.body,
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "VENDOR",
        vendor.id,
        `Updated vendor: ${vendor.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(vendor);
    } catch (error) {
      logger.error("Error updating vendor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/vendors/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const expenseCount = await prisma.expense.count({ where: { vendorId: req.params.id } });
      if (expenseCount > 0) {
        res.status(409).json({ error: "Cannot delete vendor with associated expenses" });
        return;
      }

      await prisma.vendor.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "VENDOR",
        req.params.id,
        `Deleted vendor`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting vendor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Recurring Expenses ----
  app.get("/api/recurring-expenses", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const recurringExpenses = await prisma.recurringExpense.findMany({
        orderBy: { createdAt: 'desc' },
        include: { vendor: true },
      });
      res.json(recurringExpenses);
    } catch (error) {
      logger.error("Error fetching recurring expenses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/recurring-expenses", authMiddleware, validate(schemas.recurringExpenseCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { amount, taxAmount = 0, frequency, startDate, ...rest } = req.body;

      const totalAmount = Number(amount) + Number(taxAmount);

      // Calculate next occurrence date based on frequency
      const startDateObj = new Date(startDate);
      let nextOccurrenceDate = new Date(startDateObj);
      switch (frequency) {
        case "DAILY":
          nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 1);
          break;
        case "WEEKLY":
          nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 7);
          break;
        case "BI_WEEKLY":
          nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 14);
          break;
        case "MONTHLY":
          nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 3);
          break;
        case "SEMI_ANNUALLY":
          nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 6);
          break;
        case "ANNUALLY":
          nextOccurrenceDate.setFullYear(nextOccurrenceDate.getFullYear() + 1);
          break;
      }

      const recurringExpense = await prisma.recurringExpense.create({
        data: {
          ...rest,
          amount: Number(amount),
          taxAmount: Number(taxAmount),
          totalAmount,
          frequency,
          startDate: startDateObj,
          nextOccurrenceDate,
          status: "DRAFT",
        },
        include: { vendor: true },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "RECURRING_EXPENSE",
        recurringExpense.id,
        `Created recurring expense: ${recurringExpense.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(recurringExpense);
    } catch (error) {
      logger.error("Error creating recurring expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve a recurring expense so it becomes eligible for /generate.
  // Without this endpoint, every recurring expense was permanently stuck in its
  // default DRAFT status (nothing else in the app could move it to APPROVED),
  // making the whole recurring-expense-generation feature unreachable.
  app.post("/api/recurring-expenses/:id/approve", authMiddleware, validate(schemas.expenseApprove), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanApprove(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { notes } = req.body;
      const recurring = await prisma.recurringExpense.update({
        where: { id: req.params.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: jwtUser.userId,
          approvedByName: jwtUser.email,
          notes: notes || undefined,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "RECURRING_EXPENSE_APPROVED",
        "RECURRING_EXPENSE",
        recurring.id,
        `Approved recurring expense: ${recurring.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(recurring);
    } catch (error) {
      logger.error("Error approving recurring expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reject a recurring expense (e.g. sent back for revision instead of approved).
  app.post("/api/recurring-expenses/:id/reject", authMiddleware, validate(schemas.expenseReject), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanApprove(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { reason } = req.body;
      const recurring = await prisma.recurringExpense.update({
        where: { id: req.params.id },
        data: {
          status: "REJECTED",
          approvedAt: new Date(),
          approvedById: jwtUser.userId,
          approvedByName: jwtUser.email,
          notes: reason,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "RECURRING_EXPENSE_REJECTED",
        "RECURRING_EXPENSE",
        recurring.id,
        `Rejected recurring expense: ${recurring.title}. Reason: ${reason}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(recurring);
    } catch (error) {
      logger.error("Error rejecting recurring expense:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/recurring-expenses/:id/generate", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const recurring = await prisma.recurringExpense.findUnique({
        where: { id: req.params.id },
      });

      if (!recurring) {
        res.status(404).json({ error: "Recurring expense not found" });
        return;
      }

      if (recurring.status !== "APPROVED") {
        res.status(400).json({ error: "Recurring expense must be approved first" });
        return;
      }

      // Create expense instance
      const expense = await prisma.expense.create({
        data: {
          title: recurring.title,
          description: recurring.description,
          category: recurring.category,
          amount: recurring.amount,
          currency: recurring.currency,
          taxAmount: recurring.taxAmount,
          totalAmount: recurring.totalAmount,
          expenseDate: recurring.nextOccurrenceDate || new Date(),
          vendorId: recurring.vendorId,
          budgetId: recurring.budgetId,
          paymentMethod: recurring.paymentMethod,
          isRecurring: true,
          recurringExpenseId: recurring.id,
          status: "PENDING_APPROVAL",
        },
      });

      // Update recurring expense
      let nextOccurrenceDate = new Date(recurring.nextOccurrenceDate || recurring.startDate);
      switch (recurring.frequency) {
        case "DAILY":
          nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 1);
          break;
        case "WEEKLY":
          nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 7);
          break;
        case "BI_WEEKLY":
          nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 14);
          break;
        case "MONTHLY":
          nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 3);
          break;
        case "SEMI_ANNUALLY":
          nextOccurrenceDate.setMonth(nextOccurrenceDate.getMonth() + 6);
          break;
        case "ANNUALLY":
          nextOccurrenceDate.setFullYear(nextOccurrenceDate.getFullYear() + 1);
          break;
      }

      await prisma.recurringExpense.update({
        where: { id: req.params.id },
        data: {
          lastGeneratedDate: new Date(),
          totalGenerated: { increment: 1 },
          nextOccurrenceDate,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "GENERATE",
        "RECURRING_EXPENSE",
        recurring.id,
        `Generated expense instance from: ${recurring.title}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(expense);
    } catch (error) {
      logger.error("Error generating expense instance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Budgets ----
  app.get("/api/budgets", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { fiscalYear, status, departmentId } = req.query;
      const where: any = {};
      if (fiscalYear) {
        where.fiscalYear = resolveUtcReportRange(undefined, undefined, String(fiscalYear)).gte.getUTCFullYear();
      }
      if (status) where.status = status;
      if (departmentId) where.departmentId = departmentId;

      const budgets = await prisma.budget.findMany({
        where,
        orderBy: [{ fiscalYear: 'desc' }, { name: 'asc' }],
        include: {
          _count: { select: { expenses: true } },
        },
      });
      res.json(budgets);
    } catch (error) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      logger.error("Error fetching budgets:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/budgets", authMiddleware, validate(schemas.budgetCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { allocatedAmount, ...rest } = req.body;

      // Generate budget code
      const year = new Date().getFullYear();
      const budgetCount = await prisma.budget.count({ where: { fiscalYear: parseInt(rest.fiscalYear) || year } });
      const code = `BUDGET-${rest.fiscalYear || year}-${String(budgetCount + 1).padStart(2, '0')}`;

      const budget = await prisma.budget.create({
        data: {
          ...rest,
          code: rest.code?.trim() || code,
          allocatedAmount: Number(allocatedAmount),
          remainingAmount: Number(allocatedAmount),
          approvedById: jwtUser.userId,
          approvedByName: jwtUser.email,
          approvedAt: new Date(),
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "BUDGET",
        budget.id,
        `Created budget: ${budget.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(budget);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: "Budget with this code already exists" });
      } else {
        logger.error("Error creating budget:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/budgets/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const budget = await prisma.budget.findUnique({
        where: { id: req.params.id },
        include: {
          expenses: {
            orderBy: { expenseDate: 'desc' },
            take: 20,
          },
        },
      });
      if (!budget) {
        res.status(404).json({ error: "Budget not found" });
        return;
      }
      res.json(budget);
    } catch (error) {
      logger.error("Error fetching budget:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/budgets/:id", authMiddleware, validate(schemas.budgetUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const existing = await prisma.budget.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404).json({ error: "Budget not found" });
        return;
      }

      const { allocatedAmount, status, ...rest } = req.body;
      const data: any = { ...rest };
      const nextAllocated = allocatedAmount !== undefined ? Number(allocatedAmount) : existing.allocatedAmount;
      const nextStart = rest.startDate ? new Date(rest.startDate) : existing.startDate;
      const nextEnd = rest.endDate ? new Date(rest.endDate) : existing.endDate;
      if (nextEnd < nextStart) {
        res.status(400).json({ error: "endDate must be on or after startDate" });
        return;
      }

      if (allocatedAmount !== undefined) {
        data.allocatedAmount = nextAllocated;
      }
      data.remainingAmount = nextAllocated - existing.spentAmount;
      // EXHAUSTED and EXCEEDED are calculated from linked expenses. Only
      // archiving/unarchiving is a manual status decision.
      if (status === "ARCHIVED") data.status = "ARCHIVED";
      else if (status === "ACTIVE" && existing.status === "ARCHIVED") data.status = "ACTIVE";

      await prisma.budget.update({
        where: { id: req.params.id },
        data,
      });
      await syncBudgetSpending(existing.id);
      const budget = await prisma.budget.findUniqueOrThrow({ where: { id: existing.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "BUDGET",
        budget.id,
        `Updated budget: ${budget.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(budget);
    } catch (error) {
      logger.error("Error updating budget:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete budget
  app.delete("/api/budgets/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const expenseCount = await prisma.expense.count({ where: { budgetId: req.params.id } });
      if (expenseCount > 0) {
        res.status(409).json({ error: "Cannot delete budget with associated expenses" });
        return;
      }

      await prisma.budget.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "BUDGET",
        req.params.id,
        `Deleted budget`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting budget:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── HR / Payroll / Leave API ─────────────────────────────────────────────────
  // Admin manages everything; ACCOUNTANT may view/manage payroll. Writes are
  // guarded inline so we can allow more than one role where appropriate.
  const hrCanManage = (role: string) => role === "ADMIN";
  const payrollCanManage = (role: string) => role === "ADMIN" || role === "ACCOUNTANT";

  const toUtcDay = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  // Inclusive whole-day count between two calendar dates. UTC normalization
  // avoids 23/25-hour DST days changing an employee's charged leave.
  function countLeaveDays(start: Date, end: Date): number {
    const ms = toUtcDay(end) - toUtcDay(start);
    if (Number.isNaN(ms) || ms < 0) return 0;
    return Math.floor(ms / 86_400_000) + 1;
  }

  function countLeaveDaysInRange(start: Date, end: Date, rangeStart: Date, rangeEndExclusive: Date): number {
    const overlapStart = Math.max(toUtcDay(start), toUtcDay(rangeStart));
    const overlapEnd = Math.min(toUtcDay(end), toUtcDay(rangeEndExclusive) - 86_400_000);
    return overlapEnd < overlapStart ? 0 : Math.floor((overlapEnd - overlapStart) / 86_400_000) + 1;
  }

  async function validateEmployeeAssignment(departmentId?: string | null, designationId?: string | null): Promise<string | null> {
    if (departmentId) {
      const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
      if (!department) return "Department not found";
    }
    if (designationId) {
      const designation = await prisma.designation.findUnique({ where: { id: designationId } });
      if (!designation) return "Designation not found";
      if (designation.departmentId && designation.departmentId !== departmentId) {
        return "Designation does not belong to the selected department";
      }
    }
    return null;
  }

  // ---- Financial Reports ----
  app.get("/api/financial-reports/summary", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate, fiscalYear, year: yearParam } = req.query;

      // Determine date range (accept both `fiscalYear` and `year` for the year shortcut)
      const dateFilter = resolveUtcReportRange(
        startDate as string | undefined,
        endDate as string | undefined,
        (fiscalYear || yearParam) as string | undefined
      );

      // Count dated cash receipts rather than FeePayment.paidAmount. A fee
      // charge can be paid in several months; its paidAmount is cumulative
      // and paidDate only represents the latest receipt.
      const feeCollections = await prisma.feeCollection.aggregate({
        where: {
          paymentDate: dateFilter,
          feePayment: { status: { not: 'WAIVED' } },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get donations (income)
      const donations = await prisma.donation.aggregate({
        where: {
          donationDate: dateFilter,
          status: { in: ['RECEIVED', 'PROCESSED'] },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get actual cash outflows from bill payments, not invoice dates. A
      // PARTIAL expense may only have some money paid out, and an APPROVED
      // expense may have none.
      const billPayments = await prisma.billPayment.aggregate({
        where: {
          paymentDate: dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get budget summary — a budget belongs to the period if its window
      // overlaps it (starts before the period ends AND ends after it starts).
      // The old OR filter missed budgets that span the entire period.
      const budgets = await prisma.budget.findMany({
        where: {
          startDate: { lte: dateFilter.lte },
          endDate: { gte: dateFilter.gte },
        },
      });

      const totalBudget = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
      const totalBudgetSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);

      // Get outstanding fees. Includes PARTIAL charges, and nets out
      // paidAmount so the outstanding figure is the real remaining balance
      // (for PENDING/OVERDUE, paidAmount is 0, so this is unchanged there).
      const outstandingFees = await prisma.feePayment.findMany({
        where: {
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
          dueDate: dateFilter,
        },
        select: { amount: true, paidAmount: true },
      });
      const outstandingBalance = sumOutstandingFeeBalance(outstandingFees);

      // Pending commitments belong to the selected reporting period and use
      // gross invoice value so tax is not silently omitted.
      const pendingExpenses = await prisma.expense.findMany({
        where: {
          status: { in: ['DRAFT', 'PENDING_APPROVAL'] },
          expenseDate: dateFilter,
        },
        select: { amount: true, taxAmount: true },
      });

      const totalIncome = (feeCollections._sum.amount || 0) + (donations._sum.amount || 0);
      const totalExpenses = billPayments._sum.amount || 0;
      const netCashFlow = totalIncome - totalExpenses;

      res.json({
        period: {
          startDate: dateFilter.gte,
          endDate: dateFilter.lte,
        },
        income: {
          total: totalIncome,
          fees: feeCollections._sum.amount || 0,
          donations: donations._sum.amount || 0,
          feePayments: feeCollections._count,
          donationCount: donations._count,
        },
        expenses: {
          total: totalExpenses,
          paidExpenses: billPayments._count,
          pendingAmount: sumExpenseGrossAmounts(pendingExpenses),
          pendingCount: pendingExpenses.length,
        },
        budget: {
          total: totalBudget,
          spent: totalBudgetSpent,
          remaining: totalBudget - totalBudgetSpent,
          utilization: totalBudget > 0 ? (totalBudgetSpent / totalBudget) * 100 : 0,
        },
        cashFlow: {
          net: netCashFlow,
          positive: netCashFlow >= 0,
        },
        accountsReceivable: {
          outstanding: outstandingBalance,
          count: outstandingFees.length,
        },
      });
    } catch (error: any) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error?.code === "P2007" || error?.code === "P2021" || error?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error generating financial summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/financial-reports/income-expense", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate, groupBy = 'month' } = req.query;

      const dateFilter = resolveUtcReportRange(
        startDate as string | undefined,
        endDate as string | undefined
      );

      const donationsByPeriod = await prisma.donation.groupBy({
        by: groupBy === 'month' ? ['donationDate'] : ['donationDate'],
        where: {
          donationDate: dateFilter,
          status: { in: ['RECEIVED', 'PROCESSED'] },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get actual expense cash movements by bill payment. This keeps
      // partial payments from being reported as if the full invoice was paid.
      const billPaymentDetails = await prisma.billPayment.findMany({
        where: {
          paymentDate: dateFilter,
        },
        select: {
          amount: true,
          paymentDate: true,
          referenceNumber: true,
          paymentMethod: true,
          expense: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              vendorInvoiceNo: true,
              vendor: { select: { name: true } },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      });
      const expensesByCategory = Array.from(
        billPaymentDetails.reduce((map, payment) => {
          const category = payment.expense.category;
          const current = map.get(category) || { category, amount: 0, count: 0 };
          current.amount += payment.amount;
          current.count += 1;
          map.set(category, current);
          return map;
        }, new Map<string, { category: string; amount: number; count: number }>()).values()
      ).map((entry) => ({
        category: entry.category,
        _sum: { amount: entry.amount },
        _count: entry.count,
      }));

      // Line-item detail behind the aggregates above -- the report used to
      // only show totals by source/category, which isn't enough to actually
      // audit a period; these feed the "detailed" transaction tables in the
      // Income & Expense Report.
      const [feeCollectionDetails, donationDetails, expenseDetails] = await Promise.all([
        prisma.feeCollection.findMany({
          where: { paymentDate: dateFilter, feePayment: { status: { not: 'WAIVED' } } },
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            reference: true,
            feePayment: {
              select: {
                receiptNumber: true,
                student: {
                  select: {
                    studentCode: true,
                    preferredName: true,
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        }),
        prisma.donation.findMany({
          where: { donationDate: dateFilter, status: { in: ['RECEIVED', 'PROCESSED'] } },
          select: {
            id: true,
            amount: true,
            donationDate: true,
            donationNumber: true,
            paymentMethod: true,
            donor: { select: { name: true, donorCode: true } },
            campaign: { select: { name: true } },
          },
          orderBy: { donationDate: 'desc' },
        }),
        Promise.resolve(billPaymentDetails),
      ]);

      const studentLabel = (s: (typeof feeCollectionDetails)[number]['feePayment']['student']) =>
        s.preferredName || (s.user ? `${s.user.firstName} ${s.user.lastName}` : s.studentCode);

      const incomeDetail = [
        ...feeCollectionDetails.map((p) => ({
          date: p.paymentDate,
          type: 'Fee Payment' as const,
          description: `Fee payment — ${studentLabel(p.feePayment.student)}`,
          reference: p.reference || p.feePayment.receiptNumber || null,
          paymentMethod: p.paymentMethod || null,
          amount: p.amount,
        })),
        ...donationDetails.map((d) => ({
          date: d.donationDate,
          type: 'Donation' as const,
          description: `Donation — ${d.donor.name}${d.campaign ? ` (${d.campaign.name})` : ''}`,
          reference: d.donationNumber,
          paymentMethod: d.paymentMethod || null,
          amount: d.amount,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const expenseDetail = expenseDetails.map((payment) => ({
        date: payment.paymentDate,
        title: payment.expense.title,
        category: payment.expense.category,
        status: payment.expense.status,
        vendor: payment.expense.vendor?.name || null,
        reference: payment.referenceNumber || payment.expense.vendorInvoiceNo || null,
        amount: payment.amount,
      }));

      // Calculate totals
      const feeIncome = feeCollectionDetails.reduce((sum, payment) => sum + payment.amount, 0);
      const totalIncome = (feeIncome +
                           donationsByPeriod.reduce((sum, p) => sum + (p._sum.amount || 0), 0));
      const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + (cat._sum.amount || 0), 0);
      const netSurplus = totalIncome - totalExpenses;

      res.json({
        period: {
          startDate: dateFilter.gte,
          endDate: dateFilter.lte,
          groupBy,
        },
        income: {
          total: totalIncome,
          bySource: {
            fees: feeIncome,
            donations: donationsByPeriod.reduce((sum, p) => sum + (p._sum.amount || 0), 0),
          },
          detail: incomeDetail,
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory.map(cat => ({
            category: cat.category,
            amount: cat._sum.amount || 0,
            count: cat._count,
            percentage: totalExpenses > 0 ? ((cat._sum.amount || 0) / totalExpenses) * 100 : 0,
          })),
          detail: expenseDetail,
        },
        summary: {
          netSurplus,
          surplusRatio: totalIncome > 0 ? (netSurplus / totalIncome) * 100 : 0,
        },
      });
    } catch (error: any) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error?.code === "P2007" || error?.code === "P2021" || error?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error generating income-expense report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/financial-reports/budget-vs-actual", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { budgetId, fiscalYear } = req.query;

      let where: any = {};
      if (budgetId) {
        where.id = budgetId;
      } else if (fiscalYear) {
        where.fiscalYear = resolveUtcReportRange(undefined, undefined, String(fiscalYear)).gte.getUTCFullYear();
      } else {
        // Default to current year budgets
        where.fiscalYear = new Date().getFullYear();
      }

      const budgets = await prisma.budget.findMany({
        where,
        include: {
          expenses: {
            where: { status: { in: ['APPROVED', 'PAID', 'PARTIAL'] } },
          },
          feeItems: true,
        },
      });

      const budgetComparison = budgets.map(budget => {
        const actualExpenses = sumExpenseGrossAmounts(budget.expenses);
        const variance = budget.allocatedAmount - actualExpenses;
        const variancePercent = budget.allocatedAmount > 0 ? (variance / budget.allocatedAmount) * 100 : 0;

        return {
          id: budget.id,
          name: budget.name,
          code: budget.code,
          category: budget.category,
          fiscalYear: budget.fiscalYear,
          budget: {
            allocated: budget.allocatedAmount,
            spent: budget.spentAmount,
            remaining: budget.remainingAmount,
          },
          actual: {
            expenses: actualExpenses,
          },
          variance: {
            amount: variance,
            percentage: variancePercent,
            favorable: variance >= 0,
          },
          status: budget.status,
          utilization: budget.allocatedAmount > 0 ? (actualExpenses / budget.allocatedAmount) * 100 : 0,
        };
      });

      const totals = budgetComparison.reduce((acc, budget) => ({
        allocated: acc.allocated + budget.budget.allocated,
        spent: acc.spent + budget.budget.spent,
        actualExpenses: acc.actualExpenses + budget.actual.expenses,
        variance: acc.variance + budget.variance.amount,
      }), { allocated: 0, spent: 0, actualExpenses: 0, variance: 0 });

      res.json({
        budgets: budgetComparison,
        summary: {
          totalAllocated: totals.allocated,
          totalSpent: totals.spent,
          totalActualExpenses: totals.actualExpenses,
          totalVariance: totals.variance,
          overallUtilization: totals.allocated > 0 ? (totals.actualExpenses / totals.allocated) * 100 : 0,
        },
      });
    } catch (error: any) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error?.code === "P2007" || error?.code === "P2021" || error?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error generating budget vs actual report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/financial-reports/cash-flow", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate } = req.query;

      const dateFilter = resolveUtcReportRange(
        startDate as string | undefined,
        endDate as string | undefined
      );

      // Cash inflows
      const feeInflows = await prisma.feeCollection.findMany({
        where: {
          paymentDate: dateFilter,
          feePayment: { status: { not: 'WAIVED' } },
        },
        select: {
          paymentDate: true,
          amount: true,
          paymentMethod: true,
        },
      });

      const donationInflows = await prisma.donation.findMany({
        where: {
          donationDate: dateFilter,
          status: { in: ['RECEIVED', 'PROCESSED'] },
        },
        select: {
          donationDate: true,
          amount: true,
          paymentMethod: true,
        },
      });

      // Cash outflows are actual bill payments. Using expenseDate/amount here
      // overstated partial payments and placed cash movement in the wrong month.
      const expenseOutflows = await prisma.billPayment.findMany({
        where: {
          paymentDate: dateFilter,
        },
        select: {
          paymentDate: true,
          amount: true,
          expense: { select: { category: true } },
          paymentMethod: true,
        },
      });

      // Use the UTC year of the range start. The old code did
      // `new Date(dateFilter.gte).setMonth(i)` which (a) shifted to the
      // previous year in negative-UTC-offset timezones ("2026-01-01" parses to
      // Dec 31 local) and (b) skipped months via day-of-month overflow when the
      // start day was the 29th–31st.
      const reportYear = dateFilter.gte.getUTCFullYear();
      const monthlyCashFlow = buildMonthlyFinanceRows(reportYear, feeInflows, donationInflows, expenseOutflows);

      const totalInflow = feeInflows.reduce((sum, f) => sum + f.amount, 0) +
                         donationInflows.reduce((sum, d) => sum + d.amount, 0);
      const totalOutflow = expenseOutflows.reduce((sum, e) => sum + e.amount, 0);
      const netCashFlow = totalInflow - totalOutflow;

      res.json({
        period: {
          startDate: dateFilter.gte,
          endDate: dateFilter.lte,
        },
        monthlyCashFlow,
        summary: {
          totalInflow,
          totalOutflow,
          netCashFlow,
          averageMonthlyFlow: netCashFlow / 12,
          endingBalance: monthlyCashFlow.length > 0 ?
            monthlyCashFlow[monthlyCashFlow.length - 1].cumulative : 0,
        },
      });
    } catch (error: any) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error?.code === "P2007" || error?.code === "P2021" || error?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error generating cash flow report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Student Duty System API ──────────────────────────────────────────────────
  // Permission helpers
  const dutyCanManage = (role: string) => role === "ADMIN" || role === "STAFF";
  const dutyCanView = (role: string) => ["ADMIN", "STAFF", "TEACHER"].includes(role);

  // ---- Duty Definitions ----
  app.get("/api/duty-definitions", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanView(jwtUser.role) && jwtUser.role !== "STUDENT") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { type, isActive } = req.query;
      const where: any = {};
      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive === "true";

      const definitions = await prisma.dutyDefinition.findMany({
        where,
        orderBy: { name: "asc" },
        include: { _count: { select: { assignments: true } } },
      });
      res.json(definitions);
    } catch (error) {
      logger.error("Error fetching duty definitions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/duty-definitions", authMiddleware, validate(schemas.dutyDefinitionCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const count = await prisma.dutyDefinition.count();
      const code = `DUTY-${String(count + 1).padStart(3, "0")}`;

      const definition = await prisma.dutyDefinition.create({
        data: {
          ...req.body,
          code,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "DUTY_DEFINITION",
        definition.id,
        `Created duty definition: ${definition.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(definition);
    } catch (error) {
      logger.error("Error creating duty definition:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/duty-definitions/:id", authMiddleware, validate(schemas.dutyDefinitionUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const definition = await prisma.dutyDefinition.update({
        where: { id: req.params.id },
        data: req.body,
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "DUTY_DEFINITION",
        definition.id,
        `Updated duty definition: ${definition.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(definition);
    } catch (error) {
      logger.error("Error updating duty definition:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/duty-definitions/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const assignmentCount = await prisma.dutyAssignment.count({ where: { dutyDefinitionId: req.params.id } });
      if (assignmentCount > 0) {
        // Duty has history -- deactivate instead of hard-deleting so past
        // assignments keep a valid reference.
        const definition = await prisma.dutyDefinition.update({
          where: { id: req.params.id },
          data: { isActive: false },
        });
        res.json(definition);
        return;
      }

      await prisma.dutyDefinition.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "DUTY_DEFINITION",
        req.params.id,
        `Deleted duty definition`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting duty definition:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Duty Rosters ----
  app.get("/api/duty-rosters", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { status } = req.query;
      const where: any = {};
      if (status) where.status = { in: (status as string).split(",") };

      const rosters = await prisma.dutyRoster.findMany({
        where,
        orderBy: { startDate: "desc" },
        include: { _count: { select: { assignments: true } } },
      });
      res.json(rosters);
    } catch (error) {
      logger.error("Error fetching duty rosters:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/duty-rosters", authMiddleware, validate(schemas.dutyRosterCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate, ...rest } = req.body;
      const roster = await prisma.dutyRoster.create({
        data: {
          ...rest,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "DUTY_ROSTER",
        roster.id,
        `Created duty roster: ${roster.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(roster);
    } catch (error) {
      logger.error("Error creating duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/duty-rosters/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanView(jwtUser.role) && jwtUser.role !== "STUDENT") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const roster = await prisma.dutyRoster.findUnique({
        where: { id: req.params.id },
        include: {
          assignments: {
            orderBy: { scheduledDate: "asc" },
            include: {
              dutyDefinition: true,
              student: { select: { id: true, studentCode: true, preferredName: true, user: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
      });

      if (!roster) {
        res.status(404).json({ error: "Duty roster not found" });
        return;
      }

      res.json(roster);
    } catch (error) {
      logger.error("Error fetching duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/duty-rosters/:id", authMiddleware, validate(schemas.dutyRosterUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate, ...rest } = req.body;
      const roster = await prisma.dutyRoster.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: new Date(endDate) }),
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "DUTY_ROSTER",
        roster.id,
        `Updated duty roster: ${roster.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(roster);
    } catch (error) {
      logger.error("Error updating duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/duty-rosters/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const roster = await prisma.dutyRoster.findUnique({ where: { id: req.params.id } });
      if (!roster) {
        res.status(404).json({ error: "Duty roster not found" });
        return;
      }
      if (roster.status !== "DRAFT") {
        res.status(400).json({ error: "Only DRAFT rosters can be deleted -- archive it instead" });
        return;
      }

      await prisma.dutyRoster.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "DUTY_ROSTER",
        req.params.id,
        `Deleted duty roster: ${roster.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Publish a roster so students can see their assignments.
  app.post("/api/duty-rosters/:id/publish", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const roster = await prisma.dutyRoster.findUnique({ where: { id: req.params.id } });
      if (!roster) {
        res.status(404).json({ error: "Duty roster not found" });
        return;
      }

      const assignmentCount = await prisma.dutyAssignment.count({ where: { rosterId: req.params.id } });
      if (assignmentCount === 0) {
        res.status(400).json({ error: "Cannot publish a roster with no assignments -- add assignments or auto-assign first" });
        return;
      }

      const updated = await prisma.dutyRoster.update({
        where: { id: req.params.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedById: jwtUser.userId,
          publishedByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DUTY_ROSTER_PUBLISHED",
        "DUTY_ROSTER",
        updated.id,
        `Published duty roster: ${updated.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(updated);
    } catch (error) {
      logger.error("Error publishing duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Auto-assign: fairly distribute the roster's duties across the selected
  // students for every day in [startDate, endDate]. Fairness rules:
  //  - a student is never double-booked on the same calendar day
  //  - a student never exceeds roster.maxWeeklyDuties within any 7-day
  //    window measured from the roster's startDate
  //  - among eligible students for a slot, whoever has the fewest duties
  //    assigned so far in this run is picked first (ties broken by a
  //    shuffled order so the same student doesn't always win ties)
  // This is a straightforward greedy fair-rotation, not a full constraint
  // solver -- if the numbers don't work out (too many duties, too few
  // students, cap too low) some slots are simply left unfilled and reported
  // back so a human can fill the rest manually.
  app.post("/api/duty-rosters/:id/auto-assign", authMiddleware, validate(schemas.dutyAutoAssign), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const roster = await prisma.dutyRoster.findUnique({ where: { id: req.params.id } });
      if (!roster) {
        res.status(404).json({ error: "Duty roster not found" });
        return;
      }
      if (roster.status !== "DRAFT") {
        res.status(400).json({ error: "Can only auto-assign a DRAFT roster" });
        return;
      }

      const { studentIds, dutyDefinitionIds } = req.body as { studentIds: string[]; dutyDefinitionIds: string[] };

      const definitions = await prisma.dutyDefinition.findMany({
        where: { id: { in: dutyDefinitionIds }, isActive: true },
      });
      if (definitions.length === 0) {
        res.status(400).json({ error: "No active duty definitions found for the given IDs" });
        return;
      }

      const students = await prisma.student.findMany({ where: { id: { in: studentIds } } });
      if (students.length === 0) {
        res.status(400).json({ error: "No students found for the given IDs" });
        return;
      }

      // Days in the roster's range, inclusive.
      const days: Date[] = [];
      const cursor = new Date(roster.startDate);
      const end = new Date(roster.endDate);
      while (cursor <= end) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      const totalAssignedCount = new Map<string, number>(students.map((s) => [s.id, 0]));
      const weekBucketCount = new Map<string, number>(); // key: `${studentId}_${weekIndex}`
      const dayAssigned = new Map<string, Set<string>>(); // key: dateKey -> Set<studentId>

      const weekIndexOf = (date: Date) =>
        Math.floor((date.getTime() - roster.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

      const toCreate: { rosterId: string; dutyDefinitionId: string; studentId: string; scheduledDate: Date }[] = [];
      const unfilled: { dutyDefinitionId: string; date: string; missing: number }[] = [];

      for (const day of days) {
        const dateKey = day.toISOString().split("T")[0];
        const weekIdx = weekIndexOf(day);
        if (!dayAssigned.has(dateKey)) dayAssigned.set(dateKey, new Set());

        for (const definition of definitions) {
          let stillNeeded = definition.requiredStudents;

          // Rank students by fewest assignments so far, shuffling ties so
          // the same student doesn't always win.
          const shuffled = [...students].sort(() => Math.random() - 0.5);
          const ranked = shuffled.sort(
            (a, b) => (totalAssignedCount.get(a.id) || 0) - (totalAssignedCount.get(b.id) || 0)
          );

          for (const student of ranked) {
            if (stillNeeded <= 0) break;

            const alreadyToday = dayAssigned.get(dateKey)!.has(student.id);
            const weekKey = `${student.id}_${weekIdx}`;
            const weekCount = weekBucketCount.get(weekKey) || 0;
            if (alreadyToday || weekCount >= roster.maxWeeklyDuties) continue;

            toCreate.push({
              rosterId: roster.id,
              dutyDefinitionId: definition.id,
              studentId: student.id,
              scheduledDate: day,
            });
            dayAssigned.get(dateKey)!.add(student.id);
            weekBucketCount.set(weekKey, weekCount + 1);
            totalAssignedCount.set(student.id, (totalAssignedCount.get(student.id) || 0) + 1);
            stillNeeded -= 1;
          }

          if (stillNeeded > 0) {
            unfilled.push({ dutyDefinitionId: definition.id, date: dateKey, missing: stillNeeded });
          }
        }
      }

      if (toCreate.length > 0) {
        await prisma.dutyAssignment.createMany({ data: toCreate });
      }

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DUTY_ROSTER_AUTO_ASSIGNED",
        "DUTY_ROSTER",
        roster.id,
        `Auto-assigned ${toCreate.length} duty slots for roster: ${roster.name}${unfilled.length > 0 ? ` (${unfilled.length} slots left unfilled)` : ""}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({
        created: toCreate.length,
        unfilled,
        assignmentsPerStudent: Object.fromEntries(totalAssignedCount),
      });
    } catch (error) {
      logger.error("Error auto-assigning duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Duty Assignments ----
  app.get("/api/duty-assignments", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const { rosterId, studentId, status, startDate, endDate } = req.query;
      const where: any = {};

      if (jwtUser.role === "STUDENT") {
        // Students may only ever see their own assignments, regardless of
        // what studentId they pass.
        const me = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!me) {
          res.status(404).json({ error: "Student profile not found" });
          return;
        }
        where.studentId = me.id;
      } else if (!dutyCanView(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      } else if (studentId) {
        where.studentId = studentId;
      }

      if (rosterId) where.rosterId = rosterId;
      if (status) where.status = { in: (status as string).split(",") };
      if (startDate || endDate) {
        where.scheduledDate = {};
        if (startDate) where.scheduledDate.gte = new Date(startDate as string);
        if (endDate) where.scheduledDate.lte = new Date(endDate as string);
      }

      const assignments = await prisma.dutyAssignment.findMany({
        where,
        orderBy: { scheduledDate: "asc" },
        include: {
          dutyDefinition: true,
          roster: { select: { id: true, name: true, status: true } },
          student: { select: { id: true, studentCode: true, preferredName: true, user: { select: { firstName: true, lastName: true } } } },
        },
      });
      res.json(assignments);
    } catch (error) {
      logger.error("Error fetching duty assignments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/duty-assignments", authMiddleware, validate(schemas.dutyAssignmentCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { scheduledDate, ...rest } = req.body;
      const assignment = await prisma.dutyAssignment.create({
        data: {
          ...rest,
          scheduledDate: new Date(scheduledDate),
        },
        include: { dutyDefinition: true, student: true },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "DUTY_ASSIGNMENT",
        assignment.id,
        `Assigned ${assignment.dutyDefinition.name} to student ${assignment.studentId}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(assignment);
    } catch (error) {
      logger.error("Error creating duty assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update status/rating -- staff/admin can update any assignment; a student
  // may only move their own assignment between ASSIGNED/IN_PROGRESS/COMPLETED
  // (they can't excuse, skip, fail, or rate themselves).
  app.put("/api/duty-assignments/:id", authMiddleware, validate(schemas.dutyAssignmentUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const existing = await prisma.dutyAssignment.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404).json({ error: "Duty assignment not found" });
        return;
      }

      const isManager = dutyCanManage(jwtUser.role);
      if (!isManager) {
        if (jwtUser.role !== "STUDENT") {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        const me = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!me || me.id !== existing.studentId) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        const allowedSelfStatuses = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];
        if (req.body.status && !allowedSelfStatuses.includes(req.body.status)) {
          res.status(403).json({ error: "Students can only mark a duty in progress or completed" });
          return;
        }
        if (req.body.rating !== undefined) {
          res.status(403).json({ error: "Students cannot rate their own duty" });
          return;
        }
      }

      const { status, rating, scheduledDate, ...rest } = req.body;
      const data: any = { ...rest };
      if (status !== undefined) {
        data.status = status;
        if (status === "COMPLETED") {
          data.completedAt = new Date();
          if (data.pointsEarned === undefined) {
            const definition = await prisma.dutyDefinition.findUnique({ where: { id: existing.dutyDefinitionId } });
            data.pointsEarned = definition?.pointsAwarded ?? 0;
          }
        }
      }
      if (rating !== undefined) {
        data.rating = rating;
        data.ratedById = jwtUser.userId;
        data.ratedByName = jwtUser.email;
      }
      if (scheduledDate !== undefined) data.scheduledDate = new Date(scheduledDate);

      const assignment = await prisma.dutyAssignment.update({
        where: { id: req.params.id },
        data,
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "DUTY_ASSIGNMENT",
        assignment.id,
        `Updated duty assignment${status ? ` -> ${status}` : ""}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(assignment);
    } catch (error) {
      logger.error("Error updating duty assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/duty-assignments/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      await prisma.dutyAssignment.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "DUTY_ASSIGNMENT",
        req.params.id,
        `Deleted duty assignment`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting duty assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Duty Performance (computed live -- see schema.prisma note) ----
  app.get("/api/duty-performance/:studentId", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      let targetStudentId = req.params.studentId;
      if (jwtUser.role === "STUDENT") {
        const me = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!me || me.id !== targetStudentId) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      } else if (!dutyCanView(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const assignments = await prisma.dutyAssignment.findMany({
        where: { studentId: targetStudentId },
        orderBy: { scheduledDate: "desc" },
        include: { dutyDefinition: true, roster: { select: { id: true, name: true } } },
      });

      const totalAssigned = assignments.length;
      const totalCompleted = assignments.filter((a) => a.status === "COMPLETED").length;
      const totalSkippedOrFailed = assignments.filter((a) => ["SKIPPED", "FAILED"].includes(a.status)).length;
      const rated = assignments.filter((a) => a.rating !== null);
      const averageRating = rated.length > 0 ? rated.reduce((sum, a) => sum + (a.rating || 0), 0) / rated.length : null;
      const totalPoints = assignments.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
      const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

      res.json({
        studentId: targetStudentId,
        statistics: {
          totalAssigned,
          totalCompleted,
          totalSkippedOrFailed,
          completionRate,
          averageRating,
          totalPoints,
        },
        history: assignments,
      });
    } catch (error) {
      logger.error("Error fetching duty performance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Leaderboard: top students by points/completion rate over an optional
  // date range (defaults to the last 90 days).
  app.get("/api/duty-performance/leaderboard", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate, limit = "20" } = req.query;
      const gte = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const lte = endDate ? new Date(endDate as string) : new Date();

      const assignments = await prisma.dutyAssignment.findMany({
        where: { scheduledDate: { gte, lte } },
        include: { student: { select: { id: true, studentCode: true, preferredName: true, user: { select: { firstName: true, lastName: true } } } } },
      });

      const byStudent = new Map<string, { student: any; totalAssigned: number; totalCompleted: number; totalPoints: number; ratings: number[] }>();
      for (const a of assignments) {
        if (!byStudent.has(a.studentId)) {
          byStudent.set(a.studentId, { student: a.student, totalAssigned: 0, totalCompleted: 0, totalPoints: 0, ratings: [] });
        }
        const entry = byStudent.get(a.studentId)!;
        entry.totalAssigned += 1;
        if (a.status === "COMPLETED") entry.totalCompleted += 1;
        entry.totalPoints += a.pointsEarned || 0;
        if (a.rating !== null) entry.ratings.push(a.rating);
      }

      const leaderboard = Array.from(byStudent.values())
        .map((entry) => ({
          student: entry.student,
          totalAssigned: entry.totalAssigned,
          totalCompleted: entry.totalCompleted,
          completionRate: entry.totalAssigned > 0 ? (entry.totalCompleted / entry.totalAssigned) * 100 : 0,
          totalPoints: entry.totalPoints,
          averageRating: entry.ratings.length > 0 ? entry.ratings.reduce((s, r) => s + r, 0) / entry.ratings.length : null,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, parseInt(limit as string, 10));

      res.json({ period: { startDate: gte, endDate: lte }, leaderboard });
    } catch (error) {
      logger.error("Error building duty leaderboard:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Departments ----
  app.get("/api/departments", authMiddleware, async (_req, res) => {
    try {
      const departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
        include: { designations: true, _count: { select: { employees: true } } },
      });
      res.json(departments);
    } catch (err) {
      logger.error("Error listing departments:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/departments", authMiddleware, validate(schemas.department), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { name, code, description } = req.body;
    try {
      const department = await prisma.department.create({
        data: { name, code: code || null, description: description || null },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "DEPARTMENT", department.id,
        `Created department ${name}.`, req.ip, req.headers["user-agent"] || null, "INFO");
      res.status(201).json(department);
    } catch (err: any) {
      if (err?.code === "P2002") { res.status(409).json({ error: "A department with that name or code already exists" }); return; }
      logger.error("Error creating department:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/departments/:id", authMiddleware, validate(schemas.department), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { name, code, description } = req.body;
    try {
      const department = await prisma.department.update({
        where: { id: req.params.id },
        data: { name, code: code || null, description: description || null },
      });
      res.json(department);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Department not found" }); return; }
      if (err?.code === "P2002") { res.status(409).json({ error: "A department with that name or code already exists" }); return; }
      logger.error("Error updating department:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/departments/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const [employees, designations] = await Promise.all([
        prisma.employee.count({ where: { departmentId: req.params.id } }),
        prisma.designation.count({ where: { departmentId: req.params.id } }),
      ]);
      if (employees > 0 || designations > 0) {
        res.status(409).json({ error: "Remove all employees and designations from this department before deleting it" });
        return;
      }
      await prisma.department.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Department not found" }); return; }
      logger.error("Error deleting department:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Designations ----
  app.get("/api/designations", authMiddleware, async (req, res) => {
    try {
      const where = req.query.departmentId ? { departmentId: String(req.query.departmentId) } : {};
      const designations = await prisma.designation.findMany({
        where, orderBy: { title: "asc" }, include: { department: true },
      });
      res.json(designations);
    } catch (err) {
      logger.error("Error listing designations:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/designations", authMiddleware, validate(schemas.designation), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { title, departmentId } = req.body;
    try {
      const designation = await prisma.designation.create({
        data: { title, departmentId: departmentId || null },
        include: { department: true },
      });
      res.status(201).json(designation);
    } catch (err) {
      logger.error("Error creating designation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/designations/:id", authMiddleware, validate(schemas.designation), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { title, departmentId } = req.body;
    try {
      const designation = await prisma.designation.update({
        where: { id: req.params.id },
        data: { title, departmentId: departmentId || null },
        include: { department: true },
      });
      res.json(designation);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Designation not found" }); return; }
      logger.error("Error updating designation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/designations/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const employees = await prisma.employee.count({ where: { designationId: req.params.id } });
      if (employees > 0) { res.status(409).json({ error: "Cannot delete a designation still assigned to employees" }); return; }
      await prisma.designation.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Designation not found" }); return; }
      logger.error("Error deleting designation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Employees ----
  app.get("/api/employees", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role) && !payrollCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const where: any = {};
      if (req.query.status && req.query.status !== "ALL") where.status = String(req.query.status);
      if (req.query.departmentId && req.query.departmentId !== "ALL") where.departmentId = String(req.query.departmentId);
      if (req.query.q) {
        const q = String(req.query.q);
        where.OR = [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { employeeCode: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ];
      }
      const employees = await prisma.employee.findMany({
        where, orderBy: { createdAt: "desc" },
        include: { department: true, designation: true },
      });
      res.json(employees);
    } catch (err) {
      logger.error("Error listing employees:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/employees/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    // The detailed HR profile includes phone/email and leave history; payroll
    // accountants use the scoped payslip endpoints and must not receive it.
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: req.params.id },
        include: {
          department: true, designation: true,
          payslips: { orderBy: { createdAt: "desc" }, include: { payrollRun: true } },
          leaveRequests: { orderBy: { startDate: "desc" }, include: { leaveType: true } },
        },
      });
      if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }
      res.json(employee);
    } catch (err) {
      logger.error("Error fetching employee:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/employees", authMiddleware, validate(schemas.employee), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { firstName, lastName, email, phone, status, departmentId, designationId, baseSalary, currency, hireDate } = req.body;
    try {
      const assignmentError = await validateEmployeeAssignment(departmentId, designationId);
      if (assignmentError) { res.status(400).json({ error: assignmentError }); return; }
      const profile = await prisma.schoolProfile.findFirst();
      const employeeCode = `EMP-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const employee = await prisma.employee.create({
        data: {
          employeeCode,
          firstName, lastName,
          email: email || null,
          phone: phone || null,
          status: (status as any) || "ACTIVE",
          departmentId: departmentId || null,
          designationId: designationId || null,
          baseSalary: baseSalary != null ? Number(baseSalary) : 0,
          currency: (currency || profile?.currency || "MYR").toUpperCase(),
          hireDate: hireDate ? new Date(hireDate) : new Date(),
        },
        include: { department: true, designation: true },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "EMPLOYEE", employee.id,
        `Created employee ${firstName} ${lastName} (${employeeCode}).`, req.ip, req.headers["user-agent"] || null, "INFO");
      res.status(201).json(employee);
    } catch (err: any) {
      if (err?.code === "P2002") { res.status(409).json({ error: "An employee with this code or linked account already exists" }); return; }
      logger.error("Error creating employee:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/employees/:id", authMiddleware, validate(schemas.employeeUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const b = req.body;
    try {
      const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Employee not found" }); return; }
      const nextDepartmentId = b.departmentId !== undefined ? (b.departmentId || null) : existing.departmentId;
      const nextDesignationId = b.designationId !== undefined ? (b.designationId || null) : existing.designationId;
      const assignmentError = await validateEmployeeAssignment(nextDepartmentId, nextDesignationId);
      if (assignmentError) { res.status(400).json({ error: assignmentError }); return; }
      const nextHireDate = b.hireDate ? new Date(b.hireDate) : existing.hireDate;
      const nextTerminationDate = b.terminationDate !== undefined
        ? (b.terminationDate ? new Date(b.terminationDate) : null)
        : existing.terminationDate;
      if (nextTerminationDate && nextTerminationDate < nextHireDate) {
        res.status(400).json({ error: "terminationDate must be on or after hireDate" });
        return;
      }
      const data: any = {};
      if (b.firstName !== undefined) data.firstName = b.firstName;
      if (b.lastName !== undefined) data.lastName = b.lastName;
      if (b.email !== undefined) data.email = b.email || null;
      if (b.phone !== undefined) data.phone = b.phone || null;
      if (b.status !== undefined) data.status = b.status;
      if (b.departmentId !== undefined) data.departmentId = b.departmentId || null;
      if (b.designationId !== undefined) data.designationId = b.designationId || null;
      if (b.baseSalary !== undefined && b.baseSalary !== null) data.baseSalary = Number(b.baseSalary);
      if (b.currency !== undefined) data.currency = (b.currency || "MYR").toUpperCase();
      if (b.hireDate) data.hireDate = new Date(b.hireDate);
      if (b.terminationDate !== undefined) data.terminationDate = nextTerminationDate;
      const employee = await prisma.employee.update({
        where: { id: req.params.id }, data,
        include: { department: true, designation: true },
      });
      res.json(employee);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Employee not found" }); return; }
      logger.error("Error updating employee:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Soft delete: mark terminated rather than removing payroll/leave history.
  app.delete("/api/employees/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const employee = await prisma.employee.update({
        where: { id: req.params.id },
        data: { status: "TERMINATED", terminationDate: new Date() },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "EMPLOYEE", employee.id,
        `Terminated employee ${employee.employeeCode}.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Employee not found" }); return; }
      logger.error("Error terminating employee:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Payroll ----
  app.get("/api/payroll-runs", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!payrollCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const requestedYear = req.query.year ? Number(req.query.year) : null;
      if (requestedYear !== null && (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > 2100)) {
        res.status(400).json({ error: "year must be a whole number between 2000 and 2100" }); return;
      }
      const where = requestedYear !== null ? { periodYear: requestedYear } : {};
      const runs = await prisma.payrollRun.findMany({
        where, orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        include: { _count: { select: { payslips: true } } },
      });
      res.json(runs);
    } catch (err) {
      logger.error("Error listing payroll runs:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/payroll-runs/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!payrollCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const run = await prisma.payrollRun.findUnique({
        where: { id: req.params.id },
        include: {
          payslips: {
            orderBy: { createdAt: "asc" },
            include: {
              employee: { include: { department: true, designation: true } },
              teacher: { include: { user: true } },
            },
          },
        },
      });
      if (!run) { res.status(404).json({ error: "Payroll run not found" }); return; }
      const totalNet = run.payslips.reduce((sum, p) => sum + p.netPay, 0);
      res.json({ ...run, totalNet });
    } catch (err) {
      logger.error("Error fetching payroll run:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Create a DRAFT run and auto-seed one payslip per ACTIVE employee.
  app.post("/api/payroll-runs", authMiddleware, validate(schemas.payrollRun), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!payrollCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const periodYear = Number(req.body.periodYear);
    const periodMonth = Number(req.body.periodMonth);
    if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100 || !Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      res.status(400).json({ error: "periodYear must be 2000-2100 and periodMonth must be 1-12" });
      return;
    }
    try {
      const existing = await prisma.payrollRun.findUnique({ where: { periodYear_periodMonth: { periodYear, periodMonth } } });
      if (existing) { res.status(409).json({ error: "A payroll run already exists for that month" }); return; }
      // Seed a payslip for every active non-teaching employee AND every teacher.
      const employees = await prisma.employee.findMany({ where: { status: "ACTIVE" } });
      const employeeUserIds = employees.flatMap((employee) => employee.userId ? [employee.userId] : []);
      const teachers = await prisma.teacher.findMany({
        where: employeeUserIds.length > 0
          ? { OR: [{ userId: null }, { userId: { notIn: employeeUserIds } }] }
          : undefined,
      });
      const seeded = [
        ...employees.map((e) => ({
          employeeId: e.id,
          baseSalary: e.baseSalary, allowances: 0, deductions: 0,
          netPay: e.baseSalary, currency: e.currency,
        })),
        ...teachers.map((t) => ({
          teacherId: t.id,
          baseSalary: t.baseSalary, allowances: 0, deductions: 0,
          netPay: t.baseSalary, currency: t.currency,
        })),
      ];
      const run = await prisma.payrollRun.create({
        data: {
          periodYear, periodMonth, notes: req.body.notes || null, createdById: jwtUser.userId,
          payslips: { create: seeded },
        },
        include: { _count: { select: { payslips: true } } },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "PAYROLL_RUN", run.id,
        `Created payroll run ${periodMonth}/${periodYear} with ${seeded.length} payslips (${employees.length} staff, ${teachers.length} teachers).`, req.ip, req.headers["user-agent"] || null, "INFO");
      res.status(201).json(run);
    } catch (err) {
      logger.error("Error creating payroll run:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/payroll-runs/:id/status", authMiddleware, validate(schemas.payrollStatus), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!payrollCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const next = req.body.status as "DRAFT" | "APPROVED" | "PAID";
    try {
      const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
      if (!run) { res.status(404).json({ error: "Payroll run not found" }); return; }
      const allowed: Record<string, string[]> = {
        DRAFT: ["APPROVED"],
        APPROVED: ["PAID", "DRAFT"],
        PAID: [],
      };
      if (!allowed[run.status].includes(next)) {
        res.status(400).json({ error: `Cannot move payroll run from ${run.status} to ${next}` });
        return;
      }
      if (next === "APPROVED") {
        const payslips = await prisma.payslip.findMany({ where: { payrollRunId: run.id } });
        if (payslips.length === 0) {
          res.status(400).json({ error: "Cannot approve an empty payroll run" });
          return;
        }
        const invalid = payslips.find((p) => p.baseSalary < 0 || p.allowances < 0 || p.deductions < 0 || p.netPay < 0);
        if (invalid) {
          res.status(400).json({ error: "All payslips must have non-negative amounts and net pay before approval" });
          return;
        }
      }
      const updated = await prisma.payrollRun.update({ where: { id: run.id }, data: { status: next } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "PAYROLL_RUN", run.id,
        `Payroll run ${run.periodMonth}/${run.periodYear} status ${run.status} → ${next}.`, req.ip, req.headers["user-agent"] || null, "INFO");
      res.json(updated);
    } catch (err) {
      logger.error("Error updating payroll run status:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Edit a run's period/notes — only while DRAFT.
  app.put("/api/payroll-runs/:id", authMiddleware, validate(schemas.payrollRunUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!payrollCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
      if (!run) { res.status(404).json({ error: "Payroll run not found" }); return; }
      if (run.status !== "DRAFT") {
        res.status(400).json({ error: "Only DRAFT payroll runs can be edited" });
        return;
      }
      const periodYear = req.body.periodYear != null ? Number(req.body.periodYear) : run.periodYear;
      const periodMonth = req.body.periodMonth != null ? Number(req.body.periodMonth) : run.periodMonth;
      if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100) { res.status(400).json({ error: "periodYear must be 2000-2100" }); return; }
      if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) { res.status(400).json({ error: "periodMonth must be 1-12" }); return; }
      if (periodYear !== run.periodYear || periodMonth !== run.periodMonth) {
        const clash = await prisma.payrollRun.findUnique({ where: { periodYear_periodMonth: { periodYear, periodMonth } } });
        if (clash && clash.id !== run.id) { res.status(409).json({ error: "A payroll run already exists for that month" }); return; }
      }
      const updated = await prisma.payrollRun.update({
        where: { id: run.id },
        data: { periodYear, periodMonth, notes: req.body.notes !== undefined ? (req.body.notes || null) : run.notes },
      });
      res.json(updated);
    } catch (err) {
      logger.error("Error updating payroll run:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Only unapproved drafts are disposable; approved payroll is an audit record.
  app.delete("/api/payroll-runs/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!payrollCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
      if (!run) { res.status(404).json({ error: "Payroll run not found" }); return; }
      if (run.status !== "DRAFT") {
        res.status(400).json({ error: "Only DRAFT payroll runs can be deleted" });
        return;
      }
      await prisma.payrollRun.delete({ where: { id: run.id } }); // payslips cascade
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "PAYROLL_RUN", run.id,
        `Deleted payroll run ${run.periodMonth}/${run.periodYear}.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting payroll run:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Edit a payslip — only while its run is still DRAFT. netPay recomputed server-side.
  app.put("/api/payslips/:id", authMiddleware, validate(schemas.payslipUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!payrollCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const payslip = await prisma.payslip.findUnique({ where: { id: req.params.id }, include: { payrollRun: true } });
      if (!payslip) { res.status(404).json({ error: "Payslip not found" }); return; }
      if (payslip.payrollRun.status !== "DRAFT") {
        res.status(400).json({ error: "Payslips can only be edited while the payroll run is in DRAFT" });
        return;
      }
      const baseSalary = req.body.baseSalary != null ? Number(req.body.baseSalary) : payslip.baseSalary;
      const allowances = req.body.allowances != null ? Number(req.body.allowances) : payslip.allowances;
      const deductions = req.body.deductions != null ? Number(req.body.deductions) : payslip.deductions;
      const netPay = baseSalary + allowances - deductions;
      if (netPay < 0) {
        res.status(400).json({ error: "Deductions cannot exceed base salary plus allowances" });
        return;
      }
      const updated = await prisma.payslip.update({
        where: { id: payslip.id },
        data: { baseSalary, allowances, deductions, netPay, notes: req.body.notes !== undefined ? (req.body.notes || null) : payslip.notes },
      });
      // Remember the base salary on the payee's master record so future runs
      // seed from the latest figure (only when it actually changed).
      if (baseSalary !== payslip.baseSalary) {
        if (payslip.employeeId) {
          await prisma.employee.update({ where: { id: payslip.employeeId }, data: { baseSalary } }).catch(() => {});
        } else if (payslip.teacherId) {
          await prisma.teacher.update({ where: { id: payslip.teacherId }, data: { baseSalary } }).catch(() => {});
        }
      }
      res.json(updated);
    } catch (err) {
      logger.error("Error updating payslip:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Single payslip with full context — used by the printable payslip view.
  // Reachable either by payroll-managing roles (any payslip) or by the
  // payee themselves viewing their own -- and only once the run is past
  // DRAFT, so nobody sees provisional/unapproved figures for themselves.
  app.get("/api/payslips/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const payslip = await prisma.payslip.findUnique({
        where: { id: req.params.id },
        include: {
          payrollRun: true,
          employee: { include: { department: true, designation: true } },
          teacher: { include: { user: true } },
        },
      });
      if (!payslip) { res.status(404).json({ error: "Payslip not found" }); return; }
      if (!payrollCanManage(jwtUser.role)) {
        const isOwnEmployeeSlip = payslip.employee?.userId === jwtUser.userId;
        const isOwnTeacherSlip = payslip.teacher?.userId === jwtUser.userId;
        if (!isOwnEmployeeSlip && !isOwnTeacherSlip) { res.status(403).json({ error: "Forbidden" }); return; }
        if (payslip.payrollRun.status === "DRAFT") { res.status(403).json({ error: "This payslip isn't finalized yet" }); return; }
      }
      res.json(payslip);
    } catch (err) {
      logger.error("Error fetching payslip:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Self-service: the signed-in user's own payslip history (resolved via
  // their linked Teacher or Employee profile), excluding DRAFT runs.
  app.get("/api/me/payslips", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const [teacher, employee] = await Promise.all([
        prisma.teacher.findUnique({ where: { userId: jwtUser.userId } }),
        prisma.employee.findUnique({ where: { userId: jwtUser.userId } }),
      ]);
      if (!teacher && !employee) { res.json([]); return; }
      const slips = await prisma.payslip.findMany({
        where: {
          payrollRun: { status: { not: "DRAFT" } },
          OR: [
            ...(teacher ? [{ teacherId: teacher.id }] : []),
            ...(employee ? [{ employeeId: employee.id }] : []),
          ],
        },
        include: { payrollRun: true },
        orderBy: [{ payrollRun: { periodYear: "desc" } }, { payrollRun: { periodMonth: "desc" } }],
      });
      res.json(slips);
    } catch (err) {
      logger.error("Error fetching own payslips:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Leave types ----
  app.get("/api/leave-types", authMiddleware, async (_req, res) => {
    try {
      const types = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
      res.json(types);
    } catch (err) {
      logger.error("Error listing leave types:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/leave-types", authMiddleware, validate(schemas.leaveType), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const type = await prisma.leaveType.create({
        data: {
          name: req.body.name,
          daysPerYear: req.body.daysPerYear != null ? Number(req.body.daysPerYear) : 0,
          paid: req.body.paid !== undefined ? Boolean(req.body.paid) : true,
        },
      });
      res.status(201).json(type);
    } catch (err: any) {
      if (err?.code === "P2002") { res.status(409).json({ error: "A leave type with that name already exists" }); return; }
      logger.error("Error creating leave type:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/leave-types/:id", authMiddleware, validate(schemas.leaveType), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const type = await prisma.leaveType.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          daysPerYear: req.body.daysPerYear != null ? Number(req.body.daysPerYear) : 0,
          paid: req.body.paid !== undefined ? Boolean(req.body.paid) : true,
        },
      });
      res.json(type);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Leave type not found" }); return; }
      logger.error("Error updating leave type:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/leave-types/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const used = await prisma.leaveRequest.count({ where: { leaveTypeId: req.params.id } });
      if (used > 0) { res.status(409).json({ error: "Cannot delete a leave type that has requests" }); return; }
      await prisma.leaveType.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Leave type not found" }); return; }
      logger.error("Error deleting leave type:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ---- Leave requests ----
  app.get("/api/leave-requests", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const where: any = {};
      if (req.query.employeeId) where.employeeId = String(req.query.employeeId);
      if (req.query.status && req.query.status !== "ALL") where.status = String(req.query.status);
      const requests = await prisma.leaveRequest.findMany({
        where, orderBy: { createdAt: "desc" },
        include: { leaveType: true, employee: { include: { department: true } } },
      });
      res.json(requests);
    } catch (err) {
      logger.error("Error listing leave requests:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/leave-requests", authMiddleware, validate(schemas.leaveRequest), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const start = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);
    const days = countLeaveDays(start, end);
    if (days <= 0) { res.status(400).json({ error: "endDate must be on or after startDate" }); return; }
    try {
      const [employee, leaveType, overlap] = await Promise.all([
        prisma.employee.findUnique({ where: { id: req.body.employeeId } }),
        prisma.leaveType.findUnique({ where: { id: req.body.leaveTypeId } }),
        prisma.leaveRequest.findFirst({
          where: {
            employeeId: req.body.employeeId,
            status: { in: ["PENDING", "APPROVED"] },
            startDate: { lte: end },
            endDate: { gte: start },
          },
        }),
      ]);
      if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }
      if (!leaveType) { res.status(404).json({ error: "Leave type not found" }); return; }
      if (["SUSPENDED", "TERMINATED"].includes(employee.status)) {
        res.status(400).json({ error: `${employee.status.toLowerCase()} employees cannot receive new leave requests` });
        return;
      }
      if (overlap) {
        res.status(409).json({ error: "This employee already has a pending or approved request for overlapping dates" });
        return;
      }
      const request = await prisma.leaveRequest.create({
        data: {
          employeeId: req.body.employeeId,
          leaveTypeId: req.body.leaveTypeId,
          startDate: start, endDate: end, days,
          reason: req.body.reason || null,
        },
        include: { leaveType: true, employee: true },
      });
      res.status(201).json(request);
    } catch (err) {
      logger.error("Error creating leave request:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/leave-requests/:id/status", authMiddleware, validate(schemas.leaveDecision), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const next = req.body.status as "APPROVED" | "REJECTED" | "CANCELLED";
    try {
      const request = await prisma.leaveRequest.findUnique({ where: { id: req.params.id }, include: { leaveType: true } });
      if (!request) { res.status(404).json({ error: "Leave request not found" }); return; }
      const allowed = request.status === "PENDING"
        ? ["APPROVED", "REJECTED", "CANCELLED"]
        : request.status === "APPROVED"
          ? ["CANCELLED"]
          : [];
      if (!allowed.includes(next)) {
        res.status(400).json({ error: `Cannot move leave request from ${request.status} to ${next}` });
        return;
      }
      if (next === "APPROVED") {
        const overlappingApproval = await prisma.leaveRequest.findFirst({
          where: {
            id: { not: request.id },
            employeeId: request.employeeId,
            status: "APPROVED",
            startDate: { lte: request.endDate },
            endDate: { gte: request.startDate },
          },
        });
        if (overlappingApproval) {
          res.status(409).json({ error: "This leave overlaps another approved request" });
          return;
        }

        if (request.leaveType.daysPerYear > 0) {
          for (let year = request.startDate.getUTCFullYear(); year <= request.endDate.getUTCFullYear(); year += 1) {
            const yearStart = new Date(Date.UTC(year, 0, 1));
            const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
            const approved = await prisma.leaveRequest.findMany({
              where: {
                id: { not: request.id },
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
                status: "APPROVED",
                startDate: { lt: yearEnd },
                endDate: { gte: yearStart },
              },
            });
            const used = approved.reduce((sum, row) => sum + countLeaveDaysInRange(row.startDate, row.endDate, yearStart, yearEnd), 0);
            const requested = countLeaveDaysInRange(request.startDate, request.endDate, yearStart, yearEnd);
            if (used + requested > request.leaveType.daysPerYear) {
              res.status(409).json({
                error: `${request.leaveType.name} balance exceeded for ${year}: ${Math.max(0, request.leaveType.daysPerYear - used)} day(s) remaining`,
              });
              return;
            }
          }
        }
      }
      const updated = await prisma.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: next,
          reviewedById: jwtUser.userId,
          reviewedByName: jwtUser.email,
          reviewedAt: new Date(),
          reviewNote: req.body.reviewNote || null,
        },
        include: { leaveType: true, employee: true },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "LEAVE_REQUEST", request.id,
        `Leave request ${next.toLowerCase()} for employee ${request.employeeId}.`, req.ip, req.headers["user-agent"] || null, "INFO");
      res.json(updated);
    } catch (err) {
      logger.error("Error updating leave request:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Remaining balance per leave type for the current calendar year.
  app.get("/api/employees/:id/leave-balance", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!hrCanManage(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        res.status(400).json({ error: "year must be a whole number between 2000 and 2100" });
        return;
      }
      const employee = await prisma.employee.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }
      const yearStart = new Date(Date.UTC(year, 0, 1));
      const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
      const types = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
      const approved = await prisma.leaveRequest.findMany({
        where: {
          employeeId: req.params.id,
          status: "APPROVED",
          startDate: { lt: yearEnd },
          endDate: { gte: yearStart },
        },
      });
      const balance = types.map((t) => {
        const used = approved
          .filter((r) => r.leaveTypeId === t.id)
          .reduce((sum, r) => sum + countLeaveDaysInRange(r.startDate, r.endDate, yearStart, yearEnd), 0);
        return {
          leaveTypeId: t.id,
          name: t.name,
          daysPerYear: t.daysPerYear,
          paid: t.paid,
          used,
          remaining: t.daysPerYear > 0 ? t.daysPerYear - used : null, // null = uncapped
        };
      });
      res.json({ year, balance });
    } catch (err) {
      logger.error("Error computing leave balance:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Exams API ───────────────────────────────────────────────────────────────
  async function canManageExamClass(jwtUser: JwtPayload, classId: string): Promise<boolean> {
    if (jwtUser.role === "ADMIN") return true;
    if (jwtUser.role !== "TEACHER") return false;
    const teacher = await prisma.teacher.findUnique({
      where: { userId: jwtUser.userId },
      include: { classes: true },
    });
    return Boolean(teacher?.classes.some((ct) => ct.classId === classId));
  }

  app.get("/api/exams", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    // Archived exams are hidden by default; teachers/admins can opt in with ?archived=1.
    const showArchived = (req.query.archived === "1" || req.query.archived === "true") && jwtUser.role !== "STUDENT";
    const statusFilter = showArchived ? { status: "ARCHIVED" } : { status: { not: "ARCHIVED" } };
    try {
      let exams;
      if (jwtUser.role === "STUDENT") {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!student || !student.classId) {
          res.json([]);
          return;
        }
        // Students must never receive correctAnswer for exam questions.
        exams = await prisma.exam.findMany({
          where: { classId: student.classId, status: { in: ["PUBLISHED", "ACTIVE", "SCHEDULED"] } },
          include: {
            class: true,
            subject: true,
            questions: {
              select: {
                id: true,
                points: true,
              },
            },
          },
        });
      } else {
        const where: Record<string, unknown> = { ...statusFilter };
        if (jwtUser.role === "TEACHER") {
          const ids = await getTeacherClassIds(jwtUser.userId);
          where.classId = { in: ids };
        }
        exams = await prisma.exam.findMany({
          where,
          include: {
            class: true,
            subject: true,
            questions: {
              select: {
                id: true,
                points: true,
              },
            },
          }
        });
      }
      res.json(exams);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { logExamDatabaseError("Error fetching exams", err); res.status(503).json({ error: "Exam database is out of date — run `npx prisma migrate deploy` then restart the server." }); return; }
      logExamDatabaseError("Error fetching exams", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/exams/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const isStudent = jwtUser.role === "STUDENT";
      const exam = await prisma.exam.findUnique({
        where: { id },
        include: {
          class: { include: { _count: { select: { students: true } } } },
          subject: true,
          questions: isStudent
            ? {
                // Student delivery is exclusively through the session-bound
                // Phase 2 attempt payload. Do not expose question content here
                // before the availability/access-code checks have run.
                select: {
                  id: true,
                  points: true,
                },
              }
            : {
                select: {
                  id: true,
                  text: true,
                  type: true,
                  points: true,
                  options: true,
                  correctAnswer: true,
                  passageText: true,
                  explanation: true,
                  imageUrl: true,
                  examId: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
          attempts: isStudent
            ? false
            : { include: { student: { include: { user: true } } } },
        },
      });
      if (!exam) {
        res.status(404).json({ error: "Exam not found" });
        return;
      }
      if (jwtUser.role === "TEACHER" && !(await canManageExamClass(jwtUser, exam.classId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (exam.status === "ARCHIVED" && isStudent) {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!student || student.classId !== exam.classId) {
          res.status(404).json({ error: "Exam not found" });
          return;
        }
        const attempt = await prisma.examAttempt.findFirst({
          where: { studentId: student.id, examId: exam.id, isCompleted: true },
          orderBy: { attemptNumber: "desc" },
        });
        if (!attempt) {
          res.status(404).json({ error: "Exam not found" });
          return;
        }
      }
      // A student may only view an exam for their own class.
      if (isStudent) {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!student || student.classId !== exam.classId) {
          res.status(404).json({ error: "Exam not found" });
          return;
        }
        if (!["PUBLISHED", "ACTIVE", "SCHEDULED"].includes(exam.status)) {
          const attempt = await prisma.examAttempt.findFirst({
            where: { studentId: student.id, examId: exam.id },
            orderBy: { attemptNumber: "desc" },
          });
          if (!attempt?.isCompleted) {
            res.status(404).json({ error: "Exam not found" });
            return;
          }
        }
      }
      const profile = await prisma.schoolProfile.findFirst();
      res.json({ ...exam, lockdownPolicy: lockdownBrowserPolicy(profile) });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { logExamDatabaseError("Error fetching exam", err); res.status(503).json({ error: "Exam database is out of date — run `npx prisma migrate deploy` then restart the server." }); return; }
      logExamDatabaseError("Error fetching exam", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Upload an image to attach to an exam question. Teacher/admin only.
  const uploadExamMedia: express.RequestHandler = (req, res, next) => {
    examMediaUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Image must be 10 MB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  const examMediaRoleGuard: express.RequestHandler = (req, res, next) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };

  app.post("/api/exam-media", authMiddleware, examMediaRoleGuard, uploadExamMedia, async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "Image file is required" }); return; }
    res.status(201).json({ url: `/uploads/exam-media/${file.filename}` });
  });

  const MANUAL_QUESTION_TYPES = new Set(["SHORT_ANSWER", "ESSAY", "WRITTEN", "EXTENDED"]);
  function publishQuestionError(q: any, index: number): string | null {
    const label = `Question ${index + 1}`;
    if (!String(q?.text || "").trim()) return `${label} is missing question text`;
    if (!q.examId && q.status !== "APPROVED") return `${label} is a bank question that has not been approved`;
    const points = Number(q?.pointsOverride ?? q?.defaultPoints ?? q?.points);
    if (!Number.isFinite(points) || points <= 0) return `${label} must be worth at least 1 point`;
    if (MANUAL_QUESTION_TYPES.has(q.type) || q.requiresManualGrading) return null;
    if (q.type === "DRAG_DROP") {
      return Array.isArray(q.options?.blanks) && q.options.blanks.length > 0
        ? null
        : `${label} has no configured blanks`;
    }
    const rowKey = Array.isArray(q.optionRows) && q.optionRows.some((o: any) => o.isCorrect);
    const jsonKey = q.correctAnswer != null || (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0);
    return rowKey || jsonKey ? null : `${label} has no correct answer`;
  }

  async function assertExamPublishable(tx: any, examId: string) {
    const composed = await composeQuestionSet(tx, examId, `publish:${examId}`);
    if (!composed.length) throw Object.assign(new Error("Add at least one question before publishing"), { http: 400 });
    const badIndex = composed.findIndex((q: any, i: number) => publishQuestionError(q, i) !== null);
    if (badIndex !== -1) {
      throw Object.assign(new Error(publishQuestionError(composed[badIndex], badIndex) || "Invalid question"), { http: 400 });
    }
    return composed.reduce((sum: number, q: any) => sum + Number(q.pointsOverride ?? q.defaultPoints ?? q.points ?? 0), 0);
  }

  app.post("/api/exams", authMiddleware, validate(schemas.exam), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { title, classId, subjectId, examType, duration, totalMarks, questions, settings, status } = req.body;
    if (!String(title || "").trim() || !classId || !subjectId) {
      res.status(400).json({ error: "title, classId, and subjectId are required" });
      return;
    }
    try {
      const [targetClass, targetSubject] = await Promise.all([
        prisma.class.findUnique({ where: { id: classId }, select: { id: true } }),
        prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } }),
      ]);
      if (!targetClass || !targetSubject) { res.status(400).json({ error: "Select a valid class and subject" }); return; }
      if (!(await canManageExamClass(jwtUser, classId))) {
        res.status(403).json({ error: "Forbidden: You cannot create exams for this class" });
        return;
      }
      const result = await prisma.$transaction(async (tx) => {
        const exam = await tx.exam.create({
          data: {
            title: title.trim(),
            classId,
            subjectId,
            type: examType || "FINAL",
            status: status || "DRAFT",
            date: new Date(),
            durationMinutes: duration ? Number(duration) : null,
            totalMarks: totalMarks != null ? Number(totalMarks) : null,
            settings: settings || null,
          }
        });
        if (questions && Array.isArray(questions)) {
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await tx.question.create({
              data: {
                examId: exam.id,
                text: String(q.questionText || ""),
                type: q.type || "MCQ",
                points: Number(q.points ?? 5),
                orderIndex: i,
                options: q.choices || null,
                correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : null,
                correctAnswers: q.correctAnswers ?? null,
                partialCredit: !!q.partialCredit,
                passageText: q.passageText || null,
                explanation: q.explanation || null,
                imageUrl: q.imageUrl || null,
              }
            });
          }
        }
        if ((status || "DRAFT") === "PUBLISHED") {
          const computedTotal = await assertExamPublishable(tx, exam.id);
          return tx.exam.update({ where: { id: exam.id }, data: { totalMarks: computedTotal } });
        }
        return exam;
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "EXAM",
        result.id,
        `Exam '${title}' created.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.status(201).json(result);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { logExamDatabaseError("Error creating exam", err); res.status(503).json({ error: "Exam database is out of date — run `npx prisma migrate deploy` then restart the server." }); return; }
      logExamDatabaseError("Error creating exam", err);
      if (err.http) { res.status(err.http).json({ error: err.message }); return; }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/exams/:id", authMiddleware, validate(schemas.exam), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { title, classId, subjectId, examType, duration, totalMarks, questions, settings, status } = req.body;
    if (!String(title || "").trim() || !classId || !subjectId) {
      res.status(400).json({ error: "title, classId, and subjectId are required" });
      return;
    }
    try {
      const [targetClass, targetSubject] = await Promise.all([
        prisma.class.findUnique({ where: { id: classId }, select: { id: true } }),
        prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } }),
      ]);
      if (!targetClass || !targetSubject) { res.status(400).json({ error: "Select a valid class and subject" }); return; }
      if (!(await canManageExamClass(jwtUser, classId))) {
        res.status(403).json({ error: "Forbidden: You cannot update exams for this class" });
        return;
      }
      const existingForAccess = await prisma.exam.findUnique({ where: { id }, select: { classId: true } });
      if (!existingForAccess) {
        res.status(404).json({ error: "Exam not found" });
        return;
      }
      if (!(await canManageExamClass(jwtUser, existingForAccess.classId))) {
        res.status(403).json({ error: "Forbidden: You cannot update this exam" });
        return;
      }
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.exam.findUnique({
          where: { id },
          include: { attempts: { select: { id: true } } },
        });
        if (!existing) throw Object.assign(new Error("Exam not found"), { http: 404 });
        if (existing.attempts.length > 0 && questions !== undefined) {
          throw Object.assign(new Error("Questions cannot be replaced after students have started this exam"), { http: 409 });
        }
        if (existing.attempts.length > 0 && (classId !== existing.classId || subjectId !== existing.subjectId || (examType && examType !== existing.type))) {
          throw Object.assign(new Error("Class, subject, and exam type cannot change after students have started"), { http: 409 });
        }

        const exam = await tx.exam.update({
          where: { id },
          data: {
            title: title.trim(),
            classId,
            subjectId,
            type: examType || "FINAL",
            status: status !== undefined ? (status || existing.status || "DRAFT") : (existing.status || "DRAFT"),
            durationMinutes: duration ? Number(duration) : null,
            totalMarks: totalMarks != null ? Number(totalMarks) : null,
            settings: settings !== undefined ? settings : existing.settings,
          },
        });

        if (existing.attempts.length === 0 && questions !== undefined) {
          await tx.question.deleteMany({ where: { examId: id } });
          if (questions && Array.isArray(questions)) {
            for (let i = 0; i < questions.length; i++) {
              const q = questions[i];
              await tx.question.create({
                data: {
                  examId: id,
                  text: String(q.questionText || ""),
                  type: q.type || "MCQ",
                  points: Number(q.points ?? 5),
                  orderIndex: i,
                  options: q.choices || null,
                  correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : null,
                  correctAnswers: q.correctAnswers ?? null,
                  partialCredit: !!q.partialCredit,
                  passageText: q.passageText || null,
                  explanation: q.explanation || null,
                  imageUrl: q.imageUrl || null,
                },
              });
            }
          }
        }

        if (exam.status === "PUBLISHED") {
          const computedTotal = await assertExamPublishable(tx, id);
          return tx.exam.update({ where: { id }, data: { totalMarks: computedTotal } });
        }

        return exam;
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "EXAM",
        result.id,
        `Exam '${title}' updated.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json(result);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { logExamDatabaseError("Error updating exam", err); res.status(503).json({ error: "Exam database is out of date — run `npx prisma migrate deploy` then restart the server." }); return; }
      logExamDatabaseError("Error updating exam", err);
      if (err.http) {
        res.status(err.http).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Archive an exam (ADMIN or TEACHER). Soft delete: sets status = ARCHIVED so it
  // disappears from normal lists and can no longer be started, while preserving
  // the exam, its questions and all student attempt history. Reversible via restore.
  app.delete("/api/exams/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const exam = await prisma.exam.findUnique({ where: { id } });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      if (!(await canManageExamClass(jwtUser, exam.classId))) {
        res.status(403).json({ error: "Forbidden: You cannot archive this exam" });
        return;
      }
      if (exam.status === "ARCHIVED") {
        res.json({ ok: true, status: "ARCHIVED" });
        return;
      }
      await prisma.exam.update({ where: { id }, data: { status: "ARCHIVED" } });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "ARCHIVE", "EXAM", id,
        `Exam '${exam.title}' archived.`, req.ip, req.headers["user-agent"] || null, "WARNING",
      );
      res.json({ ok: true, status: "ARCHIVED" });
    } catch (err: any) {
      logger.error("Error archiving exam:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ADMIN ONLY: permanently remove an exam and every record owned by it.
  // This is deliberately separate from DELETE /api/exams/:id, which remains a
  // reversible archive action for normal exam management.
  app.delete("/api/admin/exams/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Admin access required" }); return; }
    const { id } = req.params;
    try {
      const exam = await prisma.exam.findUnique({
        where: { id },
        include: {
          questions: { select: { id: true, imageUrl: true } },
          stimuli: { select: { mediaUrl: true } },
          attempts: { select: { id: true } },
          assignments: { select: { id: true } },
          accommodations: { select: { id: true } },
          rubrics: { select: { id: true } },
        },
      });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      if (req.body?.confirmation !== "DELETE" || req.body?.title !== exam.title) {
        res.status(400).json({ error: "Type the exact exam title and DELETE to confirm permanent removal" });
        return;
      }

      const attemptIds = exam.attempts.map((row) => row.id);
      const questionIds = exam.questions.map((row) => row.id);
      const linkedRubrics = await prisma.gradingRubric.findMany({
        where: { OR: [{ examId: id }, ...(questionIds.length ? [{ questionId: { in: questionIds } }] : [])] },
        select: { id: true },
      });
      const rubricIds = [...new Set([...exam.rubrics.map((row) => row.id), ...linkedRubrics.map((row) => row.id)])];
      await prisma.$transaction(async (tx) => {
        // Remove cross-linked grading rows before their attempts/questions/rubrics.
        if (attemptIds.length || questionIds.length || rubricIds.length) {
          await tx.manualGrade.deleteMany({
            where: { OR: [
              ...(attemptIds.length ? [{ attemptId: { in: attemptIds } }] : []),
              ...(questionIds.length ? [{ questionId: { in: questionIds } }] : []),
              ...(rubricIds.length ? [{ rubricId: { in: rubricIds } }] : []),
            ] },
          });
        }
        await tx.examAttempt.deleteMany({ where: { examId: id } });
        await tx.examAssignment.deleteMany({ where: { examId: id } });
        await tx.examAccommodation.deleteMany({ where: { examId: id } });
        if (rubricIds.length) await tx.gradingRubric.deleteMany({ where: { id: { in: rubricIds } } });
        await tx.examQuestion.deleteMany({ where: { examId: id } });
        await tx.examBlueprintRule.deleteMany({ where: { examId: id } });
        await tx.question.deleteMany({ where: { examId: id } });
        await tx.questionGroup.deleteMany({ where: { examId: id } });
        await tx.stimulus.deleteMany({ where: { examId: id } });
        await tx.examSection.deleteMany({ where: { examId: id } });
        await tx.examResultPolicy.deleteMany({ where: { examId: id } });
        await tx.questionStatistic.deleteMany({ where: { examId: id } });
        await tx.exam.delete({ where: { id } });
      });

      // Remove local exam media only when no other record references the URL.
      const mediaUrls = [...new Set([
        ...exam.questions.map((row) => row.imageUrl),
        ...exam.stimuli.map((row) => row.mediaUrl),
      ].filter((url): url is string => typeof url === "string" && url.startsWith("/uploads/exam-media/")))];
      await Promise.allSettled(mediaUrls.map(async (url) => {
        const [questionRefs, stimulusRefs] = await Promise.all([
          prisma.question.count({ where: { imageUrl: url } }),
          prisma.stimulus.count({ where: { mediaUrl: url } }),
        ]);
        if (questionRefs || stimulusRefs) return;
        const filename = path.basename(url.split("?")[0]);
        if (filename) await fs.promises.unlink(path.join(EXAM_MEDIA_DIR, filename)).catch((err: any) => { if (err?.code !== "ENOENT") throw err; });
      }));

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "PERMANENT_DELETE", "EXAM", id,
        `Exam '${exam.title}' permanently deleted with ${exam.questions.length} question(s) and ${exam.attempts.length} attempt(s).`,
        req.ip, req.headers["user-agent"] || null, "WARNING",
      );
      res.json({ ok: true, id, title: exam.title });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Exam not found" }); return; }
      logger.error("Error permanently deleting exam:", err);
      res.status(500).json({ error: "Could not permanently delete exam" });
    }
  });

  const EXAM_TYPE_TO_GRADE_CATEGORY: Record<string, string> = {
    QUIZ: "QUIZ",
    MIDTERM: "MIDTERM",
    FINAL: "FINAL",
    MOCK: "MOCK_GED",
  };

  // Push best completed exam scores into the gradebook for the exam's class.
  app.post("/api/exams/:id/sync-gradebook", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const exam = await prisma.exam.findUnique({
        where: { id },
        include: {
          questions: { select: { points: true } },
          attempts: { where: { isCompleted: true, score: { not: null } } },
        },
      });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      if (!(await canManageExamClass(jwtUser, exam.classId))) {
        res.status(403).json({ error: "Forbidden: not your class" });
        return;
      }
      const maxMarks = exam.totalMarks ?? exam.questions.reduce((sum, q) => sum + Number(q.points || 0), 0);
      if (!maxMarks || maxMarks <= 0) {
        res.status(400).json({ error: "Set total marks on this exam before syncing to the gradebook" });
        return;
      }
      const bestByStudent = new Map<string, number>();
      for (const attempt of exam.attempts) {
        if (attempt.score == null) continue;
        const prev = bestByStudent.get(attempt.studentId);
        if (prev == null || attempt.score > prev) bestByStudent.set(attempt.studentId, attempt.score);
      }
      if (bestByStudent.size === 0) {
        res.status(400).json({ error: "No completed scored attempts to sync yet" });
        return;
      }
      const category = EXAM_TYPE_TO_GRADE_CATEGORY[exam.type] || "QUIZ";
      const result = await prisma.$transaction(async (tx) => {
        let gradeItem = await tx.gradeItem.findFirst({
          where: { classId: exam.classId, title: exam.title, category: category as any, subjectId: exam.subjectId },
        });
        if (!gradeItem) {
          gradeItem = await tx.gradeItem.create({
            data: {
              title: exam.title,
              category: category as any,
              maxMarks,
              date: exam.date,
              classId: exam.classId,
              subjectId: exam.subjectId,
              createdById: jwtUser.userId,
            },
          });
        } else {
          await tx.gradeItem.update({ where: { id: gradeItem.id }, data: { maxMarks } });
        }
        for (const [studentId, score] of bestByStudent) {
          await tx.grade.upsert({
            where: { gradeItemId_studentId: { gradeItemId: gradeItem!.id, studentId } },
            update: { marks: score, gradedById: jwtUser.userId },
            create: { gradeItemId: gradeItem!.id, studentId, marks: score, gradedById: jwtUser.userId },
          });
        }
        return { gradeItemId: gradeItem!.id, count: bestByStudent.size };
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "SYNC", "EXAM", id,
        `Exam '${exam.title}' synced ${result.count} score(s) to gradebook.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(result);
    } catch (err) {
      logger.error("Error syncing exam to gradebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Restore an archived exam back to DRAFT (ADMIN or TEACHER).
  app.post("/api/exams/:id/restore", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      const existing = await prisma.exam.findUnique({ where: { id } });
      if (!existing) { res.status(404).json({ error: "Exam not found" }); return; }
      if (!(await canManageExamClass(jwtUser, existing.classId))) {
        res.status(403).json({ error: "Forbidden: You cannot restore this exam" });
        return;
      }
      const exam = existing.status === "DRAFT"
        ? existing
        : await prisma.exam.update({ where: { id }, data: { status: "DRAFT" } });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "RESTORE", "EXAM", id,
        `Exam '${exam.title}' restored to DRAFT.`, req.ip, req.headers["user-agent"] || null, "SUCCESS",
      );
      res.json({ ok: true, status: "DRAFT" });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Exam not found" }); return; }
      logger.error("Error restoring exam:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // RETIRED: the unified delivery path is the Phase 2 lifecycle
  // (POST /api/exam2/:id/start → /api/attempts/:id/save → /submit). This legacy
  // one-shot submit bypassed the attempt/session/timing safeguards and is no
  // longer used by the app UI, so it now returns 410 Gone.
  app.post("/api/exams/:id/submit", authMiddleware, (_req, res) => {
    res.status(410).json({ error: "This endpoint has been retired. Use POST /api/exam2/:examId/start and POST /api/attempts/:attemptId/submit." });
  });

  app.get("/api/exams/:id/results", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Students must use the policy-gated attempt result endpoint" });
      return;
    }
    try {
      const exam = await prisma.exam.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          type: true,
          classId: true,
          durationMinutes: true,
          totalMarks: true,
          class: { select: { name: true, students: { select: { id: true } } } },
          subject: { select: { name: true } },
          questions: { select: { id: true, text: true, type: true, points: true }, orderBy: { createdAt: "asc" } },
          attempts: {
            select: {
              id: true,
              score: true,
              isCompleted: true,
              startedAt: true,
              completedAt: true,
              securityWarnings: true,
              autoSubmitted: true,
              integrityEvents: true,
              studentId: true,
              student: { select: { studentCode: true, user: true } },
              answers: {
                select: {
                  id: true,
                  questionId: true,
                  answerText: true,
                  isCorrect: true,
                  pointsAwarded: true,
                  question: { select: { text: true, type: true, points: true } },
                },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { completedAt: "desc" },
          },
        },
      });
      if (!exam) {
        res.status(404).json({ error: "Exam not found" });
        return;
      }

      let scopedAttempts = exam.attempts;
      let canGrade = jwtUser.role === "ADMIN" || jwtUser.role === "TEACHER";
      if (jwtUser.role === "TEACHER") {
        if (!(await canManageExamClass(jwtUser, exam.classId))) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      } else if (!canGrade) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const totalMarks = Number(exam.totalMarks || exam.questions.reduce((sum, q) => sum + Number(q.points || 0), 0) || 0);
      res.json({
        userRole: jwtUser.role,
        canGrade,
        exam: {
          id: exam.id,
          title: exam.title,
          status: "PUBLISHED",
          type: exam.type,
          totalMarks,
          durationMinutes: exam.durationMinutes,
          subject: exam.subject?.name || "General",
          className: exam.class?.name || "—",
          studentCount: exam.class?.students.length || 0,
        },
        attempts: scopedAttempts.map((attempt) => ({
          id: attempt.id,
          studentId: attempt.studentId,
          studentName: fullName(attempt.student.user),
          studentCode: attempt.student.studentCode,
          score: attempt.score,
          percent: attempt.score != null && totalMarks > 0 ? round1((Number(attempt.score) / totalMarks) * 100) : null,
          status: attempt.isCompleted ? (attempt.answers.some((answer) => MANUAL_QUESTION_TYPES.has(answer.question.type) && answer.pointsAwarded == null) ? "NEEDS_GRADING" : "GRADED") : "IN_PROGRESS",
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
          securityWarnings: attempt.securityWarnings,
          autoSubmitted: attempt.autoSubmitted,
          integrityEvents: Array.isArray(attempt.integrityEvents) ? attempt.integrityEvents : [],
          answers: attempt.answers.map((answer) => ({
            id: answer.id,
            questionId: answer.questionId,
            questionText: answer.question.text,
            questionType: answer.question.type,
            maxPoints: answer.question.points,
            answerText: answer.answerText,
            isCorrect: answer.isCorrect,
            pointsAwarded: answer.pointsAwarded,
          })),
        })),
      });
    } catch (err) {
      logger.error("Error fetching exam results:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // DEPRECATED: manual grading is now handled by the grading queue + rubric flow
  // (GET /api/grading/queue, POST /api/grading/:attemptId/:questionId, finalize).
  // Retained for backward compatibility; the app UI no longer calls this.
  app.put("/api/exam-attempts/:attemptId/grade", authMiddleware, validate(schemas.examGrade), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { attemptId } = req.params;
    const grades = req.body.answers as Array<{ answerId: string; pointsAwarded: string | number | null; isCorrect?: boolean | null }>;
    try {
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
        select: {
          id: true,
          exam: { select: { classId: true } },
          student: { select: { id: true, studentCode: true } },
          answers: { select: { id: true, maxPoints: true, pointsAwarded: true, question: { select: { id: true, points: true } } } },
        },
      });
      if (!attempt) {
        res.status(404).json({ error: "Attempt not found" });
        return;
      }
      if (!(await canManageExamClass(jwtUser, attempt.exam.classId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const answersById = new Map(attempt.answers.map((answer) => [answer.id, answer]));
      if (grades.some((grade) => !answersById.has(grade.answerId))) {
        res.status(400).json({ error: "One or more answers do not belong to this attempt" });
        return;
      }
      const result = await prisma.$transaction(async (tx) => {
        for (const grade of grades) {
          const existingAnswer = answersById.get(grade.answerId)!;
          const points = grade.pointsAwarded == null ? null : Number(grade.pointsAwarded);
          const maximum = Number(existingAnswer.maxPoints ?? existingAnswer.question.points ?? 0);
          if (points != null && (!Number.isFinite(points) || points < 0 || points > maximum)) {
            throw Object.assign(new Error(`pointsAwarded must be between 0 and ${maximum}`), { http: 400 });
          }
          await tx.examAnswer.update({
            where: { id: grade.answerId },
            data: {
              pointsAwarded: points,
              isCorrect: grade.isCorrect ?? (points != null ? points > 0 : null),
            },
          });
        }
        const refreshed = await tx.examAnswer.findMany({ where: { attemptId } });
        const score = refreshed.reduce((sum, answer) => sum + Number(answer.pointsAwarded || 0), 0);
        return tx.examAttempt.update({
          where: { id: attemptId },
          data: { score: Math.max(0, score), isCompleted: true, state: "FINALIZED", gradingStatus: "COMPLETE", gradedAt: new Date() },
        });
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "GRADE",
        "EXAM_ATTEMPT",
        attemptId,
        `Graded exam attempt for student ${attempt.student.studentCode}.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      // Check badges for exam completion
      checkAndAwardBadges(attempt.student.id, 'EXAM').catch(err =>
        logger.error(`Error checking badges for student ${attempt.student.id}:`, err)
      );

      res.json(result);
    } catch (err: any) {
      logger.error("Error grading exam attempt:", err);
      if (err.http) {
        res.status(err.http).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Users (single + update) ─────────────────────────────────────────────────
  app.get("/api/users/:id", authMiddleware, requirePermission("view_users"), async (req, res) => {
    try {
      // See the cast note near the login route re: stale Prisma types.
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, firstName: true, lastName: true, email: true, username: true, role: true, isActive: true,
          studentProfile: { select: { id: true } },
          teacherProfile: { select: { id: true } },
        },
      } as any);
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      res.json(user);
    } catch (err) {
      logger.error("Error fetching user:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/users/:id", authMiddleware, requirePermission("manage_users"), validate(schemas.userUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { firstName, lastName, email, username, role, status, teacherId, studentId } = req.body;
    const userId = req.params.id;
    if ((teacherId && role && role !== "TEACHER") || (studentId && role && role !== "STUDENT") || (teacherId && studentId)) {
      res.status(400).json({ error: "A profile can only be linked to an account with the matching Teacher or Student role" });
      return;
    }
    try {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true, role: true },
      });
      if (!existing) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const user = await prisma.$transaction(async (tx) => {
        // See the cast note near the login route re: stale Prisma types.
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(email && { email }),
            ...(username !== undefined && { username: username || null }),
            ...(role && { role }),
            ...(status !== undefined && { isActive: status !== "DISABLED" }),
          },
          select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true, isActive: true },
        } as any);

        // If the role changed away from TEACHER/STUDENT, detach profiles that
        // no longer match so the account can't be left as e.g. an ADMIN still
        // linked to a Student record (which also blocks deletion).
        const effectiveRole = role ?? updated.role;
        if (effectiveRole !== "TEACHER" && teacherId === undefined) {
          await tx.teacher.updateMany({ where: { userId }, data: { userId: null } });
        }
        if (effectiveRole !== "STUDENT" && studentId === undefined) {
          await tx.student.updateMany({ where: { userId }, data: { userId: null } });
        }

        // Link / unlink a teacher profile (Teacher.userId is unique).
        if (teacherId !== undefined) {
          await tx.teacher.updateMany({ where: { userId }, data: { userId: null } });
          if (teacherId) {
            const profile = await tx.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
            if (!profile) throw Object.assign(new Error("Teacher profile not found"), { http: 404 });
            if (profile.userId && profile.userId !== userId) {
              throw Object.assign(new Error("That teacher profile is already linked to another account"), { http: 400 });
            }
            await tx.teacher.update({ where: { id: teacherId }, data: { userId } });
          }
        }
        // Link / unlink a student profile (Student.userId is unique).
        if (studentId !== undefined) {
          await tx.student.updateMany({ where: { userId }, data: { userId: null } });
          if (studentId) {
            const profile = await tx.student.findUnique({ where: { id: studentId }, select: { userId: true } });
            if (!profile) throw Object.assign(new Error("Student profile not found"), { http: 404 });
            if (profile.userId && profile.userId !== userId) {
              throw Object.assign(new Error("That student profile is already linked to another account"), { http: 400 });
            }
            await tx.student.update({ where: { id: studentId }, data: { userId } });
          }
        }
        return updated;
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "USER", user.id,
        `User '${existing.firstName} ${existing.lastName}' (${existing.email}) updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(user);
    } catch (err: any) {
      logger.error("Error updating user:", err);
      if (err.http) { res.status(err.http).json({ error: err.message }); return; }
      if (err.code === "P2002") {
        const target = String(err.meta?.target || "");
        res.status(400).json({ error: target.includes("username") ? "Username already in use" : "Email already in use" });
        return;
      }
      if (err.code === "P2025") { res.status(404).json({ error: "User not found" }); return; }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, requirePermission("manage_users"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { studentProfile: true, teacherProfile: true, employeeProfile: true },
      });
      if (!user) { res.status(404).json({ error: "User not found" }); return; }

      if (id === jwtUser.userId) {
        res.status(400).json({ error: "You cannot delete your own account" });
        return;
      }
      // Student/Teacher accounts have their own delete flows (Students /
      // Teachers pages) that also clean up the academic data trail --
      // attendance, grades, class assignments, etc. Deleting the User row
      // straight from here would either fail on that data or, worse, leave
      // it orphaned. Redirect to the right place instead of duplicating (and
      // risking diverging from) that logic here.
      if (user.studentProfile) {
        res.status(400).json({ error: "This account is linked to a student profile. Delete the student from the Students page instead." });
        return;
      }
      if (user.teacherProfile) {
        res.status(400).json({ error: "This account is linked to a teacher profile. Delete the teacher from the Teachers page instead." });
        return;
      }
      if (user.role === "ADMIN" && user.isActive) {
        const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdmins <= 1) {
          res.status(400).json({ error: "Cannot delete the last active administrator." });
          return;
        }
      }

      const label = `${fullName(user)} (${user.email})`;

      await prisma.$transaction(async (tx) => {
        // Employees are only ever soft-deleted (terminated) elsewhere so
        // their payroll/leave history is preserved -- unlink rather than
        // touch the Employee row itself.
        if (user.employeeProfile) {
          await tx.employee.update({ where: { id: user.employeeProfile.id }, data: { userId: null } });
        }
        // Attendance recorded by / case notes authored by this account
        // (e.g. a STAFF/ADMIN user) have required, non-cascading FKs.
        await tx.attendance.deleteMany({ where: { recordedById: id } });
        await tx.caseNote.deleteMany({ where: { createdById: id } });
        // Same chat/messaging/social cleanup as student and teacher deletion.
        await tx.chatMessageReport.deleteMany({ where: { reportedById: id } });
        await tx.chatMessage.deleteMany({ where: { senderId: id } });
        await tx.conversationParticipant.deleteMany({ where: { userId: id } });
        await tx.conversation.deleteMany({ where: { createdById: id } });
        await tx.messageRecipient.deleteMany({ where: { recipientId: id } });
        await tx.message.deleteMany({ where: { senderId: id } });
        await (tx as any).ebookProgress.deleteMany({ where: { userId: id } });
        await (tx as any).ebookHighlight.deleteMany({ where: { userId: id } });

        await tx.user.delete({ where: { id } });
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "USER",
        id,
        `User account ${label} permanently deleted.`,
        req.ip,
        req.headers["user-agent"] || null,
        "WARNING"
      );

      res.json({ message: "User deleted successfully" });
    } catch (err: any) {
      logger.error("Error deleting user:", err);
      if (err.code === "P2003" || err.code === "P2014") {
        res.status(400).json({ error: "This user has related records that couldn't be removed automatically. Please contact support." });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Admin resets a user's password directly to a chosen value.
  app.post("/api/users/:id/reset-password", authMiddleware, requirePermission("reset_passwords"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const newPassword = (req.body?.newPassword ?? "").toString();
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { passwordHash, mustChangePassword: true },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "USER", user.id,
        `Password reset for user '${user.firstName} ${user.lastName}'.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json({ success: true });
    } catch (err: any) {
      logger.error("Error resetting password:", err);
      if (err.code === "P2025") { res.status(404).json({ error: "User not found" }); return; }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teachers (create) ───────────────────────────────────────────────────────
  app.post("/api/teachers", authMiddleware, requirePermission("manage_teachers"), validate(schemas.teacherCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { firstName, lastName, email, phone, gender, address, employmentType, joinedDate, subjects, notes, baseSalary } = req.body;
    if (!firstName || !lastName || !email) {
      res.status(400).json({ error: "firstName, lastName, and email are required" }); return;
    }
    try {
      const subjectList = Array.isArray(subjects)
        ? subjects.map((subject: string) => subject.trim()).filter(Boolean)
        : String(subjects || "").split(",").map((subject) => subject.trim()).filter(Boolean);
      const specialization = subjectList.join(", ");
      // A shareable temporary password the admin hands to the teacher; they must
      // change it on first login (mustChangePassword).
      const tempPassword = `Mrlc-${crypto.randomBytes(4).toString("hex")}`;
      const result = await prisma.$transaction(async (tx) => {
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const user = await tx.user.create({
          data: { firstName, lastName, email: email.toLowerCase(), passwordHash, role: "TEACHER", isActive: true, mustChangePassword: true },
        });
        const teacherCode = `TCH-${Date.now().toString().slice(-6)}`;
        const teacher = await tx.teacher.create({
          data: {
            userId: user.id,
            teacherCode,
            specialization: specialization || null,
            phone: phone || null,
            gender: gender || null,
            address: address || null,
            employmentType: employmentType || "FULL_TIME",
            hireDate: joinedDate ? new Date(joinedDate) : new Date(),
            baseSalary: baseSalary != null ? Number(baseSalary) : 0,
            notes: notes || null,
          },
          include: { user: { select: { firstName: true, lastName: true, email: true, isActive: true } } },
        });
        return teacher;
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "TEACHER", result.id,
        `Teacher '${firstName} ${lastName}' added.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json({ ...result, tempPassword });
    } catch (err: any) {
      logger.error("Error creating teacher:", err);
      if (err.code === "P2002") { res.status(400).json({ error: "Email already exists" }); return; }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Bulk import teachers from parsed CSV rows. Mirrors /api/students/import.
  app.post("/api/teachers/import", authMiddleware, requirePermission("manage_teachers"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) { res.status(400).json({ error: "No rows to import" }); return; }
    if (rows.length > 500) { res.status(400).json({ error: "Too many rows (max 500 per import)" }); return; }

    const s = (v: any) => (v == null ? "" : String(v).trim());
    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];
    const seenEmails = new Set<string>();
    const codeBase = Date.now().toString().slice(-6);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const rowNo = i + 2; // account for the header line
      const firstName = s(r.firstName);
      const lastName = s(r.lastName);
      const email = s(r.email).toLowerCase();

      if (!firstName || !lastName || !email) {
        errors.push({ row: rowNo, message: "firstName, lastName and email are all required" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNo, message: `Invalid email "${email}"` });
        continue;
      }
      if (seenEmails.has(email)) {
        errors.push({ row: rowNo, message: "Duplicate email within the file" });
        continue;
      }

      const subjectList = s(r.subjects).split(",").map((x) => x.trim()).filter(Boolean);
      const employmentType = s(r.employmentType).toUpperCase() || "FULL_TIME";
      if (!["FULL_TIME", "PART_TIME", "VOLUNTEER"].includes(employmentType)) {
        errors.push({ row: rowNo, message: "employmentType must be FULL_TIME, PART_TIME, or VOLUNTEER" });
        continue;
      }
      const joined = s(r.joinedDate);
      const hireDate = joined && !isNaN(Date.parse(joined)) ? new Date(joined) : new Date();
      const baseSalaryRaw = s(r.baseSalary);
      const baseSalary = baseSalaryRaw && !isNaN(Number(baseSalaryRaw)) ? Number(baseSalaryRaw) : 0;

      // Optional per-row password. When supplied it's used as-is (min 6 chars)
      // and the teacher is NOT forced to change it; otherwise a default is set
      // and they must change it at first login.
      const password = s(r.password);
      if (password && password.length < 6) {
        errors.push({ row: rowNo, message: "password must be at least 6 characters" });
        continue;
      }
      const passwordHash = await bcrypt.hash(password || "Teacher123!", 10);
      const mustChangePassword = !password;

      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { firstName, lastName, email, passwordHash, role: "TEACHER", isActive: true, mustChangePassword },
          });
          await tx.teacher.create({
            data: {
              userId: user.id,
              teacherCode: s(r.teacherCode) || `TCH-${codeBase}${String(i).padStart(3, "0")}`,
              specialization: subjectList.join(", ") || null,
              phone: s(r.phone) || null,
              employmentType,
              hireDate,
              baseSalary,
              notes: s(r.notes) || null,
            },
          });
        });
        seenEmails.add(email);
        created.push(email);
      } catch (err: any) {
        errors.push({ row: rowNo, message: err?.code === "P2002" ? "Email or teacherCode already exists" : "Could not create teacher" });
      }
    }

    await createAuditLog(
      jwtUser.userId, jwtUser.email, "IMPORT", "TEACHER", null,
      `Bulk teacher import: ${created.length} created, ${errors.length} skipped.`,
      req.ip, req.headers["user-agent"] || null, errors.length ? "WARNING" : "SUCCESS",
    );
    res.json({ createdCount: created.length, failedCount: errors.length, errors });
  });

  // ── Classes (create) ────────────────────────────────────────────────────────
  app.post("/api/classes", authMiddleware, requirePermission("manage_classes"), validate(schemas.classCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { name, level, academicYear, description, room, capacity, status } = req.body;
    if (!name || !level || !academicYear) {
      res.status(400).json({ error: "name, level, and academicYear are required" }); return;
    }
    try {
      const cls = await prisma.class.create({
        data: {
          name, level, academicYear,
          room: room || null,
          capacity: capacity ? Number(capacity) : null,
          description: description || null,
          status: status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "CLASS", cls.id,
        `Class '${name}' (${level}) created.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(cls);
    } catch (err) {
      logger.error("Error creating class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/classes/:id", authMiddleware, requirePermission("manage_classes"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const { name, level, academicYear, room, capacity, description, status } = req.body || {};
    try {
      const cls = await prisma.class.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(level !== undefined ? { level } : {}),
          ...(academicYear !== undefined ? { academicYear } : {}),
          ...(room !== undefined ? { room: room || null } : {}),
          ...(capacity !== undefined ? { capacity: capacity ? Number(capacity) : null } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(status !== undefined ? { status: status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE" } : {}),
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "CLASS", id,
        `Class '${cls.name}' updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(cls);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Class not found" }); return; }
      logger.error("Error updating class:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Cases (single + notes) ──────────────────────────────────────────────────
  app.get("/api/cases/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "CASE_WORKER") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    try {
      const caseRecord = await prisma.caseRecord.findUnique({
        where: { id: req.params.id },
        include: {
          student: { include: { user: true } },
          notes: { include: { createdBy: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "asc" } },
        },
      });
      if (!caseRecord) { res.status(404).json({ error: "Case not found" }); return; }
      res.json(caseRecord);
    } catch (err) {
      logger.error("Error fetching case:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Delete a case (and its notes via cascade). Admin or case worker only.
  app.delete("/api/cases/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "CASE_WORKER") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    try {
      const existing = await prisma.caseRecord.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Case not found" }); return; }
      await prisma.caseRecord.delete({ where: { id: req.params.id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "CASE", req.params.id,
        `Case '${existing.title}' deleted.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json({ success: true });
    } catch (err: any) {
      logger.error("Error deleting case:", err);
      if (err.code === "P2025") { res.status(404).json({ error: "Case not found" }); return; }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/cases/:id/notes", authMiddleware, validate(schemas.caseNote), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "CASE_WORKER" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }
    try {
      const note = await prisma.caseNote.create({
        data: { content, caseRecordId: req.params.id, createdById: jwtUser.userId },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
      });
      res.status(201).json(note);
    } catch (err: any) {
      logger.error("Error adding case note:", err);
      if (err.code === "P2025") { res.status(404).json({ error: "Case not found" }); return; }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Public branding (no auth) — used by the login screen ─────────────────────
  app.get("/api/public/branding", async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    try {
      const profile = await prisma.schoolProfile.findFirst();
      res.json({
        name: profile?.name || null,
        logoUrl: profile?.logoUrl || null,
        loginHeroUrl: profile?.loginHeroUrl || null,
        primaryColor: profile?.primaryColor || null,
        contactEmail: profile?.contactEmail || null,
        contactPhone: profile?.contactPhone || null,
      });
    } catch (err) {
      logger.error("Error fetching public branding:", err);
      res.json({ name: null, logoUrl: null, loginHeroUrl: null, primaryColor: null, contactEmail: null, contactPhone: null });
    }
  });

  // ── Settings (school profile) ────────────────────────────────────────────────
  app.get("/api/settings", authMiddleware, async (req, res) => {
    try {
      const profile = await prisma.schoolProfile.findFirst();
      res.json(profile || {});
    } catch (err) {
      logger.error("Error fetching settings:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/settings", authMiddleware, requirePermission("manage_settings"), validate(schemas.settingsUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const b = req.body || {};

    // Build an update payload from only the fields actually provided, so the
    // School / Branding / System tabs can each save independently.
    const data: any = {};
    if (b.name) data.name = b.name;
    if (b.shortName !== undefined) data.shortName = b.shortName;
    if (b.address !== undefined) data.address = b.address;
    if (b.email !== undefined) data.contactEmail = b.email;
    if (b.phone !== undefined) data.contactPhone = b.phone;
    if (b.website !== undefined) data.website = b.website;
    if (b.academicYear !== undefined) data.academicYear = b.academicYear;
    if (b.principalName !== undefined) data.principalName = b.principalName;
    if (b.description !== undefined) data.description = b.description;

    // Branding
    if (b.logoUrl !== undefined) data.logoUrl = b.logoUrl;
    if (b.signatureUrl !== undefined) data.signatureUrl = b.signatureUrl;
    if (b.loginHeroUrl !== undefined) data.loginHeroUrl = b.loginHeroUrl;
    if (b.primaryColor !== undefined) data.primaryColor = b.primaryColor;
    if (b.accentColor !== undefined) data.accentColor = b.accentColor;
    if (b.darkModeDefault !== undefined) data.darkModeDefault = parseBoolean(b.darkModeDefault);
    if (b.reportHeaderStyle !== undefined) data.reportHeaderStyle = b.reportHeaderStyle;

    // System / localization
    if (b.timezone !== undefined) data.timezone = b.timezone;
    if (b.dateFormat !== undefined) data.dateFormat = b.dateFormat;
    if (b.timeFormat !== undefined) data.timeFormat = b.timeFormat;
    if (b.clockShowSeconds !== undefined) data.clockShowSeconds = parseBoolean(b.clockShowSeconds);
    if (b.currency !== undefined) data.currency = b.currency;
    if (b.defaultLanguage !== undefined) data.defaultLanguage = b.defaultLanguage;
    if (b.fileUploadLimitMb !== undefined) data.fileUploadLimitMb = Number(b.fileUploadLimitMb);
    if (b.backupEnabled !== undefined) data.backupEnabled = parseBoolean(b.backupEnabled);
    if (b.lockdownBrowserEnabled !== undefined) data.lockdownBrowserEnabled = parseBoolean(b.lockdownBrowserEnabled);
    if (b.lockdownRequireFullscreen !== undefined) data.lockdownRequireFullscreen = parseBoolean(b.lockdownRequireFullscreen);
    if (b.lockdownBlockClipboard !== undefined) data.lockdownBlockClipboard = parseBoolean(b.lockdownBlockClipboard);
    if (b.lockdownBlockContextMenu !== undefined) data.lockdownBlockContextMenu = parseBoolean(b.lockdownBlockContextMenu);
    if (b.lockdownBlockShortcuts !== undefined) data.lockdownBlockShortcuts = parseBoolean(b.lockdownBlockShortcuts);
    if (b.lockdownAutoSubmitOnViolation !== undefined) data.lockdownAutoSubmitOnViolation = parseBoolean(b.lockdownAutoSubmitOnViolation);
    if (b.lockdownMaxWarnings !== undefined) data.lockdownMaxWarnings = Math.max(1, Number(b.lockdownMaxWarnings));
    if (b.lockdownInstructions !== undefined) data.lockdownInstructions = b.lockdownInstructions;
    if (b.cursorEffect !== undefined) data.cursorEffect = b.cursorEffect;

    try {
      const existing = await prisma.schoolProfile.findFirst();
      const profile = existing
        ? await prisma.schoolProfile.update({ where: { id: existing.id }, data })
        : await prisma.schoolProfile.create({ data: { name: data.name || "School", ...data } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "SETTINGS", profile.id,
        "School settings updated.", req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(profile);
    } catch (err) {
      logger.error("Error updating settings:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const uploadBrandingAsset = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    brandingAssetUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Image file must be 5 MB or smaller"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };

  app.post("/api/settings/assets", authMiddleware, requirePermission("manage_settings"), uploadBrandingAsset, async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }
    res.json({ url: `/uploads/branding/${file.filename}` });
  });

  // POST /api/ai/chat — context-aware, read-only AI assistant (Admins/Teachers).
  // Implemented in ./aiAssistant with conversation memory, page context, a
  // role-scoped situation snapshot, and read-only data tools.
  registerAiAssistantRoutes({ app, prisma, authMiddleware, logger });

  // ── Data Export (CSV / JSON) ─────────────────────────────────────────────────
  const toCsv = (rows: Record<string, any>[]): string => {
    if (!rows.length) return "";
    const headers = Array.from(rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()));
    const escape = (val: any) => {
      if (val === null || val === undefined) return "";
      const s = val instanceof Date ? val.toISOString() : String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const row of rows) lines.push(headers.map(h => escape(row[h])).join(","));
    return lines.join("\n");
  };

  const exFullName = (u: any) => `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();

  const exportLoaders: Record<string, () => Promise<Record<string, any>[]>> = {
    students: async () => (await prisma.student.findMany({ include: { user: true, class: true } })).map(s => ({
      studentCode: s.studentCode, firstName: s.user?.firstName ?? "", lastName: s.user?.lastName ?? "",
      email: s.user?.email ?? "", gender: s.gender ?? "", status: s.status ?? "", class: s.class?.name ?? "",
      guardianName: s.guardianName ?? "", guardianPhone: s.guardianPhone ?? "", contactNumber: s.contactNumber ?? "",
      country: s.country ?? "", enrollmentDate: s.enrollmentDate,
    })),
    teachers: async () => (await prisma.teacher.findMany({ include: { user: true } })).map(t => ({
      teacherCode: t.teacherCode, name: exFullName(t.user), email: t.user?.email ?? "",
      specialization: t.specialization ?? "", hireDate: t.hireDate,
    })),
    classes: async () => (await prisma.class.findMany({ include: { students: true } })).map(c => ({
      name: c.name, level: c.level, academicYear: c.academicYear, room: c.room ?? "",
      capacity: c.capacity ?? "", studentCount: c.students.length, createdAt: c.createdAt,
    })),
    attendance: async () => (await prisma.attendance.findMany({ include: { student: { include: { user: true } }, class: true } })).map(a => ({
      date: a.date, status: a.status, student: exFullName(a.student?.user), class: a.class?.name ?? "", remarks: a.remarks ?? "",
    })),
    exams: async () => (await prisma.exam.findMany({ include: { class: true, subject: true } })).map(e => ({
      title: e.title, type: e.type, date: e.date, class: e.class?.name ?? "", subject: e.subject?.name ?? "",
      totalMarks: e.totalMarks ?? "", durationMinutes: e.durationMinutes ?? "",
    })),
    fees: async () => {
      const profile = await prisma.schoolProfile.findFirst();
      const fallbackCurrency = profile?.currency || "MYR";
      return (await prisma.feePayment.findMany({ include: { student: { include: { user: true } } } })).map(f => ({
        receiptNumber: f.receiptNumber ?? "", student: exFullName(f.student?.user), amount: f.amount, currency: f.currency || fallbackCurrency,
        status: f.status, dueDate: f.dueDate, paidDate: f.paidDate ?? "", paymentMethod: f.paymentMethod ?? "", description: f.description ?? "",
      }));
    },
    library: async () => (await prisma.libraryResource.findMany()).map(r => ({
      title: r.title, author: r.author ?? "", isbn: r.isbn ?? "", type: r.type,
      totalCopies: r.totalCopies, availableCopies: r.availableCopies, visibility: r.visibility ?? "",
    })),
    cases: async () => (await prisma.caseRecord.findMany({ include: { student: { include: { user: true } } } })).map(c => ({
      title: c.title, status: c.status, priority: c.priority, category: c.category ?? "",
      student: exFullName(c.student?.user), description: c.description, createdAt: c.createdAt,
    })),
  };

  const loadAllExportData = async () => {
    const entries = await Promise.all(Object.entries(exportLoaders).map(async ([moduleId, loader]) =>
      [moduleId, await loader()] as const));
    return Object.fromEntries(entries) as Record<string, Record<string, any>[]>;
  };

  const runDataBackup = async (format: "json" | "csv"): Promise<BackupArtifact> => {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
    const data = await loadAllExportData();
    if (format === "json") {
      const filePath = path.join(BACKUP_DIR, `mrlc-data-${backupStamp()}.json`);
      const temporaryPath = `${filePath}.writing`;
      try {
        await fs.promises.writeFile(temporaryPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          schema: 1,
          modules: data,
        }, null, 2), { flag: "wx" });
        await fs.promises.rename(temporaryPath, filePath);
      } finally {
        await fs.promises.unlink(temporaryPath).catch(() => {});
      }
      return finalizeBackup(filePath);
    }

    const filePath = path.join(BACKUP_DIR, `mrlc-data-csv-${backupStamp()}.zip`);
    const sources: ZipSource[] = Object.entries(data).map(([moduleId, rows]) => ({
      archivePath: `${moduleId}.csv`,
      content: toCsv(rows),
    }));
    sources.unshift({
      archivePath: "backup-manifest.json",
      content: JSON.stringify({
        createdAt: new Date().toISOString(),
        type: "csv-data-export",
        modules: Object.fromEntries(Object.entries(data).map(([moduleId, rows]) => [moduleId, rows.length])),
      }, null, 2),
    });
    await createZipArtifact(filePath, sources);
    return finalizeBackup(filePath);
  };

  app.get("/api/export/:module", authMiddleware, requirePermission("export_data"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const moduleId = req.params.module;
    const format = (req.query.format === "json" ? "json" : "csv") as "json" | "csv";
    const loader = exportLoaders[moduleId];
    if (!loader) { res.status(404).json({ error: "Unknown export module" }); return; }
    try {
      const rows = await loader();
      await createAuditLog(jwtUser.userId, jwtUser.email, "EXPORT", "DATA", moduleId,
        `Exported ${moduleId} (${rows.length} rows) as ${format.toUpperCase()}.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS");
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${moduleId}-${stamp}.json"`);
        res.send(JSON.stringify(rows, null, 2));
      } else {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${moduleId}-${stamp}.csv"`);
        res.send(toCsv(rows));
      }
    } catch (err) {
      logger.error(`Error exporting ${moduleId}:`, err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

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
    if (ext !== ".cbz" && file.size <= MAX_STORED_EBOOK_BYTES) return { size: file.size, compressed: false };
    const temporaryPath = `${file.path}.compressing${ext}`;
    try {
      if (ext === ".pdf") await compressPdf(file.path, temporaryPath);
      else if (ext === ".epub") await compressEpub(file.path, temporaryPath);
      else await compressCbz(file.path, temporaryPath);

      const compressedSize = (await fs.promises.stat(temporaryPath)).size;
      if (compressedSize >= file.size) {
        throw new Error("Compression did not reduce the file size");
      }
      const storedLimit = ext === ".cbz" ? MAX_STORED_COMIC_BYTES : MAX_STORED_EBOOK_BYTES;
      if (compressedSize > storedLimit) {
        throw new Error(`Compressed file is still ${(compressedSize / (1024 * 1024)).toFixed(1)} MB`);
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
              : `This ${format} is larger than 50 MB and could not be compressed below the limit. ${compressionError?.message || ""}`.trim(),
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

  // ── Backups and verification ─────────────────────────────────────────────────
  app.get("/api/backups", authMiddleware, requirePermission("manage_settings"), async (_req, res) => {
    const settings = await prisma.schoolProfile.findFirst({ select: { backupEnabled: true } }).catch(() => null);
    res.json({
      backups: listBackups(),
      retention: BACKUP_RETENTION,
      enabled: settings?.backupEnabled ?? false,
      backupHour: Number(process.env.BACKUP_HOUR || 2),
      offsiteConfigured: Boolean(OFFSITE_BACKUP_DIR),
    });
  });

  app.post("/api/backups/run", authMiddleware, requirePermission("manage_settings"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const backup = await runBackup();
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "BACKUP", "SYSTEM", null,
        `Manual database backup created (${backup.name}).`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.status(201).json(backup);
    } catch (err: any) {
      logger.error("Manual backup failed:", err);
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "BACKUP", "SYSTEM", null,
        `Database backup failed: ${err.message}`,
        req.ip, req.headers["user-agent"] || null, "DANGER"
      ).catch(() => {});
      res.status(500).json({ error: err.message || "Backup failed" });
    }
  });

  app.post("/api/backups/files", authMiddleware, requirePermission("manage_settings"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const backup = await runFileBackup();
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "BACKUP", "SYSTEM", null,
        `Uploaded-files backup created (${backup.name}).`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.status(201).json(backup);
    } catch (err: any) {
      logger.error("File backup failed:", err);
      res.status(500).json({ error: err.message || "File backup failed" });
    }
  });

  app.post("/api/backups/data", authMiddleware, requirePermission("manage_settings"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const format = req.query.format === "csv" ? "csv" : "json";
    try {
      const backup = await runDataBackup(format);
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "BACKUP", "SYSTEM", null,
        `${format.toUpperCase()} data backup created (${backup.name}).`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      res.status(201).json(backup);
    } catch (err: any) {
      logger.error(`${format.toUpperCase()} data backup failed:`, err);
      res.status(500).json({ error: err.message || "Data backup failed" });
    }
  });

  const verifyDatabaseBackup = (filePath: string): Promise<{ valid: boolean; detail: string }> =>
    new Promise((resolve) => {
      const child = spawn("pg_restore", ["--list", filePath], { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk.toString()}`.slice(-1500); });
      child.on("error", (error) => resolve({ valid: false, detail: `pg_restore could not start: ${error.message}` }));
      child.on("close", (code) => resolve({
        valid: code === 0,
        detail: code === 0 ? "pg_restore successfully read the archive catalog" : `pg_restore exited ${code}: ${stderr.trim()}`,
      }));
    });

  app.post("/api/backups/:name/verify", authMiddleware, requirePermission("manage_settings"), async (req, res) => {
    const name = req.params.name;
    if (!isSafeBackupName(name)) {
      res.status(400).json({ error: "Invalid backup name" });
      return;
    }
    const artifact = listBackups().find((item) => item.name === name);
    if (!artifact) {
      res.status(404).json({ error: "Backup not found" });
      return;
    }
    try {
      const filePath = path.join(BACKUP_DIR, name);
      let result: { valid: boolean; detail: string };
      if (artifact.kind === "database") result = await verifyDatabaseBackup(filePath);
      else if (artifact.kind === "json") {
        const parsed = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
        result = parsed?.schema === 1 && parsed?.modules
          ? { valid: true, detail: "JSON parsed successfully and contains the expected backup structure" }
          : { valid: false, detail: "JSON is readable but does not contain the expected backup structure" };
      } else result = await verifyZipStructure(filePath);
      const jwtUser = (req as any).user as JwtPayload;
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "VERIFY", "BACKUP", name,
        `${result.valid ? "Verified" : "Verification failed for"} ${name}: ${result.detail}`,
        req.ip, req.headers["user-agent"] || null, result.valid ? "SUCCESS" : "DANGER"
      ).catch(() => {});
      res.status(result.valid ? 200 : 422).json(result);
    } catch (err: any) {
      res.status(422).json({ valid: false, detail: err.message || "Backup verification failed" });
    }
  });

  app.get("/api/backups/:name/download", authMiddleware, requirePermission("manage_settings"), async (req, res) => {
    const name = req.params.name;
    if (!isSafeBackupName(name)) {
      res.status(400).json({ error: "Invalid backup name" });
      return;
    }
    const artifact = listBackups().find((item) => item.name === name);
    if (!artifact) {
      res.status(404).json({ error: "Backup not found" });
      return;
    }
    const contentTypes = {
      database: "application/octet-stream",
      files: "application/zip",
      json: "application/json",
      csv: "application/zip",
    } as const;
    res.setHeader("Content-Type", contentTypes[artifact.kind]);
    res.setHeader("Content-Disposition", `attachment; filename="${name.replace(/"/g, "")}"`);
    fs.createReadStream(path.join(BACKUP_DIR, name)).pipe(res);
  });

  // ── Global search (top bar) ──────────────────────────────────────────────────
  app.get("/api/search", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!["ADMIN", "TEACHER", "STAFF"].includes(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) { res.json({ students: [], teachers: [], classes: [] }); return; }
    const contains = { contains: q, mode: "insensitive" as const };
    try {
      const [students, teachers, classes] = await Promise.all([
        prisma.student.findMany({
          where: {
            OR: [
              { studentCode: contains },
              { user: { firstName: contains } },
              { user: { lastName: contains } },
            ],
          },
          include: { user: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } },
          take: 6,
        }),
        prisma.teacher.findMany({
          where: {
            OR: [
              { teacherCode: contains },
              { user: { firstName: contains } },
              { user: { lastName: contains } },
            ],
          },
          include: { user: { select: { firstName: true, lastName: true } } },
          take: 5,
        }),
        prisma.class.findMany({ where: { name: contains }, take: 5 }),
      ]);
      res.json({
        students: students.map((s) => ({
          id: s.id,
          name: `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim() || s.studentCode,
          code: s.studentCode,
          className: s.class?.name ?? null,
        })),
        teachers: teachers.map((t) => ({
          id: t.id,
          name: `${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`.trim() || t.teacherCode,
          code: t.teacherCode,
        })),
        classes: classes.map((c) => ({ id: c.id, name: c.name, level: c.level })),
      });
    } catch (err) {
      logger.error("Search failed:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Health check ────────────────────────────────────────────────────────────
  app.get("/api/health", async (req, res) => {
    try {
      // Verify the database is reachable so orchestrators detect real outages.
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", db: "up", school: "Mon Refugee Learning Centre - GED School" });
    } catch (err) {
      logger.error("Health check failed (database unreachable):", err);
      res.status(503).json({ status: "error", db: "down" });
    }
  });

  app.get("/api/system/health", authMiddleware, requirePermission("manage_settings"), async (_req, res) => {
    const checks: HealthCheckResult[] = [];
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.push({ id: "database", label: "Database", status: "ok", detail: "PostgreSQL query succeeded", required: true });
    } catch (error: any) {
      checks.push({ id: "database", label: "Database", status: "error", detail: error?.message || "Database query failed", required: true });
    }

    const directoryChecks = [
      ["backups", "Local backup storage", BACKUP_DIR],
      ["ebooks", "E-library storage", EBOOK_DIR],
      ["documents", "Student document storage", STUDENT_DOC_DIR],
      ["videos", "Video storage", VIDEO_FILES_DIR],
      ...(OFFSITE_BACKUP_DIR ? [["offsite", "Off-site backup storage", OFFSITE_BACKUP_DIR]] : []),
    ] as string[][];
    checks.push(...await Promise.all(directoryChecks.map(([id, label, directory]) =>
      checkWritableDirectory(id, label, directory))));
    checks.push(...await Promise.all([
      probeCommand("pg_dump", "Database backup utility", "pg_dump", ["--version"], true),
      probeCommand("pg_restore", "Database restore verifier", "pg_restore", ["--version"], true),
      probeCommand("ffmpeg", "Video converter", "ffmpeg", ["-version"], false),
      probeCommand("ffprobe", "Video inspector", "ffprobe", ["-version"], false),
      probeCommand("ghostscript", "PDF compressor", "gs", ["--version"], false),
    ]));
    checks.push({
      id: "portable-cbr",
      label: "Portable CBR reader",
      status: "ok",
      detail: "Bundled WebAssembly RAR fallback is available; bsdtar is optional",
      required: true,
    });
    const queuedEmails = await prisma.emailOutbox.count({ where: { status: { in: ["QUEUED", "SENDING"] } } }).catch(() => 0);
    if (!smtpTransport) {
      checks.push({
        id: "smtp",
        label: "Email delivery",
        status: "warning",
        detail: `SMTP is not configured; ${queuedEmails} email${queuedEmails === 1 ? " is" : "s are"} queued`,
        required: false,
      });
    } else {
      try {
        await smtpTransport.verify();
        checks.push({
          id: "smtp", label: "Email delivery", status: "ok",
          detail: `SMTP connection verified; ${queuedEmails} email${queuedEmails === 1 ? "" : "s"} queued`, required: false,
        });
      } catch (error: any) {
        checks.push({
          id: "smtp", label: "Email delivery", status: "warning",
          detail: `SMTP verification failed: ${String(error?.message || "connection failed").slice(0, 300)}`, required: false,
        });
      }
    }

    const settings = await prisma.schoolProfile.findFirst({ select: { backupEnabled: true } }).catch(() => null);
    const databaseBackup = listBackups().find((artifact) => artifact.kind === "database");
    if (settings?.backupEnabled) {
      const ageHours = databaseBackup
        ? Math.round((Date.now() - new Date(databaseBackup.createdAt).getTime()) / 3_600_000)
        : null;
      checks.push({
        id: "backup-freshness",
        label: "Scheduled backup freshness",
        status: ageHours !== null && ageHours <= 30 ? "ok" : "warning",
        detail: ageHours === null ? "Automatic backups are enabled, but no database backup exists" : `Newest database backup is ${ageHours} hours old`,
        required: false,
      });
    }

    const status = summarizeHealth(checks);
    res.status(status === "error" ? 503 : 200).json({
      status,
      checkedAt: new Date().toISOString(),
      checks,
      backups: {
        total: listBackups().length,
        newestDatabase: databaseBackup?.createdAt || null,
        offsiteConfigured: Boolean(OFFSITE_BACKUP_DIR),
      },
    });
  });

  // ── Reports API (aggregations) ───────────────────────────────────────────────
  const letterGrade = (pct: number): string => {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    return "F";
  };
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
    `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "Unknown";
  const monthRange = (month?: string): { start: Date; end: Date } | null => {
    if (!month) return null;
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return null;
    return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
  };
  const reportRole = (roles: string[]) =>
    (req: express.Request, res: express.Response, next: express.NextFunction): void => {
      const user = (req as any).user as JwtPayload | undefined;
      if (!user || !roles.includes(user.role)) {
        res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        return;
      }
      next();
    };

  // Lightweight KPI summary for the Reports dashboard
  app.get("/api/reports/summary", authMiddleware, reportRole(["ADMIN", "TEACHER", "ACCOUNTANT", "CASE_WORKER"]), async (_req, res) => {
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const [students, classes, exams, openCases, attendance, fees, monthlyFees] = await Promise.all([
        prisma.student.count(),
        prisma.class.count(),
        prisma.exam.count(),
        prisma.caseRecord.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.attendance.findMany({ where: { date: { gte: todayStart, lt: tomorrowStart } }, select: { status: true } }),
        prisma.feePayment.findMany({ select: { amount: true, status: true } }),
        prisma.feePayment.findMany({
          where: { status: "PAID", paidDate: { gte: todayStart, lt: tomorrowStart } },
          select: { amount: true },
        }),
      ]);
      const present = attendance.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
      const paid = fees.filter(f => f.status === "PAID").reduce((sum, f) => sum + f.amount, 0);
      const expected = fees.reduce((sum, f) => sum + f.amount, 0);
      res.json({
        students,
        classes,
        exams,
        openCases,
        attendanceRecords: attendance.length,
        attendanceRate: attendance.length ? Math.round((present / attendance.length) * 100) : null,
        feePayments: fees.length,
        feeCollectionRate: expected ? Math.round((paid / expected) * 100) : null,
        todaysFeeCollection: monthlyFees.reduce((sum, f) => sum + f.amount, 0),
      });
    } catch (err) {
      logger.error("Error building report summary:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Aggregated data for the main School Dashboard
  app.get("/api/dashboard", authMiddleware, reportRole(["ADMIN", "TEACHER", "STAFF", "ACCOUNTANT", "CASE_WORKER"]), async (req, res) => {
    try {
      const role = ((req as any).user as JwtPayload)?.role;
      const canSeeCases = role === "ADMIN" || role === "CASE_WORKER";
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];

      const [students, classes, openCases, todayAttendance, announcements, todaySchedule, recentCases] = await Promise.all([
        prisma.student.count(),
        prisma.class.count(),
        prisma.caseRecord.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.attendance.findMany({ where: { date: { gte: todayStart, lt: tomorrowStart } }, select: { status: true } }),
        prisma.announcement.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
          take: 3,
        }),
        prisma.timetableEntry.findMany({ where: { dayOfWeek: dayName }, orderBy: { startTime: "asc" } }),
        canSeeCases
          ? prisma.caseRecord.findMany({
              orderBy: { createdAt: "desc" },
              take: 5,
              include: { student: { include: { user: true } } },
            })
          : Promise.resolve([] as any[]),
      ]);

      const presentCount = todayAttendance.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
      const attendanceRate = todayAttendance.length > 0
        ? Math.round((presentCount / todayAttendance.length) * 100)
        : null;

      res.json({
        stats: { students, classes, openCases, attendanceRate, attendanceRecords: todayAttendance.length },
        announcements: announcements.map(a => ({
          id: a.id, title: a.title, category: a.audience, pinned: a.pinned,
          date: a.createdAt,
        })),
        schedule: todaySchedule.map(t => ({
          time: t.startTime, subject: t.subjectName || "—", subjectColor: t.subjectColor || "bg-blue-500",
          class: t.className || "—", teacher: t.teacherName || "—", room: t.room || "—",
        })),
        recentCases: recentCases.map(c => ({
          id: c.id,
          name: c.student?.user ? `${c.student.user.firstName ?? ""} ${c.student.user.lastName ?? ""}`.trim() : "Unknown",
          detail: c.title,
          status: c.status,
          time: c.createdAt,
        })),
      });
    } catch (err) {
      logger.error("Error building dashboard:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Attendance report: per-student rates for a class/month
  app.get("/api/reports/attendance", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId, month } = req.query as { classId?: string; month?: string };
    try {
      const where: any = {};

      // For teachers, scope to their classes unless they're admins
      if (jwtUser.role === "TEACHER") {
        const teacherClassIds = await getTeacherClassIds(jwtUser.userId);
        if (classId && classId !== "all") {
          // Verify teacher has access to requested class
          if (!teacherClassIds.includes(classId)) {
            res.status(403).json({ error: "Forbidden: Not your class" });
            return;
          }
          where.classId = classId;
        } else {
          // Scope to all teacher's classes
          where.classId = { in: teacherClassIds };
        }
      } else if (classId && classId !== "all") {
        where.classId = classId;
      }

      const range = monthRange(month);
      if (range) where.date = { gte: range.start, lt: range.end };

      const records = await prisma.attendance.findMany({
        where,
        include: { student: { include: { user: true } } },
      });

      const map = new Map<string, any>();
      for (const r of records) {
        if (!map.has(r.studentId)) {
          map.set(r.studentId, {
            studentId: r.studentId,
            name: fullName(r.student.user),
            code: r.student.studentCode,
            total: 0, present: 0, absent: 0, late: 0, excused: 0,
          });
        }
        const row = map.get(r.studentId);
        row.total += 1;
        if (r.status === "PRESENT") row.present += 1;
        else if (r.status === "ABSENT") row.absent += 1;
        else if (r.status === "LATE") row.late += 1;
        else if (r.status === "EXCUSED") row.excused += 1;
      }

      const rows = Array.from(map.values())
        .map((r) => ({ ...r, rate: r.total ? round1((r.present / r.total) * 100) : 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const classAverage = rows.length ? round1(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0;
      res.json({
        rows,
        classAverage,
        perfectCount: rows.filter((r) => r.rate === 100).length,
        atRiskCount: rows.filter((r) => r.rate < 80).length,
      });
    } catch (err) {
      logger.error("Error building attendance report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Session-based attendance report: per-student, per-subject attendance
  app.get("/api/reports/session-attendance", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId, subjectId, month, startDate, endDate } = req.query as {
      classId?: string;
      subjectId?: string;
      month?: string;
      startDate?: string;
      endDate?: string;
    };

    try {
      const where: any = { timetableEntryId: { not: null } }; // Only session-based attendance

      // For teachers, scope to their sessions
      if (jwtUser.role === "TEACHER") {
        const teacherRecord = await prisma.teacher.findUnique({
          where: { userId: jwtUser.userId },
          select: { id: true }
        });

        if (!teacherRecord) {
          res.status(403).json({ error: "Forbidden: Teacher record not found" });
          return;
        }

        // Get timetable entries where this teacher is assigned
        const teacherSessions = await prisma.timetableEntry.findMany({
          where: {
            OR: [
              { teacherId: teacherRecord.id },
              { substituteTeacherId: teacherRecord.id }
            ],
            status: "ACTIVE"
          },
          select: { id: true, classId: true, subjectId: true }
        });

        if (classId && classId !== "all") {
          // Verify teacher has access to requested class via sessions
          const hasAccess = teacherSessions.some(s => s.classId === classId);
          if (!hasAccess) {
            res.status(403).json({ error: "Forbidden: No sessions for this class" });
            return;
          }
        }

        let filteredSessions = teacherSessions;
        if (classId && classId !== "all") {
          filteredSessions = filteredSessions.filter(s => s.classId === classId);
        }
        if (subjectId && subjectId !== "all") {
          filteredSessions = filteredSessions.filter(s => s.subjectId === subjectId);
        }

        where.timetableEntryId = { in: filteredSessions.map(s => s.id) };
      } else {
        // Admin can filter by class and/or subject
        const sessionFilters: any = { status: "ACTIVE" };
        if (classId && classId !== "all") {
          sessionFilters.classId = classId;
        }
        if (subjectId && subjectId !== "all") {
          sessionFilters.subjectId = subjectId;
        }

        if ((classId && classId !== "all") || (subjectId && subjectId !== "all")) {
          const classOrSubjectSessions = await prisma.timetableEntry.findMany({
            where: sessionFilters,
            select: { id: true }
          });
          where.timetableEntryId = { in: classOrSubjectSessions.map(s => s.id) };
        }
      }

      // Date range filtering
      if (month) {
        const range = monthRange(month);
        if (range) where.date = { gte: range.start, lt: range.end };
      } else if (startDate && endDate) {
        where.date = { gte: new Date(startDate), lte: new Date(endDate) };
      }

      const records = await prisma.attendance.findMany({
        where,
        include: {
          student: { include: { user: true, class: true } },
          timetableEntry: {
            select: {
              subjectId: true,
              subjectName: true,
              subjectColor: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true
            }
          }
        },
      });

      // Group by student and subject
      const studentSubjectMap = new Map<string, Map<string, any>>();

      for (const r of records) {
        if (!r.timetableEntry) continue;

        const studentKey = r.studentId;
        const subjectKey = r.timetableEntry.subjectId || "UNKNOWN";

        if (!studentSubjectMap.has(studentKey)) {
          studentSubjectMap.set(studentKey, new Map());
        }

        const subjectMap = studentSubjectMap.get(studentKey)!;

        if (!subjectMap.has(subjectKey)) {
          subjectMap.set(subjectKey, {
            studentId: r.studentId,
            studentName: fullName(r.student.user),
            studentCode: r.student.studentCode,
            className: r.student.class?.name || "N/A",
            subjectId: r.timetableEntry.subjectId,
            subjectName: r.timetableEntry.subjectName || "Unknown",
            subjectColor: r.timetableEntry.subjectColor || "bg-gray-500",
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          });
        }

        const row = subjectMap.get(subjectKey)!;
        row.total += 1;
        if (r.status === "PRESENT") row.present += 1;
        else if (r.status === "ABSENT") row.absent += 1;
        else if (r.status === "LATE") row.late += 1;
        else if (r.status === "EXCUSED") row.excused += 1;
      }

      // Flatten to array and calculate rates
      const rows: any[] = [];
      for (const [_, subjectMap] of studentSubjectMap) {
        for (const [_, row] of subjectMap) {
          rows.push({
            ...row,
            rate: row.total ? round1((row.present / row.total) * 100) : 0
          });
        }
      }

      rows.sort((a, b) => a.studentName.localeCompare(b.studentName));

      // Calculate subject-level aggregates
      const subjectStats = new Map<string, any>();
      for (const row of rows) {
        const key = row.subjectId || "UNKNOWN";
        if (!subjectStats.has(key)) {
          subjectStats.set(key, {
            subjectId: row.subjectId,
            subjectName: row.subjectName,
            subjectColor: row.subjectColor,
            totalStudents: 0,
            avgRate: 0,
            totalSessions: 0
          });
        }
        const stat = subjectStats.get(key)!;
        stat.totalStudents += 1;
        stat.avgRate += row.rate;
        stat.totalSessions += row.total;
      }

      const subjectStatsArray = Array.from(subjectStats.values()).map(s => ({
        ...s,
        avgRate: s.totalStudents ? round1(s.avgRate / s.totalStudents) : 0
      }));

      // Overall stats
      const overallRate = rows.length ? round1(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0;
      const totalRecords = rows.reduce((a, r) => a + r.total, 0);

      res.json({
        rows,
        subjectStats: subjectStatsArray,
        overall: {
          totalRecords,
          overallRate,
          studentSubjectPairs: rows.length,
          perfectCount: rows.filter(r => r.rate === 100).length,
          atRiskCount: rows.filter(r => r.rate < 80).length
        }
      });
    } catch (err) {
      logger.error("Error building session attendance report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Attendance analytics: overall statistics by subject/teacher
  app.get("/api/analytics/attendance", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { startDate, endDate, groupBy } = req.query as {
      startDate?: string;
      endDate?: string;
      groupBy?: "subject" | "teacher" | "both";
    };

    try {
      // Default to current month if no dates provided
      const defaultRange = monthRange(new Date().toISOString().slice(0, 7));
      const start = startDate ? new Date(startDate) : defaultRange?.start || new Date();
      const end = endDate ? new Date(endDate) : defaultRange?.end || new Date();

      const where: any = {
        date: { gte: start, lte: end }
      };

      // For teachers, scope to their data
      let teacherId: string | null = null;
      if (jwtUser.role === "TEACHER") {
        const teacherRecord = await prisma.teacher.findUnique({
          where: { userId: jwtUser.userId },
          select: { id: true }
        });

        if (!teacherRecord) {
          res.status(403).json({ error: "Forbidden: Teacher record not found" });
          return;
        }
        teacherId = teacherRecord.id;

        // Get teacher's sessions
        const teacherSessions = await prisma.timetableEntry.findMany({
          where: {
            OR: [
              { teacherId: teacherId },
              { substituteTeacherId: teacherId }
            ],
            status: "ACTIVE"
          },
          select: { id: true, subjectId: true }
        });

        where.timetableEntryId = { in: teacherSessions.map(s => s.id) };
      }

      const records = await prisma.attendance.findMany({
        where,
        include: {
          timetableEntry: {
            select: {
              subjectId: true,
              subjectName: true,
              subjectColor: true,
              teacherId: true,
              teacherName: true
            }
          }
        }
      });

      // Build analytics
      const bySubject = new Map<string, any>();
      const byTeacher = new Map<string, any>();

      for (const r of records) {
        // Daily (class-based) attendance has no timetable entry — count it under
        // a pseudo-subject so schools using daily attendance still see analytics.
        const te = r.timetableEntry;

        // By subject
        const subjKey = te ? (te.subjectId || "UNKNOWN") : "DAILY";
        if (!bySubject.has(subjKey)) {
          bySubject.set(subjKey, {
            subjectId: te?.subjectId ?? null,
            subjectName: te ? (te.subjectName || "Unknown") : "Daily Attendance",
            subjectColor: te ? (te.subjectColor || "bg-gray-500") : "bg-slate-500",
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            uniqueStudents: new Set()
          });
        }
        const subj = bySubject.get(subjKey)!;
        subj.total += 1;
        subj.uniqueStudents.add(r.studentId);
        if (r.status === "PRESENT") subj.present += 1;
        else if (r.status === "ABSENT") subj.absent += 1;
        else if (r.status === "LATE") subj.late += 1;
        else if (r.status === "EXCUSED") subj.excused += 1;

        // By teacher (if available and admin is viewing)
        if (jwtUser.role === "ADMIN" && te?.teacherId) {
          const teacherKey = te.teacherId;
          if (!byTeacher.has(teacherKey)) {
            byTeacher.set(teacherKey, {
              teacherId: te.teacherId,
              teacherName: te.teacherName || "Unknown",
              total: 0,
              present: 0,
              absent: 0,
              late: 0,
              excused: 0
            });
          }
          const teach = byTeacher.get(teacherKey)!;
          teach.total += 1;
          if (r.status === "PRESENT") teach.present += 1;
          else if (r.status === "ABSENT") teach.absent += 1;
          else if (r.status === "LATE") teach.late += 1;
          else if (r.status === "EXCUSED") teach.excused += 1;
        }
      }

      // Convert Sets to counts and calculate rates
      const subjectStats = Array.from(bySubject.values()).map(s => ({
        ...s,
        uniqueStudents: s.uniqueStudents.size,
        rate: s.total ? round1((s.present / s.total) * 100) : 0
      }));

      const teacherStats = Array.from(byTeacher.values()).map(t => ({
        ...t,
        rate: t.total ? round1((t.present / t.total) * 100) : 0
      }));

      // Overall stats
      const totalRecords = records.length;
      const overallPresent = records.filter(r => r.status === "PRESENT").length;
      const overallAbsent = records.filter(r => r.status === "ABSENT").length;
      const overallLate = records.filter(r => r.status === "LATE").length;
      const overallExcused = records.filter(r => r.status === "EXCUSED").length;
      const overallRate = totalRecords ? round1((overallPresent / totalRecords) * 100) : 0;

      res.json({
        period: { start, end },
        overall: {
          totalRecords,
          present: overallPresent,
          absent: overallAbsent,
          late: overallLate,
          excused: overallExcused,
          rate: overallRate
        },
        bySubject: jwtUser.role === "ADMIN" || groupBy === "subject" || groupBy === "both" ? subjectStats : undefined,
        byTeacher: jwtUser.role === "ADMIN" && (groupBy === "teacher" || groupBy === "both") ? teacherStats : undefined
      });
    } catch (err) {
      logger.error("Error building attendance analytics:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fees report: per-student expected/paid/balance + totals
  app.get("/api/reports/fees", authMiddleware, reportRole(["ADMIN", "ACCOUNTANT"]), async (req, res) => {
    const { classId, status, month: requestedMonth } = req.query as { classId?: string; status?: string; month?: string };
    try {
      // Same combined source as GET /api/fees: structured FeeAssignment
      // obligations (which stay unpaid until actually paid) plus ad-hoc
      // FeePayment records with no assignment. This used to only look at
      // FeePayment, which meant an assigned-but-unpaid fee never showed up
      // here at all -- "expected" was silently reconstructed from whatever
      // had already been paid, so this report could never show a real
      // outstanding balance.
      const month = requestedMonth == null || requestedMonth === "all" ? undefined : normalizeFeeMonth(requestedMonth);
      if (requestedMonth != null && requestedMonth !== "all" && !month) {
        res.status(400).json({ error: "month must use YYYY-MM format" });
        return;
      }
      const overview = await buildStudentFeeOverview(month ? { month } : {});
      const profile = await prisma.schoolProfile.findFirst();

      let rows = overview
        .filter((r) => !classId || classId === "all" || r.student.classId === classId)
        .map((r) => ({
          studentName: fullName(r.student.user),
          className: r.student.class?.name || "Unassigned",
          expected: r.expected,
          paid: r.paid,
          balance: r.balance,
          status: r.status,
        }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName));

      if (status && status !== "all") rows = rows.filter((r) => r.status === status);

      const totalExpected = rows.reduce((a, r) => a + r.expected, 0);
      const totalCollected = rows.reduce((a, r) => a + r.paid, 0);
      res.json({
        rows,
        totalExpected,
        totalCollected,
        outstanding: totalExpected - totalCollected,
        currency: profile?.currency || "MYR",
      });
    } catch (err) {
      logger.error("Error building fees report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Exam results: per-student subject averages for a class
  app.get("/api/reports/exams", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId } = req.query as { classId?: string };
    try {
      const where: any = {};

      // For teachers, scope to their classes unless they're admins
      if (jwtUser.role === "TEACHER") {
        const teacherClassIds = await getTeacherClassIds(jwtUser.userId);
        if (classId && classId !== "all") {
          // Verify teacher has access to requested class
          if (!teacherClassIds.includes(classId)) {
            res.status(403).json({ error: "Forbidden: Not your class" });
            return;
          }
          where.classId = classId;
        } else {
          // Scope to all teacher's classes
          where.classId = { in: teacherClassIds };
        }
      } else if (classId && classId !== "all") {
        where.classId = classId;
      }
      const exams = await prisma.exam.findMany({
        where,
        include: { subject: true, attempts: { include: { student: { include: { user: true } } } } },
      });

      const subjectSet = new Set<string>();
      const students = new Map<string, { name: string; subj: Map<string, number[]> }>();
      for (const e of exams) {
        const subj = e.subject?.name || "General";
        subjectSet.add(subj);
        const tm = e.totalMarks || 100;
        for (const at of e.attempts) {
          if (at.score == null) continue;
          if (!students.has(at.studentId)) students.set(at.studentId, { name: fullName(at.student.user), subj: new Map() });
          const rec = students.get(at.studentId)!;
          if (!rec.subj.has(subj)) rec.subj.set(subj, []);
          rec.subj.get(subj)!.push((at.score / tm) * 100);
        }
      }

      const rows = Array.from(students.values()).map((s) => {
        const scores: Record<string, number> = {};
        const all: number[] = [];
        for (const [subj, arr] of s.subj) {
          scores[subj] = round1(arr.reduce((a, b) => a + b, 0) / arr.length);
          all.push(...arr);
        }
        const average = all.length ? round1(all.reduce((a, b) => a + b, 0) / all.length) : 0;
        return { studentName: s.name, scores, average, grade: letterGrade(average) };
      }).sort((a, b) => a.studentName.localeCompare(b.studentName));

      res.json({ subjects: Array.from(subjectSet).sort(), rows });
    } catch (err) {
      logger.error("Error building exam results report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Class performance: subject averages per class + school averages
  app.get("/api/reports/classes", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (_req, res) => {
    try {
      const classes = await prisma.class.findMany({
        include: { students: true, exams: { include: { subject: true, attempts: true } } },
      });

      const subjectSet = new Set<string>();
      const rows = classes.map((c) => {
        const subjMap = new Map<string, number[]>();
        for (const e of c.exams) {
          const subj = e.subject?.name || "General";
          subjectSet.add(subj);
          const tm = e.totalMarks || 100;
          for (const at of e.attempts) {
            if (at.score == null) continue;
            if (!subjMap.has(subj)) subjMap.set(subj, []);
            subjMap.get(subj)!.push((at.score / tm) * 100);
          }
        }
        const subjectAverages: Record<string, number> = {};
        const all: number[] = [];
        for (const [subj, arr] of subjMap) {
          subjectAverages[subj] = round1(arr.reduce((a, b) => a + b, 0) / arr.length);
          all.push(...arr);
        }
        return {
          className: c.name,
          totalStudents: c.students.length,
          subjectAverages,
          overall: all.length ? round1(all.reduce((a, b) => a + b, 0) / all.length) : 0,
        };
      }).sort((a, b) => a.className.localeCompare(b.className));

      const subjects = Array.from(subjectSet).sort();
      const schoolAverages: Record<string, number> = {};
      for (const subj of subjects) {
        const vals = rows.map((r) => r.subjectAverages[subj]).filter((v) => v != null) as number[];
        schoolAverages[subj] = vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      }
      const overalls = rows.map((r) => r.overall).filter((v) => v > 0);
      const schoolOverall = overalls.length ? round1(overalls.reduce((a, b) => a + b, 0) / overalls.length) : 0;

      res.json({ subjects, rows, schoolAverages, schoolOverall });
    } catch (err) {
      logger.error("Error building class performance report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Monthly summary: KPIs + case breakdown
  app.get("/api/reports/monthly-summary", authMiddleware, reportRole(["ADMIN"]), async (req, res) => {
    const { month } = req.query as { month?: string };
    try {
      const range = monthRange(month);
      const [activeStudents, activeTeachers, openCases, profile, cases] = await Promise.all([
        prisma.student.count({ where: { status: "ACTIVE" } }),
        prisma.teacher.count(),
        prisma.caseRecord.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.schoolProfile.findFirst(),
        prisma.caseRecord.findMany(),
      ]);

      const attWhere: any = {};
      if (range) attWhere.date = { gte: range.start, lt: range.end };
      const att = await prisma.attendance.findMany({ where: attWhere });
      const avgAttendance = att.length ? round1((att.filter((a) => a.status === "PRESENT").length / att.length) * 100) : 0;

      const feeWhere: any = { status: "PAID" };
      if (range) feeWhere.paidDate = { gte: range.start, lt: range.end };
      const paidFees = await prisma.feePayment.findMany({ where: feeWhere });
      const feeCollection = paidFees.reduce((a, f) => a + f.amount, 0);

      const catMap = new Map<string, any>();
      for (const c of cases) {
        const cat = c.category || "General";
        if (!catMap.has(cat)) catMap.set(cat, { category: cat, newCases: 0, resolved: 0, open: 0 });
        const row = catMap.get(cat);
        if (!range || (c.createdAt >= range.start && c.createdAt < range.end)) row.newCases += 1;
        if (c.status === "RESOLVED" || c.status === "CLOSED") row.resolved += 1;
        if (c.status === "OPEN" || c.status === "IN_PROGRESS") row.open += 1;
      }

      res.json({
        activeStudents,
        activeTeachers,
        avgAttendance,
        openCases,
        feeCollection,
        currency: profile?.currency || "MYR",
        casesByCategory: Array.from(catMap.values()),
      });
    } catch (err) {
      logger.error("Error building monthly summary report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Student profile export for a class
  app.get("/api/reports/students", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId } = req.query as { classId?: string };
    try {
      const where: any = {};

      // For teachers, scope to their classes unless they're admins
      if (jwtUser.role === "TEACHER") {
        const teacherClassIds = await getTeacherClassIds(jwtUser.userId);
        if (classId && classId !== "all") {
          // Verify teacher has access to requested class
          if (!teacherClassIds.includes(classId)) {
            res.status(403).json({ error: "Forbidden: Not your class" });
            return;
          }
          where.classId = classId;
        } else {
          // Scope to all teacher's classes
          where.classId = { in: teacherClassIds };
        }
      } else if (classId && classId !== "all") {
        where.classId = classId;
      }
      const students = await prisma.student.findMany({ where, include: { user: true, class: true } });
      const rows = students.map((s) => ({
        code: s.studentCode,
        name: fullName(s.user),
        gender: s.gender || "—",
        country: s.country || "—",
        identityType: s.identityType || "",
        identityNumber: s.identityNumber || "",
        contactNumber: s.contactNumber || "",
        dob: s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : "—",
        guardianName: s.guardianName || "—",
        guardianPhone: s.guardianPhone || "—",
        className: s.class?.name || "Unassigned",
      })).sort((a, b) => a.name.localeCompare(b.name));
      res.json({ rows });
    } catch (err) {
      logger.error("Error building student profile report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Student portal API (scoped to the signed-in student) ─────────────────────
  const getStudentForReq = async (req: express.Request) => {
    const jwtUser = (req as any).user as JwtPayload;
    return prisma.student.findUnique({
      where: { userId: jwtUser.userId },
      include: { user: true, class: true },
    });
  };
  const studentOnly = reportRole(["STUDENT", "ADMIN"]);

  app.get("/api/student/profile", authMiddleware, studentOnly, async (req, res) => {
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const profile = await prisma.schoolProfile.findFirst();
      const att = await prisma.attendance.findMany({ where: { studentId: s.id } });
      const present = att.filter((a) => a.status === "PRESENT").length;
      res.json({
        name: fullName(s.user),
        studentId: s.studentCode,
        role: "Student",
        profilePhotoUrl: s.profilePhotoUrl || s.user?.profilePhotoUrl || null,
        status: s.status || "ACTIVE",
        class: s.class?.name || "Unassigned",
        email: s.user?.email || "",
        phone: s.contactNumber || s.guardianPhone || "",
        address: s.address || "",
        birthDate: s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : "—",
        gender: s.gender || "—",
        enrollmentDate: s.enrollmentDate ? s.enrollmentDate.toISOString().slice(0, 10) : "—",
        guardian: { name: s.guardianName || "—", relationship: "Guardian", phone: s.guardianPhone || "—", email: "" },
        attendanceRate: att.length ? round1((present / att.length) * 100) : 0,
        academicYear: s.class?.academicYear || "",
      });
    } catch (err) {
      logger.error("Error building student profile:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/student/attendance", authMiddleware, studentOnly, async (req, res) => {
    const { month } = req.query as { month?: string };
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const where: any = { studentId: s.id };
      const range = monthRange(month);
      if (range) where.date = { gte: range.start, lt: range.end };
      const att = await prisma.attendance.findMany({
        where, include: { class: true }, orderBy: { date: "desc" },
      });
      const records = att.map((a) => ({
        id: a.id,
        date: a.date.toISOString().slice(0, 10),
        status: a.status,
        subject: a.class?.name || "Class",
        time: "",
        remarks: a.remarks || "",
      }));
      const present = att.filter((a) => a.status === "PRESENT").length;
      const absent = att.filter((a) => a.status === "ABSENT").length;
      const late = att.filter((a) => a.status === "LATE").length;
      res.json({
        records,
        summary: {
          total: att.length, present, absent, late,
          percentage: att.length ? round1((present / att.length) * 100) : 0,
        },
      });
    } catch (err) {
      logger.error("Error building student attendance:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Whether a student may see their result yet, per the exam's ExamResultPolicy.
  // Mirrors the gating in GET /api/attempts/:attemptId/result so the result
  // lists never reveal a score the result view itself would withhold.
  function isResultReleased(attempt: any, policy: any): boolean {
    const mode = policy?.releaseMode || "IMMEDIATE";
    if (mode === "IMMEDIATE") return ["SUBMITTED", "AUTO_SUBMITTED", "FINALIZED", "RELEASED"].includes(attempt.state);
    if (mode === "SCHEDULED") return !!(policy?.releaseAt && attempt.isCompleted && Date.now() >= new Date(policy.releaseAt).getTime());
    if (mode === "AFTER_GRADING") return ["FINALIZED", "RELEASED"].includes(attempt.state);
    return false; // HIDDEN or unknown
  }

  app.get("/api/student/exams", authMiddleware, studentOnly, async (req, res) => {
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const assignedRows = await prisma.examAssignment.findMany({
        where: { studentId: s.id },
        include: {
          exam: {
            include: {
              subject: true,
              questions: { select: { id: true } },
              attempts: { where: { studentId: s.id }, orderBy: { attemptNumber: "desc" } },
              resultPolicy: true,
              _count: { select: { assignments: true } },
            },
          },
        },
      }).catch(() => []);
      const assignedExamIds = new Set(assignedRows.map((row: any) => row.examId));
      const classExams = s.classId
        ? await prisma.exam.findMany({
            where: { classId: s.classId, status: { not: "ARCHIVED" } },
            include: {
              subject: true,
              questions: { select: { id: true } },
              attempts: { where: { studentId: s.id }, orderBy: { attemptNumber: "desc" } },
              resultPolicy: true,
              _count: { select: { assignments: true } },
            },
            orderBy: { date: "asc" },
          })
        : [];
      const seen = new Set<string>();
      const exams = [...assignedRows.map((row: any) => row.exam).filter(Boolean), ...classExams]
        .filter((exam: any) => {
          if (seen.has(exam.id)) return false;
          seen.add(exam.id);
          return (exam._count?.assignments || 0) === 0 || assignedExamIds.has(exam.id);
        });
      const now = Date.now();
      const available: any[] = [];
      const submitted: any[] = [];
      for (const e of exams) {
        const attempt = e.attempts[0];
        if (attempt && attempt.isCompleted) {
          const released = isResultReleased(attempt, e.resultPolicy);
          const showScore = e.resultPolicy?.showScore !== false;
          const scoreVisible = released && showScore && attempt.score != null && e.totalMarks;
          submitted.push({
            id: e.id, attemptId: attempt.id, title: e.title, subject: e.subject?.name || "General",
            submittedAt: (attempt.completedAt || attempt.startedAt)?.toISOString().slice(0, 16).replace("T", " "),
            status: !released ? "Submitted" : (attempt.score != null ? "Graded" : "Grading"),
            score: scoreVisible ? `${attempt.score}/${e.totalMarks}` : null,
          });
        } else if (["PUBLISHED", "ACTIVE", "SCHEDULED"].includes(e.status)) {
          // Skip exams whose window has fully closed and can't be late-started.
          if (e.availableUntil && now > new Date(e.availableUntil).getTime() && !e.allowLateStart) continue;
          // Show the real close date when scheduled; otherwise there is no deadline.
          const deadline = e.availableUntil
            ? new Date(e.availableUntil).toISOString().slice(0, 10)
            : "No deadline";
          const opensAt = e.availableFrom && now < new Date(e.availableFrom).getTime()
            ? new Date(e.availableFrom).toISOString().slice(0, 10)
            : null;
          available.push({
            id: e.id, title: e.title, subject: e.subject?.name || "General",
            duration: e.durationMinutes ? `${e.durationMinutes} mins` : "—",
            questions: e.questions.length,
            deadline,
            opensAt, // non-null when the exam hasn't opened yet
            type: e.type,
          });
        }
      }
      res.json({ available, submitted });
    } catch (err) {
      logger.error("Error building student exams:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/student/results", authMiddleware, studentOnly, async (req, res) => {
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const attempts = await prisma.examAttempt.findMany({
        where: { studentId: s.id, isCompleted: true, score: { not: null } },
        include: { exam: { include: { subject: true, attempts: true, resultPolicy: true } } },
        orderBy: { completedAt: "desc" },
      });
      // Only surface results the exam's release policy has actually released.
      const releasedAttempts = attempts.filter(
        (a) => isResultReleased(a, a.exam.resultPolicy) && a.exam.resultPolicy?.showScore !== false,
      );
      const results = releasedAttempts.map((a) => {
        const total = a.exam.totalMarks || 100;
        const others = a.exam.attempts.filter((x) => x.score != null);
        const classAverage = others.length
          ? round1(others.reduce((acc, x) => acc + ((x.score! / total) * 100), 0) / others.length)
          : 0;
        const pct = round1(((a.score || 0) / total) * 100);
        return {
          id: a.id, title: a.exam.title, subject: a.exam.subject?.name || "General",
          score: a.score, total, grade: letterGrade(pct),
          date: (a.completedAt || a.createdAt).toISOString().slice(0, 10),
          classAverage, feedback: "",
        };
      });
      const average = results.length
        ? round1(results.reduce((acc, r) => acc + ((r.score || 0) / r.total) * 100, 0) / results.length)
        : 0;
      res.json({ average, gpa: round1((average / 100) * 4), credits: results.length, results });
    } catch (err) {
      logger.error("Error building student results:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/student/dashboard", authMiddleware, studentOnly, async (req, res) => {
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const profile = await prisma.schoolProfile.findFirst();
      const [att, attempts, fees, classmates, readiness] = await Promise.all([
        prisma.attendance.findMany({ where: { studentId: s.id } }),
        prisma.examAttempt.findMany({ where: { studentId: s.id, isCompleted: true }, include: { exam: { include: { subject: true, resultPolicy: true } } }, orderBy: { completedAt: "desc" } }),
        prisma.feePayment.findMany({ where: { studentId: s.id } }),
        s.classId ? prisma.student.count({ where: { classId: s.classId } }) : Promise.resolve(0),
        prisma.gedReadiness.findMany({ where: { studentId: s.id } }),
      ]);
      const present = att.filter((a) => a.status === "PRESENT").length;
      const attendanceRate = att.length ? round1((present / att.length) * 100) : 0;
      const readinessBySubject: Record<string, any> = {};
      for (const r of readiness) readinessBySubject[r.subject] = { status: r.status };
      const graded = attempts.filter((a) => a.score != null && isResultReleased(a, a.exam.resultPolicy) && a.exam.resultPolicy?.showScore !== false);
      const examAverage = graded.length
        ? round1(graded.reduce((acc, a) => acc + ((a.score! / (a.exam.totalMarks || 100)) * 100), 0) / graded.length)
        : 0;
      const billed = fees.reduce((acc, f) => acc + f.amount, 0);
      const paid = fees.filter((f) => f.status === "PAID").reduce((acc, f) => acc + f.amount, 0);
      const upcoming = s.classId
        ? await prisma.exam.findMany({
            where: { classId: s.classId, status: { in: ["PUBLISHED", "ACTIVE", "SCHEDULED"] }, OR: [{ availableFrom: { gte: new Date() } }, { availableFrom: null, date: { gte: new Date() } }] },
            include: { subject: true }, orderBy: { date: "asc" }, take: 5,
          })
        : [];
      res.json({
        className: s.class?.name || "Unassigned",
        currency: profile?.currency || "MYR",
        stats: {
          attendanceRate, examAverage, feeBalance: Math.max(0, billed - paid),
          classSize: classmates,
        },
        upcomingExams: upcoming.map((e) => ({
          id: e.id, subject: e.subject?.name || e.title,
          date: e.date.toISOString().slice(0, 10),
          time: "", type: e.type,
        })),
        recentResults: graded.slice(0, 5).map((a) => ({
          id: a.id, subject: a.exam.subject?.name || a.exam.title,
          score: a.exam.totalMarks ? `${a.score}/${a.exam.totalMarks}` : `${a.score}`,
          grade: letterGrade(round1(((a.score || 0) / (a.exam.totalMarks || 100)) * 100)),
          date: (a.completedAt || a.createdAt).toISOString().slice(0, 10),
        })),
        gedReadiness: GED_SUBJECTS.map((sub) => ({
          subject: sub,
          status: readinessBySubject[sub]?.status || "NOT_READY",
        })),
      });
    } catch (err) {
      logger.error("Error building student dashboard:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher portal API (scoped to the signed-in teacher; ADMIN sees all) ─────
  const teacherOnly = reportRole(["TEACHER", "ADMIN"]);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  const examStatus = (date: Date, attempts: { score: number | null }[]): string => {
    if (attempts.length === 0) return date > new Date() ? "UPCOMING" : "DRAFT";
    if (attempts.some((a) => a.score == null)) return "NEEDS_GRADING";
    return "GRADED";
  };

  app.get("/api/teacher/classes", authMiddleware, teacherOnly, async (req, res) => {
    try {
      const ids = await teacherClassIds(req);
      const classes = await prisma.class.findMany({
        where: { id: { in: ids } },
        include: { students: true, attendances: true },
        orderBy: { name: "asc" },
      });
      res.json(classes.map((c) => {
        const present = c.attendances.filter((a) => a.status === "PRESENT").length;
        const attendance = c.attendances.length ? round1((present / c.attendances.length) * 100) : 0;
        return {
          id: c.id, name: c.name, level: c.level, room: c.room || "—",
          students: c.students.length, progress: 0, schedule: "", nextLesson: "",
          attendance: `${attendance}%`,
        };
      }));
    } catch (err) {
      logger.error("Error building teacher classes:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Debug endpoint to check teacher userId and class assignments
  app.get("/api/teacher/debug", authMiddleware, async (req, res) => {
    try {
      const jwtUser = (req as any).user as JwtPayload;
      // Diagnostic endpoint: teacher/admin only, and never lists other teachers.
      if (jwtUser.role !== "TEACHER" && jwtUser.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const teacher = await prisma.teacher.findUnique({
        where: { userId: jwtUser.userId },
        include: { classes: true, user: true },
      });
      if (!teacher) {
        return res.json({
          jwtUserId: jwtUser.userId,
          teacherFound: false,
          message: "No Teacher record found with this userId",
        });
      }
      const classIds = teacher.classes.map((ct) => ct.classId);
      const classDetails = await prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true, level: true },
      });
      res.json({
        teacherFound: true,
        teacher: {
          id: teacher.id,
          teacherCode: teacher.teacherCode,
          userId: teacher.userId,
          userEmail: teacher.user?.email,
        },
        classCount: classIds.length,
        classes: classDetails,
      });
    } catch (err) {
      logger.error("Error in teacher debug:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/teacher/classes/:id", authMiddleware, teacherOnly, async (req, res) => {
    try {
      if (!(await canAccessTeacherClass(req, req.params.id))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const c = await prisma.class.findUnique({
        where: { id: req.params.id },
        include: {
          students: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profilePhotoUrl: true,
                  isActive: true
                }
              },
              attendances: true,
              examAttempts: { where: { score: { not: null } }, include: { exam: true }, orderBy: { completedAt: "desc" } },
            },
          },
          teachers: { include: { teacher: { include: { user: true } } } },
        },
      });
      if (!c) { res.status(404).json({ error: "Class not found" }); return; }
      const lead = c.teachers[0]?.teacher?.user;
      res.json({
        classInfo: {
          id: c.id, name: c.name, level: c.level, room: c.room || "—",
          teacher: lead ? fullName(lead) : "—",
          totalStudents: c.students.length, academicYear: c.academicYear,
        },
        students: c.students.map((s) => {
          const present = s.attendances.filter((a) => a.status === "PRESENT").length;
          const att = s.attendances.length ? round1((present / s.attendances.length) * 100) : 0;
          const last = s.examAttempts[0];
          return {
            id: s.id, userId: s.userId, name: fullName(s.user), studentId: s.studentCode,
            attendance: `${att}%`,
            lastExam: last && last.score != null ? `${last.score}/${last.exam.totalMarks || 100}` : "—",
            profilePhotoUrl: s.user.profilePhotoUrl,
          };
        }),
      });
    } catch (err) {
      logger.error("Error building class detail:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/teacher/roster", authMiddleware, teacherOnly, async (req, res) => {
    const { classId } = req.query as { classId?: string };
    if (!classId) { res.status(400).json({ error: "classId is required" }); return; }
    try {
      if (!(await canAccessTeacherClass(req, classId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      // Exclude students who've left the school so they don't show up for
      // attendance marking; ON_LEAVE/GRADUATED/unset still count as roster.
      const students = await prisma.student.findMany({
        where: { classId, status: { not: "DROPPED" } }, include: { user: true }, orderBy: { studentCode: "asc" },
      });
      res.json(students.map((s) => ({
        id: s.id,
        name: fullName(s.user),
        studentId: s.studentCode,
        photo: s.profilePhotoUrl || s.user?.profilePhotoUrl || null,
      })));
    } catch (err) {
      logger.error("Error building roster:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/teacher/exams", authMiddleware, teacherOnly, async (req, res) => {
    try {
      const ids = await teacherClassIds(req);
      const exams = await prisma.exam.findMany({
        where: { classId: { in: ids }, status: { not: "ARCHIVED" } },
        include: { class: { include: { students: true } }, subject: true, attempts: true },
        orderBy: { date: "desc" },
      });
      res.json(exams.map((e) => {
        const graded = e.attempts.filter((a) => a.score != null);
        const tm = e.totalMarks || 100;
        const avg = graded.length ? `${round1(graded.reduce((acc, a) => acc + (a.score! / tm) * 100, 0) / graded.length)}%` : undefined;
        return {
          id: e.id, title: e.title, class: e.class?.name || "—", date: fmtDate(e.date),
          duration: e.durationMinutes ? `${e.durationMinutes}m` : "N/A",
          type: e.subject?.name || e.type,
          status: e.status === "DRAFT" || e.status === "CLOSED" ? e.status : examStatus(e.date, e.attempts),
          submissions: e.attempts.length, total: e.class?.students.length || 0,
          ...(avg ? { avg } : {}),
        };
      }));
    } catch (err) {
      logger.error("Error building teacher exams:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/teacher/dashboard", authMiddleware, teacherOnly, async (req, res) => {
    try {
      const ids = await teacherClassIds(req);
      const classes = await prisma.class.findMany({
        where: { id: { in: ids } },
        include: { students: true, attendances: true },
        orderBy: { name: "asc" },
      });
      const studentCount = classes.reduce((acc, c) => acc + c.students.length, 0);
      const allAtt = classes.flatMap((c) => c.attendances);
      const attendanceRate = allAtt.length ? round1((allAtt.filter((a) => a.status === "PRESENT").length / allAtt.length) * 100) : 0;

      const upcoming = await prisma.exam.findMany({
        where: { classId: { in: ids }, date: { gte: new Date() }, status: { not: "ARCHIVED" } },
        include: { class: true }, orderBy: { date: "asc" }, take: 5,
      });

      // Last 5 weekdays attendance rate
      const attendanceData: { day: string; rate: number }[] = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dayAtt = allAtt.filter((a) => a.date.toISOString().slice(0, 10) === d.toISOString().slice(0, 10));
        const r = dayAtt.length ? round1((dayAtt.filter((a) => a.status === "PRESENT").length / dayAtt.length) * 100) : 0;
        attendanceData.push({ day: d.toLocaleDateString("en-US", { weekday: "short" }), rate: r });
      }

      const recent = await prisma.examAttempt.findMany({
        where: { exam: { classId: { in: ids } }, score: { not: null } },
        include: { student: { include: { user: true } }, exam: { include: { class: true } } },
        orderBy: { completedAt: "desc" }, take: 5,
      });

      res.json({
        stats: { studentCount, classCount: classes.length, attendanceRate, upcomingExamCount: upcoming.length },
        classes: classes.map((c) => ({ id: c.id, name: c.name, level: c.level, room: c.room || "—", students: c.students.length })),
        attendanceData,
        upcomingExams: upcoming.map((e) => ({ id: e.id, title: e.title, date: fmtDate(e.date), time: "", class: e.class?.name || "—" })),
        recentPerformance: recent.map((a) => {
          const pct = round1(((a.score || 0) / (a.exam.totalMarks || 100)) * 100);
          return { id: a.id, student: fullName(a.student.user), class: a.exam.class?.name || "—", score: `${pct}%`, trend: pct >= 80 ? "up" : pct >= 60 ? "stable" : "down" };
        }),
      });
    } catch (err) {
      logger.error("Error building teacher dashboard:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Gradebook & GED readiness API ────────────────────────────────────────────
  const GED_SUBJECTS = ["RLA", "MATH", "SCIENCE", "SOCIAL_STUDIES"] as const;
  const GED_STATUSES = ["NOT_READY", "DEVELOPING", "NEAR_READY", "READY", "TEST_SCHEDULED", "PASSED"] as const;
  const DEFAULT_WEIGHTS: Record<string, number> = {
    ASSIGNMENT: 20, QUIZ: 20, MIDTERM: 25, FINAL: 25, MOCK_GED: 10,
  };
  const WARNING_THRESHOLD = 60; // overall % below which an academic warning is raised
  const canManageGrades = (role: string) => role === "ADMIN" || role === "TEACHER";

  const subjectBelongsToClass = async (subjectId: string, classId: string) => Boolean(
    await prisma.subject.findFirst({
      where: {
        id: subjectId,
        OR: [
          { classes: { some: { classId } } },
          { exams: { some: { classId } } },
        ],
      },
      select: { id: true },
    })
  );

  // Subject.code/name are free text the school configures (e.g. seeded as "GED-MATH",
  // "GED-SCI", "GED-SOC") — they don't equal the GED_SUBJECTS enum values, so callers
  // that need to bucket an Exam's Subject into one of the 4 GED areas should match
  // loosely against both fields rather than requiring an exact match.
  const GED_SUBJECT_PATTERNS: Record<(typeof GED_SUBJECTS)[number], RegExp> = {
    RLA: /\bRLA\b|READING|LANGUAGE/i,
    MATH: /MATH/i,
    SCIENCE: /\bSCI/i,
    SOCIAL_STUDIES: /\bSOC/i,
  };
  const matchGedSubject = (code?: string | null, name?: string | null): (typeof GED_SUBJECTS)[number] | null => {
    const hay = `${code || ""} ${name || ""}`;
    for (const sub of GED_SUBJECTS) {
      if (GED_SUBJECT_PATTERNS[sub].test(hay)) return sub;
    }
    return null;
  };

  // Returns a {category: weight} map for a class (configured rows override defaults).
  const weightsForClass = async (classId: string): Promise<Record<string, number>> => {
    const rows = await prisma.categoryWeight.findMany({ where: { classId } });
    if (!rows.length) return { ...DEFAULT_WEIGHTS };
    const map: Record<string, number> = { ...DEFAULT_WEIGHTS };
    for (const r of rows) map[r.category] = r.weight;
    return map;
  };

  // Compute a student's category averages + weighted overall % for a set of items.
  const computeOverall = (
    items: { id: string; category: string; maxMarks: number }[],
    gradesByItem: Record<string, { marks: number | null }>,
    weights: Record<string, number>,
  ) => {
    const catTotals: Record<string, { earned: number; max: number }> = {};
    for (const it of items) {
      const g = gradesByItem[it.id];
      if (!g || g.marks == null) continue;
      const c = it.category;
      if (!catTotals[c]) catTotals[c] = { earned: 0, max: 0 };
      catTotals[c].earned += g.marks;
      catTotals[c].max += it.maxMarks || 0;
    }
    const categoryAverages: Record<string, number> = {};
    let weightedSum = 0;
    let weightTotal = 0;
    for (const c of Object.keys(catTotals)) {
      const t = catTotals[c];
      const pct = t.max > 0 ? (t.earned / t.max) * 100 : 0;
      categoryAverages[c] = round1(pct);
      const w = weights[c] ?? 0;
      weightedSum += pct * w;
      weightTotal += w;
    }
    const overall = weightTotal > 0 ? round1(weightedSum / weightTotal) : null;
    return { categoryAverages, overall };
  };

  // GET gradebook matrix for a class (optionally filtered to one subject).
  app.get("/api/gradebook", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const { classId, subjectId } = req.query as { classId?: string; subjectId?: string };
    if (!classId) { res.status(400).json({ error: "classId is required" }); return; }
    if (!(await canAccessTeacherClass(req, classId))) {
      res.status(403).json({ error: "Forbidden: not your class" });
      return;
    }
    try {
      const [students, items, weights] = await Promise.all([
        prisma.student.findMany({ where: { classId }, include: { user: true }, orderBy: { studentCode: "asc" } }),
        prisma.gradeItem.findMany({
          where: { classId, ...(subjectId ? { subjectId } : {}) },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        }),
        weightsForClass(classId),
      ]);
      const itemIds = items.map((i: any) => i.id);
      const grades = itemIds.length
        ? await prisma.grade.findMany({ where: { gradeItemId: { in: itemIds } } })
        : [];
      const byStudent: Record<string, Record<string, any>> = {};
      for (const g of grades) {
        (byStudent[g.studentId] ||= {})[g.gradeItemId] = { marks: g.marks, comment: g.comment };
      }
      const rows = students.map((s: any) => {
        const gradesByItem = byStudent[s.id] || {};
        const { categoryAverages, overall } = computeOverall(items as any, gradesByItem, weights);
        return {
          studentId: s.id,
          name: fullName(s.user),
          code: s.studentCode,
          grades: gradesByItem,
          categoryAverages,
          overall,
          letter: overall != null ? letterGrade(overall) : null,
          warning: overall != null && overall < WARNING_THRESHOLD,
        };
      });
      res.json({
        items: items.map((i: any) => ({
          id: i.id, title: i.title, category: i.category, maxMarks: i.maxMarks,
          date: i.date, subjectId: i.subjectId,
        })),
        weights,
        rows,
        categories: GRADE_CATEGORIES,
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") {
        logger.warn("Gradebook tables missing — run `prisma migrate deploy`. Returning empty gradebook.");
        res.json({ items: [], weights: { ...DEFAULT_WEIGHTS }, rows: [], categories: GRADE_CATEGORIES });
        return;
      }
      logger.error("Error building gradebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/grade-items", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageGrades(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { title, category, maxMarks, date, classId, subjectId } = req.body || {};
    const normalizedTitle = normalizeGradeItemTitle(title);
    const normalizedMaxMarks = maxMarks == null ? 100 : parseGradeItemMaxMarks(maxMarks);
    const normalizedDate = parseGradeItemDate(date);
    if (!normalizedTitle || !category || typeof classId !== "string") {
      res.status(400).json({ error: "A title, category and class are required" }); return;
    }
    if (!isGradeCategory(category)) { res.status(400).json({ error: "Invalid category" }); return; }
    if (normalizedMaxMarks == null) { res.status(400).json({ error: "Max marks must be greater than 0 and no more than 10,000" }); return; }
    if (!normalizedDate) { res.status(400).json({ error: "Invalid grade item date" }); return; }
    if (!(await canManageExamClass(jwtUser, classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
    if (subjectId && (typeof subjectId !== "string" || !(await subjectBelongsToClass(subjectId, classId)))) {
      res.status(400).json({ error: "Subject is not assigned to this class" }); return;
    }
    try {
      const item = await prisma.gradeItem.create({
        data: {
          title: normalizedTitle, category,
          maxMarks: normalizedMaxMarks,
          date: normalizedDate,
          classId, subjectId: subjectId || null, createdById: jwtUser.userId,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "GRADE_ITEM", item.id,
        `Grade item '${normalizedTitle}' (${category}) created.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(item);
    } catch (err) {
      logger.error("Error creating grade item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/grade-items/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageGrades(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { id } = req.params;
    const { title, category, maxMarks, date, subjectId } = req.body || {};
    try {
      const existingItem = await prisma.gradeItem.findUnique({ where: { id }, select: { classId: true } });
      if (!existingItem) { res.status(404).json({ error: "Grade item not found" }); return; }
      if (!(await canManageExamClass(jwtUser, existingItem.classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      const normalizedTitle = title === undefined ? undefined : normalizeGradeItemTitle(title);
      const normalizedMaxMarks = maxMarks === undefined ? undefined : parseGradeItemMaxMarks(maxMarks);
      const normalizedDate = date === undefined ? undefined : parseGradeItemDate(date);
      if (title !== undefined && !normalizedTitle) { res.status(400).json({ error: "Title must be between 1 and 120 characters" }); return; }
      if (category !== undefined && !isGradeCategory(category)) { res.status(400).json({ error: "Invalid category" }); return; }
      if (maxMarks !== undefined && normalizedMaxMarks == null) { res.status(400).json({ error: "Max marks must be greater than 0 and no more than 10,000" }); return; }
      if (date !== undefined && !normalizedDate) { res.status(400).json({ error: "Invalid grade item date" }); return; }
      if (subjectId && (typeof subjectId !== "string" || !(await subjectBelongsToClass(subjectId, existingItem.classId)))) {
        res.status(400).json({ error: "Subject is not assigned to this class" }); return;
      }
      const item = await prisma.gradeItem.update({
        where: { id },
        data: {
          ...(normalizedTitle !== undefined ? { title: normalizedTitle } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(normalizedMaxMarks !== undefined ? { maxMarks: normalizedMaxMarks } : {}),
          ...(normalizedDate !== undefined ? { date: normalizedDate } : {}),
          ...(subjectId !== undefined ? { subjectId: subjectId || null } : {}),
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "GRADE_ITEM", id,
        `Grade item '${item.title}' updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(item);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Grade item not found" }); return; }
      logger.error("Error updating grade item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/grade-items/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageGrades(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { id } = req.params;
    try {
      const existingItem = await prisma.gradeItem.findUnique({ where: { id }, select: { classId: true } });
      if (!existingItem) { res.status(404).json({ error: "Grade item not found" }); return; }
      if (!(await canManageExamClass(jwtUser, existingItem.classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      await prisma.gradeItem.delete({ where: { id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "GRADE_ITEM", id,
        `Grade item ${id} deleted.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json({ message: "Grade item deleted" });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Grade item not found" }); return; }
      logger.error("Error deleting grade item:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Bulk upsert grades for one grade item; logs an audit entry for each changed mark.
  app.post("/api/grades/bulk", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageGrades(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { gradeItemId, entries } = req.body as {
      gradeItemId: string;
      entries: Array<{ studentId: string; marks: number | null; comment?: string }>;
    };
    if (!gradeItemId || !Array.isArray(entries)) { res.status(400).json({ error: "gradeItemId and entries[] are required" }); return; }
    try {
      const item = await prisma.gradeItem.findUnique({ where: { id: gradeItemId } });
      if (!item) { res.status(404).json({ error: "Grade item not found" }); return; }
      if (!(await canManageExamClass(jwtUser, item.classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      const classStudentIds = new Set(
        (await prisma.student.findMany({ where: { classId: item.classId }, select: { id: true } })).map((s) => s.id),
      );
      const existing = await prisma.grade.findMany({ where: { gradeItemId } });
      const prevByStudent: Record<string, any> = {};
      for (const g of existing) prevByStudent[g.studentId] = g;

      const normalized: Array<{ studentId: string; marks: number | null; comment: string }> = [];
      for (const e of entries) {
        if (!classStudentIds.has(e.studentId)) {
          res.status(400).json({ error: `Student ${e.studentId} is not enrolled in this class` });
          return;
        }
        let marks: number | null = e.marks == null || (e.marks as any) === "" ? null : Number(e.marks);
        if (marks != null && (Number.isNaN(marks) || marks < 0 || marks > item.maxMarks)) {
          res.status(400).json({ error: `Marks must be between 0 and ${item.maxMarks}` });
          return;
        }
        normalized.push({ studentId: e.studentId, marks, comment: e.comment || "" });
      }

      let changed = 0;
      await prisma.$transaction(
        normalized.map((e) => {
          const marks = e.marks;
          const prev = prevByStudent[e.studentId];
          if (!prev || prev.marks !== marks || (prev.comment || "") !== (e.comment || "")) changed += 1;
          return prisma.grade.upsert({
            where: { gradeItemId_studentId: { gradeItemId, studentId: e.studentId } },
            update: { marks, comment: e.comment || null, gradedById: jwtUser.userId },
            create: { gradeItemId, studentId: e.studentId, marks, comment: e.comment || null, gradedById: jwtUser.userId },
          });
        })
      );

      // Per-mark audit for changed entries (capped to avoid log floods).
      const changedEntries = normalized.filter((e) => {
        const prev = prevByStudent[e.studentId];
        return !prev || prev.marks !== e.marks;
      }).slice(0, 50);
      for (const e of changedEntries) {
        const prev = prevByStudent[e.studentId];
        await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "GRADE", `${gradeItemId}:${e.studentId}`,
          `Grade for student ${e.studentId} on '${item.title}': ${prev?.marks ?? "—"} → ${e.marks ?? "—"}`,
          req.ip, req.headers["user-agent"] || null, "SUCCESS").catch(() => {});
      }
      res.json({ success: true, saved: entries.length, changed });
    } catch (err) {
      logger.error("Error saving grades:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/category-weights", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const { classId } = req.query as { classId?: string };
    if (!classId) { res.status(400).json({ error: "classId is required" }); return; }
    if (!(await canAccessTeacherClass(req, classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
    try {
      res.json(await weightsForClass(classId));
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json({ ...DEFAULT_WEIGHTS }); return; }
      logger.error("Error fetching category weights:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/category-weights", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageGrades(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { classId, weights } = req.body as { classId: string; weights: Record<string, number> };
    if (!classId || !weights || typeof weights !== "object" || Array.isArray(weights)) { res.status(400).json({ error: "classId and weights are required" }); return; }
    if (!(await canManageExamClass(jwtUser, classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
    const normalizedWeights: Record<string, number> = {};
    for (const category of GRADE_CATEGORIES) {
      if (weights[category] == null) continue;
      const weight = parseCategoryWeight(weights[category]);
      if (weight == null) { res.status(400).json({ error: `${category} weight must be a whole number between 0 and 100` }); return; }
      normalizedWeights[category] = weight;
    }
    if (Object.values(normalizedWeights).reduce((total, weight) => total + weight, 0) <= 0) {
      res.status(400).json({ error: "At least one category weight must be greater than 0" }); return;
    }
    try {
      await prisma.$transaction(
        GRADE_CATEGORIES.filter((c) => normalizedWeights[c] != null).map((c) =>
          prisma.categoryWeight.upsert({
            where: { classId_category: { classId, category: c } },
            update: { weight: normalizedWeights[c] },
            create: { classId, category: c, weight: normalizedWeights[c] },
          })
        )
      );
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "CATEGORY_WEIGHT", classId,
        `Category weights updated for class ${classId}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(await weightsForClass(classId));
    } catch (err) {
      logger.error("Error saving category weights:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Build a full progress payload for one student (used by teacher + student views).
  const buildStudentProgress = async (studentId: string) => {
    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true, class: true } });
    if (!student) return null;
    const classId = student.classId;
    const items = classId
      ? await prisma.gradeItem.findMany({ where: { classId }, include: { subject: true }, orderBy: [{ date: "asc" }] })
      : [];
    const itemIds = items.map((i: any) => i.id);
    const grades = itemIds.length
      ? await prisma.grade.findMany({ where: { gradeItemId: { in: itemIds }, studentId } })
      : [];
    const gByItem: Record<string, any> = {};
    for (const g of grades) gByItem[g.gradeItemId] = { marks: g.marks, comment: g.comment };
    const weights = classId ? await weightsForClass(classId) : { ...DEFAULT_WEIGHTS };

    // Group items by subject.
    const bySubject: Record<string, { name: string; items: any[] }> = {};
    for (const it of items) {
      const key = it.subjectId || "__general__";
      (bySubject[key] ||= { name: it.subject?.name || "General", items: [] }).items.push(it);
    }
    const subjects = Object.entries(bySubject).map(([subjectId, grp]) => {
      const { categoryAverages, overall } = computeOverall(grp.items, gByItem, weights);
      return {
        subjectId, name: grp.name, categoryAverages, average: overall,
        letter: overall != null ? letterGrade(overall) : null,
        warning: overall != null && overall < WARNING_THRESHOLD,
      };
    });
    const graded = subjects.filter((s) => s.average != null);
    const termAverage = graded.length ? round1(graded.reduce((a, s) => a + (s.average || 0), 0) / graded.length) : null;

    // Trend: each graded item's percentage over time.
    const trend = items
      .filter((it: any) => gByItem[it.id]?.marks != null && it.maxMarks > 0)
      .map((it: any) => ({
        date: it.date, title: it.title, category: it.category,
        percent: round1((gByItem[it.id].marks / it.maxMarks) * 100),
      }));

    const comments = items
      .filter((it: any) => gByItem[it.id]?.comment)
      .map((it: any) => ({ item: it.title, subject: it.subject?.name || "General", comment: gByItem[it.id].comment }));

    const readiness = await prisma.gedReadiness.findMany({ where: { studentId } });
    const readinessBySubject: Record<string, any> = {};
    for (const r of readiness) readinessBySubject[r.subject] = { status: r.status, note: r.note, updatedAt: r.updatedAt };

    // Aggregate exam performance per GED subject.
    // Subject.code is a free-text field the school sets (e.g. seeded as "GED-MATH",
    // "GED-SCI", "GED-SOC" — not the bare GED_SUBJECTS enum values), so an exact-match
    // filter against GED_SUBJECTS silently matches nothing. Match loosely against both
    // code and name instead.
    // Exam.subjectId is a required field, so filtering it against { not: null }
    // is redundant (every exam already has one) — and Prisma 7 now throws a
    // PrismaClientValidationError ("Argument `not` must not be null") for a
    // null-filter against a non-nullable column, which was crashing this
    // endpoint for every student. Just drop the no-op filter.
    const examAttempts = await prisma.examAttempt.findMany({
      where: { studentId, isCompleted: true },
      include: { exam: { include: { subject: true } } },
    });

    const examStatsBySubject: Record<string, { examAverage: number; attemptCount: number }> = {};
    for (const sub of GED_SUBJECTS) {
      examStatsBySubject[sub] = { examAverage: 0, attemptCount: 0 };
    }

    for (const attempt of examAttempts) {
      const subjectCode = matchGedSubject(attempt.exam.subject?.code, attempt.exam.subject?.name);
      if (!subjectCode || !examStatsBySubject[subjectCode]) continue;
      const stats = examStatsBySubject[subjectCode];
      stats.attemptCount++;
      if (attempt.score != null && attempt.exam.totalMarks) {
        const pct = (attempt.score / attempt.exam.totalMarks) * 100;
        stats.examAverage = stats.examAverage === 0
          ? pct
          : (stats.examAverage * (stats.attemptCount - 1) + pct) / stats.attemptCount;
      }
    }

    return {
      student: { id: student.id, name: fullName(student.user), code: student.studentCode, className: student.class?.name || "Unassigned" },
      subjects, termAverage,
      letter: termAverage != null ? letterGrade(termAverage) : null,
      warnings: subjects.filter((s) => s.warning).map((s) => s.name),
      trend, comments, weights,
      gedReadiness: GED_SUBJECTS.map((sub) => ({
        subject: sub, status: readinessBySubject[sub]?.status || "NOT_READY",
        note: readinessBySubject[sub]?.note || null, updatedAt: readinessBySubject[sub]?.updatedAt || null,
        examAverage: Math.round(examStatsBySubject[sub].examAverage),
        attemptCount: examStatsBySubject[sub].attemptCount,
      })),
    };
  };

  // ── Badges & Streaks System ─────────────────────────────────────────────────────

  /**
   * Calculate current attendance streak for a student
   * Counts consecutive days with PRESENT, LATE, or EXCUSED status from today backward
   */
  const calculateAttendanceStreak = async (studentId: string): Promise<number> => {
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId,
        status: { in: ['PRESENT', 'LATE', 'EXCUSED'] }
      },
      orderBy: { date: 'desc' }
    });

    if (attendances.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const att of attendances) {
      const attDate = new Date(att.date);
      attDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - attDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
        currentDate = attDate;
      } else if (diffDays > streak) {
        break;
      }
    }

    return streak;
  };

  /**
   * Check and award badges for a student based on their current achievements
   * Called after relevant actions (attendance, homework, exam, GED readiness updates)
   */
  const checkAndAwardBadges = async (
    studentId: string,
    triggerType: 'ATTENDANCE' | 'EXAM' | 'HOMEWORK' | 'GED' | 'LOGIN'
  ): Promise<void> => {
    try {
      // Fetch student data needed for badge checks
      const [student, currentBadges] = await Promise.all([
        prisma.student.findUnique({
          where: { id: studentId },
          include: {
            attendances: { where: { status: { in: ['PRESENT', 'LATE', 'EXCUSED'] } } },
            examAttempts: { where: { isCompleted: true }, include: { exam: true } },
            homeworkSubmissions: { include: { homework: true } },
            gedReadiness: {}
          }
        }),
        prisma.studentBadge.findMany({ where: { studentId } })
      ]);

      if (!student) return;

      const existingBadgeKeys = new Set(currentBadges.map(b => b.badgeKey));

      // Calculate metrics
      const currentStreak = await calculateAttendanceStreak(studentId);
      const examCount = student.examAttempts.length;
      const exam90PlusCount = student.examAttempts.filter(a => {
        if (!a.score || !a.exam.totalMarks) return false;
        const pct = (a.score / a.exam.totalMarks) * 100;
        return pct >= 90;
      }).length;
      const homeworkCount = student.homeworkSubmissions.length;
      const onTimeHomeworkCount = student.homeworkSubmissions.filter(hs => {
        return hs.submittedAt <= new Date(hs.homework.dueDate);
      }).length;
      const gedPassedCount = student.gedReadiness.filter(r => r.status === 'PASSED').length;
      const gedReadyCount = student.gedReadiness.filter(r => r.status === 'READY' || r.status === 'PASSED').length;

      // Build badge context
      const badgeContext = {
        studentId,
        attendanceCount: student.attendances.length,
        currentStreak,
        examCount,
        exam90PlusCount,
        homeworkCount,
        onTimeHomeworkCount,
        gedSubjectsPassed: gedPassedCount,
        gedSubjectsReady: gedReadyCount,
      };

      // Check each badge definition
      for (const [key, badge] of Object.entries(BADGE_CATALOG)) {
        // Skip if already at max level
        if (existingBadgeKeys.has(key)) {
          const existing = currentBadges.find(b => b.badgeKey === key);
          if (existing && badge.levels && existing.level >= badge.levels.length) {
            continue;
          }
        }

        // Run check function
        const result = badge.checkFn(badgeContext);
        const progress = typeof result === 'boolean' ? (result ? 1 : 0) : result;
        if (progress <= 0) continue; // Not earned yet — badges without `levels` have no other gate

        // Determine level
        let level = 1;
        if (badge.levels) {
          level = getBadgeLevel(badge, progress);
          if (level === 0) continue; // Doesn't qualify for any level
        }

        // Award or update badge
        if (existingBadgeKeys.has(key)) {
          await prisma.studentBadge.update({
            where: { id: currentBadges.find(b => b.badgeKey === key)!.id },
            data: {
              level,
              currentCount: progress,
              targetCount: badge.levels ? badge.levels[level - 1] : null,
              metadata: { triggerType, lastChecked: new Date().toISOString() }
            }
          });
        } else {
          await prisma.studentBadge.create({
            data: {
              studentId,
              badgeKey: key,
              level,
              currentCount: progress,
              targetCount: badge.levels ? badge.levels[level - 1] : null,
              metadata: { triggerType, firstEarnedAt: new Date().toISOString() }
            }
          });
        }
      }
    } catch (err) {
      logger.error("Error checking and awarding badges:", err);
    }
  };

  app.get("/api/gradebook/student/:studentId", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.params.studentId },
        select: { classId: true },
      });
      if (!student) { res.status(404).json({ error: "Student not found" }); return; }
      if (student.classId && !(await canAccessTeacherClass(req, student.classId))) {
        res.status(403).json({ error: "Forbidden: not your class" });
        return;
      }
      const data = await buildStudentProgress(req.params.studentId);
      if (!data) { res.status(404).json({ error: "Student not found" }); return; }
      res.json(data);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Gradebook not migrated yet" }); return; }
      logger.error("Error building student progress:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/student/grades", authMiddleware, studentOnly, async (req, res) => {
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const data = await buildStudentProgress(s.id);
      res.json(data);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json(null); return; }
      logger.error("Error building own progress:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Badges & streaks for current student
  app.get("/api/student/badges", authMiddleware, studentOnly, async (req, res) => {
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }

      const [badges, currentStreak] = await Promise.all([
        prisma.studentBadge.findMany({
          where: { studentId: s.id },
          orderBy: { earnedAt: 'desc' }
        }),
        calculateAttendanceStreak(s.id)
      ]);

      const badgeDetails = badges.map(b => {
        const def = BADGE_CATALOG[b.badgeKey];
        return {
          key: b.badgeKey,
          name: def?.name || b.badgeKey,
          description: def?.description || '',
          icon: def?.icon || 'Award',
          color: def?.color || '',
          level: b.level,
          currentCount: b.currentCount,
          targetCount: b.targetCount,
          earnedAt: b.earnedAt,
        };
      });

      res.json({ badges: badgeDetails, currentStreak });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json({ badges: [], currentStreak: 0 }); return; }
      logger.error("Error fetching student badges:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // GED readiness matrix for a class.
  app.get("/api/ged-readiness", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const { classId } = req.query as { classId?: string };
    if (!classId) { res.status(400).json({ error: "classId is required" }); return; }
    try {
      const students = await prisma.student.findMany({ where: { classId }, include: { user: true }, orderBy: { studentCode: "asc" } });
      const records = await prisma.gedReadiness.findMany({ where: { studentId: { in: students.map((s: any) => s.id) } } });
      const byStudent: Record<string, Record<string, string>> = {};
      for (const r of records) (byStudent[r.studentId] ||= {})[r.subject] = r.status;
      res.json({
        subjects: GED_SUBJECTS,
        statuses: GED_STATUSES,
        rows: students.map((s: any) => ({
          studentId: s.id, name: fullName(s.user), code: s.studentCode,
          readiness: Object.fromEntries(GED_SUBJECTS.map((sub) => [sub, byStudent[s.id]?.[sub] || "NOT_READY"])),
        })),
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") {
        res.json({ subjects: GED_SUBJECTS, statuses: GED_STATUSES, rows: [] });
        return;
      }
      logger.error("Error fetching GED readiness:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/ged-readiness", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageGrades(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { studentId, subject, status, note } = req.body || {};
    if (!studentId || !subject || !status) { res.status(400).json({ error: "studentId, subject and status are required" }); return; }
    if (!GED_SUBJECTS.includes(subject) || !GED_STATUSES.includes(status)) { res.status(400).json({ error: "Invalid subject or status" }); return; }
    try {
      const existing = await prisma.gedReadiness.findUnique({ where: { studentId_subject: { studentId, subject } } });
      const record = await prisma.gedReadiness.upsert({
        where: { studentId_subject: { studentId, subject } },
        update: { status, note: note ?? undefined, updatedById: jwtUser.userId },
        create: { studentId, subject, status, note: note || null, updatedById: jwtUser.userId },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "STATUS_CHANGE", "GED_READINESS", `${studentId}:${subject}`,
        `GED ${subject} readiness: ${existing?.status || "NOT_READY"} → ${status}`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS");

      // Check badges for GED readiness change
      checkAndAwardBadges(studentId, 'GED').catch(err =>
        logger.error(`Error checking badges for student ${studentId}:`, err)
      );

      res.json(record);
    } catch (err) {
      logger.error("Error updating GED readiness:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/student/ged-readiness", authMiddleware, studentOnly, async (req, res) => {
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const records = await prisma.gedReadiness.findMany({ where: { studentId: s.id } });
      const bySub: Record<string, any> = {};
      for (const r of records) bySub[r.subject] = r;
      res.json(GED_SUBJECTS.map((sub) => ({ subject: sub, status: bySub[sub]?.status || "NOT_READY", note: bySub[sub]?.note || null })));
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error("Error fetching own GED readiness:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Class performance report: per-category + overall class averages, grade
  // distribution, and GED readiness distribution.
  app.get("/api/reports/class-performance", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const { classId, subjectId } = req.query as { classId?: string; subjectId?: string };
    if (!classId) { res.status(400).json({ error: "classId is required" }); return; }
    if (!(await canAccessTeacherClass(req, classId))) {
      res.status(403).json({ error: "Forbidden: not your class" });
      return;
    }
    try {
      const [students, items, weights] = await Promise.all([
        prisma.student.findMany({ where: { classId }, include: { user: true } }),
        prisma.gradeItem.findMany({ where: { classId, ...(subjectId ? { subjectId } : {}) } }),
        weightsForClass(classId),
      ]);
      const itemIds = items.map((i: any) => i.id);
      const grades = itemIds.length ? await prisma.grade.findMany({ where: { gradeItemId: { in: itemIds } } }) : [];
      const byStudent: Record<string, Record<string, any>> = {};
      for (const g of grades) (byStudent[g.studentId] ||= {})[g.gradeItemId] = { marks: g.marks };

      const overalls: number[] = [];
      const distribution: Record<string, number> = { "A+": 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
      const catSums: Record<string, { sum: number; n: number }> = {};
      let warnings = 0;
      for (const s of students) {
        const { categoryAverages, overall } = computeOverall(items as any, byStudent[s.id] || {}, weights);
        if (overall != null) {
          overalls.push(overall);
          distribution[letterGrade(overall)] = (distribution[letterGrade(overall)] || 0) + 1;
          if (overall < WARNING_THRESHOLD) warnings += 1;
        }
        for (const c of Object.keys(categoryAverages)) {
          (catSums[c] ||= { sum: 0, n: 0 });
          catSums[c].sum += categoryAverages[c];
          catSums[c].n += 1;
        }
      }
      const categoryAverages: Record<string, number | null> = {};
      for (const c of GRADE_CATEGORIES) categoryAverages[c] = catSums[c]?.n ? round1(catSums[c].sum / catSums[c].n) : null;

      const readiness = await prisma.gedReadiness.findMany({ where: { studentId: { in: students.map((s: any) => s.id) } } });
      const readinessDist: Record<string, Record<string, number>> = {};
      for (const sub of GED_SUBJECTS) {
        readinessDist[sub] = Object.fromEntries(GED_STATUSES.map((st) => [st, 0]));
      }
      for (const r of readiness) {
        if (readinessDist[r.subject]) readinessDist[r.subject][r.status] = (readinessDist[r.subject][r.status] || 0) + 1;
      }

      res.json({
        studentCount: students.length,
        gradedCount: overalls.length,
        classAverage: overalls.length ? round1(overalls.reduce((a, b) => a + b, 0) / overalls.length) : null,
        categoryAverages,
        distribution,
        warnings,
        readinessDistribution: readinessDist,
        weights,
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") {
        res.json({ studentCount: 0, gradedCount: 0, classAverage: null, categoryAverages: {}, distribution: {}, warnings: 0, readinessDistribution: {}, weights: { ...DEFAULT_WEIGHTS } });
        return;
      }
      logger.error("Error building class performance:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher and staff identity cards ────────────────────────────────────────
  type PersonnelCardKind = "TEACHER" | "STAFF";

  const personnelCardKind = (value: unknown): PersonnelCardKind | null => {
    const normalized = String(value || "").trim().toUpperCase();
    return normalized === "TEACHER" || normalized === "STAFF" ? normalized : null;
  };

  const personnelCardExpiry = (issueDate: Date): Date => {
    const expiry = new Date(issueDate);
    expiry.setUTCFullYear(expiry.getUTCFullYear() + 3);
    return expiry;
  };

  const loadPersonnelCard = async (kind: PersonnelCardKind, id: string, initialize = false): Promise<any | null> => {
    const include = kind === "TEACHER"
      ? {
          user: true,
          classes: { include: { class: true } },
          subjects: { include: { subject: true } },
        }
      : { user: true, department: true, designation: true };
    let record: any = kind === "TEACHER"
      ? await prisma.teacher.findUnique({ where: { id }, include: include as any })
      : await prisma.employee.findUnique({ where: { id }, include: include as any });
    if (!record || !initialize) return record;

    const issueDate = record.cardIssueDate || new Date();
    const data: any = {};
    if (!record.cardIssueDate) data.cardIssueDate = issueDate;
    if (!record.cardExpiryDate) data.cardExpiryDate = personnelCardExpiry(issueDate);
    if (!record.cardVerifyToken) data.cardVerifyToken = crypto.randomBytes(18).toString("hex");
    if (!Object.keys(data).length) return record;

    record = kind === "TEACHER"
      ? await prisma.teacher.update({ where: { id }, data, include: include as any })
      : await prisma.employee.update({ where: { id }, data, include: include as any });
    return record;
  };

  const personnelCardSchool = async () => {
    const profile = await prisma.schoolProfile.findFirst();
    return {
      name: profile?.name || "School",
      logoUrl: profile?.logoUrl || null,
      contactPhone: profile?.contactPhone || null,
      contactEmail: profile?.contactEmail || null,
      address: profile?.address || null,
    };
  };

  const personnelCardPayload = async (kind: PersonnelCardKind, record: any) => {
    const teacherName = fullName(record.user);
    const teacherUnits = (record.subjects || [])
      .map((entry: any) => entry.subject?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(", ");
    const displayName = record.cardDisplayName || (kind === "TEACHER"
      ? teacherName
      : `${record.firstName || ""} ${record.lastName || ""}`.trim());
    const roleTitle = record.cardRoleTitle || (kind === "TEACHER"
      ? record.specialization || "Teacher"
      : record.designation?.title || "Staff");
    const organizationUnit = record.cardOrganizationUnit || (kind === "TEACHER"
      ? teacherUnits || record.classes?.[0]?.class?.level || "Academic Faculty"
      : record.department?.name || "Administration");
    const active = kind === "TEACHER" ? record.user?.isActive !== false : record.status === "ACTIVE";
    return {
      kind,
      holderId: record.id,
      cardNumber: kind === "TEACHER" ? record.teacherCode : record.employeeCode,
      displayName: displayName || (kind === "TEACHER" ? record.teacherCode : record.employeeCode),
      roleTitle,
      organizationUnit,
      employmentType: kind === "TEACHER" ? record.employmentType || "FULL_TIME" : "STAFF",
      status: active ? "ACTIVE" : "INACTIVE",
      issueDate: record.cardIssueDate,
      expiryDate: record.cardExpiryDate,
      verifyToken: record.cardVerifyToken,
      photoUrl: record.profilePhotoUrl || record.user?.profilePhotoUrl || null,
      school: await personnelCardSchool(),
    };
  };

  const canReadPersonnelCard = (jwtUser: JwtPayload, kind: PersonnelCardKind, record: any) =>
    jwtUser.role === "ADMIN" || (kind === "TEACHER" && jwtUser.role === "TEACHER" && record.userId === jwtUser.userId);

  const personnelCardUpdateSchema = z.object({
    displayName: z.string().trim().min(1).max(120),
    roleTitle: z.string().trim().min(1).max(120),
    organizationUnit: z.string().trim().min(1).max(160),
    issueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    expiryDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  });

  app.get("/api/personnel-cards/:kind/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const kind = personnelCardKind(req.params.kind);
    if (!kind) { res.status(400).json({ error: "Card type must be teacher or staff" }); return; }
    try {
      const existing = await loadPersonnelCard(kind, req.params.id);
      if (!existing) { res.status(404).json({ error: `${kind === "TEACHER" ? "Teacher" : "Staff member"} not found` }); return; }
      if (!canReadPersonnelCard(jwtUser, kind, existing)) { res.status(403).json({ error: "Forbidden" }); return; }
      const record = await loadPersonnelCard(kind, req.params.id, true);
      res.json(await personnelCardPayload(kind, record));
    } catch (err) {
      logger.error("Error fetching personnel card:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/personnel-cards/:kind/:id", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const kind = personnelCardKind(req.params.kind);
    if (!kind) { res.status(400).json({ error: "Card type must be teacher or staff" }); return; }
    const parsed = personnelCardUpdateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid card fields" }); return; }
    const issueDate = new Date(parsed.data.issueDate);
    const expiryDate = new Date(parsed.data.expiryDate);
    if (expiryDate.getTime() <= issueDate.getTime()) { res.status(400).json({ error: "Expiry date must be after the issue date" }); return; }
    try {
      const existing = await loadPersonnelCard(kind, req.params.id, true);
      if (!existing) { res.status(404).json({ error: `${kind === "TEACHER" ? "Teacher" : "Staff member"} not found` }); return; }
      const data = {
        cardDisplayName: parsed.data.displayName,
        cardRoleTitle: parsed.data.roleTitle,
        cardOrganizationUnit: parsed.data.organizationUnit,
        cardIssueDate: issueDate,
        cardExpiryDate: expiryDate,
      };
      const record: any = kind === "TEACHER"
        ? await prisma.teacher.update({ where: { id: req.params.id }, data, include: { user: true, classes: { include: { class: true } }, subjects: { include: { subject: true } } } })
        : await prisma.employee.update({ where: { id: req.params.id }, data, include: { user: true, department: true, designation: true } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", `${kind}_CARD`, record.id,
        `Updated ${kind.toLowerCase()} identity card fields for ${kind === "TEACHER" ? record.teacherCode : record.employeeCode}.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(await personnelCardPayload(kind, record));
    } catch (err) {
      logger.error("Error updating personnel card:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/personnel-cards/:kind/:id/pdf", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const kind = personnelCardKind(req.params.kind);
    if (!kind) { res.status(400).json({ error: "Card type must be teacher or staff" }); return; }
    try {
      const record = await loadPersonnelCard(kind, req.params.id, true);
      if (!record) { res.status(404).json({ error: `${kind === "TEACHER" ? "Teacher" : "Staff member"} not found` }); return; }
      const card = await personnelCardPayload(kind, record);
      const verifyUrl = `${req.protocol}://${req.get("host")}/verify/personnel/${card.verifyToken}`;
      const logo = await loadPdfLogo(card.school.logoUrl);

      let photo: Buffer | null = null;
      const photoPrefix = "/uploads/profile-photos/";
      if (typeof card.photoUrl === "string" && card.photoUrl.startsWith(photoPrefix)) {
        const filename = card.photoUrl.slice(photoPrefix.length).split(/[?#]/, 1)[0];
        if (filename && filename === path.basename(filename)) {
          try {
            const input = await fs.promises.readFile(path.join(PROFILE_PHOTO_DIR, filename));
            photo = await sharp(input, { animated: false, limitInputPixels: 40_000_000 })
              .rotate()
              .resize(PERSONNEL_CARD_RASTER_WIDTH_PX, PERSONNEL_CARD_RASTER_HEIGHT_PX, { fit: "cover" })
              .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
              .toBuffer();
          } catch { photo = null; }
        }
      }
      let qr: Buffer | null = null;
      try { qr = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 700, errorCorrectionLevel: "H" }); } catch { qr = null; }
      // Same expiry-aware check as the JSON verify endpoint and the on-screen
      // card — the printed PDF used to pass `card.status` straight through,
      // so an expired-but-still-employed holder's card printed a green
      // "ACTIVE" badge instead of "EXPIRED".
      const cardStatus = personnelCardStatus(card.status, card.expiryDate);
      const pdf = await renderPersonnelCardPdf({
        kind,
        cardNumber: card.cardNumber,
        holderName: card.displayName,
        roleTitle: card.roleTitle,
        organizationUnit: card.organizationUnit,
        employmentType: card.employmentType,
        status: cardStatus,
        issueDate: card.issueDate,
        expiryDate: card.expiryDate,
        schoolName: card.school.name,
        schoolPhone: card.school.contactPhone,
        verifyUrl,
        logo,
        photo,
        qr,
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DOWNLOAD", `${kind}_CARD`, record.id,
        `${kind} identity card ${card.cardNumber} downloaded as 300 DPI print PDF.`,
        req.ip, req.headers["user-agent"] || null, "INFO");
      const safeCardNumber = card.cardNumber.replace(/[^a-zA-Z0-9_-]+/g, "-");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${kind === "TEACHER" ? "Teacher" : "Staff"}-Card-${safeCardNumber}-300DPI.pdf"`);
      res.setHeader("Content-Length", pdf.length.toString());
      res.send(pdf);
    } catch (err) {
      logger.error("Error generating personnel card PDF:", err);
      res.status(500).json({ error: "Failed to generate personnel card PDF" });
    }
  });

  // Public card verification exposes only identity and validity fields.
  app.get("/api/verify/personnel/:token", async (req, res) => {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { cardVerifyToken: req.params.token },
        include: { user: true, classes: { include: { class: true } }, subjects: { include: { subject: true } } },
      });
      const kind: PersonnelCardKind = teacher ? "TEACHER" : "STAFF";
      const record = teacher || await prisma.employee.findUnique({
        where: { cardVerifyToken: req.params.token },
        include: { user: true, department: true, designation: true },
      });
      if (!record) { res.status(404).json({ valid: false, error: "Personnel card not found" }); return; }
      const card = await personnelCardPayload(kind, record);
      const status = personnelCardStatus(card.status, card.expiryDate);
      res.json({
        valid: status === "ACTIVE",
        status,
        cardNumber: card.cardNumber,
        cardType: kind === "TEACHER" ? "Teacher ID Card" : "Staff ID Card",
        holderName: card.displayName,
        roleTitle: card.roleTitle,
        organizationUnit: card.organizationUnit,
        issueDate: card.issueDate,
        expiryDate: card.expiryDate,
        school: card.school,
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(404).json({ valid: false, error: "Verification unavailable" }); return; }
      logger.error("Error verifying personnel card:", err);
      res.status(500).json({ valid: false, error: "Internal Server Error" });
    }
  });

  // ── Official documents (report cards, transcripts, certificates) ─────────────
  const DOC_PREFIX: Record<string, string> = {
    REPORT_CARD: "RC", TRANSCRIPT: "TR", ENROLLMENT_CONFIRMATION: "EN",
    COMPLETION_CERTIFICATE: "CC", PROGRESS_REPORT: "PR", STUDENT_ID_CARD: "ID",
  };
  const DOC_TYPES = Object.keys(DOC_PREFIX);
  const DOC_STATUSES = ["ACTIVE", "CANCELLED", "REISSUED"];
  const canIssueDocs = (role: string) => role === "ADMIN" || role === "TEACHER";
  const normalizeDocumentTerm = (value: unknown): string | undefined | null => {
    if (value == null || value === "") return undefined;
    if (typeof value !== "string") return null;
    const term = value.trim();
    return term && term.length <= 100 ? term : null;
  };

  const attendanceSummary = async (studentId: string) => {
    const att = await prisma.attendance.findMany({ where: { studentId } });
    const total = att.length;
    const present = att.filter((a) => a.status === "PRESENT").length;
    const absent = att.filter((a) => a.status === "ABSENT").length;
    const late = att.filter((a) => a.status === "LATE").length;
    const excused = att.filter((a) => a.status === "EXCUSED").length;
    return { total, present, absent, late, excused, rate: total ? round1((present / total) * 100) : 0 };
  };

  const academicStatus = (termAverage: number | null, warnings: string[]) => {
    if (termAverage == null) return "In Progress";
    if (warnings.length > 0 || termAverage < WARNING_THRESHOLD) return "Academic Warning";
    if (termAverage >= 85) return "Honor Roll";
    return "Good Standing";
  };

  // Builds an immutable snapshot for a document at issue time.
  const buildDocumentSnapshot = async (type: string, studentId: string, term?: string, issuedAt = new Date()) => {
    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true, class: true } });
    if (!student) return null;
    const profile = await prisma.schoolProfile.findFirst();
    const school = {
      name: profile?.name || "School",
      address: profile?.address || null,
      contactEmail: profile?.contactEmail || null,
      contactPhone: profile?.contactPhone || null,
      logoUrl: profile?.logoUrl || null,
    };
    const base: any = {
      school,
      student: {
        name: fullName(student.user), code: student.studentCode,
        className: student.class?.name || "Unassigned",
        gender: student.gender || null,
        enrollmentDate: student.enrollmentDate, status: student.status || "ACTIVE",
        academicYear: student.class?.academicYear || null,
        level: student.class?.level || null,
        photoUrl: student.profilePhotoUrl || null,
        dateOfBirth: student.dateOfBirth || null,
        identityType: student.identityType || null,
        identityNumber: student.identityNumber || null,
      },
      term: term || student.class?.academicYear || null,
    };

    if (type === "STUDENT_ID_CARD") {
      const expiryDate = inferStudentCardExpiry(student.class?.academicYear, issuedAt);
      return {
        ...base,
        validity: { issueDate: issuedAt.toISOString(), expiryDate: expiryDate.toISOString() },
      };
    }
    if (type === "ENROLLMENT_CONFIRMATION") return base;

    const progress = await buildStudentProgress(studentId).catch(() => null);
    const attendance = await attendanceSummary(studentId);
    if (type === "COMPLETION_CERTIFICATE") {
      return {
        ...base,
        gedReadiness: progress?.gedReadiness || [],
        passedSubjects: (progress?.gedReadiness || []).filter((g: any) => g.status === "PASSED").map((g: any) => g.subject),
        termAverage: progress?.termAverage ?? null,
        letter: progress?.letter ?? null,
      };
    }
    // REPORT_CARD / PROGRESS_REPORT / TRANSCRIPT
    return {
      ...base,
      subjects: progress?.subjects || [],
      termAverage: progress?.termAverage ?? null,
      letter: progress?.letter ?? null,
      warnings: progress?.warnings || [],
      academicStatus: academicStatus(progress?.termAverage ?? null, progress?.warnings || []),
      comments: progress?.comments || [],
      trend: progress?.trend || [],
      gedReadiness: progress?.gedReadiness || [],
      attendance,
    };
  };

  const makeDocumentNumber = async (type: string) => {
    const profile = await prisma.schoolProfile.findFirst();
    const schoolCode = ((profile?.name || "School").split(/\s+/).map((w: string) => w[0]).join("").slice(0, 5).toUpperCase()) || "SCH";
    // A count-based suffix gave every row in a bulk transaction the same
    // number because uncommitted inserts are invisible to the separate count
    // query. A timestamp plus cryptographic nonce remains human-readable while
    // being safe across bulk jobs and concurrent app instances.
    const now = new Date();
    const stamp = now.toISOString().replace(/\D/g, "").slice(0, 17);
    const nonce = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${schoolCode}-${DOC_PREFIX[type]}-${stamp}-${nonce}`;
  };

  app.post("/api/documents", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canIssueDocs(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { type, studentId, term } = req.body || {};
    if (!type || !studentId) { res.status(400).json({ error: "type and studentId are required" }); return; }
    if (!DOC_TYPES.includes(type)) { res.status(400).json({ error: "Invalid document type" }); return; }
    const normalizedTerm = normalizeDocumentTerm(term);
    if (normalizedTerm === null) { res.status(400).json({ error: "term must be a non-empty string of 100 characters or fewer" }); return; }
    try {
      const targetStudent = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } });
      if (!targetStudent) { res.status(404).json({ error: "Student not found" }); return; }
      if (jwtUser.role === "TEACHER" && (!targetStudent.classId || !(await canAccessTeacherClass(req, targetStudent.classId)))) {
        res.status(403).json({ error: "You may only issue documents to students in your assigned classes" });
        return;
      }
      const issuedAt = new Date();
      const snapshot = await buildDocumentSnapshot(type, studentId, normalizedTerm, issuedAt);
      if (!snapshot) { res.status(404).json({ error: "Student not found" }); return; }
      const existing = await prisma.generatedDocument.findFirst({
        where: { studentId, type, status: "ACTIVE", term: snapshot.term ?? null },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        res.status(409).json({
          error: `An active ${type === "STUDENT_ID_CARD" ? "student card" : "document"} already exists for this period`,
          existingDocument: { id: existing.id, documentNumber: existing.documentNumber, type: existing.type },
        });
        return;
      }
      const documentNumber = await makeDocumentNumber(type);
      const verifyToken = crypto.randomBytes(16).toString("hex");
      const doc = await prisma.generatedDocument.create({
        data: {
          documentNumber, verifyToken, type, status: "ACTIVE",
          studentId, studentName: snapshot.student.name, studentCode: snapshot.student.code,
          className: snapshot.student.className, term: snapshot.term,
          payload: snapshot, issuedById: jwtUser.userId, issuedByName: jwtUser.email,
          issueDate: issuedAt,
          expiryDate: type === "STUDENT_ID_CARD" ? new Date(snapshot.validity.expiryDate) : null,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "GENERATE", "DOCUMENT", doc.id,
        `${type} ${documentNumber} generated for ${snapshot.student.name}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(doc);
    } catch (err: any) {
      if (err?.code === "P2002") {
        res.status(409).json({ error: "An active document already exists, or another document was generated at the same time" });
        return;
      }
      logger.error("Error generating document:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Classes the current user may bulk-generate documents for: admins see all,
  // teachers see only the classes they're assigned to. (Registered before the
  // "/:id" route so "eligible-classes" isn't captured as an id.)
  app.get("/api/documents/eligible-classes", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canIssueDocs(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      if (jwtUser.role === "ADMIN") {
        const classes = await prisma.class.findMany({
          select: { id: true, name: true, _count: { select: { students: true } } },
          orderBy: { name: "asc" },
        });
        res.json(classes.map((c) => ({ id: c.id, name: c.name, studentCount: c._count.students })));
        return;
      }
      const teacher = await prisma.teacher.findFirst({ where: { userId: jwtUser.userId }, select: { id: true } });
      if (!teacher) { res.json([]); return; }
      const links = await prisma.classTeacher.findMany({
        where: { teacherId: teacher.id },
        select: { class: { select: { id: true, name: true, _count: { select: { students: true } } } } },
      });
      res.json(links.map((l) => ({ id: l.class.id, name: l.class.name, studentCount: l.class._count.students })));
    } catch (err) {
      logger.error("Error fetching eligible classes:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Bulk-generate one document type for every active student in a class. Teachers
  // may only target classes they are assigned to; admins may target any class.
  app.post("/api/documents/bulk", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canIssueDocs(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { type, classId, term } = req.body || {};
    if (!type || !classId) { res.status(400).json({ error: "type and classId are required" }); return; }
    if (!DOC_TYPES.includes(type)) { res.status(400).json({ error: "Invalid document type" }); return; }
    const normalizedTerm = normalizeDocumentTerm(term);
    if (normalizedTerm === null) { res.status(400).json({ error: "term must be a non-empty string of 100 characters or fewer" }); return; }

    // Use a transaction for atomicity - either all documents are created or none
    try {
      // Ownership guard for teachers.
      if (jwtUser.role === "TEACHER") {
        const teacher = await prisma.teacher.findFirst({ where: { userId: jwtUser.userId }, select: { id: true } });
        const owns = teacher && await prisma.classTeacher.findUnique({
          where: { classId_teacherId: { classId, teacherId: teacher.id } },
        });
        if (!owns) { res.status(403).json({ error: "You are not assigned to this class" }); return; }
      }
      const klass = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
      if (!klass) { res.status(404).json({ error: "Class not found" }); return; }

      // Fetch students with class info for accurate term matching
      const students = await prisma.student.findMany({
        where: { classId, status: "ACTIVE" },
        select: { id: true, class: { select: { academicYear: true } } },
      });

      // Build a map of studentId -> effectiveTerm for consistent lookups
      const studentTerms = new Map<string, string | null>();
      for (const s of students) {
        studentTerms.set(s.id, normalizedTerm || s.class?.academicYear || null);
      }

      // Batch fetch all existing ACTIVE documents for these students (optimizes N+1 queries)
      const existingDocs = await prisma.generatedDocument.findMany({
        where: {
          studentId: { in: students.map((s) => s.id) },
          type,
          status: "ACTIVE",
        },
        select: { studentId: true, term: true },
      });
      const existingKey = new Set(existingDocs.map((d) => `${d.studentId}|${d.term}`));

      let generated = 0;
      let skipped = 0;
      const errors: { studentId: string; message: string }[] = [];

      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        for (const s of students) {
          try {
            const effectiveTerm = studentTerms.get(s.id)!;
            // Check if student already has an ACTIVE document of this type and term
            if (existingKey.has(`${s.id}|${effectiveTerm}`)) {
              skipped++;
              continue;
            }

            const issuedAt = new Date();
            const snapshot = await buildDocumentSnapshot(type, s.id, normalizedTerm, issuedAt);
            if (!snapshot) { errors.push({ studentId: s.id, message: "Student data unavailable" }); continue; }

            const documentNumber = await makeDocumentNumber(type);
            const verifyToken = crypto.randomBytes(16).toString("hex");
            await tx.generatedDocument.create({
              data: {
                documentNumber, verifyToken, type, status: "ACTIVE",
                studentId: s.id, studentName: snapshot.student.name, studentCode: snapshot.student.code,
                className: snapshot.student.className, term: snapshot.term,
                payload: snapshot, issuedById: jwtUser.userId, issuedByName: jwtUser.email,
                issueDate: issuedAt,
                expiryDate: type === "STUDENT_ID_CARD" ? new Date(snapshot.validity.expiryDate) : null,
              },
            });
            generated++;
          } catch (e) {
            errors.push({ studentId: s.id, message: "Generation failed" });
          }
        }
      });

      await createAuditLog(jwtUser.userId, jwtUser.email, "GENERATE", "DOCUMENT", classId,
        `Bulk ${type}: ${generated} generated for class '${klass.name}'${skipped ? `, ${skipped} skipped (existing)` : ""}${errors.length ? `, ${errors.length} failed` : ""}.`,
        req.ip, req.headers["user-agent"] || null, (errors.length || skipped) ? "WARNING" : "SUCCESS");
      res.status(201).json({ generated, skipped, failed: errors.length, total: students.length, className: klass.name, errors });
    } catch (err: any) {
      // Prisma unique constraint violations (race conditions) will be caught here
      if (err.code === "P2002") {
        logger.warn("Race condition detected in bulk document generation:", err);
        res.status(409).json({ error: "Concurrent generation detected. Please try again." });
        return;
      }
      logger.error("Error bulk-generating documents:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const hydrateLegacyStudentCardIdentity = async <T extends { type: string; studentId: string; payload: unknown }>(docs: T[]): Promise<T[]> => {
    const legacy = docs.filter((doc) => {
      if (doc.type !== "STUDENT_ID_CARD") return false;
      const student = ((doc.payload || {}) as any).student;
      return !student || !("identityNumber" in student);
    });
    if (!legacy.length) return docs;
    const students = await prisma.student.findMany({
      where: { id: { in: [...new Set(legacy.map((doc) => doc.studentId))] } },
      select: { id: true, identityType: true, identityNumber: true },
    });
    const identityByStudent = new Map(students.map((student) => [student.id, student]));
    return docs.map((doc) => {
      const identity = identityByStudent.get(doc.studentId);
      if (doc.type !== "STUDENT_ID_CARD" || !identity) return doc;
      const payload = (doc.payload || {}) as any;
      if (payload.student && "identityNumber" in payload.student) return doc;
      return {
        ...doc,
        payload: {
          ...payload,
          student: {
            ...(payload.student || {}),
            identityType: identity.identityType || null,
            identityNumber: identity.identityNumber || null,
          },
        },
      };
    });
  };

  app.get("/api/documents", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const { studentId, type, status } = req.query as { studentId?: string; type?: string; status?: string };
    if (type && !DOC_TYPES.includes(type)) { res.status(400).json({ error: "Invalid document type" }); return; }
    if (status && !DOC_STATUSES.includes(status)) { res.status(400).json({ error: "Invalid document status" }); return; }
    try {
      const jwtUser = (req as any).user as JwtPayload;
      const where: any = {};
      if (studentId) where.studentId = studentId;
      if (type) where.type = type;
      if (status) where.status = status;
      if (jwtUser.role === "TEACHER") {
        const classIds = await getTeacherClassIds(jwtUser.userId);
        where.student = { classId: { in: classIds } };
      }
      const docs = await prisma.generatedDocument.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 });
      res.json(await hydrateLegacyStudentCardIdentity(docs));
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error("Error listing documents:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/student/documents", authMiddleware, studentOnly, async (req, res) => {
    const { type, status } = req.query as { type?: string; status?: string };
    if (type && !DOC_TYPES.includes(type)) { res.status(400).json({ error: "Invalid document type" }); return; }
    if (status && !DOC_STATUSES.includes(status)) { res.status(400).json({ error: "Invalid document status" }); return; }
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const where: any = { studentId: s.id };
      if (type) where.type = type;
      where.status = status || { not: "CANCELLED" };
      const docs = await prisma.generatedDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      res.json(await hydrateLegacyStudentCardIdentity(docs));
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error("Error listing own documents:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const canReadGeneratedDocument = async (
    req: express.Request,
    doc: { studentId: string },
  ): Promise<boolean> => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role === "ADMIN") return true;
    if (jwtUser.role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId }, select: { id: true } });
      return student?.id === doc.studentId;
    }
    if (jwtUser.role === "TEACHER") {
      const student = await prisma.student.findUnique({ where: { id: doc.studentId }, select: { classId: true } });
      return Boolean(student?.classId && await canAccessTeacherClass(req, student.classId));
    }
    return false;
  };

  app.get("/api/documents/:id", authMiddleware, async (req, res) => {
    try {
      const doc = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
      if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
      if (!(await canReadGeneratedDocument(req, doc))) { res.status(403).json({ error: "Forbidden" }); return; }
      res.json((await hydrateLegacyStudentCardIdentity([doc]))[0]);
    } catch (err) {
      logger.error("Error fetching document:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/documents/:id/student-card.pdf", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const card = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
      if (!card) { res.status(404).json({ error: "Document not found" }); return; }
      if (card.type !== "STUDENT_ID_CARD") { res.status(400).json({ error: "Document is not a student card" }); return; }
      if (!(await canReadGeneratedDocument(req, card))) { res.status(403).json({ error: "Forbidden" }); return; }

      const payload = (card.payload || {}) as any;
      const student = payload.student || {};
      if (!("identityNumber" in student)) {
        const currentStudent = await prisma.student.findUnique({
          where: { id: card.studentId },
          select: { identityType: true, identityNumber: true },
        });
        student.identityType = currentStudent?.identityType || null;
        student.identityNumber = currentStudent?.identityNumber || null;
      }
      const school = payload.school || {};
      const profile = await prisma.schoolProfile.findFirst();
      const schoolName = school.name || profile?.name || "School";
      const issueDate = card.issueDate;
      const expiryDate = card.expiryDate
        || (payload.validity?.expiryDate ? new Date(payload.validity.expiryDate) : null)
        || inferStudentCardExpiry(student.academicYear || card.term, issueDate);
      const verifyUrl = `${req.protocol}://${req.get("host")}/verify/${card.verifyToken}`;
      const logo = await loadPdfLogo(school.logoUrl || profile?.logoUrl);

      let photo: Buffer | null = null;
      const photoUrl = typeof student.photoUrl === "string" ? student.photoUrl : "";
      const photoPrefix = "/uploads/profile-photos/";
      if (photoUrl.startsWith(photoPrefix)) {
        const filename = photoUrl.slice(photoPrefix.length).split(/[?#]/, 1)[0];
        if (filename && filename === path.basename(filename)) {
          try {
            const input = await fs.promises.readFile(path.join(PROFILE_PHOTO_DIR, filename));
            photo = await sharp(input, { animated: false, limitInputPixels: 40_000_000 })
              .rotate().resize(600, 760, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer();
          } catch {
            photo = null;
          }
        }
      }

      let qr: Buffer | null = null;
      try { qr = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 500 }); } catch { qr = null; }
      const pdf = await renderStudentCardPdf({
        documentNumber: card.documentNumber,
        status: card.status === "ACTIVE" && expiryDate.getTime() < Date.now() ? "EXPIRED" : card.status,
        studentName: card.studentName,
        studentCode: card.studentCode,
        identityNumber: typeof student.identityNumber === "string" ? student.identityNumber : null,
        className: card.className,
        academicYear: student.academicYear || card.term || null,
        issueDate,
        expiryDate,
        schoolName,
        schoolPhone: school.contactPhone || profile?.contactPhone || null,
        verifyUrl,
        logo,
        photo,
        qr,
      });

      await prisma.generatedDocument.update({ where: { id: card.id }, data: { downloadCount: { increment: 1 } } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DOWNLOAD", "DOCUMENT", card.id,
        `STUDENT_ID_CARD ${card.documentNumber} downloaded as PDF.`, req.ip, req.headers["user-agent"] || null, "INFO");
      const safeStudentCode = card.studentCode.replace(/[^a-zA-Z0-9_-]+/g, "-");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Student-Card-${safeStudentCode}.pdf"`);
      res.setHeader("Content-Length", pdf.length.toString());
      res.send(pdf);
    } catch (err) {
      logger.error("Error generating student card PDF:", err);
      res.status(500).json({ error: "Failed to generate student card PDF" });
    }
  });

  app.post("/api/documents/:id/download", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const doc = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
      if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
      if (!(await canReadGeneratedDocument(req, doc))) { res.status(403).json({ error: "Forbidden" }); return; }
      await prisma.generatedDocument.update({ where: { id: doc.id }, data: { downloadCount: { increment: 1 } } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DOWNLOAD", "DOCUMENT", doc.id,
        `${doc.type} ${doc.documentNumber} downloaded.`, req.ip, req.headers["user-agent"] || null, "INFO");
      res.json({ success: true });
    } catch (err) {
      logger.error("Error recording download:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Cancel/Delete may be done by ADMIN, or by the TEACHER who originally
  // issued the document (mirrors the ownership pattern used elsewhere in
  // the app, e.g. flashcard decks / subject-teacher assignment).
  const canModifyDocument = (jwtUser: JwtPayload, doc: { issuedById: string }) =>
    jwtUser.role === "ADMIN" || (jwtUser.role === "TEACHER" && doc.issuedById === jwtUser.userId);

  app.post("/api/documents/:id/cancel", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { reason } = req.body || {};
    try {
      const existing = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Document not found" }); return; }
      if (!canModifyDocument(jwtUser, existing)) { res.status(403).json({ error: "Forbidden" }); return; }
      const doc = await prisma.generatedDocument.update({
        where: { id: req.params.id },
        data: { status: "CANCELLED", cancelledReason: reason || null },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CANCEL", "DOCUMENT", doc.id,
        `${doc.type} ${doc.documentNumber} cancelled. ${reason ? `Reason: ${reason}` : ""}`.trim(),
        req.ip, req.headers["user-agent"] || null, "WARNING");
      res.json(doc);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Document not found" }); return; }
      logger.error("Error cancelling document:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Permanent delete -- removes the record entirely (unlike Cancel, which
  // just flags it CANCELLED but keeps it around for the audit trail / public
  // verify page). No physical files to clean up: documents are rendered
  // on-the-fly from the stored `payload` JSON snapshot.
  app.delete("/api/documents/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const existing = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Document not found" }); return; }
      if (!canModifyDocument(jwtUser, existing)) { res.status(403).json({ error: "Forbidden" }); return; }
      await prisma.generatedDocument.delete({ where: { id: req.params.id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "DOCUMENT", existing.id,
        `${existing.type} ${existing.documentNumber} deleted.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Document not found" }); return; }
      logger.error("Error deleting document:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Reissue: re-generate from a fresh snapshot, mark the old one REISSUED, link them.
  app.post("/api/documents/:id/reissue", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const old = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
      if (!old) { res.status(404).json({ error: "Document not found" }); return; }
      const issuedAt = new Date();
      const snapshot = await buildDocumentSnapshot(old.type, old.studentId, old.term || undefined, issuedAt);
      if (!snapshot) { res.status(404).json({ error: "Student not found" }); return; }
      const documentNumber = await makeDocumentNumber(old.type);
      const verifyToken = crypto.randomBytes(16).toString("hex");
      const fresh = await prisma.$transaction(async (tx) => {
        const created = await tx.generatedDocument.create({
          data: {
            documentNumber, verifyToken, type: old.type, status: "ACTIVE",
            studentId: old.studentId, studentName: snapshot.student.name, studentCode: snapshot.student.code,
            className: snapshot.student.className, term: snapshot.term, payload: snapshot,
            issuedById: jwtUser.userId, issuedByName: jwtUser.email, reissuedFromId: old.id,
            issueDate: issuedAt,
            expiryDate: old.type === "STUDENT_ID_CARD" ? new Date(snapshot.validity.expiryDate) : null,
          },
        });
        await tx.generatedDocument.update({ where: { id: old.id }, data: { status: "REISSUED" } });
        return created;
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "REISSUE", "DOCUMENT", fresh.id,
        `${old.type} reissued: ${old.documentNumber} → ${documentNumber}.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.status(201).json(fresh);
    } catch (err) {
      logger.error("Error reissuing document:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // PUBLIC verification — reveals only non-sensitive info (no grades/attendance).
  app.get("/api/verify/:token", async (req, res) => {
    try {
      const doc = await prisma.generatedDocument.findUnique({ where: { verifyToken: req.params.token } });
      if (!doc) { res.status(404).json({ valid: false, error: "Document not found" }); return; }
      const profile = await prisma.schoolProfile.findFirst();
      const TYPE_LABELS: Record<string, string> = {
        REPORT_CARD: "Term Report Card", TRANSCRIPT: "Academic Transcript",
        ENROLLMENT_CONFIRMATION: "Enrollment Confirmation", COMPLETION_CERTIFICATE: "Completion Certificate",
        PROGRESS_REPORT: "Student Progress Report", STUDENT_ID_CARD: "Student ID Card",
      };
      const payload = (doc.payload || {}) as any;
      const expiryDate = doc.type === "STUDENT_ID_CARD"
        ? doc.expiryDate
          || (payload.validity?.expiryDate ? new Date(payload.validity.expiryDate) : null)
          || inferStudentCardExpiry(payload.student?.academicYear || doc.term, doc.issueDate)
        : null;
      const expired = Boolean(expiryDate && expiryDate.getTime() < Date.now());
      res.json({
        valid: doc.status === "ACTIVE" && !expired,
        status: expired && doc.status === "ACTIVE" ? "EXPIRED" : doc.status,
        documentNumber: doc.documentNumber,
        documentType: TYPE_LABELS[doc.type] || doc.type,
        studentName: doc.studentName,
        term: doc.term,
        issueDate: doc.issueDate,
        expiryDate,
        school: {
          name: profile?.name || "School",
          logoUrl: profile?.logoUrl || null,
          contactPhone: profile?.contactPhone || null,
        },
        cancelledReason: doc.status === "CANCELLED" ? doc.cancelledReason : null,
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(404).json({ valid: false, error: "Verification unavailable" }); return; }
      logger.error("Error verifying document:", err);
      res.status(500).json({ valid: false, error: "Internal Server Error" });
    }
  });

  // ── Vite / Static serving ───────────────────────────────────────────────────
  // ── Scheduled daily backup (runs only when enabled in Settings) ───────────────
  // Self-rescheduling so it always targets the next HOUR:00 local time (no interval
  // drift), plus a boot-time catch-up so a server that was powered off at backup
  // time still gets a daily backup — without spamming a new dump on every restart.
  const scheduleDailyBackup = () => {
    const HOUR = Number(process.env.BACKUP_HOUR || 2); // local hour, default 02:00
    const STALE_MS = 20 * 60 * 60 * 1000; // treat a backup as "due" if newest is older than this

    const newestBackupAgeMs = (): number => {
      const newest = listBackups().find((artifact) => artifact.kind === "database");
      return newest ? Date.now() - new Date(newest.createdAt).getTime() : Infinity;
    };

    const runIfEnabled = async (reason: string, onlyWhenStale: boolean) => {
      try {
        const settings = await prisma.schoolProfile.findFirst({ select: { backupEnabled: true } });
        if (!settings?.backupEnabled) return;
        if (onlyWhenStale && newestBackupAgeMs() < STALE_MS) return; // a fresh backup already exists
        const backup = await runBackup();
        logger.info(`${reason} backup created: ${backup.name}`);
        await createAuditLog(null, "system", "BACKUP", "SYSTEM", null,
          `${reason} database backup created (${backup.name}).`, null, null, "SUCCESS").catch(() => {});
      } catch (err: any) {
        logger.error(`${reason} backup failed:`, err.message);
        await createAuditLog(null, "system", "BACKUP", "SYSTEM", null,
          `${reason} database backup failed: ${err.message}`, null, null, "DANGER").catch(() => {});
      }
    };

    // Re-arm for the next HOUR:00 after each run so we never drift off the clock.
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(HOUR, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = next.getTime() - now.getTime();
      setTimeout(async () => {
        await runIfEnabled("Scheduled", false);
        scheduleNext();
      }, delay);
      logger.info(`Next daily backup scheduled for ${next.toLocaleString()} (when enabled in Settings).`);
    };
    scheduleNext();

    // Catch-up shortly after boot, in case the machine was off at HOUR:00.
    setTimeout(() => { void runIfEnabled("Catch-up", true); }, 60 * 1000);
  };
  scheduleDailyBackup();

  // ── Scheduled daily news digest refresh ─────────────────────────────────────
  // Same self-rescheduling pattern as the backup job above: always targets the
  // next HOUR:00 local time, plus a boot-time catch-up so a fresh install (or a
  // server that was off at refresh time) still gets today's articles promptly.
  const scheduleNewsRefresh = () => {
    const HOUR = Number(process.env.NEWS_REFRESH_HOUR || 6); // local hour, default 06:00
    const STALE_MS = 20 * 60 * 60 * 1000;

    const anySourceStale = async (): Promise<boolean> => {
      const sources = await (prisma as any).newsSource.findMany({ where: { enabled: true }, select: { lastFetchedAt: true } }).catch(() => []);
      if (!sources.length) return true; // nothing fetched yet
      return sources.some((s) => !s.lastFetchedAt || Date.now() - new Date(s.lastFetchedAt).getTime() > STALE_MS);
    };

    const runIfDue = async (reason: string, onlyWhenStale: boolean) => {
      try {
        if (onlyWhenStale && !(await anySourceStale())) return;
        await refreshAllNewsSources();
      } catch (err: any) {
        logger.error(`${reason} news refresh failed:`, err.message);
      }
    };

    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(HOUR, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = next.getTime() - now.getTime();
      setTimeout(async () => {
        await runIfDue("Scheduled", false);
        scheduleNext();
      }, delay);
      logger.info(`Next news digest refresh scheduled for ${next.toLocaleString()}.`);
    };
    scheduleNext();

    // Catch-up shortly after boot so a first install / stale feed isn't empty.
    setTimeout(() => { void runIfDue("Catch-up", true); }, 90 * 1000);
  };
  scheduleNewsRefresh();

  // Sweep expired social posts and ephemeral chat photos (rows + files) hourly.
  const cleanupEphemeral = async () => {
    try {
      const now = new Date();
      // Social posts (likes/comments cascade).
      const posts = await prisma.socialPost.findMany({ where: { expiresAt: { lte: now } }, select: { id: true, imageUrl: true } });
      if (posts.length) {
        const postIds = posts.map((p) => p.id);
        await prisma.$transaction(async (tx) => {
          await (tx as any).socialReport.updateMany({
            where: {
              status: "OPEN",
              OR: [
                { postId: { in: postIds } },
                { comment: { postId: { in: postIds } } },
              ],
            },
            data: { status: "DISMISSED", reviewedAt: now },
          });
          await tx.socialPost.deleteMany({ where: { id: { in: postIds } } });
        });
        for (const p of posts) if (p.imageUrl) { try { const fp = path.join(SOCIAL_DIR, path.basename(p.imageUrl)); if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* ignore */ } }
      }
      // Ephemeral chat photos.
      const msgs = await prisma.chatMessage.findMany({ where: { expiresAt: { lte: now } }, select: { id: true, attachmentUrl: true } });
      if (msgs.length) {
        await prisma.chatMessage.deleteMany({ where: { id: { in: msgs.map((m) => m.id) } } });
        for (const m of msgs) if (m.attachmentUrl) { try { const fp = path.join(CHAT_MEDIA_DIR, path.basename(m.attachmentUrl)); if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* ignore */ } }
      }
      if (posts.length || msgs.length) logger.info(`Removed ${posts.length} expired post(s) and ${msgs.length} expired chat photo(s).`);
    } catch (err) { logger.error("Ephemeral cleanup failed:", err); }
  };
  cleanupEphemeral();
  setInterval(cleanupEphemeral, 60 * 60 * 1000);

  // ── Phase 2 advanced exam routes (registered before the SPA catch-all) ──────
  registerExamPhase2Routes({ app, prisma, authMiddleware, createAuditLog, logger, canManageExamClass });
  // ── Phase 3 reusable question bank routes ───────────────────────────────────
  registerExamBankRoutes({ app, prisma, authMiddleware, createAuditLog, logger, canManageExamClass });
  // ── News / Daily Digest (RSS aggregation) ───────────────────────────────────
  const { refreshAllSources: refreshAllNewsSources } = registerNewsRoutes({ app, prisma, authMiddleware, requirePermission, createAuditLog, logger });
  // ── Payroll PDF export ──────────────────────────────────────────────────────
  registerPayrollPdfRoutes({ app, prisma, authMiddleware, payrollCanManage, createAuditLog, logger });
  // ── Fee receipt PDF export ──────────────────────────────────────────────────
  registerFeesPdfRoutes({ app, prisma, authMiddleware, createAuditLog, logger });
  // ── Flashcards (teacher-authored study decks assigned to classes) ──────────
  registerFlashcardRoutes({ app, prisma, authMiddleware, createAuditLog, logger });
  registerLanguageQuestRoutes({ app, prisma, authMiddleware, createAuditLog, logger });
  registerDailyQuestRoutes({ app, prisma, authMiddleware, createAuditLog, logger });
  const gameControls = registerGameControlRoutes({ app, prisma, authMiddleware, createAuditLog, logger });
  registerWordTrailRoutes({
    app,
    prisma,
    authMiddleware,
    createAuditLog,
    logger,
    gameAccessMiddleware: gameControls.accessMiddleware("WORD_TRAIL", true),
  });
  // ── Conduct (rule catalog + violation logging + counts) ─────────────────────
  registerConductRoutes({ app, prisma, authMiddleware, createAuditLog, logger });
  // ── Conduct: Disciplinary Notice PDF export ─────────────────────────────────
  registerConductPdfRoutes({ app, prisma, authMiddleware, createAuditLog, logger });
  registerDictionaryRoutes({ app, prisma, authMiddleware, logger });
  // ── Project Gutenberg import (E-Library) ────────────────────────────────────
  registerGutenbergRoutes({ app, prisma, authMiddleware, logger });

  // ── Snake Game (educational mini-game) ───────────────────────────────────────
  registerSnakeGameRoutes({ app, prisma, authMiddleware });

  // ── Checkers Game (educational mini-game) ────────────────────────────────────
  registerCheckersGameRoutes({ app, prisma, authMiddleware });

  // ── Chess Game (online multiplayer + leaderboard) ────────────────────────────
  // chatNotify is defined further down (real-time push section) but function
  // declarations are hoisted within this scope, so the reference below is safe
  // — it's only ever invoked later, once a real HTTP request comes in.
  registerChessGameRoutes({
    app,
    prisma,
    authMiddleware,
    chatNotify,
    gameAccessMiddleware: gameControls.accessMiddleware("CHESS", true),
  });

  // ── Pac-Man Game (arcade mini-game + school-wide leaderboard) ────────────────
  registerPacmanGameRoutes({
    app,
    prisma,
    authMiddleware,
    gameAccessMiddleware: gameControls.accessMiddleware("PACMAN", true),
  });

  // NOTE: the SPA catch-all (Vite middleware in dev / static dist in prod) is
  // registered at the very end of startServer, AFTER every /api route, so it can
  // never shadow an API endpoint. See setupSpaFallback() just before app.listen.

  // ── Chat API (conversation-based) ────────────────────────────────────────────
  // Hierarchical rule: every conversation must include at least one staff member.
  // Students therefore can never have a student-only (peer-to-peer) conversation.
  const CHAT_STAFF_ROLES: Role[] = ["ADMIN", "TEACHER", "STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"];
  const isStaffRole = (role: string) => CHAT_STAFF_ROLES.includes(role as Role);
  const userBrief = (u: any) => ({ id: u.id, name: fullName(u), role: u.role, profilePhotoUrl: u.profilePhotoUrl ?? null });

  // Upload an image to attach to a chat message.
  const uploadChatMedia: express.RequestHandler = (req, res, next) => {
    chatMediaUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? "Image must be 10 MB or smaller" : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  };
  app.post("/api/chat-media", authMiddleware, chatUploadLimiter, uploadChatMedia, async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "Image file is required" }); return; }
    res.status(201).json({ url: `/uploads/chat-media/${file.filename}` });
  });

  // ── Sticker packs ────────────────────────────────────────────────────────────
  const STICKER_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
  const isStickerFile = (f: string) => STICKER_EXTS.has(path.extname(f).toLowerCase());
  const encPath = (...segs: string[]) => segs.map((s) => encodeURIComponent(s)).join("/");

  // Discover packs from the built-in dir (public in dev / dist in prod) and the
  // admin-uploaded dir. Each subfolder is a pack; loose files form "Default".
  function scanStickerDir(baseDir: string, urlPrefix: string, editable: boolean, includeEmpty = false) {
    const out: { name: string; editable: boolean; stickers: string[] }[] = [];
    if (!fs.existsSync(baseDir)) return out;
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const loose = entries.filter((e) => e.isFile() && isStickerFile(e.name)).map((e) => `${urlPrefix}/${encPath(e.name)}`);
    if (loose.length) out.push({ name: "Default", editable: false, stickers: loose });
    for (const d of entries.filter((e) => e.isDirectory())) {
      try {
        const files = fs.readdirSync(path.join(baseDir, d.name)).filter(isStickerFile).map((f) => `${urlPrefix}/${encPath(d.name, f)}`);
        // Keep empty editable packs so admins can see and upload into them.
        if (files.length || includeEmpty) out.push({ name: d.name, editable, stickers: files });
      } catch { /* skip */ }
    }
    return out;
  }

  app.get("/api/chat/stickers", authMiddleware, async (_req, res) => {
    try {
      const builtinDir = path.join(process.cwd(), isProduction ? "dist" : "public", "stickers");
      const builtin = scanStickerDir(builtinDir, "/stickers", false);
      const uploaded = scanStickerDir(STICKER_UPLOAD_DIR, "/uploads/stickers", true, true);
      // Merge by pack name (uploaded extends built-in of same name).
      const byName = new Map<string, { name: string; editable: boolean; stickers: string[] }>();
      for (const p of [...builtin, ...uploaded]) {
        const ex = byName.get(p.name);
        if (ex) { ex.stickers.push(...p.stickers); ex.editable = ex.editable || p.editable; }
        else byName.set(p.name, { ...p });
      }
      res.json({ packs: Array.from(byName.values()) });
    } catch (err) {
      logger.error("Error listing stickers:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/chat/sticker-packs", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const name = sanitizePack(req.body?.name);
    if (!name) { res.status(400).json({ error: "A valid pack name is required" }); return; }
    try {
      const packPath = path.join(STICKER_UPLOAD_DIR, name);
      // Validate the resolved path is still within the upload directory
      const resolvedPath = path.resolve(packPath);
      if (!resolvedPath.startsWith(path.resolve(STICKER_UPLOAD_DIR))) {
        res.status(400).json({ error: "Invalid pack name" });
        return;
      }
      fs.mkdirSync(packPath, { recursive: true });
      res.status(201).json({ name });
    } catch (err) {
      logger.error("Error creating sticker pack:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/chat/sticker-packs/:pack/stickers", authMiddleware, requirePermission("manage_all"), (req, res) => {
    // Store pack name on request for multer storage to access
    (req as any).stickerPack = sanitizePack(req.params.pack) || "Custom";
    stickerUpload.array("files", 50)(req, res, (err: any) => {
      if (err) {
        const msg = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE" ? "Each sticker must be 5 MB or smaller" : err.message || "Upload failed";
        res.status(400).json({ error: msg });
        return;
      }
      const files = ((req as any).files as Express.Multer.File[]) || [];
      if (!files.length) { res.status(400).json({ error: "No images uploaded" }); return; }

      const pack = sanitizePack(req.params.pack) || "Custom";
      if (!pack) {
        res.status(400).json({ error: "Invalid pack name" });
        return;
      }

      // Validate pack path is safe
      const packPath = path.join(STICKER_UPLOAD_DIR, pack);
      const resolvedPath = path.resolve(packPath);
      if (!resolvedPath.startsWith(path.resolve(STICKER_UPLOAD_DIR))) {
        res.status(400).json({ error: "Invalid pack path" });
        return;
      }

      res.status(201).json({ pack, urls: files.map((f) => `/uploads/stickers/${encPath(pack, f.filename)}`) });
    });
  });

  app.delete("/api/chat/sticker-packs/:pack/stickers/:file", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const pack = sanitizePack(req.params.pack);
    const file = sanitizeFile(req.params.file);
    if (!pack || !file) { res.status(400).json({ error: "Invalid pack or file name" }); return; }

    try {
      const fp = path.join(STICKER_UPLOAD_DIR, pack, file);
      // Validate the resolved path is still within the upload directory
      const resolvedPath = path.resolve(fp);
      if (!resolvedPath.startsWith(path.resolve(STICKER_UPLOAD_DIR))) {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting sticker:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/chat/sticker-packs/:pack", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const pack = sanitizePack(req.params.pack);
    if (!pack) { res.status(400).json({ error: "Invalid pack name" }); return; }

    try {
      const dir = path.join(STICKER_UPLOAD_DIR, pack);
      // Validate the resolved path is still within the upload directory
      const resolvedPath = path.resolve(dir);
      if (!resolvedPath.startsWith(path.resolve(STICKER_UPLOAD_DIR))) {
        res.status(400).json({ error: "Invalid pack path" });
        return;
      }
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting sticker pack:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Social Space (24h posts + class snapshots + video highlights) ────────────
  const uploadSocial: express.RequestHandler = (req, res, next) => {
    socialUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const msg = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE" ? "Image must be 10 MB or smaller" : err.message || "Upload failed";
      res.status(400).json({ error: msg });
    });
  };

  // Multi-photo variant for FB/IG-style posts (max 8). Accepts the same field
  // name ("files") the client sends; falls back to the legacy single "file"
  // field so older clients keep working. Same file-type/size limits as single.
  const SOCIAL_MAX_FILES = 8;
  const uploadSocialMedia: express.RequestHandler = (req, res, next) => {
    socialUpload.array("files", SOCIAL_MAX_FILES)(req, res, (err: any) => {
      if (err) {
        const msg = err instanceof multer.MulterError
          ? (err.code === "LIMIT_FILE_SIZE" ? "Each image must be 10 MB or smaller"
            : err.code === "LIMIT_FILE_COUNT" ? `A post can have at most ${SOCIAL_MAX_FILES} photos`
            : err.message)
          : (err.message || "Upload failed");
        res.status(400).json({ error: msg });
        return;
      }
      // Accept the legacy single-file field too ("file") for older clients.
      const files = (req as any).files as Express.Multer.File[] | undefined;
      const single = (req as any).file as Express.Multer.File | undefined;
      if (!files?.length && single) (req as any).files = [single];
      next();
    });
  };

  const socialAudienceWhere = async (jwtUser: JwtPayload): Promise<any> => {
    if (jwtUser.role === "ADMIN") return {};
    if (jwtUser.role === "TEACHER") {
      const classIds = await getTeacherClassIds(jwtUser.userId);
      return {
        OR: [
          { audience: "SCHOOL" },
          { audience: "STAFF" },
          ...(classIds.length ? [{ audience: "CLASS", classId: { in: classIds } }] : []),
        ],
      };
    }
    if (jwtUser.role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId }, select: { classId: true } });
      return {
        OR: [
          { audience: "SCHOOL" },
          ...(student?.classId ? [{ audience: "CLASS", classId: student.classId }] : []),
        ],
      };
    }
    return { audience: { in: ["SCHOOL", "STAFF"] } };
  };

  const socialVisibleWhere = async (jwtUser: JwtPayload): Promise<any> => ({
    AND: [
      { publishStatus: "PUBLISHED" },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      await socialAudienceWhere(jwtUser),
    ],
  });

  const findVisibleSocialPost = async (id: string, jwtUser: JwtPayload): Promise<any | null> =>
    (prisma as any).socialPost.findFirst({
      where: { AND: [{ id }, await socialVisibleWhere(jwtUser)] },
      include: { author: { select: { id: true } } },
    });

  app.post("/api/social/media-session", authMiddleware, (req, res) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) { res.status(400).json({ error: "Token required" }); return; }
    res.cookie("social_media_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/uploads/social",
    });
    res.json({ success: true });
  });

  app.get("/api/social/composer-options", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.json({ classes: [], videos: [] });
      return;
    }
    try {
      const classIds = jwtUser.role === "ADMIN" ? null : await getTeacherClassIds(jwtUser.userId);
      const [classes, videos] = await Promise.all([
        prisma.class.findMany({
          where: { status: { not: "ARCHIVED" }, ...(classIds ? { id: { in: classIds } } : {}) },
          select: { id: true, name: true, level: true },
          orderBy: { name: "asc" },
        }),
        prisma.videoLesson.findMany({
          where: { status: "PUBLISHED", ...(jwtUser.role === "TEACHER" ? { uploadedById: jwtUser.userId } : {}) },
          select: { id: true, title: true, thumbnailUrl: true, duration: true, classId: true, uploadedById: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ]);
      res.json({ classes, videos });
    } catch (err) {
      logger.error("Error loading Social Space composer options:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/social", authMiddleware, uploadSocialMedia, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const files = ((req as any).files as Express.Multer.File[] | undefined) ?? [];
    const body = (req.body?.body ?? "").toString().trim().slice(0, 1000) || null;
    const allowedTypes = new Set(["POST", "CLASS_SNAPSHOT", "VIDEO_HIGHLIGHT"]);
    const allowedAudiences = new Set(["SCHOOL", "CLASS", "STAFF"]);
    const type = allowedTypes.has(String(req.body?.type)) ? String(req.body.type) : "POST";
    let audience = allowedAudiences.has(String(req.body?.audience)) ? String(req.body.audience) : "SCHOOL";
    let classId = req.body?.classId ? String(req.body.classId) : null;
    const videoLessonId = req.body?.videoLessonId ? String(req.body.videoLessonId) : null;
    const retentionDays = normaliseSocialRetentionDays(type as "POST" | "CLASS_SNAPSHOT" | "VIDEO_HIGHLIGHT", req.body?.retentionDays);
    const isCurator = canCurateSocialContent(jwtUser.role);

    if (type === "POST" && files.length === 0 && !body) { res.status(400).json({ error: "Add a photo or some text" }); return; }
    if (type !== "POST" && !isCurator) { res.status(403).json({ error: "Only administrators and teachers can publish curated content" }); return; }
    if (type === "CLASS_SNAPSHOT" && files.length === 0) { res.status(400).json({ error: "A class snapshot requires a photo" }); return; }
    if (type === "VIDEO_HIGHLIGHT" && files.length > 0) { res.status(400).json({ error: "Video highlights can't have photo attachments" }); return; }
    if (type === "VIDEO_HIGHLIGHT" && !videoLessonId) { res.status(400).json({ error: "Choose a video lesson to highlight" }); return; }

    // Students and non-teaching staff keep the existing informal school-post
    // capability. Only admins/teachers may target staff or a specific class.
    if (!isCurator) { audience = "SCHOOL"; classId = null; }
    if (type === "CLASS_SNAPSHOT") audience = "CLASS";
    if (jwtUser.role === "TEACHER" && type === "VIDEO_HIGHLIGHT") audience = "CLASS";
    if (audience === "CLASS" && !classId) { res.status(400).json({ error: "Choose a class for this content" }); return; }

    const writtenFiles: string[] = []; // tracked for cleanup on failure
    try {
      if (classId) {
        const klass = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
        if (!klass) { res.status(400).json({ error: "Class not found" }); return; }
        if (jwtUser.role === "TEACHER" && !(await canAccessTeacherClass(req, classId))) {
          res.status(403).json({ error: "You can only publish to your assigned classes" });
          return;
        }
      }

      if (videoLessonId) {
        const video = await prisma.videoLesson.findUnique({ where: { id: videoLessonId }, select: { id: true, status: true, classId: true, uploadedById: true } });
        if (!video || video.status !== "PUBLISHED") { res.status(400).json({ error: "Choose a published video lesson" }); return; }
        if (jwtUser.role === "TEACHER" && video.uploadedById !== jwtUser.userId) {
          res.status(403).json({ error: "Teachers can only highlight videos they uploaded" });
          return;
        }
        if (video.classId && classId && video.classId !== classId) {
          res.status(400).json({ error: "The highlighted video is assigned to a different class" });
          return;
        }
      }

      // Transcode every uploaded image to webp (strips metadata, caps size,
      // rejects SVG/script payloads). Keep insertion order for carousel.
      const assets: Array<{ url: string; width: number | null; height: number | null; mime: string }> = [];
      for (const file of files) {
        const filename = `${crypto.randomUUID()}.webp`;
        const dest = path.join(SOCIAL_DIR, filename);
        const pipeline = sharp(file.buffer, { limitInputPixels: 40_000_000 }).rotate()
          .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true });
        const [{ width, height }] = await Promise.all([
          pipeline.metadata(),
          pipeline.clone().webp({ quality: 85 }).toFile(dest),
        ]);
        writtenFiles.push(filename);
        assets.push({ url: `/uploads/social/${filename}`, width: width ?? null, height: height ?? null, mime: "image/webp" });
      }

      const expiresAt = type === "POST"
        ? new Date(Date.now() + EPHEMERAL_TTL_MS)
        : new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
      const post = await (prisma as any).socialPost.create({
        data: {
          authorId: jwtUser.userId,
          type,
          audience,
          publishStatus: "PUBLISHED",
          body,
          // Denormalised cover = first asset, so the existing feed query and
          // the /uploads/social auth gate (which looks posts up by imageUrl)
          // keep working for posts with one or many photos.
          imageUrl: assets[0]?.url ?? null,
          classId,
          videoLessonId: type === "VIDEO_HIGHLIGHT" ? videoLessonId : null,
          featuredUntil: type === "VIDEO_HIGHLIGHT" ? expiresAt : null,
          expiresAt,
          media: assets.length
            ? { create: assets.map((asset, index) => ({ url: asset.url, position: index, width: asset.width, height: asset.height, mime: asset.mime })) }
            : undefined,
        },
      });
      res.status(201).json({ id: post.id });
    } catch (err) {
      for (const filename of writtenFiles) {
        await fs.promises.unlink(path.join(SOCIAL_DIR, filename)).catch(() => {});
      }
      logger.error("Error creating social post:", err);
      const message = err instanceof Error && /Input image|pixel limit|unsupported image/i.test(err.message)
        ? "The selected image could not be processed"
        : "Internal Server Error";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/social", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const requestedType = String(req.query.type || "POST");
    const type = ["POST", "CLASS_SNAPSHOT", "VIDEO_HIGHLIGHT"].includes(requestedType) ? requestedType : "POST";
    try {
      const posts = await (prisma as any).socialPost.findMany({
        where: { AND: [{ type }, await socialVisibleWhere(jwtUser)] },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true, profilePhotoUrl: true } },
          class: { select: { id: true, name: true, level: true } },
          videoLesson: { select: { id: true, title: true, description: true, thumbnailUrl: true, duration: true, status: true, classId: true } },
          media: { orderBy: { position: "asc" }, select: { id: true, url: true, position: true, width: true, height: true, mime: true } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId: jwtUser.userId }, select: { id: true, reaction: true } },
          ...( { reports: { where: { reportedById: jwtUser.userId }, select: { id: true } } } as any),
        } as any,
      });
      const hasMore = posts.length > limit;
      const page = hasMore ? posts.slice(0, limit) : posts;
      // Reaction tallies are grouped in one query per page (small page sizes)
      // rather than a per-post query, to keep the feed list cheap.
      const postIds = page.map((p: any) => p.id);
      const reactionRows = postIds.length
        ? await (prisma as any).socialLike.groupBy({ by: ["postId", "reaction"], where: { postId: { in: postIds } }, _count: { _all: true } })
        : [];
      const reactionMap = new Map<string, Record<string, number>>();
      for (const r of reactionRows) {
        const entry = reactionMap.get(r.postId) ?? {};
        entry[r.reaction] = r._count._all;
        reactionMap.set(r.postId, entry);
      }
      res.json({
        posts: page.map((p: any) => ({
          id: p.id, type: p.type, audience: p.audience, publishStatus: p.publishStatus,
          body: p.body, imageUrl: p.imageUrl, createdAt: p.createdAt, expiresAt: p.expiresAt, featuredUntil: p.featuredUntil,
          author: { id: p.author.id, name: fullName(p.author), role: p.author.role, photo: p.author.profilePhotoUrl ?? null },
          classInfo: p.class ? { id: p.class.id, name: p.class.name, level: p.class.level } : null,
          videoLesson: p.videoLesson ?? null,
          media: p.media ?? [],
          mine: p.authorId === jwtUser.userId,
          likeCount: p._count.likes, commentCount: p._count.comments,
          likedByMe: p.likes.length > 0, reactionByMe: p.likes[0]?.reaction ?? null,
          reactionCounts: reactionMap.get(p.id) ?? {},
          reportedByMe: (p.reports ?? []).length > 0,
        })),
        nextCursor: hasMore ? page[page.length - 1].id : null,
      });
    } catch (err) {
      logger.error("Error listing social posts:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/social/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const post = await (prisma as any).socialPost.findUnique({
        where: { id: req.params.id },
        include: { media: { select: { url: true } } },
      });
      if (!post) { res.status(404).json({ error: "Post not found" }); return; }
      if (post.authorId !== jwtUser.userId && jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
      await prisma.$transaction(async (tx) => {
        await (tx as any).socialReport.updateMany({
          where: {
            status: "OPEN",
            OR: [{ postId: post.id }, { comment: { postId: post.id } }],
          },
          data: { status: "ACTIONED", reviewedById: jwtUser.userId, reviewedAt: new Date() },
        });
        await tx.socialPost.delete({ where: { id: post.id } }); // likes/comments/media cascade
      });
      // Best-effort cleanup of every attached file on disk (cover + extra photos).
      const urls = [post.imageUrl, ...post.media.map((m: any) => m.url)].filter(Boolean) as string[];
      for (const url of urls) {
        try { const fp = path.join(SOCIAL_DIR, path.basename(url)); if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* ignore */ }
      }
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting social post:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/social/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const body = (req.body?.body ?? "").toString().trim().slice(0, 1000) || null;
    try {
      const post = await (prisma as any).socialPost.findUnique({ where: { id: req.params.id } });
      if (!post) { res.status(404).json({ error: "Post not found" }); return; }
      if (post.authorId !== jwtUser.userId && jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
      if (post.type === "POST" && !body && !post.imageUrl) { res.status(400).json({ error: "Post cannot be empty" }); return; }
      const updated = await (prisma as any).socialPost.update({ where: { id: post.id }, data: { body } });
      res.json({ id: updated.id, body: updated.body, updatedAt: updated.updatedAt });
    } catch (err) {
      logger.error("Error editing social post:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/social/:id/like", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const allowedReactions = new Set(["LIKE", "LOVE", "HAHA", "WOW", "SAD", "ANGRY"]);
    const requested = String(req.body?.reaction || "LIKE").toUpperCase();
    const reaction = allowedReactions.has(requested) ? requested : "LIKE";
    try {
      if (!(await findVisibleSocialPost(req.params.id, jwtUser))) { res.status(404).json({ error: "Post not found" }); return; }
      const existing = await prisma.socialLike.findUnique({ where: { postId_userId: { postId: req.params.id, userId: jwtUser.userId } } });
      if (existing) {
        // Tapping the same reaction again removes it (toggle off); tapping a
        // different one switches your reaction. Mirrors FB/IG behaviour.
        if (existing.reaction === reaction) {
          await prisma.socialLike.delete({ where: { id: existing.id } });
          res.json({ liked: false, reaction: null });
        } else {
          const updated = await prisma.socialLike.update({ where: { id: existing.id }, data: { reaction } as any });
          res.json({ liked: true, reaction: updated.reaction });
        }
      } else {
        await prisma.socialLike.create({ data: { postId: req.params.id, userId: jwtUser.userId, reaction } as any });
        res.json({ liked: true, reaction });
      }
    } catch (err: any) {
      if (err?.code === "P2003") { res.status(404).json({ error: "Post not found" }); return; }
      logger.error("Error toggling like:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/social/:id/comments", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    try {
      if (!(await findVisibleSocialPost(req.params.id, jwtUser))) { res.status(404).json({ error: "Post not found" }); return; }
      const comments = await (prisma as any).socialComment.findMany({
        where: { postId: req.params.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
          reports: { where: { reportedById: jwtUser.userId }, select: { id: true } },
        },
      });
      const hasMore = comments.length > limit;
      const page = hasMore ? comments.slice(0, limit) : comments;
      res.json({
        comments: page.map((c: any) => ({
          id: c.id, body: c.body, createdAt: c.createdAt, editedAt: c.editedAt ?? null,
          user: { id: c.user.id, name: fullName(c.user), role: c.user.role },
          mine: c.userId === jwtUser.userId, reportedByMe: c.reports.length > 0,
        })),
        nextCursor: hasMore ? page[page.length - 1].id : null,
      });
    } catch (err) {
      logger.error("Error listing social comments:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/social/:id/comments", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const body = (req.body?.body ?? "").toString().trim().slice(0, 500);
    if (!body) { res.status(400).json({ error: "Comment cannot be empty" }); return; }
    try {
      if (!(await findVisibleSocialPost(req.params.id, jwtUser))) { res.status(404).json({ error: "Post not found" }); return; }
      const c = await prisma.socialComment.create({
        data: { postId: req.params.id, userId: jwtUser.userId, body },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      });
      res.status(201).json({ id: c.id, body: c.body, createdAt: c.createdAt, user: { id: c.user.id, name: fullName(c.user), role: c.user.role }, mine: true });
    } catch (err: any) {
      if (err?.code === "P2003") { res.status(404).json({ error: "Post not found" }); return; }
      logger.error("Error adding comment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/social/comments/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const c = await prisma.socialComment.findUnique({ where: { id: req.params.id } });
      if (!c) { res.status(404).json({ error: "Comment not found" }); return; }
      if (c.userId !== jwtUser.userId && jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
      await prisma.$transaction(async (tx) => {
        await (tx as any).socialReport.updateMany({
          where: { commentId: c.id, status: "OPEN" },
          data: { status: "ACTIONED", reviewedById: jwtUser.userId, reviewedAt: new Date() },
        });
        await tx.socialComment.delete({ where: { id: c.id } });
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting comment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Only the author may edit their own comment (unlike delete, which admins
  // can also do) -- editing someone else's words isn't a moderation action,
  // it would just be silently rewriting what they said.
  app.put("/api/social/comments/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const body = (req.body?.body ?? "").toString().trim().slice(0, 500);
    if (!body) { res.status(400).json({ error: "Comment cannot be empty" }); return; }
    try {
      const c = await prisma.socialComment.findUnique({ where: { id: req.params.id } });
      if (!c) { res.status(404).json({ error: "Comment not found" }); return; }
      if (c.userId !== jwtUser.userId) { res.status(403).json({ error: "Forbidden" }); return; }
      const updated = await prisma.socialComment.update({
        where: { id: c.id },
        data: { body, editedAt: new Date() } as any,
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      });
      res.json({
        id: updated.id, body: updated.body, createdAt: updated.createdAt, editedAt: (updated as any).editedAt,
        user: { id: updated.user.id, name: fullName(updated.user), role: updated.user.role }, mine: true,
      });
    } catch (err) {
      logger.error("Error editing comment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Social Space reporting ────────────────────────────────────────────────
  // Mirrors the /api/chat/messages/:id/report + /api/chat/reports pattern.
  // Exactly one of postId/commentId is set per report; the unique
  // (postId, reportedById) / (commentId, reportedById) constraints stop the
  // same user from reporting the same item twice.
  app.post("/api/social/:id/report", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const post = await findVisibleSocialPost(req.params.id, jwtUser);
      if (!post) { res.status(404).json({ error: "Post not found" }); return; }
      if (post.authorId === jwtUser.userId) { res.status(400).json({ error: "You cannot report your own post" }); return; }
      await (prisma as any).socialReport.create({
        data: { postId: req.params.id, reportedById: jwtUser.userId, reason: (req.body?.reason ?? "").toString().slice(0, 500) || null },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "SOCIAL_REPORT", req.params.id,
        `Reported social post ${req.params.id}.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.status(201).json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2002") { res.status(409).json({ error: "You already reported this post" }); return; }
      logger.error("Error reporting social post:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/social/comments/:id/report", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const comment = await prisma.socialComment.findUnique({ where: { id: req.params.id }, include: { post: true } });
      if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
      if (!(await findVisibleSocialPost(comment.postId, jwtUser))) { res.status(404).json({ error: "Comment not found" }); return; }
      if (comment.userId === jwtUser.userId) { res.status(400).json({ error: "You cannot report your own comment" }); return; }
      await (prisma as any).socialReport.create({
        data: { commentId: req.params.id, reportedById: jwtUser.userId, reason: (req.body?.reason ?? "").toString().slice(0, 500) || null },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "SOCIAL_REPORT", req.params.id,
        `Reported social comment ${req.params.id}.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.status(201).json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2002") { res.status(409).json({ error: "You already reported this comment" }); return; }
      logger.error("Error reporting social comment:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Social Space moderation (ADMIN) ──────────────────────────────────────────
  app.get("/api/social/reports", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : "OPEN";
      const reports = await (prisma as any).socialReport.findMany({
        where: status === "ALL" ? {} : { status },
        orderBy: { createdAt: "desc" },
        include: {
          reportedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          post: { include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } } },
          comment: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true } }, post: { select: { id: true } } } },
        },
      });
      res.json(reports.map((r: any) => ({
        id: r.id, status: r.status, reason: r.reason, createdAt: r.createdAt,
        reportedBy: fullName(r.reportedBy),
        type: r.postId ? "POST" : "COMMENT",
        postId: r.postId ?? r.comment?.post?.id ?? null,
        content: r.postId
          ? { body: r.post?.body ?? null, imageUrl: r.post?.imageUrl ?? null, author: r.post?.author ? fullName(r.post.author) : "—" }
          : { body: r.comment?.body ?? "(deleted)", author: r.comment?.user ? fullName(r.comment.user) : "—" },
      })));
    } catch (err) {
      logger.error("Error listing social reports:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/social/reports/:id/resolve", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const action = String(req.body?.action || "DISMISSED"); // ACTIONED | DISMISSED
    try {
      const report = await (prisma as any).socialReport.findUnique({
        where: { id: req.params.id },
        include: { post: { select: { imageUrl: true, media: { select: { url: true } } } } },
      });
      if (!report) { res.status(404).json({ error: "Report not found" }); return; }
      if (action === "ACTIONED") {
        await prisma.$transaction(async (tx) => {
          const reportModel = (tx as any).socialReport;
          if (report.postId) {
            await reportModel.updateMany({
              where: { postId: report.postId, status: "OPEN" },
              data: { status: "ACTIONED", reviewedById: jwtUser.userId, reviewedAt: new Date() },
            });
            await tx.socialPost.delete({ where: { id: report.postId } });
          } else if (report.commentId) {
            await reportModel.updateMany({
              where: { commentId: report.commentId, status: "OPEN" },
              data: { status: "ACTIONED", reviewedById: jwtUser.userId, reviewedAt: new Date() },
            });
            await tx.socialComment.delete({ where: { id: report.commentId } });
          }
        });
        // Best-effort removal of every attached file (cover + extra photos).
        const urls = [report.post?.imageUrl, ...(report.post?.media ?? []).map((m: any) => m.url)].filter(Boolean) as string[];
        for (const url of urls) {
          await fs.promises.unlink(path.join(SOCIAL_DIR, path.basename(url))).catch(() => {});
        }
        res.json({ success: true, status: "ACTIONED" });
        return;
      }
      const updated = await (prisma as any).socialReport.update({
        where: { id: req.params.id },
        data: { status: "DISMISSED", reviewedById: jwtUser.userId, reviewedAt: new Date() },
      });
      res.json(updated);
    } catch (err) {
      logger.error("Error resolving social report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // How much new Social Space activity (posts + comments from other people)
  // has happened since this user last opened the feed -- mirrors the Chat
  // unread-count pattern via a single per-user "last seen" timestamp instead
  // of Chat's per-conversation lastReadAt.
  app.get("/api/social/unread-count", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      // NOTE: SocialSeen is a new model the sandboxed Prisma client here
      // can't be regenerated for (see other `as any` casts in this file for
      // the same reason) -- `as any` on the model accessor is safe once the
      // real machine runs `npx prisma migrate deploy` + `prisma generate`.
      const seen = await (prisma as any).socialSeen.findUnique({ where: { userId: jwtUser.userId } });
      const since = seen?.lastSeenAt ?? new Date(0);
      const visibleWhere = await socialVisibleWhere(jwtUser);
      const [newPosts, newComments] = await Promise.all([
        (prisma as any).socialPost.count({
          where: { AND: [visibleWhere, { authorId: { not: jwtUser.userId }, createdAt: { gt: since } }] },
        }),
        prisma.socialComment.count({
          where: { userId: { not: jwtUser.userId }, createdAt: { gt: since }, post: visibleWhere },
        }),
      ]);
      res.json({ unread: newPosts + newComments });
    } catch (err) {
      logger.error("Error getting social unread count:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/social/seen", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      await (prisma as any).socialSeen.upsert({
        where: { userId: jwtUser.userId },
        create: { userId: jwtUser.userId, lastSeenAt: new Date() },
        update: { lastSeenAt: new Date() },
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error marking social space as seen:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Real-time push (Server-Sent Events) ──────────────────────────────────────
  // Additive over the client's polling: a broken/closed stream simply falls back
  // to polling. Keyed by userId → open responses (a user may have several tabs).
  const chatStreams = new Map<string, Set<express.Response>>();

  // Presence is resilient to a flaky/reconnecting SSE stream: a user counts as
  // "online" if they have a live stream OR any recent chat activity (heartbeat,
  // typing, sending). Without this, a user actively typing but whose EventSource
  // briefly dropped would wrongly show as offline to everyone.
  const chatLastSeen = new Map<string, number>();
  const PRESENCE_WINDOW_MS = 45_000;
  const markSeen = (userId?: string | null) => { if (userId) chatLastSeen.set(userId, Date.now()); };

  // Set httpOnly cookie for SSE authentication (prevents token exposure in URL)
  app.post("/api/set-chat-cookie", authMiddleware, (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(400).json({ error: "Token required" }); return; }

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/api/chat/stream"
    });
    res.json({ success: true });
  });
  function chatNotify(userIds: string[], payload: any) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const uid of new Set(userIds)) {
      const set = chatStreams.get(uid);
      if (!set) continue;

      const dead: express.Response[] = [];
      for (const r of set) {
        try {
          r.write(data);
        } catch (err) {
          dead.push(r);
        }
      }

      // Remove dead connections
      for (const r of dead) {
        set.delete(r);
        try { r.end(); } catch { /* ignore */ }
      }

      // Clean up empty sets
      if (set.size === 0) {
        chatStreams.delete(uid);
      }
    }
  }
  // EventSource cannot send Authorization headers, so this endpoint authenticates
  // from an httpOnly cookie instead of authMiddleware.
  app.get("/api/chat/stream", async (req, res) => {
    let user: JwtPayload;
    try { user = await verifyTokenSession(String(req.cookies?.auth_token || "")); }
    catch { res.status(401).end(); return; }
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    (res as any).flushHeaders?.();
    res.write(": connected\n\n");
    markSeen(user.userId);
    let set = chatStreams.get(user.userId);
    if (!set) { set = new Set(); chatStreams.set(user.userId, set); }
    set.add(res);
    const ping = setInterval(() => {
      try {
        res.write(": ping\n\n");
        markSeen(user.userId);
      } catch (err) {
        // Connection is dead, clean up
        clearInterval(ping);
        set!.delete(res);
        if (set!.size === 0) chatStreams.delete(user.userId);
        try { res.end(); } catch { /* ignore */ }
      }
    }, 25000);

    // Enhanced cleanup on connection close
    const cleanup = () => {
      clearInterval(ping);
      set!.delete(res);
      if (set!.size === 0) chatStreams.delete(user.userId);
      try { res.end(); } catch { /* ignore */ }
    };

    req.on("close", cleanup);
    req.on("error", cleanup);
    res.on("error", cleanup);
  });

  // Presence: anyone with a live stream OR recent activity within the window.
  app.get("/api/chat/presence", authMiddleware, async (_req, res) => {
    const online = new Set<string>();
    for (const [uid, set] of chatStreams) if (set.size > 0) online.add(uid);
    const now = Date.now();
    for (const [uid, ts] of chatLastSeen) if (now - ts < PRESENCE_WINDOW_MS) online.add(uid);
    res.json({ online: [...online] });
  });

  // Heartbeat so a user with the app open stays "online" even if their SSE stream
  // is momentarily reconnecting. Called periodically by the client.
  app.post("/api/chat/heartbeat", authMiddleware, (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    markSeen(jwtUser.userId);
    res.status(204).end();
  });

  // Who the signed-in user may start a conversation with.
  app.get("/api/chat/contacts", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const ADMIN_STAFF = ["ADMIN", "STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"];
    const sel = { id: true, firstName: true, lastName: true, role: true, profilePhotoUrl: true } as const;
    try {
      const groups: { key: string; label: string; contacts: any[] }[] = [];

      // Staff & teachers — everyone can contact these.
      const staff = await prisma.user.findMany({
        where: { id: { not: jwtUser.userId }, isActive: true, role: { in: CHAT_STAFF_ROLES } },
        select: sel, orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });
      const teachers = staff.filter((u) => u.role === "TEACHER").map(userBrief);
      const admins = staff.filter((u) => ADMIN_STAFF.includes(u.role)).map(userBrief);
      if (teachers.length) groups.push({ key: "teachers", label: "Teachers", contacts: teachers });
      if (admins.length) groups.push({ key: "admin", label: "Administration & staff", contacts: admins });

      // Students — only staff/teachers/admin may contact them, grouped by class.
      if (isStaffRole(jwtUser.role)) {
        const classes = await prisma.class.findMany({
          orderBy: { name: "asc" },
          include: { students: { where: { userId: { not: null }, user: { isActive: true } }, include: { user: { select: sel } }, orderBy: { user: { firstName: "asc" } } } },
        });
        for (const c of classes) {
          const contacts = c.students.filter((s) => s.user && s.user.id !== jwtUser.userId).map((s) => userBrief(s.user));
          if (contacts.length) groups.push({ key: `class:${c.id}`, label: c.name, contacts });
        }
        const unassigned = await prisma.student.findMany({
          where: { classId: null, userId: { not: null }, user: { isActive: true } },
          include: { user: { select: sel } }, orderBy: { user: { firstName: "asc" } },
        });
        const others = unassigned.filter((s) => s.user && s.user.id !== jwtUser.userId).map((s) => userBrief(s.user));
        if (others.length) groups.push({ key: "unassigned", label: "Students (no class)", contacts: others });
      }

      res.json({ groups });
    } catch (err) {
      logger.error("Error fetching chat contacts:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // My conversations, newest activity first, with unread counts + last message.
  app.get("/api/chat/conversations", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const parts = await prisma.conversationParticipant.findMany({
        where: { userId: jwtUser.userId, leftAt: null },
        include: {
          conversation: {
            include: {
              participants: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true, profilePhotoUrl: true } } } },
              messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
            },
          },
        },
      });
      const items = await Promise.all(parts.map(async (p) => {
        const c = p.conversation;
        const unread = await prisma.chatMessage.count({
          where: {
            conversationId: c.id,
            deletedAt: null,
            senderId: { not: jwtUser.userId },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        });
        const last = c.messages[0];
        const others = c.participants.filter((x) => x.userId !== jwtUser.userId).map((x) => userBrief(x.user));
        const title = c.title || (c.type === "DIRECT" ? (others[0]?.name ?? "Conversation") : others.map((o) => o.name).join(", "));
        return {
          id: c.id, type: c.type, title,
          participants: c.participants.map((x) => userBrief(x.user)),
          lastMessage: last ? { body: last.body, senderId: last.senderId, senderName: fullName(last.sender), createdAt: last.createdAt } : null,
          lastMessageAt: c.lastMessageAt, unread,
        };
      }));
      items.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      res.json(items);
    } catch (err) {
      logger.error("Error fetching conversations:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Create (or reuse) a conversation. Body: { participantIds: string[], title?, type? }
  app.post("/api/chat/conversations", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const participantIds: string[] = Array.isArray(req.body?.participantIds) ? req.body.participantIds : [];
    const title: string | null = req.body?.title?.trim() || null;
    try {
      const ids = Array.from(new Set([jwtUser.userId, ...participantIds.filter((x) => typeof x === "string" && x)]));
      if (ids.length < 2) { res.status(400).json({ error: "Pick at least one person to message" }); return; }
      const users = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, role: true } });
      if (users.length !== ids.length) { res.status(400).json({ error: "One or more recipients are invalid" }); return; }
      // Hierarchical guard: at least one staff participant.
      if (!users.some((u) => isStaffRole(u.role))) {
        res.status(403).json({ error: "A conversation must include a teacher or staff member" });
        return;
      }
      const type = ids.length === 2 ? "DIRECT" : "GROUP";

      // Reuse an existing DIRECT conversation between the same two people.
      if (type === "DIRECT") {
        const existing = await prisma.conversation.findFirst({
          where: { type: "DIRECT", AND: ids.map((uid) => ({ participants: { some: { userId: uid } } })) },
          include: { participants: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
        if (existing && existing.participants.length === 2) {
          const otherParticipant = existing.participants.find(p => p.userId !== jwtUser.userId);
          const otherName = otherParticipant ? fullName(otherParticipant.user) : 'the other person';
          res.json({
            id: existing.id,
            reused: true,
            message: `You already have a conversation with ${otherName}. You've been reconnected.`
          });
          return;
        }
      }

      const conv = await prisma.conversation.create({
        data: {
          type: type as any, title, createdById: jwtUser.userId,
          participants: { create: ids.map((uid) => ({ userId: uid, lastReadAt: uid === jwtUser.userId ? new Date() : null })) },
        },
      });
      res.status(201).json({ id: conv.id, reused: false });
    } catch (err) {
      logger.error("Error creating conversation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Create or reuse a class group channel (staff only). Includes every student
  // in the class that has an account, plus the class teachers and the creator.
  app.post("/api/chat/class-channel", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const classId = req.body?.classId;
    if (!classId) { res.status(400).json({ error: "classId is required" }); return; }
    // Only an admin or a teacher who teaches this class may open its channel.
    if (!(await canAccessTeacherClass(req, classId))) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const klass = await prisma.class.findUnique({
        where: { id: classId },
        include: { students: { select: { userId: true } }, teachers: { include: { teacher: { select: { userId: true } } } } },
      });
      if (!klass) { res.status(404).json({ error: "Class not found" }); return; }
      const memberIds = new Set<string>([jwtUser.userId]);
      for (const s of klass.students) if (s.userId) memberIds.add(s.userId);
      for (const t of klass.teachers) if (t.teacher?.userId) memberIds.add(t.teacher.userId);

      let conv = await prisma.conversation.findFirst({ where: { type: "CLASS_CHANNEL", classId } });
      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            type: "CLASS_CHANNEL", classId, title: klass.name, createdById: jwtUser.userId,
            participants: { create: Array.from(memberIds).map((uid) => ({ userId: uid, lastReadAt: uid === jwtUser.userId ? new Date() : null })) },
          },
        });
      } else {
        // Keep membership in sync as students/teachers come and go.
        const existing = await prisma.conversationParticipant.findMany({ where: { conversationId: conv.id }, select: { userId: true } });
        const have = new Set(existing.map((e) => e.userId));
        const toAdd = Array.from(memberIds).filter((uid) => !have.has(uid));
        const toRemove = existing.filter((e) => !memberIds.has(e.userId)).map((e) => e.userId);

        // Add new members
        if (toAdd.length) await prisma.conversationParticipant.createMany({ data: toAdd.map((uid) => ({ conversationId: conv!.id, userId: uid })), skipDuplicates: true });

        // Remove departed members (soft delete by setting leftAt)
        if (toRemove.length) {
          await prisma.conversationParticipant.updateMany({
            where: { conversationId: conv.id, userId: { in: toRemove } },
            data: { leftAt: new Date() }
          });
        }
      }
      res.json({ id: conv.id });
    } catch (err) {
      logger.error("Error creating class channel:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Resolve a participant row (auth) for a conversation; admins get oversight access.
  async function chatAccess(jwtUser: JwtPayload, conversationId: string) {
    const part = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: jwtUser.userId } },
    });
    return { part: part?.leftAt ? null : part, isAdmin: jwtUser.role === "ADMIN" };
  }

  app.get("/api/chat/conversations/:id/messages", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const { part, isAdmin } = await chatAccess(jwtUser, req.params.id);
      if (!part && !isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
      const conv = await prisma.conversation.findUnique({
        where: { id: req.params.id },
        include: { participants: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true, profilePhotoUrl: true } } } } },
      });
      if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
      const messages = await prisma.chatMessage.findMany({
        // Hide already-expired ephemeral photos even before cleanup runs.
        where: { conversationId: req.params.id, deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: { createdAt: "asc" },
        take: 500,
        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true, profilePhotoUrl: true } } },
      });

      // Audit log for admin oversight access
      if (!part && isAdmin) {
        await createAuditLog(jwtUser.userId, jwtUser.email, "READ", "CONVERSATION_OVERSIGHT", conv.id,
          `Admin accessed conversation ${conv.id} (${conv.type}) via oversight mode. Participants: ${conv.participants.length}, Messages: ${messages.length}`,
          req.ip, req.headers["user-agent"] || null, "INFO");
      }

      res.json({
        id: conv.id, type: conv.type,
        title: conv.title,
        participants: conv.participants.map((x) => ({ ...userBrief(x.user), lastReadAt: x.lastReadAt })),
        oversight: !part && isAdmin,
        messages: messages.map((m) => ({
          id: m.id, body: m.body, attachmentUrl: m.attachmentUrl, expiresAt: m.expiresAt,
          sender: userBrief(m.sender), createdAt: m.createdAt, mine: m.senderId === jwtUser.userId,
        })),
      });
    } catch (err) {
      logger.error("Error fetching messages:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/chat/conversations/:id/messages", authMiddleware, chatMessageLimiter, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const body: string = (req.body?.body ?? "").toString().trim();
    const attachmentUrl: string | null = typeof req.body?.attachmentUrl === "string" ? req.body.attachmentUrl : null;
    if (body.length > 5000) { res.status(400).json({ error: "Messages must be 5,000 characters or fewer" }); return; }
    if (attachmentUrl && !attachmentUrl.startsWith("/uploads/chat-media/") && !attachmentUrl.startsWith("/stickers/") && !attachmentUrl.startsWith("/uploads/stickers/")) {
      res.status(400).json({ error: "Invalid chat attachment" }); return;
    }
    // Camera photos are ephemeral — they vanish after 24h.
    const ephemeral = Boolean(req.body?.ephemeral) && !!attachmentUrl;
    const expiresAt = ephemeral ? new Date(Date.now() + EPHEMERAL_TTL_MS) : null;
    if (!body && !attachmentUrl) { res.status(400).json({ error: "Message cannot be empty" }); return; }
    markSeen(jwtUser.userId);
    try {
      const part = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: req.params.id, userId: jwtUser.userId } },
      });
      if (!part || part.leftAt) { res.status(403).json({ error: "You are not part of this conversation" }); return; }
      const msg = await prisma.chatMessage.create({
        data: { conversationId: req.params.id, senderId: jwtUser.userId, body, attachmentUrl, expiresAt },
        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true, profilePhotoUrl: true } } },
      });
      await prisma.conversation.update({ where: { id: req.params.id }, data: { lastMessageAt: msg.createdAt } });
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: req.params.id, userId: jwtUser.userId } },
        data: { lastReadAt: msg.createdAt },
      });
      // Push to every participant's open streams (snappy delivery; polling backstops).
      const others = await prisma.conversationParticipant.findMany({ where: { conversationId: req.params.id, leftAt: null }, select: { userId: true } });
      chatNotify(others.map((p) => p.userId), { type: "message", conversationId: req.params.id });
      res.status(201).json({ id: msg.id, body: msg.body, attachmentUrl: msg.attachmentUrl, expiresAt: msg.expiresAt, sender: userBrief(msg.sender), createdAt: msg.createdAt, mine: true });
    } catch (err) {
      logger.error("Error sending chat message:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Lightweight typing signal — broadcast (not persisted) to the other participants
  // so their clients can show a "typing…" indicator. Throttled on the client.
  app.post("/api/chat/conversations/:id/typing", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    markSeen(jwtUser.userId);
    try {
      const parts = await prisma.conversationParticipant.findMany({
        where: { conversationId: req.params.id },
        select: { userId: true, leftAt: true, user: { select: { firstName: true, lastName: true } } },
      });
      const me = parts.find((p) => p.userId === jwtUser.userId);
      if (!me || me.leftAt) { res.status(403).json({ error: "You are not part of this conversation" }); return; }
      const others = parts.filter((p) => p.userId !== jwtUser.userId && !p.leftAt).map((p) => p.userId);
      const name = `${me.user?.firstName ?? ""} ${me.user?.lastName ?? ""}`.trim() || "Someone";
      chatNotify(others, { type: "typing", conversationId: req.params.id, userId: jwtUser.userId, name });
      res.status(204).end();
    } catch (err) {
      logger.error("Error broadcasting typing signal:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/chat/conversations/:id/read", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const { part } = await chatAccess(jwtUser, req.params.id);
      if (!part) { res.status(403).json({ error: "Forbidden" }); return; }
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: req.params.id, userId: jwtUser.userId } },
        data: { lastReadAt: new Date() },
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error marking conversation read:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Permanently delete a conversation and everything in it (messages, participants,
  // reports) plus its uploaded image files — keeps the DB and disk from bloating.
  // Admins may delete any conversation; teachers may delete ones they're part of.
  app.delete("/api/chat/conversations/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const conv = await prisma.conversation.findUnique({
        where: { id: req.params.id },
        include: { participants: { select: { userId: true } } },
      });
      if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
      const isAdmin = jwtUser.role === "ADMIN";
      const isParticipant = conv.participants.some((p) => p.userId === jwtUser.userId);
      if (!isAdmin && !(jwtUser.role === "TEACHER" && isParticipant)) { res.status(403).json({ error: "Forbidden" }); return; }

      // Collect uploaded image files (skip shared stickers) to remove from disk.
      const withFiles = await prisma.chatMessage.findMany({ where: { conversationId: conv.id, attachmentUrl: { not: null } }, select: { attachmentUrl: true } });

      // Use transaction to ensure atomic operation
      await prisma.$transaction(async (tx) => {
        await tx.conversation.delete({ where: { id: conv.id } }); // cascades participants, messages, reports
      });

      // Clean up files after successful database deletion
      const cleanupErrors: string[] = [];
      for (const m of withFiles) {
        if (m.attachmentUrl && m.attachmentUrl.startsWith("/uploads/chat-media/")) {
          try {
            const fp = path.join(CHAT_MEDIA_DIR, path.basename(m.attachmentUrl));
            if (fs.existsSync(fp)) {
              fs.unlinkSync(fp);
              logger.info(`Cleaned up chat media file: ${fp}`);
            }
          } catch (err) {
            const errorMsg = `Failed to delete file ${m.attachmentUrl}: ${err}`;
            cleanupErrors.push(errorMsg);
            logger.error(errorMsg);
          }
        }
      }

      // Tell participants' open clients to drop it from their lists.
      chatNotify(conv.participants.map((p) => p.userId), { type: "conversation-deleted", conversationId: conv.id });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "CONVERSATION", conv.id,
        `Deleted conversation ${conv.id} (${withFiles.length} attachment file(s) cleared${cleanupErrors.length > 0 ? `, ${cleanupErrors.length} cleanup error(s)` : ''}).`,
        req.ip, req.headers["user-agent"] || null, "WARNING");

      if (cleanupErrors.length > 0) {
        res.json({ success: true, warning: `${cleanupErrors.length} file(s) could not be deleted` });
      } else {
        res.json({ success: true });
      }
    } catch (err) {
      logger.error("Error deleting conversation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/chat/messages/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const msg = await prisma.chatMessage.findUnique({
        where: { id: req.params.id },
        include: { conversation: { select: { participants: { where: { leftAt: null }, select: { userId: true } } } } },
      });
      if (!msg || msg.deletedAt) { res.status(404).json({ error: "Message not found" }); return; }
      if (msg.senderId !== jwtUser.userId && jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }
      await prisma.chatMessage.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
      chatNotify(msg.conversation.participants.map((p) => p.userId), { type: "message-deleted", conversationId: msg.conversationId, messageId: msg.id });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting chat message:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/chat/messages/:id/report", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const msg = await prisma.chatMessage.findUnique({ where: { id: req.params.id } });
      if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
      // Only someone in the conversation (or an admin) may report a message.
      const { part, isAdmin } = await chatAccess(jwtUser, msg.conversationId);
      if (!part && !isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
      await prisma.chatMessageReport.create({
        data: { messageId: req.params.id, reportedById: jwtUser.userId, reason: (req.body?.reason ?? "").toString().slice(0, 500) || null },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "CHAT_REPORT", req.params.id,
        `Reported chat message ${req.params.id}.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.status(201).json({ success: true });
    } catch (err) {
      logger.error("Error reporting chat message:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Chat moderation (ADMIN) ──────────────────────────────────────────────────
  app.get("/api/chat/reports", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : "OPEN";
      const reports = await prisma.chatMessageReport.findMany({
        where: status === "ALL" ? {} : { status: status as any },
        orderBy: { createdAt: "desc" },
        include: {
          message: { include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } }, conversation: { select: { id: true, type: true, title: true } } } },
        },
      });
      res.json(reports.map((r) => ({
        id: r.id, status: r.status, reason: r.reason, createdAt: r.createdAt,
        conversationId: r.message.conversationId,
        message: { id: r.message.id, body: r.message.deletedAt ? "(deleted)" : r.message.body, sender: r.message.sender ? fullName(r.message.sender) : "—", createdAt: r.message.createdAt },
      })));
    } catch (err) {
      logger.error("Error listing chat reports:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/chat/reports/:id/resolve", authMiddleware, requirePermission("manage_all"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const action = String(req.body?.action || "DISMISSED"); // ACTIONED | DISMISSED
    try {
      const report = await prisma.chatMessageReport.findUnique({ where: { id: req.params.id } });
      if (!report) { res.status(404).json({ error: "Report not found" }); return; }
      if (action === "ACTIONED") {
        await prisma.chatMessage.update({ where: { id: report.messageId }, data: { deletedAt: new Date() } }).catch(() => {});
      }
      const updated = await prisma.chatMessageReport.update({
        where: { id: req.params.id },
        data: { status: action === "ACTIONED" ? "ACTIONED" : "DISMISSED", reviewedById: jwtUser.userId, reviewedAt: new Date() },
      });
      res.json(updated);
    } catch (err) {
      logger.error("Error resolving chat report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Messaging System API ─────────────────────────────────────────────────────
  app.get("/api/messages", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const messages = await prisma.message.findMany({
        where: {
          senderId: jwtUser.userId,
          OR: [
            { recipients: { some: { recipientId: jwtUser.userId } } }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePhotoUrl: true
            }
          },
          recipients: {
            include: {
              recipient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profilePhotoUrl: true
                }
              }
            }
          }
        },
        orderBy: { sentAt: 'desc' }
      });

      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        subject: msg.subject,
        body: msg.body,
        sentAt: msg.sentAt,
        sender: {
          id: msg.sender.id,
          name: fullName(msg.sender),
          email: msg.sender.email,
          profilePhotoUrl: msg.sender.profilePhotoUrl
        },
        recipients: msg.recipients.map(rec => ({
          id: rec.recipient.id,
          name: fullName(rec.recipient),
          email: rec.recipient.email,
          readAt: rec.readAt
        })),
        isReadByAll: msg.recipients.every(rec => rec.readAt !== null)
      }));

      res.json(formattedMessages);
    } catch (err) {
      logger.error("Error fetching messages:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/messages/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const message = await prisma.message.findFirst({
        where: {
          id,
          OR: [
            { senderId: jwtUser.userId },
            { recipients: { some: { recipientId: jwtUser.userId } } }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePhotoUrl: true
            }
          },
          recipients: {
            include: {
              recipient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profilePhotoUrl: true
                }
              }
            }
          }
        }
      });

      if (!message) {
        res.status(404).json({ error: "Message not found" });
        return;
      }

      const formattedMessage = {
        id: message.id,
        subject: message.subject,
        body: message.body,
        sentAt: message.sentAt,
        sender: {
          id: message.sender.id,
          name: fullName(message.sender),
          email: message.sender.email,
          profilePhotoUrl: message.sender.profilePhotoUrl
        },
        recipients: message.recipients.map(rec => ({
          id: rec.recipient.id,
          name: fullName(rec.recipient),
          email: rec.recipient.email,
          readAt: rec.readAt
        }))
      };

      res.json(formattedMessage);
    } catch (err) {
      logger.error("Error fetching message:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/messages", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { subject, body, recipientIds } = req.body;

    if (!subject || !body || !recipientIds || !Array.isArray(recipientIds)) {
      res.status(400).json({ error: "Subject, body, and recipientIds array are required" });
      return;
    }

    try {
      // Recipients must be valid User ids. Filter to existing users (and dedupe)
      // so a stray student-id or removed account can't fail the whole send.
      const uniqueIds = Array.from(new Set(recipientIds.filter((x: any) => typeof x === "string" && x)));
      const validUsers = await prisma.user.findMany({
        where: { id: { in: uniqueIds }, isActive: true },
        select: { id: true },
      });
      const validIds = validUsers.map((u) => u.id);
      if (validIds.length === 0) {
        res.status(400).json({ error: "No valid recipients found for this message" });
        return;
      }

      const message = await prisma.message.create({
        data: {
          subject,
          body,
          senderId: jwtUser.userId,
          recipients: {
            create: validIds.map((recipientId: string) => ({
              recipientId
            }))
          }
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          recipients: {
            include: {
              recipient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      res.status(201).json({
        id: message.id,
        subject: message.subject,
        body: message.body,
        sentAt: message.sentAt,
        sender: {
          id: message.sender.id,
          name: fullName(message.sender),
          email: message.sender.email
        },
        recipients: message.recipients.map(rec => ({
          id: rec.recipient.id,
          name: fullName(rec.recipient),
          email: rec.recipient.email
        }))
      });
    } catch (err) {
      logger.error("Error creating message:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/messages/:id/read", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const recipient = await prisma.messageRecipient.findFirst({
        where: {
          messageId: id,
          recipientId: jwtUser.userId
        }
      });

      if (!recipient) {
        res.status(404).json({ error: "Message recipient not found" });
        return;
      }

      await prisma.messageRecipient.update({
        where: { id: recipient.id },
        data: { readAt: new Date() }
      });

      res.json({ success: true, readAt: new Date() });
    } catch (err) {
      logger.error("Error marking message as read:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/messages/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const message = await prisma.message.findFirst({
        where: {
          id,
          senderId: jwtUser.userId
        }
      });

      if (!message) {
        res.status(404).json({ error: "Message not found or not authorized to delete" });
        return;
      }

      await prisma.message.delete({
        where: { id }
      });

      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting message:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Library Resources API (Enhanced) ─────────────────────────────────────────────
  // NOTE: an earlier duplicate `app.get("/api/library")` lived here with no
  // visibility filtering. It was unreachable (Express uses first-match, and
  // the secure handler at the top of the file wins) but was a latent leak
  // trap — removed. The /download route below is the only one of its kind.
  app.post("/api/library/:id/download", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      // Enforce the same visibility rules as GET /api/library/:id — this route
      // previously had no check at all, so any authenticated user could pull a
      // resource's URL/metadata (and inflate its download count) regardless of
      // role, even for TEACHERS_ONLY resources a student can't otherwise see.
      const existing = await prisma.libraryResource.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      const visibility = existing.visibility || "ALL";
      if (jwtUser.role === "STUDENT" && !["ALL", "STUDENTS"].includes(visibility)) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      if (jwtUser.role === "TEACHER" && !["ALL", "TEACHERS_ONLY"].includes(visibility)) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }

      const resource = await prisma.libraryResource.update({
        where: { id },
        data: {
          downloadCount: { increment: 1 },
          lastDownloaded: new Date()
        }
      });

      if (!resource.externalUrl) {
        res.status(404).json({ error: "Resource has no download URL" });
        return;
      }

      res.json({
        url: resource.externalUrl,
        downloadCount: resource.downloadCount,
        lastDownloaded: resource.lastDownloaded
      });
    } catch (err) {
      logger.error("Error tracking library download:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Generated Reports API ─────────────────────────────────────────────────────
  app.get("/api/reports/saved", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const savedReports = await prisma.savedReport.findMany({
        where: { generatedById: jwtUser.userId },
        orderBy: { updatedAt: 'desc' }
      });

      const formattedReports = savedReports.map(report => ({
        id: report.id,
        name: report.name,
        description: report.description,
        reportType: report.reportType,
        filters: report.filters,
        lastGeneratedAt: report.lastGeneratedAt,
        generationCount: report.generationCount,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      }));

      res.json(formattedReports);
    } catch (err) {
      logger.error("Error fetching saved reports:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/reports/save", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { name, description, reportType, filters } = req.body;

    if (!name || !reportType) {
      res.status(400).json({ error: "Name and reportType are required" });
      return;
    }

    try {
      const savedReport = await prisma.savedReport.create({
        data: {
          name,
          description,
          reportType,
          filters: filters || {},
          generatedById: jwtUser.userId,
          generatedByName: jwtUser.email
        }
      });

      res.status(201).json(savedReport);
    } catch (err) {
      logger.error("Error saving report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/reports/generate/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const savedReport = await prisma.savedReport.findFirst({
        where: {
          id,
          generatedById: jwtUser.userId
        }
      });

      if (!savedReport) {
        res.status(404).json({ error: "Saved report not found" });
        return;
      }

      // Create a report generation record
      const generation = await prisma.reportGeneration.create({
        data: {
          savedReportId: savedReport.id,
          reportType: savedReport.reportType,
          reportName: savedReport.name,
          filters: savedReport.filters,
          generatedById: jwtUser.userId,
          generatedByName: jwtUser.email,
          status: "COMPLETED"
        }
      });

      // Update the saved report
      await prisma.savedReport.update({
        where: { id: savedReport.id },
        data: {
          lastGeneratedAt: new Date(),
          generationCount: { increment: 1 }
        }
      });

      res.status(201).json(generation);
    } catch (err) {
      logger.error("Error generating report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/reports/generations", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const generations = await prisma.reportGeneration.findMany({
        where: { generatedById: jwtUser.userId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      const formattedGenerations = generations.map(gen => ({
        id: gen.id,
        reportType: gen.reportType,
        reportName: gen.reportName,
        status: gen.status,
        fileUrl: gen.fileUrl,
        fileSize: gen.fileSize,
        createdAt: gen.createdAt,
        generatedByName: gen.generatedByName
      }));

      res.json(formattedGenerations);
    } catch (err) {
      logger.error("Error fetching report generations:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Lesson Planning API ─────────────────────────────────────────────────────
  // ── Homework ─────────────────────────────────────────────────────────────────
  const hw = () => (prisma as any).homework;
  const hwSub = () => (prisma as any).homeworkSubmission;
  const hwAttachment = () => (prisma as any).homeworkSubmissionAttachment;
  const HOMEWORK_TITLE_MAX = 200;
  const HOMEWORK_INSTRUCTIONS_MAX = 20_000;
  const HOMEWORK_SUBMISSION_MAX = 20_000;
  const HOMEWORK_FEEDBACK_MAX = 5_000;
  const HOMEWORK_RESOURCE_URL = /^\/(?:news\/[0-9a-f-]{36}|elibrary\/[0-9a-f-]{36}\/read)$/i;

  const parseHomeworkAttachmentUrl = (value: unknown, allowResourceLink: boolean): string | null => {
    if (value === null || value === undefined || value === "") return null;
    const uploaded = parseHomeworkMediaUrl(value);
    if (uploaded) return uploaded;
    if (allowResourceLink && typeof value === "string" && HOMEWORK_RESOURCE_URL.test(value.trim())) return value.trim();
    return null;
  };

  const deleteHomeworkMedia = async (url: unknown) => {
    const parsed = parseHomeworkMediaUrl(url);
    if (!parsed) return;
    const match = parsed.match(HOMEWORK_MEDIA_URL);
    if (!match) return;
    await fs.promises.unlink(path.join(HOMEWORK_MEDIA_DIR, match[1])).catch(() => {});
  };

  const deleteHomeworkMediaIfUnreferenced = async (url: unknown) => {
    const parsed = parseHomeworkMediaUrl(url);
    if (!parsed) return;
    const [assignmentCount, submissionCount, attachmentCount] = await Promise.all([
      hw().count({ where: { attachmentUrl: parsed } }),
      hwSub().count({ where: { attachmentUrl: parsed } }),
      hwAttachment().count({ where: { url: parsed } }),
    ]);
    if (!assignmentCount && !submissionCount && !attachmentCount) {
      await deleteHomeworkMedia(parsed);
    }
  };

  const parseHomeworkDueDate = (value: unknown): Date | null => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
  };

  const parseHomeworkMaxMarks = (value: unknown): number | null | undefined => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  /** The requesting teacher's record, or null. */
  const ownTeacher = (userId: string) => prisma.teacher.findUnique({ where: { userId } });

  // Upload an attachment (teacher worksheet or student photo of paper work).
  app.post("/api/homework-media", authMiddleware, (req, res, next) => {
    const role = ((req as any).user as JwtPayload).role;
    if (!(["ADMIN", "TEACHER", "STUDENT"] as string[]).includes(role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    homeworkMediaUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? "File must be 10 MB or smaller" : err.message || "Upload failed";
      res.status(400).json({ error: message });
    });
  }, (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: "File is required" }); return; }
    res.status(201).json({
      url: `/uploads/homework-media/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  });

  // Remove a cancelled/replaced upload, but never a file currently referenced
  // by an assignment or submission.
  app.delete("/api/homework-media", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const role = jwtUser.role;
    if (!(["ADMIN", "TEACHER", "STUDENT"] as string[]).includes(role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const url = parseHomeworkMediaUrl(req.body?.url);
    if (!url) { res.status(400).json({ error: "Invalid homework media URL" }); return; }
    const ownerId = homeworkMediaOwnerId(url);
    if (role !== "ADMIN" && ownerId !== jwtUser.userId) {
      res.status(403).json({ error: "You can only remove files you uploaded" });
      return;
    }
    try {
      const [assignmentCount, submissionCount, attachmentCount] = await Promise.all([
        hw().count({ where: { attachmentUrl: url } }),
        hwSub().count({ where: { attachmentUrl: url } }),
        hwAttachment().count({ where: { url } }),
      ]);
      if (assignmentCount || submissionCount || attachmentCount) {
        res.status(409).json({ error: "This file is attached to homework and cannot be removed" });
        return;
      }
      await deleteHomeworkMedia(url);
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting homework media:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Create homework (teacher for their own classes; admin for any).
  app.post("/api/homework", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") { res.status(403).json({ error: "Forbidden" }); return; }
    const { title, instructions, classId, subjectId, dueDate, maxMarks, attachmentUrl } = req.body || {};
    const cleanTitle = String(title ?? "").trim();
    const due = parseHomeworkDueDate(dueDate);
    const parsedMaxMarks = parseHomeworkMaxMarks(maxMarks);
    const parsedAttachment = parseHomeworkAttachmentUrl(attachmentUrl, true);
    if (!cleanTitle || typeof classId !== "string" || !due) { res.status(400).json({ error: "Title, class and a valid due date are required" }); return; }
    if (cleanTitle.length > HOMEWORK_TITLE_MAX) { res.status(400).json({ error: `Title must be ${HOMEWORK_TITLE_MAX} characters or fewer` }); return; }
    if (String(instructions ?? "").length > HOMEWORK_INSTRUCTIONS_MAX) { res.status(400).json({ error: "Instructions are too long" }); return; }
    if (parsedMaxMarks === undefined) { res.status(400).json({ error: "Max marks must be a number greater than 0" }); return; }
    if (attachmentUrl && !parsedAttachment) { res.status(400).json({ error: "Invalid homework attachment" }); return; }
    try {
      const classRecord = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
      if (!classRecord) { res.status(404).json({ error: "Class not found" }); return; }
      if (!(await canManageExamClass(jwtUser, classId))) {
        res.status(403).json({ error: "Forbidden: not your class" });
        return;
      }
      if (subjectId) {
        const subject = await prisma.subject.findUnique({ where: { id: String(subjectId) }, select: { id: true } });
        if (!subject) { res.status(400).json({ error: "Subject not found" }); return; }
      }
      // Homework belongs to a teacher; admins must have a linked teacher record
      // or we attribute it to the class's first teacher.
      let teacher = await ownTeacher(jwtUser.userId);
      if (!teacher && jwtUser.role === "ADMIN") {
        const ct = await prisma.classTeacher.findFirst({ where: { classId }, include: { teacher: true } });
        teacher = ct?.teacher ?? null;
      }
      if (!teacher) { res.status(400).json({ error: "No teacher profile available to own this homework" }); return; }

      const created = await hw().create({
        data: {
          title: cleanTitle,
          instructions: String(instructions ?? "").trim() || null,
          attachmentUrl: parsedAttachment,
          classId,
          subjectId: subjectId || null,
          teacherId: teacher.id,
          dueDate: due,
          maxMarks: parsedMaxMarks,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "HOMEWORK", created.id,
        `Homework '${created.title}' assigned to class ${classId}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(created);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart." }); return; }
      logger.error("Error creating homework:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // List homework (teacher: own classes; admin: all; optional classId filter).
  app.get("/api/homework", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") { res.status(403).json({ error: "Forbidden" }); return; }
    const { classId } = req.query as Record<string, string | undefined>;
    try {
      const where: any = {};
      if (classId) where.classId = classId;
      if (jwtUser.role === "TEACHER") {
        const classIds = await getTeacherClassIds(jwtUser.userId);
        if (classId && !classIds.includes(classId)) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
        where.classId = classId || { in: classIds };
      }
      const rows = await hw().findMany({
        where,
        include: {
          class: { select: { id: true, name: true, _count: { select: { students: true } } } },
          subject: { select: { id: true, name: true } },
          teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          submissions: { select: { id: true, status: true, submittedAt: true } },
        },
        orderBy: { dueDate: "desc" },
      });
      res.json(rows);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error("Error listing homework:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Homework detail with the full class roster + each student's submission.
  app.get("/api/homework/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const row = await hw().findUnique({
        where: { id: req.params.id },
        include: {
          class: { include: { students: { include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { studentCode: "asc" } } } },
          subject: { select: { id: true, name: true } },
          submissions: {
            include: {
              attachments: { orderBy: { uploadedAt: "asc" } },
            },
          },
        },
      });
      if (!row) { res.status(404).json({ error: "Homework not found" }); return; }
      if (!(await canManageExamClass(jwtUser, row.classId))) {
        res.status(403).json({ error: "Forbidden: not your class" });
        return;
      }
      res.json(row);
    } catch (err) {
      logger.error("Error fetching homework:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Edit / close / reopen homework.
  app.put("/api/homework/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") { res.status(403).json({ error: "Forbidden" }); return; }
    const b = req.body || {};
    try {
      const existing = await hw().findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Homework not found" }); return; }
      if (!(await canManageExamClass(jwtUser, existing.classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      const data: any = {};
      if (b.title !== undefined) {
        const title = String(b.title).trim();
        if (!title) { res.status(400).json({ error: "Title is required" }); return; }
        if (title.length > HOMEWORK_TITLE_MAX) { res.status(400).json({ error: `Title must be ${HOMEWORK_TITLE_MAX} characters or fewer` }); return; }
        data.title = title;
      }
      if (b.instructions !== undefined) {
        const instructions = String(b.instructions ?? "").trim();
        if (instructions.length > HOMEWORK_INSTRUCTIONS_MAX) { res.status(400).json({ error: "Instructions are too long" }); return; }
        data.instructions = instructions || null;
      }
      if (b.attachmentUrl !== undefined) {
        const attachment = parseHomeworkAttachmentUrl(b.attachmentUrl, true);
        if (b.attachmentUrl && !attachment) { res.status(400).json({ error: "Invalid homework attachment" }); return; }
        data.attachmentUrl = attachment;
      }
      if (b.subjectId !== undefined) {
        if (b.subjectId) {
          const subject = await prisma.subject.findUnique({ where: { id: String(b.subjectId) }, select: { id: true } });
          if (!subject) { res.status(400).json({ error: "Subject not found" }); return; }
        }
        data.subjectId = b.subjectId || null;
      }
      if (b.dueDate !== undefined) {
        const due = parseHomeworkDueDate(b.dueDate);
        if (!due) { res.status(400).json({ error: "Invalid due date" }); return; }
        data.dueDate = due;
      }
      if (b.maxMarks !== undefined) {
        const maxMarks = parseHomeworkMaxMarks(b.maxMarks);
        if (maxMarks === undefined) { res.status(400).json({ error: "Max marks must be a number greater than 0" }); return; }
        if (maxMarks === null && existing.gradeItemId) {
          res.status(409).json({ error: "Max marks cannot be removed after this homework has been synced to the gradebook" });
          return;
        }
        if (maxMarks !== null) {
          const highestScore = await hwSub().findFirst({
            where: { homeworkId: existing.id, status: "MARKED", score: { not: null } },
            orderBy: { score: "desc" },
            select: { score: true },
          });
          if (highestScore?.score != null && highestScore.score > maxMarks) {
            res.status(409).json({ error: `Max marks cannot be lower than the current highest score (${highestScore.score})` });
            return;
          }
        }
        data.maxMarks = maxMarks;
      }
      if (b.status !== undefined) {
        if (b.status !== "OPEN" && b.status !== "CLOSED") { res.status(400).json({ error: "Invalid homework status" }); return; }
        data.status = b.status;
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await (tx as any).homework.update({ where: { id: req.params.id }, data });
        if (existing.gradeItemId) {
          await tx.gradeItem.updateMany({
            where: { id: existing.gradeItemId },
            data: {
              title: `Homework: ${row.title}`,
              maxMarks: row.maxMarks,
              date: row.dueDate,
              subjectId: row.subjectId,
            },
          });
        }
        return row;
      });
      if (b.attachmentUrl !== undefined && existing.attachmentUrl !== updated.attachmentUrl) {
        await deleteHomeworkMediaIfUnreferenced(existing.attachmentUrl);
      }
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "HOMEWORK", existing.id,
        `Homework '${updated.title}' updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(updated);
    } catch (err) {
      logger.error("Error updating homework:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/homework/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const existing = await hw().findUnique({
        where: { id: req.params.id },
        include: {
          submissions: {
            select: {
              attachmentUrl: true,
              attachments: { select: { url: true } },
            },
          },
        },
      });
      if (!existing) { res.status(404).json({ error: "Homework not found" }); return; }
      if (!(await canManageExamClass(jwtUser, existing.classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      await prisma.$transaction(async (tx) => {
        if (existing.gradeItemId) await tx.gradeItem.deleteMany({ where: { id: existing.gradeItemId } });
        await (tx as any).homework.delete({ where: { id: req.params.id } });
      });
      await Promise.all([
        deleteHomeworkMediaIfUnreferenced(existing.attachmentUrl),
        ...existing.submissions.map((submission: any) => deleteHomeworkMediaIfUnreferenced(submission.attachmentUrl)),
        ...existing.submissions.flatMap((submission: any) =>
          submission.attachments.map((attachment: any) =>
            deleteHomeworkMediaIfUnreferenced(attachment.url),
          ),
        ),
      ]);
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "HOMEWORK", req.params.id,
        `Homework '${existing.title}' deleted.`, req.ip, req.headers["user-agent"] || null, "WARNING");
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting homework:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Student: list homework for their class with their own submission state.
  app.get("/api/student/homework", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "STUDENT") { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
      if (!student?.classId) { res.json([]); return; }
      const rows = await hw().findMany({
        where: { classId: student.classId },
        include: {
          subject: { select: { name: true } },
          teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          submissions: {
            where: { studentId: student.id },
            include: {
              attachments: { orderBy: { uploadedAt: "asc" } },
            },
          },
        },
        orderBy: { dueDate: "desc" },
      });
      res.json(rows.map((r: any) => ({
        id: r.id, title: r.title, instructions: r.instructions, attachmentUrl: r.attachmentUrl,
        subjectName: r.subject?.name ?? null,
        teacherName: `${r.teacher?.user?.firstName ?? ""} ${r.teacher?.user?.lastName ?? ""}`.trim() || null,
        dueDate: r.dueDate, maxMarks: r.maxMarks, status: r.status,
        mySubmission: r.submissions[0] ?? null,
      })));
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error("Error listing student homework:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Student: submit (or resubmit until marked).
  app.post("/api/homework/:id/submit", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "STUDENT") { res.status(403).json({ error: "Only students can submit homework" }); return; }
    const { text, attachmentUrl, attachments } = req.body || {};
    const cleanText = String(text ?? "").trim();
    const parsedAttachment = parseHomeworkAttachmentUrl(attachmentUrl, false);
    const parsedAttachments = attachments === undefined
      ? []
      : parseHomeworkSubmissionAttachments(attachments, jwtUser.userId);
    if (parsedAttachments === null) {
      res.status(400).json({ error: "Invalid homework documents" });
      return;
    }
    const primaryAttachment = parsedAttachment ?? parsedAttachments[0]?.url ?? null;
    if (!cleanText && !primaryAttachment) {
      res.status(400).json({ error: "Add some text or attach a photo/file" });
      return;
    }
    if (cleanText.length > HOMEWORK_SUBMISSION_MAX) { res.status(400).json({ error: "Submission text is too long" }); return; }
    if (attachmentUrl && !parsedAttachment) { res.status(400).json({ error: "Invalid homework attachment" }); return; }
    try {
      const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
      if (!student) { res.status(403).json({ error: "No student profile" }); return; }
      const homework = await hw().findUnique({ where: { id: req.params.id } });
      if (!homework || homework.classId !== student.classId) { res.status(404).json({ error: "Homework not found" }); return; }
      if (homework.status === "CLOSED") { res.status(403).json({ error: "This homework is closed for submissions" }); return; }

      const existing = await hwSub().findUnique({
        where: { homeworkId_studentId: { homeworkId: homework.id, studentId: student.id } },
        include: { attachments: true },
      });
      if (existing?.status === "MARKED") { res.status(409).json({ error: "Already marked — ask your teacher to reopen it if you need to resubmit" }); return; }
      if (
        parsedAttachment
        && homeworkMediaOwnerId(parsedAttachment) !== jwtUser.userId
        && existing?.attachmentUrl !== parsedAttachment
      ) {
        res.status(403).json({ error: "You can only submit files you uploaded" });
        return;
      }

      const data = {
        text: cleanText || null,
        attachmentUrl: primaryAttachment,
        submittedAt: new Date(),
        status: "SUBMITTED",
        score: null,
        markedAt: null,
        markedById: null,
      };
      const sub = await prisma.$transaction(async (tx) => {
        const saved = existing
          ? await (tx as any).homeworkSubmission.update({ where: { id: existing.id }, data })
          : await (tx as any).homeworkSubmission.create({ data: { ...data, homeworkId: homework.id, studentId: student.id } });
        await (tx as any).homeworkSubmissionAttachment.deleteMany({
          where: { submissionId: saved.id },
        });
        if (parsedAttachments.length > 0) {
          await (tx as any).homeworkSubmissionAttachment.createMany({
            data: parsedAttachments.map((attachment) => ({
              submissionId: saved.id,
              ...attachment,
            })),
          });
        }
        if (homework.gradeItemId) {
          await tx.grade.deleteMany({ where: { gradeItemId: homework.gradeItemId, studentId: student.id } });
        }
        return (tx as any).homeworkSubmission.findUnique({
          where: { id: saved.id },
          include: { attachments: { orderBy: { uploadedAt: "asc" } } },
        });
      });
      const keptUrls = new Set(parsedAttachments.map((attachment) => attachment.url));
      if (primaryAttachment) keptUrls.add(primaryAttachment);
      const removedUrls = [
        existing?.attachmentUrl,
        ...(existing?.attachments ?? []).map((attachment: any) => attachment.url),
      ].filter((url): url is string => Boolean(url) && !keptUrls.has(String(url)));
      await Promise.all(
        [...new Set(removedUrls)].map((url) => deleteHomeworkMediaIfUnreferenced(url)),
      );

      // Check badges for homework submission
      checkAndAwardBadges(student.id, 'HOMEWORK').catch(err =>
        logger.error(`Error checking badges for student ${student.id}:`, err)
      );

      res.status(existing ? 200 : 201).json(sub);
    } catch (err) {
      logger.error("Error submitting homework:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Teacher: mark a submission (score optional) or request a redo. Also lets
  // the teacher mark students who submitted on paper (creates an empty record).
  app.post("/api/homework/:id/mark", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") { res.status(403).json({ error: "Forbidden" }); return; }
    const { studentId, score, feedback, status } = req.body || {};
    if (!studentId) { res.status(400).json({ error: "studentId is required" }); return; }
    if (status !== "MARKED" && status !== "REDO") { res.status(400).json({ error: "Invalid marking status" }); return; }
    const newStatus = status;
    try {
      const homework = await hw().findUnique({ where: { id: req.params.id } });
      if (!homework) { res.status(404).json({ error: "Homework not found" }); return; }
      if (!(await canManageExamClass(jwtUser, homework.classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      const student = await prisma.student.findUnique({ where: { id: String(studentId) }, select: { id: true, classId: true, userId: true } });
      if (!student || student.classId !== homework.classId) { res.status(400).json({ error: "Student is not in this homework class" }); return; }

      const parsedScore = score === null || score === undefined || score === "" ? null : Number(score);
      if (parsedScore != null && (!Number.isFinite(parsedScore) || parsedScore < 0)) { res.status(400).json({ error: "Invalid score" }); return; }
      if (parsedScore != null && homework.maxMarks == null) { res.status(400).json({ error: "Set max marks before recording a score" }); return; }
      if (parsedScore != null && homework.maxMarks != null && parsedScore > homework.maxMarks) {
        res.status(400).json({ error: `Score cannot exceed ${homework.maxMarks}` });
        return;
      }

      const cleanFeedback = String(feedback ?? "").trim();
      if (cleanFeedback.length > HOMEWORK_FEEDBACK_MAX) { res.status(400).json({ error: "Feedback is too long" }); return; }
      if (newStatus === "REDO" && !cleanFeedback) {
        res.status(400).json({ error: "Feedback is required when requesting changes" });
        return;
      }
      const markData = {
        status: newStatus,
        score: newStatus === "MARKED" ? parsedScore : null,
        feedback: cleanFeedback || null,
        markedAt: new Date(),
        markedById: jwtUser.userId,
      };
      const sub = await prisma.$transaction(async (tx) => {
        const saved = await (tx as any).homeworkSubmission.upsert({
          where: { homeworkId_studentId: { homeworkId: homework.id, studentId } },
          update: markData,
          create: { homeworkId: homework.id, studentId, ...markData },
        });
        if (homework.gradeItemId) {
          if (newStatus === "MARKED" && parsedScore != null) {
            await tx.grade.upsert({
              where: { gradeItemId_studentId: { gradeItemId: homework.gradeItemId, studentId } },
              update: { marks: parsedScore, comment: cleanFeedback || null, gradedById: jwtUser.userId },
              create: { gradeItemId: homework.gradeItemId, studentId, marks: parsedScore, comment: cleanFeedback || null, gradedById: jwtUser.userId },
            });
          } else {
            await tx.grade.deleteMany({ where: { gradeItemId: homework.gradeItemId, studentId } });
          }
        }
        return saved;
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, newStatus === "REDO" ? "REDO" : "MARK", "HOMEWORK_SUBMISSION", sub.id,
        `Homework '${homework.title}' ${newStatus === "REDO" ? "returned for redo" : "marked"}.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      if (student.userId) await ensureNotification({
        userId: student.userId,
        type: newStatus === "REDO" ? "HOMEWORK_REDO" : "HOMEWORK_MARKED",
        title: newStatus === "REDO" ? "Homework needs changes" : "Homework marked",
        message: newStatus === "REDO"
          ? `${homework.title} was returned with feedback. Please update and resubmit it.`
          : `${homework.title} has been marked${parsedScore == null ? "." : `: ${parsedScore} points.`}`,
        href: "/student/homework",
        sourceId: `homework-result:${sub.id}:${sub.updatedAt.getTime()}`,
      });
      res.json(sub);
    } catch (err) {
      logger.error("Error marking homework:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Teacher: push scored submissions into the gradebook (ASSIGNMENT category).
  app.post("/api/homework/:id/sync-gradebook", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const homework = await hw().findUnique({ where: { id: req.params.id }, include: { submissions: true } });
      if (!homework) { res.status(404).json({ error: "Homework not found" }); return; }
      if (!(await canManageExamClass(jwtUser, homework.classId))) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      if (homework.maxMarks == null) { res.status(400).json({ error: "Set max marks on this homework before syncing to the gradebook" }); return; }
      const scored = homework.submissions.filter((s: any) => s.status === "MARKED" && s.score != null);
      if (scored.length === 0 && !homework.gradeItemId) { res.status(400).json({ error: "No scored submissions to sync yet" }); return; }

      const result = await prisma.$transaction(async (tx) => {
        let gradeItemId = homework.gradeItemId as string | null;
        if (gradeItemId) {
          const stillThere = await tx.gradeItem.findUnique({ where: { id: gradeItemId } });
          if (!stillThere) gradeItemId = null;
        }
        if (!gradeItemId) {
          const item = await tx.gradeItem.create({
            data: {
              title: `Homework: ${homework.title}`,
              category: "ASSIGNMENT" as any,
              maxMarks: homework.maxMarks,
              date: homework.dueDate,
              classId: homework.classId,
              subjectId: homework.subjectId,
              createdById: jwtUser.userId,
            },
          });
          gradeItemId = item.id;
          await (tx as any).homework.update({ where: { id: homework.id }, data: { gradeItemId } });
        } else {
          await tx.gradeItem.update({
            where: { id: gradeItemId },
            data: {
              title: `Homework: ${homework.title}`,
              maxMarks: homework.maxMarks,
              date: homework.dueDate,
              subjectId: homework.subjectId,
            },
          });
        }
        const scoredStudentIds = scored.map((submission: any) => submission.studentId);
        await tx.grade.deleteMany({
          where: {
            gradeItemId,
            ...(scoredStudentIds.length ? { studentId: { notIn: scoredStudentIds } } : {}),
          },
        });
        for (const s of scored) {
          await tx.grade.upsert({
            where: { gradeItemId_studentId: { gradeItemId, studentId: s.studentId } },
            update: { marks: s.score, comment: s.feedback || null, gradedById: jwtUser.userId },
            create: { gradeItemId, studentId: s.studentId, marks: s.score, comment: s.feedback || null, gradedById: jwtUser.userId },
          });
        }
        return { gradeItemId, count: scored.length };
      });

      await createAuditLog(jwtUser.userId, jwtUser.email, "SYNC", "HOMEWORK", homework.id,
        `Homework '${homework.title}' synced ${result.count} score(s) to gradebook.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(result);
    } catch (err) {
      logger.error("Error syncing homework to gradebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/lesson-plans", authMiddleware, teacherOnly, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId, upcoming } = req.query;
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: jwtUser.userId }
      });

      if (!teacher) {
        res.status(404).json({ error: "Teacher profile not found" });
        return;
      }

      const where: any = { teacherId: teacher.id };

      if (classId && typeof classId === 'string') {
        where.classId = classId;
      }

      if (upcoming === 'true') {
        where.plannedDate = { gte: new Date() };
      }

      const lessonPlans = await prisma.lessonPlan.findMany({
        where,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: { plannedDate: 'asc' }
      });

      const formattedPlans = lessonPlans.map(plan => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        class: plan.class,
        subject: plan.subject,
        plannedDate: plan.plannedDate,
        duration: plan.duration,
        room: plan.room,
        objectives: plan.objectives || [],
        materials: plan.materials || [],
        activities: plan.activities || [],
        assessment: plan.assessment,
        status: plan.status
      }));

      res.json(formattedPlans);
    } catch (err) {
      logger.error("Error fetching lesson plans:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/lesson-plans", authMiddleware, teacherOnly, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const {
      title,
      description,
      classId,
      subjectId,
      plannedDate,
      duration,
      room,
      objectives,
      materials,
      activities,
      assessment
    } = req.body;

    if (!title || !classId || !plannedDate) {
      res.status(400).json({ error: "Title, classId, and plannedDate are required" });
      return;
    }

    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: jwtUser.userId }
      });

      if (!teacher) {
        res.status(404).json({ error: "Teacher profile not found" });
        return;
      }

      const lessonPlan = await prisma.lessonPlan.create({
        data: {
          title,
          description,
          classId,
          subjectId: subjectId || null,
          plannedDate: new Date(plannedDate),
          duration: duration || 60,
          room: room || null,
          objectives: objectives || [],
          materials: materials || [],
          activities: activities || [],
          assessment,
          teacherId: teacher.id
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });

      res.status(201).json(lessonPlan);
    } catch (err) {
      logger.error("Error creating lesson plan:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/lesson-plans/:id", authMiddleware, teacherOnly, async (req, res) => {
    const { id } = req.params;
    try {
      const lessonPlan = await prisma.lessonPlan.findFirst({
        where: { id },
        include: {
          class: true,
          subject: true,
          teacher: {
            include: {
              user: true
            }
          },
          progress: true
        }
      });

      if (!lessonPlan) {
        res.status(404).json({ error: "Lesson plan not found" });
        return;
      }

      res.json(lessonPlan);
    } catch (err) {
      logger.error("Error fetching lesson plan:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/lesson-plans/:id", authMiddleware, teacherOnly, async (req, res) => {
    const { id } = req.params;
    const jwtUser = (req as any).user as JwtPayload;
    const updates = req.body || {};

    try {
      const existing = await prisma.lessonPlan.findFirst({
        where: { id }
      });

      if (!existing) {
        res.status(404).json({ error: "Lesson plan not found" });
        return;
      }

      // Ownership: teachers may only edit their own plans (admins may edit any).
      if (jwtUser.role !== "ADMIN") {
        const teacher = await prisma.teacher.findUnique({ where: { userId: jwtUser.userId } });
        if (!teacher || existing.teacherId !== teacher.id) {
          res.status(403).json({ error: "Forbidden: not your lesson plan" });
          return;
        }
      }

      // Whitelist updatable fields (previously spread the raw body into the
      // update, letting a client reassign teacherId or crash on unknown fields).
      const data: any = {};
      for (const k of ["title", "description", "room", "assessment", "status"] as const) {
        if (updates[k] !== undefined) data[k] = updates[k];
      }
      for (const k of ["objectives", "materials", "activities"] as const) {
        if (updates[k] !== undefined) data[k] = Array.isArray(updates[k]) ? updates[k] : [];
      }
      if (updates.classId !== undefined) data.classId = updates.classId;
      if (updates.subjectId !== undefined) data.subjectId = updates.subjectId || null;
      if (updates.duration !== undefined) data.duration = Number(updates.duration) || existing.duration;
      if (updates.plannedDate) data.plannedDate = new Date(updates.plannedDate);

      const updated = await prisma.lessonPlan.update({
        where: { id },
        data,
        include: {
          class: true,
          subject: true,
          progress: true
        }
      });

      res.json(updated);
    } catch (err) {
      logger.error("Error updating lesson plan:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── SPA fallback — registered AFTER every /api route so it never shadows one ──
  if (!isProduction) {
    // Keep the development server out of the production dependency/runtime path.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api/")) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      try {
        const fs = await import("fs");
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const distAssetsPath = path.join(distPath, "assets");

    // Vite fingerprints everything in /assets, so these files can safely stay in
    // browser and CDN caches for a year. Public files keep a short cache window
    // because their filenames are stable and can change between deployments.
    app.use("/assets", express.static(distAssetsPath, {
      maxAge: "1y",
      immutable: true,
    }));
    app.use(express.static(distPath, {
      maxAge: "1d",
      setHeaders: (res, filePath) => {
        const filename = path.basename(filePath);
        if (
          filename === "index.html" ||
          filename === "sw.js" ||
          filename === "service-worker.js" ||
          filename === "manifest.json" ||
          filename.endsWith(".webmanifest")
        ) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }));
    app.get("*", (req, res) => {
      // Unmatched API routes get a JSON 404 instead of the HTML shell.
      if (req.originalUrl.startsWith("/api/")) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ── Global error handler ────────────────────────────────────────────────────
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.error(err.stack);
      res.status(500).json({ error: "Internal Server Error" });
    }
  );

  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Mode: ${process.env.NODE_ENV || "development"}`);
  });
  const neonSnakeServer = registerNeonSnakeServer({
    server,
    logger,
    authenticate: async (token) => {
      const payload = verifyToken(token);
      if (payload.sessionId) {
        const session = await prisma.authSession.findUnique({ where: { id: payload.sessionId } });
        if (
          !session ||
          session.userId !== payload.userId ||
          session.revokedAt ||
          session.expiresAt <= new Date()
        ) {
          throw new Error("Session expired or revoked");
        }
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });
      if (!user?.isActive) throw new Error("Account is unavailable");
      // Only students under an active game-time policy need a tracked play
      // session. Unmanaged students (no policy) and staff must still be able
      // to join Neon Snake — requiring a session for every student blanked
      // the multiplayer arena for everyone after Game Time Controls shipped.
      if (user.role === "STUDENT") {
        const access = await evaluateStudentGameAccess(prisma, user.id, "SNAKE");
        if (!access.allowed) throw new Error(access.reason || "Game access is restricted");
        if (access.managed) {
          const controlledSession = await prisma.gamePlaySession.findFirst({
            where: {
              userId: user.id,
              gameKey: "SNAKE",
              status: "ACTIVE",
              lastHeartbeatAt: { gte: new Date(Date.now() - 60_000) },
            },
            orderBy: { startedAt: "desc" },
            select: { id: true },
          });
          if (!controlledSession) {
            throw new Error("Open Neon Snake from the LMS to start a controlled play session.");
          }
          const sessionAccess = await evaluateStudentGameAccess(prisma, user.id, "SNAKE", {
            sessionId: controlledSession.id,
          });
          if (!sessionAccess.allowed) {
            throw new Error(sessionAccess.reason || "Game access is restricted");
          }
        }
      }
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      return {
        userId: user.id,
        name: (fullName || user.email.split("@")[0] || "Player").slice(0, 40),
      };
    },
  });

  if (smtpTransport) {
    // Recover jobs left in-flight by an interrupted process, then poll the
    // durable outbox. unref() lets the process exit normally during shutdown.
    await prisma.emailOutbox.updateMany({
      where: { status: "SENDING", updatedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
      data: { status: "QUEUED", nextAttemptAt: new Date() },
    });
    void processEmailOutbox();
  } else {
    logger.warn("SMTP_HOST is not configured; email will remain queued until SMTP is configured.");
  }
  const emailWorker = setInterval(() => void processEmailOutbox(), 30_000);
  if (typeof (emailWorker as any).unref === "function") (emailWorker as any).unref();

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return; // ignore repeated Ctrl+C
    shuttingDown = true;
    logger.info("Shutting down server...");
    clearInterval(emailWorker);
    neonSnakeServer.close();
    // End long-lived SSE chat streams; otherwise they keep the server open.
    for (const set of chatStreams.values()) for (const r of set) { try { r.end(); } catch { /* ignore */ } }
    // Force-close lingering keep-alive sockets so server.close() can complete.
    (server as any).closeAllConnections?.();
    // Hard stop if something still hangs.
    const force = setTimeout(() => { logger.warn("Forcing shutdown."); process.exit(0); }, 3000);
    if (typeof (force as any).unref === "function") (force as any).unref();
    server.close(async () => {
      clearTimeout(force);
      try {
        await prisma.$disconnect();
        await pool.end();
        logger.info("Database pool closed.");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown:", err);
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Surface stray async failures instead of letting them vanish silently.
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception:", err);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
