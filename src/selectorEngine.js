import { escapeCss, escapeTextForContains, isProbablyRandomId, isNoisyClass, score } from './utils.js';

export function buildCandidates(el, settings = { allowNth: false, maxDepth: 3 }) {
  const tag = el.tagName.toLowerCase();
  const out = new Set();

  if (el.id && !isProbablyRandomId(el.id)) {
    out.add(`#${escapeCss(el.id)}`);
  }

  const attrs = ['name', 'role', 'aria-label', 'title', 'placeholder', 'type', 'href', 'alt'];
  for (const a of attrs) {
    const v = el.getAttribute(a);
    if (v) out.add(`${tag}[${a}="${escapeCss(v)}"]`);
  }

  const classes = [...el.classList].filter(c => !isNoisyClass(c));
  if (classes.length) {
    out.add(tag + classes.slice(0, 1).map(c => `.${escapeCss(c)}`).join(''));
    if (classes.length > 1) out.add(tag + classes.slice(0, 2).map(c => `.${escapeCss(c)}`).join(''));
  } else {
    out.add(tag);
  }

  if (settings.allowNth && el.parentElement) {
    const siblings = Array.from(el.parentElement.children).filter(s => s.tagName === el.tagName);
    const idx = siblings.indexOf(el) + 1;
    out.add(`${tag}:nth-of-type(${idx})`);
  }

  let parent = el.parentElement;
  let depth = 0;
  while (parent && depth < settings.maxDepth) {
    depth++;
    let parentSel = '';
    if (parent.id && !isProbablyRandomId(parent.id)) {
      parentSel = `#${escapeCss(parent.id)}`;
    } else {
      const cls = [...parent.classList].find(c => !isNoisyClass(c));
      if (cls) parentSel = `${parent.tagName.toLowerCase()}.${escapeCss(cls)}`;
    }
    if (parentSel) {
      out.add(`${parentSel} > ${tag}`);
      break;
    }
    parent = parent.parentElement;
  }

  return Array.from(out);
}

export function isUnique(selector, root = document) {
  try {
    return root.querySelectorAll(selector).length === 1;
  } catch (e) {
    return false;
  }
}

function calcPenalties(selector) {
  let p = 0;
  if (/:nth-of-type/.test(selector)) p += 30;
  const depth = (selector.match(/>/g) || []).length + (selector.match(/\s/g) || []).length;
  if (depth > 1) p += (depth - 1) * 10;
  const classes = selector.match(/\.([a-zA-Z0-9_-]+)/g) || [];
  classes.forEach(c => { if (isNoisyClass(c.slice(1))) p += 15; });
  const id = selector.match(/#([a-zA-Z0-9_-]+)/);
  if (id && isProbablyRandomId(id[1])) p += 20;
  return p;
}

export function bestSelector(el, settings = { allowNth: false, maxDepth: 3 }) {
  const candidates = buildCandidates(el, settings);
  const root = el.getRootNode && el.getRootNode();
  const contextRoot = root instanceof ShadowRoot ? root : document;

  const scored = candidates.map(sel => {
    const unique = isUnique(sel, contextRoot);
    return { selector: sel, unique, score: score(sel, calcPenalties(sel)) };
  });

  let uniques = scored.filter(s => s.unique);
  if (uniques.length === 0) uniques = scored;

  uniques.sort((a, b) => a.score - b.score);
  const top = uniques.slice(0, 3).map(s => s.selector);
  return { selector: top[0] || '', top, unique: uniques[0]?.unique || false };
}

export function textBased(el) {
  let text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  if (text.length > 100) text = text.slice(0, 100);
  return escapeTextForContains(text);
}
