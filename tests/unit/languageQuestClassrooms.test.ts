import assert from "node:assert/strict";
import test from "node:test";
import { canAccessLanguageQuestCourse } from "../../languageQuest";
import {
  languageQuestClassroomInvitePath,
  languageQuestProfileSection,
  normalizeLanguageQuestClassroomCode,
} from "../../shared/languageQuestClassrooms";

test("Language Quest classroom codes are normalized consistently", () => {
  assert.equal(normalizeLanguageQuestClassroomCode(" ab-cd 12!xy "), "ABCD12XY");
  assert.equal(normalizeLanguageQuestClassroomCode("abcdefghijk"), "ABCDEFGH");
  assert.equal(normalizeLanguageQuestClassroomCode(null), "");
});

test("classroom invite links open the learner classroom tab with a safe code", () => {
  assert.equal(
    languageQuestClassroomInvitePath("ab-cd12xy"),
    "/games/language-quest/profile?classroomCode=ABCD12XY#classrooms",
  );
  assert.equal(languageQuestProfileSection("#classrooms"), "classrooms");
  assert.equal(languageQuestProfileSection("#quest-cards"), "cards");
  assert.equal(languageQuestProfileSection("#unknown"), "profile");
});

test("classroom membership grants learners access to an assigned draft course", async () => {
  const queries: any[] = [];
  const prisma = {
    languageQuestClassroomMember: {
      findFirst: async (query: any) => {
        queries.push(query);
        return { id: "membership-1" };
      },
    },
  };

  assert.equal(await canAccessLanguageQuestCourse(
    prisma,
    { userId: "learner-1", role: "STUDENT" },
    { id: "course-1", published: false },
  ), true);
  assert.deepEqual(queries[0].where, {
    userId: "learner-1",
    classroom: { focusCourseId: "course-1" },
  });
});

test("published courses and course managers do not require classroom membership", async () => {
  const prisma = {
    languageQuestClassroomMember: {
      findFirst: async () => { throw new Error("membership lookup should not run"); },
    },
  };

  assert.equal(await canAccessLanguageQuestCourse(
    prisma,
    { userId: "learner-1", role: "STUDENT" },
    { id: "course-1", published: true },
  ), true);
  assert.equal(await canAccessLanguageQuestCourse(
    prisma,
    { userId: "teacher-1", role: "TEACHER" },
    { id: "course-1", published: false },
  ), true);
});

test("an unassigned draft course stays private from learners", async () => {
  const prisma = {
    languageQuestClassroomMember: { findFirst: async () => null },
  };
  assert.equal(await canAccessLanguageQuestCourse(
    prisma,
    { userId: "learner-1", role: "STUDENT" },
    { id: "course-1", published: false },
  ), false);
});
