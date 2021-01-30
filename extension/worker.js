/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
; (async function () {
  const isWorker = function () {
    if (top === parent && self !== top) {
      const topUrl = new URL('/', top.location.href).href;
      const weUrl = browser.runtime.getURL('/');
      return topUrl === weUrl;
    }
    return false;
  };
  if (!isWorker()) return;

  await new Promise(resolve => {
    window.addEventListener('load', function () {
      resolve();
    });
  });

  const port = browser.runtime.connect({ name: 'translator' });
  const handler = {};

  const translate = (function () {
    const input = document.getElementById('tta_input_ta');
    const output = document.getElementById('tta_output_ta');
    const source = document.getElementById('tta_srcsl');
    const target = document.getElementById('tta_tgtsl');
    const waitOutput = async function (waitEmpty) {
      while (true) {
        if ((/^[\s.]*$/.test(output.value)) === waitEmpty) return;
        input.click();
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    };
    const getLang = function () {
      const selected = source.selectedOptions[0].textContent;
      const language = [...source.options].reverse().find(option => selected.startsWith(option.textContent));
      return language.value;
    };
    return async function (text, lang = null) {
      if (lang != null) {
        target.value = lang;
      }
      input.value = '';
      input.click();
      await waitOutput(true);
      input.value = text;
      input.click();
      await waitOutput(false);
      const translate = output.value;
      const text_lang = getLang();
      input.value = '';
      input.click();
      return { text_lang, translate };
    };
  }());
  handler.translate = translate;

  port.onMessage.addListener(async message => {
    const { id, method, params } = message;
    port.postMessage({ id, tag: 'ack' });
    try {
      const returnValue = await handler[method](...params);
      port.postMessage({ id, tag: 'return', returnValue });
    } catch (throwValue) {
      port.postMessage({ id, tag: 'fail', throwValue });
    }
  });

}());
