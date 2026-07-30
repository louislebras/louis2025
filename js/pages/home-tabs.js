const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const selectedTab = tab.dataset.tab;

    tabs.forEach((item) => {
      const isSelected = item === tab;
      item.classList.toggle("active", isSelected);
      item.classList.toggle("muted", !isSelected);
      item.setAttribute("aria-selected", String(isSelected));
    });

    panels.forEach((panel) => {
      const isVisible = panel.dataset.panel === selectedTab;
      panel.hidden = !isVisible;
      panel.classList.toggle("is-visible", isVisible);
    });
  });
});

document.querySelectorAll(".part-plus").forEach((button) => {
  button.addEventListener("click", () => {
    const content = document.getElementById(button.getAttribute("aria-controls"));
    const isOpen = button.getAttribute("aria-expanded") === "true";

    button.setAttribute("aria-expanded", String(!isOpen));
    button.classList.toggle("is-open", !isOpen);
    content.hidden = isOpen;
  });
});
