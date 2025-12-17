(function () {
  const LANG_RE = /^\/([a-z]{2})(?=\/|$)/;

  const stripDistLang = (p) => {
    let path = (p || "/").replace(/\/{2,}/g, "/");
    path = path.replace(/^\/dist(?=\/|$)/, "");
    path = path.replace(LANG_RE, "");
    if (path === "") path = "/";
    if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
    return path;
  };

  const hrefToPath = (href) => {
    try {
      const u = new URL(href, window.location.origin);
      return stripDistLang(u.pathname);
    } catch {
      return null;
    }
  };

  function highlightNav() {
    const nav = document.querySelector("header nav");
    if (!nav) return;

    const current = stripDistLang(window.location.pathname);
    let active = null;

    nav.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (/^(mailto:|tel:|#)/i.test(href)) return;
      const linkPath = hrefToPath(href);
      if (!linkPath) return;

      const isHome = linkPath === "/" || linkPath === "/index";
      const match = isHome
        ? current === "/" || current === "/index"
        : current === linkPath || current.startsWith(linkPath + "/");

      if (match && !active) active = a;
    });

    if (active) {
      nav.querySelectorAll("a[href]").forEach((a) => {
        a.classList.remove("active-link");
        a.classList.add("grey");
        a.querySelectorAll("*").forEach((s) => s.classList.add("grey"));
      });

      active.classList.remove("grey");
      active
        .querySelectorAll(".grey")
        .forEach((el) => el.classList.remove("grey"));
      active.classList.add("active-link");
    } else {
      nav.querySelectorAll("a[href]").forEach((a) => {
        a.classList.remove("active-link");
        a.classList.remove("grey");
        a.querySelectorAll("*").forEach((s) => s.classList.remove("grey"));
      });
    }
  }

  document.addEventListener("DOMContentLoaded", highlightNav);

  window.addEventListener("popstate", highlightNav);

  const patchLoadPage = () => {
    if (!window.loadPage || window.loadPage.__patched) return;
    const orig = window.loadPage;
    window.loadPage = function () {
      const r = orig.apply(this, arguments);
      setTimeout(highlightNav, 50);
      return r;
    };
    window.loadPage.__patched = true;
  };
  patchLoadPage();

  let lastUrl = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastUrl) {
      lastUrl = location.pathname;
      highlightNav();
    }
  }, 100);
})();
