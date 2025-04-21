/**
 * Gestionnaire des infobulles pour l'extension Odoo Inspector
 * @author David B.
 */

import { browserAPI } from "../core/browser.js";

export const TooltipManager = {
  async blockTooltips(tabId) {
    if (!tabId) {
      console.error("[TooltipManager] Invalid tabId provided");
      return;
    }

    try {
      await browserAPI.scripting.executeScript({
        target: { tabId },
        func: () => {
          // S'assurer que le style n'existe pas déjà
          if (document.getElementById('odoo-inspector-tooltip-hider')) {
            return;
          }
          
          // Inject CSS to hide tooltips
          const style = document.createElement('style');
          style.id = 'odoo-inspector-tooltip-hider';
          style.textContent = `
            .popover {
              display: none !important;
            }
          `;
          document.head.appendChild(style);
        },
      });
    } catch (error) {
      // Erreur non fatale
      console.error(`[TooltipManager] Error blocking tooltips for tab ${tabId}:`, error.message);
    }
  },

  async showTooltips(tabId) {
    if (!tabId) {
      console.error("[TooltipManager] Invalid tabId provided");
      return;
    }

    try {
      await browserAPI.scripting.executeScript({
        target: { tabId },
        func: () => {
          const style = document.getElementById('odoo-inspector-tooltip-hider');
          if (style) {
            style.remove();
          }
        },
      });
    } catch (error) {
      // Erreur non fatale
      console.error(`[TooltipManager] Error showing tooltips for tab ${tabId}:`, error.message);
    }
  },

  async toggleTooltips(tabId, show) {
    if (!tabId) {
      console.error("[TooltipManager] Invalid tabId provided");
      return;
    }

    try {
      if (show) {
        await this.showTooltips(tabId);
      } else {
        await this.blockTooltips(tabId);
      }
    } catch (error) {
      // Erreur non fatale
      console.error(`[TooltipManager] Error toggling tooltips for tab ${tabId}:`, error.message);
    }
  }
}; 