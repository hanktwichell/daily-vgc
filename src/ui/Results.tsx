import { useEffect, useState } from 'preact/hooks';
import type { PuzzleView } from '../shared/types';
import type { GameRecord, Stats } from './storage';
import { shareText, shareResult, smsLink, isMobile } from './share';
import { Sprite, Countdown } from './components';
import { msUntilNextPuzzle } from '../data/calendar';

export function Results({ record, stats, streak, puzzle, order, onClose }: {
	record: GameRecord; stats: Stats; streak: number; puzzle: PuzzleView | null; order: number[]; onClose?: () => void;
}) {
	const [toast, setToast] = useState('');
	const [ms, setMs] = useState(msUntilNextPuzzle());
	useEffect(() => {
		const t = setInterval(() => setMs(msUntilNextPuzzle()), 1000);
		return () => clearInterval(t);
	}, []);
	useEffect(() => {
		if (ms <= 0) location.reload();
	}, [ms <= 0]);

	const text = shareText(record, streak);
	const left = record.alive.filter(Boolean).length;
	const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;

	const onShare = async () => {
		const r = await shareResult(text);
		setToast(r === 'copied' ? 'Copied to clipboard. Paste it to your friends!' : r === 'shared' ? 'Shared!' : 'Could not share. Copy the text below.');
		setTimeout(() => setToast(''), 3500);
	};

	return (
		<div class="results ds-frame">
			{onClose && <button class="icon-btn close" onClick={onClose} aria-label="Close">✕</button>}
			<div class={`result-banner ${record.won ? 'win' : 'loss'}`}>
				{record.won ? 'VICTORY!' : 'DEFEATED'}
			</div>
			<p class="result-sub">
				Daily VGC #{record.number} · {left}/4 left · {record.turns} turns
				{puzzle && <><br />vs {puzzle.opponent.trainer} ({puzzle.opponent.name})</>}
			</p>
			<div class="result-squares">
				{record.alive.map((a, i) => (
					<div key={i} class={`result-square ${a ? 'alive' : 'fainted'}`}>
						{puzzle && order[i] !== undefined && <Sprite speciesId={puzzle.player[order[i]].speciesId} />}
					</div>
				))}
			</div>
			<div class="stat-row">
				<div><b>{stats.played}</b><span>Battles</span></div>
				<div><b>{stats.won}</b><span>Wins</span></div>
				<div><b>{winPct}%</b><span>Win rate</span></div>
				<div><b>{streak}</b><span>Win streak</span></div>
				<div><b>{stats.maxStreak}</b><span>Best streak</span></div>
			</div>
			<p class="share-prompt">Challenge your friends to today's battle!</p>
			<div class="share-actions">
				<button class="btn primary" onClick={onShare}>Share result</button>
				{isMobile() && <a class="btn" href={smsLink(text)}>Text a friend</a>}
			</div>
			{toast && <div class="toast">{toast}</div>}
			<pre class="share-preview">{text}</pre>
			<p class="next">Next battle in <Countdown ms={ms} /></p>
		</div>
	);
}
