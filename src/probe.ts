import { Battle, FORMAT_ID } from './engine/ps';
const b = new Battle({ formatid: FORMAT_ID as any });
document.getElementById('o')!.textContent = b.format.name;
