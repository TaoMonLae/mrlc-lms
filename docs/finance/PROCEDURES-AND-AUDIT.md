# Finance review — 7 September 2026

Scope: school fees, expense preparation/review/payment, donations/campaigns, budgets, finance reports, shared workspace navigation and operational guidance. These changes improve controls; they are not a certification of statutory or donor compliance. This is a Malaysian school/community application. UK school and charity guidance below is a control reference, not Malaysian law.

## Corrected defects

- Concurrent full payments and instalments could duplicate cash records or exceed an invoice. Serializable transactions now check the balance, create the receipt, update the expense, and write the audit event together. Conflicts retry only rolled-back database transactions.
- Fee top-ups could lose a balance update, overcollect, or silently clip the entered amount. Collections now use a serializable transaction and reject overpayments.
- Expense preparation/submission and approval were not separated. Both the submitter and the recorded creator are excluded from review; another finance officer is required.
- Concurrent strict-budget approvals could overcommit funds. Approval and commitment totals now update together, including tax, budget dates and matching currency.
- Posted bill payments could be overwritten or deleted. They now remain as source evidence. Fees with receipts cannot be voided to erase historic cash income. Received donations cannot be deleted or rewritten as refunds without a separate accounting adjustment.
- Donation creation used row counts for unique references and updated campaign totals outside the transaction. References are collision-resistant; campaign totals use received cash gifts and distinct donors in a transaction.
- Cash reports counted in-kind gifts, mixed currencies, used pledge dates even when receipt dates existed, and lost later years from multi-year charts. Reports now use one currency, exclude in-kind gifts, prefer received dates, and carry the net movement through all months in the range.
- Donations defaulted to tax-deductible. New gifts now default to false; in-kind gifts cannot receive a cash tax receipt. The migration changes only the default, not historic eligibility decisions.
- Expense update accepted a null amount and could store zero while calculating a different total. Null amounts are rejected. Draft edits/submission/deletion compare the current state at write time.
- Browser prompts prevented a useful instalment/evidence workflow. The expense page now has labelled payment/rejection forms, useful API errors, payment totals, and partial-payment actions.
- Donation and budget list fetches treated API errors as arrays. Non-success responses are now handled before rendering.

## Operating procedure

1. Record source evidence and purpose. Keep student fee support decisions private. Include the reason and authorisation reference for discounts/scholarships.
2. Submit invoices for review. A different officer checks evidence, conflicts of interest, donor purpose, period, currency and budget before approving.
3. Record money actually paid, including partial payments. Retain the date, paying account/cash box and bank/receipt reference. The app records payments; it does not initiate a bank transfer.
4. Track pledges separately. Mark actual gifts received and record the receipt date. Keep donor restrictions in designation and the signed agreement. Never assume NGO/refugee-school status implies tax approval.
5. Reconcile bank statements and cash counts monthly. Investigate differences. Keep a restricted-fund schedule and review budget-versus-actual reports. Have a second officer sign the reconciliation.
6. Preserve source documents and dated reports under the organisation's retention policy; limit donor and student personal data in shared reports.

## Remaining accounting and policy requirements

The app does not implement a double-entry general ledger, bank-statement reconciliation, opening balances, restricted-fund balances/transfers, immutable period close, refund/reversal journals, delegated approval thresholds, or procurement tender workflows. Continue those controls in the organisation's accounting records. Do not treat a campaign as a fund ledger, or cumulative net cash movement as a bank balance. Posted corrections/refunds need a finance officer and an external documented journal until adjustment workflows are implemented. The app currently blocks destructive shortcuts instead of manufacturing a refund.

The existing payroll module was not redesigned or certified by this change. Tax receipts still require independent verification of the organisation's actual LHDN approval, approval period and gift eligibility; the app does not verify LHDN status. Existing legacy records and campaign/budget cached totals should be reconciled before relying on them; this change does not rewrite history automatically. UTC report boundaries are explicit; Malaysian local-date reporting may require an agreed policy for timestamped imports.

## Deployment and verification

Run `npx prisma migrate deploy` and regenerate the Prisma client in the deployment workflow for the donation default change. No production database was changed by this task.

Transaction tests are opt-in and only accept FINANCE_TEST_DATABASE_URL on 127.0.0.1:55439. Use a disposable PostgreSQL cluster, apply the schema, then run `node --import tsx --test tests/integration/finance.test.ts`. Synthetic browser fixtures are generated by scripts/finance-test-fixtures.ts and used by tests/finance.playwright.config.ts on port 8017. They never default to DATABASE_URL.

## References and their bounded use

- [UNHCR Programme Handbook for Partners](https://www.unhcr.org/media/unhcr-programme-handbook-partners): programme expenditure should be accurate, reconcile to accounting records, follow intended purposes and be supported by internal controls.
- [UNHCR internal control assessment](https://www.unhcr.org/handbooks/programme-partnerhub/unhcr-programme-handbook-partners/plan-results/plan-section-8-partnership-engagement): governance, accounting, reporting and procurement are assessed together, beyond software.
- [Charity Commission CC8](https://www.gov.uk/government/publications/internal-financial-controls-for-charities-cc8/internal-financial-controls-for-charities): separation of duties, records, reconciliation and distinct restricted funds. Applies to England/Wales; used here as a control reference.
- [Schools financial value standard guidance](https://www.gov.uk/government/publications/schools-financial-value-standard/schools-financial-value-standard-sfvs-checklist-guidance): budget oversight, transparent purchasing and transaction records. Applies to England; used as a school control reference.
- [LHDN individual FAQ](https://www.hasil.gov.my/en/individual/others/frequently-asked-question-individual/): donation deductions depend on relevant approval and documentation. Verify current applicability with the organisation's finance adviser.

## Verification result

- TypeScript check and production build: passed.
- Complete unit suite: 273 passed.
- PostgreSQL integration: five scenarios passed (six runner entries including the parent test), covering duplicate full payments, competing instalments, independent review, strict-budget contention, and competing fee collections.
- Live API/browser: five tests passed, covering cash basis, receipt-date recognition, mixed currency exclusion, cross-year chart totals, denied student access, invalid periods, donation defaults, desktop/mobile instalment entry and overview accessibility. Dark theme was included.
- Screenshots: outputs/finance-audit. Evidence uses synthetic data.
