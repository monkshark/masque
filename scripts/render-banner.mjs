import sharp from 'sharp'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const MASK =
  'M15 39C20 31 29 27 37 29C42 30 46 35 50 39C54 35 58 30 63 29C71 27 80 31 85 39C81 52 73 64 62 69C57 71 53 63 50 60C47 63 43 71 38 69C27 64 19 52 15 39Z M30 49Q37 43 44 49Q37 55 30 49Z M56 49Q63 43 70 49Q63 55 56 49Z'

const svg = `<svg width="1280" height="512" viewBox="0 0 1280 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="512" fill="#4a2f7a"/>
  <g transform="translate(149,0)">
    <path d="${MASK}" fill="#f1ebde" fill-rule="evenodd" transform="translate(37,54.4) scale(4.2)"/>
    <text x="466" y="256" font-family="sans-serif" font-size="80" font-weight="700" letter-spacing="2" fill="#f1ebde">Masque</text>
    <text x="468" y="312" font-family="sans-serif" font-size="24" fill="#f1ebde" fill-opacity="0.7">Consistent fingerprint disguise</text>
  </g>
</svg>`

await sharp(Buffer.from(svg), { density: 192 }).png().toFile(join(root, 'public/banner.png'))
process.stdout.write('wrote public/banner.png\n')
