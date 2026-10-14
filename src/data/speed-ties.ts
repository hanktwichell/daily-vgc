// Same-species mirrors (a Hard Mode themed team against a meta team, or a practice battle)
// share a library set, so without help they always speed-tie and turn order is a coin flip.
// The player's copy is changed until none of its formes ties with a same-species opponent:
// a Speed-boosting nature becomes the matching attacking nature (Jolly -> Adamant,
// Timid -> Modest); otherwise one Stat Point moves into (or, at the cap, out of) Speed.
// Only the player's team changes.
import { Dex, FORMAT_ID, type PokemonSet } from '../engine/ps';

const dex = Dex.forFormat(FORMAT_ID);
const MAX_PER_STAT = 32;
const OTHER_STATS = ['hp', 'atk', 'def', 'spa', 'spd'] as const;

/** Speed at level 50 under Champions rules: base + Stat Points + 20, then nature. */
export function speedStat(species: string, set: PokemonSet): number {
	let stat = dex.species.get(species).baseStats.spe + (set.evs?.spe ?? 0) + 20;
	const nature = dex.natures.get(set.nature);
	if (nature.plus === 'spe') stat = Math.trunc(stat * 110 / 100);
	else if (nature.minus === 'spe') stat = Math.trunc(stat * 90 / 100);
	return stat;
}

/** Speeds of a set in every forme it can battle in (base, and Mega if it holds its stone). */
function speeds(set: PokemonSet): number[] {
	const out = [speedStat(set.species, set)];
	const stone = dex.items.get(set.item).megaStone;
	if (stone) for (const mega of Object.values(stone)) if (mega) out.push(speedStat(mega as string, set));
	return out;
}

const baseSpecies = (set: PokemonSet) => dex.species.get(set.species).baseSpecies;

function tiesWith(set: PokemonSet, mirrors: PokemonSet[]) {
	const mine = speeds(set);
	return mirrors.some(o => speeds(o).some(s => mine.includes(s)));
}

/** Moves one Stat Point into Speed from the most-invested other stat, or out of Speed if it's maxed. */
function nudgeSpeed(set: PokemonSet): PokemonSet {
	const evs = { ...set.evs };
	if (evs.spe < MAX_PER_STAT) {
		const donor = [...OTHER_STATS].sort((a, b) => evs[b] - evs[a])[0];
		if (evs[donor] > 0) evs[donor]--;
		evs.spe++;
	} else {
		const recipient = [...OTHER_STATS].sort((a, b) => evs[a] - evs[b])[0];
		evs[recipient]++;
		evs.spe--;
	}
	return { ...set, evs };
}

/** Jolly -> Adamant, Timid -> Modest, Hasty -> Lonely/Mild, Naive -> Naughty/Rash. */
function withoutSpeedNature(set: PokemonSet): PokemonSet {
	const nature = dex.natures.get(set.nature);
	const physical = set.moves.filter(m => dex.moves.get(m).category === 'Physical').length;
	const special = set.moves.filter(m => dex.moves.get(m).category === 'Special').length;
	let plus = physical >= special ? 'atk' : 'spa';
	if (plus === nature.minus) plus = plus === 'atk' ? 'spa' : 'atk';
	const swap = dex.natures.all().find(n => n.plus === plus && n.minus === nature.minus);
	return swap ? { ...set, nature: swap.name } : set;
}

/** The player's team with every same-species speed tie against the opponent broken. */
export function breakSpeedTies(player: PokemonSet[], opponent: PokemonSet[]): PokemonSet[] {
	return player.map(set => {
		const mirrors = opponent.filter(o => baseSpecies(o) === baseSpecies(set));
		let out = set;
		if (!mirrors.length || !tiesWith(out, mirrors)) return out;
		if (dex.natures.get(out.nature).plus === 'spe') out = withoutSpeedNature(out);
		// One point nearly always does it; a nature's rounding can occasionally swallow a point.
		for (let i = 0; i < 4 && tiesWith(out, mirrors); i++) out = nudgeSpeed(out);
		return out;
	});
}
