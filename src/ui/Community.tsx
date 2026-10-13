import { useEffect, useState } from 'preact/hooks';
import type { CommunityMode, CommunityStats, ModeStats } from '../shared/community';
import { fetchCommunityStats, fetchPlayerCount } from './community';
import { trainerClassFor } from '../data/trainer-classes';
import { Sprite } from './components';
import { toID } from './battle-state';

const RESULT_LABELS = ['Perfect', '3/4', '2/4', '1/4', 'Loss'];
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function longDate(date: string) {
	return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
}

/**
 * How everyone did on a finished puzzle: win rate, how many Pokémon survived, how often each
 * Pokémon was brought, and the four with the best win rate.
 */
export function CommunityRecap({ puzzle, title, onPlay }: { puzzle: number; title: string; onPlay?: () => void }) {
	const [stats, setStats] = useState<CommunityStats | null | undefined>(undefined);
	const [mode, setMode] = useState<CommunityMode>('normal');
	useEffect(() => { fetchCommunityStats(puzzle).then(setStats); }, [puzzle]);

	if (stats === undefined) return <div class="recap"><p class="muted center">Loading results...</p></div>;
	const m = stats?.modes[mode];
	return (
		<div class="recap">
			<h2 class="recap-title">{title}</h2>
			<p class="muted center small">Daily VGC #{puzzle}{stats ? ` · ${longDate(stats.date)}` : ''}</p>
			{stats?.modes.hard && (
				<div class="mode-toggle" role="tablist" aria-label="Results for">
					{(['normal', 'hard'] as const).map(k => (
						<button key={k} role="tab" aria-selected={mode === k} class={`${mode === k ? 'on' : ''}${k === 'hard' ? ' hard' : ''}`} onClick={() => setMode(k)}>
							{k === 'normal' ? 'Daily' : 'Hard Mode'}
						</button>
					))}
				</div>
			)}
			{m ? <ModeRecap m={m} /> : <p class="muted center">No results were recorded for this battle.</p>}
			{stats && !stats.final && <p class="muted center small">Late results are still coming in.</p>}
			{onPlay && <button class="btn primary recap-play" onClick={onPlay}>Play today's battle →</button>}
		</div>
	);
}

function ModeRecap({ m }: { m: ModeStats }) {
	const maxResult = Math.max(1, ...m.results);
	const order = m.team.map((name, i) => ({ name, i, n: m.picks[i] })).sort((a, b) => b.n - a.n || a.i - b.i);
	return (
		<>
			<div class="recap-headline">
				<b>{pct(m.won, m.played)}%</b>
				<span>won · {m.played.toLocaleString()} {m.played === 1 ? 'battle' : 'battles'}</span>
			</div>

			<h3 class="dist-title">Pokémon left at the end</h3>
			<div class="dist" role="list">
				{RESULT_LABELS.map((label, i) => (
					<div key={label} class="dist-row" role="listitem" aria-label={`${label}: ${pct(m.results[i], m.played)}%`}>
						<span class="dist-label">{label}</span>
						<span class="dist-track">
							<span class={`dist-bar${i === 4 ? ' loss' : ''}`} style={{ width: `${Math.max(9, (m.results[i] / maxResult) * 100)}%` }}>
								{pct(m.results[i], m.played)}%
							</span>
						</span>
					</div>
				))}
			</div>

			<h3 class="dist-title">Most picked</h3>
			<div class="pick-list">
				{order.map(({ name, i, n }) => (
					<div key={i} class="pick-row">
						<Sprite speciesId={toID(name)} />
						<span class="pick-name">{name}</span>
						<span class="pick-track"><span style={{ width: `${pct(n, m.played)}%` }} /></span>
						<b class="pick-pct">{pct(n, m.played)}%</b>
					</div>
				))}
			</div>

			<h3 class="dist-title">Best team of four</h3>
			{m.best ? (
				<div class="best-four">
					<div class="best-mons">
						{m.best.picks.map(i => (
							<div key={i} class="best-mon">
								<Sprite speciesId={toID(m.team[i])} />
								<span>{m.team[i]}</span>
							</div>
						))}
					</div>
					<p><b>{pct(m.best.won, m.best.played)}% win rate</b> · won {m.best.won} of {m.best.played}</p>
				</div>
			) : <p class="muted center small">Not enough battles with the same four yet.</p>}
		</>
	);
}

/**
 * Footer line: how many players have finished today's battle, named after the day's trainer
 * class. `refresh` is bumped when this browser's own result has been reported.
 */
export function PlayerCount({ puzzle, refresh }: { puzzle: number; refresh: number }) {
	const [count, setCount] = useState<number | null>(null);
	useEffect(() => {
		let live = true;
		const load = (fresh: boolean) => fetchPlayerCount(puzzle, fresh).then(n => { if (live && n !== null) setCount(n); });
		load(refresh > 0);
		// Catch up when a tab that was left open is looked at again.
		const onVisible = () => { if (document.visibilityState === 'visible') load(false); };
		document.addEventListener('visibilitychange', onVisible);
		return () => { live = false; document.removeEventListener('visibilitychange', onVisible); };
	}, [puzzle, refresh]);

	if (count === null) return null;
	const [one, many] = trainerClassFor(puzzle);
	return (
		<p class="player-count">
			{count === 0 ? `Be today's first ${one}!` : <><b>{count.toLocaleString('en-US')}</b> {count === 1 ? one : many} today</>}
		</p>
	);
}
