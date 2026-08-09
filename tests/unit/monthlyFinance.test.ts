import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlyFinanceRows } from "../../shared/monthlyFinance";

test("fee instalments stay in the month each collection was received", () => {
  const rows = buildMonthlyFinanceRows(
    2026,
    [
      { amount: 100, paymentDate: "2026-01-15T10:00:00.000Z" },
      { amount: 50, paymentDate: "2026-02-05T10:00:00.000Z" },
    ],
    [],
    [],
  );

  assert.equal(rows[0].inflow.fees, 100);
  assert.equal(rows[1].inflow.fees, 50);
  assert.equal(rows[1].cumulative, 150);
});

test("income and paid expenses are grouped separately with expense categories", () => {
  const rows = buildMonthlyFinanceRows(
    2026,
    [{ amount: 800, paymentDate: "2026-03-01T00:00:00.000Z" }],
    [{ amount: 200, donationDate: "2026-03-31T23:59:59.999Z" }],
    [
      { amount: 300, paymentDate: "2026-03-10T12:00:00.000Z", expense: { category: "FACILITY" } },
      { amount: 50, paymentDate: "2026-03-11T12:00:00.000Z", expense: { category: "FACILITY" } },
      { amount: 25, paymentDate: "2026-03-12T12:00:00.000Z", expense: { category: "OTHER" } },
    ],
  );

  assert.deepEqual(rows[2].inflow, { total: 1000, fees: 800, donations: 200 });
  assert.deepEqual(rows[2].outflow, { total: 375, byCategory: { FACILITY: 350, OTHER: 25 } });
  assert.equal(rows[2].netFlow, 625);
  assert.equal(rows[2].cumulative, 625);
});

test("UTC month boundaries do not leak into adjacent years", () => {
  const rows = buildMonthlyFinanceRows(
    2026,
    [
      { amount: 10, paymentDate: "2025-12-31T23:59:59.999Z" },
      { amount: 20, paymentDate: "2026-01-01T00:00:00.000Z" },
      { amount: 30, paymentDate: "2027-01-01T00:00:00.000Z" },
    ],
    [],
    [],
  );

  assert.equal(rows[0].inflow.fees, 20);
  assert.equal(rows.reduce((sum, row) => sum + row.inflow.fees, 0), 20);
});
