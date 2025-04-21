import { detectOdooVersion } from '../core/odoo.js';
import { OdooPaths, DebugParameter } from '../core/constants.js';

export function handleDebugParameter(url, enable) {
  try {
    const version = detectOdooVersion(url);
    const urlObj = new URL(url);
    
    if (version === '18+') {
      if (enable) {
        urlObj.searchParams.set(DebugParameter.NAME, DebugParameter.VALUE);
      } else {
        urlObj.searchParams.delete(DebugParameter.NAME);
      }
    } else if (version === 'pre-18') {
      const pathParts = urlObj.pathname.split(OdooPaths.ODOO_PRE_18);
      
      if (enable) {
        urlObj.pathname = pathParts[0] + OdooPaths.ODOO_PRE_18;
        urlObj.search = `?${DebugParameter.QUERY}` + (pathParts[1] || '');
      } else {
        const basePath = pathParts[0] + OdooPaths.ODOO_PRE_18;
        const remainingPath = pathParts[1] || '';
        urlObj.pathname = basePath + remainingPath;
        
        const searchParams = new URLSearchParams(urlObj.search);
        searchParams.delete(DebugParameter.NAME);
        urlObj.search = searchParams.toString() ? '?' + searchParams.toString() : '';
      }
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Error handling debug parameter:', error);
    return url;
  }
} 