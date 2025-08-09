import { getSettings, setSettings } from './storage.js';

chrome.action.onClicked.addListener(tab => {
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PICKER' });
});

chrome.commands.onCommand.addListener(async command => {
  if (command === 'toggle-picker') {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PICKER' });
  } else if (command === 'copy-selector') {
    chrome.runtime.sendMessage({ type: 'COPY_SELECTED' });
  } else if (command === 'switch-mode') {
    const s = await getSettings();
    const mode = s.mode === 'get' ? 'contains' : 'get';
    await setSettings({ mode });
    chrome.runtime.sendMessage({ type: 'MODE_CHANGED', mode });
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'TOGGLE_PICKER') {
    if (sender.tab) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'TOGGLE_PICKER' });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PICKER' });
      });
    }
  } else if (msg.type === 'PICKED') {
    chrome.runtime.sendMessage(msg);
  } else if (msg.type === 'COPY_SELECTED') {
    chrome.runtime.sendMessage(msg);
  }
});
