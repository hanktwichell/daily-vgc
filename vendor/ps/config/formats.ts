// Champions formats copied from Pokémon Showdown's config/formats.ts (MIT)
export const Formats: import('../sim/dex-formats').FormatList = [
	{
		name: "[Gen 9 Champions] VGC 2026 Reg M-C",
		mod: 'champions',
		gameType: 'doubles',
		bestOfDefault: true,
		ruleset: ['Flat Rules', 'VGC Timer', 'Open Team Sheets'],
	},
	{
		name: "[Gen 9 Champions] Doubles Custom Game",
		mod: 'champions',
		gameType: 'doubles',
		searchShow: false,
		debug: true,
		battle: { trunc: Math.trunc },
		ruleset: ['Team Preview', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 50'],
	},
];
