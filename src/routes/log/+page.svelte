<!-- Log a new shave, or edit one via ?id=. -->
<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ScoreInput from '$lib/components/ScoreInput.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import {
		PLATES, daysBetween, deleteShave, getAllBlades, getAllShaves, getOrCreateBlade,
		getPreviousShaveDate, getSetup, getShave, insertShave, updateShave
	} from '$lib/db';
	import { nowLocalISO } from '$lib/format';
	import type { Blade, Tugging } from '$lib/types';

	const NEW = -1;

	let ready = $state(false);
	let editId = $state<number | null>(null);
	let shaveNumber = $state<number | null>(null);
	let blades = $state<Blade[]>([]);
	let bladeId = $state(NEW);
	let newBladeName = $state('');
	let plate = $state('R3');
	let date = $state(nowLocalISO());
	let prevDate = $state<string | null>(null);
	let smoothness = $state(3);
	let closeness = $state(3);
	let efficiency = $state(3);
	let passes = $state('1 WTG + 1 XTG');
	let tugging = $state<Tugging>('N');
	let nicks = $state(0);
	let irritation = $state(0);
	let postShaveFeel = $state(3);
	let confidence = $state(3);
	let notes = $state('');
	let saving = $state(false);
	let error = $state('');

	const daysGrowth = $derived(daysBetween(date, prevDate));

	onMount(async () => {
		blades = await getAllBlades();
		const id = Number(page.url.searchParams.get('id'));
		const existing = id ? await getShave(id) : undefined;
		if (existing) {
			editId = existing.id;
			shaveNumber = existing.shave_number;
			bladeId = existing.blade_id;
			({ plate, date, smoothness, closeness, efficiency, passes, tugging, nicks, irritation, notes, confidence } = existing);
			postShaveFeel = existing.post_shave_feel;
		} else {
			// Default to the blade and passes from the latest shave.
			const [setup, recent] = await Promise.all([getSetup(), getAllShaves()]);
			plate = setup.default_plate;
			const last = recent[0];
			bladeId = last?.blade_id ?? blades[0]?.id ?? NEW;
			if (last?.passes) passes = last.passes;
		}
		ready = true;
	});

	// Recompute days of growth whenever the date changes.
	$effect(() => {
		const d = date;
		if (ready) getPreviousShaveDate(d, editId ?? undefined).then((p) => (prevDate = p));
	});

	async function save(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (bladeId === NEW && !newBladeName.trim()) {
			error = 'Enter a blade name';
			return;
		}
		saving = true;
		try {
			const blade_id = bladeId === NEW ? (await getOrCreateBlade(newBladeName)).id : bladeId;
			const input = {
				date, blade_id, plate, smoothness, closeness, efficiency, passes: passes.trim(), tugging,
				nicks, irritation, post_shave_feel: postShaveFeel, confidence, notes: notes.trim()
			};
			if (editId) await updateShave(editId, input);
			else await insertShave(input);
			await goto(editId ? `${base}/history` : `${base}/`);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			saving = false;
		}
	}

	async function remove() {
		if (!editId || !confirm('Delete this shave? This cannot be undone.')) return;
		await deleteShave(editId);
		await goto(`${base}/history`);
	}
</script>

<PageHeader title={editId ? `Edit shave${shaveNumber ? ` #${shaveNumber}` : ''}` : 'Log a shave'} settings={false} />

{#if ready}
	<form onsubmit={save} class="space-y-5">
		<section class="card space-y-4 p-4">
			<div>
				<label for="date" class="label">Date & time</label>
				<input type="datetime-local" id="date" bind:value={date} required class="field" />
				<p class="mt-1 text-xs text-stone-500">{daysGrowth} day{daysGrowth === 1 ? '' : 's'} of growth since the previous shave</p>
			</div>

			<div>
				<label for="blade" class="label">Blade</label>
				<select id="blade" bind:value={bladeId} class="field">
					{#each blades as b}
						<option value={b.id}>{b.name}</option>
					{/each}
					<option value={NEW}>+ New blade…</option>
				</select>
				{#if bladeId === NEW}
					<!-- svelte-ignore a11y_autofocus -->
					<input type="text" bind:value={newBladeName} placeholder="e.g. Derby Extra" autofocus class="field mt-2" autocapitalize="words" />
				{/if}
			</div>

			<div>
				<span class="label">Plate</span>
				<Segmented bind:value={plate} options={PLATES.map((p) => ({ val: p, label: p }))} />
			</div>
		</section>

		<section>
			<h2 class="section-title">Scores</h2>
			<div class="card divide-y divide-stone-200 px-4 dark:divide-stone-800">
				<ScoreInput label="Smoothness" bind:value={smoothness} hint="How the blade feels during passes" />
				<ScoreInput label="Closeness" bind:value={closeness} />
				<ScoreInput label="Efficiency" bind:value={efficiency} hint="Hair removed per pass" />
				<ScoreInput label="Post-shave feel" bind:value={postShaveFeel} />
				<ScoreInput label="Confidence" bind:value={confidence} hint="How relaxed you felt shaving" />
				<ScoreInput label="Irritation" bind:value={irritation} min={0} lowerIsBetter hint="Check again 30–60 min later" />
				<ScoreInput label="Nicks" bind:value={nicks} min={0} max={10} lowerIsBetter />
			</div>
		</section>

		<section class="card space-y-4 p-4">
			<div>
				<span class="label">Tugging</span>
				<Segmented
					bind:value={tugging}
					options={[
						{ val: 'N', label: 'None', activeClass: 'bg-green-600 text-white shadow-sm' },
						{ val: 'S', label: 'Slight', activeClass: 'bg-amber-500 text-white shadow-sm' },
						{ val: 'Y', label: 'Yes', activeClass: 'bg-red-600 text-white shadow-sm' }
					]}
				/>
			</div>
			<div>
				<label for="passes" class="label">Passes</label>
				<input type="text" id="passes" bind:value={passes} placeholder="e.g. 1 WTG + 1 XTG" class="field" />
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each ['1 WTG + 1 XTG', '2 WTG + 1 XTG', '+ ATG (neck)', '+ touchups'] as chip}
						<button type="button" class="rounded-full bg-stone-200 px-3 py-1 text-xs font-medium dark:bg-stone-800"
							onclick={() => (passes = chip.startsWith('+') ? `${passes} ${chip}` : chip)}>{chip}</button>
					{/each}
				</div>
			</div>
			<div>
				<label for="notes" class="label">Notes</label>
				<textarea id="notes" bind:value={notes} rows={4} placeholder="Lather, technique, how it went…" class="field"></textarea>
			</div>
		</section>

		{#if error}<p class="text-sm font-medium text-red-600">{error}</p>{/if}

		<button type="submit" disabled={saving} class="btn-primary">{saving ? 'Saving…' : editId ? 'Save changes' : 'Save shave'}</button>
		{#if editId}
			<button type="button" onclick={remove} class="w-full py-3 font-medium text-red-600">Delete shave</button>
		{/if}
	</form>
{/if}
