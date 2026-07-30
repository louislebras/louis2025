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

function togglePart(button) {
  const content = document.getElementById(button.getAttribute("aria-controls"));
  const isOpen = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!isOpen));
  button.classList.toggle("is-open", !isOpen);
  content.hidden = isOpen;
}

document.querySelectorAll(".part-row").forEach((row) => {
  const button = row.querySelector(".part-plus");
  row.setAttribute("role", "button");
  row.setAttribute("tabindex", "0");

  row.addEventListener("click", (event) => {
    if (event.target.closest("a") || event.target.closest(".part-plus")) return;
    togglePart(button);
  });

  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePart(button);
    }
  });

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePart(button);
  });
});
