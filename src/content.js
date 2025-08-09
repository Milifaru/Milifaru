let picking = false;
let lastEl = null;
let highlighted = null;
let overlay, tooltip, panel, settings;
let bestSelector, textBased, t;
const ui = {};
const selections = [];
const selectedEls = [];

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
  const keepPicking = e.ctrlKey || e.metaKey;
  if (!keepPicking) picking = false;
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
  lastEl.classList.add('selector-helper-picked');
  selectedEls.push(lastEl);
  selections.push(res.selector);
  updatePanel(res.selector);
  chrome.runtime.sendMessage({ type: 'PICKED', selector: res.selector, top: res.top, unique: res.unique, textAlt, context, framePath });
}, true);

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'TOGGLE_PICKER') {
    picking = !picking;
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
    .selector-helper-panel {position:fixed;bottom:20px;right:20px;width:260px;font-family:sans-serif;background:rgba(30,30,30,0.95);color:#fff;z-index:2147483647;padding:12px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.3);}
    .selector-helper-panel h3{margin:0 0 8px;font-size:16px;}
    .selector-helper-panel .sh-tip{font-size:12px;margin-bottom:8px;}
    .selector-helper-panel .sh-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
    .selector-helper-panel .sh-row:last-child{margin-bottom:0;}
    .selector-helper-panel button{flex:1;background:#555;border:none;color:#fff;padding:4px 6px;border-radius:4px;cursor:pointer;}
    .selector-helper-panel button:hover{background:#666;}
    #sh-count{font-size:12px;}
    #sh-selector{position:absolute;left:-9999px;opacity:0;}
    .selector-helper-picked{outline:2px solid #4caf50;outline-offset:2px;}
  `;
  document.documentElement.appendChild(style);

  panel = document.createElement('div');
  panel.className = 'selector-helper-panel';
  panel.innerHTML = `
    <h3>${t('title')}</h3>
    <div class="sh-tip">Ctrl+Click elements to select</div>
    <div class="sh-row"><button id="sh-save">Save JSON</button><button id="sh-clear">Clear</button><button id="sh-close">Close</button></div>
    <div class="sh-row"><span id="sh-count">0 selected</span></div>
    <input id="sh-selector" readonly/>
  `;
  document.documentElement.appendChild(panel);
  ui.selector = panel.querySelector('#sh-selector');
  ui.save = panel.querySelector('#sh-save');
  ui.clear = panel.querySelector('#sh-clear');
  ui.close = panel.querySelector('#sh-close');
  ui.count = panel.querySelector('#sh-count');

  ui.save.addEventListener('click', () => {
    const data = JSON.stringify(selections, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selectors.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  ui.clear.addEventListener('click', () => {
    selectedEls.forEach(el => el.classList.remove('selector-helper-picked'));
    selectedEls.length = 0;
    selections.length = 0;
    updatePanel('');
  });

  ui.close.addEventListener('click', () => {
    panel.remove();
    panel = null;
    picking = false;
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
  });
}

function updatePanel(sel) {
  if (ui.selector) ui.selector.value = sel;
  if (ui.count) ui.count.textContent = `${selections.length} selected`;
}
