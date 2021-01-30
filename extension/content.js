/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
; (function () {
  const ignoreLang = [];
  if (document.readyState !== 'loading') {
    location.reload();
  }
  const getPost = function (target) {
    if (!(target instanceof Element)) return null;
    const article = target.closest('article');
    if (!article) return null;
    const post = article.querySelector('[lang]');
    return post;
  };
  window.addEventListener('DOMContentLoaded', function () {
    const eventHandler = function (event) {
      const post = getPost(event.target);
      if (!post) return;
      const lang = post.lang;
      if (ignoreLang.includes(lang)) return;
      const content = post.innerText;
      browser.runtime.sendMessage({ method: 'translate', params: [content] });
    };
    document.addEventListener('mouseover', eventHandler);
    document.addEventListener('focusin', eventHandler);
  });
  browser.storage.local.get('option').then(({ option }) => {
    ignoreLang.push(...option.translateIgnoreLang);
  });
}());
