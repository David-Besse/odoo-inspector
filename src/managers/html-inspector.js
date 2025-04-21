/**
 * Gestionnaire de l'inspecteur HTML pour l'extension Odoo Inspector
 * @author David B.
 */

import { browserAPI } from "../core/browser.js";
import { TooltipManager } from "./tooltip-manager.js";

export const HTMLInspector = {
  isEnabled: false,

  async enable(tabId) {
    if (!tabId) {
      console.error("[HTMLInspector] Invalid tabId provided");
      return;
    }

    try {
      // Bloquer les tooltips d'Odoo quand l'inspecteur HTML est activé
      await TooltipManager.blockTooltips(tabId);
      
      await browserAPI.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Vérifier si l'inspecteur est déjà activé
          if (window._htmlInspectorEnabled) {
            return;
          }
          
          // Créer le style pour la tooltip personnalisée
          const style = document.createElement('style');
          style.id = 'html-inspector-style';
          style.textContent = `
            .html-inspector-tooltip {
              position: fixed;
              background-color: #292d3e !important;
              border: 1px solid #434758;
              border-radius: 6px;
              padding: 12px;
              min-width: 200px;
              max-width: 50vw;
              width: fit-content;
              max-height: 400px;
              overflow-y: auto;
              overflow-x: hidden;
              font-family: 'Consolas', 'Monaco', monospace;
              font-size: 13px;
              line-height: 1.4;
              z-index: 9999;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              color: #ffffff;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .html-inspector-tooltip pre {
              margin: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
              background-color: #292d3e !important;
              color: #ffffff;
              width: 100%;
              box-sizing: border-box;
            }
            .html-inspector-tooltip .tag-open,
            .html-inspector-tooltip .tag-close,
            .html-inspector-tooltip .attr,
            .html-inspector-tooltip .value,
            .html-inspector-tooltip .text {
              display: inline;
              word-break: break-all;
            }
            .html-inspector-tooltip .parent {
              display: block;
              margin-bottom: 2px;
              border-left: 2px solid #333;
              padding-left: 8px;
              word-wrap: break-word;
              word-break: break-all;
            }
            .html-inspector-tooltip .tag-open {
              color: #82aaff;
              word-wrap: break-word;
              word-break: break-all;
            }
            .html-inspector-tooltip .tag-close {
              color: #82aaff;
              word-wrap: break-word;
              word-break: break-all;
            }
            .html-inspector-tooltip .attr {
              color: #89ddff;
            }
            .html-inspector-tooltip .value {
              color: #f78c6c;
            }
            .html-inspector-tooltip .text {
              color: #ffffff;
            }
            .html-inspector-tooltip .comment {
              color: #6a9955;
              font-style: italic;
            }
            .html-inspector-tooltip .current {
              background: rgba(255,255,255,0.1);
              border-radius: 3px;
              padding: 2px 4px;
            }
            .html-inspector-tooltip::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            .html-inspector-tooltip::-webkit-scrollbar-track {
              background: #1a1a1a;
              border-radius: 4px;
            }
            .html-inspector-tooltip::-webkit-scrollbar-thumb {
              background: #333;
              border-radius: 4px;
            }
            .html-inspector-tooltip::-webkit-scrollbar-thumb:hover {
              background: #444;
            }
          `;
          document.head.appendChild(style);

          // Fonction pour obtenir une couleur basée sur le nom de la balise
          function getTagColor(tagName) {
            const colors = {
              // Balises de structure
              'div': '#82aaff', // Bleu clair
              'span': '#82aaff',
              'p': '#82aaff',
              'section': '#82aaff',
              'article': '#82aaff',
              'header': '#82aaff',
              'footer': '#82aaff',
              'nav': '#82aaff',
              'main': '#82aaff',
              'aside': '#82aaff',
              
              // Balises de liste
              'ul': '#c792ea', // Violet
              'ol': '#c792ea',
              'li': '#c792ea',
              'dl': '#c792ea',
              'dt': '#c792ea',
              'dd': '#c792ea',
              
              // Balises de formulaire
              'form': '#89ddff', // Cyan
              'input': '#89ddff',
              'button': '#89ddff',
              'select': '#89ddff',
              'option': '#89ddff',
              'textarea': '#89ddff',
              'label': '#89ddff',
              
              // Balises de tableau
              'table': '#f07178', // Rouge
              'tr': '#f07178',
              'td': '#f07178',
              'th': '#f07178',
              'thead': '#f07178',
              'tbody': '#f07178',
              'tfoot': '#f07178',
              
              // Balises de média
              'img': '#c792ea', // Violet
              'video': '#c792ea',
              'audio': '#c792ea',
              'source': '#c792ea',
              
              // Balises de lien
              'a': '#f78c6c', // Orange
              
              // Balises de texte
              'h1': '#82aaff', // Bleu clair
              'h2': '#82aaff',
              'h3': '#82aaff',
              'h4': '#82aaff',
              'h5': '#82aaff',
              'h6': '#82aaff',
              'strong': '#82aaff',
              'em': '#82aaff',
              'b': '#82aaff',
              'i': '#82aaff',
              
              // Par défaut
              'default': '#82aaff' // Bleu clair
            };
            
            return colors[tagName.toLowerCase()] || colors.default;
          }

          function formatElementWithChildren(element, indent, isHovered = false) {
            if (!element || !element.tagName) return '';
            
            const tagName = element.tagName.toLowerCase();
            const tagColor = isHovered ? '#ffcb6b' : getTagColor(tagName);
            const hoverStyle = isHovered ? 'font-style: italic; font-weight: bold;' : '';
            let html = `${indent}<span class="tag-open" style="color: ${tagColor}; ${hoverStyle}">&lt;${tagName}</span>`;
            
            // Attributs
            if (element.attributes.length > 0) {
              const attrs = Array.from(element.attributes)
                .filter(attr => {
                  // Exclure les attributs ARIA
                  if (attr.name.startsWith('aria-')) return false;
                  
                  // Pour l'attribut class, filtrer les classes
                  if (attr.name === 'class') {
                    const classes = attr.value.split(' ').filter(cls => {
                      // Ne conserver que les classes Odoo (commençant par o_)
                      return cls.startsWith('o_');
                    });
                    // Si aucune classe Odoo, exclure l'attribut class
                    return classes.length > 0;
                  }
                  
                  return true;
                })
                .map(attr => {
                  // Pour l'attribut class, ne garder que les classes Odoo
                  if (attr.name === 'class') {
                    const odooClasses = attr.value.split(' ').filter(cls => cls.startsWith('o_'));
                    return {
                      name: attr.name,
                      value: odooClasses.join(' ')
                    };
                  }
                  return attr;
                });
              
              if (attrs.length > 0) {
                if (attrs.length > 3) {
                  // Plus de 3 attributs : un par ligne
                  html += '\n';
                  attrs.forEach(attr => {
                    const value = attr.name === 'src' && attr.value.length > 22 
                      ? attr.value.substring(0, 22) + '...' 
                      : attr.value;
                    html += `${indent}    <span class="attr">${attr.name}</span>="<span class="value">${value}</span>"\n`;
                  });
                  html += `${indent}`;
                } else {
                  // 3 attributs ou moins : tous sur la même ligne
                  html += ' ' + attrs
                    .map(attr => {
                      const value = attr.name === 'src' && attr.value.length > 22 
                        ? attr.value.substring(0, 22) + '...' 
                        : attr.value;
                      return `<span class="attr">${attr.name}</span>="<span class="value">${value}</span>"`;
                    })
                    .join(' ');
                }
              }
            }
            
            // Si l'élément n'a pas d'enfants
            if (element.children.length === 0) {
              const text = element.textContent.trim();
              if (!text) {
                html += `<span class="tag-close" style="color: ${tagColor}; ${hoverStyle}"> /&gt;</span>\n`;
              } else {
                html += `<span class="tag-close" style="color: ${tagColor}; ${hoverStyle}">&gt;</span>\n`;
                html += `${indent}  <span class="text">${text}</span>\n`;
                html += `${indent}<span class="tag-open" style="color: ${tagColor}; ${hoverStyle}">&lt;/${tagName}</span><span class="tag-close" style="color: ${tagColor}; ${hoverStyle}">&gt;</span>\n`;
              }
              return html;
            }
            
            // Si l'élément a des enfants
            html += `<span class="tag-close" style="color: ${tagColor}; ${hoverStyle}">&gt;</span>\n`;
            
            // Afficher uniquement le texte direct de l'élément parent
            const childNodes = Array.from(element.childNodes);
            const directText = childNodes
              .filter(node => node.nodeType === Node.TEXT_NODE)
              .map(node => node.textContent.trim())
              .filter(text => text.length > 0)
              .join(' ');
            
            if (directText) {
              html += `${indent}  <span class="text">${directText}</span>\n`;
            }
            
            // Ajouter les enfants
            Array.from(element.children).forEach(child => {
              html += formatElementWithChildren(child, indent + '  ', false);
            });
            
            // Balise fermante avec la même indentation que l'ouverture
            html += `${indent}<span class="tag-open" style="color: ${tagColor}; ${hoverStyle}">&lt;/${tagName}</span><span class="tag-close" style="color: ${tagColor}; ${hoverStyle}">&gt;</span>\n`;
            
            return html;
          }

          // Variables pour la gestion du tooltip
          let currentTooltip = null;
          let isShiftPressed = false;

          // Gestionnaires d'événements
          const eventHandlers = {
            keydown: (e) => {
              if (e.key === 'Shift') {
                isShiftPressed = true;
              }
            },
            
            keyup: (e) => {
              if (e.key === 'Shift') {
                isShiftPressed = false;
              }
            },
            
            wheel: (e) => {
              if (isShiftPressed && currentTooltip) {
                e.preventDefault();
                currentTooltip.scrollTop += e.deltaY;
              }
            },
            
            mouseover: (e) => {
              if (!window._htmlInspectorEnabled) return;
              
              const element = e.target;
              if (element === document.body) return;
              
              // Supprimer l'ancienne tooltip
              const oldTooltip = document.querySelector('.html-inspector-tooltip');
              if (oldTooltip) oldTooltip.remove();
              
              // Créer le tooltip
              const tooltip = document.createElement('div');
              tooltip.className = 'html-inspector-tooltip';
              tooltip.innerHTML = `<pre>${formatElementWithChildren(element, '', true)}</pre>`;
              document.body.appendChild(tooltip);
              currentTooltip = tooltip;
              
              // Positionner le tooltip
              const rect = element.getBoundingClientRect();
              const tooltipRect = tooltip.getBoundingClientRect();
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              const scrollX = window.scrollX;
              const scrollY = window.scrollY;
              
              // Calculer la position initiale
              let left = rect.right + scrollX;
              let top = rect.bottom + scrollY;
              
              // Ajustements horizontaux et verticaux
              if (left + tooltipRect.width > viewportWidth + scrollX) {
                left = rect.left + scrollX - tooltipRect.width;
                if (left < scrollX) {
                  left = Math.max(scrollX, Math.min(scrollX + viewportWidth - tooltipRect.width, 
                    rect.left + scrollX + (rect.width - tooltipRect.width) / 2));
                }
              }
              
              if (top + tooltipRect.height > viewportHeight + scrollY) {
                top = rect.top + scrollY - tooltipRect.height;
                if (top < scrollY) {
                  const spaceAbove = rect.top;
                  const spaceBelow = viewportHeight - rect.bottom;
                  top = spaceBelow > spaceAbove ? 
                    viewportHeight + scrollY - tooltipRect.height - 10 : 
                    scrollY + 10;
                }
              }
              
              // Appliquer la position
              tooltip.style.left = `${Math.max(scrollX, left)}px`;
              tooltip.style.top = `${Math.max(scrollY, top)}px`;
            },
            
            mouseout: (e) => {
              if (!window._htmlInspectorEnabled) return;
              const tooltip = document.querySelector('.html-inspector-tooltip');
              if (tooltip) {
                tooltip.remove();
                currentTooltip = null;
              }
            }
          };
          
          // Ajouter tous les gestionnaires d'événements
          window.addEventListener('keydown', eventHandlers.keydown);
          window.addEventListener('keyup', eventHandlers.keyup);
          window.addEventListener('wheel', eventHandlers.wheel, { passive: false });
          document.addEventListener('mouseover', eventHandlers.mouseover);
          document.addEventListener('mouseout', eventHandlers.mouseout);
          
          // Sauvegarder les gestionnaires pour pouvoir les supprimer plus tard
          window._htmlInspectorEventHandlers = eventHandlers;
          
          // Activer l'inspecteur
          window._htmlInspectorEnabled = true;
        },
      });
      this.isEnabled = true;
    } catch (error) {
      // Erreur non fatale
      console.error(`[HTMLInspector] Error enabling HTML inspector for tab ${tabId}:`, error.message);
    }
  },

  async disable(tabId) {
    if (!tabId) {
      console.error("[HTMLInspector] Invalid tabId provided");
      return;
    }

    try {
      await browserAPI.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Supprimer le style
          const style = document.getElementById('html-inspector-style');
          if (style) {
            style.remove();
          }
          
          // Supprimer les gestionnaires d'événements si existants
          if (window._htmlInspectorEventHandlers) {
            const handlers = window._htmlInspectorEventHandlers;
            window.removeEventListener('keydown', handlers.keydown);
            window.removeEventListener('keyup', handlers.keyup);
            window.removeEventListener('wheel', handlers.wheel, { passive: false });
            document.removeEventListener('mouseover', handlers.mouseover);
            document.removeEventListener('mouseout', handlers.mouseout);
            
            // Nettoyer la référence
            delete window._htmlInspectorEventHandlers;
          }
          
          // Désactiver l'inspecteur
          window._htmlInspectorEnabled = false;
          
          // Nettoyer les tooltips qui pourraient rester
          const tooltip = document.querySelector('.html-inspector-tooltip');
          if (tooltip) {
            tooltip.remove();
          }
        },
      });
      
      // Réactiver les tooltips d'Odoo quand l'inspecteur HTML est désactivé
      await TooltipManager.showTooltips(tabId);
      
      this.isEnabled = false;
    } catch (error) {
      // Erreur non fatale
      console.error(`[HTMLInspector] Error disabling HTML inspector for tab ${tabId}:`, error.message);
    }
  },

  async toggle(tabId, enable) {
    if (!tabId) {
      console.error("[HTMLInspector] Invalid tabId provided");
      return;
    }

    try {
      if (enable) {
        await this.enable(tabId);
      } else {
        await this.disable(tabId);
      }
    } catch (error) {
      // Erreur non fatale
      console.error(`[HTMLInspector] Error toggling HTML inspector for tab ${tabId}:`, error.message);
    }
  }
}; 