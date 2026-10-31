# Shave Log

iPhone PWA for logging wet shaves and comparing razor blades. SvelteKit (static) + IndexedDB, hosted on GitHub Pages.

- All data stays on the phone (IndexedDB). Back up via **Settings → Export backup**.
- **Settings → Import backup** accepts this app's backups and the old desktop app's SQLite export.
- Works offline once installed (service worker).

## Install on iPhone
Open https://akrthk93.github.io/shave-log/ in Safari → Share → **Add to Home Screen**.

## Develop
```sh
npm install
npm run dev     # http://localhost:5173/shave-log/
npm test
npm run build   # static site in build/
```
Pushing to `main` deploys via `.github/workflows/deploy.yml`.
