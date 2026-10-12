// Fast, deterministic matchup estimate between two teams of six, used by the daily
// generator to avoid lopsided puzzles. Positive = team A is favoured.
import { Battle, Teams, FORMAT_ID, Dex, type PokemonSet } from './ps';
import { Analyzer } from './ai';

const dex = Dex.forFormat(FORMAT_ID);

/** Replace Mega Stone holders with their Mega forme so stats and Abilities are realistic. */
function asBattleForms(team: PokemonSet[]): PokemonSet[] {
	return team.map(set => {
		const stone = dex.items.get(set.item);
		if (!stone.megaStone) return set;
		const mega = Object.values(stone.megaStone)[0] as string;
		const species = dex.species.get(mega);
		return { ...set, species: species.name, ability: species.abilities[0] };
	});
}

export function matchupMatrix(a: PokemonSet[], b: PokemonSet[]): number[][] {
	// Fixed seed: the daily generator must give every player the same result.
	const battle = new Battle({ formatid: FORMAT_ID as any, seed: 'sodium,00000000000000000000000000000001' as any });
	battle.setPlayer('p1', { name: 'A', team: Teams.pack(asBattleForms(a)) });
	battle.setPlayer('p2', { name: 'B', team: Teams.pack(asBattleForms(b)) });
	const an = new Analyzer(battle);
	const [sa, sb] = battle.sides;
	return sa.pokemon.map(x => sb.pokemon.map(y => {
		const off = Math.min(1.2, an.bestDamage(x, y));
		const def = Math.min(1.2, an.bestDamage(y, x));
		const faster = x.getStat('spe', false, true) >= y.getStat('spe', false, true);
		return off * (faster ? 1.15 : 0.9) - def * (faster ? 0.85 : 1.1);
	}));
}

/** Value of the best four a side can bring against the other's six. */
function bestFour(m: number[][]): number {
	const n = m.length;
	let best = -Infinity;
	for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
		let v = 0;
		for (let j = 0; j < m[0].length; j++) {
			const vals = [m[a][j], m[b][j], m[c][j], m[d][j]].sort((x, y) => y - x);
			v += vals[0] * 0.6 + vals[1] * 0.4;
		}
		best = Math.max(best, v);
	}
	return best;
}

export function matchupScore(a: PokemonSet[], b: PokemonSet[]): number {
	const m = matchupMatrix(a, b);
	const t = m[0].map((_, j) => m.map(row => -row[j]));
	return bestFour(m) - bestFour(t);
}
