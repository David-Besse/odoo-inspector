/**
 * Utilitaires pour la gestion des icônes de l'extension
 * @author David B.
 */

/**
 * Obtient les chemins d'icônes en fonction de l'état du debug
 * @param {boolean} isDebugEnabled - Indique si le mode debug est activé
 * @returns {Object} - Chemins des icônes pour différentes tailles
 * @author David B.
 */
export function getIconPath(isDebugEnabled = true) {
  // Utiliser les icônes grises quand le debug est désactivé
  const iconType = isDebugEnabled ? "" : "_gray";
  
  return {
    16: `img/icons/icon16${iconType}.png`,
    48: `img/icons/icon48${iconType}.png`,
    128: `img/icons/icon128${iconType}.png`
  };
} 