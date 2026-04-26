/**
 * Génère les icônes PNG de l'extension Odebug
 */

const sharp = require('sharp');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../src/img/icons');
const SIZES = [16, 48, 128];

const STATES = [
  { suffix: '',      oColor: '#7c59a1', dColor: '#4bb04f' },
  { suffix: '_gray', oColor: '#aaaaaa', dColor: '#aaaaaa' }
];

function buildSVG(size, oColor, dColor) {
  const cx   = size / 2;
  const r    = +(size * 0.382).toFixed(1);
  const sw   = +(size * 0.147).toFixed(1);
  const bsw  = +(size * 0.088).toFixed(1); // bar stroke-width (~3/34)
  const topY = +(cx - r).toFixed(1);
  const botY = +(cx + r).toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <path fill="none" stroke="${oColor}" stroke-width="${sw}" stroke-linecap="butt" d="M${cx} ${topY} A${r} ${r} 0 1 0 ${cx} ${botY}"/>
  <path fill="none" stroke="${dColor}" stroke-width="${sw}" stroke-linecap="butt" d="M${cx} ${topY} A${r} ${r} 0 1 1 ${cx} ${botY}"/>
  <line x1="${cx}" y1="${topY}" x2="${cx}" y2="${botY}" stroke="${dColor}" stroke-width="${bsw}" stroke-linecap="round"/>
</svg>`;
}

async function main() {
  for (const size of SIZES) {
    for (const { suffix, oColor, dColor } of STATES) {
      const svg = buildSVG(size, oColor, dColor);
      const filename = `icon${size}${suffix}.png`;
      const filepath = path.join(ICONS_DIR, filename);

      await sharp(Buffer.from(svg)).png().toFile(filepath);
      console.log(`✅ ${filename}`);
    }
  }
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
