// Added by Daily VGC: static data registry replacing Showdown's runtime require() calls.
export interface PSDataTable { [dataType: string]: any }
export interface PSData {
	base: PSDataTable;
	mods: { [mod: string]: PSDataTable };
	aliases: { Aliases: { [k: string]: string }, CompoundWordNames: string[] };
	formats: any[];
}
export function psData(): PSData {
	const data = (globalThis as any).__PS_DATA__;
	if (!data) throw new Error('Showdown data not registered');
	return data;
}
export function registerPSData(data: PSData) {
	(globalThis as any).__PS_DATA__ = data;
}
