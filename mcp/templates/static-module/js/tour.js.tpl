/* Guided tour (section 16). One step per key control, chapters of 5 to 7 steps.
   Auto-starts once per user, replayable from the topbar and sidebar. Static modules
   use this small spotlight engine; React and Next.js modules use nextstepjs 2.2.0.
   Replace the sample copy with steps that teach real tasks in this product. */
var TOUR_STEPS = [
  {
    chapter: "Getting started",
    steps: [
      { selector: "#nav-dashboard", title: "Open the dashboard", content: "Start here to see event volume and source health for your tenant.", side: "right" },
      { selector: "#kpi-grid", title: "Read the key numbers", content: "These tiles show today's events, active sources and open cases. Degraded sources count against Active sources.", side: "bottom" },
      { selector: "#nav-items", title: "Find a failing source", content: "Open Items, then Failed, to list sources that stopped sending events.", side: "right" },
      { selector: "#btn-theme", title: "Switch theme", content: "Click the sun or moon to switch between dark and light. Your choice is saved for this module.", side: "bottom" },
      { selector: "#btn-apps", title: "Jump to another product", content: "Open the apps menu to move to any licensed Invinsense product.", side: "bottom" }
    ]
  }
];

var Tour = (function () {
  var KEY = PRODUCT.id + "-tour-done";
  var steps = [], i = 0, card = null, spot = null, lastFocus = null;

  function plan() {
    var all = [];
    TOUR_STEPS.forEach(function (c) { c.steps.forEach(function (s) { all.push(s); }); });
    return all.filter(function (s) { return document.querySelector(s.selector); });
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function place(target, side) {
    var r = target.getBoundingClientRect();
    spot.style.left = r.left - 4 + "px"; spot.style.top = r.top - 4 + "px";
    spot.style.width = r.width + 8 + "px"; spot.style.height = r.height + 8 + "px";
    var cw = card.offsetWidth, ch = card.offsetHeight, x, y;
    if (side === "right") { x = r.right + 16; y = r.top; }
    else if (side === "left") { x = r.left - cw - 16; y = r.top; }
    else if (side === "top") { x = r.left; y = r.top - ch - 16; }
    else { x = r.left; y = r.bottom + 16; }
    x = Math.max(16, Math.min(x, window.innerWidth - cw - 16));
    y = Math.max(16, Math.min(y, window.innerHeight - ch - 16));
    card.style.left = x + "px"; card.style.top = y + "px";
  }

  function render() {
    var s = steps[i], target = document.querySelector(s.selector);
    if (!target) { next(); return; }
    target.scrollIntoView({ block: "nearest" });
    card.innerHTML =
      '<div class="tour-rail"><i style="--p:' + (i + 1) / steps.length + '"></i></div>' +
      '<div class="tour-body"><div class="tour-head">' + icon("lifebuoy", 16) + "<h2>" + esc(s.title) + '</h2><button class="icon-btn" type="button" data-act="close" aria-label="Close tour">' + icon("x", 16) + "</button></div>" +
      "<p>" + esc(s.content) + "</p>" +
      '<div class="tour-foot"><span class="tour-count">' + pad(i + 1) + "/" + pad(steps.length) + '</span><div class="tour-actions">' +
      (i === 0 ? '<button class="btn sm ghost" type="button" data-act="close">Skip</button>' : '<button class="btn sm outline" type="button" data-act="back">Back</button>') +
      '<button class="btn sm primary" type="button" data-act="next">' + (i === steps.length - 1 ? "Done" : "Next") + "</button></div></div></div>";
    place(target, s.side);
    var nextBtn = card.querySelector('[data-act="next"]');
    if (nextBtn) nextBtn.focus();
  }

  function next() { if (i >= steps.length - 1) end(true); else { i++; render(); } }
  function back() { if (i > 0) { i--; render(); } }

  function onKey(e) {
    if (e.key === "Escape") end(true);
    else if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") back();
    else if (e.key === "Tab") {
      var f = card.querySelectorAll("button"); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function end(markDone) {
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", render);
    if (card) card.remove(); if (spot) spot.remove(); card = spot = null;
    if (markDone) { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function start() {
    steps = plan(); if (!steps.length) return;
    lastFocus = document.activeElement; i = 0;
    spot = document.createElement("div"); spot.className = "tour-spot";
    card = document.createElement("div"); card.className = "tour-card"; card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "Guided tour");
    card.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var a = b.getAttribute("data-act");
      if (a === "next") next(); else if (a === "back") back(); else end(true);
    });
    document.body.appendChild(spot); document.body.appendChild(card);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", render);
    render();
  }

  function autoStart() {
    var done = false; try { done = localStorage.getItem(KEY) === "1"; } catch (e) {}
    if (!done) setTimeout(start, 400);
  }

  return { start: start, autoStart: autoStart };
})();
