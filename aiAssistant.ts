/**
 * Context-aware AI assistant for MRLC LMS (read-only).
 *
 * Redesign of the old stateless /api/ai/chat: the assistant now
 *  - remembers the conversation (multi-turn),
 *  - knows what page the user is on (pageContext from the client),
 *  - is given a role-scoped "situation snapshot" (their classes, exams
 *    closing soon, pending grading, and — for admins — recent school
 *    activity), and
 *  - can pull live data on demand via read-only tools using a simple,
 *    provider-agnostic JSON protocol (works with Gemini or Ollama; no
 *    dependence on a specific provider's native function-calling wire format).
 *
 * All tools are READ-ONLY and scoped to the caller: a TEACHER only ever sees
 * their own classes; an ADMIN sees the school. The assistant can never modify
 * data. Legacy callers that pass `systemInstruction` (e.g. the exam builder's
 * "Generate similar") keep the old single-shot behaviour.
 */

interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

type Turn = { role: "user" | "assistant"; content: string };

export function registerAiAssistantRoutes(deps: {
  app: any;
  prisma: any;
  authMiddleware: (req: any, res: any, next: (e?: unknown) => void) => void;
  logger: { error: (...a: any[]) => void; info?: (...a: any[]) => void };
}) {
  const { app, prisma, authMiddleware, logger } = deps;

  // ── low-level model call (single request; provider-agnostic) ───────────────
  async function callModel(system: string, turns: Turn[]): Promise<string> {
    const provider = process.env.AI_PROVIDER || "gemini";

    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") throw new Error("Gemini API key is not configured in .env");
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const contents = turns.map((t) => ({
        role: t.role === "assistant" ? "model" : "user",
        parts: [{ text: t.content }],
      }));
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          }),
        }
      );
      if (!resp.ok) throw new Error(`Gemini API returned status ${resp.status}: ${await resp.text()}`);
      const data: any = await resp.json();
      return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "";
    }

    if (provider === "ollama") {
      const url = process.env.OLLAMA_API_URL || "http://localhost:11434/api/chat";
      const model = process.env.OLLAMA_MODEL || "gemma2:9b";
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...turns.map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content })),
          ],
          stream: false,
        }),
      });
      if (!resp.ok) throw new Error(`Ollama API returned status ${resp.status}`);
      const data: any = await resp.json();
      return data.message?.content || "";
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  // ── role scoping ────────────────────────────────────────────────────────────
  // Returns the class ids a teacher may see, or null for admins (= all classes).
  async function scopeClassIds(user: JwtPayload): Promise<string[] | null> {
    if (user.role === "ADMIN") return null;
    const t = await prisma.teacher
      .findUnique({ where: { userId: user.userId }, include: { classes: true } })
      .catch(() => null);
    return (t?.classes || []).map((c: any) => c.classId);
  }

  const fullName = (u: any) => `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();
  const iso = (d: any) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "");

  // ── always-on situation snapshot (role-scoped) ───────────────────────────────
  async function buildSituation(user: JwtPayload, pageContext: any): Promise<string> {
    const lines: string[] = [];
    lines.push(`Signed-in user: ${user.email} — role ${user.role}.`);
    if (pageContext?.path) lines.push(`Currently viewing: ${pageContext.title || pageContext.path} (path ${pageContext.path}).`);

    const classIds = await scopeClassIds(user);
    const classWhere = classIds ? { id: { in: classIds } } : {};

    const classes = await prisma.class
      .findMany({ where: classWhere, select: { id: true, name: true }, take: 40 })
      .catch(() => [] as any[]);
    if (classes.length) {
      const withCounts = await Promise.all(
        classes.map(async (c: any) => {
          const n = await prisma.student.count({ where: { classId: c.id } }).catch(() => null);
          return `${c.name}${n != null ? ` [${n} students]` : ""}`;
        })
      );
      lines.push(`Classes in scope (${classes.length}): ${withCounts.join(", ")}.`);
    } else if (classIds && classIds.length === 0) {
      lines.push("This teacher has no classes assigned.");
    }

    const examClassWhere = classIds ? { classId: { in: classIds } } : {};

    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const closing = await prisma.exam
      .findMany({
        where: { ...examClassWhere, availableUntil: { gte: now, lte: in7 } },
        select: { title: true, availableUntil: true, class: { select: { name: true } } },
        orderBy: { availableUntil: "asc" },
        take: 10,
      })
      .catch(() => [] as any[]);
    if (closing.length) {
      lines.push(
        `Exams closing within 7 days: ${closing
          .map((e: any) => `"${e.title}" (${e.class?.name ?? "?"}) closes ${iso(e.availableUntil)}`)
          .join("; ")}.`
      );
    }

    const pending = await prisma.examAttempt
      .count({ where: { gradingStatus: "PENDING", ...(classIds ? { exam: { classId: { in: classIds } } } : {}) } })
      .catch(() => null);
    if (pending != null) lines.push(`Exam attempts awaiting manual grading: ${pending}.`);

    if (user.role === "ADMIN") {
      const acts = await prisma.auditLog
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { action: true, entityType: true, description: true, userName: true, createdAt: true },
        })
        .catch(() => [] as any[]);
      if (acts.length) {
        lines.push(
          `Recent school-wide activity:\n${acts
            .map((a: any) => `- ${iso(a.createdAt)} ${a.userName ?? "system"} ${a.action} ${a.entityType}: ${a.description}`)
            .join("\n")}`
        );
      }
    }

    return lines.join("\n");
  }

  // ── read-only tools ──────────────────────────────────────────────────────────
  const TOOLS: Record<string, { desc: string; run: (args: any, user: JwtPayload) => Promise<any> }> = {
    search_students: {
      desc: "Find students by name or student code. args: { query: string }",
      run: async (args, user) => {
        const q = String(args?.query ?? "").trim();
        if (!q) return { error: "query required" };
        const classIds = await scopeClassIds(user);
        const rows = await prisma.student.findMany({
          where: {
            ...(classIds ? { classId: { in: classIds } } : {}),
            OR: [
              { studentCode: { contains: q, mode: "insensitive" } },
              { user: { firstName: { contains: q, mode: "insensitive" } } },
              { user: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          },
          select: { id: true, studentCode: true, status: true, user: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } },
          take: 15,
        });
        return rows.map((s: any) => ({ id: s.id, code: s.studentCode, name: fullName(s.user), class: s.class?.name, status: s.status }));
      },
    },
    get_exams: {
      desc: "List exams in scope, optionally filtered by status. args: { status?: string }",
      run: async (args, user) => {
        const classIds = await scopeClassIds(user);
        const status = args?.status ? String(args.status).toUpperCase() : undefined;
        const rows = await prisma.exam.findMany({
          where: { ...(classIds ? { classId: { in: classIds } } : {}), ...(status ? { status } : {}) },
          select: {
            id: true, title: true, status: true, date: true, availableFrom: true, availableUntil: true,
            class: { select: { name: true } }, _count: { select: { attempts: true, questions: true } },
          },
          orderBy: { date: "desc" },
          take: 25,
        });
        return rows.map((e: any) => ({
          id: e.id, title: e.title, status: e.status, class: e.class?.name,
          opens: iso(e.availableFrom), closes: iso(e.availableUntil),
          questions: e._count?.questions, attempts: e._count?.attempts,
        }));
      },
    },
    get_exam_results: {
      desc: "Score summary for one exam (average, pass count, pending grading). args: { examId: string }",
      run: async (args, user) => {
        const examId = String(args?.examId ?? "");
        if (!examId) return { error: "examId required" };
        const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { title: true, classId: true, totalMarks: true } });
        if (!exam) return { error: "exam not found" };
        const classIds = await scopeClassIds(user);
        if (classIds && !classIds.includes(exam.classId)) return { error: "not in your scope" };
        const attempts = await prisma.examAttempt.findMany({
          where: { examId },
          select: { score: true, state: true, gradingStatus: true, isCompleted: true },
        });
        const scored = attempts.filter((a: any) => a.score != null).map((a: any) => a.score);
        const avg = scored.length ? Math.round((scored.reduce((s: number, n: number) => s + n, 0) / scored.length) * 10) / 10 : null;
        const pending = attempts.filter((a: any) => a.gradingStatus === "PENDING").length;
        const passMark = exam.totalMarks ? exam.totalMarks * 0.6 : null;
        const passed = passMark != null ? scored.filter((n: number) => n >= passMark).length : null;
        return {
          exam: exam.title, totalAttempts: attempts.length, graded: scored.length,
          averageScore: avg, totalMarks: exam.totalMarks ?? null, passedApprox: passed, pendingGrading: pending,
        };
      },
    },
    get_recent_activity: {
      desc: "Recent activity. Admins get the school audit log; teachers get their recent exams/attempts. args: { limit?: number }",
      run: async (args, user) => {
        const limit = Math.min(Math.max(Number(args?.limit) || 15, 1), 40);
        if (user.role === "ADMIN") {
          const acts = await prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" }, take: limit,
            select: { action: true, entityType: true, description: true, userName: true, createdAt: true, severity: true },
          });
          return acts.map((a: any) => ({ at: iso(a.createdAt), who: a.userName, action: a.action, entity: a.entityType, detail: a.description, severity: a.severity }));
        }
        const classIds = await scopeClassIds(user);
        const rows = await prisma.examAttempt.findMany({
          where: { ...(classIds ? { exam: { classId: { in: classIds } } } : {}), submittedAt: { not: null } },
          orderBy: { submittedAt: "desc" }, take: limit,
          select: { submittedAt: true, score: true, state: true, exam: { select: { title: true } }, student: { select: { studentCode: true, user: { select: { firstName: true, lastName: true } } } } },
        });
        return rows.map((a: any) => ({ at: iso(a.submittedAt), exam: a.exam?.title, student: fullName(a.student?.user) || a.student?.studentCode, score: a.score, state: a.state }));
      },
    },
    get_attendance_summary: {
      desc: "Attendance breakdown (present/absent/late/excused) over the last N days. args: { classId?: string, days?: number }",
      run: async (args, user) => {
        const classIds = await scopeClassIds(user);
        const days = Math.min(Math.max(Number(args?.days) || 14, 1), 90);
        const since = new Date(Date.now() - days * 86400000);
        const where: any = { date: { gte: since } };
        if (args?.classId) {
          if (classIds && !classIds.includes(String(args.classId))) return { error: "class not in your scope" };
          where.classId = String(args.classId);
        } else if (classIds) {
          where.classId = { in: classIds };
        }
        const all = await prisma.attendance.findMany({ where, select: { status: true } });
        const counts: Record<string, number> = {};
        for (const r of all) counts[r.status] = (counts[r.status] || 0) + 1;
        const total = all.length;
        return { days, total, counts, presentRate: total ? Math.round(((counts.PRESENT || 0) / total) * 100) : null };
      },
    },
    get_homework_summary: {
      desc: "Recent homework with due dates and submission/marked counts. args: { classId?: string }",
      run: async (args, user) => {
        const classIds = await scopeClassIds(user);
        const where: any = {};
        if (args?.classId) {
          if (classIds && !classIds.includes(String(args.classId))) return { error: "class not in your scope" };
          where.classId = String(args.classId);
        } else if (classIds) {
          where.classId = { in: classIds };
        }
        const hw = await prisma.homework.findMany({
          where,
          orderBy: { dueDate: "desc" },
          take: 15,
          select: { id: true, title: true, dueDate: true, status: true, class: { select: { name: true } }, _count: { select: { submissions: true } } },
        });
        return Promise.all(
          hw.map(async (h: any) => {
            const marked = await prisma.homeworkSubmission.count({ where: { homeworkId: h.id, status: "MARKED" } }).catch(() => null);
            return { id: h.id, title: h.title, class: h.class?.name, due: iso(h.dueDate), status: h.status, submissions: h._count?.submissions, marked };
          })
        );
      },
    },
    get_conduct_summary: {
      desc: "Recent conduct violations, grouped by severity, or for one student. args: { studentId?: string, days?: number }",
      run: async (args, user) => {
        const classIds = await scopeClassIds(user);
        const days = Math.min(Math.max(Number(args?.days) || 30, 1), 180);
        const since = new Date(Date.now() - days * 86400000);
        const where: any = { occurredAt: { gte: since } };
        if (args?.studentId) where.studentId = String(args.studentId);
        if (classIds) where.student = { classId: { in: classIds } };
        const rows = await prisma.ruleViolation.findMany({
          where,
          orderBy: { occurredAt: "desc" },
          take: 40,
          select: {
            severity: true, occurredAt: true, note: true,
            rule: { select: { code: true, title: true } },
            student: { select: { studentCode: true, user: { select: { firstName: true, lastName: true } } } },
          },
        });
        const bySeverity: Record<string, number> = {};
        for (const r of rows) bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
        return {
          days, total: rows.length, bySeverity,
          recent: rows.slice(0, 15).map((r: any) => ({
            at: iso(r.occurredAt), student: fullName(r.student?.user) || r.student?.studentCode,
            rule: `${r.rule?.code ?? ""} ${r.rule?.title ?? ""}`.trim(), severity: r.severity, note: r.note,
          })),
        };
      },
    },
  };

  function toolManualText(): string {
    const list = Object.entries(TOOLS).map(([name, t]) => `- ${name}: ${t.desc}`).join("\n");
    return (
      `You can read live app data (read-only) by requesting a tool. To call a tool, reply with ONLY a fenced json block:\n` +
      "```json\n{\"tool\":\"<name>\",\"args\":{...}}\n```\n" +
      `Do not add any other text when calling a tool. After you receive the TOOL RESULT, use it to answer the user in clear markdown. ` +
      `Only call a tool when you actually need live data; otherwise answer directly. Available tools:\n${list}`
    );
  }

  // Parse a tool request from a model reply, if present.
  function parseToolCall(text: string): { tool: string; args: any } | null {
    const fence = text.match(/```json\s*([\s\S]*?)```/i);
    const raw = fence ? fence[1] : text.trim().startsWith("{") ? text.trim() : "";
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj.tool === "string") return { tool: obj.tool, args: obj.args || {} };
    } catch {
      /* not a tool call */
    }
    return null;
  }

  app.post("/api/ai/chat", authMiddleware, async (req: any, res: any) => {
    const user = (req as any).user as JwtPayload;
    if (user.role !== "ADMIN" && user.role !== "TEACHER") {
      res.status(403).json({ error: "Forbidden: AI Assistant is restricted to Admins and Teachers" });
      return;
    }
    const { prompt, systemInstruction, messages, pageContext } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    try {
      // Legacy single-shot mode (e.g. exam builder "Generate similar"): a custom
      // systemInstruction with no conversation/context — keep old behaviour.
      if (systemInstruction && !messages && !pageContext) {
        const reply = await callModel(systemInstruction, [{ role: "user", content: prompt }]);
        res.json({ reply: reply || "No response generated." });
        return;
      }

      const situation = await buildSituation(user, pageContext).catch(() => "");
      const system =
        `You are the MRLC AI Assistant, embedded in the Mon Refugee Learning Centre LMS, helping teachers and admins. ` +
        `You are READ-ONLY: you can look things up and advise, but never claim to have changed data. ` +
        `You can draft lesson plans, quiz questions, announcements, and translate (English/Burmese/Mon). ` +
        `Use the situation summary and tools to answer questions about what's happening in the app. Be concise and use markdown.\n\n` +
        `=== CURRENT SITUATION (scoped to this user) ===\n${situation || "(no snapshot available)"}\n\n` +
        `=== TOOLS ===\n${toolManualText()}`;

      const history: Turn[] = Array.isArray(messages)
        ? messages
            .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-10)
            .map((m: any) => ({ role: m.role, content: m.content }))
        : [];
      const turns: Turn[] = [...history, { role: "user", content: prompt }];

      // Agentic loop: allow up to 3 tool round-trips before answering.
      let finalText = "";
      for (let step = 0; step < 3; step++) {
        const reply = await callModel(system, turns);
        const call = parseToolCall(reply);
        if (!call) {
          finalText = reply;
          break;
        }
        const tool = TOOLS[call.tool];
        let result: any;
        try {
          result = tool ? await tool.run(call.args, user) : { error: `unknown tool: ${call.tool}` };
        } catch (e: any) {
          result = { error: e?.message || "tool failed" };
        }
        // Record the model's tool request and our result, then loop.
        turns.push({ role: "assistant", content: reply });
        turns.push({ role: "user", content: `TOOL RESULT for ${call.tool}:\n\`\`\`json\n${JSON.stringify(result).slice(0, 6000)}\n\`\`\`` });
        if (step === 2) {
          // Out of tool budget — ask for a final answer with what we have.
          finalText = await callModel(system + "\nDo not call any more tools; answer now.", turns);
        }
      }

      res.json({ reply: finalText || "No response generated." });
    } catch (err: any) {
      logger.error("AI assistant error:", err);
      res.status(500).json({ error: err.message || "Internal server error during AI generation" });
    }
  });

  if (logger.info) logger.info("🤖 Context-aware AI assistant routes registered");
}
