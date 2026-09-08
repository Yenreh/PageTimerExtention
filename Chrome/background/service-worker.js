// Page Timer - Background Service Worker
// Gestiona métricas de rendimiento y actualiza el badge del ícono

// Almacén en memoria para las métricas actuales por pestaña
const tabMetrics = new Map();

function getOrigin(url) {
  try {
    return new URL(url).origin;
  } catch (e) {
    return null;
  }
}

async function isSiteEnabled(origin) {
  if (!origin) return false;
  const { enabledOrigins = {} } = await chrome.storage.local.get('enabledOrigins');
  return !!enabledOrigins[origin];
}

// El acceso a cada sitio se concede por separado desde el popup
async function hasSitePermission(origin) {
  try {
    return await chrome.permissions.contains({ origins: [`${origin}/*`] });
  } catch (e) {
    return false;
  }
}

async function setSiteEnabled(origin, enabled) {
  const { enabledOrigins = {} } = await chrome.storage.local.get('enabledOrigins');
  if (enabled) {
    enabledOrigins[origin] = true;
  } else {
    delete enabledOrigins[origin];
  }
  await chrome.storage.local.set({ enabledOrigins });
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
  } catch (e) {
    // Página restringida (chrome://, tienda de extensiones, etc.), no se puede inyectar
  }
}

function clearTabData(tabId) {
  tabMetrics.delete(tabId);
  chrome.storage.local.remove(`metrics_${tabId}`);
  chrome.action.setBadgeText({ tabId, text: '' });
}

// Escuchar mensajes del content script y popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PERFORMANCE_METRICS' && sender.tab) {
    const tabId = sender.tab.id;
    const metrics = message.data;

    tabMetrics.set(tabId, metrics);
    updateBadge(tabId, metrics.total);
    saveMetrics(tabId, metrics);

    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_METRICS') {
    const tabId = message.tabId;
    sendResponse({ metrics: tabMetrics.get(tabId) });
    return true;
  }

  if (message.type === 'CLEAR_METRICS') {
    clearTabData(message.tabId);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_SITE_STATE') {
    isSiteEnabled(message.origin).then((enabled) => sendResponse({ enabled }));
    return true;
  }

  if (message.type === 'TOGGLE_SITE') {
    const { origin, tabId, enabled } = message;
    setSiteEnabled(origin, enabled).then(async () => {
      if (enabled) {
        await injectContentScript(tabId);
      } else {
        clearTabData(tabId);
      }
      sendResponse({ success: true });
    });
    return true;
  }

  return false;
});

// Actualizar badge del ícono
function updateBadge(tabId, totalMs) {
  if (!totalMs || totalMs <= 0) return;

  // Convertir a segundos con 2 decimales
  const totalSeconds = (totalMs / 1000).toFixed(2);

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
    color: color
  });
}

// Guardar métricas en storage
async function saveMetrics(tabId, metrics) {
  try {
    const key = `metrics_${tabId}`;
    await chrome.storage.local.set({ [key]: metrics });
  } catch (e) {
    // Ignorar errores de almacenamiento
  }
}

// Limpiar métricas cuando se cierra una pestaña
chrome.tabs.onRemoved.addListener((tabId) => {
  tabMetrics.delete(tabId);
  chrome.storage.local.remove(`metrics_${tabId}`);
});

// Cuando se navega a una nueva página, limpiar el badge y, si el sitio está
// habilitado, inyectar el content script para medir esa carga
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ tabId, text: '' });
  }

  if (changeInfo.status === 'complete' && tab.url) {
    const origin = getOrigin(tab.url);
    if (origin && (await isSiteEnabled(origin)) && (await hasSitePermission(origin))) {
      injectContentScript(tabId);
    }
  }
});

// Si el usuario revoca el acceso a un sitio desde el navegador, dejar de medirlo
chrome.permissions.onRemoved.addListener(async ({ origins = [] }) => {
  for (const pattern of origins) {
    await setSiteEnabled(pattern.replace(/\/\*$/, ''), false);
  }
});
