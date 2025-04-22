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
 * Vérifie si la page courante est une page Odoo en cherchant les marqueurs spécifiques
 * @param {number} tabId - Identifiant de l'onglet
 * @returns {Promise<{isOdoo: boolean, isBackend: boolean}>} - Résultat de détection
 */
async function isOdooPage(tabId) {
  if (!tabId) return { isOdoo: false, isBackend: false };
  
  try {
    const [result] = await browserAPI.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Chercher la balise script spécifique à Odoo
        const hasOdooScript = !!document.querySelector('script#web\\.layout\\.odooscript');
        
        // Si on a trouvé la balise, c'est bien une page Odoo
        // mais on ne peut savoir si c'est un backend sans vérifier l'URL
        return { 
          isOdoo: hasOdooScript,
          // isBackend sera déterminé par l'URL dans isOdooContext
          isBackend: false 
        };
      }
    });
    
    return result && result.result ? result.result : { isOdoo: false, isBackend: false };
  } catch (error) {
    console.error('[Popup] Error checking if page is Odoo:', error.message);
    return { isOdoo: false, isBackend: false };
  }
}

/**
 * Vérifie si l'URL est une URL backend Odoo standard
 * @param {string} url - URL à vérifier
 * @returns {boolean} - True si l'URL contient /web ou /odoo
 */
function isBackendUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Liste des chemins standards pour le backend Odoo
    const backendPaths = ['/web', '/odoo'];
    
    // Vérifier si l'URL contient un des chemins backend
    return backendPaths.some(path => 
      urlObj.pathname.toLowerCase().startsWith(path.toLowerCase())
    );
  } catch (error) {
    console.error('[Popup] Error checking backend URL:', error.message);
    return false;
  }
}

/**
 * Vérifie si c'est une page ou une URL Odoo valide, et si c'est un backend
 * @param {string} url - URL de la page
 * @param {number} tabId - Identifiant de l'onglet
 * @returns {Promise<{isOdoo: boolean, isBackend: boolean}>} - Résultat de détection
 */
async function isOdooContext(url, tabId) {
  // Vérifier d'abord si c'est une page Odoo en examinant le DOM (méthode la plus fiable)
  const domResult = await isOdooPage(tabId);
  
  // Vérifier si l'URL est une URL backend
  const hasBackendUrl = isBackendUrl(url);
  
  // Si le DOM confirme que c'est Odoo
  if (domResult.isOdoo) {
    // C'est un backend seulement si l'URL a le bon format (/web ou /odoo)
    return { 
      isOdoo: true,
      isBackend: hasBackendUrl 
    };
  }
  
  // Si le DOM ne confirme pas, mais que l'URL est une URL backend standard
  if (hasBackendUrl) {
    return { 
      isOdoo: true,
      isBackend: true 
    };
  }
  
  // Sinon ce n'est pas une page Odoo pour notre extension
  return { 
    isOdoo: false,
    isBackend: false 
  };
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
 * Met à jour l'interface utilisateur en fonction de l'état actuel
 * Gère les différents modes de debug et l'état des toggles
 * 
 * @param {Object} data - Les données d'état
 * @param {boolean} data.isOdoo - Indique si c'est une page Odoo
 * @param {boolean} data.isBackend - Indique si c'est une page backend
 * @param {boolean} data.debug - État du debug normal
 * @param {boolean} data.debugAssets - État du debug assets
 * @param {boolean} data.htmlInspector - État de l'inspecteur HTML
 */
function updateInterface(data) {
  const { isOdoo, isBackend, debug, debugAssets, htmlInspector } = data;
  
  // Récupérer les éléments DOM
  const debugToggle = document.getElementById('debug-toggle');
  const debugAssetsToggle = document.getElementById('debug-assets-toggle');
  const htmlInspectorToggle = document.getElementById('html-inspector-toggle');
  
  // Réinitialiser les classes du body
  document.body.classList.remove('odoo', 'backend');
  
  // Masquer tous les conteneurs par défaut
  document.querySelector('.disabled-info').style.display = 'none';
  document.querySelector('.website-info').style.display = 'none';
  document.getElementById('debug-container').style.display = 'none';
  document.getElementById('debug-assets-container').style.display = 'none';
  document.querySelector('.debug-tools').style.display = 'none';
  document.querySelector('.separator').style.display = 'none';
  
  if (isOdoo) {
    document.body.classList.add('odoo');
    
    if (isBackend) {
      // Site Odoo backend - Activer tous les contrôles
      document.body.classList.add('backend');
      document.getElementById('debug-container').style.display = 'flex';
      document.getElementById('debug-assets-container').style.display = 'flex';
      document.querySelector('.debug-tools').style.display = 'block';
      document.querySelector('.separator').style.display = 'block';
      
      // Mise à jour des états des toggles
      debugToggle.checked = debug;
      debugAssetsToggle.checked = debugAssets;
      htmlInspectorToggle.checked = htmlInspector;
      
      // Activer les contrôles
      debugToggle.disabled = false;
      debugAssetsToggle.disabled = false;
      htmlInspectorToggle.disabled = false;
    } else {
      // Site Odoo website - Afficher message d'information website
      document.querySelector('.website-info').style.display = 'block';
      
      // Désactiver tous les contrôles
      debugToggle.checked = false;
      debugAssetsToggle.checked = false;
      htmlInspectorToggle.checked = false;
      debugToggle.disabled = true;
      debugAssetsToggle.disabled = true;
      htmlInspectorToggle.disabled = true;
    }
  } else {
    // Site non-Odoo - Afficher message d'information disabled
    document.querySelector('.disabled-info').style.display = 'block';
    
    // Désactiver tous les contrôles
    debugToggle.checked = false;
    debugAssetsToggle.checked = false;
    htmlInspectorToggle.checked = false;
    debugToggle.disabled = true;
    debugAssetsToggle.disabled = true;
    htmlInspectorToggle.disabled = true;
  }
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
  // Récupération des éléments DOM
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
    const { isOdoo, isBackend } = await isOdooContext(tab.url, tab.id);
    
    // Variables pour stocker l'état du debug
    let isDebugEnabled = false;
    let debugMode = 'normal';
    
    // Détecter le mode de debug à partir de l'URL
    if (tab.url && tab.url.includes('debug=assets')) {
      isDebugEnabled = true;
      debugMode = 'assets';
    } else if (tab.url && tab.url.includes('debug=1')) {
      isDebugEnabled = true;
      debugMode = 'normal';
    }
    
    // Si l'URL n'indique pas debug=1 ou debug=assets, vérifier avec le service worker
    if (!isDebugEnabled && isBackend) {
      const state = await StateManager.getDebugState(tab.id);
      isDebugEnabled = state.enabled;
      debugMode = state.mode;
    }
    
    // Mettre à jour l'état du debug dans le service worker
    if (isBackend) {
      await StateManager.handleDebugState(tab.id, isDebugEnabled, debugMode);
    }
    
    // Vérifier l'état actuel de l'inspecteur HTML
    const isHtmlInspectorEnabled = await checkHtmlInspectorState(tab.id);
    
    // Mettre à jour l'interface utilisateur
    updateInterface({
      isOdoo, 
      isBackend, 
      debug: isDebugEnabled && debugMode === 'normal',
      debugAssets: isDebugEnabled && debugMode === 'assets',
      htmlInspector: isHtmlInspectorEnabled
    });
    
    // Fonction pour s'assurer que les toggles de debug sont mutuellement exclusifs
    const updateToggles = (activeToggle, inactiveToggle) => {
      if (activeToggle.checked) {
        inactiveToggle.checked = false;
      }
    };
    
    // === ÉCOUTEURS D'ÉVÉNEMENTS ===
    
    // Toggle Debug Mode Normal
    debugToggle.addEventListener('change', async () => {
      try {
        if (!tab.url) {
          console.error('[Popup] Tab URL is undefined');
          debugToggle.checked = !debugToggle.checked; // Revenir à l'état précédent
          return;
        }
        
        // Vérifier à nouveau si c'est une page/URL Odoo
        const { isOdoo, isBackend } = await isOdooContext(tab.url, tab.id);
        if (!isOdoo || !isBackend) {
          console.error('[Popup] Not a valid Odoo backend URL');
          debugToggle.checked = false;
          return;
        }
        
        // Si on active le mode debug normal, désactiver le mode debug assets
        if (debugToggle.checked) {
          updateToggles(debugToggle, debugAssetsToggle);
        }
        
        // Générer la nouvelle URL avec le paramètre debug approprié
        const newUrl = handleDebugParameter(tab.url, debugToggle.checked, 'normal');
        
        // Mettre à jour l'état dans le service worker
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
    
    // Toggle Debug Mode Assets
    debugAssetsToggle.addEventListener('change', async () => {
      try {
        if (!tab.url) {
          console.error('[Popup] Tab URL is undefined');
          debugAssetsToggle.checked = !debugAssetsToggle.checked; // Revenir à l'état précédent
          return;
        }
        
        // Vérifier à nouveau si c'est une page/URL Odoo
        const { isOdoo, isBackend } = await isOdooContext(tab.url, tab.id);
        if (!isOdoo || !isBackend) {
          console.error('[Popup] Not a valid Odoo backend URL');
          debugAssetsToggle.checked = false;
          return;
        }
        
        // Si on active le mode debug assets, désactiver le mode debug normal
        if (debugAssetsToggle.checked) {
          updateToggles(debugAssetsToggle, debugToggle);
        }
        
        // Générer la nouvelle URL avec le paramètre debug approprié
        const newUrl = handleDebugParameter(tab.url, debugAssetsToggle.checked, 'assets');
        
        // Mettre à jour l'état dans le service worker
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
        // Vérifier à nouveau si c'est une page/URL Odoo
        const { isOdoo, isBackend } = await isOdooContext(tab.url, tab.id);
        if (!isOdoo || !isBackend) {
          console.error('[Popup] Not a valid Odoo backend URL');
          htmlInspectorToggle.checked = false;
          return;
        }
        
        // Empêcher l'activation de l'inspecteur HTML si aucun mode debug n'est actif
        if (htmlInspectorToggle.checked && !debugToggle.checked && !debugAssetsToggle.checked) {
          console.error('[Popup] Le mode debug doit être activé pour utiliser l\'inspecteur HTML');
          htmlInspectorToggle.checked = false;
          return;
        }
        
        // Basculer l'état de l'inspecteur HTML
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