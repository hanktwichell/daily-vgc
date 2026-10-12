import type { GameRecord, Stats } from './storage';

const BUCKETS = ['Perfect', '3/4', '2/4', '1/4', 'Loss'] as const;
type Bucket = typeof BUCKETS[number];

/** Which bar a result belongs to: wins by how many of the four survived, or a loss. */
export function bucketFor(record: GameRecord): Bucket {
	if (!record.won) return 'Loss';
	const left = record.alive.filter(Boolean).length;
	return left >= 4 ? 'Perfect' : (`${left}/4` as Bucket);
}

export function resultDistribution(stats: Stats): Record<Bucket, number> {
	const counts = Object.fromEntries(BUCKETS.map(b => [b, 0])) as Record<Bucket, number>;
	for (const record of Object.values(stats.history)) counts[bucketFor(record)]++;
	return counts;
}

/** Headline numbers plus a Wordle-style bar chart of results. `today` highlights its bar. */
export function StatsSummary({ stats, streak, today }: { stats: Stats; streak: number; today?: GameRecord | null }) {
	const pct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
	const counts = resultDistribution(stats);
	const max = Math.max(1, ...Object.values(counts));
	const current = today ? bucketFor(today) : null;
	return (
		<div class="stats-summary">
			<div class="stat-row">
				<div><b>{stats.played}</b><span>Battles</span></div>
				<div><b>{pct}%</b><span>Win rate</span></div>
				<div><b>{streak}</b><span>Win streak</span></div>
				<div><b>{stats.maxStreak}</b><span>Best streak</span></div>
			</div>
			<h3 class="dist-title">Results</h3>
			<div class="dist" role="list">
				{BUCKETS.map(b => (
					<div key={b} class="dist-row" role="listitem" aria-label={`${b}: ${counts[b]}`}>
						<span class="dist-label">{b}</span>
						<span class="dist-track">
							<span class={`dist-bar${b === current ? ' current' : ''}${b === 'Loss' ? ' loss' : ''}`}
								style={{ width: `${Math.max(7, (counts[b] / max) * 100)}%` }}>
								{counts[b]}
							</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
