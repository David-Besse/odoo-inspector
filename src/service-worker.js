/**
 * Service Worker principal pour l'extension Odoo Inspector
 * Gère l'état global et les événements du navigateur
 * @author David B.
 */

import { browserAPI } from "./core/browser.js";
import { getIconPath } from "./core/icon-utils.js";
import { detectOdooPage, isValidOdooPage } from "./utils/detector.js";
import {
  isDebugExplicitlyDisabled,
  getDebugStateFromURL,
  handleDebugParameter
} from "./utils/debug-utils.js";

// Initialization checks
if (!browserAPI?.action || !browserAPI?.tabs || !browserAPI?.scripting) {
  console.error("[ServiceWorker] Required browser APIs are not available");
  throw new Error("Browser APIs not available");
}

// Check Chrome version
const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1];
if (chromeVersion && parseInt(chromeVersion) < 88) {
  console.error("[ServiceWorker] Chrome version 88 or higher is required");
  throw new Error("Unsupported Chrome version");
}

// Stockage local pour le service worker
// Stocke pour chaque onglet: {enabled: boolean, mode: string ('normal' ou 'assets')}
const debugStates = new Map(); // {tabId: {enabled: boolean, mode: string}}

/**
 * Met à jour l'icône directement depuis le service worker
 * @param {number} tabId - Identifiant de l'onglet
 * @param {boolean} isDebugEnabled - Indique si le mode debug est activé
 */
function updateIconDirectly(tabId, isDebugEnabled) {
  try {
    if (!tabId) {
      console.warn("[ServiceWorker] TabId is required to update icon directly");
      return;
    }
    
    console.log(`[ServiceWorker] Updating icon for tab ${tabId}, debug ${isDebugEnabled ? 'enabled' : 'disabled'}`);
    const iconPath = getIconPath(isDebugEnabled);

    if (browserAPI?.action?.setIcon) {
      browserAPI.action.setIcon({ 
        tabId: tabId,
        path: iconPath 
      });
    } else if (browserAPI?.browserAction?.setIcon) {
      browserAPI.browserAction.setIcon({ 
        tabId: tabId,
        path: iconPath 
      });
    }
  } catch (error) {
    console.error(`[ServiceWorker] Error updating icon for tab ${tabId}:`, error.message);
  }
}

// Listen for tab updates
browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab?.url?.startsWith('http')) return;

  try {
    // Fast path: URL already contains the debug state (SPA navigation or explicit parameter)
    const urlDebugState = getDebugStateFromURL(tab.url);
    if (urlDebugState !== null) {
      debugStates.set(tabId, { enabled: urlDebugState.enabled, mode: urlDebugState.mode });
      updateIconDirectly(tabId, urlDebugState.enabled);
      return;
    }

    // DOM detection: only safe after page is fully loaded
    if (changeInfo.status !== 'complete') return;

    const previousState = debugStates.get(tabId) || null;

    const { isOdoo, isPOS } = await detectOdooPage(tabId);
    const { isValid, shouldAutoEnable } = isValidOdooPage(isOdoo, isPOS, tab.url);

    if (!isValid) {
      debugStates.set(tabId, { enabled: false, mode: 'normal' });
      updateIconDirectly(tabId, false);
      return;
    }

    if (shouldAutoEnable && !isDebugExplicitlyDisabled(tab.url)) {
      // Preserve previous mode if any, else default to normal
      const mode = previousState?.mode || 'normal';
      const newUrl = handleDebugParameter(tab.url, true, mode);
      if (newUrl !== tab.url) {
        debugStates.set(tabId, { enabled: true, mode });
        browserAPI.tabs.update(tabId, { url: newUrl });
        return;
      }
    }

    debugStates.set(tabId, { enabled: false, mode: 'normal' });
    updateIconDirectly(tabId, false);
  } catch (error) {
    console.error(`[ServiceWorker] Error handling tab update for ${tabId}:`, error.message);
    if (!debugStates.has(tabId)) debugStates.set(tabId, { enabled: false, mode: 'normal' });
  }
});

// Écouter les messages du popup
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (!message || !message.type) {
      sendResponse({ error: "Invalid message format" });
      return true;
    }

    switch (message.type) {
      case 'SET_DEBUG_STATE': {
        const { tabId, state, mode = 'normal' } = message;
        if (tabId === undefined) {
          sendResponse({ error: "Missing tabId parameter" });
          return true;
        }
        
        // Mettre à jour l'état dans notre Map
        debugStates.set(tabId, { 
          enabled: !!state, 
          mode: mode || 'normal' 
        });
        
        // Mettre à jour l'icône directement
        updateIconDirectly(tabId, !!state);
        
        sendResponse({ success: true });
        break;
      }
      
      case 'GET_DEBUG_STATE': {
        const { tabId } = message;
        if (tabId === undefined) {
          sendResponse({ error: "Missing tabId parameter" });
          return true;
        }
        
        // Récupérer l'état stocké dans notre Map
        const debugState = debugStates.has(tabId) 
          ? debugStates.get(tabId) 
          : { enabled: false, mode: 'normal' };
          
        sendResponse({ 
          state: debugState.enabled,
          mode: debugState.mode 
        });
        break;
      }
      
      default:
        sendResponse({ error: `Unknown message type: ${message.type}` });
    }
  } catch (error) {
    console.error(`[ServiceWorker] Error processing message:`, error.message);
    sendResponse({ error: error.message });
  }
  
  return true; // Indique que la réponse sera envoyée de façon asynchrone
});

// Nettoyer les états lorsque l'extension est désactivée
browserAPI.runtime.onSuspend.addListener(() => {
  debugStates.clear();
});

// Update icon when switching tabs
browserAPI.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tabId = activeInfo.tabId;

    if (debugStates.has(tabId)) {
      updateIconDirectly(tabId, debugStates.get(tabId).enabled);
      return;
    }

    const tab = await browserAPI.tabs.get(tabId);
    if (!tab?.url) return;

    const urlDebugState = getDebugStateFromURL(tab.url);
    if (urlDebugState !== null) {
      debugStates.set(tabId, { enabled: urlDebugState.enabled, mode: urlDebugState.mode });
      updateIconDirectly(tabId, urlDebugState.enabled);
    } else {
      updateIconDirectly(tabId, false);
    }
  } catch (error) {
    console.error(`[ServiceWorker] Error handling tab activation:`, error.message);
  }
});
