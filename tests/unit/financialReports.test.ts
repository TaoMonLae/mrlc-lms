import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ReportRangeError,
  resolveUtcReportRange,
  sumExpenseGrossAmounts,
  sumOutstandingFeeBalance,
} from '../../shared/financialReports';

test('financial totals include tax and never report negative receivables', () => {
  assert.equal(sumExpenseGrossAmounts([
    { amount: 100, taxAmount: 6 },
    { amount: 40, taxAmount: null },
  ]), 146);

  assert.equal(sumOutstandingFeeBalance([
    { amount: 100, paidAmount: 35 },
    { amount: 50, paidAmount: 75 },
  ]), 65);
});

test('report ranges include the full final UTC day', () => {
  const range = resolveUtcReportRange('2026-02-01', '2026-02-28');
  assert.equal(range.gte.toISOString(), '2026-02-01T00:00:00.000Z');
  assert.equal(range.lte.toISOString(), '2026-02-28T23:59:59.999Z');
});

test('report ranges reject partial, reversed, and invalid periods', () => {
  assert.throws(() => resolveUtcReportRange('2026-01-01'), ReportRangeError);
  assert.throws(() => resolveUtcReportRange('2026-03-01', '2026-02-01'), ReportRangeError);
  assert.throws(() => resolveUtcReportRange('2026-02-31', '2026-03-05'), ReportRangeError);
  assert.throws(() => resolveUtcReportRange('2026-01-01T10:00:00Z', '2026-01-02'), ReportRangeError);
  assert.throws(() => resolveUtcReportRange(undefined, undefined, 'twenty-six'), ReportRangeError);
});
