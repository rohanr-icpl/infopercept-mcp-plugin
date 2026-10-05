<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in · __PRODUCT_NAME__ · Invinsense</title>
  <link rel="icon" href="assets/mark.svg" type="image/svg+xml">
  <script>
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
  <div class="auth">
    <!-- Left panel: ship the family's animated isometric illustration (Lottie, section 17).
         Leave empty rather than add a sketchy placeholder. -->
    <div class="auth-art" aria-hidden="true"></div>
    <main class="auth-panel">
      <div class="auth-lockup">
        <img src="assets/mark.svg" alt="" width="30" height="30" onerror="this.style.visibility='hidden'">
        <div><small>Invinsense</small><strong>__PRODUCT_NAME__</strong></div>
      </div>
      <form class="auth-card" id="login-form" novalidate>
        <div class="field">
          <label for="username">Username</label>
          <input class="input lg" id="username" name="username" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input class="input lg" id="password" name="password" type="password" autocomplete="current-password" required>
          <span class="hint" id="login-hint"></span>
        </div>
        <button class="btn primary lg" id="login-submit" type="submit">Sign in</button>
        <a href="#forgot">Forgot password?</a>
        <p class="muted" style="font-size:12px;line-height:16px">Contact your administrator if you cannot sign in.</p>
      </form>
      <div class="auth-foot"><span class="mono">v1.0.0</span><span></span></div>
    </main>
  </div>
  <script>
    var form = document.getElementById("login-form");
    var btn = document.getElementById("login-submit");
    var hint = document.getElementById("login-hint");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.username.value || !form.password.value) { hint.textContent = "Enter your username and password."; return; }
      hint.textContent = "";
      btn.setAttribute("aria-busy", "true");
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Signing in';
      setTimeout(function () {
        btn.removeAttribute("aria-busy");
        btn.textContent = "Signed in";
        window.location.href = "index.html";
      }, 700);
    });
  </script>
</body>
</html>
