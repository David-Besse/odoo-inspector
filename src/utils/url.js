import { detectOdooVersion } from '../core/odoo.js';
import { OdooPaths, DebugParameter } from '../core/constants.js';

/**
 * Gère l'ajout ou la suppression du paramètre debug dans l'URL
 * @param {string} url - URL actuelle
 * @param {boolean} enable - Activer ou désactiver le mode debug
 * @param {string} mode - Mode de debug: 'normal' (debug=1) ou 'assets' (debug=assets)
 * @returns {string} - URL modifiée
 */
export function handleDebugParameter(url, enable, mode = 'normal') {
  try {
    const version = detectOdooVersion(url);
    const urlObj = new URL(url);
    
    // Déterminer la valeur du paramètre de debug en fonction du mode
    const debugValue = mode === 'assets' ? DebugParameter.VALUE_ASSETS : DebugParameter.VALUE;
    
    if (version === '18+') {
      if (enable) {
        urlObj.searchParams.set(DebugParameter.NAME, debugValue);
      } else {
        urlObj.searchParams.delete(DebugParameter.NAME);
      }
    } else if (version === 'pre-18') {
      const pathParts = urlObj.pathname.split(OdooPaths.ODOO_PRE_18);
      
      if (enable) {
        urlObj.pathname = pathParts[0] + OdooPaths.ODOO_PRE_18;
        const debugQuery = mode === 'assets' ? DebugParameter.QUERY_ASSETS : DebugParameter.QUERY;
        urlObj.search = `?${debugQuery}` + (pathParts[1] || '');
      } else {
        const basePath = pathParts[0] + OdooPaths.ODOO_PRE_18;
        const remainingPath = pathParts[1] || '';
        urlObj.pathname = basePath + remainingPath;
        
        const searchParams = new URLSearchParams(urlObj.search);
        searchParams.delete(DebugParameter.NAME);
        urlObj.search = searchParams.toString() ? '?' + searchParams.toString() : '';
      }
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Error handling debug parameter:', error);
    return url;
  }
} 