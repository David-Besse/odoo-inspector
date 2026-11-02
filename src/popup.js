/**
 * Popup : affiche le mode debug de l'onglet et permet d'en changer
 * @author David B.
 */

import { getDebugMode, inspectTab, isOdooAppPath, setDebugIcon, withDebug } from './odoo.js';

function show(selector) {
  document.querySelector(selector).style.display = 'block';
}

function setActiveSegment(mode) {
  document.querySelectorAll('.segment').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
}

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const page = tab?.url?.startsWith('http') ? await inspectTab(tab.id) : null;
  if (!page?.isOdoo) return show('.disabled-info');

  const url = new URL(tab.url);
  // Site web public : debug réservé au backend, au POS et au site consulté avec la barre d'admin
  if (!isOdooAppPath(url.pathname) && !page.hasWebClient) return show('.website-info');

  const currentMode = getDebugMode(page.debug || url.searchParams.get('debug'));
  setActiveSegment(currentMode);
  setDebugIcon(tab.id, currentMode !== 'off');
  show('.mode-selector');

  document.querySelectorAll('.segment').forEach(button => {
    button.addEventListener('click', async () => {
      const { mode, value } = button.dataset;
      if (mode !== currentMode) {
        setActiveSegment(mode);
        // Mémorise le choix pour ce domaine : le service worker ne réactivera pas le debug après un « Off »
        await chrome.storage.session.set({ [url.origin]: value });
        await chrome.tabs.update(tab.id, { url: withDebug(tab.url, value) });
      }
      window.close();
    });
  });
});
