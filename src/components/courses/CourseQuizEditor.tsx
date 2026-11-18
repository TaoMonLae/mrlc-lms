import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CourseItem, CourseQuestion } from '../../../shared/courses';

export function CourseQuizEditor({ item, onChange }: { item: CourseItem; onChange: (patch: Partial<CourseItem>) => void }) {
  const questions = item.questions ?? [];
  const patch = (index: number, change: Partial<CourseQuestion>) => onChange({ questions: questions.map((question, i) => i === index ? { ...question, ...change } : question) });
  return <div className="course-quiz-editor">
    <div className="course-form-grid"><div className="course-field"><Label htmlFor="quiz-pass">Pass mark (%)</Label><Input id="quiz-pass" type="number" min="1" max="100" value={item.passingPercent ?? 70} onChange={event => onChange({ passingPercent: Number(event.target.value) })} /></div><p className="course-helper">The lesson duration above is the test time limit. Students may retry; results stay in this course.</p></div>
    <div className="course-section-heading"><h3>Original unit questions</h3><p>Add at least three. Students receive the explanations after submitting.</p></div>
    {questions.map((question, index) => <div key={question.id} className="course-quiz-question"><div className="course-edit-heading"><h4>Question {index + 1}</h4><Button type="button" variant="ghost" aria-label={`Remove question ${index + 1}`} onClick={() => onChange({ questions: questions.filter(row => row.id !== question.id) })}><Trash2 size={16} /></Button></div>
      <div className="course-field"><Label htmlFor={`q-${question.id}-source`}>Source or scenario</Label><Textarea id={`q-${question.id}-source`} rows={3} value={question.passage} onChange={event => patch(index, { passage: event.target.value })} /></div>
      <div className="course-field"><Label htmlFor={`q-${question.id}-prompt`}>Question</Label><Textarea id={`q-${question.id}-prompt`} rows={2} value={question.prompt} onChange={event => patch(index, { prompt: event.target.value })} /></div>
      <div className="course-field"><Label htmlFor={`q-${question.id}-kind`}>Answer format</Label><select className="course-select" id={`q-${question.id}-kind`} value={question.kind} onChange={event => patch(index, { kind: event.target.value as CourseQuestion['kind'], options: event.target.value === 'NUMERIC' ? [] : ['', '', '', ''], answer: '' })}><option value="CHOICE">Four choices</option><option value="NUMERIC">Numeric entry</option></select></div>
      {question.kind === 'CHOICE' && <div className="course-form-grid">{question.options.map((option, optionIndex) => <div key={optionIndex} className="course-field"><Label htmlFor={`q-${question.id}-option-${optionIndex}`}>Choice {optionIndex + 1}</Label><Input id={`q-${question.id}-option-${optionIndex}`} value={option} onChange={event => patch(index, { options: question.options.map((row, i) => i === optionIndex ? event.target.value : row), answer: question.answer === option ? event.target.value : question.answer })} /></div>)}</div>}
      <div className="course-field"><Label htmlFor={`q-${question.id}-answer`}>Correct answer</Label>{question.kind === 'CHOICE' ? <select id={`q-${question.id}-answer`} className="course-select" value={question.answer} onChange={event => patch(index, { answer: event.target.value })}><option value="">Select a choice</option>{question.options.filter(Boolean).map((option, i) => <option key={i} value={option}>{option}</option>)}</select> : <Input id={`q-${question.id}-answer`} type="number" step="any" value={question.answer} onChange={event => patch(index, { answer: event.target.value })} />}</div>
      <div className="course-field"><Label htmlFor={`q-${question.id}-explanation`}>Explanation shown after submission</Label><Textarea id={`q-${question.id}-explanation`} rows={2} value={question.explanation} onChange={event => patch(index, { explanation: event.target.value })} /></div>
    </div>)}
    <Button type="button" variant="outline" disabled={questions.length >= 30} onClick={() => onChange({ questions: [...questions, { id: crypto.randomUUID(), kind: 'CHOICE', prompt: '', passage: '', options: ['', '', '', ''], answer: '', explanation: '' }] })}><Plus size={16} />Add question</Button>
  </div>;
}
