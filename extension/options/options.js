/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
; (async function () {
  const defaultOption = function () {
    return {
      darkMode: false,
      backgroundWorkerPoolSize: 1,
      backgroundCacheSize: 1000,
      sidebarFontSize: 16,
      translateTargetLang: 'en',
      translateIgnoreLang: ['en'],
    };
  };
  const attributes = [{
    name: 'darkMode',
    type: 'boolean',
    valid: value => true,
  }, {
    name: 'backgroundWorkerPoolSize',
    type: 'number',
    valid: value => value > 0,
  }, {
    name: 'backgroundCacheSize',
    type: 'number',
    valid: value => value > 0,
  }, {
    name: 'sidebarFontSize',
    type: 'number',
    valid: value => value > 0,
  }, {
    name: 'translateTargetLang',
    type: 'string',
    valid: value => true,
  }, {
    name: 'translateIgnoreLang',
    type: 'object',
    valid: value => Array.isArray(value) &&
      value.every(item => typeof item === 'string'),
  }];
  const normalizeOption = function (option) {
    const fallback = defaultOption();
    if (typeof option !== 'object') return fallback;
    const copy = {};
    const valid = attributes.every(({ name, type, valid }) => {
      const value = option[name];
      if (typeof value === 'undefined') {
        copy[name] = fallback[name];
      } else {
        if (typeof value !== type) return false;
        if (!valid(value)) return false;
        copy[name] = JSON.parse(JSON.stringify(value));
      }
      return true;
    });
    if (!valid) return defaultOption();
    return copy;
  };
  const readOption = async function () {
    const option = (await browser.storage.local.get('option')).option;
    return normalizeOption(option);
  };
  const writeOption = async function (option) {
    const normalized = normalizeOption(option);
    await browser.storage.local.set({ option: normalized });
  };

  const option = document.getElementById('option');
  option.value = JSON.stringify(await readOption(), null, 2);
  option.addEventListener('input', function () {
    try {
      writeOption(JSON.parse(option.value));
    } catch {
      writeOption(defaultOption());
    }
  });
}());
