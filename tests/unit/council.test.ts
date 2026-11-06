import assert from 'node:assert/strict';
import test from 'node:test';
import { councilPlanInput, councilReviewInput, rotationRows, councilAccess, termEnd, malaysiaToday, type CouncilPlanInput } from '../../shared/council';
const plan: CouncilPlanInput = { name: 'Boarding', startDate: '2026-11-05', endDate: '2026-11-25', rotationDays: 7, groups: [1, 2, 3].map(number => ({ number, name: `Team ${number}`, studentIds: [`s${number}`] })), duties: [{ number: 1, name: 'Meals', type: 'COOKING', instructions: '' }, { number: 2, name: 'Common areas', type: 'CLEANING', instructions: '' }] };
test('weekly rotation covers every day without mixing cooking and cleaning for a student in a week', () => {
    const rows = rotationRows(plan);
    assert.equal(rows.length, 42);
    for (let week = 0; week < 3; week++)
        for (const group of plan.groups) {
            const duties = rows.filter(r => Math.floor((Date.parse(r.date) - Date.parse(plan.startDate)) / 604800000) === week && r.group.number === group.number);
            assert.ok(new Set(duties.map(d => d.duty.type)).size <= 1);
        }
    assert.equal(rows.find(r => r.date === '2026-11-12' && r.duty.number === 1)?.group.number, 2);
    assert.equal(rows.find(r => r.date === '2026-11-19' && r.duty.number === 1)?.group.number, 3);
});
test('rejects double membership, duplicate numbers, too many slots and invalid dates', () => {
    assert.equal(councilPlanInput.safeParse({ ...plan, groups: [...plan.groups, { ...plan.groups[0], number: 4 }] }).success, false);
    assert.equal(councilPlanInput.safeParse({ ...plan, duties: [plan.duties[0], plan.duties[0]] }).success, false);
    assert.equal(councilPlanInput.safeParse({ ...plan, groups: [plan.groups[0]] }).success, false);
    assert.equal(councilPlanInput.safeParse({ ...plan, startDate: '2026-02-30' }).success, false);
    assert.equal(councilPlanInput.safeParse({ ...plan, endDate: '2027-11-05' }).success, false);
    assert.equal(councilPlanInput.safeParse({ ...plan, rotationDays: 1 }).success, false);
});
test('ratings are whole numbers 1–5 only for completed duties', () => {
    for (const rating of [0, 6, 1.5])
        assert.equal(councilReviewInput.safeParse({ version: 0, status: 'COMPLETED', rating, note: '' }).success, false);
    assert.equal(councilReviewInput.safeParse({ version: 0, status: 'PENDING', rating: 5, note: '' }).success, false);
    assert.equal(councilReviewInput.safeParse({ version: 0, status: 'COMPLETED', rating: 5, note: '' }).success, true);
});
test('three-month terms handle month ends and school dates use Malaysia time', () => {
    assert.equal(termEnd('2026-11-05'), '2027-02-04');
    assert.equal(termEnd('2026-11-30'), '2027-02-27');
    assert.equal(malaysiaToday(new Date('2026-11-04T16:01:00Z')), '2026-11-05');
    assert.equal(councilAccess('STUDENT', 'TREASURER').canManage, true);
    assert.equal(councilAccess('STUDENT').canManage, false);
    assert.equal(councilAccess('GUARDIAN', 'PRESIDENT').canManage, false);
});
