// Page Timer - Content Script
// Captura métricas de rendimiento y las envía al background script

(function() {
  'use strict';

  // Evitar ejecución múltiple
  if (window.__pageTimerLoaded) return;
  window.__pageTimerLoaded = true;

  function getPerformanceMetrics() {
    // Usar Navigation Timing API (nivel 2 si está disponible, sino nivel 1)
    let timing;
    let navigationStart;
    
    // Intentar usar Navigation Timing Level 2 primero
    const entries = performance.getEntriesByType('navigation');
    if (entries && entries.length > 0) {
      const navEntry = entries[0];
      timing = {
        navigationStart: 0,
        requestStart: navEntry.requestStart,
        responseStart: navEntry.responseStart,
        responseEnd: navEntry.responseEnd,
        domLoading: navEntry.domInteractive - 100, // Aproximación
        domInteractive: navEntry.domInteractive,
        domContentLoadedEventStart: navEntry.domContentLoadedEventStart,
        domContentLoadedEventEnd: navEntry.domContentLoadedEventEnd,
        domComplete: navEntry.domComplete,
        loadEventStart: navEntry.loadEventStart,
        loadEventEnd: navEntry.loadEventEnd
      };
      navigationStart = 0;
    } else {
      // Fallback a Navigation Timing Level 1
      timing = performance.timing;
      navigationStart = timing.navigationStart;
    }

    // Calcular métricas
    const metrics = {
      url: window.location.href,
      timestamp: Date.now(),
      events: []
    };

    const getTime = (value) => {
      if (navigationStart === 0) return value;
      return value > 0 ? value - navigationStart : 0;
    };

    // Request - Tiempo desde navegación hasta inicio de request
    const requestStart = getTime(timing.requestStart);
    const responseStart = getTime(timing.responseStart);
    if (requestStart > 0 || responseStart > 0) {
      metrics.events.push({
        name: 'Request',
        start: requestStart,
        duration: responseStart - requestStart,
        end: responseStart
      });
    }

    // Response - Tiempo de respuesta del servidor
    const responseEnd = getTime(timing.responseEnd);
    if (responseStart > 0 && responseEnd > 0) {
      metrics.events.push({
        name: 'Response',
        start: responseStart,
        duration: responseEnd - responseStart,
        end: responseEnd
      });
    }

    // DOM Interactive
    const domInteractive = getTime(timing.domInteractive);
    if (responseEnd > 0 && domInteractive > 0) {
      metrics.events.push({
        name: 'DOM',
        start: responseEnd,
        duration: domInteractive - responseEnd,
        end: domInteractive
      });
    }

    // Parse
    const domLoading = getTime(timing.domLoading || responseEnd);
    if (domLoading > 0 && domInteractive > 0) {
      metrics.events.push({
        name: 'Parse',
        start: domLoading,
        duration: Math.max(0, domInteractive - domLoading),
        end: domInteractive
      });
    }

    // Execute Scripts - desde domInteractive hasta domContentLoadedEventEnd
    const domContentLoadedEventEnd = getTime(timing.domContentLoadedEventEnd);
    if (domInteractive > 0 && domContentLoadedEventEnd > 0) {
      metrics.events.push({
        name: 'Execute Scripts',
        start: domInteractive,
        duration: domContentLoadedEventEnd - domInteractive,
        end: domContentLoadedEventEnd
      });
    }

    // Content loaded - DOMContentLoaded event
    const domContentLoadedEventStart = getTime(timing.domContentLoadedEventStart);
    if (domContentLoadedEventStart > 0 && domContentLoadedEventEnd > 0) {
      metrics.events.push({
        name: 'Content loaded',
        start: domContentLoadedEventStart,
        duration: domContentLoadedEventEnd - domContentLoadedEventStart,
        end: domContentLoadedEventEnd
      });
    }

    // Sub Resources - Carga de recursos adicionales
    const loadEventStart = getTime(timing.loadEventStart);
    if (domContentLoadedEventEnd > 0 && loadEventStart > 0) {
      metrics.events.push({
        name: 'Sub Resources',
        start: domContentLoadedEventEnd,
        duration: loadEventStart - domContentLoadedEventEnd,
        end: loadEventStart
      });
    }

    // Load event
    const loadEventEnd = getTime(timing.loadEventEnd);
    if (loadEventStart > 0 && loadEventEnd > 0) {
      metrics.events.push({
        name: 'Load event',
        start: loadEventStart,
        duration: loadEventEnd - loadEventStart,
        end: loadEventEnd
      });
    }

    // Total
    if (loadEventEnd > 0) {
      metrics.total = loadEventEnd;
    }

    return metrics;
  }

  function sendMetrics() {
    const metrics = getPerformanceMetrics();
    
    console.log('Page Timer - Collected metrics:', metrics);
    
    // Verificar que tenemos datos válidos
    if (metrics.total && metrics.total > 0 && metrics.events.length > 0) {
      try {
        chrome.runtime.sendMessage({
          type: 'PERFORMANCE_METRICS',
          data: metrics
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.debug('Page Timer: Could not send metrics', chrome.runtime.lastError);
          } else {
            console.log('Page Timer - Metrics sent successfully', response);
          }
        });
      } catch (e) {
        // Extensión no disponible, ignorar
        console.debug('Page Timer: Could not send metrics', e);
      }
    } else {
      console.log('Page Timer - Metrics not ready, waiting...');
      // Si no tenemos métricas completas, reintentar
      setTimeout(sendMetrics, 500);
    }
  }

  // Esperar a que la página termine de cargar completamente
  function waitForLoadAndSend() {
    if (document.readyState === 'complete') {
      // Dar tiempo extra para que timing esté completamente disponible
      setTimeout(sendMetrics, 200);
    } else {
      window.addEventListener('load', () => {
        setTimeout(sendMetrics, 200);
      });
    }
  }

  // Iniciar
  waitForLoadAndSend();
})();
