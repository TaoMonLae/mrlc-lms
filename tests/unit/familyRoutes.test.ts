import test from "node:test";
import assert from "node:assert/strict";
import { registerFamilyRoutes } from "../../familyRoutes";

type Handler = (req: any, res: any, next: () => void) => Promise<void> | void;
const guardianId = "guardian-1";
const linkedId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

function setup() {
  const routes = new Map<string, Handler[]>();
  const app = Object.fromEntries(["get", "post", "patch"].map((method) => [method, (path: string, ...handlers: Handler[]) => routes.set(`${method.toUpperCase()} ${path}`, handlers)]));
  const messageQueries: any[] = [];
  const prisma = {
    user: { findUnique: async ({ where }: any) => ({ id: where.id, role: where.id === guardianId ? "GUARDIAN" : "ADMIN", isActive: true }) },
    guardianStudentLink: {
      findUnique: async ({ where }: any) => where.guardianUserId_studentId.guardianUserId === guardianId && where.guardianUserId_studentId.studentId === linkedId
        ? { student: { id: linkedId } } : null,
      findMany: async () => [],
    },
    familyMessage: { findMany: async (query: any) => { messageQueries.push(query); return []; } },
  };
  const authenticate: Handler = (req, _res, next) => { req.user = req.session; next(); };
  registerFamilyRoutes(app as any, prisma as any, authenticate);

  async function request(method: string, path: string, session: { userId: string; role: string }, values: { studentId?: string; body?: unknown } = {}) {
    const handlers = routes.get(`${method} ${path}`);
    assert.ok(handlers, `route ${method} ${path} is registered`);
    const req = { session, params: { studentId: values.studentId }, query: { studentId: values.studentId }, body: values.body };
    const result: { status: number; body: any } = { status: 200, body: undefined };
    const res = { status(code: number) { result.status = code; return this; }, json(body: any) { result.body = body; return this; } };
    for (const handler of handlers) {
      let advanced = false;
      await handler(req, res, () => { advanced = true; });
      if (!advanced) break;
    }
    return result;
  }
  return { request, messageQueries };
}

test("guardian messages are scoped to the verified learner link", async () => {
  const { request, messageQueries } = setup();
  const session = { userId: guardianId, role: "GUARDIAN" };
  assert.equal((await request("GET", "/api/family/messages", session, { studentId: otherId })).status, 404);
  assert.equal(messageQueries.length, 0);
  assert.equal((await request("GET", "/api/family/messages", session, { studentId: linkedId })).status, 200);
  assert.deepEqual(messageQueries[0].where, { guardianUserId: guardianId, studentId: linkedId });
  assert.equal((await request("POST", "/api/family/messages", session, { body: { studentId: otherId, topic: "LEARNING", body: "Please help" } })).status, 404);
});

test("guardian tokens cannot read the staff inbox or another learner overview", async () => {
  const { request } = setup();
  const session = { userId: guardianId, role: "GUARDIAN" };
  assert.equal((await request("GET", "/api/family/inbox", session)).status, 403);
  assert.equal((await request("GET", "/api/family/students/:studentId/overview", session, { studentId: otherId })).status, 404);
});
