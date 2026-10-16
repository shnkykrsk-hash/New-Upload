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

  var nav = document.getElementById("site-nav");
  if (nav) {
    nav.outerHTML =
      '<header class="nav"><div class="wrap">' +
      '<a class="logo" href="index.html"><i></i>New Upload</a>' +
      '<button class="menu-btn" id="menuBtn" aria-label="Menu">&#9776;</button>' +
      '<nav class="links" id="navLinks">' + links +
      '<a class="btn small" href="idea.html" style="color:#fff">Analyze free</a></nav>' +
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

  window.toast = function (text) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  };
})();
