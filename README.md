# Odoo Inspector

Une extension de navigateur qui permet de basculer facilement le mode debug d'Odoo et d'inspecter la structure HTML des pages Odoo.

## Fonctionnalités

- Activation/désactivation du mode debug Odoo avec un simple interrupteur
- Inspecteur HTML pour analyser facilement la structure des pages Odoo
- Interface utilisateur intuitive avec gestion d'état intelligent
- Support des différentes versions d'Odoo (pré-18 et 18+)
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
- **constants.js** : Définition des constantes utilisées dans tout le projet (chemins Odoo, paramètres)
- **icon-utils.js** : Utilitaires pour gérer les différentes tailles et états des icônes
- **odoo.js** : Fonctions de détection de version d'Odoo et validation des URLs Odoo

### Managers

- **html-inspector.js** : Implémentation de l'inspecteur HTML pour visualiser la structure des pages
- **icon-manager.js** : Gestion du changement d'icône selon l'état du mode debug
- **state-manager.js** : Gestion centralisée des états et communication avec le service worker
- **tooltip-manager.js** : Gestion des tooltips pour l'inspection des éléments DOM

### Utils

- **url.js** : Utilitaires pour manipuler les URLs et les paramètres de debug

### Interface utilisateur

- **popup.html** : Structure et styles de l'interface utilisateur du popup
- **popup.js** : Logique d'interaction du popup, détection du contexte Odoo

### Service worker

- **service-worker.js** : Gère l'état global et les événements du navigateur, stocke l'état du debug

## Architecture

L'extension utilise une architecture modulaire où :

1. Le service worker gère l'état global et les événements du navigateur
2. Les managers s'occupent de fonctionnalités spécifiques :
   - StateManager : Communication et gestion des états entre composants
   - HTMLInspector : Inspection interactive de la structure HTML des pages Odoo
   - IconManager : Mise à jour des icônes selon le contexte

L'architecture du projet est conçue pour être facilement extensible avec de nouvelles fonctionnalités.

## Comportement adaptatif

L'extension détecte automatiquement si elle est utilisée sur une page Odoo :
- Sur une page Odoo : toutes les fonctionnalités sont disponibles
- Sur une page non-Odoo : un message clair indique que l'extension n'est utilisable que sur les sites Odoo

## Flux de fonctionnement

1. L'utilisateur ouvre le popup sur une page web
2. L'extension détecte automatiquement si c'est une page Odoo
3. Sur une page Odoo, l'utilisateur peut activer/désactiver le mode debug
4. L'extension modifie l'URL et met à jour l'icône en conséquence
5. L'inspecteur HTML peut être activé uniquement si le mode debug est activé

## Auteur

David B.

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

[MIT](LICENSE) 