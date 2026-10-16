// Shared nav + footer, mobile menu, toast helper
(function () {
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var items = [
    ["index.html", "Home"],
    ["idea.html", "Video ideas"],
    ["thumbnail.html", "Thumbnails"],
    ["pricing.html", "Pricing"],
    ["problem.html", "Support"]
  ];
  var links = items.map(function (i) {
    return '<a href="' + i[0] + '"' + (page === i[0] ? ' class="active"' : "") + ">" + i[1] + "</a>";
  }).join("");

  var lampHtml =
    '<div class="lamp" id="lamp" role="switch" aria-checked="false" aria-label="Light or dark mode. Pull the cord to switch" title="Pull the cord" tabindex="0">' +
    '<svg class="lamp-svg" viewBox="0 0 48 40" aria-hidden="true">' +
    '<defs><radialGradient id="lampGlow"><stop offset="0" stop-color="#ffe27a" stop-opacity=".95"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient></defs>' +
    '<path class="wire" d="M24 0V7"/>' +
    '<circle class="glow" cx="24" cy="34" r="18"/>' +
    '<circle class="bulb" cx="24" cy="33" r="5"/>' +
    '<path class="shade" d="M24 6C11 6 7 21 5 29H43C41 21 37 6 24 6Z"/>' +
    '<rect class="rim" x="3" y="28" width="42" height="4" rx="2"/>' +
    "</svg>" +
    '<div class="cord"></div></div>';

  var nav = document.getElementById("site-nav");
  if (nav) {
    nav.outerHTML =
      '<header class="nav"><div class="wrap">' +
      '<a class="logo" href="index.html"><i></i>New Upload</a>' +
      '<button class="menu-btn" id="menuBtn" aria-label="Menu">&#9776;</button>' +
      '<nav class="links" id="navLinks">' + links +
      '<a class="btn small" href="idea.html" style="color:#fff">Analyze free</a></nav>' +
      lampHtml +
      "</div></header>";
    document.getElementById("menuBtn").addEventListener("click", function () {
      document.getElementById("navLinks").classList.toggle("open");
    });
  }

  var foot = document.getElementById("site-footer");
  if (foot) {
    foot.outerHTML =
      "<footer><div class=\"wrap\"><div>&copy; " + new Date().getFullYear() +
      " New Upload. Built for creators.</div>" +
      '<div class="fl"><a href="idea.html">Video ideas</a><a href="thumbnail.html">Thumbnails</a>' +
      '<a href="pricing.html">Pricing</a><a href="problem.html">Support</a></div></div></footer>';
  }

  // ---- Theme + lamp: pull the cord once = light on, pull again = light off ----
  var root = document.documentElement;
  var lamp = document.getElementById("lamp");
  function saveTheme(t) { try { localStorage.setItem("nu-theme", t); } catch (e) {} }
  function currentTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    if (lamp) lamp.setAttribute("aria-checked", t === "light" ? "true" : "false");
    window.dispatchEvent(new Event("themechange"));
  }
  function flash() {
    var f = document.getElementById("themeFlash");
    if (!f) { f = document.createElement("div"); f.id = "themeFlash"; document.body.appendChild(f); }
    if (lamp) {
      var r = lamp.getBoundingClientRect();
      f.style.setProperty("--fx", (r.left + r.width / 2) + "px");
    }
    f.classList.remove("go");
    void f.offsetWidth;
    f.classList.add("go");
  }
  function toggleTheme() {
    var next = currentTheme() === "light" ? "dark" : "light";
    root.classList.add("theme-anim");
    applyTheme(next);
    saveTheme(next);
    if (next === "light") flash();
    setTimeout(function () { root.classList.remove("theme-anim"); }, 600);
  }
  if (lamp) {
    applyTheme(currentTheme());
    var cord = lamp.querySelector(".cord"), startY = null, pull = 0, moved = false;
    var setPull = function (px) { lamp.style.setProperty("--pull", px + "px"); };
    var swing = function () { lamp.classList.remove("swing"); void lamp.offsetWidth; lamp.classList.add("swing"); };
    var tapPull = function () { setPull(16); setTimeout(function () { setPull(0); }, 140); };

    cord.addEventListener("pointerdown", function (e) {
      startY = e.clientY; pull = 0; moved = false;
      try { cord.setPointerCapture(e.pointerId); } catch (err) {}
      lamp.classList.add("dragging");
      e.preventDefault();
    });
    cord.addEventListener("pointermove", function (e) {
      if (startY === null) return;
      pull = Math.max(0, Math.min(e.clientY - startY, 30));
      if (pull > 3) moved = true;
      setPull(pull);
    });
    cord.addEventListener("pointerup", function () {
      if (startY === null) return;
      var isTap = !moved, enough = pull >= 12;
      startY = null;
      lamp.classList.remove("dragging");
      if (isTap) tapPull(); else setPull(0);
      if (isTap || enough) { swing(); toggleTheme(); }
    });
    cord.addEventListener("pointercancel", function () {
      startY = null; lamp.classList.remove("dragging"); setPull(0);
    });
    lamp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapPull(); swing(); toggleTheme(); }
    });
  }

  window.toast = function (text) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  };
})();
