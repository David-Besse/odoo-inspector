#!/bin/bash

# Script pour empaqueter l'extension Odoo Inspector au format ZIP
# Ce script construit l'extension puis crée un fichier ZIP

# Charger nvm si disponible
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔨 Construction de l'extension...${NC}"
npm run build

# Vérifier si la construction a réussi
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Échec de la construction. Abandon de l'empaquetage.${NC}"
  exit 1
fi

# Vérifier et installer archiver si nécessaire
if ! npm list --depth=0 | grep -q 'archiver@'; then
  echo -e "${YELLOW}⚠️ Le module 'archiver' n'est pas installé. Installation en cours...${NC}"
  npm install --save-dev archiver
fi

# Exécuter le script d'empaquetage ZIP
node scripts/package-zip.js

# Vérifier si la génération a réussi
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Échec de l'empaquetage.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Le processus d'empaquetage est terminé avec succès.${NC}"
echo -e "${GREEN}👉 Votre extension est disponible dans le dossier 'packages'.${NC}" 