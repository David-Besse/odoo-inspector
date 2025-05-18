/**
 * Utilitaires spécifiques à la détection et l'interaction avec les applications Odoo
 * Permet la détection des pages Odoo et la récupération d'informations sur la version
 * @author David B.
 */

import { OdooPaths } from "./constants.js";

/**
 * Constantes pour les versions d'Odoo
 */
export const OdooVersion = {
  ODOO_18_PLUS: "18+",
  ODOO_PRE_18: "pre-18",
  WEBSITE: "website",
  UNKNOWN: "unknown",
};

/**
 * Constantes pour les types d'interface Odoo
 */
export const OdooInterface = {
  BACKEND: "backend",
  WEBSITE: "website",
  POS: "pos",
  UNKNOWN: "unknown",
};

/**
 * Vérifie si une URL est une URL Odoo valide
 * @param {string|URL} url - L'URL à vérifier
 * @returns {boolean} - True si c'est une URL Odoo valide
 */
export function isOdooUrl(url) {
  try {
    if (!url) return false;

    // Si l'entrée est une chaîne, vérifie directement les patterns
    if (typeof url === "string") {
      return url.includes(OdooPaths.ODOO_PRE_18) || 
             url.includes(OdooPaths.ODOO_18) || 
             url.includes(OdooPaths.POS);
    }
    
    // Sinon, traite l'objet URL
    const urlObj = url;
    return urlObj.pathname.includes(OdooPaths.ODOO_PRE_18) ||
           urlObj.pathname.includes(OdooPaths.ODOO_18) ||
           urlObj.pathname.includes(OdooPaths.POS) ||
           isWebsiteHomepage(urlObj);
  } catch (error) {
    console.error("Error checking if URL is Odoo:", error);
    return false;
  }
}

/**
 * Vérifie si l'URL est une URL backend Odoo standard
 * @param {string|URL} url - URL à vérifier
 * @returns {boolean} - True si l'URL contient un chemin de backend Odoo
 */
export function isBackendUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = typeof url === "string" ? new URL(url) : url;
    
    // Liste des chemins standards pour le backend Odoo
    const backendPaths = [OdooPaths.ODOO_PRE_18, OdooPaths.ODOO_18, OdooPaths.POS];
    
    // Vérifier si l'URL contient un des chemins backend
    return backendPaths.some(path => 
      urlObj.pathname.toLowerCase().includes(path.toLowerCase())
    );
  } catch (error) {
    console.error("Error checking backend URL:", error);
    return false;
  }
}

/**
 * Vérifie si l'URL correspond à une page du module Point of Sale Odoo
 * @param {string|URL} url - URL à vérifier
 * @returns {boolean} - True si c'est une page Point of Sale Odoo
 */
export function isPosUrl(url) {
  try {
    if (!url) return false;

    if (typeof url === "string") {
      // Vérifier les différentes formes de chemin POS
      return url.includes(OdooPaths.POS + '/') || 
             url.includes(OdooPaths.POS + '?') || 
             url === OdooPaths.POS ||
             url.endsWith(OdooPaths.POS);
    }
    
    // Traiter l'objet URL
    const urlObj = url;
    const urlPathLower = urlObj.pathname.toLowerCase();
    
    // Vérifier si le chemin est exactement /pos ou commence par /pos/
    return urlPathLower === OdooPaths.POS.toLowerCase() || 
           urlPathLower.startsWith(OdooPaths.POS.toLowerCase() + '/') ||
           // Vérifier aussi le cas où l'URL a un suffixe comme dans /pos#cids=1
           (urlPathLower === OdooPaths.POS.toLowerCase() && urlObj.hash.length > 0);
  } catch (error) {
    console.error("Error checking if URL is POS page:", error);
    return false;
  }
}

/**
 * Détecte la version d'Odoo à partir d'une URL
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
    
    // Vérifie si l'URL correspond à une instance Odoo 18+
    if (path.includes(OdooPaths.ODOO_18)) {
      return OdooVersion.ODOO_18_PLUS;
    }
    
    // Vérifie si l'URL correspond à une instance Odoo pré-18
    if (path.includes(OdooPaths.ODOO_PRE_18)) {
      return OdooVersion.ODOO_PRE_18;
    }
    
    // Détection spécifique pour les pages website Odoo
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
  // Vérifier si l'URL a des paramètres typiques d'Odoo website
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
 * Vérifie si la page correspond à une interface Point of Sale
 * basé sur les éléments DOM (à utiliser via scriptingExecute)
 * @returns {boolean} - True si la page est une interface Point of Sale
 */
export function isPosInterface() {
  try {
    // 1. Vérifier si le body a la classe 'pos' (caractéristique des interfaces POS)
    const hasPosClass = document.body.classList.contains('pos');
    
    // 2. Vérifier s'il y a des scripts Point of Sale
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const hasPosScript = scripts.some(script => 
      script.src.includes('/point_of_sale') || 
      script.src.includes('/pos/') ||
      script.src.includes('/pos_') ||
      script.src.includes('pos.js')
    );
    
    // 3. Vérifier s'il y a des éléments avec des classes ou IDs spécifiques au POS
    const hasPosElements = document.querySelector('.pos-content') !== null ||
                           document.querySelector('.pos-topheader') !== null ||
                           document.querySelector('.pos_root') !== null ||
                           document.querySelector('#pos_root') !== null;
    
    // 4. Vérifier l'URL pour voir si elle contient "/pos/ui" ou similaire
    const currentUrl = window.location.href.toLowerCase();
    const hasPosInUrl = currentUrl.includes('/pos/ui') || 
                        currentUrl.includes('/pos/web') ||
                        (currentUrl.includes('/pos') && 
                         (currentUrl.includes('config_id=') || 
                          currentUrl.includes('#cids=')));
    
    return hasPosClass || hasPosScript || hasPosElements || hasPosInUrl;
  } catch (error) {
    console.error("Error checking if page is POS interface:", error);
    return false;
  }
}

/**
 * Détecte si c'est une page Odoo en examinant le DOM
 * @returns {Object} - Objet contenant des indicateurs sur la page Odoo
 */
export function detectOdooPageDom() {
  try {
    // Indicateurs de détection Odoo
    let isOdoo = false;
    let interfaceType = OdooInterface.UNKNOWN;
    let isPOS = false;
    
    // 1. Chercher la balise script spécifique à Odoo
    const hasOdooScript = !!document.querySelector('script#web\\.layout\\.odooscript');
    
    // 2. Vérifier si le body a la classe o_web_client (interface backend/website)
    const hasWebClientClass = document.body.classList.contains('o_web_client');
    
    // 3. Vérifier s'il y a des scripts qui contiennent 'odoo' dans leur src
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const hasOdooInScripts = scripts.some(script => 
      script.src.toLowerCase().includes('/odoo') || 
      script.src.toLowerCase().includes('/web/content/') ||
      script.src.toLowerCase().includes('odoo.js')
    );
    
    // 4. Vérifier si le footer ou tout autre élément contient "Powered by Odoo"
    const pageContent = document.body.textContent || '';
    const hasPoweredByOdoo = pageContent.includes('Powered by Odoo');
    
    // 5. Vérifier s'il y a des éléments avec des classes commençant par 'o_'
    const hasOdooElements = !!document.querySelector('[class^="o_"]');
    
    // 6. Vérifier si c'est une interface Point of Sale
    isPOS = isPosInterface();
    
    // 7. Vérifier l'URL pour des motifs typiques d'Odoo
    const currentUrl = window.location.href.toLowerCase();
    const hasOdooInUrl = currentUrl.includes('odoo.com') || 
                         currentUrl.includes('/odoo') || 
                         currentUrl.includes('/web') ||
                         currentUrl.includes('runbot');
    
    // Combiner les vérifications pour déterminer si c'est une page Odoo
    isOdoo = hasOdooScript || 
             hasWebClientClass || 
             hasOdooInScripts || 
             hasPoweredByOdoo || 
             hasOdooElements || 
             isPOS ||
             hasOdooInUrl;
    
    // Déterminer le type d'interface
    if (hasWebClientClass) {
      interfaceType = OdooInterface.BACKEND;
    } else if (isPOS) {
      interfaceType = OdooInterface.POS;
    } else if (isOdoo) {
      // Si on a identifié Odoo mais pas un backend spécifique, considérer comme website
      interfaceType = OdooInterface.WEBSITE;
    }
    
    return {
      isOdoo,
      interfaceType,
      isPOS
    };
  } catch (error) {
    console.error("Error detecting Odoo page DOM:", error);
    return {
      isOdoo: false,
      interfaceType: OdooInterface.UNKNOWN,
      isPOS: false
    };
  }
}
