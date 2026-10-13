-- Daily VGC recorder schema. Safe to run repeatedly.
CREATE TABLE IF NOT EXISTS results (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	puzzle INTEGER NOT NULL,
	mode TEXT NOT NULL CHECK (mode IN ('normal', 'hard')),
	-- Anonymous per-browser id: one result per browser per puzzle and mode.
	cid TEXT NOT NULL,
	-- Salted hash of the IP and puzzle, only used to cap submissions from one address.
	iphash TEXT NOT NULL,
	won INTEGER NOT NULL,
	alive INTEGER NOT NULL,
	turns INTEGER NOT NULL,
	-- Team indices brought, in pick order, e.g. "2,0,4,5".
	picks TEXT NOT NULL,
	-- The player's six as a JSON array of species names.
	team TEXT NOT NULL,
	version TEXT,
	created_at INTEGER NOT NULL,
	UNIQUE (puzzle, mode, cid)
);
CREATE INDEX IF NOT EXISTS results_by_puzzle ON results (puzzle, mode);
CREATE INDEX IF NOT EXISTS results_by_ip ON results (puzzle, mode, iphash);

-- Replays of a day's battles, after a browser's first try: any number per browser, kept apart
-- so `results` stays one row per browser (which is what the player count counts). Same columns.
CREATE TABLE IF NOT EXISTS replays (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	puzzle INTEGER NOT NULL,
	mode TEXT NOT NULL CHECK (mode IN ('normal', 'hard')),
	cid TEXT NOT NULL,
	iphash TEXT NOT NULL,
	won INTEGER NOT NULL,
	alive INTEGER NOT NULL,
	turns INTEGER NOT NULL,
	picks TEXT NOT NULL,
	team TEXT NOT NULL,
	version TEXT,
	created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS replays_by_puzzle ON replays (puzzle, mode);
CREATE INDEX IF NOT EXISTS replays_by_ip ON replays (puzzle, mode, iphash);

-- Computed summaries for finished puzzles.
CREATE TABLE IF NOT EXISTS stats_cache (
	puzzle INTEGER PRIMARY KEY,
	body TEXT NOT NULL,
	final INTEGER NOT NULL,
	computed_at INTEGER NOT NULL
);
