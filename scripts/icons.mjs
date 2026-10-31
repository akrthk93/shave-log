// Renders PNG app icons from static/icon.svg (iOS needs PNG for the home screen icon).
import sharp from 'sharp';
const svg = 'static/icon.svg';
const out = [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]];
await Promise.all(out.map(([name, size]) => sharp(svg).resize(size, size).flatten({ background: '#1c1917' }).png().toFile(`static/${name}`)));
console.log('icons ok');
