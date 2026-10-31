<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Ask the browser not to evict our IndexedDB data under storage pressure.
	onMount(() => {
		navigator.storage?.persist?.().catch(() => {});
	});

	const tabs = [
		{ href: '/', label: 'Home', icon: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
		{ href: '/history', label: 'History', icon: 'M4 6h16M4 12h16M4 18h10' },
		{ href: '/log', label: 'Log', icon: 'M12 5v14M5 12h14', primary: true },
		{ href: '/blades', label: 'Blades', icon: 'M4 8h16v4H4zM9 12v8M15 12v8' },
		{ href: '/trends', label: 'Trends', icon: 'M4 19 9 12l4 3 7-9' }
	];

	function active(href: string) {
		const path = page.url.pathname.replace(base, '') || '/';
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<div class="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
	<main class="mx-auto max-w-xl px-4 pt-4">
		{@render children()}
	</main>
</div>

<nav
	class="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/85 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/85"
	style="padding-bottom: env(safe-area-inset-bottom)"
>
	<div class="mx-auto flex max-w-xl items-end justify-around px-2 pt-1.5 pb-1">
		{#each tabs as tab}
			<a
				href="{base}{tab.href}"
				class="flex min-w-14 flex-col items-center gap-0.5 py-1 text-[11px] font-medium {active(tab.href)
					? 'text-accent'
					: 'text-stone-500'}"
				aria-current={active(tab.href) ? 'page' : undefined}
			>
				{#if tab.primary}
					<span class="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg dark:text-stone-950">
						<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d={tab.icon} /></svg>
					</span>
				{:else}
					<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={tab.icon} /></svg>
				{/if}
				{tab.label}
			</a>
		{/each}
	</div>
</nav>
