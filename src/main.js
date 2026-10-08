import "./style.css";
import { content, motion } from "./content.js";

for (const node of document.querySelectorAll("[data-copy]")) {
  if (content[node.dataset.copy]) node.innerHTML = content[node.dataset.copy];
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const root = document.documentElement;
const toggle = document.querySelector("#motion-toggle");
let motionEnabled = !reducedMotion.matches;
let manuallyDisabled = false;
let scrollFrame = 0;

function setMotion(enabled) {
  motionEnabled = enabled && !reducedMotion.matches;
  root.classList.toggle("motion-off", !motionEnabled);
  root.classList.toggle("js-motion", motionEnabled);
  toggle.setAttribute("aria-pressed", String(motionEnabled));
  document.querySelector("#motion-label").textContent = reducedMotion.matches
    ? "Reduced motion"
    : motionEnabled
      ? "Motion on"
      : "Motion off";
  toggle.disabled = reducedMotion.matches;
  updateScroll();
}

toggle.addEventListener("click", () => {
  manuallyDisabled = motionEnabled;
  setMotion(!motionEnabled);
});
reducedMotion.addEventListener("change", () => setMotion(!manuallyDisabled));

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: motion.revealThreshold },
);
document
  .querySelectorAll(".reveal")
  .forEach((node) => revealObserver.observe(node));

const footerDrawing = document.querySelector(".footer-drawing");
const blueprint = document.querySelector(".blueprint");
const sheet = blueprint.querySelector(".blueprint-svg").viewBox.baseVal;

function updateScroll() {
  scrollFrame = 0;
  if (!motionEnabled) return;
  const footerRect = footerDrawing.getBoundingClientRect();
  const progress = Math.max(
    0,
    Math.min(1, (innerHeight - footerRect.top) / (footerRect.height * 0.85)),
  );
  footerDrawing.style.setProperty("--footer-progress", progress.toFixed(3));
  const rect = blueprint.getBoundingClientRect();
  if (rect.bottom > 0 && rect.top < innerHeight) {
    const offset = (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight;
    blueprint.style.setProperty(
      "--scroll-y",
      `${(offset * motion.scrollTravel).toFixed(2)}px`,
    );
  }
}
addEventListener(
  "scroll",
  () => {
    if (motionEnabled && !scrollFrame)
      scrollFrame = requestAnimationFrame(updateScroll);
  },
  { passive: true },
);
addEventListener("resize", updateScroll, { passive: true });

for (const surface of document.querySelectorAll(".motion-surface")) {
  let x = 0;
  let y = 0;
  const move = () => {
    if (!motionEnabled) return;
    surface.style.setProperty("--move-x", `${x * motion.pointerTravel}px`);
    surface.style.setProperty("--move-y", `${y * motion.pointerTravel}px`);
    surface.classList.add("is-active");
    if (surface === blueprint) {
      const circle = surface.querySelector(".pointer-window");
      circle.setAttribute("cx", String(((x + 1) * sheet.width) / 2));
      circle.setAttribute("cy", String(((y + 1) * sheet.height) / 2));
      surface.querySelector(".coordinate").textContent =
        `X ${String(Math.round((x + 1) * 100)).padStart(3, "0")} / Y ${String(Math.round((y + 1) * 100)).padStart(3, "0")}`;
    }
  };
  const reset = () => {
    x = 0;
    y = 0;
    surface.style.setProperty("--move-x", "0px");
    surface.style.setProperty("--move-y", "0px");
    surface.classList.remove("is-active");
    if (surface === blueprint)
      surface.querySelector(".coordinate").textContent = "X 000 / Y 000";
  };
  surface.addEventListener(
    "pointermove",
    (event) => {
      if (!motionEnabled) return;
      const bounds = surface.getBoundingClientRect();
      x = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
      );
      y = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
      );
      move();
    },
    { passive: true },
  );
  surface.addEventListener("pointerleave", reset);
  surface.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") reset();
  });
  surface.addEventListener("pointercancel", reset);
  surface.addEventListener("blur", reset);
  surface.addEventListener("keydown", (event) => {
    if (event.target !== surface || !motionEnabled) return;
    if (event.key === "Escape") {
      reset();
      return;
    }
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    x = Math.max(
      -1,
      Math.min(
        1,
        x +
          (event.key === "ArrowRight"
            ? 0.15
            : event.key === "ArrowLeft"
              ? -0.15
              : 0),
      ),
    );
    y = Math.max(
      -1,
      Math.min(
        1,
        y +
          (event.key === "ArrowDown"
            ? 0.15
            : event.key === "ArrowUp"
              ? -0.15
              : 0),
      ),
    );
    move();
  });
}
setMotion(motionEnabled);

const navLinks = [...document.querySelectorAll("nav a")];
const navObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of navLinks) {
        if (link.hash === `#${entry.target.id}`)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }
  },
  { rootMargin: "-15% 0px -45% 0px", threshold: 0 },
);
for (const link of navLinks)
  navObserver.observe(document.querySelector(link.hash));
