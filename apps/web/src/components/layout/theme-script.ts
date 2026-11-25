export const THEME_STORAGE_KEY = 'theme';

/**
 * Runs in <head> before first paint: resolves the stored preference ("light" | "dark", absent = system)
 * into data-theme on <html>, so the server can always render the light default without a flash.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){}})()`;
