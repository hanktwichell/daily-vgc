import { useEffect, useState } from 'preact/hooks';
import type { PuzzleView } from '../shared/types';
import type { GameRecord, Stats } from './storage';
import { shareText, shareResult, smsLink, isMobile } from './share';
import { Sprite, Countdown } from './components';
import { StatsSummary } from './StatsSummary';
import { msUntilNextPuzzle } from '../data/calendar';
import { isPractice, puzzleLabel } from '../data/practice';

export interface HardModeLink {
	state: 'available' | 'in-progress' | 'done';
	play: () => void;
}

/** A game that doesn't count: one from the archive (a past day or a practice battle), or (`today`) a replay of today's battle. */
export interface ReplayActions {
	today: boolean;
	onReplay: () => void;
	onCalendar: () => void;
	/** Back to the day's own result. */
	onBack: () => void;
}

export function Results({ record, stats, streak, puzzle, order, hard = false, hardMode, replay, playAgain, onArchive }: {
	record: GameRecord; stats: Stats; streak: number; puzzle: PuzzleView | null; order: number[];
	/** This result is from hard mode. */
	hard?: boolean;
	/** This result doesn't count: no stats, but it can be played again. */
	replay?: ReplayActions;
	/** On today's results: replay this battle (or pick up a replay already under way). */
	playAgain?: { inProgress: boolean; start: () => void };
	/** On today's results: open the archive of past battles. */
	onArchive?: () => void;
	/** On the daily results: the hard-mode call to action. */
	hardMode?: HardModeLink;
}) {
	const [toast, setToast] = useState('');
	const [ms, setMs] = useState(msUntilNextPuzzle());
	useEffect(() => {
		const t = setInterval(() => setMs(msUntilNextPuzzle()), 1000);
		return () => clearInterval(t);
	}, []);
	useEffect(() => {
		if (ms <= 0 && !replay) location.reload();
	}, [ms <= 0]);

	const kind = replay ? (replay.today ? 'Replay' : isPractice(record.number) ? 'Practice' : 'Archive') : undefined;
	const text = shareText(record, streak, hard, kind);
	const left = record.alive.filter(Boolean).length;

	const onShare = async () => {
		const r = await shareResult(text);
		setToast(r === 'copied' ? 'Copied to clipboard. Paste it to your friends!' : r === 'shared' ? 'Shared!' : 'Could not share. Copy the text below.');
		setTimeout(() => setToast(''), 3500);
	};

	return (
		<div class={`results ds-frame${hard ? ' hard' : ''}`}>
			{(hard || kind) && <div class={`hard-banner${kind ? ' archive' : ''}`}>{[kind?.toUpperCase(), hard && 'HARD MODE'].filter(Boolean).join(' · ')}</div>}
			<div class={`result-banner ${record.won ? 'win' : 'loss'}`}>
				{record.won ? 'VICTORY!' : 'DEFEATED'}
			</div>
			<p class="result-sub">
				Daily VGC {puzzleLabel(record.number)}{hard ? ' (Hard)' : ''} · {left}/4 left · {record.turns} turns
				{puzzle && <><br />vs {puzzle.opponent.trainer} ({puzzle.opponent.name})</>}
			</p>
			<div class="result-squares">
				{record.alive.map((a, i) => (
					<div key={i} class={`result-square ${a ? 'alive' : 'fainted'}`}>
						{puzzle && order[i] !== undefined && <Sprite speciesId={puzzle.player[order[i]].speciesId} />}
					</div>
				))}
			</div>
			{replay ? (
				<>
					{replay.today && <p class="muted center small">Replays don't count toward your stats.</p>}
					<div class="share-actions">
						<button class="btn" onClick={replay.onReplay}>Play again</button>
						{replay.today ? <button class="btn" onClick={replay.onBack}>Today's result</button>
							: <button class="btn" onClick={replay.onCalendar}>Open archive</button>}
					</div>
				</>
			) : <StatsSummary stats={stats} streak={streak} today={record} />}
			<p class="share-prompt">{replay ? 'Share your result' : 'Challenge your friends to today\'s battle!'}</p>
			<div class="share-actions">
				<button class="btn primary" onClick={onShare}>Share result</button>
				{isMobile() && <a class="btn" href={smsLink(text)}>Text a friend</a>}
			</div>
			<pre class="share-preview">{text}</pre>
			{toast && <div class="toast" role="status">{toast}</div>}
			{hardMode && <HardModeCard link={hardMode} archive={!!replay && !replay.today} />}
			{playAgain && (
				<div class="hard-card archive-card">
					<b>Play again</b>
					<p>{record.won ? 'Try a different four' : 'Have another go'} at {hard ? 'today\'s Hard Mode' : 'today\'s battle'}. Only your first try counts toward your stats.</p>
					<button class="btn" onClick={playAgain.start}>{playAgain.inProgress ? 'Continue replay' : 'Play again'} →</button>
				</div>
			)}
			{onArchive && (
				<div class="hard-card archive-card">
					<b>Archive</b>
					<p>Missed a day? Replay past battles. They don't count toward your stats.</p>
					<button class="btn" onClick={onArchive}>Open archive →</button>
				</div>
			)}
			{!replay && <p class="next">Next battle in <Countdown ms={ms} /></p>}
		</div>
	);
}

function HardModeCard({ link, archive }: { link: HardModeLink; archive: boolean }) {
	const day = archive ? 'this day\'s' : 'today\'s';
	const label = link.state === 'done' ? 'See Hard Mode result' : link.state === 'in-progress' ? 'Continue Hard Mode' : 'Play Hard Mode';
	return (
		<div class="hard-card">
			<b>Hard Mode unlocked</b>
			<p>Take over {day} themed team and face a top competitive team.</p>
			<button class="btn hard" onClick={link.play}>{label} →</button>
		</div>
	);
}
