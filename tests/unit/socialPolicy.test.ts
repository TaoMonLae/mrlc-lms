import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canCurateSocialContent,
  canViewSocialAudience,
  normaliseSocialRetentionDays,
} from '../../shared/socialPolicy';

test('only administrators and teachers can curate snapshots and highlights', () => {
  assert.equal(canCurateSocialContent('ADMIN'), true);
  assert.equal(canCurateSocialContent('TEACHER'), true);
  assert.equal(canCurateSocialContent('STUDENT'), false);
  assert.equal(canCurateSocialContent('STAFF'), false);
});

test('class content is visible only to members of the targeted class', () => {
  assert.equal(canViewSocialAudience({ role: 'STUDENT', audience: 'CLASS', postClassId: 'class-a', viewerClassIds: ['class-a'] }), true);
  assert.equal(canViewSocialAudience({ role: 'STUDENT', audience: 'CLASS', postClassId: 'class-a', viewerClassIds: ['class-b'] }), false);
  assert.equal(canViewSocialAudience({ role: 'TEACHER', audience: 'CLASS', postClassId: 'class-a', viewerClassIds: ['class-a', 'class-b'] }), true);
  assert.equal(canViewSocialAudience({ role: 'TEACHER', audience: 'CLASS', postClassId: 'class-a', viewerClassIds: [] }), false);
  assert.equal(canViewSocialAudience({ role: 'ADMIN', audience: 'CLASS', postClassId: 'class-a', viewerClassIds: [] }), true);
});

test('staff-only content excludes students and public school content remains visible', () => {
  assert.equal(canViewSocialAudience({ role: 'STUDENT', audience: 'STAFF' }), false);
  assert.equal(canViewSocialAudience({ role: 'TEACHER', audience: 'STAFF' }), true);
  assert.equal(canViewSocialAudience({ role: 'LIBRARIAN', audience: 'STAFF' }), true);
  assert.equal(canViewSocialAudience({ role: 'STUDENT', audience: 'SCHOOL' }), true);
});

test('retention preserves 24-hour posts and caps curated content at 90 days', () => {
  assert.equal(normaliseSocialRetentionDays('POST', 90), 1);
  assert.equal(normaliseSocialRetentionDays('CLASS_SNAPSHOT', undefined), 30);
  assert.equal(normaliseSocialRetentionDays('VIDEO_HIGHLIGHT', undefined), 7);
  assert.equal(normaliseSocialRetentionDays('CLASS_SNAPSHOT', 200), 90);
  assert.equal(normaliseSocialRetentionDays('VIDEO_HIGHLIGHT', 0), 1);
});
