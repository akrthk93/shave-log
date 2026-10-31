<!-- Thumb-sized stepper for scores in 0.5 increments. -->
<script lang="ts">
	let { value = $bindable(3), min = 1, max = 5, step = 0.5, label = '', hint = '', lowerIsBetter = false } = $props();

	const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10));
	const dec = () => (value = clamp(value - step));
	const inc = () => (value = clamp(value + step));
	const pct = $derived(((value - min) / (max - min)) * 100);
</script>

<div class="flex items-center justify-between gap-3 py-2.5">
	<div class="min-w-0">
		<div class="font-medium">{label}</div>
		{#if hint}<div class="text-xs text-stone-500">{hint}</div>{/if}
		<div class="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
			<div class="h-full rounded-full {lowerIsBetter ? 'bg-red-500' : 'bg-accent'}" style="width: {pct}%"></div>
		</div>
	</div>
	<div class="flex shrink-0 items-center gap-1">
		<button type="button" onclick={dec} disabled={value <= min} aria-label="Decrease {label}"
			class="h-11 w-11 rounded-full bg-stone-200 text-xl font-semibold active:opacity-60 disabled:opacity-30 dark:bg-stone-800">−</button>
		<span class="w-11 text-center text-lg font-semibold tabular-nums">{value}</span>
		<button type="button" onclick={inc} disabled={value >= max} aria-label="Increase {label}"
			class="h-11 w-11 rounded-full bg-stone-200 text-xl font-semibold active:opacity-60 disabled:opacity-30 dark:bg-stone-800">+</button>
	</div>
</div>
