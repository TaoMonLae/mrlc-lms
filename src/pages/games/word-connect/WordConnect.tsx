import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, HelpCircle, Lightbulb, Lock, Star, Volume2, VolumeX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { LEVELS, WORLDS, worldFor, type WordLevel } from './content';
import { buildCrossword, emptyLevel, isComplete, revealHint, starsFor, submitWord, unlockedLevel, type LevelProgress } from './engine';
import { useAdventure } from './useAdventure';
import { LetterWheel } from './LetterWheel';
import './word-connect.css';

function Stars({ count }: { count: number }) { return <span className="wc-stars" aria-label={`${count} stars`}>{[1, 2, 3].map(i => <Star key={i} size={18} fill={i <= count ? 'currentColor' : 'none'} className={i <= count ? '' : 'is-empty'} />)}</span>; }
function SaveNotice({ error }: { error: boolean }) { return error ? <p className="wc-save-error" role="alert">Your browser couldn’t save progress. Keep this tab open; check that browser storage is available.</p> : null; }
function Help({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}><DialogContent className="wc-dialog">
    <span className="wc-eyebrow">A little help from Pip</span>
    <DialogTitle className="wc-dialog-title">Small letters. Big discoveries.</DialogTitle>
    <DialogDescription>Connect letters to fill the crossword. Each letter on the wheel can be used once per word.</DialogDescription>
    <div className="wc-tutorial-example" aria-label="Example: R, E, A, D makes READ">{'READ'.split('').map(letter => <span key={letter}>{letter}</span>)}</div>
    <ul className="wc-help-list"><li>Swipe through letters and release, or tap letters and check your word.</li><li>Focus the wheel and type. Enter checks, Backspace undoes, Escape clears.</li><li>Select a word clue for hints: meaning, sentence, first letter, then answer.</li><li>Find bonus words and collect their meanings. There’s no penalty for trying!</li></ul>
    <button className="wc-button" onClick={onClose}>Let’s explore <ArrowRight size={18} /></button>
  </DialogContent></Dialog>;
}

export default function WordConnect() {
  const { progress, saveError } = useAdventure();
  const [collection, setCollection] = useState(false);
  const completed = LEVELS.filter(level => isComplete(level, progress.levels[level.id]));
  const next = LEVELS.find(level => !isComplete(level, progress.levels[level.id]));
  const words = LEVELS.flatMap(level => [...level.words.filter(w => progress.levels[level.id]?.found.includes(w.word)), ...level.bonus.filter(w => progress.levels[level.id]?.bonus.includes(w.word))]);
  const collected = [...new Map(words.map(word => [word.word, word])).values()];
  const stars = completed.reduce((sum, level) => sum + starsFor(progress.levels[level.id]), 0);
  return <section className="wc-game wc-map-page">
    <header className="wc-page-heading"><div><span className="wc-eyebrow"><Compass size={15} /> YOUR WORD JOURNEY</span><h1>Word Connect <span>Adventure</span></h1><p>Follow your curiosity. One word at a time.</p></div><button className="wc-outline-button" onClick={() => setCollection(true)}><BookOpen size={18} /> Word collection <span>{collected.length}</span></button></header>
    <SaveNotice error={saveError} />
    <div className="wc-map-layout">
      <div className="wc-trail">
        {WORLDS.map((world, worldIndex) => <section key={world.id} className="wc-world" style={{ '--world-color': world.color } as React.CSSProperties}>
          <header className="wc-world-heading"><span>0{worldIndex + 1}</span><div><h2>{world.title}</h2><p>{world.description}</p></div></header>
          <div className="wc-path">
            <svg viewBox="0 0 360 340" preserveAspectRatio="none" aria-hidden="true"><path d="M115 30 C115 80 173 85 173 140 S90 205 90 250 S150 305 150 340" /></svg>
            {world.levels.map((level, localIndex) => {
              const index = LEVELS.indexOf(level), done = isComplete(level, progress.levels[level.id]), unlocked = unlockedLevel(index, progress), current = next?.id === level.id;
              const node = <><span className={`wc-node ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>{done ? <Check size={29} /> : unlocked ? <BookOpen size={26} /> : <Lock size={22} />}</span><span className="wc-node-caption"><strong>{index + 1}. {level.title}</strong>{done ? <Stars count={starsFor(progress.levels[level.id])} /> : <small>{current ? 'START HERE' : unlocked ? 'Ready to explore' : 'Complete the previous level'}</small>}</span></>;
              return unlocked ? <Link key={level.id} to={`/games/word-connect/play/${level.id}`} className={`wc-level-node wc-node-${localIndex} ${current ? 'is-current' : ''}`} aria-label={`${done ? 'Review' : 'Play'} level ${index + 1}: ${level.title}`}>{node}</Link> : <div key={level.id} className={`wc-level-node wc-node-${localIndex} is-locked`} aria-label={`Level ${index + 1} locked: ${level.title}`}>{node}</div>;
            })}
          </div>
        </section>)}
        <div className="wc-finish"><Compass size={26} /><strong>{next ? 'A world of words is waiting.' : 'Adventure complete. Look at all you’ve learned!'}</strong></div>
      </div>
      <aside className="wc-journey-summary">
        <div className="wc-pip-note"><div className="wc-pip-speech"><span className="wc-eyebrow">MEET PIP</span><h2>Your curious little guide.</h2><p>{next ? 'Every word opens a new path. Let’s see what we can find!' : 'We made it! Your collection is full of discoveries.'}</p></div><img src="/games/word-connect/pip.png" alt="Pip, a cheerful teal pangolin explorer waving" /></div>
        <div className="wc-progress-summary"><h2>Adventure journal</h2><div className="wc-stat"><span>Destinations explored</span><strong>{WORLDS.filter(world => world.levels.every(level => isComplete(level, progress.levels[level.id]))).length} <small>/ 4</small></strong></div><div className="wc-stat"><span>Levels completed</span><strong>{completed.length} <small>/ {LEVELS.length}</small></strong></div><progress value={completed.length} max={LEVELS.length} aria-label="Levels completed" /><div className="wc-stat"><span><Star size={16} /> Stars earned</span><strong>{stars} <small>/ 36</small></strong></div>
          {next && <Link className="wc-button" to={`/games/word-connect/play/${next.id}`}>{completed.length ? 'Continue adventure' : 'Start adventure'} <ArrowRight size={18} /></Link>}
          <p className="wc-local-note">Your progress saves on this browser.</p>
        </div>
      </aside>
    </div>
    <Dialog open={collection} onOpenChange={setCollection}><DialogContent className="wc-dialog wc-collection"><DialogTitle className="wc-dialog-title">Your word collection</DialogTitle><DialogDescription>{collected.length ? `${collected.length} words discovered. Keep their meanings close.` : 'Solve a puzzle to start your collection. Bonus words count too!'}</DialogDescription><div className="wc-collection-list">{collected.map(item => <article key={item.word}><h3>{item.word}</h3><p>{item.meaning}</p><small>{item.example}</small></article>)}</div></DialogContent></Dialog>
  </section>;
}

export function WordConnectPlay() {
  const { levelId } = useParams();
  const { progress, update, saveError } = useAdventure();
  const index = LEVELS.findIndex(level => level.id === levelId);
  if (index < 0 || !unlockedLevel(index, progress)) return <section className="wc-game wc-unavailable"><Lock size={36} /><h1>{index < 0 ? 'Puzzle not found' : 'This path opens soon'}</h1><p>Continue your adventure from the map.</p><Link className="wc-button" to="/games/word-connect">Back to adventure <ArrowRight size={18} /></Link></section>;
  return <Puzzle key={levelId} level={LEVELS[index]} index={index} progress={progress.levels[levelId!] || emptyLevel()} sound={progress.sound} tutorialSeen={progress.tutorialSeen} saveError={saveError} setLevel={change => update(current => ({ ...current, levels: { ...current.levels, [levelId!]: change(current.levels[levelId!] || emptyLevel()) } }))} setSound={sound => update(current => ({ ...current, sound }))} markTutorial={() => update(current => ({ ...current, tutorialSeen: true }))} />;
}

function Puzzle({ level, index, progress, sound, tutorialSeen, saveError, setLevel, setSound, markTutorial }: { level: WordLevel; index: number; progress: LevelProgress; sound: boolean; tutorialSeen: boolean; saveError: boolean; setLevel: (change: (current: LevelProgress) => LevelProgress) => void; setSound: (sound: boolean) => void; markTutorial: () => void }) {
  const [help, setHelp] = useState(!tutorialSeen && !isComplete(level, progress));
  const [selectedWord, setSelectedWord] = useState((level.words.find(item => !progress.found.includes(item.word)) || level.words[0]).word);
  const [feedback, setFeedback] = useState({ kind: 'neutral', text: 'A new word is just a few letters away.' });
  const [celebrate, setCelebrate] = useState(isComplete(level, progress));
  const board = buildCrossword(level.words.map(w => w.word));
  const complete = isComplete(level, progress), world = worldFor(level.id);
  const target = level.words.find(w => w.word === selectedWord)!;
  const stage = progress.hints[target.word] || 0;
  const targetFound = progress.found.includes(target.word);
  const next = LEVELS[index + 1];
  function pronounce(text: string) {
    if (sound && 'speechSynthesis' in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = 0.85; window.speechSynthesis.speak(utterance); }
  }
  function checkWord(candidate: string) {
    const result = submitWord(level, progress, candidate);
    const word = candidate.toUpperCase().trim(), item = [...level.words, ...level.bonus].find(w => w.word === word);
    const text = result.kind === 'correct' ? `${word} — ${item!.meaning}` : result.kind === 'bonus' ? `Bonus discovery! ${word} — ${item!.meaning}` : result.kind === 'duplicate' ? `You’ve already found ${word}. Try another word.` : 'Not in this puzzle’s word list. Try another combination.';
    setFeedback({ kind: result.kind, text });
    if (result.kind === 'correct' || result.kind === 'bonus') {
      setLevel(current => submitWord(level, current, word).progress);
      pronounce(word);
      if (isComplete(level, result.progress)) setCelebrate(true);
      else if (result.kind === 'correct') setSelectedWord(level.words.find(w => !result.progress.found.includes(w.word))!.word);
    }
  }
  function hint() {
    const nextProgress = revealHint(level, progress, target.word);
    setLevel(current => revealHint(level, current, target.word));
    setFeedback({ kind: 'neutral', text: nextProgress.hints[target.word] === 4 ? `${target.word} revealed. Read its meaning below.` : 'A little clue for the selected word.' });
    if (isComplete(level, nextProgress)) setCelebrate(true);
  }
  return <section className="wc-game wc-puzzle-page">
    <header className="wc-play-heading"><Link className="wc-icon-button" to="/games/word-connect" aria-label="Back to adventure map"><ArrowLeft size={22} /></Link><div><span className="wc-eyebrow">{world.title} · LEVEL {index + 1}</span><h1>{level.title}</h1></div><button className="wc-icon-button" aria-label="How to play" onClick={() => setHelp(true)}><HelpCircle size={21} /></button></header>
    <SaveNotice error={saveError} />
    <div className="wc-play-progress"><progress value={progress.found.length} max={level.words.length} aria-label="Words found" /><span>{progress.found.length} / {level.words.length} words</span></div>
    <div className="wc-puzzle-layout">
      <div className="wc-play-board">
        <div className="wc-crossword-wrap"><div className="wc-crossword" style={{ gridTemplateColumns: `repeat(${board.width}, 1fr)`, width: `calc(${board.width} * var(--wc-cell-size, 42px))` }} aria-label="Crossword puzzle">
          {board.cells.map(cell => {
            const found = cell.words.some(word => progress.found.includes(word));
            const firstLetter = board.placements.some(p => p.x === cell.x && p.y === cell.y && (progress.hints[p.word] || 0) >= 3);
            const active = cell.words.includes(target.word) && !targetFound;
            const starts = level.words.map((item, i) => ({ i: i + 1, p: board.placements.find(p => p.word === item.word)! })).filter(({ p }) => p.x === cell.x && p.y === cell.y);
            return <button key={`${cell.x},${cell.y}`} tabIndex={-1} className={`wc-cell ${found ? 'is-found' : ''} ${active ? 'is-active' : ''}`} style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }} aria-label={`${found || firstLetter ? cell.letter : 'Blank'}, ${cell.words.map(w => `word ${level.words.findIndex(item => item.word === w) + 1}`).join(', ')}`} onClick={() => setSelectedWord(cell.words.find(w => !progress.found.includes(w)) || cell.words[0])}>{starts.length > 0 && <small>{starts.map(s => s.i).join(',')}</small>}{found || firstLetter ? cell.letter : ''}</button>;
          })}
        </div></div>
        <div className={`wc-feedback wc-feedback-${feedback.kind}`} role="status" aria-live="polite">{feedback.text}</div>
        {complete ? <div className="wc-review-prompt"><Stars count={starsFor(progress)} /><strong>Puzzle complete</strong><button className="wc-outline-button" onClick={() => setCelebrate(true)}>View your discoveries</button></div> : <LetterWheel letters={level.letters} onSubmit={checkWord} disabled={help || celebrate} />}
      </div>
      <aside className="wc-clue-panel"><div className="wc-clue-header"><h2>Words to discover</h2><button className="wc-icon-button" aria-label={sound ? 'Turn pronunciation off' : 'Turn pronunciation on'} aria-pressed={sound} onClick={() => {
          if (!sound && !('speechSynthesis' in window)) { setFeedback({ kind: 'neutral', text: 'Pronunciation isn’t supported in this browser.' }); return; } setSound(!sound); if (sound && 'speechSynthesis' in window) window.speechSynthesis.cancel();
        }}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button></div>
        <div className="wc-clue-list">{level.words.map((item, i) => {
          const found = progress.found.includes(item.word);
          return <button key={item.word} className={`wc-clue ${selectedWord === item.word ? 'is-active' : ''}`} onClick={() => { setSelectedWord(item.word); if (found) pronounce(item.word); }}><span className="wc-clue-number">{found ? <Check size={16} /> : i + 1}</span><strong>{found ? item.word : `${item.word.length} letters`}</strong>{!found && <span className="wc-word-blanks" aria-hidden="true">{'·'.repeat(item.word.length)}</span>}</button>;
        })}</div>
        <div className="wc-meaning"><span className="wc-eyebrow">{targetFound ? 'WORD DISCOVERED' : `CLUE ${level.words.indexOf(target) + 1}`}</span><h3>{targetFound ? target.word : `${target.word.length} letters. What could it be?`}</h3><p>{targetFound || stage >= 1 ? target.meaning : 'Try connecting the letters. Need a nudge? Reveal a clue below.'}</p>{(targetFound || stage >= 2) && <blockquote>{targetFound ? target.example : target.example.replace(new RegExp(`\\b${target.word}\\b`, 'gi'), '____')}</blockquote>}{!targetFound && stage >= 3 && <p><strong>Starts with {target.word[0]}</strong></p>}
          {!targetFound && <><button className="wc-outline-button" onClick={hint}><Lightbulb size={18} />{['Show meaning', 'Show a sentence', 'Reveal first letter', 'Reveal this word'][stage]}</button><small className="wc-hint-note">Hints are always free. Fewer hints earn more stars.</small></>}
        </div>
        <div className="wc-bonus"><span><Star size={17} /> Bonus discoveries</span><strong>{progress.bonus.length} / {level.bonus.length}</strong>{progress.bonus.length > 0 && <p>{progress.bonus.join(' · ')}</p>}{level.bonus.length === 0 && <p>All the words in this puzzle belong on the board.</p>}</div>
      </aside>
    </div>
    <Help open={help} onClose={() => { markTutorial(); setHelp(false); }} />
    <Dialog open={celebrate} onOpenChange={setCelebrate}><DialogContent className="wc-dialog wc-celebration"><img src="/games/word-connect/pip.png" alt="Pip celebrates your discoveries" /><Stars count={starsFor(progress)} /><DialogTitle className="wc-dialog-title">{next ? 'Look how far you’ve come!' : 'Adventure complete!'}</DialogTitle><DialogDescription>You discovered {level.words.length} words{progress.bonus.length > 0 ? ` and ${progress.bonus.length} bonus words` : ''}. Take their meanings on your next adventure.</DialogDescription><div className="wc-completion-words">{level.words.map(item => <div key={item.word}><strong>{item.word}</strong><span>{item.meaning}</span></div>)}</div><Link className="wc-button" to={next ? `/games/word-connect/play/${next.id}` : '/games/word-connect'}>{next ? 'Next adventure' : 'Back to the map'}<ArrowRight size={18} /></Link><Link className="wc-text-link" to="/games/word-connect">Adventure map</Link></DialogContent></Dialog>
  </section>;
}
