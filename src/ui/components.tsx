import type { ComponentChildren } from 'preact';
import type { MonView, MoveView } from '../shared/types';
import { TYPE_COLORS, STAT_NAMES, spriteUrl, moveDesc, itemDesc, abilityDesc } from './dexinfo';

export function TypeBadge({ type, small }: { type: string; small?: boolean }) {
	return <span class={`type-badge${small ? ' small' : ''}`} style={{ background: TYPE_COLORS[type] || '#888' }}>{type}</span>;
}

export function Sprite({ speciesId, back, class: cls, alt }: { speciesId: string; back?: boolean; class?: string; alt?: string }) {
	const src = spriteUrl(speciesId, back);
	return <img class={`sprite ${cls || ''}`} src={src} alt={alt || speciesId} draggable={false} loading="lazy" />;
}

export function MoveChip({ move }: { move: MoveView }) {
	return (
		<span class="move-chip" style={{ '--type': TYPE_COLORS[move.type] }} title={moveDesc(move.id)}>
			{move.name}
		</span>
	);
}

export function Modal({ onClose, title, children, wide }: { onClose: () => void; title?: string; children: ComponentChildren; wide?: boolean }) {
	return (
		<div class="modal-backdrop" onClick={onClose}>
			<div class={`modal ds-frame${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
				<div class="modal-head">
					{title && <h2>{title}</h2>}
					<button class="icon-btn close" onClick={onClose} aria-label="Close">✕</button>
				</div>
				<div class="modal-body">{children}</div>
			</div>
		</div>
	);
}

function moveLine(m: MoveView) {
	const parts: string[] = [];
	if (m.category !== 'Status') parts.push(`${m.basePower || '—'} BP`);
	parts.push(m.accuracy === true ? '—' : `${m.accuracy}%`);
	if (m.priority) parts.push(`${m.priority > 0 ? '+' : ''}${m.priority} priority`);
	return parts.join(' · ');
}

/** Full set details: used for the info modal in team preview and battle. */
export function MonDetails({ mon, showStats = true }: { mon: MonView; showStats?: boolean }) {
	const stats = mon.mega ? mon.mega.stats : mon.stats;
	return (
		<div class="mon-details">
			<div class="mon-details-head">
				<Sprite speciesId={mon.speciesId} class="big" />
				{mon.mega && <Sprite speciesId={mon.mega.speciesId} class="big" />}
				<div>
					<div class="mon-name">{mon.species}</div>
					<div class="types">{mon.types.map(t => <TypeBadge key={t} type={t} />)}</div>
					{mon.mega && (
						<div class="mega-line">Mega: {mon.mega.species} {mon.mega.types.map(t => <TypeBadge key={t} type={t} small />)}</div>
					)}
				</div>
			</div>
			<dl class="kv">
				<dt>Item</dt><dd><b>{mon.item || 'None'}</b> <span class="muted">{itemDesc(mon.itemId)}</span></dd>
				<dt>Ability</dt><dd><b>{mon.ability}</b> <span class="muted">{abilityDesc(mon.abilityId)}</span></dd>
				{mon.mega && <><dt>Mega Ability</dt><dd><b>{mon.mega.ability}</b> <span class="muted">{abilityDesc(mon.mega.abilityId)}</span></dd></>}
				<dt>Nature</dt><dd>{mon.nature}</dd>
			</dl>
			<ul class="move-list">
				{mon.moves.map(m => (
					<li key={m.id}>
						<span class="move-name" style={{ '--type': TYPE_COLORS[m.type] }}>{m.name}</span>
						<TypeBadge type={m.type} small /> <span class={`cat cat-${m.category.toLowerCase()}`}>{m.category}</span>
						<span class="muted"> {moveLine(m)}</span>
						<div class="muted small">{moveDesc(m.id)}</div>
					</li>
				))}
			</ul>
			{showStats && (
				<table class="stat-table">
					<thead><tr><th></th>{Object.keys(STAT_NAMES).map(s => <th key={s}>{STAT_NAMES[s]}</th>)}</tr></thead>
					<tbody>
						<tr><th>SP</th>{Object.keys(STAT_NAMES).map(s => <td key={s}>{(mon.sp as any)[s] || 0}</td>)}</tr>
						<tr><th>{mon.mega ? 'Mega' : 'Stat'}</th>{Object.keys(STAT_NAMES).map(s => <td key={s}>{(stats as any)[s]}</td>)}</tr>
					</tbody>
				</table>
			)}
		</div>
	);
}

export function Countdown({ ms }: { ms: number }) {
	const s = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
	const pad = (n: number) => String(n).padStart(2, '0');
	return <span class="countdown">{pad(h)}:{pad(m)}:{pad(sec)}</span>;
}
