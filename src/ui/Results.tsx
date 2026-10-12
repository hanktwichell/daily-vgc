import { useEffect, useState } from 'preact/hooks';
import type { PuzzleView } from '../shared/types';
import type { GameRecord, Stats } from './storage';
import { shareText, shareResult, smsLink, isMobile } from './share';
import { Sprite, Countdown } from './components';
import { StatsSummary } from './StatsSummary';
import { msUntilNextPuzzle } from '../data/calendar';

export interface HardModeLink {
	state: 'locked' | 'available' | 'in-progress' | 'done';
	play: () => void;
}

export function Results({ record, stats, streak, puzzle, order, hard = false, hardMode, archive, onArchive }: {
	record: GameRecord; stats: Stats; streak: number; puzzle: PuzzleView | null; order: number[];
	/** This result is from hard mode. */
	hard?: boolean;
	/** Played from the archive: no stats, but it can be replayed. */
	archive?: { onReplay: () => void; onCalendar: () => void };
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
		if (ms <= 0 && !archive) location.reload();
	}, [ms <= 0]);

	const text = shareText(record, streak, hard, !!archive);
	const left = record.alive.filter(Boolean).length;

	const onShare = async () => {
		const r = await shareResult(text);
		setToast(r === 'copied' ? 'Copied to clipboard. Paste it to your friends!' : r === 'shared' ? 'Shared!' : 'Could not share. Copy the text below.');
		setTimeout(() => setToast(''), 3500);
	};

	return (
		<div class={`results ds-frame${hard ? ' hard' : ''}`}>
			{(hard || archive) && <div class={`hard-banner${archive ? ' archive' : ''}`}>{[archive && 'ARCHIVE', hard && 'HARD MODE'].filter(Boolean).join(' · ')}</div>}
			<div class={`result-banner ${record.won ? 'win' : 'loss'}`}>
				{record.won ? 'VICTORY!' : 'DEFEATED'}
			</div>
			<p class="result-sub">
				Daily VGC #{record.number}{hard ? ' (Hard)' : ''} · {left}/4 left · {record.turns} turns
				{puzzle && <><br />vs {puzzle.opponent.trainer} ({puzzle.opponent.name})</>}
			</p>
			<div class="result-squares">
				{record.alive.map((a, i) => (
					<div key={i} class={`result-square ${a ? 'alive' : 'fainted'}`}>
						{puzzle && order[i] !== undefined && <Sprite speciesId={puzzle.player[order[i]].speciesId} />}
					</div>
				))}
			</div>
			{archive ? (
				<div class="share-actions">
					<button class="btn" onClick={archive.onReplay}>Play again</button>
					<button class="btn" onClick={archive.onCalendar}>Open archive</button>
				</div>
			) : <StatsSummary stats={stats} streak={streak} today={record} />}
			<p class="share-prompt">{archive ? 'Share your result' : 'Challenge your friends to today\'s battle!'}</p>
			<div class="share-actions">
				<button class="btn primary" onClick={onShare}>Share result</button>
				{isMobile() && <a class="btn" href={smsLink(text)}>Text a friend</a>}
			</div>
			{toast && <div class="toast">{toast}</div>}
			<pre class="share-preview">{text}</pre>
			{hardMode && <HardModeCard link={hardMode} archive={!!archive} />}
			{onArchive && (
				<div class="hard-card archive-card">
					<b>Archive</b>
					<p>Missed a day? Replay past battles. They don't count toward your stats.</p>
					<button class="btn" onClick={onArchive}>Open archive →</button>
				</div>
			)}
			{!archive && <p class="next">Next battle in <Countdown ms={ms} /></p>}
		</div>
	);
}

function HardModeCard({ link, archive }: { link: HardModeLink; archive: boolean }) {
	const day = archive ? 'this day\'s' : 'today\'s';
	if (link.state === 'locked') {
		return (
			<div class="hard-card locked">
				<b>Hard Mode</b>
				<p>Win {day} battle to unlock it.</p>
			</div>
		);
	}
	const label = link.state === 'done' ? 'See Hard Mode result' : link.state === 'in-progress' ? 'Continue Hard Mode' : 'Play Hard Mode';
	return (
		<div class="hard-card">
			<b>Hard Mode unlocked</b>
			<p>Take over {day} themed team and face a top competitive team.</p>
			<button class="btn hard" onClick={link.play}>{label} →</button>
		</div>
	);
}
