import { useEffect, useRef, useState } from 'preact/hooks';
import type { FromWorker, Mode, PuzzleView, ToWorker } from '../shared/types';
import { puzzleDateFor, puzzleNumberFor, msUntilNextPuzzle } from '../data/calendar';
import { TeamPreview } from './TeamPreview';
import { BattleScreen, type BattleUpdate } from './Battle';
import { Results, type HardModeLink } from './Results';
import { Modal, Countdown } from './components';
import { StatsSummary } from './StatsSummary';
import {
	loadProgress, saveProgress, loadStats, recordResult, currentStreak, loadSettings, saveSettings,
	type Progress, type GameRecord, type Stats, type Settings,
} from './storage';

type Phase = 'loading' | 'preview' | 'battle' | 'results';

export function App() {
	const [date] = useState(() => puzzleDateFor());
	const number = puzzleNumberFor(date);
	// Resume an unfinished hard-mode battle; otherwise start on the daily battle.
	const [mode, setMode] = useState<Mode>(() => (loadProgress(number, 'hard')?.phase === 'battle' ? 'hard' : 'normal'));
	const [settings, setSettings] = useState(loadSettings);
	const [modal, setModal] = useState<'help' | 'stats' | null>(() => (loadSettings().seenHelp ? null : 'help'));
	// Bumped whenever a result is recorded, so the stats modal re-reads storage.
	const [statsVersion, setStatsVersion] = useState(0);
	const phaseRef = useRef<Phase>('loading');

	// Reload at midnight Eastern so the next puzzle appears without a manual refresh,
	// unless a battle is in progress (it can be finished and counts for its own day).
	useEffect(() => {
		const check = () => {
			if (puzzleNumberFor(puzzleDateFor()) !== number && phaseRef.current !== 'battle') location.reload();
		};
		const t = setTimeout(check, msUntilNextPuzzle() + 1500);
		const i = setInterval(check, 60_000);
		return () => { clearTimeout(t); clearInterval(i); };
	}, []);

	const updateSettings = (s: Settings) => { setSettings(s); saveSettings(s); };

	return (
		<div class="app">
			<header class="topbar">
				<button class="icon-btn" onClick={() => setModal('help')} aria-label="How to play">?</button>
				<div class="title">
					<h1>Daily VGC</h1>
					<span class="puzzle-no">#{number}</span>
					{mode === 'hard' && <span class="hard-tag">HARD</span>}
				</div>
				<button class="icon-btn" onClick={() => setModal('stats')} aria-label="Statistics">
					<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 9h3v5H2zM6.5 5h3v9h-3zM11 2h3v12h-3z" /></svg>
				</button>
			</header>

			<main>
				<Game key={mode} mode={mode} date={date} number={number} settings={settings} onSettings={updateSettings}
					onPhase={p => { phaseRef.current = p; }}
					onRecorded={() => setStatsVersion(v => v + 1)}
					onSwitchMode={m => { setMode(m); window.scrollTo(0, 0); }} />
			</main>

			<footer class="site-footer">
				<p>Pokémon Champions Reg M-C Format · Created by <a href="https://x.com/FourZeroDesigns" target="_blank" rel="noopener">Hank Twichell</a></p>
				<p class="muted">Fan-made and not affiliated with Nintendo, Game Freak, The Pokémon Company or Creatures.
					Battle engine: <a href="https://github.com/smogon/pokemon-showdown" target="_blank" rel="noopener">Pokémon Showdown</a>.
					Sprites: <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a>.</p>
			</footer>

			{modal === 'help' && (
				<Modal title="How to play" onClose={() => { setModal(null); updateSettings({ ...settings, seenHelp: true }); }}>
					<HowToPlay />
				</Modal>
			)}
			{modal === 'stats' && (
				<Modal onClose={() => setModal(null)}>
					<StatsSheet key={statsVersion} number={number} initialMode={mode} />
				</Modal>
			)}
		</div>
	);
}

interface GameProps {
	mode: Mode;
	date: string;
	number: number;
	settings: Settings;
	onSettings: (s: Settings) => void;
	onPhase: (p: Phase) => void;
	onRecorded: () => void;
	onSwitchMode: (m: Mode) => void;
}

/** One playthrough (the daily battle or hard mode), with its own battle worker and saved progress. */
function Game({ mode, date, number, settings, onSettings, onPhase, onRecorded, onSwitchMode }: GameProps) {
	const [phase, setPhase] = useState<Phase>('loading');
	const [puzzle, setPuzzle] = useState<PuzzleView | null>(null);
	const [updates, setUpdates] = useState<BattleUpdate[]>([]);
	const [history, setHistory] = useState<string[]>([]);
	const [thinking, setThinking] = useState(false);
	const [error, setError] = useState('');
	const [stats, setStats] = useState<Stats>(() => loadStats(mode));
	const [record, setRecord] = useState<GameRecord | null>(null);
	const worker = useRef<Worker | null>(null);
	const progress = useRef<Progress | null>(null);

	useEffect(() => { onPhase(phase); }, [phase]);

	const send = (msg: ToWorker) => worker.current?.postMessage(msg);

	useEffect(() => {
		const w = new Worker(new URL('../worker/battle.worker.ts', import.meta.url), { type: 'module' });
		worker.current = w;
		w.onmessage = (e: MessageEvent<FromWorker>) => handle(e.data);
		w.onerror = e => setError(`Something went wrong loading the battle engine (${e.message}). Try reloading.`);

		const saved = loadProgress(number, mode);
		progress.current = saved;
		if (saved?.phase === 'done' && saved.result) {
			setRecord(saved.result);
			send({ type: 'init', date, mode });
		} else if (saved?.phase === 'battle' && saved.battle) {
			setHistory(saved.lines);
			send({ type: 'resume', date, mode, battle: saved.battle });
		} else {
			send({ type: 'init', date, mode });
		}
		return () => w.terminate();
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
				setStats(recordResult(result, mode));
				setRecord(result);
				onRecorded();
			}
			progress.current = next;
			saveProgress(next, mode);
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
		saveProgress(progress.current, mode);
		setPhase('battle');
		send({ type: 'start', order });
	};

	const streak = currentStreak(stats, number);
	const order = progress.current?.order ?? [];

	return (
		<>
			{phase === 'loading' && (
				<div class="loading ds-frame">
					<div class="pokeball-spin" />
					<p>{error || (mode === 'hard' ? 'Preparing hard mode...' : 'Preparing today\'s battle...')}</p>
				</div>
			)}
			{phase === 'preview' && puzzle && (
				<>
					{mode === 'hard' && <BackLink onClick={() => onSwitchMode('normal')} />}
					<TeamPreview puzzle={puzzle} onStart={start} />
				</>
			)}
			{phase === 'battle' && puzzle && (
				<BattleScreen puzzle={puzzle} history={history} updates={updates} thinking={thinking} error={error}
					speed={settings.speed}
					onToggleSpeed={() => onSettings({ ...settings, speed: settings.speed === 'fast' ? 'normal' : 'fast' })}
					onChoose={choice => send({ type: 'choose', choice })}
					onFinished={() => setPhase('results')} />
			)}
			{phase === 'results' && record && (
				<>
					{mode === 'hard' && <BackLink onClick={() => onSwitchMode('normal')} />}
					<Results record={record} stats={stats} streak={streak} puzzle={puzzle} order={order} hard={mode === 'hard'}
						hardMode={mode === 'normal' ? hardModeLink(number, record, () => onSwitchMode('hard')) : undefined} />
				</>
			)}
		</>
	);
}

function BackLink({ onClick }: { onClick: () => void }) {
	return <button class="back-link" onClick={onClick}>← Today's battle</button>;
}

/** What the daily results screen offers for hard mode. */
function hardModeLink(number: number, record: GameRecord, play: () => void): HardModeLink {
	if (!record.won) return { state: 'locked', play };
	const hard = loadProgress(number, 'hard');
	return { state: hard?.phase === 'done' ? 'done' : hard?.phase === 'battle' ? 'in-progress' : 'available', play };
}

/** Stats modal: separate daily and hard-mode trackers behind a toggle, read fresh from storage. */
function StatsSheet({ number, initialMode }: { number: number; initialMode: Mode }) {
	const [view, setView] = useState<Mode>(initialMode);
	const [ms, setMs] = useState(msUntilNextPuzzle());
	useEffect(() => { const t = setInterval(() => setMs(msUntilNextPuzzle()), 1000); return () => clearInterval(t); }, []);
	const stats = loadStats(view);
	const today = loadProgress(number, view)?.result ?? null;
	return (
		<div class="stats-sheet">
			<div class="mode-toggle" role="tablist" aria-label="Stats for">
				{(['normal', 'hard'] as const).map(m => (
					<button key={m} role="tab" aria-selected={view === m} class={`${view === m ? 'on' : ''}${m === 'hard' ? ' hard' : ''}`}
						onClick={() => setView(m)}>
						{m === 'normal' ? 'Daily' : 'Hard Mode'}
					</button>
				))}
			</div>
			<StatsSummary stats={stats} streak={currentStreak(stats, number)} today={today} />
			{view === 'hard' && stats.played === 0 && <p class="muted">Win a daily battle to unlock Hard Mode.</p>}
			<p class="next">Next battle in <Countdown ms={ms} /></p>
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
			<p><b>Hard Mode:</b> win the daily battle to unlock it. You take over the day's themed team and face a top competitive team.</p>
			<p>Tap any Pokémon or HP bar for details, and tap the text box to skip ahead.</p>
			<p>One battle per day. Your progress is saved, so you can leave and come back.</p>
		</div>
	);
}
