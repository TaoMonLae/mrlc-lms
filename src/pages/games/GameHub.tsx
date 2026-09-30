import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../providers/AuthProvider';
import { LEVELS } from './word-connect/content';
import { isComplete } from './word-connect/engine';
import { useAdventure } from './word-connect/useAdventure';
import './game-hub.css';

type GameArt = 'trail' | 'quest' | 'sudoku' | 'chess' | 'checkers' | 'periodic' | 'snake' | 'pacman' | 'daily';
type GameCard = { title: string; description: string; to: string; art: GameArt; detail: string };

const wordGames: GameCard[] = [
  { title: 'Learning Quest', description: 'Stories, lessons, and language challenges.', to: '/games/language-quest', art: 'quest', detail: 'Language adventure' },
  { title: 'Word Trail', description: 'Follow clues and build a path of words.', to: '/games/word-trail', art: 'trail', detail: 'Word puzzle' },
  { title: 'Daily Quest', description: 'A fresh little challenge for today.', to: '/daily-quest', art: 'daily', detail: 'Daily challenge' },
];
const thinkingGames: GameCard[] = [
  { title: 'Sudoku', description: 'Place every number using logic.', to: '/games/sudoku', art: 'sudoku', detail: 'Number puzzle' },
  { title: 'Chess', description: 'Plan your moves across the board.', to: '/games/chess', art: 'chess', detail: 'Strategy' },
  { title: 'Checkers', description: 'Jump, capture, and think ahead.', to: '/games/checkers', art: 'checkers', detail: 'Strategy' },
  { title: 'Periodic Table', description: 'Meet the elements through quick games.', to: '/games/periodic-table', art: 'periodic', detail: 'Science' },
];
const quickGames: GameCard[] = [
  { title: 'Snake', description: 'Collect food and grow your route.', to: '/games/snake', art: 'snake', detail: 'Arcade' },
  { title: 'Pac-Man', description: 'Find a route through the maze.', to: '/games/pacman', art: 'pacman', detail: 'Arcade' },
];

function Preview({ art }: { art: GameArt }) {
  if (art === 'sudoku') return <div className="gh-sudoku" aria-hidden="true">{['1', '', '3', '', '2', '', '2', '', '1'].map((n, i) => <span key={i}>{n}</span>)}</div>;
  if (art === 'chess') return <div className="gh-board gh-chess" aria-hidden="true"><span>♜</span><span>♞</span><span>♝</span><span>♛</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♙</span><span>♙</span><span>♙</span><span>♙</span><span>♖</span><span>♘</span><span>♗</span><span>♕</span></div>;
  if (art === 'checkers') return <div className="gh-board gh-checkers" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i}>{[1, 3, 4, 6, 9, 11, 12, 14].includes(i) && <i className={i < 8 ? 'dark-chip' : 'light-chip'} />}</span>)}</div>;
  if (art === 'periodic') return <div className="gh-elements" aria-hidden="true"><span><b>1</b>H</span><span><b>6</b>C</span><span><b>8</b>O</span><span><b>11</b>Na</span></div>;
  if (art === 'snake') return <div className="gh-snake" aria-hidden="true"><svg viewBox="0 0 240 130"><path d="M30 92h58V35h60v62h40" /><circle cx="194" cy="97" r="10" /></svg></div>;
  if (art === 'pacman') return <div className="gh-maze" aria-hidden="true"><svg viewBox="0 0 240 130"><path d="M18 16h92v32H58v64h164V78h-70V16h70M18 16v96h24M100 78h36" /><circle cx="67" cy="31" r="3" /><circle cx="94" cy="31" r="3" /><circle cx="120" cy="31" r="3" /><circle cx="180" cy="96" r="3" /></svg><span>◕</span></div>;
  if (art === 'trail') return <div className="gh-trail" aria-hidden="true"><span>W</span><i /><span>O</span><i /><span>R</span><i /><span>D</span></div>;
  if (art === 'quest') return <div className="gh-quest" aria-hidden="true"><span>hello</span><span>မင်္ဂလာပါ</span><b>✦</b></div>;
  return <div className="gh-daily" aria-hidden="true"><span>01</span><b>Today’s clue</b><i>?</i></div>;
}

function Shelf({ title, description, games }: { title: string; description: string; games: GameCard[] }) {
  return <section className="gh-shelf"><header><div><h2>{title}</h2><p>{description}</p></div><span>{games.length} games</span></header><div className="gh-grid">{games.map(game => <Link key={game.to} to={game.to} className={`gh-card gh-${game.art}`}><div className="gh-art"><Preview art={game.art} /></div><div className="gh-card-copy"><small>{game.detail}</small><h3>{game.title}</h3><p>{game.description}</p><span>Play <ArrowRight size={16} /></span></div></Link>)}</div></section>;
}

export default function GameHub() {
  const { user } = useAuth();
  const { progress } = useAdventure();
  const completed = LEVELS.filter(level => isComplete(level, progress.levels[level.id])).length;
  const next = LEVELS.find(level => !isComplete(level, progress.levels[level.id]));
  const learner = user?.role === 'STUDENT' || user?.role === 'TEACHER';
  return <div className="gh-page">
    <header className="gh-heading"><div><p>PLAY & LEARN</p><h1>Games for curious minds.</h1><span>Pick a challenge. Your games are all here.</span></div>{['ADMIN', 'TEACHER'].includes(user?.role || '') && <Link to="/games/controls" className="gh-controls"><ShieldCheck size={17} /> Game time controls</Link>}</header>
    <section className="gh-feature"><div className="gh-feature-copy"><span className="gh-level-label">WORD CONNECT · A1–C1</span><h2>Find a word.<br />See where it leads.</h2><p>Connect letters, solve crosswords, and collect new meanings with Pip. Start with familiar words and grow into harder ones.</p><div className="gh-feature-bottom"><Link to={next ? `/games/word-connect/play/${next.id}` : '/games/word-connect'} className="gh-primary">{completed ? 'Continue Word Connect' : 'Start Word Connect'} <ArrowRight size={18} /></Link><Link to="/games/word-connect" className="gh-map-link">See the level map</Link></div><small>{completed} of {LEVELS.length} levels complete</small></div><div className="gh-feature-scene" aria-label="Pip welcomes you to Word Connect"><div className="gh-hero-wheel" aria-hidden="true"><span>W</span><span>O</span><span>R</span><span>D</span></div><div className="gh-pip"><img src="/games/word-connect/pip.png" alt="" /><img src="/games/word-connect/pip-cheer.png" alt="" /></div><div className="gh-pip-note">Let’s find our next word!</div></div></section>
    <Shelf title="Words & discovery" description="Explore language one clue at a time." games={learner ? wordGames : wordGames.slice(0, 1)} />
    <Shelf title="Think it through" description="Take your time. Every move matters." games={thinkingGames} />
    <Shelf title="Quick play" description="Short games with room to improve." games={quickGames} />
  </div>;
}
