/**
 * Gestionnaire d'état pour l'extension Odoo Inspector
 * @author David B.
 */

import { browserAPI } from "../core/browser.js";
import { IconManager } from "./icon-manager.js";
import { TooltipManager } from "./tooltip-manager.js";
import { HTMLInspector } from "./html-inspector.js";
import { handleDebugParameter } from "../utils/debug-utils.js";

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
   * @returns {Promise<boolean>} - Indique si l'opération a réussi
   */
  async handleDebugState(tabId, isDebugEnabled, debugMode = 'normal') {
    if (!tabId) {
      console.error("[StateManager] Invalid tabId provided");
      return false;
    }

    try {
      console.log(`[StateManager] handleDebugState - tabId: ${tabId}, state: ${isDebugEnabled}, mode: ${debugMode}`);
      
      // Vérifier si l'onglet existe toujours
      try {
        const tab = await browserAPI.tabs.get(tabId);
        if (!tab) {
          console.error(`[StateManager] Tab ${tabId} does not exist`);
          return false;
        }
      } catch (tabError) {
        console.error(`[StateManager] Error getting tab ${tabId}:`, tabError.message);
        return false;
      }
      
      // Mettre à jour l'icône spécifiquement pour cet onglet
      await IconManager.updateIcon(tabId, isDebugEnabled);
      
      // Gérer les tooltips
      await TooltipManager.toggleTooltips(tabId, isDebugEnabled);
      
      // Si l'inspecteur HTML est activé et qu'on désactive le debug, désactiver l'inspecteur
      if (!isDebugEnabled && HTMLInspector.isEnabled) {
        await HTMLInspector.disable(tabId);
      }

      // Synchroniser l'état avec le service worker
      const syncResult = await this.syncWithServiceWorker(tabId, isDebugEnabled, debugMode);
      console.log(`[StateManager] Sync result for tab ${tabId}: ${syncResult}`);
      
      return true;
    } catch (error) {
      // Erreur non fatale, on continue
      console.error(`[StateManager] Error handling debug state for tab ${tabId}:`, error.message);
      return false;
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
      console.log(`[StateManager] syncWithServiceWorker - tabId: ${tabId}, state: ${state}, mode: ${mode}`);
      
      const response = await browserAPI.runtime.sendMessage({
        type: 'SET_DEBUG_STATE',
        tabId,
        state,
        mode
      });
      
      console.log(`[StateManager] Service worker response:`, response);
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
      console.log(`[StateManager] getDebugState - tabId: ${tabId}`);
      
      const response = await browserAPI.runtime.sendMessage({
        type: 'GET_DEBUG_STATE',
        tabId
      });
      
      if (!response || response.error) {
        console.error(`[StateManager] Error getting debug state:`, response?.error || 'No response');
        return { enabled: false, mode: 'normal' };
      }
      
      console.log(`[StateManager] getDebugState result:`, response);
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