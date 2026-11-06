import { z } from 'zod';
import { isStudentCouncilRole } from './studentCouncil';
export const councilCategories = ['School life', 'Duty swaps', 'Ideas & feedback', 'Study together'] as const;
export const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}, 'Use a valid calendar date');
const shortText = z.string().trim().min(1).max(100);
export const councilPlanInput = z.object({
    name: shortText,
    startDate: dateKey,
    endDate: dateKey,
    rotationDays: z.literal(7),
    groups: z.array(z.object({ number: z.number().int().min(1).max(999), name: shortText, studentIds: z.array(z.string().min(1)).min(1).max(100) })).min(1).max(50),
    duties: z.array(z.object({ number: z.number().int().min(1).max(999), name: shortText, type: z.enum(['CLEANING', 'COOKING']), instructions: z.string().trim().max(2000) })).min(1).max(30),
}).superRefine((value, ctx) => {
    const days = (Date.parse(value.endDate) - Date.parse(value.startDate)) / 86400000;
    if (days < 0 || days > 89)
        ctx.addIssue({ code: 'custom', message: 'Choose a period of 1–90 days', path: ['endDate'] });
    for (const key of ['groups', 'duties'] as const)
        if (new Set(value[key].map(x => x.number)).size !== value[key].length)
            ctx.addIssue({ code: 'custom', message: `${key} must have unique numbers`, path: [key] });
    const students = value.groups.flatMap(g => g.studentIds);
    if (new Set(students).size !== students.length)
        ctx.addIssue({ code: 'custom', message: 'A student can belong to only one group in this rotation', path: ['groups'] });
    if (value.duties.length > value.groups.length)
        ctx.addIssue({ code: 'custom', message: 'Add at least one group per duty to avoid double-booking', path: ['groups'] });
});
export type CouncilPlanInput = z.infer<typeof councilPlanInput>;
export function rotationRows(input: CouncilPlanInput) {
    const value = councilPlanInput.parse(input);
    const groups = [...value.groups].sort((a, b) => a.number - b.number);
    const duties = [...value.duties].sort((a, b) => a.number - b.number);
    const rows = [];
    for (let day = 0; day <= (Date.parse(value.endDate) - Date.parse(value.startDate)) / 86400000; day++) {
        const date = new Date(Date.parse(value.startDate) + day * 86400000).toISOString().slice(0, 10);
        for (let index = 0; index < duties.length; index++)
            rows.push({ date, duty: duties[index], group: groups[(Math.floor(day / value.rotationDays) + index) % groups.length] });
    }
    return rows;
}
export function councilAccess(role: string, councilRole?: string | null) {
    const staff = ['ADMIN', 'STAFF', 'TEACHER'].includes(role);
    return { canView: staff || role === 'STUDENT', canManage: staff || (role === 'STUDENT' && isStudentCouncilRole(councilRole)), staff };
}
export const councilReviewInput = z.object({
    version: z.number().int().min(0), status: z.enum(['PENDING', 'COMPLETED', 'SKIPPED']),
    rating: z.number().int().min(1).max(5).nullable(), note: z.string().trim().max(1000),
}).refine(v => v.status === 'COMPLETED' || v.rating === null, 'Only completed duties can receive points');
export const forumTopicInput = z.object({ title: z.string().trim().min(3).max(160), body: z.string().trim().min(1).max(8000), category: z.enum(councilCategories) });
export const forumReplyInput = z.object({ body: z.string().trim().min(1).max(4000) });
export const forumReportInput = z.object({ reason: z.string().trim().min(3).max(1000), replyId: z.string().optional() });
export function malaysiaToday(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function termEnd(start: string) {
    dateKey.parse(start);
    const d = new Date(`${start}T00:00:00Z`);
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d.getUTCDate(), last));
    target.setUTCDate(target.getUTCDate() - 1);
    return target.toISOString().slice(0, 10);
}
export const handbookDuties = [
    { number: 1, name: 'Cooking team', type: 'COOKING' as const, instructions: 'Breakfast 8:00 AM · Lunch 12:00 PM · Dinner 6:30 PM. Keep the kitchen clean during cooking; wash utensils, pots and surfaces immediately afterwards. Report shortages to the Girls Hostel Monitor. Prepare sensible portions and avoid food waste.' },
    { number: 2, name: 'Cleaning team', type: 'CLEANING' as const, instructions: 'Sweep and mop common areas before 8:00 AM. Disinfect toilets morning and evening; empty bins and wipe dining and multipurpose tables after use. Report damage, flooding or maintenance issues promptly.' },
];
export const councilResponsibilities = [
    ['President', 'Chair weekly meetings, follow up actions, represent students and send a monthly report to the administration.', '3'],
    ['Vice President', 'Support the President, supervise hostel monitors and coordinate orientations and day/boarding communication.', '3'],
    ['Secretary', 'Keep records and attendance, distribute minutes within 48 hours and supervise resource monitors.', '3'],
    ['Treasurer', 'Keep transparent shared-fund records, receipts and weekly updates. Spending needs Council approval and a supporting record.', '4'],
    ['Hostel monitors', 'Check hostel spaces daily, confirm weekly duty teams, record maintenance concerns and support weekday lights-out at 10:30 PM.', '5'],
    ['Resource monitors', 'Maintain resource sign-outs, report weekly inventory to the Secretary and keep the first-floor library tidy and quiet.', '6'],
] as const;
