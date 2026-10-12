import { useEffect, useRef, useState } from 'preact/hooks';
import type { FromWorker, Mode, PuzzleView, ToWorker } from '../shared/types';
import { puzzleDateFor, puzzleNumberFor, msUntilNextPuzzle, dateForPuzzleNumber } from '../data/calendar';
import { TeamPreview } from './TeamPreview';
import { BattleScreen, type BattleUpdate } from './Battle';
import { Results, type HardModeLink } from './Results';
import { Modal, Countdown } from './components';
import { StatsSummary } from './StatsSummary';
import { ArchiveCalendar, CalendarIcon, type ArchiveSelection } from './Archive';
import { CommunityRecap } from './Community';
import { recorderEnabled, fetchCommunityStats, hasData, submitResult } from './community';
import {
	loadProgress, saveProgress, loadStats, recordResult, currentStreak, loadSettings, saveSettings,
	recordArchiveResult, clearArchiveProgress, dailyWon,
	type Progress, type GameRecord, type Stats, type Settings,
} from './storage';

type Phase = 'loading' | 'preview' | 'battle' | 'results';

const VIEW_KEY = 'dailyvgc:view';

/** An archive puzzle being played survives a reload (per tab). */
function savedArchive(today: number): ArchiveSelection | null {
	try {
		const v = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null');
		return v && Number.isInteger(v.number) && v.number >= 0 && v.number < today && (v.mode === 'normal' || v.mode === 'hard') ? v : null;
	} catch {
		return null;
	}
}

export function App() {
	const [date] = useState(() => puzzleDateFor());
	const number = puzzleNumberFor(date);
	// Resume an unfinished hard-mode battle; otherwise start on the daily battle.
	const [mode, setMode] = useState<Mode>(() => savedArchive(number)?.mode ?? (loadProgress(number, 'hard')?.phase === 'battle' ? 'hard' : 'normal'));
	// A past puzzle from the archive, or null for today's.
	const [archive, setArchive] = useState<number | null>(() => savedArchive(number)?.number ?? null);
	const [replay, setReplay] = useState(0);
	const [settings, setSettings] = useState(loadSettings);
	const [modal, setModal] = useState<'help' | 'stats' | 'calendar' | 'recap' | null>(() => (loadSettings().seenHelp ? null : 'help'));
	const archiveRef = useRef(archive);
	archiveRef.current = archive;
	useEffect(() => {
		try {
			if (archive === null) sessionStorage.removeItem(VIEW_KEY);
			else sessionStorage.setItem(VIEW_KEY, JSON.stringify({ number: archive, mode }));
		} catch { /* ignore */ }
	}, [archive, mode]);
	// Bumped whenever a result is recorded, so the stats modal re-reads storage.
	const [statsVersion, setStatsVersion] = useState(0);
	const phaseRef = useRef<Phase>('loading');

	// Reload at midnight Eastern so the next puzzle appears without a manual refresh,
	// unless a battle is in progress (it can be finished and counts for its own day).
	useEffect(() => {
		const check = () => {
			if (puzzleNumberFor(puzzleDateFor()) !== number && phaseRef.current !== 'battle' && archiveRef.current === null) location.reload();
		};
		const t = setTimeout(check, msUntilNextPuzzle() + 1500);
		const i = setInterval(check, 60_000);
		return () => { clearTimeout(t); clearInterval(i); };
	}, []);

	const updateSettings = (s: Settings) => { setSettings(s); saveSettings(s); };

	// Before a new day's battle, show how everyone did on yesterday's (once per day).
	useEffect(() => {
		const s = loadSettings();
		if (!recorderEnabled() || number < 1 || archive !== null || !s.seenHelp || s.recapSeen === number - 1) return;
		if (loadProgress(number, 'normal')) return;
		fetchCommunityStats(number - 1).then(stats => {
			if (hasData(stats)) setModal(m => m ?? 'recap');
		});
	}, []);
	const closeRecap = () => { setModal(null); updateSettings({ ...loadSettings(), recapSeen: number - 1 }); };
	const playArchive = (sel: ArchiveSelection) => {
		setArchive(sel.number); setMode(sel.mode); setReplay(r => r + 1); setModal(null); window.scrollTo(0, 0);
	};
	const backToToday = () => { setArchive(null); setMode('normal'); window.scrollTo(0, 0); };
	const shown = archive ?? number;

	return (
		<div class="app">
			<header class="topbar">
				<button class="icon-btn" onClick={() => setModal('help')} aria-label="How to play">?</button>
				<div class="title">
					<h1>Daily VGC</h1>
					<span class="puzzle-no">#{shown}</span>
					{archive !== null && <span class="archive-tag">ARCHIVE</span>}
					{mode === 'hard' && <span class="hard-tag">HARD</span>}
				</div>
				{archive !== null ? (
					<button class="icon-btn" onClick={() => setModal('calendar')} aria-label="Archive calendar"><CalendarIcon /></button>
				) : (
					<button class="icon-btn" onClick={() => setModal('stats')} aria-label="Statistics">
						<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 9h3v5H2zM6.5 5h3v9h-3zM11 2h3v12h-3z" /></svg>
					</button>
				)}
			</header>

			<main>
				{archive !== null && <button class="back-link" onClick={backToToday}>← Back to today's battle</button>}
				<Game key={`${archive ?? 'today'}-${mode}-${replay}`} mode={mode} archive={archive !== null}
					date={archive !== null ? dateForPuzzleNumber(archive) : date} number={shown}
					settings={settings} onSettings={updateSettings}
					onPhase={p => { phaseRef.current = p; }}
					onRecorded={() => setStatsVersion(v => v + 1)}
					onSwitchMode={m => { setMode(m); window.scrollTo(0, 0); }}
					onCalendar={() => setModal('calendar')}
					onReplay={() => { if (archive !== null) clearArchiveProgress(archive, mode); setReplay(r => r + 1); window.scrollTo(0, 0); }} />
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
					<StatsSheet key={statsVersion} number={number} initialMode={mode} onArchive={() => setModal('calendar')}
						onRecap={recorderEnabled() && number > 0 ? () => setModal('recap') : undefined} />
				</Modal>
			)}
			{modal === 'recap' && (
				<Modal onClose={closeRecap}>
					<CommunityRecap puzzle={number - 1} title="Yesterday's battle" onPlay={archive === null ? closeRecap : undefined} />
				</Modal>
			)}
			{modal === 'calendar' && (
				<Modal onClose={() => setModal(null)}>
					<ArchiveCalendar key={statsVersion} current={archive !== null ? { number: archive, mode } : null} onPlay={playArchive} />
				</Modal>
			)}
		</div>
	);
}

interface GameProps {
	mode: Mode;
	/** A past puzzle played from the archive: separate progress and results, no stats. */
	archive: boolean;
	onCalendar: () => void;
	onReplay: () => void;
	date: string;
	number: number;
	settings: Settings;
	onSettings: (s: Settings) => void;
	onPhase: (p: Phase) => void;
	onRecorded: () => void;
	onSwitchMode: (m: Mode) => void;
}

/** One playthrough (the daily battle or hard mode), with its own battle worker and saved progress. */
function Game({ mode, archive, date, number, settings, onSettings, onPhase, onRecorded, onSwitchMode, onCalendar, onReplay }: GameProps) {
	const [phase, setPhase] = useState<Phase>('loading');
	const [puzzle, setPuzzle] = useState<PuzzleView | null>(null);
	const [updates, setUpdates] = useState<BattleUpdate[]>([]);
	const [history, setHistory] = useState<string[]>([]);
	const [thinking, setThinking] = useState(false);
	const [error, setError] = useState('');
	const [stats, setStats] = useState<Stats>(() => loadStats(mode));
	const [record, setRecord] = useState<GameRecord | null>(null);
	const worker = useRef<Worker | null>(null);
	const puzzleRef = useRef<PuzzleView | null>(null);
	const progress = useRef<Progress | null>(null);

	useEffect(() => { onPhase(phase); }, [phase]);

	const send = (msg: ToWorker) => worker.current?.postMessage(msg);

	useEffect(() => {
		const w = new Worker(new URL('../worker/battle.worker.ts', import.meta.url), { type: 'module' });
		worker.current = w;
		w.onmessage = (e: MessageEvent<FromWorker>) => handle(e.data);
		w.onerror = e => setError(`Something went wrong loading the battle engine (${e.message}). Try reloading.`);

		const saved = loadProgress(number, mode, archive);
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
			puzzleRef.current = msg.puzzle;
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
				if (archive) recordArchiveResult(result, mode);
				else {
					setStats(recordResult(result, mode));
					// Day-of battles feed the community stats (archive replays don't).
					const view = puzzleRef.current;
					if (view && prev?.order?.length === 4) {
						submitResult({
							puzzle: number, mode, won: result.won, alive: result.won ? result.alive.filter(Boolean).length : 0,
							turns: result.turns, picks: prev.order, team: view.player.map(p => p.species),
						});
					}
				}
				setRecord(result);
				onRecorded();
			}
			progress.current = next;
			saveProgress(next, mode, archive);
			setUpdates(u => [...u, { lines: msg.lines, request: msg.request, ended: msg.ended, alive: msg.alive, turn: msg.turn, winner: msg.winner, field: msg.field }]);
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
		saveProgress(progress.current, mode, archive);
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
					{mode === 'hard' && <BackLink archive={archive} onClick={() => onSwitchMode('normal')} />}
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
					{mode === 'hard' && <BackLink archive={archive} onClick={() => onSwitchMode('normal')} />}
					<Results record={record} stats={stats} streak={streak} puzzle={puzzle} order={order} hard={mode === 'hard'}
						archive={archive ? { onReplay, onCalendar } : undefined}
						onArchive={!archive && number > 0 ? onCalendar : undefined}
						hardMode={mode === 'normal' ? hardModeLink(number, record, archive, () => onSwitchMode('hard')) : undefined} />
				</>
			)}
		</>
	);
}

function BackLink({ onClick, archive }: { onClick: () => void; archive: boolean }) {
	return <button class="back-link" onClick={onClick}>{archive ? '← This day\'s battle' : '← Today\'s battle'}</button>;
}

/** What the daily results screen offers for hard mode. */
function hardModeLink(number: number, record: GameRecord, archive: boolean, play: () => void): HardModeLink {
	if (!record.won && !(archive && dailyWon(number))) return { state: 'locked', play };
	const hard = loadProgress(number, 'hard', archive);
	return { state: hard?.phase === 'done' ? 'done' : hard?.phase === 'battle' ? 'in-progress' : 'available', play };
}

/** Stats modal: separate daily and hard-mode trackers behind a toggle, read fresh from storage. */
function StatsSheet({ number, initialMode, onArchive, onRecap }: { number: number; initialMode: Mode; onArchive: () => void; onRecap?: () => void }) {
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
			<div class="sheet-buttons">
				{onRecap && <button class="btn archive-btn" onClick={onRecap}>Yesterday's results</button>}
				<button class="btn archive-btn" onClick={onArchive}><CalendarIcon /> Archive</button>
			</div>
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
			<p>One battle per day. Your progress is saved, so you can leave and come back. Past battles stay playable in the <b>Archive</b> (from the stats screen); those don't count toward your stats.</p>
			<p class="muted small">Results of each day's battles are shared anonymously to build the community stats.</p>
		</div>
	);
}
