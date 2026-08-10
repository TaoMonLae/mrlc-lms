import assert from "node:assert/strict";
import test from "node:test";
import { inferStudentCardExpiry, personnelCardStatus } from "../../shared/studentCardValidity";

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

test("personnelCardStatus: an inactive holder is always INACTIVE, regardless of expiry", () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
  assert.equal(personnelCardStatus("INACTIVE", future), "INACTIVE");
  assert.equal(personnelCardStatus("INACTIVE", null), "INACTIVE");
});

test("personnelCardStatus: an active holder with a future expiry is ACTIVE", () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  assert.equal(personnelCardStatus("ACTIVE", future), "ACTIVE");
});

test("personnelCardStatus: an active holder past their card's expiry date is EXPIRED, not ACTIVE", () => {
  // Regression test: the personnel card PDF used to pass the raw holder
  // status straight through, so an expired-but-still-employed teacher's card
  // printed a green "ACTIVE" badge instead of "EXPIRED".
  const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  assert.equal(personnelCardStatus("ACTIVE", past), "EXPIRED");
});

test("personnelCardStatus: an active holder with no expiry date fails closed to EXPIRED", () => {
  assert.equal(personnelCardStatus("ACTIVE", null), "EXPIRED");
  assert.equal(personnelCardStatus("ACTIVE", undefined), "EXPIRED");
});
