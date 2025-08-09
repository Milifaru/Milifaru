const messages = {
  en: {
    title: 'Cypress Selector Helper',
    enablePicker: 'Enable picker',
    copy: 'Copy',
    unique: 'unique',
    mode: 'Mode',
    get: 'cy.get',
    contains: 'contains',
    history: 'History',
    allowNth: 'Allow :nth-of-type',
    maxDepth: 'Max depth',
    shadowWarning: 'Element is inside shadow DOM. Adjust your Cypress code.',
    iframeWarning: 'Element is inside iframe. Switch to the frame first.',
    noText: 'no text'
  },
  ru: {
    title: 'Cypress Selector Helper',
    enablePicker: 'Включить пипетку',
    copy: 'Копировать',
    unique: 'уникально',
    mode: 'Режим',
    get: 'cy.get',
    contains: 'contains',
    history: 'История',
    allowNth: 'Разрешить :nth-of-type',
    maxDepth: 'Макс. глубина',
    shadowWarning: 'Элемент в Shadow DOM. Нужен доступ к теневому корню.',
    iframeWarning: 'Элемент внутри iframe. Переключитесь в iframe.',
    noText: 'нет текста'
  }
};

export const lang = navigator.language && navigator.language.startsWith('ru') ? 'ru' : 'en';
export function t(key) {
  return messages[lang][key] || key;
}
