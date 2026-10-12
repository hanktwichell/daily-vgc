import { Battle, Teams, FORMAT_ID, Dex, State } from '../src/engine/ps-node';
const team = (names: string[]) => names.map(n => ({ species: n, ability: Dex.forFormat(FORMAT_ID).species.get(n).abilities[0], moves: ['Protect', 'Tackle'], item: '', evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }, nature: 'Adamant', level: 50, name: n, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, gender: '' }));
const b = new Battle({ formatid: FORMAT_ID as any });
b.setPlayer('p1', { name: 'You', team: Teams.pack(team(['Incineroar', 'Garchomp', 'Sylveon', 'Kingambit', 'Rillaboom', 'Pelipper']) as any) });
b.setPlayer('p2', { name: 'CPU', team: Teams.pack(team(['Dragonite', 'Tyranitar', 'Whimsicott', 'Gholdengo', 'Basculegion', 'Talonflame']) as any) });
b.choose('p1', 'team 1234'); b.choose('p2', 'team 1234');
console.log('log', b.log.length, (b as any).sentLogPos);
const j = State.serializeBattle(b);
const c = State.deserializeBattle(j);
console.log('clone log', c.log.length, (c as any).sentLogPos, c.turn, c.requestState);
try { c.choose('p1', 'move 2 1, move 2 2'); c.choose('p2', 'move 2 1, move 2 2'); } catch (e) { console.log(c.log.slice(-15).join('\n')); console.log(e.message); }
console.log(c.log.slice(-5).join('\n'))
let t = Date.now();
const js = JSON.stringify(State.serializeBattle(c));
for (let i = 0; i < 100; i++) { const d = State.deserializeBattle(js); d.choose('p1', 'move 2 1, move 2 2'); d.choose('p2', 'move 2 1, move 2 2'); }
console.log('100 clone+turn', Date.now() - t, 'ms', 'size', js.length);
