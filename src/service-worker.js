/**
 * Service Worker principal pour l'extension Odoo Inspector
 * Gère l'état global et les événements du navigateur
 * @author David B.
 */

import { browserAPI } from "./core/browser.js";
import { getIconPath } from "./core/icon-utils.js";
import { detectOdooPage, isValidOdooPage } from "./utils/detector.js";
import { 
  hasActiveDebugParameter, 
  isDebugExplicitlyDisabled, 
  getDebugStateFromURL 
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
  // Nous voulons traiter les mises à jour d'URL même partielles pour maintenir le mode debug
  const shouldProcess = (changeInfo.status === 'complete' || changeInfo.url) && 
                        tab?.url && tab.url.startsWith('http');
  
  if (!shouldProcess) return;

  try {
    // Vérifier si nous avons déjà un état stocké pour cet onglet
    let previousState = debugStates.has(tabId) ? debugStates.get(tabId) : null;
    
    // Extraire l'état du debug directement depuis l'URL
    const urlDebugState = getDebugStateFromURL(tab.url);
    
    // Variables pour stocker l'état final
    let isDebugEnabled = false;
    let debugMode = 'normal';
    
    // Si l'URL contient un paramètre debug explicite, l'utiliser
    if (urlDebugState) {
      isDebugEnabled = urlDebugState.enabled;
      debugMode = urlDebugState.mode;
    } 
    // Si l'URL ne contient pas de paramètre debug et que nous avions un état précédent
    else if (previousState) {
      // On détecte si c'est une page Odoo
      const { isOdoo, isPOS } = await detectOdooPage(tabId);
      const { isValid, shouldAutoEnable } = isValidOdooPage(isOdoo, isPOS, tab.url);
      
      // Ne conserver l'état précédent que si c'est toujours une page Odoo valide
      // et que l'URL ne contient pas de paramètre debug
      if (isValid) {
        // IMPORTANT: Si changement d'URL détecté et que l'état précédent avait le debug activé,
        // vérifier si l'URL actuelle devrait avoir le debug activé
        if (changeInfo.url && previousState.enabled) {
          // Si la nouvelle URL ne contient pas de paramètre debug, on vérifie 
          // si on doit activer automatiquement le debug sur cette page
          isDebugEnabled = shouldAutoEnable;
          debugMode = previousState.mode; // Conserver le mode précédent
        } else {
          // Pas de changement d'URL ou debug non activé précédemment
          isDebugEnabled = previousState.enabled;
          debugMode = previousState.mode;
        }
      } else {
        // Si ce n'est plus une page Odoo valide, désactiver le debug
        isDebugEnabled = false;
      }
    }
    // Si pas d'état précédent et pas de paramètre debug dans l'URL, déterminer l'état initial
    else {
      // Détecter si c'est une page Odoo et son type
      const { isOdoo, isPOS } = await detectOdooPage(tabId);
      
      // Déterminer si c'est une page Odoo valide et si on doit activer automatiquement
      const { isValid, shouldAutoEnable } = isValidOdooPage(isOdoo, isPOS, tab.url);
      
      // Si c'est une page Odoo valide, considérer l'auto-activation
      if (isValid && shouldAutoEnable) {
        isDebugEnabled = true;
        debugMode = 'normal';
      }
    }
    
    // Mettre à jour le stockage local
    debugStates.set(tabId, { enabled: isDebugEnabled, mode: debugMode });
    
    // Mettre à jour l'icône directement
    updateIconDirectly(tabId, isDebugEnabled);
    
    // NOUVEAU: Si l'état a changé et que le debug est activé, mais que l'URL 
    // ne contient pas de paramètre debug, mettre à jour l'URL
    if (isDebugEnabled && !hasActiveDebugParameter(tab.url) && !isDebugExplicitlyDisabled(tab.url)) {
      // Construire la nouvelle URL avec le paramètre debug
      let newUrl = new URL(tab.url);
      
      // Supprimer tout paramètre debug existant
      if (newUrl.searchParams.has('debug')) {
        newUrl.searchParams.delete('debug');
      }
      
      // Ajouter le nouveau paramètre debug
      newUrl.searchParams.append('debug', debugMode === 'assets' ? 'assets' : '1');
      
      // Mettre à jour l'URL de l'onglet
      browserAPI.tabs.update(tabId, { url: newUrl.toString() });
    }
    // Si le debug est désactivé mais que l'URL contient encore un paramètre debug actif,
    // mettre à jour l'URL pour refléter l'état désactivé
    else if (!isDebugEnabled && hasActiveDebugParameter(tab.url)) {
      // Construire la nouvelle URL sans le paramètre debug
      let newUrl = new URL(tab.url);
      
      // Remplacer le paramètre debug par debug=0
      newUrl.searchParams.delete('debug');
      newUrl.searchParams.append('debug', '0');
      
      // Mettre à jour l'URL de l'onglet
      browserAPI.tabs.update(tabId, { url: newUrl.toString() });
    }
  } catch (error) {
    console.error(`[ServiceWorker] Error handling tab update for ${tabId}:`, error.message);
    // En cas d'erreur, garder l'état précédent si possible
    if (!debugStates.has(tabId)) {
      debugStates.set(tabId, { enabled: false, mode: 'normal' });
    }
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

// Également écouter les changements d'onglet actifs pour mettre à jour l'icône
browserAPI.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tabId = activeInfo.tabId;
    console.log(`[ServiceWorker] Tab activated: ${tabId}`);
    
    // Vérifier si nous avons un état stocké pour cet onglet
    if (debugStates.has(tabId)) {
      const state = debugStates.get(tabId);
      console.log(`[ServiceWorker] Found stored state for tab ${tabId}:`, state);
      
      // Mettre à jour l'icône pour refléter l'état de cet onglet
      updateIconDirectly(tabId, state.enabled);
    } else {
      // Si nous n'avons pas d'état stocké, essayer de déterminer l'état à partir de l'URL
      try {
        const tab = await browserAPI.tabs.get(tabId);
        if (tab && tab.url) {
          const urlDebugState = getDebugStateFromURL(tab.url);
          if (urlDebugState) {
            // Stocker et refléter l'état
            debugStates.set(tabId, { 
              enabled: urlDebugState.enabled, 
              mode: urlDebugState.mode 
            });
            updateIconDirectly(tabId, urlDebugState.enabled);
          } else {
            // Pas d'état dans l'URL, définir l'icône par défaut (désactivée)
            updateIconDirectly(tabId, false);
          }
        }
      } catch (tabError) {
        console.error(`[ServiceWorker] Error getting tab ${tabId}:`, tabError.message);
      }
    }
  } catch (error) {
    console.error(`[ServiceWorker] Error handling tab activation:`, error.message);
  }
});
