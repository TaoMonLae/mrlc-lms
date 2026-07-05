# Financial Modules Implementation Plan
## MRLC LMS Boarding School System

**Date**: 2026-07-04
**Status**: Ready for Implementation

---

## Executive Summary

This plan provides a detailed roadmap for implementing four critical financial and operational modules while maintaining consistency with the existing architecture:

1. **Expense Management System** (Highest Priority)
2. **Student Duty System**
3. **Enhanced Donation Tracking**
4. **Financial Dashboard & Reporting**

---

## Current System Architecture

### Tech Stack
- **Backend**: Express.js + Prisma ORM with PostgreSQL
- **Frontend**: React 19 + TypeScript + shadcn/ui
- **Patterns**: Modular routes, permission-based access control, audit logging

### Existing Financial Features
✅ **Student Fee Management** (`/src/pages/fees/`)
- FeePayment model with PAID/PENDING/OVERDUE/WAIVED status
- Receipt generation with PrintLayout
- Payment method tracking
- Collection rate reporting

✅ **Staff Payroll** (`/src/pages/hr/`)
- Employee & Teacher models
- PayrollRun with DRAFT/APPROVED/PAID workflow
- Payslip generation with allowances/deductions
- Leave request tracking

✅ **Basic Inventory** (`/src/pages/operations/`)
- InventoryItem model (CRUD only)

---

## Module 1: Expense Management (Priority: HIGH)

### New Prisma Models

```prisma
enum ExpenseCategory {
  OPERATIONAL, SALARIES, MAINTENANCE, EDUCATIONAL,
  FOOD_KITCHEN, TRANSPORT, ADMINISTRATION, MISCELLANEOUS
}

enum ExpenseStatus {
  DRAFT, PENDING, APPROVED, PAID, PARTIAL, OVERDUE, CANCELLED
}

model Expense {
  id              String        @id @default(uuid())
  title           String
  description     String?
  amount          Float
  currency        String        @default("MYR")
  expenseDate     DateTime
  dueDate         DateTime?
  status          ExpenseStatus @default(DRAFT)
  category        ExpenseCategory

  // Vendor
  vendorId        String?
  vendor          Vendor?       @relation(fields: [vendorId], references: [id])

  // Budget tracking
  budgetId        String?
  budget          Budget?       @relation(fields: [budgetId], references: [id])

  // Payment
  totalPaid       Float         @default(0)
  remainingAmount Float
  paymentMethod   String?

  // Documentation
  invoiceNumber   String?       @unique
  invoiceUrl      String?
  receiptUrls     String[]      @default([])

  // Approval
  submittedById   String?
  approvedById    String?
  approvedAt      DateTime?

  payments        BillPayment[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Vendor {
  id                String   @id @default(uuid())
  code              String?  @unique
  name              String
  contactPerson     String?
  email             String?
  phone             String?
  address           String?
  taxId             String?
  paymentTerms      String?
  currency          String   @default("MYR")
  isActive          Boolean  @default(true)
  expenses          Expense[]
}

model BillPayment {
  id              String   @id @default(uuid())
  amount          Float
  paymentDate     DateTime @default(now())
  paymentMethod   String
  referenceNumber String?  @unique
  expenseId       String
  expense         Expense  @relation(fields: [expenseId], references: [id])
  receiptUrl      String?
}

model RecurringExpense {
  id                String          @id @default(uuid())
  title             String
  baseAmount        Float
  frequency         RecurringFrequency // WEEKLY, MONTHLY, QUARTERLY, ANNUALLY
  startDate         DateTime
  nextGenerateDate  DateTime
  autoGenerate      Boolean         @default(true)
  isActive          Boolean         @default(true)
}
```

### API Routes
- `GET/POST /api/expenses` - List/create expenses
- `PUT /api/expenses/:id` - Update expense
- `POST /api/expenses/:id/approve` - Approval workflow
- `GET/POST /api/vendors` - Vendor management
- `GET/POST /api/recurring-expenses` - Recurring rules
- `POST /api/bill-payments` - Record payments
- `GET /api/expenses/dashboard` - Summary metrics

### UI Components
```
/src/pages/expenses/
├── ExpensesDashboard.tsx     # Metrics & overview
├── ExpenseList.tsx            # Filterable table
├── ExpenseForm.tsx            # Create/edit
├── VendorList.tsx             # Vendor management
├── RecurringRules.tsx        # Recurring setup
└── ExpenseReports.tsx        # Analytics

/src/components/expenses/
├── ExpenseStatusBadge.tsx
├── CategoryBreakdown.tsx
└── VendorAutocomplete.tsx
```

### Permissions
```typescript
'view_expenses', 'manage_expenses', 'approve_expenses', 'manage_vendors'
```

---

## Module 2: Student Duty System (Priority: HIGH)

### New Prisma Models

```prisma
enum DutyType {
  COOKING, RESOURCE_BUYING, CLEANING, DISH_WASHING,
  GARDENING, MAINTENANCE, SECURITY, EVENT_SETUP
}

enum DutyStatus {
  ASSIGNED, IN_PROGRESS, COMPLETED, SKIPPED, EXCUSED, FAILED
}

model DutyDefinition {
  id               String      @id @default(uuid())
  name             String
  code             String      @unique
  type             DutyType
  duration         Int?        // Expected minutes
  requiredStudents Int         // How many needed
  pointsAwarded    Int         @default(1)
  isActive         Boolean     @default(true)
}

model DutyRoster {
  id          String          @id @default(uuid())
  name        String          // "Week 45", "November 2024"
  periodType  String          @default("WEEKLY")
  startDate   DateTime
  endDate     DateTime
  status      String          @default("DRAFT") // DRAFT, PUBLISHED, ACTIVE
  autoAssign  Boolean         @default(false)
  maxWeeklyDuties Int         @default(5)
  assignments DutyAssignment[]
}

model DutyAssignment {
  id                String        @id @default(uuid())
  rosterId          String
  dutyDefinitionId  String
  scheduledDate     DateTime
  studentId         String
  status            DutyStatus    @default(ASSIGNED)
  rating            Int?          // 1-5 performance
  pointsEarned      Int?
  completedAt       DateTime?
}

model DutyPerformance {
  id             String   @id @default(uuid())
  studentId      String
  periodStart    DateTime
  totalAssigned  Int
  totalCompleted Int
  completionRate Float
  averageRating  Float?
  totalPoints    Int
}
```

### API Routes
- `GET/POST /api/duty-definitions` - Duty types
- `GET/POST /api/duty-rosters` - Roster periods
- `POST /api/duty-rosters/:id/publish` - Publish to students
- `GET/POST /api/duty-assignments` - Assignments
- `POST /api/duty-assignments/bulk` - Auto-assign
- `PUT /api/duty-assignments/:id/status` - Update status
- `GET /api/duty-performance/:studentId` - Performance stats

### UI Components
```
/src/pages/duties/
├── DutiesDashboard.tsx        # Calendar overview
├── DutyRosterList.tsx         # Roster periods
├── AutoAssignWizard.tsx       # Smart assignment
├── DutyDefinitions.tsx        # Duty type config
├── StudentDutyView.tsx        # Student portal
└── DutyPerformance.tsx       # Performance reports
```

### Permissions
```typescript
'manage_duties', 'view_duties', 'view_own_duties'
```

---

## Module 3: Enhanced Donation Tracking (Priority: MEDIUM)

### New Prisma Models

```prisma
enum DonationStatus {
  PENDING, RECEIVED, DEPOSITED, ACKNOWLEDGED, TAX_ISSUED, CANCELLED
}

enum DonationType {
  MONETARY, IN_KIND, RECURRING, CORPORATE, GRANT, CROWDFUNDING
}

model Donor {
  id               String      @id @default(uuid())
  donorCode        String?     @unique
  type             String      @default("INDIVIDUAL")
  firstName        String?
  lastName         String?
  organizationName String?
  email            String?
  phone            String?
  address          String?
  taxId            String?
  isAnonymous      Boolean     @default(false)
  isActive         Boolean     @default(true)
  donations        Donation[]
}

model Donation {
  id                String        @id @default(uuid())
  donationNumber    String        @unique
  donationDate      DateTime      @default(now())
  amount            Float
  currency          String        @default("MYR")
  type              DonationType
  status            DonationStatus @default(PENDING)
  donorId           String
  donor             Donor         @relation(fields: [donorId], references: [id])
  campaignId        String?
  campaign          DonationCampaign? @relation(fields: [campaignId], references: [id])
  paymentMethod     String?
  taxReceiptNumber  String?       @unique
  taxReceiptIssued  Boolean       @default(false)
  thankYouSent      Boolean       @default(false)
}

model DonationCampaign {
  id           String     @id @default(uuid())
  name         String
  code         String     @unique
  targetAmount Float
  currentAmount Float     @default(0)
  startDate    DateTime
  endDate      DateTime?
  isActive     Boolean    @default(true)
  donations    Donation[]
}
```

### API Routes
- `GET/POST /api/donations` - List/create donations
- `POST /api/donations/:id/acknowledge` - Send thank you
- `POST /api/donations/:id/tax-receipt` - Issue tax receipt
- `GET /api/donors` - Donor database
- `POST /api/donors` - Create donor
- `GET/POST /api/donor-campaigns` - Campaigns
- `GET /api/donations/dashboard` - Metrics

### UI Components
```
/src/pages/donations/
├── DonationsDashboard.tsx     # Overview
├── DonationList.tsx            # Records
├── DonorList.tsx               # Donor database
├── DonorProfile.tsx            # Donor history
├── CampaignList.tsx            # Campaigns
└── TaxReceipts.tsx             # Tax receipts
```

### Permissions
```typescript
'view_donations', 'manage_donations', 'issue_tax_receipts'
```

---

## Module 4: Financial Dashboard & Budgeting (Priority: MEDIUM)

### New Prisma Models

```prisma
model Budget {
  id              String   @id @default(uuid())
  name            String
  fiscalYear      Int
  periodType      String   @default("ANNUAL")
  startDate       DateTime
  endDate         DateTime
  totalBudget     Float
  allocatedAmount Float    @default(0)
  actualSpent     Float    @default(0)
  remainingBalance Float
  categories      Json     // { "OPERATIONAL": 5000, ... }
  status          String   @default("DRAFT") // DRAFT, ACTIVE, CLOSED
  expenses        Expense[]
}
```

### API Routes
- `GET /api/financial-reports/summary` - Dashboard metrics
- `GET /api/financial-reports/income-expense` - Income vs expense
- `GET /api/financial-reports/budget-vs-actual` - Budget comparison
- `GET /api/financial-reports/cash-flow` - Cash flow analysis
- `GET/POST /api/budgets` - Budget management

### UI Components
```
/src/pages/financial/
├── FinancialDashboard.tsx      # KPI overview
├── IncomeExpenseReport.tsx     # Income vs expense
├── BudgetVsActualReport.tsx    # Budget comparison
├── CashFlowReport.tsx          # Cash flow
└── BudgetList.tsx              # Budget management

/src/components/financial/
├── MetricCard.tsx              # KPI cards
├── BudgetProgress.tsx          # Budget utilization
├── TrendChart.tsx              # Trend visualization
└── CashFlowDiagram.tsx         # Cash flow diagram
```

### Permissions
```typescript
'view_financial_reports', 'manage_budgets'
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Add Prisma models & run migrations
- Create modular route files
- Update permission system
- Set up base API utilities

### Phase 2: Expense Management (Week 3-4)
- Expense CRUD operations
- Vendor management
- Bill payment tracking
- Expense dashboard & reports

### Phase 3: Student Duty System (Week 5-6)
- Duty definitions & rosters
- Assignment system (manual + auto)
- Student portal & attendance
- Performance tracking

### Phase 4: Donation Tracking (Week 7-8)
- Donor management
- Donation recording
- Campaigns & receipts
- Donation analytics

### Phase 5: Financial Dashboard (Week 9-10)
- Budget management
- Financial reports
- Cash flow analysis
- Report automation

### Phase 6: Integration & Polish (Week 11-12)
- Cross-module integration
- Testing & security audit
- Documentation
- Deployment & training

---

## Files to Create

**Backend Routes:**
- `/expenses.ts`
- `/duties.ts`
- `/donations.ts`
- `/financial.ts`

**Frontend Pages:** (~40 new pages)
- `/src/pages/expenses/*` (10)
- `/src/pages/duties/*` (9)
- `/src/pages/donations/*` (9)
- `/src/pages/financial/*` (8)

**Components:** (~25 new components)
- `/src/components/expenses/*`
- `/src/components/duties/*`
- `/src/components/donations/*`
- `/src/components/financial/*`

**Utilities:**
- `/src/lib/expenseCalculations.ts`
- `/src/lib/dutyAssignment.ts`
- `/src/lib/donationReceipts.ts`
- `/src/lib/financialReports.ts`

---

## Files to Modify

1. `/prisma/schema.prisma` - Add new models
2. `/server.ts` - Register new route modules
3. `/src/lib/permissions.ts` - Add permissions
4. `/src/lib/navigation.ts` - Add menu items

---

## Architecture Patterns to Follow

### API Pattern
```typescript
export function registerXxxRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, requirePermission } = deps;
  app.get('/api/xxx', authMiddleware, requirePermission('view_xxx'), ...);
}
```

### Permission Pattern
```typescript
ROLE_PERMISSIONS = {
  ADMIN: ['manage_expenses', 'approve_expenses'],
  ACCOUNTANT: ['manage_expenses'],
}
```

### Audit Pattern
```typescript
await createAuditLog(prisma, {
  action: 'CREATE',
  entityType: 'Expense',
  entityId: expense.id,
  userId,
});
```

---

## Navigation Structure

```typescript
{
  label: "Financial",
  items: [
    { title: "Fees & Payments", url: "/fees" },
    { title: "Expenses", url: "/expenses" },
    { title: "Budgets", url: "/budgets" },
    { title: "Donations", url: "/donations" },
    { title: "Financial Reports", url: "/financial" },
  ],
},
{
  label: "Operations",
  items: [
    { title: "Student Duties", url: "/duties" },
    { title: "Resources", url: "/resources" },
  ],
}
```

---

## Key Dependencies

- **Recurring expenses** → Use cron job for auto-generation
- **Duty assignments** → Integrate with Student model
- **Budget tracking** → Link to Expense model
- **Financial reports** → Aggregate from Fees, Expenses, Donations

---

## Success Criteria

✅ All modules follow existing architecture patterns
✅ Consistent UI/UX with current system
✅ Full permission and audit integration
✅ Comprehensive reporting capabilities
✅ Production-ready code quality
✅ Complete documentation

---

## Next Steps

**Option 1**: Start Phase 1 implementation immediately
**Option 2**: Review and refine specific module details
**Option 3**: Prioritize based on urgent operational needs

**Ready to proceed when you are.**
