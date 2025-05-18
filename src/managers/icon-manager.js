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
      if (!tabId) {
        console.error("[IconManager] TabId is required to update icon");
        return;
      }
      
      console.log(`[IconManager] Updating icon for tab ${tabId}, debug ${isDebugEnabled ? 'enabled' : 'disabled'}`);
      const iconPath = getIconPath(isDebugEnabled);
      
      // Vérifier si les APIs nécessaires sont disponibles
      if (browserAPI?.action?.setIcon) {
        // API Chrome MV3
        await browserAPI.action.setIcon({ 
          tabId: tabId,
          path: iconPath 
        });
        return;
      } else if (browserAPI?.browserAction?.setIcon) {
        // API Firefox et Chrome MV2
        await browserAPI.browserAction.setIcon({ 
          tabId: tabId,
          path: iconPath 
        });
        return;
      }
      
      // Si aucune API n'est disponible, logger l'erreur
      console.error("[IconManager] Browser API for setting icon is not available");
    } catch (error) {
      // Ne pas jeter d'erreur pour éviter de bloquer d'autres fonctionnalités
      console.error(`[IconManager] Error setting icon for tab ${tabId}:`, error.message);
    }
  },
  
  /**
   * Récupère l'état de debug associé à un onglet
   * @param {number} tabId - Identifiant de l'onglet
   * @returns {Promise<boolean>} - Indique si le mode debug est activé
   */
  async getIconState(tabId) {
    try {
      if (!tabId) return false;
      
      // Essayer de récupérer l'état depuis le service worker
      const response = await browserAPI.runtime.sendMessage({
        type: 'GET_DEBUG_STATE',
        tabId
      });
      
      if (response && response.state !== undefined) {
        return !!response.state;
      }
      
      return false;
    } catch (error) {
      console.error(`[IconManager] Error getting icon state for tab ${tabId}:`, error.message);
      return false;
    }
  }
};
