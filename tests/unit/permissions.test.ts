import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSIONS,
  USER_ROLES,
  roleHasPermission,
  rolesWithPermission,
} from '../../shared/permissions';

test('the permission registry contains every supported database role', () => {
  assert.deepEqual(Object.keys(ROLE_PERMISSIONS).sort(), [...USER_ROLES].sort());
});

test('role permission lists are valid and contain no duplicates', () => {
  const known = new Set(PERMISSIONS);
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    assert.equal(new Set(permissions).size, permissions.length, `${role} contains duplicate permissions`);
    for (const permission of permissions) assert.ok(known.has(permission), `${role} contains unknown permission ${permission}`);
  }
});

test('permission categories use only registered permissions', () => {
  const known = new Set(PERMISSIONS);
  for (const permissions of Object.values(PERMISSION_CATEGORIES)) {
    for (const permission of permissions) assert.ok(known.has(permission));
  }
});

test('administrator inherits all permissions while student access remains restricted', () => {
  for (const permission of PERMISSIONS) assert.equal(roleHasPermission('ADMIN', permission), true);
  assert.equal(roleHasPermission('STUDENT', 'manage_users'), false);
  assert.equal(roleHasPermission('STUDENT', 'view_own_results'), true);
});

test('operational role capabilities come from the same registry', () => {
  assert.equal(roleHasPermission('TEACHER', 'manage_ebooks'), true);
  assert.equal(roleHasPermission('LIBRARIAN', 'manage_ebooks'), true);
  assert.deepEqual(rolesWithPermission('manage_settings'), ['ADMIN']);
});
