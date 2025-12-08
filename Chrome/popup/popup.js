// Page Timer - Popup Script
// Renderiza las métricas de rendimiento en la UI

document.addEventListener('DOMContentLoaded', async () => {
  const metricsBody = document.getElementById('metricsBody');
  const totalValue = document.getElementById('totalValue');
  const totalRow = document.getElementById('totalRow');
  const noData = document.getElementById('noData');
  const currentUrl = document.getElementById('currentUrl');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  let currentMetrics = null;
  let currentTabId = null;

  // Obtener la pestaña activa
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  // Cargar métricas
  async function loadMetrics() {
    try {
      const tab = await getCurrentTab();
      currentTabId = tab.id;
      
      // Mostrar URL actual
      currentUrl.textContent = tab.url;
      currentUrl.title = tab.url;

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
      console.error('Error loading metrics:', error);
      showNoData();
    }
  }

  // Renderizar métricas en la tabla
  function renderMetrics(metrics) {
    metricsBody.innerHTML = '';
    noData.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';
    totalRow.style.display = 'flex';

    // Encontrar la duración máxima para escalar las barras
    const maxDuration = Math.max(...metrics.events.map(e => e.duration));

    metrics.events.forEach(event => {
      const row = document.createElement('tr');
      
      // Calcular el ancho de la barra de duración
      const barWidth = maxDuration > 0 ? (event.duration / maxDuration) * 100 : 0;
      
      row.innerHTML = `
        <td><span class="event-name">${event.name}</span></td>
        <td>${formatNumber(event.start)}</td>
        <td class="duration-cell">
          <div class="duration-bar" style="width: ${barWidth}%"></div>
          <span class="duration-value">${formatNumber(event.duration)}</span>
        </td>
        <td>${formatNumber(event.end)}</td>
      `;
      
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
      alert('No hay datos para descargar');
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
      console.error('Error clearing metrics:', error);
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

  // Event listeners
  downloadBtn.addEventListener('click', downloadData);
  clearBtn.addEventListener('click', clearData);
  refreshBtn.addEventListener('click', refreshData);

  // Cargar métricas al abrir el popup
  loadMetrics();
});
