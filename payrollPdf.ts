import express from "express";
import PDFDocument from "pdfkit";
import { drawPdfLogo, loadPdfLogo } from "./pdfBranding";

interface JwtPayload { userId: string; role: string; email: string; }

interface Deps {
  app: express.Express;
  prisma: any;
  authMiddleware: express.RequestHandler;
  payrollCanManage: (role: string) => boolean;
  createAuditLog: (
    userId: string | null, userName: string | null, action: string,
    entityType: string, entityId: string | null, description: string,
    ip: string | null, ua: string | null, severity?: string,
  ) => Promise<void>;
  logger: { error: (...a: any[]) => void };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function money(amount: number, currency?: string | null): string {
  const code = (currency || "USD").toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function payeeName(p: any): string {
  if (p.employee) return `${p.employee.firstName} ${p.employee.lastName}`;
  if (p.teacher) return `${p.teacher.user?.firstName ?? ""} ${p.teacher.user?.lastName ?? ""}`.trim() || p.teacher.teacherCode;
  return "—";
}

const COLS = [
  { key: "n", label: "#", width: 24, align: "left" as const },
  { key: "name", label: "Payee", width: 150, align: "left" as const },
  { key: "type", label: "Type", width: 55, align: "left" as const },
  { key: "base", label: "Base", width: 66, align: "right" as const },
  { key: "allow", label: "Allowances", width: 66, align: "right" as const },
  { key: "deduct", label: "Deductions", width: 66, align: "right" as const },
  { key: "net", label: "Net Pay", width: 68, align: "right" as const },
];
const TABLE_LEFT = 50;
const TABLE_WIDTH = COLS.reduce((s, c) => s + c.width, 0);

function colX(index: number): number {
  return TABLE_LEFT + COLS.slice(0, index).reduce((s, c) => s + c.width, 0);
}

export function registerPayrollPdfRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, payrollCanManage, createAuditLog, logger } = deps;

  app.get("/api/payroll-runs/:id/pdf", authMiddleware, async (req, res) => {
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

      const school = await prisma.schoolProfile.findFirst().catch(() => null);
      const slips = run.payslips ?? [];
      const logoBuffer = await loadPdfLogo(school?.logoUrl);
      const currency = slips[0]?.currency || "USD";
      const totals = slips.reduce(
        (acc: any, p: any) => ({
          base: acc.base + p.baseSalary,
          allow: acc.allow + p.allowances,
          deduct: acc.deduct + p.deductions,
          net: acc.net + p.netPay,
        }),
        { base: 0, allow: 0, deduct: 0, net: 0 },
      );

      const filename = `Payroll-${MONTHS[run.periodMonth - 1]}-${run.periodYear}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      doc.pipe(res);

      const headerTop = doc.y;
      const logoSize = 44;
      const sideSpace = logoSize + 12;
      const headerTextLeft = TABLE_LEFT + sideSpace;
      const headerTextWidth = TABLE_WIDTH - sideSpace * 2;
      drawPdfLogo(doc, logoBuffer, school?.name, TABLE_LEFT, headerTop, logoSize);
      doc.font("Helvetica-Bold").fontSize(16)
        .text(school?.name || "School", headerTextLeft, headerTop, { width: headerTextWidth, align: "center" });
      doc.font("Helvetica-Bold").fontSize(10)
        .text("PAYROLL REGISTER", headerTextLeft, doc.y + 2, { width: headerTextWidth, align: "center", characterSpacing: 1 });
      doc.font("Helvetica").fontSize(9).fillColor("#555555")
        .text(
          `${MONTHS[run.periodMonth - 1]} ${run.periodYear}  ·  ${run.status}  ·  ${slips.length} payslip${slips.length === 1 ? "" : "s"}`,
          headerTextLeft,
          doc.y + 2,
          { width: headerTextWidth, align: "center" },
        );
      doc.fillColor("#000000");
      doc.y = Math.max(doc.y, headerTop + logoSize) + 10;
      doc.moveTo(TABLE_LEFT, doc.y).lineTo(TABLE_LEFT + TABLE_WIDTH, doc.y).lineWidth(1.5).strokeColor("#1e293b").stroke();
      doc.moveDown(0.8);

      const rowHeight = 20;
      const headerHeight = 18;
      let y = doc.y;

      const drawTableHeader = () => {
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b");
        COLS.forEach((col, i) => {
          doc.text(col.label.toUpperCase(), colX(i), y, { width: col.width, align: col.align });
        });
        y += headerHeight;
        doc.moveTo(TABLE_LEFT, y - 4).lineTo(TABLE_LEFT + TABLE_WIDTH, y - 4).lineWidth(0.75).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#000000");
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > doc.page.height - 90) {
          doc.addPage();
          y = 50;
          drawTableHeader();
        }
      };

      drawTableHeader();

      doc.font("Helvetica").fontSize(9);
      slips.forEach((p: any, i: number) => {
        ensureSpace(rowHeight);
        const row = [
          String(i + 1),
          payeeName(p),
          p.teacher ? "Teacher" : "Staff",
          money(p.baseSalary, p.currency),
          money(p.allowances, p.currency),
          money(p.deductions, p.currency),
          money(p.netPay, p.currency),
        ];
        row.forEach((text, ci) => {
          doc.text(text, colX(ci), y, { width: COLS[ci].width, align: COLS[ci].align });
        });
        y += rowHeight;
        doc.moveTo(TABLE_LEFT, y - 4).lineTo(TABLE_LEFT + TABLE_WIDTH, y - 4).lineWidth(0.5).strokeColor("#f1f5f9").stroke();
      });

      ensureSpace(rowHeight + 10);
      doc.moveTo(TABLE_LEFT, y).lineTo(TABLE_LEFT + TABLE_WIDTH, y).lineWidth(1.5).strokeColor("#1e293b").stroke();
      y += 6;
      doc.font("Helvetica-Bold").fontSize(9);
      doc.text("Total", colX(0), y, { width: COLS[0].width + COLS[1].width + COLS[2].width, align: "left" });
      doc.text(money(totals.base, currency), colX(3), y, { width: COLS[3].width, align: "right" });
      doc.text(money(totals.allow, currency), colX(4), y, { width: COLS[4].width, align: "right" });
      doc.text(money(totals.deduct, currency), colX(5), y, { width: COLS[5].width, align: "right" });
      doc.text(money(totals.net, currency), colX(6), y, { width: COLS[6].width, align: "right" });

      doc.font("Helvetica").fontSize(7).fillColor("#94a3b8")
        .text("This is a computer-generated payroll register.", TABLE_LEFT, doc.page.height - 60, { width: TABLE_WIDTH, align: "center" });

      doc.end();

      createAuditLog(jwtUser.userId, jwtUser.email, "EXPORT", "PAYROLL_RUN", run.id,
        `Payroll register PDF exported for ${MONTHS[run.periodMonth - 1]} ${run.periodYear}.`,
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
        (req.headers["user-agent"] as string) || null, "INFO").catch(() => {});
    } catch (err) {
      logger.error("Error generating payroll PDF:", err);
      if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
