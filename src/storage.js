const DEFAULTS = { allowNth: false, maxDepth: 3, mode: 'get' };

export async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...data };
}

export async function setSettings(settings) {
  await chrome.storage.sync.set(settings);
}

export async function pushHistory(domain, item) {
  const key = `history:${domain}`;
  const data = await chrome.storage.sync.get({ [key]: [] });
  const list = data[key];
  list.unshift(item);
  if (list.length > 10) list.length = 10;
  await chrome.storage.sync.set({ [key]: list });
}

export async function getHistory(domain) {
  const key = `history:${domain}`;
  const data = await chrome.storage.sync.get({ [key]: [] });
  return data[key];
}
