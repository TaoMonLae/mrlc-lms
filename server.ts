import { buildPasswordResetEmail } from "./lib/emailTemplates";
import { deliverOutboxMessage } from "./lib/emailDelivery";
import { asyncHandler } from "./lib/asyncHandler";
import { registerSeoRoutes, renderSeoHtml } from "./lib/seo";
import { getSeoMetadata } from "./shared/seo";
import { accountStillMatchesToken, consumeRecoveryCode } from "./lib/sessionAccess";
import { announcementAudienceWhere } from "./lib/announcementAudience";
import { notificationService, syncTeacherAppUpdates, type NotificationInput } from "./lib/notifications";
import { registerNotificationRoutes } from "./notificationRoutes";
import { saveStudioQuestions } from "./shared/examStudioPersistence";
import { correctionData, scoreWithCorrectedKey } from "./shared/examAnswerKey";
import { buildExamReviewQuestions } from "./shared/examReview";
import { examAvailability, teacherExamStatus } from "./shared/examAvailability";
import { collectSchoolFee, syncDonationCampaign, financeTransaction, reviewExpense, recordExpensePayment } from './lib/financeOperations';
import { FinanceControlError, validateMoney } from './shared/financeControls';
import {
  DUTY_EXPENSE_CATEGORIES,
  dutyExpenseIsNotFuture,
  dutyExpenseMatchesAssignmentDate,
  dutyExpenseRosterEligible,
  dutyExpenseAssignmentEligible,
  isBoardingStudent,
} from './shared/dutyExpenses';
import { dutyDateIsWithinRoster } from './shared/cookingDutyBoard';
import { STUDENT_COUNCIL_ROLES, parseStudentCouncilRole } from './shared/studentCouncil';
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
import { PrismaClient, type Prisma, type Role } from "@prisma/client";
import dotenv from "dotenv";
import { spawn } from "child_process";
import { ZipArchive } from "archiver";
import JSZip from "jszip";
import sharp from "sharp";
import { registerExamPhase2Routes } from "./examPhase2";
import { registerClassworkRoutes } from "./classworkRoutes";
import { registerFocusRoutes } from "./focusRoutes";
import { pgDumpConnection } from "./lib/pgDumpConnection";
import { registerVideoLearningRoutes, canReadVideo } from "./videoLearningRoutes";
import { registerFinanceRoutes } from "./financeRoutes";
import { registerDocumentRoutes } from "./documentRoutes";
import { registerVolunteerDocumentRoutes } from "./volunteerDocumentRoutes";
import { registerReportRoutes } from "./reportRoutes";
import { registerElibraryRoutes } from "./elibraryRoutes";
import { registerHrRoutes } from "./hrRoutes";
import { registerFinancialReportRoutes } from "./financialReportRoutes";
import { registerDutyRoutes } from "./dutyRoutes";
import { registerFamilyRoutes } from "./familyRoutes";
import { isGuardianApiRequestAllowed } from "./shared/familyAccess";
import { composeQuestionSet, registerExamBankRoutes } from "./examBank";
import { registerNewsRoutes } from "./news";
import { registerPayrollPdfRoutes } from "./payrollPdf";
import { registerFeesPdfRoutes } from "./feesPdf";
import { registerFlashcardRoutes } from "./flashcards";
import { registerConductRoutes } from "./conduct";
import { registerConductPdfRoutes } from "./conductPdf";
import { loadPdfLogo } from "./pdfBranding";
import { renderStudentCardPdf } from "./studentCardPdf";
import { canChangeProfilePhoto } from './shared/profilePhotoPolicy';
import { isValidVideoSourceUrl, normalizeVideoSourceUrl } from './shared/videoSource';
import {
  PERSONNEL_CARD_RASTER_HEIGHT_PX,
  PERSONNEL_CARD_RASTER_WIDTH_PX,
  renderPersonnelCardPdf,
} from "./personnelCardPdf";
import { registerDictionaryRoutes } from "./dictionary";
import { registerGutenbergRoutes } from "./gutenberg";
import { registerSnakeGameRoutes } from "./snakeGame";
import { registerNeonSnakeServer } from "./neonSnakeServer";
import { registerCheckersGameRoutes } from "./checkersGame";
import { registerChessGameRoutes } from "./chessGame";
import { registerPacmanGameRoutes } from "./pacmanGame";
import { registerEvidenceDetectiveRoutes } from "./evidenceDetective";
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
  HOMEWORK_SUBMISSION_FILE_LIMIT,
  HOMEWORK_MEDIA_URL,
  homeworkMediaOwnerId,
  isAllowedHomeworkFile,
  parseHomeworkMediaUrl,
  parseHomeworkSubmissionAttachments,
  validateHomeworkFile,
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
import { cleanEboo…172152 tokens truncated…: "Forbidden" }); return; }
    const { studentId, score, feedback, status } = req.body || {};
    if (!studentId) { res.status(400).json({ error: "studentId is required" }); return; }
    if (status !== "MARKED" && status !== "REDO") { res.status(400).json({ error: "Invalid marking status" }); return; }
    const newStatus = status;
    try {
      const homework = await hw().findUnique({ where: { id: req.params.id } });
      if (!homework) { res.status(404).json({ error: "Homework not found" }); return; }
      if (!(await canManageHomework(jwtUser, homework))) { res.status(403).json({ error: "Only the homework owner or admin can manage this assignment" }); return; }
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
      if (!(await canManageHomework(jwtUser, homework))) { res.status(403).json({ error: "Only the homework owner or admin can manage this assignment" }); return; }
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

  // API misses must return JSON before Vite/static SPA fallback can serve HTML.
  app.use("/api", (_req, res) => { res.status(404).json({ error: "Not found" }); });

  // ── SPA fallback — registered AFTER every /api route so it never shadows one ──
  if (!isProduction) {
    // Keep the development server out of the production dependency/runtime path.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      // Our handler must inject route metadata before HTML is sent. Vite's
      // default SPA handler would respond before the fallback below runs.
      appType: "custom",
    });
    const serveDevHtml = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const url = req.originalUrl;
      if (url.startsWith("/api/")) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      try {
        const fs = await import("fs");
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({
          "Content-Type": "text/html",
          "Cache-Control": "no-cache",
          "X-Robots-Tag": getSeoMetadata(req.path, APP_URL).robots,
        }).end(renderSeoHtml(template, req.path, APP_URL));
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    };
    // A browser navigation to an app route (e.g. /flashcards) must get the SPA
    // shell. Without this, Vite resolves the URL to a same-named root module
    // (flashcards.ts) and returns server source instead of the page.
    app.use((req, res, next) => {
      const accept = String(req.headers.accept || "");
      if (
        req.method === "GET" &&
        accept.includes("text/html") &&
        !path.extname(req.path) &&
        !/^\/(@|src\/|node_modules\/)/.test(req.path)
      ) {
        void serveDevHtml(req, res, next);
        return;
      }
      next();
    });
    app.use(vite.middlewares);
    app.get("*", serveDevHtml);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const distAssetsPath = path.join(distPath, "assets");
    const htmlTemplate = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");

    // Vite fingerprints everything in /assets, so these files can safely stay in
    // browser and CDN caches for a year. Public files keep a short cache window
    // because their filenames are stable and can change between deployments.
    app.use("/assets", express.static(distAssetsPath, {
      maxAge: "1y",
      immutable: true,
    }));
    // Server bundles live beside the browser build for PM2 compatibility.
    // They (and private lazy chunks) must never be served as public assets.
    app.use((req, res, next) => {
      let pathname: string;
      try { pathname = decodeURIComponent(req.path); }
      catch { res.sendStatus(400); return; }
      if (/\.cjs(?:\.map)?$/i.test(pathname) || pathname.split("/").some(part => part === ".server")) {
        res.sendStatus(404); return;
      }
      next();
    });
    app.use(express.static(distPath, {
      // The root document must go through the SEO handler, too.
      index: false,
      maxAge: "1d",
      setHeaders: (res, filePath) => {
        const filename = path.basename(filePath);
        // Standalone utility HTML, including the offline page, is not a public
        // search landing page. The SPA document is rendered below instead.
        if (filename.endsWith(".html")) res.setHeader("X-Robots-Tag", "noindex, nofollow");
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
      res.setHeader("X-Robots-Tag", getSeoMetadata(req.path, APP_URL).robots);
      res.type("html").send(renderSeoHtml(htmlTemplate, req.path, APP_URL));
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
      logger.error(err?.stack || err);
      if (res.headersSent) { next(err); return; }
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
  let releaseSyncRunning = false;
  const syncReleaseMailingList = async () => {
    if (releaseSyncRunning) return;
    releaseSyncRunning = true;
    try { await syncTeacherAppUpdates(prisma, APP_URL); }
    catch (error) { logger.error("Teacher app-update notifications failed:", error); }
    finally { releaseSyncRunning = false; }
  };
  void syncReleaseMailingList();
  const releaseWorker = setInterval(() => void syncReleaseMailingList(), 5 * 60_000);
  releaseWorker.unref();
  const emailWorker = setInterval(() => void processEmailOutbox(), 30_000);
  if (typeof (emailWorker as any).unref === "function") (emailWorker as any).unref();

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return; // ignore repeated Ctrl+C
    shuttingDown = true;
    logger.info("Shutting down server...");
    clearInterval(emailWorker);
    clearInterval(releaseWorker);
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
