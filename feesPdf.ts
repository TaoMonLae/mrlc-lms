import express from "express";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { format as formatDate } from "date-fns";
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

const PAGE_LEFT = 50;
const PAGE_WIDTH = 495; // A4 usable width at 50pt margins

// Mirrors the client's formatMoney() (src/lib/locale.ts), which uses
// narrowSymbol so MYR renders as "RM 300.00" instead of "MYR 300.00". This
// previously omitted currencyDisplay, so the PDF and the on-screen receipt
// disagreed on every amount.
function money(amount: number, currency?: string | null): string {
  const code = (currency || "MYR").toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function line(doc: PDFKit.PDFDocument, y: number, color = "#e2e8f0", width = 0.75) {
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_LEFT + PAGE_WIDTH, y).lineWidth(width).strokeColor(color).stroke();
  doc.strokeColor("#000000");
}

export function registerFeesPdfRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;

  // Real, downloadable PDF for a single fee receipt. Mirrors the on-screen
  // /fees/:id/receipt page (PaymentReceipt.tsx) — that page's "Download PDF"
  // button previously just called window.print() (identical to its own Print
  // button), so nothing was ever actually saved as a file; this gives it a
  // real file to fetch and download, same pattern as the payroll register
  // and the conduct disciplinary notice.
  app.get("/api/fees/:id/receipt.pdf", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { id } = req.params;
    try {
      const fee = await prisma.feePayment.findUnique({
        where: { id },
        include: { student: { include: { user: true, class: true } } },
      });
      if (!fee) { res.status(404).json({ error: "Fee receipt not found" }); return; }

      if (jwtUser.role === "STUDENT") {
        const student = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!student || fee.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }
      } else if (!["ADMIN", "ACCOUNTANT", "STAFF"].includes(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const school = await prisma.schoolProfile.findFirst().catch(() => null);
      const currency = fee.currency || school?.currency || "MYR";
      const studentName = `${fee.student?.user?.firstName ?? ""} ${fee.student?.user?.lastName ?? ""}`.trim() || "Unknown";
      const discount = fee.discountAmount || 0;
      const gross = (fee.amount || 0) + discount;
      const isWaived = fee.status === "WAIVED";
      const paidAmount = isWaived ? 0 : (fee.paidAmount ?? (fee.status === "PAID" ? fee.amount : 0));
      const balance = isWaived ? 0 : Math.max(0, (fee.amount || 0) - paidAmount);
      const paymentDate = new Date(fee.paidDate || fee.createdAt);
      const verifyUrl = `${req.protocol}://${req.get("host")}/verify/payment/${fee.id}`;

      let qrBuffer: Buffer | null = null;
      try { qrBuffer = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 200 }); } catch { qrBuffer = null; }
      const logoBuffer = await loadPdfLogo(school?.logoUrl);

      const filename = `Receipt-${fee.receiptNumber || fee.id}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      doc.pipe(res);

      // ── Letterhead ──────────────────────────────────────────────────────
      const headerTop = doc.y;
      const LOGO_SIZE = 44;
      const LOGO_GAP = 12;
      const textLeft = PAGE_LEFT + LOGO_SIZE + LOGO_GAP;
      const textWidth = 300 - LOGO_SIZE - LOGO_GAP;

      drawPdfLogo(doc, logoBuffer, school?.name, PAGE_LEFT, headerTop, LOGO_SIZE);

      doc.font("Helvetica-Bold").fontSize(16).fillColor("#000000").text(school?.name || "School", textLeft, headerTop, { width: textWidth });
      if (school?.address) doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(school.address, textLeft, doc.y + 2, { width: textWidth });
      const contactBits = [school?.contactPhone ? `Phone: ${school.contactPhone}` : "", school?.contactEmail ? `Email: ${school.contactEmail}` : ""]
        .filter(Boolean).join("   ");
      if (contactBits) doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(contactBits, textLeft, doc.y + 2, { width: textWidth });

      doc.font("Helvetica-Bold").fontSize(26).fillColor("#cbd5e1").text("RECEIPT", PAGE_LEFT, headerTop, { width: PAGE_WIDTH, align: "right", characterSpacing: 1.5 });
      doc.font("Helvetica").fontSize(9).fillColor("#475569")
        // Match the web receipt's date-fns 'dd MMM yyyy' format exactly (e.g.
        // "22 Jul 2026") -- toLocaleDateString('en-US', ...) ignores the
        // requested field order and always renders "Jul 22, 2026" instead.
        .text(`No: ${fee.receiptNumber || "—"}`, PAGE_LEFT, headerTop + 34, { width: PAGE_WIDTH, align: "right" })
        .text(`Date: ${formatDate(paymentDate, "dd MMM yyyy")}`, PAGE_LEFT, doc.y, { width: PAGE_WIDTH, align: "right" });
      // Status pill — matches the web receipt's Badge colors per status
      // (statusColor map in PaymentReceipt.tsx) instead of plain text.
      const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
        PAID: { bg: "#d1fae5", fg: "#065f46" },
        PARTIAL: { bg: "#fef3c7", fg: "#92400e" },
        PENDING: { bg: "#fef3c7", fg: "#92400e" },
        OVERDUE: { bg: "#fee2e2", fg: "#991b1b" },
        WAIVED: { bg: "#f1f5f9", fg: "#475569" },
      };
      const statusText = isWaived ? "VOIDED" : String(fee.status);
      const statusColors = STATUS_COLORS[isWaived ? "WAIVED" : fee.status] || { bg: "#e2e8f0", fg: "#334155" };
      doc.font("Helvetica-Bold").fontSize(8);
      const badgeTextW = doc.widthOfString(statusText);
      const badgeW = badgeTextW + 16;
      const badgeH = 14;
      const badgeX = PAGE_LEFT + PAGE_WIDTH - badgeW;
      const badgeY = doc.y + 4;
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2).fill(statusColors.bg);
      doc.fillColor(statusColors.fg).text(statusText, badgeX, badgeY + 3.5, { width: badgeW, align: "center" });
      doc.fillColor("#000000");
      doc.y = badgeY + badgeH;

      doc.y = Math.max(doc.y, headerTop + 70) + 10;
      line(doc, doc.y, "#1e293b", 1.25);
      doc.moveDown(1);

      if (isWaived) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569")
          .text("THIS PAYMENT HAS BEEN VOIDED.", PAGE_LEFT, doc.y, { width: PAGE_WIDTH });
        doc.fillColor("#000000").moveDown(1);
      }

      // ── Student info ────────────────────────────────────────────────────
      // Filled light-gray card (bg-slate-50 on the web) rather than just an
      // outline — drawn first so the text below renders on top of it.
      const infoTop = doc.y;
      const infoBoxHeight = 62;
      doc.roundedRect(PAGE_LEFT, infoTop, PAGE_WIDTH, infoBoxHeight, 6).fill("#f8fafc");

      const infoPadTop = infoTop + 14;
      const colWidth = PAGE_WIDTH / 2;
      doc.font("Helvetica").fontSize(8).fillColor("#64748b").text("RECEIVED FROM", PAGE_LEFT + 14, infoPadTop);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000").text(studentName, PAGE_LEFT + 14, infoPadTop + 12, { width: colWidth - 24 });

      doc.font("Helvetica").fontSize(8).fillColor("#64748b").text("STUDENT DETAILS", PAGE_LEFT + colWidth, infoPadTop, { width: colWidth - 14, align: "right" });
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
        .text(fee.student?.studentCode || "—", PAGE_LEFT + colWidth, infoPadTop + 12, { width: colWidth - 14, align: "right" });
      doc.font("Helvetica").fontSize(9).fillColor("#475569")
        .text(fee.student?.class?.name || "—", PAGE_LEFT + colWidth, doc.y, { width: colWidth - 14, align: "right" });

      doc.fillColor("#000000");
      doc.y = infoTop + infoBoxHeight;
      doc.moveDown(1.4);

      // ── Payment details table ─────────────────────────────────────────
      const rowH = 20;
      let y = doc.y;
      const descX = PAGE_LEFT + 8;
      const amtW = 110;
      const amtX = PAGE_LEFT + PAGE_WIDTH - amtW - 8;

      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, rowH).fill("#f1f5f9");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#334155")
        .text("DESCRIPTION", descX, y + 6)
        .text("AMOUNT", amtX, y + 6, { width: amtW, align: "right" });
      doc.fillColor("#000000");
      y += rowH;

      const tableRow = (label: string, value: string, opts: { bold?: boolean; color?: string; muted?: boolean } = {}) => {
        doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.bold ? 10 : 9)
          .fillColor(opts.color || (opts.muted ? "#64748b" : "#000000"))
          .text(label, descX, y + 5, { width: PAGE_WIDTH - amtW - 16 })
          .text(value, amtX, y + 5, { width: amtW, align: "right" });
        doc.fillColor("#000000");
        y += rowH;
        line(doc, y, "#f1f5f9");
      };

      tableRow(fee.description || "Fee Payment", money(gross, currency));
      if (discount > 0) tableRow("Discount", `-${money(discount, currency)}`, { color: "#059669" });
      tableRow("Amount Due", money(fee.amount || 0, currency), { muted: true });
      tableRow("Amount Paid", money(paidAmount, currency), { muted: true });

      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, rowH + 6).fill("#f8fafc");
      doc.font("Helvetica-Bold").fontSize(11).fillColor(balance > 0 ? "#dc2626" : "#000000")
        .text(balance > 0 ? "Balance Due" : "Total Paid", descX, y + 8, { width: PAGE_WIDTH - amtW - 16, align: "right" })
        .text(money(balance > 0 ? balance : paidAmount, currency), amtX, y + 8, { width: amtW, align: "right" });
      doc.fillColor("#000000");
      y += rowH + 6;
      doc.y = y;
      doc.moveDown(1.6);

      // ── Payment info + QR + signature ──────────────────────────────────
      const ensureSpace = (needed: number) => { if (doc.y + needed > doc.page.height - 90) doc.addPage(); };
      ensureSpace(120);
      const footTop = doc.y;
      doc.font("Helvetica-Bold").fontSize(9).text("Payment Info", PAGE_LEFT, footTop);
      doc.font("Helvetica").fontSize(9).fillColor("#475569")
        .text(`Method: ${(fee.paymentMethod || "CASH").replace("_", " ")}`, PAGE_LEFT, footTop + 14, { width: 260 });
      if (fee.notes) {
        doc.font("Helvetica").fontSize(9).fillColor("#475569").text(`Remarks: ${fee.notes}`, PAGE_LEFT, doc.y + 2, { width: 260 });
      }
      doc.fillColor("#000000");

      const sigX = PAGE_LEFT + PAGE_WIDTH - 180;
      const qrX = PAGE_LEFT + PAGE_WIDTH - 280;
      if (qrBuffer) {
        doc.image(qrBuffer, qrX, footTop, { width: 70, height: 70 });
        doc.font("Helvetica").fontSize(6.5).fillColor("#94a3b8")
          .text("Scan to verify", qrX, footTop + 72, { width: 70, align: "center" });
        // The web receipt also prints the raw verify URL under the QR (small,
        // monospace, wraps) — omitted here before, so the PDF had strictly
        // less information on it than the page it's meant to mirror.
        doc.font("Courier").fontSize(5.5).fillColor("#cbd5e1")
          .text(verifyUrl, qrX, footTop + 82, { width: 70, align: "center" });
      }
      doc.moveTo(sigX, footTop + 58).lineTo(sigX + 180, footTop + 58).lineWidth(0.75).strokeColor("#94a3b8").stroke();
      doc.font("Helvetica").fontSize(8.5).fillColor("#000000").text("Authorized Signature", sigX, footTop + 62, { width: 180, align: "center" });
      // recordedBy has no dedicated column on FeePayment — the on-screen
      // receipt (feeReceiptPayload) always shows the same literal label.
      doc.font("Helvetica").fontSize(7.5).fillColor("#64748b").text("Processed by: Finance Office", sigX, doc.y, { width: 180, align: "center" });
      doc.fillColor("#000000");

      doc.y = Math.max(doc.y, footTop + 100);
      doc.font("Helvetica").fontSize(7).fillColor("#94a3b8")
        .text("This is a computer-generated receipt. No signature is required.", PAGE_LEFT, doc.page.height - 60, { width: PAGE_WIDTH, align: "center" });

      doc.end();

      createAuditLog(jwtUser.userId, jwtUser.email, "EXPORT", "FEE_PAYMENT", fee.id,
        `Receipt PDF downloaded for ${studentName} (${fee.receiptNumber || fee.id}).`,
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
        (req.headers["user-agent"] as string) || null, "INFO").catch(() => {});
    } catch (err) {
      logger.error("Error generating fee receipt PDF:", err);
      if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
