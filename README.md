# Odoo Inspector

Une extension de navigateur qui permet de basculer facilement le mode debug d'Odoo et d'inspecter la structure HTML des pages Odoo.

## Fonctionnalités

- Activation/désactivation du mode debug Odoo avec un simple interrupteur
- Inspecteur HTML pour analyser facilement la structure des pages Odoo
- Gestion automatique des tooltips pour une meilleure expérience utilisateur
- Support des différentes versions d'Odoo (pré-18 et 18+)
- Indication visuelle du mode debug par des icônes différentes

## Installation

### Mode développement

1. Clonez ce dépôt :
```
git clone https://github.com/VOTRE_USERNAME/odoo-inspector.git
cd odoo-inspector
```

2. Installez les dépendances :
```
npm install
```

3. Construisez l'extension :
```
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
├── icons/              # Icônes de l'extension
├── src/                # Code source
│   ├── core/           # Fonctionnalités de base
│   ├── managers/       # Gestionnaires des différentes fonctionnalités
│   └── utils/          # Utilitaires
├── package.json        # Configuration npm
└── webpack.config.js   # Configuration webpack
```

## Architecture

L'extension utilise une architecture modulaire où :

1. Le service worker gère l'état global et les événements du navigateur
2. Les managers s'occupent de fonctionnalités spécifiques :
   - IconManager : Gestion des icônes en fonction de l'état du debug
   - StateManager : Coordination des autres managers selon l'état
   - TooltipManager : Gestion des tooltips Odoo
   - HTMLInspector : Inspection de la structure HTML

## Auteur

David B.

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

[MIT](LICENSE) 