# HR + Payroll + Leave — Implementation Plan

Adds a Human Resources domain to MRLC LMS: a non-teaching staff directory with
departments and designations, monthly payroll, and a leave request/approval
workflow. Borrowed from the edudash modules MRLC currently lacks, but fitted to
the existing stack (Prisma + Express `server.ts` + Vite/React pages + role-based
`navigation.ts`).

The plan follows existing conventions: `uuid` primary keys, `createdAt`/
`updatedAt` timestamps, `@@index` on lookup columns, monolithic route handlers
in `server.ts` guarded by `authMiddleware` + `requireRole("ADMIN")`, Zod entries
in the `schemas` object, and one page folder per feature wired into
`NAVIGATION_ITEMS`.

---

## 1. Scope and rationale

MRLC already models students, teachers, fees, attendance, cases and library. It
has a `STAFF` role but no place to actually manage staff as employees. The three
features below form one coherent domain and share the `Employee` record as their
backbone:

1. **Staff directory** — `Employee`, `Department`, `Designation`. Non-teaching
   staff (admin, cleaners, security, accountants, case workers) as first-class
   records, optionally linked to a login `User`.
2. **Payroll** — monthly `PayrollRun` + per-employee `Payslip` with allowances,
   deductions and net pay. Doubles as the salary side of the future finance
   ledger.
3. **Leave** — `LeaveType` (annual, sick, unpaid…) and `LeaveRequest` with a
   submit → approve/reject workflow and a running balance.

Out of scope here (candidates for later): payroll bank-file export, biometric
staff attendance, the donor finance ledger (separate plan).

---

## 2. Data model (Prisma)

Add to `prisma/schema.prisma`. New enums first, then models.

```prisma
enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  SUSPENDED
  TERMINATED
}

enum PayrollStatus {
  DRAFT       // run created, payslips editable
  APPROVED    // locked, ready to pay
  PAID        // disbursed
}

enum LeaveRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model Department {
  id          String   @id @default(uuid())
  name        String   @unique
  code        String?  @unique
  description String?
  employees   Employee[]
  designations Designation[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Designation {
  id           String   @id @default(uuid())
  title        String
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])
  employees    Employee[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([departmentId])
}

model Employee {
  id             String   @id @default(uuid())
  userId         String?  @unique          // optional login, mirrors Teacher.userId
  user           User?    @relation(fields: [userId], references: [id])
  employeeCode   String   @unique
  firstName      String
  lastName       String
  email          String?
  phone          String?
  status         EmployeeStatus @default(ACTIVE)
  hireDate       DateTime @default(now())
  terminationDate DateTime?
  baseSalary     Float    @default(0)
  currency       String   @default("MYR")
  profilePhotoUrl String?

  departmentId   String?
  department     Department? @relation(fields: [departmentId], references: [id])
  designationId  String?
  designation    Designation? @relation(fields: [designationId], references: [id])

  payslips       Payslip[]
  leaveRequests  LeaveRequest[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([employeeCode])
  @@index([departmentId])
  @@index([status])
}

model PayrollRun {
  id          String   @id @default(uuid())
  periodMonth Int      // 1-12
  periodYear  Int
  status      PayrollStatus @default(DRAFT)
  notes       String?
  createdById String?
  payslips    Payslip[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([periodYear, periodMonth])
  @@index([status])
}

model Payslip {
  id            String   @id @default(uuid())
  payrollRunId  String
  payrollRun    PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Cascade)
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  baseSalary    Float    @default(0)
  allowances    Float    @default(0)
  deductions    Float    @default(0)
  netPay        Float    @default(0)   // baseSalary + allowances - deductions
  currency      String   @default("MYR")
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([payrollRunId, employeeId])
  @@index([employeeId])
}

model LeaveType {
  id           String   @id @default(uuid())
  name         String   @unique          // Annual, Sick, Unpaid, Compassionate
  daysPerYear  Int      @default(0)       // 0 = uncapped / unpaid
  paid         Boolean  @default(true)
  requests     LeaveRequest[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model LeaveRequest {
  id            String   @id @default(uuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  leaveTypeId   String
  leaveType     LeaveType @relation(fields: [leaveTypeId], references: [id])
  startDate     DateTime
  endDate       DateTime
  days          Float                     // computed inclusive working-day count
  reason        String?
  status        LeaveRequestStatus @default(PENDING)
  reviewedById  String?
  reviewedByName String?
  reviewedAt    DateTime?
  reviewNote    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([employeeId])
  @@index([status])
}
```

Also add the back-relation on `User`:

```prisma
  employeeProfile Employee?
```

Migration: `npx prisma migrate dev --name add_hr_payroll_leave` then
`npx prisma generate`.

---

## 3. API routes (`server.ts`)

Same shape as existing handlers: `authMiddleware`, `requireRole("ADMIN")`
(payroll/leave approval are admin-only; consider a future `HR_MANAGER` role),
and `validate(schemas.x)` on writes. Group near the fee routes.

**Departments & designations**
```
GET    /api/departments
POST   /api/departments
PUT    /api/departments/:id
DELETE /api/departments/:id
GET    /api/designations            ?departmentId=
POST   /api/designations
PUT    /api/designations/:id
DELETE /api/designations/:id
```

**Employees**
```
GET    /api/employees               ?status=&departmentId=&q=
GET    /api/employees/:id
POST   /api/employees               (auto-generate employeeCode, e.g. EMP-0007)
PUT    /api/employees/:id
DELETE /api/employees/:id           (soft: set status=TERMINATED + terminationDate)
```

**Payroll**
```
GET    /api/payroll-runs            ?year=
POST   /api/payroll-runs            create DRAFT for {year, month};
                                    auto-seed one payslip per ACTIVE employee
                                    from baseSalary
GET    /api/payroll-runs/:id        run + payslips
PUT    /api/payroll-runs/:id/status DRAFT→APPROVED→PAID (recompute locked)
PUT    /api/payslips/:id            edit allowances/deductions while DRAFT;
                                    recompute netPay server-side
```

**Leave**
```
GET    /api/leave-types
POST   /api/leave-types
PUT    /api/leave-types/:id
DELETE /api/leave-types/:id
GET    /api/leave-requests          ?employeeId=&status=
POST   /api/leave-requests          (compute days; default PENDING)
PUT    /api/leave-requests/:id/status  APPROVED|REJECTED + reviewNote, stamps reviewer
GET    /api/employees/:id/leave-balance  daysPerYear − approved days this year, by type
```

`netPay` and `days` are always recomputed on the server; never trust client
totals. Status transitions validated (e.g. cannot edit a payslip once the run is
APPROVED).

---

## 4. Validation schemas (Zod, `schemas` object)

```ts
department:    { name: z.string().min(1), code: z.string().optional(),
                 description: z.string().optional() },
designation:   { title: z.string().min(1), departmentId: z.string().uuid().optional() },
employee:      { firstName, lastName: z.string().min(1),
                 email: z.string().email().optional(), phone: z.string().optional(),
                 departmentId: z.string().uuid().optional(),
                 designationId: z.string().uuid().optional(),
                 baseSalary: z.number().nonnegative().default(0),
                 hireDate: z.string().datetime().optional() },
payrollRun:    { periodYear: z.number().int(), periodMonth: z.number().int().min(1).max(12) },
payslipUpdate: { allowances: z.number().nonnegative(), deductions: z.number().nonnegative(),
                 notes: z.string().optional() },
leaveType:     { name: z.string().min(1), daysPerYear: z.number().int().nonnegative(),
                 paid: z.boolean().default(true) },
leaveRequest:  { employeeId: z.string().uuid(), leaveTypeId: z.string().uuid(),
                 startDate: z.string().datetime(), endDate: z.string().datetime(),
                 reason: z.string().optional() },
```

---

## 5. Frontend pages (`src/pages/hr/`)

| Page | Route | Purpose |
|---|---|---|
| `StaffDirectory.tsx` | `/staff` | Table of employees, filters by department/status, add/edit drawer |
| `StaffProfile.tsx` | `/staff/:id` | Detail: profile, department/designation, salary, leave history, payslips |
| `Departments.tsx` | `/staff/departments` | Manage departments + designations (admin) |
| `Payroll.tsx` | `/payroll` | List runs by year, create monthly run, open run to edit payslips, approve/mark paid |
| `Leave.tsx` | `/leave` | Leave requests queue with approve/reject; manage leave types; per-employee balances |

Reuse existing UI primitives (`@/components/ui/*` — Label, Table, Dialog, Select,
Button) seen in `SchoolOperations.tsx`. Follow that page's `field` config pattern
for add/edit forms to stay consistent.

---

## 6. Navigation & roles

Add to `NAVIGATION_ITEMS` in `src/lib/navigation.ts` (admin section), using
existing lucide icons (`Briefcase` for Staff, `Wallet`/`Banknote` for Payroll,
`CalendarCheck` for Leave):

```ts
{ title: "Staff",   url: "/staff",   icon: Briefcase,     roles: ["ADMIN"] },
{ title: "Payroll", url: "/payroll", icon: Wallet,        roles: ["ADMIN", "ACCOUNTANT"] },
{ title: "Leave",   url: "/leave",   icon: CalendarCheck, roles: ["ADMIN"] },
```

Register the routes in `src/App.tsx` alongside the other page routes.

Optional later: a `STAFF`-role self-service view (own profile, submit own leave,
view own payslips) — the data model already supports it via `Employee.userId`.

---

## 7. Build order

1. **Schema + migration** — models, enums, `User` back-relation, migrate, generate.
2. **Departments/Designations** — simplest CRUD; unblocks Employee.
3. **Employees** — directory + profile; auto `employeeCode`; soft-delete.
4. **Leave** — types, request workflow, balance endpoint. (Independent of payroll.)
5. **Payroll** — runs, auto-seeded payslips, status transitions.
6. **Navigation + App routes** — wire pages in.
7. **Verification** — see below.

Leave (4) and Payroll (5) both depend only on Employees (3), so they can be done
in either order or in parallel.

---

## 8. Verification

- **Prisma**: `npx prisma validate` and a successful migrate on a scratch DB.
- **API smoke test**: a script (or REST calls) that creates a department →
  designation → employee → payroll run (asserts a payslip was auto-seeded and
  `netPay === baseSalary + allowances − deductions`) → leave type → leave
  request → approve it and assert the balance endpoint drops by the right number
  of days.
- **Authorization**: confirm non-admin tokens get 403 on every write route.
- **Status guards**: assert editing a payslip on an APPROVED run is rejected, and
  that approving an already-approved leave request is a no-op/400.
- **Frontend**: load each new page as ADMIN and as a non-privileged role to
  confirm nav visibility matches `roles`.

---

## 9. Effort estimate

Roughly 8 new models, ~22 endpoints, 5 pages. For a developer familiar with the
codebase: schema + backend ~1.5–2 days, frontend ~2–3 days, testing/polish ~1
day. The salary data from payroll feeds directly into the planned donor finance
ledger, so doing HR first reduces later rework.
