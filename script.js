const root = document.documentElement;
const themeToggle = document.querySelector("[data-theme-toggle]");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const siteHeader = document.querySelector(".site-header");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* THEME */

let savedTheme = null;
try {
  savedTheme = localStorage.getItem("theme");
} catch (e) {}

let currentTheme =
  savedTheme ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

root.setAttribute("data-theme", currentTheme);
updateThemeLabel(currentTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", currentTheme);
    } catch (e) {}

    const applyTheme = () => {
      root.setAttribute("data-theme", currentTheme);
      updateThemeLabel(currentTheme);
    };

    if (!document.startViewTransition || reducedMotion) {
      applyTheme();
      return;
    }

    // Reveal the new theme with a circle that grows from the toggle button
    const rect = themeToggle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    root.classList.add("theme-switching");
    const transition = document.startViewTransition(applyTheme);

    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
          },
          {
            duration: 650,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});

    transition.finished.finally(() => root.classList.remove("theme-switching"));
  });
}

function updateThemeLabel(theme) {
  if (!themeToggle) return;

  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"
  );
}

/* MOBILE MENU */

function setMenu(isOpen) {
  siteNav.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    setMenu(!siteNav.classList.contains("open"));
  });

  document.addEventListener("click", (event) => {
    if (!siteNav.classList.contains("open")) return;
    if (siteNav.contains(event.target) || menuToggle.contains(event.target)) return;
    setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteNav.classList.contains("open")) {
      setMenu(false);
      menuToggle.focus();
    }
  });
}

/* SCROLL: header shadow, progress bar and projects timeline fill */

const scrollProgress = document.createElement("div");
scrollProgress.className = "scroll-progress";
scrollProgress.setAttribute("aria-hidden", "true");
document.body.prepend(scrollProgress);

const projectsTimeline = document.querySelector(".projects-timeline");
let timelineProgress = null;

if (projectsTimeline) {
  timelineProgress = document.createElement("span");
  timelineProgress.className = "timeline-progress";
  timelineProgress.setAttribute("aria-hidden", "true");
  projectsTimeline.prepend(timelineProgress);
}

let scrollTicking = false;

function onScroll() {
  scrollTicking = false;

  const scrollable = root.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  scrollProgress.style.setProperty("--progress", progress.toFixed(4));

  if (siteHeader) {
    siteHeader.classList.toggle("scrolled", window.scrollY > 12);
  }

  if (projectsTimeline && timelineProgress) {
    const rect = projectsTimeline.getBoundingClientRect();
    const filled = (window.innerHeight * 0.6 - rect.top) / rect.height;
    timelineProgress.style.setProperty("--progress", Math.min(Math.max(filled, 0), 1).toFixed(4));
  }
}

function requestScrollUpdate() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(onScroll);
}

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate);
onScroll();

/* SCROLL REVEAL */

const revealItems = document.querySelectorAll("[data-reveal]");

function reveal(element, delay) {
  element.style.setProperty("--reveal-delay", `${delay}ms`);
  element.classList.add("is-visible");
  element.querySelectorAll("[data-count]").forEach((counter) => countUp(counter, delay));

  // Once revealed, hand the element back to its own hover transitions
  setTimeout(() => {
    element.removeAttribute("data-reveal");
    element.style.removeProperty("--reveal-delay");
  }, delay + 1000);
}

if (!("IntersectionObserver" in window) || reducedMotion) {
  revealItems.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      // Elements entering together are staggered one after the other
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          reveal(entry.target, Math.min(index, 6) * 90);
          revealObserver.unobserve(entry.target);
        });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  revealItems.forEach((element) => revealObserver.observe(element));
}

function countUp(element, delay) {
  const target = Number(element.dataset.count);
  if (!Number.isFinite(target)) return;

  const duration = 1100;
  let start = null;
  element.textContent = "0";

  function step(timestamp) {
    if (start === null) start = timestamp + delay;
    const elapsed = Math.max(timestamp - start, 0);
    const eased = 1 - Math.pow(1 - Math.min(elapsed / duration, 1), 3);
    element.textContent = String(Math.round(target * eased));
    if (elapsed < duration) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* POINTER EFFECTS (mouse only) */

if (finePointer && !reducedMotion) {
  // Glow that follows the cursor inside cards
  document
    .querySelectorAll(
      ".degree-card, .timeline-item:not(.timeline-card), .contact-card, .stack-group, .explore-card"
    )
    .forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    });

  // Subtle 3D tilt on the portrait
  const tilt = document.querySelector("[data-tilt]");

  if (tilt) {
    const area = tilt.parentElement;

    area.addEventListener("pointermove", (event) => {
      const rect = area.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      tilt.style.setProperty("--px", px.toFixed(3));
      tilt.style.setProperty("--py", py.toFixed(3));
    });

    area.addEventListener("pointerleave", () => {
      tilt.style.setProperty("--px", "0");
      tilt.style.setProperty("--py", "0");
    });
  }
}

/* MARQUEE: duplicate the items so the loop is seamless */

document.querySelectorAll(".marquee-track").forEach((track) => {
  const items = Array.from(track.children);

  // 4 sets in total: the track slides by half (2 sets), enough for wide screens
  for (let copy = 0; copy < 3; copy++) {
    items.forEach((item) => track.appendChild(item.cloneNode(true)));
  }
});
