import { z } from 'zod';

const numberInput = <T extends z.ZodType>(schema: T) => z.preprocess(value => {
  if (value === '') return null;
  return typeof value === 'string' && value.trim() ? Number(value) : value;
}, schema);

const dateInput = z.union([z.string(), z.date(), z.null()])
  .transform(value => value === '' || value === null ? null : new Date(value))
  .refine(value => value === null || Number.isFinite(value.getTime()), 'Enter a valid schedule date');

const schema = z.object({
  availableFrom: dateInput.optional(),
  availableUntil: dateInput.optional(),
  resultReleaseAt: dateInput.optional(),
  attemptLimit: numberInput(z.number().int().min(1)).optional(),
  gracePeriodMinutes: numberInput(z.number().int().min(0)).optional(),
  durationMinutes: numberInput(z.number().int().min(1).nullable()).optional(),
  passMark: numberInput(z.number().min(0).nullable()).optional(),
  allowLateStart: z.boolean().optional(),
  requiresAccessCode: z.boolean().optional(),
  requiresInvigilator: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  negativeMarking: z.boolean().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'PUBLISHED']).optional(),
});

type CurrentSchedule = {
  availableFrom?: Date | string | null;
  availableUntil?: Date | string | null;
  totalMarks?: number | null;
};

/** Validate the resulting window while writing only fields the caller supplied. */
export function examScheduleUpdate(input: unknown, current: CurrentSchedule) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('. '));
  const data = parsed.data;
  const from = data.availableFrom === undefined ? current.availableFrom : data.availableFrom;
  const until = data.availableUntil === undefined ? current.availableUntil : data.availableUntil;
  if (from && until && new Date(until) <= new Date(from)) throw new Error('Available until must be after available from');
  if (data.passMark != null && current.totalMarks != null && data.passMark > current.totalMarks) throw new Error('Pass mark cannot exceed the exam total');
  return data;
}
