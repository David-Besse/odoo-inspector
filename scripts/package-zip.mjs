/**
 * Empaquète dist/ en ZIP, à glisser sur chrome://extensions ou à soumettre au Chrome Web Store
 * @author David B.
 */

import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';

const root = path.join(import.meta.dirname, '..');
const distDir = path.join(root, 'dist');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

if (!fs.existsSync(distDir)) {
  console.error('❌ Le dossier dist/ est absent : lancez « npm run build » ou « npm run package ».');
  process.exit(1);
}

fs.mkdirSync(path.join(root, 'packages'), { recursive: true });
const zipFile = path.join(root, 'packages', `odoo-inspector-v${version}.zip`);
const output = fs.createWriteStream(zipFile);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✅ ${zipFile} (${(archive.pointer() / 1024).toFixed(1)} Ko)`);
  console.log('💡 Glissez le ZIP sur chrome://extensions (mode développeur activé),');
  console.log('   ou décompressez-le et utilisez « Charger l\'extension non empaquetée ».');
});
archive.on('warning', error => console.warn(`⚠️ ${error.message}`));
archive.on('error', error => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});

archive.pipe(output);
archive.directory(distDir, false);
archive.finalize();
