/* Shell, hash router, theme, sidebar, apps navigator and toasts. */
(function () {
  var THEME_KEY = PRODUCT.id + "-theme";
  var RAIL_KEY = PRODUCT.id + "-rail";
  var main = document.getElementById("main");

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---- Theme ---- */
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store(THEME_KEY, t);
    var b = document.getElementById("btn-theme");
    if (b) { b.innerHTML = icon(t === "dark" ? "sun" : "moon", 20); b.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme"); }
  }

  /* ---- Toasts: past tense, name the object, no exclamation marks ---- */
  var DURATION = { success: 4000, info: 4000, warning: 7000, error: 0 };
  window.toast = function (message, severity) {
    severity = severity || "success";
    var host = document.getElementById("toasts");
    if (host.children.length >= 3) return;
    var t = document.createElement("div");
    t.className = "toast " + (severity === "success" ? "" : severity);
    t.innerHTML = "<span>" + esc(message) + '</span><button class="close" type="button" aria-label="Close notification">' + icon("x", 16) + "</button>";
    t.querySelector(".close").addEventListener("click", function () { t.remove(); });
    host.appendChild(t);
    if (DURATION[severity]) setTimeout(function () { t.remove(); }, DURATION[severity]);
  };

  /* ---- Sidebar ---- */
  function navItem(it, active, sub) {
    var hasKids = it.children && it.children.length;
    var open = hasKids && (active === it.id || it.children.some(function (c) { return c.id === active; }));
    var cur = active === it.id ? ' aria-current="page"' : "";
    var exp = hasKids ? ' aria-expanded="' + (open ? "true" : "false") + '"' : "";
    var html = '<a class="nav-item" id="nav-' + it.id + '" href="' + it.href + '"' + cur + exp + ' title="' + esc(it.label) + '">' +
      (it.icon ? icon(it.icon, 16) : "") + '<span class="label">' + esc(it.label) + "</span>" + (hasKids ? '<span class="chev">' + icon("caret-right", 16) + "</span>" : "") + "</a>";
    if (open) html += '<div class="sub">' + it.children.map(function (c) { return navItem(c, active, true); }).join("") + "</div>";
    return html;
  }

  function renderSidebar(active) {
    document.getElementById("sidebar").innerHTML =
      '<div class="brand"><img src="assets/mark.svg" alt="" width="30" height="30" onerror="this.style.visibility=\'hidden\'"><div class="lockup"><small>Invinsense</small><strong>' + esc(PRODUCT.name) + "</strong></div></div>" +
      '<nav class="nav" aria-label="Main">' + NAV.map(function (g) {
        return '<div class="nav-label">' + esc(g.label) + "</div>" + g.items.map(function (it) { return navItem(it, active); }).join("");
      }).join("") + "</nav>" +
      '<div class="sidebar-foot"><button class="nav-item" id="nav-tour" type="button">' + icon("lifebuoy", 16) + '<span class="label">Guided tour</span></button></div>';
    document.getElementById("nav-tour").addEventListener("click", function () { Tour.start(); });
  }

  function setRail(collapsed) {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    store(RAIL_KEY, collapsed ? "1" : "0");
    var t = document.getElementById("sidebar-toggle");
    t.innerHTML = icon(collapsed ? "caret-right" : "caret-left", 14);
    t.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  }

  /* ---- Topbar: fixed control order (section 02) ---- */
  function renderTopbar() {
    var tenant = PRODUCT.multiTenant ? '<button class="icon-btn" id="btn-tenant" type="button" aria-label="Switch tenant">' + icon("buildings", 20) + "</button>" : "";
    document.getElementById("topbar").innerHTML =
      '<button class="icon-btn menu-btn" id="btn-menu" type="button" aria-label="Open navigation">' + icon("list-checks", 20) + "</button>" +
      '<span class="spacer"></span>' + tenant +
      '<button class="icon-btn" id="btn-bell" type="button" aria-label="Notifications">' + icon("bell", 20) + '<span class="count num">3</span></button>' +
      '<button class="icon-btn" id="btn-tour" type="button" aria-label="Guided tour">' + icon("lifebuoy", 20) + "</button>" +
      '<button class="icon-btn" id="btn-theme" type="button"></button>' +
      '<div class="pop-anchor"><button class="icon-btn" id="btn-apps" type="button" aria-label="Apps" aria-haspopup="true" aria-expanded="false">' + icon("dots-nine", 18) + '</button><div class="popover" id="apps-pop" hidden></div></div>' +
      '<button class="avatar" id="btn-user" type="button" aria-label="Account">U</button>';
    document.getElementById("btn-tour").addEventListener("click", function () { Tour.start(); });
    document.getElementById("btn-theme").addEventListener("click", function () {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
    document.getElementById("btn-menu").addEventListener("click", function () { document.body.classList.toggle("sidebar-open"); });
    document.getElementById("btn-apps").addEventListener("click", toggleApps);
    setTheme(document.documentElement.getAttribute("data-theme") || "dark");
  }

  /* ---- Apps navigator. In production this is the shared navigator package fed by the entitlements API (Law 13). ---- */
  function toggleApps() {
    var pop = document.getElementById("apps-pop"), btn = document.getElementById("btn-apps");
    var open = pop.hasAttribute("hidden");
    if (open && !pop.innerHTML) {
      pop.innerHTML = FAMILIES.map(function (f) {
        return '<section class="family fam-' + f.id + '"><h3>' + esc(f.name) + '</h3><div class="tiles">' +
          f.products.map(function (p) {
            var cur = f.id === PRODUCT.family && p === PRODUCT.name;
            return '<a class="tile' + (cur ? " current" : "") + '" href="#" title="' + esc(p) + '">' + icon("shield-check", 24) + "<span>" + esc(p) + "</span></a>";
          }).join("") + "</div></section>";
      }).join("");
    }
    pop.toggleAttribute("hidden", !open);
    btn.setAttribute("aria-expanded", String(open));
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var pop = document.getElementById("apps-pop");
      if (pop && !pop.hasAttribute("hidden")) { pop.setAttribute("hidden", ""); document.getElementById("btn-apps").setAttribute("aria-expanded", "false"); document.getElementById("btn-apps").focus(); }
    }
  });
  document.addEventListener("click", function (e) {
    var copy = e.target.closest("[data-copy]");
    if (copy && navigator.clipboard) { navigator.clipboard.writeText(copy.getAttribute("data-copy")); toast("Correlation ID copied"); }
  });

  /* ---- Router ---- */
  function parse() {
    var raw = (location.hash || "#/dashboard").slice(1);
    var qi = raw.indexOf("?"), path = qi < 0 ? raw : raw.slice(0, qi), query = {};
    if (qi >= 0) raw.slice(qi + 1).split("&").forEach(function (kv) { var p = kv.split("="); query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); });
    return { name: path.replace(/^\//, "") || "dashboard", query: query };
  }

  function route() {
    var r = parse();
    var page = PAGES[r.name] || PAGES.notfound;
    var active = r.name === "items" && r.query.filter === "failed" ? "items-failed" : r.name;
    document.title = page.title + " · " + PRODUCT.name + " · Invinsense";
    renderSidebar(active);
    document.body.classList.remove("sidebar-open");
    page.render(main, r);
    main.focus({ preventScroll: true });
  }

  document.getElementById("sidebar-toggle").addEventListener("click", function () { setRail(!document.body.classList.contains("sidebar-collapsed")); });
  renderTopbar();
  setRail(store(RAIL_KEY) === "1");
  window.addEventListener("hashchange", route);
  route();
  Tour.autoStart();
})();
