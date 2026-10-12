import '../src/engine/ps-node';
import { generateDaily, dateForPuzzleNumber } from '../src/data/daily';
import { BattleRunner } from '../src/engine/runner';
import { BattleTextParser } from '../src/engine/text-parser';
const d = generateDaily(dateForPuzzleNumber(2));
const r = new BattleRunner({ name: 'You', team: d.playerTeam }, { name: 'Chef Paprika', team: d.opponentTeam });
r.choose(0, 'team 1234'); r.choose(1, 'team 1234');
r.choose(0, 'move 1 1, move 1 2'); r.choose(1, 'move 1 1, move 2 2');
const parser = new BattleTextParser('p1'); parser.p1 = 'You'; parser.p2 = 'Chef Paprika';
for (const line of r.readLog('p1')) {
	const { args, kwArgs } = BattleTextParser.parseBattleLine(line);
	const t = parser.parseArgs(args, kwArgs);
	if (t) process.stdout.write(t);
}
