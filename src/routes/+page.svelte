<!-- Home: quick stats and recent shaves. -->
<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ShaveCard from '$lib/components/ShaveCard.svelte';
	import { daysBetween, getAllBlades, getAllShaves } from '$lib/db';
	import { nowLocalISO } from '$lib/format';
	import type { ShaveView } from '$lib/types';

	let shaves = $state<ShaveView[] | null>(null);
	let bladeCount = $state(0);

	onMount(async () => {
		[shaves, bladeCount] = await Promise.all([getAllShaves(), getAllBlades().then((b) => b.length)]);
	});

	const latest = $derived(shaves?.[0]);
	const daysSince = $derived(latest ? daysBetween(nowLocalISO(), latest.date) : null);
</script>

<PageHeader title="Shave Log" />

{#if shaves === null}
	<p class="text-stone-500">Loading…</p>
{:else if shaves.length === 0}
	<div class="card space-y-3 p-6 text-center">
		<p class="text-lg font-semibold">No shaves yet</p>
		<p class="text-sm text-stone-500">Log your first shave, or restore a backup from your Mac in Settings.</p>
		<a href="{base}/log" class="btn-primary block">Log a shave</a>
		<a href="{base}/settings" class="block text-sm font-medium text-accent">Import backup</a>
	</div>
{:else}
	<div class="card mb-2.5 flex items-center justify-between p-4">
		<div class="min-w-0">
			<div class="text-xs text-stone-500">Current blade</div>
			<div class="truncate text-lg font-semibold">{latest?.blade_name}</div>
		</div>
		<div class="shrink-0 text-right">
			<div class="text-xs text-stone-500">Next shave</div>
			<div class="text-lg font-semibold tabular-nums">#{(latest?.shave_number ?? 0) + 1}</div>
		</div>
	</div>
	<div class="grid grid-cols-2 gap-2.5">
		<div class="card p-4">
			<div class="text-xs text-stone-500">Last shave</div>
			<div class="text-2xl font-bold tabular-nums">{daysSince} <span class="text-sm font-normal text-stone-500">day{daysSince === 1 ? '' : 's'} ago</span></div>
		</div>
		<div class="card p-4">
			<div class="text-xs text-stone-500">Logged</div>
			<div class="text-2xl font-bold tabular-nums">{shaves.length} <span class="text-sm font-normal text-stone-500">shaves</span></div>
			<div class="text-xs text-stone-500">across {bladeCount} blades</div>
		</div>
	</div>

	<h2 class="section-title mt-6">Recent</h2>
	<div class="space-y-2.5">
		{#each shaves.slice(0, 5) as shave (shave.id)}
			<ShaveCard {shave} />
		{/each}
	</div>
	{#if shaves.length > 5}
		<a href="{base}/history" class="mt-3 block text-center text-sm font-medium text-accent">See all {shaves.length}</a>
	{/if}
{/if}
