import assert from 'node:assert/strict';
import test from 'node:test';
import { currentVolunteerMonth, formatVolunteerMonth, validateVolunteerDocumentInput } from '../../shared/volunteerDocuments';

const input = {
  type: 'VOLUNTEER_APPRECIATION_CERTIFICATE', recipientName: ' A Volunteer ', role: 'English tutor',
  fromMonth: '2025-01', toMonth: '2025-06', contributions: 'Supported GED learners.',
  hoursPerWeek: 4, totalHours: 96, signatoryName: 'School Director', signatoryTitle: 'Director',
};

test('volunteer document validation requires honest service months and bounded fields', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  const result = validateVolunteerDocumentInput(input, now);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.recipientName, 'A Volunteer');
  for (const bad of [
    { fromMonth: '2025-13' }, { toMonth: '2024-12' }, { toMonth: '2026-11' },
    { fromMonth: '2025-1' }, { fromMonth: '' }, { toMonth: null }, { type: '__proto__' },
    { recipientName: ' ' }, { recipientName: 'a'.repeat(161) }, { signatoryName: '' }, { recipientName: 'A\u0000B' },
    { hoursPerWeek: 169 }, { hoursPerWeek: '4' }, { totalHours: -1 }, { totalHours: Number.POSITIVE_INFINITY },
    { contributions: 'a'.repeat(1201) }, { organizationSignatoryName: 'A Director' },
  ]) assert.equal(validateVolunteerDocumentInput({ ...input, ...bad }, now).success, false, JSON.stringify(bad));
  assert.equal(validateVolunteerDocumentInput({ ...input, fromMonth: '2026-10', toMonth: '2026-10', hoursPerWeek: null, totalHours: null }, now).success, true);
  assert.equal(currentVolunteerMonth(new Date('2026-09-30T16:00:00Z')), '2026-10');
  assert.equal(formatVolunteerMonth('2025-01'), 'January 2025');
  assert.equal(formatVolunteerMonth('2025-13'), '2025-13');
  assert.equal(validateVolunteerDocumentInput({ ...input, contributions: 'x'.repeat(500) }, now).success, true);
  assert.equal(validateVolunteerDocumentInput({ ...input, contributions: 'x'.repeat(501) }, now).success, false);
  assert.equal(validateVolunteerDocumentInput({ ...input, type: 'VOLUNTEER_APPRECIATION_LETTER', contributions: 'x'.repeat(1200) }, now).success, true);
  assert.equal(validateVolunteerDocumentInput({ ...input, type: 'PART_TIME_VOLUNTEER_CONFIRMATION', contributions: 'x'.repeat(1201) }, now).success, false);
  const normalized = validateVolunteerDocumentInput({ ...input, recipientName: ' A\n\t Volunteer ', organizationSignatoryUserId: 'mro-staff', organizationSignatoryName: ' MRO\n Director ', organizationSignatoryTitle: ' School\t Director ' }, now);
  assert.equal(normalized.success, true);
  if (normalized.success) {
    assert.equal(normalized.data.recipientName, 'A Volunteer');
    assert.equal(normalized.data.organizationSignatoryName, 'MRO Director');
    assert.equal(normalized.data.organizationSignatoryTitle, 'School Director');
  }
});
