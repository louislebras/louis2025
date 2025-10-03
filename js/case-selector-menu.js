document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("header");
  if (!header) return;

  const normalize = (p) => {
    let path = (p || "/").split("?")[0].split("#")[0];
    path = path.replace(/\/+$/, "");
    path = path.replace(/^\/dist(?=\/|$)/, "");
    path = path.replace(/^\/(fr|en|es)(?=\/|$)/, "");
    return path === "" ? "/" : path;
  };

  const current = normalize(window.location.pathname);

  header.querySelectorAll("*").forEach((el) => el.classList.add("grey"));

  let activated = false;
  header.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (/^(mailto:|tel:|#)/i.test(href)) return;
    const linkPath = normalize(new URL(href, window.location.href).pathname);
    const isHome = linkPath === "/";
    const match = isHome
      ? current === "/"
      : current === linkPath || current.startsWith(linkPath + "/");
    if (match && !activated) {
      activated = true;
      a.classList.remove("grey");
      a.querySelectorAll(".grey").forEach((el) => el.classList.remove("grey"));
      a.classList.add("active-link");
    }
  });
});
