/**
 * Utilitaire centralisé pour la détection des pages Odoo
 * @author David B.
 */

import { browserAPI } from "../core/browser.js";
import { OdooInterface, isBackendUrl, isPosUrl } from "../core/odoo.js";

// Fonction d'injection DOM — définie inline pour éviter toute transformation webpack.
// Doit être self-contained : pas de référence à des variables extérieures.
function buildDetectFunc() {
  return () => {
    try {
      // window.odoo global = JS Odoo chargé (présent sur toutes les pages Odoo)
      const odoo = typeof window.odoo !== 'undefined' ? window.odoo : null;

      // o_web_client = WebClient monté (backend ou site via barre admin)
      const hasWebClient = document.body.classList.contains('o_web_client');

      // État debug lu directement depuis Odoo (source autoritaire)
      const debugValue = (odoo && odoo.debug) ? String(odoo.debug) : '';

      // Détection POS
      const hasPosClass = document.body.classList.contains('pos');
      const urlLower = window.location.href.toLowerCase();
      const hasPosInUrl = urlLower.includes('/pos/') || urlLower.includes('/pos/ui');
      const hasPosElement = !!(
        document.querySelector('.pos-content') ||
        document.querySelector('#pos_root') ||
        document.querySelector('.pos_root')
      );
      const isPOS = hasPosClass || hasPosInUrl || hasPosElement;

      // Est-ce une page Odoo ?
      const isOdoo = !!odoo || hasWebClient || isPOS;

      // Type d'interface
      let interfaceType = 'unknown';
      if (isPOS) interfaceType = 'pos';
      else if (hasWebClient) interfaceType = 'backend';
      else if (isOdoo) interfaceType = 'website';

      return {
        isOdoo,
        interfaceType,
        isPOS,
        debugValue,
        isDebugActive: !!debugValue,
        debugMode: debugValue === 'assets' ? 'assets' : 'normal'
      };
    } catch (e) {
      return {
        isOdoo: false,
        interfaceType: 'unknown',
        isPOS: false,
        debugValue: '',
        isDebugActive: false,
        debugMode: 'normal'
      };
    }
  };
}

/**
 * Détecte si la page courante est une page Odoo (utilisé par le service worker)
 */
export async function detectOdooPage(tabId) {
  const defaultResult = { isOdoo: false, interfaceType: OdooInterface.UNKNOWN, isPOS: false };
  if (!tabId) return defaultResult;

  try {
    const results = await browserAPI.scripting.executeScript({
      target: { tabId },
      func: buildDetectFunc()
    });

    if (!results?.[0]?.result) return defaultResult;
    const { isOdoo, interfaceType, isPOS } = results[0].result;
    return { isOdoo, interfaceType, isPOS };
  } catch (error) {
    if (!error?.message?.includes('Cannot access')) {
      console.error('[Detector] Error detecting Odoo page:', error.message);
    }
    return defaultResult;
  }
}

/**
 * Détermine si une page Odoo est valide et si le debug peut être auto-activé
 * (utilisé par le service worker)
 */
export function isValidOdooPage(isOdooScript, isPOS, url) {
  const result = { isValid: false, shouldAutoEnable: false, isWebsite: false };

  try {
    const urlObj = new URL(url);
    const pathLower = urlObj.pathname.toLowerCase();

    const isPosUrlMatch = pathLower === '/pos' ||
                          pathLower.startsWith('/pos/') ||
                          urlObj.searchParams.has('config_id');

    if (isPosUrlMatch || isPOS) {
      result.isValid = true;
      result.shouldAutoEnable = true;
      return result;
    }

    if (isOdooScript) {
      result.isValid = true;
      if (!isBackendUrl(url)) {
        result.isWebsite = true;
      } else {
        result.shouldAutoEnable = true;
      }
      return result;
    }

    if (urlObj.hostname.includes('odoo.com') ||
        urlObj.hostname.includes('runbot') ||
        urlObj.hostname.includes('odoo.sh') ||
        pathLower.includes('/odoo') ||
        pathLower.includes('/web')) {
      result.isValid = true;
      if (pathLower === '/' || (!pathLower.startsWith('/web/') && !pathLower.startsWith('/odoo/'))) {
        result.isWebsite = true;
      } else {
        result.shouldAutoEnable = true;
      }
    }

    return result;
  } catch (error) {
    if (isOdooScript || isPOS) {
      result.isValid = true;
      result.shouldAutoEnable = true;
    }
    return result;
  }
}

/**
 * Analyse complète du contexte Odoo pour le popup
 * Source primaire : DOM (window.odoo + o_web_client)
 */
export async function analyzeOdooContext(url, tabId) {
  const defaultResult = {
    isOdoo: false,
    isBackend: false,
    isWebsite: false,
    isPOS: false,
    isDebugActive: false,
    debugMode: 'normal'
  };

  if (!url || !tabId) return defaultResult;

  try {
    // Fast-path POS
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    if (path === '/pos' || path.startsWith('/pos/')) {
      return { isOdoo: true, isBackend: true, isWebsite: false, isPOS: true, isDebugActive: false, debugMode: 'normal' };
    }

    // Détection principale via DOM (fonction inline = webpack-safe)
    const results = await browserAPI.scripting.executeScript({
      target: { tabId },
      func: buildDetectFunc()
    });

    if (!results?.[0]?.result) return defaultResult;

    const { isOdoo, interfaceType, isPOS, isDebugActive, debugMode } = results[0].result;

    if (!isOdoo) return defaultResult;

    return {
      isOdoo: true,
      isBackend: interfaceType === 'backend' || interfaceType === 'pos',
      isWebsite: interfaceType === 'website',
      isPOS,
      isDebugActive,
      debugMode
    };
  } catch (error) {
    if (!error?.message?.includes('Cannot access')) {
      console.error('[Detector] Error analyzing Odoo context:', error.message);
    }
    return defaultResult;
  }
}
