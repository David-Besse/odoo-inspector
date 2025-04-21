/**
 * Utilitaires spécifiques à la détection et l'interaction avec les applications Odoo
 * Permet la détection des pages Odoo et la récupération d'informations sur la version
 * @author David B.
 */

import { OdooPaths } from "./constants.js";

/**
 * Constantes pour les versions d'Odoo
 * @author David B.
 */
export const OdooVersion = {
  ODOO_18_PLUS: "18+",
  ODOO_PRE_18: "pre-18",
  UNKNOWN: "unknown",
};

/**
 * Détecte la version d'Odoo à partir d'une URL
 * @author David B.
 * @param {string|URL} url - L'URL à analyser
 * @returns {string} - La version d'Odoo détectée (18+, pre-18, ou unknown)
 */
export function detectOdooVersion(url) {
  try {
    if (!url) {
      return OdooVersion.UNKNOWN;
    }

    const urlObj = typeof url === "string" ? new URL(url) : url;
    const path = urlObj.pathname;
    
    // Check if it's an Odoo 18+ URL
    if (path.includes(OdooPaths.ODOO_18)) {
      return OdooVersion.ODOO_18_PLUS;
    }
    
    // Check if it's a pre-Odoo 18 URL
    if (path.includes(OdooPaths.ODOO_PRE_18)) {
      return OdooVersion.ODOO_PRE_18;
    }
    
    return OdooVersion.UNKNOWN;
  } catch (error) {
    console.error("Error detecting Odoo version:", error);
    return OdooVersion.UNKNOWN;
  }
}

/**
 * Vérifie si l'URL fournie est une URL Odoo valide
 * Note: Cette méthode est utilisée comme solution de secours quand
 * la détection via DOM (script#web.layout.odooscript) n'est pas disponible
 * 
 * @author David B.
 * @param {string|URL} url - L'URL à vérifier
 * @returns {boolean} - True si c'est une URL Odoo valide, sinon False
 */
export function isValidOdooUrl(url) {
  try {
    if (!url) {
      return false;
    }

    // Liste des indicateurs d'une URL Odoo (simplifiée)
    // On se concentre uniquement sur les chemins utilisés pour le debug mode
    const odooIndicators = [
      OdooPaths.ODOO_18,      // "/odoo"
      OdooPaths.ODOO_PRE_18,  // "/web"
    ];

    const urlObj = typeof url === "string" ? new URL(url) : url;
    
    // Vérifier si l'URL contient un des indicateurs Odoo
    return odooIndicators.some(indicator => 
      urlObj.pathname.toLowerCase().startsWith(indicator.toLowerCase())
    );
  } catch (error) {
    console.error("Error checking if URL is Odoo:", error);
    return false;
  }
}

/**
 * Extrait la version d'Odoo à partir de l'URL ou du DOM de la page
 * @param {string} url - URL de la page
 * @param {number} tabId - ID de l'onglet pour accéder au DOM
 * @returns {Promise<string|null>} - Version d'Odoo ou null si non détectée
 * @author David B.
 */

/**
 * Vérifie si une URL correspond à une instance Odoo
 * @param {string} url - URL à vérifier
 * @returns {boolean} - True si c'est une URL Odoo, sinon False
 * @author David B.
 */ 