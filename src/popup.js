/**
 * Interface popup de l'extension Odoo Inspector
 * Gère l'interaction utilisateur et les actions principales
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
 * Fonction pour mettre à jour l'interface utilisateur
 * @param {HTMLInputElement} debugToggle - Élément d'interface pour le toggle de debug
 * @param {HTMLInputElement} htmlInspectorToggle - Élément d'interface pour le toggle de l'inspecteur HTML
 * @param {boolean} isDebugEnabled - État du debug
 * @param {boolean} isOdooContext - Indique si le contexte est Odoo
 */
function updateInterface(debugToggle, htmlInspectorToggle, isDebugEnabled, isOdooContext) {
  const debugContainer = document.getElementById('debug-container');
  const disabledInfo = document.querySelector('.disabled-info');
  const debugTools = document.querySelector('.debug-tools');
  const separator = document.querySelector('.separator');
  const menuItemContent = document.querySelector('#debug-container .menu-item-content');
  const debugSwitch = document.querySelector('#debug-container .switch');
  
  if (!isOdooContext) {
    // Ajouter la classe disabled au conteneur principal
    document.body.classList.add('disabled');
    debugContainer.classList.add('disabled');
    
    // Afficher le message d'information
    if (disabledInfo) {
      disabledInfo.style.display = 'block';
    }
    
    // Désactiver le toggle de debug
    if (debugToggle) {
      debugToggle.checked = false;
      debugToggle.disabled = true;
    }
    
    // Désactiver l'inspecteur HTML
    if (htmlInspectorToggle) {
      htmlInspectorToggle.checked = false;
      htmlInspectorToggle.disabled = true;
    }
    
    // Cacher explicitement les éléments
    if (debugTools) debugTools.style.display = 'none';
    if (separator) separator.style.display = 'none';
    if (menuItemContent) menuItemContent.style.display = 'none';
    if (debugSwitch) debugSwitch.style.display = 'none';
    
    return;
  }
  
  // Si on est dans un contexte Odoo
  document.body.classList.remove('disabled');
  debugContainer.classList.remove('disabled');
  
  if (disabledInfo) {
    disabledInfo.style.display = 'none';
  }
  
  if (debugToggle) {
    debugToggle.checked = isDebugEnabled;
    debugToggle.disabled = false;
  }
  
  if (htmlInspectorToggle) {
    htmlInspectorToggle.disabled = !isDebugEnabled;
    if (!isDebugEnabled) {
      htmlInspectorToggle.checked = false;
    }
  }
  
  // Réafficher les éléments sur une page Odoo
  if (separator) separator.style.display = 'block';
  if (menuItemContent) menuItemContent.style.display = 'flex';
  if (debugSwitch) debugSwitch.style.display = 'inline-block';
  if (debugTools) debugTools.style.display = 'block';
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
  const debugToggle = document.getElementById('debug-toggle');
  const htmlInspectorToggle = document.getElementById('html-inspector-toggle');
  
  // Vérifier que tous les éléments existent
  if (!debugToggle || !htmlInspectorToggle) {
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
    
    // Vérifier l'état du debug depuis l'URL et le service worker
    let isDebugEnabled = tab.url && tab.url.includes('debug=1');
    
    // Si l'URL n'indique pas debug=1, vérifier avec le service worker
    if (!isDebugEnabled) {
      isDebugEnabled = await StateManager.getDebugState(tab.id);
    }
    
    // Mettre à jour l'état du debug
    await StateManager.handleDebugState(tab.id, isDebugEnabled);
    
    // Vérifier l'état actuel de l'inspecteur HTML
    const isHtmlInspectorEnabled = await checkHtmlInspectorState(tab.id);
    
    // Mettre à jour l'interface
    updateInterface(debugToggle, htmlInspectorToggle, isDebugEnabled, isOdoo);
    htmlInspectorToggle.checked = isHtmlInspectorEnabled;
    
    // Écouteurs d'événements
    
    // Toggle debug mode
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
        
        const newUrl = handleDebugParameter(tab.url, debugToggle.checked);
        
        // Mettre à jour l'état dans le service worker via StateManager
        const success = await StateManager.handleDebugState(tab.id, debugToggle.checked);
        
        // Mettre à jour l'URL de l'onglet et fermer le popup
        await browserAPI.tabs.update(tab.id, { url: newUrl });
        window.close();
      } catch (error) {
        console.error('[Popup] Error toggling debug mode:', error.message);
        debugToggle.checked = !debugToggle.checked;
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
        if (htmlInspectorToggle.checked && !debugToggle.checked) {
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