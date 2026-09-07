import assert from 'node:assert/strict';
import test from 'node:test';
import { assertIndependentReviewer, paymentPosition, validateMoney } from '../../shared/financeControls';

test('instalments settle an invoice including tax without floating point residuals', () => {
  const invoice = { amount: 0.2, taxAmount: 0.1 };
  assert.deepEqual(paymentPosition(invoice, [{ amount: 0.1 }], 0.2), { amount: 0.2, outstanding: 0.2, status: 'PAID' });
  assert.equal(paymentPosition({ amount: 100, taxAmount: 6 }, [], 40).status, 'PARTIAL');
  assert.equal(paymentPosition({ amount: 100, taxAmount: 6 }, [{ amount: 40 }]).amount, 66);
});
test('reject invalid, fractional-sen and excessive payments', () => {
  for (const value of [NaN, Infinity, -1, 0, 0.001, 1e15]) assert.throws(() => validateMoney(value));
  assert.throws(() => paymentPosition({ amount: 100 }, [{ amount: 80 }], 20.01), /exceeds/);
  assert.throws(() => paymentPosition({ amount: 100 }, [{ amount: 100 }], 1), /fully paid/);
});
test('both the preparer and submitter require independent review', () => {
  assert.throws(() => assertIndependentReviewer('preparer', 'submitter', 'preparer'));
  assert.throws(() => assertIndependentReviewer('submitter', 'submitter', 'preparer'));
  assert.doesNotThrow(() => assertIndependentReviewer('reviewer', 'submitter', 'preparer'));
});
