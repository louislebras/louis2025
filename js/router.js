import { GOOGLE_ANALYTICS_ID } from "../config/analytics.js";

const availableLanguages = ["en"];

document.addEventListener("DOMContentLoaded", async () => {
  const forceFullReloadFor = ["/archives", "/about"];
  const routerCache = {};
  const contentContainer = document.querySelector("#pageContent");

  if (!contentContainer) return;

  let layoutMap = [];
  try {
    const resp = await fetch("/layout-map.json");
    layoutMap = await resp.json();
  } catch (err) {
    return;
  }

  function normalizePath(url) {
    const tmp = new URL(url, window.location.origin);
    let path = tmp.pathname;

    path = path.replace(/\/{2,}/g, "/");

    if (path === "" || path === "/") {
      return `/${availableLanguages[0]}/index`;
    }
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    return path;
  }

  function getGroupForPath(normPath) {
    for (const entry of layoutMap) {
      if (
        entry.pages.some(
          (page) =>
            normPath === page || normPath === `/${availableLanguages[0]}${page}`
        )
      ) {
        return entry.group;
      }
    }
    return "default";
  }

  const activeTimeouts = new Set();
  const activeIntervals = new Set();
  const trackedEventListeners = [];

  function clearAllTimeoutsAndIntervals() {
    activeTimeouts.forEach(clearTimeout);
    activeIntervals.forEach(clearInterval);
    activeTimeouts.clear();
    activeIntervals.clear();
  }

  function trackTimeout(callback, delay) {
    const id = setTimeout(() => {
      activeTimeouts.delete(id);
      callback();
    }, delay);
    activeTimeouts.add(id);
    return id;
  }

  function trackInterval(callback, interval) {
    const id = setInterval(callback, interval);
    activeIntervals.add(id);
    return id;
  }

  const originalAddEventListener = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (
      this instanceof Node &&
      document.querySelector("#pageContent")?.contains(this)
    ) {
      trackedEventListeners.push({ target: this, type, listener, options });
    }
    originalAddEventListener.call(this, type, listener, options);
  };

  function removeTrackedEventListeners() {
    trackedEventListeners.forEach(({ target, type, listener, options }) => {
      if (target && target.removeEventListener) {
        target.removeEventListener(type, listener, options);
      }
    });
    trackedEventListeners.length = 0;
  }

  function cleanPreviousScripts() {
    document.querySelectorAll("#pageContent script").forEach((script) => {
      script.remove();
    });
  }

  function removeAllPrevious() {
    document.querySelectorAll("#pageContent script").forEach((script) => {
      script.remove();
    });

    let highestTimeout = setTimeout(() => {});
    let highestInterval = setInterval(() => {});
    for (let i = 0; i < highestTimeout; i++) clearTimeout(i);
    for (let i = 0; i < highestInterval; i++) clearInterval(i);

    clearAllTimeoutsAndIntervals();
    removeTrackedEventListeners();
    cleanPreviousScripts();
  }

  function executeScripts() {
    const scripts = document.querySelectorAll("#pageContent script");
    const scriptList = [];

    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      if (oldScript.src) {
        newScript.src = oldScript.src;
        newScript.async = true;
        scriptList.push(newScript.src);
      } else {
        newScript.textContent = oldScript.textContent;
        scriptList.push("[INLINE SCRIPT]");
      }
      oldScript.replaceWith(newScript);
    });

    trackTimeout(() => {
      document.dispatchEvent(new Event("DOMContentLoaded"));
    }, 300);
  }

  function updateMetaAndTitle(newDoc) {
    const newTitle = newDoc.querySelector("title");
    if (newTitle) {
      document.title = newTitle.textContent;
    }

    const currentMetas = Array.from(document.head.querySelectorAll("meta"));
    const newMetas = Array.from(newDoc.querySelectorAll("meta"));

    const metaMap = new Map(
      newMetas.map((meta) => [
        meta.getAttribute("name") || meta.getAttribute("property"),
        meta,
      ])
    );

    currentMetas.forEach((meta) => {
      const name = meta.getAttribute("name") || meta.getAttribute("property");
      if (name && !metaMap.has(name)) {
        meta.remove();
      }
    });

    newMetas.forEach((newMeta) => {
      const name =
        newMeta.getAttribute("name") || newMeta.getAttribute("property");
      if (!name) return;

      const existingMeta = document.head.querySelector(
        `meta[name="${name}"], meta[property="${name}"]`
      );
      if (existingMeta) {
        if (existingMeta.content !== newMeta.content) {
          existingMeta.content = newMeta.content;
        }
      } else {
        document.head.appendChild(newMeta.cloneNode(true));
      }
    });
  }

  function addDistIfLocal(url) {
    const isLocal = location.hostname === "localhost";
    if (!isLocal) return url;

    try {
      const parsed = new URL(url, window.location.origin);
      if (!parsed.pathname.startsWith("/dist/")) {
        parsed.pathname = "/dist" + parsed.pathname;
      }
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return url;
    }
  }

  const pageOrder = ["/index", "/start", "/leverage", "/introduction"];

  function updateNavButtons(currentPath, doc = document) {
    const prevBtn = document.querySelector("#nav-buttons .prev-btn");
    const nextBtn = document.querySelector("#nav-buttons .next-btn");
    const langRegex = /^\/([a-z]{2})(\/|$)/;
    const langMatch = currentPath.match(langRegex);
    const lang = langMatch ? langMatch[1] : availableLanguages[0];
    const basePath =
      currentPath.replace(langRegex, "/").replace(/\/$/, "") || "/index";
    const currentIndex = pageOrder.indexOf(basePath);

    const pathToUrl = (path) =>
      path === "/index" ? `/${lang}/` : `/${lang}${path}`;

    if (prevBtn) {
      if (currentIndex > 0) {
        prevBtn.setAttribute("href", pathToUrl(pageOrder[currentIndex - 1]));
      } else {
        prevBtn.removeAttribute("href");
      }
    }

    if (nextBtn) {
      const nextIndex =
        currentIndex < pageOrder.length - 1 ? currentIndex + 1 : 0;
      nextBtn.setAttribute("href", pathToUrl(pageOrder[nextIndex]));
    }

    if (prevBtn) {
      const label = doc
        .querySelector("[data-prev-label]")
        ?.getAttribute("data-prev-label");
      prevBtn.textContent = label || "Back";
    }
    if (nextBtn) {
      const label = doc
        .querySelector("[data-next-label]")
        ?.getAttribute("data-next-label");
      nextBtn.textContent = label || "Next";
    }
  }

  async function loadPage(targetUrl, pushToHistory = true) {
    const adjustedUrl = addDistIfLocal(targetUrl);
    const normTargetPath = normalizePath(adjustedUrl);
    const normCurrentPath = normalizePath(window.location.pathname);

    if (
      forceFullReloadFor.some((folder) => normTargetPath.startsWith(folder))
    ) {
      window.location.href = adjustedUrl;
      return;
    }

    const currentGroup = getGroupForPath(normCurrentPath);
    const targetGroup = getGroupForPath(normTargetPath);

    if (currentGroup !== targetGroup) {
      window.location.href = adjustedUrl;
      return;
    }

    // ➕ Empêche le layout shift
    const currentHeight = contentContainer.offsetHeight;
    contentContainer.style.minHeight = `${currentHeight}px`;
    contentContainer.style.transition = "opacity 300ms ease";
    contentContainer.style.opacity = "0";

    try {
      if (routerCache[normTargetPath]) {
        setTimeout(() => {
          removeAllPrevious();
          contentContainer.innerHTML = routerCache[normTargetPath];
          window.scrollTo(0, 0); // <=== AJOUT ICI
          updateMetaAndTitle(document);
          updateNavButtons(normTargetPath);
          setTimeout(() => {
            executeScripts();
            contentContainer.style.opacity = "1";
          }, 200);
        }, 300);

        if (pushToHistory)
          history.pushState({ path: adjustedUrl }, "", adjustedUrl);
        return;
      }

      const response = await fetch(adjustedUrl);
      if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const newContent = doc.querySelector("#pageContent");

      if (!newContent) {
        window.location.href = adjustedUrl;
        return;
      }

      routerCache[normTargetPath] = newContent.innerHTML;

      setTimeout(() => {
        removeAllPrevious();
        contentContainer.innerHTML = newContent.innerHTML;
        window.scrollTo(0, 0); // <=== AJOUT ICI
        if (typeof init === "function") {
          try {
            init();
          } catch (e) {
            console.warn("Sidebar init failed:", e);
          }
        }
        if (typeof activateNavFromSummary === "function") {
          activateNavFromSummary();
        }
        if (typeof gtag === "function" && GOOGLE_ANALYTICS_ID) {
          gtag("config", GOOGLE_ANALYTICS_ID, {
            page_path: normTargetPath,
            page_title: document.title,
          });
        }
        if (typeof window.plausible === "function") {
          plausible("pageview");
        }
        updateMetaAndTitle(doc);
        updateNavButtons(normTargetPath, doc);
        setTimeout(() => {
          executeScripts();
          contentContainer.style.opacity = "1";
          // ✅ Réinitialise après transition
          contentContainer.style.minHeight = "";
        }, 200);
      }, 300);

      if (pushToHistory)
        history.pushState({ path: adjustedUrl }, "", adjustedUrl);
    } catch (err) {
      window.location.href = adjustedUrl;
    }
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    const href = link.getAttribute("href") || "";

    if (
      href.startsWith("http") ||
      href.startsWith("#") ||
      link.target === "_blank"
    ) {
      return;
    }

    e.preventDefault();
    loadPage(href);
  });

  window.addEventListener("popstate", (e) => {
    if (e.state && e.state.path) {
      loadPage(e.state.path, false);
    } else {
      window.location.reload();
    }
  });

  const initialPath = normalizePath(window.location.pathname);
  updateNavButtons(initialPath);

  window.loadPage = loadPage;
});
