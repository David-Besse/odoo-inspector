/**
 * Génère un CRX signé (et le ZIP correspondant) à partir de dist/, pour une distribution hors Web Store
 * @author David B.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ChromeExtension = require('crx');
const { version } = require('../package.json');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const privateKeyFile = path.join(root, 'private-key.pem');
const outputDir = path.join(root, 'packages');

async function generateCRX() {
  if (!fs.existsSync(distDir)) {
    throw new Error('Le dossier dist/ est absent : lancez « npm run build » ou « npm run generate:crx ».');
  }
  if (!fs.existsSync(privateKeyFile)) {
    // La clé fixe l'identifiant de l'extension : la perdre oblige à republier sous un autre ID
    fs.writeFileSync(privateKeyFile, execFileSync('openssl', ['genrsa', '2048']));
    console.log(`🔑 Clé privée générée : ${privateKeyFile} (à sauvegarder, elle n'est pas versionnée)`);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const crx = new ChromeExtension({ privateKey: fs.readFileSync(privateKeyFile) });
  await crx.load(distDir);
  const crxFile = path.join(outputDir, `odoo-inspector-v${version}.crx`);
  const zipFile = path.join(outputDir, `odoo-inspector-v${version}.zip`);
  fs.writeFileSync(crxFile, await crx.pack());
  fs.writeFileSync(zipFile, await crx.loadContents());

  console.log(`✅ ${crxFile}`);
  console.log(`✅ ${zipFile}`);
  console.log('⚠️ Chrome n\'installe plus les CRX hors Web Store, sauf via une politique d\'entreprise.');
}

generateCRX().catch(error => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
