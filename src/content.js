let picking = false;
let lastEl = null;
let overlay, tooltip, settings;
let bestSelector, textBased;

(async () => {
  ({ bestSelector, textBased } = await import(chrome.runtime.getURL('src/selectorEngine.js')));
  const storage = await import(chrome.runtime.getURL('src/storage.js'));
  settings = await storage.getSettings();
  overlay = document.createElement('div');
  overlay.className = 'selector-helper-overlay';
  tooltip = document.createElement('div');
  tooltip.className = 'selector-helper-tooltip';
  overlay.style.display = 'none';
  tooltip.style.display = 'none';
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(tooltip);
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
  if (!picking) return;
  const el = e.target;
  if (!el || el === overlay || el === tooltip) return;
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
  if (!picking) return;
  e.preventDefault();
  e.stopPropagation();
  picking = false;
  overlay.style.display = 'none';
  tooltip.style.display = 'none';
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
  chrome.runtime.sendMessage({ type: 'PICKED', selector: res.selector, top: res.top, unique: res.unique, textAlt, context, framePath });
}, true);

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'TOGGLE_PICKER') {
    picking = !picking;
    if (!picking) {
      overlay.style.display = 'none';
      tooltip.style.display = 'none';
    }
  } else if (msg.type === 'UPDATE_SETTINGS') {
    import(chrome.runtime.getURL('src/storage.js')).then(m => m.getSettings().then(s => (settings = s)));
  }
});
