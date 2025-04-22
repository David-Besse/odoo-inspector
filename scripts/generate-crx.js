/**
 * Script pour générer un fichier CRX à partir des fichiers de l'extension
 * Utilise la bibliothèque crx pour créer un CRX valide
 * @author David B.
 */

const fs = require('fs');
const path = require('path');
const ChromeExtension = require('crx');
const { version } = require('../package.json');

// Configuration
const DIST_DIR = path.join(__dirname, '../dist');
const OUTPUT_DIR = path.join(__dirname, '../packages');
const PRIVATE_KEY_FILE = path.join(__dirname, '../private-key.pem');
const CRX_OUTPUT_FILE = path.join(OUTPUT_DIR, `odoo-inspector-v${version}.crx`);

// Assurer que le répertoire de sortie existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Répertoire ${OUTPUT_DIR} créé avec succès`);
}

// Vérifier que le répertoire dist existe
if (!fs.existsSync(DIST_DIR)) {
  console.error(`❌ Erreur : Le répertoire ${DIST_DIR} n'existe pas.`);
  console.error('Veuillez exécuter "npm run build" avant de lancer ce script');
  process.exit(1);
}

// Fonction pour générer une clé privée si elle n'existe pas
function ensurePrivateKey() {
  if (!fs.existsSync(PRIVATE_KEY_FILE)) {
    console.log(`⚙️ Génération d'une nouvelle clé privée...`);
    const { execSync } = require('child_process');
    
    try {
      // Utiliser OpenSSL pour générer une clé RSA
      execSync(`openssl genrsa 2048 > "${PRIVATE_KEY_FILE}"`);
      console.log(`✅ Nouvelle clé privée générée: ${PRIVATE_KEY_FILE}`);
      console.log(`⚠️ IMPORTANT: Conservez ce fichier en sécurité. Il est nécessaire pour mettre à jour l'extension.`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de la clé privée:`, error.message);
      process.exit(1);
    }
  }
}

// Fonction pour générer le fichier CRX
async function generateCRX() {
  try {
    console.log(`🔄 Génération du fichier CRX...`);
    
    // S'assurer que la clé privée existe
    ensurePrivateKey();
    
    // Créer une nouvelle instance de ChromeExtension
    const crx = new ChromeExtension({
      privateKey: fs.readFileSync(PRIVATE_KEY_FILE),
      codebase: `https://example.com/extensions/odoo-inspector-v${version}.crx` // URL factice pour les métadonnées
    });
    
    // Charger les fichiers depuis le répertoire dist
    await crx.load(DIST_DIR);
    
    // Empaqueter l'extension au format CRX
    const crxBuffer = await crx.pack();
    
    // Écrire le fichier CRX
    fs.writeFileSync(CRX_OUTPUT_FILE, crxBuffer);
    
    // Générer également le fichier ZIP propre (sans fichiers temporaires)
    const zipOutputFile = path.join(OUTPUT_DIR, `odoo-inspector-v${version}.zip`);
    const zipBuffer = await crx.loadContents();
    fs.writeFileSync(zipOutputFile, zipBuffer);
    
    // Afficher les informations
    const crxStats = fs.statSync(CRX_OUTPUT_FILE);
    const crxSizeInMB = (crxStats.size / 1024 / 1024).toFixed(2);
    
    const zipStats = fs.statSync(zipOutputFile);
    const zipSizeInMB = (zipStats.size / 1024 / 1024).toFixed(2);
    
    console.log(`✅ Extension CRX générée avec succès !`);
    console.log(`📦 ${CRX_OUTPUT_FILE}`);
    console.log(`📊 Taille CRX : ${crxSizeInMB} MB`);
    console.log(`📦 ${zipOutputFile}`);
    console.log(`📊 Taille ZIP : ${zipSizeInMB} MB`);
    console.log(`\n⚠️ Note : Depuis Chrome 75, l'installation directe des fichiers CRX nécessite certaines configurations.`);
    console.log(`💡 Vous pouvez utiliser ce fichier CRX pour une installation par les méthodes suivantes :`);
    console.log(`   1. Distribution via une politique d'entreprise (déploiement administratif)`);
    console.log(`   2. Installation par glisser-déposer dans chrome://extensions/ en mode développeur (peut ne pas fonctionner dans les versions récentes)`);
    console.log(`   3. Déploiement via un serveur web avec les en-têtes Content-Type appropriés`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de la génération du fichier CRX:`, error.message);
    process.exit(1);
  }
}

// Exécuter le script
generateCRX(); 