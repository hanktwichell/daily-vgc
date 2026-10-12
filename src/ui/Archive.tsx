import { useEffect, useRef, useState } from 'preact/hooks';
import type { Mode } from '../shared/types';
import { puzzleDateFor, puzzleNumberFor, dateForPuzzleNumber } from '../data/calendar';
import {
	loadStats, loadArchiveResults, archiveResult, loadProgress, clearArchiveProgress, dailyWon, type GameRecord,
} from './storage';

export interface ArchiveSelection { number: number; mode: Mode }

type BoxState = 'current' | 'gold' | 'green' | 'lost' | 'new';

export function CalendarIcon() {
	return (
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<path fill="currentColor" d="M3 1h2v2h6V1h2v2h2v12H1V3h2zm-0 5v7h12V6zm2 2h2v2H5zm4 0h2v2H9z" />
		</svg>
	);
}

function Crown() {
	return (
		<svg class="crown" viewBox="0 0 14 9" width="18" height="12" aria-label="Won on the day">
			<path fill="#f5c400" stroke="#7a5a00" stroke-width="1" d="M1 8V2l3 3 3-4 3 4 3-3v6z" />
		</svg>
	);
}

function shortDate(date: string, long = false) {
	return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
		timeZone: 'UTC', month: 'short', day: 'numeric', ...(long ? { weekday: 'short', year: 'numeric' } : {}),
	});
}

/** Everything the calendar shows about one past puzzle, in one mode. */
function describe(number: number, mode: Mode) {
	const onDay: GameRecord | undefined = loadStats(mode).history[number];
	const archived = archiveResult(loadArchiveResults(), number, mode);
	const progress = loadProgress(number, mode, true);
	const state: BoxState = onDay?.won ? 'gold' : archived?.won ? 'green' : (onDay || archived) ? 'lost' : 'new';
	const label = onDay?.won ? 'Won on the day' : archived?.won ? 'Won in the archive'
		: progress?.phase === 'battle' ? 'In progress' : (onDay || archived) ? 'Lost' : 'Not played';
	return { state, label, inProgress: progress?.phase === 'battle', played: !!(onDay || archived || progress) };
}

/**
 * The archive: one box per past puzzle, five to a row. Gold with a crown = won on the day,
 * green = won from the archive, white = not played yet, grey = the one being played now.
 */
export function ArchiveCalendar({ current, onPlay }: { current: ArchiveSelection | null; onPlay: (sel: ArchiveSelection) => void }) {
	const today = puzzleNumberFor(puzzleDateFor());
	const numbers = Array.from({ length: Math.max(0, today) }, (_, i) => i);
	const [picked, setPicked] = useState<number | null>(current?.number ?? null);
	const grid = useRef<HTMLDivElement>(null);
	const results = loadArchiveResults();
	const archiveWins = Object.values(results).filter(r => r.won).length;

	useEffect(() => {
		// Start scrolled to the puzzle being played, or the most recent one.
		const target = grid.current?.querySelector('.cal-box.current') ?? grid.current?.lastElementChild;
		target?.scrollIntoView({ block: 'nearest' });
	}, []);

	if (!numbers.length) {
		return (
			<div class="archive">
				<h2 class="archive-title">Archive</h2>
				<p class="muted center">Each day's battle moves here once the next one unlocks. Come back tomorrow to replay #0.</p>
			</div>
		);
	}

	const play = (number: number, mode: Mode) => {
		const { inProgress } = describe(number, mode);
		// Finished archive puzzles start over; unfinished ones resume.
		if (!inProgress) clearArchiveProgress(number, mode);
		onPlay({ number, mode });
	};

	const detail = picked !== null ? { daily: describe(picked, 'normal'), hard: describe(picked, 'hard'), unlocked: dailyWon(picked) } : null;

	return (
		<div class="archive">
			<h2 class="archive-title">Archive</h2>
			<p class="muted center small">Archive wins: {archiveWins} · These don't count toward your stats.</p>
			<div class="cal-grid" ref={grid}>
				{numbers.map(n => {
					const d = describe(n, 'normal');
					const hard = describe(n, 'hard');
					const isCurrent = current?.number === n;
					return (
						<button key={n} class={`cal-box ${isCurrent ? 'current' : d.state}${picked === n ? ' picked' : ''}`}
							onClick={() => setPicked(n)} aria-label={`Puzzle #${n}, ${d.label}`}>
							<span class="cal-crown">{d.state === 'gold' && <Crown />}</span>
							<span class="cal-num">#{n}</span>
							<span class="cal-date">{shortDate(dateForPuzzleNumber(n))}</span>
							{hard.state !== 'new' && <span class={`cal-hard ${hard.state}`} title={`Hard Mode: ${hard.label}`}>H</span>}
						</button>
					);
				})}
			</div>
			{detail && picked !== null && (
				<div class="cal-detail">
					<div class="cal-detail-head">
						<b>Daily VGC #{picked}</b>
						<span class="muted small">{shortDate(dateForPuzzleNumber(picked), true)}</span>
					</div>
					<div class="cal-row">
						<span>Daily battle: <b>{detail.daily.label}</b></span>
						<button class="btn primary" onClick={() => play(picked, 'normal')}>
							{detail.daily.inProgress ? 'Continue' : detail.daily.played ? 'Replay' : 'Play'}
						</button>
					</div>
					<div class="cal-row">
						<span>Hard Mode: <b>{detail.unlocked ? detail.hard.label : 'Locked'}</b></span>
						<button class="btn hard" disabled={!detail.unlocked} onClick={() => play(picked, 'hard')}>
							{detail.hard.inProgress ? 'Continue' : detail.hard.played ? 'Replay' : 'Play'}
						</button>
					</div>
					{!detail.unlocked && <p class="muted small">Win this day's battle to unlock its Hard Mode.</p>}
				</div>
			)}
			<div class="cal-legend small">
				<span><i class="cal-swatch gold" /> Won on the day</span>
				<span><i class="cal-swatch green" /> Won in archive</span>
				<span><i class="cal-swatch new" /> Not played</span>
				<span><i class="cal-swatch lost" /> Lost</span>
				{current && <span><i class="cal-swatch current" /> Playing now</span>}
			</div>
		</div>
	);
}
