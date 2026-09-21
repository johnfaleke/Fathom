// Theme switcher
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const themeMeta = document.querySelector('meta[name="theme-color"]');
let storedTheme = null;

try {
  storedTheme = localStorage.getItem("fathom-theme");
} catch {
  storedTheme = null;
}

const initialTheme = storedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (themeToggle) {
    themeToggle.checked = theme === "dark";
    themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }
  if (themeLabel) themeLabel.textContent = `${theme === "dark" ? "Dark" : "Light"} mode`;
  if (themeMeta) themeMeta.setAttribute("content", theme === "dark" ? "#111514" : "#f4efe6");
}

applyTheme(initialTheme);

themeToggle?.addEventListener("change", () => {
  const nextTheme = themeToggle.checked ? "dark" : "light";
  try {
    localStorage.setItem("fathom-theme", nextTheme);
  } catch {}
  applyTheme(nextTheme);
});

// Copy to clipboard buttons
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy || "");
      button.textContent = "copied ✓";
      button.style.color = "var(--acid)";
    } catch {
      button.textContent = "select manually";
    }
    window.setTimeout(() => {
      button.textContent = original;
      button.style.color = "";
    }, 1500);
  });
});

// Interactive Section 3 (Documentation Tabs)
const tabButtons = Array.from(document.querySelectorAll(".docs-nav-link"));
const tabPanels = Array.from(document.querySelectorAll(".doc-block"));

function activateDocTab(tabId, shouldScroll = false) {
  if (!tabId) return;
  const targetId = tabId.replace(/^#/, "");
  const targetPanel = document.getElementById(targetId);
  const targetButton = document.querySelector(`[data-tab-target="${targetId}"]`);

  if (!targetPanel || !targetButton) return;

  tabButtons.forEach((btn) => {
    const isActive = btn === targetButton;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  tabPanels.forEach((panel) => {
    const isActive = panel === targetPanel;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  if (shouldScroll) {
    const docsSection = document.getElementById("docs");
    if (docsSection) {
      const headerOffset = 90;
      const elementPosition = docsSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  }
}

// Click on doc nav tab button
tabButtons.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tabTarget;
    if (target) {
      activateDocTab(target);
      if (history.replaceState) {
        history.replaceState(null, "", `#${target}`);
      }
    }
  });

  // Keyboard navigation for accessible tabs
  btn.addEventListener("keydown", (e) => {
    let newIndex = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      newIndex = (index + 1) % tabButtons.length;
      e.preventDefault();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      newIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      e.preventDefault();
    } else if (e.key === "Home") {
      newIndex = 0;
      e.preventDefault();
    } else if (e.key === "End") {
      newIndex = tabButtons.length - 1;
      e.preventDefault();
    }
    if (newIndex !== index) {
      tabButtons[newIndex].focus();
      tabButtons[newIndex].click();
    }
  });
});

// In-doc switcher buttons (Next / Prev)
document.querySelectorAll(".doc-switch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.docTarget;
    if (target) {
      activateDocTab(target, true);
      if (history.replaceState) {
        history.replaceState(null, "", `#${target}`);
      }
    }
  });
});

// Any cross-page links targeting a specific doc tab
document.querySelectorAll("[data-doc-tab]").forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = link.dataset.docTab;
    if (target) {
      e.preventDefault();
      activateDocTab(target, true);
      if (history.replaceState) {
        history.replaceState(null, "", `#${target}`);
      }
    }
  });
});

// Handle initial hash or hash changes
function handleHashChange() {
  const hash = window.location.hash.slice(1);
  if (hash && ["commands", "checks", "model", "ai"].includes(hash)) {
    activateDocTab(hash, false);
  }
}

window.addEventListener("hashchange", handleHashChange);
handleHashChange();

// Scroll reveal animation observer across the site
const revealItems = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  revealItems.forEach((item) => revealObserver.observe(item));
}

// GitHub stars count fetcher
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
    const formattedStars = Number.isFinite(stars)
      ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(stars)
      : "—";
    starTargets.forEach((target) => {
      target.textContent = formattedStars;
    });
  })
  .catch(() => {
    starTargets.forEach((target) => {
      target.textContent = "—";
    });
  });
