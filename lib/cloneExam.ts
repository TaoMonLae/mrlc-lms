import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

/** Called in one transaction so a failed copy never leaves a half-built exam. */
export async function cloneExam(tx: Prisma.TransactionClient, sourceId: string, ownerId: string) {
  const source = await tx.exam.findUnique({
    where: { id: sourceId },
    include: {
      sections: true, stimuli: true, questionGroups: true,
      questions: { include: { optionRows: true } },
      rubrics: { include: { criteria: true } },
      examQuestions: true, blueprintRules: true, resultPolicy: true,
    },
  });
  if (!source) return null;
  const copy = await tx.exam.create({ data: {
    ownerId, title: `${source.title} (Copy)`, type: source.type, status: 'DRAFT', date: source.date,
    durationMinutes: source.durationMinutes, totalMarks: source.totalMarks, settings: source.settings ?? Prisma.DbNull,
    classId: source.classId, subjectId: source.subjectId, passMark: source.passMark,
    shuffleQuestions: source.shuffleQuestions, shuffleOptions: source.shuffleOptions, negativeMarking: source.negativeMarking,
    attemptLimit: source.attemptLimit, gracePeriodMinutes: source.gracePeriodMinutes, allowLateStart: source.allowLateStart,
    requiresAccessCode: false, requiresInvigilator: source.requiresInvigilator, clonedFromId: source.id,
  } });
  const sections = new Map<string, string>();
  const stimuli = new Map<string, string>();
  const groups = new Map<string, string>();
  const questions = new Map<string, string>();
  const mapped = (ids: Map<string, string>, id: string | null) => id ? ids.get(id) ?? null : null;

  for (const row of source.sections) {
    const { id, examId, createdAt, updatedAt, ...data } = row;
    const saved = await tx.examSection.create({ data: { ...data, examId: copy.id } });
    sections.set(id, saved.id);
  }
  for (const row of source.stimuli) {
    const { id, examId, createdAt, updatedAt, data, ...fields } = row;
    const saved = await tx.stimulus.create({ data: { ...fields, data: data ?? Prisma.DbNull, examId: copy.id } });
    stimuli.set(id, saved.id);
  }
  for (const row of source.questionGroups) {
    const { id, examId, createdAt, updatedAt, ...data } = row;
    const saved = await tx.questionGroup.create({ data: {
      ...data, examId: copy.id, sectionId: mapped(sections, row.sectionId), stimulusId: mapped(stimuli, row.stimulusId),
    } });
    groups.set(id, saved.id);
  }
  for (const row of source.questions) {
    const { id, examId, createdAt, updatedAt, optionRows, answerKeyCorrectedAt, ...data } = row;
    const options = new Map(optionRows.map(option => [option.id, randomUUID()]));
    const key = (value: string) => options.get(value) ?? value;
    const saved = await tx.question.create({ data: {
      ...data, examId: copy.id, createdById: ownerId,
      sectionId: mapped(sections, row.sectionId), stimulusId: mapped(stimuli, row.stimulusId), groupId: mapped(groups, row.groupId),
      options: row.options ?? Prisma.DbNull,
      correctAnswer: row.correctAnswer === null ? null : key(row.correctAnswer),
      correctAnswers: Array.isArray(row.correctAnswers)
        ? row.correctAnswers.map(value => typeof value === 'string' ? key(value) : value) : row.correctAnswers ?? Prisma.DbNull,
      optionWeights: row.optionWeights && typeof row.optionWeights === 'object' && !Array.isArray(row.optionWeights)
        ? Object.fromEntries(Object.entries(row.optionWeights).map(([id, weight]) => [key(id), weight])) : row.optionWeights ?? Prisma.DbNull,
      optionRows: { create: optionRows.map(({ id, text, isCorrect, weight, orderIndex }) => ({ id: options.get(id), text, isCorrect, weight, orderIndex })) },
    } });
    questions.set(id, saved.id);
  }
  for (const row of source.examQuestions) {
    const { id, examId, createdAt, ...data } = row;
    await tx.examQuestion.create({ data: {
      ...data, examId: copy.id, questionId: questions.get(row.questionId) ?? row.questionId, sectionId: mapped(sections, row.sectionId),
    } });
  }
  for (const row of source.blueprintRules) {
    const { id, examId, createdAt, ...data } = row;
    await tx.examBlueprintRule.create({ data: { ...data, examId: copy.id, sectionId: mapped(sections, row.sectionId) } });
  }
  for (const row of source.rubrics) {
    const { id, examId, createdAt, updatedAt, criteria, ...data } = row;
    await tx.gradingRubric.create({ data: {
      ...data, examId: copy.id, questionId: row.questionId ? questions.get(row.questionId) ?? row.questionId : null,
      criteria: { create: criteria.map(({ label, description, maxScore, orderIndex, levels }) => ({
        label, description, maxScore, orderIndex, levels: levels ?? Prisma.DbNull,
      })) },
    } });
  }
  if (source.resultPolicy) {
    const { id, examId, createdAt, updatedAt, releaseAt, ...policy } = source.resultPolicy;
    // A copied scheduled release must be scheduled anew before results can open.
    await tx.examResultPolicy.create({ data: { ...policy, examId: copy.id, releaseAt: null } });
  }
  return copy;
}
