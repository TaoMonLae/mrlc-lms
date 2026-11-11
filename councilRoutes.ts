import { Router, type Express, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { STUDENT_COUNCIL_ROLES } from './shared/studentCouncil';
import type { DutyRoutesContext } from './dutyRoutes';
import { councilAccess, councilPlanInput, councilReviewInput, dateKey, forumReplyInput, forumReportInput, forumTopicInput, malaysiaToday, rotationRows, termEnd } from './shared/council';
class CouncilError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export function registerCouncilRoutes(app: Express, ctx: DutyRoutesContext) {
    const { prisma, authMiddleware, logger } = ctx;
    const router = Router();
    const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch(next); };
    router.use(authMiddleware);
    router.use(wrap(async (req, res, next) => {
        // Always use current database roles, never trust client-supplied council badges.
        const user = await prisma.user.findUnique({ where: { id: (req as any).user.userId }, select: {
                id: true, role: true, isActive: true, isExternalLearner: true, firstName: true, lastName: true,
                studentProfile: { select: { id: true, status: true, studentCouncilRole: true } },
            } });
        if (!user?.isActive || user.isExternalLearner || (user.role === 'STUDENT' && (!user.studentProfile || user.studentProfile.status !== 'ACTIVE')))
            throw new CouncilError(403, 'School accounts only');
        const appointment = user.studentProfile ? await prisma.councilAppointment.findUnique({ where: { studentId: user.studentProfile.id } }) : null;
        const today = malaysiaToday();
        const activeRole = appointment && appointment.startDate <= today && appointment.endDate >= today && appointment.role === user.studentProfile?.studentCouncilRole ? appointment.role : null;
        const access = councilAccess(user.role, activeRole);
        if (!access.canView)
            throw new CouncilError(403, 'This workspace is for students and school staff');
        res.locals.council = { ...access, userId: user.id, name: `${user.firstName} ${user.lastName}`, studentId: user.studentProfile?.id };
        // Router middleware continues explicitly after loading current permissions.
        next();
    }));
    const manage = (res: Response) => { if (!res.locals.council.canManage)
        throw new CouncilError(403, 'Council or staff access required'); };
    const audit = (tx: any, res: Response, action: string, entityId: string, description: string) => tx.auditLog.create({ data: {
            userId: res.locals.council.userId, userName: res.locals.council.name, action, entityType: 'STUDENT_COUNCIL', entityId, description,
        } });
    const publicStudent = { id: true, studentCode: true, preferredName: true, boardingType: true, studentCouncilRole: true, user: { select: { firstName: true, lastName: true } } } as const;
    router.get('/workspace', wrap(async (_req, res) => {
        const [members, students, plans, appointments] = await Promise.all([
            prisma.student.findMany({ where: { status: 'ACTIVE', studentCouncilRole: { not: null } }, select: publicStudent, orderBy: { studentCode: 'asc' } }),
            res.locals.council.canManage ? prisma.student.findMany({ where: { status: 'ACTIVE' }, select: publicStudent, orderBy: { studentCode: 'asc' } }) : [],
            prisma.councilPlan.findMany({ select: { id: true, name: true, createdAt: true, config: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
            prisma.councilAppointment.findMany(),
        ]);
        res.json({ ...res.locals.council, members, students, plans: res.locals.council.canManage ? plans : plans.map(({ id, name }) => ({ id, name })), appointments, today: malaysiaToday() });
    }));
    router.post('/appointments', wrap(async (req, res) => {
        if (!res.locals.council.staff)
            throw new CouncilError(403, 'Staff record council appointments');
        const input = z.object({ studentId: z.string().min(1), role: z.enum(STUDENT_COUNCIL_ROLES).nullable(), startDate: dateKey }).parse(req.body);
        await prisma.$transaction(async (tx) => {
            const student = await tx.student.findFirst({ where: { id: input.studentId, status: 'ACTIVE' } });
            if (!student)
                throw new CouncilError(404, 'Active student not found');
            await tx.student.update({ where: { id: student.id }, data: { studentCouncilRole: input.role } });
            if (input.role) {
                const data = { role: input.role, startDate: input.startDate, endDate: termEnd(input.startDate) };
                await tx.councilAppointment.upsert({ where: { studentId: student.id }, create: { studentId: student.id, ...data }, update: data });
            }
            else
                await tx.councilAppointment.deleteMany({ where: { studentId: student.id } });
            await audit(tx, res, 'APPOINT', student.id, JSON.stringify(input));
        });
        res.json({ ok: true });
    }));
    const forumLimit = rateLimit({ windowMs: 60000, limit: 12, keyGenerator: (_req, res) => res.locals.council.userId, message: { error: 'Please wait a minute before posting again' }, standardHeaders: true, legacyHeaders: false });
    router.get('/entries', wrap(async (req, res) => {
        const from = dateKey.parse(req.query.from), to = dateKey.parse(req.query.to);
        if (to < from || Date.parse(to) - Date.parse(from) > 90 * 86400000)
            throw new CouncilError(400, 'Choose up to 90 days');
        const entries = await prisma.councilDutyEntry.findMany({ where: { date: { gte: from, lte: to }, ...(typeof req.query.planId === 'string' && req.query.planId ? { planId: req.query.planId } : {}) }, orderBy: [{ date: 'asc' }, { dutyNumber: 'asc' }] });
        res.json(entries);
    }));
    router.post('/plans', wrap(async (req, res) => {
        manage(res);
        const input = councilPlanInput.parse(req.body);
        if (input.startDate < malaysiaToday())
            throw new CouncilError(400, 'Start on today or a future date');
        const ids = input.groups.flatMap(g => g.studentIds);
        const students = await prisma.student.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, select: publicStudent });
        if (students.length !== ids.length)
            throw new CouncilError(400, 'Some students are no longer active. Refresh the student list');
        const names = new Map(students.map(s => [s.id, s.preferredName || `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || s.studentCode]));
        const rows = rotationRows(input);
        const plan = await prisma.$transaction(async (tx) => {
            const existing = await tx.councilDutyEntry.findMany({ where: { date: { gte: input.startDate, lte: input.endDate } }, select: { members: true } });
            if (existing.some(e => (e.members as {
                id: string;
            }[]).some(m => ids.includes(m.id))))
                throw new CouncilError(409, 'These students already have a rotation during this period. Choose a non-overlapping period');
            // Separate plans must use the same seven-day boundary for shared students.
            const plans = await tx.councilPlan.findMany({ select: { config: true } });
            for (const plan of plans) {
                const old = councilPlanInput.safeParse(plan.config);
                if (old.success && old.data.groups.some(g => g.studentIds.some(id => ids.includes(id))) && Math.abs(Date.parse(old.data.startDate) - Date.parse(input.startDate)) / 86400000 % 7 !== 0)
                    throw new CouncilError(409, 'Keep the same weekly start day as the existing rotation for these students');
            }
            const created = await tx.councilPlan.create({ data: { name: input.name, config: input, createdById: res.locals.council.userId } });
            await tx.councilDutyEntry.createMany({ data: rows.map(row => ({ planId: created.id, date: row.date, dutyNumber: row.duty.number, dutyName: row.duty.name, dutyType: row.duty.type, instructions: row.duty.instructions, groupNumber: row.group.number, groupName: row.group.name, members: row.group.studentIds.map(id => ({ id, name: names.get(id)! })) })) });
            await audit(tx, res, 'CREATE', created.id, `Published ${input.name}: ${rows.length} daily duties; weekly rotation`);
            return created;
        }, { isolationLevel: 'Serializable' });
        res.status(201).json(plan);
    }));
    router.patch('/entries/:id', wrap(async (req, res) => {
        const input = councilReviewInput.parse(req.body);
        const entry = await prisma.councilDutyEntry.findUnique({ where: { id: String(req.params.id) } });
        if (!entry)
            throw new CouncilError(404, 'Duty not found');
        const member = (entry.members as {
            id: string;
        }[]).some(m => m.id === res.locals.council.studentId);
        if (!res.locals.council.canManage && !member)
            throw new CouncilError(403, 'This duty belongs to another team');
        if (!res.locals.council.canManage && (input.status !== 'COMPLETED' || input.rating !== null || entry.rating !== null))
            throw new CouncilError(403, 'Team members may mark their work done; council or staff must review it');
        // A council or staff "Not completed" decision stands until a reviewer changes it.
        if (!res.locals.council.canManage && entry.status === 'SKIPPED')
            throw new CouncilError(403, 'A reviewer marked this duty not completed. Ask them to review it again');
        if (member && !res.locals.council.staff && (input.rating !== null || entry.rating !== null))
            throw new CouncilError(403, 'Ask another council member or staff to rate your team');
        if (entry.date > malaysiaToday())
            throw new CouncilError(400, 'Future duties cannot be completed or rated');
        await prisma.$transaction(async (tx) => {
            const updated = await tx.councilDutyEntry.updateMany({ where: { id: entry.id, version: input.version }, data: { status: input.status, rating: input.rating, note: input.note, version: { increment: 1 }, reviewedById: res.locals.council.userId, reviewedByName: res.locals.council.name } });
            if (!updated.count)
                throw new CouncilError(409, 'This duty changed. Refresh before saving your review');
            await audit(tx, res, 'UPDATE', entry.id, JSON.stringify({ before: { status: entry.status, rating: entry.rating, note: entry.note }, after: input }));
        });
        res.json({ ok: true });
    }));
    // Staff and teacher posts can only be moderated by staff; council students moderate student posts.
    const STAFF_ROLES = ['ADMIN', 'STAFF', 'TEACHER'];
    const staffAuthors = async (authorIds: string[]) => {
        if (!authorIds.length)
            return new Set<string>();
        const users = await prisma.user.findMany({ where: { id: { in: [...new Set(authorIds)] }, role: { in: STAFF_ROLES as any } }, select: { id: true } });
        return new Set(users.map(u => u.id));
    };
    const assertCanModerate = async (res: Response, authorId: string) => {
        manage(res);
        if (!res.locals.council.staff && (await staffAuthors([authorId])).has(authorId))
            throw new CouncilError(403, 'Only staff can moderate posts written by staff or teachers');
    };
    // Responses never carry user IDs; the client receives only what it may do with each post.
    const publicReply = (r: { id: string; authorId: string; authorName: string; body: string; hidden: boolean; editedAt: Date | null; createdAt: Date }, res: Response, staffIds: Set<string>, open: boolean) => {
        const { authorId, ...rest } = r;
        const mine = authorId === res.locals.council.userId;
        return { ...rest, mine, staffAuthor: staffIds.has(authorId), canModerate: res.locals.council.staff || (res.locals.council.canManage && !staffIds.has(authorId)), canEdit: mine && open && !r.hidden, canDelete: mine };
    };
    const forumContentInput = forumTopicInput;
    router.get('/forum', wrap(async (req, res) => {
        const category = typeof req.query.category === 'string' ? req.query.category : '';
        const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 160) : '';
        const page = Math.max(0, Math.min(1000, Number(req.query.page) || 0));
        const hidden = req.query.hidden === 'true' && res.locals.council.canManage;
        const where = { hidden, deletedAt: null, ...(category ? { category } : {}), ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}) };
        const [topics, count] = await Promise.all([
            prisma.councilForumTopic.findMany({ where, orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }], take: 30, skip: Math.floor(page) * 30, select: { id: true, title: true, category: true, authorName: true, createdAt: true, updatedAt: true, editedAt: true, locked: true, pinned: true, _count: { select: { replies: { where: { hidden: false, deletedAt: null } } } } } }),
            prisma.councilForumTopic.count({ where }),
        ]);
        res.json({ topics, count });
    }));
    router.post('/forum', forumLimit, wrap(async (req, res) => {
        const input = forumTopicInput.parse(req.body);
        const topic = await prisma.councilForumTopic.create({ data: { ...input, authorId: res.locals.council.userId, authorName: res.locals.council.name } });
        res.status(201).json({ id: topic.id });
    }));
    router.get('/forum/:id', wrap(async (req, res) => {
        const page = Math.max(0, Math.min(10000, Math.floor(Number(req.query.page) || 0)));
        const replyWhere = { deletedAt: null, ...(res.locals.council.canManage ? {} : { hidden: false }) };
        const topic = await prisma.councilForumTopic.findUnique({ where: { id: String(req.params.id) }, include: { _count: { select: { replies: { where: replyWhere } } }, replies: { where: replyWhere, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: page * 50, take: 50 } } });
        if (!topic || topic.deletedAt || (topic.hidden && !res.locals.council.canManage))
            throw new CouncilError(404, 'Discussion not available');
        const staffIds = await staffAuthors([topic.authorId, ...topic.replies.map(r => r.authorId)]);
        const open = !topic.locked && !topic.hidden;
        const { authorId, replies, deletedAt: _deleted, ...rest } = topic;
        const mine = authorId === res.locals.council.userId;
        const othersReplied = mine ? await prisma.councilForumReply.count({ where: { topicId: topic.id, deletedAt: null, authorId: { not: authorId } } }) > 0 : true;
        res.json({ ...rest, mine, staffAuthor: staffIds.has(authorId), canModerate: res.locals.council.staff || (res.locals.council.canManage && !staffIds.has(authorId)), canEdit: mine && open, canDelete: mine && !othersReplied, replies: replies.map(({ deletedAt: _d, topicId: _t, ...r }) => publicReply(r, res, staffIds, open)) });
    }));
    router.post('/forum/:id/replies', forumLimit, wrap(async (req, res) => {
        const input = forumReplyInput.parse(req.body);
        const reply = await prisma.$transaction(async (tx) => {
            const update = await tx.councilForumTopic.updateMany({ where: { id: String(req.params.id), hidden: false, locked: false, deletedAt: null }, data: { updatedAt: new Date() } });
            if (!update.count)
                throw new CouncilError(409, 'Discussion is closed or unavailable');
            return tx.councilForumReply.create({ data: { ...input, topicId: String(req.params.id), authorId: res.locals.council.userId, authorName: res.locals.council.name } });
        });
        res.status(201).json({ id: reply.id });
    }));
    // Authors edit their own open, visible posts. Edits are marked but are not new discussion activity.
    router.patch('/forum/:id/content', forumLimit, wrap(async (req, res) => {
        const input = forumContentInput.parse(req.body);
        await prisma.$transaction(async (tx) => {
            const where = { id: String(req.params.id), authorId: res.locals.council.userId, hidden: false, locked: false, deletedAt: null };
            const topic = await tx.councilForumTopic.findFirst({ where, select: { updatedAt: true } });
            if (!topic)
                throw new CouncilError(409, 'You can edit only your own discussions while they are open');
            await tx.councilForumTopic.updateMany({ where, data: { ...input, editedAt: new Date(), updatedAt: topic.updatedAt } });
            await audit(tx, res, 'EDIT', String(req.params.id), 'Author edited forum discussion');
        });
        res.json({ ok: true });
    }));
    router.delete('/forum/:id', wrap(async (req, res) => {
        await prisma.$transaction(async (tx) => {
            const topic = await tx.councilForumTopic.findFirst({ where: { id: String(req.params.id), authorId: res.locals.council.userId, deletedAt: null }, select: { id: true, updatedAt: true } });
            if (!topic)
                throw new CouncilError(404, 'Discussion not found');
            if (await tx.councilForumReply.count({ where: { topicId: topic.id, deletedAt: null, authorId: { not: res.locals.council.userId } } }))
                throw new CouncilError(409, 'Others have replied. Ask a council member to close the discussion instead');
            await tx.councilForumTopic.update({ where: { id: topic.id }, data: { deletedAt: new Date(), updatedAt: topic.updatedAt } });
            await audit(tx, res, 'DELETE', topic.id, 'Author removed forum discussion');
        }, { isolationLevel: 'Serializable' });
        res.json({ ok: true });
    }));
    router.patch('/forum/:id/replies/:replyId/content', forumLimit, wrap(async (req, res) => {
        const input = forumReplyInput.parse(req.body);
        await prisma.$transaction(async (tx) => {
            const updated = await tx.councilForumReply.updateMany({ where: { id: String(req.params.replyId), authorId: res.locals.council.userId, hidden: false, deletedAt: null, topic: { id: String(req.params.id), hidden: false, locked: false, deletedAt: null } }, data: { ...input, editedAt: new Date() } });
            if (!updated.count)
                throw new CouncilError(409, 'You can edit only your own replies while the discussion is open');
            await audit(tx, res, 'EDIT', String(req.params.replyId), 'Author edited forum reply');
        });
        res.json({ ok: true });
    }));
    router.delete('/forum/:id/replies/:replyId', wrap(async (req, res) => {
        await prisma.$transaction(async (tx) => {
            const updated = await tx.councilForumReply.updateMany({ where: { id: String(req.params.replyId), topicId: String(req.params.id), authorId: res.locals.council.userId, deletedAt: null }, data: { deletedAt: new Date() } });
            if (!updated.count)
                throw new CouncilError(404, 'Reply not found');
            await audit(tx, res, 'DELETE', String(req.params.replyId), 'Author removed forum reply');
        });
        res.json({ ok: true });
    }));
    router.patch('/forum/:id', wrap(async (req, res) => {
        manage(res);
        const input = z.object({ pinned: z.boolean().optional(), locked: z.boolean().optional(), hidden: z.boolean().optional() }).strict()
            .refine(v => Object.keys(v).length > 0, 'Choose a moderation action').parse(req.body);
        const target = await prisma.councilForumTopic.findFirst({ where: { id: String(req.params.id), deletedAt: null }, select: { authorId: true } });
        if (!target)
            throw new CouncilError(404, 'Discussion not found');
        await assertCanModerate(res, target.authorId);
        await prisma.$transaction(async (tx) => {
            const topic = await tx.councilForumTopic.findUnique({ where: { id: String(req.params.id) }, select: { updatedAt: true } });
            if (!topic)
                throw new CouncilError(404, 'Discussion not found');
            // Moderation is not discussion activity: keep the "last activity" order unchanged.
            await tx.councilForumTopic.update({ where: { id: String(req.params.id) }, data: { ...input, updatedAt: topic.updatedAt } });
            await audit(tx, res, 'MODERATE', String(req.params.id), JSON.stringify(input));
        });
        res.json({ ok: true });
    }));
    router.patch('/forum/:id/replies/:replyId', wrap(async (req, res) => {
        manage(res);
        const input = z.object({ hidden: z.boolean() }).strict().parse(req.body);
        const target = await prisma.councilForumReply.findFirst({ where: { id: String(req.params.replyId), topicId: String(req.params.id), deletedAt: null }, select: { authorId: true } });
        if (!target)
            throw new CouncilError(404, 'Reply not found');
        await assertCanModerate(res, target.authorId);
        await prisma.$transaction(async (tx) => {
            const result = await tx.councilForumReply.updateMany({ where: { id: String(req.params.replyId), topicId: String(req.params.id) }, data: input });
            if (!result.count)
                throw new CouncilError(404, 'Reply not found');
            await audit(tx, res, 'MODERATE', String(req.params.replyId), JSON.stringify(input));
        });
        res.json({ ok: true });
    }));
    router.post('/forum/:id/reports', forumLimit, wrap(async (req, res) => {
        const input = forumReportInput.parse(req.body);
        const topic = await prisma.councilForumTopic.findFirst({ where: { id: String(req.params.id), hidden: false, deletedAt: null } });
        if (!topic)
            throw new CouncilError(404, 'Discussion not available');
        if (input.replyId && !await prisma.councilForumReply.findFirst({ where: { id: input.replyId, topicId: topic.id, hidden: false, deletedAt: null } }))
            throw new CouncilError(404, 'Reply not found');
        // One open report per person and post keeps the staff queue readable.
        const existing = await prisma.councilForumReport.findFirst({ where: { topicId: topic.id, replyId: input.replyId ?? null, reporterId: res.locals.council.userId, resolved: false }, select: { id: true } });
        if (existing)
            return res.status(200).json({ id: existing.id, duplicate: true });
        const report = await prisma.councilForumReport.create({ data: { ...input, topicId: topic.id, reporterId: res.locals.council.userId } });
        res.status(201).json({ id: report.id });
    }));
    // Reports can involve council members; reasons remain staff-only. Content removed by its author stays reviewable.
    router.get('/reports', wrap(async (_req, res) => {
        if (!res.locals.council.staff)
            throw new CouncilError(403, 'Staff access required');
        const reports = await prisma.councilForumReport.findMany({ where: { resolved: false }, orderBy: { createdAt: 'asc' }, take: 100, include: { topic: true } });
        const replies = await prisma.councilForumReply.findMany({ where: { id: { in: reports.flatMap(r => r.replyId ? [r.replyId] : []) } } });
        const strip = <T extends { authorId: string }>({ authorId: _a, ...rest }: T) => rest;
        res.json(reports.map(({ reporterId: _r, topic, ...r }) => {
            const reply = replies.find(x => x.id === r.replyId);
            return { ...r, topic: strip(topic), reply: reply ? strip(reply) : null };
        }));
    }));
    router.patch('/reports/:id', wrap(async (req, res) => {
        if (!res.locals.council.staff)
            throw new CouncilError(403, 'Staff access required');
        await prisma.$transaction(async (tx) => { await tx.councilForumReport.update({ where: { id: String(req.params.id) }, data: { resolved: true } }); await audit(tx, res, 'RESOLVE_REPORT', String(req.params.id), 'Reviewed forum report'); });
        res.json({ ok: true });
    }));
    router.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
        if (error instanceof z.ZodError)
            return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
        if (error instanceof CouncilError)
            return res.status(error.status).json({ error: error.message });
        if (error?.code === 'P2034')
            return res.status(409).json({ error: 'Another change was saved at the same time. Refresh and try again' });
        if (error?.code === 'P2025')
            return res.status(404).json({ error: 'Record not found' });
        logger.error('Council workspace error', error);
        return res.status(500).json({ error: 'Could not save or load this council record. Please try again' });
    });
    app.use('/api/council', router);
}
