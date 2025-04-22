# Odoo Inspector

Une extension de navigateur qui permet de basculer facilement le mode debug d'Odoo et d'inspecter la structure HTML des pages Odoo.

## Fonctionnalités

- Activation/désactivation du mode debug Odoo avec un simple interrupteur
- Support de deux modes debug : standard (`debug=1`) et avec assets (`debug=assets`)
- Inspection HTML pour analyser facilement la structure des pages Odoo
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
   - Cliquez sur "Charger l'extension non empaquetée"
   - **Important**: Sélectionnez uniquement le dossier `dist` généré par la build

## Développement

- `npm run build` : Nettoie le dossier dist et construit l'extension
- `npm run dev` : Nettoie le dossier dist et surveille les changements pour reconstruire automatiquement
- `npm run clean` : Nettoie le dossier dist

## Structure du projet

```
odoo-inspector/
├── dist/               # Dossier de build (généré lors de la construction)
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

## Architecture

L'extension utilise une architecture modulaire où :

1. Le service worker gère l'état global et les événements du navigateur
2. Les managers s'occupent de fonctionnalités spécifiques :
   - StateManager : Communication et gestion des états entre composants
   - HTMLInspector : Inspection interactive de la structure HTML des pages Odoo
   - IconManager : Mise à jour des icônes selon le contexte

L'architecture du projet est conçue pour être facilement extensible avec de nouvelles fonctionnalités.

## Détection et compatibilité des pages Odoo

L'extension est capable de détecter différents types de pages Odoo :
- Pages avec layout Odoo ET URLs contenant `/web` ou `/odoo` : Mode debug activable
- Pages avec layout Odoo SANS les chemins `/web` ou `/odoo` : Mode debug désactivé (message d'information affiché)
- Pages non-Odoo : Extension désactivée

Cette approche assure que le mode debug n'est activé que sur les pages où il fonctionne correctement.

## Modes de debug

L'extension prend en charge deux modes de debug différents :
1. **Debug standard** (`debug=1`) : Active les fonctionnalités de développement d'Odoo
2. **Debug avec assets** (`debug=assets`) : Active les fonctionnalités de développement et charge les assets (JS/CSS) de manière non-minifiée, utile pour le débogage frontend

Les deux modes sont mutuellement exclusifs : activer l'un désactive automatiquement l'autre.

## Flux de fonctionnement

1. L'utilisateur ouvre le popup sur une page web
2. L'extension détecte le type de page Odoo et l'URL
3. Sur une page avec le layout Odoo ET une URL contenant `/web` ou `/odoo`, l'utilisateur peut activer le mode debug
4. Sur une page avec le layout Odoo SANS les chemins `/web` ou `/odoo`, un message d'information est affiché expliquant que le mode debug n'est pas disponible sur cette page
5. Sur une page non-Odoo, un message indique que l'extension n'est utilisable que sur les sites Odoo

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