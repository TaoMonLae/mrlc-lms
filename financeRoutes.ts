// Extracted from server.ts. Route order is preserved: registerFinanceRoutes is called where these routes used to be registered.
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { feeMonthRange, feeYearRange, normalizeFeeMonth } from "./shared/feePeriods";
import { collectSchoolFee, financeTransaction, syncDonationCampaign, reviewExpense, recordExpensePayment } from "./lib/financeOperations";
import { FinanceControlError, validateMoney } from "./shared/financeControls";
import crypto from "crypto";
import { isBoardingStudent, dutyExpenseRosterEligible, dutyExpenseAssignmentEligible, dutyExpenseMatchesAssignmentDate, dutyExpenseIsNotFuture } from "./shared/dutyExpenses";
import { getExpenseGrossAmount, resolveUtcReportRange, ReportRangeError } from "./shared/financialReports";
import type { JwtPayload, authMiddleware, createAuditLog, logger, schemas, syncBudgetSpending, validate } from "./server";

export type FeeOverviewPeriod = { month?: string; year?: number };

export type FinanceRoutesContext = {
  authMiddleware: typeof authMiddleware;
  createAuditLog: typeof createAuditLog;
  logger: typeof logger;
  prisma: PrismaClient;
  schemas: typeof schemas;
  syncBudgetSpending: typeof syncBudgetSpending;
  validate: typeof validate;
};

export function registerFinanceRoutes(app: Express, ctx: FinanceRoutesContext) {
  const { authMiddleware, createAuditLog, logger, prisma, schemas, syncBudgetSpending, validate } = ctx;

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
    if (amountPaid != null && (Number(amountPaid) < 0 || Number(amountPaid) > netAmount)) {
      res.status(400).json({ error: "amountPaid must be between zero and the fee balance" }); return;
    }
    if (discount > 0 && !notes?.trim()) { res.status(400).json({ error: "Record the reason and approval reference for a fee discount or scholarship in notes" }); return; }
    const paidNow = amountPaid == null ? netAmount : Number(amountPaid);
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
      const updated = await collectSchoolFee(prisma, req.params.id, jwtUser, req.body);
      res.json(feeReceiptPayload(updated, updated.currency));
    } catch (error) {
      if (error instanceof FinanceControlError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error("Error recording fee collection:", error);
      res.status(500).json({ error: "Could not record fee collection. Refresh before retrying." });
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

      if (fee.paidAmount > 0 || await prisma.feeCollection.count({ where: { feePaymentId: fee.id } })) {
        res.status(409).json({ error: "A fee with recorded cash receipts cannot be voided. Ask the finance officer to document a refund or correction; preserve the original receipts." }); return;
      }
      const voidedAt = new Date();
      const voidNote = `${voidedAt.toISOString().slice(0, 10)}: Payment voided by ${jwtUser.email}. Reason: ${req.body.reason}`;
      // Keep the collection rows as an immutable audit trail. Financial
      // reports exclude collections whose parent charge is WAIVED.
      const updated: any = await prisma.feePayment.update({
        where: { id: fee.id, paidAmount: 0 },
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
      const donationNumber = `DON-${new Date().getUTCFullYear()}-${crypto.randomUUID()}`;
      const donation = await financeTransaction(prisma, async tx => {
        if (req.body.campaignId) {
          const campaign = await tx.donationCampaign.findUnique({ where: { id: req.body.campaignId } });
          if (!campaign || campaign.currency !== req.body.currency) throw new FinanceControlError("Donation and campaign currencies must match", 400);
        }
        const gift = await tx.donation.create({ data: { ...req.body, amount: Number(req.body.amount), donationNumber, donationDate: new Date(req.body.donationDate), isTaxDeductible: req.body.donationType === 'IN_KIND' ? false : req.body.isTaxDeductible, taxReceiptAmount: req.body.isTaxDeductible && req.body.donationType !== 'IN_KIND' ? Number(req.body.amount) : null } });
        await syncDonationCampaign(tx, gift.campaignId);
        return gift;
      });

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
      if (err instanceof FinanceControlError) { res.status(err.status).json({ error: err.message }); return; }
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
      const donation = await financeTransaction(prisma, async tx => {
        const existing = await tx.donation.findUnique({ where: { id: req.params.id }, include: { receipt: true } });
        if (!existing) throw new FinanceControlError('Donation not found', 404);
        if (['RECEIVED', 'PROCESSED', 'REFUNDED'].includes(existing.status) || existing.receipt) {
          const immutable = ['amount', 'currency', 'donorId', 'donationType', 'donationDate', 'receivedDate', 'campaignId', 'designation', 'isTaxDeductible'];
          if (immutable.some(key => req.body[key] !== undefined && String(req.body[key]) !== String((existing as any)[key] instanceof Date ? (existing as any)[key].toISOString().slice(0, 10) : (existing as any)[key] ?? '')) || (req.body.status && req.body.status !== existing.status && !(existing.status === 'RECEIVED' && req.body.status === 'PROCESSED'))) {
            throw new FinanceControlError('Received donations and issued receipts are retained as evidence. Financial changes or refunds require a documented adjustment through the finance officer.');
          }
        }
        const currency = req.body.currency || existing.currency;
        const campaignId = req.body.campaignId === undefined ? existing.campaignId : req.body.campaignId;
        if (campaignId) {
          const campaign = await tx.donationCampaign.findUnique({ where: { id: campaignId } });
          if (!campaign || campaign.currency !== currency) throw new FinanceControlError('Donation and campaign currencies must match', 400);
        }
        if (req.body.amount !== undefined) validateMoney(Number(req.body.amount));
        const donationType = req.body.donationType || existing.donationType;
        const deductible = donationType !== 'IN_KIND' && (req.body.isTaxDeductible ?? existing.isTaxDeductible);
        const gift = await tx.donation.update({ where: { id: existing.id }, data: {
          ...req.body, ...(req.body.amount !== undefined && { amount: Number(req.body.amount) }), isTaxDeductible: deductible, taxReceiptAmount: deductible ? Number(req.body.amount ?? existing.amount) : null,
          donationDate: req.body.donationDate ? new Date(req.body.donationDate) : undefined,
          receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : (!existing.receivedDate && existing.status === 'PENDING' && ['RECEIVED', 'PROCESSED'].includes(req.body.status) ? new Date() : undefined),
          processedDate: req.body.processedDate ? new Date(req.body.processedDate) : undefined,
        } });
        await syncDonationCampaign(tx, existing.campaignId);
        if (gift.campaignId !== existing.campaignId) await syncDonationCampaign(tx, gift.campaignId);
        return gift;
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
      if (err instanceof FinanceControlError) { res.status(err.status).json({ error: err.message }); return; }
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

      if (donation.receipt || !['PENDING', 'CANCELLED'].includes(donation.status)) {
        throw new FinanceControlError('Only unreceived pledges can be deleted. Preserve received donations and receipts for audit.');
      }
      await financeTransaction(prisma, async tx => {
        await tx.donation.delete({ where: { id: donation.id, status: { in: ['PENDING', 'CANCELLED'] } } });
        await syncDonationCampaign(tx, donation.campaignId);
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
      if (err instanceof FinanceControlError) { res.status(err.status).json({ error: err.message }); return; }
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

      if (!donation.isTaxDeductible || donation.donationType === "IN_KIND") {
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

  const dutyExpenseInclude = {
    student: {
      select: {
        id: true,
        studentCode: true,
        preferredName: true,
        user: { select: { firstName: true, lastName: true } },
      },
    },
    dutyAssignment: {
      include: {
        dutyDefinition: { select: { id: true, name: true, type: true } },
        roster: { select: { id: true, name: true, status: true } },
      },
    },
  } as const;

  // Boarding students submit daily purchases against a duty assignment. The
  // result is a normal pending Expense so Finance/Admin review, reporting and
  // payment controls stay in one audited ledger.
  app.get("/api/student-duty-expenses", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const where: any = { source: "STUDENT_DUTY" };
      let eligible = true;

      if (jwtUser.role === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { userId: jwtUser.userId },
          select: { id: true, boardingType: true },
        });
        if (!student) { res.status(404).json({ error: "Student profile not found" }); return; }
        eligible = isBoardingStudent(student.boardingType);
        if (!eligible) {
          res.json({ eligible: false, currency: "MYR", expenses: [] });
          return;
        }
        where.studentId = student.id;
      } else if (!["ADMIN", "ACCOUNTANT"].includes(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      if (req.query.status) where.status = { in: String(req.query.status).split(",") };
      const [expenses, profile] = await Promise.all([
        prisma.expense.findMany({
          where,
          orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
          include: dutyExpenseInclude,
        }),
        prisma.schoolProfile.findFirst({ select: { currency: true } }),
      ]);
      res.json({ eligible, currency: profile?.currency || "MYR", expenses });
    } catch (error) {
      logger.error("Error fetching student duty expenses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post(
    "/api/student-duty-expenses",
    authMiddleware,
    validate(schemas.studentDutyExpenseCreate),
    async (req, res) => {
      const jwtUser = (req as any).user as JwtPayload;
      if (jwtUser.role !== "STUDENT") {
        res.status(403).json({ error: "Only boarding students can submit duty expenses" });
        return;
      }
      try {
        const student = await prisma.student.findUnique({
          where: { userId: jwtUser.userId },
          select: { id: true, studentCode: true, boardingType: true },
        });
        if (!student) { res.status(404).json({ error: "Student profile not found" }); return; }
        if (!isBoardingStudent(student.boardingType)) {
          res.status(403).json({ error: "Duty expenses are available to boarding students only" });
          return;
        }

        const assignment = await prisma.dutyAssignment.findUnique({
          where: { id: req.body.dutyAssignmentId },
          include: { dutyDefinition: true, roster: true },
        });
        if (!assignment || assignment.studentId !== student.id) {
          res.status(403).json({ error: "Choose one of your own duty assignments" });
          return;
        }
        if (!dutyExpenseRosterEligible(assignment.roster.status)) {
          res.status(400).json({ error: "Expenses require a published, active, or completed duty roster" });
          return;
        }
        if (!dutyExpenseAssignmentEligible(assignment.status)) {
          res.status(400).json({ error: "This duty is not eligible for an expense submission" });
          return;
        }
        if (!dutyExpenseMatchesAssignmentDate(req.body.expenseDate, assignment.scheduledDate)) {
          res.status(400).json({ error: "The expense date must match the assigned duty date" });
          return;
        }
        if (!dutyExpenseIsNotFuture(req.body.expenseDate)) {
          res.status(400).json({ error: "Future duty expenses cannot be submitted" });
          return;
        }

        const profile = await prisma.schoolProfile.findFirst({ select: { currency: true } });
        const amount = Number(req.body.amount);
        const expense = await prisma.expense.create({
          data: {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            amount,
            taxAmount: 0,
            totalAmount: amount,
            currency: profile?.currency || "MYR",
            expenseDate: new Date(`${req.body.expenseDate}T00:00:00.000Z`),
            paymentMethod: "CASH",
            merchantName: req.body.merchantName || null,
            receiptReference: req.body.receiptReference || null,
            notes: req.body.notes || null,
            source: "STUDENT_DUTY",
            studentId: student.id,
            dutyAssignmentId: assignment.id,
            tags: ["student-duty", assignment.dutyDefinition.type.toLowerCase()],
            status: "PENDING_APPROVAL",
            submittedAt: new Date(),
            submittedById: jwtUser.userId,
            submittedByName: jwtUser.email,
          },
          include: dutyExpenseInclude,
        });

        await createAuditLog(
          jwtUser.userId,
          jwtUser.email,
          "CREATE",
          "EXPENSE",
          expense.id,
          `Boarding duty expense submitted: ${expense.title} (${assignment.dutyDefinition.name})`,
          req.ip,
          req.headers["user-agent"] || null,
        );
        res.status(201).json(expense);
      } catch (error) {
        logger.error("Error submitting student duty expense:", error);
        res.status(500).json({ error: "Could not submit the duty expense" });
      }
    },
  );

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
      if (req.query.currency) where.currency = String(req.query.currency).toUpperCase();
      if (req.query.source) {
        const source = String(req.query.source);
        if (!['FINANCE', 'STUDENT_DUTY'].includes(source)) { res.status(400).json({ error: 'Invalid expense source' }); return; }
        where.source = source;
      }
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
          { merchantName: { contains: String(search), mode: 'insensitive' } },
          { receiptReference: { contains: String(search), mode: 'insensitive' } },
          { student: { is: { OR: [
            { studentCode: { contains: String(search), mode: 'insensitive' } },
            { preferredName: { contains: String(search), mode: 'insensitive' } },
            { user: { is: { OR: [
              { firstName: { contains: String(search), mode: 'insensitive' } },
              { lastName: { contains: String(search), mode: 'insensitive' } },
            ] } } },
          ] } } },
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
            ...dutyExpenseInclude,
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
          ...dutyExpenseInclude,
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
        where: { id: req.params.id, status: "DRAFT" },
        data: {
          ...rest,
          ...(amount !== undefined && amount !== null && { amount: Number(amount) }),
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
        where: { id: req.params.id, status: "DRAFT" },
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
      const expense = await reviewExpense(prisma, req.params.id, jwtUser, 'APPROVED', req.body.notes);
      res.json(expense);
    } catch (error) {
      if (error instanceof FinanceControlError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error("Finance operation failed:", error);
      res.status(500).json({ error: "Finance operation failed. Refresh the record before retrying." });
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
      const expense = await reviewExpense(prisma, req.params.id, jwtUser, 'REJECTED', req.body.reason);
      res.json(expense);
    } catch (error) {
      if (error instanceof FinanceControlError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error("Finance operation failed:", error);
      res.status(500).json({ error: "Finance operation failed. Refresh the record before retrying." });
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
      const result = await recordExpensePayment(prisma, req.params.id, jwtUser, req.body);
      res.json(result);
    } catch (error) {
      if (error instanceof FinanceControlError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error("Finance operation failed:", error);
      res.status(500).json({ error: "Finance operation failed. Refresh the record before retrying." });
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
      const result = await recordExpensePayment(prisma, req.body.expenseId, jwtUser, req.body);
      res.status(201).json(result.payment);
    } catch (error) {
      if (error instanceof FinanceControlError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error("Finance operation failed:", error);
      res.status(500).json({ error: "Finance operation failed. Refresh the record before retrying." });
    }
  });

  for (const method of ['put', 'delete'] as const) {
    app[method]("/api/bill-payments/:id", authMiddleware, (req, res) => {
      const user = (req as any).user as JwtPayload;
      if (!expenseCanManage(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }
      res.status(409).json({ error: "Posted payments are retained as audit evidence. Record a documented correction through your finance officer; posted receipts cannot be overwritten or deleted." });
    });
  }

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
      if (req.query.currency) where.currency = String(req.query.currency).toUpperCase();
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

  return { feeReceiptPayload, expenseCanView, buildStudentFeeOverview };
}
