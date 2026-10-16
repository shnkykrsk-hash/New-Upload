(function () {
  // ---- Settings ----
  var PAYMENTS_ENABLED = false;      // set true when Razorpay is wired up
  var IDEAS_ENDPOINT = "/api/ideas"; // existing Gemini endpoint
  var FEEDBACK_ENDPOINT = "/api/feedback";

  var $ = function (id) { return document.getElementById(id); };
  var unlocked = false;
  var last = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(n));
  }
  function validChannel(v) {
    v = v.trim();
    return /^@[\w.\-]{2,}$/.test(v) || /(youtube\.com|youtu\.be)\//i.test(v);
  }
  function handleName(v) {
    var m = v.match(/@([\w.\-]+)/);
    if (m) return m[1];
    m = v.match(/\/(?:channel|c|user)\/([\w.\-]+)/i);
    return m ? m[1] : "Your Channel";
  }

  // ---- Demo data (used when the API is not available) ----
  function demoData(input) {
    var name = handleName(input);
    var views = [18200, 22400, 15800, 31200, 27600, 40100, 35800, 52300, 47900, 61400];
    return {
      demo: true,
      channel: { title: name, subscribers: 12400, avgViews: 35200, videos: 86, trend: 18 },
      recent: views.map(function (v, i) { return { title: "Video " + (i + 1), views: v }; }),
      ideas: [
        { title: "I Tried the Hardest Challenge for 24 Hours", reason: "Your challenge-style videos get about 2x your average views.",
          hashtags: ["#challenge", "#24hours", "#hardmode", "#viral"], bestTime: "Saturday, 6:00 PM", thumbnail: "Close-up shocked face, big bold text '24 HOURS', bright red background." },
        { title: "Beginner vs Pro: Who Wins?", reason: "Comparison videos keep viewers watching longer on your channel.",
          hashtags: ["#vs", "#beginnervspro", "#competition", "#trending"], bestTime: "Friday, 7:30 PM", thumbnail: "Split screen with two faces, a VS badge in the middle, yellow and blue contrast." }
      ]
    };
  }

  // ---- Normalize whatever the API returns ----
  function normalize(d, input) {
    if (!d || typeof d !== "object") return null;
    var ch = d.channel || d.stats || {};
    var ideas = d.ideas || d.suggestions || [];
    if (!ideas.length) return null;
    return {
      demo: !!d.demo,
      channel: {
        title: ch.title || ch.name || handleName(input),
        subscribers: ch.subscribers || ch.subs || 0,
        avgViews: ch.avgViews || ch.averageViews || 0,
        videos: ch.videos || ch.videoCount || 0,
        trend: ch.trend == null ? null : ch.trend
      },
      recent: (d.recent || d.videos || []).map(function (v, i) {
        return { title: v.title || "Video " + (i + 1), views: Number(v.views) || 0 };
      }),
      ideas: ideas.slice(0, 2).map(function (x) {
        if (typeof x === "string") x = { title: x };
        return {
          title: x.title || x.idea || "Untitled idea",
          reason: x.reason || x.why || "",
          hashtags: (x.hashtags || x.tags || []).slice(0, 4),
          bestTime: x.bestTime || x.best_time || "",
          thumbnail: x.thumbnail || x.thumbnailIdea || ""
        };
      })
    };
  }

  // ---- Rendering ----
  function render() {
    var d = last;
    var c = d.channel;
    $("cname").textContent = c.title;
    $("avatar").textContent = (c.title || "N").charAt(0).toUpperCase();
    $("demoPill").textContent = d.demo ? "Sample data shown" : "Live channel data";

    var trend = c.trend == null ? "-" : (c.trend >= 0 ? "+" : "") + c.trend + "%";
    var trendCls = c.trend == null ? "" : (c.trend >= 0 ? "up" : "down");
    $("stats").innerHTML =
      '<div class="stat-card"><span>Subscribers</span><b>' + fmt(c.subscribers) + "</b></div>" +
      '<div class="stat-card"><span>Avg. views</span><b>' + fmt(c.avgViews) + "</b></div>" +
      '<div class="stat-card"><span>Videos</span><b>' + fmt(c.videos) + "</b></div>" +
      '<div class="stat-card"><span>Trend</span><b class="' + trendCls + '">' + esc(trend) + "</b></div>";

    $("ideas").innerHTML = d.ideas.map(function (x, i) {
      var tags = x.hashtags.length ? x.hashtags : ["#trending", "#viral", "#youtube", "#shorts"];
      var tagHtml = tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
      var extra =
        "<div><b>Hashtags:</b> " + tagHtml + "</div>" +
        '<p style="margin-top:10px"><b>Best time to post:</b> ' + esc(x.bestTime || "Weekend evening") + "</p>" +
        '<p><b>Thumbnail idea:</b> ' + esc(x.thumbnail || "Bold text, expressive face, high contrast colors.") + "</p>";
      var block = unlocked
        ? '<div class="locked" style="border-style:solid">' + extra + "</div>"
        : '<div class="locked"><div class="blur">' + extra + '</div><div class="over">&#128274; Unlock to see</div></div>';
      return '<div class="card idea"><div class="num">IDEA ' + (i + 1) + "</div><h3>" + esc(x.title) + "</h3>" +
        "<p>" + esc(x.reason) + "</p>" + block + "</div>";
    }).join("");

    if (unlocked) document.querySelector(".unlock-box").classList.add("hidden");
    drawChart(d.recent);
  }

  function drawChart(points) {
    var cv = $("chart");
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    var g = cv.getContext("2d");
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    if (!points || points.length < 2) {
      g.fillStyle = "#9aa3bb"; g.font = "14px sans-serif";
      g.fillText("Not enough video data to draw a chart.", 12, 30);
      return;
    }
    var pad = { l: 44, r: 12, t: 14, b: 26 };
    var max = Math.max.apply(null, points.map(function (p) { return p.views; })) * 1.1 || 1;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    function X(i) { return pad.l + (iw * i) / (points.length - 1); }
    function Y(v) { return pad.t + ih - (v / max) * ih; }

    g.strokeStyle = "#262b3d"; g.fillStyle = "#9aa3bb"; g.font = "11px sans-serif"; g.lineWidth = 1;
    for (var k = 0; k <= 4; k++) {
      var val = (max / 4) * k, y = Y(val);
      g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke();
      g.fillText(fmt(val), 4, y + 4);
    }
    var grad = g.createLinearGradient(0, pad.t, 0, h - pad.b);
    grad.addColorStop(0, "rgba(255,77,77,.35)"); grad.addColorStop(1, "rgba(255,77,77,0)");
    g.beginPath(); g.moveTo(X(0), Y(points[0].views));
    points.forEach(function (p, i) { g.lineTo(X(i), Y(p.views)); });
    g.lineTo(X(points.length - 1), h - pad.b); g.lineTo(X(0), h - pad.b); g.closePath();
    g.fillStyle = grad; g.fill();

    g.beginPath(); g.strokeStyle = "#ff6a4d"; g.lineWidth = 3; g.lineJoin = "round";
    points.forEach(function (p, i) { i ? g.lineTo(X(i), Y(p.views)) : g.moveTo(X(i), Y(p.views)); });
    g.stroke();
    g.fillStyle = "#ff8a3d";
    points.forEach(function (p, i) { g.beginPath(); g.arc(X(i), Y(p.views), 3.5, 0, 6.3); g.fill(); });
    g.fillStyle = "#9aa3bb";
    g.fillText("Oldest", pad.l, h - 8);
    g.fillText("Latest", w - pad.r - 30, h - 8);
  }

  // ---- Analyze ----
  function setMsg(t, err) { $("msg").textContent = t || ""; $("msg").className = "msg" + (err ? " err" : ""); }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("channel").value.trim();
    if (!validChannel(v)) { setMsg("Please paste a valid YouTube channel link or @handle.", true); return; }
    setMsg("");
    $("go").disabled = true;
    $("result").classList.add("hidden");
    $("loading").classList.remove("hidden");

    fetch(IDEAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: v, channelUrl: v })
    })
      .then(function (r) { if (!r.ok) throw new Error("api " + r.status); return r.json(); })
      .then(function (d) { return normalize(d, v) || demoData(v); })
      .catch(function () { return demoData(v); })
      .then(function (data) {
        last = data;
        $("loading").classList.add("hidden");
        $("result").classList.remove("hidden");
        $("go").disabled = false;
        render();
        $("result").scrollIntoView({ behavior: "smooth", block: "start" });
      });
  });

  window.addEventListener("resize", function () { if (last) drawChart(last.recent); });

  // ---- Unlock (payment hook) ----
  function startPayment() {
    // TODO: create a Razorpay order on the server, open Checkout, verify the
    // payment on the server, then call onPaid().
    toast("Payments are not live yet (test mode).");
  }
  function onPaid() { unlocked = true; render(); }
  $("unlock").addEventListener("click", function () {
    if (!PAYMENTS_ENABLED) { startPayment(); return; }
    startPayment();
  });
  window.__onPaid = onPaid;

  // ---- Feedback ----
  $("sendFb").addEventListener("click", function () {
    var text = $("fb").value.trim();
    if (!text) { $("fbMsg").textContent = "Please write something first."; return; }
    $("sendFb").disabled = true;
    fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    })
      .then(function (r) { if (!r.ok) throw new Error(); $("fbMsg").textContent = "Thank you! Feedback sent."; $("fb").value = ""; })
      .catch(function () { $("fbMsg").textContent = "Could not send right now. Please try again later."; })
      .then(function () { $("sendFb").disabled = false; });
  });
})();
