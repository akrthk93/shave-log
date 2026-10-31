<!-- Setup gear, backup/restore, about. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { DEFAULT_SETUP, PLATES, exportBackup, getSetup, importBackup, updateSetup } from '$lib/db';
	import type { Setup } from '$lib/types';

	let setup = $state<Setup>({ ...DEFAULT_SETUP });
	let saved = $state(false);
	let backupMsg = $state('');
	let fileInput: HTMLInputElement;

	onMount(async () => (setup = await getSetup()));

	async function save(e: SubmitEvent) {
		e.preventDefault();
		await updateSetup($state.snapshot(setup));
		saved = true;
		setTimeout(() => (saved = false), 1500);
	}

	async function doExport() {
		const data = await exportBackup();
		const name = `shave-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
		const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' });
		// iOS: share sheet lets you save to Files / iCloud Drive / AirDrop to the Mac.
		if (navigator.canShare?.({ files: [file] })) {
			try {
				await navigator.share({ files: [file], title: name });
				backupMsg = `Exported ${data.shaves.length} shaves`;
			} catch (err) {
				if ((err as Error).name !== 'AbortError') backupMsg = `Export failed: ${(err as Error).message}`;
			}
			return;
		}
		const a = document.createElement('a');
		a.href = URL.createObjectURL(file);
		a.download = name;
		a.click();
		URL.revokeObjectURL(a.href);
		backupMsg = `Exported ${data.shaves.length} shaves`;
	}

	async function doImport(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			const parsed = JSON.parse(await file.text());
			if (!confirm(`Replace everything on this phone with the ${parsed.shaves?.length ?? '?'} shaves in this file?`)) return;
			const r = await importBackup(parsed);
			setup = await getSetup();
			backupMsg = `Imported ${r.shaves} shaves and ${r.blades} blades`;
		} catch (err) {
			backupMsg = `Import failed: ${(err as Error).message}`;
		} finally {
			fileInput.value = '';
		}
	}
</script>

<PageHeader title="Settings" settings={false} />

<form onsubmit={save} class="space-y-5">
	<section>
		<h2 class="section-title">Setup</h2>
		<div class="card space-y-4 p-4">
			<div><label for="razor" class="label">Razor</label><input id="razor" bind:value={setup.razor} class="field" /></div>
			<div>
				<label for="plate" class="label">Default plate</label>
				<select id="plate" bind:value={setup.default_plate} class="field">
					{#each PLATES as p}<option value={p}>{p}</option>{/each}
				</select>
			</div>
			<div><label for="soap" class="label">Cream / soap</label><input id="soap" bind:value={setup.cream_soap} class="field" /></div>
			<div><label for="brush" class="label">Brush</label><input id="brush" bind:value={setup.brush} class="field" /></div>
			<div><label for="post" class="label">Post-shave</label><input id="post" bind:value={setup.post} class="field" /></div>
			<button type="submit" class="btn-primary">{saved ? 'Saved ✓' : 'Save setup'}</button>
		</div>
	</section>
</form>

<section class="mt-6">
	<h2 class="section-title">Backup</h2>
	<div class="card space-y-3 p-4">
		<p class="text-sm text-stone-500">Your log lives only on this phone. Export a backup now and then — save it to iCloud Drive.</p>
		<div class="flex gap-2">
			<button type="button" onclick={doExport} class="btn-secondary flex-1">Export backup</button>
			<button type="button" onclick={() => fileInput.click()} class="btn-secondary flex-1">Import backup</button>
		</div>
		<input bind:this={fileInput} type="file" accept="application/json,.json" class="hidden" onchange={doImport} />
		{#if backupMsg}<p class="text-sm font-medium">{backupMsg}</p>{/if}
	</div>
</section>

<p class="mt-8 text-center text-xs text-stone-400">Shave Log v{__APP_VERSION__}</p>
