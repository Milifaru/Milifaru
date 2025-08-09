const send = type => chrome.runtime.sendMessage({ type });

document.getElementById('toggle').addEventListener('click', () => send('TOGGLE_PICKER'));
document.getElementById('copy').addEventListener('click', () => send('COPY_SELECTED'));
document.getElementById('mode').addEventListener('click', () => send('SWITCH_MODE'));
