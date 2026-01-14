// Local-only Google Maps API key injector.
// This file is referenced by paginaburger.html before the dynamic loader.
// It will set the key globally and in localStorage so maps-loader.js can use it.
// IMPORTANT: Do not commit this file to your repository.
(function(){
  try {
    // ✅ HABILITADO - API Key configurada y autorizada
    window.GMAPS_API_KEY = 'AIzaSyBMPQHemnpdKV__ZCG4XpZbwqCILZ4bhYk';
    
    // Guardar en localStorage también
    try { 
      localStorage.setItem('gmaps_api_key', window.GMAPS_API_KEY); 
    } catch {}
    
    console.info('[GMAPS] ✅ API key habilitada');
    console.info('[GMAPS] �️ Google Maps Autocomplete activado');
  } catch (e) {
    console.warn('[GMAPS] Error:', e);
  }
})();

