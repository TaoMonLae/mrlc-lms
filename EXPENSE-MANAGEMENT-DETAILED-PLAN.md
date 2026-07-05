# Expense Management Module - Complete Implementation Plan

**Module**: Expense Management
**Priority**: HIGH (Critical for boarding school operations)
**Estimated Duration**: 7 weeks
**Status**: Ready for Implementation

---

## Table of Contents
1. [Prisma Data Models](#1-prisma-data-models)
2. [API Specification](#2-api-specification)
3. [UI Components](#3-ui-components)
4. [Integration Points](#4-integration-points)
5. [Implementation Sequence](#5-implementation-sequence)
6. [Code Examples](#6-code-examples)

---

## 1. Prisma Data Models

### Enums

```prisma
enum ExpenseStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PAID
  REJECTED
  CANCELLED
}

enum ExpenseCategory {
  OPERATIONAL      // Daily operations, utilities, maintenance
  ACADEMIC         // Educational materials, supplies, equipment
  STAFF_COSTS      // Employee-related expenses (excluding payroll)
  FOOD_CATERING    // Boarding school meals, events
  TRANSPORTATION   // Vehicle costs, fuel, travel
  FACILITY         // Building repairs, improvements
  TECHNOLOGY       // IT equipment, software, licenses
  EVENT            // School events, activities
  ADMINISTRATIVE   // Office supplies, insurance, legal
  OTHER            // Miscellaneous expenses
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CHECK
  CREDIT_CARD
  DEBIT_CARD
  ONLINE_PAYMENT
  WIRE_TRANSFER
  OTHER
}

enum RecurringExpenseFrequency {
  DAILY
  WEEKLY
  BI_WEEKLY
  MONTHLY
  QUARTERLY
  SEMI_ANNUALLY
  ANNUALLY
}

enum BudgetStatus {
  ACTIVE
  EXHAUSTED
  EXCEEDED
  ARCHIVED
}
```

### Core Models

```prisma
model Expense {
  id                String          @id @default(uuid())
  
  // Basic Information
  title             String
  description       String?
  category          ExpenseCategory
  status            ExpenseStatus   @default(DRAFT)
  
  // Financial Details
  amount            Float
  currency          String          @default("MYR")
  taxAmount         Float?          @default(0)
  totalAmount       Float?          // amount + taxAmount (computed)
  budgetId          String?         // Link to budget for tracking
  
  // Vendor Information
  vendorId          String?
  vendor            Vendor?         @relation(fields: [vendorId], references: [id])
  vendorInvoiceNo   String?         @unique
  
  // Dates
  expenseDate       DateTime
  dueDate           DateTime?
  paidDate          DateTime?
  
  // Payment Information
  paymentMethod     PaymentMethod?
  paymentReference  String?         @unique
  bankAccount       String?
  
  // Approval Workflow
  submittedById     String?
  submittedByName   String?
  submittedAt       DateTime?
  approvedById      String?
  approvedByName    String?
  approvedAt        DateTime?
  rejectionReason   String?
  
  // Supporting Documents
  receiptUrl        String?
  receiptFileName   String?
  attachmentUrls    String[]        @default([])
  
  // Additional Details
  notes             String?
  tags              String[]        @default([])
  isRecurring       Boolean         @default(false)
  recurringExpenseId String?
  
  // Academic Context
  academicYear      String?
  term              String?
  departmentId      String?
  relatedClassId    String?
  relatedSubjectId  String?
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  // Relations
  payments          BillPayment[]
  recurringExpense  RecurringExpense?
  
  @@index([category])
  @@index([status])
  @@index([expenseDate])
  @@index([dueDate])
  @@index([vendorId])
  @@index([budgetId])
}

model Vendor {
  id                String          @id @default(uuid())
  
  // Basic Information
  name              String
  code              String?         @unique
  description       String?
  
  // Contact Information
  contactPerson     String?
  email             String?
  phone             String?
  website           String?
  
  // Address
  address           String?
  city              String?
  state             String?
  postalCode        String?
  country           String?         @default("Malaysia")
  
  // Tax & Banking
  taxId             String?
  bankName          String?
  bankAccount       String?
  paymentTerms      String?
  
  // Categorization
  category          String?
  tags              String[]        @default([])
  
  // Status
  isActive          Boolean         @default(true)
  
  // Performance Tracking
  totalPurchases    Float           @default(0)
  purchaseCount     Int             @default(0)
  lastPurchaseDate  DateTime?
  
  notes             String?
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  // Relations
  expenses          Expense[]
  
  @@index([name])
  @@index([isActive])
}

model BillPayment {
  id                String          @id @default(uuid())
  
  // Reference
  expenseId         String
  expense           Expense         @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  paymentNumber     String          @unique
  
  // Payment Details
  amount            Float
  currency          String          @default("MYR")
  paymentMethod     PaymentMethod
  paymentDate       DateTime        @default(now())
  referenceNumber   String?
  bankAccount       String?
  
  // Supporting Documents
  receiptUrl        String?
  receiptFileName   String?
  
  // Approval
  approvedById      String?
  approvedByName    String?
  approvedAt        DateTime?
  
  notes             String?
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  @@index([expenseId])
  @@index([paymentDate])
}

model RecurringExpense {
  id                String                 @id @default(uuid())
  
  // Basic Information
  title             String
  description       String?
  category          ExpenseCategory
  status            ExpenseStatus          @default(DRAFT)
  
  // Financial Details
  amount            Float
  currency          String                @default("MYR")
  taxAmount         Float?                 @default(0)
  totalAmount       Float?
  
  // Vendor Information
  vendorId          String?
  vendor            Vendor?                @relation(fields: [vendorId], references: [id])
  
  // Recurring Schedule
  frequency         RecurringExpenseFrequency
  startDate         DateTime
  endDate           DateTime?
  dayOfMonth        Int?                  // For monthly: 1-31, or -1 for last day
  occurrenceCount   Int?                  // Total number of occurrences
  
  // Payment Information
  paymentMethod     PaymentMethod?
  budgetId          String?
  
  // Approval Workflow
  approvedById      String?
  approvedByName    String?
  approvedAt        DateTime?
  
  // Tracking
  nextOccurrenceDate DateTime?
  lastGeneratedDate  DateTime?
  totalGenerated     Int                @default(0)
  
  notes             String?
  tags              String[]             @default([])
  
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  
  // Relations
  generatedExpenses Expense[]            @relation("RecurringExpenses")
  
  @@index([nextOccurrenceDate])
  @@index([status])
}

model Budget {
  id                String          @id @default(uuid())
  
  // Basic Information
  name              String
  code              String?         @unique
  description       String?
  status            BudgetStatus    @default(ACTIVE)
  
  // Budget Period
  fiscalYear        Int
  startDate         DateTime
  endDate           DateTime
  
  // Allocation
  allocatedAmount   Float
  currency          String          @default("MYR")
  spentAmount       Float           @default(0)
  remainingAmount   Float           @default(0)
  
  // Categorization
  category          ExpenseCategory?
  departmentId      String?
  
  // Constraints
  alertThreshold    Float           @default(0.8)
  strictLimit       Boolean         @default(false)
  
  // Approval
  approvedById      String?
  approvedByName    String?
  approvedAt        DateTime?
  
  notes             String?
  tags              String[]        @default([])
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  // Relations
  expenses          Expense[]
  
  @@index([fiscalYear])
  @@index([status])
}
```

---

## 2. API Specification

### Endpoints Overview

| Method | Path | Description | Permissions |
|--------|------|-------------|-------------|
| GET | `/api/expenses` | List expenses with filtering | `view_expenses` |
| POST | `/api/expenses` | Create new expense | `manage_expenses` |
| GET | `/api/expenses/:id` | Get expense details | `view_expenses` |
| PUT | `/api/expenses/:id` | Update expense | `manage_expenses` |
| DELETE | `/api/expenses/:id` | Delete expense | `manage_expenses` |
| POST | `/api/expenses/:id/submit` | Submit for approval | `manage_expenses` |
| POST | `/api/expenses/:id/approve` | Approve expense | `approve_expenses` |
| POST | `/api/expenses/:id/reject` | Reject expense | `approve_expenses` |
| POST | `/api/expenses/:id/pay` | Mark as paid | `manage_expenses` |
| GET | `/api/expenses/summary` | Get expense summary stats | `view_expenses` |
| GET | `/api/vendors` | List vendors | `view_expenses` |
| POST | `/api/vendors` | Create vendor | `manage_expenses` |
| GET | `/api/vendors/:id` | Get vendor details | `view_expenses` |
| PUT | `/api/vendors/:id` | Update vendor | `manage_expenses` |
| DELETE | `/api/vendors/:id` | Delete vendor | `manage_expenses` |
| GET | `/api/payments` | List bill payments | `view_payments` |
| POST | `/api/payments` | Create payment | `manage_payments` |
| GET | `/api/recurring-expenses` | List recurring expenses | `view_expenses` |
| POST | `/api/recurring-expenses` | Create recurring expense | `manage_expenses` |
| POST | `/api/recurring-expenses/:id/generate` | Generate next instance | `manage_expenses` |
| GET | `/api/budgets` | List budgets | `view_budgets` |
| POST | `/api/budgets` | Create budget | `manage_budgets` |
| GET | `/api/budgets/:id` | Get budget details | `view_budgets` |
| PUT | `/api/budgets/:id` | Update budget | `manage_budgets` |
| DELETE | `/api/budgets/:id` | Delete budget | `manage_budgets` |

### Validation Schema (Zod)

```typescript
const expenseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional().nullable(),
  category: z.enum(["OPERATIONAL", "ACADEMIC", "STAFF_COSTS", "FOOD_CATERING", 
                    "TRANSPORTATION", "FACILITY", "TECHNOLOGY", "EVENT", 
                    "ADMINISTRATIVE", "OTHER"]),
  amount: z.number().positive(),
  currency: z.string().length(3).default("MYR"),
  taxAmount: z.number().min(0).optional().default(0),
  expenseDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  vendorInvoiceNo: z.string().max(100).optional().nullable(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK", "CREDIT_CARD", 
                        "DEBIT_CARD", "ONLINE_PAYMENT", "WIRE_TRANSFER", "OTHER"])
             .optional().nullable(),
  budgetId: z.string().uuid().optional().nullable(),
  academicYear: z.string().optional().nullable(),
  term: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  attachmentUrls: z.array(z.string().url()).max(10).optional().default([]),
});
```

### Audit Logging Points

```typescript
// EXPENSE_CREATED - When expense is created
// EXPENSE_SUBMITTED - When submitted for approval
// EXPENSE_APPROVED - When approved
// EXPENSE_REJECTED - When rejected
// EXPENSE_PAID - When payment is recorded
// EXPENSE_DELETED - When expense is deleted
// VENDOR_CREATED - When vendor is created
// VENDOR_UPDATED - When vendor is updated
// BUDGET_CREATED - When budget is created
// BUDGET_UPDATED - When budget is updated
```

---

## 3. UI Components

### Component Hierarchy

```
src/pages/expenses/
├── ExpensesDashboard.tsx         # Main dashboard with stats & filters
├── ExpenseList.tsx               # Table of expenses with actions
├── ExpenseNew.tsx                # Create new expense form
├── ExpenseEdit.tsx               # Edit expense form
├── ExpenseDetail.tsx              # Single expense view with history
├── ExpenseApproval.tsx            # Approval queue interface
├── VendorList.tsx                # Vendor management
├── VendorDetail.tsx              # Vendor profile with expense history
├── VendorNew.tsx                 # Create vendor form
├── RecurringExpenses.tsx          # Recurring expense management
├── RecurringExpenseNew.tsx        # Create recurring expense
├── BudgetList.tsx                # Budget overview
├── BudgetDetail.tsx              # Budget details with expense tracking
├── ExpenseReports.tsx            # Reports & analytics
└── components/
    ├── ExpenseForm.tsx           # Reusable expense form
    ├── ExpenseFilters.tsx        # Filter controls
    ├── ExpenseStatsCards.tsx     # Summary statistics cards
    ├── ExpenseStatusBadge.tsx    # Status indicator component
    ├── ApprovalWorkflow.tsx      # Workflow status visualization
    ├── VendorSelect.tsx          # Vendor dropdown with search
    ├── BudgetSelect.tsx          # Budget dropdown
    ├── CategoryBreakdown.tsx     # Category-wise expense chart
    ├── ExpenseTimeline.tsx       # Timeline of expense lifecycle
    └── ExpensePrint.tsx          # Print view for expense
```

### Key Component Interfaces

```typescript
// ExpenseForm
interface ExpenseFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<ExpenseFormData>;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ExpenseList
interface ExpenseListProps {
  filters?: ExpenseFilters;
  onFilterChange?: (filters: ExpenseFilters) => void;
  onExpenseSelect?: (expense: Expense) => void;
  selectable?: boolean;
  showActions?: boolean;
  showApproval?: boolean;
}

// ExpenseStatsCards
interface ExpenseStatsCardsProps {
  period?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  customDateRange?: { start: Date; end: Date };
  filters?: ExpenseFilters;
  onStatClick?: (statKey: string) => void;
}
```

---

## 4. Integration Points

### Permission System Updates

```typescript
// Add to permissions.ts
export type Permission =
  // ... existing permissions ...
  | 'manage_expenses'
  | 'view_expenses'
  | 'approve_expenses'
  | 'manage_budgets'
  | 'view_budgets'
  | 'manage_vendors'
  | 'view_vendors'
  | 'manage_recurring_expenses'
  | 'view_expense_reports'
  | 'export_expenses';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ['manage_all', /* includes all expense permissions */],
  ACCOUNTANT: [
    'manage_expenses',
    'view_expenses',
    'approve_expenses',
    'manage_budgets',
    'view_budgets',
    'manage_vendors',
    'view_vendors',
    'manage_recurring_expenses',
    'view_expense_reports',
    'export_expenses',
  ],
  STAFF: [
    'view_expenses',
    'view_budgets',
  ],
};
```

### Navigation Updates

```typescript
// Add to navigation.ts
export const ADMIN_NAV: AdminNavEntry[] = [
  {
    label: "Finance",
    icon: Wallet,
    items: [
      { title: "Expenses", url: "/expenses", icon: Receipt },
      { title: "Vendors", url: "/vendors", icon: Building2 },
      { title: "Budgets", url: "/budgets", icon: TrendingUp },
      { title: "Fees", url: "/fees", icon: Wallet },
    ],
  },
];

export const ACCOUNTANT_NAV: AdminNavEntry[] = [
  { title: "Dashboard", url: "/accountant/dashboard", icon: LayoutDashboard },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Expense Approvals", url: "/expenses/approvals", icon: CheckCircle },
  { title: "Vendors", url: "/vendors", icon: Building2 },
  { title: "Budgets", url: "/budgets", icon: TrendingUp },
  { title: "Recurring Expenses", url: "/expenses/recurring", icon: RecurringIcon },
];
```

---

## 5. Implementation Sequence

### Phase 1: Backend Foundation (Week 1-2)

**Step 1: Database Schema**
- Add Prisma models to `schema.prisma`
- Run `prisma migrate dev`
- Run `prisma generate`
- Test relationships in Prisma Studio

**Step 2: Zod Schemas**
- Create validation schemas in `server.ts`
- Test validation

**Step 3: Basic CRUD Endpoints**
- Implement expense CRUD
- Implement vendor CRUD
- Test with Postman/curl

**Step 4: Audit Logging**
- Add audit log calls
- Verify entries

**Checkpoint 1**: Can create/read/update/delete expenses via API with validation and audit logging.

### Phase 2: Advanced Backend Features (Week 3)

**Step 5: Approval Workflow**
- Implement submit/approve/reject
- Add status validation
- Test flow

**Step 6: Payment Processing**
- Implement payment recording
- Link payments to expenses
- Generate payment numbers

**Step 7: Budget Tracking**
- Implement budget CRUD
- Add expense-budget linking
- Calculate spent/remaining

**Step 8: Recurring Expenses**
- Create schema/endpoints
- Implement generation logic
- Add background job

**Checkpoint 2**: Full backend including approval, payments, budgets, recurring expenses.

### Phase 3: Frontend Foundation (Week 4)

**Step 9: Setup & Routing**
- Create expense directory structure
- Add routes to App.tsx
- Add navigation items

**Step 10: Core Components**
- Build ExpenseForm
- Build ExpenseList
- Build ExpenseFilters

**Step 11: Dashboard**
- Build ExpensesDashboard
- Build ExpenseStatsCards
- Test with mock data

**Checkpoint 3**: Basic UI with list, form, and dashboard.

### Phase 4: Advanced UI Features (Week 5)

**Step 12: Approval Interface**
- Build approval queue
- Implement actions

**Step 13: Vendor Management**
- Build vendor pages
- Add performance stats

**Step 14: Budget UI**
- Build budget pages
- Add tracking visual

**Step 15: Recurring Expenses UI**
- Build management interface
- Add schedule visualization

**Checkpoint 4**: Complete UI for all features.

### Phase 5: Reports & Integration (Week 6)

**Step 16: Reporting**
- Build expense reports
- Add category/monthly reports

**Step 17: Print/Export**
- Implement PrintLayout
- Add PDF/CSV export

**Step 18: Permission Integration**
- Update permission system
- Add role-based UI
- Test with different roles

**Step 19: File Attachments**
- Implement file upload
- Add preview/deletion

**Checkpoint 5**: Full reporting, export, and permission integration.

### Phase 6: Polish & Testing (Week 7)

**Step 20: Testing**
- Unit tests for critical functions
- Integration tests for API
- E2E tests for workflows
- Performance testing

**Step 21: UI Polish**
- Add loading states
- Error boundaries
- Toast notifications
- Mobile optimization

**Step 22: Documentation**
- Document API endpoints
- Create user guide
- Add code comments

**Checkpoint 6**: Production-ready expense management module.

---

## 6. Critical Files for Implementation

1. **`/prisma/schema.prisma`** - Add all Expense Management models
2. **`/server.ts`** - Add API endpoints, validation schemas, audit logging
3. **`/src/lib/permissions.ts`** - Update with expense permissions
4. **`/src/lib/navigation.ts`** - Add expense routes to navigation
5. **`/src/pages/expenses/ExpensesDashboard.tsx`** - Main dashboard component

---

## Files to Create

**Backend:**
- No separate file - add to `server.ts`

**Frontend Pages:** (16 files)
- `/src/pages/expenses/ExpensesDashboard.tsx`
- `/src/pages/expenses/ExpenseList.tsx`
- `/src/pages/expenses/ExpenseNew.tsx`
- `/src/pages/expenses/ExpenseEdit.tsx`
- `/src/pages/expenses/ExpenseDetail.tsx`
- `/src/pages/expenses/ExpenseApproval.tsx`
- `/src/pages/expenses/VendorList.tsx`
- `/src/pages/expenses/VendorDetail.tsx`
- `/src/pages/expenses/VendorNew.tsx`
- `/src/pages/expenses/RecurringExpenses.tsx`
- `/src/pages/expenses/RecurringExpenseNew.tsx`
- `/src/pages/expenses/BudgetList.tsx`
- `/src/pages/expenses/BudgetDetail.tsx`
- `/src/pages/expenses/ExpenseReports.tsx`
- `/src/pages/expenses/components/ExpenseForm.tsx`
- `/src/pages/expenses/components/ExpenseFilters.tsx`

**Utilities:**
- `/src/lib/api/expenses.ts`

---

## Next Steps

**Option 1**: Start Phase 1 implementation immediately (add Prisma models)
**Option 2**: Review specific components of the plan
**Option 3**: Adjust scope or priorities
**Option 4**: Create additional modules (Student Duties, Donations, etc.)

**Ready to proceed when you are.**
