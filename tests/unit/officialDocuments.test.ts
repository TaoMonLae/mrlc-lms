import assert from 'node:assert/strict';
import test from 'node:test';
import {
  officialDocumentBackPath,
  officialDocumentLabel,
  officialDocumentViewPath,
} from '../../shared/officialDocuments';

test('student ID cards use their dedicated CR80 view', () => {
  assert.equal(
    officialDocumentViewPath({ id: 'card/id 1', type: 'STUDENT_ID_CARD' }),
    '/documents/card%2Fid%201/id-card',
  );
});

test('other official documents use the standard print view', () => {
  assert.equal(
    officialDocumentViewPath({ id: 'report-1', type: 'REPORT_CARD' }),
    '/documents/report-1/print',
  );
});

test('document labels include student cards and safely format unknown types', () => {
  assert.equal(officialDocumentLabel('STUDENT_ID_CARD'), 'Student ID Card');
  assert.equal(officialDocumentLabel('CUSTOM_LETTER'), 'CUSTOM LETTER');
});

test('students return to their profile while staff return to document management', () => {
  assert.equal(officialDocumentBackPath('STUDENT'), '/student/profile');
  assert.equal(officialDocumentBackPath('TEACHER'), '/documents');
  assert.equal(officialDocumentBackPath('ADMIN'), '/documents');
});
