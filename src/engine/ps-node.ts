// Node-only: adds learnsets so the team validator works in scripts.
import { psData } from '../../vendor/ps/sim/registry';
import './ps';
import { Learnsets } from '../../vendor/ps/data/learnsets';
import { Learnsets as ChLearnsets } from '../../vendor/ps/data/mods/champions/learnsets';

psData().base.Learnsets = Learnsets;
psData().mods.champions.Learnsets = ChLearnsets;

export * from './ps';
export { TeamValidator } from '../../vendor/ps/sim/team-validator';
