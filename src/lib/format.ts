/** Display helpers. */
export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShortDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}

export function nowLocalISO(): string {
	const d = new Date();
	d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
	return d.toISOString().slice(0, 16);
}

export const tuggingLabel = (t: string) => (t === 'N' ? 'None' : t === 'S' ? 'Slight' : 'Yes');

export function verdictClass(v: string | null): string {
	if (v === 'Keep') return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
	if (v === 'Skip') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
	if (v === 'Retest') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
	return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400';
}

/** Colour for a 1–5 score: red → amber → green. */
export function scoreClass(v: number): string {
	if (v >= 4) return 'text-green-600 dark:text-green-400';
	if (v >= 3) return 'text-amber-600 dark:text-amber-400';
	return 'text-red-600 dark:text-red-400';
}
