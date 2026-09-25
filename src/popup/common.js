// Shared popup helpers, identical in every extension.
// Loaded in <head>, so a forced theme applies before the first paint and the
// helpers are ready when popup.js runs. Translations run before popup.js too.

const I18N_TARGETS = {
  'data-i18n': 'textContent',
  'data-i18n-title': 'title',
  'data-i18n-placeholder': 'placeholder'
};

function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function applyTranslations() {
  const title = chrome.i18n.getMessage('popupTitle');
  if (title) document.title = title;
  document.documentElement.lang = chrome.i18n.getUILanguage();

  Object.entries(I18N_TARGETS).forEach(([attribute, property]) => {
    document.querySelectorAll(`[${attribute}]`).forEach((el) => {
      const message = chrome.i18n.getMessage(el.getAttribute(attribute));
      if (message) el[property] = message;
    });
  });
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Origin (protocol + host) of an http(s) URL, or null for other pages
function getOrigin(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch (e) {
    return null;
  }
}

// The subtitle doubles as a status line; toned messages revert to its default text
let statusTimer = null;
function showStatus(message, tone) {
  const info = document.querySelector('.info-text');
  clearTimeout(statusTimer);
  info.textContent = message;
  info.className = tone ? `info-text is-${tone}` : 'info-text';
  if (tone) {
    statusTimer = setTimeout(() => showStatus(t(info.dataset.i18n)), 4000);
  }
}

// Theme: "auto" follows the browser; "light" and "dark" are stored per extension
(() => {
  const STORAGE_KEY = 'theme';
  const MODES = ['auto', 'light', 'dark'];
  const LABELS = { auto: 'themeAuto', light: 'themeLight', dark: 'themeDark' };
  const root = document.documentElement;

  function readMode() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return MODES.includes(saved) ? saved : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function applyMode(value) {
    if (value === 'auto') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = value;
    }
  }

  let mode = readMode();
  applyMode(mode);

  document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();

    const versionChip = document.getElementById('versionChip');
    if (versionChip) {
      versionChip.textContent = `v${chrome.runtime.getManifest().version}`;
    }

    const themeBtn = document.getElementById('themeBtn');
    const themeLabel = document.getElementById('themeLabel');
    if (!themeBtn || !themeLabel) return;

    function render() {
      themeLabel.textContent = t(LABELS[mode]);
      themeBtn.title = t('themeTitle');
    }

    themeBtn.addEventListener('click', () => {
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      applyMode(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch (e) {
        // Storage blocked: the choice lasts until the popup closes
      }
      render();
    });

    render();
  });
})();
