import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import type { MonView, MoveView, PuzzleView, TargetHint } from '../shared/types';
import { BattleTextParser } from '../engine/text-parser';
import { applyLine, emptyScene, findMon, toID, type FieldMon, type SceneState, type SideID } from './battle-state';
import { Sprite, Modal, MonDetails, TypeBadge } from './components';
import { TYPE_COLORS, STATUS_LABEL, moveDesc } from './dexinfo';

export interface BattleUpdate {
	lines: string[];
	request: any | null;
	ended: boolean;
	alive: boolean[];
	turn: number;
	winner?: string;
}

interface Props {
	puzzle: PuzzleView;
	/** Lines already played (when resuming): rebuilt instantly without animation. */
	history: string[];
	updates: BattleUpdate[];
	thinking: boolean;
	error: string;
	speed: 'normal' | 'fast';
	onChoose: (choice: string) => void;
	onFinished: () => void;
	onToggleSpeed: () => void;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function cleanText(text: string): string[] {
	return text.split('\n')
		.map(l => l.replace(/\*\*/g, '').trim())
		.filter(l => l && !/^== Turn/.test(l))
		.map(l => (l.startsWith('[') && l.endsWith(']') ? `${l.slice(1, -1)}!` : l));
}

export function BattleScreen(props: Props) {
	const { puzzle } = props;
	const scene = useRef<SceneState>(emptyScene());
	const [, rerender] = useReducer((x: number) => x + 1, 0);
	const [message, setMessage] = useState('');
	const [anims, setAnims] = useState<Record<string, string>>({});
	const [request, setRequest] = useState<any>(null);
	const [ended, setEnded] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [waiting, setWaiting] = useState(false);
	const [infoMon, setInfoMon] = useState<FieldMon | null>(null);
	const [showLog, setShowLog] = useState(false);
	const [prompt, setPrompt] = useState('');
	const [showSheets, setShowSheets] = useState(false);
	const log = useRef<string[]>([]);
	const consumed = useRef(0);
	const skip = useRef<(() => void) | null>(null);
	const speedRef = useRef(props.speed);
	speedRef.current = props.speed;

	const parser = useMemo(() => {
		const p = new BattleTextParser('p1');
		p.p1 = 'You';
		p.p2 = puzzle.opponent.trainer;
		return p;
	}, [puzzle]);

	const textFor = (line: string) => {
		const { args, kwArgs } = BattleTextParser.parseBattleLine(line);
		if (args[0] === 'start') return [`${puzzle.opponent.trainer} would like to battle!`];
		if (args[0] === 'win') {
			return [args[1] === 'You' ? `You defeated ${puzzle.opponent.trainer}!` : `You were defeated by ${puzzle.opponent.trainer}...`];
		}
		if (['player', 'teamsize', 'gametype', 'gen', 'tier', 'rule', 'clearpoke', 'poke', 'teampreview', 't:', 'upkeep', ''].includes(args[0])) return [];
		try {
			return cleanText(parser.parseArgs(args, kwArgs) || '');
		} catch {
			return [];
		}
	};

	// Replay history instantly on mount (resume).
	useEffect(() => {
		for (const line of props.history) {
			const { args, kwArgs } = BattleTextParser.parseBattleLine(line);
			applyLine(scene.current, args, kwArgs);
			log.current.push(...textFor(line));
		}
		rerender(0);
	}, []);

	const wait = (ms: number) => new Promise<void>(resolve => {
		const factor = speedRef.current === 'fast' ? 0.45 : 1;
		const t = setTimeout(() => { skip.current = null; resolve(); }, ms * factor);
		skip.current = () => { clearTimeout(t); skip.current = null; resolve(); };
	});

	const flash = (ident: string | undefined, cls: string, ms: number) => {
		if (!ident) return;
		const mon = findMon(scene.current, ident);
		if (!mon) return;
		const key = `${mon.side}${mon.slot}`;
		setAnims(a => ({ ...a, [key]: cls }));
		setTimeout(() => setAnims(a => (a[key] === cls ? { ...a, [key]: '' } : a)), ms);
	};

	// Play queued updates one line at a time. A ref guards against overlapping loops.
	const pumping = useRef(false);
	const updatesRef = useRef(props.updates);
	updatesRef.current = props.updates;
	useEffect(() => {
		if (pumping.current || consumed.current >= props.updates.length) return;
		pumping.current = true;
		(async () => {
			setPlaying(true);
			setRequest(null);
			while (consumed.current < updatesRef.current.length) {
				const update = updatesRef.current[consumed.current++];
				setWaiting(false);
				for (const line of update.lines) {
					const { args, kwArgs } = BattleTextParser.parseBattleLine(line);
					const texts = textFor(line);
					const effect = applyLine(scene.current, args, kwArgs);
					rerender(0);
					switch (effect.kind) {
					case 'move': flash(effect.source, 'anim-attack', 450); break;
					case 'damage': flash(effect.target, 'anim-hit', 500); break;
					case 'heal': flash(effect.target, 'anim-heal', 500); break;
					case 'faint': flash(effect.target, 'anim-faint', 700); break;
					case 'switch': flash(effect.target, 'anim-switch', 500); break;
					case 'mega': flash(effect.target, 'anim-mega', 1100); break;
					case 'status': flash(effect.target, 'anim-status', 500); break;
					case 'boost': flash(effect.target, effect.up ? 'anim-boost' : 'anim-drop', 500); break;
					}
					let shown = 0;
					for (const t of texts) {
						// Parenthesized lines ("(X was hurt!)", "(Rain continues to fall.)") are minor: log only.
						if (t.startsWith('(') && t.endsWith(')')) {
							log.current.push(t.slice(1, -1));
							continue;
						}
						shown++;
						log.current.push(t);
						setMessage(t);
						await wait(Math.min(1800, 750 + t.length * 12));
					}
					if (!shown && ['damage', 'heal', 'faint', 'switch'].includes(effect.kind)) await wait(500);
				}
				if (update.ended) setEnded(true);
				if (update.request && consumed.current === updatesRef.current.length) setRequest(update.request);
			}
			if (!scene.current.ended) setMessage('');
			pumping.current = false;
			setPlaying(false);
		})();
	}, [props.updates.length]);

	useEffect(() => {
		if (ended && !playing) {
			const t = setTimeout(props.onFinished, 1600);
			return () => clearTimeout(t);
		}
	}, [ended, playing]);

	useEffect(() => {
		if (props.error) { setWaiting(false); setRequest(props.updates[props.updates.length - 1]?.request ?? null); }
	}, [props.error]);

	const viewFor = (mon: FieldMon): MonView | undefined => {
		const list = mon.side === 'p1' ? puzzle.player : puzzle.foe;
		return list.find(v => v.speciesId === mon.speciesId || v.mega?.speciesId === mon.speciesId) ??
			list.find(v => mon.speciesId.startsWith(v.speciesId) || toID(v.species).startsWith(toID(mon.name)));
	};

	const submit = (choice: string) => {
		setRequest(null);
		setWaiting(true);
		setMessage('');
		props.onChoose(choice);
	};

	const s = scene.current;
	const showControls = !!request && !playing && !ended;

	return (
		<div class="battle">
			<div class="ds-screen top-screen">
				<Scene scene={s} anims={anims} onInspect={setInfoMon} />
				<div class="textbox" onClick={() => skip.current?.()}>
					<p>{message || (showControls ? (prompt || promptFor(request, s)) : waiting ? (props.thinking ? `${puzzle.opponent.trainer} is thinking...` : 'Waiting...') : '')}</p>
					{playing && <span class="more">▼</span>}
				</div>
			</div>
			<div class="hinge">
				<span class="turn-chip">Turn {s.turn || 1}</span>
				<FieldTags scene={s} />
				<button class="speed-btn" onClick={() => setShowSheets(true)} title="Open team sheets">Teams</button>
				<button class="speed-btn" onClick={props.onToggleSpeed} aria-label="Toggle text speed" title="Text speed">
					{props.speed === 'fast' ? 'Fast ▶▶' : 'Text ▶'}
				</button>
			</div>
			<div class="ds-screen bottom-screen">
				{showControls ? (
					<Controls key={JSON.stringify(request.side?.pokemon?.map((p: any) => p.condition)) + s.turn + (request.forceSwitch ? 'f' : '')}
						request={request} scene={s} puzzle={puzzle} onSubmit={submit} viewFor={viewFor} onPrompt={setPrompt} />
				) : (
					<div class="idle-panel">
						<FieldInfo scene={s} />
						<button class="btn ghost" onClick={() => setShowLog(true)}>Battle log</button>
						{props.error && <p class="error">{props.error}</p>}
					</div>
				)}
			</div>
			{infoMon && (
				<Modal title={infoMon.species} onClose={() => setInfoMon(null)}>
					<LiveInfo mon={infoMon} view={viewFor(infoMon)} />
				</Modal>
			)}
			{showSheets && (
				<Modal title="Team sheets" onClose={() => setShowSheets(false)}>
					<TeamSheets puzzle={puzzle} />
				</Modal>
			)}
			{showLog && (
				<Modal title="Battle log" onClose={() => setShowLog(false)}>
					<div class="battle-log">{log.current.map((l, i) => <p key={i}>{l}</p>)}</div>
				</Modal>
			)}
		</div>
	);
}

function TeamSheets({ puzzle }: { puzzle: PuzzleView }) {
	const [open, setOpen] = useState<string | null>(null);
	const row = (mon: MonView, key: string) => (
		<div key={key} class="sheet-row">
			<button class="sheet-head" onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key}>
				<Sprite speciesId={mon.speciesId} />
				<span><b>{mon.species}</b> @ {mon.item}<br /><span class="muted small">{mon.moves.map(m => m.name).join(' · ')}</span></span>
			</button>
			{open === key && <MonDetails mon={mon} />}
		</div>
	);
	return (
		<div class="sheets">
			<h3>{puzzle.opponent.trainer}</h3>
			{puzzle.foe.map((m, i) => row(m, `f${i}`))}
			<h3>Your team</h3>
			{puzzle.player.map((m, i) => row(m, `p${i}`))}
		</div>
	);
}

function promptFor(request: any, s: SceneState) {
	if (request?.forceSwitch) return 'Choose a Pokémon to send out.';
	const first = s.active.p1.find(m => m && !m.fainted);
	return first ? `What will ${first.name} do?` : 'What will you do?';
}

/* ------------------------------------------------------------------------------------------ */

function HPBox({ mon, onClick }: { mon: FieldMon; onClick: () => void }) {
	const frac = mon.maxhp ? mon.hp / mon.maxhp : 0;
	const color = frac > 0.5 ? 'green' : frac > 0.2 ? 'yellow' : 'red';
	const boosts = Object.entries(mon.boosts).filter(([, v]) => v);
	return (
		<button class={`hpbox ${mon.side}`} onClick={onClick}>
			<div class="hpbox-name">
				<span>{mon.name}</span>
				{mon.gender && <span class={`gender ${mon.gender}`}>{mon.gender === 'M' ? '♂' : '♀'}</span>}
				<span class="lv">Lv{mon.level}</span>
			</div>
			<div class="hpbar-row">
				{mon.status && <span class={`status s-${mon.status}`}>{STATUS_LABEL[mon.status] || mon.status.toUpperCase()}</span>}
				<span class="hp-label">HP</span>
				<span class="hpbar"><span class={`hpfill ${color}`} style={{ width: `${Math.max(0, Math.min(100, frac * 100))}%` }} /></span>
			</div>
			{mon.exact && <div class="hp-num">{mon.hp}/{mon.maxhp}</div>}
			{boosts.length > 0 && (
				<div class="boosts">{boosts.map(([k, v]) => <span key={k} class={v > 0 ? 'up' : 'down'}>{BOOST_NAMES[k] || k} {v > 0 ? '+' : ''}{v}</span>)}</div>
			)}
		</button>
	);
}

function Scene({ scene, anims, onInspect }: { scene: SceneState; anims: Record<string, string>; onInspect: (m: FieldMon) => void }) {
	const sides: SideID[] = ['p2', 'p1'];
	const weatherClass = scene.weather ? `weather-${toID(scene.weather)}` : '';
	const trick = scene.pseudo.includes('Trick Room');
	return (
		<div class={`scene ${weatherClass}${trick ? ' trick-room' : ''}${scene.terrain ? ` terrain-${toID(scene.terrain)}` : ''}`}>
			<div class="bg-sky" />
			<div class="bg-ground" />
			<div class="platform foe" />
			<div class="platform ally" />
			{sides.map(side => scene.active[side].map((mon, slot) => mon && (
				<div key={`${side}${slot}-${mon.name}`} class={`mon-pos ${side} slot${slot} ${mon.fainted ? 'fainted' : ''} ${anims[`${side}${slot}`] || ''}`}
					onClick={() => onInspect(mon)}>
					<Sprite speciesId={mon.speciesId} back={side === 'p1'} alt={mon.species} />
				</div>
			)))}
			<div class="hpboxes foe">
				{scene.active.p2.map((m, i) => m && !m.fainted && <HPBox key={i} mon={m} onClick={() => onInspect(m)} />)}
			</div>
			<div class="hpboxes ally">
				{scene.active.p1.map((m, i) => m && !m.fainted && <HPBox key={i} mon={m} onClick={() => onInspect(m)} />)}
			</div>
			<div class="party-balls foe">{balls(scene, 'p2')}</div>
		</div>
	);
}

function FieldTags({ scene }: { scene: SceneState }) {
	return (
		<span class="field-tags">
			{scene.weather && <span>{weatherName(scene.weather)}</span>}
			{scene.terrain && <span>{scene.terrain}</span>}
			{scene.pseudo.map(p => <span key={p}>{p}</span>)}
			{scene.sideConditions.p2.map(c => <span key={`p2${c}`} class="foe-tag">Foe {c}</span>)}
			{scene.sideConditions.p1.map(c => <span key={`p1${c}`} class="ally-tag">Your {c}</span>)}
		</span>
	);
}

function balls(scene: SceneState, side: SideID) {
	const roster = scene.roster[side];
	return [0, 1, 2, 3].map(i => {
		const r = roster[i];
		return <span key={i} class={`ball ${!r ? 'unknown' : r.fainted ? 'fainted' : r.status ? 'status' : 'ok'}`} />;
	});
}

function weatherName(w: string) {
	return ({ SunnyDay: 'Harsh sunlight', RainDance: 'Rain', Sandstorm: 'Sandstorm', Snowscape: 'Snow', Snow: 'Snow' } as Record<string, string>)[w] || w;
}

function FieldInfo({ scene }: { scene: SceneState }) {
	const mine = scene.roster.p1;
	return (
		<div class="field-info">
			<div class="party-strip">
				{mine.map(r => (
					<div key={r.name} class={`party-mon${r.fainted ? ' fainted' : ''}`}>
						<Sprite speciesId={r.speciesId} />
						<span class="mini-hp"><span style={{ width: `${r.hpFrac * 100}%` }} /></span>
					</div>
				))}
			</div>
		</div>
	);
}

function LiveInfo({ mon, view }: { mon: FieldMon; view?: MonView }) {
	const boosts = Object.entries(mon.boosts).filter(([, v]) => v);
	return (
		<div>
			<p>
				HP: {mon.exact ? `${mon.hp}/${mon.maxhp}` : `${Math.round(mon.hp / mon.maxhp * 100)}%`}
				{mon.status && <> · <b>{STATUS_LABEL[mon.status] || mon.status}</b></>}
				{boosts.length > 0 && <> · {boosts.map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ')}</>}
				{mon.volatiles.length > 0 && <> · {mon.volatiles.join(', ')}</>}
			</p>
			{view && <MonDetails mon={view} />}
		</div>
	);
}

/* ------------------------------------------------------------------------------------------ */
/* Command panel                                                                                */
/* ------------------------------------------------------------------------------------------ */

const NEEDS_TARGET = new Set(['normal', 'any', 'adjacentFoe', 'adjacentAlly', 'adjacentAllyOrSelf']);

interface ControlsProps {
	request: any;
	scene: SceneState;
	puzzle: PuzzleView;
	onSubmit: (choice: string) => void;
	viewFor: (m: FieldMon) => MonView | undefined;
	onPrompt: (text: string) => void;
}

function Controls({ request, scene, puzzle, onSubmit, onPrompt }: ControlsProps) {
	const moveInfo = useMemo(() => Object.fromEntries(puzzle.player.flatMap(m => m.moves.map(mv => [mv.id, mv]))), [puzzle]);
	const forced: boolean[] | undefined = request.forceSwitch;
	const slots = forced ? forced.length : (request.active?.length ?? 0);
	const team: any[] = request.side.pokemon;
	const [slot, setSlot] = useState(() => firstSlot(0));
	const [choices, setChoices] = useState<string[]>([]);
	const [view, setView] = useState<'main' | 'fight' | 'target' | 'switch'>(forced ? 'switch' : 'main');
	const [mega, setMega] = useState(false);
	const [pendingMove, setPendingMove] = useState<number | null>(null);

	function slotIsLive(i: number) {
		if (forced) return !!forced[i];
		const mon = team[i];
		return !!mon && !mon.condition.endsWith(' fnt') && !!request.active?.[i] && !mon.commanding;
	}
	function firstSlot(from: number) {
		let i = from;
		while (i < slots && !slotIsLive(i)) i++;
		return i;
	}

	const finish = (next: string[]) => {
		const all = [...next];
		for (let i = 0; i < slots; i++) if (all[i] === undefined) all[i] = 'pass';
		onSubmit(all.join(', '));
	};

	const commit = (choice: string) => {
		const next = [...choices];
		for (let i = next.length; i < slot; i++) next[i] = 'pass';
		next[slot] = choice;
		const nextSlot = firstSlot(slot + 1);
		// If two Pokémon fainted but only one can come in, the other slot passes.
		const canStillSwitch = !forced || team.some((p: any, i: number) => {
			const reviving = !!team[nextSlot]?.reviving;
			return !p.active && p.condition.endsWith(' fnt') === reviving && !next.includes(`switch ${i + 1}`);
		});
		if (nextSlot >= slots || !canStillSwitch) {
			finish(next);
			return;
		}
		setChoices(next);
		setSlot(nextSlot);
		setView(forced ? 'switch' : 'main');
		setMega(false);
		setPendingMove(null);
	};

	const back = () => {
		let prev = slot - 1;
		while (prev >= 0 && !slotIsLive(prev)) prev--;
		if (prev < 0) return;
		setChoices(choices.slice(0, prev));
		setSlot(prev);
		setView(forced ? 'switch' : 'main');
		setMega(false);
	};

	const megaTakenEarlier = choices.some(c => c?.endsWith(' mega'));
	const active = request.active?.[slot];
	const me = team[slot];
	const name = me ? me.ident.replace(/^p1: /, '') : '';
	useEffect(() => {
		if (forced) onPrompt(team[slot]?.reviving ? 'Choose a Pokémon to revive.' : 'Choose a Pokémon to send out.');
		else onPrompt(name ? `What will ${name} do?` : '');
	}, [slot, name]);
	const canGoBack = (() => { let p = slot - 1; while (p >= 0 && !slotIsLive(p)) p--; return p >= 0; })();

	// Revival Blessing: the "switch" prompt picks a fainted Pokémon to revive.
	const reviving = !!(forced && team[slot]?.reviving);
	const switchTargets = team.map((p: any, i: number) => ({ p, i }))
		.filter(({ p, i }) => !p.active && p.condition.endsWith(' fnt') === reviving && !choices.includes(`switch ${i + 1}`));

	if (slot >= slots) return null;

	if (view === 'switch') {
		return (
			<div class="controls">
				<div class="controls-head">
					{reviving ? 'Choose a Pokémon to revive' : forced ? `Send out a Pokémon${slots > 1 ? ` (slot ${slot + 1})` : ''}` : `Switch ${name} with...`}
				</div>
				<div class="switch-grid">
					{switchTargets.map(({ p, i }) => {
						const [hp, status] = p.condition.split(' ');
						const [cur, max = 1] = hp.split('/').map(Number);
						return (
							<button key={i} class="switch-btn" onClick={() => commit(`switch ${i + 1}`)}>
								<Sprite speciesId={toID(p.details.split(',')[0])} />
								<span class="sw-name">{p.ident.replace(/^p1: /, '')}</span>
								<span class="sw-hp"><span class="mini-hp"><span style={{ width: `${cur / max * 100}%` }} /></span>{status === 'fnt' ? 'Fainted' : `${cur}/${max}${status ? ` ${STATUS_LABEL[status] || status}` : ''}`}</span>
							</button>
						);
					})}
					{!switchTargets.length && <p class="muted">No Pokémon can switch in.</p>}
				</div>
				<div class="controls-foot">
					{!forced && <button class="btn ghost" onClick={() => setView('main')}>Cancel</button>}
					{canGoBack && <button class="btn ghost" onClick={back}>Back</button>}
				</div>
			</div>
		);
	}

	if (view === 'target' && pendingMove !== null) {
		const move = active.moves[pendingMove];
		const info = moveInfo[move.id];
		const plan = targetPlan(move.target, slot, scene);
		const hintSet = (mega && request.megaHints?.[slot]) || request.hints?.[slot];
		const hints: Record<number, TargetHint> = hintSet?.[pendingMove] ?? {};
		const use = (loc?: number) => commit(`move ${pendingMove + 1}${loc !== undefined ? ` ${loc}` : ''}${mega ? ' mega' : ''}`);
		const hitsAlly = move.target === 'allAdjacent' && plan.slots.some(t => t.side === 'p1' && t.affected && t.loc !== -(slot + 1));
		return (
			<div class="controls target-view">
				<div class="controls-head">
					<span>{plan.pick ? `Use ${move.move} on...` : hitsAlly ? `${move.move} will hit your partner too!` : `Use ${move.move}?`}</span>
				</div>
				{info && <MoveCard move={info} pp={move.pp} maxpp={move.maxpp} />}
				<div class="target-grid">
					{plan.slots.map(t => {
						const hint = info?.category !== 'Status' && t.affected ? hints[t.loc] : undefined;
						const ally = t.side === 'p1' && t.loc !== -(slot + 1);
						return (
							<button key={t.loc} class={`target-btn ${t.side}${t.affected ? ' affected' : ''}${hitsAlly && ally && t.affected ? ' warn' : ''}`}
								disabled={!t.affected}
								onClick={() => use(plan.pick ? t.loc : undefined)}>
								{t.mon && <Sprite speciesId={t.mon.speciesId} back={t.side === 'p1'} />}
								<span class="tg-text">
									<span class="tg-name">{t.label}</span>
									{hint && <Effectiveness hint={hint} />}
								</span>
							</button>
						);
					})}
				</div>
				{!plan.pick && <button class="btn primary confirm-move" onClick={() => use()}>Use {move.move}</button>}
				<div class="controls-foot">
					<button class="btn ghost" onClick={() => { setPendingMove(null); setView('fight'); }}>Change move</button>
					<button class="btn ghost" onClick={() => { setPendingMove(null); setView('main'); }}>Cancel</button>
				</div>
			</div>
		);
	}

	if (view === 'fight') {
		return (
			<div class="controls">
				<div class="controls-head">
					<span>{name}</span>
					{active.canMegaEvo && !megaTakenEarlier && (
						<button class={`mega-toggle${mega ? ' on' : ''}`} onClick={() => setMega(!mega)} aria-pressed={mega}>
							{mega ? '★ Mega Evolving' : 'Mega Evolve'}
						</button>
					)}
				</div>
				<div class="move-grid">
					{active.moves.map((m: any, i: number) => {
						const v = moveInfo[m.id];
						const disabled = !!m.disabled || m.pp === 0;
						return (
							<button key={i} class="move-btn" style={{ '--type': TYPE_COLORS[v?.type || 'Normal'] }} disabled={disabled}
								title={moveDesc(m.id)}
								onClick={() => { setPendingMove(i); setView('target'); }}>
								<span class="mv-name">{m.move}</span>
								{v && (
									<span class="mv-meta">
										<TypeBadge type={v.type} small />
										<span class={`cat cat-${v.category.toLowerCase()}`}>{CATEGORY_SHORT[v.category]}</span>
									</span>
								)}
								<span class="mv-meta">
									{v && v.category !== 'Status' && <span>{v.basePower ? `${v.basePower} BP` : 'Varies'} ·</span>}
									<span class="pp">PP {m.pp ?? '-'}/{m.maxpp ?? '-'}</span>
								</span>
							</button>
						);
					})}
				</div>
				<div class="controls-foot"><button class="btn ghost" onClick={() => setView('main')}>Cancel</button></div>
			</div>
		);
	}

	// Main menu
	return (
		<div class="controls main-menu">
			<button class="fight-btn" onClick={() => setView('fight')}>
				<span>FIGHT</span>
				<small>{name}</small>
			</button>
			<div class="menu-row">
				<button class="pkmn-btn" disabled={active?.trapped || !switchTargets.length} onClick={() => setView('switch')}>POKéMON</button>
				{canGoBack && <button class="back-btn" onClick={back}>BACK</button>}
			</div>
		</div>
	);
}

const BOOST_NAMES: Record<string, string> = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', accuracy: 'Acc', evasion: 'Eva' };

const CATEGORY_SHORT: Record<string, string> = { Physical: 'Physical', Special: 'Special', Status: 'Status' };

const EFFECT_LABELS: [number, string, string][] = [
	[4, '4×', 'Extremely effective'], [2, '2×', 'Super effective'], [1, '1×', 'Effective'],
	[0.5, '½×', 'Not very effective'], [0.25, '¼×', 'Mostly ineffective'],
];

function Effectiveness({ hint }: { hint: TargetHint }) {
	if (hint.mult === 0) return <span class="eff eff-0">0× Immune{hint.note ? ` (${hint.note})` : ''}</span>;
	if (hint.note === 'fixed damage') return <span class="eff eff-1">Fixed damage</span>;
	const [mult, short, label] = EFFECT_LABELS.find(([m]) => hint.mult >= m) ?? EFFECT_LABELS[EFFECT_LABELS.length - 1];
	return <span class={`eff eff-${String(mult).replace('.', '')}`}>{short} {label}</span>;
}

function MoveCard({ move, pp, maxpp }: { move: MoveView; pp?: number; maxpp?: number }) {
	const acc = move.accuracy === true ? 'Never misses' : `${move.accuracy}% acc.`;
	const desc = moveDesc(move.id);
	// Skip effects the description already states word for word.
	const effects = move.effects.filter(e => !desc.toLowerCase().includes(e.toLowerCase()));
	return (
		<div class="move-card">
			<div class="mc-line">
				<TypeBadge type={move.type} small />
				<span class={`cat cat-${move.category.toLowerCase()}`}>{move.category}</span>
				<span>{[
					move.category !== 'Status' ? (move.basePower ? `${move.basePower} BP` : 'Varies') : '',
					acc,
					pp !== undefined ? `PP ${pp}/${maxpp}` : '',
				].filter(Boolean).join(' · ')}</span>
			</div>
			{desc && <p class="mc-desc">{desc}</p>}
			{(effects.length > 0 || move.tags.length > 0) && (
				<ul class="mc-effects">
					{effects.map(e => <li key={e}>{e}</li>)}
					{move.tags.length > 0 && <li class="mc-tags">{move.tags.map(t => <span key={t} class="tag">{t}</span>)}</li>}
				</ul>
			)}
		</div>
	);
}

interface TargetSlot { loc: number; label: string; side: SideID; affected: boolean; mon: FieldMon | null }

/**
 * Which Pokémon a move can or will hit. Single-target moves are picked (pick = true);
 * spread, self and field moves list everything they affect and are confirmed as a whole.
 */
function targetPlan(target: string, slot: number, scene: SceneState): { pick: boolean; slots: TargetSlot[] } {
	const pick = NEEDS_TARGET.has(target);
	const alive = (m: FieldMon | null) => !!m && !m.fainted;
	const slots: TargetSlot[] = [];
	scene.active.p2.forEach((mon, i) => {
		let affected = alive(mon);
		if (pick) affected &&= target !== 'adjacentAlly' && target !== 'adjacentAllyOrSelf';
		else affected &&= ['allAdjacentFoes', 'allAdjacent', 'foeSide', 'randomNormal', 'all', 'scripted'].includes(target);
		slots.push({ loc: i + 1, label: mon ? mon.name : '—', side: 'p2', affected, mon });
	});
	scene.active.p1.forEach((mon, i) => {
		const self = i === slot;
		let affected = alive(mon);
		if (pick) affected &&= self ? target === 'adjacentAllyOrSelf' : target !== 'adjacentFoe';
		else if (self) affected &&= ['self', 'allies', 'allySide', 'allyTeam', 'all'].includes(target);
		else affected &&= ['allAdjacent', 'allies', 'allySide', 'allyTeam', 'all'].includes(target);
		slots.push({ loc: -(i + 1), label: mon ? `${mon.name}${self ? ' (you)' : ' (partner)'}` : '—', side: 'p1', affected, mon });
	});
	return { pick, slots };
}
