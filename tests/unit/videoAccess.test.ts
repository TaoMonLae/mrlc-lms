import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient, VideoLesson } from '@prisma/client';
import { canReadVideo } from '../../videoLearningRoutes';

test('uploaded video access requires a school student record even for a global lesson', async () => {
  const video = { status: 'PUBLISHED', visibility: 'ALL', classId: null } as VideoLesson;
  const actor = { userId: 'learner', role: 'STUDENT' };
  const prisma = { student: { findUnique: async () => null } } as unknown as PrismaClient;
  assert.equal(await canReadVideo(prisma, actor, video), false);
});

test('uploaded video access follows publication and class membership', async () => {
  const prisma = { student: { findUnique: async () => ({ classId: 'class-a' }) } } as unknown as PrismaClient;
  const actor = { userId: 'student', role: 'STUDENT' };
  const video = { status: 'PUBLISHED', visibility: 'STUDENTS', classId: 'class-a' } as VideoLesson;
  assert.equal(await canReadVideo(prisma, actor, video), true);
  assert.equal(await canReadVideo(prisma, actor, { ...video, classId: 'class-b' }), false);
  assert.equal(await canReadVideo(prisma, actor, { ...video, status: 'DRAFT' }), false);
});
