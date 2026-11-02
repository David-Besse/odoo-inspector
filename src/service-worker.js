/**
 * Service worker : active automatiquement le debug sur le backend et le POS Odoo,
 * et tient l'icône à jour.
 * @author David B.
 */

import { getDebugMode, inspectTab, isOdooAppPath, setDebugIcon, withDebug } from './odoo.js';

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url?.startsWith('http')) return;

  const url = new URL(tab.url);
  // On n'injecte de script que sur les chemins de l'application Odoo, jamais sur les autres sites
  if (!isOdooAppPath(url.pathname)) return;

  const page = await inspectTab(tabId);
  if (!page?.isOdoo) return;

  const urlDebug = url.searchParams.get('debug');
  if (getDebugMode(page.debug || urlDebug) !== 'off') {
    setDebugIcon(tabId, true);
    return;
  }

  // Paramètre debug déjà présent (debug=0) ou debug coupé par l'utilisateur sur ce domaine :
  // on n'y touche pas. Le choix est gardé jusqu'à la fermeture du navigateur.
  if (urlDebug !== null) return;
  const { [url.origin]: choice } = await chrome.storage.session.get(url.origin);
  if (choice === '0') return;

  chrome.tabs.update(tabId, { url: withDebug(tab.url, choice || '1') });
});
