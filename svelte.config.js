import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({ fallback: '404.html' }),
		// GitHub Pages serves the site at /<repo>/
		paths: { base: process.env.BASE_PATH ?? '/shave-log' },
		serviceWorker: { register: true }
	}
};

export default config;
