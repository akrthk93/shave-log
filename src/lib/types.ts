/** A blade brand/type. */
export interface Blade {
	id: number;
	name: string;
	verdict: Verdict | null;
}

export type Verdict = 'Keep' | 'Retest' | 'Skip';
export type Tugging = 'N' | 'S' | 'Y';

/** A single shave log entry. `date` is a local ISO string without timezone (YYYY-MM-DDTHH:mm). */
export interface Shave {
	id: number;
	date: string;
	blade_id: number;
	shave_number: number;
	plate: string;
	days_growth: number;
	smoothness: number;
	closeness: number;
	efficiency: number;
	passes: string;
	tugging: Tugging;
	nicks: number;
	irritation: number;
	post_shave_feel: number;
	confidence: number;
	notes: string;
}

export type ShaveInput = Omit<Shave, 'id' | 'shave_number' | 'days_growth'>;

/** A shave joined with its blade name, for display. */
export type ShaveView = Shave & { blade_name: string };

/** Fixed shaving setup/gear. */
export interface Setup {
	razor: string;
	default_plate: string;
	cream_soap: string;
	brush: string;
	post: string;
}

/** Aggregated stats for a blade. */
export interface BladeSummary {
	id: number;
	name: string;
	verdict: Verdict | null;
	total_shaves: number;
	avg_smoothness: number;
	avg_closeness: number;
	avg_efficiency: number;
	avg_irritation: number;
	avg_post_shave_feel: number;
	avg_confidence: number;
	avg_nicks: number;
	overall: number;
}

/** Backup file shape. Matches the SQLite export of the old desktop app. */
export interface Backup {
	app?: 'shave-log';
	version?: number;
	exported_at?: string;
	setup: Setup[] | Setup;
	blades: Blade[];
	shaves: Shave[];
}
