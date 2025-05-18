/**
 * Utilitaires pour la gestion des paramètres de debug
 * Centralise les fonctions de manipulation d'URL et des paramètres debug
 * @author David B.
 */

import { detectOdooVersion } from '../core/odoo.js';
import { OdooPaths, DebugParameter } from '../core/constants.js';

/**
 * Détermine si une URL a un paramètre debug activé (debug=1 ou debug=assets)
 * @param {string} url - L'URL à vérifier
 * @returns {boolean} True si l'URL a un paramètre debug activé
 */
export function hasActiveDebugParameter(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    const debugParam = urlObj.searchParams.get(DebugParameter.NAME);
    return debugParam === DebugParameter.VALUE || debugParam === DebugParameter.VALUE_ASSETS;
  } catch (error) {
    // Fallback à la vérification de chaîne simple en cas d'erreur
    return url.includes('debug=1') || url.includes('debug=assets');
  }
}

/**
 * Détermine si l'URL indique explicitement que le debug est désactivé
 * @param {string} url - L'URL à vérifier
 * @returns {boolean} True si debug=0 est présent dans l'URL
 */
export function isDebugExplicitlyDisabled(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get(DebugParameter.NAME) === '0';
  } catch (error) {
    // Fallback à la vérification de chaîne simple en cas d'erreur
    return url.includes('debug=0');
  }
}

/**
 * Extrait l'état de debug et le mode à partir d'une URL
 * @param {string} url - L'URL à analyser
 * @returns {object|null} - {enabled: boolean, mode: string} ou null si aucun paramètre debug
 */
export function getDebugStateFromURL(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const debugParam = urlObj.searchParams.get(DebugParameter.NAME);
    
    if (debugParam === DebugParameter.VALUE_ASSETS) {
      return { enabled: true, mode: 'assets' };
    } else if (debugParam === DebugParameter.VALUE) {
      return { enabled: true, mode: 'normal' };
    } else if (debugParam === '0') {
      return { enabled: false, mode: 'normal' };
    }
    
    return null;
  } catch (error) {
    // Fallback à la vérification de chaîne simple en cas d'erreur
    if (url.includes('debug=assets')) {
      return { enabled: true, mode: 'assets' };
    } else if (url.includes('debug=1')) {
      return { enabled: true, mode: 'normal' };
    } else if (url.includes('debug=0')) {
      return { enabled: false, mode: 'normal' };
    }
    
    return null;
  }
}

/**
 * Gère l'ajout ou la suppression du paramètre debug dans l'URL
 * @param {string} url - URL actuelle
 * @param {boolean} enable - Activer ou désactiver le mode debug
 * @param {string} mode - Mode de debug: 'normal' (debug=1) ou 'assets' (debug=assets)
 * @returns {string} - URL modifiée
 */
export function handleDebugParameter(url, enable, mode = 'normal') {
  try {
    if (!url) return url;
    
    const version = detectOdooVersion(url);
    const urlObj = new URL(url);
    
    // Déterminer la valeur du paramètre de debug en fonction du mode
    const debugValue = mode === 'assets' ? DebugParameter.VALUE_ASSETS : DebugParameter.VALUE;
    
    // Gestion commune : ajouter ou supprimer le paramètre de debug dans les paramètres de requête
    const handleQueryParams = () => {
      // Supprimer d'abord tout paramètre debug existant
      urlObj.searchParams.delete(DebugParameter.NAME);
      
      // Ajouter le paramètre si nécessaire
      if (enable) {
        urlObj.searchParams.set(DebugParameter.NAME, debugValue);
      }
    };
    
    // Traitement spécifique pour Odoo v18+
    if (version === '18+') {
      handleQueryParams();
    } 
    // Traitement spécifique pour Odoo avant v18
    else if (version === 'pre-18') {
      const pathParts = urlObj.pathname.split(OdooPaths.ODOO_PRE_18);
      
      // L'URL contient bien le chemin /web
      if (pathParts.length > 1) {
        if (enable) {
          urlObj.pathname = pathParts[0] + OdooPaths.ODOO_PRE_18;
          urlObj.search = '';
          urlObj.searchParams.set(DebugParameter.NAME, debugValue);
          
          // Préserver les autres paramètres qui pourraient être présents
          // sur l'URL originale (après le premier ? dans pathname[1])
          if (pathParts[1] && pathParts[1].includes('?')) {
            const remainingQueryParts = pathParts[1].split('?');
            if (remainingQueryParts.length > 1) {
              const remainingParams = new URLSearchParams(remainingQueryParts[1]);
              for (const [key, value] of remainingParams.entries()) {
                if (key !== DebugParameter.NAME) {
                  urlObj.searchParams.append(key, value);
                }
              }
            }
            // Mettre à jour le pathname pour qu'il ne contienne que la partie avant le '?'
            if (remainingQueryParts[0]) {
              urlObj.pathname = pathParts[0] + OdooPaths.ODOO_PRE_18 + remainingQueryParts[0];
            }
          }
        } else {
          // Désactiver le debug, garder le même chemin
          handleQueryParams();
        }
      } else {
        // Si l'URL ne contient pas /web, traiter comme une URL standard
        handleQueryParams();
      }
    } else {
      // Version inconnue ou website: simplement ajouter/supprimer le paramètre debug
      handleQueryParams();
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Error handling debug parameter:', error);
    return url;
  }
} 