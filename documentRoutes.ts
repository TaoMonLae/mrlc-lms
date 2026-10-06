// Extracted from server.ts. Route order is preserved: registerDocumentRoutes is called where these routes used to be registered.
import type { Express, Request, Response, NextFunction } from "express";
import type { PrismaClient, Role } from "@prisma/client";
import { inferStudentCardExpiry } from "./shared/studentCardValidity";
import crypto from "crypto";
import express from "express";
import { loadPdfLogo } from "./pdfBranding";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import QRCode from "qrcode";
import { renderStudentCardPdf } from "./studentCardPdf";
import type { JwtPayload, PROFILE_PHOTO_DIR, authMiddleware, createAuditLog, logger, requirePermission } from "./server";

export type DocumentRoutesContext = {
  PROFILE_PHOTO_DIR: typeof PROFILE_PHOTO_DIR;
  WARNING_THRESHOLD: 60;
  authMiddleware: typeof authMiddleware;
  buildStudentProgress: (studentId: string, viewer?: JwtPayload) => Promise<{ student: { id: string; name: string; code: string; className: string; }; subjects: { subjectId: string; name: string; categoryAverages: Record<string, number>; average: number; letter: string; warning: boolean; }[]; termAverage: number; letter: string; warnings: string[]; trend: { date: any; title: any; category: any; percent: number; }[]; comments: { item: any; subject: any; comment: any; }[]; weights: Record<string, number>; gedReadiness: { subject: "RLA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES"; status: any; note: any; updatedAt: any; examAverage: number; attemptCount: number; }[]; }>;
  canAccessTeacherClass: (req: Request, classId: string) => Promise<boolean>;
  createAuditLog: typeof createAuditLog;
  fullName: (u?: { firstName?: string; lastName?: string; }) => string;
  getStudentForReq: (req: Request) => Promise<{ class: { id: string; status: string; createdAt: Date; updatedAt: Date; name: string; academicYear: string; description: string; level: string; room: string; capacity: number; }; user: { id: string; createdAt: Date; updatedAt: Date; cursorEffect: string; profilePhotoUrl: string; email: string; username: string; passwordHash: string; firstName: string; lastName: string; role: Role; isActive: boolean; isExternalLearner: boolean; mustChangePassword: boolean; lastLoginAt: Date; mfaEnabled: boolean; mfaSecretEncrypted: string; mfaRecoveryCodeHashes: string[]; mfaEnrolledAt: Date; languageQuestAvatar: string; languageQuestBio: string; }; } & { id: string; status: string; classId: string; createdAt: Date; updatedAt: Date; address: string; userId: string; studentCode: string; preferredName: string; dateOfBirth: Date; enrollmentDate: Date; guardianName: string; guardianRelationship: string; guardianPhone: string; guardianEmail: string; contactNumber: string; country: string; identityType: string; identityNumber: string; legalDocumentationStatus: string; emergencyContact: string; emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelationship: string; previousSchool: string; previousEducationLevel: string; educationLevel: string; medicalInformation: string; allergies: string; notes: string; gender: string; profilePhotoUrl: string; boardingType: string; studentCouncilRole: string; }>;
  getTeacherClassIds: (userId: string) => Promise<string[]>;
  logger: typeof logger;
  prisma: PrismaClient;
  reportRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
  requirePermission: typeof requirePermission;
  round1: (n: number) => number;
  studentOnly: (req: Request, res: Response, next: NextFunction) => void;
};

export function registerDocumentRoutes(app: Express, ctx: DocumentRoutesContext) {
  const { PROFILE_PHOTO_DIR, WARNING_THRESHOLD, authMiddleware, buildStudentProgress, canAccessTeacherClass, createAuditLog, fullName, getStudentForReq, getTeacherClassIds, logger, prisma, reportRole, requirePermission, round1, studentOnly } = ctx;

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
}
