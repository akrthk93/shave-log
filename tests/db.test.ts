import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import * as db from '../src/lib/db';

const base = {
	plate: 'R3', smoothness: 4, closeness: 4, efficiency: 4, passes: '1 WTG + 1 XTG', tugging: 'N' as const,
	nicks: 0, irritation: 1, post_shave_feel: 4, confidence: 4, notes: ''
};

beforeEach(async () => {
	await db._reset();
	indexedDB.deleteDatabase('shave-log');
});

describe('shaves', () => {
	it('numbers shaves per blade and computes days of growth', async () => {
		const a = await db.getOrCreateBlade('Astra SP');
		const b = await db.getOrCreateBlade('Feather');
		await db.insertShave({ ...base, date: '2026-01-01T10:00', blade_id: a.id });
		await db.insertShave({ ...base, date: '2026-01-04T10:00', blade_id: a.id });
		const id = await db.insertShave({ ...base, date: '2026-01-10T09:00', blade_id: b.id });
		const s = await db.getShave(id);
		expect(s?.shave_number).toBe(1);
		expect(s?.days_growth).toBe(6);
		expect((await db.getAllShaves()).map((x) => x.shave_number)).toEqual([1, 2, 1]);
	});

	it('reuses blades by name and renumbers on blade change when editing', async () => {
		const a = await db.getOrCreateBlade('Astra SP');
		expect((await db.getOrCreateBlade(' Astra SP ')).id).toBe(a.id);
		const b = await db.getOrCreateBlade('Feather');
		await db.insertShave({ ...base, date: '2026-01-01T10:00', blade_id: b.id });
		const id = await db.insertShave({ ...base, date: '2026-01-03T10:00', blade_id: a.id });
		await db.updateShave(id, { ...base, date: '2026-01-03T10:00', blade_id: b.id, notes: 'moved' });
		const s = await db.getShave(id);
		expect(s).toMatchObject({ blade_name: 'Feather', shave_number: 2, notes: 'moved', days_growth: 2 });
	});

	it('re-counts numbers and growth when a forgotten shave is backdated, edited or deleted', async () => {
		const a = await db.getOrCreateBlade('Silver Blue');
		const first = await db.insertShave({ ...base, date: '2026-08-10T18:00', blade_id: a.id });
		const latest = await db.insertShave({ ...base, date: '2026-10-31T10:00', blade_id: a.id });
		const forgotten = await db.insertShave({ ...base, date: '2026-09-20T12:00', approx_date: true, blade_id: a.id });
		const get = async (id: number) => (await db.getShave(id))!;
		expect(await get(forgotten)).toMatchObject({ shave_number: 2, days_growth: 41, approx_date: true });
		expect(await get(latest)).toMatchObject({ shave_number: 3, days_growth: 41 });
		expect((await get(first)).shave_number).toBe(1);

		await db.updateShave(forgotten, { ...base, date: '2026-10-01T12:00', blade_id: a.id });
		expect((await get(latest)).days_growth).toBe(30);

		await db.deleteShave(forgotten);
		expect(await get(latest)).toMatchObject({ shave_number: 2, days_growth: 82 });
	});

	it('summarises blades', async () => {
		const a = await db.getOrCreateBlade('Astra SP');
		await db.insertShave({ ...base, date: '2026-01-01T10:00', blade_id: a.id, smoothness: 3 });
		await db.insertShave({ ...base, date: '2026-01-02T10:00', blade_id: a.id, smoothness: 4 });
		const [s] = await db.getBladeSummaries();
		expect(s).toMatchObject({ total_shaves: 2, avg_smoothness: 3.5, overall: 3.9 });
	});
});

describe('backup', () => {
	it('imports the old desktop SQLite export and round-trips', async () => {
		const desktop = {
			setup: [{ id: 1, razor: 'Rockwell 6S', default_plate: 'R4', cream_soap: 'Proraso Green', brush: 'Proraso', post: 'Nivea' }],
			blades: [{ id: 1, name: 'Astra SP', verdict: null }, { id: 17, name: 'Gillette Platinum', verdict: 'Keep' }],
			shaves: [
				{ id: 1, date: '2025-12-19T12:00:00', blade_id: 1, shave_number: 1, ...base, days_growth: 4 },
				{ id: 17, date: '2026-05-03T17:00', blade_id: 17, shave_number: 1, ...base, days_growth: 14 }
			]
		};
		expect(await db.importBackup(desktop)).toEqual({ blades: 2, shaves: 2 });
		expect((await db.getSetup()).default_plate).toBe('R4');
		const all = await db.getAllShaves();
		expect(all[0]).toMatchObject({ id: 17, blade_name: 'Gillette Platinum', date: '2026-05-03T17:00' });
		expect(all[1].date).toBe('2025-12-19T12:00');

		// New entries keep counting after imported ids
		const id = await db.insertShave({ ...base, date: '2026-06-01T10:00', blade_id: 17 });
		expect(id).toBeGreaterThan(17);
		expect((await db.getShave(id))?.shave_number).toBe(2);

		const backup = await db.exportBackup();
		await db.importBackup(JSON.parse(JSON.stringify(backup)));
		expect((await db.getAllShaves()).length).toBe(3);
	});

	it('rejects junk', async () => {
		await expect(db.importBackup({ foo: 1 })).rejects.toThrow('Not a Shave Log backup');
	});
});
