import { useEffect, useRef, useState } from 'preact/hooks';
import type { FromWorker, PuzzleView, ToWorker } from '../shared/types';
import { puzzleDateFor, puzzleNumberFor, msUntilNextPuzzle } from '../data/calendar';
import { TeamPreview } from './TeamPreview';
import { BattleScreen, type BattleUpdate } from './Battle';
import { Results } from './Results';
import { Modal, Countdown } from './components';
import { StatsSummary } from './StatsSummary';
import {
	loadProgress, saveProgress, loadStats, recordResult, currentStreak, loadSettings, saveSettings,
	type Progress, type GameRecord, type Stats,
} from './storage';

type Phase = 'loading' | 'preview' | 'battle' | 'results';

export function App() {
	const [date] = useState(() => puzzleDateFor());
	const number = puzzleNumberFor(date);
	const [phase, setPhase] = useState<Phase>('loading');
	const [puzzle, setPuzzle] = useState<PuzzleView | null>(null);
	const [updates, setUpdates] = useState<BattleUpdate[]>([]);
	const [history, setHistory] = useState<string[]>([]);
	const [thinking, setThinking] = useState(false);
	const [error, setError] = useState('');
	const [stats, setStats] = useState<Stats>(loadStats);
	const [record, setRecord] = useState<GameRecord | null>(null);
	const [settings, setSettings] = useState(loadSettings);
	const [modal, setModal] = useState<'help' | 'stats' | null>(null);
	const worker = useRef<Worker | null>(null);
	const progress = useRef<Progress | null>(null);

	const send = (msg: ToWorker) => worker.current?.postMessage(msg);

	useEffect(() => {
		const w = new Worker(new URL('../worker/battle.worker.ts', import.meta.url), { type: 'module' });
		worker.current = w;
		w.onmessage = (e: MessageEvent<FromWorker>) => handle(e.data);
		w.onerror = e => setError(`Something went wrong loading the battle engine (${e.message}). Try reloading.`);

		const saved = loadProgress(number);
		progress.current = saved;
		if (saved?.phase === 'done' && saved.result) {
			setRecord(saved.result);
			send({ type: 'init', date });
		} else if (saved?.phase === 'battle' && saved.battle) {
			setHistory(saved.lines);
			send({ type: 'resume', date, battle: saved.battle });
		} else {
			send({ type: 'init', date });
		}
		if (!settings.seenHelp) setModal('help');
		return () => w.terminate();
	}, []);

	// Reload at midnight Eastern so the next puzzle appears without a manual refresh,
	// unless a battle is in progress (it can be finished and counts for its own day).
	const phaseRef = useRef<Phase>('loading');
	phaseRef.current = phase;
	useEffect(() => {
		const check = () => {
			if (puzzleNumberFor(puzzleDateFor()) !== number && phaseRef.current !== 'battle') location.reload();
		};
		const t = setTimeout(function tick() { check(); }, msUntilNextPuzzle() + 1500);
		const i = setInterval(check, 60_000);
		return () => { clearTimeout(t); clearInterval(i); };
	}, []);

	function handle(msg: FromWorker) {
		switch (msg.type) {
		case 'puzzle':
			setPuzzle(msg.puzzle);
			setPhase(p => {
				if (p !== 'loading') return p;
				const saved = progress.current;
				if (saved?.phase === 'done') return 'results';
				if (saved?.phase === 'battle') return 'battle';
				return 'preview';
			});
			break;
		case 'update': {
			setError('');
			const prev = progress.current;
			const lines = [...(prev?.lines ?? []), ...msg.lines];
			const next: Progress = {
				number, date, phase: 'battle', order: prev?.order ?? [], battle: msg.battle, lines,
			};
			if (msg.ended) {
				const result: GameRecord = { number, won: msg.winner === 'You', alive: msg.alive, turns: msg.turn };
				next.phase = 'done';
				next.result = result;
				delete next.battle;
				setStats(recordResult(result));
				setRecord(result);
			}
			progress.current = next;
			saveProgress(next);
			setUpdates(u => [...u, { lines: msg.lines, request: msg.request, ended: msg.ended, alive: msg.alive, turn: msg.turn, winner: msg.winner }]);
			break;
		}
		case 'thinking':
			setThinking(msg.thinking);
			break;
		case 'error':
			setError(msg.message);
			break;
		}
	}

	const start = (order: number[]) => {
		progress.current = { number, date, phase: 'battle', order, lines: [] };
		saveProgress(progress.current);
		setPhase('battle');
		send({ type: 'start', order });
	};

	const streak = currentStreak(stats, number);
	const order = progress.current?.order ?? [];

	return (
		<div class="app">
			<header class="topbar">
				<button class="icon-btn" onClick={() => setModal('help')} aria-label="How to play">?</button>
				<div class="title">
					<h1>Daily VGC</h1>
					<span class="puzzle-no">#{number}</span>
				</div>
				<button class="icon-btn" onClick={() => setModal('stats')} aria-label="Statistics">
					<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 9h3v5H2zM6.5 5h3v9h-3zM11 2h3v12h-3z" /></svg>
				</button>
			</header>

			<main>
				{phase === 'loading' && (
					<div class="loading ds-frame">
						<div class="pokeball-spin" />
						<p>{error || 'Preparing today\'s battle...'}</p>
					</div>
				)}
				{phase === 'preview' && puzzle && <TeamPreview puzzle={puzzle} onStart={start} />}
				{phase === 'battle' && puzzle && (
					<BattleScreen puzzle={puzzle} history={history} updates={updates} thinking={thinking} error={error}
						speed={settings.speed}
						onToggleSpeed={() => {
							const s = { ...settings, speed: settings.speed === 'fast' ? 'normal' as const : 'fast' as const };
							setSettings(s); saveSettings(s);
						}}
						onChoose={choice => send({ type: 'choose', choice })}
						onFinished={() => setPhase('results')} />
				)}
				{phase === 'results' && record && (
					<Results record={record} stats={stats} streak={streak} puzzle={puzzle} order={order} />
				)}
			</main>

			<footer class="site-footer">
				<p>Pokémon Champions Reg M-C rules · Doubles · Level 50 · One Mega per battle</p>
				<p class="muted">Fan-made and not affiliated with Nintendo, Game Freak, The Pokémon Company or Creatures.
					Battle engine: <a href="https://github.com/smogon/pokemon-showdown" target="_blank" rel="noopener">Pokémon Showdown</a>.
					Sprites: <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a>.</p>
			</footer>

			{modal === 'help' && (
				<Modal title="How to play" onClose={() => { setModal(null); const s = { ...settings, seenHelp: true }; setSettings(s); saveSettings(s); }}>
					<HowToPlay />
				</Modal>
			)}
			{modal === 'stats' && (
				<Modal title="Statistics" onClose={() => setModal(null)}>
					{record ? (
						<Results record={record} stats={stats} streak={streak} puzzle={puzzle} order={order} />
					) : (
						<StatsOnly stats={stats} streak={streak} />
					)}
				</Modal>
			)}
		</div>
	);
}

function StatsOnly({ stats, streak }: { stats: Stats; streak: number }) {
	const [ms, setMs] = useState(msUntilNextPuzzle());
	useEffect(() => { const t = setInterval(() => setMs(msUntilNextPuzzle()), 1000); return () => clearInterval(t); }, []);
	return (
		<div>
			<StatsSummary stats={stats} streak={streak} />
			<p class="next">Finish today's battle to share your result. Next battle in <Countdown ms={ms} /></p>
		</div>
	);
}

function HowToPlay() {
	return (
		<div class="help">
			<p>A new double battle every day. You get a team of six and a trainer to beat.</p>
			<ol>
				<li><b>Bring four.</b> Your first two picks lead; the other two start in the back.</li>
				<li><b>Win the battle.</b> Faint all four of the opponent's Pokémon.</li>
			</ol>
			<p>Battles use <b>Pokémon Champions, Regulation M-C</b> rules with open team sheets, so you can see the opponent's full team before you pick. You can Mega Evolve once per battle from the Fight menu. The opponent always brings a Mega.</p>
			<p>Tap any Pokémon or HP bar for details, and tap the text box to skip ahead.</p>
			<p>One battle per day. Your progress is saved, so you can leave and come back.</p>
		</div>
	);
}
