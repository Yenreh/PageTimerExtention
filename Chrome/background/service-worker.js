// Page Timer - Background Service Worker
// Gestiona métricas de rendimiento y actualiza el badge del ícono

// Almacén en memoria para las métricas actuales por pestaña
const tabMetrics = new Map();

// Escuchar mensajes del content script y popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PERFORMANCE_METRICS' && sender.tab) {
    const tabId = sender.tab.id;
    const metrics = message.data;
    
    console.log('Received metrics for tab', tabId, metrics);
    
    // Guardar métricas para esta pestaña
    tabMetrics.set(tabId, metrics);
    
    // Actualizar badge con el tiempo total
    updateBadge(tabId, metrics.total);
    
    // Guardar en storage para persistencia
    saveMetrics(tabId, metrics);
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'GET_METRICS') {
    const tabId = message.tabId;
    const metrics = tabMetrics.get(tabId);
    console.log('GET_METRICS for tab', tabId, metrics);
    sendResponse({ metrics });
    return true;
  }
  
  if (message.type === 'CLEAR_METRICS') {
    const tabId = message.tabId;
    tabMetrics.delete(tabId);
    chrome.storage.local.remove(`metrics_${tabId}`);
    chrome.action.setBadgeText({
      tabId: tabId,
      text: ''
    });
    sendResponse({ success: true });
    return true;
  }
  
  return false;
});

// Actualizar badge del ícono
function updateBadge(tabId, totalMs) {
  if (!totalMs || totalMs <= 0) return;
  
  // Convertir a segundos con 2 decimales
  const totalSeconds = (totalMs / 1000).toFixed(2);
  
  // Actualizar texto del badge
  chrome.action.setBadgeText({
    tabId: tabId,
    text: totalSeconds
  });
  
  // Color del badge basado en el tiempo
  let color = '#4CAF50'; // Verde - rápido
  if (totalMs > 3000) {
    color = '#FF9800'; // Naranja - moderado
  }
  if (totalMs > 5000) {
    color = '#F44336'; // Rojo - lento
  }
  
  chrome.action.setBadgeBackgroundColor({
    tabId: tabId,
    color: color  // FIX: era 'text', debe ser 'color'
  });
}

// Guardar métricas en storage
async function saveMetrics(tabId, metrics) {
  try {
    const key = `metrics_${tabId}`;
    await chrome.storage.local.set({ [key]: metrics });
    console.log('Saved metrics to storage:', key, metrics);
  } catch (e) {
    console.error('Error saving metrics:', e);
  }
}

// Limpiar métricas cuando se cierra una pestaña
chrome.tabs.onRemoved.addListener((tabId) => {
  tabMetrics.delete(tabId);
  chrome.storage.local.remove(`metrics_${tabId}`);
});

// Cuando se navega a una nueva página, limpiar métricas anteriores
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Limpiar badge mientras carga
    chrome.action.setBadgeText({
      tabId: tabId,
      text: ''
    });
  }
});
