/**
 * Détection d'Odoo et manipulation du mode debug, partagées par le popup et le service worker
 * @author David B.
 */

/**
 * Indique si le chemin est celui de l'application Odoo (backend ou POS), où le debug s'active
 * automatiquement : /odoo (18+), /web (avant 18), /pos. Le site web public n'en fait pas partie.
 * @param {string} pathname - Chemin de l'URL
 * @returns {boolean}
 */
export function isOdooAppPath(pathname) {
  return /^\/(odoo|web|pos)(\/|$)/i.test(pathname);
}

/**
 * Remplace le paramètre debug de l'URL. Odoo mémorise ce paramètre dans la session :
 * le retirer ne désactive rien, il faut envoyer debug=0.
 * @param {string} url - URL de l'onglet
 * @param {string} value - '0', '1' ou 'assets'
 * @returns {string}
 */
export function withDebug(url, value) {
  const newUrl = new URL(url);
  newUrl.searchParams.set('debug', value);
  return newUrl.href;
}

/**
 * Mode debug déduit de la valeur Odoo ('1', 'assets', 'assets,tests'…)
 * @param {string} debug - Valeur de odoo.debug ou du paramètre d'URL
 * @returns {'off'|'debug'|'assets'}
 */
export function getDebugMode(debug) {
  if (!debug || debug === '0') return 'off';
  return debug.includes('assets') ? 'assets' : 'debug';
}

/**
 * Lit l'état Odoo dans la page. Sérialisée par scripting.executeScript : elle ne doit
 * référencer que les globales de la page.
 */
function readOdooPage() {
  const hasWebClient = document.body?.classList.contains('o_web_client') ?? false;
  const odoo = window.odoo;
  return {
    isOdoo: !!odoo || hasWebClient,
    hasWebClient,
    debug: odoo?.debug ? String(odoo.debug) : '',
  };
}

/**
 * Inspecte l'onglet. Le monde MAIN est nécessaire pour voir window.odoo, invisible depuis
 * le monde isolé des extensions.
 * @param {number} tabId - Identifiant de l'onglet
 * @returns {Promise<{isOdoo: boolean, hasWebClient: boolean, debug: string}|null>}
 */
export async function inspectTab(tabId) {
  try {
    const [injection] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: readOdooPage });
    return injection?.result ?? null;
  } catch {
    // Page non scriptable (chrome://, Web Store, PDF, onglet fermé…) : pas une page Odoo
    return null;
  }
}

/**
 * Affiche l'icône colorée (debug actif) ou grise pour l'onglet. Chrome remet l'icône
 * par défaut (grise) à chaque chargement de page.
 * @param {number} tabId - Identifiant de l'onglet
 * @param {boolean} isActive - Debug actif
 */
export async function setDebugIcon(tabId, isActive) {
  const suffix = isActive ? '' : '_gray';
  try {
    await chrome.action.setIcon({
      tabId,
      path: { 16: `img/icons/icon16${suffix}.png`, 48: `img/icons/icon48${suffix}.png`, 128: `img/icons/icon128${suffix}.png` },
    });
  } catch {
    // Onglet fermé entre-temps
  }
}
