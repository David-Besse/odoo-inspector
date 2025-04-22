/**
 * Script d'empaquetage de l'extension Odoo Inspector en format ZIP
 * Génère un fichier ZIP prêt à être installé dans Chrome/Brave ou soumis au Chrome Web Store
 * 
 * Note: Ce script utilise la bibliothèque 'archiver'
 * npm install --save-dev archiver
 */

const fs = require('fs');
const path = require('path');
// Remplacer l'import de ChromeExtensionBuilder par une méthode compatible
// const ChromeExtensionBuilder = require('chrome-extension-builder');
const { version } = require('../package.json');

// Configuration
const DIST_DIR = path.join(__dirname, '../dist');
const OUTPUT_DIR = path.join(__dirname, '../packages');
const PRIVATE_KEY_FILE = path.join(__dirname, '../private-key.pem');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `odoo-inspector-v${version}.crx`);

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

// Méthode alternative pour créer un fichier ZIP en utilisant archiver
function buildZipWithArchiver() {
  console.log(`🔄 Empaquetage de l'extension...`);
  
  // Utiliser archiver pour créer un fichier ZIP
  const archiver = require('archiver');
  const zipFile = path.join(OUTPUT_DIR, `odoo-inspector-v${version}.zip`);
  const output = fs.createWriteStream(zipFile);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Niveau de compression maximal
  });
  
  // Gestion des événements
  output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`✅ Extension empaquetée avec succès !`);
    console.log(`📦 ${zipFile}`);
    console.log(`📊 Taille : ${sizeInMB} MB`);
    console.log(`\n💡 Pour installer l'extension :`);
    console.log(`   Méthode 1 (recommandée): Glisser-déposer directement le fichier ZIP sur chrome://extensions/`);
    console.log(`   Méthode 2 (alternative):`);
    console.log(`   1. Décompressez le fichier ZIP généré`);
    console.log(`   2. Ouvrez chrome://extensions/ et activez le "Mode développeur"`);
    console.log(`   3. Cliquez sur "Charger l'extension non empaquetée" et sélectionnez le dossier décompressé`);
  });
  
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn(`⚠️ Avertissement : ${err}`);
    } else {
      throw err;
    }
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  // Connexion du flux de sortie
  archive.pipe(output);
  
  // Ajouter tous les fichiers du répertoire dist
  archive.directory(DIST_DIR, false);
  
  // Finaliser l'archive
  archive.finalize();
}

// Tenter de construire avec chrome-extension-builder
async function buildExtension() {
  try {
    console.log(`🔄 Création du fichier ZIP en cours...`);
    
    // Le module ChromeExtensionBuilder n'est pas fonctionnel, passer directement à la méthode alternative
    console.log(`Utilisation de la méthode d'empaquetage avec archiver...`);
    buildZipWithArchiver();
    
  } catch (error) {
    console.error(`❌ Erreur lors de la création du fichier ZIP:`, error.message);
    console.log(`\n🔄 Tentative avec la méthode alternative (archiver)...`);
    buildZipWithArchiver();
  }
}

// Exécuter le script
buildExtension(); 