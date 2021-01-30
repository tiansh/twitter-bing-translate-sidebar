/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
; (async function () {

  class TranslateController {
    constructor() {
      this.cancelled = false;
    }
    cancel() {
      this.cancelled = true;
    }
  }

  class TranslateWorker {
    static initPort() {
      if (TranslateWorker.working) return;
      browser.runtime.onConnect.addListener(function (port, ...a) {
        if (port.name !== 'translator') return;
        TranslateWorker.portReady(port);
      });
      TranslateWorker.working = Promise.resolve();
    }
    constructor() {
      TranslateWorker.initPort();
      /** @type {Promise<void>} */
      this.pending = Promise.resolve();
      /** @type {Map<number, (tag: 'ack'|'return'|'fail', returnValue: any, throwValue: any) => void>} */
      this.callbacks = new Map();
      this.taskId = 0;
      this.port = null;
    }
    unload() {
      if (!this.iframe) return;
      try { TranslateWorker.windowToWorker.delete(this.iframe.contentWindow); } catch { /* ignore */ }
      try { this.iframe.remove(); } catch { /* ignore */ }
      try { this.port.disconnect(); } catch { /* ignore */ }
      this.iframe = null;
      this.port = null;
      this.callbacks.forEach(callback => { callback('fail'); });
    }
    async reload() {
      if (this.iframe) this.unload();
      await this.load();
    }
    async load() {
      if (this.iframe) return Promise.resolve();
      await TranslateWorker.working.catch(() => { });
      this.iframe = document.createElement('iframe');
      this.iframe.src = 'https://www.bing.com/translator';
      this.pending = new Promise(resolve => {
        TranslateWorker.portReady = resolve;
      }).then(port => {
        this.port = port;
        port.onMessage.addListener(message => {
          const { id, tag, returnValue, catchValue } = message;
          this.callbacks.get(id)(tag, returnValue, catchValue);
        });
        return new Promise(resolve => setTimeout(resolve, 10000));
      });
      this.iframe.addEventListener('unload', () => {
        this.unload();
      });
      document.body.appendChild(this.iframe);
      TranslateWorker.working = this.pending.then(() => { }, () => { });
      return this.pending;
    }
    /**
     * @param {string} method
     * @param  {...any} params
     * @returns {Promise<any>}
     */
    sendMessage(method, ...params) {
      return new Promise((resolve, reject) => {
        const id = this.taskId++;
        const timeoutHandler = () => { this.unload(); reject(); };
        let timeout = setTimeout(timeoutHandler, 5000);
        this.callbacks.set(id, (tag, returnValue, throwValue) => {
          clearTimeout(timeout);
          if (tag === 'ack') {
            timeout = setTimeout(timeoutHandler, 30000);
          } else if (tag !== 'ack') {
            this.callbacks.delete(id);
            if (tag === 'fail') {
              reject(throwValue);
            } else {
              resolve(returnValue);
            }
          }
        });
        this.port.postMessage({ method, params, id });
      });
    }
    /**
     * @template ReturnType
     * @param {() => ReturnType|Promise<ReturnType>} callback
     * @param {TranslateController?} controller
     * @returns {Promise<ReturnType>}
     */
    wait(callback, controller) {
      const result = this.pending.then(() => { }, () => { }).then(() => {
        if (controller && controller.cancelled) throw controller;
        return callback();
      });
      this.pending = result.catch(() => { });
      return result;
    }
    /**
     * @param {string} text
     * @param {string} [lang]
     * @param {TranslateController?} controller
     */
    async translate(text, lang, controller) {
      if (lang instanceof TranslateController) {
        controller = lang;
        lang = null;
      }
      await this.load();
      return this.wait(async () => {
        try {
          /** @type {string} */
          const result = await this.sendMessage('translate', text, lang);
          return result;
        } catch {
          this.reload();
          throw new Error('Translate Failed');
        }
      }, controller);
    }
  }

  class TranslateWorkerPool {
    /**
     * @param {object} config
     * @param {number} config.size
     * @param {number} config.cacheSize
     */
    constructor({ size, cacheSize }) {
      this.poolSize = size;
      this.cacheSize = cacheSize;
      this.pool = Array.from(Array(size), _ => new TranslateWorker());
      /** @type {number} */
      this.roundRobin = 0;
      this.pool.reduce((wait, worker) => {
        return wait.then(_ => worker.load().catch(() => { }));
      }, Promise.resolve());
      /** @type {Map<string, string>} */
      this.cache = new Map();
      /** @type {Map<string, Promise<string>>} */
      this.onfly = new Map();
      /** @type {string[]} */
      this.history = [];
      this.lang = 'en';
    }
    getWorker() {
      this.roundRobin = this.roundRobin++ % this.poolSize;
      return this.pool[this.roundRobin];
    }
    setLang(lang) {
      this.lang = lang;
    }
    getLang() {
      return this.lang;
    }
    translate(text) {
      const key = this.lang + ':' + text;
      if (this.cache.has(key)) {
        return Promise.resolve(this.cache.get(key));
      }
      if (this.onfly.has(key)) {
        return this.onfly.get(key);
      }
      const result = this.getWorker().translate(text, this.lang);
      result.then(result => {
        this.cache.set(key, result);
        this.history.push(key);
        if (this.history.length > this.cacheSize) {
          this.cache.delete(this.history.shift());
        }
      }).finally(() => {
        this.onfly.delete(key);
      });
      this.onfly.set(key, result);
      return result;
    }
  }

  const option = (await browser.storage.local.get('option')).option;
  const workers = new TranslateWorkerPool({
    size: option.backgroundWorkerPoolSize,
    cacheSize: option.backgroundCacheSize,
  });
  workers.setLang(option.translateTargetLang);

  const handler = {};
  /** @type {Map<number, browser.runtime.Port>} */
  const sidebarPort = new Map();

  handler.translate = async function (text) {
    const sender = this;
    if (!sender.tab) return;
    const windowId = sender.tab.windowId;
    const port = sidebarPort.get(windowId);
    const message = { text, translate_lang: workers.getLang() };
    port.postMessage(message);
    try {
      const { translate, text_lang } = await workers.translate(text);
      Object.assign(message, { translate, text_lang });
      port.postMessage(message);
    } catch {
      message.translate = browser.i18n.getMessage('translateError');
      port.postMessage(message);
    }
  };

  window.handler = handler;

  browser.runtime.onMessage.addListener(function (message, sender) {
    return handler[message.method].apply(sender, message.params);
  });

  browser.runtime.onConnect.addListener(function (port) {
    if (!port.name.startsWith('sidebar-')) return;
    const windowId = Number(port.name.slice('sidebar-'.length));
    sidebarPort.set(windowId, port);
    port.onDisconnect.addListener(function () {
      sidebarPort.delete(windowId);
    });
  });

  browser.browserAction.onClicked.addListener(() => {
    browser.sidebarAction.toggle();
  });

  if (option.darkMode) {
    try { browser.sidebarAction.setIcon({ path: 'icon-light.svg' }); } catch { /* ignore */ }
    try { browser.browserAction.setIcon({ path: 'icon-light.svg' }); } catch { /* ignore */ }
  }

}());
