'use strict';
// 首頁與閱讀頁共用的小工具。全部用 DOM API 建立元素、以 textContent 放文字，
// 不把資料拼成 HTML 字串，避免 manifest 或網址參數裡的內容被當成程式執行。

window.X = (() => {
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // 瀏覽器儲存可能被關閉（無痕模式等），讀寫失敗時當作沒有資料。
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('xitian:' + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('xitian:' + key, JSON.stringify(value));
      } catch {}
    },
  };

  const loadManifest = () =>
    fetch('manifest.json', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    });

  // 檔名就是全書頁碼：0137.webp → 137
  const pageNo = (page) => parseInt(page.f, 10);

  const volName = (v) => (v.subtitle ? `${v.title}・${v.subtitle}` : v.title);

  const readUrl = (v, p) => 'read.html?v=' + encodeURIComponent(v.id) + (p ? '&p=' + p : '');

  return { h, store, loadManifest, pageNo, volName, readUrl };
})();
