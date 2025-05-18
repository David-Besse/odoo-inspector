/**
 * Interface popup de l'extension Odoo Inspector
 * Gère l'interaction utilisateur et les actions principales
 * Prend en charge les différents modes de debug (normal et avec assets)
 * @author David B.
 */

import { HTMLInspector } from './managers/html-inspector.js';
import { browserAPI } from './core/browser.js';
import { StateManager } from './managers/state-manager.js';
import { analyzeOdooContext } from './utils/detector.js';
import { 
  getDebugStateFromURL, 
  handleDebugParameter 
} from './utils/debug-utils.js';

/**
 * Vérifie l'état actuel de l'inspecteur HTML
 * @param {number} tabId - Identifiant de l'onglet
 * @returns {Promise<boolean>} - Indique si l'inspecteur HTML est activé
 */
async function checkHtmlInspectorState(tabId) {
  if (!tabId) return false;
  
  try {
    const [result] = await browserAPI.scripting.executeScript({
      target: { tabId },
      func: () => {
        const style = document.getElementById('html-inspector-style');
        return !!style;
      }
    });
    
    return result && result.result;
  } catch (error) {
    console.error('[Popup] Error checking HTML inspector state:', error.message);
    return false;
  }
}

/**
 * Met à jour l'interface utilisateur en fonction de l'état actuel
 * Gère les différents modes de debug et l'état des toggles
 * 
 * @param {Object} data - Les données d'état
 * @param {boolean} data.isOdoo - Indique si c'est une page Odoo
 * @param {boolean} data.isBackend - Indique si c'est une page backend
 * @param {boolean} data.isWebsite - Indique si c'est une page website
 * @param {boolean} data.isPOS - Indique si c'est une page Point of Sale
 * @param {boolean} data.debug - État du debug normal
 * @param {boolean} data.debugAssets - État du debug assets
 * @param {boolean} data.htmlInspector - État de l'inspecteur HTML
 */
function updateInterface(data) {
  const { isOdoo, isBackend, isWebsite, isPOS, debug, debugAssets, htmlInspector } = data;
  
  // Logs pour debug
  console.log('[Popup] updateInterface - Data:', data);
  
  // Récupérer les éléments DOM
  const debugToggle = document.getElementById('debug-toggle');
  const debugAssetsToggle = document.getElementById('debug-assets-toggle');
  const htmlInspectorToggle = document.getElementById('html-inspector-toggle');
  const debugContainer = document.getElementById('debug-container');
  const debugAssetsContainer = document.getElementById('debug-assets-container');
  const debugTools = document.querySelector('.debug-tools');
  const disabledInfo = document.querySelector('.disabled-info');
  const websiteInfo = document.querySelector('.website-info');
  
  // Réinitialiser les classes du body
  document.body.classList.remove('odoo', 'backend', 'website', 'pos');
  
  // Masquer tous les conteneurs par défaut
  disabledInfo.style.display = 'none';
  websiteInfo.style.display = 'none';
  debugContainer.style.display = 'none';
  debugAssetsContainer.style.display = 'none';
  debugTools.style.display = 'none';
  
  // Si ce n'est pas une page Odoo, afficher le message approprié
  if (!isOdoo) {
    console.log('[Popup] Not an Odoo page');
    document.body.classList.add('disabled');
    disabledInfo.style.display = 'block';
    return;
  }
  
  // Ajouter la classe odoo au body
  document.body.classList.add('odoo');
  console.log('[Popup] Odoo page detected');
  
  // Traitement spécial pour POS - prioritaire sur les autres
  if (isPOS) {
    console.log('[Popup] POS interface detected');
    document.body.classList.add('backend', 'pos');
    debugContainer.style.display = 'flex';
    debugAssetsContainer.style.display = 'flex';
    
    if (debugToggle) debugToggle.checked = debug;
    if (debugAssetsToggle) debugAssetsToggle.checked = debugAssets;
    
    // Afficher les outils de debug si le debug est activé
    if (debug || debugAssets) {
      debugTools.style.display = 'block';
      if (htmlInspectorToggle) htmlInspectorToggle.checked = htmlInspector;
    }
    
    return;
  }
  
  // Page website
  if (isWebsite) {
    console.log('[Popup] Website interface detected');
    document.body.classList.add('website');
    websiteInfo.style.display = 'block';
    return;
  }
  
  // Backend standard (non-POS)
  if (isBackend) {
    console.log('[Popup] Backend interface detected');
    document.body.classList.add('backend');
    
    // Afficher le conteneur du debug normal
    debugContainer.style.display = 'flex';
    if (debugToggle) debugToggle.checked = debug;
    
    // Afficher le conteneur du debug assets
    debugAssetsContainer.style.display = 'flex';
    if (debugAssetsToggle) debugAssetsToggle.checked = debugAssets;
    
    // Afficher les outils de debug si le debug est activé
    if (debug || debugAssets) {
      debugTools.style.display = 'block';
      if (htmlInspectorToggle) htmlInspectorToggle.checked = htmlInspector;
    }
    
    return;
  }
  
  // Si on arrive ici, c'est un cas non géré - montrer l'interface de base
  console.log('[Popup] Unhandled Odoo interface type');
  document.body.classList.add('disabled');
  disabledInfo.style.display = 'block';
}

/**
 * Détecte le contexte Odoo pour la page courante
 * @param {string} url - URL de la page
 * @param {number} tabId - ID de l'onglet
 * @returns {Promise<Object>} Informations sur le contexte Odoo
 */
async function detectOdooContext(url, tabId) {
  // Par défaut, considérer que ce n'est pas une page Odoo
  const defaultContext = {
    isOdoo: false,
    isBackend: false,
    isWebsite: false,
    isPOS: false
  };
  
  if (!url || !tabId) {
    return defaultContext;
  }
  
  try {
    // Analyser le contexte Odoo (détecte le type de page)
    return await analyzeOdooContext(url, tabId);
  } catch (error) {
    console.error('[Popup] Error analyzing Odoo context:', error.message);
    return defaultContext;
  }
}

/**
 * Récupère l'état du debug actuel, depuis le service worker ou l'URL
 * @param {number} tabId - ID de l'onglet
 * @param {string} url - URL de la page
 * @returns {Promise<Object>} État du debug {enabled, mode}
 */
async function getDebugStatus(tabId, url) {
  // État par défaut
  const defaultState = { 
    enabled: false, 
    mode: 'normal' 
  };
  
  if (!tabId || !url) {
    return defaultState;
  }
  
  try {
    // Essayer d'abord de récupérer l'état depuis le service worker
    const state = await StateManager.getDebugState(tabId);
    
    // Si un état valide est trouvé, le retourner
    if (state && state.enabled !== undefined) {
      return {
        enabled: state.enabled,
        mode: state.mode || 'normal'
      };
    }
    
    // Sinon, essayer de déduire l'état de l'URL
    const urlState = getDebugStateFromURL(url);
    if (urlState) {
      return {
        enabled: urlState.enabled,
        mode: urlState.mode
      };
    }
    
    // Si aucune information n'est disponible, retourner l'état par défaut
    return defaultState;
  } catch (error) {
    console.error('[Popup] Error getting debug state:', error.message);
    
    // En cas d'erreur, tenter de déduire l'état de l'URL
    const urlState = getDebugStateFromURL(url);
    if (urlState) {
      return {
        enabled: urlState.enabled,
        mode: urlState.mode
      };
    }
    
    return defaultState;
  }
}

/**
 * Met à jour l'URL de l'onglet avec le paramètre debug approprié
 * @param {string} url - URL actuelle
 * @param {number} tabId - ID de l'onglet
 * @param {boolean} isChecked - État du toggle
 * @param {boolean} withAssets - Indique si le mode assets est activé
 */
function updateTabURL(url, tabId, isChecked, withAssets = false) {
  try {
    if (!url || !tabId) return;
    
    const newUrl = handleDebugParameter(url, isChecked, withAssets ? 'assets' : 'normal');
    
    // Si l'URL a changé, mettre à jour l'onglet
    if (newUrl !== url) {
      browserAPI.tabs.update(tabId, { url: newUrl });
    }
  } catch (error) {
    console.error('[Popup] Error updating tab URL:', error.message);
  }
}

/**
 * Désactive un toggle si nécessaire
 * @param {HTMLElement} activeToggle - Toggle à activer
 * @param {HTMLElement} inactiveToggle - Toggle à désactiver
 * @param {number} tabId - ID de l'onglet
 * @returns {Promise<void>}
 */
async function updateToggles(activeToggle, inactiveToggle, tabId) {
  if (!inactiveToggle || !inactiveToggle.checked) {
    return;
  }
  
  // Désactiver le toggle
  inactiveToggle.checked = false;
  
  // Si c'est un toggle de debug, mettre à jour l'état
  if (inactiveToggle.id === 'debug-toggle' || inactiveToggle.id === 'debug-assets-toggle') {
    await StateManager.handleDebugState(tabId, false, 'normal');
  }
}

/**
 * Met à jour l'état du debug
 * @param {number} tabId - ID de l'onglet
 * @param {boolean} isEnabled - État du debug
 * @param {string} mode - Mode de debug ('normal' ou 'assets')
 * @returns {Promise<void>}
 */
async function updateDebugState(tabId, isEnabled, mode) {
  try {
    if (!tabId) return;
    
    console.log(`[Popup] updateDebugState - tabId: ${tabId}, isEnabled: ${isEnabled}, mode: ${mode}`);
    
    // Appeler le service worker pour mettre à jour l'état
    const result = await StateManager.handleDebugState(tabId, isEnabled, mode);
    console.log(`[Popup] updateDebugState - StateManager result: ${result ? 'success' : 'failure'}`);
    
    // Récupérer les toggles
    const debugToggle = document.getElementById('debug-toggle');
    const debugAssetsToggle = document.getElementById('debug-assets-toggle');
    const htmlInspectorToggle = document.getElementById('html-inspector-toggle');
    
    // Si on désactive le debug et que l'inspecteur HTML est activé, le désactiver aussi
    if (!isEnabled && htmlInspectorToggle && htmlInspectorToggle.checked) {
      console.log('[Popup] updateDebugState - Disabling HTML inspector');
      await HTMLInspector.disable(tabId);
      htmlInspectorToggle.checked = false;
    }
    
    // Mettre à jour l'affichage des outils de debug
    const toolsContainer = document.querySelector('.debug-tools');
    if (toolsContainer) {
      const shouldShow = (debugToggle && debugToggle.checked) || 
                         (debugAssetsToggle && debugAssetsToggle.checked);
      
      toolsContainer.style.display = shouldShow ? 'block' : 'none';
      console.log(`[Popup] updateDebugState - Debug tools ${shouldShow ? 'shown' : 'hidden'}`);
    }
  } catch (error) {
    console.error('[Popup] Error updating debug state:', error.message);
  }
}

/**
 * Configure les écouteurs d'événements pour les toggles
 * @param {HTMLElement} debugToggle - Toggle pour le debug normal
 * @param {HTMLElement} debugAssetsToggle - Toggle pour le debug assets
 * @param {HTMLElement} htmlInspectorToggle - Toggle pour l'inspecteur HTML
 * @param {number} tabId - ID de l'onglet
 * @param {string} tabUrl - URL de l'onglet
 */
function setupEventListeners(debugToggle, debugAssetsToggle, htmlInspectorToggle, tabId, tabUrl) {
  // Gestion du toggle de debug normal
  if (debugToggle) {
    debugToggle.addEventListener('change', async function () {
      const isChecked = this.checked;
      
      // Si on active le debug normal, désactiver le debug assets
      if (isChecked) {
        await updateToggles(debugToggle, debugAssetsToggle, tabId);
      }
      
      // Mettre à jour l'URL avec le paramètre debug approprié
      updateTabURL(tabUrl, tabId, isChecked);
      
      // Mettre à jour l'état du debug
      await updateDebugState(tabId, isChecked, 'normal');
    });
  }
  
  // Gestion du toggle de debug assets
  if (debugAssetsToggle) {
    debugAssetsToggle.addEventListener('change', async function () {
      const isChecked = this.checked;
      
      // Si on active le debug assets, désactiver le debug normal
      if (isChecked) {
        await updateToggles(debugAssetsToggle, debugToggle, tabId);
      }
      
      // Mettre à jour l'URL avec le paramètre debug=assets
      updateTabURL(tabUrl, tabId, isChecked, true);
      
      // Mettre à jour l'état du debug
      await updateDebugState(tabId, isChecked, 'assets');
    });
  }
  
  // Gestion du toggle de l'inspecteur HTML
  if (htmlInspectorToggle) {
    htmlInspectorToggle.addEventListener('change', async function () {
      try {
        const isChecked = this.checked;
        
        if (isChecked) {
          await HTMLInspector.enable(tabId);
        } else {
          await HTMLInspector.disable(tabId);
        }
      } catch (error) {
        console.error('[Popup] Error toggling HTML inspector:', error.message);
        this.checked = !this.checked; // Rétablir l'état précédent en cas d'erreur
      }
    });
  }
}

/**
 * Initialise la popup et prépare les écouteurs d'événements
 */
document.addEventListener('DOMContentLoaded', async function () {
  // Récupérer les éléments DOM
  const debugToggle = document.getElementById('debug-toggle');
  const debugAssetsToggle = document.getElementById('debug-assets-toggle');
  const htmlInspectorToggle = document.getElementById('html-inspector-toggle');
  
  // Obtenir l'onglet actif
  const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.id) {
    console.error('[Popup] No active tab found');
    updateInterface({ isOdoo: false });
    return;
  }
  
  const tabId = tab.id;
  const tabUrl = tab.url;
  
  console.log(`[Popup] Initializing for tab ${tabId}, URL: ${tabUrl}`);
  
  // Obtenir le contexte Odoo
  const odooContext = await detectOdooContext(tabUrl, tabId);
  console.log('[Popup] Odoo context detected:', odooContext);
  
  // Récupérer l'état du debug
  const debugStatus = await getDebugStatus(tabId, tabUrl);
  console.log('[Popup] Debug status:', debugStatus);
  
  // Vérifier si l'inspecteur HTML est activé
  const htmlInspectorEnabled = await checkHtmlInspectorState(tabId);
  
  // Mettre à jour l'interface utilisateur
  updateInterface({
    ...odooContext,
    debug: debugStatus.enabled && debugStatus.mode === 'normal',
    debugAssets: debugStatus.enabled && debugStatus.mode === 'assets',
    htmlInspector: htmlInspectorEnabled
  });
  
  // Configurer les écouteurs d'événements
  setupEventListeners(debugToggle, debugAssetsToggle, htmlInspectorToggle, tabId, tabUrl);
}); 