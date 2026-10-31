/** On-device storage (IndexedDB). Replaces the SQLite server layer of the desktop app. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Backup, Blade, BladeSummary, Setup, Shave, ShaveInput, ShaveView, Verdict } from './types';

interface ShaveLogDB extends DBSchema {
	blades: { key: number; value: Blade; indexes: { name: string } };
	shaves: { key: number; value: Shave; indexes: { blade_id: number; date: string } };
	meta: { key: string; value: Setup };
}

export const DEFAULT_SETUP: Setup = {
	razor: 'Rockwell 6S',
	default_plate: 'R3',
	cream_soap: 'Proraso Green',
	brush: 'Proraso',
	post: 'Nivea After Shave Balm'
};

export const PLATES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

let dbPromise: Promise<IDBPDatabase<ShaveLogDB>> | null = null;

function db() {
	dbPromise ??= openDB<ShaveLogDB>('shave-log', 1, {
		upgrade(d) {
			const blades = d.createObjectStore('blades', { keyPath: 'id', autoIncrement: true });
			blades.createIndex('name', 'name', { unique: true });
			const shaves = d.createObjectStore('shaves', { keyPath: 'id', autoIncrement: true });
			shaves.createIndex('blade_id', 'blade_id');
			shaves.createIndex('date', 'date');
			d.createObjectStore('meta');
		}
	});
	return dbPromise;
}

/** For tests: drop the cached connection. */
export async function _reset() {
	if (dbPromise) (await dbPromise).close();
	dbPromise = null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Overall score: mean of the five "higher is better" scores. */
export function overallScore(s: Pick<Shave, 'smoothness' | 'closeness' | 'efficiency' | 'post_shave_feel' | 'confidence'>) {
	return round1((s.smoothness + s.closeness + s.efficiency + s.post_shave_feel + s.confidence) / 5);
}

/** Whole days between two local ISO date strings. */
export function daysBetween(later: string, earlier: string | null): number {
	if (!earlier) return 0;
	const diff = new Date(later).getTime() - new Date(earlier).getTime();
	return Math.max(0, Math.round(diff / 86_400_000));
}

// --- Setup ---

export async function getSetup(): Promise<Setup> {
	return { ...DEFAULT_SETUP, ...((await (await db()).get('meta', 'setup')) ?? {}) };
}

export async function updateSetup(setup: Setup) {
	await (await db()).put('meta', setup, 'setup');
}

// --- Blades ---

export async function getAllBlades(): Promise<Blade[]> {
	const all = await (await db()).getAll('blades');
	return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOrCreateBlade(name: string): Promise<Blade> {
	const trimmed = name.trim();
	const d = await db();
	const existing = await d.getFromIndex('blades', 'name', trimmed);
	if (existing) return existing;
	const id = await d.add('blades', { name: trimmed, verdict: null } as Blade);
	return { id, name: trimmed, verdict: null };
}

export async function updateBladeVerdict(id: number, verdict: Verdict | null) {
	const d = await db();
	const blade = await d.get('blades', id);
	if (blade) await d.put('blades', { ...blade, verdict });
}

// --- Shaves ---

async function bladeNames(): Promise<Map<number, string>> {
	return new Map((await getAllBlades()).map((b) => [b.id, b.name]));
}

/** All shaves, newest first, with blade names. */
export async function getAllShaves(): Promise<ShaveView[]> {
	const [shaves, names] = await Promise.all([(await db()).getAll('shaves'), bladeNames()]);
	return shaves
		.map((s) => ({ ...s, blade_name: names.get(s.blade_id) ?? '?' }))
		.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getShave(id: number): Promise<ShaveView | undefined> {
	const s = await (await db()).get('shaves', id);
	if (!s) return undefined;
	const blade = await (await db()).get('blades', s.blade_id);
	return { ...s, blade_name: blade?.name ?? '?' };
}

/** Date of the most recent shave strictly before `date` (ignoring `excludeId`). */
export async function getPreviousShaveDate(date: string, excludeId?: number): Promise<string | null> {
	const shaves = await (await db()).getAll('shaves');
	const prior = shaves.filter((s) => s.id !== excludeId && s.date < date).map((s) => s.date).sort();
	return prior.at(-1) ?? null;
}

export async function insertShave(input: ShaveInput): Promise<number> {
	const id = await (await db()).add('shaves', { ...input, shave_number: 0, days_growth: 0 } as Shave);
	await recompute();
	return id;
}

export async function updateShave(id: number, input: ShaveInput) {
	const d = await db();
	const old = await d.get('shaves', id);
	if (!old) throw new Error(`Shave ${id} not found`);
	await d.put('shaves', { ...old, ...input, id });
	await recompute();
}

export async function deleteShave(id: number) {
	await (await db()).delete('shaves', id);
	await recompute();
}

/**
 * Derives shave_number (per blade, by date) and days_growth (since the previous shave)
 * from dates, so backdated, edited or deleted shaves keep everything consistent.
 * The earliest shave keeps its stored days_growth since there's nothing to measure from.
 */
async function recompute() {
	const d = await db();
	const tx = d.transaction('shaves', 'readwrite');
	const all = (await tx.store.getAll()).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
	const counts = new Map<number, number>();
	const writes: Promise<unknown>[] = [];
	all.forEach((s, i) => {
		const shave_number = (counts.get(s.blade_id) ?? 0) + 1;
		counts.set(s.blade_id, shave_number);
		const days_growth = i === 0 ? s.days_growth : daysBetween(s.date, all[i - 1].date);
		if (s.shave_number !== shave_number || s.days_growth !== days_growth) {
			writes.push(tx.store.put({ ...s, shave_number, days_growth }));
		}
	});
	await Promise.all([...writes, tx.done]);
}

// --- Summaries ---

export async function getBladeSummaries(): Promise<BladeSummary[]> {
	const [blades, shaves] = await Promise.all([getAllBlades(), (await db()).getAll('shaves')]);
	return blades.map((b) => {
		const mine = shaves.filter((s) => s.blade_id === b.id);
		const field = (k: keyof Shave) => avg(mine.map((s) => s[k] as number));
		const summary = {
			id: b.id,
			name: b.name,
			verdict: b.verdict,
			total_shaves: mine.length,
			avg_smoothness: field('smoothness'),
			avg_closeness: field('closeness'),
			avg_efficiency: field('efficiency'),
			avg_irritation: field('irritation'),
			avg_post_shave_feel: field('post_shave_feel'),
			avg_confidence: field('confidence'),
			avg_nicks: field('nicks')
		};
		return {
			...summary,
			overall: mine.length
				? overallScore({
						smoothness: summary.avg_smoothness,
						closeness: summary.avg_closeness,
						efficiency: summary.avg_efficiency,
						post_shave_feel: summary.avg_post_shave_feel,
						confidence: summary.avg_confidence
					})
				: 0
		};
	});
}

// --- Backup ---

export async function exportBackup(): Promise<Backup> {
	const d = await db();
	return {
		app: 'shave-log',
		version: 1,
		exported_at: new Date().toISOString(),
		setup: await getSetup(),
		blades: await d.getAll('blades'),
		shaves: await d.getAll('shaves')
	};
}

/** Replaces all data with the backup. Accepts this app's backups and the old desktop SQLite export. */
export async function importBackup(raw: unknown): Promise<{ blades: number; shaves: number }> {
	const b = raw as Backup;
	if (!b || !Array.isArray(b.blades) || !Array.isArray(b.shaves)) {
		throw new Error('Not a Shave Log backup file');
	}
	const setupRaw = Array.isArray(b.setup) ? b.setup[0] : b.setup;
	const setup: Setup = { ...DEFAULT_SETUP };
	for (const k of Object.keys(DEFAULT_SETUP) as (keyof Setup)[]) {
		if (setupRaw && typeof setupRaw[k] === 'string') setup[k] = setupRaw[k];
	}

	const d = await db();
	const tx = d.transaction(['blades', 'shaves', 'meta'], 'readwrite');
	await Promise.all([tx.objectStore('blades').clear(), tx.objectStore('shaves').clear()]);
	for (const bl of b.blades) {
		await tx.objectStore('blades').put({ id: Number(bl.id), name: String(bl.name), verdict: bl.verdict ?? null });
	}
	for (const s of b.shaves) {
		await tx.objectStore('shaves').put({
			id: Number(s.id),
			date: String(s.date).slice(0, 16),
			blade_id: Number(s.blade_id),
			shave_number: Number(s.shave_number),
			plate: s.plate ?? 'R3',
			days_growth: Number(s.days_growth) || 0,
			smoothness: Number(s.smoothness),
			closeness: Number(s.closeness),
			efficiency: Number(s.efficiency),
			passes: s.passes ?? '',
			tugging: s.tugging ?? 'N',
			nicks: Number(s.nicks) || 0,
			irritation: Number(s.irritation) || 0,
			post_shave_feel: Number(s.post_shave_feel),
			confidence: Number(s.confidence),
			notes: s.notes ?? '',
			approx_date: Boolean(s.approx_date)
		});
	}
	await tx.objectStore('meta').put(setup, 'setup');
	await tx.done;
	return { blades: b.blades.length, shaves: b.shaves.length };
}
