<!-- iOS-style segmented control. -->
<script lang="ts" generics="T extends string | null">
	let { value = $bindable(), options, onchange }: {
		value: T;
		options: { val: T; label: string; activeClass?: string }[];
		onchange?: (v: T) => void;
	} = $props();
</script>

<div class="flex rounded-xl bg-stone-200 p-1 dark:bg-stone-800">
	{#each options as opt}
		<button
			type="button"
			onclick={() => { value = opt.val; onchange?.(opt.val); }}
			class="flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors {value === opt.val
				? (opt.activeClass ?? 'bg-white text-stone-900 shadow-sm dark:bg-stone-600 dark:text-white')
				: 'text-stone-600 dark:text-stone-400'}"
		>{opt.label}</button>
	{/each}
</div>
