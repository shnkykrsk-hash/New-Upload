// New Upload motion: scroll reveal, count-up, line draw, scroll progress
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- count-up for numbers like 12.4K, 38.2K, +18% ----
  function countEl(el) {
    var txt = el.textContent.trim();
    var m = txt.match(/^([+\-]?)(\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var target = parseFloat(m[2]);
    var dec = (m[2].split(".")[1] || "").length;
    var start = null, dur = 1000;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + (target * e).toFixed(dec) + m[3];
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = m[1] + (0).toFixed(dec) + m[3];
    requestAnimationFrame(step);
  }
  window.countUp = function (root) {
    if (reduce || !root) return;
    root.querySelectorAll(".stat-card b, .mock .stat b").forEach(countEl);
  };

  // ---- draw the sample chart line on the home page ----
  function drawLine(mock) {
    var line = mock.querySelector("svg path[stroke]");
    if (!line || reduce) return;
    line.setAttribute("pathLength", "1");
    line.style.strokeDasharray = "1";
    line.style.strokeDashoffset = "1";
    line.getBoundingClientRect();
    line.style.transition = "stroke-dashoffset 1.8s ease";
    line.style.strokeDashoffset = "0";
  }

  // ---- scroll reveal ----
  function setupReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var sel = ".card, section h2, section .sub, .mock, details, .final .btn";
    var counters = new Map();
    var els = Array.prototype.filter.call(document.querySelectorAll(sel), function (el) {
      if (el.closest("#result")) return false;
      if (el.closest(".hero") && !el.matches(".mock")) return false;
      return true;
    });
    els.forEach(function (el) {
      var n = counters.get(el.parentElement) || 0;
      counters.set(el.parentElement, n + 1);
      el.style.transitionDelay = (n % 4) * 90 + "ms";
      el.classList.add("reveal");
    });
    // mock line starts hidden until revealed
    var mock = document.querySelector(".mock");
    if (mock) {
      var l = mock.querySelector("svg path[stroke]");
      if (l) { l.setAttribute("pathLength", "1"); l.style.strokeDasharray = "1"; l.style.strokeDashoffset = "1"; }
      mock.querySelectorAll(".stat b").forEach(function (b) { b.dataset.final = b.textContent; });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.classList.add("in");
        if (el.matches(".mock")) { drawLine(el); window.countUp(el); }
        // drop reveal classes afterwards so hover transitions work normally
        setTimeout(function () {
          el.classList.remove("reveal", "in");
          el.style.transitionDelay = "";
        }, 1300);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---- scroll progress bar ----
  function setupProgress() {
    var bar = document.createElement("div");
    bar.id = "progress";
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  setupReveal();
  setupProgress();
})();
