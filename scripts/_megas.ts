import { Dex, FORMAT_ID } from '../src/engine/ps-node';
const dex = Dex.forFormat(FORMAT_ID);
for (const s of dex.species.all()) {
  if (!s.isMega || s.isNonstandard) continue;
  const bs = s.baseStats;
  console.log(`${s.name} [${s.types.join('/')}] ${Object.values(s.abilities).join('|')} ${bs.hp}/${bs.atk}/${bs.def}/${bs.spa}/${bs.spd}/${bs.spe}`);
}
for (const a of ['auraguard','sharpness','piercingdrill','dragonize','megasol','spicyspray']) { const ab = dex.abilities.get(a); console.log(ab.name, ab.exists, ab.shortDesc || ab.desc); }
