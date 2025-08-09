export function escapeCss(s = '') {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return s.replace(/([.#:[\],>+~=*^$|!\\])/g, '\\$1');
}

export function escapeTextForContains(s = '') {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function isProbablyRandomId(id = '') {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hash = /^[a-z0-9]{10,}$/i;
  return uuid.test(id) || (hash.test(id) && !/[aeiou]{3}/i.test(id));
}

export function isNoisyClass(cls = '') {
  return /^(css-|sc-|chakra-|Mui-|jss-|ant-|_[a-z0-9]{5,}|[a-z0-9]{6,})/i.test(cls);
}

export function score(selector, penalties = 0) {
  return selector.length + penalties;
}
