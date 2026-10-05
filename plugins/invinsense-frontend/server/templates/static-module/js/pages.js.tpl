/* PAGES registry. Every fetching view ships all four states (section 15):
   loading, empty, error (with correlation ID), partial. */
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
}

function skeletonRows(n) {
  var out = "";
  for (var i = 0; i < n; i++) out += '<div class="skeleton" style="height:40px;margin-bottom:8px"></div>';
  return out;
}

function emptyState(title, why, actionHtml) {
  return '<div class="state">' + icon("tray", 24) + "<h2>" + esc(title) + "</h2><p>" + esc(why) + "</p>" + (actionHtml || "") + "</div>";
}

function errorState(what, correlationId) {
  return '<div class="state">' + icon("warning", 24) + "<h2>" + esc(what) + '</h2><p>Check your connection and retry. If it keeps failing, share this ID with support.</p>' +
    '<span class="cid"><code class="mono">' + esc(correlationId) + '</code><button class="btn sm ghost" type="button" data-copy="' + esc(correlationId) + '">' + icon("copy", 16) + " Copy ID</button></span>" +
    '<button class="btn sm" type="button" data-retry>' + icon("arrow-clockwise", 16) + " Retry</button></div>";
}

function statusCell(s, label) {
  return '<span class="status ' + s + '"><span class="dot"></span>' + esc(label) + "</span>";
}

/* Simulated fetch. Use #/items?state=empty|error|partial to preview each state. */
function fakeFetch(state) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      if (state === "error") return reject(new Error("fail"));
      if (state === "empty") return resolve({ rows: [], partial: [] });
      resolve({ rows: MOCK.items, partial: state === "partial" ? ["Audit log source"] : [] });
    }, 600);
  });
}

var PAGES = {
  dashboard: {
    title: "Dashboard",
    render: function (el) {
      el.innerHTML =
        '<div class="page"><h1 class="page-title">Dashboard</h1>' +
        '<div class="kpi-grid" id="kpi-grid">' +
        MOCK.kpis.map(function (k) {
          return '<div class="card kpi"><div class="label"><span class="legend"></span>' + esc(k.label) + '</div><div class="value">' + esc(k.value) + '</div><div class="sub-line">' + esc(k.sub) + "</div></div>";
        }).join("") +
        "</div>" +
        '<div class="card"><h2>Event volume</h2>' + sparkline(MOCK.series, { label: "Event volume, last 12 hours" }) + "</div></div>";
    }
  },
  items: {
    title: "Items",
    render: function (el, ctx) {
      var state = ctx.query.state || "ok";
      el.innerHTML = '<div class="page"><h1 class="page-title">Items</h1><div class="card" id="items-card">' + skeletonRows(4) + "</div></div>";
      var card = el.querySelector("#items-card");
      fakeFetch(state).then(function (res) {
        if (!res.rows.length) {
          card.innerHTML = emptyState("No items yet", "Items appear here after a source sends its first event.", '<button class="btn primary sm" type="button">Add a source</button>');
          return;
        }
        var rows = res.rows.filter(function (r) { return ctx.query.filter !== "failed" || r.status === "error"; });
        var partial = res.partial.length
          ? '<p class="muted" style="margin-bottom:12px">' + statusCell("degraded", "Some sources are unavailable: " + res.partial.join(", ") + ". Showing what arrived.") + "</p>"
          : "";
        card.innerHTML = partial + '<div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>ID</th><th>Status</th><th class="r">Events</th><th>Last seen</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return "<tr><td>" + esc(r.name) + '</td><td class="mono">' + esc(r.id) + "</td><td>" + statusCell(r.status, r.statusLabel) + '</td><td class="r">' + r.events.toLocaleString() + "</td><td>" + esc(r.seen) + "</td></tr>";
          }).join("") + "</tbody></table></div>";
      }).catch(function () {
        card.innerHTML = errorState("Items did not load", "req-" + Math.random().toString(16).slice(2, 10));
        var retry = card.querySelector("[data-retry]");
        if (retry) retry.addEventListener("click", function () { PAGES.items.render(el, { query: {} }); });
      });
    }
  },
  notfound: {
    title: "Page not found",
    render: function (el) {
      el.innerHTML = '<div class="page">' + emptyState("Page not found", "This address does not match a page in this module.", '<a class="btn sm" href="#/dashboard">Go to dashboard</a>') + "</div>";
    }
  }
};
