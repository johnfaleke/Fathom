document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy || "");
      button.textContent = "copied";
    } catch {
      button.textContent = "select manually";
    }
    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  });
});

const sectionLinks = document.querySelectorAll(".docs-nav-link");
const sections = document.querySelectorAll(".doc-block");

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    });
  },
  { rootMargin: "-20% 0px -65% 0px" },
);

sections.forEach((section) => sectionObserver.observe(section));
