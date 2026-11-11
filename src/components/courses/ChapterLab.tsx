import {useState} from 'react';
import {Button} from '@/components/ui/button';
import type {ChapterStudioData} from '../../../shared/gedChapterStudio';
import type {CourseItem} from '../../../shared/courses';

export function FlashcardDeck({studio,sessionKey}:{studio:ChapterStudioData;sessionKey:string}) {
 const [queue,setQueue]=useState(()=>{
   try {
     const terms: unknown = JSON.parse(sessionStorage.getItem(sessionKey) ?? 'null');
     if(Array.isArray(terms) && terms.every(term=>studio.cards.some(card=>card.term===term))) return terms.map(term=>studio.cards.find(card=>card.term===term)!);
   } catch { /* Storage is optional. */ }
   return studio.cards;
 }),[flipped,flip]=useState(false);
 function save(cards:typeof queue){setQueue(cards);try{sessionStorage.setItem(sessionKey,JSON.stringify(cards.map(c=>c.term)));}catch{/* Storage is optional. */}}

 function rate(review:boolean){ save(review?[...queue.slice(1),queue[0]]:queue.slice(1));flip(false); }
 if (!queue.length) return <div className="chapter-lab"><h3>Deck complete</h3><p>You recalled all {studio.cards.length} terms. Try applying them in Assess.</p><Button onClick={()=>save(studio.cards)}>Study again</Button></div>;
 return <div className="chapter-lab"><p className="course-meta">{queue.length} terms left · Recall the meaning before revealing it</p><button className="chapter-flash" onClick={()=>flip(!flipped)} aria-label={flipped?'Show term':'Reveal definition'}><small>{flipped?'Definition':'Term'}</small><strong>{flipped?queue[0].definition:queue[0].term}</strong><span>{flipped?'Show term':'Reveal definition'}</span></button>{flipped && <div className="course-actions"><Button variant="outline" onClick={()=>rate(true)}>Review again</Button><Button onClick={()=>rate(false)}>I remembered</Button></div>}</div>;
}
export function ChapterAssess({studio}:{studio:ChapterStudioData}) {
 const [selected,choose]=useState<number>(),[checked,check]=useState(false);
 return <div className="chapter-lab"><h3>Apply what you learned</h3><blockquote className="course-quiz-source">{studio.scenario}</blockquote><fieldset className="chapter-assess"><legend>{studio.question}</legend>{studio.choices.map((text,i)=><label key={text}><input type="radio" checked={selected===i} disabled={checked} onChange={()=>choose(i)}/>{text}</label>)}</fieldset>{checked ? <div role="status"><strong>{selected===studio.correct?'Correct.':'Review this example.'}</strong><p>{studio.reasoning}</p><Button variant="outline" onClick={()=>{check(false);choose(undefined);}}>Try again</Button></div>:<Button disabled={selected===undefined} onClick={()=>check(true)}>Check my answer</Button>}</div>;
}
export function PreviewTest({item}:{item:CourseItem}){
 const [answers,setAnswers]=useState<Record<string,string>>({}),[submitted,submit]=useState(false);
 return <div className="chapter-lab"><p>Teacher preview · Practice responses here do not create a student attempt.</p>{item.questions?.map((q,i)=><fieldset className="chapter-assess" key={q.id}><legend>{i+1}. {q.prompt}</legend><blockquote className="course-quiz-source">{q.passage}</blockquote>{q.kind==='CHOICE'?q.options.map(o=><label key={o}><input type="radio" checked={answers[q.id]===o} disabled={submitted} onChange={()=>setAnswers({...answers,[q.id]:o})}/>{o}</label>):<input aria-label={q.prompt} type="number" step="any" disabled={submitted} value={answers[q.id]??''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/>} {submitted && <p><strong>{q.answer}</strong> · {q.explanation}</p>}</fieldset>)}<Button onClick={()=>{if(submitted)setAnswers({});submit(!submitted);}}>{submitted?'Reset preview':'Review answers'}</Button></div>;
}
