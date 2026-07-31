import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icona.svg');
const misure = [
  ['public/icona-192.png', 192],
  ['public/icona-512.png', 512],
  ['public/apple-touch-icon.png', 180],
];

for (const [file, size] of misure) {
  await sharp(svg)
    .resize(size, size)
    .flatten({ background: '#fce8ee' })
    .png()
    .toFile(file);
  console.log('creato', file, size);
}
