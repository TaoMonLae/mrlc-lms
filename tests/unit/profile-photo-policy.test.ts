import assert from 'node:assert/strict';
import test from 'node:test';
import { canChangeProfilePhoto } from '../../shared/profilePhotoPolicy';

test('only admins can change a student photo through student or user targets', () => {
  for (const role of ['STUDENT', 'TEACHER', 'STAFF', 'ACCOUNTANT', undefined]) {
    assert.equal(canChangeProfilePhoto(role, 'student'), false);
    assert.equal(canChangeProfilePhoto(role, 'user', true), false);
  }
  assert.equal(canChangeProfilePhoto('STUDENT', 'user'), false);
  assert.equal(canChangeProfilePhoto('ADMIN', 'student'), true);
  assert.equal(canChangeProfilePhoto('ADMIN', 'user', true), true);
  assert.equal(canChangeProfilePhoto('TEACHER', 'teacher'), true);
});
