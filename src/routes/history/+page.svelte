<!-- Full shave history with blade filter. Tap a shave to edit it. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ShaveCard from '$lib/components/ShaveCard.svelte';
	import { getAllBlades, getAllShaves } from '$lib/db';
	import type { Blade, ShaveView } from '$lib/types';

	let shaves = $state<ShaveView[] | null>(null);
	let blades = $state<Blade[]>([]);
	let filter = $state(0);

	onMount(async () => {
		[shaves, blades] = await Promise.all([getAllShaves(), getAllBlades()]);
	});

	const filtered = $derived(shaves?.filter((s) => filter === 0 || s.blade_id === filter) ?? []);
</script>

<PageHeader title="History" />

{#if shaves !== null}
	<select bind:value={filter} class="field mb-4">
		<option value={0}>All blades ({shaves.length})</option>
		{#each blades as b}
			<option value={b.id}>{b.name} ({shaves.filter((s) => s.blade_id === b.id).length})</option>
		{/each}
	</select>

	{#if filtered.length === 0}
		<p class="text-stone-500">No shaves found.</p>
	{:else}
		<div class="space-y-2.5">
			{#each filtered as shave (shave.id)}
				<ShaveCard {shave} />
			{/each}
		</div>
	{/if}
{/if}
