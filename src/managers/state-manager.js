/**
 * Gestionnaire d'état pour l'extension Odoo Inspector
 * @author David B.
 */

import { browserAPI } from "../core/browser.js";
import { IconManager } from "./icon-manager.js";
import { TooltipManager } from "./tooltip-manager.js";
import { HTMLInspector } from "./html-inspector.js";

/**
 * Gestionnaire d'état
 * Responsable de la coordination des différents managers selon l'état du debug
 */
export const StateManager = {
  /**
   * Gère l'état de debug pour un onglet spécifique
   * @param {number} tabId - Identifiant de l'onglet
   * @param {boolean} isDebugEnabled - Indique si le mode debug est activé
   * @param {string} debugMode - Mode de debug ('normal' ou 'assets')
   * @returns {Promise<void>}
   */
  async handleDebugState(tabId, isDebugEnabled, debugMode = 'normal') {
    if (!tabId) {
      console.error("[StateManager] Invalid tabId provided");
      return;
    }

    try {
      // Mettre à jour l'icône
      await IconManager.updateIcon(tabId, isDebugEnabled);
      
      // Gérer les tooltips
      await TooltipManager.toggleTooltips(tabId, isDebugEnabled);
      
      // Si l'inspecteur HTML est activé et qu'on désactive le debug, désactiver l'inspecteur
      if (!isDebugEnabled && HTMLInspector.isEnabled) {
        await HTMLInspector.disable(tabId);
      }

      // Synchroniser l'état avec le service worker
      await this.syncWithServiceWorker(tabId, isDebugEnabled, debugMode);
    } catch (error) {
      // Erreur non fatale, on continue
      console.error(`[StateManager] Error handling debug state for tab ${tabId}:`, error.message);
    }
  },

  /**
   * Synchronise l'état avec le service worker
   * @param {number} tabId - Identifiant de l'onglet
   * @param {boolean} state - État à synchroniser
   * @param {string} mode - Mode de debug ('normal' ou 'assets')
   * @returns {Promise<boolean>} - Indique si la synchronisation a réussi
   */
  async syncWithServiceWorker(tabId, state, mode = 'normal') {
    try {
      const response = await browserAPI.runtime.sendMessage({
        type: 'SET_DEBUG_STATE',
        tabId,
        state,
        mode
      });

      return response && !response.error;
    } catch (error) {
      console.error(`[StateManager] Error syncing with service worker:`, error.message);
      return false;
    }
  },

  /**
   * Récupère l'état de debug depuis le service worker
   * @param {number} tabId - Identifiant de l'onglet
   * @returns {Promise<{enabled: boolean, mode: string}>} - État et mode de debug
   */
  async getDebugState(tabId) {
    try {
      const response = await browserAPI.runtime.sendMessage({
        type: 'GET_DEBUG_STATE',
        tabId
      });

      if (!response || response.error) {
        console.error(`[StateManager] Error getting debug state:`, response?.error || 'No response');
        return { enabled: false, mode: 'normal' };
      }

      return {
        enabled: !!response.state,
        mode: response.mode || 'normal'
      };
    } catch (error) {
      console.error(`[StateManager] Error getting debug state:`, error.message);
      return { enabled: false, mode: 'normal' };
    }
  }
}; 