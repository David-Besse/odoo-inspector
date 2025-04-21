/**
 * Gestionnaire d'icônes pour l'extension Odoo Inspector
 * @author David B.
 */

import { browserAPI } from "../core/browser.js";
import { getIconPath } from "../core/icon-utils.js";

/**
 * Gestionnaire d'icônes
 * Responsable de la mise à jour des icônes de l'extension selon l'état du debug
 */
export const IconManager = {
  /**
   * Met à jour l'icône de l'extension selon l'état du debug
   * @param {number} tabId - Identifiant de l'onglet
   * @param {boolean} isDebugEnabled - Indique si le mode debug est activé
   * @returns {Promise<void>}
   */
  async updateIcon(tabId, isDebugEnabled = true) {
    try {
      const iconPath = getIconPath(isDebugEnabled);
      
      // Vérifier si les APIs nécessaires sont disponibles
      if (browserAPI?.action?.setIcon) {
        // API Chrome MV3
        await browserAPI.action.setIcon({ path: iconPath });
        return;
      } else if (browserAPI?.browserAction?.setIcon) {
        // API Firefox et Chrome MV2
        await browserAPI.browserAction.setIcon({ path: iconPath });
        return;
      }
      
      // Si aucune API n'est disponible, logger l'erreur
      console.error("[IconManager] Browser API for setting icon is not available");
    } catch (error) {
      // Ne pas jeter d'erreur pour éviter de bloquer d'autres fonctionnalités
      console.error(`[IconManager] Error setting icon:`, error.message);
    }
  }
};
