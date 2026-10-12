// Runs the Showdown simulator and the opponent AI off the main thread.
/// <reference lib="webworker" />
import { Dex, FORMAT_ID, Battle, Teams, toID, type PokemonSet } from '../engine/ps';
import { generateDaily, ARCHETYPE_NAMES, type DailyPuzzle } from '../data/daily';
import { BattleRunner } from '../engine/runner';
import { chooseAction, chooseTeamPreview } from '../engine/ai';
import type { ToWorker, FromWorker, MonView, MoveView, PuzzleView, Stats } from '../shared/types';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const dex = Dex.forFormat(FORMAT_ID);
const post = (msg: FromWorker) => ctx.postMessage(msg);

let puzzle: DailyPuzzle | null = null;
let runner: BattleRunner | null = null;
let pendingAI: string | null = null;
let playerOrder: number[] = [];

function computeStats(set: PokemonSet, speciesName: string): Stats {
	const b = new Battle({ formatid: FORMAT_ID as any });
	const s = { ...set, species: speciesName, item: '' };
	b.setPlayer('p1', { name: 'a', team: Teams.pack([s, s, s, s, s, s].map((x, i) => ({ ...x, name: `${x.species}${i}` }))) });
	const p = b.sides[0].pokemon[0];
	return { hp: p.maxhp, atk: p.storedStats.atk, def: p.storedStats.def, spa: p.storedStats.spa, spd: p.storedStats.spd, spe: p.storedStats.spe };
}

function monView(set: PokemonSet): MonView {
	const species = dex.species.get(set.species);
	const item = dex.items.get(set.item);
	const ability = dex.abilities.get(set.ability);
	const moves: MoveView[] = set.moves.map(m => {
		const move = dex.moves.get(m);
		return {
			id: move.id, name: move.name, type: move.type, category: move.category,
			basePower: move.basePower, accuracy: move.accuracy, pp: move.noPPBoosts ? move.pp : Math.floor(move.pp * 8 / 5),
			priority: move.priority, target: move.target,
		};
	});
	const view: MonView = {
		species: species.name, speciesId: species.id, types: species.types,
		item: item.name, itemId: item.id, ability: ability.name, abilityId: ability.id,
		nature: set.nature, gender: set.gender || '',
		sp: set.evs as Stats, stats: computeStats(set, species.name), moves,
	};
	if (item.megaStone) {
		const mega = dex.species.get(Object.values(item.megaStone)[0] as string);
		const megaAbility = dex.abilities.get(mega.abilities[0]);
		view.mega = {
			species: mega.name, speciesId: mega.id, types: mega.types, ability: megaAbility.name, abilityId: megaAbility.id,
			stats: computeStats({ ...set, ability: megaAbility.name }, mega.name),
		};
	}
	return view;
}

function puzzleView(p: DailyPuzzle): PuzzleView {
	return {
		number: p.number, date: p.date, archetype: ARCHETYPE_NAMES[p.archetype],
		opponent: { id: p.opponent.id, name: p.opponent.name, trainer: p.opponent.trainer, quip: p.opponent.quip },
		player: p.playerTeam.map(monView),
		foe: p.opponentTeam.map(monView),
	};
}

function aliveFlags(): boolean[] {
	if (!runner) return [];
	// side.pokemon is reordered by switches; map back to the player's chosen order by original position.
	const side = runner.battle.sides[0];
	return playerOrder.map((teamIndex) => {
		const mon = side.pokemon.find(p => p.set === puzzle!.playerTeam[teamIndex] || p.position === -1 && false) ??
			side.pokemon.find(p => p.name === puzzle!.playerTeam[teamIndex].name);
		return !!mon && !mon.fainted;
	});
}

function sendUpdate() {
	if (!runner) return;
	const lines = runner.readLog('p1');
	const req = runner.needsChoice(0) ? runner.request(0) : null;
	post({
		type: 'update', lines, request: req, battle: runner.serialize(), ended: runner.ended,
		winner: runner.winner || undefined, turn: runner.turn, alive: aliveFlags(),
	});
}

/** Let the AI act on its own (forced switches) and precompute its move for the next turn. */
function advance() {
	if (!runner) return;
	pendingAI = null;
	for (let guard = 0; guard < 10 && !runner.ended; guard++) {
		const aiNeeds = runner.needsChoice(1);
		const playerNeeds = runner.needsChoice(0);
		if (!aiNeeds) break;
		post({ type: 'thinking', thinking: true });
		const choice = chooseAction(runner.serialize(), 1);
		post({ type: 'thinking', thinking: false });
		if (playerNeeds) {
			pendingAI = choice;
			break;
		}
		if (!runner.choose(1, choice)) runner.choose(1, 'default');
	}
}

ctx.onmessage = (e: MessageEvent<ToWorker>) => {
	const msg = e.data;
	try {
		switch (msg.type) {
		case 'init': {
			puzzle = generateDaily(msg.date);
			post({ type: 'puzzle', puzzle: puzzleView(puzzle) });
			break;
		}
		case 'start': {
			if (!puzzle) throw new Error('No puzzle');
			playerOrder = msg.order.slice(0, 4);
			runner = new BattleRunner(
				{ name: 'You', team: puzzle.playerTeam },
				{ name: puzzle.opponent.trainer, team: puzzle.opponentTeam },
			);
			const aiPreview = chooseTeamPreview(runner.battle, 1);
			runner.choose(1, aiPreview);
			const rest = [0, 1, 2, 3, 4, 5].filter(i => !playerOrder.includes(i));
			runner.choose(0, `team ${[...playerOrder, ...rest].map(i => i + 1).join('')}`);
			sendUpdate();
			setTimeout(() => { advance(); if (!runner?.needsChoice(0)) sendUpdate(); }, 0);
			break;
		}
		case 'choose': {
			if (!runner) throw new Error('No battle');
			if (pendingAI === null && runner.needsChoice(1)) advance();
			if (!runner.choose(0, msg.choice)) {
				post({ type: 'error', message: `Invalid choice: ${msg.choice}` });
				sendUpdate();
				break;
			}
			if (pendingAI !== null && runner.needsChoice(1)) {
				if (!runner.choose(1, pendingAI)) runner.choose(1, 'default');
			}
			pendingAI = null;
			// Resolve AI-only forced switches before reporting, so the UI sees a stable state.
			advanceForcedOnly();
			sendUpdate();
			setTimeout(() => { advance(); if (!runner?.needsChoice(0) && !runner?.ended) sendUpdate(); }, 0);
			break;
		}
		case 'resume': {
			puzzle = generateDaily(msg.date);
			post({ type: 'puzzle', puzzle: puzzleView(puzzle) });
			runner = BattleRunner.restore(msg.battle);
			playerOrder = restoreOrder(runner);
			sendUpdate();
			setTimeout(() => { advance(); if (!runner?.needsChoice(0) && !runner?.ended) sendUpdate(); }, 0);
			break;
		}
		}
	} catch (err: any) {
		console.error(err);
		post({ type: 'error', message: err?.message || String(err) });
	}
};

function advanceForcedOnly() {
	if (!runner) return;
	for (let guard = 0; guard < 10 && !runner.ended; guard++) {
		if (!runner.needsChoice(1) || runner.needsChoice(0)) return;
		const req = runner.request(1);
		if (!req?.forceSwitch) return;
		const choice = chooseAction(runner.serialize(), 1);
		if (!runner.choose(1, choice)) runner.choose(1, 'default');
	}
}

/** Recovers the player's chosen order from a restored battle (team preview order is in the input log). */
function restoreOrder(r: BattleRunner): number[] {
	const line = r.battle.inputLog.find(l => l.startsWith('>p1 team '));
	if (!line) return [0, 1, 2, 3];
	return line.slice('>p1 team '.length).split('').slice(0, 4).map(c => Number(c) - 1);
}

export { toID };
