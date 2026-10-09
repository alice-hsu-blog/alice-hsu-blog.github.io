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

  // 閱讀進度
  var bar = document.getElementById('progress-bar');
  if (bar) {
    var update = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
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
