// Extracted from server.ts. Route order is preserved: registerFinancialReportRoutes is called where these routes used to be registered.
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { ReportRangeError, resolveUtcReportRange, sumOutstandingFeeBalance, sumExpenseGrossAmounts } from "./shared/financialReports";
import { buildMonthlyFinanceRows } from "./shared/monthlyFinance";
import type { JwtPayload, authMiddleware, logger } from "./server";

export type FinancialReportRoutesContext = {
  authMiddleware: typeof authMiddleware;
  expenseCanView: (role: string) => boolean;
  logger: typeof logger;
  prisma: PrismaClient;
};

export function registerFinancialReportRoutes(app: Express, ctx: FinancialReportRoutesContext) {
  const { authMiddleware, expenseCanView, logger, prisma } = ctx;

  // ---- Financial Reports ----
  app.get("/api/financial-reports/summary", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const currency = String(req.query.currency || (await prisma.schoolProfile.findFirst())?.currency || 'MYR').toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw new ReportRangeError('currency must be a three-letter code');
      const { startDate, endDate, fiscalYear, year: yearParam } = req.query;

      // Determine date range (accept both `fiscalYear` and `year` for the year shortcut)
      const dateFilter = resolveUtcReportRange(
        startDate as string | undefined,
        endDate as string | undefined,
        (fiscalYear || yearParam) as string | undefined
      );

      // Count dated cash receipts rather than FeePayment.paidAmount. A fee
      // charge can be paid in several months; its paidAmount is cumulative
      // and paidDate only represents the latest receipt.
      const feeCollections = await prisma.feeCollection.aggregate({
        where: {
          paymentDate: dateFilter, currency,
          feePayment: { status: { not: 'WAIVED' } },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get donations (income)
      const donations = await prisma.donation.aggregate({
        where: {
          OR: [{ receivedDate: dateFilter }, { receivedDate: null, donationDate: dateFilter }], currency,
          status: { in: ['RECEIVED', 'PROCESSED'] },
          donationType: { not: 'IN_KIND' },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get actual cash outflows from bill payments, not invoice dates. A
      // PARTIAL expense may only have some money paid out, and an APPROVED
      // expense may have none.
      const billPayments = await prisma.billPayment.aggregate({
        where: {
          paymentDate: dateFilter, currency,
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get budget summary — a budget belongs to the period if its window
      // overlaps it (starts before the period ends AND ends after it starts).
      // The old OR filter missed budgets that span the entire period.
      const budgets = await prisma.budget.findMany({
        where: {
          currency,
          startDate: { lte: dateFilter.lte },
          endDate: { gte: dateFilter.gte },
        },
      });

      const totalBudget = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
      const totalBudgetSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);

      // Get outstanding fees. Includes PARTIAL charges, and nets out
      // paidAmount so the outstanding figure is the real remaining balance
      // (for PENDING/OVERDUE, paidAmount is 0, so this is unchanged there).
      const outstandingFees = await prisma.feePayment.findMany({
        where: {
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
          dueDate: dateFilter, currency,
        },
        select: { amount: true, paidAmount: true },
      });
      const outstandingBalance = sumOutstandingFeeBalance(outstandingFees);

      // Pending commitments belong to the selected reporting period and use
      // gross invoice value so tax is not silently omitted.
      const pendingExpenses = await prisma.expense.findMany({
        where: {
          status: { in: ['DRAFT', 'PENDING_APPROVAL'] },
          expenseDate: dateFilter, currency,
        },
        select: { amount: true, taxAmount: true },
      });

      const totalIncome = (feeCollections._sum.amount || 0) + (donations._sum.amount || 0);
      const totalExpenses = billPayments._sum.amount || 0;
      const netCashFlow = totalIncome - totalExpenses;

      res.json({
        currency,
        period: {
          startDate: dateFilter.gte,
          endDate: dateFilter.lte,
        },
        income: {
          total: totalIncome,
          fees: feeCollections._sum.amount || 0,
          donations: donations._sum.amount || 0,
          feePayments: feeCollections._count,
          donationCount: donations._count,
        },
        expenses: {
          total: totalExpenses,
          paidExpenses: billPayments._count,
          pendingAmount: sumExpenseGrossAmounts(pendingExpenses),
          pendingCount: pendingExpenses.length,
        },
        budget: {
          total: totalBudget,
          spent: totalBudgetSpent,
          remaining: totalBudget - totalBudgetSpent,
          utilization: totalBudget > 0 ? (totalBudgetSpent / totalBudget) * 100 : 0,
        },
        cashFlow: {
          net: netCashFlow,
          positive: netCashFlow >= 0,
        },
        accountsReceivable: {
          outstanding: outstandingBalance,
          count: outstandingFees.length,
        },
      });
    } catch (error: any) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error?.code === "P2007" || error?.code === "P2021" || error?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error generating financial summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/financial-reports/income-expense", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const currency = String(req.query.currency || (await prisma.schoolProfile.findFirst())?.currency || 'MYR').toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw new ReportRangeError('currency must be a three-letter code');
      const { startDate, endDate, groupBy = 'month' } = req.query;

      const dateFilter = resolveUtcReportRange(
        startDate as string | undefined,
        endDate as string | undefined
      );

      const donationsByPeriod = await prisma.donation.groupBy({
        by: groupBy === 'month' ? ['donationDate'] : ['donationDate'],
        where: {
          OR: [{ receivedDate: dateFilter }, { receivedDate: null, donationDate: dateFilter }], currency,
          status: { in: ['RECEIVED', 'PROCESSED'] },
          donationType: { not: 'IN_KIND' },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get actual expense cash movements by bill payment. This keeps
      // partial payments from being reported as if the full invoice was paid.
      const billPaymentDetails = await prisma.billPayment.findMany({
        where: {
          paymentDate: dateFilter, currency,
        },
        select: {
          amount: true,
          paymentDate: true,
          referenceNumber: true,
          paymentMethod: true,
          expense: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              vendorInvoiceNo: true,
              vendor: { select: { name: true } },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      });
      const expensesByCategory = Array.from(
        billPaymentDetails.reduce((map, payment) => {
          const category = payment.expense.category;
          const current = map.get(category) || { category, amount: 0, count: 0 };
          current.amount += payment.amount;
          current.count += 1;
          map.set(category, current);
          return map;
        }, new Map<string, { category: string; amount: number; count: number }>()).values()
      ).map((entry) => ({
        category: entry.category,
        _sum: { amount: entry.amount },
        _count: entry.count,
      }));

      // Line-item detail behind the aggregates above -- the report used to
      // only show totals by source/category, which isn't enough to actually
      // audit a period; these feed the "detailed" transaction tables in the
      // Income & Expense Report.
      const [feeCollectionDetails, donationDetails, expenseDetails] = await Promise.all([
        prisma.feeCollection.findMany({
          where: { paymentDate: dateFilter, currency, feePayment: { status: { not: 'WAIVED' } } },
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            reference: true,
            feePayment: {
              select: {
                receiptNumber: true,
                student: {
                  select: {
                    studentCode: true,
                    preferredName: true,
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        }),
        prisma.donation.findMany({
          where: { OR: [{ receivedDate: dateFilter }, { receivedDate: null, donationDate: dateFilter }], currency, status: { in: ['RECEIVED', 'PROCESSED'] }, donationType: { not: 'IN_KIND' } },
          select: {
            id: true,
            amount: true,
            donationDate: true,
          receivedDate: true,
            donationNumber: true,
            paymentMethod: true,
            donor: { select: { name: true, donorCode: true } },
            campaign: { select: { name: true } },
          },
          orderBy: { donationDate: 'desc' },
        }),
        Promise.resolve(billPaymentDetails),
      ]);

      const studentLabel = (s: (typeof feeCollectionDetails)[number]['feePayment']['student']) =>
        s.preferredName || (s.user ? `${s.user.firstName} ${s.user.lastName}` : s.studentCode);

      const incomeDetail = [
        ...feeCollectionDetails.map((p) => ({
          date: p.paymentDate,
          type: 'Fee Payment' as const,
          description: `Fee payment — ${studentLabel(p.feePayment.student)}`,
          reference: p.reference || p.feePayment.receiptNumber || null,
          paymentMethod: p.paymentMethod || null,
          amount: p.amount,
        })),
        ...donationDetails.map((d) => ({
          date: d.receivedDate || d.donationDate,
          type: 'Donation' as const,
          description: `Donation — ${d.donor.name}${d.campaign ? ` (${d.campaign.name})` : ''}`,
          reference: d.donationNumber,
          paymentMethod: d.paymentMethod || null,
          amount: d.amount,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const expenseDetail = expenseDetails.map((payment) => ({
        date: payment.paymentDate,
        title: payment.expense.title,
        category: payment.expense.category,
        status: payment.expense.status,
        vendor: payment.expense.vendor?.name || null,
        reference: payment.referenceNumber || payment.expense.vendorInvoiceNo || null,
        amount: payment.amount,
      }));

      // Calculate totals
      const feeIncome = feeCollectionDetails.reduce((sum, payment) => sum + payment.amount, 0);
      const totalIncome = (feeIncome +
                           donationsByPeriod.reduce((sum, p) => sum + (p._sum.amount || 0), 0));
      const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + (cat._sum.amount || 0), 0);
      const netSurplus = totalIncome - totalExpenses;

      res.json({
        currency,
        period: {
          startDate: dateFilter.gte,
          endDate: dateFilter.lte,
          groupBy,
        },
        income: {
          total: totalIncome,
          bySource: {
            fees: feeIncome,
            donations: donationsByPeriod.reduce((sum, p) => sum + (p._sum.amount || 0), 0),
          },
          detail: incomeDetail,
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory.map(cat => ({
            category: cat.category,
            amount: cat._sum.amount || 0,
            count: cat._count,
            percentage: totalExpenses > 0 ? ((cat._sum.amount || 0) / totalExpenses) * 100 : 0,
          })),
          detail: expenseDetail,
        },
        summary: {
          netSurplus,
          surplusRatio: totalIncome > 0 ? (netSurplus / totalIncome) * 100 : 0,
        },
      });
    } catch (error: any) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error?.code === "P2007" || error?.code === "P2021" || error?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error generating income-expense report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/financial-reports/budget-vs-actual", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const currency = String(req.query.currency || (await prisma.schoolProfile.findFirst())?.currency || 'MYR').toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw new ReportRangeError('currency must be a three-letter code');
      const { budgetId, fiscalYear } = req.query;

      let where: any = { currency };
      if (budgetId) {
        where.id = budgetId;
      } else if (fiscalYear) {
        where.fiscalYear = resolveUtcReportRange(undefined, undefined, String(fiscalYear)).gte.getUTCFullYear();
      } else {
        // Default to current year budgets
        where.fiscalYear = new Date().getFullYear();
      }

      const budgets = await prisma.budget.findMany({
        where,
        include: {
          expenses: {
            where: { status: { in: ['APPROVED', 'PAID', 'PARTIAL'] } },
          },
          feeItems: true,
        },
      });

      const budgetComparison = budgets.map(budget => {
        const actualExpenses = sumExpenseGrossAmounts(budget.expenses);
        const variance = budget.allocatedAmount - actualExpenses;
        const variancePercent = budget.allocatedAmount > 0 ? (variance / budget.allocatedAmount) * 100 : 0;

        return {
          id: budget.id,
          name: budget.name,
          code: budget.code,
          category: budget.category,
          fiscalYear: budget.fiscalYear,
          budget: {
            allocated: budget.allocatedAmount,
            spent: budget.spentAmount,
            remaining: budget.remainingAmount,
          },
          actual: {
            expenses: actualExpenses,
          },
          variance: {
            amount: variance,
            percentage: variancePercent,
            favorable: variance >= 0,
          },
          status: budget.status,
          utilization: budget.allocatedAmount > 0 ? (actualExpenses / budget.allocatedAmount) * 100 : 0,
        };
      });

      const totals = budgetComparison.reduce((acc, budget) => ({
        allocated: acc.allocated + budget.budget.allocated,
        spent: acc.spent + budget.budget.spent,
        actualExpenses: acc.actualExpenses + budget.actual.expenses,
        variance: acc.variance + budget.variance.amount,
      }), { allocated: 0, spent: 0, actualExpenses: 0, variance: 0 });

      res.json({
        currency,
        budgets: budgetComparison,
        summary: {
          totalAllocated: totals.allocated,
          totalSpent: totals.spent,
          totalActualExpenses: totals.actualExpenses,
          totalVariance: totals.variance,
          overallUtilization: totals.allocated > 0 ? (totals.actualExpenses / totals.allocated) * 100 : 0,
        },
      });
    } catch (error: any) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error?.code === "P2007" || error?.code === "P2021" || error?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error generating budget vs actual report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/financial-reports/cash-flow", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!expenseCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const currency = String(req.query.currency || (await prisma.schoolProfile.findFirst())?.currency || 'MYR').toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw new ReportRangeError('currency must be a three-letter code');
      const { startDate, endDate } = req.query;

      const dateFilter = resolveUtcReportRange(
        startDate as string | undefined,
        endDate as string | undefined
      );

      // Cash inflows
      const feeInflows = await prisma.feeCollection.findMany({
        where: {
          paymentDate: dateFilter, currency,
          feePayment: { status: { not: 'WAIVED' } },
        },
        select: {
          paymentDate: true,
          amount: true,
          paymentMethod: true,
        },
      });

      const donationInflows = await prisma.donation.findMany({
        where: {
          OR: [{ receivedDate: dateFilter }, { receivedDate: null, donationDate: dateFilter }], currency,
          status: { in: ['RECEIVED', 'PROCESSED'] },
          donationType: { not: 'IN_KIND' },
        },
        select: {
          donationDate: true,
          receivedDate: true,
          amount: true,
          paymentMethod: true,
        },
      });

      // Cash outflows are actual bill payments. Using expenseDate/amount here
      // overstated partial payments and placed cash movement in the wrong month.
      const expenseOutflows = await prisma.billPayment.findMany({
        where: {
          paymentDate: dateFilter, currency,
        },
        select: {
          paymentDate: true,
          amount: true,
          expense: { select: { category: true } },
          paymentMethod: true,
        },
      });

      // Use the UTC year of the range start. The old code did
      // `new Date(dateFilter.gte).setMonth(i)` which (a) shifted to the
      // previous year in negative-UTC-offset timezones ("2026-01-01" parses to
      // Dec 31 local) and (b) skipped months via day-of-month overflow when the
      // start day was the 29th–31st.
      const reportYear = dateFilter.gte.getUTCFullYear();
      let carry = 0;
      const monthlyCashFlow = Array.from({ length: dateFilter.lte.getUTCFullYear() - reportYear + 1 }, (_, i) => reportYear + i)
        .flatMap(year => buildMonthlyFinanceRows(year, feeInflows, donationInflows.map(d => ({ ...d, donationDate: d.receivedDate || d.donationDate })), expenseOutflows))
        .filter(row => Date.UTC(row.year, row.month, 1) > dateFilter.gte.getTime() && Date.UTC(row.year, row.month - 1, 1) <= dateFilter.lte.getTime())
        .map(row => ({ ...row, cumulative: (carry = Math.round((carry + row.netFlow) * 100) / 100) }));

      const totalInflow = feeInflows.reduce((sum, f) => sum + f.amount, 0) +
                         donationInflows.reduce((sum, d) => sum + d.amount, 0);
      const totalOutflow = expenseOutflows.reduce((sum, e) => sum + e.amount, 0);
      const netCashFlow = totalInflow - totalOutflow;

      res.json({
        currency,
        period: {
          startDate: dateFilter.gte,
          endDate: dateFilter.lte,
        },
        monthlyCashFlow,
        summary: {
          totalInflow,
          totalOutflow,
          netCashFlow,
          averageMonthlyFlow: monthlyCashFlow.length ? netCashFlow / monthlyCashFlow.length : 0,
          basis: "Cash movement; excludes in-kind donations; no opening bank balance",
          endingBalance: monthlyCashFlow.length > 0 ?
            monthlyCashFlow[monthlyCashFlow.length - 1].cumulative : 0,
        },
      });
    } catch (error: any) {
      if (error instanceof ReportRangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error?.code === "P2007" || error?.code === "P2021" || error?.code === "P2022") {
        res.status(503).json({ error: "Database is out of date — run `npx prisma migrate deploy` then restart the server." });
        return;
      }
      logger.error("Error generating cash flow report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
