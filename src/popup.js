/**
 * Interface popup de l'extension Odoo Inspector
 * Gère l'interaction utilisateur et les actions principales
 * Prend en charge les différents modes de debug (normal et avec assets)
 * @author David B.
 */

import { handleDebugParameter } from './utils/url.js';
import { HTMLInspector } from './managers/html-inspector.js';
import { browserAPI } from './core/browser.js';
import { StateManager } from './managers/state-manager.js';
import { isValidOdooUrl } from './core/odoo.js';

/**
 * Vérifie si la page courante est une page Odoo en cherchant le script spécifique
 * @param {number} tabId - Identifiant de l'onglet
 * @returns {Promise<boolean>} - True si c'est une page Odoo, sinon False
 */
async function isOdooPage(tabId) {
  if (!tabId) return false;
  
  try {
    const [result] = await browserAPI.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Chercher la balise script spécifique à Odoo
        return !!document.querySelector('script#web\\.layout\\.odooscript');
      }
    });
    
    return result && result.result;
  } catch (error) {
    console.error('[Popup] Error checking if page is Odoo:', error.message);
    return false;
  }
}

/**
 * Vérifie si c'est une page ou une URL Odoo valide
 * @param {string} url - URL de la page
 * @param {number} tabId - Identifiant de l'onglet
 * @returns {Promise<boolean>} - True si c'est une page Odoo, sinon False
 */
async function isOdooContext(url, tabId) {
  // Vérifier d'abord si c'est une page Odoo en examinant le DOM (méthode la plus fiable)
  const isOdooDOM = await isOdooPage(tabId);
  
  // Si le DOM confirme que c'est Odoo, pas besoin de vérifier l'URL
  if (isOdooDOM) return true;
  
  // Sinon, vérifier l'URL comme solution de secours
  return isValidOdooUrl(url);
}

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
 * Fonction pour mettre à jour l'interface utilisateur en fonction de l'état actuel
 * Gère les différents modes de debug et l'état des toggles
 * @param {Object} elements - Éléments de l'interface utilisateur
 * @param {HTMLInputElement} elements.debugToggle - Toggle pour le debug normal
 * @param {HTMLInputElement} elements.debugAssetsToggle - Toggle pour le debug avec assets 
 * @param {HTMLInputElement} elements.htmlInspectorToggle - Toggle pour l'inspecteur HTML
 * @param {Object} state - État actuel
 * @param {boolean} state.isDebugEnabled - État du debug (activé ou non)
 * @param {string} state.debugMode - Mode du debug ('normal' ou 'assets')
 * @param {boolean} state.isOdooContext - Indique si le contexte est Odoo
 */
function updateInterface(elements, state) {
  const { debugToggle, debugAssetsToggle, htmlInspectorToggle } = elements;
  const { isDebugEnabled, debugMode, isOdooContext } = state;
  
  const debugContainer = document.getElementById('debug-container');
  const debugAssetsContainer = document.getElementById('debug-assets-container');
  const disabledInfo = document.querySelector('.disabled-info');
  const debugTools = document.querySelector('.debug-tools');
  const separator = document.querySelector('.separator');
  
  if (!isOdooContext) {
    // Ajouter la classe disabled au conteneur principal
    document.body.classList.add('disabled');
    debugContainer.classList.add('disabled');
    debugAssetsContainer.classList.add('disabled');
    
    // Afficher le message d'information
    if (disabledInfo) {
      disabledInfo.style.display = 'block';
    }
    
    // Désactiver les toggles
    if (debugToggle) {
      debugToggle.checked = false;
      debugToggle.disabled = true;
    }
    
    if (debugAssetsToggle) {
      debugAssetsToggle.checked = false;
      debugAssetsToggle.disabled = true;
    }
    
    if (htmlInspectorToggle) {
      htmlInspectorToggle.checked = false;
      htmlInspectorToggle.disabled = true;
    }
    
    // Cacher explicitement les éléments
    if (debugTools) debugTools.style.display = 'none';
    if (separator) separator.style.display = 'none';
    
    return;
  }
  
  // Si on est dans un contexte Odoo
  document.body.classList.remove('disabled');
  debugContainer.classList.remove('disabled');
  debugAssetsContainer.classList.remove('disabled');
  
  if (disabledInfo) {
    disabledInfo.style.display = 'none';
  }
  
  // Mettre à jour les toggles de debug
  if (debugToggle) {
    debugToggle.checked = isDebugEnabled && debugMode === 'normal';
    debugToggle.disabled = false;
  }
  
  if (debugAssetsToggle) {
    debugAssetsToggle.checked = isDebugEnabled && debugMode === 'assets';
    debugAssetsToggle.disabled = false;
  }
  
  if (htmlInspectorToggle) {
    htmlInspectorToggle.disabled = !isDebugEnabled;
    if (!isDebugEnabled) {
      htmlInspectorToggle.checked = false;
    }
  }
  
  // Réafficher les éléments sur une page Odoo
  if (separator) separator.style.display = 'block';
  if (debugTools) debugTools.style.display = 'block';
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
  const debugToggle = document.getElementById('debug-toggle');
  const debugAssetsToggle = document.getElementById('debug-assets-toggle');
  const htmlInspectorToggle = document.getElementById('html-inspector-toggle');
  
  // Vérifier que tous les éléments existent
  if (!debugToggle || !debugAssetsToggle || !htmlInspectorToggle) {
    console.error('[Popup] Un ou plusieurs éléments du popup sont manquants');
    return;
  }
  
  try {
    // Récupérer l'onglet courant
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      console.error('[Popup] No active tab found');
      return;
    }
    
    // Vérifier si c'est une page ou URL Odoo
    const isOdoo = await isOdooContext(tab.url, tab.id);
    
    // Vérifier l'état du debug depuis l'URL
    let isDebugEnabled = false;
    let debugMode = 'normal';
    
    // Déterminer le mode de debug à partir de l'URL
    if (tab.url && tab.url.includes('debug=assets')) {
      isDebugEnabled = true;
      debugMode = 'assets';
    } else if (tab.url && tab.url.includes('debug=1')) {
      isDebugEnabled = true;
      debugMode = 'normal';
    }
    
    // Si l'URL n'indique pas debug=1 ou debug=assets, vérifier avec le service worker
    if (!isDebugEnabled) {
      const state = await StateManager.getDebugState(tab.id);
      isDebugEnabled = state.enabled;
      debugMode = state.mode;
    }
    
    // Mettre à jour l'état du debug
    await StateManager.handleDebugState(tab.id, isDebugEnabled, debugMode);
    
    // Vérifier l'état actuel de l'inspecteur HTML
    const isHtmlInspectorEnabled = await checkHtmlInspectorState(tab.id);
    
    // Mettre à jour l'interface
    updateInterface(
      { debugToggle, debugAssetsToggle, htmlInspectorToggle },
      { isDebugEnabled, debugMode, isOdooContext: isOdoo }
    );
    
    htmlInspectorToggle.checked = isHtmlInspectorEnabled;
    
    // Fonction pour s'assurer que les toggles de debug sont mutuellement exclusifs
    const updateToggles = (activeToggle, inactiveToggle) => {
      if (activeToggle.checked) {
        inactiveToggle.checked = false;
      }
    };
    
    // Écouteurs d'événements
    
    // Toggle debug mode normal
    debugToggle.addEventListener('change', async () => {
      try {
        if (!tab.url) {
          console.error('[Popup] Tab URL is undefined');
          debugToggle.checked = !debugToggle.checked; // Revenir à l'état précédent
          return;
        }
        
        // Vérifier à nouveau si c'est une page/URL Odoo
        const isOdoo = await isOdooContext(tab.url, tab.id);
        if (!isOdoo) {
          console.error('[Popup] Not a valid Odoo context');
          debugToggle.checked = false;
          return;
        }
        
        // Si on active le mode debug normal, désactiver le mode debug assets
        if (debugToggle.checked) {
          updateToggles(debugToggle, debugAssetsToggle);
        }
        
        const newUrl = handleDebugParameter(tab.url, debugToggle.checked, 'normal');
        
        // Mettre à jour l'état dans le service worker via StateManager
        const isEnabled = debugToggle.checked;
        const mode = isEnabled ? 'normal' : 'normal'; // Le mode reste normal même si désactivé
        
        await StateManager.handleDebugState(tab.id, isEnabled, mode);
        
        // Mettre à jour l'URL de l'onglet et fermer le popup
        await browserAPI.tabs.update(tab.id, { url: newUrl });
        window.close();
      } catch (error) {
        console.error('[Popup] Error toggling debug mode:', error.message);
        debugToggle.checked = !debugToggle.checked;
      }
    });
    
    // Toggle debug mode avec assets
    debugAssetsToggle.addEventListener('change', async () => {
      try {
        if (!tab.url) {
          console.error('[Popup] Tab URL is undefined');
          debugAssetsToggle.checked = !debugAssetsToggle.checked; // Revenir à l'état précédent
          return;
        }
        
        // Vérifier à nouveau si c'est une page/URL Odoo
        const isOdoo = await isOdooContext(tab.url, tab.id);
        if (!isOdoo) {
          console.error('[Popup] Not a valid Odoo context');
          debugAssetsToggle.checked = false;
          return;
        }
        
        // Si on active le mode debug assets, désactiver le mode debug normal
        if (debugAssetsToggle.checked) {
          updateToggles(debugAssetsToggle, debugToggle);
        }
        
        const newUrl = handleDebugParameter(tab.url, debugAssetsToggle.checked, 'assets');
        
        // Mettre à jour l'état dans le service worker via StateManager
        const isEnabled = debugAssetsToggle.checked;
        const mode = isEnabled ? 'assets' : 'normal'; // Si désactivé, on revient au mode normal
        
        await StateManager.handleDebugState(tab.id, isEnabled, mode);
        
        // Mettre à jour l'URL de l'onglet et fermer le popup
        await browserAPI.tabs.update(tab.id, { url: newUrl });
        window.close();
      } catch (error) {
        console.error('[Popup] Error toggling debug assets mode:', error.message);
        debugAssetsToggle.checked = !debugAssetsToggle.checked;
      }
    });
    
    // Toggle HTML Inspector
    htmlInspectorToggle.addEventListener('change', async () => {
      if (!tab.id) {
        console.error('[Popup] Tab ID is undefined');
        htmlInspectorToggle.checked = !htmlInspectorToggle.checked; // Revenir à l'état précédent
        return;
      }
      
      try {
        // Vérifier que le debug est activé avant d'activer l'inspecteur HTML
        if (htmlInspectorToggle.checked && !debugToggle.checked && !debugAssetsToggle.checked) {
          console.error('[Popup] Cannot enable HTML inspector when debug mode is off');
          htmlInspectorToggle.checked = false;
          return;
        }
        
        await HTMLInspector.toggle(tab.id, htmlInspectorToggle.checked);
      } catch (error) {
        console.error('[Popup] Error toggling HTML inspector:', error.message);
        htmlInspectorToggle.checked = !htmlInspectorToggle.checked;
      }
    });
  } catch (error) {
    console.error('[Popup] Error initializing popup:', error.message);
  }
}); 