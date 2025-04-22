#!/bin/bash

# Script pour générer un fichier CRX pour l'extension Odoo Inspector
# Ce script construit l'extension puis crée un véritable fichier CRX

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔨 Construction de l'extension...${NC}"
npm run build

# Vérifier si la construction a réussi
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Échec de la construction. Abandon de la génération CRX.${NC}"
  exit 1
fi

echo -e "${YELLOW}📦 Génération du fichier CRX...${NC}"

# Vérifier et installer crx si nécessaire
if ! npm list --depth=0 | grep -q 'crx@'; then
  echo -e "${YELLOW}⚠️ Le module 'crx' n'est pas installé. Installation en cours...${NC}"
  npm install --save-dev crx
fi

# Exécuter le script de génération CRX
node scripts/generate-crx.js

# Vérifier si la génération a réussi
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Échec de la génération du fichier CRX.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Le processus de génération du fichier CRX est terminé avec succès.${NC}"
echo -e "${GREEN}👉 Votre fichier CRX est disponible dans le dossier 'packages'.${NC}" 