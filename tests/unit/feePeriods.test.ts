import assert from 'node:assert/strict';
import test from 'node:test';
import {
  feeMonthLabel,
  feeMonthOptions,
  feeMonthRange,
  feeYearRange,
  normalizeFeeMonth,
} from '../../shared/feePeriods';

test('fee months accept only canonical YYYY-MM values', () => {
  assert.equal(normalizeFeeMonth('2026-07'), '2026-07');
  assert.equal(normalizeFeeMonth(' 2026-07 '), '2026-07');
  assert.equal(normalizeFeeMonth('2026-7'), null);
  assert.equal(normalizeFeeMonth('2026-13'), null);
  assert.equal(normalizeFeeMonth(undefined), null);
});

test('fee month ranges are UTC, exclusive, and safe across leap years', () => {
  const february = feeMonthRange('2028-02');
  assert.equal(february?.start.toISOString(), '2028-02-01T00:00:00.000Z');
  assert.equal(february?.endExclusive.toISOString(), '2028-03-01T00:00:00.000Z');

  const december = feeMonthRange('2026-12');
  assert.equal(december?.endExclusive.toISOString(), '2027-01-01T00:00:00.000Z');
});

test('fee year ranges validate bounds and include the complete year', () => {
  assert.deepEqual(
    Object.values(feeYearRange('2026') ?? {}).map((date) => date.toISOString()),
    ['2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'],
  );
  assert.equal(feeYearRange('not-a-year'), null);
  assert.equal(feeYearRange(1999), null);
});

test('fee month options cross year boundaries without skipping months', () => {
  const options = feeMonthOptions(new Date(2026, 0, 15), 2, 1, 'en-US');
  assert.deepEqual(options.map((option) => option.value), ['2026-01', '2025-12', '2025-11', '2026-02']);
  assert.equal(feeMonthLabel('2026-07', 'en-US'), 'July 2026');
});
