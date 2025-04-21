/**
 * Service Worker principal pour l'extension Odoo Inspector
 * Gère l'état global et les événements du navigateur
 * @author David B.
 */

import { browserAPI } from "./core/browser.js";
import { getIconPath } from "./core/icon-utils.js";

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
const debugStates = new Map();

/**
 * Met à jour l'icône directement depuis le service worker
 * @param {boolean} isDebugEnabled - Indique si le mode debug est activé
 */
function updateIconDirectly(isDebugEnabled) {
  try {
    const iconPath = getIconPath(isDebugEnabled);

    if (browserAPI?.action?.setIcon) {
      browserAPI.action.setIcon({ path: iconPath });
    } else if (browserAPI?.browserAction?.setIcon) {
      browserAPI.browserAction.setIcon({ path: iconPath });
    }
  } catch (error) {
    console.error("[ServiceWorker] Error updating icon directly:", error.message);
  }
}

// Listen for tab updates
browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Ignorer les mises à jour qui ne sont pas complètes ou les URLs non-HTTP
  if (changeInfo.status !== 'complete' || !tab?.url || !tab.url.startsWith('http')) {
    return;
  }

  try {
    // Vérifier d'abord si nous avons déjà un état stocké
    let isDebugEnabled = debugStates.has(tabId) 
      ? debugStates.get(tabId) 
      : tab.url.includes('debug=1');
    
    // Mettre à jour le stockage local
    debugStates.set(tabId, isDebugEnabled);
    
    // Mettre à jour l'icône directement
    updateIconDirectly(isDebugEnabled);
  } catch (error) {
    console.error(`[ServiceWorker] Error handling tab update for ${tabId}:`, error.message);
    // En cas d'erreur, on considère que le debug est désactivé
    debugStates.set(tabId, false);
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
        const { tabId, state } = message;
        if (tabId === undefined) {
          sendResponse({ error: "Missing tabId parameter" });
          return true;
        }
        
        // Mettre à jour l'état dans notre Map
        debugStates.set(tabId, !!state); // Conversion en booléen
        
        // Mettre à jour l'icône directement
        updateIconDirectly(!!state);
        
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
        const isDebugEnabled = debugStates.has(tabId) ? debugStates.get(tabId) : false;
        sendResponse({ state: isDebugEnabled });
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
