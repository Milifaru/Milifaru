import { getSettings, setSettings, pushHistory, getHistory } from './storage.js';
import { t } from './i18n.js';

const $ = sel => document.querySelector(sel);
let state = { selector: '', top: [], unique: false, textAlt: '', mode: 'get', domain: '' };

async function init() {
  $('#title').textContent = t('title');
  $('#enableLabel').textContent = t('enablePicker');
  $('#copySelector').textContent = t('copy');
  $('#modeLabel').textContent = t('mode');
  $('#copyPreview').textContent = t('copy');
  $('#historyLabel').textContent = t('history');
  $('#allowNthLabel').textContent = t('allowNth');
  $('#maxDepthLabel').textContent = t('maxDepth');

  const settings = await getSettings();
  state.mode = settings.mode;
  $('#allowNth').checked = settings.allowNth;
  $('#maxDepth').value = settings.maxDepth;
  document.querySelector(`input[name=mode][value=${state.mode}]`).checked = true;

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    try {
      state.domain = new URL(tabs[0].url).hostname;
      loadHistory();
    } catch (e) {}
  });

  $('#pickerToggle').addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_PICKER' });
  });

  $('#copySelector').addEventListener('click', () => {
    navigator.clipboard.writeText(state.selector);
  });

  $('#copyPreview').addEventListener('click', copyPreview);

  $('#allowNth').addEventListener('change', saveSettings);
  $('#maxDepth').addEventListener('change', saveSettings);
  document.querySelectorAll('input[name=mode]').forEach(r => r.addEventListener('change', e => {
    state.mode = e.target.value;
    setSettings({ mode: state.mode });
    updatePreview();
  }));

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'PICKED') {
      handlePicked(msg);
    } else if (msg.type === 'MODE_CHANGED') {
      state.mode = msg.mode;
      document.querySelector(`input[name=mode][value=${state.mode}]`).checked = true;
      updatePreview();
    } else if (msg.type === 'COPY_SELECTED') {
      copyPreview();
    }
  });
}

function copyPreview() {
  navigator.clipboard.writeText($('#previewText').textContent);
}

function saveSettings() {
  setSettings({ allowNth: $('#allowNth').checked, maxDepth: parseInt($('#maxDepth').value, 10), mode: state.mode });
  chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS' });
}

async function loadHistory() {
  const list = await getHistory(state.domain);
  const ul = $('#historyList');
  ul.innerHTML = '';
  list.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.selector;
    ul.appendChild(li);
  });
}

function handlePicked(data) {
  state.selector = data.selector;
  state.top = data.top;
  state.unique = data.unique;
  state.textAlt = data.textAlt;
  $('#bestSelector').value = data.selector;
  $('#uniqueFlag').textContent = data.unique ? t('unique') : '';
  const container = $('#topCandidates');
  container.innerHTML = '';
  data.top.forEach((sel, i) => {
    const id = `cand${i}`;
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'cand';
    input.value = sel;
    if (i === 0) input.checked = true;
    input.addEventListener('change', e => {
      state.selector = e.target.value;
      updatePreview();
    });
    label.appendChild(input);
    label.append(sel);
    container.appendChild(label);
  });
  updatePreview();
  if (state.domain) {
    pushHistory(state.domain, { selector: data.selector, text: data.textAlt });
    loadHistory();
  }
  if (data.context === 'shadow') {
    $('#contextWarning').textContent = t('shadowWarning');
    $('#contextWarning').style.display = 'block';
  } else if (data.context === 'iframe') {
    $('#contextWarning').textContent = t('iframeWarning');
    $('#contextWarning').style.display = 'block';
  } else {
    $('#contextWarning').style.display = 'none';
  }
}

function updatePreview() {
  const code = $('#previewText');
  if (state.mode === 'get') {
    code.textContent = `cy.get('${state.selector}')`;
    code.classList.remove('disabled');
  } else {
    if (state.textAlt) {
      code.textContent = `cy.contains('${state.textAlt}')`;
      code.classList.remove('disabled');
    } else {
      code.textContent = `// ${t('noText')}`;
      code.classList.add('disabled');
    }
  }
}

init();
