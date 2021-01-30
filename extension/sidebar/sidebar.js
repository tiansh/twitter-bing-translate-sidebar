/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
; (async function () {
  const option = (await browser.storage.local.get('option')).option;
  const windowId = (await browser.windows.getCurrent()).id;
  const name = 'sidebar-' + windowId;
  const port = browser.runtime.connect({ name });

  const container = document.getElementById('translate');
  /** @type {Map<string, HTMLDivElement>} */
  const items = new Map();

  let areaId = 0;
  const resultArea = function (text) {
    const item = document.createElement('div');
    item.className = 'translate-item';
    item.innerHTML = '<div class="text"></div><div class="translate" aria-live="polite"></div>';
    const source = item.querySelector('.text');
    const target = item.querySelector('.translate');
    source.textContent = text;
    source.setAttribute('aria-describedby', (target.id = 'translate-' + (++areaId)));
    return item;
  };

  let current = null, init = false;
  port.onMessage.addListener(function (message) {
    const { text, translate, text_lang, translate_lang } = message;
    if (!init) {
      container.innerHTML = '';
      init = true;
    }
    if (!items.has(text)) {
      items.set(text, container.appendChild(resultArea(text)));
    }
    const area = items.get(text);
    if (text_lang) {
      const sourceArea = area.querySelector('.text');
      sourceArea.setAttribute('lang', text_lang);
    }
    if (translate) {
      const resultArea = area.querySelector('.translate');
      resultArea.innerHTML = '';
      translate.split(/(\n)/).forEach(text => {
        if (text === '\n') resultArea.appendChild(document.createElement('br'));
        else resultArea.appendChild(document.createTextNode(text));
      });
      if (translate_lang) resultArea.setAttribute('lang', translate_lang);
      else resultArea.removeAttribute('lang');
    } else {
      if (current) current.classList.remove('current');
      current = area;
      current.classList.add('current');
    }
    current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.body.style.fontSize = option.sidebarFontSize + 'px';
  document.getElementById('theme').href = option.darkMode ? 'dark.css' : 'light.css';

}());
