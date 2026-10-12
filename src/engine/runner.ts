// Thin wrapper around a Showdown Battle used by both the web worker and Node scripts.
import { Battle, State, Teams, FORMAT_ID, type PokemonSet } from './ps';

export interface PlayerInfo { name: string; team: PokemonSet[] }

export class BattleRunner {
	battle: Battle;
	private logPos = 0;

	constructor(p1: PlayerInfo, p2: PlayerInfo, battle?: Battle) {
		if (battle) {
			this.battle = battle;
			this.logPos = battle.log.length;
			return;
		}
		this.battle = new Battle({ formatid: FORMAT_ID as any });
		this.battle.setPlayer('p1', { name: p1.name, team: Teams.pack(p1.team) });
		this.battle.setPlayer('p2', { name: p2.name, team: Teams.pack(p2.team) });
	}

	static restore(json: string) {
		const battle = State.deserializeBattle(json);
		return new BattleRunner(null as any, null as any, battle);
	}

	serialize(): string {
		return JSON.stringify(State.serializeBattle(this.battle));
	}

	request(side: 0 | 1): any {
		return this.battle.sides[side].activeRequest;
	}

	needsChoice(side: 0 | 1): boolean {
		const req = this.request(side);
		return !!req && !req.wait && !this.battle.sides[side].isChoiceDone();
	}

	choose(side: 0 | 1, choice: string): boolean {
		try {
			return this.battle.choose(side === 0 ? 'p1' : 'p2', choice);
		} catch (e) {
			console.error('choice failed', choice, e);
			return false;
		}
	}

	/** New protocol lines since the last call, resolved for the given perspective. */
	readLog(perspective: 'p1' | 'p2' | 'omniscient' = 'p1'): string[] {
		const lines = this.battle.log.slice(this.logPos);
		this.logPos = this.battle.log.length;
		const out: string[] = [];
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.startsWith('|split|')) {
				const owner = line.slice(7);
				const secret = lines[i + 1], pub = lines[i + 2];
				out.push(perspective === 'omniscient' || owner === perspective ? secret : pub);
				i += 2;
				continue;
			}
			out.push(line);
		}
		return out;
	}

	get ended() { return this.battle.ended; }
	get winner() { return this.battle.winner; }
	get turn() { return this.battle.turn; }
}
