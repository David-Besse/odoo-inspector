/**
 * Constantes partagées pour l'extension Odoo Inspector
 * @author David B.
 */

/**
 * Chemins utilisés dans les URLs Odoo
 */
export const OdooPaths = {
  ODOO_18: "/odoo",
  ODOO_PRE_18: "/web",
};

/**
 * Paramètres pour les différents modes debug
 * - VALUE/QUERY: Mode debug normal
 * - VALUE_ASSETS/QUERY_ASSETS: Mode debug avec assets (chargement non-minifié des ressources)
 */
export const DebugParameter = {
  NAME: "debug",
  VALUE: "1",
  VALUE_ASSETS: "assets",
  QUERY: "debug=1",
  QUERY_ASSETS: "debug=assets",
}; 