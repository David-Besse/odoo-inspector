# Odoo Inspector (Odebug)

Extension Chromium (Chrome, Edge, Brave) qui bascule le mode debug d'Odoo en un clic et l'active automatiquement sur le backend.

## Fonctionnalités

- Sélecteur à trois positions dans le popup : **Off** (`debug=0`), **Debug** (`debug=1`), **Assets** (`debug=assets`)
- Activation automatique du debug sur le backend (`/odoo`, `/web`) et le Point of Sale (`/pos`)
- Un « Off » est respecté : le debug n'est plus réactivé sur ce domaine jusqu'à la fermeture du navigateur
- Icône colorée quand le debug est actif, grise sinon
- Compatible Odoo avant 18 (`/web`) et 18+ (`/odoo`) ; Chrome 102 minimum

## Installation

```bash
git clone https://github.com/David-Besse/odoo-inspector.git
cd odoo-inspector
npm install
npm run build
```

Puis, dans `chrome://extensions/` (ou `brave://extensions/`, `edge://extensions/`) avec le mode développeur activé :

- **Méthode 1** : `npm run package` puis glisser-déposer le ZIP de `packages/` sur la page des extensions ;
- **Méthode 2** : « Charger l'extension non empaquetée » et sélectionner le dossier `dist/`.

Node.js 20.9 ou plus récent est requis (`nvm install --lts`).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run build` | Construit l'extension dans `dist/` |
| `npm run dev` | Reconstruit à chaque modification |
| `npm run package` | Construit puis crée le ZIP dans `packages/` (Chrome Web Store, glisser-déposer) |
| `npm run package:zip-only` | Crée le ZIP sans reconstruire |
| `npm run generate:crx` | Construit puis crée un CRX signé et son ZIP dans `packages/` |
| `npm run generate:icons` | Régénère les icônes PNG de `src/img/icons/` |

La version de l'extension se règle uniquement dans `package.json` : le build la recopie dans le manifeste.

Le CRX est signé avec `private-key.pem`, générée à la racine au premier lancement et non versionnée. Cette clé fixe l'identifiant de l'extension : la sauvegarder. Depuis Chrome 75, un CRX ne s'installe hors Web Store que par politique d'entreprise.

## Structure

```
odoo-inspector/
├── manifest.json           # Manifeste MV3 (sans version : injectée au build)
├── webpack.config.js
├── scripts/
│   ├── generate-crx.js     # CRX signé + ZIP
│   ├── generate-icons.js   # Icônes PNG à partir d'un SVG
│   └── package-zip.mjs     # ZIP de dist/
└── src/
    ├── odoo.js             # Détection d'Odoo, URL debug, icône (partagé)
    ├── popup.html          # Interface du popup
    ├── popup.js            # Logique du popup
    ├── service-worker.js   # Activation automatique et icône
    └── img/                # Icônes et logo Sudokeys
```

## Fonctionnement

### Détection d'une page Odoo

L'extension lit la page dans le monde JavaScript de la page (`world: 'MAIN'`) : c'est une page Odoo si `window.odoo` existe ou si le `<body>` porte la classe `o_web_client`. L'état debug vient de `odoo.debug`, la valeur réellement appliquée par le serveur.

### Activation automatique

À la fin de chaque chargement, le service worker regarde le chemin de l'URL. Il n'agit que si celui-ci commence par `/odoo`, `/web` ou `/pos`, et n'injecte de script sur aucun autre site. Si la page est bien Odoo et que le debug n'est pas actif, il recharge l'onglet avec `debug=1`, ou avec le dernier mode choisi sur ce domaine.

Il ne fait rien si l'URL porte déjà un paramètre `debug` (par exemple `debug=0`), ni si l'utilisateur a choisi « Off » sur ce domaine. Ce choix est gardé dans `chrome.storage.session` et s'efface à la fermeture du navigateur.

### Pourquoi « Off » envoie `debug=0`

Odoo mémorise le mode debug dans la session dès qu'il reçoit le paramètre `debug`. Retirer le paramètre de l'URL ne change donc rien : il faut envoyer `debug=0` pour vider la session.

### Site web

Sur le site public (chemin hors `/odoo`, `/web`, `/pos` et sans barre d'administration), le popup indique que le debug est réservé au backoffice et rien n'est activé automatiquement.

## Permissions

- `scripting` et accès à toutes les URL : lire `window.odoo` dans l'onglet, Odoo pouvant être hébergé sur n'importe quel domaine ;
- `storage` : retenir le choix « Off » par domaine pendant la session du navigateur.

## Auteur

David B.

## Licence

[MIT](LICENSE)
