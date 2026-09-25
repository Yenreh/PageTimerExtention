// Page Timer - Popup Script
// Renderiza las métricas de rendimiento en la UI
// Shared helpers (t, getCurrentTab, getOrigin, showStatus) live in common.js

// Patron de coincidencia del origen para los permisos opcionales
function originPattern(origin) {
  return `${origin}/*`;
}

// El acceso a cada sitio se concede por separado al activar el interruptor
async function hasSitePermission(origin) {
  try {
    return await chrome.permissions.contains({ origins: [originPattern(origin)] });
  } catch (e) {
    return false;
  }
}

async function requestSitePermission(origin) {
  try {
    return await chrome.permissions.request({ origins: [originPattern(origin)] });
  } catch (e) {
    return false;
  }
}

async function removeSitePermission(origin) {
  try {
    await chrome.permissions.remove({ origins: [originPattern(origin)] });
  } catch (e) {
    // El permiso ya no estaba concedido
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const metricsBody = document.getElementById('metricsBody');
  const totalValue = document.getElementById('totalValue');
  const totalRow = document.getElementById('totalRow');
  const noData = document.getElementById('noData');
  const currentUrl = document.getElementById('currentUrl');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const enableToggle = document.getElementById('enableToggle');
  const toggleBar = document.getElementById('toggleBar');

  let currentMetrics = null;
  let currentTabId = null;
  let currentOrigin = null;

  // Cargar y reflejar el estado de activación del sitio actual
  async function loadSiteState() {
    if (!currentOrigin) {
      enableToggle.checked = false;
      enableToggle.disabled = true;
      toggleBar.title = t('toggleUnavailable');
      return;
    }

    toggleBar.title = '';
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SITE_STATE',
      origin: currentOrigin
    });

    let enabled = !!(response && response.enabled);

    // El acceso al sitio pudo revocarse desde el navegador
    if (enabled && !(await hasSitePermission(currentOrigin))) {
      enabled = false;
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_SITE',
        origin: currentOrigin,
        tabId: currentTabId,
        enabled: false
      });
    }

    enableToggle.disabled = false;
    enableToggle.checked = enabled;
  }

  // Cargar métricas
  async function loadMetrics() {
    try {
      const tab = await getCurrentTab();
      currentTabId = tab.id;
      currentOrigin = getOrigin(tab.url);

      // Mostrar URL actual
      currentUrl.textContent = tab.url;
      currentUrl.title = tab.url;

      await loadSiteState();

      // Intentar obtener métricas del storage
      const key = `metrics_${tab.id}`;
      const result = await chrome.storage.local.get(key);
      const metrics = result[key];

      if (metrics && metrics.events && metrics.events.length > 0) {
        currentMetrics = metrics;
        renderMetrics(metrics);
      } else {
        showNoData();
      }
    } catch (error) {
      showNoData();
    }
  }

  // Crear una celda con un elemento hijo
  function createCell(child, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.appendChild(child);
    return cell;
  }

  // Crear un elemento con clase y texto
  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // Renderizar métricas en la tabla
  function renderMetrics(metrics) {
    metricsBody.replaceChildren();
    noData.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';
    totalRow.style.display = 'flex';

    // Waterfall scale: end of the last event
    const span = Math.max(metrics.total || 0, ...metrics.events.map(e => e.end || 0));

    metrics.events.forEach(event => {
      const row = document.createElement('tr');

      // Each bar starts at its start time; both as % of the whole load
      const bar = createElement('div', 'duration-bar');
      if (span > 0) {
        bar.style.left = `${(event.start / span) * 100}%`;
        bar.style.width = `${(event.duration / span) * 100}%`;
      }

      const durationCell = createCell(bar, 'duration-cell');
      durationCell.appendChild(createElement('span', 'duration-value', formatNumber(event.duration)));

      row.appendChild(createCell(createElement('span', 'event-name', event.name)));
      row.appendChild(createCell(document.createTextNode(formatNumber(event.start))));
      row.appendChild(durationCell);
      row.appendChild(createCell(document.createTextNode(formatNumber(event.end))));

      metricsBody.appendChild(row);
    });

    // Mostrar total
    if (metrics.total) {
      totalValue.textContent = formatNumber(metrics.total);
    }
  }

  // Mostrar estado sin datos
  function showNoData() {
    noData.style.display = 'block';
    document.querySelector('.table-container').style.display = 'none';
    totalRow.style.display = 'none';
    currentMetrics = null;
  }

  // Formatear números
  function formatNumber(value) {
    if (value === undefined || value === null || isNaN(value)) return '--';
    return Math.round(value).toLocaleString();
  }

  // Descargar datos como JSON
  function downloadData() {
    if (!currentMetrics) {
      showStatus(t('alertNoData'), 'warning');
      return;
    }

    const dataStr = JSON.stringify(currentMetrics, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `page-timer-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Limpiar datos
  async function clearData() {
    if (!currentTabId) return;

    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_METRICS',
        tabId: currentTabId
      });
      showNoData();
    } catch (error) {
      // Ignorar
    }
  }

  // Actualizar/recargar métricas
  async function refreshData() {
    const tab = await getCurrentTab();
    if (tab) {
      // Recargar la página para obtener nuevas métricas
      await chrome.tabs.reload(tab.id);
      // Esperar un momento y cerrar el popup
      setTimeout(() => window.close(), 500);
    }
  }

  // Activar/desactivar la medición en el sitio actual
  async function toggleSite() {
    if (!currentOrigin || !currentTabId) return;

    const enabled = enableToggle.checked;

    // Pedir el acceso al sitio es lo primero, para no perder el gesto del usuario
    if (enabled && !(await requestSitePermission(currentOrigin))) {
      enableToggle.checked = false;
      showStatus(t('permissionDenied'), 'error');
      return;
    }

    showStatus(t('infoText'));
    enableToggle.disabled = true;

    try {
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_SITE',
        origin: currentOrigin,
        tabId: currentTabId,
        enabled
      });

      if (enabled) {
        // Dar tiempo a que el content script recién inyectado envíe las métricas
        setTimeout(loadMetrics, 600);
      } else {
        await removeSitePermission(currentOrigin);
        showNoData();
      }
    } finally {
      enableToggle.disabled = false;
    }
  }

  // Event listeners
  downloadBtn.addEventListener('click', downloadData);
  clearBtn.addEventListener('click', clearData);
  refreshBtn.addEventListener('click', refreshData);
  enableToggle.addEventListener('change', toggleSite);

  // Cargar métricas al abrir el popup
  loadMetrics();
});
