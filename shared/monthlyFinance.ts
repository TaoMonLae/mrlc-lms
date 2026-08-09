export type DateValue = Date | string;

export interface FeeCollectionInput {
  paymentDate: DateValue;
  amount: number;
}

export interface DonationInput {
  donationDate: DateValue;
  amount: number;
}

export interface ExpensePaymentInput {
  paymentDate: DateValue;
  amount: number;
  expense: { category: string };
}

export interface MonthlyFinanceRow {
  month: number;
  year: number;
  inflow: { total: number; fees: number; donations: number };
  outflow: { total: number; byCategory: Record<string, number> };
  netFlow: number;
  cumulative: number;
}

function isInUtcMonth(value: DateValue, year: number, monthIndex: number) {
  const timestamp = new Date(value).getTime();
  return timestamp >= Date.UTC(year, monthIndex, 1) && timestamp < Date.UTC(year, monthIndex + 1, 1);
}

export function buildMonthlyFinanceRows(
  year: number,
  feeCollections: FeeCollectionInput[],
  donations: DonationInput[],
  expensePayments: ExpensePaymentInput[],
): MonthlyFinanceRow[] {
  let cumulative = 0;

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const fees = feeCollections
      .filter((payment) => isInUtcMonth(payment.paymentDate, year, monthIndex))
      .reduce((sum, payment) => sum + payment.amount, 0);
    const donationIncome = donations
      .filter((donation) => isInUtcMonth(donation.donationDate, year, monthIndex))
      .reduce((sum, donation) => sum + donation.amount, 0);
    const monthlyExpenses = expensePayments.filter((payment) => isInUtcMonth(payment.paymentDate, year, monthIndex));
    const expenseTotal = monthlyExpenses.reduce((sum, payment) => sum + payment.amount, 0);
    const incomeTotal = fees + donationIncome;
    const netFlow = incomeTotal - expenseTotal;
    cumulative += netFlow;

    return {
      month: monthIndex + 1,
      year,
      inflow: { total: incomeTotal, fees, donations: donationIncome },
      outflow: {
        total: expenseTotal,
        byCategory: monthlyExpenses.reduce<Record<string, number>>((categories, payment) => {
          const category = payment.expense.category;
          categories[category] = (categories[category] || 0) + payment.amount;
          return categories;
        }, {}),
      },
      netFlow,
      cumulative,
    };
  });
}
