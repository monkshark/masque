import sharp from 'sharp'
import { join } from 'node:path'

const VARIANTS = [
  { name: 'Violet', badge: '#4a2f7a', mask: '#f1ebde' },
  { name: 'Indigo', badge: '#2c3a86', mask: '#eef0f5' },
  { name: 'Teal', badge: '#14706c', mask: '#eef2ec' },
  { name: 'Ink', badge: '#23242f', mask: '#ececef' },
  { name: 'Rose', badge: '#8d2f50', mask: '#f4eae6' },
  { name: 'Bone', badge: '#ece5d6', mask: '#23242f' },
]

const MASK =
  'M15 39C20 31 29 27 37 29C42 30 46 35 50 39C54 35 58 30 63 29C71 27 80 31 85 39C81 52 73 64 62 69C57 71 53 63 50 60C47 63 43 71 38 69C27 64 19 52 15 39Z M30 49Q37 43 44 49Q37 55 30 49Z M56 49Q63 43 70 49Q63 55 56 49Z'

function iconSvg(badge, mask, s = 128) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><rect width="128" height="128" rx="28" fill="${badge}"/><g transform="translate(64,64) scale(1.3) translate(-50,-48)" fill="${mask}" fill-rule="evenodd"><path d="${MASK}"/></g></svg>`
}

const cellW = 200
const cellH = 230
const cols = 3
const rows = 2
const W = cols * cellW
const H = rows * cellH + 50

let cells = ''
VARIANTS.forEach((v, i) => {
  const cx = (i % cols) * cellW
  const cy = Math.floor(i / cols) * cellH + 20
  cells += `<g transform="translate(${cx + 36},${cy + 16})">${iconSvg(v.badge, v.mask)}</g>`
  cells += `<text x="${cx + cellW / 2}" y="${cy + 172}" fill="#e5e5ea" font-family="sans-serif" font-size="18" font-weight="600" text-anchor="middle">${i + 1}. ${v.name}</text>`
  cells += `<text x="${cx + cellW / 2}" y="${cy + 192}" fill="#9a9aa4" font-family="monospace" font-size="11" text-anchor="middle">${v.badge} / ${v.mask}</text>`
})

const sheet = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#15151a"/>${cells}</svg>`

const out = join(process.env.USERPROFILE || process.env.HOME || '.', 'Desktop', 'Masque Icon Variants.png')
await sharp(Buffer.from(sheet)).png().toFile(out)
process.stdout.write('wrote ' + out + '\n')
