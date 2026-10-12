import { useState } from 'preact/hooks';
import type { MonView, PuzzleView } from '../shared/types';
import { Sprite, TypeBadge, MoveChip, Modal, MonDetails } from './components';

const SLOT_LABELS = ['Lead', 'Lead', 'Back', 'Back'];

export function TeamPreview({ puzzle, onStart }: { puzzle: PuzzleView; onStart: (order: number[]) => void }) {
	const [order, setOrder] = useState<number[]>([]);
	const [info, setInfo] = useState<MonView | null>(null);

	const toggle = (i: number) => {
		setOrder(o => (o.includes(i) ? o.filter(x => x !== i) : o.length >= 4 ? o : [...o, i]));
	};
	const megas = puzzle.player.filter(m => m.mega).length;
	const hard = puzzle.mode === 'hard';
	const ready = order.length === 4;

	return (
		<div class="preview">
			<section class="ds-frame foe-panel">
				<div class="trainer-line">
					<div>
						<div class="eyebrow">{hard ? 'Hard Mode opponent' : 'Today\'s opponent'}</div>
						<div class="trainer-name">{puzzle.opponent.trainer}</div>
						<div class="team-name">“{puzzle.opponent.name}”</div>
					</div>
				</div>
				<p class="quip">{puzzle.opponent.quip}</p>
				<div class="foe-row">
					{puzzle.foe.map((mon, i) => (
						<button key={i} class="foe-mon" onClick={() => setInfo(mon)} aria-label={`${mon.species} details`}>
							<Sprite speciesId={mon.speciesId} />
							<span class="foe-mon-name">{mon.species}</span>
							{mon.mega && <span class="mega-tag">MEGA</span>}
						</button>
					))}
				</div>
				<div class="hint">Open Team Sheets: tap any Pokémon to see its moves, item and Ability. They will bring 4, including a Mega.</div>
			</section>

			<section class="your-team">
				<div class="section-head">
					<h2>{hard ? 'Your team (Hard Mode)' : 'Your team'}</h2>
					<span class="muted">{puzzle.archetype} · {megas === 0 ? 'no Megas' : megas === 1 ? '1 Mega' : '2 Megas (only one can Mega Evolve)'}</span>
				</div>
				<p class="instructions">Pick <b>4</b>. Your first two picks lead; the next two start in the back.</p>
				<div class="team-grid">
					{puzzle.player.map((mon, i) => {
						const pick = order.indexOf(i);
						return (
							<div key={i} class={`mon-card ds-frame${pick >= 0 ? ' picked' : ''}${!ready || pick >= 0 ? '' : ' dim'}`}
								onClick={() => toggle(i)} role="button" tabIndex={0}
								onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); } }}
								aria-pressed={pick >= 0}>
								{pick >= 0 && <span class="pick-badge">{pick + 1}<small>{SLOT_LABELS[pick]}</small></span>}
								<div class="mon-card-top">
									<Sprite speciesId={mon.speciesId} />
									<div class="mon-card-id">
										<div class="mon-name">{mon.species}{mon.mega && <span class="mega-tag">MEGA</span>}</div>
										<div class="types">{(mon.mega?.types ?? mon.types).map(t => <TypeBadge key={t} type={t} small />)}</div>
										<div class="small">@ {mon.item}</div>
										<div class="small muted">{mon.mega ? mon.mega.ability : mon.ability}</div>
									</div>
									<button class="icon-btn info" onClick={e => { e.stopPropagation(); setInfo(mon); }} aria-label={`${mon.species} details`}>i</button>
								</div>
								<div class="moves">{mon.moves.map(m => <MoveChip key={m.id} move={m} />)}</div>
							</div>
						);
					})}
				</div>
			</section>

			<div class="preview-footer ds-frame">
				<div class="order-summary">
					{[0, 1, 2, 3].map(k => (
						<div key={k} class={`order-slot${order[k] !== undefined ? ' filled' : ''}`}>
							{order[k] !== undefined ? <Sprite speciesId={puzzle.player[order[k]].speciesId} /> : <span>{k + 1}</span>}
							<small>{SLOT_LABELS[k]}</small>
						</div>
					))}
				</div>
				<div class="footer-actions">
					{order.length > 0 && <button class="btn ghost" onClick={() => setOrder([])}>Reset</button>}
					<button class="btn primary" disabled={!ready} onClick={() => onStart(order)}>
						{ready ? 'Battle!' : `Pick ${4 - order.length} more`}
					</button>
				</div>
			</div>

			{info && <Modal title={info.species} onClose={() => setInfo(null)}><MonDetails mon={info} /></Modal>}
		</div>
	);
}
