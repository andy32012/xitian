'use strict';
(() => {
  const { h, store, loadManifest, pageNo, volName, readUrl } = window.X;
  const list = document.getElementById('list');

  loadManifest()
    .then(render)
    .catch(() => {
      list.replaceChildren(h('p', { class: 'muted center', text: '目錄載入失敗，請重新整理頁面。' }));
    });

  function render(m) {
    const vols = m.volumes;
    const last = store.get('last', null);
    const progress = store.get('progress', {});

    // 繼續閱讀
    const lastVol = last && vols.find((v) => v.id === last.v);
    if (lastVol) {
      const resume = document.getElementById('resume');
      resume.href = readUrl(lastVol, last.p);
      resume.textContent = `繼續閱讀・${lastVol.title} 第 ${last.p} 頁`;
      resume.hidden = false;
      document.getElementById('start').classList.remove('primary');
    }

    // 最近更新
    const newest = vols
      .filter((v) => v.updated)
      .sort((a, b) => (a.updated < b.updated ? 1 : -1))[0];
    if (newest) {
      const news = document.getElementById('news');
      news.replaceChildren(
        h('span', { class: 'dot', 'aria-hidden': 'true' }),
        `最近更新 ${newest.updated.replaceAll('-', '/')}　`,
        h('a', { href: readUrl(newest), text: `${newest.stage}・${volName(newest)}` })
      );
      news.hidden = false;
    }

    // 卷列表，依章分組
    const groups = [];
    for (const v of vols) {
      let g = groups.find((x) => x.stage === v.stage);
      if (!g) groups.push((g = { stage: v.stage, vols: [] }));
      g.vols.push(v);
    }
    const stageTitles = m.stages || {};

    list.replaceChildren(
      ...groups.map((g) =>
        h(
          'section',
          { class: 'stage' },
          h(
            'h2',
            {},
            g.stage,
            stageTitles[g.stage] ? h('small', { text: stageTitles[g.stage] }) : null
          ),
          g.vols.map((v) => card(v, progress[v.id]))
        )
      ),
      h('p', { class: 'soon', text: '敬請期待' })
    );
  }

  function card(v, readTo) {
    const first = pageNo(v.pages[0]);
    const lastNo = pageNo(v.pages[v.pages.length - 1]);
    const done = readTo ? Math.min(1, (readTo - first + 1) / v.pages.length) : 0;

    return h(
      'a',
      { class: 'vol', href: readUrl(v, readTo && readTo < lastNo ? readTo : null) },
      h('img', {
        class: 'thumb',
        src: v.dir + '/thumb.webp',
        alt: '',
        width: 640,
        height: 360,
        loading: 'lazy',
        decoding: 'async',
      }),
      h(
        'div',
        { class: 'vol-body' },
        h('h3', {}, v.title, v.subtitle ? h('span', { text: v.subtitle }) : null),
        v.blurb ? h('p', { class: 'blurb', text: v.blurb }) : null,
        h(
          'p',
          { class: 'meta' },
          `第 ${first}～${lastNo} 頁・共 ${v.pages.length} 頁`,
          v.updated ? `・${v.updated.replaceAll('-', '/')} 更新` : null
        ),
        done ? readBar(done, readTo) : null
      )
    );
  }

  function readBar(done, readTo) {
    const fill = h('i');
    // 用 CSSOM 設寬度：CSP 不允許 HTML 內嵌 style 屬性，但允許程式設定
    fill.style.width = Math.round(done * 100) + '%';
    return h(
      'div',
      { class: 'readbar' },
      h('b', {}, fill),
      h('span', { text: done >= 1 ? '已讀完' : `讀到第 ${readTo} 頁` })
    );
  }
})();
