<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard · __PRODUCT_NAME__ · Invinsense</title>
  <link rel="icon" href="assets/mark.svg" type="image/svg+xml">
  <script>
    /* Restore the saved theme before first paint (section 08). */
    (function () {
      try {
        var t = localStorage.getItem("__ID__-theme");
        if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" href="css/__ID__.css">
</head>
<body>
  <aside class="sidebar" id="sidebar" aria-label="Primary"></aside>
  <button class="sidebar-toggle" id="sidebar-toggle" type="button" aria-label="Collapse sidebar"></button>
  <header class="topbar" id="topbar"></header>
  <main class="content" id="main" tabindex="-1"></main>
  <div class="toasts" id="toasts" role="status" aria-live="polite"></div>

  <script src="js/icons.js"></script>
  <script src="js/data.js"></script>
  <script src="js/charts.js"></script>
  <script src="js/pages.js"></script>
  <script src="js/tour.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
