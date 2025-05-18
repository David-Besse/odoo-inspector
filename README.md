# Odoo Inspector

Une extension de navigateur qui permet de basculer facilement le mode debug d'Odoo et d'inspecter la structure HTML des pages Odoo.

## Fonctionnalités

- Activation/désactivation du mode debug Odoo avec un simple interrupteur
- Support de deux modes debug : standard (`debug=1`) et avec assets (`debug=assets`)
- Inspecteur HTML pour analyser facilement la structure des pages Odoo
- Interface utilisateur intuitive avec gestion d'état intelligent
- Support des différentes versions d'Odoo (pré-18, 18+) et détection intelligente des pages Odoo
- Indication visuelle du mode debug par des icônes différentes
- Compatible avec tous les navigateurs basés sur Chromium (Chrome, Edge, Brave)

## Installation

### Mode développement

1. Clonez ce dépôt :
```bash
git clone https://github.com/David-Besse/odoo-inspector.git
cd odoo-inspector
```

2. Installez les dépendances :
```bash
npm install
```

3. Construisez l'extension :
```bash
npm run build
```

4. Importez l'extension dans votre navigateur :
   - Ouvrez Chrome/Brave/Edge et accédez à `chrome://extensions/` ou `brave://extensions/`
   - Activez le "Mode développeur"
   - **Méthode 1 (recommandée)** : Exécutez `npm run package` puis glissez-déposez le fichier ZIP généré directement sur la page des extensions
   - **Méthode 2 (alternative)** : Cliquez sur "Charger l'extension non empaquetée" et sélectionnez le dossier `dist` généré par la build

## Développement

- `npm run build` : Nettoie le dossier dist et construit l'extension
- `npm run dev` : Nettoie le dossier dist et surveille les changements pour reconstruire automatiquement
- `npm run clean` : Nettoie le dossier dist
- `npm run package` : Construit et empaquète l'extension au format ZIP (pour le Chrome Web Store)
- `npm run package:zip-only` : Empaquète uniquement l'extension au format ZIP sans reconstruire
- `npm run generate:crx` : Génère un fichier CRX signé (pour distribution manuelle)

## Packaging de l'extension

Plusieurs options sont disponibles pour empaqueter l'extension :

### 1. Fichier ZIP (recommandé pour la distribution et le Chrome Web Store)

```bash
npm run package
```

Cette commande génère un fichier ZIP dans le dossier `packages/` qui peut être :
- Glissé-déposé directement sur la page `chrome://extensions/` (méthode la plus simple)
- Décompressé et chargé en mode développeur
- Téléchargé sur le Chrome Web Store pour publication

### 2. Fichier CRX (pour distribution manuelle)

```bash
npm run generate:crx
```

Cette commande génère :
- Un fichier .crx dans le dossier `packages/`
- Un fichier .zip dans le dossier `packages/`
- Une clé privée `private-key.pem` à la racine du projet (à sauvegarder !)

**Note** : Depuis Chrome 75, l'installation directe des fichiers CRX est restreinte. Le fichier CRX peut être utilisé pour :
- Distribution via des politiques d'entreprise
- Installation dans des navigateurs basés sur Chromium qui acceptent encore les CRX
- Déploiement via un serveur web avec les en-têtes Content-Type appropriés

## Compatibilité Node.js

Cette extension est compatible avec Node.js v18+ et a été testée avec :
- Node.js v18.20.8
- Node.js v22.14.0 (LTS)

Pour mettre à jour Node.js à la dernière version LTS, utilisez NVM :
```bash
nvm install --lts
```

## Structure du projet

```
odoo-inspector/
├── dist/               # Dossier de build (généré lors de la construction)
├── packages/           # Contient les fichiers ZIP et CRX pour la distribution
├── scripts/            # Scripts d'empaquetage et d'utilitaires
│   ├── generate-crx.js       # Script pour générer un fichier CRX
│   ├── generate-crx.sh       # Script shell pour la génération du CRX
│   ├── package-zip.js        # Script pour créer un ZIP de l'extension
│   └── package-zip.sh        # Script shell pour construire et empaqueter en ZIP
├── src/                # Code source
│   ├── core/           # Fonctionnalités de base et utilitaires
│   │   ├── browser.js          # Abstraction de l'API du navigateur
│   │   ├── constants.js        # Constantes partagées
│   │   ├── icon-utils.js       # Utilitaires pour la gestion des icônes
│   │   └── odoo.js             # Fonctions de détection et d'interaction avec Odoo
│   ├── img/            # Ressources graphiques
│   │   ├── icons/              # Icônes de l'extension (normale et grisée)
│   │   └── Sudokeys.webp       # Logo Sudokeys pour le popup
│   ├── managers/       # Gestionnaires des différentes fonctionnalités
│   │   ├── html-inspector.js   # Inspecteur HTML pour les pages Odoo
│   │   ├── icon-manager.js     # Gestion des icônes selon l'état de debug
│   │   ├── state-manager.js    # Gestion centralisée des états
│   │   └── tooltip-manager.js  # Gestion des tooltips d'inspection
│   ├── utils/          # Utilitaires spécifiques
│   │   └── url.js              # Manipulation des URLs et paramètres
│   ├── popup.html      # Interface utilisateur de l'extension
│   ├── popup.js        # Logique du popup
│   └── service-worker.js # Service worker principal
├── manifest.json       # Manifeste de l'extension Chrome
├── package.json        # Configuration npm
└── webpack.config.js   # Configuration webpack
```

## Description des fichiers principaux

### Core

- **browser.js** : Abstraction des APIs du navigateur pour assurer la compatibilité cross-browser
- **constants.js** : Définition des constantes utilisées dans tout le projet (chemins Odoo, paramètres de debug)
- **icon-utils.js** : Utilitaires pour gérer les différentes tailles et états des icônes
- **odoo.js** : Fonctions de détection de version d'Odoo et validation des URLs Odoo

### Managers

- **html-inspector.js** : Implémentation de l'inspecteur HTML pour visualiser la structure des pages
- **icon-manager.js** : Gestion du changement d'icône selon l'état du mode debug
- **state-manager.js** : Gestion centralisée des états et communication avec le service worker
- **tooltip-manager.js** : Gestion des tooltips pour l'inspection des éléments DOM

### Utils

- **url.js** : Utilitaires pour manipuler les URLs et les paramètres de debug pour les pages Odoo

### Interface utilisateur

- **popup.html** : Structure et styles de l'interface utilisateur du popup
- **popup.js** : Logique d'interaction du popup, détection du contexte Odoo et gestion des modes de debug

### Service worker

- **service-worker.js** : Gère l'état global et les événements du navigateur, stocke l'état du debug et son mode

### Scripts de packaging

- **generate-crx.js** : Génère un fichier CRX signé à partir des fichiers de l'extension
- **package-zip.js** : Crée un fichier ZIP de l'extension pour le déploiement

## Architecture

L'extension utilise une architecture modulaire où :

1. Le service worker gère l'état global et les événements du navigateur
2. Les managers s'occupent de fonctionnalités spécifiques :
   - StateManager : Communication et gestion des états entre composants
   - HTMLInspector : Inspection interactive de la structure HTML des pages Odoo
   - IconManager : Mise à jour des icônes selon le contexte

L'architecture du projet est conçue pour être facilement extensible avec de nouvelles fonctionnalités.

## Détection et compatibilité des pages Odoo

L'extension utilise plusieurs critères pour détecter les pages Odoo, fonctionnant de manière indépendante :

1. **Critère principal** : Présence du script avec l'identifiant `web.layout.odooscript` dans la page
   - Ce script est le marqueur officiel des pages Odoo

2. **Critères secondaires** : Utilisés en complément pour une détection plus robuste
   - Présence de texte "Powered by Odoo" dans la page
   - Présence d'éléments DOM spécifiques à Odoo
   - Patterns d'URL typiques des instances Odoo (incluant les URLs runbot)

3. **Critères spécifiques pour le Point of Sale** : Une combinaison d'indicateurs
   - Présence de la classe `pos` sur la balise `<body>`
   - URL contenant des patterns spécifiques au POS (comme `/pos/ui`)
   - Éléments DOM caractéristiques de l'interface POS

### Comportement selon le type de page

L'extension adapte son comportement en fonction du type de page détecté :

- **Pages Backend** (avec URL contenant `/web` ou `/odoo`) :
  - Activation automatique du mode debug si non déjà défini
  - Contrôles entièrement disponibles

- **Pages Point of Sale** (détection via critères POS spécifiques) :
  - Activation automatique du mode debug si non déjà défini
  - Contrôles entièrement disponibles

- **Pages Website** (script Odoo détecté mais pas d'URL backend/POS) :
  - **PAS** d'activation automatique du mode debug
  - Contrôles disponibles pour activation manuelle
  - Mode idéal pour prévisualiser le site sans debug

### Gestion des paramètres debug dans l'URL

L'extension respecte strictement les paramètres debug présents dans l'URL :

- `debug=1` : Active le mode debug standard
- `debug=assets` : Active le mode debug avec chargement des assets non-minifiés
- `debug=0` : Désactive explicitement le mode debug

Si aucun paramètre n'est spécifié, l'extension conserve l'état précédent pour assurer une expérience utilisateur cohérente lors de la navigation.

### Gestion des changements d'URL

L'extension surveille intelligemment les changements d'URL au sein d'Odoo et maintient l'état du mode debug entre les navigations, sauf si explicitement modifié via l'URL.

### Gestion de l'état entre onglets

L'extension gère séparément l'état du mode debug pour chaque onglet :
- Le changement du mode debug dans un onglet n'affecte pas les autres onglets
- L'icône de l'extension affiche correctement l'état de debug spécifique à l'onglet actif
- Lors du changement d'onglet, l'état de l'icône est automatiquement mis à jour pour refléter l'état du nouvel onglet actif

## Modes de debug

L'extension prend en charge deux modes de debug différents :
1. **Debug standard** (`debug=1`) : Active les fonctionnalités de développement d'Odoo
2. **Debug avec assets** (`debug=assets`) : Active les fonctionnalités de développement et charge les assets (JS/CSS) de manière non-minifiée, utile pour le débogage frontend

Les deux modes sont mutuellement exclusifs : activer l'un désactive automatiquement l'autre.

## Flux de fonctionnement

1. L'utilisateur ouvre le popup sur une page web

2. L'extension analyse la page avec deux méthodes parallèles :
   - **Méthode principale** : Recherche du script Odoo spécifique (`script#web.layout.odooscript`)
   - **Méthode alternative** : Pour le Point of Sale, vérification de la classe `pos` sur le body ET `/pos` dans l'URL

3. Si l'un des critères est satisfait, l'extension adapte son comportement selon le type de page :
   - **Pages Backend** (`/web` ou `/odoo`) : Activation automatique du mode debug (si non défini)
   - **Pages Point of Sale** : Activation automatique du mode debug (si non défini)
   - **Pages Website** : Contrôles disponibles mais PAS d'activation automatique

4. L'extension respecte strictement les paramètres debug présents dans l'URL :
   - `debug=1` ou `debug=assets` : Active le mode correspondant
   - `debug=0` : Désactive explicitement le mode debug
   - Sans paramètre : Conserve l'état précédent lors des changements de page

5. Les changements d'URL sont surveillés en temps réel pour maintenir la cohérence de l'expérience utilisateur, tout en respectant les choix explicites de l'utilisateur.

## Fonctionnalité d'inspection HTML

L'inspecteur HTML permet de visualiser facilement la structure des éléments sur les pages Odoo :
1. Il faut d'abord activer le mode debug (normal ou assets)
2. Activer ensuite l'option "Show HTML Structure" dans le popup
3. Survoler les éléments de la page pour voir leur structure HTML

**Important** : L'inspecteur HTML ne peut être activé que si l'un des modes debug (normal ou assets) est déjà actif. Si vous tentez de l'activer sans avoir préalablement activé un mode debug, l'opération sera annulée.

## Auteur

David B.

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

[MIT](LICENSE) 