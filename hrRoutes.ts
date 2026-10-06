// Extracted from server.ts. Route order is preserved: registerHrRoutes is called where these routes used to be registered.
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { notificationService } from "./lib/notifications";
import type { JwtPayload, APP_URL, authMiddleware, createAuditLog, logger, schemas, validate } from "./server";

export type HrRoutesContext = {
  APP_URL: typeof APP_URL;
  authMiddleware: typeof authMiddleware;
  createAuditLog: typeof createAuditLog;
  logger: typeof logger;
  prisma: PrismaClient;
  schemas: typeof schemas;
  validate: typeof validate;
};

export function registerHrRoutes(app: Express, ctx: HrRoutesContext) {
  const { APP_URL, authMiddleware, createAuditLog, logger, prisma, schemas, validate } = ctx;

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
      const updated = await prisma.$transaction(async (tx) => {
        const updated = await tx.payrollRun.update({ where: { id: run.id, status: run.status, updatedAt: run.updatedAt }, data: { status: next } });
        await notificationService(tx, APP_URL).payroll(updated);
        return updated;
      }, { timeout: 30_000 });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "PAYROLL_RUN", run.id,
        `Payroll run ${run.periodMonth}/${run.periodYear} status ${run.status} → ${next}.`, req.ip, req.headers["user-agent"] || null, "INFO");
      res.json(updated);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(409).json({ error: "Payroll changed while you were reviewing it. Refresh and try again." }); return; }
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

  return { payrollCanManage };
}
