import express from "express";
import PDFDocument from "pdfkit";
import { drawPdfLogo, loadPdfLogo } from "./pdfBranding";

interface JwtPayload { userId: string; role: string; email: string; }

interface Deps {
  app: express.Express;
  prisma: any;
  authMiddleware: express.RequestHandler;
  createAuditLog: (
    userId: string | null, userName: string | null, action: string,
    entityType: string, entityId: string | null, description: string,
    ip: string | null, ua: string | null, severity?: string,
  ) => Promise<void>;
  logger: { error: (...a: any[]) => void };
}

const CONDUCT_ROLES = ["ADMIN", "TEACHER", "CASE_WORKER", "STAFF"];

const PAGE_LEFT = 50;
const PAGE_WIDTH = 495;

const severityLabel = (s: string) => (s === "SERIOUS" ? "Serious" : s === "MODERATE" ? "Moderate" : "Minor");
const severityColor = (s: string) => (s === "SERIOUS" ? "#dc2626" : s === "MODERATE" ? "#d97706" : "#475569");

function fullName(u?: { firstName?: string | null; lastName?: string | null } | null): string {
  return `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "Unknown";
}

function splitNote(note: string | null): { context: string | null; action: string | null } {
  if (!note) return { context: null, action: null };
  const marker = "\n\nRecommended action: ";
  const idx = note.indexOf(marker);
  if (idx === -1) return { context: note, action: null };
  const context = note.slice(0, idx).trim() || null;
  const action = note.slice(idx + marker.length).trim() || null;
  return { context, action };
}

function line(doc: PDFKit.PDFDocument, y: number, color = "#e2e8f0", width = 0.75) {
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_LEFT + PAGE_WIDTH, y).lineWidth(width).strokeColor(color).stroke();
  doc.strokeColor("#000000");
}

export function drawConductLetterhead(
  doc: PDFKit.PDFDocument,
  school: {
    name?: string | null;
    address?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  } | null,
  logo: Buffer | null,
): void {
  const headerTop = doc.y;
  const logoSize = 50;
  const sideSpace = logoSize + 14;
  const textLeft = PAGE_LEFT + sideSpace;
  const textWidth = PAGE_WIDTH - sideSpace * 2;

  drawPdfLogo(doc, logo, school?.name, PAGE_LEFT, headerTop, logoSize);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#000000")
    .text(school?.name || "School", textLeft, headerTop, { width: textWidth, align: "center" });
  if (school?.address) {
    doc.font("Helvetica").fontSize(8).fillColor("#64748b")
      .text(school.address, textLeft, doc.y + 2, { width: textWidth, align: "center" });
  }
  const contactBits = [school?.contactEmail, school?.contactPhone].filter(Boolean).join("  ·  ");
  if (contactBits) {
    doc.font("Helvetica").fontSize(8).fillColor("#64748b")
      .text(contactBits, textLeft, doc.y + 2, { width: textWidth, align: "center" });
  }

  doc.y = Math.max(doc.y, headerTop + logoSize) + 8;
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000")
    .text("STUDENT DISCIPLINARY NOTICE", PAGE_LEFT, doc.y, {
      width: PAGE_WIDTH,
      align: "center",
      characterSpacing: 1,
    });
  doc.moveDown(0.4);
  line(doc, doc.y, "#1e293b", 1.5);
  doc.moveDown(0.8);
}

export function registerConductPdfRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;
  const canManageConduct = (role: string) => CONDUCT_ROLES.includes(role);

  app.get("/api/conduct/violations/notice", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageConduct(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const idsParam = String(req.query.ids || "");
    const ids = Array.from(new Set(idsParam.split(",").map((s) => s.trim()).filter(Boolean)));
    if (ids.length === 0) { res.status(400).json({ error: "No violation ids provided" }); return; }
    if (ids.length > 50) { res.status(400).json({ error: "Too many records requested" }); return; }

    try {
      const violations = await prisma.ruleViolation.findMany({
        where: { id: { in: ids } },
        include: {
          rule: true,
          student: { include: { user: true, class: true } },
        },
        orderBy: { occurredAt: "asc" },
      });
      if (violations.length === 0) { res.status(404).json({ error: "No matching violation records found" }); return; }

      const studentId = violations[0].studentId;
      if (violations.some((v: any) => v.studentId !== studentId)) {
        res.status(400).json({ error: "All records on one notice must belong to the same student" });
        return;
      }
      const student = violations[0].student;
      if (!student) { res.status(404).json({ error: "Student record not found" }); return; }

      const [school, priorTotal, minorCount, moderateCount, seriousCount] = await Promise.all([
        prisma.schoolProfile.findFirst().catch(() => null),
        prisma.ruleViolation.count({ where: { studentId } }),
        prisma.ruleViolation.count({ where: { studentId, severity: "MINOR" } }),
        prisma.ruleViolation.count({ where: { studentId, severity: "MODERATE" } }),
        prisma.ruleViolation.count({ where: { studentId, severity: "SERIOUS" } }),
      ]);

      const worstSeverity = violations.some((v: any) => v.severity === "SERIOUS") ? "SERIOUS"
        : violations.some((v: any) => v.severity === "MODERATE") ? "MODERATE" : "MINOR";
      const { context: noteContext, action: recommendedAction } = splitNote(violations[0].note);
      const occurredAt = new Date(violations[0].occurredAt);
      const studentName = fullName(student.user);
      const logoBuffer = await loadPdfLogo(school?.logoUrl);

      const filename = `Disciplinary-Notice-${(student.studentCode || studentName).replace(/[^a-zA-Z0-9-]+/g, "-")}-${occurredAt.toISOString().slice(0, 10)}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      doc.pipe(res);

      drawConductLetterhead(doc, school, logoBuffer);

      const infoTop = doc.y;
      const colWidth = PAGE_WIDTH / 2;
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text("STUDENT", PAGE_LEFT, infoTop);
      doc.font("Helvetica").fontSize(11).fillColor("#000000").text(studentName, PAGE_LEFT, infoTop + 12);
      doc.font("Helvetica").fontSize(9).fillColor("#475569").text(
        `${student.studentCode || "—"}${student.class?.name ? `  ·  ${student.class.name}` : ""}`,
        PAGE_LEFT, infoTop + 28,
      );

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text("DATE OF INCIDENT", PAGE_LEFT + colWidth, infoTop);
      doc.font("Helvetica").fontSize(11).fillColor("#000000").text(
        occurredAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        PAGE_LEFT + colWidth, infoTop + 12,
      );
      doc.font("Helvetica").fontSize(9).fillColor("#475569").text(`Notice issued by ${violations[0].reportedByName}`, PAGE_LEFT + colWidth, infoTop + 28);

      doc.fillColor("#000000");
      doc.y = infoTop + 48;
      line(doc, doc.y);
      doc.moveDown(0.8);

      doc.font("Helvetica-Bold").fontSize(9).fillColor(severityColor(worstSeverity))
        .text(`Severity tier: ${severityLabel(worstSeverity)}`, PAGE_LEFT, doc.y);
      doc.font("Helvetica").fontSize(9).fillColor("#475569").text(
        `Per the handbook's Minor → Moderate → Serious escalation framework (Article 8). ` +
        `This student now has ${priorTotal} recorded violation${priorTotal === 1 ? "" : "s"} on file ` +
        `(${minorCount} minor, ${moderateCount} moderate, ${seriousCount} serious), including this notice.`,
        PAGE_LEFT, doc.y + 14, { width: PAGE_WIDTH },
      );
      doc.fillColor("#000000");
      doc.moveDown(1.2);

      doc.font("Helvetica-Bold").fontSize(10).text(`Rule${violations.length === 1 ? "" : "s"} Broken (${violations.length})`, PAGE_LEFT, doc.y);
      doc.moveDown(0.4);
      for (const v of violations) {
        const startY = doc.y;
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000")
          .text(`${v.rule?.code ?? "—"} — ${v.rule?.title ?? "Untitled rule"}`, PAGE_LEFT, startY, { width: PAGE_WIDTH - 70 });
        doc.font("Helvetica-Bold").fontSize(8).fillColor(severityColor(v.severity))
          .text(severityLabel(v.severity), PAGE_LEFT + PAGE_WIDTH - 60, startY, { width: 60, align: "right" });
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text(v.rule?.article ?? "", PAGE_LEFT, doc.y);
        if (v.rule?.description) {
          doc.font("Helvetica").fontSize(8.5).fillColor("#475569").text(v.rule.description, PAGE_LEFT, doc.y + 2, { width: PAGE_WIDTH });
        }
        doc.fillColor("#000000");
        doc.moveDown(0.6);
      }

      doc.moveDown(0.2);
      line(doc, doc.y);
      doc.moveDown(0.8);

      doc.font("Helvetica-Bold").fontSize(9).text("Incident Notes", PAGE_LEFT, doc.y);
      doc.font("Helvetica").fontSize(9).fillColor("#475569")
        .text(noteContext || "No additional notes recorded.", PAGE_LEFT, doc.y + 4, { width: PAGE_WIDTH });
      doc.fillColor("#000000").moveDown(0.8);

      doc.font("Helvetica-Bold").fontSize(9).text("Recommended Action / Consequence", PAGE_LEFT, doc.y);
      doc.font("Helvetica").fontSize(9).fillColor("#475569")
        .text(recommendedAction || "No action recorded yet.", PAGE_LEFT, doc.y + 4, { width: PAGE_WIDTH });
      doc.fillColor("#000000").moveDown(1.4);

      const ensureSignatureSpace = () => {
        if (doc.y > doc.page.height - 170) doc.addPage();
      };
      ensureSignatureSpace();
      doc.font("Helvetica-Bold").fontSize(9).text("Acknowledgement", PAGE_LEFT, doc.y);
      doc.moveDown(1.6);

      const sigRows: Array<[string, string]> = [
        ["Teacher / Staff Signature", violations[0].reportedByName],
        ["Student Signature", studentName],
        ["Parent / Guardian Signature", student.guardianName || ""],
      ];
      for (const [label, prefill] of sigRows) {
        const y = doc.y;
        line(doc, y + 14, "#94a3b8");
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text(label, PAGE_LEFT, y + 17);
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text("Date", PAGE_LEFT + 330, y + 17);
        if (prefill) doc.font("Helvetica").fontSize(9).fillColor("#334155").text(prefill, PAGE_LEFT, y);
        doc.fillColor("#000000");
        doc.y = y + 40;
      }

      doc.font("Helvetica").fontSize(7).fillColor("#94a3b8").text(
        `This is an official disciplinary record generated on ${new Date().toLocaleString("en-US")}.`,
        PAGE_LEFT, doc.page.height - 60, { width: PAGE_WIDTH, align: "center" },
      );

      doc.end();

      createAuditLog(jwtUser.userId, jwtUser.email, "EXPORT", "RULE_VIOLATION", violations[0].id,
        `Disciplinary notice PDF generated for ${studentName} (${student.studentCode}) — ${violations.length} rule(s).`,
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
        (req.headers["user-agent"] as string) || null, "INFO").catch(() => {});
    } catch (err) {
      logger.error("Error generating disciplinary notice PDF:", err);
      if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
