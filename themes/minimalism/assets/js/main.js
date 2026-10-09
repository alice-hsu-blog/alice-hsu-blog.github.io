(function () {
  var root = document.documentElement;

  // 深淺色切換：記住訪客的選擇
  var themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // 上一篇、下一篇：在時間順序和同分類之間切換，記住訪客的選擇
  var pagerSwitch = document.querySelector('.pager-switch');
  if (pagerSwitch) {
    pagerSwitch.hidden = false;
    pagerSwitch.setAttribute('aria-checked', String(root.getAttribute('data-pager') === 'category'));
    pagerSwitch.addEventListener('click', function () {
      var on = root.getAttribute('data-pager') !== 'category';
      if (on) root.setAttribute('data-pager', 'category'); else root.removeAttribute('data-pager');
      pagerSwitch.setAttribute('aria-checked', String(on));
      try { localStorage.setItem('pager', on ? 'category' : 'date'); } catch (e) {}
    });
  }

  // 首頁線條畫：點一下重播
  var drawBtn = document.getElementById('draw-btn');
  if (drawBtn) {
    drawBtn.addEventListener('click', function () {
      var svg = drawBtn.querySelector('svg');
      svg.classList.remove('play');
      void svg.getBoundingClientRect();
      svg.classList.add('play');
    });
  }

  // 往上捲時顯示「回到頂部」，往下捲時顯示「滑到底部」；已經在頂部或底部就不顯示
  var toTop = document.getElementById('jump-top');
  var toBottom = document.getElementById('jump-bottom');
  if (toTop && toBottom) {
    var lastY = window.scrollY;
    var maxY = function () { return document.documentElement.scrollHeight - window.innerHeight; };
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (Math.abs(y - lastY) < 4) return;
      var up = y < lastY;
      lastY = y;
      toTop.hidden = !(up && y > 200);
      toBottom.hidden = !(!up && maxY() - y > 200);
    }, { passive: true });
    toTop.addEventListener('click', function () { window.scrollTo(0, 0); });
    toBottom.addEventListener('click', function () { window.scrollTo(0, maxY()); });
  }

  // 相簿：同一段裡連續的相片（中間沒有空行）自動排成每列等高；masonry 裡的相片不處理
  var GAP = 12;
  var ratioOf = function (fig) {
    var img = fig.querySelector('img');
    if (img.naturalWidth) return img.naturalWidth / img.naturalHeight;
    var w = +img.getAttribute('width'), h = +img.getAttribute('height');
    return w && h ? w / h : 1.5;
  };
  var layoutPhotos = function (box) {
    var width = box.clientWidth;
    if (!width) return;
    // 列高可以由文章的 justified_gallery.rowHeight 指定；手機上縮成約三分之二
    var prose = box.closest('.prose');
    var target = (prose && +prose.dataset.rowHeight) || 220;
    if (width < 480) target = Math.round(target * 0.68);
    var row = [], sum = 0;
    var flush = function (full) {
      var gaps = GAP * (row.length - 1);
      row.forEach(function (it) {
        it.fig.style.setProperty('--ar', it.r);
        it.fig.style.width = full
          ? 'calc((100% - ' + (gaps + 0.5) + 'px) * ' + (it.r / sum).toFixed(5) + ')'
          : Math.round(it.r * target) + 'px';
      });
      row = []; sum = 0;
    };
    Array.prototype.forEach.call(box.children, function (fig) {
      var r = ratioOf(fig);
      row.push({ fig: fig, r: r });
      sum += r;
      if (sum * target + GAP * (row.length - 1) >= width) flush(true);
    });
    flush(false);
  };
  var grouped = [];
  Array.prototype.forEach.call(document.querySelectorAll('.prose figure'), function (fig) {
    if (fig.parentNode.className === 'photos' || fig.closest('.gallery') || !fig.querySelector('img')) return;
    var group = [fig];
    var next = fig.nextElementSibling;
    while (next && next.tagName === 'FIGURE' && next.querySelector('img')) { group.push(next); next = next.nextElementSibling; }
    if (group.length < 2) return;
    var box = document.createElement('div');
    box.className = 'photos';
    fig.parentNode.insertBefore(box, fig);
    group.forEach(function (f) {
      box.appendChild(f);
      // 沒有寫 width、height 的圖，要等載入後才知道比例
      var img = f.querySelector('img');
      if (!img.naturalWidth) img.addEventListener('load', function () { layoutPhotos(box); });
    });
    grouped.push(box);
  });
  if (grouped.length) {
    grouped.forEach(layoutPhotos);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function (entries) { entries.forEach(function (e) { layoutPhotos(e.target); }); });
      grouped.forEach(function (box) { ro.observe(box); });
    } else {
      window.addEventListener('resize', function () { grouped.forEach(layoutPhotos); });
    }
  }

  // 搜尋
  var dialog = document.getElementById('search');
  var searchBtn = document.getElementById('search-btn');
  if (dialog && searchBtn && dialog.showModal) {
    var input = document.getElementById('search-input');
    var list = document.getElementById('search-results');
    var posts = null;
    var loading = null;

    var note = function (text) {
      list.textContent = '';
      var li = document.createElement('li');
      li.className = 'search-note';
      li.textContent = text;
      list.appendChild(li);
    };
    var load = function () {
      if (!loading) {
        loading = fetch(dialog.dataset.index)
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (data) { posts = data.posts || []; })
          .catch(function () { loading = null; throw new Error('load'); });
      }
      return loading;
    };
    // 把符合的字用 <mark> 標出來
    var marked = function (el, text, q) {
      var i = text.toLowerCase().indexOf(q);
      if (i < 0) { el.textContent = text; return; }
      el.appendChild(document.createTextNode(text.slice(0, i)));
      var m = document.createElement('mark');
      m.textContent = text.slice(i, i + q.length);
      el.appendChild(m);
      el.appendChild(document.createTextNode(text.slice(i + q.length)));
    };
    var render = function () {
      var q = input.value.trim().toLowerCase();
      list.textContent = '';
      if (!q || !posts) return;
      var hits = [];
      posts.forEach(function (p) {
        var inTitle = p.title.toLowerCase().indexOf(q);
        var inText = p.text.toLowerCase().indexOf(q);
        if (inTitle >= 0 || inText >= 0) hits.push({ p: p, inTitle: inTitle, inText: inText });
      });
      hits.sort(function (a, b) { return (b.inTitle >= 0) - (a.inTitle >= 0); });
      if (!hits.length) { note(dialog.dataset.empty); return; }
      hits.slice(0, 30).forEach(function (h) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = h.p.link;
        var t = document.createElement('span');
        t.className = 't';
        marked(t, h.p.title, q);
        a.appendChild(t);
        if (h.inText >= 0) {
          var s = document.createElement('span');
          s.className = 's';
          var start = Math.max(0, h.inText - 20);
          var snippet = (start > 0 ? '…' : '') + h.p.text.slice(start, h.inText + q.length + 50).replace(/\s+/g, ' ') + '…';
          marked(s, snippet, q);
          a.appendChild(s);
        }
        li.appendChild(a);
        list.appendChild(li);
      });
    };
    var open = function () {
      dialog.showModal();
      input.focus();
      input.select();
      if (!posts) {
        note(dialog.dataset.loading);
        load().then(render, function () { note(dialog.dataset.failed); });
      }
    };
    searchBtn.addEventListener('click', open);
    input.addEventListener('input', render);
    // 點對話框外面的暗色區域就關閉
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    });
  }
})();
