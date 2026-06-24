import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { z } from "zod";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import winston from "winston";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

// ─── E-Library file storage ────────────────────────────────────────────────────
// Uploaded EPUB/PDF files live on disk (a Docker volume in production), NOT in
// the database. Override the location with the EBOOK_DIR env var.
const EBOOK_DIR = process.env.EBOOK_DIR || path.join(process.cwd(), "data", "ebooks");
fs.mkdirSync(EBOOK_DIR, { recursive: true });
const BRANDING_ASSET_DIR = process.env.BRANDING_ASSET_DIR || path.join(process.cwd(), "data", "branding");
fs.mkdirSync(BRANDING_ASSET_DIR, { recursive: true });
const PROFILE_PHOTO_DIR = process.env.PROFILE_PHOTO_DIR || path.join(process.cwd(), "data", "profile-photos");
fs.mkdirSync(PROFILE_PHOTO_DIR, { recursive: true });
const LIBRARY_FILE_DIR = process.env.LIBRARY_FILE_DIR || path.join(process.cwd(), "data", "library");
fs.mkdirSync(LIBRARY_FILE_DIR, { recursive: true });
const VIDEO_FILES_DIR = process.env.VIDEO_FILES_DIR || path.join(process.cwd(), "data", "videos");
fs.mkdirSync(VIDEO_FILES_DIR, { recursive: true });
const ADMISSION_FILE_DIR = process.env.ADMISSION_FILE_DIR || path.join(process.cwd(), "data", "admissions");
fs.mkdirSync(ADMISSION_FILE_DIR, { recursive: true });

const ebookUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, EBOOK_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf" || ext === ".epub") cb(null, true);
    else cb(new Error("Only .pdf and .epub files are allowed"));
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
    const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith("image/") && allowed.has(ext)) cb(null, true);
    else cb(new Error("Only PNG, JPG, WEBP, GIF, and SVG image files are allowed"));
  },
});

const imageUploadFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype.startsWith("image/") && allowed.has(ext)) cb(null, true);
  else cb(new Error("Only PNG, JPG, WEBP, GIF, and SVG image files are allowed"));
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

const videoFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEO_FILES_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for video files
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv"]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.has(ext)) cb(null, true);
    else cb(new Error("Only video files (MP4, WebM, MOV, AVI, MKV, FLV, WMV) are allowed"));
  },
});

// ─── Database backups ──────────────────────────────────────────────────────────
// Real pg_dump backups written to disk (a Docker volume in production). Override
// the location with BACKUP_DIR and how many to keep with BACKUP_RETENTION.
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "data", "backups");
const BACKUP_RETENTION = Math.max(1, Number(process.env.BACKUP_RETENTION || 14));

interface BackupFile { name: string; size: number; createdAt: string; }

function listBackups(): BackupFile[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".dump"))
      .map((name) => {
        const st = fs.statSync(path.join(BACKUP_DIR, name));
        return { name, size: st.size, createdAt: st.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function pruneBackups(): void {
  const files = listBackups();
  for (const f of files.slice(BACKUP_RETENTION)) {
    fs.promises.unlink(path.join(BACKUP_DIR, f.name)).catch(() => {});
  }
}

// Runs pg_dump in custom format (restore with pg_restore). Resolves with the file.
function runBackup(): Promise<BackupFile> {
  return new Promise((resolve, reject) => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return reject(new Error("DATABASE_URL is not set"));
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const name = `mrlc-${stamp}.dump`;
    const filePath = path.join(BACKUP_DIR, name);

    const dump = spawn("pg_dump", ["-Fc", "--no-owner", "--no-privileges", "-f", filePath, dbUrl]);
    let stderr = "";
    dump.stderr.on("data", (d) => (stderr += d.toString()));
    dump.on("error", (err) =>
      reject(new Error(`pg_dump could not start (is postgresql-client installed?): ${err.message}`)),
    );
    dump.on("close", (code) => {
      if (code !== 0) {
        fs.promises.unlink(filePath).catch(() => {});
        return reject(new Error(`pg_dump failed (exit ${code}): ${stderr.trim()}`));
      }
      let size = 0;
      try { size = fs.statSync(filePath).size; } catch { /* ignore */ }
      pruneBackups();
      resolve({ name, size, createdAt: new Date().toISOString() });
    });
  });
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

// ─── Prisma ───────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

// ─── JWT helpers ─────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  logger.error("FATAL: SESSION_SECRET must be set and at least 16 characters long.");
  process.exit(1);
}

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "8h" });
}

function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
/**
 * Verifies the JWT from the Authorization header (Bearer <token>).
 * Sets req.user on success; returns 401 on failure.
 * NEVER trusts client-supplied role headers.
 */
function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

function requireRole(role: string) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || user.role !== role) {
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
const optNum = num.optional().nullable();
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

const schemas = {
  login: z.object({ email, password: z.string().min(1, "is required") }),
  verifyPassword: z.object({ password: z.string().min(1, "is required") }),
  changePassword: z.object({
    currentPassword: z.string().min(1, "is required"),
    newPassword: z.string().min(8, "must be at least 8 characters"),
  }),
  student: z.object({
    firstName: reqStr, lastName: reqStr,
    email: z.union([email, z.literal("")]).optional(),
    studentCode: optStr, dateOfBirth: optStr, guardianName: optStr,
    guardianPhone: optStr, contactNumber: optStr, country: optStr,
    identityType: optStr, identityNumber: optStr, address: optStr,
    emergencyContact: optStr, notes: optStr,
    classId: optStr, gender: optStr, status: optStr,
  }),
  userCreate: z.object({
    firstName: reqStr, lastName: reqStr, email,
    password: z.string().min(6, "must be at least 6 characters"),
    role: userRole, status: optStr,
    teacherId: nullableStr, studentId: nullableStr,
  }),
  userUpdate: z.object({
    firstName: optStr, lastName: optStr,
    email: z.union([email, z.literal("")]).optional(),
    role: userRole.optional(), status: optStr,
    teacherId: nullableStr, studentId: nullableStr,
  }),
  attendance: z.object({
    classId: reqStr,
    date: reqStr,
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
    studentId: reqStr, amount: num,
    paymentType: optStr, paymentMethod: optStr, paymentDate: optStr,
    receiptNumber: optStr, notes: optStr,
  }),
  exam: z.object({
    title: reqStr, classId: reqStr, subjectId: reqStr,
    examType: z.enum(["QUIZ", "MIDTERM", "FINAL", "MOCK"]).optional(),
    duration: optNum, totalMarks: optNum,
    questions: z.array(z.object({
      questionText: optStr, type: optStr, points: optNum,
      choices: z.any().optional(), correctAnswer: z.any().optional(),
    })).optional(),
  }),
  classCreate: z.object({
    name: reqStr, level: reqStr, academicYear: reqStr,
    description: optStr, room: optStr, capacity: optNum,
  }),
  teacherCreate: z.object({
    firstName: reqStr, lastName: reqStr, email,
    phone: optStr, gender: optStr, address: optStr,
    employmentType: optStr, joinedDate: optStr,
    subjects: z.union([z.array(z.string()), optStr]).optional(), notes: optStr,
  }),
  library: z.object({
    title: reqStr, type: reqStr,
    description: nullableStr, visibility: nullableStr, classId: nullableStr,
    subjectId: nullableStr, externalUrl: nullableStr,
  }),
  video: z.object({
    title: reqStr, videoUrl: reqStr,
    description: nullableStr, thumbnailUrl: nullableStr, duration: optNum,
    classId: nullableStr, subjectId: nullableStr, visibility: nullableStr,
    status: nullableStr, uploadedByName: nullableStr,
  }),
  bookLoan: z.object({
    borrowerName: reqStr, dueDate: reqStr,
    borrowerType: optStr, studentId: optStr, notes: optStr,
  }),

  // ── Update / additional schemas (fields optional for partial PUTs) ──
  studentUpdate: z.object({
    firstName: optStr, lastName: optStr,
    email: z.union([email, z.literal("")]).optional(),
    studentCode: optStr, dateOfBirth: optStr, guardianName: optStr,
    guardianPhone: optStr, contactNumber: optStr, country: optStr,
    identityType: optStr, identityNumber: optStr, address: optStr,
    emergencyContact: optStr, notes: optStr,
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
    title: optStr, description: nullableStr, videoUrl: optStr, thumbnailUrl: nullableStr,
    duration: optNum, classId: nullableStr, subjectId: nullableStr, visibility: nullableStr, status: nullableStr,
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
    logoUrl: nullableStr, signatureUrl: nullableStr, loginHeroUrl: nullableStr, primaryColor: optStr, accentColor: optStr,
    darkModeDefault: z.union([z.boolean(), z.string()]).optional(),
    reportHeaderStyle: optStr,
    timezone: optStr, dateFormat: optStr, currency: optStr, defaultLanguage: optStr,
    fileUploadLimitMb: optNum,
    backupEnabled: z.union([z.boolean(), z.string()]).optional(),
  }),
  timetable: z.object({
    classId: nullableStr,
    className: optStr,
    subjectId: nullableStr,
    subjectName: optStr,
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
    effectiveFrom: optStr,
    effectiveUntil: optStr,
    eventDate: optStr,
    notes: optStr,
  }),
  timetableUpdate: z.object({
    classId: optStr,
    className: nullableStr,
    subjectId: optStr,
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
    effectiveFrom: optStr,
    effectiveUntil: optStr,
    eventDate: optStr,
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
              "script-src": ["'self'"],
              "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
              "img-src": ["'self'", "data:", "https:"],
              "media-src": ["'self'", "https:", "blob:"],
              "connect-src": ["'self'"],
              "worker-src": ["'self'", "blob:"],
              "frame-src": [
                "'self'",
                "blob:",
                "https://www.youtube.com",
                "https://www.youtube-nocookie.com",
                "https://player.vimeo.com",
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
  app.use("/uploads/branding", express.static(BRANDING_ASSET_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  app.use("/uploads/profile-photos", express.static(PROFILE_PHOTO_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  app.use("/uploads/library", express.static(LIBRARY_FILE_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  app.use("/uploads/videos", express.static(VIDEO_FILES_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));
  app.use("/uploads/admissions", express.static(ADMISSION_FILE_DIR, {
    maxAge: isProduction ? "30d" : 0,
    immutable: isProduction,
  }));

  // ── Rate limiting ───────────────────────────────────────────────────────────
  // Generous global cap (schools often share one NAT'd IP). Health checks and
  // e-book streaming are skipped so monitoring and reading are never throttled.
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: (req) =>
      req.originalUrl === "/api/health" ||
      /^\/api\/ebooks\/[^/]+\/(content|download)/.test(req.originalUrl),
  });
  app.use("/api/", apiLimiter);

  // Stricter limit for auth endpoints to prevent brute-force.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again after 15 minutes." },
  });

  // ── Auth routes ─────────────────────────────────────────────────────────────
  /**
   * POST /api/auth/login
   * Body: { email: string, password: string }
   * Returns: { token: string, user: { id, email, role } }
   */
  app.post("/api/auth/login", authLimiter, validate(schemas.login), async (req, res) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.passwordHash) {
        // Use constant-time comparison even for missing users to avoid timing attacks
        await bcrypt.compare(password, "$2b$10$invalidhashpadding000000000000000000000000000000000000");
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: "Account is disabled. Contact your administrator." });
        return;
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        logger.warn(`Failed login attempt for email: ${email}`);
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const payload: JwtPayload = {
        userId: user.id,
        role: user.role,
        email: user.email,
      };
      const token = signToken(payload);

      logger.info(`User ${user.email} (${user.role}) logged in successfully`);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePhotoUrl: (user as any).profilePhotoUrl || null,
          role: user.role,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
        },
      });
    } catch (err) {
      logger.error("Login error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user's profile.
   */
  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const user = await prisma.user.findUnique({
        where: { id: jwtUser.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
        },
      });
      if (!user || !user.isActive) {
        res.status(401).json({ error: "User not found or disabled" });
        return;
      }
      res.json({ user });
    } catch (err) {
      logger.error("Error fetching user profile:", err);
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
  app.get("/api/audit-logs", authMiddleware, requireRole("ADMIN"), async (req, res) => {
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

  // ── Students API ────────────────────────────────────────────────────────────
  app.get("/api/students", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const students = await prisma.student.findMany({
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

  app.post("/api/students", authMiddleware, requireRole("ADMIN"), validate(schemas.student), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const {
      firstName, lastName, email, studentCode, dateOfBirth, guardianName,
      guardianPhone, contactNumber, country, identityType, identityNumber,
      address, emergencyContact, notes, classId, gender, status,
    } = req.body;
    if (!firstName || !lastName || !email || !studentCode) {
      res.status(400).json({ error: "First name, last name, email, and student code are required" });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
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
            studentCode,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            guardianName,
            guardianPhone,
            contactNumber,
            country,
            identityType,
            identityNumber,
            address,
            emergencyContact,
            notes,
            classId: classId || null,
            gender,
            status: status || "ACTIVE",
          },
          include: {
            user: true,
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
        res.status(400).json({ error: "Email or Student Code already exists" });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
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
          user: true,
          class: true,
        }
      });
      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
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
        include: { user: true, class: true },
      });
      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      const profile = await prisma.schoolProfile.findFirst();
      const currency = profile?.currency || "MYR";
      const [attempts, fees, classExams] = await Promise.all([
        prisma.examAttempt.findMany({
          where: { studentId: id, isCompleted: true },
          include: { exam: { include: { subject: true } } },
          orderBy: { completedAt: "desc" },
        }),
        prisma.feePayment.findMany({
          where: { studentId: id },
          include: { student: { include: { user: true, class: true } } },
          orderBy: [{ paidDate: "desc" }, { createdAt: "desc" }],
        }),
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
        fees: {
          currency,
          totalExpected,
          totalPaid,
          balance: Math.max(0, totalExpected - totalPaid),
          paymentCount: fees.length,
          rows: feeRows,
        },
      });
    } catch (err) {
      logger.error("Error fetching student profile data:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/students/:id", authMiddleware, requireRole("ADMIN"), validate(schemas.studentUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    const {
      firstName, lastName, email, studentCode, dateOfBirth, guardianName,
      guardianPhone, contactNumber, country, identityType, identityNumber,
      address, emergencyContact, notes, classId, gender, status,
    } = req.body;
    try {
      const existingStudent = await prisma.student.findUnique({ where: { id } });
      if (!existingStudent) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
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
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            guardianName,
            guardianPhone,
            contactNumber,
            country,
            identityType,
            identityNumber,
            address,
            emergencyContact,
            notes,
            classId: classId || null,
            gender,
            status,
          },
          include: {
            user: true,
            class: true,
          }
        });
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "STUDENT",
        id,
        `Student '${firstName} ${lastName}' updated.`,
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

  app.delete("/api/students/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
      await prisma.$transaction(async (tx) => {
        await tx.student.delete({ where: { id } });
        if (student.userId) {
          await tx.user.delete({ where: { id: student.userId } });
        }
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "STUDENT",
        id,
        `Student ID ${id} deleted.`,
        req.ip,
        req.headers["user-agent"] || null,
        "SUCCESS"
      );

      res.json({ message: "Student deleted successfully" });
    } catch (err) {
      logger.error("Error deleting student:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Users API ───────────────────────────────────────────────────────────────
  app.get("/api/users", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, createdAt: true,
          studentProfile: { select: { id: true } },
          teacherProfile: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(users);
    } catch (err) {
      logger.error("Error fetching users:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/users", authMiddleware, requireRole("ADMIN"), validate(schemas.userCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { firstName, lastName, email, password, role, status, teacherId, studentId } = req.body;
    if (!firstName || !email || !password || !role) {
      res.status(400).json({ error: "firstName, email, password, and role are required" });
      return;
    }
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { firstName, lastName: lastName || "", email, passwordHash, role, isActive: status !== "DISABLED" },
          select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
        });
        // Optionally link an existing teacher/student profile to the new account.
        if (teacherId) {
          await tx.teacher.updateMany({ where: { userId: created.id }, data: { userId: null } });
          await tx.teacher.update({ where: { id: teacherId }, data: { userId: created.id } });
        }
        if (studentId) {
          await tx.student.updateMany({ where: { userId: created.id }, data: { userId: null } });
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
      if (err.code === "P2002") {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // ── Teachers API ────────────────────────────────────────────────────────────
  app.get("/api/teachers", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
      const teachers = await prisma.teacher.findMany({
        include: {
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
          user: true,
          classes: { include: { class: true } },
          subjects: { include: { subject: true } },
        },
      });
      if (!teacher) {
        res.status(404).json({ error: "Teacher not found" });
        return;
      }
      res.json(teacher);
    } catch (err) {
      logger.error("Error fetching teacher:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Classes & Subjects API ──────────────────────────────────────────────────
  app.get("/api/classes", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const classes = await prisma.class.findMany({
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
      res.json(klass);
    } catch (err) {
      logger.error("Error fetching class:", err);
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
      const subjects = await prisma.subject.findMany({
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

  // ── Attendance API ──────────────────────────────────────────────────────────
  app.get("/api/attendance", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { classId, date } = req.query as { classId?: string; date?: string };
    if (!classId || !date) {
      res.status(400).json({ error: "classId and date are required" });
      return;
    }
    try {
      const parsedDate = new Date(date);
      const startOfDay = new Date(parsedDate.setUTCHours(0, 0, 0, 0));
      const attendances = await prisma.attendance.findMany({
        where: {
          classId,
          date: startOfDay,
        },
        include: {
          student: {
            include: { user: true }
          }
        }
      });
      res.json(attendances);
    } catch (err) {
      logger.error("Error fetching attendance:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/attendance", authMiddleware, validate(schemas.attendance), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { classId, date, records } = req.body as {
      classId: string;
      date: string;
      records: Array<{ studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks?: string }>;
    };
    if (!classId || !date || !records || !Array.isArray(records)) {
      res.status(400).json({ error: "classId, date, and records array are required" });
      return;
    }
    try {
      const parsedDate = new Date(date);
      const startOfDay = new Date(parsedDate.setUTCHours(0, 0, 0, 0));
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
              remarks: rec.remarks || null,
              recordedById: jwtUser.userId,
            },
            create: {
              studentId: rec.studentId,
              classId,
              date: startOfDay,
              status: rec.status,
              remarks: rec.remarks || null,
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

      res.json({ success: true, count: results.length });
    } catch (err) {
      logger.error("Error saving attendance:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Cases (Support/Safeguarding) API ──────────────────────────────────────
  app.get("/api/cases", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "CASE_WORKER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const cases = await prisma.caseRecord.findMany({
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
          ? "Video files must be 500 MB or smaller"
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

  app.post("/api/admissions/:id/convert", authMiddleware, requireRole("ADMIN"), validate(schemas.admissionConvert), async (req, res) => {
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
    try {
      let resources;
      if (jwtUser.role === "STUDENT") {
        resources = await prisma.libraryResource.findMany({
          where: { visibility: { in: ["ALL", "STUDENTS"] } }
        });
      } else if (jwtUser.role === "TEACHER") {
        resources = await prisma.libraryResource.findMany({
          where: { visibility: { in: ["ALL", "TEACHERS_ONLY"] } }
        });
      } else {
        resources = await prisma.libraryResource.findMany();
      }
      res.json(resources);
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
          totalCopies: 1,
          availableCopies: 1,
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
    } catch (err) {
      logger.error("Error creating library resource:", err);
      res.status(500).json({ error: "Internal Server Error" });
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

  app.delete("/api/library/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    try {
      await prisma.libraryResource.delete({ where: { id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "LIBRARY",
        id,
        `Library resource ID ${id} deleted.`,
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
  app.post("/api/videos/files", authMiddleware, uploadVideoFile, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "Video file is required" });
      return;
    }
    res.json({
      url: `/uploads/videos/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });
  });

  app.get("/api/videos", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      let where: any = {};
      if (jwtUser.role === "STUDENT") {
        where = { visibility: { in: ["ALL", "STUDENTS"] }, status: "PUBLISHED" };
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
    const { title, description, videoUrl, thumbnailUrl, duration, classId, subjectId, visibility, status, uploadedByName } = req.body;
    if (!title || !videoUrl) {
      res.status(400).json({ error: "title and videoUrl are required" });
      return;
    }
    try {
      const video = await prisma.videoLesson.create({
        data: {
          title,
          description: description || null,
          videoUrl,
          thumbnailUrl: thumbnailUrl || null,
          duration: duration != null ? Number(duration) : null,
          classId: classId || null,
          subjectId: subjectId || null,
          visibility: visibility || "ALL",
          status: status || "PUBLISHED",
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
    const { title, description, videoUrl, thumbnailUrl, duration, classId, subjectId, visibility, status } = req.body;
    try {
      // First, get the current video to check if videoUrl is changing
      const currentVideo = await prisma.videoLesson.findUnique({ where: { id } });
      if (!currentVideo) {
        res.status(404).json({ error: "Video lesson not found" });
        return;
      }

      // If videoUrl is changing and the old URL was an uploaded file, delete the old file
      if (videoUrl && videoUrl !== currentVideo.videoUrl && currentVideo.videoUrl.startsWith("/uploads/videos/")) {
        const filename = currentVideo.videoUrl.replace("/uploads/videos/", "");
        const filePath = path.join(VIDEO_FILES_DIR, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            logger.info(`Deleted old video file: ${filePath}`);
          } catch (err) {
            logger.error(`Failed to delete old video file: ${filePath}`, err);
            // Continue with update even if file deletion fails
          }
        }
      }

      const updated = await prisma.videoLesson.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description: description || null }),
          ...(videoUrl && { videoUrl }),
          ...(thumbnailUrl !== undefined && { thumbnailUrl: thumbnailUrl || null }),
          ...(duration !== undefined && { duration: duration != null ? Number(duration) : null }),
          ...(classId !== undefined && { classId: classId || null }),
          ...(subjectId !== undefined && { subjectId: subjectId || null }),
          ...(visibility && { visibility }),
          ...(status && { status }),
        },
      });

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

      // Delete the video file from disk if it's an uploaded file
      if (video.videoUrl.startsWith("/uploads/videos/")) {
        const filename = video.videoUrl.replace("/uploads/videos/", "");
        const filePath = path.join(VIDEO_FILES_DIR, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            logger.info(`Deleted video file: ${filePath}`);
          } catch (err) {
            logger.error(`Failed to delete video file: ${filePath}`, err);
            // Continue with database deletion even if file deletion fails
          }
        }
      }

      await prisma.videoLesson.delete({ where: { id } });

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
    const { currentPosition, isCompleted } = req.body;

    // Validate input
    if (typeof currentPosition !== "number" || currentPosition < 0) {
      res.status(400).json({ error: "currentPosition must be a non-negative number" });
      return;
    }
    if (typeof isCompleted !== "boolean") {
      res.status(400).json({ error: "isCompleted must be a boolean" });
      return;
    }

    try {
      // Check if video exists
      const video = await prisma.videoLesson.findUnique({ where: { id } });
      if (!video) {
        res.status(404).json({ error: "Video not found" });
        return;
      }

      // Upsert progress
      const progress = await prisma.videoProgress.upsert({
        where: { userId_videoId: { userId: jwtUser.userId, videoId: id } },
        create: {
          userId: jwtUser.userId,
          videoId: id,
          currentPosition,
          isCompleted,
          lastWatchedAt: new Date(),
        },
        update: {
          currentPosition,
          isCompleted,
          lastWatchedAt: new Date(),
        },
      });

      res.json(progress);
    } catch (err) {
      logger.error("Error saving video progress:", err);
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

  app.post("/api/operations/admissions", authMiddleware, requireRole("ADMIN"), validate(schemas.admissionApplication), async (req, res) => {
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

  app.post("/api/operations/calendar-events", authMiddleware, requireRole("ADMIN"), validate(schemas.calendarEvent), async (req, res) => {
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

  app.post("/api/operations/assignments", authMiddleware, requireRole("ADMIN"), validate(schemas.assignment), async (req, res) => {
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

  app.post("/api/operations/certificates", authMiddleware, requireRole("ADMIN"), validate(schemas.certificateRecord), async (req, res) => {
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

  app.post("/api/operations/communications", authMiddleware, requireRole("ADMIN"), validate(schemas.communicationLog), async (req, res) => {
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

  app.post("/api/operations/inventory", authMiddleware, requireRole("ADMIN"), validate(schemas.inventoryItem), async (req, res) => {
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

  // ── Fees API ────────────────────────────────────────────────────────────────
  const feeReceiptPayload = (fee: any, fallbackCurrency = "MYR") => {
    const studentUser = fee.student?.user;
    const studentName = `${studentUser?.firstName ?? ""} ${studentUser?.lastName ?? ""}`.trim() || "Unknown";
    const paidDate = fee.paidDate ?? fee.createdAt;

    return {
      ...fee,
      currency: fee.currency || fallbackCurrency,
      paymentDate: paidDate,
      paymentType: fee.description || "Fee Payment",
      studentName,
      studentIdNumber: fee.student?.studentCode ?? "—",
      class: fee.student?.class?.name ?? fee.student?.classId ?? "—",
      recordedBy: "Finance Office",
    };
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
        const fees = await prisma.feePayment.findMany({
          where: { studentId: student.id },
          include: { student: { include: { user: true, class: true } } }
        });
        res.json(fees.map((fee) => feeReceiptPayload(fee, fallbackCurrency)));
      } else {
        const fees = await prisma.feePayment.findMany({
          include: { student: { include: { user: true, class: true } } }
        });
        res.json(fees.map((fee) => feeReceiptPayload(fee, fallbackCurrency)));
      }
    } catch (err) {
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
      }
      res.json(feeReceiptPayload(fee, profile?.currency || "MYR"));
    } catch (err) {
      logger.error("Error fetching fee receipt:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/fees", authMiddleware, validate(schemas.fee), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "ACCOUNTANT") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { studentId, amount, paymentType, paymentMethod, paymentDate, receiptNumber, notes } = req.body;
    if (!studentId || !amount) {
      res.status(400).json({ error: "studentId and amount are required" });
      return;
    }
    if (Number(amount) <= 0) {
      res.status(400).json({ error: "amount must be greater than 0" });
      return;
    }
    try {
      const profile = await prisma.schoolProfile.findFirst();
      const fee = await prisma.feePayment.create({
        data: {
          studentId,
          amount: Number(amount),
          currency: profile?.currency || "MYR",
          description: paymentType || "Tuition Fee",
          paymentMethod: paymentMethod || "CASH",
          paidDate: paymentDate ? new Date(paymentDate) : new Date(),
          dueDate: new Date(),
          status: "PAID",
          receiptNumber: receiptNumber || `RCP-${Date.now()}`,
          notes,
        },
        include: { student: { include: { user: true, class: true } } }
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "PAYMENT",
        fee.id,
        `Recorded fee payment of ${amount} for student ID ${studentId}.`,
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

  // ── Exams API ───────────────────────────────────────────────────────────────
  app.get("/api/exams", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
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
          where: { classId: student.classId },
          include: {
            class: true,
            subject: true,
            questions: {
              select: {
                id: true,
                text: true,
                type: true,
                points: true,
                options: true,
                examId: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });
      } else {
        exams = await prisma.exam.findMany({
          include: { class: true, subject: true, questions: true }
        });
      }
      res.json(exams);
    } catch (err) {
      logger.error("Error fetching exams:", err);
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
                select: {
                  id: true,
                  text: true,
                  type: true,
                  points: true,
                  options: true,
                  examId: true,
                  createdAt: true,
                  updatedAt: true,
                },
              }
            : true,
          attempts: isStudent
            ? false
            : { include: { student: { include: { user: true } } } },
        },
      });
      if (!exam) {
        res.status(404).json({ error: "Exam not found" });
        return;
      }
      // A student may only view an exam for their own class.
      if (isStudent) {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!student || student.classId !== exam.classId) {
          res.status(404).json({ error: "Exam not found" });
          return;
        }
      }
      res.json(exam);
    } catch (err) {
      logger.error("Error fetching exam:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/exams", authMiddleware, validate(schemas.exam), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN" && jwtUser.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { title, classId, subjectId, examType, duration, totalMarks, questions } = req.body;
    if (!title || !classId || !subjectId) {
      res.status(400).json({ error: "title, classId, and subjectId are required" });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        const exam = await tx.exam.create({
          data: {
            title,
            classId,
            subjectId,
            type: examType || "FINAL",
            date: new Date(),
            durationMinutes: duration ? Number(duration) : null,
            totalMarks: totalMarks != null ? Number(totalMarks) : null,
          }
        });
        if (questions && Array.isArray(questions)) {
          for (const q of questions) {
            await tx.question.create({
              data: {
                examId: exam.id,
                text: q.questionText,
                type: q.type || "MCQ",
                points: Number(q.points) || 5,
                options: q.choices || null,
                correctAnswer: q.correctAnswer !== undefined ? String(q.correctAnswer) : null,
              }
            });
          }
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
    } catch (err) {
      logger.error("Error creating exam:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Users (single + update) ─────────────────────────────────────────────────
  app.get("/api/users/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, firstName: true, lastName: true, email: true, role: true, isActive: true,
          studentProfile: { select: { id: true } },
          teacherProfile: { select: { id: true } },
        },
      });
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      res.json(user);
    } catch (err) {
      logger.error("Error fetching user:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/users/:id", authMiddleware, requireRole("ADMIN"), validate(schemas.userUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { firstName, lastName, email, role, status, teacherId, studentId } = req.body;
    const userId = req.params.id;
    try {
      const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(email && { email }),
            ...(role && { role }),
            ...(status !== undefined && { isActive: status !== "DISABLED" }),
          },
          select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
        });

        // Link / unlink a teacher profile (Teacher.userId is unique).
        if (teacherId !== undefined) {
          await tx.teacher.updateMany({ where: { userId }, data: { userId: null } });
          if (teacherId) {
            await tx.teacher.update({ where: { id: teacherId }, data: { userId } });
          }
        }
        // Link / unlink a student profile (Student.userId is unique).
        if (studentId !== undefined) {
          await tx.student.updateMany({ where: { userId }, data: { userId: null } });
          if (studentId) {
            await tx.student.update({ where: { id: studentId }, data: { userId } });
          }
        }
        return updated;
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "USER", user.id,
        `User '${user.firstName} ${user.lastName}' updated.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.json(user);
    } catch (err: any) {
      logger.error("Error updating user:", err);
      if (err.code === "P2002") { res.status(400).json({ error: "Email already in use" }); return; }
      if (err.code === "P2025") { res.status(404).json({ error: "User not found" }); return; }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Admin resets a user's password directly to a chosen value.
  app.post("/api/users/:id/reset-password", authMiddleware, requireRole("ADMIN"), async (req, res) => {
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
  app.post("/api/teachers", authMiddleware, requireRole("ADMIN"), validate(schemas.teacherCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { firstName, lastName, email, phone, gender, address, employmentType, joinedDate, subjects, notes } = req.body;
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
          data: { firstName, lastName, email, passwordHash, role: "TEACHER", isActive: true, mustChangePassword: true },
        });
        const teacherCode = `TCH-${Date.now().toString().slice(-6)}`;
        const teacher = await tx.teacher.create({
          data: {
            userId: user.id,
            teacherCode,
            specialization: specialization || null,
            hireDate: joinedDate ? new Date(joinedDate) : new Date(),
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

  // ── Classes (create) ────────────────────────────────────────────────────────
  app.post("/api/classes", authMiddleware, requireRole("ADMIN"), validate(schemas.classCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { name, level, academicYear, description, room, capacity } = req.body;
    if (!name || !level || !academicYear) {
      res.status(400).json({ error: "name, level, and academicYear are required" }); return;
    }
    try {
      const cls = await prisma.class.create({
        data: { name, level, academicYear, room: room || null, capacity: capacity ? Number(capacity) : null },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "CLASS", cls.id,
        `Class '${name}' (${level}) created.`, req.ip, req.headers["user-agent"] || null, "SUCCESS");
      res.status(201).json(cls);
    } catch (err) {
      logger.error("Error creating class:", err);
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

  app.put("/api/settings", authMiddleware, requireRole("ADMIN"), validate(schemas.settingsUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const b = req.body || {};

    // Build an update payload from only the fields actually provided, so the
    // School / Branding / System tabs can each save independently.
    const data: any = {};
    if (b.name) data.name = b.name;
    if (b.address !== undefined) data.address = b.address;
    if (b.email !== undefined) data.contactEmail = b.email;
    if (b.phone !== undefined) data.contactPhone = b.phone;

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
    if (b.currency !== undefined) data.currency = b.currency;
    if (b.defaultLanguage !== undefined) data.defaultLanguage = b.defaultLanguage;
    if (b.fileUploadLimitMb !== undefined) data.fileUploadLimitMb = Number(b.fileUploadLimitMb);
    if (b.backupEnabled !== undefined) data.backupEnabled = parseBoolean(b.backupEnabled);

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

  app.post("/api/settings/assets", authMiddleware, requireRole("ADMIN"), uploadBrandingAsset, async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }
    res.json({ url: `/uploads/branding/${file.filename}` });
  });

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

  app.get("/api/export/:module", authMiddleware, requireRole("ADMIN"), async (req, res) => {
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

  // ── E-Library (EPUB/PDF) API ────────────────────────────────────────────────
  const canManageEbooks = (role: string) => role === "ADMIN" || role === "TEACHER" || role === "LIBRARIAN";

  // Wrap multer so upload errors (wrong type / too large) return 400, not 500.
  const uploadEbookFile = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    ebookUpload.single("file")(req, res, (err: any) => {
      if (err) {
        const message =
          err instanceof multer.MulterError
            ? (err.code === "LIMIT_FILE_SIZE" ? "File exceeds the 100 MB limit" : err.message)
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

  const contentType = (format: string) =>
    (format || "").toUpperCase() === "EPUB" ? "application/epub+zip" : "application/pdf";

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
          language: true, coverUrl: true, format: true, fileSize: true,
          visibility: true, downloadAllowed: true, uploadedByName: true, createdAt: true,
        },
      });
      res.json(ebooks);
    } catch (err) {
      logger.error("Error fetching ebooks:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post(
    "/api/ebooks",
    authMiddleware,
    (req, res, next) => {
      const jwtUser = (req as any).user as JwtPayload;
      if (!canManageEbooks(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    },
    uploadEbookFile,
    async (req, res) => {
      const jwtUser = (req as any).user as JwtPayload;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ error: "An .epub or .pdf file is required" });
        return;
      }
      const { title, author, description, category, language, visibility, downloadAllowed, coverUrl, uploadedByName } = req.body;
      if (!title) {
        fs.promises.unlink(file.path).catch(() => {});
        res.status(400).json({ error: "title is required" });
        return;
      }
      const format = path.extname(file.originalname).toLowerCase() === ".epub" ? "EPUB" : "PDF";
      try {
        const ebook = await prisma.ebook.create({
          data: {
            title,
            author: author || null,
            description: description || null,
            category: category || null,
            language: language || null,
            coverUrl: coverUrl || null,
            format,
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            visibility: visibility || "ALL",
            downloadAllowed: downloadAllowed === "true" || downloadAllowed === true,
            uploadedById: jwtUser.userId,
            uploadedByName: uploadedByName || jwtUser.email,
          },
        });
        await createAuditLog(
          jwtUser.userId, jwtUser.email, "CREATE", "EBOOK", ebook.id,
          `E-book '${title}' (${format}) uploaded.`,
          req.ip, req.headers["user-agent"] || null, "SUCCESS"
        );
        res.status(201).json(ebook);
      } catch (err) {
        fs.promises.unlink(file.path).catch(() => {});
        logger.error("Error creating ebook:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );

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
    const { title, author, description, category, language, visibility, downloadAllowed, coverUrl } = req.body;
    try {
      const updated = await prisma.ebook.update({
        where: { id: req.params.id },
        data: {
          ...(title && { title }),
          ...(author !== undefined && { author: author || null }),
          ...(description !== undefined && { description: description || null }),
          ...(category !== undefined && { category: category || null }),
          ...(language !== undefined && { language: language || null }),
          ...(coverUrl !== undefined && { coverUrl: coverUrl || null }),
          ...(visibility && { visibility }),
          ...(downloadAllowed !== undefined && { downloadAllowed: parseBoolean(downloadAllowed) }),
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "UPDATE", "EBOOK", updated.id,
        `E-book '${updated.title}' updated.`,
        req.ip, req.headers["user-agent"] || null, "SUCCESS"
      );
      const { fileName, ...meta } = updated;
      res.json(meta);
    } catch (err: any) {
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
      fs.promises.unlink(path.join(EBOOK_DIR, ebook.fileName)).catch(() => {});
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
      const ext = ebook.format.toUpperCase() === "EPUB" ? ".epub" : ".pdf";
      const safeName = (ebook.originalName || `${ebook.title}${ext}`).replace(/[^\w.\- ]+/g, "_");
      streamEbookFile(req, res, filePath, ebook.format, `attachment; filename="${safeName}"`);
    } catch (err) {
      logger.error("Error downloading ebook:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Database backups (admin) ─────────────────────────────────────────────────
  app.get("/api/backups", authMiddleware, requireRole("ADMIN"), async (_req, res) => {
    res.json({ backups: listBackups(), retention: BACKUP_RETENTION });
  });

  app.post("/api/backups/run", authMiddleware, requireRole("ADMIN"), async (req, res) => {
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

  app.get("/api/backups/:name/download", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    // Guard against path traversal — only allow our generated file names.
    const name = req.params.name;
    if (!/^mrlc-[\w.\-]+\.dump$/.test(name)) {
      res.status(400).json({ error: "Invalid backup name" });
      return;
    }
    const filePath = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Backup not found" });
      return;
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    fs.createReadStream(filePath).pipe(res);
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
    const { classId, month } = req.query as { classId?: string; month?: string };
    try {
      const where: any = {};
      if (classId && classId !== "all") where.classId = classId;
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

  // Fees report: per-student expected/paid/balance + totals
  app.get("/api/reports/fees", authMiddleware, reportRole(["ADMIN", "ACCOUNTANT"]), async (req, res) => {
    const { classId, status } = req.query as { classId?: string; status?: string };
    try {
      const fees = await prisma.feePayment.findMany({
        include: { student: { include: { user: true, class: true } } },
      });
      const profile = await prisma.schoolProfile.findFirst();

      const map = new Map<string, any>();
      for (const f of fees) {
        const s = f.student;
        if (classId && classId !== "all" && s.classId !== classId) continue;
        if (!map.has(s.id)) {
          map.set(s.id, { studentName: fullName(s.user), className: s.class?.name || "Unassigned", expected: 0, paid: 0 });
        }
        const row = map.get(s.id);
        row.expected += f.amount;
        if (f.status === "PAID") row.paid += f.amount;
      }

      let rows = Array.from(map.values()).map((r) => {
        const balance = Math.max(0, r.expected - r.paid);
        let st = "UNPAID";
        if (r.expected > 0 && r.paid >= r.expected) st = "PAID";
        else if (r.paid > 0) st = "PARTIAL";
        return { ...r, balance, status: st };
      }).sort((a, b) => a.studentName.localeCompare(b.studentName));

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
    const { classId } = req.query as { classId?: string };
    try {
      const where: any = {};
      if (classId && classId !== "all") where.classId = classId;
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
    const { classId } = req.query as { classId?: string };
    try {
      const where: any = {};
      if (classId && classId !== "all") where.classId = classId;
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
        academicYear: s.class?.academicYear || profile?.name ? s.class?.academicYear || "" : "",
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

  app.get("/api/student/exams", authMiddleware, studentOnly, async (req, res) => {
    try {
      const s = await getStudentForReq(req);
      if (!s) { res.status(404).json({ error: "Student profile not found" }); return; }
      const exams = s.classId
        ? await prisma.exam.findMany({
            where: { classId: s.classId },
            include: { subject: true, questions: true, attempts: { where: { studentId: s.id } } },
            orderBy: { date: "asc" },
          })
        : [];
      const available: any[] = [];
      const submitted: any[] = [];
      for (const e of exams) {
        const attempt = e.attempts[0];
        if (attempt && attempt.isCompleted) {
          submitted.push({
            id: e.id, title: e.title, subject: e.subject?.name || "General",
            submittedAt: (attempt.completedAt || attempt.startedAt)?.toISOString().slice(0, 16).replace("T", " "),
            status: attempt.score != null ? "Graded" : "Grading",
            score: attempt.score != null && e.totalMarks ? `${attempt.score}/${e.totalMarks}` : null,
          });
        } else {
          available.push({
            id: e.id, title: e.title, subject: e.subject?.name || "General",
            duration: e.durationMinutes ? `${e.durationMinutes} mins` : "—",
            questions: e.questions.length,
            deadline: e.date.toISOString().slice(0, 10),
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
        include: { exam: { include: { subject: true, attempts: true } } },
        orderBy: { completedAt: "desc" },
      });
      const results = attempts.map((a) => {
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
      const [att, attempts, fees, classmates] = await Promise.all([
        prisma.attendance.findMany({ where: { studentId: s.id } }),
        prisma.examAttempt.findMany({ where: { studentId: s.id, isCompleted: true }, include: { exam: { include: { subject: true } } }, orderBy: { completedAt: "desc" } }),
        prisma.feePayment.findMany({ where: { studentId: s.id } }),
        s.classId ? prisma.student.count({ where: { classId: s.classId } }) : Promise.resolve(0),
      ]);
      const present = att.filter((a) => a.status === "PRESENT").length;
      const attendanceRate = att.length ? round1((present / att.length) * 100) : 0;
      const graded = attempts.filter((a) => a.score != null);
      const examAverage = graded.length
        ? round1(graded.reduce((acc, a) => acc + ((a.score! / (a.exam.totalMarks || 100)) * 100), 0) / graded.length)
        : 0;
      const billed = fees.reduce((acc, f) => acc + f.amount, 0);
      const paid = fees.filter((f) => f.status === "PAID").reduce((acc, f) => acc + f.amount, 0);
      const upcoming = s.classId
        ? await prisma.exam.findMany({
            where: { classId: s.classId, date: { gte: new Date() } },
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
      });
    } catch (err) {
      logger.error("Error building student dashboard:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher portal API (scoped to the signed-in teacher; ADMIN sees all) ─────
  const teacherOnly = reportRole(["TEACHER", "ADMIN"]);
  const teacherClassIds = async (req: express.Request): Promise<string[]> => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role === "ADMIN") {
      const all = await prisma.class.findMany({ select: { id: true } });
      return all.map((c) => c.id);
    }
    const teacher = await prisma.teacher.findUnique({
      where: { userId: jwtUser.userId },
      include: { classes: true },
    });
    if (teacher) return teacher.classes.map((ct) => ct.classId);
    return [];
  };
  const canAccessTeacherClass = async (req: express.Request, classId: string) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role === "ADMIN") return true;
    const ids = await teacherClassIds(req);
    return ids.includes(classId);
  };
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
              user: true,
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
          totalStudents: c.students.length, academicYear: c.academicYear, status: "ACTIVE",
        },
        students: c.students.map((s) => {
          const present = s.attendances.filter((a) => a.status === "PRESENT").length;
          const att = s.attendances.length ? round1((present / s.attendances.length) * 100) : 0;
          const last = s.examAttempts[0];
          return {
            id: s.id, name: fullName(s.user), studentId: s.studentCode,
            attendance: `${att}%`,
            lastExam: last && last.score != null ? `${last.score}/${last.exam.totalMarks || 100}` : "—",
            status: s.status || "ACTIVE",
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
      const students = await prisma.student.findMany({
        where: { classId }, include: { user: true }, orderBy: { studentCode: "asc" },
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
        where: { classId: { in: ids } },
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
          status: examStatus(e.date, e.attempts),
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
        where: { classId: { in: ids }, date: { gte: new Date() } },
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
        classes: classes.map((c) => ({ id: c.id, name: c.name, level: c.level, room: c.room || "—", students: c.students.length, progress: 0 })),
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

  // ── Vite / Static serving ───────────────────────────────────────────────────
  // ── Scheduled daily backup (runs only when enabled in Settings) ───────────────
  const scheduleDailyBackup = () => {
    const HOUR = Number(process.env.BACKUP_HOUR || 2); // local hour, default 02:00
    const tick = async () => {
      try {
        const settings = await prisma.schoolProfile.findFirst({ select: { backupEnabled: true } });
        if (settings?.backupEnabled) {
          const backup = await runBackup();
          logger.info(`Scheduled backup created: ${backup.name}`);
          await createAuditLog(null, "system", "BACKUP", "SYSTEM", null,
            `Scheduled database backup created (${backup.name}).`, null, null, "SUCCESS").catch(() => {});
        }
      } catch (err: any) {
        logger.error("Scheduled backup failed:", err.message);
      }
    };
    const now = new Date();
    const next = new Date(now);
    next.setHours(HOUR, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(() => { tick(); setInterval(tick, 24 * 60 * 60 * 1000); }, delay);
    logger.info(`Daily backup scheduled for ${String(HOUR).padStart(2, "0")}:00 (when enabled in Settings).`);
  };
  scheduleDailyBackup();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api/")) {
        return next();
      }
      try {
        const fs = await import("fs");
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Don't fall back to the SPA shell for unmatched API routes — return JSON
      // so clients get a proper 404 instead of an HTML page with status 200.
      if (req.originalUrl.startsWith("/api/")) {
        res.status(404).json({ error: "Not found" });
        return;
      }
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

  const shutdown = async () => {
    logger.info("Shutting down server...");
    server.close(async () => {
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
