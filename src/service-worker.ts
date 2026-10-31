/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
import { base, build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `shave-log-${version}`;
// Every page is the same client-rendered shell (ssr = false), so caching the root is enough.
const SHELL = `${base}/`;
const ASSETS = [SHELL, ...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			// Add one by one so a single failure doesn't abort the whole install.
			await Promise.allSettled(ASSETS.map((url) => cache.add(url)));
			await sw.skipWaiting();
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

// Offline-first: serve app files from cache, fall back to network.
sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin) return;
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			if (event.request.mode === 'navigate') {
				// Network first for pages so updates show up; cached shell when offline.
				try {
					return await fetch(event.request);
				} catch {
					return (await cache.match(SHELL)) ?? Response.error();
				}
			}
			const hit = await cache.match(event.request, { ignoreSearch: true });
			return hit ?? fetch(event.request);
		})()
	);
});
