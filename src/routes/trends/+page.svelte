<!-- Charts: overall score over time, blade radar comparison, irritation & nicks. -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Chart from 'chart.js/auto';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { getAllShaves, getBladeSummaries, overallScore } from '$lib/db';
	import { formatShortDate } from '$lib/format';
	import type { BladeSummary, ShaveView } from '$lib/types';

	let shaves = $state<ShaveView[] | null>(null);
	let summaries: BladeSummary[] = [];
	let lineCanvas = $state<HTMLCanvasElement>();
	let radarCanvas = $state<HTMLCanvasElement>();
	let barCanvas = $state<HTMLCanvasElement>();

	const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
	// Stable colour per blade, by order of first use
	const colors = new Map<number, string>();
	const colorOf = (bladeId: number) => {
		if (!colors.has(bladeId)) colors.set(bladeId, palette[colors.size % palette.length]);
		return colors.get(bladeId)!;
	};

	onMount(() => {
		const charts: Chart[] = [];
		(async () => {
			[shaves, summaries] = await Promise.all([getAllShaves(), getBladeSummaries()]);
			if (!shaves.length) return;
			await tick(); // let canvases mount

			const dark = matchMedia('(prefers-color-scheme: dark)').matches;
			Chart.defaults.color = dark ? '#a8a29e' : '#57534e';
			Chart.defaults.borderColor = dark ? '#292524' : '#e7e5e4';
			Chart.defaults.font.family = '-apple-system, system-ui, sans-serif';
			Chart.defaults.plugins.legend.labels.boxWidth = 10;

			const chrono = [...shaves].reverse();
			const bladeIds = [...new Set(chrono.map((s) => s.blade_id))];
			charts.push(new Chart(lineCanvas!, {
				type: 'line',
				data: {
					datasets: bladeIds.map((id) => {
						const mine = chrono.filter((s) => s.blade_id === id);
						return {
							label: mine[0].blade_name,
							data: mine.map((s) => ({ x: new Date(s.date).getTime(), y: overallScore(s) })),
							borderColor: colorOf(id),
							backgroundColor: colorOf(id),
							tension: 0.3,
							pointRadius: 4
						};
					})
				},
				options: {
					aspectRatio: 1.2,
					plugins: { legend: { position: 'bottom' } },
					scales: {
						x: { type: 'linear', ticks: { maxTicksLimit: 5, callback: (v) => formatShortDate(new Date(v as number).toISOString()) } },
						y: { min: 1, max: 5 }
					}
				}
			}));

			const tested = summaries.filter((s) => s.total_shaves > 0);
			const top = [...tested].sort((a, b) => b.overall - a.overall).slice(0, 4);
			charts.push(new Chart(radarCanvas!, {
				type: 'radar',
				data: {
					labels: ['Smooth', 'Close', 'Efficient', 'Feel', 'Confidence'],
					datasets: top.map((s) => ({
						label: s.name,
						data: [s.avg_smoothness, s.avg_closeness, s.avg_efficiency, s.avg_post_shave_feel, s.avg_confidence],
						borderColor: colorOf(s.id),
						backgroundColor: colorOf(s.id) + '22',
						pointBackgroundColor: colorOf(s.id),
						pointRadius: 2
					}))
				},
				options: {
					aspectRatio: 0.9,
					plugins: { legend: { position: 'bottom' } },
					scales: { r: { min: 0, max: 5, ticks: { display: false, stepSize: 1 } } }
				}
			}));

			charts.push(new Chart(barCanvas!, {
				type: 'bar',
				data: {
					labels: tested.map((s) => s.name),
					datasets: [
						{ label: 'Avg irritation', data: tested.map((s) => s.avg_irritation), backgroundColor: '#ef4444aa' },
						{ label: 'Avg nicks', data: tested.map((s) => s.avg_nicks), backgroundColor: '#f59e0baa' }
					]
				},
				options: {
					indexAxis: 'y',
					aspectRatio: 1,
					plugins: { legend: { position: 'bottom' } },
					scales: { x: { beginAtZero: true } }
				}
			}));
		})();
		return () => charts.forEach((c) => c.destroy());
	});
</script>

<PageHeader title="Trends" />

{#if shaves?.length === 0}
	<p class="text-stone-500">Nothing to chart yet.</p>
{:else if shaves}
	<div class="space-y-4">
		<section>
			<h2 class="section-title">Overall score over time</h2>
			<div class="card p-3"><canvas bind:this={lineCanvas}></canvas></div>
		</section>
		<section>
			<h2 class="section-title">Top 4 blades compared</h2>
			<div class="card p-3"><canvas bind:this={radarCanvas}></canvas></div>
		</section>
		<section>
			<h2 class="section-title">Irritation & nicks (lower is better)</h2>
			<div class="card p-3"><canvas bind:this={barCanvas}></canvas></div>
		</section>
	</div>
{/if}
