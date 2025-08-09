let picking = false;
let lastEl = null;
let highlighted = null;
let overlay, tooltip, panel, settings;
let bestSelector, textBased, t;
const ui = {};

(async () => {
  ({ bestSelector, textBased } = await import(chrome.runtime.getURL('src/selectorEngine.js')));
  const storage = await import(chrome.runtime.getURL('src/storage.js'));
  ({ t } = await import(chrome.runtime.getURL('src/i18n.js')));
  settings = await storage.getSettings();
  overlay = document.createElement('div');
  overlay.className = 'selector-helper-overlay';
  tooltip = document.createElement('div');
  tooltip.className = 'selector-helper-tooltip';
  overlay.style.display = 'none';
  tooltip.style.display = 'none';
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(tooltip);
  createPanel();
})();

function throttle(fn, wait) {
  let t = 0;
  return function (...args) {
    const now = Date.now();
    if (now - t >= wait) {
      t = now;
      fn.apply(this, args);
    }
  };
}

const moveHandler = throttle(e => {
  if (!picking) {
    if (highlighted) {
      highlighted.classList.remove('__dompick-highlight');
      highlighted = null;
    }
    return;
  }
  const el = e.target;
  if (!el || el === overlay || el === tooltip || (panel && panel.contains(el))) {
    if (highlighted) {
      highlighted.classList.remove('__dompick-highlight');
      highlighted = null;
    }
    return;
  }
  if (highlighted && highlighted !== el) {
    highlighted.classList.remove('__dompick-highlight');
  }
  el.classList.add('__dompick-highlight');
  highlighted = el;
  lastEl = el;
  const rect = el.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  const res = bestSelector(el, settings);
  tooltip.textContent = res.selector + (res.unique ? ' ✓' : ' ✗');
  tooltip.style.display = 'block';
  tooltip.style.top = `${rect.top + window.scrollY}px`;
  tooltip.style.left = `${rect.left + window.scrollX}px`;
}, 80);

document.addEventListener('mousemove', moveHandler, true);

document.addEventListener('click', e => {
  if (!picking || (panel && panel.contains(e.target))) return;
  e.preventDefault();
  e.stopPropagation();
  picking = false;
  overlay.style.display = 'none';
  tooltip.style.display = 'none';
  if (highlighted) {
    highlighted.classList.remove('__dompick-highlight');
    highlighted = null;
  }
  if (ui.toggle) ui.toggle.checked = false;
  if (!lastEl) return;
  const root = lastEl.getRootNode && lastEl.getRootNode();
  const res = bestSelector(lastEl, settings);
  const textAlt = textBased(lastEl);
  let context;
  let framePath;
  if (root instanceof ShadowRoot) {
    context = 'shadow';
  }
  if (window.top !== window) {
    context = 'iframe';
    framePath = [];
    let win = window;
    while (win !== win.top) {
      const parent = win.parent;
      const frames = Array.from(parent.document.querySelectorAll('iframe'));
      const idx = frames.findIndex(f => f.contentWindow === win);
      framePath.unshift(idx);
      win = parent;
    }
  }
  updatePanel(res.selector, textAlt);
  chrome.runtime.sendMessage({ type: 'PICKED', selector: res.selector, top: res.top, unique: res.unique, textAlt, context, framePath });
}, true);

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'TOGGLE_PICKER') {
    picking = !picking;
    if (ui.toggle) ui.toggle.checked = picking;
    if (!picking) {
      overlay.style.display = 'none';
      tooltip.style.display = 'none';
      if (highlighted) {
        highlighted.classList.remove('__dompick-highlight');
        highlighted = null;
      }
    }
  } else if (msg.type === 'COPY_SELECTED') {
    if (ui.selector) navigator.clipboard.writeText(ui.selector.value);
  } else if (msg.type === 'UPDATE_SETTINGS') {
    import(chrome.runtime.getURL('src/storage.js')).then(m => m.getSettings().then(s => (settings = s)));
  }
});

function createPanel() {
  const style = document.createElement('style');
  style.textContent = `
    .selector-helper-panel {position:fixed;bottom:20px;right:20px;background:rgba(40,40,40,0.95);color:#fff;font-family:sans-serif;z-index:2147483647;padding:12px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.3);width:260px;}
    .selector-helper-panel .sh-row{display:flex;align-items:center;margin-bottom:8px;gap:6px;}
    .selector-helper-panel .sh-row:last-child{margin-bottom:0;}
    .selector-helper-panel input[type="text"],.selector-helper-panel input[readonly]{flex:1;padding:4px 6px;border:1px solid #555;border-radius:4px;background:#222;color:#eee;}
    .selector-helper-panel button{background:#4caf50;border:none;color:#fff;padding:4px 8px;border-radius:4px;cursor:pointer;}
    .selector-helper-panel button:hover{background:#45a049;}
    .selector-helper-panel code{background:#000;padding:2px 4px;border-radius:4px;flex:1;word-break:break-all;}
  `;
  document.documentElement.appendChild(style);

  panel = document.createElement('div');
  panel.className = 'selector-helper-panel';
  panel.innerHTML = `
    <div class="sh-row"><label><input type="checkbox" id="sh-toggle"/> ${t('enablePicker')}</label></div>
    <div class="sh-row"><input id="sh-selector" readonly/><button id="sh-copy">${t('copy')}</button></div>
    <div class="sh-row"><code id="sh-preview"></code></div>
  `;
  document.documentElement.appendChild(panel);
  ui.toggle = panel.querySelector('#sh-toggle');
  ui.selector = panel.querySelector('#sh-selector');
  ui.copy = panel.querySelector('#sh-copy');
  ui.preview = panel.querySelector('#sh-preview');

  ui.toggle.addEventListener('change', () => {
    picking = ui.toggle.checked;
    if (!picking) {
      overlay.style.display = 'none';
      tooltip.style.display = 'none';
      if (highlighted) {
        highlighted.classList.remove('__dompick-highlight');
        highlighted = null;
      }
    }
  });

  ui.copy.addEventListener('click', () => {
    navigator.clipboard.writeText(ui.selector.value);
  });
}

function updatePanel(sel, textAlt) {
  if (!ui.selector) return;
  ui.selector.value = sel;
  if (textAlt) {
    ui.preview.textContent = `cy.contains('${textAlt}')`;
  } else {
    ui.preview.textContent = `cy.get('${sel}')`;
  }
}
