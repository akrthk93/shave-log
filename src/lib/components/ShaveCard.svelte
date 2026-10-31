<!-- Tappable summary of one shave. -->
<script lang="ts">
	import { base } from '$app/paths';
	import { overallScore } from '$lib/db';
	import { formatDate, scoreClass } from '$lib/format';
	import type { ShaveView } from '$lib/types';
	let { shave }: { shave: ShaveView } = $props();
	const overall = $derived(overallScore(shave));
</script>

<a href="{base}/log?id={shave.id}" class="card flex items-center gap-3 p-3.5 active:opacity-70">
	<div class="w-12 shrink-0 text-center">
		<div class="text-2xl font-bold tabular-nums {scoreClass(overall)}">{overall}</div>
		<div class="text-[10px] uppercase tracking-wide text-stone-500">overall</div>
	</div>
	<div class="min-w-0 flex-1">
		<div class="flex items-baseline justify-between gap-2">
			<span class="truncate font-semibold">{shave.blade_name} <span class="font-normal text-stone-500">#{shave.shave_number}</span></span>
			<span class="shrink-0 text-xs text-stone-500">{shave.approx_date ? '~' : ''}{formatDate(shave.date)}</span>
		</div>
		<div class="mt-0.5 flex gap-3 text-xs text-stone-500 tabular-nums">
			<span>Smooth {shave.smoothness}</span><span>Close {shave.closeness}</span><span>Irrit. {shave.irritation}</span>
			{#if shave.nicks}<span>Nicks {shave.nicks}</span>{/if}
		</div>
		{#if shave.notes}<p class="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{shave.notes}</p>{/if}
	</div>
</a>
