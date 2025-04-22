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
  WEBSITE: "website",
  UNKNOWN: "unknown",
};

/**
 * Détecte la version d'Odoo à partir d'une URL
 * @author David B.
 * @param {string|URL} url - L'URL à analyser
 * @returns {string} - La version d'Odoo détectée (18+, pre-18, website, ou unknown)
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
    
    // Détection spécifique pour les pages website Odoo (page d'accueil du module website)
    // Ces pages n'utilisent pas les chemins standards /web ou /odoo
    if (isWebsiteHomepage(urlObj)) {
      return OdooVersion.WEBSITE;
    }
    
    return OdooVersion.UNKNOWN;
  } catch (error) {
    console.error("Error detecting Odoo version:", error);
    return OdooVersion.UNKNOWN;
  }
}

/**
 * Vérifie si l'URL correspond à une page d'accueil du module website Odoo
 * @param {URL} urlObj - Objet URL à vérifier
 * @returns {boolean} - True si c'est une page d'accueil website Odoo
 */
function isWebsiteHomepage(urlObj) {
  // Les pages d'accueil du module website Odoo ont souvent ces caractéristiques:
  // - Pas de chemin spécifique comme /web ou /odoo
  // - Souvent juste le domaine ou des chemins courts
  // - Peuvent contenir des paramètres comme 'website_id'
  
  // Vérifions si l'URL a des paramètres typiques d'Odoo website
  if (urlObj.searchParams.has('website_id') || 
      urlObj.searchParams.has('menu_id') || 
      urlObj.searchParams.has('page_id')) {
    return true;
  }
  
  // Vérifier si le chemin est court (typique des pages d'accueil)
  const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
  if (pathSegments.length <= 1) {
    // Potentiellement une page d'accueil, mais nécessite confirmation par l'analyse DOM
    return true;
  }
  
  return false;
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
    const hasIndicator = odooIndicators.some(indicator => 
      urlObj.pathname.toLowerCase().startsWith(indicator.toLowerCase())
    );
    
    if (hasIndicator) {
      return true;
    }
    
    // Exception pour les pages d'accueil du module website d'Odoo
    return isWebsiteHomepage(urlObj);
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