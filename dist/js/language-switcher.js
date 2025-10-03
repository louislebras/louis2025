document.addEventListener("DOMContentLoaded", () => {
  const languageButtons = document.querySelectorAll(".language-button");
  const languagePopups = document.querySelectorAll(".language-popup");
  const languageOptions = document.querySelectorAll(".language-option");

  const currentPath = window.location.pathname;
  const langRegex = /^\/([a-z]{2})(\/|$)/;
  const currentLangMatch = currentPath.match(langRegex);
  const currentLang = currentLangMatch ? currentLangMatch[1] : "en";

  languageButtons.forEach((button, index) => {
    const popup = languagePopups[index];
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (popup.classList.contains("visible")) {
        popup.classList.remove("visible");
        popup.style.opacity = "0";
        popup.style.zIndex = "0";
      } else {
        languagePopups.forEach((p) => {
          p.classList.remove("visible");
          p.style.opacity = "0";
          p.style.zIndex = "0";
        });
        popup.classList.add("visible");
        popup.style.opacity = "1";
        popup.style.zIndex = "100";
      }
    });

    document.addEventListener("click", (event) => {
      if (!popup.contains(event.target) && !button.contains(event.target)) {
        popup.classList.remove("visible");
        popup.style.opacity = "0";
        popup.style.zIndex = "0";
      }
    });
  });

  languageOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const selectedLang = option.dataset.lang || "en";

      sessionStorage.setItem("manualLangSelected", "true");

      let newPath = currentPath;
      if (currentLang !== selectedLang) {
        if (currentLangMatch) {
          newPath = currentPath.replace(langRegex, `/${selectedLang}/`);
        } else {
          newPath = `/${selectedLang}${currentPath}`;
        }
      }

      newPath = newPath.replace(/\/\//g, "/");

      window.location.href = newPath;
    });
  });
});
