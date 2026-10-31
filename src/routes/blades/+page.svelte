<!-- Per-blade averages and verdicts, best overall first. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import { getBladeSummaries, updateBladeVerdict } from '$lib/db';
	import { scoreClass, verdictClass } from '$lib/format';
	import type { BladeSummary, Verdict } from '$lib/types';

	let summaries = $state<BladeSummary[] | null>(null);

	onMount(async () => {
		summaries = (await getBladeSummaries()).sort((a, b) => b.overall - a.overall);
	});

	const verdictOptions: { val: Verdict | null; label: string; activeClass: string }[] = [
		{ val: null, label: '—', activeClass: 'bg-white shadow-sm dark:bg-stone-600' },
		{ val: 'Keep', label: 'Keep', activeClass: 'bg-green-600 text-white shadow-sm' },
		{ val: 'Retest', label: 'Retest', activeClass: 'bg-amber-500 text-white shadow-sm' },
		{ val: 'Skip', label: 'Skip', activeClass: 'bg-red-600 text-white shadow-sm' }
	];
</script>

<PageHeader title="Blades" />

{#if summaries?.length === 0}
	<p class="text-stone-500">No blades tested yet.</p>
{:else if summaries}
	<div class="space-y-3">
		{#each summaries as blade (blade.id)}
			<div class="card space-y-3 p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<h2 class="text-lg font-semibold">{blade.name}</h2>
						<div class="text-sm text-stone-500">{blade.total_shaves} shave{blade.total_shaves === 1 ? '' : 's'} · avg nicks {blade.avg_nicks}</div>
					</div>
					<div class="text-right">
						<div class="text-2xl font-bold tabular-nums {scoreClass(blade.overall)}">{blade.overall}</div>
						{#if blade.verdict}<span class="rounded-full px-2 py-0.5 text-xs font-medium {verdictClass(blade.verdict)}">{blade.verdict}</span>{/if}
					</div>
				</div>
				<div class="grid grid-cols-3 gap-1.5 text-center text-sm">
					{#each [['Smooth', blade.avg_smoothness], ['Close', blade.avg_closeness], ['Efficient', blade.avg_efficiency], ['Feel', blade.avg_post_shave_feel], ['Confidence', blade.avg_confidence], ['Irritation', blade.avg_irritation]] as [label, v]}
						<div class="rounded-lg bg-stone-100 p-2 dark:bg-stone-800">
							<div class="text-[11px] text-stone-500">{label}</div>
							<div class="font-semibold tabular-nums">{v}</div>
						</div>
					{/each}
				</div>
				<Segmented value={blade.verdict} options={verdictOptions}
					onchange={async (v) => { blade.verdict = v; await updateBladeVerdict(blade.id, v); }} />
			</div>
		{/each}
	</div>
{/if}
