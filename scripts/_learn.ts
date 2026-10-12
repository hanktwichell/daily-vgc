import { TeamValidator, Dex, FORMAT_ID } from '../src/engine/ps-node';
const v = TeamValidator.get(FORMAT_ID); const dex = Dex.forFormat(FORMAT_ID);
const [sp, ...cands] = process.argv.slice(2).join(' ').split(',').map(s => s.trim());
const species = dex.species.get(sp);
const ok = cands.length ? cands.filter(m => !v.checkCanLearn(dex.moves.get(m), species)) :
  dex.moves.all().filter(m => !m.isNonstandard && !v.checkCanLearn(m, species)).map(m => m.name);
console.log(sp, '=>', ok.join(', '));
