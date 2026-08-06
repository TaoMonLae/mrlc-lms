import assert from "node:assert/strict";
import test from "node:test";
import { inferStudentCardExpiry } from "../../shared/studentCardValidity";

test("uses the end year from an academic-year range", () => {
  const expiry = inferStudentCardExpiry("2026-2027", new Date("2026-08-06T00:00:00.000Z"));
  assert.equal(expiry.toISOString(), "2027-07-31T15:59:59.999Z");
});

test("does not issue an already-expired card when class data is stale", () => {
  const expiry = inferStudentCardExpiry("2025-2026", new Date("2026-08-06T00:00:00.000Z"));
  assert.equal(expiry.toISOString(), "2027-07-31T15:59:59.999Z");
});

test("falls back to the next July boundary when the academic year is missing", () => {
  const expiry = inferStudentCardExpiry(null, new Date("2026-08-06T00:00:00.000Z"));
  assert.equal(expiry.toISOString(), "2027-07-31T15:59:59.999Z");
});
