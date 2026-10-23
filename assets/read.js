'use strict';
(() => {
  const { h, store, loadManifest, pageNo, volName, readUrl } = window.X;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  loadManifest()
    .then(render)
    .catch(() => {
      $('p').replaceChildren(h('p', { class: 'muted center pad', text: '載入失敗，請重新整理頁面。' }));
    });

  function render(m) {
    const vols = m.volumes;
    // 只接受 manifest 裡存在的卷；網址亂填就回到第一卷
    const i = Math.max(0, vols.findIndex((v) => v.id === params.get('v')));
    const v = vols[i];
    const prev = vols[i - 1];
    const next = vols[i + 1];
    const nums = v.pages.map(pageNo);

    document.title = `${v.stage} ${volName(v)}｜${m.title}`;
    $('t').textContent = `${v.stage}・${volName(v)}`;

    // 頁面
    const imgs = v.pages.map((pg, k) => {
      const big = `${v.dir}/${pg.f}`;
      const img = h('img', {
        src: big,
        srcset: pg.w > 720 ? `${v.dir}/s/${pg.f} 720w, ${big} ${pg.w}w` : null,
        sizes: '(max-width: 760px) 100vw, 1000px',
        width: pg.w,
        height: pg.h,
        alt: `第 ${nums[k]} 頁`,
        loading: k < 2 ? 'eager' : 'lazy',
        decoding: 'async',
        'data-n': nums[k],
      });
      img.style.setProperty('--r', (pg.w / pg.h).toFixed(4));
      return img;
    });

    const volNav = (where) =>
      h(
        'nav',
        { class: 'volnav ' + where, 'aria-label': '換卷' },
        prev
          ? h('a', { href: readUrl(prev) }, h('small', { text: '上一卷' }), volName(prev))
          : h('span'),
        next
          ? h('a', { class: 'next', href: readUrl(next) }, h('small', { text: '下一卷' }), volName(next))
          : h('span', { class: 'soon-inline', text: '下一卷敬請期待' })
      );

    $('p').replaceChildren(volNav('top'), ...imgs);
    $('end').replaceChildren(
      h('p', { class: 'end-title', text: `${volName(v)}　完` }),
      volNav('bottom'),
      h('a', { class: 'btn', href: './', text: '回目錄' })
    );

    // 跳頁選單
    const jump = $('jump');
    jump.replaceChildren(...nums.map((n) => h('option', { value: n, text: `${n}` })));
    $('total').textContent = `/ ${nums[nums.length - 1]}`;
    jump.addEventListener('change', () => go(+jump.value));

    // 程式主動跳頁時，暫時不要因為捲動而收起工具列
    let jumping = 0;
    function go(n, behavior) {
      const target = imgs[nums.indexOf(n)];
      if (!target) return;
      jumping = Date.now();
      target.scrollIntoView({ behavior: behavior || 'auto', block: 'start' });
    }

    // 追蹤目前讀到哪一頁（以畫面中線為準）
    let current = nums[0];
    const seen = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(+e.target.dataset.n);
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );
    imgs.forEach((img) => seen.observe(img));

    let saveTimer;
    function setCurrent(n) {
      if (n === current) return;
      current = n;
      jump.value = String(n);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 400);
    }

    function save() {
      store.set('last', { v: v.id, p: current });
      const progress = store.get('progress', {});
      progress[v.id] = Math.max(progress[v.id] || 0, current);
      store.set('progress', progress);
      history.replaceState(null, '', readUrl(v, current === nums[0] ? null : current));
    }

    // 頂部進度條
    const bar = $('bar');
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // 往下讀時收起工具列，往上滑時出現
    let lastY = scrollY;
    addEventListener(
      'scroll',
      () => {
        const y = scrollY;
        if (Date.now() - jumping > 1200) {
          document.body.classList.toggle('bar-hidden', y > lastY && y > 120);
        }
        lastY = y;
      },
      { passive: true }
    );

    // 縮放模式：整頁塞進螢幕／填滿寬度
    const applyFit = (mode) => {
      document.body.classList.toggle('fit-width', mode === 'width');
      $('fit').textContent = mode === 'width' ? '整頁' : '放大';
      $('fit').setAttribute('aria-label', mode === 'width' ? '改為整頁顯示' : '改為填滿寬度');
    };
    let fit = store.get('fit', 'screen');
    applyFit(fit);
    $('fit').addEventListener('click', () => {
      const keep = current;
      fit = fit === 'width' ? 'screen' : 'width';
      store.set('fit', fit);
      applyFit(fit);
      go(keep);
    });

    // 鍵盤：左右鍵換頁
    addEventListener('keydown', (e) => {
      if (e.target === jump || e.altKey || e.ctrlKey || e.metaKey) return;
      const idx = nums.indexOf(current);
      if (e.key === 'ArrowRight' && idx < nums.length - 1) go(nums[idx + 1]);
      if (e.key === 'ArrowLeft' && idx > 0) go(nums[idx - 1]);
    });

    // 開啟位置：網址有指定頁就直接跳；否則提示上次讀到的地方
    const wanted = parseInt(params.get('p'), 10);
    if (nums.includes(wanted)) {
      requestAnimationFrame(() => go(wanted));
    } else {
      const last = store.get('last', null);
      if (last && last.v === v.id && last.p > nums[0] && nums.includes(last.p)) {
        const toast = $('toast');
        toast.replaceChildren(
          `上次看到第 ${last.p} 頁`,
          h('button', {
            class: 'btn small primary',
            text: '繼續',
            onclick: () => {
              toast.hidden = true;
              go(last.p);
            },
          }),
          h('button', {
            class: 'x',
            'aria-label': '關閉',
            text: '×',
            onclick: () => (toast.hidden = true),
          })
        );
        toast.hidden = false;
        setTimeout(() => (toast.hidden = true), 9000);
      }
    }
  }
})();
