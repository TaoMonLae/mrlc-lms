import assert from "node:assert/strict";
import test from "node:test";
import {
  classworkResourceTarget,
  studentCanSeeClassworkExam,
  filterClasswork,
  resolveClassworkSelection,
  sortClasswork,
  type ClassworkItem,
} from "../../shared/classwork";
import { registerClassworkRoutes } from "../../classworkRoutes";

test("classwork permits only safe resource destinations", () => {
  for (const bad of [
    "javascript:alert(1)",
    "//evil.example/x",
    "/admin/settings",
    "https://user:pass@example.com",
    "https://example.com\\evil",
    "http://example.com",
    "/elibrary/a/read?token=x",
    "/news/../admin",
  ])
    assert.equal(classworkResourceTarget(bad), null, bad);
  assert.equal(classworkResourceTarget("/elibrary/book-1/read")?.type, "EBOOK");
  assert.equal(classworkResourceTarget("/news/article-1")?.type, "NEWS");
  assert.equal(
    classworkResourceTarget("/games/language-quest/courses/c1")?.type,
    "COURSE",
  );
  assert.equal(
    classworkResourceTarget("https://example.org/reading")?.type,
    "EXTERNAL",
  );
});
test("exam visibility respects draft, archive, individual assignment and completion", () => {
  const base = {
    status: "PUBLISHED",
    assignmentCount: 0,
    assignedToStudent: false,
    completed: false,
  };
  assert.equal(studentCanSeeClassworkExam(base), true);
  assert.equal(
    studentCanSeeClassworkExam({ ...base, status: "DRAFT", completed: true }),
    false,
  );
  assert.equal(
    studentCanSeeClassworkExam({
      ...base,
      status: "ARCHIVED",
      completed: true,
    }),
    false,
  );
  assert.equal(
    studentCanSeeClassworkExam({ ...base, assignmentCount: 2 }),
    false,
  );
  assert.equal(
    studentCanSeeClassworkExam({
      ...base,
      assignmentCount: 2,
      assignedToStudent: true,
    }),
    true,
  );
  assert.equal(
    studentCanSeeClassworkExam({ ...base, status: "CLOSED", completed: true }),
    true,
  );
});
test("filtering and sorting preserve source rows and put pins first", () => {
  const items = [
    {
      id: "1",
      title: "Read a story",
      kind: "READING",
      description: "Evidence",
      topicId: "t1",
      pinned: false,
      createdAt: "2026-09-14",
      dueDate: null,
    },
    {
      id: "2",
      title: "Fractions",
      kind: "HOMEWORK",
      description: null,
      topicId: null,
      pinned: true,
      createdAt: "2026-09-13",
      dueDate: "2026-09-16",
    },
  ] as ClassworkItem[];
  assert.equal(filterClasswork(items, "evidence", "READING", "t1").length, 1);
  assert.equal(filterClasswork(items, "", "ALL", "unfiled")[0].id, "2");
  assert.equal(sortClasswork(items, "deadline")[0].id, "2");
  assert.equal(items[0].id, "1");
});
test("classwork falls back safely when a bookmarked class is no longer available", () => {
  const classes = [{ id: "current" }, { id: "other" }];
  assert.equal(resolveClassworkSelection("other", classes), "other");
  assert.equal(resolveClassworkSelection("removed", classes), "current");
  assert.equal(resolveClassworkSelection(null, classes), "current");
  assert.equal(resolveClassworkSelection("removed", []), "");
});

function harness(
  role = "TEACHER",
  overrides: Record<string, any> = {},
  canManage = true,
) {
  const handlers = new Map<string, Function>();
  const klass = {
    id: "c1",
    name: "Pre-GED",
    level: "GED",
    academicYear: "2026",
  };
  const prisma: any = {
    class: { findUnique: async () => klass, findMany: async () => [klass] },
    student: { findUnique: async () => ({ id: "s1", classId: "c1" }) },
    classworkTopic: { findMany: async () => [], findFirst: async () => null },
    classworkPlacement: {
      findMany: async () => [],
      upsert: async (data: any) => data,
    },
    classworkResource: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    homework: { findMany: async () => [], findFirst: async () => null },
    exam: { findMany: async () => [], findFirst: async () => null },
    ebook: { findFirst: async () => null },
    languageQuestCourse: { findFirst: async () => null },
    newsArticle: { findUnique: async () => null },
    ...overrides,
  };
  const app: any = {};
  for (const method of ["get", "post", "patch", "put", "delete"])
    app[method] = (path: string, ...args: Function[]) =>
      handlers.set(`${method} ${path}`, args.at(-1)!);
  registerClassworkRoutes({
    app,
    prisma,
    authMiddleware: () => {},
    logger: { error: () => {} },
    canManageExamClass: async () => canManage,
  });
  return async (
    method: string,
    path: string,
    body: any = {},
    params: any = { classId: "c1" },
  ) => {
    let code = 200;
    let payload: any;
    const res: any = {
      status(n: number) {
        code = n;
        return res;
      },
      json(value: any) {
        payload = value;
        return res;
      },
    };
    await handlers.get(`${method} ${path}`)!(
      { user: { userId: "u1", role }, params, body, query: {} },
      res,
    );
    return { code, payload };
  };
}
const base = "/api/classwork/classes/:classId";
const examFixture = (overrides: Record<string, any> = {}) => ({
  id: "e1",
  title: "Checkpoint",
  status: "PUBLISHED",
  createdAt: new Date("2026-09-14T00:00:00Z"),
  availableFrom: null,
  availableUntil: null,
  allowLateStart: false,
  attemptLimit: 1,
  _count: { assignments: 0, attempts: 0 },
  assignments: [],
  attempts: [],
  ...overrides,
});
test("classwork honors individual exam windows and links to a non-starting preview", async () => {
  const extended = new Date("2099-01-02T10:00:00Z");
  const request = harness("STUDENT", {
    exam: {
      findMany: async () => [
        examFixture({
          availableUntil: new Date("2000-01-01T00:00:00Z"),
          _count: { assignments: 1, attempts: 0 },
          assignments: [{ studentId: "s1", availableUntilOverride: extended }],
        }),
      ],
    },
  });
  const { payload } = await request("get", base);
  assert.equal(payload.items[0].dueDate, extended.toISOString());
  assert.equal(payload.items[0].actionable, true);
  assert.equal(payload.items[0].href, "/exam2/resume?exam=e1");
  assert.notEqual(payload.items[0].status, "CLOSED");
});
test("individual opening dates prevent classwork from claiming an exam is open", async () => {
  const request = harness("STUDENT", {
    exam: {
      findMany: async () => [
        examFixture({
          _count: { assignments: 1, attempts: 0 },
          assignments: [
            {
              studentId: "s1",
              availableFromOverride: new Date("2099-01-01T00:00:00Z"),
            },
          ],
        }),
      ],
    },
  });
  const { payload } = await request("get", base);
  assert.equal(payload.items[0].status, "UPCOMING");
  assert.equal(payload.items[0].actionable, false);
});
test("completed work still offers authorized retakes, including individual attempt limits", async () => {
  const row = examFixture({
    _count: { assignments: 1, attempts: 1 },
    assignments: [{ studentId: "s1", attemptLimitOverride: 2 }],
    attempts: [{ id: "a1", isCompleted: true, state: "SUBMITTED" }],
  });
  const request = harness("STUDENT", { exam: { findMany: async () => [row] } });
  const retake = (await request("get", base)).payload.items[0];
  assert.equal(retake.status, "RETAKE_AVAILABLE");
  assert.equal(retake.actionable, true);
  assert.equal(retake.href, "/exam2/resume?exam=e1");
  row.assignments[0].attemptLimitOverride = 1;
  const exhausted = (await request("get", base)).payload.items[0];
  assert.equal(exhausted.status, "SUBMITTED");
  assert.equal(exhausted.actionable, false);
  assert.equal(exhausted.href, "/exam2/attempts/a1/result");
});
test("in-progress attempts can be resumed even when the attempt limit has been reached", async () => {
  const request = harness("STUDENT", {
    exam: {
      findMany: async () => [
        examFixture({
          _count: { assignments: 0, attempts: 1 },
          attempts: [{ id: "a1", isCompleted: false, state: "PAUSED" }],
        }),
      ],
    },
  });
  const item = (await request("get", base)).payload.items[0];
  assert.equal(item.status, "IN_PROGRESS");
  assert.equal(item.actionable, true);
  assert.equal(item.href, "/exam2/resume?exam=e1");
});
test("attempt selection and counts exclude invalidated attempts without selecting exam secrets", async () => {
  let query: any;
  const request = harness("STUDENT", {
    exam: {
      findMany: async (args: any) => {
        query = args;
        return [];
      },
    },
  });
  await request("get", base);
  assert.deepEqual(query.select.attempts.where, {
    studentId: "s1",
    state: { not: "INVALIDATED" },
  });
  assert.deepEqual(
    query.select._count.select.attempts.where,
    query.select.attempts.where,
  );
  assert.deepEqual(query.select.attempts.select, {
    id: true,
    isCompleted: true,
    state: true,
  });
  assert.equal(query.select.questions, undefined);
  assert.equal(query.select.accessCodeHash, undefined);
  assert.equal(query.select.assignments.select.availableUntilOverride, true);
});
test("closed homework with a redo request is not advertised as work to redo", async () => {
  const request = harness("STUDENT", {
    homework: {
      findMany: async () => [
        {
          id: "h1",
          title: "Essay",
          status: "CLOSED",
          dueDate: new Date(),
          createdAt: new Date(),
          submissions: [{ status: "REDO" }],
        },
      ],
    },
  });
  const item = (await request("get", base)).payload.items[0];
  assert.equal(item.status, "CLOSED");
  assert.equal(item.actionable, false);
});
test("topic creation trims input and binds the authenticated class", async () => {
  let created: any;
  const request = harness("TEACHER", {
    classworkTopic: {
      create: async (args: any) => {
        created = args.data;
        return { id: "t1", title: args.data.title };
      },
    },
  });
  const result = await request("post", `${base}/topics`, {
    title: "  Evidence  ",
    classId: "other",
  });
  assert.equal(result.code, 201);
  assert.deepEqual(created, { classId: "c1", title: "Evidence" });
  assert.equal(
    (await request("post", `${base}/topics`, { title: "   " })).code,
    400,
  );
});
test("student feed hides withdrawn resources while teachers can remove their links", async () => {
  const resource = {
    id: "r1",
    title: "Withdrawn reading",
    description: null,
    kind: "READING",
    url: "/elibrary/private/read",
    createdAt: new Date(),
  };
  const overrides = { classworkResource: { findMany: async () => [resource] } };
  const student = await harness("STUDENT", overrides)("get", base);
  assert.equal(student.payload.items.length, 0);
  const teacher = await harness("TEACHER", overrides)("get", base);
  assert.equal(teacher.payload.items[0].status, "UNAVAILABLE");
  assert.equal(teacher.payload.items[0].href, "");
});
test("students cannot read another classroom or create topics", async () => {
  const request = harness("STUDENT");
  assert.equal(
    (await request("get", base, {}, { classId: "other" })).code,
    403,
  );
  assert.equal(
    (await request("post", `${base}/topics`, { title: "New" })).code,
    403,
  );
  assert.equal((await request("get", `${base}/catalog`)).code, 403);
});
test("teachers cannot read or mutate classes they do not teach", async () => {
  const request = harness("TEACHER", {}, false);
  assert.equal((await request("get", base)).code, 403);
  assert.equal(
    (
      await request("put", `${base}/placement`, {
        sourceType: "HOMEWORK",
        sourceId: "h1",
      })
    ).code,
    403,
  );
});
test("non-learning roles are denied, including administrators of unrelated modules", async () => {
  assert.equal(
    (await harness("ACCOUNTANT")("get", "/api/classwork/classes")).code,
    403,
  );
});
test("student feed projects only their state and hides targeted exams for others", async () => {
  const date = new Date("2026-09-14T00:00:00Z");
  let submissionQuery: any;
  const request = harness("STUDENT", {
    homework: {
      findMany: async (args: any) => {
        submissionQuery = args.select.submissions;
        return [
          {
            id: "h1",
            title: "Reading",
            instructions: "Read",
            status: "OPEN",
            dueDate: date,
            createdAt: date,
            submissions: [{ status: "MARKED" }],
            privateField: "secret",
          },
        ];
      },
    },
    exam: {
      findMany: async () => [
        {
          id: "e1",
          title: "Targeted exam",
          status: "PUBLISHED",
          createdAt: date,
          _count: { assignments: 2 },
          assignments: [],
          attempts: [],
        },
      ],
    },
  });
  const { code, payload } = await request("get", base);
  assert.equal(code, 200);
  assert.equal(payload.canManage, false);
  assert.equal(payload.items.length, 1);
  assert.deepEqual(submissionQuery, {
    where: { studentId: "s1" },
    select: { status: true },
  });
  assert.equal(payload.items[0].status, "MARKED");
  assert.equal(payload.items[0].actionable, false);
  assert.equal(JSON.stringify(payload).includes("secret"), false);
  assert.equal(payload.items[0].href, "/student/homework?assignment=h1");
});
test("cross-class sources and topics cannot be placed", async () => {
  assert.equal(
    (
      await harness()("put", `${base}/placement`, {
        sourceType: "HOMEWORK",
        sourceId: "other",
      })
    ).code,
    404,
  );
  const request = harness("TEACHER", {
    homework: { findFirst: async () => ({ id: "h1" }) },
  });
  assert.equal(
    (
      await request("put", `${base}/placement`, {
        sourceType: "HOMEWORK",
        sourceId: "h1",
        topicId: "other-topic",
      })
    ).code,
    400,
  );
});
test("pinning does not clear an existing topic", async () => {
  const request = harness("TEACHER", {
    homework: { findFirst: async () => ({ id: "h1" }) },
  });
  const result = await request("put", `${base}/placement`, {
    sourceType: "HOMEWORK",
    sourceId: "h1",
    pinned: true,
  });
  assert.equal(result.code, 200);
  assert.deepEqual(result.payload.update, { pinned: true });
});
test("unavailable books and unpublished courses cannot be added", async () => {
  const request = harness();
  for (const url of [
    "/elibrary/private/read",
    "/games/language-quest/courses/unpublished",
  ])
    assert.equal(
      (await request("post", `${base}/resources`, { title: "Private", url }))
        .code,
      400,
    );
});
test("missing migration is surfaced as service unavailable, not an empty class", async () => {
  const request = harness("TEACHER", {
    classworkTopic: {
      findMany: async () => {
        throw { code: "P2021" };
      },
    },
  });
  const result = await request("get", base);
  assert.equal(result.code, 503);
  assert.match(result.payload.error, /database update/);
});
