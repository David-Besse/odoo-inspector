/**
 * Utilitaire centralisé pour la détection des pages Odoo
 * Évite la duplication de code entre le service worker et le popup
 * @author David B.
 */

import { browserAPI } from "../core/browser.js";
import { OdooInterface, isBackendUrl, isPosUrl, detectOdooPageDom } from "../core/odoo.js";

/**
 * Vérifie si la page courante est une page Odoo en cherchant les marqueurs spécifiques dans le DOM
 * @param {number} tabId - Identifiant de l'onglet
 * @returns {Promise<{isOdoo: boolean, interfaceType: string, isPOS: boolean}>} - Résultat de détection
 */
export async function detectOdooPage(tabId) {
  // Valeur par défaut en cas d'erreur ou si tabId n'est pas fourni
  const defaultResult = { 
    isOdoo: false, 
    interfaceType: OdooInterface.UNKNOWN, 
    isPOS: false 
  };
  
  // Validation du paramètre
  if (!tabId) {
    return defaultResult;
  }
  
  try {
    // Exécuter un script dans la page de l'onglet pour détecter Odoo
    const results = await browserAPI.scripting.executeScript({
      target: { tabId },
      func: detectOdooPageDom,
      // Ajout d'un timeout pour éviter les blocages (bien que cette option ne soit pas encore standard)
      // Cette ligne peut être supprimée si elle cause des problèmes avec certaines versions de navigateurs
      // timeout: 2000, 
    });
    
    // Vérifier si le résultat est valide
    if (!results || !Array.isArray(results) || results.length === 0 || !results[0]?.result) {
      console.warn("[Detector] No valid detection result for tab", tabId);
      return defaultResult;
    }
    
    // Retourner le résultat de la détection
    return results[0].result;
  } catch (error) {
    // Gérer les erreurs spécifiques
    if (error?.message?.includes('Cannot access contents of url')) {
      console.warn("[Detector] Cannot access contents of page (restricted access)", tabId);
    } else if (error?.message?.includes('Manifest')) {
      console.warn("[Detector] Extension manifest issue: ", error.message);
    } else {
      console.error("[Detector] Error detecting Odoo page:", error.message);
    }
    
    // En cas d'erreur, supposer que ce n'est pas une page Odoo
    return defaultResult;
  }
}

/**
 * Détermine si une page est une page Odoo valide en fonction de multiples critères
 * @param {boolean} isOdooScript - Présence du script Odoo
 * @param {boolean} isPOS - Détection de Point of Sale par script/classe
 * @param {string} url - URL de la page
 * @returns {object} {isValid: boolean, shouldAutoEnable: boolean, isWebsite: boolean}
 */
export function isValidOdooPage(isOdooScript, isPOS, url) {
  // Résultat à retourner avec plusieurs indicateurs
  const result = {
    isValid: false,          // La page est-elle une page Odoo valide?
    shouldAutoEnable: false, // Doit-on activer automatiquement le debug?
    isWebsite: false         // Est-ce une page website?
  };
  
  try {
    // Analyser l'URL pour les vérifications basées sur le chemin
    const urlObj = new URL(url);
    const pathLower = urlObj.pathname.toLowerCase();
    
    // Détection spécifique POS - Prioritaire car très spécifique
    const isPosUrlMatch = pathLower === '/pos' || 
                          pathLower.startsWith('/pos/') ||
                          pathLower.includes('/pos/ui') ||
                          pathLower.includes('/pos/web') ||
                          (urlObj.searchParams.has('config_id') && pathLower.includes('/pos'));
    
    if (isPosUrlMatch || isPOS) {
      result.isValid = true;
      result.shouldAutoEnable = true;
      result.isWebsite = false;
      return result;
    }
    
    // Critère 1: Le script Odoo est présent
    if (isOdooScript) {
      result.isValid = true;
      
      // Vérifier si c'est une page website (script Odoo présent mais pas d'URL backend)
      if (!isBackendUrl(url)) {
        result.isWebsite = true;
      } else {
        // Page backend, on permet l'activation automatique
        result.shouldAutoEnable = true;
      }
      
      return result;
    }
    
    // Critère 3: Détection basée sur l'URL pour les environnements spécifiques (runbot, etc.)
    // Si l'URL contient clairement "odoo" dans le chemin ou le domaine
    if (urlObj.hostname.includes('odoo.com') || 
        urlObj.hostname.includes('runbot') ||
        urlObj.hostname.includes('odoo.sh') ||
        pathLower.includes('/odoo') ||
        pathLower.includes('/web')) {
      
      result.isValid = true;
      
      // Si l'URL contient des indices de website (pas de /web ou de /odoo)
      if (pathLower === '/' || 
          (pathLower !== '/web' && 
           pathLower !== '/odoo' && 
           !pathLower.startsWith('/web/') && 
           !pathLower.startsWith('/odoo/'))) {
        result.isWebsite = true;
      } else {
        // Probablement un backend, activer le debug
        result.shouldAutoEnable = true;
      }
    }
    
    return result;
  } catch (error) {
    console.error('[Detector] Error analyzing URL in isValidOdooPage:', error.message);
    
    // Fallback si l'analyse d'URL échoue
    // Critère 1: Le script Odoo est présent
    if (isOdooScript) {
      result.isValid = true;
      // On ne peut pas déterminer si c'est un website sans l'URL
      result.shouldAutoEnable = true;
    }
    
    // Critère 2: C'est une page Point of Sale
    if (isPOS) {
      result.isValid = true;
      result.shouldAutoEnable = true;
      result.isWebsite = false;
    }
    
    return result;
  }
}

/**
 * Vérifie si c'est une page ou une URL Odoo valide, et détermine son type
 * @param {string} url - URL de la page
 * @param {number} tabId - Identifiant de l'onglet
 * @returns {Promise<{isOdoo: boolean, isBackend: boolean, isWebsite: boolean, isPOS: boolean}>} - Résultat de détection
 */
export async function analyzeOdooContext(url, tabId) {
  // Valeurs par défaut si aucune information n'est disponible
  const defaultResult = { 
    isOdoo: false, 
    isBackend: false, 
    isWebsite: false, 
    isPOS: false 
  };
  
  // Validation des paramètres
  if (!url || !tabId) {
    console.log("[Detector] analyzeOdooContext - Missing parameters", { url, tabId });
    return defaultResult;
  }
  
  try {
    // Log URL pour debug
    console.log("[Detector] analyzeOdooContext - Analyzing URL:", url);
    
    // Vérification spécifique pour les URLs POS
    try {
      const urlObj = new URL(url);
      const isPosUrl = urlObj.pathname.includes('/pos/') || 
                       urlObj.pathname === '/pos' || 
                       urlObj.searchParams.has('config_id');
      
      // Si c'est une URL POS évidente, court-circuiter la détection
      if (isPosUrl) {
        console.log("[Detector] analyzeOdooContext - Detected POS URL directly:", url);
        return {
          isOdoo: true,
          isBackend: true,
          isWebsite: false,
          isPOS: true
        };
      }
    } catch (urlError) {
      console.warn("[Detector] Error parsing URL in initial check:", urlError.message);
    }
    
    // Vérification préliminaire basée sur l'URL avant d'examiner le DOM
    // Pour les URLs qui sont clairement des URLs Odoo
    const isExplicitOdooUrl = isExplicitlyOdooUrl(url);
    console.log("[Detector] analyzeOdooContext - isExplicitOdooUrl:", isExplicitOdooUrl);
    
    // Si l'URL est explicitement une URL Odoo, on peut déjà déterminer le type
    if (isExplicitOdooUrl) {
      const urlObj = new URL(url);
      
      // Déterminer si c'est un backend ou un website
      const isBackendPath = urlObj.pathname === '/web' || 
                           urlObj.pathname === '/odoo' || 
                           urlObj.pathname.startsWith('/web/') || 
                           urlObj.pathname.startsWith('/odoo/');
      
      // Vérification spécifique POS (prioritaire)
      const isPosPath = urlObj.pathname === '/pos' || 
                       urlObj.pathname.startsWith('/pos/') || 
                       urlObj.searchParams.has('config_id');
      
      console.log("[Detector] URL-based detection:", { isBackendPath, isPosPath });
      
      if (isPosPath) {
        // C'est une page POS
        return {
          isOdoo: true,
          isBackend: true,
          isWebsite: false,
          isPOS: true
        };
      } else if (isBackendPath) {
        // C'est un backend standard
        return {
          isOdoo: true,
          isBackend: true,
          isWebsite: false,
          isPOS: urlObj.pathname.includes('/pos')
        };
      } else {
        // Sinon, considérer comme website
        return {
          isOdoo: true,
          isBackend: false,
          isWebsite: true,
          isPOS: false
        };
      }
    }
    
    // Vérifier si c'est une page Odoo en examinant le DOM
    const domDetection = await detectOdooPage(tabId);
    const { isOdoo, interfaceType, isPOS } = domDetection;
    
    console.log("[Detector] DOM-based detection:", domDetection);
    
    // Traitement prioritaire pour les pages POS
    if (isPOS) {
      return {
        isOdoo: true,
        isBackend: true,
        isWebsite: false,
        isPOS: true
      };
    }
    
    // Si ce n'est pas une page Odoo selon le DOM, pas besoin d'aller plus loin
    if (!isOdoo) {
      return defaultResult;
    }
    
    // Déterminer si c'est une page Odoo valide selon nos critères supplémentaires
    const validityCheck = isValidOdooPage(isOdoo, isPOS, url);
    const { isValid, shouldAutoEnable, isWebsite } = validityCheck;
    
    console.log("[Detector] Validity check:", validityCheck);
    
    // Si ce n'est pas une page Odoo valide, on s'arrête là
    if (!isValid) {
      return defaultResult;
    }
    
    // Retourner le résultat complet pour une page Odoo valide
    const result = {
      isOdoo: true,
      // Les interfaces "backend" et "pos" sont considérées comme des backends
      isBackend: interfaceType === "backend" || interfaceType === "pos",
      // L'interface "website" est considérée comme un site web
      isWebsite: interfaceType === "website" || isWebsite,
      // Spécifique au Point of Sale
      isPOS: interfaceType === "pos" || isPOS
    };
    
    console.log("[Detector] Final result:", result);
    return result;
  } catch (error) {
    console.error('[Detector] Error analyzing Odoo context:', error.message);
    return defaultResult;
  }
}

/**
 * Vérifie si une URL est explicitement une URL Odoo basée sur son domaine ou son chemin
 * @param {string} url - URL à vérifier
 * @returns {boolean} - True si c'est une URL explicitement Odoo
 */
function isExplicitlyOdooUrl(url) {
  try {
    if (!url) return false;
    
    const urlObj = new URL(url);
    
    // Vérifier le domaine
    if (urlObj.hostname.includes('odoo.com') || 
        urlObj.hostname.includes('runbot') ||
        urlObj.hostname.includes('odoo.sh')) {
      return true;
    }
    
    // Vérifier les chemins spécifiques à Odoo
    const pathname = urlObj.pathname.toLowerCase();
    
    // Vérifier les chemins de base
    if (pathname === '/odoo' || 
        pathname.startsWith('/odoo/') ||
        pathname === '/web' || 
        pathname.startsWith('/web/')) {
      return true;
    }
    
    // Vérifier les chemins POS
    if (pathname === '/pos' || 
        pathname.startsWith('/pos/') ||
        pathname.includes('/pos/ui') ||
        pathname.includes('/pos/web')) {
      return true;
    }
    
    // Vérifier les paramètres d'URL spécifiques à Odoo
    if (urlObj.searchParams.has('debug') ||
        urlObj.searchParams.has('menu_id') ||
        urlObj.searchParams.has('action') ||
        urlObj.searchParams.has('model') ||
        urlObj.searchParams.has('view_type') ||
        urlObj.searchParams.has('config_id')) {  // Paramètre spécifique au POS
      return true;
    }
    
    // Vérifier les fragments d'URL spécifiques à Odoo
    if (urlObj.hash.includes('cids=') || 
        urlObj.hash.includes('action=') ||
        urlObj.hash.includes('model=')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Detector] Error in isExplicitlyOdooUrl:', error.message);
    return false;
  }
} 