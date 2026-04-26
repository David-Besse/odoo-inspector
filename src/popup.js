/**
 * Interface popup de l'extension Odoo Inspector
 * @author David B.
 */

import { browserAPI } from './core/browser.js';
import { StateManager } from './managers/state-manager.js';
import { analyzeOdooContext } from './utils/detector.js';
import { handleDebugParameter } from './utils/debug-utils.js';

function setIconActive(isActive) {
  document.body.classList.toggle('debug-active', isActive);
}

function updateModeLabels(isAssets) {
  document.getElementById('label-debug')?.classList.toggle('active', !isAssets);
  document.getElementById('label-assets')?.classList.toggle('active', isAssets);
}

function updateInterface(data) {
  const { isOdoo, isBackend, isWebsite, isPOS, debug, debugAssets } = data;

  const modeSelector = document.getElementById('mode-selector');
  const modeToggle = document.getElementById('mode-toggle');
  const disabledInfo = document.querySelector('.disabled-info');
  const websiteInfo = document.querySelector('.website-info');

  document.body.classList.remove('odoo', 'backend', 'website', 'pos', 'disabled', 'debug-active');
  disabledInfo.style.display = 'none';
  websiteInfo.style.display = 'none';
  modeSelector.style.display = 'none';

  if (!isOdoo) {
    document.body.classList.add('disabled');
    disabledInfo.style.display = 'block';
    setIconActive(false);
    return;
  }

  document.body.classList.add('odoo');

  if (isWebsite) {
    document.body.classList.add('website');
    websiteInfo.style.display = 'block';
    setIconActive(false);
    return;
  }

  if (isBackend || isPOS) {
    document.body.classList.add('backend');
    if (isPOS) document.body.classList.add('pos');

    modeSelector.style.display = 'flex';

    const isActive = debug || debugAssets;
    const isAssets = !!debugAssets;

    setIconActive(isActive);
    if (modeToggle) {
      modeToggle.checked = isAssets;
      updateModeLabels(isAssets);
    }
    return;
  }

  document.body.classList.add('disabled');
  disabledInfo.style.display = 'block';
  setIconActive(false);
}

async function detectOdooContext(url, tabId) {
  const defaultContext = { isOdoo: false, isBackend: false, isWebsite: false, isPOS: false, isDebugActive: false, debugMode: 'normal' };
  if (!url || !tabId) return defaultContext;
  try {
    return await analyzeOdooContext(url, tabId);
  } catch (error) {
    console.error('[Popup] Error analyzing Odoo context:', error.message);
    return defaultContext;
  }
}

async function updateTabURL(tabId, isEnabled, withAssets = false) {
  try {
    if (!tabId) return;
    const tab = await browserAPI.tabs.get(tabId);
    const currentUrl = tab.url;
    const newUrl = handleDebugParameter(currentUrl, isEnabled, withAssets ? 'assets' : 'normal');
    if (newUrl !== currentUrl) browserAPI.tabs.update(tabId, { url: newUrl });
  } catch (error) {
    console.error('[Popup] Error updating tab URL:', error.message);
  }
}

async function updateDebugState(tabId, isEnabled, mode) {
  try {
    if (!tabId) return;
    await StateManager.handleDebugState(tabId, isEnabled, mode);
  } catch (error) {
    console.error('[Popup] Error updating debug state:', error.message);
  }
}

function setupEventListeners(tabId) {
  const modeToggle = document.getElementById('mode-toggle');

  if (modeToggle) {
    modeToggle.addEventListener('change', async function () {
      const isAssets = this.checked;
      updateModeLabels(isAssets);

      if (document.body.classList.contains('debug-active')) {
        await updateTabURL(tabId, true, isAssets);
        await updateDebugState(tabId, true, isAssets ? 'assets' : 'normal');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    updateInterface({ isOdoo: false });
    return;
  }

  const tabId = tab.id;
  const tabUrl = tab.url;

  const odooContext = await detectOdooContext(tabUrl, tabId);

  updateInterface({
    ...odooContext,
    debug: odooContext.isDebugActive && odooContext.debugMode === 'normal',
    debugAssets: odooContext.isDebugActive && odooContext.debugMode === 'assets'
  });

  setupEventListeners(tabId);
});
