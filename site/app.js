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

const revealItems = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.14 },
);

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  revealItems.forEach((item) => revealObserver.observe(item));
}

const starTargets = document.querySelectorAll("[data-stars]");

fetch("https://api.github.com/repos/johnfaleke/Fathom", {
  headers: { Accept: "application/vnd.github+json" },
})
  .then((response) => {
    if (!response.ok) throw new Error("GitHub API unavailable");
    return response.json();
  })
  .then((repo) => {
    const stars = Number(repo.stargazers_count);
    const formattedStars = Number.isFinite(stars) ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(stars) : "—";
    starTargets.forEach((target) => {
      target.textContent = formattedStars;
    });
  })
  .catch(() => {
    starTargets.forEach((target) => {
      target.textContent = "—";
    });
  });
